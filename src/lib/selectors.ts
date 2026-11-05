import { content } from '../data/content'
import { diffDays } from './dates'
import type { PlanDay, Race, Session, SessionResult } from '../types'
import { resultKey } from '../store/db'

export function resultFor(results: Record<string, SessionResult>, date: string, sessionId: string): SessionResult | undefined {
  return results[resultKey(date, sessionId)]
}

export function isResolved(r: SessionResult | undefined): boolean {
  return !!r && (r.status === 'done' || r.status === 'skipped' || r.status === 'partial')
}

export function isCompleted(r: SessionResult | undefined): boolean {
  return !!r && (r.status === 'done' || r.status === 'partial')
}

/** Miles credited for a run/race result. */
export function creditedMiles(s: Session, r: SessionResult | undefined): number {
  if (!r) return 0
  if (r.status === 'done') return r.actual_mi ?? s.distance_mi ?? 0
  if (r.status === 'partial') return r.actual_mi ?? 0
  return 0
}

export function isRunLike(s: Session): boolean {
  return s.kind === 'run' || s.kind === 'race'
}

export const HOME_LOCATIONS = ['Brownsburg', 'Spring break (TBD)', 'Glacier trip']
export function isHomeDay(day: PlanDay): boolean {
  return HOME_LOCATIONS.includes(day.location)
}

export function isIndiaDay(day: PlanDay): boolean {
  return day.location === 'India'
}

/** Next race on or after the date. */
export function nextRace(date: string): { race: Race; days: number } | null {
  for (const r of content.races) {
    if (r.date >= date) return { race: r, days: diffDays(date, r.date) }
  }
  return null
}

export function shortRaceName(r: Race): string {
  const map: Record<string, string> = {
    '2027-01-20': '5K time trial',
    '2027-02-13': '3-Miler',
    '2027-03-13': '6-Miler',
    '2027-04-10': '10-Miler',
    '2027-05-08': 'Indy Mini',
    '2027-06-26': 'Glacier',
    '2027-09-25': 'Mill Race',
    '2027-11-06': 'Monumental',
  }
  return map[r.date] ?? r.name
}

export function kindLabel(s: Session): string {
  switch (s.kind) {
    case 'run': return 'Run'
    case 'lift': return 'Lift'
    case 'race': return 'Race'
    case 'rest': return 'Rest'
    case 'off': return 'Off'
    case 'travel': return 'Travel'
    case 'swim': return 'Swim'
    case 'flex': return 'Flex'
  }
}
