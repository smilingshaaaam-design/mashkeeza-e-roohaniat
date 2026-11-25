import { CMS_API } from './visual-cms'
import { useState } from 'react'
import { type GallerySettings, type TopicCard, safeCardUrl } from './topic-gallery-settings'

type Props = {
  cards: TopicCard[]
  settings: GallerySettings
  change: (settings: GallerySettings) => void
  close: () => void
}

export function TopicGalleryEditor({ cards, settings, change, close }: Props) {
  const [editing, edit] = useState<TopicCard | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  async function upload(file?: File) {
    if (!editing || !file) return
    const id = editing.id
    setUploading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(CMS_API + '/cms/media', { method: 'POST', credentials: 'include', body: form })
      const data = await response.json()
      if (!response.ok || !data.item?.id) throw new Error(data.error || 'Image upload failed.')
      edit(current => current?.id === id ? { ...current, image: CMS_API + '/media/' + encodeURIComponent(data.item.id) } : current)
    } catch (e) { setError(e instanceof Error ? e.message : 'Image upload failed.') }
    finally { setUploading(false) }
  }
  function apply(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const card = { ...editing, label: editing.label.trim(), image: editing.image.trim(), href: editing.href.trim() }
    if (!card.label || !safeCardUrl(card.href) || !safeCardUrl(card.image, true)) {
      setError('Title, valid link aur image URL likhein.')
      return
    }
    const added = settings.added.some(c => c.id === card.id)
    if (added || !cards.some(c => c.id === card.id)) {
      change({ ...settings, added: added ? settings.added.map(c => c.id === card.id ? card : c) : [...settings.added, card] })
    } else {
      change({ ...settings, changes: { ...settings.changes, [card.id]: card } })
    }
    edit(null)
  }
  function remove(card: TopicCard) {
    if (!window.confirm('Delete this homepage card?')) return
    if (settings.added.some(c => c.id === card.id)) change({ ...settings, added: settings.added.filter(c => c.id !== card.id) })
    else change({ ...settings, hidden: [...settings.hidden, card.id] })
  }
  function start(card: TopicCard) { setError(''); edit({ ...card }) }
  return <aside dir="ltr" aria-label="Homepage cards" className="fixed left-0 top-20 bottom-0 z-[9997] w-[min(400px,95vw)] overflow-y-auto rounded border border-amber-600 bg-black p-4 text-sm text-amber-100">
    <div className="flex justify-between"><strong>Homepage cards</strong><button type="button" onClick={close}>Close</button></div>
    <p className="my-2">Artwork: 960 × 570 px (32:19). Image mein heading ya frame shamil na karein.</p>
    {editing ? <form onSubmit={apply} className="grid gap-3">
      {(['label','href','image'] as const).map((key,i) => <label key={key}>{['Title','Destination URL','Image URL'][i]}
        <input required dir="auto" className="block w-full rounded border p-2" value={editing[key]} onChange={e => edit({ ...editing, [key]: e.target.value })}/></label>)}
      <label>Gemini se <strong>960 × 570 px</strong> ka image upload karien.
        <input aria-label="Browse card image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading}
          className="block w-full py-2" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void upload(file) }}/>
      </label>
      {uploading && <p role="status">Uploading…</p>}
      {editing.image && safeCardUrl(editing.image, true) && <img alt="Card artwork preview" src={editing.image} className="max-h-28 rounded"/>}
      <label>Width (% of one card)<input type="number" min="50" max="200" required className="block w-full border p-1" value={editing.width ?? 100} onChange={e => edit({ ...editing, width: Number(e.target.value) })}/></label>
      <label>Height (px, 0 = automatic)<input type="number" min="0" max="900" required className="block w-full border p-1" value={editing.height ?? 0} onChange={e => edit({ ...editing, height: Number(e.target.value) })}/></label>
      <label><input type="checkbox" checked={!!editing.featured} onChange={e => edit({ ...editing, featured: e.target.checked })}/> Show in moving strip</label>
      <label><input type="checkbox" checked={!!editing.openInNewTab} onChange={e => edit({ ...editing, openInNewTab: e.target.checked })}/> Open in new tab</label>
      {error && <p role="alert">{error}</p>}
      <button disabled={uploading} className="rounded bg-amber-700 p-2">Apply card</button><button type="button" onClick={() => edit(null)}>Cancel</button>
    </form> : <>
      <button className="my-2 rounded border p-2" onClick={() => start({ id: crypto.randomUUID(), label:'', href:'', image:'', featured:true })}>+ Add new card</button>
      {cards.map(c => <div className="flex items-center gap-2 border-b py-2" key={c.id}><span dir="rtl" className="flex-1">{c.label}</span><button onClick={() => start(c)}>Edit</button><button onClick={() => remove(c)}>Delete</button></div>)}
      <p className="my-3">Use Save draft or Publish in the toolbar.</p>
    </>}
  </aside>
}
