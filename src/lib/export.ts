import { plan, getDay } from '../data/plan'
import { content, labels } from '../data/content'
import type { StoreState } from '../store/store'
import { addDays, fmtClock, formatMonthDay, formatShort } from './dates'
import { creditedMiles, isRunLike, resultFor } from './selectors'
import { topSet } from './lifts'
import { habitsDone } from './streak'
import { computeStreak } from './streak'
import { summarizeWeek, weekIndexFor } from './weeks'
import { currentFiveK } from './pace'

/** Plain-text summary of the last 7 days for pasting to Claude at the Sunday check-in. */
export function sundayExport(today: string, state: Pick<StoreState, 'results' | 'liftLogs' | 'habits' | 'customLogs' | 'settings'>): string {
  const lines: string[] = []
  const start = addDays(today, -6)
  lines.push(`Pacer · ${content.app.tagline}`)
  lines.push(`Sunday check-in export · ${formatMonthDay(start)} – ${formatMonthDay(today)}`)
  lines.push('')

  // Totals over the 7 days
  let planned = 0
  let actual = 0
  let runsPlanned = 0
  let runsDone = 0
  let liftsPlanned = 0
  let liftsDone = 0
  let skipped = 0
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const day = getDay(d)
    if (!day) continue
    for (const s of day.sessions) {
      const r = resultFor(state.results, d, s.id)
      if (isRunLike(s)) {
        if (!s.optional) {
          planned += s.distance_mi ?? 0
          runsPlanned++
        }
        actual += creditedMiles(s, r)
        if (r && r.status !== 'skipped') runsDone++
      }
      if (s.kind === 'lift') {
        if (!s.optional) liftsPlanned++
        if (r && r.status !== 'skipped') liftsDone++
      }
      if (!s.optional && r?.status === 'skipped') skipped++
    }
  }
  const streak = computeStreak(today, state.results, state.habits)
  lines.push(`Miles: ${round1(actual)} actual / ${round1(planned)} planned`)
  lines.push(`Runs: ${runsDone}/${runsPlanned} · Lifts: ${liftsDone}/${liftsPlanned}${skipped ? ` · Skipped: ${skipped}` : ''}`)
  lines.push(`Streak: ${streak.current} days (longest ${streak.longest})`)
  const fk = currentFiveK(state.settings)
  lines.push(`5K on file: ${fk ? `${fmtClock(fk.seconds)} (${fk.date})` : `none — ${content.athlete.baseline_5k_label}`}`)

  // Plan week budget vs actual
  const w = summarizeWeek(weekIndexFor(today), state.results)
  if (w) {
    lines.push('')
    lines.push(`${labels.weekly_summary} · Week ${w.week.index} (${w.week.label}) · ${formatMonthDay(w.week.start)} – ${formatMonthDay(w.week.end)}`)
    lines.push(`  ${w.actualMiles} / ${w.plannedMiles} mi · long run ${w.longRunDone ?? '—'} / ${w.longRunPlanned || '—'} · runs ${w.runsDone}/${w.runsPlanned} · lifts ${w.liftsDone}/${w.liftsPlanned}${w.week.deload ? ' · deload' : ''}`)
    lines.push(`  Focus: ${w.week.focus}`)
  }

  lines.push('')
  lines.push('Day by day')
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const day = getDay(d)
    if (!day) continue
    lines.push(`${formatShort(d)} · ${day.location}`)
    for (const s of day.sessions) {
      const r = resultFor(state.results, d, s.id)
      let status = r ? r.status : 'not logged'
      if (r && (r.status === 'done' || r.status === 'partial')) {
        const bits: string[] = []
        if (isRunLike(s)) bits.push(`${creditedMiles(s, r)} mi`)
        if (r.finish_time_sec) bits.push(fmtClock(r.finish_time_sec, (s.distance_mi ?? 0) >= 10))
        if (r.actual_min) bits.push(`${r.actual_min} min`)
        if (bits.length) status += ` (${bits.join(', ')})`
      }
      lines.push(`  - ${s.title}${s.optional ? ' (optional)' : ''}: ${status}`)
      if (s.kind === 'lift') {
        const logs = Object.values(state.liftLogs).filter((l) => l.date === d && l.session_id === s.id)
        for (const l of logs) {
          const t = topSet(l.sets)
          if (t && t.weight != null) lines.push(`      ${l.exercise}: top set ${t.weight} × ${t.reps ?? '—'}`)
        }
      }
    }
    if (day.habits.length) {
      const done = day.habits.filter((k) => state.habits[`${d}|${k}`]?.done)
      lines.push(`  Habits ${done.length}/${day.habits.length}${done.length ? `: ${done.map((k) => content.habits.daily.find((h) => h.key === k)?.label ?? k).join(', ')}` : ''}`)
    }
    const logs = state.customLogs.filter((c) => c.date === d)
    for (const c of logs) {
      lines.push(`  Log · ${c.type.split(' (')[0]}: ${c.text}${c.value != null ? ` — ${c.value}${c.unit ? ` ${c.unit}` : ''}` : ''}`)
    }
  }
  lines.push('')
  lines.push(`Plan: ${plan.app} ${plan.generated} · exported ${today}`)
  return lines.join('\n')
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export { habitsDone }
