/**
 * Brings the smoke that is painted into desert-scene.png to life.
 * A copy of the exact same artwork is cropped to the smoke plume and run through an
 * animated turbulence displacement filter, so the original smoke itself drifts, curls
 * and rises instead of a separate effect being drawn on top of it.
 *
 * Box values are percentages of the 1584x672 scene and must stay aligned with it.
 */
const BOX = { left: 68.5, top: 21, width: 24, height: 50 }

const crop = {
  width: `${(100 / BOX.width) * 100}%`,
  height: `${(100 / BOX.height) * 100}%`,
  left: `${-(BOX.left / BOX.width) * 100}%`,
  top: `${-(BOX.top / BOX.height) * 100}%`,
}

function SmokeLayer({ filter, className }: { filter: string; className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`painted-smoke absolute overflow-hidden ${className}`}
      style={{
        left: `${BOX.left}%`,
        top: `${BOX.top}%`,
        width: `${BOX.width}%`,
        height: `${BOX.height}%`,
        filter: `url(#${filter})`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/desert-scene.png"
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={crop}
      />
    </div>
  )
}

export function PaintedSmoke() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <defs>
          <filter id="smoke-flow" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.026" numOctaves="2" seed="4" result="noise">
              <animate
                attributeName="baseFrequency"
                dur="14s"
                values="0.011 0.026;0.016 0.034;0.009 0.022;0.011 0.026"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G" scale="22">
              <animate attributeName="scale" dur="7s" values="16;30;20;16" repeatCount="indefinite" />
            </feDisplacementMap>
          </filter>
          <filter id="smoke-curl" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="turbulence" baseFrequency="0.02 0.045" numOctaves="2" seed="9" result="noise">
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.02 0.045;0.026 0.035;0.016 0.05;0.02 0.045"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="G" yChannelSelector="R" scale="34">
              <animate attributeName="scale" dur="5s" values="24;44;30;24" repeatCount="indefinite" />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
      </svg>

      <SmokeLayer filter="smoke-flow" className="painted-smoke-base" />
      <SmokeLayer filter="smoke-curl" className="painted-smoke-glow mix-blend-screen" />

      <div
        aria-hidden="true"
        className="lamp-spout-glow absolute rounded-full"
        style={{ left: '73.2%', top: '61%', width: '6%', height: '14%' }}
      />
    </div>
  )
}
