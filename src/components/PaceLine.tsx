import type { Session } from '../types'
import { paceFor } from '../lib/pace'
import { useStore } from '../store/store'

export function PaceLine({ session }: { session: Session }) {
  const { settings } = useStore()
  const p = paceFor(session.pace_key, settings)
  if (!p) return null
  return (
    <div className="mt-3 rounded-xl bg-surface2/70 border border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{p.label}</span>
        {p.estimated && <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">estimated</span>}
      </div>
      {p.mode === 'zone' ? (
        <div className="tabular text-[24px] font-bold leading-tight mt-0.5">{p.primary}</div>
      ) : (
        <div className="text-[16px] font-semibold leading-snug mt-0.5">{p.primary}</div>
      )}
      {(p.secondary || p.slowOnPurpose) && (
        <div className="mt-0.5 text-[13px] text-muted">
          {p.secondary}
          {p.secondary && p.slowOnPurpose ? ' · ' : ''}
          {p.slowOnPurpose ? 'Slow on purpose.' : ''}
        </div>
      )}
    </div>
  )
}
