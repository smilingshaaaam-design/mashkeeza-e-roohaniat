'use client'
import type { CSSProperties } from 'react'
import { ArticleRichBody } from './article-rich-body'
import type { ArticleAppearance } from './article-background'
import { premiumImage } from './premium-parchment-settings'
import './premium-parchment.css'

type Item = ArticleAppearance & {title: string; excerpt?: string | null; body?: string | null}
export function PremiumParchment({ item }: {item: Item}) {
  const image = premiumImage(item)
  return <article className="premium-sheet" lang="ur" dir="rtl" data-art={image ? '' : undefined}
    style={image ? {'--premium-image': 'url("' + image + '")'} as CSSProperties : undefined}>
    <div className="premium-cap premium-top" aria-hidden="true">{image && <><div className="premium-crown-paper" aria-hidden="true"><span className="premium-crown-half premium-crown-left"/><span className="premium-crown-half premium-crown-right"/></div><div className="premium-lantern premium-lantern-left" aria-hidden="true"><div className="premium-lantern-dark"></div><div className="premium-lantern-chamber"><div className="premium-lantern-halo"></div><div className="premium-lantern-fire"></div></div></div><div className="premium-lantern premium-lantern-right" aria-hidden="true"><div className="premium-lantern-dark"></div><div className="premium-lantern-chamber"><div className="premium-lantern-halo"></div><div className="premium-lantern-fire"></div></div></div></>}</div>
    <div className="premium-middle">
      <div className="premium-fallback-brand">مشکیزہ روحانیت</div>
      <h1 className="premium-title">{item.title}</h1>
      {item.excerpt && <p className="premium-excerpt">{item.excerpt}</p>}
      <div className="premium-body"><ArticleRichBody body={item.body}/></div>
    </div>
    <div className="premium-cap premium-bottom" aria-hidden="true"/>
  </article>
}
