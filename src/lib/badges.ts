import { plan, getDay } from '../data/plan'
import { content } from '../data/content'
import type { HabitLog, LiftLog, SessionResult, Settings } from '../types'
import { creditedMiles, isCompleted, isRunLike, resultFor } from './selectors'
import { habitKey } from '../store/db'
import { addDays } from './dates'

export interface BadgeContext {
  today: string
  results: Record<string, SessionResult>
  liftLogs: Record<string, LiftLog>
  habits: Record<string, HabitLog>
  settings: Settings
}

type Rule = (c: BadgeContext) => boolean

function completedRuns(c: BadgeContext) {
  const out: { date: string; miles: number; location: string }[] = []
  for (const d of plan.days)
    for (const s of d.sessions) {
      if (!isRunLike(s)) continue
      const r = resultFor(c.results, d.date, s.id)
      if (isCompleted(r)) out.push({ date: d.date, miles: creditedMiles(s, r), location: s.location ?? '' })
    }
  return out
}

function raceDone(c: BadgeContext, date: string): boolean {
  const d = getDay(date)
  if (!d) return false
  return d.sessions.some((s) => s.kind === 'race' && isCompleted(resultFor(c.results, date, s.id)))
}

const rules: Record<string, Rule> = {
  // Complete Nov 8, 2026
  slow_one: (c) => {
    const d = getDay('2026-11-08')
    return !!d && d.sessions.some((s) => s.kind === 'run' && isCompleted(resultFor(c.results, d.date, s.id)))
  },
  // First lift logged
  bar_remembers: (c) =>
    plan.days.some((d) => d.sessions.some((s) => s.kind === 'lift' && isCompleted(resultFor(c.results, d.date, s.id)))) ||
    Object.values(c.liftLogs).some((l) => l.sets.some((s) => s.weight != null)),
  // 10 runs logged
  section_e: (c) => completedRuns(c).length >= 10,
  // First SRSC indoor track run
  eight_laps: (c) => completedRuns(c).some((r) => /SRSC indoor track/i.test(r.location)),
  // First 5-mile run
  griffy: (c) => completedRuns(c).some((r) => r.miles >= 5),
  // 7 straight wake-times hit after Nov 26
  reset: (c) => {
    let run = 0
    let d = '2026-11-26'
    while (d <= c.today && d <= plan.end) {
      if (c.habits[habitKey(d, 'wake_time')]?.done) {
        run++
        if (run >= 7) return true
      } else run = 0
      d = addDays(d, 1)
    }
    return false
  },
  // Phase 0 complete with 3 runs/week since India: ≥3 runs done in each full week Nov 30 → Dec 27
  phase1: (c) => {
    if (c.today < '2027-01-01') return false
    const weeks = [5, 6, 7, 8]
    for (const w of weeks) {
      let n = 0
      for (const d of plan.days) {
        if (d.week_index !== w) continue
        for (const s of d.sessions) if (isRunLike(s) && isCompleted(resultFor(c.results, d.date, s.id))) n++
      }
      if (n < 3) return false
    }
    return true
  },
  // Enter the Jan 20 time trial
  tt: (c) => {
    if (c.settings.fiveK.some((e) => e.date === '2027-01-20')) return true
    const d = getDay('2027-01-20')
    return !!d && d.sessions.some((s) => s.pace_key === 'tt' && !!resultFor(c.results, d.date, s.id)?.finish_time_sec)
  },
  // First 10-mile run
  double_digits: (c) => completedRuns(c).some((r) => r.miles >= 10),
  // Indy Mini complete
  bricks: (c) => raceDone(c, '2027-05-08'),
  // Glacier Half complete
  two_medicine: (c) => raceDone(c, '2027-06-26'),
  // 400 miles on one pair of shoes
  depreciated: (c) => c.settings.shoes.some((s) => s.miles >= 400),
  // 20-mile run complete
  the_twenty: (c) => completedRuns(c).some((r) => r.miles >= 20),
  // Marathon complete
  monumental: (c) => raceDone(c, '2027-11-06'),
  // First swim logged
  ironman_1: (c) => plan.days.some((d) => d.sessions.some((s) => s.kind === 'swim' && isCompleted(resultFor(c.results, d.date, s.id)))),
}

/** Badge keys whose unlock rule is satisfied right now. */
export function satisfiedBadges(c: BadgeContext): string[] {
  return content.easter_eggs.badges.filter((b) => rules[b.key]?.(c)).map((b) => b.key)
}

export const badgeDefs = content.easter_eggs.badges
