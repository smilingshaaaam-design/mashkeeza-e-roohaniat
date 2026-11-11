'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultNavItems } from '@/components/main-nav'

export const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
export type MenuItem = { id: string; label: string; href: string; visible?: boolean; openInNewTab?: boolean; children?: MenuItem[] }
export type CardStyle = { background?: string; border?: string; titleColor?: string; descriptionColor?: string; titleSize?: number; descriptionSize?: number; padding?: number; radius?: number; iconSize?: number }
export type CardItem = { id: string; title: string; description: string; image: string; href: string; card_group: 'primary' | 'secondary'; visible?: boolean; openInNewTab?: boolean }
export type SidebarLink = { id: string; title: string; href: string }
export type SidebarGroup = { id: string; title: string; links: SidebarLink[] }
type CmsContext = {
  editing: boolean; authenticated: boolean; menus: MenuItem[] | null; cards: CardItem[] | null; sidebar: SidebarGroup[] | null;
  setMenus: (v: MenuItem[]) => void; setCards: (v: CardItem[]) => void; setSidebar: (v: SidebarGroup[]) => void; initSidebar: (v: SidebarGroup[]) => void;
  initMenus: (v: MenuItem[]) => void; initCards: (v: CardItem[]) => void;
  cardStyles: Record<string, CardStyle>; selectedMenuId: string | null; selectMenu: (id: string) => void; selectCard: (id: string) => void;
}
const Context = createContext<CmsContext | null>(null)
export const useVisualCms = () => useContext(Context)
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const safeLink = (v: string) => v === '#' || (/^\/(?!\/)/.test(v)) || (/^#[^\s]+$/.test(v)) || (/^https?:\/\//i.test(v))
function validateMenus(items: MenuItem[]): boolean {
  const ids = new Set<string>()
  let total = 0
  function walk(list: MenuItem[], depth: number): boolean {
    if (depth > 25 || total > 600) return false
    for (const item of list) {
      total++
      if (!/^[\w-]{1,80}$/.test(item.id) || ids.has(item.id) || !item.label.trim() || item.label.length > 180 || !safeLink(item.href)) return false
      ids.add(item.id)
      if (!walk(item.children || [], depth + 1)) return false
    }
    return true
  }
  return walk(items, 0)
}
function validateSidebar(groups: SidebarGroup[] | null): boolean {
  return Array.isArray(groups) && groups.length <= 30 && groups.every(g => typeof g.title === 'string' && g.title.trim().length > 0 && g.title.length <= 150 && Array.isArray(g.links) && g.links.length <= 100 && g.links.every(l => typeof l.title === 'string' && l.title.trim().length > 0 && l.title.length <= 180 && typeof l.href === 'string' && safeLink(l.href)))
}
function findMenu(items: MenuItem[], id: string): MenuItem | undefined {
  for (const item of items) {
    if (item.id === id) return item
    const child = findMenu(item.children || [], id)
    if (child) return child
  }
}
function removeMenu(items: MenuItem[], id: string): MenuItem[] {
  return items.filter(item => item.id !== id).map(item => ({ ...item, children: removeMenu(item.children || [], id) }))
}
function newId() { return `cms-${crypto.randomUUID()}` }
async function api(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${CMS_API}${path}`, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export function VisualCmsProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [menus, setMenusState] = useState<MenuItem[] | null>(null)
  const [cards, setCardsState] = useState<CardItem[] | null>(null)
  const [sidebar, setSidebarState] = useState<SidebarGroup[] | null>(null)
  const [publishedSidebar, setPublishedSidebar] = useState<SidebarGroup[] | null>(null)
  const [designOther, setDesignOther] = useState<Record<string, unknown>>({})
  const [cardStyles, setCardStyles] = useState<Record<string, CardStyle>>({})
  const [publishedCardStyles, setPublishedCardStyles] = useState<Record<string, CardStyle>>({})
  const [selected, setSelected] = useState<{ type: 'menu' | 'card'; id: string } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<Array<{ menus: MenuItem[] | null; cards: CardItem[] | null; sidebar: SidebarGroup[] | null }>>([])
  const [preview, setPreview] = useState(false)
  const [publishedMenus, setPublishedMenus] = useState<MenuItem[] | null>(null)
  const [publishedCards, setPublishedCards] = useState<CardItem[] | null>(null)
  const [pageOptions, setPageOptions] = useState<Array<{id:string;title:string;slug:string}>>([])
  const [menuPanelOpen, setMenuPanelOpen] = useState(false)
  const [cardPanelOpen, setCardPanelOpen] = useState(false)
  const [cardSearch, setCardSearch] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [collapsedMenus, setCollapsedMenus] = useState<string[]>([])
  const [contentPanelOpen, setContentPanelOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [recoveryWarning, setRecoveryWarning] = useState(false)
  const [compactDraft, setCompactDraft] = useState<MenuItem[] | null>(null)

  // Pause decorative effects only while an authenticated editor is actively editing.
  // Preview and logout restore the visitor's normal experience.
  useEffect(() => {
    const active = editing && authenticated && !preview
    document.documentElement.classList.toggle('mashkeeza-editing', active)
    return () => document.documentElement.classList.remove('mashkeeza-editing')
  }, [editing, authenticated, preview])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('edit') !== '1') return
    setEditing(true)
    api('/auth/me').then(() => setAuthenticated(true)).catch(() => setAuthenticated(false))
  }, [])
  useEffect(() => {
    if (!editing || !authenticated) return
    Promise.all([api('/cms/navigation'), api('/cms/cards'), api('/cms/design')]).then(([nav, card, design]) => {
      const pubDesign = design.published?.settings?.published_appearance || {}
      const draftDesign = design.draft || pubDesign
      setPublishedCardStyles(pubDesign.cardStyles && typeof pubDesign.cardStyles === 'object' ? pubDesign.cardStyles : {})
      setDesignOther(draftDesign)
      setCardStyles(draftDesign.cardStyles && typeof draftDesign.cardStyles === 'object' ? draftDesign.cardStyles : {})
      if (Array.isArray(pubDesign.sidebar)) setPublishedSidebar(pubDesign.sidebar)
      setSidebarState(Array.isArray(draftDesign.sidebar) ? draftDesign.sidebar : [])
      setPublishedMenus(nav.published?.items?.length >= 3 ? nav.published.items : clone(defaultNavItems))
      setPublishedCards(card.published?.items?.length ? card.published.items : null)
      // Recover the original navigation if an accidental two-item CMS draft replaced it.
      // Never silently publish this recovery: the editor must explicitly save/publish.
      const candidate = Array.isArray(nav.draft?.items) ? nav.draft.items : nav.published?.items
      const looksAccidentallyTruncated = Array.isArray(candidate) && candidate.length < 3
      setRecoveryWarning(looksAccidentallyTruncated)
      setCompactDraft(looksAccidentallyTruncated ? clone(candidate) : null)
      setMenusState(looksAccidentallyTruncated ? clone(defaultNavItems) : Array.isArray(candidate) && candidate.length ? candidate : clone(defaultNavItems))
      if (card.draft?.items) setCardsState(card.draft.items)
      else if (card.published?.items?.length) setCardsState(card.published.items)
    }).catch(e => setMessage(e.message))
  }, [editing, authenticated])

  function snapshot() { setHistory(prev => [...prev.slice(-29), { menus: clone(menus), cards: clone(cards), sidebar: clone(sidebar) }]) }
  function setMenus(v: MenuItem[]) { snapshot(); setMenusState(v) }
  function setCards(v: CardItem[]) { snapshot(); setCardsState(v) }
  function setSidebar(v: SidebarGroup[]) { snapshot(); setSidebarState(v) }
  const activeMenus = preview ? publishedMenus : menus
  const activeCards = preview ? publishedCards : cards
  const activeSidebar = preview ? publishedSidebar : sidebar
  const ctx = useMemo<CmsContext>(() => ({ editing: editing && authenticated && !preview, authenticated, menus: activeMenus, cards: activeCards, sidebar: activeSidebar, setMenus, setCards, setSidebar, initSidebar: v => setSidebarState(prev => prev ?? v), initMenus: v => setMenusState(prev => prev && prev.length >= 3 ? prev : clone(v)), initCards: v => setCardsState(prev => prev ?? v), cardStyles: preview ? publishedCardStyles : cardStyles, selectedMenuId: selected?.type === 'menu' ? selected.id : null, selectMenu: id => setSelected({ type: 'menu', id }), selectCard: id => setSelected({ type: 'card', id }) }), [editing, authenticated, preview, activeMenus, activeCards, activeSidebar, history, selected, cardStyles, publishedCardStyles])

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try { await api('/auth/login', 'POST', { email: loginEmail, password: loginPassword }); setAuthenticated(true); setLoginPassword('') }
    catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  async function save() {
    if (!menus || !cards) { setMessage('Pehle menu aur cards load honay dein.'); return }
    if (!validateMenus(menus)) { setMessage('Menu mein invalid ya duplicate ID/link hai.'); return }
    if (!validateSidebar(sidebar)) { setMessage('Sidebar ke title ya links invalid hain.'); return }
    setBusy(true); setMessage('')
    try { await api('/cms/navigation/draft', 'PUT', { items: menus }); await api('/cms/cards/draft', 'PUT', { items: cards }); await api('/cms/design/draft', 'PUT', { ...designOther, cardStyles, sidebar }); setMessage('Draft save ho gaya.') }
    catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  async function publish() {
    if (!menus || !cards || !window.confirm('Menus aur cards ko public website par publish karna hai?')) return
    if (!validateMenus(menus) || !validateSidebar(sidebar)) { setMessage('Menu ya sidebar validation fail hui.'); return }
    setBusy(true); setMessage('')
    try {
      await api('/cms/navigation/draft', 'PUT', { items: menus }); await api('/cms/cards/draft', 'PUT', { items: cards }); await api('/cms/design/draft', 'PUT', { ...designOther, cardStyles, sidebar })
      await api('/cms/navigation/publish', 'POST'); await api('/cms/cards/publish', 'POST'); await api('/cms/design/publish', 'POST')
      setPublishedMenus(clone(menus)); setPublishedCards(clone(cards)); setPublishedSidebar(clone(sidebar)); setPublishedCardStyles(clone(cardStyles)); setMessage('Published. Visitors ko refresh par changes nazar aayenge.')
    } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  function changeMenu(id: string, patch: Partial<MenuItem>) {
    if (!menus) return
    const next = clone(menus); const item = findMenu(next, id)
    if (item) { Object.assign(item, patch); setMenus(next) }
  }
  function addMenu(parent?: string) {
    const next = clone(menus || []); const item: MenuItem = { id: newId(), label: 'نیا مینیو', href: '#', children: [] }
    if (parent) { const p = findMenu(next, parent); if (!p) return; p.children = [...(p.children || []), item] }
    else next.push(item)
    setMenus(next); setSelected({ type: 'menu', id: item.id })
  }
  function duplicateMenu(id: string) {
    if (!menus) return
    const next = clone(menus)
    const original = findMenu(next, id)
    if (!original) return
    function copyWithNewIds(item: MenuItem): MenuItem {
      return { ...item, id: newId(), label: item.label + ' (copy)', children: (item.children || []).map(copyWithNewIds) }
    }
    const copy = copyWithNewIds(original)
    function insertAfter(list: MenuItem[]): boolean {
      const index = list.findIndex(item => item.id === id)
      if (index >= 0) { list.splice(index + 1, 0, copy); return true }
      return list.some(item => insertAfter(item.children || []))
    }
    if (insertAfter(next)) { setMenus(next); setSelected({ type: 'menu', id: copy.id }) }
  }
  function toggleMenuCollapsed(id: string) {
    setCollapsedMenus(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function moveMenu(id: string, direction: -1 | 1) {
    const next = clone(menus || [])
    function move(list: MenuItem[]): boolean {
      const index = list.findIndex(x => x.id === id)
      if (index >= 0) { const target = index + direction; if (target >= 0 && target < list.length) [list[index], list[target]] = [list[target], list[index]]; return true }
      return list.some(x => move(x.children || []))
    }
    move(next); setMenus(next)
  }
  // Move a whole subtree, never allowing an item to become its own descendant.
  // Native HTML drag/drop is supported alongside keyboard-accessible move buttons.
  function relocateMenu(sourceId: string, targetId: string | null, placement: 'before' | 'after' | 'inside' = 'inside') {
    if (!menus || sourceId === targetId) return
    const next = clone(menus)
    const source = findMenu(next, sourceId)
    if (!source || (targetId && findMenu(source.children || [], targetId))) return
    let detached: MenuItem | undefined
    function detach(list: MenuItem[]): boolean {
      const index = list.findIndex(item => item.id === sourceId)
      if (index >= 0) { detached = list.splice(index, 1)[0]; return true }
      return list.some(item => detach(item.children || []))
    }
    detach(next)
    if (!detached) return
    if (!targetId) next.push(detached)
    else if (placement === 'inside') {
      const parent = findMenu(next, targetId)
      if (!parent) return
      parent.children = [...(parent.children || []), detached]
    } else {
      function insert(list: MenuItem[]): boolean {
        const index = list.findIndex(item => item.id === targetId)
        if (index >= 0) { list.splice(index + (placement === 'after' ? 1 : 0), 0, detached!); return true }
        return list.some(item => insert(item.children || []))
      }
      if (!insert(next)) return
    }
    setMenus(next)
    setSelected({type:'menu',id:sourceId})
  }
  useEffect(() => {
    if (!editing || !authenticated) return
    const controller = new AbortController()
    fetch(`${CMS_API}/public/content`, {signal:controller.signal,cache:'no-store'})
      .then(r => r.ok ? r.json() : {items:[]})
      .then(data => { if (!controller.signal.aborted) setPageOptions(
        (Array.isArray(data.items) ? data.items : []).filter((x: any) => x.content_type === 'page' && typeof x.slug === 'string' && typeof x.title === 'string')
      ) })
      .catch(() => {})
    return () => controller.abort()
  }, [editing,authenticated])
  function menuTree(items: MenuItem[], depth = 0): React.ReactNode {
    const search = menuSearch.trim().toLocaleLowerCase()
    return items.filter(item => !search || item.label.toLocaleLowerCase().includes(search) || item.href.toLocaleLowerCase().includes(search) || hasMenuMatch(item.children || [], search)).map(item => {
      const hasChildren = !!item.children?.length
      const collapsed = !search && collapsedMenus.includes(item.id)
      return <div key={item.id} className="mb-1" style={{paddingLeft:Math.min(depth,8)*14}}>
        <div draggable={!search} onDragStart={e => { e.dataTransfer.setData('text/plain',item.id); e.dataTransfer.effectAllowed='move'; setDragId(item.id) }}
          onDragEnd={() => setDragId(null)} onDragOver={e => {if (!search) e.preventDefault()}}
          onDrop={e => {e.preventDefault(); if (search) return; const id=e.dataTransfer.getData('text/plain') || dragId; if(id) relocateMenu(id,item.id,e.shiftKey ? 'inside' : 'after');setDragId(null)}}
          className={`flex items-center gap-1 rounded border p-1 ${selected?.id===item.id?'border-amber-400 bg-amber-900/60':'border-amber-800/60 bg-[#21190f]'}`}>
          <button type="button" aria-label={collapsed ? 'Expand submenu' : 'Collapse submenu'} disabled={!hasChildren} className="w-5 disabled:opacity-30" onClick={() => toggleMenuCollapsed(item.id)}>{collapsed ? '▸' : '▾'}</button>
          <span title="Drag to reorder; hold Shift to nest" className="cursor-grab select-none text-amber-400">⠿</span>
          <button type="button" className="min-w-0 flex-1 truncate text-left text-amber-100" onClick={() => setSelected({type:'menu',id:item.id})}>{item.label}</button>
          <button type="button" title="Move up" onClick={() => moveMenu(item.id,-1)}>↑</button>
          <button type="button" title="Move down" onClick={() => moveMenu(item.id,1)}>↓</button>
          <button type="button" title="Make root menu" onClick={() => relocateMenu(item.id,null)}>↖</button>
          <button type="button" title="Add submenu" onClick={() => addMenu(item.id)}>＋</button>
        </div>
        {!collapsed && menuTree(item.children || [],depth+1)}
      </div>
    })
  }
  function hasMenuMatch(items: MenuItem[], search: string): boolean {
    return items.some(item => item.label.toLocaleLowerCase().includes(search) || item.href.toLocaleLowerCase().includes(search) || hasMenuMatch(item.children || [], search))
  }
  function changeCardStyle(id: string, patch: Partial<CardStyle>) {
    setCardStyles(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }
  function resetCardStyle(id: string) { setCardStyles(prev => { const next = { ...prev }; delete next[id]; return next }) }
  function changeCard(id: string, patch: Partial<CardItem>) {
    if (!cards) return
    setCards(cards.map(card => card.id === id ? { ...card, ...patch } : card))
  }
  function moveCard(id: string, direction: -1 | 1) {
    if (!cards) return
    const next = clone(cards)
    const current = next.findIndex(x => x.id === id)
    if (current < 0) return
    const group = next[current].card_group
    const peers = next.map((x, i) => x.card_group === group ? i : -1).filter(i => i >= 0)
    const position = peers.indexOf(current)
    const target = peers[position + direction]
    if (target === undefined) return
    ;[next[current], next[target]] = [next[target], next[current]]
    setCards(next)
  }
  function duplicateCard(id: string) {
    if (!cards) return
    const index = cards.findIndex(x => x.id === id)
    if (index < 0) return
    const item = { ...clone(cards[index]), id: newId(), title: cards[index].title + ' — Copy' }
    const next = clone(cards)
    next.splice(index + 1, 0, item)
    setCards(next)
    if (cardStyles[id]) setCardStyles(prev => ({ ...prev, [item.id]: { ...prev[id] } }))
    setSelected({ type: 'card', id: item.id })
  }
  function moveCardToGroup(id: string, group: 'primary' | 'secondary') {
    if (!cards) return
    const next = clone(cards)
    const index = next.findIndex(x => x.id === id)
    if (index < 0) return
    const [item] = next.splice(index, 1)
    item.card_group = group
    const last = next.reduce((n, x, i) => x.card_group === group ? i : n, -1)
    next.splice(last + 1, 0, item)
    setCards(next)
  }
  const menu = selected?.type === 'menu' ? findMenu(menus || [], selected.id) : undefined
  const card = selected?.type === 'card' ? cards?.find(c => c.id === selected.id) : undefined
  const cardStyle = card ? (cardStyles[card.id] || {}) : {}
  const colorControl = (label: string, key: keyof CardStyle, fallback: string) => <label className="flex items-center justify-between gap-2 text-sm text-amber-200">{label}<input aria-label={label} type="color" className="h-9 w-14 rounded border border-amber-700 bg-black p-1" value={String(cardStyle[key] || fallback)} onChange={e => card && changeCardStyle(card.id, { [key]: e.target.value })}/></label>
  const rangeControl = (label: string, key: keyof CardStyle, min: number, max: number, fallback: number) => <label className="flex flex-col gap-1 text-sm text-amber-200"><span>{label}: {Number(cardStyle[key] ?? fallback)}px</span><input aria-label={label} type="range" min={min} max={max} value={Number(cardStyle[key] ?? fallback)} onChange={e => card && changeCardStyle(card.id, { [key]: Number(e.target.value) })}/></label>
  const field = (label: string, value: string, update: (v: string) => void) => <label className="flex flex-col gap-1 text-sm text-amber-200">{label}<input dir="auto" className="rounded border border-amber-700 bg-black p-2 text-white" value={value} onChange={e => update(e.target.value)} /></label>
  return <Context.Provider value={ctx}>
    {children}
    <style>{`html.mashkeeza-editing *, html.mashkeeza-editing *::before, html.mashkeeza-editing *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
      cursor: auto !important;
    }
    html.mashkeeza-editing a, html.mashkeeza-editing button, html.mashkeeza-editing [role="button"] { cursor: pointer !important; }
    html.mashkeeza-editing input, html.mashkeeza-editing textarea, html.mashkeeza-editing [contenteditable="true"] { cursor: text !important; }
    html.mashkeeza-editing canvas, html.mashkeeza-editing video { visibility: hidden !important; }
    html.mashkeeza-editing, html.mashkeeza-editing body { cursor: default !important; }
    html.mashkeeza-editing body { padding-top: 58px; }
    html.mashkeeza-editing { scroll-behavior: auto !important; }
    `}</style>
    {editing && !authenticated && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" dir="ltr"><form onSubmit={login} className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-amber-600 bg-[#130e07] p-6 text-amber-100"><strong>مشکیزہ روحانیت — Editor Login</strong><input required type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="rounded bg-white p-2 text-black"/><input required type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="rounded bg-white p-2 text-black"/><button disabled={busy} className="rounded bg-amber-600 p-2 font-bold text-black">Login</button>{message && <p role="alert">{message}</p>}<button type="button" onClick={() => { setEditing(false); window.history.replaceState({}, '', window.location.pathname) }}>Cancel</button></form></div>}
    {editing && authenticated && <>
      <div className="fixed inset-x-0 top-0 z-[9998] flex min-h-14 flex-wrap items-center justify-center gap-2 border-b border-amber-700 bg-[#110d09]/95 px-3 py-2 text-xs text-amber-100 shadow-2xl" dir="ltr">
        <strong>مشکیزہ • Visual Builder</strong>
        <button type="button" aria-expanded={contentPanelOpen} aria-controls="mashkeeza-content-panel" className="rounded border border-amber-600 px-2 py-1" onClick={() => setContentPanelOpen(v => !v)}>Content Management</button>
        <button className="rounded border border-amber-600 px-2 py-1" onClick={() => setMenuPanelOpen(!menuPanelOpen)}>{menuPanelOpen ? 'Hide menu tree' : 'Menu builder'}</button>
        <button type="button" className="rounded border border-amber-600 px-2 py-1" onClick={() => setCardPanelOpen(v => !v)}>{cardPanelOpen ? 'Hide cards' : 'Cards builder'}</button>
        <button className="rounded border border-amber-600 px-2 py-1" onClick={() => setPreview(!preview)}>{preview ? 'Edit mode' : 'Preview published'}</button>
        {!preview && <><button className="rounded border border-amber-600 px-2 py-1" onClick={() => addMenu()}>+ Menu</button><button className="rounded border border-amber-600 px-2 py-1" onClick={() => { const next = [...(cards || []), { id: newId(), title: 'نیا کارڈ', description: '', image: '/images/icon-scroll.png', href: '#', card_group: 'primary' as const }]; setCards(next); setSelected({ type: 'card', id: next[next.length - 1].id }) }}>+ Card</button><button disabled={!history.length} className="rounded border border-amber-600 px-2 py-1 disabled:opacity-40" onClick={() => { const old = history[history.length - 1]; if (old) { setMenusState(old.menus); setCardsState(old.cards); setSidebarState(old.sidebar); setHistory(history.slice(0, -1)) } }}>Undo</button><button disabled={busy} className="rounded bg-amber-700 px-2 py-1" onClick={save}>Save draft</button><button disabled={busy} className="rounded bg-amber-500 px-2 py-1 font-bold text-black" onClick={publish}>Publish</button></>}
        <button className="rounded border border-amber-600 px-2 py-1" onClick={async () => { try { await api('/auth/logout', 'POST') } catch {} window.location.assign(window.location.pathname) }}>Logout</button>
        {message && <span role="status" className="w-full text-center">{message}</span>}
      </div>
      {contentPanelOpen && <section id="mashkeeza-content-panel" aria-label="Content Management" className="fixed right-3 top-20 z-[9999] w-[min(360px,calc(100vw-24px))] rounded-xl border border-amber-600 bg-[#150f0a] p-4 text-amber-100 shadow-2xl" dir="ltr">
        <div className="mb-3 flex items-center justify-between"><strong>Content Management</strong><button type="button" aria-label="Close Content Management" onClick={() => setContentPanelOpen(false)}>✕</button></div>
        <p className="mb-3 text-xs text-amber-200">Articles aur Pages ki existing settings Admin Panel mein hi rahengi. Link nayi tab mein khulega aur login ke baad relevant Articles ya Pages section khul jayega.</p>
        <a href="https://mashkeeza-admin.pages.dev/?section=articles" target="_blank" rel="noopener noreferrer" className="mb-2 flex items-center justify-between rounded-lg border border-amber-700 px-3 py-3 hover:bg-amber-900/40"><span>📚 مضامین — Manage Articles</span><span aria-hidden="true">↗</span></a>
        <a href="https://mashkeeza-admin.pages.dev/?section=pages" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-amber-700 px-3 py-3 hover:bg-amber-900/40"><span>📄 صفحات — Manage Pages</span><span aria-hidden="true">↗</span></a>
        <p className="mt-3 text-xs text-amber-300">Admin Panel login ke baad relevant section automatically select karega. Public website ke changes sirf Publish karne par live honge.</p>
      </section>}
      {!preview && recoveryWarning && <div role="alert" className="fixed top-16 left-1/2 z-[9998] w-[min(560px,94vw)] -translate-x-1/2 rounded-lg border border-amber-500 bg-[#201407] p-3 text-sm text-amber-100 shadow-xl" dir="ltr">
        CMS mein sirf 1–2 menu items mile. Safety ke liye original menu structure editor mein restore kiya gaya hai; abhi public site par kuch publish nahi hua.
        <div className="mt-2 flex flex-wrap gap-2"><button className="rounded border border-amber-500 px-2 py-1" onClick={() => setRecoveryWarning(false)}>Continue with original menus</button>
        {compactDraft && <button className="rounded border border-amber-700 px-2 py-1" onClick={() => { if(window.confirm('Sirf chhota saved draft load karna hai? Original menus editor mein hide ho jayenge.')) { setMenus(compactDraft); setRecoveryWarning(false); setMessage('Small draft loaded. Publish carefully.') } }}>Load 2-item draft instead</button>}</div>
      </div>}
      {!preview && menuPanelOpen && <aside className="fixed left-0 top-14 bottom-0 z-[9997] flex w-[min(340px,94vw)] flex-col rounded-r-xl border border-amber-600 bg-black/95 p-3 text-xs text-amber-100 shadow-2xl" dir="ltr">
        <div className="mb-2 flex items-center justify-between"><strong>Visual Menu Structure</strong><button onClick={() => setMenuPanelOpen(false)}>✕</button></div>
        <p className="mb-2 text-amber-200">Drag onto a row to move after it. Hold Shift while dropping to make it a submenu. Select a row to edit its label and page link.</p>
        <input aria-label="Search menus" placeholder="Search menu label or URL..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} className="mb-2 w-full rounded border border-amber-700 bg-[#21190f] p-2 text-amber-100" />
        <div className="mb-2 flex gap-2"><button className="rounded border border-amber-700 px-2 py-1" onClick={() => setCollapsedMenus([])}>Expand all</button><button className="rounded border border-amber-700 px-2 py-1" onClick={() => setCollapsedMenus((menus || []).flatMap(function collect(item): string[] { return [item.id, ...(item.children || []).flatMap(collect)] }))}>Collapse all</button>{menuSearch && <button className="rounded border border-amber-700 px-2 py-1" onClick={() => setMenuSearch('')}>Clear search</button>}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">{menuTree(menus || [])}</div>
        <div className="mt-2 flex gap-2"><button className="rounded border border-amber-600 p-2" onClick={() => addMenu()}>+ Main menu</button><button className="rounded border border-amber-600 p-2" onClick={() => {if(selected?.type==='menu')addMenu(selected.id)}}>+ Submenu</button></div>
      </aside>}
      {!preview && cardPanelOpen && <aside className="fixed left-0 top-14 bottom-0 z-[9997] flex w-[min(360px,94vw)] flex-col rounded-r-xl border border-amber-600 bg-black/95 p-3 text-xs text-amber-100 shadow-2xl" dir="ltr">
        <div className="mb-2 flex items-center justify-between"><strong>Advanced Cards Builder</strong><button type="button" onClick={() => setCardPanelOpen(false)}>✕</button></div>
        <p className="mb-2 text-amber-200">Card select karein. ↑ ↓ se usi group mein order change karein. Group edit karne ke liye right panel kholein.</p>
        <input aria-label="Search cards" placeholder="Search card title..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} className="mb-3 w-full rounded border border-amber-700 bg-[#21190f] p-2 text-amber-100" />
        <div className="min-h-0 flex-1 overflow-y-auto space-y-3">{(['primary', 'secondary'] as const).map(group => <section key={group}>
          <h3 className="mb-2 font-bold text-amber-300">{group === 'primary' ? 'Primary cards' : 'Secondary cards'}</h3>
          {(cards || []).filter(item => item.card_group === group && item.title.toLocaleLowerCase().includes(cardSearch.trim().toLocaleLowerCase())).map(item => <div key={item.id} className={`mb-1 flex items-center gap-1 rounded border p-2 ${selected?.type === 'card' && selected.id === item.id ? 'border-amber-400 bg-amber-900/60' : 'border-amber-800/60 bg-[#21190f]'}`}>
            <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelected({ type: 'card', id: item.id })}>{item.title}{item.visible === false ? ' (hidden)' : ''}</button>
            <button type="button" title="Move card up" onClick={() => moveCard(item.id, -1)}>↑</button>
            <button type="button" title="Move card down" onClick={() => moveCard(item.id, 1)}>↓</button>
            <button type="button" title="Duplicate card" onClick={() => duplicateCard(item.id)}>⧉</button>
          </div>)}
        </section>)}</div>
        <button type="button" className="mt-3 rounded border border-amber-600 p-2" onClick={() => { const next = [...(cards || []), { id: newId(), title: 'نیا کارڈ', description: '', image: '/images/icon-scroll.png', href: '#', card_group: 'primary' as const }]; setCards(next); setSelected({type:'card',id:next[next.length-1].id}) }}>+ Add card</button>
      </aside>}
      {!preview && (menu || card) && <aside className="fixed right-0 top-14 bottom-0 z-[9997] flex w-[min(340px,94vw)] flex-col gap-3 overflow-auto rounded-xl border border-amber-600 bg-black/95 p-4 text-amber-100 shadow-2xl" dir="ltr"><div className="flex justify-between"><strong>{menu ? 'Edit Menu' : 'Edit Card'}</strong><button onClick={() => setSelected(null)}>✕</button></div>
        {menu && <>{field('Label', menu.label, v => changeMenu(menu.id, { label: v }))}{field('Link / URL', menu.href, v => changeMenu(menu.id, { href: v }))}<label className="flex flex-col gap-1 text-sm text-amber-200">Link to published Page<select className="rounded border border-amber-700 bg-black p-2 text-white" value={pageOptions.find(p => menu.href === `/pages/?slug=${encodeURIComponent(p.slug)}`)?.id || ''} onChange={e => {const page=pageOptions.find(p => p.id===e.target.value);if(page)changeMenu(menu.id,{href:`/pages/?slug=${encodeURIComponent(page.slug)}`,openInNewTab:false})}}><option value="">Select published Page...</option>{pageOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label><input type="checkbox" checked={menu.visible !== false} onChange={e => changeMenu(menu.id, { visible: e.target.checked })}/> Visible</label><label><input type="checkbox" checked={!!menu.openInNewTab} onChange={e => changeMenu(menu.id, { openInNewTab: e.target.checked })}/> Open in new tab</label><div className="flex flex-wrap gap-2"><button onClick={() => addMenu(menu.id)}>+ Submenu</button><button onClick={() => moveMenu(menu.id, -1)}>↑</button><button onClick={() => moveMenu(menu.id, 1)}>↓</button><button onClick={() => duplicateMenu(menu.id)}>Duplicate</button><button onClick={() => relocateMenu(menu.id, null)}>Move to root</button><button className="text-red-300" onClick={() => { if (window.confirm('Delete menu and its submenus?')) { setMenus(removeMenu(menus || [], menu.id)); setSelected(null) } }}>Delete</button></div></>}
        {card && <>{field('Title', card.title, v => changeCard(card.id, { title: v }))}{field('Description', card.description, v => changeCard(card.id, { description: v }))}{field('Image URL', card.image, v => changeCard(card.id, { image: v }))}{field('Link / URL', card.href, v => changeCard(card.id, { href: v }))}<label className="flex flex-col gap-1 text-sm text-amber-200">Link to published Page<select className="rounded border border-amber-700 bg-black p-2 text-white" value={pageOptions.find(p => card.href === `/pages/?slug=${encodeURIComponent(p.slug)}`)?.id || ''} onChange={e => { const page = pageOptions.find(p => p.id === e.target.value); if (page) changeCard(card.id, { href: `/pages/?slug=${encodeURIComponent(page.slug)}`, openInNewTab: false }) }}><option value="">Select published Page...</option>{pageOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Group <select className="bg-black" value={card.card_group} onChange={e => moveCardToGroup(card.id, e.target.value as 'primary' | 'secondary')}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label><label><input type="checkbox" checked={card.visible !== false} onChange={e => changeCard(card.id, { visible: e.target.checked })}/> Visible</label><label><input type="checkbox" checked={!!card.openInNewTab} onChange={e => changeCard(card.id, { openInNewTab: e.target.checked })}/> New tab</label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => moveCard(card.id, -1)}>↑ Move up</button><button type="button" onClick={() => moveCard(card.id, 1)}>↓ Move down</button><button type="button" onClick={() => duplicateCard(card.id)}>Duplicate</button></div><div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-700/70 p-3"><strong className="text-amber-300">Card Design — Live Preview</strong>{colorControl('Background', 'background', '#120c03')}{colorControl('Border', 'border', '#f5c25b')}{colorControl('Title color', 'titleColor', '#f5c25b')}{colorControl('Description color', 'descriptionColor', '#f5dfac')}{rangeControl('Title size', 'titleSize', 12, 36, 20)}{rangeControl('Description size', 'descriptionSize', 10, 24, 12)}{rangeControl('Padding', 'padding', 4, 48, 20)}{rangeControl('Border radius', 'radius', 0, 60, 40)}{rangeControl('Icon size', 'iconSize', 32, 160, 96)}<button type="button" className="rounded border border-amber-600 p-2" onClick={() => resetCardStyle(card.id)}>Restore original design</button><p className="text-xs text-amber-300">Upar Save draft / Publish se design bhi save hoga.</p></div><button className="text-red-300" onClick={() => { if (window.confirm('Delete card?')) { setCards((cards || []).filter(c => c.id !== card.id)); setSelected(null) } }}>Delete card</button></>}
      </aside>}
    </>}
  </Context.Provider>
}
