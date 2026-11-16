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
    const colours = ['#ffe38a', '#f7a3e9', '#9e8eff', '#62caff', '#ffd1a1']
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
        ctx.globalAlpha = .68 * Math.pow(1 - life, 1.4)
        ctx.lineWidth = .85
        ctx.shadowColor = particle.color
        ctx.shadowBlur = 4
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
      if (now - lastEmission < 47) return
      lastEmission = now
      for (let i = 0; i < 3 && flecks.length < 36; i++) {
        flecks.push({
          x: 60 + (Math.random() - .5) * 4,
          y: 60 + (Math.random() - .5) * 4,
          vx: (Math.random() - .5) * 2.5,
          vy: -(.35 + Math.random() * 1.3),
          born: now,
          ttl: 330 + Math.random() * 260,
          color: colours[Math.floor(Math.random() * colours.length)],
          size: 1.3 + Math.random() * 2.2,
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
      spark.style.opacity = '.48'
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
        const duration = clamp(line.letters * (fast ? 9 : 21),fast ? 170 : 280,fast ? 1300 : 2300)
        engraved = true
        spark.style.opacity='.58'
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
          setPose(nibX,nibY,Math.sin(t * Math.PI * 5)*2.8)
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
      // One resting coordinate object for BOTH trajectory end and final pose.
      // No extra +shift, no separate clamp formula, no landing jump.
      const home = resolveReadyRest()
      const sx = featherX, sy = featherY
      const dx = home.x - sx, dy = home.y - sy
      const radiusX = Math.min(62, Math.max(20, stage.clientWidth * .07))
      const radiusY = radiusX * .74
      engraved = true
      spark.style.opacity = '.43'
      await tween(1950, t => {
        const e = ease(t)
        const envelope = Math.sin(Math.PI * t) ** 2
        const circle = t * Math.PI * 2
        const loopX = Math.cos(circle) * radiusX * envelope
        const loopY = Math.sin(circle) * radiusY * envelope - envelope * radiusY * .55
        setPose(sx + dx * e + loopX,
          sy + dy * e + loopY,
          Math.sin(circle * 1.5) * 9 * envelope)
      })
      if (!cancelled) {
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

