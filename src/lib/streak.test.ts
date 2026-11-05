import { describe, it, expect } from 'vitest'
import { computeStreak, dayCounts, isDayClosed } from './streak'
import { getDay } from '../data/plan'
import { habitKey, resultKey } from '../store/db'
import type { HabitLog, SessionResult } from '../types'

function done(date: string, id: string, status: SessionResult['status'] = 'done'): [string, SessionResult] {
  return [resultKey(date, id), { date, session_id: id, status, loggedAt: 'x' }]
}
function habit(date: string, key: string): [string, HabitLog] {
  return [habitKey(date, key), { date, key, done: true }]
}
function allHabits(date: string, n = 3) {
  const d = getDay(date)!
  return Object.fromEntries(d.habits.slice(0, n).map((k) => habit(date, k)))
}

describe('streak rule', () => {
  it('a run day needs the run done (or partial) and 3 habits', () => {
    const d = getDay('2026-11-08')! // The Slow One
    expect(dayCounts(d, {}, allHabits('2026-11-08'))).toBe(false)
    expect(dayCounts(d, Object.fromEntries([done('2026-11-08', 's0004')]), allHabits('2026-11-08'))).toBe(true)
    expect(dayCounts(d, Object.fromEntries([done('2026-11-08', 's0004', 'partial')]), allHabits('2026-11-08'))).toBe(true)
    expect(dayCounts(d, Object.fromEntries([done('2026-11-08', 's0004', 'skipped')]), allHabits('2026-11-08'))).toBe(false)
    expect(dayCounts(d, Object.fromEntries([done('2026-11-08', 's0004')]), allHabits('2026-11-08', 2))).toBe(false)
  })
  it('rest days count on habits alone', () => {
    const d = getDay('2026-11-05')!
    expect(dayCounts(d, {}, allHabits('2026-11-05'))).toBe(true)
    expect(dayCounts(d, {}, {})).toBe(false)
  })
  it('India days always count', () => {
    expect(dayCounts(getDay('2026-11-18')!, {}, {})).toBe(true)
  })
  it('optional sessions never affect it', () => {
    const d = getDay('2026-11-16')! // India flex, optional
    expect(d.sessions.every((s) => s.optional)).toBe(true)
    const sat = getDay('2027-03-20')! // optional swim
    expect(sat.sessions.some((s) => s.optional)).toBe(true)
    const required = sat.sessions.filter((s) => !s.optional)
    const results = Object.fromEntries(required.map((s) => done('2027-03-20', s.id)))
    expect(dayCounts(sat, results, allHabits('2027-03-20'))).toBe(true)
    const withSkippedOptional = { ...results, ...Object.fromEntries(sat.sessions.filter((s) => s.optional).map((s) => done('2027-03-20', s.id, 'skipped'))) }
    expect(dayCounts(sat, withSkippedOptional, allHabits('2027-03-20'))).toBe(true)
  })
  it('counts consecutive days ending yesterday and ignores today', () => {
    const results = Object.fromEntries([done('2026-11-08', 's0004')])
    const habits = { ...allHabits('2026-11-05'), ...allHabits('2026-11-06'), ...allHabits('2026-11-07'), ...allHabits('2026-11-08') }
    expect(computeStreak('2026-11-09', results, habits).current).toBe(4)
    expect(computeStreak('2026-11-09', results, habits).since).toBe('2026-11-05')
    // Today (Nov 8) unchecked doesn't break anything until it's over.
    expect(computeStreak('2026-11-08', {}, habits).current).toBe(3)
    // Yesterday skipped → 0 and brokeYesterday = 3
    const skipped = Object.fromEntries([done('2026-11-08', 's0004', 'skipped')])
    const s = computeStreak('2026-11-09', skipped, habits)
    expect(s.current).toBe(0)
    expect(s.brokeYesterday).toBe(3)
    expect(s.longest).toBe(3)
  })
  it('day-closed needs every non-optional session resolved (skipped counts as resolved) and 3 habits', () => {
    const d = getDay('2026-11-08')!
    expect(isDayClosed(d, {}, allHabits('2026-11-08'))).toBe(false)
    expect(isDayClosed(d, Object.fromEntries([done('2026-11-08', 's0004', 'skipped')]), allHabits('2026-11-08'))).toBe(true)
    expect(isDayClosed(d, Object.fromEntries([done('2026-11-08', 's0004')]), allHabits('2026-11-08', 2))).toBe(false)
  })
})
