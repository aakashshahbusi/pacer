import { content } from '../data/content'
import type { PaceKey, Settings, FiveKEntry } from '../types'
import { fmtClock } from './dates'

export const FIVE_K_MILES = 3.10686
export const HALF_MILES = 13.1094
export const MARATHON_MILES = 26.2188

/** 5K pace in seconds per mile. */
export function p5k(fiveKSeconds: number): number {
  return fiveKSeconds / FIVE_K_MILES
}

/** Riegel: T2 = T1 × (D2 / D1)^1.06, distances in miles, D1 = 5K. */
export function riegelTime(fiveKSeconds: number, distanceMi: number): number {
  return fiveKSeconds * Math.pow(distanceMi / FIVE_K_MILES, 1.06)
}

export interface ZoneRange {
  lo: number // faster bound, sec/mile
  hi: number // slower bound, sec/mile
}

export type NumericZone = 'easy' | 'long' | 'tempo' | 'hm' | 'mp' | 'shakeout'

/** Raw (unrounded) zone bounds in sec/mile. */
export function zone(fiveKSeconds: number, key: NumericZone): ZoneRange {
  const p = p5k(fiveKSeconds)
  switch (key) {
    case 'easy':
    case 'shakeout':
      return { lo: p * 1.3, hi: p * 1.4 }
    case 'long':
      return { lo: p * 1.32, hi: p * 1.45 }
    case 'tempo':
      return { lo: p * 1.1, hi: p * 1.15 }
    case 'hm': {
      const per = riegelTime(fiveKSeconds, HALF_MILES) / HALF_MILES
      return { lo: per * 1.0, hi: per * 1.03 }
    }
    case 'mp': {
      const per = riegelTime(fiveKSeconds, MARATHON_MILES) / MARATHON_MILES
      return { lo: per * 1.08, hi: per * 1.15 }
    }
  }
}

export function round5(sec: number): number {
  return Math.round(sec / 5) * 5
}

/** "9:10 – 9:55 /mi" rounded to 5 s. */
export function formatZone(z: ZoneRange): string {
  return `${fmtClock(round5(z.lo))} – ${fmtClock(round5(z.hi))} /mi`
}

/** Treadmill mph for a pace, floored to one decimal so the belt errs slow. */
export function treadmillMph(secPerMile: number): number {
  const mph = 60 / (secPerMile / 60)
  return Math.floor(mph * 10 + 1e-9) / 10
}

export function formatMph(mph: number): string {
  return `${mph.toFixed(1)} mph`
}

export function isNumericZone(key: PaceKey | undefined): key is NumericZone {
  return key === 'easy' || key === 'long' || key === 'tempo' || key === 'hm' || key === 'mp' || key === 'shakeout'
}

/** Pull the quoted effort cue out of an effort-based zone description in content.json. */
function quotedCue(key: 'hills' | 'strides'): string {
  const raw = content.pace_engine.formulas.zones_sec_per_mile[key]?.[0] ?? ''
  const m = raw.match(/'([^']+)'/)
  return m ? m[1] : raw
}

export const effortCue = {
  hills: () => quotedCue('hills'),
  strides: () => quotedCue('strides'),
  tt: () => {
    const raw = content.pace_engine.formulas.zones_sec_per_mile.tt?.[0] ?? ''
    const m = raw.match(/'([^']+)'/)
    return m ? m[1] : 'faster than last time'
  },
}

/** The most recent entered 5K, or null. Latest by date; ties go to the latest entered. */
export function currentFiveK(settings: Pick<Settings, 'fiveK'>): FiveKEntry | null {
  if (!settings.fiveK.length) return null
  let best = settings.fiveK[0]
  for (const e of settings.fiveK) if (e.date >= best.date) best = e
  return best
}

/** The quoted line from content.pace_engine.talk_test_fallback. */
export function talkTestText(): string {
  const raw = content.pace_engine.talk_test_fallback
  const m = raw.match(/'([^']+)'/)
  return m ? m[1] : raw
}

export const BASELINE_5K = content.athlete.baseline_5k_seconds_for_pace_engine

export interface PaceDisplay {
  /** 'zone' shows a numeric range; 'talk' is the no-5K fallback for easy/long; 'effort' has no pace. */
  mode: 'zone' | 'talk' | 'effort' | 'tt'
  label: string
  primary: string
  secondary?: string
  estimated: boolean
  slowOnPurpose: boolean
}

export const zoneLabel: Record<PaceKey, string> = {
  easy: 'Easy pace',
  long: 'Long-run pace',
  tempo: 'Tempo',
  hills: 'Hills',
  strides: 'Strides',
  hm: 'Half-marathon pace',
  mp: 'Marathon pace',
  tt: 'Time trial',
  shakeout: 'Shakeout (easy)',
}

/**
 * What a run card shows for its pace_key.
 * - No 5K entered: easy/long/shakeout → talk-test fallback; other zones use the baseline and are tagged estimated.
 * - hills/strides: effort cue, no pace.
 * - tt: last 5K pace as the reference.
 */
export function paceFor(key: PaceKey | undefined, settings: Pick<Settings, 'fiveK'>): PaceDisplay | null {
  if (!key) return null
  const entered = currentFiveK(settings)
  const seconds = entered ? entered.seconds : BASELINE_5K
  const estimated = !entered
  const label = zoneLabel[key]

  if (key === 'hills' || key === 'strides') {
    return { mode: 'effort', label, primary: effortCue[key](), estimated: false, slowOnPurpose: false }
  }
  if (key === 'tt') {
    const ref = fmtClock(round5(p5k(seconds)))
    return {
      mode: 'tt',
      label,
      primary: `Last 5K pace ${ref} /mi`,
      secondary: `All out · ${effortCue.tt()}`,
      estimated,
      slowOnPurpose: false,
    }
  }
  const slow = key === 'easy' || key === 'long' || key === 'shakeout'
  if (slow && estimated) {
    return { mode: 'talk', label, primary: talkTestText(), estimated: true, slowOnPurpose: true }
  }
  const z = zone(seconds, key)
  const secondary = slow ? `treadmill ${formatMph(treadmillMph(round5(z.hi)))}` : undefined
  return { mode: 'zone', label, primary: formatZone(z), secondary, estimated, slowOnPurpose: slow }
}

/** All zones for a settings preview. */
export function allZones(fiveKSeconds: number) {
  const keys: NumericZone[] = ['easy', 'long', 'tempo', 'hm', 'mp']
  return keys.map((k) => {
    const z = zone(fiveKSeconds, k)
    return {
      key: k,
      label: zoneLabel[k],
      range: formatZone(z),
      treadmill: k === 'easy' || k === 'long' ? formatMph(treadmillMph(round5(z.hi))) : null,
    }
  })
}
