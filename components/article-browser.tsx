
'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArticleRichBody } from './article-rich-body'
import {
  articleBackgroundStyle,
  articleOverlayOpacity,
  type ArticleAppearance,
} from './article-background'

const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

type Article = ArticleAppearance & {
  id: string
  title: string
  body?: string | null
  excerpt?: string | null
  content_type?: string
  published_at?: string | null
  paper_opacity?: number | null
  use_magical_scroll?: boolean | number | null
}

function isMagicalScrollEnabled(value: Article['use_magical_scroll']) {
  return value === true || value === 1
}

function MagicalScroll({ article }: { article: Article }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<HTMLImageElement>(null)
  const potRef = useRef<HTMLImageElement>(null)
  const [opened, setOpened] = useState(false)
  const opacity = Math.min(100, Math.max(0, Number(article.paper_opacity ?? 100))) / 100

  useEffect(() => {
    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const animations: Animation[] = []
    const wait = (ms: number) => new Promise<void>(resolve => {
      const t = setTimeout(resolve, ms); timeouts.push(t)
    })
    const stage = stageRef.current, paper = paperRef.current, text = textRef.current
    const quill = quillRef.current, pot = potRef.current
    if (!stage || !paper || !text || !quill || !pot) return
    setOpened(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = (el: Element, keyframes: Keyframe[], duration: number, easing = 'ease-in-out') => {
      const a = el.animate(keyframes, { duration, easing, fill: 'forwards' }); animations.push(a)
      return a.finished.catch(() => undefined)
    }
    const flyTo = (x: number, y: number, duration: number) => {
      const bounds = stage.getBoundingClientRect()
      const quillBounds = quill.getBoundingClientRect()
      const fromX = parseFloat(quill.dataset.x || '0')
      const fromY = parseFloat(quill.dataset.y || '0')
      const toX = x - bounds.left - quillBounds.width * .014
      const toY = y - bounds.top - quillBounds.height * .993
      quill.dataset.x = String(toX); quill.dataset.y = String(toY)
      return animate(quill, [
        { transform: `translate(${fromX}px, ${fromY}px) rotate(-9deg)` },
        { transform: `translate(${toX}px, ${toY}px) rotate(3deg)` }
      ], duration)
    }
    const run = async () => {
      const innerHeight = paper.scrollHeight
      paper.style.height = '0px'
      paper.style.overflow = 'hidden'
      text.style.visibility = 'hidden'
      pot.style.opacity = '0'; quill.style.opacity = '0'
      if (reduced) {
        paper.style.height = 'auto'; text.style.visibility = 'visible'
        pot.style.opacity = '1'; setOpened(true); return
      }
      await animate(paper, [{ height: '0px' }, { height: `${innerHeight}px` }], 2200, 'cubic-bezier(.22,.8,.22,1)')
      if (cancelled) return
      paper.style.height = 'auto'; paper.style.overflow = 'visible'; setOpened(true)
      await animate(pot, [{ opacity: 0 }, { opacity: 1 }], 650)
      if (cancelled) return
      const potBounds = pot.getBoundingClientRect()
      const stageBounds = stage.getBoundingClientRect()
      const qWidth = quill.getBoundingClientRect().width, qHeight = quill.getBoundingClientRect().height
      const startX = potBounds.left + potBounds.width * .5 - stageBounds.left - qWidth * .014
      const startY = potBounds.top + potBounds.height * .28 - stageBounds.top - qHeight * .993
      quill.dataset.x = String(startX); quill.dataset.y = String(startY)
      quill.style.transform = `translate(${startX}px, ${startY}px)`
      quill.style.opacity = '1'
      text.style.visibility = 'visible'
      const blocks = [...text.querySelectorAll('h2,h3,p,li,blockquote')].filter(el => el.textContent?.trim())
      for (const block of blocks) {
        if (cancelled) return
        const rect = block.getBoundingClientRect()
        await flyTo(rect.right - 8, rect.top + Math.min(rect.height * .6, 30), 400)
        if (cancelled) return
        await animate(block, [
          { clipPath: 'inset(0 0 0 100%)', opacity: .25 },
          { clipPath: 'inset(0 0 0 0)', opacity: 1 }
        ], Math.min(2600, Math.max(500, (block.textContent?.length || 0) * 25)), 'linear')
      }
      if (cancelled) return
      const mouth = pot.getBoundingClientRect()
      await flyTo(mouth.left + mouth.width * .5, mouth.top + mouth.height * .28, 850)
    }
    void run()
    return () => { cancelled = true; timeouts.forEach(clearTimeout); animations.forEach(a => a.cancel()) }
  }, [article.id, article.body])

  return (
    <article dir="rtl" lang="ur" className="original-mashkeeza-scroll" aria-label={article.title}>
      <div ref={stageRef} className="original-scroll-stage">
        <div className="original-scroll-assembly">
          <img className="original-scroll-roller" src="/magical-scroll/top-roller.jpg" alt="" draggable={false}/>
          <div ref={paperRef} className="original-scroll-paper" style={{'--paper-opacity': opacity} as CSSProperties}>
            <div className="original-scroll-paper-surface">
              <div ref={textRef} className="original-scroll-writing">
                <h2>{article.title}</h2>
                {article.excerpt && <p className="original-scroll-excerpt">{article.excerpt}</p>}
                <ArticleRichBody body={article.body}/>
              </div>
            </div>
          </div>
          <img className="original-scroll-roller" src="/magical-scroll/bottom-roller.jpg" alt="" draggable={false}/>
        </div>
        <img ref={potRef} className="original-scroll-pot" src="/magical-scroll/inkpot.png" alt="" draggable={false}/>
        <img ref={quillRef} className="original-scroll-quill" src="/magical-scroll/quill.webp" alt="" draggable={false}/>
        {opened && <span className="sr-only">Scroll opened</span>}
      </div>
    </article>
  )
}

export function ArticleBrowser() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${CMS_API}/public/content`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error('Could not load articles')
        }
        return response.json()
      })
      .then(data => {
        if (controller.signal.aborted) return

        const list: Article[] = Array.isArray(data.items)
          ? data.items.filter(
              (item: unknown): item is Article =>
                !!item &&
                typeof item === 'object' &&
                typeof (item as Article).id === 'string' &&
                typeof (item as Article).title === 'string' &&
                (item as Article).content_type !== 'page'
            )
          : []

        setArticles(list)

        setSelectedId(previous =>
          previous && list.some(item => item.id === previous)
            ? previous
            : null
        )

        setError(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  const selected = articles.find(item => item.id === selectedId)
  const magical = selected
    ? isMagicalScrollEnabled(selected.use_magical_scroll)
    : false

  return (
    <>
      <section
        dir="rtl"
        aria-label="مضامین"
        className="absolute inset-0 z-20 mx-auto w-full max-w-7xl overflow-hidden px-3 pt-2 pb-4 sm:px-5 sm:pt-3 md:pt-4"
      >
        <div className="grid h-full grid-cols-[minmax(110px,25%)_minmax(0,1fr)] items-start gap-3 sm:gap-6 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)] lg:gap-10">
          <aside
            aria-label="مضامین کی فہرست"
            className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]"
          >
            <h2 className="gold-text mb-1 text-sm font-bold leading-[2] sm:text-xl">
              مضامین
            </h2>

            {loading && (
              <p className="text-amber-100">
                مضامین لوڈ ہو رہے ہیں...
              </p>
            )}

            {error && (
              <p className="text-amber-100">
                مضامین فی الحال دستیاب نہیں ہیں۔
              </p>
            )}

            {!loading && !error && articles.length === 0 && (
              <p className="text-amber-100">
                ابھی کوئی شائع شدہ مضمون نہیں ہے۔
              </p>
            )}

            <nav aria-label="مضمون منتخب کریں">
              <ul className="space-y-1">
                {articles.map(article => (
                  <li key={article.id}>
                    <button
                      type="button"
                      aria-current={
                        selectedId === article.id
                          ? 'true'
                          : undefined
                      }
                      onClick={() => setSelectedId(article.id)}
                      className={`w-full bg-transparent px-1 py-1 text-right text-xs leading-[1.8] transition-colors sm:px-2 sm:py-2 sm:text-base hover:text-[#ffd77d] focus-visible:outline focus-visible:outline-amber-300 ${
                        selectedId === article.id
                          ? 'font-bold text-amber-200'
                          : 'text-amber-100'
                      }`}
                    >
                      {article.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div
            id="selected-article"
            className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]"
            aria-live="polite"
          >
            {selected && (
              magical ? (
                <MagicalScroll article={selected} />
              ) : (
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
              )
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .original-mashkeeza-scroll{font-family:'Noto Nastaliq Urdu',serif;color:#3b2412;width:100%;filter:drop-shadow(0 12px 20px #0008)}
        .original-scroll-stage{position:relative;width:100%;padding:14px 0 60px;overflow:hidden;isolation:isolate}
        .original-scroll-assembly{width:100%;display:flex;flex-direction:column;align-items:center;position:relative}
        .original-scroll-roller{width:100%;height:auto;position:relative;z-index:3;display:block;pointer-events:none;user-select:none}
        .original-scroll-paper{width:63.6%;margin:-1px 0;position:relative;z-index:1;min-height:0;overflow:hidden;container-type:inline-size}
        .original-scroll-paper-surface{position:relative;min-height:330px;padding:12% 13% 14%;isolation:isolate}
        .original-scroll-paper-surface::before{content:"";position:absolute;inset:0;z-index:-1;background:url('/magical-scroll/paper-bg.jpg') center / 100% 100% no-repeat;opacity:var(--paper-opacity);pointer-events:none}
        .original-scroll-writing{direction:rtl;text-align:right;overflow-wrap:anywhere;font-size:clamp(11px,2.8cqw,22px);line-height:2.4;color:#3b2412;visibility:hidden}
        .original-scroll-writing h2{font-size:1.55em;font-weight:700;text-align:center;line-height:2.2;margin:0 0 .8em;color:#71351d}
        .original-scroll-writing p,.original-scroll-writing li{margin:.7em 0}
        .original-scroll-writing img{max-width:100%;object-fit:contain}
        .original-scroll-excerpt{font-size:.9em;text-align:center}
        .original-scroll-pot{position:absolute;z-index:4;width:19.15%;height:auto;right:0;bottom:7%;opacity:0;pointer-events:none;mix-blend-mode:screen}
        .original-scroll-quill{position:absolute;z-index:5;left:0;top:0;width:30%;height:auto;opacity:0;pointer-events:none;filter:drop-shadow(5px 7px 5px #321b1280);will-change:transform}
        @media(max-width:640px){.original-scroll-stage{padding-bottom:40px}.original-scroll-paper-surface{min-height:230px;padding:11% 10% 13%}.original-scroll-writing{font-size:clamp(9px,3.6cqw,15px);line-height:2.1}}
        @media(prefers-reduced-motion:reduce){.original-scroll-writing{visibility:visible}}
      `}</style>
    </>
  )
}
