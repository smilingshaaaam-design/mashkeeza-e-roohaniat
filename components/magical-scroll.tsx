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
// Keeps consecutive completed flights from choosing the same airflow variation.
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

// Transparent GPU fluid overlay. The actual inkpot image remains unmodified.
// The shader renders layered, irregular moving light, not SVG stroke outlines.
function LivingInkEnergy({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) return // The original illustrated inkpot remains visible.

    const vertexSource = `
      attribute vec2 aPosition;
      varying vec2 vUV;
      void main() {
        vUV = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `
    const fragmentSource = `
      precision highp float;
      varying vec2 vUV;
      uniform float uTime;

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),
                   mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.55;
        for (int i=0; i<4; i++) {
          v += a*noise(p);
          p = mat2(1.62,-1.16,1.16,1.62)*p + vec2(5.2,1.8);
          a *= 0.5;
        }
        return v;
      }
      float gaussian(float x, float spread) {
        return exp(-(x*x)/(spread*spread));
      }

      void main() {
        // Artwork coordinate space: x=0..1 left-to-right, y=0..1 top-to-bottom.
        vec2 p = vec2(vUV.x, 1.0 - vUV.y);
        float t = uTime;
        vec3 light = vec3(0.0);
        float alpha = 0.0;

        // A flowing, organically advected nebula INSIDE the glass bowl.
        vec2 q = p*vec2(5.0,7.0);
        vec2 flow = vec2(fbm(q + vec2(t*.17,-t*.11)),
                         fbm(q*1.14 + vec2(-t*.13,t*.16) + vec2(8.2,1.7)));
        vec2 warp = q + (flow-.5)*1.45 + vec2(t*.08,-t*.12);
        float marble = fbm(warp*1.25);
        float veil = fbm(warp*.76 + vec2(11.0,-3.0));
        vec2 glass = (p-vec2(.50,.707))/vec2(.255,.132);
        float glassDist = length(glass) + (marble-.5)*.095;
        float glassMask = 1.0-smoothstep(.82,1.03,glassDist);
        float magenta = smoothstep(.31,.77,marble);
        float cyan = smoothstep(.30,.76,veil);
        vec3 ink = mix(vec3(.08,.32,1.0),vec3(1.0,.16,.70),magenta);
        ink = mix(ink,vec3(.20,1.0,1.0),cyan*.48);
        float molten = pow(max(0.0,sin(marble*11.0 + veil*4.0 + t*.29)),5.0);
        ink += vec3(1.0,.58,.24)*molten*.42;
        float glassStrength = glassMask*(.22 + .42*marble + .20*veil);
        light += ink*glassStrength;
        alpha += glassStrength*.83;

        // Hot microscopic light caustics, moving UNDER the glass illustration.
        float glint = pow(max(0.0,sin(veil*19.0+marble*10.0-t*.60)),11.0);
        light += vec3(.58,.88,1.0)*glint*glassMask*.30;
        alpha += glint*glassMask*.10;

        // The magical blue fire is a soft VOLUMETRIC plume, never drawn lines.
        float h = clamp((.47-p.y)/.435,0.0,1.0);
        float flameGate = smoothstep(.0,.09,h)*(1.0-smoothstep(.88,1.0,h));
        vec2 fireNoiseCoord = vec2(p.x*7.7 + t*.23, p.y*11.0-t*.66);
        float turbulent = fbm(fireNoiseCoord);
        float center = .51 + .064*sin(h*6.6+t*.61)
                            + .043*sin(h*12.3-t*.43)
                            + (turbulent-.5)*.060;
        float radius = (.100-.057*h) * (.85+.24*turbulent);
        float dist = abs(p.x-center);
        float flame = gaussian(dist,radius)*flameGate;
        float core = gaussian(dist-.008*sin(h*17.0+t*.40),radius*.32)*flameGate;
        float breath = .66 + .34*fbm(fireNoiseCoord + vec2(2.3,6.0));
        vec3 blueFire = mix(vec3(.13,.40,1.0),vec3(.30,.88,1.0),
                            smoothstep(.25,.79,turbulent));
        blueFire += vec3(.34,.08,.65)*(1.0-h)*.24;
        light += blueFire*flame*breath*.75;
        light += vec3(.50,.93,1.0)*core*.22;
        alpha += flame*.48 + core*.14;
        float fireHalo = gaussian(dist,radius*2.8)*flameGate;
        light += vec3(.08,.32,.88)*fireHalo*.20;
        alpha += fireHalo*.10;

        // Moving light reflects across the ring artwork. No solid drawn rings.
        vec2 r1 = (p-vec2(.50,.797))/vec2(.367,.081);
        float ang1 = atan(r1.y,r1.x);
        float ring1 = gaussian(length(r1)-1.0,.085);
        float spark1 = pow(max(0.0,cos(ang1*2.0-t*1.40)),13.0);
        vec2 r2 = (p-vec2(.50,.754))/vec2(.313,.068);
        float ang2 = atan(r2.y,r2.x);
        float ring2 = gaussian(length(r2)-1.0,.095);
        float spark2 = pow(max(0.0,cos(ang2*2.0+t*1.04)),13.0);
        float gold = ring1*(.07+.66*spark1) + ring2*(.04+.44*spark2);
        light += vec3(1.0,.68,.23)*gold;
        light += vec3(1.0,.95,.66)*(spark1*ring1+spark2*ring2)*.30;
        alpha += gold*.50;

        // Layered light, NOT an opaque painted patch over the original image.
        gl_FragColor = vec4(clamp(light,0.0,1.0), clamp(alpha,0.0,.78));
      }
    `

    const makeShader = (kind: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(kind)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
      console.warn('Magical ink shader:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    const vertex = makeShader(gl.VERTEX_SHADER, vertexSource)
    const fragment = makeShader(gl.FRAGMENT_SHADER, fragmentSource)
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
      return
    }
    const program = gl.createProgram()
    if (!program) { gl.deleteShader(vertex); gl.deleteShader(fragment); return }
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Magical ink shader link:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment)
      return
    }
    const buffer = gl.createBuffer()
    if (!buffer) { gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); return }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const pos = gl.getAttribLocation(program, 'aPosition')
    const timeUniform = gl.getUniformLocation(program, 'uTime')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)

    let frame = 0
    let live = true
    let visible = true
    let lastDraw = 0
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true }, { rootMargin: '120px' })
      : null
    observer?.observe(canvas)

    const render = (now: number) => {
      if (!live) return
      frame = requestAnimationFrame(render)
      if (!visible || document.visibilityState !== 'visible' || now-lastDraw < 40) return
      lastDraw = now
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width < 1 || bounds.height < 1) return
      const density = Math.min(window.devicePixelRatio || 1, 1.7)
      const width = Math.min(520, Math.ceil(bounds.width*density))
      const height = Math.min(740, Math.ceil(bounds.height*density))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.uniform1f(timeUniform, now*.001)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    frame = requestAnimationFrame(render)

    return () => {
      live = false
      cancelAnimationFrame(frame)
      observer?.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [active])

  return <canvas ref={canvasRef} className={`original-scroll-fluid-canvas${active ? ' is-open' : ''}`} aria-hidden="true" />
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

    paper.style.height = '0px'
    paper.style.overflow = 'hidden'
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
    let waitingForAssets = true
    let quillWidth = 0, quillHeight = 0
    let featherX = 0, featherY = 0
    let engraved = false
    // Return-flight particles only; writing particles retain their original count.
    let returnFlight = false
    let returnGlitterBursts = 0
    let inkX = 0, inkY = 0
    const ctx = dustCanvas.getContext('2d', { alpha: true })
    const dpi = Math.min(window.devicePixelRatio || 1, 2)
    dustCanvas.width = Math.round(120 * dpi)
    dustCanvas.height = Math.round(120 * dpi)
    ctx?.setTransform(dpi, 0, 0, dpi, 0, 0)
    type Fleck = { x: number; y: number; vx: number; vy: number; born: number; ttl: number; color: string; size: number }
    const flecks: Fleck[] = []
    const colours = ['#ffe38a', '#ffb347', '#f7a3e9', '#d29aff', '#9e8eff', '#62caff', '#dbf7ff']
    const sparkleBoost = 1.5
    let lastEmission = 0
    let lastNibX = NaN, lastNibY = NaN
    // Lightweight cursor-like stars. Nothing connects the particles, so this
    // cannot become a flame/ribbon. Draw in a BODY overlay above site cards.
    type TrailSpark = {
      x: number; y: number; distance: number; born: number;
      color: string; size: number; phase: number; drift: number; largerStar: boolean
    }
    type FallingSpark = {
      x: number; y: number; vx: number; vy: number; born: number; ttl: number;
      color: string; size: number; phase: number; largerStar: boolean
    }
    const trailSparks: TrailSpark[] = []
    const fallingSparks: FallingSpark[] = []
    const glitterColors = ['#ffe88d', '#ff9bdd', '#bf9aff', '#7be8ff', '#eaffff', '#ffaec7', '#ffd06a', '#88ffdc', '#d9a5ff']
    const tailLengthPx = 260 // longer, narrow 2.7in CSS-pixel motion history
    let glitterLastX = NaN, glitterLastY = NaN
    let totalTravel = 0
    let sampleRemainder = 0
    let flightLayer: HTMLDivElement | null = null
    let flightCanvas: HTMLCanvasElement | null = null
    let flightCtx: CanvasRenderingContext2D | null = null
    let flyingFeather: HTMLImageElement | null = null
    let flightScale = 1

    const clearComet = () => {
      trailSparks.length = 0
      fallingSparks.length = 0
      glitterLastX = NaN
      glitterLastY = NaN
      totalTravel = 0
      sampleRemainder = 0
      if (flightLayer) flightLayer.remove()
      flightLayer = null
      flightCanvas = null
      flightCtx = null
      flyingFeather = null
      quill.style.visibility = 'visible'
      spark.style.visibility = 'visible'
    }
    const prepareComet = () => {
      clearComet()
      const overlay = document.createElement('div')
      overlay.setAttribute('aria-hidden', 'true')
      Object.assign(overlay.style, {
        position:'fixed', inset:'0', overflow:'visible', pointerEvents:'none',
        zIndex:'2147483000', background:'transparent', contain:'none'
      })
      const canvas = document.createElement('canvas')
      Object.assign(canvas.style, {
        position:'absolute', top:'0', left:'0', width:'100%', height:'100%',
        overflow:'visible', pointerEvents:'none'
      })
      flightScale = Math.min(window.devicePixelRatio || 1, 1.75)
      canvas.width = Math.round(window.innerWidth * flightScale)
      canvas.height = Math.round(window.innerHeight * flightScale)
      const flightContext = canvas.getContext('2d', { alpha: true })
      flightContext?.setTransform(flightScale, 0, 0, flightScale, 0, 0)
      const clone = quill.cloneNode(false) as HTMLImageElement
      clone.removeAttribute('id')
      clone.removeAttribute('class')
      Object.assign(clone.style, {
        position:'absolute', left:'0', top:'0', width:`${quillWidth}px`,
        height:`${quillHeight}px`, opacity:'1', visibility:'visible',
        transformOrigin:'1.4% 99.3%', pointerEvents:'none',
        filter:'drop-shadow(2px 4px 4px rgba(45,25,44,.4))',
        willChange:'transform', zIndex:'2'
      })
      overlay.appendChild(canvas)
      overlay.appendChild(clone)
      document.body.appendChild(overlay)
      flightLayer = overlay
      flightCanvas = canvas
      flightCtx = flightContext
      flyingFeather = clone
      quill.style.visibility = 'hidden'
      spark.style.visibility = 'hidden'
    }
    const drawComet = (x: number, y: number) => {
      if (!flightCtx || !flightCanvas) return
      const now = performance.now()
      if (Number.isFinite(glitterLastX)) {
        const dx = x - glitterLastX, dy = y - glitterLastY
        const dist = Math.hypot(dx, dy)
        if (dist > .1 && dist < 300) {
          // A moderately wider, denser cursor-style trail: separate stars, never flames.
          const spacing = 2.6
          const count = Math.min(120, Math.floor((sampleRemainder + dist) / spacing))
          for (let j=0; j<count; j++) {
            const d = spacing * (j+1) - sampleRemainder
            const u = Math.max(0, Math.min(1, d/dist))
            const nx = -dy / dist, ny = dx / dist
            for (let k=0; k<3; k++) {
              const scatter = (Math.random()-.5)*11.0
              // Rare, only slightly larger stars scattered through the thin trail.
              const largerStar = Math.random() < .055
              const px = glitterLastX + dx*u + nx*scatter
              const py = glitterLastY + dy*u + ny*scatter
              const color = glitterColors[Math.floor(Math.random()*glitterColors.length)]
              trailSparks.push({
                x:px,
                y:py,
                distance:totalTravel + d,
                born:now,
                color,
                size:largerStar ? 1.9+Math.random()*.55 : .65+Math.random()*1.1,
                phase:Math.random()*Math.PI*2,
                drift:(Math.random()-.5)*1.6,
                largerStar
              })
              // A few stars gently fall away from the trail like light glitter rain.
              if (Math.random() < (largerStar ? .12 : .05)) {
                fallingSparks.push({
                  x:px,
                  y:py,
                  vx:(Math.random()-.5)*.012,
                  vy:.008 + Math.random()*.011,
                  born:now,
                  ttl:2800 + Math.random()*1700,
                  color,
                  size:largerStar ? 1.35 + Math.random()*.5 : .75 + Math.random()*.6,
                  phase:Math.random()*Math.PI*2,
                  largerStar,
                })
              }
            }
          }
          sampleRemainder = (sampleRemainder + dist) % spacing
          totalTravel += dist
        }
      }
      glitterLastX=x; glitterLastY=y
      const stageBounds = rectOfStage()
      const c = flightCtx
      c.clearRect(0,0,window.innerWidth,window.innerHeight)
      c.save()
      // Normal source-over: avoid additive glow merging into orange flames.
      c.globalCompositeOperation = 'source-over'
      for (let i=trailSparks.length-1; i>=0; i--) {
        const p=trailSparks[i]
        const travelled=totalTravel-p.distance
        const age=now-p.born
        if (travelled>tailLengthPx || age>2200) {trailSparks.splice(i,1);continue}
        const fade=Math.max(0,Math.min(1,1-travelled/tailLengthPx)) *
          Math.max(0,Math.min(1,1-age/2200))
        const twinkle=.30+.70*Math.sin(now*(p.largerStar ? .018 : .024)+p.phase)**2
        const px=stageBounds.left+p.x+Math.sin(age*.006+p.phase)*p.drift
        const py=stageBounds.top+p.y+Math.min(6,age*.0035)
        c.globalAlpha=Math.min(.95,fade*twinkle)
        c.fillStyle=p.color
        c.shadowColor=p.color
        c.shadowBlur=3.2
        c.beginPath()
        c.arc(px,py,p.size,0,Math.PI*2)
        c.fill()
        // Only rare slightly larger twinkling star crosses; no flame or ribbon.
        if (p.largerStar) {
          const arm=3.2+twinkle*1.2
          c.globalAlpha=Math.min(.95,fade*twinkle*.83)
          c.lineWidth=.8
          c.strokeStyle=p.color
          c.beginPath()
          c.moveTo(px-arm,py); c.lineTo(px+arm,py)
          c.moveTo(px,py-arm); c.lineTo(px,py+arm)
          c.stroke()
        }
      }
      for (let i=fallingSparks.length-1; i>=0; i--) {
        const p = fallingSparks[i]
        const age = now - p.born
        if (age > p.ttl) { fallingSparks.splice(i, 1); continue }
        const t = age / p.ttl
        // Very slow downward float, with gentle sideways airflow instead of falling quickly.
        const px = stageBounds.left + p.x + p.vx * age + Math.sin(age * .0017 + p.phase) * 4.2
        const py = stageBounds.top + p.y + p.vy * age + age * age * .0000013 + Math.sin(age * .0012 + p.phase) * 1.8
        const fade = Math.max(0, 1 - t)
        const twinkle = .38 + .62 * Math.sin(now * (p.largerStar ? .010 : .013) + p.phase) ** 2
        c.globalAlpha = Math.min(.9, fade * twinkle * .85)
        c.fillStyle = p.color
        c.shadowColor = p.color
        c.shadowBlur = 4.5
        c.beginPath()
        c.arc(px, py, p.size, 0, Math.PI * 2)
        c.fill()
        // Cursor-style star glints: tiny crosses on every falling glitter,
        // with only the rare larger stars showing slightly longer rays.
        const arm = p.largerStar ? 2.6 + twinkle * .7 : 1.35 + twinkle * .65
        c.globalAlpha = Math.min(.88, fade * twinkle * .72)
        c.lineWidth = p.largerStar ? .8 : .55
        c.strokeStyle = p.color
        c.beginPath()
        c.moveTo(px-arm, py); c.lineTo(px+arm, py)
        c.moveTo(px, py-arm); c.lineTo(px, py+arm)
        c.stroke()
      }
      c.restore()
    }

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
      // In flight the independent glitter stars are drawn in the top-level overlay.
      // Keep the existing boosted writing sparks, not a separate flying cloud.
      if (returnFlight) return
      const now = performance.now()
      if (now - lastEmission < 24) return
      lastEmission = now
      // Glitter/sparkles boosted by 50%, especially during writing.
      // Writing: 7 -> 11 particles per burst. Return flight: 42 -> 63 particles
      // per 5 bursts (12.6 average), while preserving the same burst cadence.
      const burstSize = returnFlight
        ? Math.floor((returnGlitterBursts + 1) * Math.round(42 * sparkleBoost) / 5)
          - Math.floor(returnGlitterBursts * Math.round(42 * sparkleBoost) / 5)
        : Math.round(7 * sparkleBoost)
      if (returnFlight) returnGlitterBursts++
      const particleCap = returnFlight
        ? Math.round(106 * sparkleBoost)
        : Math.round(88 * sparkleBoost)
      for (let i = 0; i < burstSize && flecks.length < particleCap; i++) {
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
    // All movement pivots around the EXISTING feather nib (1.4%, 99.3%).
    // 3D bank/pitch are ONLY used in the return flight; the existing rest pose,
    // writing pose and approved inkpot coordinates use the original transform.
    const setPose = (x: number, y: number, angle = 0, bank = 0, pitch = 0) => {
      featherX = x; featherY = y
      quill.dataset.x = String(x)
      quill.dataset.y = String(y)
      quill.style.transform = bank === 0 && pitch === 0
        ? `translate3d(${x}px,${y}px,0) rotate(${angle}deg)`
        : `translate3d(${x}px,${y}px,0) perspective(740px) rotateZ(${angle}deg) rotateY(${bank}deg) rotateX(${pitch}deg)`
      const nibX = x + quillWidth * .014
      const nibY = y + quillHeight * .993
      spark.style.transform = `translate3d(${nibX - 11}px,${nibY - 12}px,0)`
      drawAtNib(nibX, nibY)
      if (returnFlight) {
        if (flyingFeather) {
          const rect = rectOfStage()
          const transform = bank === 0 && pitch === 0
            ? `translate3d(${rect.left+x}px,${rect.top+y}px,0) rotate(${angle}deg)`
            : `translate3d(${rect.left+x}px,${rect.top+y}px,0) perspective(740px) rotateZ(${angle}deg) rotateY(${bank}deg) rotateX(${pitch}deg)`
          flyingFeather.style.transform = transform
        }
        drawComet(nibX, nibY)
      }
    }
    const resolveReadyRest = () => {
      quillWidth = quill.offsetWidth
      quillHeight = quill.offsetHeight
      const stageRect = rectOfStage()
      const potRect = pot.getBoundingClientRect()
      // Centre of the illustrated inkpot opening, measured in image coordinates.
      const x = potRect.left + potRect.width * .52 - stageRect.left - quillWidth * .014
      const y = potRect.top + potRect.height * .43 - stageRect.top - quillHeight * .993
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
          points: dedup.map(x=>({x:x-box.left,y:baseline-box.top})),
        })
      }
      return lines
    }
    const writeBlock = async (block: HTMLElement, fast: boolean) => {
      const lines = measureLines(block)
      const r = block.getBoundingClientRect()
      if (!lines.length) {block.style.clipPath='none';block.style.opacity='1';return}
      const atBlockPoint = (point: InkGlyph) => {
        const bounds = block.getBoundingClientRect()
        return toPoseFromPage(bounds.left + point.x, bounds.top + point.y)
      }
      const first = atBlockPoint(lines[0].points[0])
      await moveTo(first, fast ? 180 : 285)
      if (cancelled) return
      block.style.opacity='1'
      for (const line of lines) {
        if (cancelled) return
        const pts = line.points
        const from = atBlockPoint(pts[0])
        // Flying to the next line is separate from the writing stroke.
        if (Math.abs(featherX-from.x) + Math.abs(featherY-from.y) > 9) await moveTo(from,fast ? 80 : 120)
        const duration = clamp(line.letters * (fast ? 8 : 18),fast ? 155 : 245,fast ? 1150 : 2070)
        engraved = true
        spark.style.opacity='.80'
        await tween(duration, t => {
          const index = t * Math.max(0,pts.length-1)
          const before = Math.floor(index)
          const fraction = index - before
          const p = pts[before]
          const next = pts[Math.min(pts.length-1,before+1)]
          const x = p.x + (next.x - p.x) * fraction
          const y = p.y + (next.y - p.y) * fraction
          const pose = atBlockPoint({x,y})
          setPose(pose.x,pose.y,Math.sin(t * Math.PI * 6)*4.1)
          const edgeX = clamp(x,0,r.width)
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
      // Reference sketch (17 Nov 2026): the black rectangle is the PAPER,
      // the pink stroke is the nib trajectory and the orange bowl is the inkpot.
      // One leftward sweep, ONE deep U underneath the paper, a rising arch on
      // the right, and a gentle descent into the EXISTING approved inkpot rest.
      // Preserve the original inkpot coordinates, writing, sprites and effects.
      const home = resolveReadyRest()
      const stageRect = rectOfStage()
      const paperRect = paper.getBoundingClientRect()
      type Point = { x: number; y: number }
      const paperLeft = paperRect.left - stageRect.left
      const paperRight = paperRect.right - stageRect.left
      const paperTop = paperRect.top - stageRect.top
      const paperBottom = paperRect.bottom - stageRect.top
      const paperW = Math.max(160, paperRight - paperLeft)
      const paperH = Math.max(220, paperBottom - paperTop)
      const stageW = stage.clientWidth
      const start: Point = { x: featherX, y: featherY }

      // Proportions copied from the hand-drawn pink path, relative to the
      // black rectangle. Depth scales with WIDTH to avoid an enormous U on
      // long articles. The complete quill may leave the paper/stage bounds.
      const leftOutside = paperLeft - paperW * .015
      const troughY = paperBottom + Math.max(65, Math.min(138, paperW * .245))
      const crestY = Math.min(home.y - paperW * .24, paperBottom - Math.max(95, Math.min(paperH * .37, paperW * .36)))

      // Keep V15's shuffled random styles (17) and no consecutive repeats.
      // Their variations now change the air-current/flutter, not the drawn route.
      const winds = [
        [1.15,.25,.16,1.6,.1], [1.65,.30,.22,1.8,.5],
        [1.95,.36,.18,2.1,.8], [1.32,.18,.28,1.7,1.1],
        [2.35,.27,.26,2.4,1.5], [1.72,.39,.19,2.0,1.8],
        [2.60,.33,.31,2.6,2.2], [1.43,.42,.17,1.9,2.6],
        [2.08,.24,.35,2.2,2.9], [1.88,.38,.29,2.3,3.2],
        [2.82,.30,.22,2.8,3.5], [1.53,.22,.33,1.9,3.8],
        [2.18,.44,.24,2.5,4.1], [1.27,.34,.37,1.8,4.4],
        [2.48,.26,.30,2.7,4.8], [1.77,.41,.27,2.1,5.1],
        [2.94,.35,.34,2.9,5.5],
      ] as const
      const bagKey = 'mashkeeza:feather:safe-flight-bag:17:v1'
      const lastKey = 'mashkeeza:feather:safe-flight-last:17:v1'
      let bag: number[] = []
      let last = lastFeatherFlightStyle
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(bagKey) || '[]')
        if (Array.isArray(stored) && new Set(stored).size === stored.length &&
          stored.every(v => Number.isInteger(v) && v >= 0 && v < winds.length)) {
          bag = stored as number[]
        }
        const prior = sessionStorage.getItem(lastKey)
        if (prior !== null && Number.isInteger(Number(prior))) last = Number(prior)
      } catch { /* Private browsing must not stop animation. */ }
      if (!bag.length) {
        bag = winds.map((_, i) => i)
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[bag[i], bag[j]] = [bag[j], bag[i]]
        }
      }
      if (bag.length > 1 && bag[0] === last) {
        const different = bag.findIndex(i => i !== last)
        ;[bag[0], bag[different]] = [bag[different], bag[0]]
      }
      const styleIndex = bag.shift() as number
      lastFeatherFlightStyle = styleIndex
      try {
        sessionStorage.setItem(bagKey, JSON.stringify(bag))
        sessionStorage.setItem(lastKey, String(styleIndex))
      } catch { /* Storage is optional. */ }
      const [cycles, swayRatio, flutterRatio, durationRatio, phase] = winds[styleIndex]

      // Trace the supplied pink curve from the FINAL written glyph.
      // The first bend is left/up, then the pen goes BELOW the page edge.
      // NO top-of-page tour, NO figure-eight, NO extra loops.
      const waypoints: Point[] = [
        start,
        { x: Math.min(start.x - paperW * .11, paperLeft + paperW * .42),
          y: Math.min(start.y - paperW * .025, paperBottom - paperW * .23) },
        { x: paperLeft + paperW * .12, y: paperBottom - paperW * .22 },
        { x: leftOutside + paperW * .025, y: paperBottom - paperW * .12 },
        { x: leftOutside, y: paperBottom + paperW * .055 },
        { x: paperLeft + paperW * .085, y: paperBottom + paperW * .17 },
        { x: paperLeft + paperW * .23, y: troughY - paperW * .012 },
        { x: paperLeft + paperW * .40, y: troughY },
        { x: paperLeft + paperW * .49, y: troughY - paperW * .035 },
        { x: paperLeft + paperW * .64, y: paperBottom + paperW * .09 },
        { x: paperLeft + paperW * .67, y: paperBottom - paperW * .11 },
        { x: paperLeft + paperW * .70, y: paperBottom - paperW * .25 },
        { x: paperLeft + paperW * .80, y: crestY + paperW * .045 },
        { x: paperLeft + paperW * .90, y: crestY },
        { x: home.x - paperW * .06, y: crestY + (home.y - crestY) * .14 },
        { x: home.x, y: crestY + (home.y - crestY) * .48 },
        { x: home.x, y: crestY + (home.y - crestY) * .75 },
        home,
      ]

      // C1-continuous cubic Hermite / Catmull-Rom: no pause at any waypoint.
      // Reparameterise by arc length so tight top loop doesn't suddenly speed up.
      const curve = (u: number): Point => {
        if (u >= 1) return home
        const z = clamp(u, 0, 1) * (waypoints.length - 1)
        const i = Math.floor(z)
        const t = z - i
        const p = waypoints[i], q = waypoints[i + 1]
        const a = waypoints[Math.max(0, i - 1)]
        const b = waypoints[Math.min(waypoints.length - 1, i + 2)]
        const m0x = p.x === q.x ? 0 : (q.x - a.x) * .42, m0y = (q.y - a.y) * .42
        const m1x = q.x === b.x ? 0 : (b.x - p.x) * .42, m1y = (b.y - p.y) * .42
        const t2 = t*t, t3 = t2*t
        const h0 = 2*t3-3*t2+1, h1 = t3-2*t2+t
        const h2 = -2*t3+3*t2, h3 = t3-t2
        return {
          x: h0*p.x+h1*m0x+h2*q.x+h3*m1x,
          y: h0*p.y+h1*m0y+h2*q.y+h3*m1y,
        }
      }
      const SAMPLES = 720
      const distances: number[] = [0]
      let previous = curve(0)
      for (let i = 1; i <= SAMPLES; i++) {
        const next = curve(i / SAMPLES)
        distances.push(distances[i - 1] + Math.hypot(next.x - previous.x, next.y - previous.y))
        previous = next
      }
      const length = distances[SAMPLES]
      const descentStart = distances[Math.floor(SAMPLES * (waypoints.length - 3) / (waypoints.length - 1))] / length
      const atDistance = (ratio: number): Point => {
        const target = clamp(ratio, 0, 1) * length
        let lo = 0, hi = SAMPLES
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (distances[mid] < target) lo = mid + 1
          else hi = mid
        }
        const high = Math.max(1, lo), low = high - 1
        const d = distances[high] - distances[low]
        return curve((low + (d ? (target - distances[low]) / d : 0)) / SAMPLES)
      }

      // V15's +20% return-only glitter boost is preserved unchanged.
      prepareComet()
      returnFlight = true
      returnGlitterBursts = 0
      engraved = true
      spark.style.opacity = '.98'
      const softEase = (t: number) => t * t * (3 - 2 * t)
      const amplitude = clamp(stageW * .0035, 1.5, 5)
      const duration = clamp(length * (4.0 + durationRatio * .6), 12500, 24000)

      await tween(duration, t => {
        const progress = softEase(t)
        const position = atDistance(progress)
        const ahead = atDistance(Math.min(1, progress + .0004))
        const behind = atDistance(Math.max(0, progress - .0004))
        const dx = ahead.x - behind.x, dy = ahead.y - behind.y
        const mag = Math.max(.01, Math.hypot(dx, dy))
        const normalX = -dy / mag, normalY = dx / mag
        // Gentle falling-leaf drift. Fade all side motion at both ends;
        // keep it subtle around the single intentional loop.
        const envelope = Math.pow(Math.sin(Math.PI * t), 1.25) * ease(clamp((descentStart - progress) / .10, 0, 1))
        const wave = phase + t * Math.PI * 2 * (1.3 + cycles * .22)
        const flutter = Math.sin(wave) * swayRatio + Math.sin(wave * .55 + 1.1) * flutterRatio
        const side = flutter * amplitude * envelope
        const buoyancy = Math.cos(wave * .67) * amplitude * .40 * envelope
        const roll = (Math.sin(wave + .2) * 16 + Math.sin(wave * 1.75) * 3) * envelope
        const bank = (Math.cos(wave * .89) * 27 + Math.sin(wave * 1.5) * 5) * envelope
        const pitch = (Math.sin(wave * .63) * 11 + Math.cos(wave * 1.34) * 3) * envelope
        setPose(
          position.x + normalX * side,
          position.y + normalY * side - buoyancy,
          roll, bank, pitch,
        )
      })
      if (!cancelled) {
        // No new landing formula, offset, shift or angle: exact V15 rest.
        setPose(home.x, home.y, 0)
        returnFlight = false
        clearComet()
        engraved = false
        spark.style.opacity = '0'
      }
    }

    const run = async () => {
      // Do not measure the writing while fonts or article images can still
      // change its layout. In particular, lazy images without dimensions can
      // push later lines down after the feather has already started writing.
      const contentImages = Array.from(text.querySelectorAll('img'))
      for (const img of contentImages) img.loading = 'eager'
      await Promise.all([pot, quill, ...contentImages].map(img => img.decode().catch(() => undefined)))
      if (cancelled) return
      await document.fonts.load(window.getComputedStyle(text).font).catch(() => [])
      await document.fonts.ready
      if (cancelled) return
      // Let the browser apply the final font and image dimensions before the
      // first geometry measurements used by the feather and writing reveal.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      if (cancelled) return
      waitingForAssets = false
      lastProgress = performance.now()
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
      if (!waitingForAssets && !cancelled && !completed && document.visibilityState === 'visible' &&
        performance.now() - lastProgress > 8000) failSafe()
    }, 900)
    const sizeObserver = new ResizeObserver(() => {
      quillWidth = quill.offsetWidth
      quillHeight = quill.offsetHeight
      if (completed) landAtApprovedRest()
    })
    for (const element of [stage,pot,quill]) sizeObserver.observe(element)
    void run().catch(error => {
      if (cancelled || completed) return
      console.error('Magical Scroll animation error:',error)
      failSafe()
    })
    return () => {
      cancelled = true
      sizeObserver.disconnect()
      window.clearInterval(watchdog)
      window.clearTimeout(activeTimeout)
      cancelAnimationFrame(activeFrame)
      cancelAnimationFrame(dustFrame)
      finishPending?.()
      flecks.length=0
      clearComet()
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
        {/* Procedural liquid/light renderer sits over the existing inkpot image. */}
        <LivingInkEnergy active={opened} />
        <img ref={quillRef} className="original-scroll-quill" src="/magical-scroll/quill.webp" alt="" draggable={false}/>
        <span ref={sparkleRef} className="original-scroll-nib-sparks" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
        <canvas ref={engravingCanvasRef} className="original-scroll-engraving-dust" aria-hidden="true" />
        {opened && <span className="sr-only">Scroll opened</span>}
      </div>
    </article>
      <style jsx global>{`
        .original-mashkeeza-scroll{font-family:'Noto Nastaliq Urdu',serif;color:#422410;width:100%;position:relative;z-index:100;overflow:visible}
        .original-scroll-stage{position:relative;z-index:101;width:100%;min-height:max-content;padding:8px 0 145px;overflow:visible;isolation:auto}
        .original-scroll-assembly{width:100%;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1}
        .original-scroll-roller{width:100%;height:auto;position:relative;z-index:3;flex-shrink:0;display:block;pointer-events:none;user-select:none}
        .original-scroll-paper{height:0;width:63.6%;margin:-1px 0 0;position:relative;z-index:1;min-height:0;overflow:hidden;container-type:inline-size}
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
        /* Aligned 1:1 with the existing inkpot image: NO inkpot or feather movement. */
        .original-scroll-fluid-canvas{position:absolute;right:1%;bottom:0;width:19.15%;height:auto;aspect-ratio:180 / 255;z-index:1001;opacity:0;pointer-events:none;mix-blend-mode:screen;transition:opacity .65s ease}
        .original-scroll-fluid-canvas.is-open{opacity:.98}
        .original-scroll-quill{position:absolute;z-index:1100;left:0;top:0;width:17%;height:auto;opacity:0;pointer-events:none;filter:drop-shadow(5px 7px 5px #321b1280);will-change:transform;transform-origin:1.4% 99.3%}
        /* Light, localized engraving flecks — separate from the feather's z-index. */
        .original-scroll-engraving-dust{position:absolute;left:0;top:0;width:120px;height:120px;z-index:1250;pointer-events:none;overflow:visible;will-change:transform}
        /* Small, soft sparks follow the ACTUAL nib; not the top of the feather. */
        .original-scroll-nib-sparks{position:absolute;left:0;top:0;width:36px;height:36px;z-index:1200;opacity:0;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 0 12px #f7d8a4aa)}
        .original-scroll-nib-sparks i{position:absolute;left:15px;top:15px;width:5px;height:5px;display:block;border-radius:50%;background:#ffeeb4;box-shadow:0 0 10px #efb763cc;animation:subtleNibSpark 1s ease-out infinite}
        .original-scroll-nib-sparks i:nth-child(2){animation-delay:.28s;background:#dd92e5;box-shadow:0 0 5px #c57fe899}
        .original-scroll-nib-sparks i:nth-child(3){animation-delay:.55s;background:#80d5ff;box-shadow:0 0 5px #82caff66}
        .original-scroll-nib-sparks i:nth-child(4){animation-delay:.14s;background:#fff4c1;box-shadow:0 0 4px #fff0a388;animation-duration:.75s}
        .original-scroll-nib-sparks i:nth-child(5){animation-delay:.42s;background:#d29aff;box-shadow:0 0 5px #c47cff99;animation-duration:1.1s}
        .original-scroll-nib-sparks i:nth-child(6){animation-delay:.62s;background:#ffd17d;box-shadow:0 0 6px #ffb347aa;animation-duration:.88s}
        .original-scroll-nib-sparks i:nth-child(7){animation-delay:.22s;background:#9ce7ff;box-shadow:0 0 6px #62caffaa;animation-duration:1.18s}
        .original-scroll-nib-sparks i:nth-child(8){animation-delay:.34s;background:#ffe38a;box-shadow:0 0 7px #efb763cc;animation-duration:.82s}
        .original-scroll-nib-sparks i:nth-child(9){animation-delay:.48s;background:#f7a3e9;box-shadow:0 0 7px #dd92e5aa;animation-duration:1.06s}
        .original-scroll-nib-sparks i:nth-child(10){animation-delay:.18s;background:#dbf7ff;box-shadow:0 0 7px #9ce7ffaa;animation-duration:.92s}
        .original-scroll-nib-sparks i:nth-child(11){animation-delay:.70s;background:#ffd17d;box-shadow:0 0 8px #ffb347cc;animation-duration:1.22s}
        @keyframes subtleNibSpark{from{transform:translate(0,0) scale(.92);opacity:.96}20%{opacity:1}to{transform:translate(10px,-16px) scale(.14);opacity:0}}
        @media(max-width:640px){.original-scroll-stage{padding-bottom:55px}.original-scroll-paper-surface{min-height:260px;padding:11% 10% 17%}.original-scroll-writing{font-size:clamp(9px,3.6cqw,15px);line-height:2.1}}
        @media(prefers-reduced-motion:reduce){.original-scroll-writing{visibility:visible}.original-scroll-nib-sparks i{animation:none}.original-scroll-fluid-canvas{display:none}}
      `}</style>
    </>
  )
}
