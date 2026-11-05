import { plan } from '../data/plan'
import { content } from '../data/content'
import type { SessionResult, Settings } from '../types'
import { creditedMiles, isCompleted, isRunLike, resultFor } from './selectors'
import { round1 } from './weeks'

export function totalMiles(results: Record<string, SessionResult>): number {
  let m = 0
  for (const d of plan.days) for (const s of d.sessions) if (isRunLike(s)) m += creditedMiles(s, resultFor(results, d.date, s.id))
  return round1(m)
}

export interface WeekBar {
  index: number
  start: string
  planned: number
  actual: number
}

export function milesByWeek(results: Record<string, SessionResult>): WeekBar[] {
  const map = new Map<number, WeekBar>()
  for (const w of plan.weeks) map.set(w.index, { index: w.index, start: w.start, planned: w.planned_miles, actual: 0 })
  for (const d of plan.days) {
    const bar = map.get(d.week_index)
    if (!bar) continue
    for (const s of d.sessions) if (isRunLike(s)) bar.actual += creditedMiles(s, resultFor(results, d.date, s.id))
  }
  return [...map.values()].map((b) => ({ ...b, actual: round1(b.actual) }))
}

export interface LongRunPoint {
  index: number
  start: string
  planned: number
  actual: number | null
}

/** Planned long run per week vs the longest completed run that week. */
export function longRunProgression(results: Record<string, SessionResult>): LongRunPoint[] {
  const out: LongRunPoint[] = []
  for (const w of plan.weeks) {
    let actual: number | null = null
    for (const d of plan.days) {
      if (d.week_index !== w.index) continue
      for (const s of d.sessions) {
        if (!isRunLike(s) || s.optional) continue
        const r = resultFor(results, d.date, s.id)
        if (!isCompleted(r)) continue
        const mi = creditedMiles(s, r)
        if (actual == null || mi > actual) actual = mi
      }
    }
    out.push({ index: w.index, start: w.start, planned: w.long_run_mi, actual })
  }
  return out
}

export interface RunningPR {
  label: string
  distance_mi: number
  seconds: number
  date: string
  source: 'baseline' | 'race' | 'time trial' | 'settings'
  note?: string
}

const DIST_LABEL: [number, string][] = [
  [1, 'Mile'],
  [2, '2 mile'],
  [3, '3 mile'],
  [3.1, '5K'],
  [6, '6 mile'],
  [10, '10 mile'],
  [13.1, 'Half marathon'],
  [26.2, 'Marathon'],
]

export function distanceLabel(mi: number): string {
  const hit = DIST_LABEL.find(([d]) => Math.abs(d - mi) < 0.06)
  return hit ? hit[1] : `${mi} mi`
}

function distKey(mi: number): number {
  const hit = DIST_LABEL.find(([d]) => Math.abs(d - mi) < 0.06)
  return hit ? hit[0] : mi
}

/** Running PRs by distance: baseline from content.json, improved by race finishes, the time trial and entered 5Ks. */
export function runningPRs(results: Record<string, SessionResult>, settings: Pick<Settings, 'fiveK'>): RunningPR[] {
  const best = new Map<number, RunningPR>()
  const consider = (pr: RunningPR) => {
    const k = distKey(pr.distance_mi)
    const cur = best.get(k)
    if (!cur || pr.seconds < cur.seconds) best.set(k, { ...pr, distance_mi: k, label: distanceLabel(k) })
  }
  const base = content.athlete.baseline_prs
  const baseDist: Record<string, number> = { mile: 1, two_mile: 2, five_k: 3.1 }
  for (const [key, v] of Object.entries(base)) {
    consider({ label: distanceLabel(baseDist[key] ?? 0), distance_mi: baseDist[key] ?? 0, seconds: v.seconds, date: v.date, source: 'baseline', note: v.note })
  }
  for (const d of plan.days) {
    for (const s of d.sessions) {
      if (!(s.kind === 'race' || s.pace_key === 'tt')) continue
      const r = resultFor(results, d.date, s.id)
      if (!r || !r.finish_time_sec || r.status === 'skipped') continue
      const dist = s.pace_key === 'tt' ? 3.1 : (s.distance_mi ?? 0)
      consider({ label: distanceLabel(dist), distance_mi: dist, seconds: r.finish_time_sec, date: d.date, source: s.pace_key === 'tt' ? 'time trial' : 'race' })
    }
  }
  for (const e of settings.fiveK) consider({ label: '5K', distance_mi: 3.1, seconds: e.seconds, date: e.date, source: 'settings' })
  return [...best.values()].sort((a, b) => a.distance_mi - b.distance_mi)
}

export function runsCompleted(results: Record<string, SessionResult>): number {
  let n = 0
  for (const d of plan.days) for (const s of d.sessions) if (isRunLike(s) && isCompleted(resultFor(results, d.date, s.id))) n++
  return n
}
