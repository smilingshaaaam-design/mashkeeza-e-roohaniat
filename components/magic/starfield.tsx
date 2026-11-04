import { cn } from '@/lib/utils'
import { round, seededRandom } from '@/lib/seeded-random'

type StarfieldProps = {
  count?: number
  seed?: number
  className?: string
}

const STAR_COLORS = ['#ffffff', '#fff3c4', '#cfe3ff', '#ffd9f5']

export function Starfield({ count = 60, seed = 7, className }: StarfieldProps) {
  const random = seededRandom(seed)
  const stars = Array.from({ length: count }, (_, i) => {
    const size = round(1 + random() * 2.4)
    return {
      id: i,
      left: round(random() * 100),
      top: round(random() * 100),
      size,
      color: STAR_COLORS[Math.floor(random() * STAR_COLORS.length)],
      duration: round(1.8 + random() * 3.2),
      delay: round(-random() * 5),
      sparkle: size > 2.8,
    }
  })

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute overflow-hidden', className)}>
      {stars.map((star) => (
        <span
          key={star.id}
          className={cn('magic-star absolute rounded-full', star.sparkle && 'magic-star-cross')}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            backgroundColor: star.color,
            color: star.color,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
