'use client'

import { useEffect, useState } from 'react'
import { useVisualCms } from '@/components/visual-cms'

type Star = {
  id: number
  side: 'left' | 'right'
  x: number
  y: number
  dx: number
  dy: number
  angle: number
  duration: number
}

/** Independent shooting stars: smoke, page, and all other effects remain untouched. */
export function ShootingStars() {
  const cms = useVisualCms()
  const [stars, setStars] = useState<Star[]>([])
  const [layerHeight, setLayerHeight] = useState(800)

  useEffect(() => {
    if (cms?.editing) {
      setStars([])
      return
    }

    let stopped = false
    let nextId = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const random = (min: number, max: number) => min + Math.random() * (max - min)

    // Desert/sky meeting line measured from the original desert-scene.png.
    // Coordinates are normalized to the actual hero image, not the viewport.
    const horizonPoints: [number, number][] = [
      [0, 0.42], [0.12, 0.39], [0.24, 0.37], [0.34, 0.40],
      [0.47, 0.42], [0.59, 0.43], [0.72, 0.36], [0.85, 0.29], [1, 0.32],
    ]
    const horizonAt = (x: number) => {
      const clamped = Math.max(0, Math.min(1, x))
      for (let i = 1; i < horizonPoints.length; i++) {
        const [rightX, rightY] = horizonPoints[i]
        const [leftX, leftY] = horizonPoints[i - 1]
        if (clamped <= rightX) {
          const t = (clamped - leftX) / (rightX - leftX)
          return leftY + (rightY - leftY) * t
        }
      }
      return horizonPoints[horizonPoints.length - 1][1]
    }

    const measure = () => {
      const hero = document.getElementById('hero-stage')
      if (!hero) return null
      const rect = hero.getBoundingClientRect()
      // The star layer starts at the top of the page, while rect is viewport-relative.
      const pageY = window.scrollY
      const heroTop = rect.top + pageY
      const horizonMax = heroTop + rect.height * 0.45
      setLayerHeight(Math.max(300, Math.ceil(horizonMax + 20)))
      return { rect, heroTop, pageY }
    }

    const spawn = () => {
      if (stopped) return
      const scene = measure()
      if (scene) {
        const { rect, heroTop, pageY } = scene
        const viewportWidth = document.documentElement.clientWidth
        const side: Star['side'] = Math.random() < 0.5 ? 'left' : 'right'

        // Random starting point near either upper corner.
        const x = side === 'left'
          ? random(viewportWidth * 0.025, viewportWidth * 0.19)
          : random(viewportWidth * 0.81, viewportWidth * 0.975)
        const y = random(8, Math.max(20, Math.min(95, heroTop * 0.38)))

        // Random endpoint on the actual visible desert horizon.
        // Endpoint x varies widely, so no fixed repeated shooting angle.
        const targetX = side === 'left'
          ? random(viewportWidth * 0.29, viewportWidth * 0.78)
          : random(viewportWidth * 0.22, viewportWidth * 0.71)
        const imageX = (targetX - rect.left) / rect.width
        const targetY = heroTop + rect.height * horizonAt(imageX)
        const dx = targetX - x
        const dy = Math.max(35, targetY - y)
        const angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI)
        const duration = random(1.9, 2.8)
        const id = ++nextId

        setStars(prev => [...prev, { id, side, x, y, dx, dy, angle, duration }])
        timers.push(setTimeout(() => {
          if (!stopped) setStars(prev => prev.filter(star => star.id !== id))
        }, duration * 1000 + 100))
      }
      // Preserve the previous irregular 9–19 second pause.
      timers.push(setTimeout(spawn, random(9000, 19000)))
    }

    measure()
    window.addEventListener('resize', measure)
    timers.push(setTimeout(spawn, random(2500, 6000)))
    return () => {
      stopped = true
      window.removeEventListener('resize', measure)
      timers.forEach(clearTimeout)
    }
  }, [cms?.editing])

  if (cms?.editing) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[12] overflow-hidden"
      style={{ height: layerHeight }}
    >
      <style>{`
        @keyframes mashkeeza-random-shoot {
          0% { opacity: 0; transform: translate3d(0, 0, 0); }
          8% { opacity: 1; }
          60% { opacity: .95; }
          80% { opacity: .5; }
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
            left: star.x,
            top: star.y,
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
