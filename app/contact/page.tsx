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
        <li>واٹس ایپ: <a dir="ltr" href="https://wa.me/393888288898" className="inline-block font-sans underline">0039 3888 2888 98</a></li>
        <li>ای میل: <a dir="ltr" href="mailto:mashkeezaeroohaniat@gmail.com" className="inline-block font-sans underline">mashkeezaeroohaniat@gmail.com</a></li>
      </ul>
      <ContactEmailForm />
    </main>
  )
}
