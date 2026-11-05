import { content } from '../data/content'
import type { Settings, Shoe } from '../types'

export function defaultShoes(): Shoe[] {
  return content.athlete.shoes.map((s, i) => ({
    id: `shoe-${i + 1}`,
    name: s.name,
    firstRun: s.first_run,
    miles: 0,
    retireAt: s.retire_at_miles,
    active: i === 0,
  }))
}

export function defaultSettings(): Settings {
  return {
    fiveK: [],
    wakeTimes: { ...content.sleep.wake_time },
    theme: 'dark',
    shoes: defaultShoes(),
    hiddenOptional: [],
  }
}

/** Merge a possibly partial / older settings object onto defaults. */
export function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  const d = defaultSettings()
  if (!s) return d
  return {
    fiveK: Array.isArray(s.fiveK) ? s.fiveK.filter((e) => e && typeof e.seconds === 'number' && typeof e.date === 'string') : d.fiveK,
    wakeTimes: { ...d.wakeTimes, ...(s.wakeTimes ?? {}) },
    theme: s.theme === 'light' ? 'light' : 'dark',
    shoes: Array.isArray(s.shoes) && s.shoes.length ? s.shoes : d.shoes,
    hiddenOptional: Array.isArray(s.hiddenOptional) ? s.hiddenOptional : [],
  }
}
