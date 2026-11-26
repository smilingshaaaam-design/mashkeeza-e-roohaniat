'use client'

import { useEffect, useState } from 'react'
import { findBookLocation, requestBookLocation, useBookLocations } from './book-links'

const API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
const validSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 180 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

type Tag = { word: string; slug?: string; title?: string; test?: boolean }
type Topics = { slug: string; heading: string; color: string; size: number; tags: Tag[] }

export function RelatedTopics({ slug, visible = true }: { slug?: string; visible?: boolean }) {
  const [topics, setTopics] = useState<Topics | null>(null)
  const bookLocations = useBookLocations()

  useEffect(() => {
    setTopics(null)
    if (!validSlug(slug)) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(API + '/public/seo/read?slug=' + encodeURIComponent(slug), {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        const seo = data?.seo
        if (data?.item?.slug !== slug || seo?.show_keywords !== true) return
        const words = ['urdu', 'roman_urdu', 'english'].flatMap(language => {
          const values = seo.keywords?.[language]
          return Array.isArray(values)
            ? values.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
            : []
        })
        const tags: Tag[] = [...new Set(words)].map(word => {
          const match = Object.prototype.hasOwnProperty.call(data.related || {}, word)
            ? data.related[word] : null
          return validSlug(match?.slug) && match.slug !== slug
            ? { word, slug: match.slug, title: typeof match.title === 'string' ? match.title : undefined }
            : { word }
        })
        if (!tags.length || controller.signal.aborted) return
        setTopics({
          slug,
          heading: typeof seo.section_title === 'string' && seo.section_title.trim()
            ? seo.section_title : 'متعلقہ موضوعات',
          color: typeof seo.color === 'string' && /^#[0-9a-f]{6}$/i.test(seo.color)
            ? seo.color : '#e5bd70',
          size: Math.max(10, Math.min(32, Number(seo.font_size) || 14)),
          tags,
        })
      } catch {
        // SEO tags are optional: a failed request must never interrupt article rendering.
      }
    }
    void load()
    return () => controller.abort()
  }, [slug])

  if (!visible || !topics || topics.slug !== slug) return null

  // The default gold CMS colour is intended for a dark surface. On antique
  // parchment use burnt ink instead, while honouring explicit custom colours.
  const ink = topics.color.toLowerCase() === '#e5bd70' ? '#63391e' : topics.color
  const currentRoot = typeof window === 'undefined' ? '' : window.location.hash.split('/')[0]
  const tags: Tag[] = [...topics.tags]
  // One explicitly labelled test link on the existing test post. Its target
  // is selected only from real, published, enabled and assigned book content.
  if (slug === 'bismillah-01' && !tags.some(tag => tag.slug && findBookLocation(bookLocations, tag.slug))) {
    const candidates = bookLocations.filter(item => item.slug !== slug)
    const sample = candidates.find(item => item.slug === 'bismillah-ar-rehman') ?? candidates[0]
    if (sample) tags.push({ word: sample.title + ' (آزمائشی رابطہ)', slug: sample.slug, title: sample.title, test: true })
  }
  return (
    <section dir="rtl" aria-label={topics.heading} className="ancient-related-topics horizontal-topics-scroll">
      <svg className="topics-scroll-roller topics-scroll-roller-right" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <image href="/magical-scroll/top-roller.png" width="100" height="100" preserveAspectRatio="none" transform="rotate(90 50 50)" />
      </svg>
      <div className="topics-scroll-paper">
        <div className="topics-scroll-art" aria-hidden="true" />
        <div className="ancient-related-heading"><span aria-hidden="true">❦</span><h2>{topics.heading}</h2><span aria-hidden="true">❦</span></div>
        <div className="ancient-related-list" style={{ color: ink, fontSize: topics.size }}>
          {tags.map((tag, index) => {
            const location = tag.slug ? findBookLocation(bookLocations, tag.slug, currentRoot) : undefined
            return tag.slug ? (
              <a key={tag.word + ':' + index} dir="auto" href={location?.href ?? '/read/' + tag.slug}
                title={location ? 'کتاب میں پڑھیں: ' + (tag.title || tag.word) : tag.title}
                onClick={event => {
                  if (!location || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
                  if (requestBookLocation(location.href)) event.preventDefault()
                }}
                className="ancient-related-inscription">{tag.word}</a>
            ) : (
              <span key={tag.word + ':' + index} dir="auto" className="ancient-related-inscription">{tag.word}</span>
            )
          })}
        </div>
      </div>
      <svg className="topics-scroll-roller topics-scroll-roller-left" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <image href="/magical-scroll/top-roller.png" width="100" height="100" preserveAspectRatio="none" transform="rotate(-90 50 50)" />
      </svg>
      <style jsx global>{`
        .horizontal-topics-scroll{--roller-width:clamp(26px,7vw,76px);position:relative;z-index:10;isolation:isolate;width:min(100%,52rem);margin:1.2rem auto 1.8rem;padding:12px calc(var(--roller-width)*.72);font-family:var(--font-nastaliq),'Noto Nastaliq Urdu',serif;filter:drop-shadow(0 5px 6px #150b0670);animation:relatedScrollAppear .5s ease-out both}
        .topics-scroll-paper{position:relative;isolation:isolate;min-height:108px;padding:clamp(1.35rem,3.3vw,2rem) clamp(.8rem,3vw,2.1rem) clamp(1.5rem,3.5vw,2.1rem);text-align:center}
        .topics-scroll-paper::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:url('/images/deewan/related-scroll-edge-patina.svg') center/100% 100% no-repeat,linear-gradient(90deg,#58301265 0%,#ab7c4130 4%,transparent 12%,transparent 88%,#ab7c4130 96%,#58301265 100%),radial-gradient(ellipse at 30% 0%,#8b5c3220,transparent 35%);-webkit-mask:url('/images/deewan/related-scroll-edge-mask.svg') center/100% 100% no-repeat;mask:url('/images/deewan/related-scroll-edge-mask.svg') center/100% 100% no-repeat;filter:drop-shadow(0 1px 1px #40210e35)}
        /* A single precomposed texture: no two book pages or central blend. */
        .topics-scroll-art{position:absolute;inset:0;z-index:-2;overflow:hidden;pointer-events:none;background:#e3c99a url('/images/deewan/related-scroll-single-parchment.svg') center/100% 100% no-repeat;-webkit-mask:url('/images/deewan/related-scroll-edge-mask.svg') center/100% 100% no-repeat;mask:url('/images/deewan/related-scroll-edge-mask.svg') center/100% 100% no-repeat}
        .topics-scroll-paper::after{content:none}
        .topics-scroll-roller{position:absolute;top:0;bottom:0;height:100%;width:var(--roller-width);z-index:2;pointer-events:none;filter:drop-shadow(1px 2px 2px #30150570);overflow:visible}
        .topics-scroll-roller-right{right:0}
        .topics-scroll-roller-left{left:0}
        .ancient-related-heading{display:flex;justify-content:center;align-items:center;gap:.7em;color:#68252b;margin:0 auto .65rem;text-align:center}
        .ancient-related-heading h2{font-size:clamp(18px,2.7vw,26px);line-height:2.15;font-weight:700;color:#68252b;margin:0;mix-blend-mode:multiply;text-shadow:.15px .25px .4px #63391e35}
        .ancient-related-heading span{font-size:1rem;color:#8e622d;display:flex;align-items:center;gap:.25em;flex:1;max-width:3.5em}
        .ancient-related-heading span:first-child::before,.ancient-related-heading span:last-child::after{content:"";height:1px;background:linear-gradient(90deg,transparent,#9b6c36,transparent);flex:1}
        .ancient-related-list{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:.24em .75em;line-height:2.65;mix-blend-mode:multiply}
        .ancient-related-inscription{display:inline-block;position:relative;max-width:100%;overflow-wrap:anywhere;padding:0 .3em;color:inherit;font-weight:500;opacity:.94;background:none;border:0;box-shadow:none;text-shadow:.12px .24px .35px #51331b30;font-family:inherit}
        .ancient-related-inscription::after{content:none}
        a.ancient-related-inscription{color:#382410;font-weight:700;text-decoration:underline;text-decoration-color:#a47c35;text-decoration-thickness:1px;text-underline-offset:.27em;border:0;cursor:pointer}
        a.ancient-related-inscription:hover{color:#68252b;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.24em}
        a.ancient-related-inscription:focus-visible{outline:2px solid #793b20;outline-offset:2px}
        @keyframes relatedScrollAppear{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:480px){.horizontal-topics-scroll{--roller-width:clamp(20px,7vw,33px);padding-block:8px}.topics-scroll-paper{padding-inline:.55rem}.ancient-related-list{gap:.24em .48em}.ancient-related-heading{gap:.35em}}
        @media(prefers-reduced-motion:reduce){.horizontal-topics-scroll{animation:none}}
      `}</style>
    </section>
  )
}
