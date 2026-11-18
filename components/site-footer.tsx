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
              fallback="مشکیزہ روحانیت — التماس دعا سید حسن شاہ"
            />
          </p>
        </div>
      </div>
      <div className="relative bg-black/85 px-4 py-3 text-center text-amber-100">
        <div dir="ltr" className="mb-2 flex justify-center gap-3">
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=mashkeezaeroohaniat%40gmail.com" target="_blank" rel="noopener noreferrer" aria-label="جی میل پر پیغام لکھیں" title="Gmail" className="grid size-11 place-items-center rounded-full bg-white">
            <svg viewBox="0 0 24 18" className="w-7" aria-hidden="true">
              <path fill="#4285f4" d="M0 3h4v15H1a1 1 0 0 1-1-1Z"/><path fill="#34a853" d="M20 3h4v14a1 1 0 0 1-1 1h-3Z"/>
              <path fill="#ea4335" d="M4 1l8 6 8-6v5l-8 6-8-6Z"/><path fill="#c5221f" d="M0 2a2 2 0 0 1 3-1.7L4 1v5L0 3Z"/><path fill="#fbbc04" d="M20 1l1-.7A2 2 0 0 1 24 2v1l-4 3Z"/>
            </svg>
          </a>
          <a href="https://wa.me/393888288898" target="_blank" rel="noopener noreferrer" aria-label="واٹس ایپ پر رابطہ کریں" title="WhatsApp" className="grid size-11 place-items-center rounded-full bg-[#128c4a]">
            <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true"><path fill="none" stroke="white" strokeWidth="1.6" d="M12 2a9.5 9.5 0 0 0-8.2 14.3L2.3 22l5.8-1.5A9.5 9.5 0 1 0 12 2Z"/><path fill="white" d="M8 6c-1 0-2 1-2 2.5 0 3.4 6 9.1 9.4 8.4 1.2-.2 2.3-1.2 2.3-2.2l-2.9-1.5-1.2 1.3a9.5 9.5 0 0 1-4-3.5l1-1.4L9 6Z"/></svg>
          </a>
          <a href="https://www.facebook.com/share/1KyW6GshiY/" target="_blank" rel="noopener noreferrer" aria-label="ہماری فیس بک پروفائل کھولیں" title="Facebook" className="grid size-11 place-items-center rounded-full bg-[#1877f2]">
            <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true"><path fill="white" d="M14 22v-9h3l.5-3H14V8c0-1 .3-1.6 1.7-1.6H18v-3a18 18 0 0 0-2.8-.2c-2.9 0-4.7 1.8-4.7 4.9V10H7.4v3h3.1v9Z"/></svg>
          </a>
        </div>
        <Link href="/about" className="mx-4 inline-block leading-loose underline underline-offset-4">ہمارے بارے میں</Link>
        <Link href="/contact" className="mx-4 inline-block leading-loose underline underline-offset-4">رابطہ کریں</Link>
        <Link href="/privacy-policy" className="mx-4 inline-block leading-loose underline underline-offset-4">پرائیویسی پالیسی</Link>
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
