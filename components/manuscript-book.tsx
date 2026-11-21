'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const duration = 1350

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
    backgroundImage:"url('/images/deewan/book.webp')",
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

type PageTurn = { outgoing: Sheet; landing: Sheet }

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
    top:leaf.offsetTop+'px', width:width+'px', height:height+'px', pointerEvents:'none'
  })
  still.setAttribute('aria-hidden','true')
  leaf.before(still)

  const transforms: Keyframe[] = []
  const profiles: [Keyframe[], Keyframe[]] = [[], []]
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
    for (const side of [0, 1] as const) {
      const right = side === 0 ? fromRight : !fromRight
      const spine = right ? 0 : width
      const outside = right ? width : 0
      const inward = right ? -1 : 1
      const reach = outside + inward * width * .035 * bend
      const rise = height * .032 * bend
      const path = 'M ' + spine + ' 0 Q ' + ((outside + spine)/2) + ' ' + (rise*.12) + ' ' + reach + ' ' + rise*.25 +
        ' Q ' + (outside-inward*width*.012*bend) + ' ' + height*.52 + ' ' + outside + ' ' + (height-rise) +
        ' Q ' + ((outside + spine)/2) + ' ' + (height+rise*.15) + ' ' + spine + ' ' + height + ' Z'
      profiles[side].push({clipPath:'path("' + path + '")'})
    }
    light.push({opacity:.78*bend,backgroundPosition:(18 + 65 * progress) + '% 50%'})
  }

  const timing: KeyframeAnimationOptions = {duration, fill:'both'}
  const motion = sheet.animate(transforms, timing)
  const animations = [motion]
  ;[front, back].forEach((face, index) => {
    const glaze = document.createElement('div')
    Object.assign(glaze.style, {
      position:'absolute', inset:'0', pointerEvents:'none',
      backgroundImage:'linear-gradient(105deg,transparent 10%,rgba(255,248,219,.12) 55%,transparent 81%)',
      backgroundSize:'160% 100%'
    })
    face.append(glaze)
    animations.push(face.animate(profiles[index], timing), glaze.animate(light, timing))
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

export function ManuscriptBook({ topic, cards, hash }: { topic: NavItem; cards: NavItem[]; hash: string }) {
  const articles = cards.filter(item => pageSlug(item.href))
  const current = articles.findIndex(item => hash === topic.href + '/read/' + encodeURIComponent(item.id))
  const card = articles[current]
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(1)
  const paper = useRef<HTMLDivElement>(null)
  const leaf = useRef<HTMLDivElement>(null)
  const pendingSheet = useRef<PageTurn | null>(null)
  function rememberSheet() {
    if (leaf.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pendingSheet.current = { outgoing:captureSheet(leaf.current, !card), landing:captureSheet(leaf.current, Boolean(card)) }
    }
  }
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
      setCount(pages)
      if (entry && lastPage.current === hash) {
        setPage(pages - 1)
        lastPage.current = null
      } else setPage(old => Math.min(old, pages - 1))
    }
    setPage(0)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    node.addEventListener('load', measure, true)
    document.fonts.ready.then(measure)
    return () => { active = false; observer.disconnect(); node.removeEventListener('load', measure, true) }
  }, [hash, entry])
  useLayoutEffect(() => {
    const node = paper.current
    if (node) node.scrollLeft = -page * node.clientWidth
  }, [hash, page, count])
  useLayoutEffect(() => {
    const el = leaf.current
    const sheet = pendingSheet.current
    pendingSheet.current = null
    if (el && sheet) return animateLeaf(el, sheet)
  }, [hash, page])

  function open(i: number, fromEnd = false) {
    const next = articles[i]
    const target = next ? topic.href + '/read/' + encodeURIComponent(next.id) : topic.href
    rememberSheet()
    lastPage.current = fromEnd ? target : null
    window.location.hash = target
  }
  function turn(delta: number) {
    if (card && page + delta >= 0 && page + delta < count) {
      rememberSheet()
      setPage(page + delta)
    }
    else if (current + delta >= -1 && current + delta < articles.length) open(current + delta, delta < 0 && current > 0)
  }
  return <section className="deewan-book" tabIndex={0} aria-label={topic.label}
    onKeyDown={e => {
      if (e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); turn(e.key === 'ArrowLeft' ? 1 : -1) }
    }}
    onTouchStart={e => { touch.current = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null }}
    onTouchCancel={() => { touch.current = null }}
    onTouchEnd={e => {
      const start = touch.current
      touch.current = null
      if (!start) return
      const dx = e.changedTouches[0].clientX - start[0]
      if (Math.abs(dx) > 45 && Math.abs(dx) > 1.6 * Math.abs(e.changedTouches[0].clientY - start[1])) turn(dx > 0 ? 1 : -1)
    }}>
    <div aria-hidden="true" className="deewan-sky-backdrop"><Starfield count={125} seed={41} className="inset-0" /></div>
    <div className="deewan-index">
      <h2>{topic.label}</h2>
      <h3>فہرست</h3>
      {cards.length ? <ol>{cards.map(item => {
        const internal = Boolean(pageSlug(item.href))
        return <li key={item.id}><a className="deewan-plaque" href={internal ? topic.href + '/read/' + encodeURIComponent(item.id) : item.href}
          aria-current={item.id === card?.id ? 'page' : undefined}
          target={!internal && item.openInNewTab ? '_blank' : undefined} rel={!internal && item.openInNewTab ? 'noopener noreferrer' : undefined}
          onClick={() => { lastPage.current = null; if (internal && (card?.id !== item.id || page !== 0)) rememberSheet(); if (card?.id === item.id) setPage(0) }}>{item.label}</a></li>
      })}</ol> : <p>اس موضوع سے ابھی کوئی تحریر منسلک نہیں ہے۔</p>}
    </div>
    {card && <div className="deewan-reading">
      <div className="deewan-viewport" ref={paper}><div className="deewan-columns">
        <h3>{entry?.title || card.label}</h3>
        {entry && isMagicalScrollEnabled(entry.use_magical_scroll) && <a href={card.href}>متحرک طومار میں پڑھیں</a>}
        {entry ? <>{entry.excerpt && <p>{entry.excerpt}</p>}<ArticleRichBody body={entry.body} /></> :
          failed ? <button onClick={() => setAttempt(v => v + 1)}>دوبارہ کوشش کریں</button> :
          <p role="status">{entries ? 'یہ تحریر دستیاب نہیں ہے۔' : 'تحریر لوڈ ہو رہی ہے…'}</p>}
      </div></div>
    </div>}
    <div aria-hidden="true" className="deewan-leaf" style={{top:"1.5%", bottom:"2.5%"}} ref={leaf} />
    <div className="deewan-controls">
      <button disabled={current < 0} onClick={() => turn(-1)}>پچھلا صفحہ</button>
      {card && <span aria-live="polite">{page + 1} / {count}</span>}
      <button disabled={current + 1 >= articles.length && page + 1 >= count} onClick={() => turn(1)}>اگلا صفحہ</button>
    </div>
  </section>
}
