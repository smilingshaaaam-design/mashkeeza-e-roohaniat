import Image from 'next/image'
import { cn } from '@/lib/utils'

export type Feature = {
  id: string
  title: string
  description: string
  image: string
}

export function FeatureCard({ feature, wide = false }: { feature: Feature; wide?: boolean }) {
  return (
    <a
      id={feature.id}
      href={`#${feature.id}`}
      className={cn(
        'group relative flex scroll-mt-8 flex-col items-center rounded-t-[3rem] rounded-b-md bg-gradient-to-b from-[#120c03] via-black to-black px-4 pt-8 pb-5 text-center transition-transform hover:-translate-y-1',
        'gold-frame hover:shadow-[0_0_30px_rgba(245,194,91,0.6)]',
        wide && 'rounded-t-2xl',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 rotate-45 border border-gold bg-black shadow-[0_0_10px_#f5c25b]"
      />
      <div className={cn('relative mb-2', wide ? 'size-20' : 'size-24 md:size-28')}>
        <Image
          src={feature.image}
          alt=""
          fill
          sizes="112px"
          className="object-contain mix-blend-screen drop-shadow-[0_0_14px_rgba(245,194,91,0.5)] transition-transform group-hover:scale-110"
        />
      </div>
      <h3 className="gold-text text-xl leading-[2] font-bold md:text-2xl">{feature.title}</h3>
      <p className="mt-1 text-sm leading-[2.1] text-gold-light/90">{feature.description}</p>
    </a>
  )
}
