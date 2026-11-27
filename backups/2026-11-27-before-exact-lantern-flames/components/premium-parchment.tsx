'use client'
import { useEffect, type CSSProperties } from 'react'
import { ArticleRichBody } from './article-rich-body'
import type { ArticleAppearance } from './article-background'
import { premiumImage } from './premium-parchment-settings'
import './premium-parchment.css'

type Item = ArticleAppearance & {title: string; excerpt?: string | null; body?: string | null}
export function PremiumParchment({ item }: {item: Item}) {
  const image = premiumImage(item)
  // The legacy book deliberately uses a 1280px viewport. Override it only
  // while this independent reading mode is mounted, and restore on exit.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return
    const previous = meta.content
    meta.content = 'width=device-width, initial-scale=1'
    return () => { meta.content = previous }
  }, [])
  return <article className="premium-sheet" lang="ur" dir="rtl" data-art={image ? '' : undefined}
    style={image ? {'--premium-image': 'url("' + image + '")'} as CSSProperties : undefined}>
    <div className="premium-cap premium-top" aria-hidden="true"/>
    <div className="premium-middle">
      <div className="premium-fallback-brand">مشکیزہ روحانیت</div>
      <h1 className="premium-title">{item.title}</h1>
      {item.excerpt && <p className="premium-excerpt">{item.excerpt}</p>}
      <div className="premium-body"><ArticleRichBody body={item.body}/></div>
    </div>
    <div className="premium-cap premium-bottom" aria-hidden="true"/>
  </article>
}
