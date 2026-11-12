'use client'

import { useEffect, useState } from 'react'
import { useVisualCms } from '@/components/visual-cms'

type Star = {
  id: number
  side: 'left' | 'right'
  top: number
  edge: number
  dx: number
  dy: number
  angle: number
  duration: number
}

/** Independent shooting stars; smoke, site layout and other effects are untouched. */
export function ShootingStars() {
  const cms = useVisualCms()
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    if (cms?.editing) {
      setStars([])
      return
    }

    let stopped = false
    let nextId = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const random = (min: number, max: number) => min + Math.random() * (max - min)

    const spawn = () => {
      if (stopped) return
      const side: Star['side'] = Math.random() < 0.5 ? 'left' : 'right'
      // Choose a fresh visual angle for every star, not one repeated diagonal.
      // Use pixel distances so the actual on-screen angle matches the trail.
      const desiredAngle = random(22, 74)
      const travelY = window.innerHeight * random(0.48, 0.72)
      const travelX = Math.min(
        travelY / Math.tan(desiredAngle * Math.PI / 180),
        window.innerWidth * 0.84,
      )
      const dx = travelX * (side === 'right' ? -1 : 1)
      const dy = travelY
      const angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI)
      const duration = random(1.9, 2.8)
      const id = ++nextId
      setStars(prev => [...prev, {
        id, side, top: random(1, 13), edge: random(1, 13),
        dx, dy, angle, duration,
      }])
      timers.push(setTimeout(() => {
        if (!stopped) setStars(prev => prev.filter(s => s.id !== id))
      }, duration * 1000 + 100))
      // Irregular pauses; no fixed left/right sequence.
      timers.push(setTimeout(spawn, random(9000, 19000)))
    }

    timers.push(setTimeout(spawn, random(2500, 6000)))
    return () => {
      stopped = true
      timers.forEach(clearTimeout)
    }
  }, [cms?.editing])

  if (cms?.editing) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[12] overflow-hidden"
      style={{ height: 'min(1050px, 100vh)', minHeight: 520 }}
    >
      <style>{`
        @keyframes mashkeeza-random-shoot {
          0% { opacity: 0; transform: translate3d(0, 0, 0); }
          8% { opacity: 1; }
          75% { opacity: .95; }
          100% { opacity: 0; transform: translate3d(var(--shoot-dx), var(--shoot-dy), 0); }
        }
        .mashkeeza-random-star {
          position: absolute;
          display: block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fffbea;
          box-shadow: 0 0 8px 3px rgba(255,232,177,.8), 0 0 20px 5px rgba(255,215,132,.25);
          opacity: 0;
          will-change: transform, opacity;
          animation: mashkeeza-random-shoot var(--shoot-duration) linear both;
        }
        .mashkeeza-random-star::before {
          content: '';
          position: absolute;
          width: 145px;
          height: 2px;
          top: 1px;
          border-radius: 999px;
          background: linear-gradient(to right, transparent, rgba(255,221,155,.2) 25%, rgba(255,243,213,.9) 90%, #fff);
          filter: drop-shadow(0 0 3px rgba(255,221,155,.55));
        }
        .mashkeeza-random-star--left::before {
          right: 1px;
          transform-origin: right center;
          transform: rotate(var(--shoot-angle));
        }
        .mashkeeza-random-star--right::before {
          left: 1px;
          transform-origin: left center;
          transform: rotate(calc(-1 * var(--shoot-angle)));
          background: linear-gradient(to left, transparent, rgba(255,221,155,.2) 25%, rgba(255,243,213,.9) 90%, #fff);
        }
        @media (prefers-reduced-motion: reduce) {
          .mashkeeza-random-star { display: none; animation: none; }
        }
      `}</style>
      {stars.map(star => (
        <span
          key={star.id}
          className={`mashkeeza-random-star mashkeeza-random-star--${star.side}`}
          style={{
            top: `${star.top}%`,
            [star.side]: `${star.edge}%`,
            ['--shoot-dx' as string]: `${star.dx}px`,
            ['--shoot-dy' as string]: `${star.dy}px`,
            ['--shoot-angle' as string]: `${star.angle}deg`,
            ['--shoot-duration' as string]: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
