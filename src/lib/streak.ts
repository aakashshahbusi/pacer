import { plan, getDay } from '../data/plan'
import { addDays } from './dates'
import type { HabitLog, PlanDay, SessionResult } from '../types'
import { habitKey, resultKey } from '../store/db'
import { isIndiaDay } from './selectors'

export const HABITS_NEEDED = 3

/** Sessions that must be checked for a day to count: non-optional run/lift/race/swim. Rest-type days count on habits alone. */
export function requiredSessions(day: PlanDay) {
  return day.sessions.filter((s) => !s.optional && (s.kind === 'run' || s.kind === 'lift' || s.kind === 'race' || s.kind === 'swim'))
}

export function habitsDone(day: PlanDay, habits: Record<string, HabitLog>): number {
  return day.habits.filter((k) => habits[habitKey(day.date, k)]?.done).length
}

export function habitsNeeded(day: PlanDay): number {
  return Math.min(HABITS_NEEDED, day.habits.length)
}

/** Every non-optional session resolved (done / partial / skipped) and ≥3 habits → the Today screen shows the closed state. */
export function isDayClosed(day: PlanDay, results: Record<string, SessionResult>, habits: Record<string, HabitLog>): boolean {
  const allResolved = day.sessions
    .filter((s) => !s.optional)
    .every((s) => !!results[resultKey(day.date, s.id)])
  return allResolved && habitsDone(day, habits) >= habitsNeeded(day)
}

/**
 * Streak rule (content.habits.streak_rule): a day counts when every required session is done or partial
 * (skipped breaks it) and at least 3 of the day's habits are done. Rest/off days count on habits alone.
 * India days always count.
 */
export function dayCounts(day: PlanDay, results: Record<string, SessionResult>, habits: Record<string, HabitLog>): boolean {
  if (isIndiaDay(day)) return true
  for (const s of requiredSessions(day)) {
    const r = results[resultKey(day.date, s.id)]
    if (!r || r.status === 'skipped') return false
  }
  return habitsDone(day, habits) >= habitsNeeded(day)
}

/** True when a skipped required session makes the day unable to count. */
export function hasSkip(day: PlanDay, results: Record<string, SessionResult>): boolean {
  return requiredSessions(day).some((s) => results[resultKey(day.date, s.id)]?.status === 'skipped')
}

export interface StreakInfo {
  current: number
  longest: number
  /** The last judged day (yesterday) broke a streak of this length; 0 when nothing broke. */
  brokeYesterday: number
  /** ISO date the current streak started, or null. */
  since: string | null
}

/** Days are judged only once they're over: everything before `today` (local). */
export function computeStreak(
  today: string,
  results: Record<string, SessionResult>,
  habits: Record<string, HabitLog>,
): StreakInfo {
  // Current streak: walk back from yesterday.
  let current = 0
  let since: string | null = null
  let d = addDays(today, -1)
  while (d >= plan.start) {
    const day = getDay(d)
    if (!day || !dayCounts(day, results, habits)) break
    current++
    since = d
    d = addDays(d, -1)
  }

  // Longest: scan every judged day.
  let longest = 0
  let run = 0
  for (const day of plan.days) {
    if (day.date >= today) break
    if (dayCounts(day, results, habits)) {
      run++
      if (run > longest) longest = run
    } else run = 0
  }

  // Did yesterday break something?
  let brokeYesterday = 0
  const y = addDays(today, -1)
  const yDay = getDay(y)
  if (yDay && !dayCounts(yDay, results, habits)) {
    let n = 0
    let p = addDays(y, -1)
    while (p >= plan.start) {
      const pd = getDay(p)
      if (!pd || !dayCounts(pd, results, habits)) break
      n++
      p = addDays(p, -1)
    }
    brokeYesterday = n
  }

  return { current, longest, brokeYesterday, since }
}

/** Streak length a day would show "the day the streak hits that number": the count including the previous day. */
export function streakOnMorningOf(date: string, results: Record<string, SessionResult>, habits: Record<string, HabitLog>): number {
  return computeStreak(date, results, habits).current
}
