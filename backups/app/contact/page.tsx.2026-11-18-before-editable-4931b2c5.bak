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
      <section className="mt-10 space-y-4 leading-loose" aria-labelledby="message-heading">
        <h2 id="message-heading" className="gold-text text-2xl">پیغام بھیجیں</h2>
        <p id="message-status">پیغام بھیجنے کے لیے اوپر دیے گئے ای میل یا واٹس ایپ کے لنک پر کلک کریں۔</p>
        <fieldset disabled aria-describedby="message-status" className="space-y-4">
          <label className="block">آپ کا ای میل<input type="email" dir="ltr" className="block w-full rounded border border-amber-700 bg-black/50 px-3 py-2" /></label>
          <label className="block">موضوع<input dir="auto" className="block w-full rounded border border-amber-700 bg-black/50 px-3 py-2" /></label>
          <label className="block">آپ کا پیغام<textarea dir="auto" rows={6} className="block w-full rounded border border-amber-700 bg-black/50 px-3 py-2" /></label>
          <button type="button" disabled className="rounded bg-amber-200/50 px-6 py-2 text-black">ارسال کریں</button>
        </fieldset>
      </section>
    </main>
  )
}
