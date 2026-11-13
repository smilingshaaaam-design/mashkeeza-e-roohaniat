
'use client'

import { useEffect, useState } from 'react'
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
  use_magical_scroll?: boolean | number | null
}

function isMagicalScrollEnabled(value: Article['use_magical_scroll']) {
  return value === true || value === 1
}

function MagicalScroll({ article }: { article: Article }) {
  return (
    <article
      dir="rtl"
      lang="ur"
      className="magical-scroll relative isolate mx-auto w-full max-w-4xl"
      aria-label={article.title}
    >
      <div className="magical-scroll-top" aria-hidden="true">
        <span className="magical-scroll-gem">✦</span>
      </div>

      <div className="magical-scroll-paper">
        <div className="magical-scroll-inner">
          <div className="magical-scroll-symbols" aria-hidden="true">
            ✧ ۞ ✧
          </div>

          <header className="magical-scroll-header">
            <h2 className="magical-scroll-title">
              {article.title}
            </h2>

            <div className="magical-scroll-divider" aria-hidden="true">
              <span>❦</span>
            </div>

            {article.excerpt && (
              <p className="magical-scroll-excerpt">
                {article.excerpt}
              </p>
            )}
          </header>

          <div className="magical-scroll-body">
            <ArticleRichBody body={article.body} />
          </div>

          <div className="magical-scroll-ending" aria-hidden="true">
            ✦ ۞ ✦
          </div>
        </div>

        <div className="magical-scroll-feather" aria-hidden="true">
          <span className="magical-scroll-quill">🪶</span>
          <span className="magical-scroll-inkpot">✒</span>
        </div>
      </div>

      <div className="magical-scroll-bottom" aria-hidden="true">
        <span>❖</span>
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
        .magical-scroll {
          font-family: 'Noto Nastaliq Urdu', serif;
          filter: drop-shadow(0 15px 28px rgba(0, 0, 0, .65));
        }

        .magical-scroll-top,
        .magical-scroll-bottom {
          position: relative;
          height: 30px;
          border: 2px solid #7a451b;
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            #6e3518 0%,
            #eac47a 19%,
            #fff0bc 43%,
            #c08a3e 70%,
            #66351a 100%
          );
          box-shadow:
            inset 0 2px 4px #fff1b8,
            inset 0 -4px 6px #61310f,
            0 4px 10px #0008;
          z-index: 3;
          text-align: center;
          color: #813c26;
        }

        .magical-scroll-top {
          margin-bottom: -12px;
        }

        .magical-scroll-bottom {
          margin-top: -12px;
        }

        .magical-scroll-gem {
          position: relative;
          top: -9px;
          display: inline-block;
          font-size: 30px;
          color: #682f91;
          text-shadow: 0 0 8px #b15eff;
        }

        .magical-scroll-paper {
          position: relative;
          min-height: 400px;
          padding: 40px 18px 70px;
          border-left: 8px ridge #b5833d;
          border-right: 8px ridge #b5833d;
          background:
            radial-gradient(
              ellipse at 50% 20%,
              #fff4ce 0%,
              transparent 75%
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              rgba(122, 70, 20, .035) 3px,
              transparent 6px
            ),
            linear-gradient(
              90deg,
              #bd8b4b 0%,
              #e8c88c 8%,
              #f8e5b8 24%,
              #fff0ca 50%,
              #f1d69d 82%,
              #b78342 100%
            );
          box-shadow:
            inset 0 0 38px rgba(103, 56, 16, .38),
            0 0 20px rgba(226, 167, 72, .2);
        }

        .magical-scroll-paper::before {
          content: '';
          position: absolute;
          inset: 15px;
          border: 2px solid rgba(143, 78, 27, .55);
          outline: 1px solid rgba(213, 161, 70, .7);
          outline-offset: -8px;
          pointer-events: none;
        }

        .magical-scroll-inner {
          position: relative;
          z-index: 1;
          padding: 12px 5px 65px;
        }

        .magical-scroll-symbols,
        .magical-scroll-ending {
          text-align: center;
          color: #8a4b23;
          font-size: 22px;
          letter-spacing: 8px;
          text-shadow: 0 1px #fff1ba;
        }

        .magical-scroll-header {
          text-align: center;
        }

        .magical-scroll-title {
          margin: 14px 0 8px;
          color: #7d2330;
          font-size: clamp(18px, 3vw, 34px);
          font-weight: 700;
          line-height: 2.2;
          text-shadow:
            1px 1px #fbe6a4,
            2px 3px 2px rgba(88, 35, 19, .35);
          overflow-wrap: anywhere;
        }

        .magical-scroll-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9b6027;
          font-size: 25px;
          margin: 12px 0;
        }

        .magical-scroll-divider::before,
        .magical-scroll-divider::after {
          content: '';
          flex: 1;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            #a46a30,
            #e6b76b,
            transparent
          );
        }

        .magical-scroll-excerpt {
          margin: 14px auto 22px;
          color: #6b3525;
          font-size: clamp(12px, 1.6vw, 18px);
          line-height: 2.4;
        }

        .magical-scroll-body {
          color: #342218;
          font-size: clamp(13px, 1.6vw, 19px);
          line-height: 2.5;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .magical-scroll-body :is(h2, h3) {
          color: #842c35;
          font-weight: 700;
          line-height: 2.2;
          margin: 24px 0 12px;
          text-shadow: 1px 1px #fbe6aa;
        }

        .magical-scroll-body h2 {
          font-size: 1.4em;
          border-bottom: 2px solid #b78a45;
          padding-bottom: 8px;
        }

        .magical-scroll-body h3 {
          font-size: 1.18em;
        }

        .magical-scroll-body a {
          color: #7134a4;
          text-decoration: underline;
        }

        .magical-scroll-body ul,
        .magical-scroll-body ol {
          padding-right: 25px;
        }

        .magical-scroll-ending {
          margin-top: 35px;
        }

        .magical-scroll-feather {
          position: absolute;
          z-index: 2;
          bottom: 12px;
          left: 20px;
          display: flex;
          align-items: end;
          gap: 3px;
          filter: drop-shadow(2px 5px 4px #48210b77);
          pointer-events: none;
        }

        .magical-scroll-quill {
          display: block;
          font-size: 49px;
          transform: rotate(-25deg);
          transform-origin: bottom center;
        }

        .magical-scroll-inkpot {
          display: grid;
          place-items: center;
          width: 49px;
          height: 43px;
          border: 3px solid #b88c3e;
          border-radius: 12px 12px 20px 20px;
          background: linear-gradient(
            145deg,
            #5b2984,
            #28113d,
            #100d2d
          );
          color: #e8bd69;
          font-size: 23px;
          box-shadow: 0 0 12px #ab65ff88;
        }

        @media (max-width: 640px) {
          .magical-scroll-top,
          .magical-scroll-bottom {
            height: 20px;
          }

          .magical-scroll-paper {
            padding: 24px 10px 55px;
            border-left-width: 4px;
            border-right-width: 4px;
          }

          .magical-scroll-paper::before {
            inset: 7px;
          }

          .magical-scroll-inner {
            padding: 8px 2px 50px;
          }

          .magical-scroll-feather {
            left: 8px;
          }

          .magical-scroll-quill {
            font-size: 32px;
          }

          .magical-scroll-inkpot {
            width: 32px;
            height: 30px;
            font-size: 17px;
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .magical-scroll-gem {
            animation: magical-gem-glow 4s ease-in-out infinite;
          }

          @keyframes magical-gem-glow {
            0%, 100% {
              opacity: .7;
              filter: brightness(.9);
            }
            50% {
              opacity: 1;
              filter: brightness(1.35);
            }
          }
        }
      `}</style>
    </>
  )
}
