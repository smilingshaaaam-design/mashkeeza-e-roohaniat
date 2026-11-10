'use client'

import { useEffect, useState } from 'react'
import { CMS_API, useVisualCms, type SidebarGroup, type SidebarLink } from '@/components/visual-cms'

const defaults: SidebarGroup[] = [
  { id: 'quick', title: 'فوری روابط', links: [{ id: 'calculator', title: 'اسم اعظم کیلکولیٹر', href: 'https://quran-analyzer.web.app/' }] },
  { id: 'posts', title: 'مضامین', links: [] },
  { id: 'software', title: 'آن لائن سافٹ ویئر', links: [] },
]
const allowed = (url: string) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) || /^#[^\s]+$/.test(url)

export function RightSidebar() {
  const cms = useVisualCms()
  const [published, setPublished] = useState<SidebarGroup[] | null>(null)
  useEffect(() => { cms?.initSidebar(defaults) }, [cms?.authenticated])
  useEffect(() => {
    let active = true
    fetch(`${CMS_API}/public/design`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => {
      const value = data?.settings?.published_appearance?.sidebar
      if (active && Array.isArray(value)) setPublished(value)
    }).catch(() => {})
    return () => { active = false }
  }, [])
  const groups = cms?.sidebar ?? published ?? defaults
  const editing = cms?.editing === true
  const change = (value: SidebarGroup[]) => cms?.setSidebar(value)
  function addGroup() {
    const title = window.prompt('Naye section ka title', 'نیا سیکشن')
    if (!title?.trim()) return
    change([...groups, { id: crypto.randomUUID(), title: title.trim(), links: [] }])
  }
  function editGroup(group: SidebarGroup) {
    const title = window.prompt('Section ka title', group.title)
    if (!title?.trim()) return
    change(groups.map(g => g.id === group.id ? { ...g, title: title.trim() } : g))
  }
  function deleteGroup(group: SidebarGroup) {
    if (window.confirm(`Delete section: ${group.title}?`)) change(groups.filter(g => g.id !== group.id))
  }
  function addLink(group: SidebarGroup) {
    const title = window.prompt('Link ka naam', 'نیا رابطہ')
    if (!title?.trim()) return
    const href = window.prompt('Link URL (https://... ya /page)', '#')
    if (href === null) return
    if (!allowed(href)) { window.alert('Invalid URL. https://, /page ya #anchor istemal karein.'); return }
    const link: SidebarLink = { id: crypto.randomUUID(), title: title.trim(), href }
    change(groups.map(g => g.id === group.id ? { ...g, links: [...g.links, link] } : g))
  }
  function editLink(group: SidebarGroup, link: SidebarLink) {
    const title = window.prompt('Link ka naam', link.title)
    if (!title?.trim()) return
    const href = window.prompt('Link URL', link.href)
    if (href === null) return
    if (!allowed(href)) { window.alert('Invalid URL'); return }
    change(groups.map(g => g.id === group.id ? { ...g, links: g.links.map(l => l.id === link.id ? { ...l, title: title.trim(), href } : l) } : g))
  }
  function deleteLink(group: SidebarGroup, link: SidebarLink) {
    if (!window.confirm(`Delete link: ${link.title}?`)) return
    change(groups.map(g => g.id === group.id ? { ...g, links: g.links.filter(l => l.id !== link.id) } : g))
  }
  function moveLink(group: SidebarGroup, link: SidebarLink, direction: -1 | 1) {
    const links = [...group.links], i = links.findIndex(l => l.id === link.id), j = i + direction
    if (j < 0 || j >= links.length) return
    ;[links[i], links[j]] = [links[j], links[i]]
    change(groups.map(g => g.id === group.id ? { ...g, links } : g))
  }
  return <aside dir="rtl" aria-label="فوری روابط اور سافٹ ویئر" className="min-w-0 space-y-5">
    {groups.map(group => <section key={group.id} className="gold-frame rounded-xl bg-[#100d09]/95 p-4 shadow-[0_0_18px_rgba(245,194,91,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-amber-500/30 pb-2">
        <h2 className="gold-text text-lg leading-[2] font-bold">{group.title}</h2>
        {editing && <div className="flex gap-1" dir="ltr"><button type="button" title="Edit section" onClick={() => editGroup(group)} className="text-amber-300">✎</button><button type="button" title="Delete section" onClick={() => deleteGroup(group)} className="text-red-300">×</button></div>}
      </div>
      <ul className="space-y-2">
        {group.links.map(link => <li key={link.id} className="flex items-center gap-2 rounded-md border border-amber-500/10 bg-black/30 px-2 py-2">
          <a href={allowed(link.href) ? link.href : '#'} onClick={e => { if (editing) { e.preventDefault(); editLink(group, link) } }} className="min-w-0 flex-1 break-words text-sm leading-[2] text-amber-100 hover:text-gold">{link.title}</a>
          {editing && <div className="flex shrink-0 gap-1 text-xs" dir="ltr"><button type="button" title="Move up" onClick={() => moveLink(group, link, -1)}>↑</button><button type="button" title="Move down" onClick={() => moveLink(group, link, 1)}>↓</button><button type="button" title="Edit" onClick={() => editLink(group, link)}>✎</button><button type="button" title="Delete" onClick={() => deleteLink(group, link)} className="text-red-300">×</button></div>}
        </li>)}
      </ul>
      {editing && <button type="button" onClick={() => addLink(group)} className="mt-3 w-full rounded-md border border-dashed border-amber-500/60 py-2 text-amber-200">+ Link</button>}
    </section>)}
    {editing && <button type="button" onClick={addGroup} className="w-full rounded-lg border border-dashed border-amber-500 p-3 text-amber-200">+ نیا سیکشن</button>}
  </aside>
}
