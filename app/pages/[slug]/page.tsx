import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { VisualCmsProvider } from '@/components/visual-cms'

const API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
type Page = {id:string;slug:string;title:string;body?:string|null;excerpt?:string|null;content_type:string}
export const dynamic = 'force-dynamic'

export default async function PublicPage({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params
  if (!/^[a-z0-9-]{1,150}$/i.test(slug)) notFound()
  let page:Page|undefined
  try {
    const response=await fetch(`${API}/public/content`,{cache:'no-store'})
    if (response.ok) {
      const data=await response.json()
      page=(Array.isArray(data.items)?data.items:[]).find((p:Page)=>p.content_type==='page' && p.slug===slug)
    }
  } catch {}
  if (!page) notFound()
  return <VisualCmsProvider><div className="min-h-screen bg-night text-amber-100">
    <div className="relative z-[100]"><SiteHeader/></div>
    <main dir="rtl" className="mx-auto min-h-[60vh] max-w-5xl px-5 py-12 sm:px-10">
      <article className="rounded-2xl border border-amber-700/50 bg-black/55 p-6 shadow-2xl sm:p-12">
        <h1 className="gold-text mb-8 text-2xl font-bold leading-[2] sm:text-4xl">{page.title}</h1>
        {page.excerpt && <p className="mb-6 text-lg leading-[2] text-amber-200">{page.excerpt}</p>}
        <div className="whitespace-pre-wrap break-words text-base leading-[2.5] sm:text-lg">{page.body||''}</div>
      </article>
      <Link className="mt-8 inline-block text-amber-300 underline" href="/">صفحۂ اول</Link>
    </main><SiteFooter/>
  </div></VisualCmsProvider>
}
