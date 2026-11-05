import { describe, it, expect } from 'vitest'
import { epley, exerciseHistory, exerciseKey, increment, initialSets, isLowerBody, lastLogFor, liftPRs, topSet } from './lifts'
import type { LiftLog } from '../types'

const logs: Record<string, LiftLog> = {
  a: { date: '2026-11-10', session_id: 's0006', program: 'P0_A', exercise: 'Romanian deadlift (barbell or dumbbells)', sets: [{ weight: 95, reps: 10 }, { weight: 95, reps: 10 }, { weight: 95, reps: 9 }], loggedAt: '2026-11-10T10:00:00Z' },
  b: { date: '2027-01-05', session_id: 's0050', program: 'LOWER', exercise: 'Romanian deadlift', sets: [{ weight: 115, reps: 8 }, { weight: 115, reps: 8 }, { weight: 115, reps: 8 }], loggedAt: '2027-01-05T10:00:00Z' },
  c: { date: '2027-01-05', session_id: 's0050', program: 'LOWER', exercise: 'Barbell back squat', sets: [{ weight: 135, reps: 8 }, { weight: 135, reps: 8 }, { weight: 135, reps: 6 }], loggedAt: '2027-01-05T10:00:00Z' },
  d: { date: '2027-01-07', session_id: 's0052', program: 'UPPER', exercise: 'Barbell bench press', sets: [{ weight: 95, reps: 8 }, { weight: 95, reps: 8 }, { weight: 100, reps: 6 }], loggedAt: '2027-01-07T10:00:00Z' },
}

describe('lifts', () => {
  it('increments: 10 lb lower, 5 lb upper', () => {
    for (const n of ['Barbell back squat', 'Romanian deadlift', 'Split squat (bodyweight → dumbbells)', 'Leg press (or goblet squat)', 'Leg curl (machine)', 'Standing calf raise', 'Trap-bar deadlift (or conventional, light)', 'Goblet squat', 'Bulgarian split squat'])
      expect(increment(n), n).toBe(10)
    for (const n of ['Barbell bench press', 'Overhead press', 'Barbell row', 'Lat pulldown (or pull-ups)', 'Dumbbell lateral raise', 'Plank'])
      expect(increment(n), n).toBe(5)
    expect(isLowerBody('Dumbbell curl')).toBe(false)
  })
  it('canonical keys match variants across programs', () => {
    expect(exerciseKey('Romanian deadlift (barbell or dumbbells)')).toBe(exerciseKey('Romanian deadlift'))
    expect(exerciseKey('Overhead press (barbell or dumbbells)')).toBe('overhead press')
    expect(exerciseKey('One-arm dumbbell row')).toBe(exerciseKey('Single-arm dumbbell row'))
  })
  it('prefills from the last logged weights for the exercise', () => {
    const rows = initialSets(logs, 'Romanian deadlift', 3, { date: '2027-01-12', session_id: 's0060' })
    expect(rows.map((r) => r.weight)).toEqual([115, 115, 115])
    expect(rows.map((r) => r.reps)).toEqual([8, 8, 8])
    // Excludes the session being edited.
    expect(lastLogFor(logs, 'Romanian deadlift', { date: '2027-01-05', session_id: 's0050' })?.date).toBe('2026-11-10')
    // Unknown exercise → blanks
    expect(initialSets(logs, 'Plank', 3, { date: '2027-01-12', session_id: 'x' }).every((r) => r.weight == null)).toBe(true)
  })
  it('top set, Epley and history', () => {
    expect(topSet(logs.d.sets)).toEqual({ weight: 100, reps: 6 })
    expect(epley(100, 6)).toBeCloseTo(120)
    const h = exerciseHistory(logs, 'Romanian deadlift')
    expect(h.map((p) => p.weight)).toEqual([95, 115])
  })
  it('main-lift PRs', () => {
    const prs = liftPRs(logs)
    expect(prs.find((p) => p.label === 'Back squat')?.best?.weight).toBe(135)
    expect(prs.find((p) => p.label === 'Bench press')?.best?.weight).toBe(100)
    expect(prs.find((p) => p.label === 'Deadlift')?.best).toBeNull()
  })
})
