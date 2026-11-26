import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { NavItem } from './main-nav'
import { CMS_API, useVisualCms } from './visual-cms'
import { TopicGalleryEditor } from './topic-gallery-editor'
import { emptyGallery, readGallery, safeCardUrl, type TopicCard } from './topic-gallery-settings'
import styles from './topic-card-grid.module.css'

const artwork = new Set([
  'home', 'ism-azam', 'jafar', 'adad', 'nujoom', 'dast-shanasi', 'wazaif',
  'taweez', 'talismat', 'nawaz', 'peshgoiyan', 'jafri-hisabat', 'published-articles', 'contact',
])

// Extend the actual edge pixels, leaving the original central artwork undistorted.
function extendArtwork(image: HTMLImageElement) {
  const canvas = image.previousElementSibling
  if (!(canvas instanceof HTMLCanvasElement)) return
  const sw = image.naturalWidth, sh = image.naturalHeight
  if (!sw || !sh || sw / sh >= 1.45) return
  const w = 960, h = 570
  const center = h * sw / sh
  const side = (w - center) / 2
  if (side <= 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = w
  canvas.height = h
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Reflect a strip from each edge into the extra landscape area.
  const slice = Math.min(sw, side / center * sw)
  ctx.save()
  ctx.translate(side, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(image, 0, 0, slice, sh, 0, 0, side, h)
  ctx.restore()
  ctx.save()
  ctx.translate(w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(image, sw - slice, 0, slice, sh, 0, 0, side, h)
  ctx.restore()
  ctx.drawImage(image, 0, 0, sw, sh, side, 0, center, h)
  canvas.dataset.extended = 'true'
}

export function TopicCardGrid({ items, showGrid, openMenu, turnToCard }: { turnToCard: (href: string) => boolean; items: NavItem[], showGrid: boolean, openMenu: (id: string) => void }) {
  const cms = useVisualCms()
  const [published, setPublished] = useState(emptyGallery)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const request = new AbortController()
    fetch(CMS_API + '/public/design', { cache: 'no-store', signal: request.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPublished(readGallery(data.settings?.published_appearance?.topicGallery)) })
      .catch(() => {})
    return () => request.abort()
  }, [])
  const settings = cms?.gallery ?? published
  const defaults: TopicCard[] = items.map(item => {
    const key = item.href.startsWith('#topic-') ? item.href.slice(7) : item.id
    return { ...item, featured: ['nujoom','jafar','adad'].includes(key),
      image: '/images/topic-cards/' + (artwork.has(key) ? key : 'published-articles') + '.webp' }
  })
  const cards = [...defaults, ...settings.added].filter(c => !settings.hidden.includes(c.id))
    .map(c => ({ ...c, ...settings.changes[c.id], id: c.id }))
    .filter(c => c.label && safeCardUrl(c.href) && safeCardUrl(c.image, true))
  const featured = cards.filter(c => c.featured)
  const repeats = featured.length ? Math.ceil(9 / featured.length) : 0
  const viewport = useRef<HTMLDivElement>(null)
  const interacting = useRef(false)
  const resumeAt = useRef(0)
  const mouseDrag = useRef<{ x: number; start: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  useEffect(() => {
    const el = viewport.current
    if (!el || !featured.length) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const group = el.firstElementChild?.firstElementChild as HTMLElement | null
    if (!group) return
    let cycle = group.offsetWidth
    let position = el.scrollLeft || cycle
    if (!motion.matches) el.scrollLeft = position
    let last = 0
    let frame = 0
    const resize = new ResizeObserver(() => { cycle = group.offsetWidth; position = el.scrollLeft })
    resize.observe(group)
    const tick = (now: number) => {
      const elapsed = last ? Math.min(50, now - last) : 0
      last = now
      if (motion.matches || paused || interacting.current || now < resumeAt.current ||
          el.matches(':focus-within') || (window.matchMedia('(hover: hover)').matches && el.matches(':hover'))) {
        position = el.scrollLeft
      } else if (cycle) {
        position = cycle + ((position + cycle * elapsed / (featured.length * repeats * 5000)) % cycle)
        el.scrollLeft = position
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); resize.disconnect() }
  }, [featured.length, repeats, paused])
  function endSwipe() {
    interacting.current = false
    resumeAt.current = performance.now() + 900
    mouseDrag.current = null
  }
  function renderCard(card: TopicCard, strip = false, duplicate = false) {
    const content = <><span className={styles.title}>{card.label}</span>
      <span className={styles.artwork} key={card.image}>
        <img className={styles.artworkBackdrop} loading="lazy" decoding="async" width="480" height="285" alt="" aria-hidden="true" src={card.image}/>
        <canvas className={styles.artworkExtension} width={1} height={1} aria-hidden="true"/>
        <img className={styles.artworkImage} loading="lazy" decoding="async" width="480" height="285" alt="" src={card.image} onLoad={event => extendArtwork(event.currentTarget)}/>
      </span></>
    const style = { '--card-scale': Math.max(.5, Math.min(2, (card.width || 100) / 100)),
      ...(card.height && !strip ? { height: Math.min(900, Math.max(1, card.height)) } : {}) } as CSSProperties
    const props = { className: styles.card, style, tabIndex: duplicate ? -1 : undefined, 'aria-hidden': duplicate || undefined }
    if ((card.id === 'published-articles' && card.href === '#published-articles') || (card.id === 'contact' && card.href === '#contact')) {
      return <button {...props} key={card.id} type="button" onClick={() => openMenu(card.id)}>{content}</button>
    }
    return <a {...props} key={card.id} href={card.href} target={card.openInNewTab ? '_blank' : undefined}
      rel={card.openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || card.openInNewTab) return
        if (strip && !showGrid && turnToCard(card.href)) event.preventDefault()
        else if (card.href.startsWith('#topic-')) window.scrollTo(0, 0)
      }}>{content}</a>
  }
  return <>
    {featured.length > 0 && <section className={styles.strip} aria-label="منتخب موضوعات">
      <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'چلائیں' : 'روکیں'}</button>
      <div dir="ltr" className={styles.window} ref={viewport}
        onPointerDown={e => {
          suppressClick.current = false
          interacting.current = true
          if (e.pointerType === 'mouse' && e.button === 0) {
            mouseDrag.current = { x: e.clientX, start: e.currentTarget.scrollLeft, moved: false }
          }
        }}
        onPointerMove={e => {
          const drag = mouseDrag.current
          if (!drag || !e.buttons) return
          const delta = e.clientX - drag.x
          if (!drag.moved && Math.abs(delta) < 6) return
          drag.moved = true
          suppressClick.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.scrollLeft = drag.start - delta
        }}
        onPointerLeave={() => { if (!mouseDrag.current?.moved) endSwipe() }}
        onPointerUp={endSwipe} onPointerCancel={endSwipe} onLostPointerCapture={endSwipe}
        onDragStart={e => e.preventDefault()}
        onWheel={() => { resumeAt.current = performance.now() + 1000 }}
        onScroll={e => { if (interacting.current || performance.now() < resumeAt.current) resumeAt.current = performance.now() + 300 }}
        onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false } }}>
        <div className={styles.track}>
        {[0,1,2].map(copy => <div className={styles.group} key={copy}>{Array.from({ length: repeats }, (_, n) =>
          <div className={styles.batch} key={n} data-copy={copy === 1 && n === 0 ? 0 : 1}>{featured.map(c => renderCard(c, true, copy !== 1 || n > 0))}</div>)}</div>)}
      </div></div>
    </section>}
    {showGrid && <nav className={styles.grid} dir="rtl" aria-label="موضوعات کے کارڈ">{cards.map(c => renderCard(c))}</nav>}
    {cms?.editing && cms.galleryOpen && createPortal(<TopicGalleryEditor cards={cards} settings={settings}
      change={cms.updateGallery} close={cms.closeGallery}/>, document.body)}
  </>
}
