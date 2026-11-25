import Image from 'next/image'
import { ArticleBrowser } from '@/components/article-browser'
import { SiteHeader } from '@/components/site-header'
import { VisualCmsProvider } from '@/components/visual-cms'
import { SiteFooter } from '@/components/site-footer'
import { EditAwareMagic } from '@/components/edit-aware-magic'
import { ShootingStars } from '@/components/shooting-stars'

const googleThumbnailSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  url: 'https://mashkeeza-e-roohaniat.com/',
  name: 'مشکیزہ روحانیت | علم و معرفت کا روحانی مرکز',
  primaryImageOfPage: {
    '@type': 'ImageObject',
    contentUrl: 'https://mashkeeza-e-roohaniat.com/google-thumbnail.png',
    url: 'https://mashkeeza-e-roohaniat.com/google-thumbnail.png',
  },
}

export default function HomePage() {
  return (
    <VisualCmsProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(googleThumbnailSchema),
        }}
      />

      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-night">
        {/* Keep header background below smoke; header text and navigation retain their own z-20 layers. */}
        <div className="relative">
          <SiteHeader />
        </div>
        <EditAwareMagic kind="smoke" />
        <ShootingStars />
        <main className="deewan-home-main relative z-0 flex-1">
          <section aria-label="روحانی منظر" className="relative -mt-2">
            <div className="relative w-full min-h-[62.5vw] overflow-visible md:min-h-[50vw]">
              <div className="absolute inset-x-0 top-0 z-0 h-[62.5vw] overflow-hidden md:h-[50vw]">
                <div id="hero-stage" className="absolute inset-y-0 left-1/2 aspect-[1584/672] h-full -translate-x-1/2 [container-type:inline-size]">
                  <Image src="/images/desert-scene.png" alt="صحرا میں روشن قدیم کتابیں، جادوئی چراغ اور سنہری روشنی کا دریا" fill sizes="(min-width: 768px) 118vw, 148vw" className="object-cover" />
                  <EditAwareMagic kind="stars" />
                  <EditAwareMagic kind="mashk" />
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night/60 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
              </div>
              <ArticleBrowser />
            </div>
          </section>
          <div id="home-topic-cards" />

        </main>
        <SiteFooter />
      </div>
    </VisualCmsProvider>
  )
}
