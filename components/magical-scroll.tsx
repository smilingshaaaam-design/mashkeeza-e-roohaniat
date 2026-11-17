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
// Keeps consecutive completed flights from choosing the same choreography.
let lastFeatherFlightStyle = -1

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
    const dustCanvas = engravingCanvasRef.current
    if (!stage || !paper || !text || !quill || !pot || !spark || !dustCanvas) return

    let cancelled = false
    let completed = false
    let lastProgress = performance.now()
    let activeFrame = 0
    let activeTimeout = 0
    let finishPending: (() => void) | null = null
    let dustFrame = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const visitKey = `mashkeeza:magical-scroll:seen:v1:${article.content_type === 'page' ? 'page' : 'article'}:${article.id}`
    const previouslyOpened = openedScrollKeys.has(visitKey)
    const ease = (n: number) => n * n * (3 - 2 * n)
    const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
    const rectOfStage = () => stage.getBoundingClientRect()

    // The user-approved inkpot coordinates MUST NOT drift between start/end.
    // These values come from the last correctly aligned build.
    const approvedRightShift = Math.max(0, Math.min(96, stage.clientWidth * .15) - 10)
    let quillWidth = 0, quillHeight = 0
    let featherX = 0, featherY = 0
    let engraved = false
    let inkX = 0, inkY = 0
    const ctx = dustCanvas.getContext('2d', { alpha: true })
    const dpi = Math.min(window.devicePixelRatio || 1, 2)
    dustCanvas.width = Math.round(120 * dpi)
    dustCanvas.height = Math.round(120 * dpi)
    ctx?.setTransform(dpi, 0, 0, dpi, 0, 0)
    type Fleck = { x: number; y: number; vx: number; vy: number; born: number; ttl: number; color: string; size: number }
    const flecks: Fleck[] = []
    const colours = ['#ffe38a', '#ffb347', '#f7a3e9', '#d29aff', '#9e8eff', '#62caff', '#dbf7ff']
    let lastEmission = 0
    let lastNibX = NaN, lastNibY = NaN

    const drawFlecks = (time: number) => {
      dustFrame = 0
      if (cancelled || !ctx) return
      ctx.clearRect(0, 0, 120, 120)
      for (let i = flecks.length - 1; i >= 0; i--) {
        const particle = flecks[i]
        const life = (time - particle.born) / particle.ttl
        if (life >= 1) { flecks.splice(i, 1); continue }
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += .04
        particle.vx *= .98
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.strokeStyle = particle.color
        ctx.globalAlpha = .83 * Math.pow(1 - life, 1.35)
        ctx.lineWidth = 1.18
        ctx.shadowColor = particle.color
        ctx.shadowBlur = 8
        const r = particle.size * (1 - life * .4)
        ctx.beginPath()
        ctx.moveTo(-r, 0); ctx.lineTo(r, 0)
        ctx.moveTo(0, -r); ctx.lineTo(0, r)
        ctx.stroke()
        ctx.restore()
      }
      if (flecks.length && !cancelled) dustFrame = requestAnimationFrame(drawFlecks)
    }
    const drawAtNib = (x: number, y: number) => {
      dustCanvas.style.transform = `translate3d(${x - 60}px,${y - 60}px,0)`
      if (Number.isFinite(lastNibX)) {
        const dx = x - lastNibX, dy = y - lastNibY
        for (const f of flecks) { f.x -= dx; f.y -= dy }
      }
      lastNibX = x; lastNibY = y
      if (!engraved || !ctx) return
      const now = performance.now()
      if (now - lastEmission < 24) return
      lastEmission = now
      for (let i = 0; i < 7 && flecks.length < 88; i++) {
        flecks.push({
          x: 60 + (Math.random() - .5) * 5,
          y: 60 + (Math.random() - .5) * 5,
          vx: (Math.random() - .5) * 3.8,
          vy: -(.55 + Math.random() * 1.85),
          born: now,
          ttl: 420 + Math.random() * 360,
          color: colours[Math.floor(Math.random() * colours.length)],
          size: 1.9 + Math.random() * 3.05,
        })
      }
      if (!dustFrame) dustFrame = requestAnimationFrame(drawFlecks)
    }

    // Feather transform origin is the nib itself (1.4% / 99.3%). Keeping
    // width/height cached avoids layout reads on every animation frame.
    const setPose = (x: number, y: number, angle = 0) => {
      featherX = x; featherY = y
      quill.dataset.x = String(x)
      quill.dataset.y = String(y)
      quill.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle}deg)`
      const nibX = x + quillWidth * .014
      const nibY = y + quillHeight * .993
      spark.style.transform = `translate3d(${nibX - 11}px,${nibY - 12}px,0)`
      drawAtNib(nibX, nibY)
    }
    const resolveReadyRest = () => {
      const stageRect = rectOfStage()
      const potRect = pot.getBoundingClientRect()
      // This is the EXACT formula accepted before the later buggy revisions.
      const x = clamp(potRect.left + potRect.width * .52 - stageRect.left - quillWidth * .014,
        0, stageRect.width - quillWidth - 8) + approvedRightShift
      const y = Math.max(0, potRect.top + potRect.height * .43 - stageRect.top - quillHeight * .993)
      return { x, y }
    }
    const landAtApprovedRest = () => {
      const rest = resolveReadyRest()
      setPose(rest.x, rest.y, 0)
      engraved = false
      spark.style.opacity = '0'
    }
    const toPoseFromPage = (pageX: number, pageY: number) => {
      const stageRect = rectOfStage()
      return {
        // Do NOT clamp the nib to 0: headings near the top of the parchment
        // need a negative feather top-left so the nib can actually touch them.
        // The parent layers already use overflow:visible.
        x: pageX - stageRect.left - quillWidth * .014,
        y: pageY - stageRect.top - quillHeight * .993,
      }
    }

    const tween = (duration: number, frame: (t: number) => void) =>
      new Promise<void>((resolve, reject) => {
        if (cancelled) { resolve(); return }
        const start = performance.now()
        let settled = false
        const end = (error?: unknown) => {
          if (settled) return
          settled = true
          finishPending = null
          if (error) reject(error)
          else resolve()
        }
        finishPending = () => end()
        const tick = (now: number) => {
          if (cancelled) return end()
          const t = clamp((now - start) / Math.max(1, duration), 0, 1)
          try { frame(t) } catch (error) { end(error); return }
          lastProgress = now
          if (t < 1) activeFrame = requestAnimationFrame(tick)
          else { activeFrame = 0; end() }
        }
        activeFrame = requestAnimationFrame(tick)
      })
    const pause = (ms: number) => new Promise<void>(resolve => {
      if (cancelled) return resolve()
      activeTimeout = window.setTimeout(() => { activeTimeout = 0; resolve() }, ms)
    })
    const moveTo = async (destination: { x: number; y: number }, duration: number) => {
      const sx = featherX, sy = featherY
      engraved = true
      spark.style.opacity = '.68'
      await tween(duration, t => {
        const e = ease(t)
        const bump = Math.sin(Math.PI * t)
        // Arc and rotation are pinned to the nib, not to the feather centre.
        setPose(sx + (destination.x - sx) * e,
          sy + (destination.y - sy) * e - bump * Math.min(13, duration * .018),
          bump * Math.sin(t * Math.PI * 2) * 6)
      })
      if (!cancelled) setPose(destination.x, destination.y, 0)
    }
    const unfold = async () => {
      const height = Math.max(paper.scrollHeight, 330)
      paper.style.height = '0px'
      paper.style.overflow = 'hidden'
      await tween(1850, t => { paper.style.height = `${height * (1 - Math.pow(1 - t, 3))}px` })
      if (cancelled) return
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      setOpened(true)
    }
    const showAll = () => {
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      text.style.visibility = 'visible'
      for (const element of Array.from(text.querySelectorAll<HTMLElement>('*'))) {
        element.style.opacity = ''
        element.style.clipPath = ''
        element.style.willChange = ''
      }
      pot.style.opacity = '1'
      quill.style.opacity = '1'
      try { landAtApprovedRest() } catch { /* Never hide the writing. */ }
      setOpened(true)
    }

    const getBlocks = (): HTMLElement[] => {
      const result: HTMLElement[] = []
      const title = text.querySelector<HTMLElement>(':scope > h2')
      const excerpt = text.querySelector<HTMLElement>(':scope > .original-scroll-excerpt')
      if (title?.textContent?.trim()) result.push(title)
      if (excerpt?.textContent?.trim()) result.push(excerpt)
      const bodyRoot = text.querySelector<HTMLElement>('[data-magical-article-body]')
      if (!bodyRoot) return result
      const walker = document.createTreeWalker(bodyRoot, NodeFilter.SHOW_TEXT)
      const selector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,th,div'
      const candidates: HTMLElement[] = []
      let node: Node | null
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue
        const parent = (node as Text).parentElement
        const element = parent?.closest<HTMLElement>(selector) ?? bodyRoot
        if (element && bodyRoot.contains(element) && !candidates.includes(element)) candidates.push(element)
      }
      const outer = candidates.filter(item => !candidates.some(other => item !== other && other.contains(item)))
      result.push(...(outer.length ? outer : (bodyRoot.textContent?.trim() ? [bodyRoot] : [])))
      return result
    }
    type InkGlyph = { x: number; y: number }
    type InkLine = { top: number; bottom: number; points: InkGlyph[]; letters: number }
    // Sample actual rendered grapheme positions with a bounded number of
    // Range queries. This is 10-100x cheaper on very long Nastaliq posts.
    const measureLines = (block: HTMLElement): InkLine[] => {
      const box = block.getBoundingClientRect()
      if (box.width < 2 || box.height < 2) return []
      const samples: { left: number; right: number; top: number; bottom: number }[] = []
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      let node: Node | null
      let chars = 0
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue
        const txt = node as Text
        nodes.push(txt)
        chars += txt.data.length
      }
      const stride = Math.max(1, Math.ceil(chars / 320))
      const mark = /[\p{M}\u200C\u200D]/u
      const range = document.createRange()
      for (const txt of nodes) {
        let offset = 0
        const units: {start: number; end: number}[] = []
        for (const ch of txt.data) {
          const previous = units[units.length - 1]
          if (previous && mark.test(ch)) previous.end += ch.length
          else units.push({start: offset, end: offset + ch.length})
          offset += ch.length
        }
        for (let i = 0; i < units.length; i += stride) {
          const unit = units[i]
          if (!txt.data.slice(unit.start, unit.end).trim()) continue
          range.setStart(txt, unit.start)
          range.setEnd(txt, unit.end)
          for (const r of Array.from(range.getClientRects())) {
            if (r.width > .2 && r.height > 1) {
              samples.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom})
              break
            }
          }
        }
        // Add the last stroke when sampling skips final letters.
        if (stride > 1 && units.length) {
          const end = units[units.length - 1]
          range.setStart(txt, end.start)
          range.setEnd(txt, end.end)
          const r = Array.from(range.getClientRects()).find(r => r.width > .2)
          if (r) samples.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom})
        }
      }
      range.detach()
      if (!samples.length) return []
      const style = window.getComputedStyle(block)
      const lh = Number.parseFloat(style.lineHeight)
      const tolerance = clamp((Number.isFinite(lh) ? lh : 46) * .36, 12, 31)
      const rows: {middle: number; rects: typeof samples}[] = []
      for (const r of samples.sort((a,b) => (a.top+a.bottom)-(b.top+b.bottom))) {
        const mid = (r.top + r.bottom) / 2
        const row = rows.find(line => Math.abs(line.middle - mid) <= tolerance)
        if (!row) rows.push({middle:mid,rects:[r]})
        else { row.rects.push(r); row.middle += (mid - row.middle) / row.rects.length }
      }
      rows.sort((a,b) => a.middle - b.middle)
      const lines: InkLine[] = []
      for (const row of rows) {
        row.rects.sort((a,b) => b.right - a.right)
        const xs = [row.rects[0].right, ...row.rects.map(r => r.left)]
        const dedup = xs.filter((x,i) => i === 0 || Math.abs(x-xs[i-1]) > .7)
        const top = clamp(Math.min(...row.rects.map(r=>r.top)) - box.top - 3,0,box.height)
        const bottom = clamp(Math.max(...row.rects.map(r=>r.bottom)) - box.top + 3,top+1,box.height)
        const baseline = box.top + top + (bottom - top) * .78
        lines.push({
          top, bottom, letters: Math.max(1, row.rects.length * stride),
          points: dedup.map(x=>({x,y:baseline})),
        })
      }
      return lines
    }
    const writeBlock = async (block: HTMLElement, fast: boolean) => {
      const lines = measureLines(block)
      const r = block.getBoundingClientRect()
      if (!lines.length) {block.style.clipPath='none';block.style.opacity='1';return}
      const first = toPoseFromPage(lines[0].points[0].x,lines[0].points[0].y)
      await moveTo(first, fast ? 180 : 285)
      if (cancelled) return
      block.style.opacity='1'
      for (const line of lines) {
        if (cancelled) return
        const pts = line.points
        const from = toPoseFromPage(pts[0].x,pts[0].y)
        // Flying to the next line is separate from the writing stroke.
        if (Math.abs(featherX-from.x) + Math.abs(featherY-from.y) > 9) await moveTo(from,fast ? 80 : 120)
        const duration = clamp(line.letters * (fast ? 8 : 18),fast ? 155 : 245,fast ? 1150 : 2070)
        engraved = true
        spark.style.opacity='.80'
        // Fixed stage geometry throughout each stroke: no forced layout read
        // per animation frame, which was causing the feather to stutter.
        const strokeStage = rectOfStage()
        await tween(duration, t => {
          const index = t * Math.max(0,pts.length-1)
          const before = Math.floor(index)
          const fraction = index - before
          const p = pts[before]
          const next = pts[Math.min(pts.length-1,before+1)]
          const x = p.x + (next.x - p.x) * fraction
          const y = p.y + (next.y - p.y) * fraction
          const nibX = x - strokeStage.left - quillWidth * .014
          const nibY = y - strokeStage.top - quillHeight * .993
          // No independent XY wave: feather nib exactly matches reveal edge.
          setPose(nibX,nibY,Math.sin(t * Math.PI * 6)*4.1)
          const edgeX = clamp(x-r.left,0,r.width)
          const endY = clamp(line.bottom,0,r.height)
          const startY = clamp(line.top,0,endY)
          block.style.clipPath = `polygon(0 0,100% 0,100% ${endY}px,${edgeX}px ${endY}px,${edgeX}px ${startY}px,0 ${startY}px)`
        })
        if (cancelled) return
      }
      block.style.clipPath = 'none'
      block.style.opacity = '1'
      block.style.willChange = ''
    }

    const swingHome = async () => {
      // KEEP the exact, user-approved resting point. No modifications to
      // resolveReadyRest(), landAtApprovedRest(), or the final landing pose.
      const home = resolveReadyRest()
      const stageWidth = stage.clientWidth
      const stageHeight = Math.max(stage.clientHeight, 420)

      // Seventeen controlled, visibly different flying styles. Every curve
      // begins and ends at the same waypoints, so nothing can move the rest point.
      type FlightStyle = {
        name: string
        kind: number
        amplitudeX: number
        amplitudeY: number
        turns: number
        rotation: number
        speed: number
      }
      const flightStyles: FlightStyle[] = [
        {name:'Silk Sway',       kind:0,  amplitudeX:16, amplitudeY:14, turns:1.0, rotation: 8, speed:1.03},
        {name:'Moon Crescent',   kind:1,  amplitudeX:22, amplitudeY:26, turns:1.0, rotation:11, speed:1.10},
        {name:'Double Ribbon',   kind:2,  amplitudeX:24, amplitudeY:21, turns:2.0, rotation:14, speed: .96},
        {name:'Amber Spiral',    kind:3,  amplitudeX:24, amplitudeY:25, turns:2.0, rotation:16, speed:1.15},
        {name:'Floating Eight',  kind:4,  amplitudeX:30, amplitudeY:19, turns:2.0, rotation:18, speed:1.08},
        {name:'Soft Zigzag',     kind:5,  amplitudeX:21, amplitudeY:24, turns:3.0, rotation:13, speed: .95},
        {name:'Celestial Wave',  kind:6,  amplitudeX:25, amplitudeY:28, turns:1.5, rotation:12, speed:1.06},
        {name:'Sapphire Loop',   kind:7,  amplitudeX:33, amplitudeY:26, turns:1.0, rotation:20, speed:1.13},
        {name:'Golden Comet',    kind:8,  amplitudeX:18, amplitudeY:33, turns:1.0, rotation:10, speed: .88},
        {name:'Violet Waltz',    kind:9,  amplitudeX:27, amplitudeY:22, turns:2.5, rotation:17, speed:1.12},
        {name:'Gentle Hover',    kind:10, amplitudeX:19, amplitudeY:18, turns:3.0, rotation: 9, speed:1.22},
        {name:'Mystic S-Curve',  kind:11, amplitudeX:32, amplitudeY:24, turns:1.5, rotation:18, speed:1.00},
        {name:'Twin Crescents',  kind:12, amplitudeX:24, amplitudeY:33, turns:2.0, rotation:16, speed:1.09},
        {name:'Pearl Orbit',     kind:13, amplitudeX:31, amplitudeY:26, turns:3.0, rotation:19, speed:1.14},
        {name:'Royal Glide',     kind:14, amplitudeX:16, amplitudeY:30, turns:1.0, rotation:10, speed: .92},
        {name:'Starlit Ribbon',  kind:15, amplitudeX:34, amplitudeY:21, turns:2.5, rotation:20, speed:1.08},
        {name:'Dreaming Flame',  kind:16, amplitudeX:22, amplitudeY:32, turns:3.5, rotation:15, speed:1.18},
      ]
      // Select a new style on EVERY completed-post flight. Avoid immediate repeats.
      const nextIndex = lastFeatherFlightStyle < 0
        ? Math.floor(Math.random() * flightStyles.length)
        : (lastFeatherFlightStyle + 1 + Math.floor(Math.random() * (flightStyles.length - 1))) % flightStyles.length
      lastFeatherFlightStyle = nextIndex
      const style = flightStyles[nextIndex]
      const TAU = Math.PI * 2

      // All perturbations are multiplied by sin(pi*t), which becomes exactly
      // zero at t=0 and t=1: seamless segment endpoints, no landing jump.
      const scenicMove = async (
        from: { x: number; y: number },
        to: { x: number; y: number },
        duration: number,
        segment: number,
      ) => {
        await tween(Math.round(duration * style.speed), t => {
          const e = ease(t)
          const envelope = Math.sin(Math.PI * t)
          const phase = TAU * style.turns * t + segment * .8
          let wx = 0
          let wy = 0
          switch (style.kind) {
            case 0:  wx = Math.sin(phase); wy = -.6 * Math.sin(Math.PI * t); break
            case 1:  wx = .45 * Math.sin(phase); wy = -1.25 * Math.sin(Math.PI * t); break
            case 2:  wx = Math.sin(phase * 2); wy = .7 * Math.cos(phase); break
            case 3:  wx = Math.cos(phase); wy = Math.sin(phase); break
            case 4:  wx = Math.sin(phase); wy = .8 * Math.sin(phase * 2); break
            case 5:  wx = Math.sin(phase * 2.2); wy = .7 * Math.cos(phase * 1.2); break
            case 6:  wx = .65 * Math.sin(phase); wy = -1.15 * Math.sin(Math.PI * t) + .25 * Math.cos(phase); break
            case 7:  wx = Math.cos(phase * .9); wy = Math.sin(phase * 1.3); break
            case 8:  wx = .55 * Math.sin(phase); wy = -1.3 * Math.sin(Math.PI * t); break
            case 9:  wx = Math.sin(phase) + .25 * Math.sin(phase * 2); wy = Math.cos(phase * .8); break
            case 10: wx = .45 * Math.cos(phase * 1.6); wy = .55 * Math.sin(phase * 2); break
            case 11: wx = Math.sin(phase * .8) + .35 * Math.sin(phase * 2.5); wy = .8 * Math.cos(phase); break
            case 12: wx = Math.sin(phase * 2); wy = -1.1 * Math.abs(Math.sin(phase * .7)); break
            case 13: wx = Math.cos(phase * 1.3); wy = Math.sin(phase * 1.7); break
            case 14: wx = .45 * Math.sin(phase); wy = -1.2 * Math.sin(Math.PI * t) + .2 * Math.cos(phase); break
            case 15: wx = Math.sin(phase * 1.4); wy = .6 * Math.sin(phase * 2.2); break
            default: wx = .7 * Math.sin(phase) + .3 * Math.sin(phase * 3); wy = Math.cos(phase * 1.4); break
          }
          const flutter = Math.sin(phase * 1.15) * style.rotation * envelope
          setPose(
            from.x + (to.x - from.x) * e + wx * style.amplitudeX * envelope,
            from.y + (to.y - from.y) * e + wy * style.amplitudeY * envelope,
            flutter,
          )
        })
        if (!cancelled) setPose(to.x, to.y, 0)
      }

      // The requested route is ALWAYS preserved: left -> top -> right -> pot.
      const leftWaypoint = {
        x: Math.max(-quillWidth * .06, stageWidth * .11 - quillWidth * .18),
        y: clamp(home.y - Math.min(48, stageHeight * .08), 18, stageHeight * .72),
      }
      const topWaypoint = {
        x: clamp(stageWidth * .44 - quillWidth * .12, -quillWidth * .04, stageWidth - quillWidth - 8),
        y: Math.max(-quillHeight * .24, 2),
      }
      const rightWaypoint = {
        x: clamp(stageWidth * .82 - quillWidth * .1, 0, stageWidth - quillWidth - 8),
        y: clamp(home.y - Math.min(86, stageHeight * .16), 12, stageHeight * .68),
      }

      // Writing sparkle engine follows the ACTUAL feather nib throughout flight.
      engraved = true
      spark.style.opacity = '.96'
      const start = { x: featherX, y: featherY }
      await scenicMove(start, leftWaypoint, 760, 0)
      if (cancelled) return
      await scenicMove(leftWaypoint, topWaypoint, 720, 1)
      if (cancelled) return
      await scenicMove(topWaypoint, rightWaypoint, 840, 2)
      if (cancelled) return
      await scenicMove(rightWaypoint, home, 620, 3)

      if (!cancelled) {
        // EXACT final resting coordinates + angle, irrespective of flight style.
        setPose(home.x,home.y,0)
        engraved = false
        spark.style.opacity='0'
      }
    }

    const run = async () => {
      // Load first, then perform ONE transition. Never animate from an
      // undefined image size and never repeat the roll-opening phase.
      await Promise.race([
        Promise.all([pot,quill].map(img => img.decode().catch(() => undefined))),
        new Promise<void>(resolve => window.setTimeout(resolve, 1700)),
      ])
      if (cancelled) return
      await Promise.race([document.fonts.ready,new Promise<void>(resolve => window.setTimeout(resolve, 1400))])
      if (cancelled) return
      quillWidth = quill.offsetWidth
      quillHeight = quill.offsetHeight
      const blocks = getBlocks()
      if (previouslyOpened || reduced) {
        showAll()
        completed = true
        return
      }
      text.style.visibility = 'hidden'
      pot.style.opacity = '0'
      quill.style.opacity = '0'
      spark.style.opacity = '0'
      await unfold()
      if (cancelled) return
      // Fade in the inkpot, independent of the quill animation.
      await tween(390, t => {pot.style.opacity = String(t)})
      if (cancelled) return
      landAtApprovedRest()
      quill.style.opacity = '1'
      for (const block of blocks) {
        block.style.opacity = '0'
        block.style.clipPath = 'inset(0 0 100% 0)'
      }
      text.style.visibility='visible'
      await pause(70)
      if (cancelled) return
      for (const block of blocks) {
        if (cancelled) return
        const bodyRoot = text.querySelector<HTMLElement>('[data-magical-article-body]')
        const inBody = Boolean(bodyRoot?.contains(block))
        const heading = /^H[1-6]$/.test(block.tagName) || Boolean(block.querySelector('h1,h2,h3,h4,h5,h6'))
        await writeBlock(block,inBody && !heading)
        if (cancelled) return
        await pause(55)
      }
      if (cancelled) return
      await swingHome()
      if (cancelled) return
      showAll()
      completed = true
      openedScrollKeys.add(visitKey)
    }
    const failSafe = () => {
      if (cancelled || completed) return
      cancelled = true
      cancelAnimationFrame(activeFrame)
      cancelAnimationFrame(dustFrame)
      window.clearTimeout(activeTimeout)
      finishPending?.()
      showAll()
    }
    const watchdog = window.setInterval(() => {
      // On an inactive tab rAF is suspended: do not mistake that for a freeze.
      if (!cancelled && !completed && document.visibilityState === 'visible' &&
        performance.now() - lastProgress > 8000) failSafe()
    }, 900)
    void run().catch(error => {
      if (cancelled || completed) return
      console.error('Magical Scroll animation error:',error)
      failSafe()
    })
    return () => {
      cancelled = true
      window.clearInterval(watchdog)
      window.clearTimeout(activeTimeout)
      cancelAnimationFrame(activeFrame)
      cancelAnimationFrame(dustFrame)
      finishPending?.()
      flecks.length=0
    }
  }, [article.id,article.body,article.title,article.excerpt,visitEpoch])

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
        <img ref={potRef} className="original-scroll-pot" src="/magical-scroll/inkpot.png" alt="" draggable={false}/>
        {/* Independent, lightweight blue-flame shimmer. No JS animation loop or feather edits. */}
        <svg
          className={`original-scroll-flame-overlay${opened ? ' is-open' : ''}`}
          viewBox="0 0 180 255"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="mashkeeza-pot-core" cx="50%" cy="62%" r="38%">
              <stop offset="0%" stopColor="#fff2b8" stopOpacity=".95" />
              <stop offset="18%" stopColor="#ffcc71" stopOpacity=".85" />
              <stop offset="36%" stopColor="#ff6fd8" stopOpacity=".78" />
              <stop offset="63%" stopColor="#7f6bff" stopOpacity=".68" />
              <stop offset="100%" stopColor="#1fa9ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mashkeeza-pot-halo" cx="50%" cy="62%" r="62%">
              <stop offset="0%" stopColor="#8fd8ff" stopOpacity=".34" />
              <stop offset="52%" stopColor="#925fff" stopOpacity=".20" />
              <stop offset="100%" stopColor="#925fff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="mashkeeza-flame-light" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#20b4ff" stopOpacity=".88" />
              <stop offset="45%" stopColor="#84e6ff" stopOpacity=".70" />
              <stop offset="100%" stopColor="#9a83ff" stopOpacity=".18" />
            </linearGradient>
            <linearGradient id="mashkeeza-ring-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffeeb0" stopOpacity=".98" />
              <stop offset="34%" stopColor="#ffd56f" stopOpacity=".95" />
              <stop offset="68%" stopColor="#ff9b37" stopOpacity=".9" />
              <stop offset="100%" stopColor="#fff3bb" stopOpacity=".96" />
            </linearGradient>
          </defs>

          <g className="pot-energy-core">
            <ellipse cx="89" cy="179" rx="45" ry="32" fill="url(#mashkeeza-pot-halo)" />
            <ellipse cx="89" cy="177" rx="32" ry="23" fill="url(#mashkeeza-pot-core)" />
            <ellipse cx="74" cy="167" rx="14" ry="10" fill="#9de8ff" opacity=".28" />
            <ellipse cx="104" cy="186" rx="15" ry="10" fill="#ff6fd8" opacity=".22" />
            <ellipse cx="88" cy="191" rx="16" ry="9" fill="#ffbf55" opacity=".24" />
          </g>

          <g className="golden-energy-rings">
            <ellipse className="ring ring-back" cx="89" cy="190" rx="55" ry="18" fill="none" stroke="url(#mashkeeza-ring-gold)" strokeWidth="4.1" strokeLinecap="round" strokeDasharray="34 18 20 14" />
            <ellipse className="ring ring-mid" cx="91" cy="182" rx="49" ry="15" fill="none" stroke="url(#mashkeeza-ring-gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray="26 14 18 12" />
            <path className="ring-sweep" d="M40 196 C58 175 87 164 120 168 C138 171 149 178 160 189" fill="none" stroke="url(#mashkeeza-ring-gold)" strokeWidth="4.6" strokeLinecap="round" />
          </g>

          <g className="flame-light-waves">
            <path className="flame-stream stream-main" d="M94 106 C124 85 119 69 92 61 C61 57 44 43 58 32 C57 20 85 14 75 3" stroke="url(#mashkeeza-flame-light)" strokeWidth="4.3" fill="none" />
            <path className="flame-stream stream-second" d="M86 107 C112 87 111 72 92 63 C69 56 57 46 64 34 C65 22 84 17 82 7" stroke="#86e4ff" strokeOpacity=".72" strokeWidth="2.2" fill="none" />
            <path className="flame-stream stream-inner" d="M98 106 C130 84 109 67 87 61 C59 56 49 41 62 32 C58 22 80 13 77 7" stroke="#d7f7ff" strokeOpacity=".44" strokeWidth="1.55" fill="none" />
          </g>

          <g className="flame-particles">
            <circle r="1.8" fill="#dbfaff">
              <animateMotion dur="3.1s" repeatCount="indefinite" path="M94 106 C124 85 119 69 92 61 C61 57 44 43 58 32 C57 20 85 14 75 3"/>
              <animate attributeName="opacity" values="0;.72;.45;0" dur="3.1s" repeatCount="indefinite"/>
            </circle>
            <circle r="1.25" fill="#c0aaff">
              <animateMotion dur="3.7s" begin="-1.4s" repeatCount="indefinite" path="M94 106 C124 85 119 69 92 61 C61 57 44 43 58 32 C57 20 85 14 75 3"/>
              <animate attributeName="opacity" values="0;.56;.30;0" dur="3.7s" repeatCount="indefinite"/>
            </circle>
          </g>
        </svg>
        <img ref={quillRef} className="original-scroll-quill" src="/magical-scroll/quill.webp" alt="" draggable={false}/>
        <span ref={sparkleRef} className="original-scroll-nib-sparks" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></span>
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
        .original-scroll-flame-overlay.is-open{opacity:1}
        .original-scroll-flame-overlay .pot-energy-core{transform-origin:50% 68%;animation:potCorePulse 2.8s ease-in-out infinite alternate}.original-scroll-flame-overlay .golden-energy-rings{transform-origin:50% 72%;filter:drop-shadow(0 0 6px rgba(255,203,96,.52)) drop-shadow(0 0 13px rgba(255,153,55,.35));animation:potRingFloat 3.6s ease-in-out infinite alternate}.original-scroll-flame-overlay .ring{animation:ringDash 4.3s linear infinite}.original-scroll-flame-overlay .ring-mid{animation-duration:3.4s;animation-direction:reverse}.original-scroll-flame-overlay .ring-sweep{filter:drop-shadow(0 0 6px rgba(255,209,110,.55));animation:ringSweep 2.7s ease-in-out infinite alternate}.original-scroll-flame-overlay .flame-light-waves{transform-origin:50% 42%;animation:inkFlameBreathe 2.7s ease-in-out infinite alternate}
        .original-scroll-flame-overlay .flame-stream{stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:6 3;animation:inkFlameFlow 3.5s linear infinite}
        .original-scroll-flame-overlay .stream-main{filter:drop-shadow(0 0 6px #5abaffcc) drop-shadow(0 0 12px #875cff88)}
        .original-scroll-flame-overlay .stream-second{filter:drop-shadow(0 0 4px rgba(110,220,255,.55));animation-duration:2.9s}.original-scroll-flame-overlay .stream-inner{animation-duration:2.4s;animation-direction:reverse}
        @keyframes potCorePulse{from{opacity:.82;transform:scale(.96)}to{opacity:1;transform:scale(1.06)}}@keyframes potRingFloat{from{opacity:.76;transform:translateY(1.5px) scale(.985)}to{opacity:1;transform:translateY(-1.5px) scale(1.02)}}@keyframes ringDash{to{stroke-dashoffset:-92}}@keyframes ringSweep{from{opacity:.68;transform:translateY(0) scale(.985)}to{opacity:1;transform:translateY(-2px) scale(1.02)}}@keyframes inkFlameBreathe{from{opacity:.52;transform:translate(-1px,1px) rotate(-1deg) scale(.985)}to{opacity:1;transform:translate(1.5px,-2px) rotate(1.8deg) scale(1.02)}}
        @keyframes inkFlameFlow{to{stroke-dashoffset:-74}}
        .original-scroll-quill{position:absolute;z-index:1100;left:0;top:0;width:17%;height:auto;opacity:0;pointer-events:none;filter:drop-shadow(5px 7px 5px #321b1280);will-change:transform;transform-origin:1.4% 99.3%}
        /* Light, localized engraving flecks — separate from the feather's z-index. */
        .original-scroll-engraving-dust{position:absolute;left:0;top:0;width:120px;height:120px;z-index:1250;pointer-events:none;overflow:visible;will-change:transform}
        /* Small, soft sparks follow the ACTUAL nib; not the top of the feather. */
        .original-scroll-nib-sparks{position:absolute;left:0;top:0;width:30px;height:30px;z-index:1200;opacity:0;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 0 10px #f7d8a4aa)}
        .original-scroll-nib-sparks i{position:absolute;left:13px;top:13px;width:5px;height:5px;display:block;border-radius:50%;background:#ffeeb4;box-shadow:0 0 10px #efb763cc;animation:subtleNibSpark 1s ease-out infinite}
        .original-scroll-nib-sparks i:nth-child(2){animation-delay:.28s;background:#dd92e5;box-shadow:0 0 5px #c57fe899}
        .original-scroll-nib-sparks i:nth-child(3){animation-delay:.55s;background:#80d5ff;box-shadow:0 0 5px #82caff66}
        .original-scroll-nib-sparks i:nth-child(4){animation-delay:.14s;background:#fff4c1;box-shadow:0 0 4px #fff0a388;animation-duration:.75s}
        .original-scroll-nib-sparks i:nth-child(5){animation-delay:.42s;background:#d29aff;box-shadow:0 0 5px #c47cff99;animation-duration:1.1s}.original-scroll-nib-sparks i:nth-child(6){animation-delay:.62s;background:#ffd17d;box-shadow:0 0 6px #ffb347aa;animation-duration:.88s}.original-scroll-nib-sparks i:nth-child(7){animation-delay:.22s;background:#9ce7ff;box-shadow:0 0 6px #62caffaa;animation-duration:1.18s}
        @keyframes subtleNibSpark{from{transform:translate(0,0) scale(.92);opacity:.96}20%{opacity:1}to{transform:translate(10px,-16px) scale(.14);opacity:0}}
        @media(max-width:640px){.original-scroll-stage{padding-bottom:55px}.original-scroll-paper-surface{min-height:260px;padding:11% 10% 17%}.original-scroll-writing{font-size:clamp(9px,3.6cqw,15px);line-height:2.1}}
        @media(prefers-reduced-motion:reduce){.original-scroll-writing{visibility:visible}.original-scroll-nib-sparks i,.original-scroll-flame-overlay .pot-energy-core,.original-scroll-flame-overlay .golden-energy-rings,.original-scroll-flame-overlay .ring,.original-scroll-flame-overlay .ring-sweep,.original-scroll-flame-overlay .flame-light-waves,.original-scroll-flame-overlay .flame-stream{animation:none}.original-scroll-flame-overlay .flame-particles{display:none}}
      `}</style>
    </>
  )
}
