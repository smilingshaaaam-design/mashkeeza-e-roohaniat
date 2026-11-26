'use client'

import { useEffect, useLayoutEffect, useImperativeHandle, type Ref, useRef, useState } from 'react'
import { isMagicalScrollEnabled } from './magical-scroll'
import { Starfield } from './magic/starfield'
import { ArticleRichBody } from './article-rich-body'
import type { NavItem } from './main-nav'

type Entry = { slug: string; title: string; body?: string; excerpt?: string; content_type: string; use_magical_scroll?: number | boolean | null }

function pageSlug(href: string) {
  const url = new URL(href, 'https://mashkeeza-e-roohaniat.com')
  if (!['mashkeeza-e-roohaniat.com', 'www.mashkeeza-e-roohaniat.com', 'mashkeeza-e-roohaniat.pages.dev'].includes(url.hostname)) return null
  return /^\/pages\/?$/.test(url.pathname) ? url.searchParams.get('slug') : null
}

function topicDestination(item: NavItem) {
  const pages = (item.children ?? []).filter(child => child.visible !== false && pageSlug(child.href))
  return pages.length === 1 ? item.href + '/read/' + encodeURIComponent(pages[0].id) : item.href + '/section'
}

// Main contents mirrors the complete visible public navigation, rather than
// only the categories which can launch a book.
type BookIndexEntry = { id: string; label: string; href?: string; newTab?: boolean; depth: number }
function bookIndexEntries(items: NavItem[], depth = 0): BookIndexEntry[] {
  return items.filter(item => item.visible !== false).flatMap(item => {
    const topic = item.href.startsWith('#topic-')
    const children = (item.children ?? []).filter(child => child.visible !== false)
    const isGroup = item.href === '#contact' || item.href === '#published-articles' || item.href === '#'
    const safe = /^(?:\/(?!\/)|#[^#]|https?:\/\/)/i.test(item.href)
    const href = topic ? topicDestination(item) : !isGroup && safe ? item.href : undefined
    const entry = { id: item.id, label: item.label, href, newTab: item.openInNewTab, depth }
    // The root topic opens its existing book section, where its subtopics are
    // already listed. Other navigation groups expose their children directly.
    return [entry, ...(!topic && children.length ? bookIndexEntries(children, depth + 1) : [])]
  })
}

function CompleteBookIndex({ items, compact = false }: { items: BookIndexEntry[]; compact?: boolean }) {
  return <ol className={compact ? 'book-complete-index compact' : 'book-complete-index'}>
    {items.map(item => <li key={item.id} className={item.depth ? 'book-index-child' : undefined}>
      {item.href ? <a className="deewan-plaque" href={item.href}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}>{item.label}</a>
        : <span className="book-index-group">{item.label}</span>}
    </li>)}
  </ol>
}

function turnDuration(distance: number) {
  return Math.round(680 + 670 / Math.sqrt(Math.max(1, distance)))
}

type Sheet = { face: HTMLDivElement; right: boolean }

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
    Object.assign(copy.style, {
      left:(panel.offsetLeft-left)+'px', right:'auto', top:(panel.offsetTop-top)+'px',
      bottom:'auto', width:panel.offsetWidth+'px', height:panel.offsetHeight+'px',
      overflow:'hidden', pointerEvents:'none'
    })
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    const columns = copy.querySelector<HTMLElement>('.deewan-columns')
    const viewport = panel.querySelector<HTMLElement>('.deewan-viewport')
    if (columns && viewport) columns.style.transform = 'translateX(' + (-viewport.scrollLeft) + 'px)'
    if (right && panel.scrollTop) {
      const inner = document.createElement('div')
      inner.append(...Array.from(copy.childNodes))
      inner.style.transform = 'translateY(-' + panel.scrollTop + 'px)'
      copy.append(inner)
    }
    face.append(copy)
  }
  return {face, right}
}

type PageTurn = { duration: number; outgoing: Sheet; landing: Sheet }

function animateLeaf(leaf: HTMLElement, turn: PageTurn) {
  const width = leaf.clientWidth / 2
  const height = leaf.clientHeight
  if (!width || !height) return

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

  const still = turn.landing.face
  Object.assign(still.style, {
    inset:'auto', left:(leaf.offsetLeft + (turn.landing.right ? width : 0))+'px',
    top:leaf.offsetTop+'px', width:width+'px', height:height+'px', pointerEvents:'none',
    backgroundRepeat:'no-repeat'
  })
  still.style.zIndex = '1'
  still.setAttribute('aria-hidden','true')
  leaf.before(still)

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

  const release = () => {
    motion.onfinish = null
    animations.forEach(animation => animation.cancel())
    sheet.remove()
    still.remove()
  }
  motion.onfinish = release
  return release
}

export type BookNavigation = { turnTo: (href: string) => string | null }

export function ManuscriptBook({ topic, cards, topics, menuItems, hash, navigation }: { navigation: Ref<BookNavigation>; topic: NavItem; cards: NavItem[]; topics: NavItem[]; menuItems: NavItem[]; hash: string }) {
  const articles = cards.filter(item => pageSlug(item.href))
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
  const mainIndex = hash === topic.href + '/contents'
  const arrivalStarted = useRef(0)
  const earlyTap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useLayoutEffect(() => {
    if (stage === 'cover') arrivalStarted.current = performance.now()
    return () => clearTimeout(earlyTap.current)
  }, [stage])
  function openByTouch() {
    const remaining = stage === 'cover' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1600 - (performance.now() - arrivalStarted.current) : 0
    clearTimeout(earlyTap.current)
    if (remaining > 0) earlyTap.current = setTimeout(() => setStage('opening'), remaining)
    else setStage('opening')
  }
  const intro = (stage === 'cover' || stage === 'opening' || stage === 'dedication' || stage === 'returning' || stage === 'closing' || stage === 'closed') && !card && !mainIndex
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
    const delay = stage === 'cover' ? (reduced ? 5000 : 6600) : (reduced ? 0 : 1850)
    const timer = window.setTimeout(() => setStage(next), delay)
    return () => window.clearTimeout(timer)
  }, [stage])
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(1)
  const paper = useRef<HTMLDivElement>(null)
  const measuredPage = useRef(0)
  const leftPaper = useRef<HTMLDivElement>(null)
  const leaf = useRef<HTMLDivElement>(null)
  const pendingSheet = useRef<PageTurn | null>(null)
  function rememberSheet(fromRight: boolean, distance = 1) {
    if (leaf.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pendingSheet.current = { duration:turnDuration(distance), outgoing:captureSheet(leaf.current, fromRight), landing:captureSheet(leaf.current, !fromRight) }
    }
  }
  useEffect(() => {
    if (stage !== 'dedication' || !intro) return
    const timer = window.setTimeout(() => {
      rememberSheet(false)
      setStage('title')
    }, 4000)
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
    fetch('https://mashkeeza-cms-api.smilingshaaaam.workers.dev/public/content', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw Error()
        const data = await response.json()
        if (!Array.isArray(data.items)) throw Error()
        if (!controller.signal.aborted) setEntries(data.items)
      }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [entries, attempt])
  const entry = card && entries?.find(item => item.slug === pageSlug(card.href) && item.content_type === 'page')

  useLayoutEffect(() => {
    const node = paper.current
    if (!node) { setPage(0); setCount(1); return }
    let active = true
    const measure = () => {
      if (!active || !node.clientWidth) return
      const pages = Math.max(1, Math.round(node.scrollWidth / node.clientWidth))
      measuredPage.current = Math.min(measuredPage.current, 2 * Math.floor((pages - 1) / 2))
      setCount(pages)
      if ((entry || !card) && lastPage.current === hash) {
        measuredPage.current = 2 * Math.floor((pages - 1) / 2)
        setPage(measuredPage.current)
        lastPage.current = null
      } else setPage(old => Math.min(old, 2 * Math.floor((pages - 1) / 2)))
    }
    measuredPage.current = 0
    setPage(0)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    node.addEventListener('load', measure, true)
    document.fonts.ready.then(measure)
    return () => { active = false; observer.disconnect(); node.removeEventListener('load', measure, true) }
  }, [stage, hash, entry, indexSignature, cards.map(item => item.id + item.label).join('|')])
  useLayoutEffect(() => {
    const node = paper.current
    if (node) node.scrollLeft = -page * node.clientWidth
    if (leftPaper.current && page + 1 < count) leftPaper.current.scrollLeft = -(page + 1) * leftPaper.current.clientWidth
  }, [hash, page, count])
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
        const total = Math.max(1, Math.round(right.scrollWidth / right.clientWidth))
        const destination = Math.min(2 * Math.floor((total - 1) / 2), measuredPage.current)
        right.scrollLeft = -destination * right.clientWidth
        left.style.visibility = destination + 1 < total ? 'visible' : 'hidden'
        left.scrollLeft = -(destination + 1) * left.clientWidth
      }
      stopTurn.current = animateLeaf(el, sheet)
    }
  }, [stage, hash, page])

  useImperativeHandle(navigation, () => ({
    turnTo(href) {
      const root = href.split('/')[0]
      const destination = topics.find(item => item.href === root)
      if (!destination) return null
      const target = href === root ? topicDestination(destination) : href
      const offset = topics.indexOf(destination) - topics.findIndex(item => item.id === topic.id)
      if (hash !== target || page !== 0 || intro) {
        stopTurn.current?.()
        rememberSheet(offset < 0 || (offset === 0 && page > 0), Math.max(1, Math.abs(offset)))
        clearTimeout(earlyTap.current)
        lastPage.current = null
        measuredPage.current = 0
        setPage(0)
        setStage('contents')
      }
      leaf.current?.closest('.deewan-book')?.scrollIntoView({ block: 'center', behavior: 'instant' })
      return target
    },
  }))

  function open(i: number, fromEnd = false) {
    const next = articles[i]
    const target = next ? topic.href + '/read/' + encodeURIComponent(next.id) : topic.href
    rememberSheet(fromEnd)
    lastPage.current = fromEnd ? target : null
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
    if (delta < 0 && !card && page === 0) {
      rememberSheet(true)
      if (mainIndex) window.location.hash = topic.href
      setStage('returning')
      return
    }
    const next = page + 2 * delta
    if (next >= 0 && next < count) {
      rememberSheet(delta < 0)
      measuredPage.current = next
      setPage(next)
    } else if (!mainIndex && current + delta >= -1 && current + delta < articles.length) {
      open(current + delta, delta < 0)
    }
  }
  function firstIndex() {
    if (mainIndex && page === 0) return
    rememberSheet(false, Math.max(1, current + 1) + page / 2)
    lastPage.current = null
    if (mainIndex) setPage(0)
    else window.location.hash = topic.href + '/contents'
  }
  return <section className="deewan-book" style={zoomed ? {touchAction:"manipulation"} : undefined} data-opening={intro ? stage : undefined} tabIndex={0} aria-label={topic.label}
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
        style={{visibility: side === 'left' && page + 1 >= count ? 'hidden' : 'visible'}}>
        <div className={'deewan-columns ' + (card ? 'printed-text' : 'printed-index')}>
          {card ? <><h3>{entry?.title || card.label}</h3>
        {entry && isMagicalScrollEnabled(entry.use_magical_scroll) && <a href={card.href}>متحرک طومار میں پڑھیں</a>}
        {entry ? <>{entry.excerpt && <p>{entry.excerpt}</p>}<ArticleRichBody body={entry.body} /></> :
          failed ? <button onClick={() => setAttempt(v => v + 1)}>دوبارہ کوشش کریں</button> :
          <p role="status">{entries ? 'یہ تحریر دستیاب نہیں ہے۔' : 'تحریر لوڈ ہو رہی ہے…'}</p>}</> : <>{!mainIndex && hash !== topic.href + '/section' && <nav className="topic-title-page book-full-title-index" aria-label="مرکزی فہرست" style={{display:'block'}}>
      <h2>مرکزی فہرست</h2>
      <CompleteBookIndex items={completeIndex} compact />
    </nav>}
      {!mainIndex && <h2>{topic.label}</h2>}
      <h3>{mainIndex ? 'مرکزی فہرست' : 'فہرست'}</h3>
      {mainIndex ? <CompleteBookIndex items={completeIndex} /> : indexItems.length ? <ol>{indexItems.map(item => {
        const internal = Boolean(pageSlug(item.href))
        return <li key={item.id}><a className="deewan-plaque" href={internal ? topic.href + '/read/' + encodeURIComponent(item.id) : item.href}
          target={!internal && item.openInNewTab ? '_blank' : undefined} rel={!internal && item.openInNewTab ? 'noopener noreferrer' : undefined}
          onClick={event => {
            if (!internal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            lastPage.current = null
            rememberSheet(false, Math.max(1, Math.ceil((count - page) / 2)) + articles.indexOf(item))
          }}>{item.label}</a></li>
      })}</ol> : <p>اس موضوع سے ابھی کوئی تحریر منسلک نہیں ہے۔</p>}</>}
        </div>
      </div>
    </div>)}
    {!intro && ['right','left'].map(side => <button key={side} type="button" className={'index-return index-return-' + side} onClick={firstIndex}>فہرست</button>)}
    <div aria-hidden="true" className="deewan-leaf" style={{inset:"0 4%"}} ref={leaf} />
    {(!intro || stage === 'returning' || stage === 'dedication') && <div className="deewan-controls">
      <button onClick={() => turn(-1)}>پچھلا صفحہ</button>
      {card && <span aria-live="polite">{page + 1}–{Math.min(page + 2, count)} / {count}</span>}
      <button disabled={!intro && (mainIndex || current + 1 >= articles.length) && page + 2 >= count} onClick={() => turn(1)}>اگلا صفحہ</button>
    </div>}
  </section>
}
