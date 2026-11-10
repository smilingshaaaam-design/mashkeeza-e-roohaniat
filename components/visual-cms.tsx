'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
export type MenuItem = { id: string; label: string; href: string; visible?: boolean; openInNewTab?: boolean; children?: MenuItem[] }
export type CardItem = { id: string; title: string; description: string; image: string; href: string; card_group: 'primary' | 'secondary'; visible?: boolean; openInNewTab?: boolean }
type CmsContext = {
  editing: boolean; authenticated: boolean; menus: MenuItem[] | null; cards: CardItem[] | null;
  setMenus: (v: MenuItem[]) => void; setCards: (v: CardItem[]) => void;
  initMenus: (v: MenuItem[]) => void; initCards: (v: CardItem[]) => void;
  selectMenu: (id: string) => void; selectCard: (id: string) => void;
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
  const [selected, setSelected] = useState<{ type: 'menu' | 'card'; id: string } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<Array<{ menus: MenuItem[] | null; cards: CardItem[] | null }>>([])
  const [preview, setPreview] = useState(false)
  const [publishedMenus, setPublishedMenus] = useState<MenuItem[] | null>(null)
  const [publishedCards, setPublishedCards] = useState<CardItem[] | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('edit') !== '1') return
    setEditing(true)
    api('/auth/me').then(() => setAuthenticated(true)).catch(() => setAuthenticated(false))
  }, [])
  useEffect(() => {
    if (!editing || !authenticated) return
    Promise.all([api('/cms/navigation'), api('/cms/cards')]).then(([nav, card]) => {
      setPublishedMenus(nav.published?.items?.length ? nav.published.items : null)
      setPublishedCards(card.published?.items?.length ? card.published.items : null)
      if (nav.draft?.items) setMenusState(nav.draft.items)
      else if (nav.published?.items?.length) setMenusState(nav.published.items)
      if (card.draft?.items) setCardsState(card.draft.items)
      else if (card.published?.items?.length) setCardsState(card.published.items)
    }).catch(e => setMessage(e.message))
  }, [editing, authenticated])

  function snapshot() { setHistory(prev => [...prev.slice(-29), { menus: clone(menus), cards: clone(cards) }]) }
  function setMenus(v: MenuItem[]) { snapshot(); setMenusState(v) }
  function setCards(v: CardItem[]) { snapshot(); setCardsState(v) }
  const activeMenus = preview ? publishedMenus : menus
  const activeCards = preview ? publishedCards : cards
  const ctx = useMemo<CmsContext>(() => ({ editing: editing && authenticated && !preview, authenticated, menus: activeMenus, cards: activeCards, setMenus, setCards, initMenus: v => setMenusState(prev => prev ?? v), initCards: v => setCardsState(prev => prev ?? v), selectMenu: id => setSelected({ type: 'menu', id }), selectCard: id => setSelected({ type: 'card', id }) }), [editing, authenticated, preview, activeMenus, activeCards, history])

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try { await api('/auth/login', 'POST', { email: loginEmail, password: loginPassword }); setAuthenticated(true); setLoginPassword('') }
    catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  async function save() {
    if (!menus || !cards) { setMessage('Pehle menu aur cards load honay dein.'); return }
    if (!validateMenus(menus)) { setMessage('Menu mein invalid ya duplicate ID/link hai.'); return }
    setBusy(true); setMessage('')
    try { await api('/cms/navigation/draft', 'PUT', { items: menus }); await api('/cms/cards/draft', 'PUT', { items: cards }); setMessage('Draft save ho gaya.') }
    catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  async function publish() {
    if (!menus || !cards || !window.confirm('Menus aur cards ko public website par publish karna hai?')) return
    if (!validateMenus(menus)) { setMessage('Menu validation fail hui.'); return }
    setBusy(true); setMessage('')
    try {
      await api('/cms/navigation/draft', 'PUT', { items: menus }); await api('/cms/cards/draft', 'PUT', { items: cards })
      await api('/cms/navigation/publish', 'POST'); await api('/cms/cards/publish', 'POST')
      setPublishedMenus(clone(menus)); setPublishedCards(clone(cards)); setMessage('Published. Visitors ko refresh par changes nazar aayenge.')
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
  function moveMenu(id: string, direction: -1 | 1) {
    const next = clone(menus || [])
    function move(list: MenuItem[]): boolean {
      const index = list.findIndex(x => x.id === id)
      if (index >= 0) { const target = index + direction; if (target >= 0 && target < list.length) [list[index], list[target]] = [list[target], list[index]]; return true }
      return list.some(x => move(x.children || []))
    }
    move(next); setMenus(next)
  }
  function changeCard(id: string, patch: Partial<CardItem>) {
    if (!cards) return
    setCards(cards.map(card => card.id === id ? { ...card, ...patch } : card))
  }
  const menu = selected?.type === 'menu' ? findMenu(menus || [], selected.id) : undefined
  const card = selected?.type === 'card' ? cards?.find(c => c.id === selected.id) : undefined
  const field = (label: string, value: string, update: (v: string) => void) => <label className="flex flex-col gap-1 text-sm text-amber-200">{label}<input dir="auto" className="rounded border border-amber-700 bg-black p-2 text-white" value={value} onChange={e => update(e.target.value)} /></label>
  return <Context.Provider value={ctx}>
    {children}
    {editing && !authenticated && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" dir="ltr"><form onSubmit={login} className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-amber-600 bg-[#130e07] p-6 text-amber-100"><strong>مشکیزہ روحانیت — Editor Login</strong><input required type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="rounded bg-white p-2 text-black"/><input required type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="rounded bg-white p-2 text-black"/><button disabled={busy} className="rounded bg-amber-600 p-2 font-bold text-black">Login</button>{message && <p role="alert">{message}</p>}<button type="button" onClick={() => { setEditing(false); window.history.replaceState({}, '', window.location.pathname) }}>Cancel</button></form></div>}
    {editing && authenticated && <>
      <div className="fixed bottom-3 left-1/2 z-[9998] flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-amber-600 bg-black/95 p-3 text-xs text-amber-100 shadow-2xl" dir="ltr">
        <strong>Live Editor</strong>
        <button className="rounded border border-amber-600 px-2 py-1" onClick={() => setPreview(!preview)}>{preview ? 'Edit mode' : 'Preview published'}</button>
        {!preview && <><button className="rounded border border-amber-600 px-2 py-1" onClick={() => addMenu()}>+ Menu</button><button className="rounded border border-amber-600 px-2 py-1" onClick={() => { const next = [...(cards || []), { id: newId(), title: 'نیا کارڈ', description: '', image: '/images/icon-scroll.png', href: '#', card_group: 'primary' as const }]; setCards(next); setSelected({ type: 'card', id: next[next.length - 1].id }) }}>+ Card</button><button disabled={!history.length} className="rounded border border-amber-600 px-2 py-1 disabled:opacity-40" onClick={() => { const old = history[history.length - 1]; if (old) { setMenusState(old.menus); setCardsState(old.cards); setHistory(history.slice(0, -1)) } }}>Undo</button><button disabled={busy} className="rounded bg-amber-700 px-2 py-1" onClick={save}>Save draft</button><button disabled={busy} className="rounded bg-amber-500 px-2 py-1 font-bold text-black" onClick={publish}>Publish</button></>}
        <button className="rounded border border-amber-600 px-2 py-1" onClick={async () => { try { await api('/auth/logout', 'POST') } catch {} window.location.assign(window.location.pathname) }}>Logout</button>
        {message && <span role="status" className="w-full text-center">{message}</span>}
      </div>
      {!preview && (menu || card) && <aside className="fixed bottom-24 right-3 z-[9997] flex max-h-[65vh] w-[min(350px,94vw)] flex-col gap-3 overflow-auto rounded-xl border border-amber-600 bg-black/95 p-4 text-amber-100 shadow-2xl" dir="ltr"><div className="flex justify-between"><strong>{menu ? 'Edit Menu' : 'Edit Card'}</strong><button onClick={() => setSelected(null)}>✕</button></div>
        {menu && <>{field('Label', menu.label, v => changeMenu(menu.id, { label: v }))}{field('Link / URL', menu.href, v => changeMenu(menu.id, { href: v }))}<label><input type="checkbox" checked={menu.visible !== false} onChange={e => changeMenu(menu.id, { visible: e.target.checked })}/> Visible</label><label><input type="checkbox" checked={!!menu.openInNewTab} onChange={e => changeMenu(menu.id, { openInNewTab: e.target.checked })}/> Open in new tab</label><div className="flex flex-wrap gap-2"><button onClick={() => addMenu(menu.id)}>+ Submenu</button><button onClick={() => moveMenu(menu.id, -1)}>↑</button><button onClick={() => moveMenu(menu.id, 1)}>↓</button><button className="text-red-300" onClick={() => { if (window.confirm('Delete menu and its submenus?')) { setMenus(removeMenu(menus || [], menu.id)); setSelected(null) } }}>Delete</button></div></>}
        {card && <>{field('Title', card.title, v => changeCard(card.id, { title: v }))}{field('Description', card.description, v => changeCard(card.id, { description: v }))}{field('Image URL', card.image, v => changeCard(card.id, { image: v }))}{field('Link / URL', card.href, v => changeCard(card.id, { href: v }))}<label>Group <select className="bg-black" value={card.card_group} onChange={e => changeCard(card.id, { card_group: e.target.value as 'primary' | 'secondary' })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label><label><input type="checkbox" checked={card.visible !== false} onChange={e => changeCard(card.id, { visible: e.target.checked })}/> Visible</label><label><input type="checkbox" checked={!!card.openInNewTab} onChange={e => changeCard(card.id, { openInNewTab: e.target.checked })}/> New tab</label><button className="text-red-300" onClick={() => { if (window.confirm('Delete card?')) { setCards((cards || []).filter(c => c.id !== card.id)); setSelected(null) } }}>Delete card</button></>}
      </aside>}
    </>}
  </Context.Provider>
}
