'use client'

import { useEffect, useState } from 'react'
import { ArticleRichBody } from './article-rich-body'
import { articleBackgroundStyle, articleOverlayOpacity, type ArticleAppearance } from './article-background'

const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

type Article = ArticleAppearance & {
  id: string
  title: string
  body?: string | null
  excerpt?: string | null
  content_type?: string
  published_at?: string | null
  use_magical_scroll?: boolean | number | null
}

function MagicalScroll({ article, onClose }: { article: Article; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="ms-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="ms-reader" role="dialog" aria-modal="true" aria-label={article.title} dir="rtl" lang="ur">
        <button type="button" className="ms-close" onClick={onClose} aria-label="مضمون بند کریں">✕ <span>بند کریں</span></button>
        <article className="ms-scroll">
          <div className="ms-scroll-top" aria-hidden="true" />
          <div className="ms-scroll-middle">
            <div className="ms-content">
              <h1 className="ms-title">{article.title}</h1>
              <div className="ms-ornament" aria-hidden="true">❦ ۞ ❦</div>
              {article.excerpt && <p className="ms-excerpt">{article.excerpt}</p>}
              <div className="ms-body"><ArticleRichBody body={article.body} /></div>
              <div className="ms-ornament ms-end" aria-hidden="true">✦ ۞ ✦</div>
            </div>
          </div>
          <div className="ms-scroll-bottom" aria-hidden="true" />
        </article>
      </div>
    </div>
  )
}

export function ArticleBrowser() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openMagicalId, setOpenMagicalId] = useState<string | null>(null)

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
        setSelectedId(previous => previous && list.some(item => item.id === previous) ? previous : null)
        setOpenMagicalId(previous => previous && list.some(item => item.id === previous && (item.use_magical_scroll === 1 || item.use_magical_scroll === true)) ? previous : null)
        setError(false)
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const selected = articles.find(item => item.id === selectedId)
  const magicalArticle = articles.find(item => item.id === openMagicalId)
  const closeMagical = () => setOpenMagicalId(null)

  return (
    <>
      <section dir="rtl" aria-label="مضامین" className="absolute inset-0 z-20 mx-auto w-full max-w-7xl overflow-hidden px-3 pt-2 pb-4 sm:px-5 sm:pt-3 md:pt-4">
        <div className="grid h-full grid-cols-[minmax(110px,25%)_minmax(0,1fr)] items-start gap-3 sm:gap-6 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)] lg:gap-10">
          <aside aria-label="مضامین کی فہرست" className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]">
            <h2 className="gold-text mb-1 text-sm font-bold leading-[2] sm:text-xl">مضامین</h2>
            {loading && <p className="text-amber-100">مضامین لوڈ ہو رہے ہیں...</p>}
            {error && <p className="text-amber-100">مضامین فی الحال دستیاب نہیں ہیں۔</p>}
            {!loading && !error && articles.length === 0 && <p className="text-amber-100">ابھی کوئی شائع شدہ مضمون نہیں ہے۔</p>}
            <nav aria-label="مضمون منتخب کریں"><ul className="space-y-1">
              {articles.map(article => (
                <li key={article.id}>
                  <button type="button" aria-current={selectedId === article.id ? 'true' : undefined}
                    onClick={() => {
                      setSelectedId(article.id)
                      if (article.use_magical_scroll === 1 || article.use_magical_scroll === true) setOpenMagicalId(article.id)
                      else setOpenMagicalId(null)
                    }}
                    className={`w-full bg-transparent px-1 py-1 text-right text-xs leading-[1.8] transition-colors sm:px-2 sm:py-2 sm:text-base hover:text-[#ffd77d] focus-visible:outline focus-visible:outline-amber-300 ${selectedId === article.id ? 'font-bold text-amber-200' : 'text-amber-100'}`}>
                    {article.title}
                  </button>
                </li>
              ))}
            </ul></nav>
          </aside>
          <div id="selected-article" className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]" aria-live="polite">
            {selected && (selected.use_magical_scroll === 1 || selected.use_magical_scroll === true ? (
              <button type="button" className="rounded-lg border border-amber-400/60 bg-black/50 px-4 py-3 text-amber-100" onClick={() => setOpenMagicalId(selected.id)}>📜 {selected.title} — مکمل مضمون کھولیں</button>
            ) : (
              <article className="relative isolate min-h-[320px] overflow-hidden rounded-xl" style={articleBackgroundStyle(selected)}>
                <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${articleOverlayOpacity(selected.overlay_opacity)})` }} />
                <div className="relative z-10 p-3 sm:p-6">
                  <h2 className="gold-text mb-2 text-base font-bold leading-[2] sm:text-2xl">{selected.title}</h2>
                  {selected.excerpt && <p className="mb-2 text-xs leading-[1.9] text-amber-100/90 sm:text-base">{selected.excerpt}</p>}
                  <div className="whitespace-pre-wrap break-words text-xs leading-[2] text-amber-50 sm:text-base md:leading-[2.3]"><ArticleRichBody body={selected.body} /></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      {magicalArticle && <MagicalScroll article={magicalArticle} onClose={closeMagical} />}
      <style jsx global>{`
        .ms-backdrop{position:fixed;inset:0;z-index:9999;background:radial-gradient(ellipse at 50% 25%,#392047e8,#050510f5 75%);overflow-y:auto;overscroll-behavior:contain;padding:12px 8px 28px;display:flex;align-items:flex-start;justify-content:center}
        .ms-reader{position:relative;width:min(100%,940px);margin:0 auto;min-height:100%;font-family:'Noto Nastaliq Urdu',serif}
        .ms-close{position:sticky;top:8px;z-index:20;display:block;margin:0 0 8px auto;padding:8px 18px;border:1px solid #f7d489;border-radius:24px;background:#260b26;color:#ffe7a9;cursor:pointer;box-shadow:0 0 20px #9e4bda88;font-family:inherit}
        .ms-close:focus-visible{outline:3px solid #fff}
        .ms-scroll{width:100%;filter:drop-shadow(0 12px 25px #000b)}
        .ms-scroll-top{width:100%;aspect-ratio:1124/330;background:url('/images/magical-scroll-top.png') center top/100% 100% no-repeat}
        .ms-scroll-middle{position:relative;width:100%;min-height:260px;background:url('/images/magical-scroll-middle.png') center top/100% auto repeat-y}
        .ms-content{position:relative;margin:0 auto;width:72%;padding:18px 0 40px;color:#352012;text-align:right;overflow-wrap:anywhere}
        .ms-title{text-align:center;color:#742137;font-weight:700;font-size:clamp(21px,3.4vw,42px);line-height:2.2;text-shadow:1px 2px #ffe4a1,2px 3px 2px #703f2470;margin:0 0 12px}
        .ms-ornament{text-align:center;color:#a35c1c;font-size:clamp(15px,2.4vw,26px);margin:10px 0 20px}
        .ms-excerpt{text-align:center;color:#773e29;font-size:clamp(13px,1.7vw,19px);line-height:2.4;margin:0 0 25px}
        .ms-body{font-size:clamp(14px,1.75vw,20px);line-height:2.7;white-space:pre-wrap;overflow-wrap:anywhere;color:#302015}
        .ms-body :is(h2,h3){display:table;max-width:100%;margin:24px auto 14px;padding:4px 26px 10px;border:2px solid #e8ac49;border-radius:10px;background:linear-gradient(135deg,#4b082b,#8e2750 55%,#3b0928);color:#ffe4a2;text-align:center;text-shadow:0 2px 3px #180510;font-weight:700;line-height:2.2;box-shadow:0 3px 10px #5e341b55}
        .ms-body h2{font-size:1.3em}.ms-body h3{font-size:1.12em}
        .ms-body a{color:#7131a1;text-decoration:underline}
        .ms-body ul,.ms-body ol{padding-right:1.6em}
        .ms-end{margin-top:38px}
        .ms-scroll-bottom{width:100%;aspect-ratio:1124/449;background:url('/images/magical-scroll-bottom.png') center bottom/100% 100% no-repeat}
        @media(max-width:600px){.ms-backdrop{padding:6px 2px 15px}.ms-content{width:70%;padding:0 0 16px}.ms-body{font-size:12px;line-height:2.4}.ms-title{font-size:19px}.ms-body :is(h2,h3){padding:2px 7px 6px}.ms-close{font-size:12px;padding:5px 12px}}
      `}</style>
    </>
  )
}
