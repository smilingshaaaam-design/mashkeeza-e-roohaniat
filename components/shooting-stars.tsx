'use client'

import { useVisualCms } from '@/components/visual-cms'

/** Independent shooting stars: does not alter the smoke, starfield, or site CSS. */
export function ShootingStars() {
  const cms = useVisualCms()
  if (cms?.editing) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[12] overflow-hidden"
      style={{ height: 'min(700px, 75vw)', minHeight: 290 }}
    >
      <style>{`
        @keyframes mashkeeza-shooting-star {
          0%, 3% { opacity: 0; transform: translate3d(0, 0, 0) rotate(-24deg) scaleX(.6); }
          4% { opacity: .95; }
          10% { opacity: .9; }
          14%, 100% { opacity: 0; transform: translate3d(260px, 118px, 0) rotate(-24deg) scaleX(1); }
        }
        .mashkeeza-shooting-star {
          position: absolute;
          width: 115px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(to right, transparent 0%, rgba(255,225,163,.15) 18%, rgba(255,245,211,.8) 78%, #fff 100%);
          box-shadow: 0 0 7px 1px rgba(255,222,150,.35);
          opacity: 0;
          will-change: transform, opacity;
          transform-origin: right center;
          animation: mashkeeza-shooting-star var(--shoot-cycle) linear infinite;
          animation-delay: var(--shoot-delay);
        }
        .mashkeeza-shooting-star::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fffbea;
          box-shadow: 0 0 9px 3px rgba(255,226,166,.75);
          transform: translateY(-50%);
        }
        @media (prefers-reduced-motion: reduce) {
          .mashkeeza-shooting-star { animation: none !important; display: none; }
        }
      `}</style>
      <span className="mashkeeza-shooting-star" style={{ top: '12%', left: '14%', ['--shoot-cycle' as string]: '19s', ['--shoot-delay' as string]: '4s' }} />
      <span className="mashkeeza-shooting-star" style={{ top: '28%', left: '48%', ['--shoot-cycle' as string]: '27s', ['--shoot-delay' as string]: '13s' }} />
      <span className="mashkeeza-shooting-star" style={{ top: '7%', left: '62%', ['--shoot-cycle' as string]: '37s', ['--shoot-delay' as string]: '23s' }} />
    </div>
  )
}
