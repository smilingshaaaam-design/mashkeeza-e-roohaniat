'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAnimatedCanvas } from '@/components/magic/use-animated-canvas'

type Grain = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  light: number
  phase: number
  glint: boolean
  age: number
}

type GoldenSandProps = {
  className?: string
  /** Vertical position (fraction of the parent's height) where grains detach from the letters. */
  emitAt?: number
  /** How far below the parent the grains keep falling, in px. */
  fallDistance?: number
}

const MAX_GRAINS = 700

export function GoldenSand({ className, emitAt = 0.68, fallDistance = 240 }: GoldenSandProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const state = useRef({ grains: [] as Grain[], streams: [] as { base: number; phase: number; speed: number }[] })

  useEffect(() => {
    state.current.streams = Array.from({ length: 7 }, (_, i) => ({
      base: 0.12 + (i / 6) * 0.76,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.25,
    }))
  }, [])

  useAnimatedCanvas(canvasRef, ({ ctx, width, height, time }) => {
    const { grains, streams } = state.current
    const parentHeight = canvasRef.current?.parentElement?.clientHeight ?? height - fallDistance
    const emitY = parentHeight * emitAt
    const scale = Math.min(1.4, Math.max(0.7, width / 600))

    const spawnCount = 5
    for (let i = 0; i < spawnCount && grains.length < MAX_GRAINS; i++) {
      let xRatio: number
      if (Math.random() < 0.75) {
        const stream = streams[Math.floor(Math.random() * streams.length)]
        const center = stream.base + Math.sin(time * stream.speed + stream.phase) * 0.04
        xRatio = center + (Math.random() + Math.random() + Math.random() - 1.5) * 0.025
      } else {
        xRatio = 0.08 + Math.random() * 0.84
      }
      const glint = Math.random() < 0.12
      grains.push({
        x: xRatio * width,
        y: emitY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.1 + Math.random() * 0.5,
        size: (glint ? 1.1 + Math.random() * 1.1 : 0.45 + Math.random() * 0.9) * scale,
        hue: 34 + Math.random() * 16,
        light: 55 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        glint,
        age: 0,
      })
    }

    ctx.clearRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'lighter'

    const wind = Math.sin(time * 0.35) * 0.012
    const fadeStart = emitY + (height - emitY) * 0.45

    for (let i = grains.length - 1; i >= 0; i--) {
      const g = grains[i]
      g.age++
      g.vy = Math.min(g.vy + 0.035, 3.2)
      g.vx += wind + Math.sin(g.age * 0.08 + g.phase) * 0.006
      g.vx *= 0.985
      g.x += g.vx
      g.y += g.vy

      if (g.y > height) {
        grains.splice(i, 1)
        continue
      }

      const fadeIn = Math.min(1, g.age / 10)
      const fadeOut = g.y > fadeStart ? 1 - (g.y - fadeStart) / (height - fadeStart) : 1
      const shimmer = 0.6 + 0.4 * Math.sin(g.age * 0.35 + g.phase)
      const alpha = fadeIn * fadeOut * (g.glint ? shimmer : 0.55 + shimmer * 0.35)

      if (g.glint) {
        ctx.fillStyle = `hsla(${g.hue}, 100%, 70%, ${alpha * 0.18})`
        ctx.beginPath()
        ctx.arc(g.x, g.y, g.size * 3.2, 0, Math.PI * 2)
        ctx.fill()
        if (shimmer > 0.85) {
          const len = g.size * 4 * shimmer
          ctx.fillStyle = `rgba(255, 246, 210, ${alpha * 0.8})`
          ctx.fillRect(g.x - len, g.y - 0.35, len * 2, 0.7)
          ctx.fillRect(g.x - 0.35, g.y - len, 0.7, len * 2)
        }
      }

      ctx.fillStyle = `hsla(${g.hue}, 95%, ${g.light}%, ${alpha})`
      // Grains stretch slightly as they accelerate, like real falling sand.
      const stretch = 1 + g.vy * 0.45
      ctx.fillRect(g.x - g.size / 2, g.y - (g.size * stretch) / 2, g.size, g.size * stretch)
    }
  })

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute', className)}
      style={{ height: `calc(100% + ${fallDistance}px)` }}
    />
  )
}
