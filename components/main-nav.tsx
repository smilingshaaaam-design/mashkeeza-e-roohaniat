
'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVisualCms } from '@/components/visual-cms'

const CMS_API =
  'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

export type NavItem = {
  id: string
  label: string
  href: string
  children?: NavItem[]
  visible?: boolean
  openInNewTab?: boolean
}

export const defaultNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'صفحۂ اول',
    href: '/',
  },
  {
    id: 'ism-azam',
    label: 'اسم اعظم',
    href: '#ism-azam',
    children: [
      {
        id: 'ism-jafar',
        label: 'اسم اعظم بذریعہ علم جفر',
        href: '#ism-azam',
      },
      {
        id: 'ism-adad',
        label: 'اسم اعظم علم الاعداد',
        href: '#ism-azam',
      },
      {
        id: 'ism-calculator',
        label: 'اسم اعظم کیلکولیٹر',
        href: 'https://quran-analyzer.web.app/',
        openInNewTab: true,
      },
    ],
  },
  {
    id: 'jafar',
    label: 'جفر',
    href: '#jafar',
    children: [
      {
        id: 'jafar-history',
        label: 'علم جفر: تاریخ و تعارف',
        href: '#jafar',
      },
      {
        id: 'jafar-islam',
        label: 'علم جفر کی حقیقت اور اسلام',
        href: '#jafar',
      },
      {
        id: 'jafar-other-sciences',
        label: 'علم جفر کا دیگر علوم سے تعلق',
        href: '#jafar',
      },
      {
        id: 'jafar-learn',
        label: 'علم جفر سیکھیے',
        href: '#jafar',
      },
      {
        id: 'jafar-problems',
        label: 'علم جفر سے جانیے اپنے مسائل اور حل',
        href: '#jafar',
      },
    ],
  },
  {
    id: 'adad',
    label: 'علم الاعداد',
    href: '#adad',
    children: [
      {
        id: 'adad-history',
        label: 'علم الاعداد: تاریخ و تعارف',
        href: '#adad',
      },
      {
        id: 'adad-islam',
        label: 'علم الاعداد کی حقیقت اور اسلام',
        href: '#adad',
      },
      {
        id: 'adad-other-sciences',
        label: 'علم الاعداد کا دیگر علوم سے تعلق',
        href: '#adad',
      },
      {
        id: 'adad-learn',
        label: 'علم الاعداد سیکھیے',
        href: '#adad',
      },
      {
        id: 'adad-problems',
        label: 'علم الاعداد سے جانیے اپنے مسائل اور حل',
        href: '#adad',
      },
    ],
  },
  {
    id: 'taweez',
    label: 'تعویذات',
    href: '#taweez',
    children: [
      {
        id: 'taweez-roohani',
        label: 'روحانی تعویذات',
        href: '#taweez',
      },
      {
        id: 'taweez-amliyat',
        label: 'مستند عملیات',
        href: '#taweez',
      },
    ],
  },
  {
    id: 'talismat',
    label: 'طلسمات',
    href: '#talismat',
    children: [
      {
        id: 'talismat-qurani',
        label: 'قرآنی طلسمات',
        href: '#talismat',
      },
      {
        id: 'talismat-solutions',
        label: 'مشکلات کا حل',
        href: '#talismat',
      },
    ],
  },
  {
    id: 'wazaif',
    label: 'ورد و وظائف',
    href: '#wazaif',
    children: [
      {
        id: 'wazaif-daily',
        label: 'روزمرہ وظائف',
        href: '#wazaif',
      },
      {
        id: 'wazaif-special',
        label: 'خصوصی اوراد',
        href: '#wazaif',
      },
    ],
  },
  {
    id: 'nawaz',
    label: 'روحانی نواز',
    href: '#nawaz',
  },
  {
    id: 'peshgoiyan',
    label: 'تاریخی حسابات و پیش گوئیاں',
    href: '#peshgoiyan',
    children: [
      {
        id: 'past-calculations',
        label: 'ماضی کے حسابات',
        href: '#peshgoiyan',
      },
      {
        id: 'future-predictions',
        label: 'مستقبل کی پیش گوئیاں',
        href: '#peshgoiyan',
      },
    ],
  },
  {
    id: 'jafri-hisabat',
    label: 'پرانے جفری حسابات',
    href: '#jafri-hisabat',
  },
  {
    id: 'contact',
    label: 'رابطہ کریں',
    href: '#contact',
  },
]

function isNavItem(value: unknown): value is NavItem {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    typeof item.label === 'string' &&
    typeof item.href === 'string' &&
    (item.children === undefined ||
      Array.isArray(item.children))
  )
}

function isSafeHref(href: string): boolean {
  if (
    href.startsWith('/') &&
    !href.startsWith('//')
  ) {
    return true
  }

  if (
    href.startsWith('#') &&
    href.length > 1
  ) {
    return true
  }

  try {
    const url = new URL(href)
    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    )
  } catch {
    return false
  }
}

function cleanNavItems(
  items: unknown[],
  depth = 0
): NavItem[] {
  if (depth > 30) return []

  return items
    .filter(isNavItem)
    .filter(item => item.visible !== false)
    .map(item => ({
      id: item.id,
      label: item.label,
      href: isSafeHref(item.href)
        ? item.href
        : '#',
      openInNewTab: item.openInNewTab === true,
      children: Array.isArray(item.children)
        ? cleanNavItems(item.children, depth + 1)
        : undefined,
    }))
}

function containsMenu(item: NavItem, id: string): boolean {
  return item.id === id || (item.children || []).some(child => containsMenu(child, id))
}

type MenuEntryProps = {
  item: NavItem
  depth: number
  first?: boolean
  expanded: Set<string>
  toggle: (id: string) => void
  closeAll: () => void
  editing?: boolean
  onEdit?: (id: string) => void
  selectedMenuId?: string | null
}

function MenuEntry({
  item,
  depth,
  first = false,
  expanded,
  toggle,
  closeAll,
  editing = false,
  onEdit,
  selectedMenuId,
}: MenuEntryProps) {
  const children = item.children || []
  const hasChildren = children.length > 0
  const isExpanded = expanded.has(item.id)
  const isRoot = depth === 0
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current)
  }, [])

  function enterMenu() {
    if (leaveTimer.current !== null) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    setHovered(true)
  }

  function leaveMenu() {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current)
    // Give the pointer time to cross from the parent to its dropdown.
    leaveTimer.current = setTimeout(() => {
      setHovered(false)
      leaveTimer.current = null
    }, 450)
  }
  const selected = editing && selectedMenuId === item.id
  const showChildren = hasChildren && (hovered || isExpanded || (editing && !!selectedMenuId && containsMenu(item, selectedMenuId)))

  return (
    <li
      onMouseEnter={enterMenu}
      onMouseLeave={leaveMenu}
      className={cn(
        'group/menu relative',
        isRoot ? 'shrink-0' : 'w-full'
      )}
    >
      <div
        className={cn(
          'flex items-center',
          isRoot ? 'justify-center' : 'justify-between'
        )}
      >
        <a
          href={item.href}
          target={
            item.openInNewTab ? '_blank' : undefined
          }
          rel={
            item.openInNewTab
              ? 'noopener noreferrer'
              : undefined
          }
          onClick={e => { if (editing) { e.preventDefault(); onEdit?.(item.id) } else closeAll() }}
          className={cn(
            'flex min-w-0 items-center gap-1',
            'text-gold-light transition-colors',
            'hover:bg-gold/20 hover:text-gold focus:bg-gold/20 focus:text-gold',
            selected && 'bg-gold/25 text-gold outline outline-2 outline-offset-[-2px] outline-amber-400',
            'focus-visible:outline-2',
            'focus-visible:outline-gold',
            isRoot
              ? 'whitespace-nowrap rounded px-2 py-2 text-xs leading-[2] sm:text-sm lg:px-3 xl:text-[15px]'
              : 'flex-1 px-4 py-2 text-sm leading-[2]'
          )}
        >
          {first && (
            <Home
              className="size-4 shrink-0 text-gold"
              aria-hidden="true"
            />
          )}

          <span>{item.label}</span>
        </a>

        {hasChildren && (
          <button
            type="button"
            aria-label={`${item.label} ذیلی مینو`}
            aria-expanded={isExpanded}
            onClick={() => toggle(item.id)}
            className={cn(
              'flex shrink-0 items-center justify-center',
              'p-2 text-gold',
              'hover:bg-gold/10',
              'focus-visible:outline-2',
              'focus-visible:outline-gold',
              isRoot && 'lg:hidden'
            )}
          >
            {isRoot ? (
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            ) : (
              <ChevronLeft
                className={cn(
                  'size-3.5 transition-transform',
                  isExpanded && '-rotate-90'
                )}
              />
            )}
          </button>
        )}

        {hasChildren && isRoot && (
          <ChevronDown
            className="hidden size-3.5 shrink-0 text-gold transition-transform lg:block lg:group-hover/menu:rotate-180"
            aria-hidden="true"
          />
        )}
      </div>

      {hasChildren && (
        <ul
          className={cn(
            'gold-frame rounded-sm bg-black/95 py-1',
            'max-h-[75vh] overflow-y-auto',
            'shadow-[0_10px_30px_rgba(0,0,0,0.65)]',
            'lg:overflow-visible',
            'lg:absolute lg:z-[120]',
            isRoot
              ? 'lg:right-0 lg:top-full lg:min-w-56'
              : 'lg:right-full lg:top-0 lg:min-w-56',
            showChildren
              ? cn('absolute z-50 block min-w-48 visible opacity-100', isRoot ? 'right-0 top-full' : 'right-full top-0')
              : 'hidden' 
          )}
        >
          {children.map(child => (
            <MenuEntry
              key={child.id}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              closeAll={closeAll}
              editing={editing}
              onEdit={onEdit}
              selectedMenuId={selectedMenuId}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function MainNav() {
  const cms = useVisualCms()
  const [navItems, setNavItems] =
    useState<NavItem[]>(defaultNavItems)

  const [expanded, setExpanded] =
    useState<Set<string>>(new Set())

  useEffect(() => {
    cms?.initMenus(defaultNavItems)
  }, [cms?.authenticated])

  useEffect(() => {
    let active = true

    async function loadNavigation() {
      try {
        const response = await fetch(
          `${CMS_API}/public/navigation`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        )

        if (!response.ok) return

        const data = await response.json()

        if (
          active &&
          Array.isArray(data.items)
        ) {
          if (data.items.length >= 3) setNavItems(cleanNavItems(data.items))
        }
      } catch {
        // CMS navigation API may not be
        // installed yet. Preserve defaults.
      }
    }

    void loadNavigation()

    return () => {
      active = false
    }
  }, [])

  function toggle(id: string) {
    setExpanded(previous => {
      const next = new Set(previous)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  function closeAll() {
    setExpanded(new Set())
  }

  return (
    <nav
      aria-label="مرکزی مینو"
      dir="rtl"
      className="relative z-[110] px-2 md:px-4"
    >
      <div className="gold-frame-strong mx-auto max-w-7xl rounded-md bg-gradient-to-b from-[#1a1206] via-[#0b0904] to-[#1a1206]">
        <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 px-2 py-2">
          {(cms?.menus ?? navItems).filter(item => item.visible !== false).map((item, index) => (
            <MenuEntry
              key={item.id}
              item={item}
              depth={0}
              first={index === 0}
              expanded={expanded}
              toggle={toggle}
              closeAll={closeAll}
              editing={cms?.editing}
              onEdit={cms?.selectMenu}
            />
          ))}
        </ul>
      </div>
    </nav>
  )
}
