'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import CmsText from '@/components/cms-text'

export function SiteFooter() {
  const [showHelp, setShowHelp] = useState(false)

  function openPrivacySettings() {
    const google = (window as Window & {
      googlefc?: { showRevocationMessage?: () => void }
    }).googlefc
    if (typeof google?.showRevocationMessage === 'function') {
      google.showRevocationMessage()
      setShowHelp(false)
    } else {
      setShowHelp(value => !value)
    }
  }

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
            <CmsText
              settingKey="site_footer"
              fallback="مشکیزہ روحانیت — التماس دعا سید شاہ"
            />
          </p>
        </div>
      </div>
      <div className="relative bg-black/85 px-4 py-3 text-center text-amber-100">
        <Link href="/about" className="mx-4 inline-block leading-loose underline underline-offset-4">ہمارے بارے میں</Link>
        <button type="button" onClick={openPrivacySettings}
          className="cursor-pointer font-sans text-sm underline underline-offset-4">
          Privacy and cookie settings
        </button>
        {showHelp && (
          <p role="status" dir="rtl" className="mx-auto mt-2 max-w-xl text-sm leading-loose">
            اس وقت اس صفحے پر گوگل کا رضامندی فارم دستیاب نہیں ہے۔
            اس ویب سائٹ کی محفوظ شدہ کوکیز دیکھنے یا حذف کرنے کے لیے
            اپنے براؤزر کی رازداری کی ترتیبات کھولیں۔
          </p>
        )}
      </div>
    </footer>
  )
}
