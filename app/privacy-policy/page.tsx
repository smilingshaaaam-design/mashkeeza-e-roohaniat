import Link from 'next/link'

export const metadata = { title: 'Privacy Policy | Mashkeeza Ruhaniyat' }

export default function PrivacyPage() {
  return (
    <main dir="ltr" lang="en" className="mx-auto max-w-3xl px-6 py-12 font-sans text-amber-100">
      <Link href="/" className="underline underline-offset-4">Home</Link>
      <article className="mt-6 space-y-5 leading-relaxed">
        <h1 className="gold-text text-3xl font-bold">Privacy Policy</h1>
        <p>Last updated 18 November 2026</p>
        <p>Mashkeeza Ruhaniyat is operated by Syed Hassan Shah. We are responsible for how this website handles personal information. You can read our articles without creating an account or providing your name, email address, or phone number. For privacy questions or requests, you can reach us at <a className="underline" href="mailto:mashkeezaeroohaniat@gmail.com">mashkeezaeroohaniat@gmail.com</a>.</p>
        <h2 className="gold-text text-xl">Using the Ism-e-Azam calculator</h2>
        <p>The Ism-e-Azam calculator opens in a separate web app. It uses the name or other text you enter to calculate and display your result. The calculator does not save your entries or results, and we do not keep a history of your calculations.</p>
        <h2 className="gold-text text-xl">Contacting us</h2>
        <p>Contacting us is optional. If you use the website’s contact form, it opens a draft in your email app containing the email address, subject, and message you entered. The website does not store a copy of the form. We receive your message only when you send it from your email app. If you contact us through WhatsApp, we receive your message and can see the phone number associated with it.</p>
        <p>We treat your correspondence as private. We use the details you send to understand your enquiry, reply, and follow up on the same matter. Our legal basis for answering general enquiries is our legitimate interest in responding to people who contact us. If you request a quotation or ask us to arrange a paid service, we use the relevant details to take the steps you request before entering into an agreement.</p>
        <p>Messages you send may remain in our email or messaging account while we handle your enquiry, complete any related follow-up, or resolve a dispute. Where the law requires us to retain a particular record, we keep it for the applicable period.</p>
        <h2 className="gold-text text-xl">Website hosting, analytics and browser storage</h2>
        <p>Cloudflare hosts our website. When you open a page, your browser sends Cloudflare technical information needed to deliver it. This can include your IP address, the page requested, and browser information. We rely on our legitimate interest in keeping the website available, diagnosing faults, and protecting it against misuse.</p>
        <p>Cloudflare Web Analytics is disabled for this website. The website also includes Vercel Web Analytics code, which can send page-usage information to Vercel when active. We have not confirmed whether Vercel receives analytics from the live website.</p>
        <p>The animated scroll temporarily stores a feather movement preference in your browser for the current session. You can clear this preference through your browser’s site-data settings. Where Google’s consent form is available, you can reopen it using <strong>Privacy and cookie settings</strong> in the website footer.</p>
        <h2 className="gold-text text-xl">External links</h2>
        <p>If you choose to open Gmail, WhatsApp, or Facebook from our website, your browser connects to that service. Its own privacy policy explains how it handles information when you use it.</p>
        <h2 className="gold-text text-xl">Your privacy rights</h2>
        <p>You can email <a className="underline" href="mailto:mashkeezaeroohaniat@gmail.com">mashkeezaeroohaniat@gmail.com</a> to ask whether we hold personal information about you, request a copy, correct an error, or ask for deletion. Depending on the circumstances, you may also ask us to restrict how we use your information, object to processing based on our legitimate interests, or receive information you provided in a portable format. If we rely on your consent for a particular use, you may withdraw it at any time.</p>
        <p>If you believe we have handled your personal data unlawfully, you have the right to lodge a complaint with the relevant data protection authority.</p>
      </article>
    </main>
  )
}
