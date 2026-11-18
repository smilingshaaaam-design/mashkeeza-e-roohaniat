
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, Home } from 'lucide-react'
import { topics } from '@/lib/reading-topics'
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

const gmailCompose = 'https://mail.google.com/mail/u/0/?view=cm&fs=1&to=mashkeezaeroohaniat%40gmail.com'
const contactLinks: NavItem[] = [
  { id: 'contact-gmail', label: 'جی میل', href: gmailCompose, openInNewTab: true },
  { id: 'contact-whatsapp', label: 'واٹس ایپ', href: 'https://wa.me/393888288898', openInNewTab: true },
]

export const defaultNavItems: NavItem[] = [
  { id: 'home', label: 'صفحۂ اول', href: '/' },
  ...topics.map(topic => ({
    id: topic.id,
    label: topic.label,
    href: '/#topic-' + topic.id,
    children: [
      ...topic.readings.map(reading => ({ id: reading.slug, label: reading.title, href: '/reading/' + reading.slug })),
      ...(topic.id === 'ism-azam' ? [{ id: 'ism-calculator', label: 'اسمِ اعظم کیلکولیٹر', href: 'https://quran-analyzer.web.app/', openInNewTab: true }] : []),
    ],
  })),
  { id: 'contact', label: 'رابطہ کریں', href: '#contact', children: contactLinks },
]

// Upgrade the old anchor-based navigation, retaining real CMS page assignments.
export function upgradeTopicMenus(items: NavItem[]): NavItem[] {
  if (items.some(item => item.href.startsWith('/#topic-'))) return items
  if (!items.some(item => item.id === 'ism-azam' && item.href === '#ism-azam')) return items
  const upgraded = defaultNavItems.map(base => {
    const saved = items.find(item => item.id === base.id)
    if (!saved) return base
    if (base.id === 'contact' || base.id === 'home') return saved
    const linked = (saved.children ?? []).filter(child => !child.href.startsWith('#'))
    const cards = (base.children ?? []).map(card => linked.find(child => child.id === card.id) ?? card)
    return { ...base, visible: saved.visible, children: [...cards, ...linked.filter(child => !cards.some(card => card.id === child.id))] }
  })
  return [...upgraded, ...items.filter(item => item.id !== 'nawaz' && !upgraded.some(base => base.id === item.id))]
}

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
  dismissal: number
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
  dismissal,
  expanded,
  toggle,
  closeAll,
  editing = false,
  onEdit,
  selectedMenuId,
}: MenuEntryProps) {
  const isContact = depth === 0 && item.id === 'contact'
  // Older saved menus have an empty contact entry.
  const children = isContact && !item.children?.length ? contactLinks : item.children || []
  const hasChildren = children.length > 0 && !item.href.startsWith('/#topic-')
  const isExpanded = expanded.has(item.id)
  const isRoot = depth === 0
  const [hoverSession, setHoverSession] = useState<number | null>(null)
  const hovered = hoverSession === dismissal
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current)
  }, [])

  function enterMenu() {
    if (leaveTimer.current !== null) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    setHoverSession(dismissal)
  }

  function leaveMenu() {
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current)
    // Give the pointer time to cross from the parent to its dropdown.
    leaveTimer.current = setTimeout(() => {
      setHoverSession(null)
      leaveTimer.current = null
    }, 450)
  }
  const selected = editing && selectedMenuId === item.id
  const showChildren = hasChildren && (hovered || isExpanded || (editing && !!selectedMenuId && containsMenu(item, selectedMenuId)))

  return (
    <li
      onPointerEnter={e => { if (hasChildren && e.pointerType === 'mouse') enterMenu() }}
      onPointerLeave={e => { if (hasChildren && e.pointerType === 'mouse') leaveMenu() }}
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
          onClick={e => {
            if (editing) {
              e.preventDefault()
              onEdit?.(item.id)
            } else if (isContact && item.href === '#contact') {
              e.preventDefault()
              toggle(item.id)
            } else {
              if (item.href === gmailCompose && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) {
                e.preventDefault()
                window.location.href = 'mailto:mashkeezaeroohaniat@gmail.com'
              }
              closeAll()
            }
          }}
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
            aria-expanded={Boolean(showChildren)}
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
              : 'hidden',
            isContact && 'left-0 right-auto lg:left-0 lg:right-auto' 
          )}
        >
          {children.map(child => (
            <MenuEntry
              key={child.id}
              item={child}
              depth={depth + 1}
              dismissal={dismissal}
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

  const [activeHash, setActiveHash] = useState('')
  useEffect(() => {
    const syncTopic = () => setActiveHash(window.location.hash)
    syncTopic()
    window.addEventListener('hashchange', syncTopic)
    return () => window.removeEventListener('hashchange', syncTopic)
  }, [])
  const visibleItems = upgradeTopicMenus(cms?.menus ?? navItems).filter(item => item.visible !== false)
  const activeTopic = visibleItems.find(item => item.href.startsWith('/#topic-') && item.href.slice(1) === activeHash)

  const navRef = useRef<HTMLElement>(null)
  const [dismissal, setDismissal] = useState(0)
  const closeAll = useCallback(() => {
    setExpanded(new Set())
    // A pointer parked over a clicked link must re-enter to reopen its menu.
    setDismissal(value => value + 1)
  }, [])

  useEffect(() => {
    function dismissOutside(event: Event) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!navRef.current?.contains(target) || !target.closest('a, button')) closeAll()
    }
    document.addEventListener('click', dismissOutside, true)
    return () => document.removeEventListener('click', dismissOutside, true)
  }, [closeAll])

  return (
    <nav
      ref={navRef}
      aria-label="مرکزی مینو"
      dir="rtl"
      className="relative z-[110] px-2 md:px-4"
    >
      <div className="gold-frame-strong mx-auto max-w-7xl rounded-md bg-gradient-to-b from-[#1a1206] via-[#0b0904] to-[#1a1206]">
        <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 px-2 py-2">
          {visibleItems.map((item, index) => (
            <MenuEntry
              key={item.id}
              item={item}
              depth={0}
              first={index === 0}
              dismissal={dismissal}
              expanded={expanded}
              toggle={toggle}
              closeAll={closeAll}
              editing={cms?.editing}
              onEdit={cms?.selectMenu}
            />
          ))}
        </ul>
      </div>
      {activeTopic && (
        <section id={activeTopic.href.slice(2)} aria-label={activeTopic.label} className="mx-auto mt-4 max-w-7xl rounded-lg border border-amber-700/60 bg-black/90 p-5">
          <h2 className="gold-text mb-3 text-xl leading-loose">{activeTopic.label}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(activeTopic.children ?? []).filter(card => card.visible !== false).map(card => (
              <li key={card.id}>
                <a href={card.href} target={card.openInNewTab ? '_blank' : undefined} rel={card.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="gold-frame block rounded-lg px-4 py-3 text-gold-light leading-loose hover:bg-amber-900/30 focus-visible:outline-2 focus-visible:outline-amber-300">
                  {card.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </nav>
  )
}
