import type { ArticleAppearance } from './article-background'
export const PREMIUM_MARKER = '<!--mashkeeza-premium-parchment-v1-->'
export const RICH_PREFIX = '<!--mashkeeza-rich-v1-->'
export function isPremiumParchment(body?: string | null) {
  return typeof body === 'string' && body.startsWith(RICH_PREFIX + PREMIUM_MARKER)
}
export function premiumImage(item: ArticleAppearance & {body?: string | null}) {
  return isPremiumParchment(item.body) ? '/images/mashkeeza-premium-frame-v3.svg' : ''
}
