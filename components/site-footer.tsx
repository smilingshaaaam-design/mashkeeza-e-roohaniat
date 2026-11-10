
import Image from 'next/image'

export function SiteFooter() {
  return (
    <footer className="relative isolate">
      <Image
        src="/images/footer-city.png"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover object-bottom"
      />

      <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-night to-transparent" />

      <div className="flex min-h-72 items-end justify-center px-4 pt-14 pb-1 md:min-h-96 md:pb-2">
        <div className="gold-frame-strong relative rounded-full bg-black/85 px-8 py-3 md:px-14">
          <span
            aria-hidden="true"
            className="absolute top-1/2 -right-3 size-4 -translate-y-1/2 rotate-45 border border-gold bg-black"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 -left-3 size-4 -translate-y-1/2 rotate-45 border border-gold bg-black"
          />

          <p className="gold-text text-lg leading-[2.2] md:text-2xl">
            مشکیزہ روحانیت — التماس دعا سید شاہ
          </p>
        </div>
      </div>
    </footer>
  )
}
