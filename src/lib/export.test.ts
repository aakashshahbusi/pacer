import { describe, it, expect } from 'vitest'
import { sundayExport } from './export'
import { defaultSettings } from '../store/defaults'
import { resultKey, liftKey, habitKey } from '../store/db'

describe('sundayExport', () => {
  it('summarizes the last 7 days as plain text', () => {
    const state = {
      results: { [resultKey('2026-11-08', 's0004')]: { date: '2026-11-08', session_id: 's0004', status: 'done' as const, actual_mi: 3, loggedAt: 'x' }, [resultKey('2026-11-10', 's0006')]: { date: '2026-11-10', session_id: 's0006', status: 'done' as const, loggedAt: 'x' } },
      liftLogs: { [liftKey('2026-11-10', 's0006', 'Dumbbell bench press')]: { date: '2026-11-10', session_id: 's0006', program: 'P0_A', exercise: 'Dumbbell bench press', sets: [{ weight: 40, reps: 10 }, { weight: 45, reps: 8 }], loggedAt: 'x' } },
      habits: { [habitKey('2026-11-08', 'breakfast')]: { date: '2026-11-08', key: 'breakfast', done: true } },
      customLogs: [{ id: '1', date: '2026-11-09', type: 'Sleep (hours, how I feel)', text: 'Slept fine', value: 7.5, unit: 'h', loggedAt: 'x' }],
      settings: defaultSettings(),
    }
    const t = sundayExport('2026-11-11', state)
    expect(t).toContain('Miles: 3 actual / 6 planned')
    expect(t).toContain('The Slow One · 3 mi: done (3 mi)')
    expect(t).toContain('Dumbbell bench press: top set 45 × 8')
    expect(t).toContain('Log · Sleep: Slept fine — 7.5 h')
    expect(t).toContain('Habits 1/3: Breakfast')
    expect(t).toContain('Budget vs. Actual')
  })
})
