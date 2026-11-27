'use client'

import { useEffect, useState } from 'react'
import {
  articleBackgroundStyle,
  articleOverlayOpacity,
  type ArticleAppearance,
} from './article-background'
import { ArticleRichBody } from './article-rich-body'
import { RelatedTopics } from './related-topics'
import { MagicalScroll, isMagicalScrollEnabled } from './magical-scroll'

const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

type Article = ArticleAppearance & {
  id: string
  slug?: string
  title: string
  body?: string | null
  excerpt?: string | null
  content_type?: string
  published_at?: string | null
  paper_opacity?: number | null
  use_magical_scroll?: boolean | number | null
  include_in_book?: boolean | number | string | null
}

let pending: Promise<Article[]> | undefined

export function usePublishedContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    let active = true
    pending ??= fetch(CMS_API + '/public/content', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw Error('Articles unavailable')
        const data = await response.json()
        if (!Array.isArray(data.items)) throw Error('Invalid articles')
        return data.items.filter((item: Article) => item && typeof item.id === 'string' &&
          typeof item.title === 'string') as Article[]
      }).catch(error => { pending = undefined; throw error })
    pending.then(items => {
      if (active) { setArticles(items); setStatus('ready') }
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [])
  return { items: articles, status }
}

export function usePublishedArticles() {
  const { items, status } = usePublishedContent()
  return { articles: items.filter(item => item.content_type !== 'page'), status }
}

export function ArticleBrowser() {
  const { articles, status } = usePublishedArticles()
  const [hash, setHash] = useState('')
  useEffect(() => {
    const update = () => setHash(window.location.hash)
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const selected = articles.find(item => hash === '#article-' + encodeURIComponent(item.id))
  if (!hash.startsWith('#article-')) return null
  if (!selected) return <p role="status" className="relative z-20 p-6 text-center text-amber-100">{status === 'loading' ? 'مضمون لوڈ ہو رہا ہے…' : 'مضمون دستیاب نہیں ہے۔'}</p>
  return <section dir="rtl" aria-label={selected.title} className="relative z-20 mx-auto w-full max-w-5xl px-4 py-5">
    {isMagicalScrollEnabled(selected.use_magical_scroll) ? <MagicalScroll key={selected.id} article={selected} /> : (
                <article
                  className="relative isolate min-h-[320px] overflow-hidden rounded-xl"
                  style={articleBackgroundStyle(selected)}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                      backgroundColor: `rgba(0,0,0,${articleOverlayOpacity(
                        selected.overlay_opacity
                      )})`,
                    }}
                  />

                  <div className="relative z-10 p-3 sm:p-6">
                    <h2 className="gold-text mb-2 text-base font-bold leading-[2] sm:text-2xl">
                      {selected.title}
                    </h2>

                    {selected.excerpt && (
                      <p className="mb-2 text-xs leading-[1.9] text-amber-100/90 sm:text-base">
                        {selected.excerpt}
                      </p>
                    )}

                    <div className="whitespace-pre-wrap break-words text-xs leading-[2] text-amber-50 sm:text-base md:leading-[2.3]">
                      <ArticleRichBody body={selected.body} />
                    </div>
                  </div>
                </article>
    )}
    {!isMagicalScrollEnabled(selected.use_magical_scroll) && <RelatedTopics key={selected.id} slug={selected.slug} />}
  </section>
}
