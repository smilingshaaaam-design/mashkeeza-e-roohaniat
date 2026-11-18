import Link from 'next/link'
import { notFound } from 'next/navigation'
import { topics } from '@/lib/reading-topics'

export function generateStaticParams() {
  return topics.flatMap(topic => topic.readings.map(reading => ({ slug: reading.slug })))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const reading = topics.flatMap(topic => topic.readings).find(item => item.slug === slug)
  return { title: reading ? reading.title + ' | مشکیزہ روحانیت' : 'مشکیزہ روحانیت' }
}

export default async function ReadingPage({ params }: Props) {
  const { slug } = await params
  const topic = topics.find(item => item.readings.some(reading => reading.slug === slug))
  const reading = topic?.readings.find(item => item.slug === slug)
  if (!reading || !topic) notFound()

  return (
    <main lang="ur" dir="rtl" className="mx-auto max-w-3xl space-y-6 px-6 py-12 leading-[2.6] text-amber-100">
      <Link className="underline underline-offset-4" href={'/#topic-' + topic.id}>{topic.label} کے کارڈز</Link>
      <article className="space-y-5">
        <h1 className="gold-text text-3xl font-bold leading-loose">{reading.title}</h1>
        {reading.paragraphs.map(text => <p key={text}>{text}</p>)}
      </article>
    </main>
  )
}
