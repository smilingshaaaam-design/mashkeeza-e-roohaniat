import Image from 'next/image'
import { MainNav } from '@/components/main-nav'
import { Starfield } from '@/components/magic/starfield'
import { GoldenSand } from '@/components/magic/golden-sand'

/**
 * Layers (low -> high):
 *  0  hero-sky.png + gradient
 *  1  Starfield
 *  10 MagicalSmoke (rendered separately via portal, use zIndex={10})
 *  20 Heading text + Menu
 *
 * The header is NOT `isolate` / z-indexed anymore, so the smoke canvas can sit
 * between the sky image and the menu.
 */
export function SiteHeader() {
  return (
    <header className="relative">
      <Image
        src="/images/hero-sky.png"
        alt=""
        fill
        priority
        className="z-0 object-cover object-center"
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-night/70" />
      <Starfield count={110} seed={3} className="inset-0 z-[1]" />

      <div className="relative z-20 mx-auto flex max-w-6xl flex-col items-center px-4 pt-12 pb-10 text-center md:pt-16 md:pb-14">
        <div className="relative">
          <h1 className="gold-text glow-pulse font-display text-6xl leading-[1.9] md:text-8xl md:leading-[1.75]">
            مشکیزہ روحانیت
          </h1>
          <GoldenSand className="-inset-x-6 top-0 w-[calc(100%+3rem)]" />
        </div>
        <p className="gold-text text-xl leading-[2.2] md:text-3xl">علم و معرفت کا روحانی مرکز</p>
        <div className="mt-2 flex items-center gap-3" aria-hidden="true">
          <span className="h-px w-24 bg-gradient-to-l from-gold to-transparent md:w-40" />
          <span className="size-2 rotate-45 bg-gold shadow-[0_0_10px_#f5c25b]" />
          <span className="h-px w-24 bg-gradient-to-r from-gold to-transparent md:w-40" />
        </div>
      </div>

      {/* Menu stays above the smoke. Remove bg-night/90 if MainNav already has its own background */}
      <div className="relative z-20 bg-night/90">
        <MainNav />
      </div>
    </header>
  )
}
