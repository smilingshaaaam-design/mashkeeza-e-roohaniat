'use client'

import { useEffect, useRef, type RefObject } from 'react'

export type FrameInfo = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  time: number
}

/**
 * Runs a requestAnimationFrame loop on a canvas that matches its CSS size,
 * pauses while the canvas is off-screen, and respects reduced-motion.
 */
export function useAnimatedCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  draw: (frame: FrameInfo) => void,
) {
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    const start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const loop = () => {
      drawRef.current({ ctx, width, height, time: (performance.now() - start) / 1000 })
      frame = visible ? requestAnimationFrame(loop) : 0
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !frame) frame = requestAnimationFrame(loop)
    })
    intersectionObserver.observe(canvas)

    resize()
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [canvasRef])
}
