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
    const el = leaf.current
    if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const anim = el.animate([{ transform: 'rotateY(0deg)', opacity: 0.9 }, { opacity: 0.9, offset: 0.65 }, { transform: 'rotateY(' + (backwards.current ? -175 : 175) + 'deg)', opacity: 0 }], { duration: 520, easing: 'ease-in-out' })
      return () => anim.cancel()
    }
  }, [hash, page, count])

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
    <div aria-hidden="true" className="deewan-leaf" ref={leaf} />
    <div className="deewan-controls">
      <button disabled={current < 0} onClick={() => turn(-1)}>پچھلا صفحہ</button>
      {card && <span aria-live="polite">{page + 1} / {count}</span>}
      <button disabled={current + 1 >= articles.length && page + 1 >= count} onClick={() => turn(1)}>اگلا صفحہ</button>
    </div>
  </section>
}
