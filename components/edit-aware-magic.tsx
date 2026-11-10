'use client'

import { useVisualCms } from '@/components/visual-cms'
import { Starfield } from '@/components/magic/starfield'
import { Mashk } from '@/components/magic/mashk'
import { PaintedSmoke } from '@/components/magic/painted-smoke'

/** Decorative effects are unmounted in authenticated edit mode. */
export function EditAwareMagic({ kind }: { kind: 'smoke' | 'stars' | 'mashk' }) {
  const cms = useVisualCms()
  if (cms?.editing) return null
  if (kind === 'smoke') return <PaintedSmoke anchorSelector="#hero-stage" zIndex={10} menuHeight={90} />
  if (kind === 'stars') return <Starfield count={90} seed={11} className="inset-x-0 top-0 h-[38%]" />
  return <Mashk />
}
