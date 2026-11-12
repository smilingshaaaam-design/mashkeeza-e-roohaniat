'use client'

import { useEffect, useState } from 'react'
import { ArticleRichBody } from './article-rich-body'

const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

type Article = {
  id: string
  title: string
  body?: string | null
  excerpt?: string | null
  content_type?: string
  published_at?: string | null
}

export function ArticleBrowser() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${CMS_API}/public/content`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load articles')
        return response.json()
      })
      .then(data => {
        if (controller.signal.aborted) return
        const list: Article[] = Array.isArray(data.items) ? data.items.filter(
          (item: unknown): item is Article => !!item && typeof item === 'object' &&
            typeof (item as Article).id === 'string' &&
            typeof (item as Article).title === 'string' &&
            (item as Article).content_type !== 'page'
        ) : []
        setArticles(list)
        // Never auto-open the first post. Keep a user-selected post only if still published.
        setSelectedId(previous => previous && list.some(item => item.id === previous) ? previous : null)
        setError(false)
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const selected = articles.find(item => item.id === selectedId)

  return (
    <section dir="rtl" aria-label="مضامین" className="absolute inset-0 z-20 mx-auto w-full max-w-7xl overflow-hidden px-3 pt-2 pb-4 sm:px-5 sm:pt-3 md:pt-4">
      <div className="grid h-full grid-cols-[minmax(110px,25%)_minmax(0,1fr)] items-start gap-3 sm:gap-6 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="مضامین کی فہرست" className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]">
          <h2 className="gold-text mb-1 text-sm font-bold leading-[2] sm:text-xl">مضامین</h2>
          {loading && <p className="text-amber-100">مضامین لوڈ ہو رہے ہیں...</p>}
          {error && <p className="text-amber-100">مضامین فی الحال دستیاب نہیں ہیں۔</p>}
          {!loading && !error && articles.length === 0 && <p className="text-amber-100">ابھی کوئی شائع شدہ مضمون نہیں ہے۔</p>}
          <nav aria-label="مضمون منتخب کریں">
            <ul className="space-y-1">
              {articles.map(article => (
                <li key={article.id}>
                  <button
                    type="button"
                    aria-current={selectedId === article.id ? 'true' : undefined}
                    onClick={() => setSelectedId(article.id)}
                    className={`w-full bg-transparent px-1 py-1 text-right text-xs leading-[1.8] transition-colors sm:px-2 sm:py-2 sm:text-base hover:text-[#ffd77d] focus-visible:outline focus-visible:outline-amber-300 ${selectedId === article.id ? 'font-bold text-amber-200' : 'text-amber-100'}`}
                  >
                    {article.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div id="selected-article" className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]" aria-live="polite">
          {selected && (
            <article className="bg-transparent">
              <h2 className="gold-text mb-2 text-base font-bold leading-[2] sm:text-2xl">{selected.title}</h2>
              {selected.excerpt && <p className="mb-2 text-xs leading-[1.9] text-amber-100/90 sm:text-base">{selected.excerpt}</p>}
              <div className="whitespace-pre-wrap break-words text-xs leading-[2] text-amber-50 sm:text-base md:leading-[2.3]"><ArticleRichBody body={selected.body} /></div>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}
