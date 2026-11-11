'use client'

import { useEffect, useState } from 'react'
import { FeatureCard, type Feature } from '@/components/feature-card'
import { CMS_API, useVisualCms, type CardItem, type CardStyle } from '@/components/visual-cms'

const primaryFeatures: Feature[] = [
  { id: 'ism-azam', title: 'اسم اعظم', description: 'اللہ کے اسم اعظم سے روحانی فائدہ حاصل کریں', image: '/images/icon-ism-azam.png' },
  { id: 'jafar', title: 'علم جفر', description: 'حروف و اعداد کے اسرار کا علم حاصل کریں', image: '/images/icon-jafar.png' },
  { id: 'adad', title: 'علم الاعداد', description: 'اعداد کے ذریعے مستقبل کی جھلک', image: '/images/icon-adad.png' },
  { id: 'taweez', title: 'تعویذات', description: 'روحانی تعویذات اور مستند عملیات', image: '/images/icon-taweez.png' },
  { id: 'talismat', title: 'طلسمات', description: 'قرآنی طلسمات سے مشکلات کا حل', image: '/images/icon-talisman.png' },
  { id: 'wazaif', title: 'ورد و وظائف', description: 'روحانی سکون اور اللہ کی قربت', image: '/images/icon-wazaif.png' },
]
const secondaryFeatures: Feature[] = [
  { id: 'nawaz', title: 'روحانی نواز', description: 'آسان روحانی علاج اور روزمرہ زندگی کے لیے', image: '/images/icon-nawaz.png' },
  { id: 'peshgoiyan', title: 'تاریخی حسابات و پیش گوئیاں', description: 'ماضی اور مستقبل کے راز جانیں', image: '/images/icon-moon.png' },
  { id: 'jafri-hisabat', title: 'پرانے جفری حسابات', description: 'قدیم جفری حسابات سے مستفید ہوں', image: '/images/icon-scroll.png' },
  { id: 'contact', title: 'رابطہ کریں', description: 'اپنے سوالات اور رہنمائی کے لیے ہم سے رابطہ کریں', image: '/images/icon-quill.png' },
]
const defaults: CardItem[] = [
  ...primaryFeatures.map(x => ({ ...x, href: `#${x.id}`, card_group: 'primary' as const })),
  ...secondaryFeatures.map(x => ({ ...x, href: `#${x.id}`, card_group: 'secondary' as const })),
]
export function HomepageCards() {
  const cms = useVisualCms()
  const [published, setPublished] = useState<CardItem[] | null>(null)
  const [publishedStyles, setPublishedStyles] = useState<Record<string, CardStyle>>({})
  useEffect(() => { cms?.initCards(defaults) }, [cms?.authenticated])
  useEffect(() => {
    let active = true
    fetch(`${CMS_API}/public/cards`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => {
      if (active && Array.isArray(data?.items) && data.items.length) setPublished(data.items)
    }).catch(() => {})
    fetch(`${CMS_API}/public/design`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => {
      const styles = data?.settings?.published_appearance?.cardStyles
      if (active && styles && typeof styles === 'object' && !Array.isArray(styles)) setPublishedStyles(styles)
    }).catch(() => {})
    return () => { active = false }
  }, [])
  const cards = (cms?.cards ?? published ?? defaults).filter(x => x.visible !== false)
  const primary = cards.filter(x => x.card_group === 'primary')
  const secondary = cards.filter(x => x.card_group === 'secondary')
  return <section aria-labelledby="services-heading" className="relative mx-auto mt-10 max-w-7xl px-4 pb-20 md:mt-14">
    <h2 id="services-heading" className="sr-only">ہماری روحانی خدمات</h2>
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
      {primary.map(feature => <FeatureCard key={feature.id} feature={feature} publishedStyle={publishedStyles[feature.id]} />)}
    </div>
    <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {secondary.map(feature => <FeatureCard key={feature.id} feature={feature} wide publishedStyle={publishedStyles[feature.id]} />)}
    </div>
  </section>
}
