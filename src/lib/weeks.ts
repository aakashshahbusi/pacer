import { daysOfWeek, getDay, getWeek, plan } from '../data/plan'
import type { PlanDay, PlanWeek, Session, SessionResult } from '../types'
import { addDays } from './dates'
import { creditedMiles, isRunLike, resultFor, isCompleted } from './selectors'

export interface WeekSummary {
  week: PlanWeek
  days: PlanDay[]
  /** Mon..Sun ISO dates, including days outside the plan (null day). */
  strip: { date: string; day: PlanDay | null }[]
  plannedMiles: number
  actualMiles: number
  longRunPlanned: number
  longRunDone: number | null
  runsPlanned: number
  runsDone: number
  liftsPlanned: number
  liftsDone: number
  sessionsPlanned: number
  sessionsDone: number
  sessionsSkipped: number
}

export function weekIndexFor(date: string): number {
  const d = getDay(date)
  if (d) return d.week_index
  if (date < plan.start) return plan.weeks[0].index
  return plan.weeks[plan.weeks.length - 1].index
}

export function summarizeWeek(index: number, results: Record<string, SessionResult>): WeekSummary | null {
  const week = getWeek(index)
  if (!week) return null
  const days = daysOfWeek(index)
  const strip: WeekSummary['strip'] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(week.start, i)
    strip.push({ date, day: getDay(date) ?? null })
  }

  let plannedMiles = 0
  let actualMiles = 0
  let longRunDone: number | null = null
  let runsPlanned = 0
  let runsDone = 0
  let liftsPlanned = 0
  let liftsDone = 0
  let sessionsPlanned = 0
  let sessionsDone = 0
  let sessionsSkipped = 0

  for (const d of days) {
    for (const s of d.sessions) {
      const r = resultFor(results, d.date, s.id)
      if (isRunLike(s)) {
        if (!s.optional) {
          plannedMiles += s.distance_mi ?? 0
          runsPlanned++
        }
        const mi = creditedMiles(s, r)
        actualMiles += mi
        if (isCompleted(r)) {
          runsDone++
          if (!s.optional && (s.pace_key === 'long' || s.kind === 'race' || (s.distance_mi ?? 0) >= week.long_run_mi)) {
            if (longRunDone == null || mi > longRunDone) longRunDone = mi
          }
        }
      }
      if (s.kind === 'lift') {
        if (!s.optional) liftsPlanned++
        if (isCompleted(r)) liftsDone++
      }
      if (!s.optional) {
        sessionsPlanned++
        if (isCompleted(r)) sessionsDone++
        if (r?.status === 'skipped') sessionsSkipped++
      }
    }
  }

  return {
    week,
    days,
    strip,
    plannedMiles: round1(plannedMiles),
    actualMiles: round1(actualMiles),
    longRunPlanned: week.long_run_mi,
    longRunDone: week.long_run_mi > 0 ? longRunDone : null,
    runsPlanned,
    runsDone,
    liftsPlanned,
    liftsDone,
    sessionsPlanned,
    sessionsDone,
    sessionsSkipped,
  }
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export type DotState = 'planned' | 'done' | 'partial' | 'skipped'

export function dotState(day: PlanDay, s: Session, results: Record<string, SessionResult>): DotState {
  const r = resultFor(results, day.date, s.id)
  if (!r) return 'planned'
  if (r.status === 'done') return 'done'
  if (r.status === 'partial') return 'partial'
  return 'skipped'
}
