'use client'

import { useEffect, useState } from 'react'

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
        setSelectedId(previous => previous && list.some(item => item.id === previous) ? previous : list[0]?.id ?? null)
        setError(false)
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const selected = articles.find(item => item.id === selectedId)

  return (
    <section dir="rtl" aria-label="مضامین" className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-16 pt-8 md:pt-12">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="مضامین کی فہرست" className="min-w-0 bg-transparent">
          <h2 className="gold-text mb-3 border-b border-amber-400/40 pb-3 text-xl font-bold leading-[2]">مضامین</h2>
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
                    onClick={() => {
                      setSelectedId(article.id)
                      document.getElementById('selected-article')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className={`w-full rounded-md border-r-2 px-3 py-2 text-right text-base leading-[2] transition-colors hover:text-[#ffd77d] ${selectedId === article.id ? 'border-amber-300 bg-amber-400/10 font-bold text-amber-200' : 'border-transparent bg-transparent text-amber-100'}`}
                  >
                    {article.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div id="selected-article" className="min-h-64 min-w-0 scroll-mt-8 bg-transparent" aria-live="polite">
          {selected ? (
            <article className="bg-transparent">
              <h2 className="gold-text mb-5 border-b border-amber-400/30 pb-3 text-2xl font-bold leading-[2] md:text-3xl">{selected.title}</h2>
              {selected.excerpt && <p className="mb-5 text-lg leading-[2.4] text-amber-100/90">{selected.excerpt}</p>}
              <div className="whitespace-pre-wrap break-words text-base leading-[2.6] text-amber-50 md:text-lg">{selected.body || ''}</div>
            </article>
          ) : !loading && !error && articles.length > 0 ? (
            <p className="text-amber-100">دائیں طرف سے مضمون منتخب کریں۔</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
