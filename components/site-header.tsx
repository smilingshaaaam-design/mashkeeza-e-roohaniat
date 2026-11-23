import '@/app/deewan.css'

import Image from 'next/image'
import { MainNav } from '@/components/main-nav'
import { Starfield } from '@/components/magic/starfield'
import { GoldenSand } from '@/components/magic/golden-sand'
import CmsText from '@/components/cms-text'

export function SiteHeader() {
  return (
    <header className="reshmi-header relative">
      <div className="reshmi-backdrop" aria-hidden="true">
        <Image src="/images/hero-sky.png" alt="" fill priority className="object-cover" />
        <svg aria-hidden="true" width="100%" height="100%" className="book-sky-texture">
          <defs>
            <pattern id="book-sky-repeat" width="384" height="128" patternUnits="userSpaceOnUse">
              <svg id="book-sky-sample" width="192" height="64" viewBox="40 4 20 14" preserveAspectRatio="none">
                <image href="/images/hero-sky.png" width="100" height="100" preserveAspectRatio="none" />
              </svg>
              <use href="#book-sky-sample" transform="translate(384 0) scale(-1 1)" />
              <use href="#book-sky-sample" transform="translate(0 128) scale(1 -1)" />
              <use href="#book-sky-sample" transform="translate(384 128) scale(-1 -1)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#book-sky-repeat)" />
        </svg>
        <Starfield count={110} seed={3} className="inset-0 z-[1]" />
      </div>
      <svg aria-hidden="true" width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="reshmi-gold-ink" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  9.5 0 -9 0 -0.55" />
          </filter>
        </defs>
      </svg>
      <div className="reshmi-mast">
        <h1 className="reshmi-title glow-pulse">
          <img className="title-ornaments" src="/images/reshmi/title-ornaments.png" alt="" aria-hidden="true" />
          <CmsText settingKey="site_title" fallback="مشکیزہ روحانیت" />
        </h1>
        <div className="reshmi-sand"><GoldenSand className="inset-x-0 top-0 w-full" /></div>
        <p className="sr-only"><CmsText settingKey="site_subtitle" fallback="علم و معرفت کا روحانی مرکز" /></p>
      </div>
      <div className="relative z-20"><MainNav /></div>
    </header>
  )
}
