'use client'

import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
  spin: number
  angle: number
}

const MAX_PARTICLES = 320

function drawSparkle(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.quadraticCurveTo(0, 0, 0, r)
  ctx.quadraticCurveTo(0, 0, -r, 0)
  ctx.quadraticCurveTo(0, 0, 0, -r)
  ctx.fill()
}

const FEATHER_SIZE = 56
/** Quill tip position in the source artwork (fraction of the image). */
const FEATHER_TIP = 0.055

/**
 * The feather photo sits on pure black. Convert it to a transparent PNG by using
 * brightness as alpha, so the native cursor shows only the natural feather.
 */
function useFeatherCursor() {
  useEffect(() => {
    const image = new window.Image()
    image.src = '/images/feather-cursor.png'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = FEATHER_SIZE
      canvas.height = FEATHER_SIZE
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, FEATHER_SIZE, FEATHER_SIZE)
      const pixels = ctx.getImageData(0, 0, FEATHER_SIZE, FEATHER_SIZE)
      const data = pixels.data
      for (let i = 0; i < data.length; i += 4) {
        const max = Math.max(data[i], data[i + 1], data[i + 2])
        const alpha = Math.min(255, Math.max(0, (max - 14) * 2.4))
        if (alpha > 0) {
          const boost = 255 / Math.max(max, 1)
          data[i] = Math.min(255, data[i] * boost * 0.92)
          data[i + 1] = Math.min(255, data[i + 1] * boost * 0.92)
          data[i + 2] = Math.min(255, data[i + 2] * boost * 0.92)
        }
        data[i + 3] = alpha
      }
      ctx.putImageData(pixels, 0, 0)
      const hotspot = Math.round(FEATHER_SIZE * FEATHER_TIP)
      document.documentElement.style.setProperty(
        '--feather-cursor',
        `url(${canvas.toDataURL('image/png')}) ${hotspot} ${hotspot}, auto`,
      )
    }
  }, [])
}

export function SparkleCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useFeatherCursor()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const particles: Particle[] = []
    let frame = 0
    let hue = 0
    let lastX = -1
    let lastY = -1

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawn = (x: number, y: number, amount: number) => {
      for (let i = 0; i < amount && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 1.6
        particles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          life: 0,
          maxLife: 40 + Math.random() * 40,
          size: 2 + Math.random() * 5,
          hue: (hue + Math.random() * 60) % 360,
          spin: (Math.random() - 0.5) * 0.2,
          angle: Math.random() * Math.PI,
        })
      }
    }

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        if (p.life >= p.maxLife) {
          particles.splice(i, 1)
          continue
        }
        p.vy += 0.035
        p.vx *= 0.98
        p.x += p.vx
        p.y += p.vy
        p.angle += p.spin

        const progress = p.life / p.maxLife
        const alpha = 1 - progress
        const radius = p.size * (1 - progress * 0.6)

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha * 0.25})`
        ctx.beginPath()
        ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${alpha})`
        drawSparkle(ctx, radius)
        ctx.restore()
      }

      frame = particles.length > 0 ? requestAnimationFrame(tick) : 0
    }

    const onMove = (event: PointerEvent) => {
      hue = (hue + 4) % 360
      const distance = lastX < 0 ? 0 : Math.hypot(event.clientX - lastX, event.clientY - lastY)
      lastX = event.clientX
      lastY = event.clientY
      spawn(event.clientX, event.clientY, Math.min(6, 2 + Math.floor(distance / 8)))
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const onDown = (event: PointerEvent) => {
      spawn(event.clientX, event.clientY, 24)
      if (!frame) frame = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] h-screen w-screen"
    />
  )
}
