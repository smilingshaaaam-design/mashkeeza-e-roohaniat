import type { Metadata, Viewport } from 'next'
import { Gulzar, Noto_Nastaliq_Urdu } from 'next/font/google'
import { SparkleCursor } from '@/components/magic/sparkle-cursor'
import './globals.css'

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-nastaliq',
})

const gulzar = Gulzar({
  subsets: ['arabic'],
  weight: '400',
  variable: '--font-gulzar',
})

export const metadata: Metadata = {
  title: 'مشکیزہ روحانیت | علم و معرفت کا روحانی مرکز',
  description:
    'مشکیزہ روحانیت — اسم اعظم، علم جفر، علم الاعداد، تعویذات، طلسمات اور ورد و وظائف کا روحانی مرکز۔',
  icons: {
    icon: [{ url: '/favicon-48.png', sizes: '48x48', type: 'image/png' }, { url: '/favicon.ico', sizes: '16x16 32x32 48x48' }],
    shortcut: '/favicon.ico',
    apple: '/mashkeeza-logo.png',
  },
  openGraph: {
    title: 'مشکیزہ روحانیت | علم و معرفت کا روحانی مرکز',
    description:
      'اسم اعظم، علم جفر، علم الاعداد، تعویذات، طلسمات اور روحانی رہنمائی کا مرکز۔',
    url: 'https://mashkeeza-e-roohaniat.com/',
    siteName: 'مشکیزہ روحانیت',
    images: [
      {
        url: 'https://mashkeeza-e-roohaniat.com/mashkeeza-logo.png',
        width: 512,
        height: 512,
        alt: 'مشکیزہ روحانیت',
      },
    ],
    locale: 'ur_PK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مشکیزہ روحانیت',
    description: 'علم و معرفت کا روحانی مرکز',
    images: ['https://mashkeeza-e-roohaniat.com/mashkeeza-logo.png'],
  },
}

export const viewport: Viewport = {
  width: 1280,
  colorScheme: 'dark',
  themeColor: '#070a1f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ur"
      dir="rtl"
      className={`${nastaliq.variable} ${gulzar.variable} bg-night`}
    >
      <body className="font-urdu antialiased bg-night text-gold-light">
        {children}
        <SparkleCursor />
      </body>
    </html>
  )
}
