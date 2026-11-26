'use client'

import { useEffect, useState } from 'react'

const API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
const validSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 180 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

type Tag = { word: string; slug?: string; title?: string }
type Topics = { slug: string; heading: string; color: string; size: number; tags: Tag[] }

export function RelatedTopics({ slug }: { slug?: string }) {
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

  if (!topics || topics.slug !== slug) return null

  const tagClass = 'inline-block rounded-full border border-current px-3 py-1 leading-[2] break-words max-w-full'
  return (
    <section dir="rtl" aria-label={topics.heading}
      className="relative z-10 mx-auto mt-6 mb-4 w-full max-w-4xl rounded-xl border border-amber-700/40 bg-[#101b2e]/90 px-4 py-5 sm:px-6">
      <h2 className="gold-text mb-3 text-center text-lg font-bold leading-[2] sm:text-xl">
        {topics.heading}
      </h2>
      <div className="flex flex-wrap justify-center gap-2" style={{ color: topics.color, fontSize: topics.size }}>
        {topics.tags.map(tag => tag.slug ? (
          <a key={tag.word} dir="auto" href={'/read/' + tag.slug} title={tag.title}
            className={tagClass + ' hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'}>
            {tag.word}
          </a>
        ) : (
          <span key={tag.word} dir="auto" className={tagClass}>{tag.word}</span>
        ))}
      </div>
    </section>
  )
}
