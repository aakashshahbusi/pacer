import type { PlanDay } from '../types'
import { content } from '../data/content'
import { useActions, useStore } from '../store/store'
import { habitKey } from '../store/db'
import { Icon } from './Icon'
import { dowShort } from '../lib/dates'
import { habitsDone, habitsNeeded } from '../lib/streak'

function wakeTimeFor(day: PlanDay, wakeTimes: Record<string, string>): string | null {
  const dow = dowShort(day.date)
  const key = ['Mon', 'Tue', 'Wed', 'Thu'].includes(dow) ? 'Mon–Thu' : 'Fri–Sun'
  return wakeTimes[key] ?? day.wake_time
}

export function HabitRow({ day }: { day: PlanDay }) {
  const { habits, settings } = useStore()
  const { setHabit } = useActions()
  const defs = content.habits.daily.filter((h) => day.habits.includes(h.key))
  if (!defs.length) return null
  const n = habitsDone(day, habits)
  const need = habitsNeeded(day)
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Habits</h2>
        <span className={`tabular text-[13px] font-semibold ${n >= need ? 'text-success' : 'text-muted'}`}>{n}/{defs.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {defs.map((h) => {
          const on = !!habits[habitKey(day.date, h.key)]?.done
          const wake = h.key === 'wake_time' ? wakeTimeFor(day, settings.wakeTimes) : null
          return (
            <button
              key={h.key}
              onClick={() => setHabit(day.date, h.key, !on)}
              aria-pressed={on}
              className={`flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors ${on ? 'bg-success/12 border-success/40' : 'bg-surface border-border'}`}
            >
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? 'bg-success border-success text-black check-pop' : 'border-muted/50 text-transparent'}`}>
                <Icon name="check" size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight">
                  {h.label}
                  {wake && <span className="tabular text-muted font-medium"> · {wake}</span>}
                </span>
                <span className="block text-[12px] text-muted leading-tight truncate">{h.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
