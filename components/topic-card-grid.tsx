import { useEffect, useState, type CSSProperties } from 'react'
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

export function TopicCardGrid({ items, openMenu }: { items: NavItem[], openMenu: (id: string) => void }) {
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
  function renderCard(card: TopicCard, strip = false, duplicate = false) {
    const content = <><span className={styles.title}>{card.label}</span>
      <img loading="lazy" decoding="async" width="480" height="285" alt="" src={card.image}/></>
    const style = { '--card-scale': Math.max(.5, Math.min(2, (card.width || 100) / 100)),
      ...(card.height && !strip ? { height: Math.min(900, Math.max(1, card.height)) } : {}) } as CSSProperties
    const props = { className: styles.card, style, tabIndex: duplicate ? -1 : undefined, 'aria-hidden': duplicate || undefined }
    if ((card.id === 'published-articles' && card.href === '#published-articles') || (card.id === 'contact' && card.href === '#contact')) {
      return <button {...props} key={card.id} type="button" onClick={() => openMenu(card.id)}>{content}</button>
    }
    return <a {...props} key={card.id} href={card.href} target={card.openInNewTab ? '_blank' : undefined}
      rel={card.openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={() => { if (card.href.startsWith('#topic-')) window.scrollTo(0, 0) }}>{content}</a>
  }
  return <>
    {featured.length > 0 && <section className={styles.strip} aria-label="منتخب موضوعات">
      <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'چلائیں' : 'روکیں'}</button>
      <div dir="ltr" className={styles.window}><div className={styles.track} data-paused={paused}
        style={{ '--duration': (featured.length * repeats * 5) + 's' } as CSSProperties}>
        {[0,1].map(copy => <div className={styles.group} key={copy}>{Array.from({ length: repeats }, (_, n) =>
          <div className={styles.batch} key={n} data-copy={copy + n}>{featured.map(c => renderCard(c, true, copy + n > 0))}</div>)}</div>)}
      </div></div>
    </section>}
    <nav className={styles.grid} dir="rtl" aria-label="موضوعات کے کارڈ">{cards.map(c => renderCard(c))}</nav>
    {cms?.editing && cms.galleryOpen && createPortal(<TopicGalleryEditor cards={cards} settings={settings}
      change={cms.updateGallery} close={cms.closeGallery}/>, document.body)}
  </>
}
