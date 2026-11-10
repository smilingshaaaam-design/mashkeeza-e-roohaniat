import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'
import { HomepageCards } from '@/components/homepage-cards'
import { VisualCmsProvider } from '@/components/visual-cms'
import { SiteFooter } from '@/components/site-footer'
import { Starfield } from '@/components/magic/starfield'
import { Mashk } from '@/components/magic/mashk'
import { PaintedSmoke } from '@/components/magic/painted-smoke'
import PublishedContent from '@/components/published-content'

export default function HomePage() {
  return (
    <VisualCmsProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-night">
        <SiteHeader />
        <PaintedSmoke anchorSelector="#hero-stage" zIndex={10} menuHeight={90} />
        <main className="flex-1">
          {/* Published articles immediately below the navigation. */}
          <PublishedContent />
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
          <HomepageCards />
        </main>
        <SiteFooter />
      </div>
    </VisualCmsProvider>
  )
}
