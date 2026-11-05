import { describe, it, expect } from 'vitest'
import { dominantPool, eggFor, hashString, missedYesterday, streakMilestone } from './eggs'
import { getDay } from '../data/plan'
import { content } from '../data/content'
import { resultKey, habitKey } from '../store/db'

describe('easter eggs', () => {
  it('pinned egg wins', () => {
    const d = getDay('2026-11-08')!
    expect(eggFor(d, { today: '2026-11-08', results: {} })?.text).toBe(d.egg)
  })
  it('is deterministic by date and uses the dominant pool', () => {
    const d = getDay('2026-12-02')! // easy run, no pinned egg
    expect(d.egg).toBeNull()
    expect(dominantPool(d)).toBe('easy_run')
    const y = getDay('2026-12-01')!
    const results = Object.fromEntries(y.sessions.map((s) => [resultKey(y.date, s.id), { date: y.date, session_id: s.id, status: 'done' as const, loggedAt: 'x' }]))
    const ctx = { today: '2026-12-02', now: new Date(2026, 11, 2, 14, 0), results }
    const a = eggFor(d, ctx)!
    const b = eggFor(d, ctx)!
    expect(a.text).toBe(b.text)
    expect(content.easter_eggs.rotating.easy_run).toContain(a.text)
  })
  it('long-run days use the long_run pool, lift-only days the lift pool, rest days the rest pool', () => {
    const long = getDay('2026-12-11')!
    expect(dominantPool(long)).toBe('long_run')
    const lift = getDay('2026-12-08')!
    expect(dominantPool(lift)).toBe('lift')
    const rest = getDay('2026-12-12')!
    expect(['rest', 'easy_run']).toContain(dominantPool(rest))
  })
  it('day after a missed session shows his own words or a missed line', () => {
    const d = getDay('2026-12-03')! // day after Dec 2 easy run
    expect(missedYesterday(d, {}, '2026-12-10')).toBe(true)
    const line = eggFor(d, { today: '2026-12-10', results: {} })!
    const ok = [content.easter_eggs.his_own_words[0].text, ...content.easter_eggs.rotating.missed]
    expect(ok).toContain(line.text)
    // done yesterday → not missed
    const results = { [resultKey('2026-12-02', getDay('2026-12-02')!.sessions[0].id)]: { date: '2026-12-02', session_id: getDay('2026-12-02')!.sessions[0].id, status: 'done' as const, loggedAt: 'x' } }
    expect(missedYesterday(d, results, '2026-12-10')).toBe(false)
  })
  it('morning line only before 10 AM on today, 30% of days', () => {
    const d = getDay('2026-12-02')!
    const before = eggFor(d, { today: '2026-12-02', now: new Date(2026, 11, 2, 7, 30), results: {} })!
    const after = eggFor(d, { today: '2026-12-02', now: new Date(2026, 11, 2, 14, 0), results: {} })!
    expect(after.kind).toBe('rotating')
    expect(['morning', 'rotating']).toContain(before.kind)
    expect(before.kind === 'morning').toBe(hashString('2026-12-02|morning') % 100 < 30)
  })
  it('streak milestone appears the morning the streak hits 7', () => {
    const habits: Record<string, { date: string; key: string; done: boolean }> = {}
    const results: Record<string, { date: string; session_id: string; status: 'done'; loggedAt: string }> = {}
    for (let i = 5; i <= 11; i++) {
      const date = `2026-11-${String(i).padStart(2, '0')}`
      const day = getDay(date)!
      for (const k of day.habits) habits[habitKey(date, k)] = { date, key: k, done: true }
      for (const s of day.sessions) results[resultKey(date, s.id)] = { date, session_id: s.id, status: 'done', loggedAt: 'x' }
    }
    expect(streakMilestone('2026-11-12', results, habits)).toBe(content.easter_eggs.rotating.streak['7'])
    expect(streakMilestone('2026-11-11', results, habits)).toBeNull()
  })
})
