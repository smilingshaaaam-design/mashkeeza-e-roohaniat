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

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function wait(ms: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, ms))
}

function MagicalScroll({ article }: { article: Article }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<HTMLImageElement>(null)
  const potRef = useRef<HTMLImageElement>(null)
  const sparkleRef = useRef<HTMLSpanElement>(null)
  const [opened, setOpened] = useState(false)
  const opacity = Math.min(100, Math.max(0, Number(article.paper_opacity ?? 100))) / 100

  useEffect(() => {
    let cancelled = false

    const stage = stageRef.current
    const paper = paperRef.current
    const text = textRef.current
    const quill = quillRef.current
    const pot = potRef.current
    const sparkle = sparkleRef.current

    if (!stage || !paper || !text || !quill || !pot || !sparkle) return

    setOpened(false)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const getStageRect = () => stage.getBoundingClientRect()
    const getQuillRect = () => quill.getBoundingClientRect()
    const getPotRect = () => pot.getBoundingClientRect()

    const setSparkle = (x: number, y: number, visible = true) => {
      sparkle.style.opacity = visible ? '0.58' : '0'
      sparkle.style.transform = `translate(${x - 18}px, ${y - 18}px)`
    }

    const setQuillPose = (nibX: number, nibY: number, angle: number, sway = 0, scale = 1) => {
      const qRect = getQuillRect()
      const anchorX = qRect.width * 0.014
      const anchorY = qRect.height * 0.993
      const tx = nibX - anchorX
      const ty = nibY - anchorY + sway
      quill.style.transform = `translate(${tx}px, ${ty}px) rotate(${angle}deg) scale(${scale})`
      quill.dataset.nibX = String(nibX)
      quill.dataset.nibY = String(nibY)
      setSparkle(nibX + 6, nibY - 8, true)
    }

    const getCurrentNib = () => ({
      x: Number(quill.dataset.nibX || '0'),
      y: Number(quill.dataset.nibY || '0'),
    })

    const animateHeight = (toHeight: number, duration: number) =>
      new Promise<void>(resolve => {
        const fromHeight = Number.parseFloat(paper.style.height || '0') || 0
        const start = performance.now()

        const step = (now: number) => {
          if (cancelled) return resolve()
          const progress = Math.min(1, (now - start) / duration)
          const eased = easeInOutCubic(progress)
          const height = fromHeight + (toHeight - fromHeight) * eased
          paper.style.height = `${height}px`
          if (progress < 1) {
            requestAnimationFrame(step)
          } else {
            resolve()
          }
        }

        requestAnimationFrame(step)
      })

    const flyNibTo = (
      targetX: number,
      targetY: number,
      duration: number,
      options?: {
        startAngle?: number
        endAngle?: number
        swayX?: number
        swayY?: number
        hover?: boolean
        sparkle?: boolean
        scale?: number
      }
    ) =>
      new Promise<void>(resolve => {
        const startNib = getCurrentNib()
        const startAngle = options?.startAngle ?? -14
        const endAngle = options?.endAngle ?? 10
        const swayX = options?.swayX ?? 7
        const swayY = options?.swayY ?? 15
        const hover = options?.hover ?? true
        const sparkleOn = options?.sparkle ?? true
        const scale = options?.scale ?? 1
        const start = performance.now()

        const step = (now: number) => {
          if (cancelled) return resolve()
          const progress = Math.min(1, (now - start) / duration)
          const eased = easeInOutCubic(progress)
          const wave = Math.sin(progress * Math.PI * 2.15)
          const drift = Math.sin(progress * Math.PI * 4.3)
          const x = startNib.x + (targetX - startNib.x) * eased + wave * swayX * (1 - progress * 0.35)
          const y = startNib.y + (targetY - startNib.y) * eased - Math.sin(progress * Math.PI) * swayY + drift * 2.2
          const angle = startAngle + (endAngle - startAngle) * eased + wave * (hover ? 8 : 4)
          const bob = hover ? Math.cos(progress * Math.PI * 4.2) * 1.4 : 0
          setQuillPose(x, y, angle, bob, scale)
          if (!sparkleOn) setSparkle(x + 6, y - 8, false)
          if (progress < 1) {
            requestAnimationFrame(step)
          } else {
            resolve()
          }
        }

        requestAnimationFrame(step)
      })

    const writeBlock = (block: HTMLElement) =>
      new Promise<void>(resolve => {
        const stageRect = getStageRect()
        const rect = block.getBoundingClientRect()
        const computed = window.getComputedStyle(block)
        const lineHeightRaw = Number.parseFloat(computed.lineHeight)
        const lineHeight = Number.isFinite(lineHeightRaw)
          ? lineHeightRaw
          : Math.max(28, rect.height)
        const totalLines = Math.max(1, Math.min(6, Math.round(rect.height / lineHeight)))
        const paddingX = Math.max(10, rect.width * 0.03)
        const startX = rect.right - stageRect.left - paddingX
        const endX = rect.left - stageRect.left + paddingX
        const topY = rect.top - stageRect.top + Math.min(lineHeight * 0.72, rect.height * 0.45)
        const rowGap = Math.max(18, Math.min(lineHeight, 34))
        const totalDuration = Math.min(4200, Math.max(950, (block.textContent?.trim().length || 0) * 34))
        const rowDuration = Math.max(420, totalDuration / totalLines)
        const start = performance.now()

        block.style.opacity = '1'

        const step = (now: number) => {
          if (cancelled) return resolve()
          const elapsed = Math.min(totalDuration, now - start)
          const overall = elapsed / totalDuration
          const activeLine = Math.min(totalLines - 1, Math.floor(elapsed / rowDuration))
          const lineProgress = Math.min(1, (elapsed - activeLine * rowDuration) / rowDuration)
          const easedLine = easeInOutCubic(lineProgress)
          const nibX = startX + (endX - startX) * easedLine
          const nibY = topY + activeLine * rowGap + Math.sin(lineProgress * Math.PI * 2) * 2.2
          const angle = -12 + Math.sin(lineProgress * Math.PI * 4) * 6 - activeLine * 0.6
          setQuillPose(nibX, nibY, angle, Math.sin(lineProgress * Math.PI * 6) * 0.7)

          const revealPercent = Math.max(0, 100 - overall * 100)
          block.style.clipPath = `inset(0 ${revealPercent}% 0 0)`
          block.style.opacity = '1'

          if (elapsed < totalDuration) {
            requestAnimationFrame(step)
          } else {
            block.style.clipPath = 'inset(0 0 0 0)'
            block.style.opacity = '1'
            resolve()
          }
        }

        requestAnimationFrame(step)
      })

    const run = async () => {
      const innerHeight = Math.max(paper.scrollHeight, 330)
      paper.style.height = '0px'
      paper.style.overflow = 'hidden'
      text.style.visibility = 'hidden'
      pot.style.opacity = '0'
      quill.style.opacity = '0'
      sparkle.style.opacity = '0'

      if (reduced) {
        paper.style.height = 'auto'
        text.style.visibility = 'visible'
        pot.style.opacity = '1'
        quill.style.opacity = '1'
        sparkle.style.opacity = '0.45'
        setOpened(true)
        return
      }

      await animateHeight(innerHeight, 2200)
      if (cancelled) return

      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      setOpened(true)

      pot.style.opacity = '1'
      await wait(260)
      if (cancelled) return

      const potBounds = getPotRect()
      const stageBounds = getStageRect()
      const mouthX = potBounds.left + potBounds.width * 0.50 - stageBounds.left
      const mouthY = potBounds.top + potBounds.height * 0.29 - stageBounds.top

      quill.style.opacity = '1'
      setQuillPose(mouthX, mouthY, -8, 0, 1)
      await flyNibTo(mouthX - 18, mouthY - 22, 520, {
        startAngle: -4,
        endAngle: -18,
        swayX: 5,
        swayY: 10,
        hover: true,
        sparkle: true,
      })
      if (cancelled) return

      text.style.visibility = 'visible'

      const blocks = [...text.querySelectorAll('h2,h3,p,li,blockquote')].filter(el => el.textContent?.trim())
      blocks.forEach(el => {
        const item = el as HTMLElement
        item.style.opacity = '0'
        item.style.clipPath = 'inset(0 100% 0 0)'
        item.style.willChange = 'clip-path, opacity'
      })

      for (const block of blocks) {
        if (cancelled) return
        const element = block as HTMLElement
        const rect = element.getBoundingClientRect()
        const stageRect = getStageRect()
        const introX = rect.right - stageRect.left - Math.max(8, rect.width * 0.03)
        const introY = rect.top - stageRect.top + Math.min(rect.height * 0.6, 28)

        await flyNibTo(introX, introY, 360, {
          startAngle: -18,
          endAngle: -9,
          swayX: 7,
          swayY: 13,
          hover: true,
          sparkle: true,
        })
        if (cancelled) return

        await writeBlock(element)
        if (cancelled) return

        await wait(90)
      }

      if (cancelled) return

      await flyNibTo(mouthX - 18, mouthY - 20, 700, {
        startAngle: -8,
        endAngle: -14,
        swayX: 6,
        swayY: 12,
        hover: true,
        sparkle: true,
      })
      if (cancelled) return

      await flyNibTo(mouthX, mouthY, 440, {
        startAngle: -14,
        endAngle: -6,
        swayX: 2,
        swayY: 5,
        hover: false,
        sparkle: true,
      })

      setSparkle(mouthX + 6, mouthY - 8, true)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [article.id, article.body, article.excerpt, article.title])

  return (
    <article dir="rtl" lang="ur" className="original-mashkeeza-scroll" aria-label={article.title}>
      <div ref={stageRef} className="original-scroll-stage">
        <div className="original-scroll-assembly">
          <img className="original-scroll-roller" src="/magical-scroll/top-roller.png" alt="" draggable={false}/>
          <div ref={paperRef} className="original-scroll-paper" style={{ '--paper-opacity': opacity } as CSSProperties}>
            <div className="original-scroll-paper-surface">
              <div ref={textRef} className="original-scroll-writing">
                <h2>{article.title}</h2>
                {article.excerpt && <p className="original-scroll-excerpt">{article.excerpt}</p>}
                <ArticleRichBody body={article.body}/>
              </div>
            </div>
          </div>
          <img className="original-scroll-roller" src="/magical-scroll/bottom-roller.png" alt="" draggable={false}/>
        </div>
        <span className="original-scroll-sparkles" aria-hidden="true">✦ ✧ ✦</span>
        <img ref={potRef} className="original-scroll-pot" src="/magical-scroll/inkpot.png" alt="" draggable={false}/>
        <img ref={quillRef} className="original-scroll-quill" src="/magical-scroll/quill.webp" alt="" draggable={false}/>
        <span ref={sparkleRef} className="original-scroll-quill-sparkles" aria-hidden="true">
          <span className="spark-core" />
          <span className="spark-dot spark-dot-one" />
          <span className="spark-dot spark-dot-two" />
          <span className="spark-dot spark-dot-three" />
        </span>
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
        .original-mashkeeza-scroll{font-family:'Noto Nastaliq Urdu',serif;color:#422410;width:100%;filter:drop-shadow(0 12px 20px #0007)}
        .original-scroll-stage{position:relative;width:100%;padding:8px 0 105px;overflow:visible;isolation:isolate}
        .original-scroll-assembly{width:100%;display:flex;flex-direction:column;align-items:center;position:relative}
        .original-scroll-roller{width:100%;height:auto;position:relative;z-index:3;display:block;pointer-events:none;user-select:none}
        .original-scroll-paper{width:63.6%;margin:-1px 0;position:relative;z-index:1;min-height:0;overflow:hidden;container-type:inline-size}
        .original-scroll-paper-surface{position:relative;min-height:330px;padding:12% 10% 14%;isolation:isolate}
        .original-scroll-paper-surface::before{content:"";position:absolute;inset:0;z-index:-1;background:url('/magical-scroll/paper-bg.png') center / 100% 100% no-repeat;opacity:var(--paper-opacity);pointer-events:none}
        .original-scroll-writing{direction:rtl;text-align:right;overflow-wrap:anywhere;font-size:clamp(11px,2.8cqw,22px);line-height:2.4;color:#422410;visibility:hidden}
        .original-scroll-writing h2{font-size:1.55em;font-weight:700;text-align:center;line-height:2.2;margin:0 0 .8em;color:#71351d}
        .original-scroll-writing p,.original-scroll-writing li{margin:.7em 0}
        .original-scroll-writing img{max-width:100%;object-fit:contain}
        .original-scroll-excerpt{font-size:.9em;text-align:center}
        .original-scroll-pot{position:absolute;z-index:4;width:19.15%;height:auto;right:1%;bottom:0;opacity:0;pointer-events:none;filter:drop-shadow(0 0 8px #5e8cff99)}
        .original-scroll-quill{position:absolute;z-index:7;left:0;top:0;width:30%;height:auto;opacity:0;pointer-events:none;filter:drop-shadow(5px 7px 5px #321b1280);will-change:transform;transform-origin:1.5% 99%}
        .original-scroll-quill-sparkles{position:absolute;left:0;top:0;z-index:8;width:36px;height:36px;pointer-events:none;opacity:0;will-change:transform,opacity}
        .original-scroll-quill-sparkles .spark-core,.original-scroll-quill-sparkles .spark-dot{position:absolute;display:block;border-radius:999px;background:radial-gradient(circle,#fffbe2 0%,#ffe07a 38%,rgba(255,106,230,.72) 72%,rgba(33,200,255,0) 100%)}
        .original-scroll-quill-sparkles .spark-core{inset:11px;box-shadow:0 0 8px rgba(255,230,151,.45),0 0 14px rgba(221,118,255,.18);animation:quillSparklePulse 1.8s ease-in-out infinite}
        .original-scroll-quill-sparkles .spark-dot-one{width:8px;height:8px;right:4px;top:2px;animation:quillSparkleDriftOne 1.6s ease-in-out infinite}
        .original-scroll-quill-sparkles .spark-dot-two{width:6px;height:6px;left:1px;top:8px;animation:quillSparkleDriftTwo 1.9s ease-in-out infinite}
        .original-scroll-quill-sparkles .spark-dot-three{width:7px;height:7px;left:10px;bottom:2px;animation:quillSparkleDriftThree 1.5s ease-in-out infinite}
        .original-scroll-sparkles{position:absolute;right:8%;bottom:13%;z-index:5;pointer-events:none;color:#ffe88e;text-shadow:0 0 10px #e752ff,0 0 18px #21c8ff;animation:scrollSparkle 1.7s ease-in-out infinite alternate}
        @keyframes scrollSparkle{from{opacity:.22;transform:translateY(5px) scale(.86)}to{opacity:.72;transform:translateY(-5px) scale(1.05)}}
        @keyframes quillSparklePulse{0%,100%{opacity:.34;transform:scale(.82)}50%{opacity:.68;transform:scale(1.08)}}
        @keyframes quillSparkleDriftOne{0%,100%{transform:translate(0,0) scale(.8);opacity:.25}50%{transform:translate(4px,-5px) scale(1.04);opacity:.56}}
        @keyframes quillSparkleDriftTwo{0%,100%{transform:translate(0,0) scale(.76);opacity:.22}50%{transform:translate(-3px,-4px) scale(1);opacity:.48}}
        @keyframes quillSparkleDriftThree{0%,100%{transform:translate(0,0) scale(.8);opacity:.24}50%{transform:translate(1px,3px) scale(1.02);opacity:.45}}
        @media(max-width:640px){.original-scroll-stage{padding-bottom:55px}.original-scroll-paper-surface{min-height:230px;padding:11% 10% 13%}.original-scroll-writing{font-size:clamp(9px,3.6cqw,15px);line-height:2.1}}
        @media(prefers-reduced-motion:reduce){.original-scroll-writing{visibility:visible}.original-scroll-sparkles,.original-scroll-quill-sparkles .spark-core,.original-scroll-quill-sparkles .spark-dot{animation:none}}
      `}</style>
    </>
  )
}
