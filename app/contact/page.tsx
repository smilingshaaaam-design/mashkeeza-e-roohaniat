import ContactEmailForm from '@/components/contact-email-form'
import Link from 'next/link'

export const metadata = { title: 'رابطہ کریں | مشکیزہ روحانیت' }

export default function ContactPage() {
  return (
    <main dir="rtl" lang="ur" className="mx-auto max-w-3xl px-6 py-12 text-amber-100">
      <Link href="/" className="underline underline-offset-4">صفحۂ اول</Link>
      <h1 className="gold-text my-6 text-3xl font-bold leading-loose">رابطہ کریں</h1>
      <p className="leading-loose">سوال یا معلومات کے لیے ہمیں فون کریں یا واٹس ایپ پر پیغام بھیجیں۔</p>
      <ul className="mt-6 space-y-4">
        <li>موبائل: <a dir="ltr" href="tel:+393888288898" className="inline-block font-sans underline">0039 3888 2888 98</a></li>
        <li>واٹس ایپ: <a dir="ltr" href="https://wa.me/393888288898" aria-label="واٹس ایپ پر رابطہ کریں: 0039 3888 2888 98" className="inline-flex items-center gap-2 align-middle font-sans underline">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0" fill="none">
            <path fill="#25D366" stroke="white" strokeWidth="1.3" d="M12 1.6a10 10 0 0 0-8.7 15L1.8 22l5.6-1.5A10 10 0 1 0 12 1.6Z" />
            <path fill="white" d="M8 6.2c-.5 0-1.6.7-1.6 2.4 0 1.7 1.3 3.5 3 5.1 1.7 1.6 4.1 3.1 5.9 3.1 1.4 0 2.3-.9 2.5-1.8.1-.4.1-.7-.2-.9l-2.3-1.1c-.3-.1-.5 0-.7.3l-.9 1c-.2.2-.4.2-.7.1-1.6-.7-3-1.9-3.9-3.4-.2-.3 0-.5.1-.7l.7-.9c.2-.3.2-.5.1-.8l-1-2.1c-.1-.3-.4-.4-1-.3Z" />
          </svg>
          <span>0039 3888 2888 98</span>
        </a></li>
        <li>ای میل: <a dir="ltr" href="mailto:mashkeezaeroohaniat@gmail.com" className="inline-block font-sans underline">mashkeezaeroohaniat@gmail.com</a></li>
      </ul>
      <ContactEmailForm />
    </main>
  )
}
