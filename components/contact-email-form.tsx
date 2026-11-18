'use client'

import type { FormEvent } from 'react'

export default function ContactEmailForm() {
  function openDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const subject = encodeURIComponent(String(fields.get('subject')).trim())
    const body = encodeURIComponent(String(fields.get('message')).trim() + '\n\n' + String(fields.get('email')).trim())
    window.location.href = 'mailto:mashkeezaeroohaniat@gmail.com?subject=' + subject + '&body=' + body
  }

  return (
      <section className="mt-10 space-y-4 leading-loose" aria-labelledby="message-heading">
        <h2 id="message-heading" className="gold-text text-2xl">پیغام بھیجیں</h2>
        <p id="message-status">تفصیل لکھ کر ای میل ایپ کھولیں، پھر وہاں سے پیغام ارسال کریں۔</p>
        <form onSubmit={openDraft} aria-describedby="message-status" className="space-y-4">
          <label className="block">آپ کا ای میل<input type="email" name="email" autoComplete="email" required dir="ltr" className="block w-full rounded border border-amber-700 bg-black/50 px-3 py-2" /></label>
          <label className="block">موضوع<input name="subject" required maxLength={160} dir="auto" className="block w-full rounded border border-amber-700 bg-black/50 px-3 py-2" /></label>
          <label className="block">آپ کا پیغام<textarea name="message" required dir="auto" rows={6} className="block w-full rounded border border-amber-700 bg-black/50 px-3 py-2" /></label>
          <button type="submit" className="rounded bg-amber-200/50 px-6 py-2 text-black">ای میل ایپ کھولیں</button>
        </form>
      </section>
  )
}
