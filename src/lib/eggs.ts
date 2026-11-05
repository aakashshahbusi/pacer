import { content, copy } from '../data/content'
import { getDayOffset } from '../data/plan'
import type { HabitLog, OwnWords, PlanDay, SessionResult } from '../types'
import { resultKey } from '../store/db'
import { requiredSessions, streakOnMorningOf } from './streak'

/** FNV-1a over a string → stable non-negative int. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

export type Pool = 'easy_run' | 'long_run' | 'workout' | 'lift' | 'rest' | 'missed' | 'morning'

/** The day's dominant session decides the pool: race > workout > long > easy run > lift-only > rest. */
export function dominantPool(day: PlanDay): Pool | 'race' | 'india' {
  if (day.location === 'India') return 'india'
  const s = day.sessions
  if (s.some((x) => x.kind === 'race')) return 'race'
  if (s.some((x) => x.kind === 'run' && (x.pace_key === 'tempo' || x.pace_key === 'hills' || x.pace_key === 'strides' || x.pace_key === 'tt' || x.pace_key === 'hm' || x.pace_key === 'mp')))
    return 'workout'
  if (s.some((x) => x.kind === 'run' && x.pace_key === 'long')) return 'long_run'
  if (s.some((x) => x.kind === 'run' && !x.optional)) return 'easy_run'
  if (s.some((x) => x.kind === 'lift')) return 'lift'
  if (s.some((x) => x.kind === 'run')) return 'easy_run' // optional-only run day
  return 'rest'
}

export function pick<T>(pool: T[], seed: string): T {
  return pool[hashString(seed) % pool.length]
}

export function ownWords(showOn: string): OwnWords | undefined {
  return content.easter_eggs.his_own_words.find((w) => w.show_on === showOn)
}

/** Yesterday had a required session that was skipped, or never logged once the day was over. */
export function missedYesterday(day: PlanDay, results: Record<string, SessionResult>, today: string): boolean {
  const y = getDayOffset(day.date, -1)
  if (!y || y.date >= today) return false
  return requiredSessions(y).some((s) => {
    const r = results[resultKey(y.date, s.id)]
    return !r || r.status === 'skipped'
  })
}

export interface EggLine {
  text: string
  /** attribution for his own words */
  source?: string
  kind: 'pinned' | 'own' | 'morning' | 'rotating' | 'race' | 'india'
}

export interface EggContext {
  today: string
  now?: Date
  results: Record<string, SessionResult>
}

/**
 * The Today line:
 * 1. pinned day.egg wins
 * 2. day after a missed session → his own words / the `missed` pool
 * 3. before 10 AM (today only), 30% of days → a `morning` line
 * 4. otherwise the dominant-session pool, index = hash(date)
 */
export function eggFor(day: PlanDay, ctx: EggContext): EggLine | null {
  if (day.egg) return { text: day.egg, kind: 'pinned' }

  if (missedYesterday(day, ctx.results, ctx.today)) {
    const own = ownWords('the day after a missed session')
    const options: EggLine[] = [
      ...(own ? [{ text: own.text, source: own.source, kind: 'own' as const }] : []),
      ...content.easter_eggs.rotating.missed.map((t) => ({ text: t, kind: 'rotating' as const })),
    ]
    return pick(options, `${day.date}|missed`)
  }

  const pool = dominantPool(day)
  if (pool === 'india') return { text: copy.india, kind: 'india' }
  if (pool === 'race') {
    const race = day.sessions.find((x) => x.kind === 'race')
    const details = race?.details ?? []
    return details.length ? { text: pick(details, day.date), kind: 'race' } : { text: copy.race_day, kind: 'race' }
  }

  const now = ctx.now ?? new Date()
  if (day.date === ctx.today && now.getHours() < 10 && hashString(`${day.date}|morning`) % 100 < 30) {
    return { text: pick(content.easter_eggs.rotating.morning, `${day.date}|m`), kind: 'morning' }
  }

  const lines = content.easter_eggs.rotating[pool]
  return { text: pick(lines, day.date), kind: 'rotating' }
}

/** Streak milestone line for the Today header, if the streak hits a milestone number on that morning. */
export function streakMilestone(date: string, results: Record<string, SessionResult>, habits: Record<string, HabitLog>): string | null {
  const n = streakOnMorningOf(date, results, habits)
  const line = content.easter_eggs.rotating.streak[String(n)]
  return line ?? null
}

export const ruleSix = content.rules.find((r) => r.n === 6)
