'use client'

import { useEffect, useState } from 'react'

const API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
const validSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 180 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

type Tag = { word: string; slug?: string; title?: string }
type Topics = { slug: string; heading: string; color: string; size: number; tags: Tag[] }

export function RelatedTopics({ slug, visible = true }: { slug?: string; visible?: boolean }) {
  const [topics, setTopics] = useState<Topics | null>(null)

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
  return (
    <section dir="rtl" aria-label={topics.heading} className="ancient-related-topics">
      <div className="ancient-related-heading"><span aria-hidden="true">❦</span><h2>{topics.heading}</h2><span aria-hidden="true">❦</span></div>
      <div className="ancient-related-list" style={{ color: ink, fontSize: topics.size }}>
        {topics.tags.map((tag, index) => tag.slug ? (
          <a key={tag.word} dir="auto" href={'/read/' + tag.slug} title={tag.title}
            className="ancient-related-slip" data-edge={index % 3}>{tag.word}</a>
        ) : (
          <span key={tag.word} dir="auto" className="ancient-related-slip" data-edge={index % 3}>{tag.word}</span>
        ))}
      </div>
      <style jsx global>{`
        .ancient-related-topics{position:relative;z-index:10;isolation:isolate;max-width:54rem;margin:1rem auto 1.5rem;padding:clamp(1.1rem,4vw,2.35rem);font-family:'Noto Nastaliq Urdu',serif;filter:drop-shadow(0 7px 8px #0009);animation:relatedPaperAppear .5s ease-out both}
        .ancient-related-topics::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 10% 12%,#78401b55,transparent 24%),radial-gradient(ellipse at 96% 85%,#63320f66,transparent 29%),linear-gradient(90deg,#7d421a35,transparent 15%,transparent 86%,#7d421a45),url('/images/deewan/paper-surface.webp') center/cover,#e6c591;clip-path:polygon(0.5% 4%,4% 2%,7% 3.5%,10% 0.8%,15% 2%,19% 1%,24% 3%,29% 1.4%,34% 2%,38% 0.5%,42% 2%,48% 1%,54% 2.8%,60% 0.4%,66% 2.3%,72% 1%,76% 3%,81% .8%,86% 2.4%,92% 1%,97% 3%,99% 0.9%,98.4% 12%,100% 18%,98.5% 26%,99.7% 36%,98.5% 44%,100% 55%,98.7% 64%,99.8% 75%,98.6% 85%,100% 95%,96% 98%,92% 96%,87% 99%,82% 97%,76% 99%,71% 97%,66% 99.5%,60% 97%,54% 99%,49% 97%,43% 100%,38% 97.5%,32% 99%,27% 97%,21% 99%,16% 96.8%,11% 99%,6% 97%,1% 99%,2% 89%,0 81%,1.8% 71%,0.4% 61%,2% 51%,0 42%,1.5% 31%,0 22%,1.8% 13%)}
        .ancient-related-heading{display:flex;justify-content:center;align-items:center;gap:.7em;color:#733c20;margin-bottom:.9rem;text-align:center}
        .ancient-related-heading h2{font-size:clamp(17px,2.8vw,25px);line-height:2.4;font-weight:700;color:#6d321a;margin:0}
        .ancient-related-heading span{font-size:1.35rem;color:#9a662e}
        .ancient-related-list{display:flex;flex-wrap:wrap;justify-content:center;gap:.55rem .65rem}
        .ancient-related-slip{display:inline-block;position:relative;isolation:isolate;max-width:100%;overflow-wrap:anywhere;line-height:2.35;padding:.3em .85em .48em;text-align:center;font-weight:600;color:inherit;text-shadow:0 1px #fff2;filter:drop-shadow(1px 2px 1px #66330b55)}
        .ancient-related-slip::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 0 100%,#83502180,transparent 36%),linear-gradient(135deg,#f1d9a5,#d0a76a 62%,#b98549);clip-path:polygon(1% 9%,12% 3%,22% 8%,38% 1%,52% 7%,67% 2%,82% 8%,98% 1%,96% 22%,100% 44%,96% 67%,99% 91%,86% 98%,74% 91%,62% 99%,45% 92%,30% 99%,15% 93%,1% 98%,4% 72%,0 48%,3% 25%)}
        .ancient-related-slip[data-edge="1"]::before{clip-path:polygon(0 4%,17% 10%,29% 1%,48% 6%,66% 0,83% 7%,100% 4%,97% 30%,100% 56%,96% 80%,99% 98%,81% 92%,64% 99%,49% 94%,34% 100%,19% 94%,0 97%,3% 68%,0 40%,3% 19%)}
        .ancient-related-slip[data-edge="2"]::before{clip-path:polygon(2% 2%,14% 7%,32% 0,47% 8%,62% 3%,77% 9%,97% 1%,100% 24%,96% 51%,100% 74%,98% 98%,83% 94%,68% 100%,51% 94%,36% 98%,20% 91%,1% 98%,4% 75%,0 47%,3% 22%)}
        a.ancient-related-slip{text-decoration:underline;text-decoration-color:currentColor;text-underline-offset:.25em}
        a.ancient-related-slip:hover{filter:drop-shadow(1px 2px 2px #66330b88) brightness(1.08)}
        a.ancient-related-slip:focus-visible{outline:2px solid #793b20;outline-offset:3px}
        @keyframes relatedPaperAppear{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){.ancient-related-topics{animation:none}}
      `}</style>
    </section>
  )
}
