import type { CSSProperties } from 'react'
import type { NavItem } from './main-nav'
import styles from './topic-card-grid.module.css'

const artwork = new Set([
  'home', 'ism-azam', 'jafar', 'adad', 'nujoom', 'dast-shanasi', 'wazaif',
  'taweez', 'talismat', 'nawaz', 'peshgoiyan', 'jafri-hisabat', 'published-articles', 'contact',
])

export function TopicCardGrid({ items, openMenu }: { items: NavItem[], openMenu: (id: string) => void }) {
  return (
    <nav className={styles.grid} style={{ '--columns': Math.max(1, Math.ceil(items.length / 2)) } as CSSProperties} dir="rtl" aria-label="موضوعات کے کارڈ">
      {items.map(item => {
        const key = item.href.startsWith('#topic-') ? item.href.slice(7) : item.id
        const image = artwork.has(key) ? key : 'published-articles'
        const content = <>
          <span className={styles.title}>{item.label}</span>
          <img loading="lazy" decoding="async" width="480" height="285" alt="" src={'/images/topic-cards/' + image + '.webp'} />
        </>
        const submenu = !item.href.startsWith('#topic-') &&
          (item.id === 'published-articles' || item.id === 'contact' && item.href === '#contact')
        return submenu
          ? <button className={styles.card} type="button" key={item.id} onClick={() => openMenu(item.id)}>{content}</button>
          : <a className={styles.card} key={item.id} href={item.href} target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
              onClick={() => { if (item.href.startsWith('#topic-')) window.scrollTo(0, 0) }}>{content}</a>
      })}
    </nav>
  )
}
