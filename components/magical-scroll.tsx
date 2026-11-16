'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArticleRichBody } from './article-rich-body'
import type { ArticleAppearance } from './article-background'

// Shared between the homepage ArticleBrowser and public CMS pages.
// The approved feather position, paper, rollers and blue flame are unchanged.
export type MagicalArticle = ArticleAppearance & {
  id: string
  title: string
  body?: string | null
  excerpt?: string | null
  content_type?: string
  published_at?: string | null
  paper_opacity?: number | null
  use_magical_scroll?: boolean | number | null
}

const openedScrollKeys = new Set<string>()

// A new full-page visit starts fresh. This also handles browser Back restoring
// the document from the back/forward cache without reloading JavaScript.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => openedScrollKeys.clear())
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      openedScrollKeys.clear()
      window.dispatchEvent(new Event('mashkeeza:scroll:new-visit'))
    }
  })
}

export function isMagicalScrollEnabled(value: MagicalArticle['use_magical_scroll']) {
  return value === true || value === 1
}

export function MagicalScroll({ article }: { article: MagicalArticle }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<HTMLImageElement>(null)
  const potRef = useRef<HTMLImageElement>(null)
  const sparkleRef = useRef<HTMLSpanElement>(null)
  const engravingCanvasRef = useRef<HTMLCanvasElement>(null)
  const [opened, setOpened] = useState(false)
  const [visitEpoch, setVisitEpoch] = useState(0)

  useEffect(() => {
    const onNewVisit = () => setVisitEpoch(epoch => epoch + 1)
    window.addEventListener('mashkeeza:scroll:new-visit', onNewVisit)
    return () => window.removeEventListener('mashkeeza:scroll:new-visit', onNewVisit)
  }, [])
  const opacity = Math.min(100, Math.max(0, Number(article.paper_opacity ?? 100))) / 100

  useEffect(() => {
    const stage = stageRef.current
    const paper = paperRef.current
    const text = textRef.current
    const quill = quillRef.current
    const pot = potRef.current
    const spark = sparkleRef.current
    const engravingCanvas = engravingCanvasRef.current
    if (!stage || !paper || !text || !quill || !pot || !spark || !engravingCanvas) return

    let cancelled = false
    let runCompleted = false
    let lastAnimationHeartbeat = performance.now()
    const animations: Animation[] = []
    const frameIds = new Set<number>()
    const timerIds = new Set<number>()
    const rememberFrame = (fn: FrameRequestCallback) => {
      const id = requestAnimationFrame(time => {
        frameIds.delete(id)
        lastAnimationHeartbeat = performance.now()
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
    // Play just once per WEBSITE VISIT (one loaded browser document).
    // This in-memory Set survives switching between articles/pages while the
    // website is open, but is automatically empty on refresh, tab reopening,
    // or returning after a real navigation away from the site.
    // NEVER read/write localStorage or sessionStorage: they persist across
    // reloads and would incorrectly suppress the next visit's animation.
    const visitKey = `mashkeeza:magical-scroll:seen:v1:${article.content_type === 'page' ? 'page' : 'article'}:${article.id}`
    const seenBefore = openedScrollKeys.has(visitKey)
    // Only mark as seen AFTER all writing and the return flight succeed.
    // Recording at mount time incorrectly skips animation after aborted effects,
    // React StrictMode re-mounts, or a failed image/layout measurement.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ease = (v: number) => v * v * (3 - 2 * v)
    const animate = (el: Element, keyframes: Keyframe[], duration: number, easing = 'ease-in-out') => {
      const animation = el.animate(keyframes, { duration, easing, fill: 'forwards' })
      animations.push(animation)
      return animation.finished.catch(() => undefined)
    }

    // Animate the paper's actual layout height exactly ONCE, without WAAPI
    // fill:'forwards'. That fill otherwise competes with height:'auto' and
    // produces the apparent SECOND scroll opening on long posts.
    const unfoldPaperOnce = (targetHeight: number, duration: number) =>
      new Promise<void>(resolve => {
        const started = performance.now()
        const tick = (time: number) => {
          if (cancelled) { resolve(); return }
          const p = Math.min(1, (time - started) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          paper.style.height = `${Math.max(0, targetHeight * eased)}px`
          if (p < 1) rememberFrame(tick)
          else resolve()
        }
        rememberFrame(tick)
      })

    // These exact coordinates are from the last user-approved file. Keep them unchanged.
    const potRestRightShift = Math.max(0, Math.min(96, stage.clientWidth * .15) - 10)
    let px = 0
    let py = 0
    // Lightweight engraving filings: 120px overlay around the nib, not a
    // giant canvas over a potentially very long article. This deliberately
    // does not change the feather's approved position or dimensions.
    type Filings = {
      x: number; y: number; vx: number; vy: number; birth: number
      ttl: number; size: number; rotation: number; spin: number; color: string
    }
    const filings: Filings[] = []
    const filingColors = ['#ffda78', '#fbad62', '#ff91d7', '#ae92ff', '#70ddff']
    const canvasContext = engravingCanvas.getContext('2d', { alpha: true })
    const canvasScale = Math.min(window.devicePixelRatio || 1, 2)
    engravingCanvas.width = Math.round(120 * canvasScale)
    engravingCanvas.height = Math.round(120 * canvasScale)
    canvasContext?.setTransform(canvasScale, 0, 0, canvasScale, 0, 0)
    let dustFrame = 0
    let lastFilingsEmit = 0
    let lastNibX = NaN
    let lastNibY = NaN
    let engraveActive = false
    const drawFilings = (time: number) => {
      if (cancelled || !canvasContext) return
      canvasContext.clearRect(0, 0, 120, 120)
      for (let i = filings.length - 1; i >= 0; i--) {
        const f = filings[i]
        const age = (time - f.birth) / f.ttl
        if (age >= 1) { filings.splice(i, 1); continue }
        f.x += f.vx
        f.y += f.vy
        f.vy += .055
        f.vx *= .978
        f.rotation += f.spin
        canvasContext.save()
        canvasContext.translate(f.x, f.y)
        canvasContext.rotate(f.rotation)
        canvasContext.globalAlpha = .78 * Math.pow(1 - age, 1.35)
        canvasContext.shadowBlur = 8
        canvasContext.shadowColor = f.color
        canvasContext.strokeStyle = f.color
        canvasContext.lineWidth = Math.max(.7, f.size * .46)
        canvasContext.beginPath()
        canvasContext.moveTo(-f.size * 1.25, 0)
        canvasContext.lineTo(f.size * 1.25, 0)
        canvasContext.moveTo(0, -f.size * 1.25)
        canvasContext.lineTo(0, f.size * 1.25)
        canvasContext.stroke()
        canvasContext.restore()
      }
      if (filings.length) dustFrame = requestAnimationFrame(drawFilings)
      else dustFrame = 0
    }
    const showNibFilings = (nibX: number, nibY: number) => {
      engravingCanvas.style.transform = `translate(${nibX - 60}px, ${nibY - 60}px)`
      if (Number.isFinite(lastNibX) && Number.isFinite(lastNibY)) {
        const dx = nibX - lastNibX
        const dy = nibY - lastNibY
        // Existing metallic flecks stay in place while the nib moves.
        for (const f of filings) { f.x -= dx; f.y -= dy }
      }
      lastNibX = nibX
      lastNibY = nibY
      if (!engraveActive || !canvasContext) return
      const now = performance.now()
      if (now - lastFilingsEmit < 33) return
      lastFilingsEmit = now
      for (let i = 0; i < 4 && filings.length < 72; i++) {
        const a = Math.PI * (1.03 + Math.random() * .95)
        const v = .7 + Math.random() * 1.65
        filings.push({
          x: 60 + (Math.random() - .5) * 6,
          y: 60 + (Math.random() - .5) * 4,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - .5,
          birth: now,
          ttl: 390 + Math.random() * 240,
          size: 1.35 + Math.random() * 2.2,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - .5) * .16,
          color: filingColors[Math.floor(Math.random() * filingColors.length)]
        })
      }
      if (!dustFrame) dustFrame = requestAnimationFrame(drawFilings)
    }
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
      showNibFilings(nibX, nibY)
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
    // Exact approved resting formula (52% horizontal, 43% vertical on the
    // inkpot image, plus the previously approved 10px-left X adjustment).
    // Calculate it fresh after the scroll finishes opening; no guessed offset.
    const getApprovedPotRest = () => {
      const bounds = pot.getBoundingClientRect()
      const stageBounds = stage.getBoundingClientRect()
      const qw = quill.offsetWidth, qh = quill.offsetHeight
      return {
        x: Math.max(0, Math.min(bounds.left + bounds.width * .52 - stageBounds.left - qw * .014, stageBounds.width - qw - 8)) + potRestRightShift,
        y: Math.max(0, bounds.top + bounds.height * .43 - stageBounds.top - qh * .993),
      }
    }
    const restorePotRest = () => {
      const pos = getApprovedPotRest()
      putFeather(pos.x, pos.y, 0)
      return pos
    }
    const move = (x: number, y: number, duration: number, opts: { pot?: boolean; writing?: boolean } = {}) =>
      new Promise<void>(resolve => {
        engraveActive = true
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

    // One complete, fluid swing over the page before the quill returns to
    // the exact same inkpot mouth as before (no X/Y changes to resting pose).
    const swingHome = (destinationX: number, destinationY: number, duration = 1950) =>
      new Promise<void>(resolve => {
        engraveActive = true
        const target = getTarget(destinationX, destinationY, true)
        const sx = px, sy = py
        const radius = Math.max(12, Math.min(64, stage.clientWidth * .095))
        const orbitX = Math.max(radius + 10,
          Math.min(stage.clientWidth - radius - 10, (sx + target.x) / 2))
        const orbitY = Math.max(radius + 10,
          Math.min(stage.clientHeight - radius - 45, (sy + target.y) / 2 - radius * .95))
        const entryX = orbitX + radius
        const entryY = orbitY
        const cubic = (a: number, b: number, c: number, d: number, t: number) => {
          const k = 1 - t
          return k * k * k * a + 3 * k * k * t * b + 3 * k * t * t * c + t * t * t * d
        }
        const started = performance.now()
        const frame = (time: number) => {
          if (cancelled) return resolve()
          const p = Math.min(1, (time - started) / duration)
          let x: number, y: number
          if (p < .29) {
            const t = ease(p / .29)
            x = cubic(sx, sx + radius * .3, entryX - radius, entryX, t)
            y = cubic(sy, sy - radius * 1.2, orbitY - radius * .8, entryY, t)
          } else if (p < .67) {
            const t = (p - .29) / .38
            const theta = t * Math.PI * 2
            x = orbitX + radius * Math.cos(theta)
            y = orbitY + radius * .68 * Math.sin(theta)
          } else {
            const t = ease((p - .67) / .33)
            x = cubic(entryX, entryX + radius * .35, target.x - radius * .35, target.x, t)
            y = cubic(entryY, entryY + radius * .5, target.y - radius * .65, target.y, t)
          }
          // Gentle swaying about the original nib point: no sharp direction cuts.
          const envelope = Math.sin(Math.PI * p)
          const rotation = Math.sin(p * Math.PI * 5) * 11 * envelope
          putFeather(x, y, rotation)
          spark.style.opacity = '.34'
          if (p < 1) rememberFrame(frame)
          else {
            putFeather(target.x, target.y, 0)
            engraveActive = false
            spark.style.opacity = '0'
            resolve()
          }
        }
        rememberFrame(frame)
      })

    type InkPoint = {
      x: number; y: number; lineTop: number; lineBottom: number
      relX: number; lineIndex: number
    }
    // Measure real *rendered* glyphs rather than assuming fixed character widths.
    // Urdu/Nastaliq diacritics can create slightly different rect.top values
    // within one heading, so group by VISUAL line and then order RTL by X.
    const measureInkPoints = (block: HTMLElement): InkPoint[] => {
      const box = block.getBoundingClientRect()
      if (box.width <= 0 || box.height <= 0) return []
      type Glyph = { left: number; right: number; top: number; bottom: number }
      const glyphs: Glyph[] = []
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      const mark = /[\p{M}\u200C\u200D]/u
      let node: Node | null
      while ((node = walker.nextNode())) {
        const value = (node as Text).data
        if (!value.trim()) continue
        // Merge marks with their base character; never split joined Urdu marks.
        const units: { start: number; end: number; value: string }[] = []
        let offset = 0
        for (const char of Array.from(value)) {
          const prev = units[units.length - 1]
          if (prev && mark.test(char)) {
            prev.end += char.length
            prev.value += char
          } else {
            units.push({ start: offset, end: offset + char.length, value: char })
          }
          offset += char.length
        }
        // Sample long posts to keep Range measurement responsive.
        const stride = Math.max(1, Math.ceil(units.length / 1100))
        for (let index = 0; index < units.length; index += stride) {
          const unit = units[index]
          if (!unit.value.trim()) continue
          range.setStart(node, unit.start)
          range.setEnd(node, unit.end)
          const rect = Array.from(range.getClientRects()).find(r => r.width > .2 && r.height > 1)
          if (rect) glyphs.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })
        }
      }
      range.detach()
      if (!glyphs.length) return []
      // Same visual line may have diacritics/inline styles with different tops.
      const font = window.getComputedStyle(block)
      const lineHeight = Number.parseFloat(font.lineHeight)
      const tolerance = Math.max(7, Math.min(19, (Number.isFinite(lineHeight) ? lineHeight : 48) * .28))
      const lines: { center: number; glyphs: Glyph[] }[] = []
      for (const glyph of glyphs.sort((a, b) => (a.top + a.bottom) - (b.top + b.bottom))) {
        const middle = (glyph.top + glyph.bottom) / 2
        const row = lines.find(line => Math.abs(line.center - middle) < tolerance)
        if (row) {
          row.glyphs.push(glyph)
          row.center = (row.center * (row.glyphs.length - 1) + middle) / row.glyphs.length
        } else lines.push({ center: middle, glyphs: [glyph] })
      }
      lines.sort((a, b) => a.center - b.center)
      const points: InkPoint[] = []
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const row = lines[lineIndex]
        const sorted = row.glyphs.sort((a, b) => b.right - a.right)
        // Avoid spreading thousands of characters into Math.min/Math.max.
        let minTop = Infinity, maxBottom = -Infinity
        for (const glyph of row.glyphs) {
          minTop = Math.min(minTop, glyph.top)
          maxBottom = Math.max(maxBottom, glyph.bottom)
        }
        const top = Math.max(0, minTop - box.top - 1)
        const bottom = Math.min(box.height, maxBottom - box.top + 2)
        // Start at the rightmost stroke; keep nib aligned with the REVEAL edge.
        const y = Math.min(maxBottom - 1, minTop + (maxBottom - minTop) * .78)
        for (const glyph of sorted) {
          points.push({
            x: glyph.right, y,
            lineTop: top, lineBottom: bottom,
            relX: Math.max(0, Math.min(box.width, glyph.right - box.left)),
            lineIndex,
          })
        }
        // End at the last glyph's left edge: the whole line is now visible.
        const last = sorted[sorted.length - 1]
        points.push({
          x: last.left, y,
          lineTop: top, lineBottom: bottom,
          relX: Math.max(0, Math.min(box.width, last.left - box.left)),
          lineIndex,
        })
      }
      return points
    }

    const revealWhileWriting = (block: HTMLElement, points: InkPoint[], fastBody = false) =>
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
        // Title, short description and headings retain the APPROVED writing speed.
        // Only regular body prose uses a faster stroke-by-stroke nib/reveal timeline.
        const duration = fastBody
          ? Math.min(2600, Math.max(220, count * 5.2))
          : Math.min(6500, Math.max(440, count * 14))
        const start = performance.now()
        const loop = (now: number) => {
          if (cancelled) return resolve()
          const progress = Math.min(1, (now - start) / duration)
          const position = Math.min(count - 1, progress * Math.max(0, count - 1))
          const index = Math.floor(position)
          const part = position - index
          const a = points[index]
          const b = points[Math.min(count - 1, index + 1)]
          const sameLine = a.lineIndex === b.lineIndex
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
      // Avoid 0px-height quill/pot images on a visitor's first load.
      // Image decoding is independent of the animations and is cached later.
      await Promise.all([pot, quill].map(img => {
        if (img.complete) return Promise.resolve()
        // A broken image/slow connection must not stall the article forever.
        return Promise.race([
          img.decode().catch(() => undefined),
          new Promise<void>(resolve => window.setTimeout(resolve, 1400)),
        ])
      }))
      if (cancelled) return
      // Preserve the existing parchment/roller opening and their exact geometry.
      const height = Math.max(paper.scrollHeight, 330)
      paper.style.height = '0px'
      paper.style.overflow = 'hidden'
      text.style.visibility = 'hidden'
      pot.style.opacity = '0'
      quill.style.opacity = '0'
      spark.style.opacity = '0'
      // Animate title + short description + EVERY actual body text container.
      // Rich CMS content may be nested inside div/strong/span tags, not just <p>.
      // The previous selector skipped body text in these structures.
      const collectWritingBlocks = (): HTMLElement[] => {
        const found: HTMLElement[] = []
        const title = text.querySelector<HTMLElement>(':scope > h2')
        const excerpt = text.querySelector<HTMLElement>(':scope > .original-scroll-excerpt')
        if (title?.textContent?.trim()) found.push(title)
        if (excerpt?.textContent?.trim()) found.push(excerpt)

        const bodyRoot = text.querySelector<HTMLElement>('[data-magical-article-body]')
        if (!bodyRoot) return found

        const textNodes = document.createTreeWalker(bodyRoot, NodeFilter.SHOW_TEXT)
        const containers: HTMLElement[] = []
        const seen = new Set<HTMLElement>()
        const textBlockSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,div,pre,td,th'
        let current: Node | null
        while ((current = textNodes.nextNode())) {
          if (!current.textContent?.trim()) continue
          const parent = (current as Text).parentElement
          if (!parent) continue
          const container = parent.closest<HTMLElement>(textBlockSelector) ?? bodyRoot
          if (!bodyRoot.contains(container) || seen.has(container)) continue
          seen.add(container)
          containers.push(container)
        }

        // Some rich HTML mixes plain text and nested paragraphs. Animate the
        // containing block once, rather than hiding/revealing nested blocks twice.
        const topLevelContainers = containers.filter(
          item => !containers.some(other => other !== item && other.contains(item))
        )
        found.push(...topLevelContainers)

        // Covers plain-text posts and any unusual HTML that still has readable text.
        if (!topLevelContainers.length && bodyRoot.textContent?.trim()) {
          found.push(bodyRoot)
        }
        return found
      }
      const blocks = collectWritingBlocks()
      // If this article/page was opened before, show the COMPLETE finished text
      // immediately. No paper, feather-flight or letter-writing animation again.
      if (seenBefore || reduced) {
        paper.style.height = 'auto'
        paper.style.overflow = 'visible'
        text.style.visibility = 'visible'
        text.querySelectorAll<HTMLElement>('*').forEach(el => {
          el.style.opacity = ''
          el.style.clipPath = ''
          el.style.willChange = ''
        })
        pot.style.opacity = '1'
        restorePotRest()
        quill.style.opacity = '1'
        runCompleted = true
        setOpened(true)
        return
      }
      await unfoldPaperOnce(height, 2200)
      if (cancelled) return
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      setOpened(true)
      await animate(pot, [{opacity: 0}, {opacity: 1}], 650)
      if (cancelled) return

      // Start the flight from exactly the same approved resting pose.
      restorePotRest()
      quill.style.opacity = '1'
      blocks.forEach(node => {node.style.opacity = '0'; node.style.clipPath = 'inset(0 0 100% 0)'})
      text.style.visibility = 'visible'
      await delay(100)
      if (cancelled) return
      for (const block of blocks) {
        if (cancelled) return
        // Body prose is deliberately faster than the title, excerpt, and any
        // H1–H6 heading inside the article/page. Speeds share the SAME nib path.
        const bodyRoot = text.querySelector<HTMLElement>('[data-magical-article-body]')
        const inBody = Boolean(bodyRoot?.contains(block))
        const hasHeading = /^H[1-6]$/.test(block.tagName) || Boolean(block.querySelector('h1,h2,h3,h4,h5,h6'))
        const fastBody = inBody && !hasHeading
        const points = measureInkPoints(block)
        // Fly directly to the first actual Urdu glyph, not to an approximate paragraph corner.
        const r = block.getBoundingClientRect()
        const first = points[0]
        await move(first?.x ?? r.right - 9, first?.y ?? r.top + Math.min(r.height * .6, 30), fastBody ? 120 : 240)
        if (cancelled) return
        engraveActive = true
        await revealWhileWriting(block, points, fastBody)
        engraveActive = false
        if (cancelled) return
        await delay(fastBody ? 12 : 35)
      }
      if (cancelled) return
      const mouth = pot.getBoundingClientRect()
      await swingHome(mouth.left + mouth.width * .52, mouth.top + mouth.height * .43)
      spark.style.opacity = '0'
      if (cancelled) return
      engraveActive = false
      restorePotRest()
      runCompleted = true
      openedScrollKeys.add(visitKey)
    }

    // Never let a stalled frame, image or animation promise keep the post blank.
    // Watch progress only when the tab is visible (background rAF is paused).
    const revealSafely = () => {
      if (cancelled || runCompleted) return
      runCompleted = true
      cancelled = true
      frameIds.forEach(id => cancelAnimationFrame(id))
      animations.forEach(animation => animation.cancel())
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      text.style.visibility = 'visible'
      text.querySelectorAll<HTMLElement>('*').forEach(node => {
        if (node.style.opacity === '0') node.style.opacity = '1'
        if (node.style.clipPath) node.style.clipPath = 'none'
      })
      pot.style.opacity = '1'
      quill.style.opacity = '1'
      engraveActive = false
      spark.style.opacity = '0'
      try { restorePotRest() } catch { /* show text even if an asset is missing */ }
      setOpened(true)
    }
    const safetyMonitor = window.setInterval(() => {
      if (!runCompleted && !cancelled && document.visibilityState === 'visible' &&
          performance.now() - lastAnimationHeartbeat > 6500) {
        revealSafely()
      }
    }, 1000)
    void run().catch(error => {
      if (cancelled || runCompleted) return
      console.error('Magical Scroll writing animation:', error)
      revealSafely()
    })
    return () => {
      cancelled = true
      window.clearInterval(safetyMonitor)
      frameIds.forEach(id => cancelAnimationFrame(id))
      timerIds.forEach(id => clearTimeout(id))
      animations.forEach(animation => animation.cancel())
      cancelAnimationFrame(dustFrame)
      filings.length = 0
    }
  }, [article.id, article.body, article.title, article.excerpt, visitEpoch])

  return (
    <>
    <article dir="rtl" lang="ur" className="original-mashkeeza-scroll" aria-label={article.title}>
      <div ref={stageRef} className="original-scroll-stage">
        <div className="original-scroll-assembly">
          <img className="original-scroll-roller" src="/magical-scroll/top-roller.png" alt="" draggable={false}/>
          <div ref={paperRef} className="original-scroll-paper" style={{'--paper-opacity': opacity} as CSSProperties}>
            <div className="original-scroll-paper-surface">
              <div ref={textRef} className="original-scroll-writing">
                <h2>{article.title}</h2>
                {article.excerpt && <p className="original-scroll-excerpt">{article.excerpt}</p>}
                <div data-magical-article-body="true">
                  <ArticleRichBody body={article.body}/>
                </div>
              </div>
            </div>
          </div>
          <div className="original-scroll-bottom-mount" aria-hidden="true">
            <img className="original-scroll-roller original-scroll-bottom-roller" src="/magical-scroll/bottom-roller.png" alt="" draggable={false}/>
          </div>
        </div>
        <span className="original-scroll-sparkles" aria-hidden="true">✦ ✧ ✦</span>
        <img ref={potRef} className="original-scroll-pot" src="/magical-scroll/inkpot.png" alt="" draggable={false}/>
        {/* Independent, lightweight blue-flame shimmer. No JS animation loop or feather edits. */}
        <svg
          className={`original-scroll-flame-overlay${opened ? ' is-open' : ''}`}
          viewBox="0 0 180 255"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mashkeeza-flame-light" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#20b4ff" stopOpacity=".54" />
              <stop offset="45%" stopColor="#84e6ff" stopOpacity=".42" />
              <stop offset="100%" stopColor="#9a83ff" stopOpacity=".06" />
            </linearGradient>
          </defs>
          <g className="flame-light-waves">
            <path className="flame-stream stream-main" d="M94 106 C124 85 119 69 92 61 C61 57 44 43 58 32 C57 20 85 14 75 3" stroke="url(#mashkeeza-flame-light)" strokeWidth="3.2" fill="none" />
            <path className="flame-stream stream-inner" d="M96 105 C129 82 109 67 87 61 C59 56 49 41 62 32 C58 22 80 13 77 7" stroke="#99ebff" strokeOpacity=".25" strokeWidth="1.25" fill="none" />
          </g>
          <g className="flame-floating-stars">
            <circle r="1.6" fill="#dbfaff">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M94 106 C124 85 119 69 92 61 C61 57 44 43 58 32 C57 20 85 14 75 3"/>
              <animate attributeName="opacity" values="0;.60;.44;0" dur="3.5s" repeatCount="indefinite"/>
            </circle>
            <circle r="1.2" fill="#c0aaff">
              <animateMotion dur="4.1s" begin="-1.6s" repeatCount="indefinite" path="M94 106 C124 85 119 69 92 61 C61 57 44 43 58 32 C57 20 85 14 75 3"/>
              <animate attributeName="opacity" values="0;.42;.32;0" dur="4.1s" repeatCount="indefinite"/>
            </circle>
          </g>
        </svg>
        <img ref={quillRef} className="original-scroll-quill" src="/magical-scroll/quill.webp" alt="" draggable={false}/>
        <span ref={sparkleRef} className="original-scroll-nib-sparks" aria-hidden="true"><i/><i/><i/><i/><i/></span>
        <canvas ref={engravingCanvasRef} className="original-scroll-engraving-dust" aria-hidden="true" />
        {opened && <span className="sr-only">Scroll opened</span>}
      </div>
    </article>
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
        .original-scroll-flame-overlay{position:absolute;right:1%;bottom:0;width:19.15%;height:auto;aspect-ratio:180 / 255;z-index:1001;pointer-events:none;overflow:visible;opacity:0;mix-blend-mode:screen;transition:opacity 1.3s ease}
        .original-scroll-flame-overlay.is-open{opacity:.7}
        .original-scroll-flame-overlay .flame-light-waves{transform-origin:50% 42%;animation:inkFlameBreathe 3.1s ease-in-out infinite alternate}
        .original-scroll-flame-overlay .flame-stream{stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 3;animation:inkFlameFlow 4.3s linear infinite}
        .original-scroll-flame-overlay .stream-main{filter:drop-shadow(0 0 3px #5abaff88)}
        .original-scroll-flame-overlay .stream-inner{animation-duration:3.1s;animation-direction:reverse}
        @keyframes inkFlameBreathe{from{opacity:.38;transform:translate(-1px,1px) rotate(-1deg)}to{opacity:.83;transform:translate(1px,-1.5px) rotate(1.5deg)}}
        @keyframes inkFlameFlow{to{stroke-dashoffset:-64}}
        .original-scroll-quill{position:absolute;z-index:1100;left:0;top:0;width:17%;height:auto;opacity:0;pointer-events:none;filter:drop-shadow(5px 7px 5px #321b1280);will-change:transform;transform-origin:1.4% 99.3%}
        /* Light, localized engraving flecks — separate from the feather's z-index. */
        .original-scroll-engraving-dust{position:absolute;left:0;top:0;width:120px;height:120px;z-index:1250;pointer-events:none;overflow:visible;will-change:transform}
        /* Small, soft sparks follow the ACTUAL nib; not the top of the feather. */
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
        @media(prefers-reduced-motion:reduce){.original-scroll-writing{visibility:visible}.original-scroll-sparkles,.original-scroll-nib-sparks i,.original-scroll-flame-overlay .flame-light-waves,.original-scroll-flame-overlay .flame-stream{animation:none}.original-scroll-flame-overlay .flame-floating-stars{display:none}}
      `}</style>
    </>
  )
}

