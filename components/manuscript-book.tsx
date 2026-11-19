'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isMagicalScrollEnabled } from './magical-scroll'
import { ArticleRichBody } from './article-rich-body'
import type { NavItem } from './main-nav'

type Entry = { slug: string; title: string; body?: string; excerpt?: string; content_type: string; use_magical_scroll?: number | boolean | null }

function pageSlug(href: string) {
  const url = new URL(href, 'https://mashkeeza-e-roohaniat.com')
  if (!['mashkeeza-e-roohaniat.com', 'www.mashkeeza-e-roohaniat.com', 'mashkeeza-e-roohaniat.pages.dev'].includes(url.hostname)) return null
  return /^\/pages\/?$/.test(url.pathname) ? url.searchParams.get('slug') : null
}

const leafBands = 16
const duration = 1350

// Clip the sheet into adjoining strips perpendicular to the moving crease.
function foldedStrip(left: number, right: number, width: number, height: number, nx: number, ny: number) {
  type Point = [number, number]
  let points: Point[] = [[0, 0], [width, 0], [width, height], [0, height]]
  for (const [edge, sign] of [[left, 1], [right, -1]]) {
    const clipped: Point[] = []
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]
      const da = sign * (a[0] * nx + a[1] * ny - edge)
      const db = sign * (b[0] * nx + b[1] * ny - edge)
      if (da >= 0) clipped.push(a)
      if ((da >= 0) !== (db >= 0)) {
        const f = da / (da - db)
        clipped.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
      }
    })
    points = clipped
  }
  return 'polygon(' + points.map(([x,y]) => x + 'px ' + y + 'px').join(',') + ')'
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
    position:'absolute', inset:'0', overflow:'hidden', fontStyle:'normal', direction:'rtl',
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
  const { outgoing, landing } = turn
  const reverse = outgoing.right
  const incoming = captureSheet(leaf, !reverse)
  outgoing.face.style.transform = reverse ? 'scaleX(-1)' : ''
  incoming.face.style.transform = reverse ? '' : 'scaleX(-1)'

  const width = leaf.clientWidth / 2
  const height = leaf.clientHeight
  if (!width || !height) return
  // A diagonal bend reaches the bottom outside corner first in both directions.
  const nx = -Math.cos(0.44), ny = Math.sin(0.44)
  const start = nx * width
  // One unbent panel spans the entire binding. Every flexible strip starts
  // beyond the lower end of the seam, so no point on that seam can lift.
  const sewnEdge = start + ny * height
  const step = -start / (leafBands - 1)
  const stripEdge = (i: number) => i === 0 ? start : sewnEdge + (i - 1) * step
  leaf.style.transform = reverse ? 'scaleX(-1)' : ''
  const pieces = Array.from(leaf.querySelectorAll<HTMLElement>('[data-fold]'))
  const frames: Keyframe[][] = pieces.map(() => [])
  const flips: number[] = pieces.map(() => 1)
  pieces.forEach((piece, i) => {
    piece.replaceChildren(outgoing.face.cloneNode(true), incoming.face.cloneNode(true))
    piece.style.clipPath = foldedStrip(stripEdge(i) - 0.45, stripEdge(i + 1) + 0.45, width, height, nx, ny)
  })
  const eased = (v: number) => {
    const t = Math.max(0, Math.min(1, v))
    return t * t * (3 - 2 * t)
  }
  for (let frame = 0; frame <= 42; frame++) {
    const t = frame / 42
    const hinge = 180 * eased(t)
    let distance = start, lift = 0
    pieces.forEach((_, i) => {
      const edge = stripEdge(i)
      const span = stripEdge(i + 1) - edge
      const u = i / (leafBands - 1)
      const bend = 52 * u * Math.sin(Math.PI * t) *
        eased((t - 0.14 * (1 - u)) / 0.26) * (1 - eased((t - 0.45) / 0.48))
      const radians = bend * Math.PI / 180
      const drift = distance - edge
      const transform = 'translateX(' + width + 'px) rotateY(' + hinge + 'deg) translateX(-' + width + 'px) ' +
        'translate3d(' + nx * drift + 'px,' + ny * drift + 'px,' + lift + 'px) ' +
        'translate(' + nx * edge + 'px,' + ny * edge + 'px) rotate3d(' + ny + ',' + (-nx) + ',0,' + bend + 'deg) ' +
        'translate(' + (-nx * edge) + 'px,' + (-ny * edge) + 'px)'
      const h = hinge * Math.PI / 180
      const normal = Math.cos(h) * Math.cos(radians) + nx * Math.sin(h) * Math.sin(radians)
      if (normal <= 0 && flips[i] === 1) flips[i] = t
      frames[i].push({transform, opacity:1,
        filter:'brightness(' + (1 - 0.22 * Math.sin((hinge + bend) * Math.PI / 180) ** 2) + ')'})
      distance += span * Math.cos(radians)
      lift += span * Math.sin(radians)
    })
  }
  // Keep the old destination visible until the reverse face settles onto it.
  // The stationary copy is outside the mirrored moving sheet.
  const still = landing.face
  const half = leaf.clientWidth / 2
  Object.assign(still.style, {
    inset:'auto', left:(leaf.offsetLeft + (landing.right ? half : 0))+'px',
    top:leaf.offsetTop+'px', width:half+'px', height:leaf.clientHeight+'px', pointerEvents:'none'
  })
  still.setAttribute('aria-hidden','true')
  leaf.before(still)
  const animations = pieces.map((piece,i) => piece.animate(frames[i], { duration }))
  pieces.forEach((piece, i) => {
    // Swap surfaces edge-on, independently along the curling sheet.
    const timing = { duration, fill:'both' as const }
    const edge = flips[i]
    animations.push(piece.children[0].animate([
      {opacity:1,offset:0},{opacity:1,offset:edge},{opacity:0,offset:edge},{opacity:0,offset:1}
    ], timing), piece.children[1].animate([
      {opacity:0,offset:0},{opacity:0,offset:edge},{opacity:1,offset:edge},{opacity:1,offset:1}
    ], timing))
  })
  const shadow = leaf.querySelector('.deewan-turn-shadow')
  if (shadow) animations.push(shadow.animate([
    {opacity:0,transform:'translate(-55%,8%) scale(.4,.85)'},
    {opacity:.28,transform:'translateX(0) scaleX(.42)',offset:.56},
    {opacity:0,transform:'translateX(55%) scaleX(.85)'}
  ], {duration}))
  const release = () => {
    animations.forEach(animation => animation.cancel())
    still.remove()
    pieces.forEach(piece => piece.replaceChildren())
  }
  animations[0].onfinish = release
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
    <div aria-hidden="true" className="deewan-leaf" style={{top:"5.6%", bottom:"8.2%"}} ref={leaf}><div className="deewan-turn-shadow" />{Array.from({length:leafBands}, (_,i) => <i key={i} data-fold="" className="deewan-paper" style={{
      left:0, right:'auto', width:'50%', transformOrigin:'0 0', backgroundImage:'none', fontStyle:'normal'
    }} />)}</div>
    <div className="deewan-controls">
      <button disabled={current < 0} onClick={() => turn(-1)}>پچھلا صفحہ</button>
      {card && <span aria-live="polite">{page + 1} / {count}</span>}
      <button disabled={current + 1 >= articles.length && page + 1 >= count} onClick={() => turn(1)}>اگلا صفحہ</button>
    </div>
  </section>
}
