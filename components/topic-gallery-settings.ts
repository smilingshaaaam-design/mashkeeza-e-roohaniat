export type TopicCard = {
  id: string
  label: string
  href: string
  image: string
  openInNewTab?: boolean
  featured?: boolean
  width?: number
  height?: number
}

export type GallerySettings = {
  changes: Record<string, Partial<Omit<TopicCard, 'id'>>>
  added: TopicCard[]
  hidden: string[]
}

export const emptyGallery: GallerySettings = { changes: {}, added: [], hidden: [] }

export function readGallery(value: unknown): GallerySettings {
  const data = value as Partial<GallerySettings> | null
  return {
    changes: data?.changes && typeof data.changes === 'object' ? data.changes : {},
    added: Array.isArray(data?.added) ? data.added.filter(c => c && typeof c.id === 'string') : [],
    hidden: Array.isArray(data?.hidden) ? data.hidden : [],
  }
}

export function safeCardUrl(url: string, image = false) {
  if (typeof url !== 'string' || !url.trim() || /[\\\s]/.test(url)) return false
  return /^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url) || (!image && /^#.+/.test(url))
}
