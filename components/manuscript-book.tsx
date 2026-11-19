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

function animateLeaf(leaf: HTMLElement, reverse: boolean) {
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
  pieces.forEach((piece, i) => {
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
      frames[i].push({transform, opacity:Math.min(1,t * 18,(1 - t) * 14),
        filter:'brightness(' + (1 - 0.22 * Math.sin((hinge + bend) * Math.PI / 180) ** 2) + ')'})
      distance += span * Math.cos(radians)
      lift += span * Math.sin(radians)
    })
  }
  const animations = pieces.map((piece,i) => piece.animate(frames[i], { duration }))
  const shadow = leaf.querySelector('.deewan-turn-shadow')
  if (shadow) animations.push(shadow.animate([
    {opacity:0,transform:'translate(-55%,8%) scale(.4,.85)'},
    {opacity:.28,transform:'translateX(0) scaleX(.42)',offset:.56},
    {opacity:0,transform:'translateX(55%) scaleX(.85)'}
  ], {duration}))
  return () => animations.forEach(animation => animation.cancel())
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
  const backwards = useRef(false)
  const lastPage = useRef<string | null>(null)
  const touch = useRef<[number, number] | null>(null)
  const hasArticle = Boolean(card)
  useEffect(() => {
    if (!hasArticle || entries) return
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
  }, [hasArticle, entries, attempt])
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
    if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return animateLeaf(el, backwards.current)
    }
  }, [hash, page])

  function open(i: number, fromEnd = false) {
    const next = articles[i]
    const target = next ? topic.href + '/read/' + encodeURIComponent(next.id) : topic.href
    backwards.current = fromEnd || !next
    lastPage.current = fromEnd ? target : null
    window.location.hash = target
  }
  function turn(delta: number) {
    backwards.current = delta < 0
    if (card && page + delta >= 0 && page + delta < count) setPage(page + delta)
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
          onClick={() => { lastPage.current = null; backwards.current = false; if (card?.id === item.id) setPage(0) }}>{item.label}</a></li>
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
      left:0, right:'auto', width:'50%', transformOrigin:'0 0', backgroundSize:'480% 170%', backgroundPosition:'76% 47%', borderRadius:'1% 0 0 1%'
    }} />)}</div>
    <div className="deewan-controls">
      <button disabled={current < 0} onClick={() => turn(-1)}>پچھلا صفحہ</button>
      {card && <span aria-live="polite">{page + 1} / {count}</span>}
      <button disabled={current + 1 >= articles.length && page + 1 >= count} onClick={() => turn(1)}>اگلا صفحہ</button>
    </div>
  </section>
}
