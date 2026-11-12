import type { CSSProperties } from 'react'

const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

export type ArticleAppearance = {
  background_image_url?: string | null
  background_color?: string | null
  background_fit?: string | null
  background_position?: string | null
  overlay_opacity?: number | null
}

export function articleBackgroundImage(value?: string | null): string {
  if (!value) return ''
  if (value.startsWith('/media/')) return `${CMS_API}${value}`
  if (value.startsWith(`${CMS_API}/media/`)) return value
  return ''
}

export function articleBackgroundStyle(item: ArticleAppearance): CSSProperties {
  const image = articleBackgroundImage(item.background_image_url)
  const fit = item.background_fit || 'cover'
  return {
    backgroundColor: item.background_color || '#071426',
    ...(image ? { backgroundImage: `url("${image}")` } : {}),
    backgroundSize: fit === 'repeat' ? 'auto' : fit,
    backgroundPosition: item.background_position || 'center',
    backgroundRepeat: fit === 'repeat' ? 'repeat' : 'no-repeat',
  }
}

export function articleOverlayOpacity(value?: number | null): number {
  const number = Number(value ?? 55)
  return Math.min(1, Math.max(0, Number.isFinite(number) ? number / 100 : 0.55))
}
