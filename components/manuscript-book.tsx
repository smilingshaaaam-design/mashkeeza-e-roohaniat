'use client'

import { useEffect, useLayoutEffect, useImperativeHandle, type Ref, type CSSProperties, useRef, useState } from 'react'
import { isMagicalScrollEnabled } from './magical-scroll'
import { Starfield } from './magic/starfield'
import { ArticleRichBody } from './article-rich-body'
import { ManuscriptTextLayer, readManuscriptText, readManuscriptImages } from './manuscript-text-objects'
import { RelatedTopics } from './related-topics'
import { applyBookContours, clearBookContours } from './book-contours'
import type { NavItem } from './main-nav'

type Entry = { id: string; slug: string; title: string; body?: string; excerpt?: string; content_type: string; use_magical_scroll?: number | boolean | null; include_in_book?: boolean | number | string | null }

function pageSlug(href: string) {
  try {
    const url = new URL(href, 'https://mashkeeza-e-roohaniat.com')
    if (!['mashkeeza-e-roohaniat.com', 'www.mashkeeza-e-roohaniat.com', 'mashkeeza-e-roohaniat.pages.dev'].includes(url.hostname)) return null
    if (/^\/pages\/?$/.test(url.pathname)) return url.searchParams.get('slug')
    const read = url.pathname.match(/^\/read\/([a-z0-9-]+)\/?$/i)
    return read ? read[1] : null
  } catch { return null }
}

function articleId(href: string) {
  try {
    const url = new URL(href, 'https://mashkeeza-e-roohaniat.com')
    if (!['mashkeeza-e-roohaniat.com', 'www.mashkeeza-e-roohaniat.com', 'mashkeeza-e-roohaniat.pages.dev'].includes(url.hostname)) return null
    return url.pathname === '/' && url.hash.startsWith('#article-') ? decodeURIComponent(url.hash.slice(9)) : null
  } catch { return null }
}
function isBookWriting(item: NavItem) { return Boolean(pageSlug(item.href) || articleId(item.href)) }

function topicDestination(item: NavItem) {
  // Even a single writing must be chosen from its heading's submenu page.
  return item.href + '/section'
}

// A single physical reading order for the entire book.
function bookWritingItems(items: NavItem[], entries: Entry[] | null): NavItem[] {
  const flatten = (children: NavItem[]): NavItem[] => children.filter(item => item.visible !== false).flatMap(item => [
    ...(isBookWriting(item) ? [item] : []),
    ...flatten(item.children ?? []),
  ])
  return [...new Map(flatten(items).filter(item => {
    const entry = entries?.find(value => articleId(item.href) ? value.id === articleId(item.href) : value.slug === pageSlug(item.href))
    return entry?.include_in_book !== false && entry?.include_in_book !== 0 && entry?.include_in_book !== '0'
  }).map(item => [item.href, item])).values()]
}
function bookReadingOrder(topics: NavItem[], entries: Entry[] | null, contentsRoot: string): string[] {
  return [contentsRoot + '/contents', ...topics.flatMap(section => [
    topicDestination(section),
    ...bookWritingItems(section.children ?? [], entries).map(item => section.href + '/read/' + encodeURIComponent(item.id)),
  ])]
}
function adjacentBookLocation(order: string[], location: string, delta: number): string | undefined {
  const index = order.indexOf(location)
  return index < 0 ? undefined : order[index + delta]
}

// Only top-level menu headings are printed in the central contents.
type BookIndexEntry = { id: string; label: string; href: string }
function bookIndexEntries(items: NavItem[]): BookIndexEntry[] {
  return items.filter(item => item.visible !== false).map(item => ({
    id: item.id, label: item.label,
    href: item.href.startsWith('#topic-') ? item.href + '/section' : item.href,
  }))
}

function CompleteBookIndex({ items, compact = false, onSelect }: { items: BookIndexEntry[]; compact?: boolean; onSelect: (href: string) => void }) {
  return <ol className={compact ? 'book-complete-index compact' : 'book-complete-index'}>
    {items.map(item => <li key={item.id}>
      <a className="deewan-plaque" href={item.href} onClick={event => {
        if (!item.href.startsWith('#topic-') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onSelect(item.href)
      }}>{item.label}</a>
    </li>)}
  </ol>
}

// Opening: 1.75s arrival, 1.2s cover, .95s dedication, 1.1s first turn.
const COVER_ARRIVAL_MS = 1600
const COVER_HOLD_MS = 6600
const COVER_OPEN_MS = 1800
const DEDICATION_MS = 4000

function turnDuration(distance: number) {
  return Math.round(680 + 670 / Math.sqrt(Math.max(1, distance)))
}

type Sheet = { face: HTMLDivElement; right: boolean }

// Cloned scroll containers start at zero. Restore their native position only
// after insertion, rather than translating or reflowing the text itself.
function restoreSheetScroll(root: HTMLElement) {
  for (const viewport of root.querySelectorAll<HTMLElement>('[data-frozen-scroll-x]')) {
    viewport.scrollTo({left:Number(viewport.dataset.frozenScrollX || 0),top:Number(viewport.dataset.frozenScrollY || 0),behavior:'instant'})
  }
}
// Explicit clipped projection of a single paginated flow. Unlike scrollLeft,
// this cannot clamp an out-of-range left page back onto the first page.
function setReadingColumn(viewport: HTMLElement, column: number, total: number) {
  const flow = viewport.querySelector<HTMLElement>(':scope > .deewan-columns')
  if (!flow) return
  const width = Number.parseFloat(getComputedStyle(flow).width) || viewport.clientWidth
  viewport.style.visibility = column < total ? 'visible' : 'hidden'
  viewport.scrollLeft = 0
  flow.style.transform = column ? 'translateX(' + column * width + 'px)' : 'none'
}
function countReadingColumns(flow: HTMLElement) {
  const width = Number.parseFloat(getComputedStyle(flow).width) || flow.clientWidth
  if (!width) return 1
  const origin = flow.getBoundingClientRect().right
  let last = 0
  const walker = document.createTreeWalker(flow,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
    acceptNode(node) {
      if(node instanceof Element) {
        if(node.matches('[hidden],[data-book-source],[data-book-contour],script,style,link'))return NodeFilter.FILTER_REJECT
        return node.matches('img,hr,[data-ms-gap]')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP
      }
      return node.textContent?.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT
    }
  })
  for(let n=walker.nextNode();n;n=walker.nextNode()) {
    const range=document.createRange()
    if(n instanceof Element)range.selectNode(n);else range.selectNodeContents(n)
    for(const rect of Array.from(range.getClientRects())) {
      if(rect.width>0&&rect.height>0)last=Math.max(last,Math.floor((origin-(rect.left+rect.right)/2)/width+.0001))
    }
  }
  return last+1
}

// Freeze the currently visible column and artwork before navigation changes the DOM.
function captureSheet(leaf: HTMLElement, right: boolean): Sheet {
  const book = leaf.parentElement!
  const panel = book.querySelector<HTMLElement>(right ? ':scope > .deewan-index' : ':scope > .deewan-reading')
  const width = leaf.clientWidth / 2
  const left = leaf.offsetLeft + (right ? width : 0)
  const top = leaf.offsetTop
  const face = document.createElement('div')
  face.inert = true
  Object.assign(face.style, {
    position:'absolute', inset:'0', overflow:'visible', fontStyle:'normal', direction:'rtl',
    backgroundImage:"url('/images/deewan/paper-surface.webp')",
    backgroundSize:book.clientWidth + 'px ' + book.clientHeight + 'px',
    backgroundPosition:-left + 'px ' + (-top) + 'px'
  })
  if (panel) {
    const copy = panel.cloneNode(true) as HTMLElement
    const panelStyle = getComputedStyle(panel)
    Object.assign(copy.style, {
      fontSize:panelStyle.fontSize,lineHeight:panelStyle.lineHeight,fontFamily:panelStyle.fontFamily,mixBlendMode:panelStyle.mixBlendMode,
      left:(panel.offsetLeft-left)+'px', right:'auto', top:(panel.offsetTop-top)+'px',
      bottom:'auto', width:panelStyle.width, height:panelStyle.height,boxSizing:panelStyle.boxSizing,
      animation:'none',transition:'none',visibility:panelStyle.visibility,
      overflow:panel.querySelector('.ms-text-layer')?'visible':'hidden', pointerEvents:'none'
    })
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    const columns = copy.querySelector<HTMLElement>('.deewan-columns')
    const viewport = panel.querySelector<HTMLElement>('.deewan-viewport')
    const viewportCopy = copy.querySelector<HTMLElement>('.deewan-viewport')
    if (viewport && viewportCopy) {
      // Freeze the old viewport's geometry and actual visible column.
      // Live article/index CSS can change while the turn is in flight.
      const viewportStyle = getComputedStyle(viewport)
      Object.assign(viewportCopy.style, {width:viewportStyle.width,height:viewportStyle.height,visibility:viewportStyle.visibility,overflow:'hidden',scrollBehavior:'auto',overflowAnchor:'none'})
      viewportCopy.dataset.frozenScrollX=String(viewport.scrollLeft)
      viewportCopy.dataset.frozenScrollY=String(viewport.scrollTop)
      if (columns) {
        const original = viewport.querySelector<HTMLElement>('.deewan-columns')
        if (original) {
          const style=getComputedStyle(original)
          Object.assign(columns.style,{width:style.width,height:style.height,columnCount:style.columnCount,columnWidth:style.columnWidth,columnGap:style.columnGap,columnFill:style.columnFill,fontFamily:style.fontFamily,fontSize:style.fontSize,lineHeight:style.lineHeight,transform:style.transform})
        }
      }
      // Freeze values that otherwise change with the destination contour mode.
      const selector='h2,h3,h4,img,.ms-text-layer,.ms-book-image-mask,.deewan-plaque,.deewan-index ol,.deewan-index li'
      const originals=panel.querySelectorAll<HTMLElement>(selector)
      const copies=copy.querySelectorAll<HTMLElement>(selector)
      originals.forEach((element,i)=>{
        const clone=copies[i];if(!clone)return
        const style=getComputedStyle(element)
        clone.style.setProperty('display',style.display,'important')
        for(const property of ['font-size','font-family','font-weight','line-height','margin-top','margin-bottom','padding-top','padding-bottom','box-sizing','text-align','min-height','vertical-align','break-inside','break-after']) clone.style.setProperty(property,style.getPropertyValue(property),'important')
        if(element.tagName==='IMG') {
          clone.style.setProperty('clear',style.clear,'important')
          clone.style.width=style.width;clone.style.height=style.height
          if(clone instanceof HTMLImageElement && element instanceof HTMLImageElement){clone.loading='eager';if(element.currentSrc)clone.src=element.currentSrc}
        }
        if(element.classList.contains('ms-text-layer')||element.classList.contains('ms-book-image-mask')) Object.assign(clone.style,{top:style.top,left:style.left,right:style.right,bottom:style.bottom,width:style.width,height:style.height})
      })
    }
    if (right && panel.scrollTop && !viewport) {
      const inner = document.createElement('div')
      inner.append(...Array.from(copy.childNodes))
      inner.style.transform = 'translateY(-' + panel.scrollTop + 'px)'
      copy.append(inner)
    }
    face.append(copy)
  }
  return {face, right}
}

type PageTurn = { duration: number; distance: number; outgoing: Sheet; landing: Sheet }

// More distant jumps show more leaves at a faster cadence. Cap the visual
// sample so even a very long manuscript stays responsive.
function rifflePlan(distance: number) {
  const turns = Math.max(1, Math.ceil(distance))
  if (turns === 1) return { leaves: 0, interval: 0, flight: 0, delay: 0, final: turnDuration(1) }
  const leaves = Math.min(15, turns - 1)
  const interval = Math.max(53, Math.round(185 / Math.sqrt(turns)))
  const flight = Math.round(interval * 2.15)
  return { leaves, interval, flight, delay: (leaves - 1) * interval + Math.round(flight * .72), final: Math.max(440, Math.round(650 - Math.min(200, turns * 12))) }
}

function animateLeaf(leaf: HTMLElement, turn: PageTurn, onRelease: () => void) {
  const width = leaf.clientWidth / 2
  const height = leaf.clientHeight
  if (!width || !height) { onRelease(); return }

  const fromRight = turn.outgoing.right
  const front = turn.outgoing.face
  const back = captureSheet(leaf, !fromRight).face
  const sheet = document.createElement('div')
  sheet.dataset.turningSheet = ''
  Object.assign(sheet.style, {
    position:'absolute', left:fromRight ? '50%' : '0', top:'0', width:'50%', height:'100%',
    transformStyle:'preserve-3d', transformOrigin:fromRight ? 'left center' : 'right center',
    pointerEvents:'none'
  })
  // Both inked faces share a single hinge; native backface culling handles the
  // edge-on frame, even when perspective or the viewport changes the viewing angle.
  for (const face of [front, back]) {
    face.style.backfaceVisibility = 'hidden'
    face.style.setProperty('-webkit-backface-visibility', 'hidden')
  }
  front.style.transform = 'translateZ(.15px)'
  back.style.transform = 'rotateY(180deg) translateZ(.15px)'
  sheet.append(front, back)
  leaf.append(sheet)
  restoreSheetScroll(sheet)

  const still = turn.landing.face
  Object.assign(still.style, {
    inset:'auto', left:(leaf.offsetLeft + (turn.landing.right ? width : 0))+'px',
    top:leaf.offsetTop+'px', width:width+'px', height:height+'px', pointerEvents:'none',
    backgroundRepeat:'no-repeat'
  })
  still.style.zIndex = '1'
  still.setAttribute('aria-hidden','true')
  leaf.before(still)
  restoreSheetScroll(still)

  const transforms: Keyframe[] = []
  const light: Keyframe[] = []
  const direction = fromRight ? -1 : 1
  for (let i = 0; i <= 48; i++) {
    const t = i / 48
    const progress = t * t * (3 - 2 * t)
    const angle = Math.PI * progress
    const bend = Math.sin(angle)
    const easingOut = Math.sin(2 * angle)
    // Shear along the free edge. Points on the vertical binding stay fixed.
    transforms.push({transform:'rotateY(' + direction * 180 * progress + 'deg) skewY(' +
      direction * (2.3 * bend + 1.6 * easingOut) + 'deg) scaleX(' + (1 - .045 * bend) + ')'})
    light.push({opacity:.70*bend, transform:'translateX(' + direction * (progress - .5) * 28 + '%)'})

  }

  const timing: KeyframeAnimationOptions = {duration:turn.duration, fill:'both'}
  const motion = sheet.animate(transforms, timing)
  const animations = [motion]
  ;[front, back].forEach(face => {
    face.style.overflow = 'hidden'
    const glaze = document.createElement('div')
    Object.assign(glaze.style, {
      position:'absolute', inset:'0 -20%', pointerEvents:'none',
      backgroundImage:'linear-gradient(105deg,transparent 10%,rgba(255,248,219,.12) 55%,transparent 81%)',
      backgroundSize:'160% 100%'
    })
    face.append(glaze)
    animations.push(glaze.animate(light, timing))
  })

  let released = false
  const release = () => {
    if (released) return
    released = true
    motion.onfinish = null
    animations.forEach(animation => animation.cancel())
    sheet.remove()
    still.remove()
    onRelease()
  }
  motion.onfinish = release
  return release
}

export type BookNavigation = { turnTo: (href: string) => string | null }

const isBismillahBookTitle = (value: string) => /^بسماللهالرحم(?:ا)?ن(?:الرحيم)?$/.test(value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s\u200C\u200D\p{P}]/gu,"").replace(/[ہھۃ]/g,"ه").replace(/[یىے]/g,"ي"))

export function ManuscriptBook({ topic, cards, topics, menuItems, hash, navigation }: { navigation: Ref<BookNavigation>; topic: NavItem; cards: NavItem[]; topics: NavItem[]; menuItems: NavItem[]; hash: string }) {
  const articles = cards.filter(isBookWriting)
  const current = articles.findIndex(item => hash === topic.href + '/read/' + encodeURIComponent(item.id))
  const card = articles[current]
  const [stage, setStage] = useState<'cover' | 'opening' | 'dedication' | 'returning' | 'closing' | 'closed' | 'title' | 'contents'>(() =>
    hash === topic.href ? 'cover' : 'contents')
  useEffect(() => {
    const restart = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('.deewan-menu a') : null
      if (link?.getAttribute('href') === topic.href) setStage('cover')
    }
    document.addEventListener('click', restart)
    return () => document.removeEventListener('click', restart)
  }, [topic.href])
  const mainIndex = hash === topic.href + '/contents' || (hash === topic.href && (stage === 'title' || stage === 'contents'))
  const arrivalStarted = useRef(0)
  const earlyTap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useLayoutEffect(() => {
    if (stage === 'cover') arrivalStarted.current = performance.now()
    return () => clearTimeout(earlyTap.current)
  }, [stage])
  function openByTouch() {
    const remaining = stage === 'cover' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? COVER_ARRIVAL_MS - (performance.now() - arrivalStarted.current) : 0
    clearTimeout(earlyTap.current)
    if (remaining > 0) earlyTap.current = setTimeout(() => setStage('opening'), remaining)
    else setStage('opening')
  }
  const intro = (stage === 'cover' || stage === 'opening' || stage === 'dedication' || stage === 'returning' || stage === 'closing' || stage === 'closed') && !card && !mainIndex && hash === topic.href
  const indexItems = cards
  const completeIndex = bookIndexEntries(menuItems)
  const indexSignature = completeIndex.map(item => item.id + ':' + item.label + ':' + item.href).join('|')
  useEffect(() => {
    if (card || mainIndex) setStage('contents')
  }, [card?.id, mainIndex])
  useEffect(() => {
    if (stage !== 'cover' && stage !== 'opening') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = stage === 'cover' ? 'opening' : 'dedication'
    const delay = stage === 'cover' ? (reduced ? 350 : COVER_HOLD_MS) : (reduced ? 0 : COVER_OPEN_MS + 50)
    const timer = window.setTimeout(() => setStage(next), delay)
    return () => window.clearTimeout(timer)
  }, [stage])
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(1)
  const [flowCount, setFlowCount] = useState(1)
  const paper = useRef<HTMLDivElement>(null)
  const measuredPage = useRef(0)
  const measuredSpreads = useRef(new Map<string, number>())
  const leftPaper = useRef<HTMLDivElement>(null)
  const leaf = useRef<HTMLDivElement>(null)
  const pendingSheet = useRef<PageTurn | null>(null)
  const turnInProgress = useRef(false)
  const deferredLayout = useRef<(() => void) | null>(null)
  const flowPagesRef = useRef(1)
  const layoutLocation = useRef('')
  // A shared/deep book link mounts the full interactive manuscript directly
  // in reading mode, not an isolated article or cover animation.
  useEffect(() => {
    if (hash.includes('/read/')) leaf.current?.closest('.deewan-book')?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])
  function rememberSheet(fromRight: boolean, distance = 1) {
    if (leaf.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pendingSheet.current = { duration:turnDuration(distance), distance, outgoing:captureSheet(leaf.current, fromRight), landing:captureSheet(leaf.current, !fromRight) }
    }
  }
  useEffect(() => {
    if (stage !== 'dedication' || !intro) return
    const timer = window.setTimeout(() => {
      rememberSheet(false)
      setStage('title')
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : DEDICATION_MS)
    return () => window.clearTimeout(timer)
  }, [stage, intro])
  const [zoomed, setZoomed] = useState(false)
  function isMagnified() {
    const width = window.visualViewport?.width
    return Boolean(width && document.documentElement.clientWidth > width * 1.02)
  }
  useEffect(() => {
    const viewport = window.visualViewport
    const update = () => {
      const magnified = isMagnified()
      if (magnified) touch.current = null
      setZoomed(magnified)
    }
    update()
    viewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  const lastPage = useRef<string | null>(null)
  const touch = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (entries) return
    const controller = new AbortController()
    setFailed(false)
    fetch('https://mashkeeza-cms-api.smilingshaaaam.workers.dev/public/content', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw Error()
        const data = await response.json()
        if (!Array.isArray(data.items)) throw Error()
        if (!controller.signal.aborted) setEntries(data.items)
      }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [entries, attempt])
  const entry = card && entries?.find(item => item.include_in_book !== false && item.include_in_book !== 0 && item.include_in_book !== '0' && (articleId(card.href) ? item.id === articleId(card.href) : item.slug === pageSlug(card.href)))

  const readingOrder = bookReadingOrder(topics, entries, topic.href)
  const readingLocation = mainIndex ? topic.href + '/contents' : card ? hash : topic.href + '/section'
  const nextLocation = adjacentBookLocation(readingOrder, readingLocation, 1)

  useLayoutEffect(() => {
    const node = paper.current
    if (!node) { setPage(0); setCount(1); setFlowCount(1); return }
    let active = true
    let contourSignature = ''
    let clonedSourceSignature = ''
    const measure = () => {
      if (!active || !node.clientWidth) return
      if(turnInProgress.current){deferredLayout.current=measure;return}
      const book = node.closest<HTMLElement>('.deewan-book')
      const rightFlow=node.querySelector<HTMLElement>(':scope > .deewan-columns')
      const leftViewport=leftPaper.current
      const leftFlow=leftViewport?.querySelector<HTMLElement>(':scope > .deewan-columns')
      if (!rightFlow || !leftViewport || !leftFlow) return
      // Only the canonical right flow is measured; both leaves share its exact
      // column geometry and content, not two independently paginated articles.
      rightFlow.style.transform='none'
      leftFlow.style.transform='none'
      node.scrollLeft=0;leftViewport.scrollLeft=0
      if (card && book) {
        const fontSize = Math.max(13, Math.min(19, book.clientWidth * .016))
        book.style.setProperty('--book-writing-font', fontSize + 'px')
        const panels = Array.from(book.querySelectorAll<HTMLElement>(':scope > .book-panel:has(.printed-text)'))
        const source = panels[0]?.querySelector<HTMLElement>('[data-book-source]')
        const sourceSignature = source?.innerHTML || ''
        const signature = [book.clientWidth,book.clientHeight,sourceSignature,document.fonts.status].join('\u0001')
        if (signature !== contourSignature) {
          contourSignature = signature
          const targets = panels.map(panel => ({source:panel.querySelector<HTMLElement>('[data-book-source]'),target:panel.querySelector<HTMLElement>('[data-book-target]'),columns:panel.querySelector<HTMLElement>('.deewan-columns')}))
          if (entry && targets.length === 2 && targets.every(item => item.source && item.target && item.columns)) {
            book.dataset.bookContours = 'true'
            const primary=targets[0],secondary=targets[1]
            const target=primary.target!, columns=primary.columns!
            if(sourceSignature!==clonedSourceSignature||!target.hasChildNodes()){
              target.replaceChildren(...Array.from(primary.source!.childNodes,n=>n.cloneNode(true)))
              target.querySelectorAll('link').forEach(n=>n.remove())
            }
            const ok=applyBookContours(target,{width:columns.clientWidth,pitch:columns.clientWidth,height:columns.clientHeight,geometryRoot:columns})
            if(!ok){book.dataset.bookContours='false';clearBookContours(target)}
            // Exact copy of the canonical contour breaks, never compute them twice.
            secondary.target!.replaceChildren(...Array.from(target.childNodes,n=>n.cloneNode(true)))
            clonedSourceSignature=sourceSignature
          } else book.dataset.bookContours='false'
        }
      } else if (book) book.dataset.bookContours='false'
      const objectPages = [...readManuscriptText(entry?.body), ...readManuscriptImages(entry?.body)].reduce((n,o)=>Math.max(n,o.page+1),0)
      // Match the exact subpixel geometry, including the fallback layout.
      const geometry=getComputedStyle(rightFlow)
      leftViewport.style.width=getComputedStyle(node).width
      leftViewport.style.height=getComputedStyle(node).height
      leftFlow.style.width=geometry.width
      leftFlow.style.height=geometry.height
      const flowPages=countReadingColumns(rightFlow)
      flowPagesRef.current=flowPages
      setFlowCount(flowPages)
      const pages = Math.max(flowPages, objectPages)
      measuredPage.current = Math.min(measuredPage.current, 2 * Math.floor((pages - 1) / 2))
      setCount(pages)
      if (entry || !card) measuredSpreads.current.set(mainIndex ? 'contents' : hash, Math.max(1, Math.ceil(pages / 2)))
      if ((entry || !card) && lastPage.current === hash) {
        measuredPage.current = 2 * Math.floor((pages - 1) / 2)
        // Keep the final spread selected through late font/image pagination.
        setPage(measuredPage.current)
      } else setPage(old => Math.min(old, 2 * Math.floor((pages - 1) / 2)))
      setReadingColumn(node,measuredPage.current,flowPages)
      setReadingColumn(leftViewport,measuredPage.current+1,flowPages)
    }
    if(layoutLocation.current!==hash+'|'+stage){
      layoutLocation.current=hash+'|'+stage
      measuredPage.current=0
      setPage(0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    const book = node.closest<HTMLElement>('.deewan-book')
    const onMediaLoad = (event: Event) => {
      if (!(event.target instanceof HTMLImageElement) || !event.target.closest('[data-book-target]') || event.target.closest('.book-panel')?.parentElement!==book) return
      contourSignature=''
      measure()
    }
    book?.addEventListener('load', onMediaLoad, true)
    const sourceObserver = new MutationObserver(measure)
    book?.querySelectorAll('[data-book-source]').forEach(source=>sourceObserver.observe(source,{subtree:true,childList:true,characterData:true,attributes:true}))
    const onFonts = () => { contourSignature='';measure() }
    document.fonts.ready.then(onFonts)
    document.fonts.addEventListener('loadingdone',onFonts)
    return () => { active = false; observer.disconnect(); sourceObserver.disconnect(); book?.removeEventListener('load', onMediaLoad, true);document.fonts.removeEventListener('loadingdone',onFonts) }
  }, [stage, hash, entry, indexSignature, cards.map(item => item.id + item.label).join('|')])
  useLayoutEffect(() => {
    const node = paper.current
    if (node) setReadingColumn(node,page,flowPagesRef.current)
    if (leftPaper.current) setReadingColumn(leftPaper.current,page+1,flowPagesRef.current)
  }, [hash, page, count, flowCount])
  const stopTurn = useRef<(() => void) | undefined>(undefined)
  useLayoutEffect(() => () => stopTurn.current?.(), [])
  useLayoutEffect(() => {
    const el = leaf.current
    const sheet = pendingSheet.current
    pendingSheet.current = null
    if (el && sheet) {
      stopTurn.current?.()
      // Position the destination columns before cloning the reverse face.
      const right = paper.current
      const left = leftPaper.current
      if (right && left && right.clientWidth) {
        const total = flowPagesRef.current
        const destination = measuredPage.current
        setReadingColumn(right,destination,total)
        setReadingColumn(left,destination+1,total)
      }
      turnInProgress.current=true
      stopTurn.current = animateLeaf(el, sheet, () => {
        turnInProgress.current=false
        const update=deferredLayout.current
        deferredLayout.current=null
        if(update)update()
      })
    }
  }, [stage, hash, page])

  // Calculate distance in book spreads, using measured pagination for visited
  // writings and a text-length estimate for writings not yet laid out.
  function bookPosition(target: string, spread = 0) {
    const normalized = target.endsWith('/contents') || (target === hash && mainIndex) ? 'contents' : target
    if (normalized === 'contents') return spread
    let position = measuredSpreads.current.get('contents') ?? 1
    const currentLength = entry?.body?.replace(/<[^>]*>/g, '').length ?? 0
    const perSpread = currentLength > 0 ? Math.max(180, currentLength / Math.max(1, Math.ceil(count / 2))) : 1000
     for (const section of topics) {
      const sectionHash = section.href + '/section'
      if (normalized === section.href || normalized === sectionHash) return position + spread
      position += measuredSpreads.current.get(sectionHash) ?? 1
      const writings = bookWritingItems(section.children ?? [], entries)
      for (const item of writings) {
        const published = entries?.find(value => articleId(item.href) ? value.id === articleId(item.href) : value.slug === pageSlug(item.href))
         const writingHash = section.href + '/read/' + encodeURIComponent(item.id)
        if (normalized === writingHash) return position + spread
        const textLength = published?.body?.replace(/<[^>]*>/g, '').length ?? 0
        position += measuredSpreads.current.get(writingHash) ?? Math.max(1, Math.ceil(textLength / perSpread))
      }
    }
    return undefined
  }
  function jumpDistance(target: string, fallback = 1) {
    const from = bookPosition(hash, Math.floor(page / 2))
    const to = bookPosition(target)
    return from === undefined || to === undefined ? Math.max(1, fallback) : Math.max(1, Math.abs(to - from))
  }
  function turnTo(href: string, fromIndex = false) {
      const root = href.split('/')[0]
      const destination = topics.find(item => item.href === root)
      if (!destination) return null
      const target = href === root ? topicDestination(destination) : href
      const offset = topics.indexOf(destination) - topics.findIndex(item => item.id === topic.id)
      if (hash !== target || page !== 0 || intro) {
        stopTurn.current?.()
        const from = bookPosition(hash, Math.floor(page / 2))
        const to = bookPosition(target)
        const backwards = from !== undefined && to !== undefined ? to < from : offset < 0 || (offset === 0 && page > 0)
        rememberSheet(fromIndex || mainIndex ? false : backwards, jumpDistance(target, Math.abs(offset)))
        clearTimeout(earlyTap.current)
        lastPage.current = null
        measuredPage.current = 0
        setPage(0)
        setStage('contents')
      }
      // Keep the viewport fixed during internal book navigation.
      return target
  }
  useImperativeHandle(navigation, () => ({ turnTo }))
  function selectHeading(href: string) {
    const target = turnTo(href, true)
    if (target) window.location.hash = target
  }

  function openAdjacent(target: string, fromEnd: boolean) {
    stopTurn.current?.()
    rememberSheet(fromEnd)
    lastPage.current = fromEnd ? target : null
    measuredPage.current = 0
    setStage('contents')
    window.location.hash = target
  }
  useEffect(() => {
    if (stage !== 'closing') return
    const timer = window.setTimeout(() => setStage('closed'),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1900)
    return () => window.clearTimeout(timer)
  }, [stage])
  function turn(delta: number) {
    if (intro) {
      if (stage === 'returning' || stage === 'dedication') {
        stopTurn.current?.()
        if (delta < 0) setStage('closing')
        else { rememberSheet(false); setStage('title') }
      }
      return
    }
    const next = page + 2 * delta
    if (next >= 0 && next < count) {
      stopTurn.current?.()
      lastPage.current = null
      rememberSheet(delta < 0)
      measuredPage.current = next
      setPage(next)
      return
    }
    const target = adjacentBookLocation(readingOrder, readingLocation, delta)
    if (target) {
      openAdjacent(target, delta < 0)
      return
    }
    // Only the very first spread leads back to the dedication.
    if (delta < 0 && mainIndex && page === 0) {
      stopTurn.current?.()
      lastPage.current = null
      rememberSheet(true)
      if (hash !== topic.href) window.location.hash = topic.href
      setStage('returning')
    }
  }
  // The breadcrumb is the reader's current location, not a history log.
  // Returning to an ancestor uses the original right-to-left page turn.
  function returnToLocation(target: string, distance: number) {
    if (hash === target && page === 0) return
    stopTurn.current?.()
    rememberSheet(true, jumpDistance(target, Math.max(1, distance) + page / 2))
    lastPage.current = null
    measuredPage.current = 0
    if (hash === target) setPage(0)
    else window.location.hash = target
  }
  function firstIndex() {
    if (mainIndex && page === 0) return
    returnToLocation(mainIndex ? hash : topic.href + '/contents', current + 2)
  }
  const breadcrumbs = [
    { key: 'contents', label: 'فہرست', action: firstIndex },
    ...(!mainIndex ? [{
      key: 'section', label: topic.label,
      action: () => returnToLocation(topic.href + '/section', current + 1),
    }] : []),
    ...(!mainIndex && card ? [{
      key: 'writing', label: entry?.title || card.label,
      action: () => returnToLocation(topic.href + '/read/' + encodeURIComponent(card.id), 1),
    }] : []),
  ]
  const lastLocation = readingOrder[readingOrder.length - 1]
  const totalSpreads = Math.max(2, (bookPosition(lastLocation || readingLocation) ?? readingOrder.length) + 2)
  const openedSpreads = intro ? 0 : (bookPosition(readingLocation, Math.floor(page / 2)) ?? 0) + 1
  const stackProgress = Math.min(1, Math.max(0, openedSpreads / totalSpreads))
  return <>
  <section className="deewan-book" style={{...(zoomed ? {touchAction:"manipulation"} : {}), '--right-stack': `${2 + 19 * stackProgress}px`, '--left-stack': `${2 + 19 * (1-stackProgress)}px`} as CSSProperties} data-opening={intro ? stage : undefined} tabIndex={0} aria-label={topic.label}
    onKeyDown={e => {
      if (e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); turn(e.key === 'ArrowLeft' ? 1 : -1) }
    }}
    onTouchStart={e => { touch.current = !isMagnified() && e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null }}
    onTouchCancel={() => { touch.current = null }}
    onTouchEnd={e => {
      const start = touch.current
      touch.current = null
      if (!start || isMagnified() || e.touches.length) return
      const dx = e.changedTouches[0].clientX - start[0]
      if (Math.abs(dx) > 45 && Math.abs(dx) > 1.6 * Math.abs(e.changedTouches[0].clientY - start[1])) turn(dx > 0 ? 1 : -1)
    }}>
    <div aria-hidden="true" className="deewan-sky-backdrop"><Starfield count={125} seed={41} className="inset-0" /></div>
    {intro && stage === 'cover' && <div className="cover-sand" aria-hidden="true">{Array.from({length:32}, (_, i) =>
      <i key={i} style={{left:(i * 37 % 100) + '%',animationDelay:(i * 83 % 1050) + 'ms'}} />)}</div>}
    {intro && (stage === 'cover' || stage === 'opening' || stage === 'closing' || stage === 'closed') && <div className="manuscript-cover" onAnimationEnd={event => {
      if (event.target !== event.currentTarget || event.animationName !== 'open-binding') return
      if (stage === 'opening') setStage('dedication')
      if (stage === 'closing') setStage('closed')
    }}><div><span aria-hidden="true">❦</span><strong>مشکیزہ روحانیت</strong>
      <p lang="ur" dir="rtl">روحانیت کا ایک ایسا مشکیزہ جس میں علمِ جفر، علمُ الاعداد، علمِ نجوم، طلسمات، توسل، دعائیں، اعمالِ روحانی، جفری حسابات، عملیات، واقعات اور تجربات کا مجموعہ پیش کیا گیا ہے۔ یہ مجموعہ آپ کی زندگی کو بدلنے کی مکمل صلاحیت رکھتا ہے۔</p>
      <span aria-hidden="true">❦</span></div>{(stage === 'closed' || stage === 'cover') && <button type="button" className="reopen-cover" aria-label="کتاب کھولیں" onClick={openByTouch} />}</div>}
    {intro && <div className="deewan-reading book-panel dedication" data-side="left">
      <p lang="ar">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ</p>
      <h2>مشکیزہ روحانیت</h2>
      <div className="dedication-arch" aria-label="پنجتن پاک علیہم السلام" dir="rtl">
        {['محمد', 'علی', 'فاطمہ', 'حسن', 'حسین'].map(name => <span key={name}>{name}</span>)}
      </div>
    </div>}
    {!intro && (['right', 'left'] as const).map(side => <div key={side} data-side={side} inert={intro}
      className={side === 'right' ? 'deewan-index book-panel' : 'deewan-reading book-panel'}>
      <div ref={side === 'right' ? paper : leftPaper} className="deewan-viewport"
        data-reading-viewport={side}>
        <div className={'deewan-columns ' + (card ? 'printed-text' : 'printed-index')}>
          {card ? entry ? <>
            <div data-book-source hidden aria-hidden="true">{!isBismillahBookTitle(entry.title || card.label) && <h3 className="book-article-heading">{entry.title || card.label}</h3>}
              {isMagicalScrollEnabled(entry.use_magical_scroll) && <a href={card.href}>متحرک طومار میں پڑھیں</a>}
              {entry.excerpt && <p>{entry.excerpt}</p>}<ArticleRichBody body={entry.body} floatingObjects bookMode />
            </div><div data-book-target style={{display:'contents'}}/>
          </> : <><h3>{card.label}</h3>{failed ? <button onClick={() => setAttempt(v => v + 1)}>دوبارہ کوشش کریں</button> : <p role="status">{entries ? 'یہ تحریر دستیاب نہیں ہے۔' : 'تحریر لوڈ ہو رہی ہے…'}</p>}</> : <>{mainIndex ? <h2 className="book-main-index-title">مرکزی فہرست</h2> : <h2>{topic.label}</h2>}
      {!mainIndex && topic.id === 'contact' && <p>سوال یا معلومات کے لیے درج ذیل ذرائع سے رابطہ کریں۔</p>}
      {!mainIndex && <h3>فہرست</h3>}
      {mainIndex ? <CompleteBookIndex items={completeIndex} onSelect={selectHeading} /> : indexItems.length ? <ol>{indexItems.map(item => {
        const internal = isBookWriting(item)
        return <li key={item.id}><a className="deewan-plaque" href={internal ? topic.href + '/read/' + encodeURIComponent(item.id) : item.href}
          target={!internal && item.openInNewTab ? '_blank' : undefined} rel={!internal && item.openInNewTab ? 'noopener noreferrer' : undefined}
          onClick={event => {
            if (!internal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            lastPage.current = null
            rememberSheet(false, jumpDistance(topic.href + '/read/' + encodeURIComponent(item.id), Math.max(1, Math.ceil((count - page) / 2)) + articles.indexOf(item)))
            window.location.hash = topic.href + '/read/' + encodeURIComponent(item.id)
          }}>{item.label}</a></li>
      })}</ol> : <p>اس موضوع سے ابھی کوئی تحریر منسلک نہیں ہے۔</p>}</>}
        </div>
      </div>
      {entry && <ManuscriptTextLayer body={entry.body} mode="book" page={page+(side==='left'?1:0)} side={side}/>}
      {side === 'right' && <nav className="book-breadcrumbs" aria-label="کتاب میں موجودہ مقام" dir="rtl">
      <ol>
        {breadcrumbs.map((crumb, index) => <li key={crumb.key}>
          {index > 0 && <span className="book-crumb-arrow" aria-hidden="true">‹</span>}
          <button type="button" onClick={crumb.action} title={crumb.label}
            aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
            className="book-crumb">{crumb.label}</button>
        </li>)}
      </ol>
    </nav>}
    </div>)}
    <div aria-hidden="true" className="deewan-leaf" style={{inset:"0 4%"}} ref={leaf} />
  </section>
    {<div className="deewan-controls" style={{visibility:(!intro || stage === 'returning' || stage === 'dedication') ? 'visible' : 'hidden'}}>
      <button onClick={() => turn(-1)}>پچھلا صفحہ</button>
      {card && <span aria-live="polite">{page + 1}–{Math.min(page + 2, count)} / {count}</span>}
      <button disabled={!intro && !nextLocation && page + 2 >= count} onClick={() => turn(1)}>اگلا صفحہ</button>
    </div>}
  {!intro && entry && <div className="book-related-topics" key={entry.id}><RelatedTopics slug={entry.slug} /></div>}
  </>
}
