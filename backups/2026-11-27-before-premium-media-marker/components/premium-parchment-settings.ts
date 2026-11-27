import type { ArticleAppearance } from './article-background'
export const PREMIUM_MARKER = '<!--mashkeeza-premium-parchment-v1-->'
export const RICH_PREFIX = '<!--mashkeeza-rich-v1-->'
export function isPremiumParchment(body?: string | null) {
  return typeof body === 'string' && body.startsWith(RICH_PREFIX + PREMIUM_MARKER)
}
export function premiumImage(item: ArticleAppearance) {
  const value = item.background_image_url || ''
  const prefix = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'
  const path = value.startsWith(prefix) ? value.slice(prefix.length) : value
  return /^\/media\/[0-9a-f-]{36}$/i.test(path) ? prefix + path : ''
}
