'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useVisualCms, type CardStyle } from '@/components/visual-cms'

export type Feature = {
  id: string
  title: string
  description: string
  image: string
  href?: string
  openInNewTab?: boolean
}

export function FeatureCard({ feature, wide = false, publishedStyle }: { feature: Feature; wide?: boolean; publishedStyle?: CardStyle }) {
  const cms = useVisualCms()
  const style = cms?.editing ? (cms.cardStyles[feature.id] || publishedStyle) : (cms?.cardStyles[feature.id] || publishedStyle)
  const href = feature.href && (/^https?:\/\//i.test(feature.href) || /^\/(?!\/)/.test(feature.href) || /^#/.test(feature.href)) ? feature.href : `#${feature.id}`
  return (
    <a
      id={feature.id}
      href={href}
      target={feature.openInNewTab ? '_blank' : undefined}
      rel={feature.openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={event => {
        if (cms?.editing) {
          event.preventDefault()
          cms.selectCard(feature.id)
        }
      }}
      style={{
        background: style?.background || undefined,
        borderColor: style?.border || undefined,
        borderWidth: style?.border ? 1 : undefined,
        padding: style?.padding !== undefined ? `${style.padding}px` : undefined,
        borderTopLeftRadius: style?.radius !== undefined ? `${style.radius}px` : undefined,
        borderTopRightRadius: style?.radius !== undefined ? `${style.radius}px` : undefined,
      }}
      className={cn(
        'group relative flex scroll-mt-8 flex-col items-center rounded-t-[2.5rem] rounded-b-md bg-gradient-to-b from-[#120c03] via-black to-black px-3 pt-5 pb-3 text-center transition-transform hover:-translate-y-1',
        'gold-frame hover:shadow-[0_0_25px_rgba(245,194,91,0.6)]',
        wide && 'rounded-t-2xl',
        cms?.editing && 'cursor-pointer outline outline-1 outline-amber-500/50',
      )}
    >
      <span aria-hidden="true" style={{ borderColor: style?.border || undefined }} className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border border-gold bg-black shadow-[0_0_10px_#f5c25b]" />
      <div className={cn('relative mb-1.5', wide ? 'size-16' : 'size-20 md:size-24')} style={style?.iconSize !== undefined ? { width: style.iconSize, height: style.iconSize } : undefined}>
        <Image
          src={feature.image}
          alt=""
          fill
          sizes="96px"
          unoptimized={/^https?:\/\//.test(feature.image)}
          className="object-contain mix-blend-screen drop-shadow-[0_0_12px_rgba(245,194,91,0.5)] transition-transform group-hover:scale-110"
        />
      </div>
      <h3 style={{ color: style?.titleColor || undefined, WebkitTextFillColor: style?.titleColor || undefined, backgroundImage: style?.titleColor ? 'none' : undefined, fontSize: style?.titleSize !== undefined ? `${style.titleSize}px` : undefined }} className="gold-text text-lg leading-[2] font-bold md:text-xl">{feature.title}</h3>
      <p style={{ color: style?.descriptionColor || undefined, fontSize: style?.descriptionSize !== undefined ? `${style.descriptionSize}px` : undefined }} className="mt-1 text-xs leading-[2] text-gold-light/90">{feature.description}</p>
    </a>
  )
}
