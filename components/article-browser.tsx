
'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArticleRichBody } from './article-rich-body'
import {
  articleBackgroundStyle,
  articleOverlayOpacity,
  type ArticleAppearance,
} from './article-background'

const CMS_API = 'https://mashkeeza-cms-api.smilingshaaaam.workers.dev'

type Article = ArticleAppearance & {
  id: string
  title: string
  body?: string | null
  excerpt?: string | null
  content_type?: string
  published_at?: string | null
  paper_opacity?: number | null
  use_magical_scroll?: boolean | number | null
}

function isMagicalScrollEnabled(value: Article['use_magical_scroll']) {
  return value === true || value === 1
}

function MagicalScroll({ article }: { article: Article }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<HTMLImageElement>(null)
  const potRef = useRef<HTMLImageElement>(null)
  const sparkleRef = useRef<HTMLSpanElement>(null)
  const magicCanvasRef = useRef<HTMLCanvasElement>(null)
  const [opened, setOpened] = useState(false)
  const opacity = Math.min(100, Math.max(0, Number(article.paper_opacity ?? 100))) / 100

  useEffect(() => {
    const stage = stageRef.current
    const paper = paperRef.current
    const text = textRef.current
    const quill = quillRef.current
    const pot = potRef.current
    const spark = sparkleRef.current
    const magicCanvas = magicCanvasRef.current
    if (!stage || !paper || !text || !quill || !pot || !spark || !magicCanvas) return

    let cancelled = false
    const animations: Animation[] = []
    const frameIds = new Set<number>()
    const timerIds = new Set<number>()
    const rememberFrame = (fn: FrameRequestCallback) => {
      const id = requestAnimationFrame(time => {
        frameIds.delete(id)
        fn(time)
      })
      frameIds.add(id)
    }
    const delay = (ms: number) => new Promise<void>(resolve => {
      const id = window.setTimeout(() => {
        timerIds.delete(id)
        resolve()
      }, ms)
      timerIds.add(id)
    })
    // Canvas particles use the same four-point shimmer as the site's magical
    // cursor. This overlay is OUTSIDE the parchment clipping layer.
    const ctx = magicCanvas.getContext('2d')
    const palette = [43, 275, 196, 316, 52] // gold, violet, blue, pink, warm gold
    type MagicDust = {
      x: number; y: number; vx: number; vy: number
      life: number; maxLife: number; size: number; hue: number
      angle: number; spin: number
    }
    const dust: MagicDust[] = []
    const MAX_DUST = 130
    let magicNibX = 0, magicNibY = 0, nibKnown = false
    let inkReady = false, particleTrailActive = false
    let lastEmit = 0, lastGlowFrame = 0, canvasFrame = 0
    let canvasWidth = 0, canvasHeight = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resizeMagicCanvas = () => {
      if (!ctx) return
      const b = stage.getBoundingClientRect()
      canvasWidth = Math.max(1, b.width)
      canvasHeight = Math.max(1, b.height)
      magicCanvas.width = Math.round(canvasWidth * dpr)
      magicCanvas.height = Math.round(canvasHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resizeMagicCanvas)
      : null
    resizeObserver?.observe(stage)
    window.addEventListener('resize', resizeMagicCanvas)
    resizeMagicCanvas()

    const addMagicDust = (x: number, y: number, amount: number, subtle = false) => {
      for (let j = 0; j < amount && dust.length < MAX_DUST; j++) {
        const angle = Math.random() * Math.PI * 2
        const speed = subtle ? .12 + Math.random() * .45 : .35 + Math.random() * 1.35
        dust.push({
          x: x + (Math.random() - .5) * (subtle ? 8 : 6),
          y: y + (Math.random() - .5) * (subtle ? 4 : 6),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (subtle ? .20 : .48),
          life: 0,
          maxLife: subtle ? 36 + Math.random() * 42 : 23 + Math.random() * 24,
          size: subtle ? 1.0 + Math.random() * 1.5 : 1.45 + Math.random() * 2.3,
          hue: palette[Math.floor(Math.random() * palette.length)],
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - .5) * .14,
        })
      }
    }
    const drawFourPointStar = (size: number) => {
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.quadraticCurveTo(size * .17, -size * .17, size, 0)
      ctx.quadraticCurveTo(size * .17, size * .17, 0, size)
      ctx.quadraticCurveTo(-size * .17, size * .17, -size, 0)
      ctx.quadraticCurveTo(-size * .17, -size * .17, 0, -size)
      ctx.closePath()
      ctx.fill()
    }
    const drawInkInsideBottle = (time: number) => {
      if (!ctx || !inkReady) return
      const stageRect = stage.getBoundingClientRect()
      const potRect = pot.getBoundingClientRect()
      const left = potRect.left - stageRect.left
      const top = potRect.top - stageRect.top
      const w = potRect.width, h = potRect.height
      if (!w || !h) return
      const t = time * .001

      // Restrict the animated liquid to the round bottle chamber.
      const cx = left + w * .50, cy = top + h * .79
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy, w * .34, h * .105, 0, 0, Math.PI * 2)
      ctx.clip()
      const inner = ctx.createRadialGradient(
        cx + Math.sin(t * .76) * w * .10, cy + Math.cos(t * .89) * h * .028,
        1, cx, cy, w * .35
      )
      inner.addColorStop(0, `rgba(255,198,95,${.25 + .07 * Math.sin(t * 1.6)})`)
      inner.addColorStop(.32, 'rgba(216,77,245,.19)')
      inner.addColorStop(.64, 'rgba(55,150,255,.13)')
      inner.addColorStop(1, 'rgba(45,80,180,0)')
      ctx.fillStyle = inner
      ctx.fillRect(cx - w * .4, cy - h * .15, w * .8, h * .30)
      ctx.lineWidth = Math.max(0.75, w * .008)
      for (let i = 0; i < 2; i++) {
        const phase = t * (.78 + i * .13) + i * 2.2
        const orbitY = cy + Math.sin(phase) * h * .035
        ctx.beginPath()
        ctx.ellipse(cx, orbitY, w * (.20 + i * .048), h * (.018 + i * .008),
          Math.sin(phase) * .12, 0, Math.PI * 2)
        ctx.strokeStyle = i
          ? 'rgba(108,206,255,.22)'
          : 'rgba(255,219,120,.27)'
        ctx.stroke()
      }
      ctx.restore()

      // A faint magical ring exactly over the bottle's OPEN MOUTH.
      const mx = left + w * .52, my = top + h * .43
      const shimmer = .22 + .08 * Math.sin(t * 2.1)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(mx, my, w * .16, Math.max(1.3, h * .013), -.08, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(133,219,255,${shimmer})`
      ctx.lineWidth = Math.max(1, w * .011)
      ctx.stroke()
      ctx.restore()

      // Very occasional miniature points inside the ink, never a heavy firework.
      if (time - lastGlowFrame > 150) {
        lastGlowFrame = time
        const ax = cx + (Math.random() - .5) * w * .47
        const ay = cy + (Math.random() - .5) * h * .095
        addMagicDust(ax, ay, 1, true)
        if (Math.random() > .54) addMagicDust(mx, my, 1, true)
      }
    }
    // Animate the luminous BLUE FLAME already painted above the inkpot.
    // This adds moving highlights to the existing image; it never moves the
    // bottle, feather, approved resting point, rollers or parchment.
    const drawBlueFlame = (time: number) => {
      if (!ctx || !inkReady) return
      const stageRect = stage.getBoundingClientRect()
      const potRect = pot.getBoundingClientRect()
      if (potRect.width <= 0 || potRect.height <= 0) return
      const left = potRect.left - stageRect.left
      const top = potRect.top - stageRect.top
      const w = potRect.width
      const h = potRect.height
      const seconds = time * 0.001

      type FlameXY = { x: number; y: number }
      const cubic = (a: number, b: number, c: number, d: number, t: number) => {
        const v = 1 - t
        return v * v * v * a + 3 * v * v * t * b + 3 * v * t * t * c + t * t * t * d
      }

      // Three continuous S-curves follow the blue wisp in inkpot.png:
      // from the real bottle mouth (near 43% height) upward to the tip.
      const curves: [FlameXY, FlameXY, FlameXY, FlameXY][] = [
        [{ x: .52, y: .415 }, { x: .69, y: .335 }, { x: .66, y: .270 }, { x: .51, y: .240 }],
        [{ x: .51, y: .240 }, { x: .34, y: .225 }, { x: .245, y: .170 }, { x: .32, y: .125 }],
        [{ x: .32, y: .125 }, { x: .315, y: .079 }, { x: .47, y: .055 }, { x: .415, y: .010 }],
      ]

      // u = 0 at the mouth, u = 1 at the rising tip.
      const flameAt = (u: number, strand: number): FlameXY => {
        const clamped = Math.min(.999999, Math.max(0, u))
        const section = Math.min(2, Math.floor(clamped * 3))
        const v = clamped * 3 - section
        const [a, b, c, d] = curves[section]
        const x = cubic(a.x, b.x, c.x, d.x, v)
        const y = cubic(a.y, b.y, c.y, d.y, v)
        const sway = (0.0035 + u * .013) * (
          Math.sin(seconds * 1.75 + u * 7.0 + strand * .8) +
          .40 * Math.sin(seconds * 2.7 + u * 12.3 + strand)
        )
        const plume = Math.sin(seconds * 1.1 + u * 6.8 + strand * 1.9) * .0035 * u
        return {
          x: left + w * (x + sway + strand * .006),
          y: top + h * (y + plume),
        }
      }

      // Soft breathing glow, then narrower travelling cyan highlights.
      // Original image remains visible beneath the animation at all times.
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const pulse = .75 + .25 * Math.sin(seconds * 2.4)
      for (let strand = 0; strand < 3; strand++) {
        const gradient = ctx.createLinearGradient(0, top + h * .43, 0, top)
        gradient.addColorStop(0, `rgba(44,175,255,${.18 * pulse})`)
        gradient.addColorStop(.52, `rgba(43,195,255,${.27 * pulse})`)
        gradient.addColorStop(1, 'rgba(118,113,255,.06)')
        ctx.beginPath()
        for (let i = 0; i <= 48; i++) {
          const p = flameAt(i / 48, strand - 1)
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowBlur = Math.max(4, w * .065)
        ctx.shadowColor = 'rgba(0,130,255,.32)'
        ctx.lineWidth = Math.max(2, w * (strand === 1 ? .035 : .023))
        ctx.strokeStyle = gradient
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.lineWidth = Math.max(.75, w * .008)
        ctx.strokeStyle = `rgba(134,240,255,${strand === 1 ? .40 * pulse : .16 * pulse})`
        ctx.stroke()
      }

      // Bright, small motes travel UP the existing blue flame, giving it
      // visible motion without large fireworks or extra image assets.
      for (let i = 0; i < 4; i++) {
        const u = (seconds * .19 + i * .25) % 1
        const pos = flameAt(u, 0)
        const fade = Math.sin(Math.PI * u)
        const radius = Math.max(.7, w * (.006 + .004 * (1 - u)))
        ctx.shadowBlur = Math.max(3, w * .035)
        ctx.shadowColor = 'rgba(57,182,255,.48)'
        ctx.fillStyle = `rgba(172,242,255,${.50 * fade})`
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        if (i % 2 === 0) {
          ctx.save()
          ctx.translate(pos.x, pos.y)
          ctx.fillStyle = `rgba(225,241,255,${.30 * fade})`
          drawFourPointStar(radius * 1.45)
          ctx.restore()
        }
      }
      ctx.restore()
    }

    const drawMagicFrame = (time: number) => {
      if (cancelled || !ctx || reduced) return
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.globalCompositeOperation = 'lighter'
      if (inkReady) {
        drawInkInsideBottle(time)
        drawBlueFlame(time)
      }
      if (particleTrailActive && nibKnown && time - lastEmit > 38) {
        lastEmit = time
        addMagicDust(magicNibX + 1, magicNibY - 2, 3)
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i]
        p.life++
        if (p.life >= p.maxLife) { dust.splice(i, 1); continue }
        const progress = p.life / p.maxLife
        p.x += p.vx; p.y += p.vy
        p.vx *= .98; p.vy += .017; p.angle += p.spin
        const alpha = Math.pow(1 - progress, 1.25)
        const r = p.size * (1 - progress * .55)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = `hsla(${p.hue},100%,68%,${alpha * .12})`
        ctx.beginPath()
        ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `hsla(${p.hue},100%,78%,${alpha * .66})`
        drawFourPointStar(r)
        ctx.restore()
      }
      ctx.globalCompositeOperation = 'source-over'
      canvasFrame = requestAnimationFrame(drawMagicFrame)
    }
    if (ctx) canvasFrame = requestAnimationFrame(drawMagicFrame)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ease = (v: number) => v * v * (3 - 2 * v)
    const animate = (el: Element, keyframes: Keyframe[], duration: number, easing = 'ease-in-out') => {
      const animation = el.animate(keyframes, { duration, easing, fill: 'forwards' })
      animations.push(animation)
      return animation.finished.catch(() => undefined)
    }

    // These exact coordinates are from the last user-approved file. Keep them unchanged.
    const potRestRightShift = Math.max(0, Math.min(96, stage.clientWidth * .15) - 10)
    let px = 0
    let py = 0
    const putFeather = (x: number, y: number, rotation = 0) => {
      px = x
      py = y
      quill.dataset.x = String(x)
      quill.dataset.y = String(y)
      // The feather image's nib is at (1.4%, 99.3%), as in the approved version.
      quill.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`
      const nibX = x + quill.offsetWidth * .014
      const nibY = y + quill.offsetHeight * .993
      spark.style.transform = `translate(${nibX - 11}px, ${nibY - 12}px)`
      nibKnown = true
      // Feed the real nib position directly to the particle renderer.
      // No CSS layer clips these sparks.
      magicNibX = nibX
      magicNibY = nibY
    }
    const getTarget = (x: number, y: number, inkpotRest = false) => {
      const bounds = stage.getBoundingClientRect()
      const qw = quill.offsetWidth
      const qh = quill.offsetHeight
      const baseX = Math.max(0, Math.min(x - bounds.left - qw * .014, bounds.width - qw - 8))
      return {
        x: baseX + (inkpotRest ? potRestRightShift : 0),
        y: Math.max(0, Math.min(y - bounds.top - qh * .993, bounds.height - qh - 4))
      }
    }
    const move = (x: number, y: number, duration: number, opts: { pot?: boolean; writing?: boolean } = {}) =>
      new Promise<void>(resolve => {
        particleTrailActive = true
        const target = getTarget(x, y, Boolean(opts.pot))
        const fromX = px
        const fromY = py
        const start = performance.now()
        const travel = Boolean(opts.writing) ? 1.5 : 10
        const angle = Boolean(opts.writing) ? 3.5 : 8
        const loop = (now: number) => {
          if (cancelled) return resolve()
          const p = Math.min(1, (now - start) / duration)
          const v = opts.writing ? p : ease(p)
          const envelope = Math.sin(Math.PI * p)
          const wave = Math.sin(p * Math.PI * 3.6)
          putFeather(
            fromX + (target.x - fromX) * v + wave * travel * envelope,
            fromY + (target.y - fromY) * v - envelope * (opts.writing ? 1 : 15),
            wave * angle * envelope - 4 * envelope
          )
          spark.style.opacity = opts.writing ? '.58' : '.34'
          if (p < 1) rememberFrame(loop)
          else { putFeather(target.x, target.y, 0); resolve() }
        }
        rememberFrame(loop)
      })

    type InkPoint = { x: number; y: number; lineTop: number; lineBottom: number; relX: number }
    // Keep original Urdu DOM nodes intact. Measuring a Range does not break joined letters.
    const measureInkPoints = (block: HTMLElement): InkPoint[] => {
      const box = block.getBoundingClientRect()
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
      const points: InkPoint[] = []
      let current: Node | null
      const range = document.createRange()
      while ((current = walker.nextNode())) {
        const node = current as Text
        const value = node.data
        if (!value.trim()) continue
        // For very long paragraphs sample every few codepoints to keep animation responsive.
        const chars = Array.from(value)
        const stride = Math.max(1, Math.ceil(chars.length / 1200))
        let offset = 0
        for (let i = 0; i < chars.length; i++) {
          const nextOffset = offset + chars[i].length
          if (i % stride === 0 || i === chars.length - 1) {
            range.setStart(node, offset)
            range.setEnd(node, nextOffset)
            const rect = [...range.getClientRects()].find(r => r.height > 0 && r.width > 0)
            if (rect) {
              points.push({
                x: rect.left,
                y: rect.top + rect.height * .78,
                lineTop: Math.max(0, rect.top - box.top - 1),
                lineBottom: Math.min(box.height, rect.bottom - box.top + 2),
                relX: Math.max(0, Math.min(box.width, rect.left - box.left))
              })
            }
          }
          offset = nextOffset
        }
      }
      range.detach()
      // Points use viewport coordinates; move() converts them to stage coordinates.
      return points
    }

    const revealWhileWriting = (block: HTMLElement, points: InkPoint[]) =>
      new Promise<void>(resolve => {
        const box = block.getBoundingClientRect()
        if (!points.length || box.width <= 0) {
          block.style.clipPath = 'none'
          block.style.opacity = '1'
          resolve()
          return
        }
        // A staircase mask reveals completed RTL lines in full and writes the active line
        // right-to-left. Actual glyph geometry determines the feather tip position.
        const count = points.length
        // Roughly twice as fast as the last version, while the nib still follows each glyph.
        const duration = Math.min(6500, Math.max(440, count * 14))
        const start = performance.now()
        const loop = (now: number) => {
          if (cancelled) return resolve()
          const progress = Math.min(1, (now - start) / duration)
          const position = Math.min(count - 1, progress * Math.max(0, count - 1))
          const index = Math.floor(position)
          const part = position - index
          const a = points[index]
          const b = points[Math.min(count - 1, index + 1)]
          const sameLine = Math.abs(a.lineTop - b.lineTop) < 5
          const featherX = sameLine ? a.x + (b.x - a.x) * part : a.x
          const featherY = sameLine ? a.y + (b.y - a.y) * part : a.y
          // Pen nib and the visible writing edge use the SAME interpolated glyph coordinate.
          const target = getTarget(featherX, featherY)
          const bx = target.x
          const by = target.y
          // Gentle calligraphic movement: small rotation around the nib, no lateral drift.
          const wave = Math.sin(now / 100)
          const pressure = Math.sin(now / 67)
          putFeather(bx, by + pressure * .35, wave * 2.8)
          spark.style.opacity = '.58'
          const top = a.lineTop
          const bottom = a.lineBottom
          const x = sameLine ? a.relX + (b.relX - a.relX) * part : a.relX
          const clipX = Math.max(0, Math.min(box.width, x))
          block.style.clipPath = `polygon(0 0, 100% 0, 100% ${bottom}px, ${clipX}px ${bottom}px, ${clipX}px ${top}px, 0 ${top}px)`
          block.style.opacity = '1'
          if (progress < 1) rememberFrame(loop)
          else {
            block.style.clipPath = 'none'
            block.style.opacity = '1'
            resolve()
          }
        }
        rememberFrame(loop)
      })

    const run = async () => {
      // Preserve the existing parchment/roller opening and their exact geometry.
      const height = Math.max(paper.scrollHeight, 330)
      paper.style.height = '0px'
      paper.style.overflow = 'hidden'
      text.style.visibility = 'hidden'
      pot.style.opacity = '0'
      quill.style.opacity = '0'
      inkReady = false
      particleTrailActive = false
      spark.style.opacity = '0'
      const blocks = [...text.querySelectorAll('h2,h3,p,li,blockquote,div.whitespace-pre-wrap')]
        .filter((node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.textContent?.trim()))
        .filter(node => ![...node.querySelectorAll('h2,h3,p,li,blockquote,div.whitespace-pre-wrap')].some(x => x.textContent?.trim()))
      if (reduced) {
        paper.style.height = 'auto'
        paper.style.overflow = 'visible'
        text.style.visibility = 'visible'
        pot.style.opacity = '1'
        const bounds = pot.getBoundingClientRect()
        const stageBounds = stage.getBoundingClientRect()
        const qw = quill.offsetWidth, qh = quill.offsetHeight
        putFeather(
          Math.max(0, Math.min(bounds.left + bounds.width * .52 - stageBounds.left - qw * .014, stageBounds.width - qw - 8)) + potRestRightShift,
          Math.max(0, bounds.top + bounds.height * .43 - stageBounds.top - qh * .993)
        )
        quill.style.opacity = '1'
        setOpened(true)
        return
      }
      await animate(paper, [{height: '0px'}, {height: `${height}px`}], 2200, 'cubic-bezier(.22,.8,.22,1)')
      if (cancelled) return
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      setOpened(true)
      await animate(pot, [{opacity: 0}, {opacity: 1}], 650)
      if (cancelled) return
      inkReady = true

      const b = pot.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const qw = quill.offsetWidth
      const qh = quill.offsetHeight
      // Keep the EXACT working mouth position (43% Y and 52% X, plus approved X shift).
      const startX = Math.max(0, Math.min(b.left + b.width * .52 - s.left - qw * .014, s.width - qw - 8)) + potRestRightShift
      const startY = Math.max(0, b.top + b.height * .43 - s.top - qh * .993)
      putFeather(startX, startY)
      quill.style.opacity = '1'
      blocks.forEach(node => {node.style.opacity = '0'; node.style.clipPath = 'inset(0 0 100% 0)'})
      text.style.visibility = 'visible'
      await delay(100)
      if (cancelled) return
      for (const block of blocks) {
        if (cancelled) return
        const points = measureInkPoints(block)
        // Fly directly to the first actual Urdu glyph, not to an approximate paragraph corner.
        const r = block.getBoundingClientRect()
        const first = points[0]
        await move(first?.x ?? r.right - 9, first?.y ?? r.top + Math.min(r.height * .6, 30), 240)
        if (cancelled) return
        await revealWhileWriting(block, points)
        if (cancelled) return
        await delay(35)
      }
      if (cancelled) return
      const mouth = pot.getBoundingClientRect()
      await move(mouth.left + mouth.width * .52, mouth.top + mouth.height * .43, 1150, {pot:true})
      spark.style.opacity = '0'
      if (cancelled) return
      particleTrailActive = false
      putFeather(Number(quill.dataset.x), Number(quill.dataset.y), 0)
    }
    void run().catch(error => {
      if (cancelled) return
      console.error('Magical Scroll writing animation:', error)
      particleTrailActive = false
      // A rendering error must never leave the Urdu article invisible.
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      text.style.visibility = 'visible'
      text.querySelectorAll<HTMLElement>('h2,h3,p,li,blockquote,div.whitespace-pre-wrap').forEach(node => {
        node.style.opacity = '1'
        node.style.clipPath = 'none'
      })
      pot.style.opacity = '1'
      spark.style.opacity = '0'
    })
    return () => {
      cancelled = true
      frameIds.forEach(id => cancelAnimationFrame(id))
      timerIds.forEach(id => clearTimeout(id))
      animations.forEach(animation => animation.cancel())
      cancelAnimationFrame(canvasFrame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resizeMagicCanvas)
    }
  }, [article.id, article.body, article.title, article.excerpt])

  return (
    <article dir="rtl" lang="ur" className="original-mashkeeza-scroll" aria-label={article.title}>
      <div ref={stageRef} className="original-scroll-stage">
        <div className="original-scroll-assembly">
          <img className="original-scroll-roller" src="/magical-scroll/top-roller.png" alt="" draggable={false}/>
          <div ref={paperRef} className="original-scroll-paper" style={{'--paper-opacity': opacity} as CSSProperties}>
            <div className="original-scroll-paper-surface">
              <div ref={textRef} className="original-scroll-writing">
                <h2>{article.title}</h2>
                {article.excerpt && <p className="original-scroll-excerpt">{article.excerpt}</p>}
                <ArticleRichBody body={article.body}/>
              </div>
            </div>
          </div>
          <div className="original-scroll-bottom-mount" aria-hidden="true">
            <img className="original-scroll-roller original-scroll-bottom-roller" src="/magical-scroll/bottom-roller.png" alt="" draggable={false}/>
          </div>
        </div>
        <span className="original-scroll-sparkles" aria-hidden="true">✦ ✧ ✦</span>
        <img ref={potRef} className="original-scroll-pot" src="/magical-scroll/inkpot.png" alt="" draggable={false}/>
        <img ref={quillRef} className="original-scroll-quill" src="/magical-scroll/quill.webp" alt="" draggable={false}/>
        <span ref={sparkleRef} className="original-scroll-nib-sparks" aria-hidden="true"><i/><i/><i/><i/><i/></span>
        <canvas ref={magicCanvasRef} className="original-scroll-magic-canvas" aria-hidden="true" />
        {opened && <span className="sr-only">Scroll opened</span>}
      </div>
    </article>
  )
}

export function ArticleBrowser() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${CMS_API}/public/content`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error('Could not load articles')
        }
        return response.json()
      })
      .then(data => {
        if (controller.signal.aborted) return

        const list: Article[] = Array.isArray(data.items)
          ? data.items.filter(
              (item: unknown): item is Article =>
                !!item &&
                typeof item === 'object' &&
                typeof (item as Article).id === 'string' &&
                typeof (item as Article).title === 'string' &&
                (item as Article).content_type !== 'page'
            )
          : []

        setArticles(list)

        setSelectedId(previous =>
          previous && list.some(item => item.id === previous)
            ? previous
            : null
        )

        setError(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  const selected = articles.find(item => item.id === selectedId)
  const magical = selected
    ? isMagicalScrollEnabled(selected.use_magical_scroll)
    : false

  return (
    <>
      <section
        dir="rtl"
        aria-label="مضامین"
        className="absolute inset-0 z-20 mx-auto w-full max-w-7xl overflow-visible px-3 pt-2 pb-4 sm:px-5 sm:pt-3 md:pt-4"
      >
        <div className="grid h-full grid-cols-[minmax(110px,25%)_minmax(0,1fr)] items-start gap-3 sm:gap-6 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)] lg:gap-10">
          <aside
            aria-label="مضامین کی فہرست"
            className="min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]"
          >
            <h2 className="gold-text mb-1 text-sm font-bold leading-[2] sm:text-xl">
              مضامین
            </h2>

            {loading && (
              <p className="text-amber-100">
                مضامین لوڈ ہو رہے ہیں...
              </p>
            )}

            {error && (
              <p className="text-amber-100">
                مضامین فی الحال دستیاب نہیں ہیں۔
              </p>
            )}

            {!loading && !error && articles.length === 0 && (
              <p className="text-amber-100">
                ابھی کوئی شائع شدہ مضمون نہیں ہے۔
              </p>
            )}

            <nav aria-label="مضمون منتخب کریں">
              <ul className="space-y-1">
                {articles.map(article => (
                  <li key={article.id}>
                    <button
                      type="button"
                      aria-current={
                        selectedId === article.id
                          ? 'true'
                          : undefined
                      }
                      onClick={() => setSelectedId(article.id)}
                      className={`w-full bg-transparent px-1 py-1 text-right text-xs leading-[1.8] transition-colors sm:px-2 sm:py-2 sm:text-base hover:text-[#ffd77d] focus-visible:outline focus-visible:outline-amber-300 ${
                        selectedId === article.id
                          ? 'font-bold text-amber-200'
                          : 'text-amber-100'
                      }`}
                    >
                      {article.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div
            id="selected-article"
            className={magical
              ? "min-w-0 max-h-full overflow-visible bg-transparent"
              : "min-w-0 max-h-full overflow-y-auto bg-transparent [scrollbar-width:thin]"}
            aria-live="polite"
          >
            {selected && (
              magical ? (
                <MagicalScroll article={selected} />
              ) : (
                <article
                  className="relative isolate min-h-[320px] overflow-hidden rounded-xl"
                  style={articleBackgroundStyle(selected)}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                      backgroundColor: `rgba(0,0,0,${articleOverlayOpacity(
                        selected.overlay_opacity
                      )})`,
                    }}
                  />

                  <div className="relative z-10 p-3 sm:p-6">
                    <h2 className="gold-text mb-2 text-base font-bold leading-[2] sm:text-2xl">
                      {selected.title}
                    </h2>

                    {selected.excerpt && (
                      <p className="mb-2 text-xs leading-[1.9] text-amber-100/90 sm:text-base">
                        {selected.excerpt}
                      </p>
                    )}

                    <div className="whitespace-pre-wrap break-words text-xs leading-[2] text-amber-50 sm:text-base md:leading-[2.3]">
                      <ArticleRichBody body={selected.body} />
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .original-mashkeeza-scroll{font-family:'Noto Nastaliq Urdu',serif;color:#422410;width:100%;position:relative;z-index:100;overflow:visible}
        .original-scroll-stage{position:relative;z-index:101;width:100%;min-height:max-content;padding:8px 0 145px;overflow:visible;isolation:auto}
        .original-scroll-assembly{width:100%;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1}
        .original-scroll-roller{width:100%;height:auto;position:relative;z-index:3;flex-shrink:0;display:block;pointer-events:none;user-select:none}
        .original-scroll-paper{width:63.6%;margin:-1px 0 0;position:relative;z-index:1;min-height:0;overflow:hidden;container-type:inline-size}
        /* Bottom roller sits in front of the parchment edge, like the top roller. */
        /* The mount overlaps the parchment and casts an upward contact shadow,
           matching the way the top wooden roller sits against the paper. */
        .original-scroll-bottom-mount{position:relative;width:100%;flex-shrink:0;margin-top:calc(-1 * clamp(30px, 5.5vw, 70px));z-index:8;isolation:isolate;pointer-events:none}
        .original-scroll-bottom-mount::before{content:"";position:absolute;left:18.2%;right:18.2%;top:-20px;height:33px;z-index:1;pointer-events:none;background:linear-gradient(to bottom,rgba(65,29,12,0),rgba(69,31,12,.12) 22%,rgba(59,24,8,.38) 65%,rgba(44,17,6,.52) 100%);filter:blur(5px);border-radius:0 0 48% 48%}
        .original-scroll-bottom-roller{position:relative;z-index:2;margin:0;filter:drop-shadow(0 -3px 3px rgba(53,21,7,.28))}
        .original-scroll-paper-surface{position:relative;min-height:390px;padding:12% 10% 18%;isolation:isolate}
        .original-scroll-paper-surface::before{content:"";position:absolute;inset:0;z-index:-1;background:url('/magical-scroll/paper-bg.png') center / 100% 100% no-repeat;opacity:var(--paper-opacity);pointer-events:none}
        .original-scroll-writing{direction:rtl;text-align:right;overflow-wrap:anywhere;font-size:clamp(11px,2.8cqw,22px);line-height:2.4;color:#422410;visibility:hidden}
        .original-scroll-writing h2{font-size:1.55em;font-weight:700;text-align:center;line-height:2.2;margin:0 0 .8em;color:#71351d}
        .original-scroll-writing p,.original-scroll-writing li{margin:.7em 0}
        .original-scroll-writing img{max-width:100%;object-fit:contain}
        .original-scroll-excerpt{font-size:.9em;text-align:center}
        .original-scroll-pot{position:absolute;z-index:1000;width:19.15%;height:auto;right:1%;bottom:0;opacity:0;pointer-events:none;filter:drop-shadow(0 0 8px #5e8cff99)}
        .original-scroll-quill{position:absolute;z-index:1100;left:0;top:0;width:17%;height:auto;opacity:0;pointer-events:none;filter:drop-shadow(5px 7px 5px #321b1280);will-change:transform;transform-origin:1.4% 99.3%}
        /* Small, soft sparks follow the ACTUAL nib; not the top of the feather. */
        .original-scroll-magic-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;z-index:1500;pointer-events:none;overflow:visible}
        .original-scroll-nib-sparks{position:absolute;left:0;top:0;width:22px;height:22px;z-index:1200;opacity:0;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 0 5px #f7d8a477)}
        .original-scroll-nib-sparks i{position:absolute;left:9px;top:9px;width:4px;height:4px;display:block;border-radius:50%;background:#ffeeb4;box-shadow:0 0 5px #efb763aa;animation:subtleNibSpark .9s ease-out infinite}
        .original-scroll-nib-sparks i:nth-child(2){animation-delay:.28s;background:#dd92e5;box-shadow:0 0 5px #c57fe899}
        .original-scroll-nib-sparks i:nth-child(3){animation-delay:.55s;background:#80d5ff;box-shadow:0 0 5px #82caff66}
        .original-scroll-nib-sparks i:nth-child(4){animation-delay:.14s;background:#fff4c1;box-shadow:0 0 4px #fff0a388;animation-duration:.75s}
        .original-scroll-nib-sparks i:nth-child(5){animation-delay:.42s;background:#d29aff;box-shadow:0 0 4px #c47cff66;animation-duration:1.1s}
        @keyframes subtleNibSpark{from{transform:translate(0,0) scale(.65);opacity:.65}to{transform:translate(6px,-9px) scale(.15);opacity:0}}
        .original-scroll-sparkles{position:absolute;right:8%;bottom:13%;z-index:1001;pointer-events:none;color:#ffe88e;text-shadow:0 0 10px #e752ff,0 0 18px #21c8ff;animation:scrollSparkle 1.7s ease-in-out infinite alternate}
        @keyframes scrollSparkle{from{opacity:.25;transform:translateY(5px) scale(.8)}to{opacity:1;transform:translateY(-7px) scale(1.2)}}
        @media(max-width:640px){.original-scroll-stage{padding-bottom:55px}.original-scroll-paper-surface{min-height:260px;padding:11% 10% 17%}.original-scroll-writing{font-size:clamp(9px,3.6cqw,15px);line-height:2.1}}
        @media(prefers-reduced-motion:reduce){.original-scroll-writing{visibility:visible}.original-scroll-sparkles,.original-scroll-nib-sparks i{animation:none}}
      `}</style>
    </>
  )
}
