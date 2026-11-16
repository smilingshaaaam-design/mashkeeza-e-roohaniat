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
    if (!stage || !paper || !text || !quill || !pot || !spark) return

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
    // Play just once per WEBSITE VISIT (one loaded browser document).
    // This in-memory Set survives switching between articles/pages while the
    // website is open, but is automatically empty on refresh, tab reopening,
    // or returning after a real navigation away from the site.
    // NEVER read/write localStorage or sessionStorage: they persist across
    // reloads and would incorrectly suppress the next visit's animation.
    const visitKey = `mashkeeza:magical-scroll:seen:v1:${article.content_type === 'page' ? 'page' : 'article'}:${article.id}`
    const seenBefore = openedScrollKeys.has(visitKey)
    if (!seenBefore) openedScrollKeys.add(visitKey)
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
        await revealWhileWriting(block, points, fastBody)
        if (cancelled) return
        await delay(fastBody ? 12 : 35)
      }
      if (cancelled) return
      const mouth = pot.getBoundingClientRect()
      await move(mouth.left + mouth.width * .52, mouth.top + mouth.height * .43, 1150, {pot:true})
      spark.style.opacity = '0'
      if (cancelled) return
      putFeather(Number(quill.dataset.x), Number(quill.dataset.y), 0)
    }
    void run().catch(error => {
      if (cancelled) return
      console.error('Magical Scroll writing animation:', error)
      // A rendering error must never leave the Urdu article invisible.
      paper.style.height = 'auto'
      paper.style.overflow = 'visible'
      text.style.visibility = 'visible'
      text.querySelectorAll<HTMLElement>('*').forEach(node => {
        if (node.style.opacity === '0') node.style.opacity = '1'
        if (node.style.clipPath) node.style.clipPath = 'none'
      })
      pot.style.opacity = '1'
      spark.style.opacity = '0'
    })
    return () => {
      cancelled = true
      frameIds.forEach(id => cancelAnimationFrame(id))
      timerIds.forEach(id => clearTimeout(id))
      animations.forEach(animation => animation.cancel())
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

