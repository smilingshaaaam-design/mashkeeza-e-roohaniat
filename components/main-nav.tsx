'use client'

import { useState } from 'react'
import { ChevronDown, Home, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { label: string; href: string; children?: string[] }

const navItems: NavItem[] = [
  { label: 'صفحۂ اول', href: '#' },
  {
    label: 'اسم اعظم',
    href: '#ism-azam',
    children: ['اسم اعظم بذریعہ علم جفر', 'اسم اعظم علم الاعداد', 'اسم اعظم کیلکولیٹر'],
  },
  {
    label: 'جفر',
    href: '#jafar',
    children: [
      'علم جفر: تاریخ و تعارف',
      'علم جفر کی حقیقت اور اسلام',
      'علم جفر کا دیگر علوم سے تعلق',
      'علم جفر سیکھیے',
      'علم جفر سے جانیے اپنے مسائل اور حل',
    ],
  },
  {
    label: 'علم الاعداد',
    href: '#adad',
    children: [
      'علم الاعداد: تاریخ و تعارف',
      'علم الاعداد کی حقیقت اور اسلام',
      'علم الاعداد کا دیگر علوم سے تعلق',
      'علم الاعداد سیکھیے',
      'علم الاعداد سے جانیے اپنے مسائل اور حل',
    ],
  },
  { label: 'تعویذات', href: '#taweez', children: ['روحانی تعویذات', 'مستند عملیات'] },
  { label: 'طلسمات', href: '#talismat', children: ['قرآنی طلسمات', 'مشکلات کا حل'] },
  { label: 'ورد و وظائف', href: '#wazaif', children: ['روزمرہ وظائف', 'خصوصی اوراد'] },
  { label: 'روحانی نواز', href: '#nawaz' },
  {
    label: 'تاریخی حسابات و پیش گوئیاں',
    href: '#peshgoiyan',
    children: ['ماضی کے حسابات', 'مستقبل کی پیش گوئیاں'],
  },
  { label: 'پرانے جفری حسابات', href: '#jafri-hisabat' },
  { label: 'رابطہ کریں', href: '#contact' },
]

export function MainNav() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <nav aria-label="مرکزی مینو" className="relative z-30 px-2 md:px-4">
      <div className="gold-frame-strong mx-auto max-w-7xl rounded-md bg-gradient-to-b from-[#1a1206] via-[#0b0904] to-[#1a1206]">
        <div className="flex items-center justify-between px-3 py-2 lg:hidden">
          <span className="gold-text text-lg leading-loose">مینو</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'مینو بند کریں' : 'مینو کھولیں'}
            className="rounded p-2 text-gold hover:bg-gold/10"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <ul
          className={cn(
            'flex-col lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:justify-center',
            open ? 'flex' : 'hidden',
          )}
        >
          {navItems.map((item, index) => (
            <li key={item.label} className="group relative">
              <div className="flex items-center">
                <a
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm leading-[2.2] text-gold-light transition-colors hover:text-gold xl:text-[15px]"
                >
                  {index === 0 && <Home className="size-4 text-gold" aria-hidden="true" />}
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      className="hidden size-3.5 text-gold transition-transform group-hover:rotate-180 lg:block"
                      aria-hidden="true"
                    />
                  )}
                </a>
                {item.children && (
                  <button
                    type="button"
                    className="ms-auto p-2 text-gold lg:hidden"
                    aria-label={`${item.label} ذیلی مینو`}
                    aria-expanded={expanded === item.label}
                    onClick={() => setExpanded((e) => (e === item.label ? null : item.label))}
                  >
                    <ChevronDown
                      className={cn('size-4 transition-transform', expanded === item.label && 'rotate-180')}
                    />
                  </button>
                )}
              </div>

              {item.children && (
                <ul
                  className={cn(
                    'gold-frame rounded-sm bg-black/95 py-1',
                    'lg:invisible lg:absolute lg:top-full lg:right-0 lg:mt-2 lg:min-w-56 lg:opacity-0 lg:transition-all lg:group-focus-within:visible lg:group-focus-within:opacity-100 lg:group-hover:visible lg:group-hover:opacity-100',
                    expanded === item.label ? 'mx-3 mb-2 block' : 'hidden lg:block',
                  )}
                >
                  {item.children.map((child) => (
                    <li key={child}>
                      <a
                        href={item.href}
                        className="block px-4 py-1.5 text-sm leading-[2.2] whitespace-nowrap text-gold-light transition-colors hover:bg-gold/10 hover:text-gold"
                      >
                        {child}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
