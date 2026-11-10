
import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'
import { FeatureCard, type Feature } from '@/components/feature-card'
import { SiteFooter } from '@/components/site-footer'
import { Starfield } from '@/components/magic/starfield'
import { Mashk } from '@/components/magic/mashk'
import { PaintedSmoke } from '@/components/magic/painted-smoke'

const primaryFeatures: Feature[] = [
  {
    id: 'ism-azam',
    title: 'اسم اعظم',
    description: 'اللہ کے اسم اعظم سے روحانی فائدہ حاصل کریں',
    image: '/images/icon-ism-azam.png',
  },
  {
    id: 'jafar',
    title: 'علم جفر',
    description: 'حروف و اعداد کے اسرار کا علم حاصل کریں',
    image: '/images/icon-jafar.png',
  },
  {
    id: 'adad',
    title: 'علم الاعداد',
    description: 'اعداد کے ذریعے مستقبل کی جھلک',
    image: '/images/icon-adad.png',
  },
  {
    id: 'taweez',
    title: 'تعویذات',
    description: 'روحانی تعویذات اور مستند عملیات',
    image: '/images/icon-taweez.png',
  },
  {
    id: 'talismat',
    title: 'طلسمات',
    description: 'قرآنی طلسمات سے مشکلات کا حل',
    image: '/images/icon-talisman.png',
  },
  {
    id: 'wazaif',
    title: 'ورد و وظائف',
    description: 'روحانی سکون اور اللہ کی قربت',
    image: '/images/icon-wazaif.png',
  },
]

const secondaryFeatures: Feature[] = [
  {
    id: 'nawaz',
    title: 'روحانی نواز',
    description: 'آسان روحانی علاج اور روزمرہ زندگی کے لیے',
    image: '/images/icon-nawaz.png',
  },
  {
    id: 'peshgoiyan',
    title: 'تاریخی حسابات و پیش گوئیاں',
    description: 'ماضی اور مستقبل کے راز جانیں',
    image: '/images/icon-moon.png',
  },
  {
    id: 'jafri-hisabat',
    title: 'پرانے جفری حسابات',
    description: 'قدیم جفری حسابات سے مستفید ہوں',
    image: '/images/icon-scroll.png',
  },
  {
    id: 'contact',
    title: 'رابطہ کریں',
    description: 'اپنے سوالات اور رہنمائی کے لیے ہم سے رابطہ کریں',
    image: '/images/icon-quill.png',
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-night">
      <SiteHeader />

      <PaintedSmoke anchorSelector="#hero-stage" zIndex={10} menuHeight={90} />

      <main className="flex-1">
        <section aria-label="روحانی منظر" className="relative -mt-2">
          <div className="relative aspect-[16/10] w-full overflow-hidden md:aspect-[16/8]">
            <div
              id="hero-stage"
              className="absolute inset-y-0 left-1/2 aspect-[1584/672] h-full -translate-x-1/2 [container-type:inline-size]"
            >
              <Image
                src="/images/desert-scene.png"
                alt="صحرا میں روشن قدیم کتابیں، جادوئی چراغ اور سنہری روشنی کا دریا"
                fill
                sizes="(min-width: 768px) 118vw, 148vw"
                className="object-cover"
              />
              <Starfield count={90} seed={11} className="inset-x-0 top-0 h-[38%]" />
              <Mashk />
            </div>
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
          </div>
        </section>

        <section
          aria-labelledby="services-heading"
          className="relative mx-auto mt-10 max-w-7xl px-4 pb-20 md:mt-14"
        >
          <h2 id="services-heading" className="sr-only">
            ہماری روحانی خدمات
          </h2>

          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {primaryFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} wide />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
