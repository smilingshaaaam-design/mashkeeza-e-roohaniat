"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MagicalSmoke - Swirling inverted 'S' path to the top of the page (below menu bar),
 * with raining Ism-e-Allah, Arabic alphabet, talismanic symbols & ground star sparkles.
 */

const ASMA_UL_HUSNA = [
  "الرَّحْمَٰنُ", "الرَّحِيمُ", "الْمَلِكُ", "الْقُدُّوسُ", "السَّلَامُ", "الْمُؤْمِنُ", "الْمُهَيْمِنُ", "الْعَزِيزُ", "الْجَبَّارُ", "الْمُتَكَبِّرُ",
  "الْخَالِقُ", "الْبَارِئُ", "الْمُصَوِّرُ", "الْغَفَّارُ", "الْقَهَّارُ", "الْوَهَّابُ", "الرَّزَّاقُ", "الْفَتَّاحُ", "الْعَلِيمُ", "الْقَابِضُ",
  "الْبَاسِطُ", "الْخَافِضُ", "الرَّافِعُ", "الْمُعِزُّ", "الْمُذِلُّ", "السَّمِيعُ", "الْبَصِيرُ", "الْحَكَمُ", "الْعَدْلُ", "اللَّطِيفُ",
  "الْخَبِيرُ", "الْحَلِيمُ", "الْعَظِيمُ", "الْغَفُورُ", "الشَّكُورُ", "الْعَلِيُّ", "الْكَبِيرُ", "الْحَفِيظُ", "الْمُقِيتُ", "الْحَسِيبُ",
  "الْجَلِيلُ", "الْكَرِيمُ", "الرَّقِيبُ", "الْمُجِيبُ", "الْوَاسِعُ", "الْحَكِيمُ", "الْوَدُودُ", "الْمَجِيدُ", "الْبَاعِثُ", "الشَّهِيدُ",
  "الْحَقُّ", "الْوَكِيلُ", "الْقَوِيُّ", "الْمَتِينُ", "الْوَلِيُّ", "الْحَمِيدُ", "الْمُحْصِي", "الْمُبْدِئُ", "الْمُعِيدُ", "الْمُحْيِي",
  "الْمُمِيتُ", "الْحَيُّ", "الْقَيُّومُ", "الْوَاجِدُ", "الْمَاجِدُ", "الْوَاحِدُ", "الصَّمَدُ", "الْقَادِرُ", "الْمُقْتَدِرُ", "الْمُقَدِّمُ",
  "الْمُؤَخِّرُ", "الْأَوَّلُ", "الْآخِرُ", "الظَّاهِرُ", "الْبَاطِنُ", "الْوَالِي", "الْمُتَعَالِي", "الْبَرُّ", "التَّوَّابُ", "الْمُنْتَقِمُ",
  "الْعَفُوُّ", "الرَّءُوفُ", "مَالِكُ الْمُلْكِ", "ذُو الْجَلَالِ وَالْإِكْرَامِ", "الْمُقْسِطُ", "الْجَامِعُ", "الْغَنِيُّ", "الْمُغْنِي", "الْمَانِعُ", "الضَّارُّ",
  "النَّافِعُ", "النُّورُ", "الْهَادِي", "الْبَدِيعُ", "الْبَاقِي", "الْوَارِثُ", "الرَّشِيدُ", "الصَّبُورُ",
];

const ARABIC_ALPHABET = [
  "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص",
  "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي",
];

const TALISMAN_SYMBOLS = [
  "☉", "☽", "☿", "♀", "♂", "♃", "♄", "✦", "✧", "۞", "۩", "⚶", "⚸", "⚹", "✺", "❂", "✵", "◈", "❖",
];

const DEFAULT_GLYPHS: string[] = [
  ...ASMA_UL_HUSNA,
  ...ARABIC_ALPHABET,
  ...TALISMAN_SYMBOLS,
];

const SMOKE_HUES: number[] = [
  272, 280, 288, 265, // Deep & Royal Purple
  218, 226, 234,      // Rich Royal Blue
  188, 194, 200,      // Vibrant Cyan
  42, 46, 38,         // Warm Golden
];

const DOT_HUES: number[] = [
  44, 48, 38,         // Golden fireflies
  190, 198,           // Cyan sparkles
  278, 290, 325,      // Purple & Magenta
  220,                // Blue
];

const GLYPH_HUES: number[] = [
  45, 48, 42,         // Golden calligraphy
  192, 198,           // Cyan glow
  282, 295,           // Violet-purple glow
];

const TAU = Math.PI * 2;
const SMOKE_RES = 0.5; 
// MODIFICATION 1: Increased smoke puff size for a stronger smoke effect
const SMOKE_SIZE = 1.35; 

const glyphHueFor = (text: string): number => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return GLYPH_HUES[Math.abs(h) % GLYPH_HUES.length];
};
const rand = (a: number, b: number): number => Math.random() * (b - a) + a;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const smooth = (a: number, b: number, x: number): number => {
  const v = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return v * v * (3 - 2 * v);
};

/* ---------- Landing spots ---------- */

export type LandingSpot = {
  x: number;       // 0..1 (relative to hero box width)
  y: number;       // 0..1 (relative to hero box height) 
  spread?: number; // horizontal spread
  ySpread?: number;// vertical spread (Randomize Y level so they don't hit in a straight flat line)
  weight?: number; // chance of landing here
};
type SpotPx = { x: number; y: number; spread: number; ySpread: number; weight: number };

// Adjust these coordinates based on exactly where your book, lamp, and ground are in your background image.
const DEFAULT_SPOTS: LandingSpot[] = [
  { x: 0.30, y: 0.80, spread: 0.04, ySpread: 0.04, weight: 1 },   // on the book
  { x: 0.55, y: 0.72, spread: 0.02, ySpread: 0.02, weight: 1 },   // on the inkpot (mashkeeza)
  { x: 0.82, y: 0.92, spread: 0.08, ySpread: 0.06, weight: 1.5 }, // desert / ground (Right side)
  { x: 0.12, y: 0.95, spread: 0.06, ySpread: 0.04, weight: 1 },   // ground (Left side)
  { x: 0.50, y: 0.90, spread: 0.15, ySpread: 0.08, weight: 1 },   // extra random ground spread
];

interface Props {
  originX?: number;
  originY?: number;
  groundY?: number;
  menuHeight?: number;
  anchorSelector?: string;
  targetSelector?: string;
  zIndex?: number;
  heightBoost?: number;
  topGap?: number;
  glyphs?: string[];
  direction?: "left" | "right";
  spiral?: "inverted-s-top" | "full-roam" | "straight-swing" | "down" | "under" | "over";
  drift?: number;
  speed?: number;
  showGlyphs?: boolean;
  debug?: boolean;
  landingSpots?: LandingSpot[];
  flashScale?: number;
  starScale?: number;
  glyphGap?: number;
}

type Kind = "puff" | "wisp" | "glyph" | "spark" | "flash";
type Wind = { x: number; y: number; px: number; py: number; power: number };
type Path = { x: Float32Array; y: Float32Array; nx: Float32Array; ny: Float32Array };
type CtrlPoint = { x: number; y: number };

const pt = (x: number, y: number): CtrlPoint => ({ x, y });

/* ---------- Swirling Paths ---------- */
const CTRL_INVERTED_S_TOP: CtrlPoint[] = [
  pt(0, 0), pt(70, -22), pt(115, -65), pt(60, -108), pt(-10, -135), pt(70, -165),
  pt(30, -195), pt(-90, -215), pt(-85, -255), pt(-20, -266), pt(110, -262),
  pt(290, -266), pt(470, -260), pt(650, -266),
];
const CTRL_FULL_ROAM: CtrlPoint[] = [
  pt(0, 0), pt(65, -3), pt(135, 4), pt(210, 55), pt(290, 105), pt(360, 40),
  pt(325, -45), pt(410, -115), pt(510, -65), pt(595, 25), pt(680, -70),
  pt(760, -175), pt(840, -250),
];
const CTRL_STRAIGHT_SWING: CtrlPoint[] = [
  pt(0, 0), pt(65, -2), pt(130, 3), pt(195, 48), pt(265, 85), pt(340, 25),
  pt(415, -55), pt(490, -110), pt(565, -40), pt(645, -125), pt(730, -205),
];
const CTRL_OVER: CtrlPoint[] = [
  pt(0, 0), pt(45, -35), pt(80, -75), pt(80, -125), pt(45, -165), pt(-5, -178),
  pt(-55, -150), pt(-75, -105), pt(100, -85), pt(180, -85), pt(260, -120), pt(350, -165),
  pt(450, -190), pt(560, -225), pt(680, -250),
];
const CTRL_UNDER: CtrlPoint[] = [
  pt(0, 0), pt(-22, -40), pt(-42, -88), pt(-28, -135), pt(20, -152), pt(65, -122),
  pt(62, -72), pt(18, -58), pt(85, -68), pt(160, -95), pt(240, -112), pt(330, -147),
  pt(430, -177), pt(530, -202), pt(630, -232), pt(720, -250),
];
const CTRL_DOWN: CtrlPoint[] = [
  pt(0, 0), pt(25, 30), pt(60, 70), pt(92, 120), pt(60, 150), pt(15, 128),
  pt(28, 88), pt(70, 45), pt(95, -10), pt(80, -70), pt(120, -108), pt(200, -122),
  pt(290, -118), pt(380, -130), pt(470, -155), pt(560, -185), pt(650, -210), pt(730, -235),
];

const N = 360;

function buildPath(ox: number, oy: number, k: number, ky: number, sgn: number, reach: number, ctrl: CtrlPoint[]): Path {
  const pts: CtrlPoint[] = ctrl.map((c) => ({ x: ox + sgn * c.x * k * reach, y: oy + c.y * ky }));
  const P = (i: number): CtrlPoint => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const dense: CtrlPoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < 24; s++) {
      const t = s / 24, t2 = t * t, t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  dense.push(pts[pts.length - 1]);

  const len: number[] = [0];
  for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  const total = len[len.length - 1];

  const x = new Float32Array(N), y = new Float32Array(N);
  let seg = 0;
  for (let j = 0; j < N; j++) {
    const target = (total * j) / (N - 1);
    while (seg < len.length - 2 && len[seg + 1] < target) seg++;
    const f = (target - len[seg]) / Math.max(1e-6, len[seg + 1] - len[seg]);
    x[j] = dense[seg].x + (dense[seg + 1].x - dense[seg].x) * f;
    y[j] = dense[seg].y + (dense[seg + 1].y - dense[seg].y) * f;
  }
  const nx = new Float32Array(N), ny = new Float32Array(N);
  for (let j = 0; j < N; j++) {
    const a = Math.max(0, j - 1), b = Math.min(N - 1, j + 1);
    const tx = x[b] - x[a], ty = y[b] - y[a];
    const l = Math.hypot(tx, ty) || 1;
    nx[j] = -ty / l; ny[j] = tx / l;
  }
  return { x, y, nx, ny };
}

/* ---------- Textures (Smoke, Dots, Glyphs) ---------- */

const makeCanvas = (w: number, h: number): HTMLCanvasElement => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hash = (x: number, y: number, s: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const vnoise = (x: number, y: number, s: number): number => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, s: number): number => {
  let v = 0, a = 0.5, f = 1;
  for (let o = 0; o < 4; o++) { v += a * vnoise(x * f, y * f, s + o * 17); f *= 2; a *= 0.5; } return v;
};
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

const noiseSprites = new Map<string, HTMLCanvasElement>();
const getNoiseSprite = (hue: number, variant: number): HTMLCanvasElement => {
  const key = `${hue}|${variant}`; let c = noiseSprites.get(key); if (c) return c;
  const S = 96; c = makeCanvas(S, S); const g = c.getContext("2d")!, img = g.createImageData(S, S), seed = variant * 101 + hue;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const fx = px / S, fy = py / S, r = Math.hypot(fx * 2 - 1, fy * 2 - 1), fall = 1 - smooth(0.15, 1, r);
      const wv = fbm(fx * 2.2, fy * 2.2, seed + 5), n = fbm(fx * 3.4 + wv * 1.4, fy * 3.4 + wv * 1.4, seed);
      const a = Math.min(1, Math.max(0, (n - 0.3) * 2.1)) * fall, [R, G, B] = hslToRgb(hue + (n - 0.5) * 24, 95, 36 + 22 * n);
      const i = (py * S + px) * 4; img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0); noiseSprites.set(key, c); return c;
};

const softSprites = new Map<string, HTMLCanvasElement>();
const getSoftSprite = (hue: number, light: number): HTMLCanvasElement => {
  const key = `${hue}|${light}`; let c = softSprites.get(key); if (c) return c;
  const S = 96; c = makeCanvas(S, S); const g = c.getContext("2d")!, gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, `hsla(${hue},95%,${light}%,0.9)`); gr.addColorStop(0.35, `hsla(${hue},90%,${light - 14}%,0.35)`);
  gr.addColorStop(0.7, `hsla(${hue},85%,${light - 28}%,0.08)`); gr.addColorStop(1, `hsla(${hue},80%,40%,0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S); softSprites.set(key, c); return c;
};

const dotSprites = new Map<number, HTMLCanvasElement>();
const getDotSprite = (hue: number): HTMLCanvasElement => {
  let c = dotSprites.get(hue); if (c) return c;
  const S = 48, mid = S / 2; c = makeCanvas(S, S); const g = c.getContext("2d")!, gr = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gr.addColorStop(0, `hsla(${hue}, 100%, 92%, 1)`); gr.addColorStop(0.22, `hsla(${hue}, 100%, 72%, 0.9)`);
  gr.addColorStop(0.55, `hsla(${hue}, 100%, 55%, 0.28)`); gr.addColorStop(1, `hsla(${hue}, 100%, 45%, 0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S); dotSprites.set(hue, c); return c;
};

const starFlashSprites = new Map<number, HTMLCanvasElement>();
const getStarFlashSprite = (hue: number): HTMLCanvasElement => {
  let c = starFlashSprites.get(hue); if (c) return c;
  const S = 72, mid = S / 2; c = makeCanvas(S, S); const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gr.addColorStop(0, `hsla(${hue}, 100%, 97%, 1)`); gr.addColorStop(0.18, `hsla(${hue}, 100%, 78%, 0.85)`);
  gr.addColorStop(0.48, `hsla(${hue}, 100%, 58%, 0.25)`); gr.addColorStop(1, `hsla(${hue}, 100%, 45%, 0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.save(); g.translate(mid, mid); g.fillStyle = `hsla(${hue}, 100%, 96%, 0.95)`;
  for (let r = 0; r < 2; r++) {
    g.rotate((r * Math.PI) / 2); g.beginPath(); g.moveTo(0, -mid * 0.88);
    g.quadraticCurveTo(2.4, -2.4, mid * 0.88, 0); g.quadraticCurveTo(2.4, 2.4, 0, mid * 0.88);
    g.quadraticCurveTo(-2.4, 2.4, -mid * 0.88, 0); g.quadraticCurveTo(-2.4, -2.4, 0, -mid * 0.88);
    g.closePath(); g.fill();
  }
  g.restore(); starFlashSprites.set(hue, c); return c;
};

const GLYPH_BASE = 24, GLYPH_SC = 2;
const glyphSprites = new Map<string, HTMLCanvasElement>();
const getGlyphSprite = (text: string, hue: number): HTMLCanvasElement => {
  const key = `${text}|${hue}`; let c = glyphSprites.get(key); if (c) return c;
  const SC = GLYPH_SC, px = GLYPH_BASE, pad = 16, font = `${px * SC}px "Amiri","Noto Naskh Arabic","Times New Roman",serif`;
  const probe = makeCanvas(1, 1).getContext("2d")!; probe.font = font; const tw = Math.ceil(probe.measureText(text).width);
  c = makeCanvas(tw + pad * 2 * SC, px * SC * 2 + pad * 2 * SC);
  const g = c.getContext("2d")!; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = `hsla(${hue},100%,65%,1)`; g.shadowBlur = 14 * SC; g.fillStyle = `hsla(${hue},100%,86%,1)`;
  g.fillText(text, c.width / 2, c.height / 2); glyphSprites.set(key, c); return c;
};

const place = (ctx: CanvasRenderingContext2D, dpr: number, x: number, y: number, rot: number): void => {
  const c = Math.cos(rot) * dpr, s = Math.sin(rot) * dpr;
  ctx.setTransform(c, s, -s, c, x * dpr, y * dpr);
};

/* ---------- Particle Class ---------- */

class Particle {
  x = 0; y = 0; u = 0; dx = 0; dy = 0; alpha = 0; baseAlpha: number; maxLife: number;
  size = 1; depth = 1; hue: number; variant = Math.floor(rand(0, 3)); seed = rand(0, 1000);
  rad = Math.sqrt(rand(0.02, 1)); th0 = rand(0, TAU); turns = rand(0.9, 2.2) * (Math.random() < 0.5 ? -1 : 1);
  spin = rand(0.18, 0.45) * (Math.random() < 0.5 ? -1 : 1); rot = rand(0, TAU); rotSpeed = rand(-0.004, 0.004);
  off = rand(-1, 1); text = ""; blinkRate = 2; morph = 0; vx = 0; vy = 0;
  isRaining = false; releaseU = rand(0.55, 0.92); rainFallSpeed = rand(0.8, 1.45);
  rainDriftX = rand(-0.22, 0.22); rainSwayFreq = rand(0.8, 1.6); rainSwayAmp = rand(1.5, 4.5); hasFlashed = false;
  midAirStar = Math.random() < 0.4; starFrac = rand(0.12, 0.7); starFadeLen = rand(110, 260);
  rainStartY = -1; rainStartX = 0; landX = 0; landY = 0; fade = 1; starScale = 0.5;
  noiseSpr?: HTMLCanvasElement; glyphSpr?: HTMLCanvasElement; softSpr?: HTMLCanvasElement;

  constructor(public kind: Kind, glyphs: string[]) {
    this.depth = rand(0.7, 1.32);
    if (kind === "puff") {
      this.hue = pick(SMOKE_HUES); this.size = rand(1.25, 1.9) * this.depth; this.baseAlpha = rand(0.1, 0.2); this.maxLife = rand(720, 960);
    } else if (kind === "wisp") {
      this.hue = pick(SMOKE_HUES); this.size = rand(1.05, 1.7) * this.depth; this.baseAlpha = rand(0.15, 0.3); this.maxLife = rand(680, 920);
    } else if (kind === "glyph") {
      this.text = pick(glyphs); this.hue = glyphHueFor(this.text); this.size = rand(11, 18);
      this.baseAlpha = rand(0.84, 1.0); this.blinkRate = rand(1.1, 2.4); this.maxLife = rand(790, 810);
    } else if (kind === "flash") {
      this.hue = 45; this.size = rand(2.4, 3.8); this.baseAlpha = 1.0; this.maxLife = rand(48, 72);
    } else {
      const isLarge = Math.random() < 0.12; this.hue = pick(DOT_HUES);
      this.size = isLarge ? rand(1.6, 2.6) : rand(0.35, 0.8);
      this.baseAlpha = isLarge ? rand(0.85, 1.0) : rand(0.55, 0.85);
      this.blinkRate = rand(2.2, 5.0); this.maxLife = rand(660, 900);
    }
  }

  update(t: number, dt: number, wind: Wind, path: Path, k: number, groundLevelPx: number, pickSpot: () => SpotPx | null, onSpawnFlash: (x: number, y: number, hue: number) => void): void {
    if (this.kind === "flash") {
      this.u += dt / this.maxLife; if (this.u >= 1) return;
      this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 0.03 * dt;
      const peak = smooth(0, 0.12, this.u), fade = 1 - smooth(0.3, 1.0, this.u), twinkle = 0.6 + 0.4 * Math.sin(this.u * Math.PI * 6);
      this.alpha = this.baseAlpha * peak * fade * twinkle; return;
    }

    if (this.kind === "glyph" && this.isRaining) {
      this.y += this.rainFallSpeed * dt * Math.max(0.75, k); this.rot += this.rotSpeed * 0.45 * dt;
      if (this.rainStartY < 0) {
        this.rainStartY = this.y; this.rainStartX = this.x;
        const s = pickSpot();
        if (s) {
          this.landX = s.x + rand(-1, 1) * s.spread;
          // Apply ySpread so they land at slightly different levels
          this.landY = Math.max(s.y + rand(-1, 1) * s.ySpread, this.y + 40); 
        } else {
          this.landX = this.x; this.landY = groundLevelPx;
        }
      }
      const kk = Math.max(0.8, k), landY = this.landY;
      const prog = Math.min(1, Math.max(0, (this.y - this.rainStartY) / Math.max(1, landY - this.rainStartY)));
      const sway = Math.sin(t * this.rainSwayFreq + this.seed) * this.rainSwayAmp * kk * (1 - prog * 0.8);
      this.x = this.rainStartX + (this.landX - this.rainStartX) * smooth(0, 1, prog) + sway;

      if (this.midAirStar) {
        const trig = this.rainStartY + (landY - this.rainStartY) * this.starFrac;
        this.morph = smooth(trig, trig + 45 * kk, this.y);
        const fadeStart = trig + 70 * kk; this.fade = 1 - smooth(fadeStart, fadeStart + this.starFadeLen * kk, this.y);
        if (this.fade <= 0.01) { this.u = 1; return; }
      } else {
        const fallZone = 110 * kk; this.morph = smooth(landY - fallZone, landY - 6, this.y);
      }

      const b = 0.5 + 0.5 * Math.sin(t * this.blinkRate + this.seed);
      this.alpha = this.baseAlpha * (0.5 + 0.5 * b * b);

      if (this.y >= landY) {
        if (!this.hasFlashed) { this.hasFlashed = true; onSpawnFlash(this.x, landY, this.hue); }
        this.u = 1; 
      }
      return;
    }

    this.u += (dt / this.maxLife) * (this.kind === "spark" ? 0.88 : 1); const u = this.u; if (u >= 1) return;

    const idx = u * (N - 1), i = Math.floor(idx), f = idx - i, j = Math.min(N - 1, i + 1);
    const px = path.x[i] + (path.x[j] - path.x[i]) * f, py = path.y[i] + (path.y[j] - path.y[i]) * f;
    const nx = path.nx[i] + (path.nx[j] - path.nx[i]) * f, ny = path.ny[i] + (path.ny[j] - path.ny[i]) * f;
    const tx = ny, ty = -nx, chaos = smooth(0.1, 0.36, u), roamBoost = smooth(0.42, 0.95, u);

    let offN = 0, offT = 0;
    if (this.kind === "puff" || this.kind === "wisp") {
      const spread = (this.kind === "puff" ? 4 + 30 * chaos + 22 * roamBoost : 3 + 22 * chaos + 14 * roamBoost) * this.depth;
      const r = this.rad * k * spread, th = this.th0 + TAU * this.turns * u + t * this.spin;
      const randWave = Math.sin(t * 0.95 + this.seed + u * 8.5) * k * (8 * chaos + 10 * roamBoost) + Math.cos(t * 0.65 + this.seed * 1.4 - u * 5.5) * k * (6 * chaos + 8 * roamBoost);
      offN = Math.cos(th) * r + randWave; offT = Math.sin(th) * r * 0.82;
    } else if (this.kind === "glyph") {
      offN = this.off * k * (3 + 10 * chaos) + Math.sin(t * 0.85 + this.seed + u * 5) * k * 4 * chaos; offT = 0;
    } else {
      offN = this.off * k * (6 + 40 * chaos + 26 * roamBoost) * this.depth + Math.sin(t * 0.95 + this.seed + u * 6) * k * 12 * chaos;
      offT = Math.cos(t * 0.75 + this.seed) * k * 12 * chaos;
    }

    if (wind.power > 0.01) {
      const ddx = px - wind.px, ddy = py - wind.py, d2 = ddx * ddx + ddy * ddy;
      if (d2 < 170 * 170) {
        const fo = (1 - Math.sqrt(d2) / 170) * wind.power;
        this.dx += wind.x * fo * 0.3 * dt; this.dy += wind.y * fo * 0.3 * dt;
      }
    }
    const relax = Math.pow(0.97, dt); this.dx *= relax; this.dy *= relax;
    let wx = 0, wy = 0;
    if (this.kind === "glyph" || this.kind === "spark") {
      const wm = this.kind === "glyph" ? 0.3 : 1;
      wx = Math.sin(t * 0.65 + this.seed) * k * (9 * chaos + 7 * roamBoost) * wm;
      wy = Math.cos(t * 0.55 + this.seed * 1.7) * k * (9 * chaos + 7 * roamBoost) * wm;
    }
    this.x = px + nx * offN + tx * offT + this.dx + wx; this.y = py + ny * offN + ty * offT + this.dy + wy;
    this.rot += this.rotSpeed * dt;

    if (this.kind === "glyph" && u >= this.releaseU) { this.isRaining = true; return; }

    const originDensityBoost = this.kind === "puff" || this.kind === "wisp" ? 0.3 + 0.7 * smooth(0.02, 0.26, u) : this.kind === "spark" ? 0.25 + 0.75 * smooth(0.03, 0.22, u) : 1;
    const fadeOut = 1 - smooth(0.68, 1.0, u), env = smooth(0, this.kind === "glyph" ? 0.08 : 0.03, u) * fadeOut;
    this.alpha = this.baseAlpha * env * originDensityBoost;
    if (this.kind === "spark") {
      const twinkle = 0.5 + 0.5 * Math.sin(t * this.blinkRate + this.seed); this.alpha *= 0.12 + 0.88 * Math.pow(twinkle, 2.5);
    } else if (this.kind === "glyph") {
      const b = 0.5 + 0.5 * Math.sin(t * this.blinkRate + this.seed); this.alpha *= 0.35 + 0.65 * b * b;
    }
  }

  draw(ctx: CanvasRenderingContext2D, k: number, dpr: number): void {
    if (this.alpha <= 0.003) return;
    const u = this.u;
    if (this.kind === "puff" || this.kind === "wisp") {
      const s = this.kind === "puff" ? k * (11 + 52 * u) * this.size * SMOKE_SIZE : k * (5 + 22 * u) * this.size * SMOKE_SIZE;
      ctx.globalAlpha = Math.min(0.65, this.alpha); place(ctx, dpr, this.x, this.y, this.rot);
      const ns = this.noiseSpr || (this.noiseSpr = getNoiseSprite(this.hue, this.variant)); ctx.drawImage(ns, -s, -s, s * 2, s * 2);
    } else if (this.kind === "spark") {
      const s = this.size * 3.0; ctx.globalAlpha = Math.min(1, this.alpha); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(getDotSprite(this.hue), this.x - s, this.y - s, s * 2, s * 2);
    } else if (this.kind === "flash") {
      const expand = this.u < 0.22 ? 0.4 + (this.u / 0.22) * 1.1 : 1.5 - (this.u - 0.22) * 0.65;
      const s = this.size * 6.5 * Math.max(0.25, expand);
      ctx.globalAlpha = Math.min(1, this.alpha); place(ctx, dpr, this.x, this.y, this.u * 0.8);
      ctx.drawImage(getStarFlashSprite(this.hue), -s, -s, s * 2, s * 2);
    } else {
      const m = this.morph;
      const ga = this.alpha * (1 - m);
      if (ga > 0.003) {
        const r = this.size * 2.0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = Math.min(1, ga * 0.45);
        const ss = this.softSpr || (this.softSpr = getSoftSprite(this.hue, 68)); ctx.drawImage(ss, this.x - r, this.y - r, r * 2, r * 2);
        ctx.globalAlpha = Math.min(1, ga); const sp = this.glyphSpr || (this.glyphSpr = getGlyphSprite(this.text, this.hue));
        const sc = (this.size / GLYPH_BASE) * (1 - 0.35 * m), w = (sp.width / GLYPH_SC) * sc, h = (sp.height / GLYPH_SC) * sc;
        place(ctx, dpr, this.x, this.y, Math.sin(this.rot * 18) * 0.12); ctx.drawImage(sp, -w / 2, -h / 2, w, h);
      }
      if (m > 0.01) {
        const tw = 0.7 + 0.3 * Math.sin(this.rot * 40 + this.u * 30), s = (1.6 + 4.2 * m) * tw * (this.starScale / 0.5);
        ctx.globalAlpha = Math.min(1, m * 1.3) * this.baseAlpha * this.fade; place(ctx, dpr, this.x, this.y, this.rot * 6);
        ctx.drawImage(getStarFlashSprite(this.hue), -s, -s, s * 2, s * 2);
      }
    }
  }
}

/* ---------- Main Component ---------- */

export function MagicalSmoke({
  originX = 0.76, originY = 0.64, groundY = 0.94, menuHeight = 90, topGap = 8, heightBoost = 1,
  targetSelector, anchorSelector, zIndex = 100, glyphs = DEFAULT_GLYPHS, direction = "left",
  spiral = "inverted-s-top", drift = 1.25, speed = 0.3, showGlyphs = true, debug = false,
  landingSpots = DEFAULT_SPOTS, 
  flashScale = 0.25, 
  glyphGap = 0.15, 
  starScale = 0.5,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smokeRef = useRef<HTMLCanvasElement>(null);
  const usePortal = !!anchorSelector;
  const [mounted, setMounted] = useState(!usePortal);

  useEffect(() => { if (usePortal) setMounted(true); }, [usePortal]);

  useEffect(() => {
    const canvas = canvasRef.current, parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d"), smokeCanvas = smokeRef.current, sctx = smokeCanvas?.getContext("2d");
    if (!ctx || !smokeCanvas || !sctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CAP: Record<Kind, number> = { puff: reduced ? 150 : 1500, wisp: reduced ? 150 : 1500, glyph: reduced ? 40 : 320, spark: reduced ? 80 : 600, flash: reduced ? 60 : 500 };
    const cnt: Record<Kind, number> = { puff: 0, wisp: 0, glyph: 0, spark: 0, flash: 0 };
    const rate = reduced ? 0.3 : window.innerWidth < 768 ? 0.6 : 1;
    const reach = Math.max(0.3, drift), sgn = direction === "left" ? -1 : 1;
    const ctrl: CtrlPoint[] = spiral === "inverted-s-top" ? CTRL_INVERTED_S_TOP : spiral === "full-roam" ? CTRL_FULL_ROAM : spiral === "straight-swing" ? CTRL_STRAIGHT_SWING : spiral === "down" ? CTRL_DOWN : spiral === "under" ? CTRL_UNDER : CTRL_OVER;
    const ext = { up: Math.max(20, -Math.min(...ctrl.map((c) => c.y))), down: Math.max(20, ...ctrl.map((c) => c.y)), fwd: Math.max(1, ...ctrl.map((c) => c.x)), back: Math.max(0, -Math.min(...ctrl.map((c) => c.x))) };

    let w = 0, h = 0, dpr = 1, sdpr = SMOKE_RES, pageLeft = 0, pageTop = 0, visible = true, k = 1, ky = 1, topLimit = menuHeight, groundPx = 0, spots: SpotPx[] = [], totalWeight = 0;
    const pickSpot = (): SpotPx | null => {
      if (!spots.length) return null; let r = Math.random() * totalWeight;
      for (const s of spots) { r -= s.weight; if (r <= 0) return s; } return spots[spots.length - 1];
    };
    let path: Path = buildPath(0, 0, 1, 1, sgn, reach, ctrl), raf = 0, particles: Particle[] = [], t = 0, last = performance.now(), avgDelta = 1;
    const acc = { puff: 0, wisp: 0, glyph: 0, spark: 0 }, wind: Wind = { x: 0, y: 0, px: -999, py: -999, power: 0 };

    for (const dh of DOT_HUES) getDotSprite(dh); for (const gh of GLYPH_HUES) getStarFlashSprite(gh);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const host = parent.parentElement, anchorEl = anchorSelector ? document.querySelector(anchorSelector) : null, anchored = !!(anchorEl && host);
      let ax = 0, ay = 0, aw = 0, ah = 0;
      if (anchored && anchorEl && host) {
        const hr = parent.getBoundingClientRect(), ar = anchorEl.getBoundingClientRect();
        ax = ar.left - hr.left; ay = ar.top - hr.top; aw = ar.width; ah = ar.height;
        const hpx = `${Math.round(ay + ah)}px`; if (parent.style.height !== hpx) parent.style.height = hpx;
      } else if (anchorSelector) parent.style.height = `${Math.min(4000, document.documentElement.scrollHeight)}px`;
      w = parent.clientWidth; h = anchored ? Math.round(ay + ah) : parent.clientHeight || 450;
      const boxX = anchored ? ax : 0, boxY = anchored ? ay : 0, boxW = anchored ? aw : w, boxH = anchored ? ah : h;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sdpr = Math.min(dpr, 1) * SMOKE_RES; smokeCanvas.width = Math.max(1, Math.round(w * sdpr)); smokeCanvas.height = Math.max(1, Math.round(h * sdpr)); sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);
      const cr = canvas.getBoundingClientRect(); pageLeft = cr.left + window.scrollX; pageTop = cr.top + window.scrollY;
      const ox = boxX + boxW * originX, oy = boxY + boxH * originY; groundPx = boxY + boxH * groundY;

      spots = landingSpots.map((s) => ({
        x: boxX + boxW * s.x, y: boxY + boxH * s.y, spread: boxW * (s.spread ?? 0.03), ySpread: boxH * (s.ySpread ?? 0.02), weight: s.weight ?? 1,
      }));
      totalWeight = spots.reduce((a, s) => a + s.weight, 0);

      const fwdAvail = direction === "left" ? ox : w - ox, backAvail = direction === "left" ? w - ox : ox;
      const limits: number[] = [boxH / 360, (fwdAvail * 0.96) / Math.max(1, ext.fwd * reach)];
      if (ext.back > 0) limits.push((backAvail * 0.94) / Math.max(1, ext.back * reach)); k = Math.max(0.45, Math.min(...limits));

      let topMargin = menuHeight + topGap, boost = heightBoost;
      const targetEl = targetSelector ? document.querySelector(targetSelector) : null;
      if (targetEl) {
        const tr = targetEl.getBoundingClientRect(), pr = parent.getBoundingClientRect();
        topMargin = tr.top - pr.top - tr.height + topGap; boost = 1;
      }
      topLimit = topMargin; const upAvail = Math.max(60, oy - topMargin); ky = (upAvail / ext.up) * boost;
      if (ext.down > 20) ky = Math.min(ky, ((h - oy) * 0.96) / ext.down);
      path = buildPath(ox, oy, k, ky, sgn, reach, ctrl);
    };
    resize(); window.addEventListener("resize", resize); window.addEventListener("load", resize);
    let rz = 0; const scheduleResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resize); };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleResize) : null;
    ro?.observe(parent); if (parent.parentElement) ro?.observe(parent.parentElement);
    if (anchorSelector) { const ael = document.querySelector(anchorSelector); if (ael) ro?.observe(ael); }
    if (targetSelector) { const el = document.querySelector(targetSelector); if (el) ro?.observe(el); }
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true; }) : null;
    io?.observe(parent);

    const onMove = (cx: number, cy: number) => {
      const x = cx + window.scrollX - pageLeft, y = cy + window.scrollY - pageTop;
      wind.x = x - wind.px; wind.y = y - wind.py; wind.px = x; wind.py = y; wind.power = Math.min(1, Math.hypot(wind.x, wind.y) / 25);
    };
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY), tm = (e: TouchEvent) => onMove(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener("mousemove", mm); window.addEventListener("touchmove", tm, { passive: true });

    const emit = (kind: Kind) => {
      if (cnt[kind] < CAP[kind]) { const np = new Particle(kind, glyphs); np.starScale = starScale; particles.push(np); cnt[kind]++; }
    };

    const spawnFlash = (fx: number, fy: number, hue: number) => {
      const main = new Particle("flash", glyphs); main.x = fx; main.y = fy; main.hue = hue;
      
      // === EXPLOSION SIZE YAHAN REDUCE KIYA GAYA HAI ===
      // Main Star base size reduced to approx ~0.25
      main.size = rand(0.2, 0.3) * flashScale; main.maxLife = rand(40, 60); particles.push(main);
      
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const sp = new Particle("flash", glyphs), a = rand(Math.PI * 1.05, Math.PI * 1.95), v = rand(0.15, 0.55) * Math.max(0.5, flashScale);
        sp.x = fx; sp.y = fy; sp.vx = Math.cos(a) * v; sp.vy = Math.sin(a) * v; sp.hue = Math.random() < 0.5 ? hue : 45;
        
        // Scatter Sparks proportionally reduced
        sp.size = rand(0.05, 0.15) * flashScale; sp.maxLife = rand(24, 40); particles.push(sp);
      }
    };

    const frame = (now: number) => {
      if (!visible) { last = now; raf = requestAnimationFrame(frame); return; }
      const rawDelta = Math.min((now - last) / 16.667, 2.5); last = now; avgDelta += (rawDelta - avgDelta) * 0.07; const dt = avgDelta * speed; t += dt / 60;
      ctx.clearRect(0, 0, w, h); sctx.clearRect(0, 0, w, h);
      cnt.puff = cnt.wisp = cnt.glyph = cnt.spark = cnt.flash = 0;
      for (let i = 0; i < particles.length; i++) cnt[particles[i].kind]++;

      acc.puff += dt * 1.2 * rate; 
      acc.wisp += dt * 1.4 * rate; 
      if (showGlyphs) acc.glyph += dt * 0.5 * rate;
      acc.spark += dt * 1.0 * rate;

      while (acc.puff >= 1) { acc.puff--; emit("puff"); }
      while (acc.wisp >= 1) { acc.wisp--; emit("wisp"); }
      if (acc.glyph >= 1) {
        let free = true;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.kind === "glyph" && !p.isRaining && p.u < glyphGap) { free = false; break; }
        }
        if (free) { acc.glyph = 0; emit("glyph"); } else acc.glyph = 1;
      }
      while (acc.spark >= 1) { acc.spark--; emit("spark"); }

      const groundLevelPx = groundPx;
      for (let i = 0; i < particles.length; i++) particles[i].update(t, dt, wind, path, k, groundLevelPx, pickSpot, spawnFlash);
      let alive = 0;
      for (let i = 0; i < particles.length; i++) { const p = particles[i]; if (p.u < 1) particles[alive++] = p; }
      particles.length = alive;

      sctx.globalCompositeOperation = "screen";
      for (const p of particles) if (p.kind === "puff") p.draw(sctx, k, sdpr);
      for (const p of particles) if (p.kind === "wisp") p.draw(sctx, k, sdpr);
      sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = "source-over";

      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) if (p.kind === "glyph") p.draw(ctx, k, dpr);
      for (const p of particles) if (p.kind === "spark") p.draw(ctx, k, dpr);
      for (const p of particles) if (p.kind === "flash") p.draw(ctx, k, dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

      wind.power *= Math.pow(0.92, dt); raf = requestAnimationFrame(frame);
    };

    let cancelled = false; const warm: Array<() => void> = [];
    for (const hue of SMOKE_HUES) for (let v = 0; v < 3; v++) warm.push(() => { getNoiseSprite(hue, v); });
    for (const text of new Set(glyphs)) warm.push(() => { const hh = glyphHueFor(text); getGlyphSprite(text, hh); getSoftSprite(hh, 68); });
    const runWarm = () => {
      if (cancelled) return; const job = warm.shift();
      if (job) { job(); setTimeout(runWarm, 0); } else { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    runWarm();

    return () => {
      cancelled = true; cancelAnimationFrame(raf); cancelAnimationFrame(rz);
      window.removeEventListener("resize", resize); window.removeEventListener("load", resize);
      ro?.disconnect(); io?.disconnect(); window.removeEventListener("mousemove", mm); window.removeEventListener("touchmove", tm);
      particles = [];
    };
  }, [originX, originY, groundY, menuHeight, topGap, heightBoost, targetSelector, anchorSelector, mounted, glyphs, direction, spiral, drift, speed, showGlyphs, debug, landingSpots, flashScale, glyphGap, starScale]);

  if (!mounted) return null;

  const layer = (
    <div className={usePortal ? "pointer-events-none absolute left-0 top-0 w-full overflow-hidden" : "pointer-events-none absolute inset-0 overflow-hidden"} style={{ zIndex }} aria-hidden="true">
      <canvas ref={smokeRef} className="absolute left-0 top-0 w-full h-full mix-blend-screen opacity-95" />
      <canvas ref={canvasRef} className="absolute left-0 top-0 w-full h-full mix-blend-screen opacity-95" />
    </div>
  );

  return usePortal ? createPortal(layer, document.body) : layer;
}

export const PaintedSmoke = MagicalSmoke;
export default MagicalSmoke;
