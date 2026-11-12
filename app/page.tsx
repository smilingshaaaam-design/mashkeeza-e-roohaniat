import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'
import { HomepageCards } from '@/components/homepage-cards'
import { VisualCmsProvider } from '@/components/visual-cms'
import { SiteFooter } from '@/components/site-footer'
import { EditAwareMagic } from '@/components/edit-aware-magic'
import { ArticleBrowser } from '@/components/article-browser'
import { ShootingStars } from '@/components/shooting-stars'

export default function HomePage() {
  return (
    <VisualCmsProvider>
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-night">
        {/* Keep header background below smoke; header text and navigation retain their own z-20 layers. */}
        <div className="relative">
          <SiteHeader />
        </div>
        <EditAwareMagic kind="smoke" />
        <ShootingStars />
        <main className="relative z-0 flex-1">
          <section aria-label="روحانی منظر" className="relative -mt-2">
            <div className="relative aspect-[16/10] w-full overflow-hidden md:aspect-[16/8]">
              <div id="hero-stage" className="absolute inset-y-0 left-1/2 aspect-[1584/672] h-full -translate-x-1/2 [container-type:inline-size]">
                <Image src="/images/desert-scene.png" alt="صحرا میں روشن قدیم کتابیں، جادوئی چراغ اور سنہری روشنی کا دریا" fill sizes="(min-width: 768px) 118vw, 148vw" className="object-cover" />
                <EditAwareMagic kind="stars" />
                <EditAwareMagic kind="mashk" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night/60 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
              <ArticleBrowser />
            </div>
          </section>
          <HomepageCards />
        </main>
        <SiteFooter />
      </div>
    </VisualCmsProvider>
  )
}
