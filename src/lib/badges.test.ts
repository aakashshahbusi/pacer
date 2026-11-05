import { describe, it, expect } from 'vitest'
import { satisfiedBadges, type BadgeContext } from './badges'
import { resultKey, habitKey } from '../store/db'
import { defaultSettings } from '../store/defaults'
import type { SessionResult } from '../types'

const base = (): BadgeContext => ({ today: '2026-12-01', results: {}, liftLogs: {}, habits: {}, settings: defaultSettings() })
const res = (date: string, id: string, extra: Partial<SessionResult> = {}): SessionResult => ({ date, session_id: id, status: 'done', loggedAt: 'x', ...extra })

describe('badges', () => {
  it('nothing unlocked on a clean slate', () => {
    expect(satisfiedBadges(base())).toEqual([])
  })
  it('The Slow One unlocks on Nov 8 done', () => {
    const c = base()
    c.results[resultKey('2026-11-08', 's0004')] = res('2026-11-08', 's0004')
    expect(satisfiedBadges(c)).toContain('slow_one')
  })
  it('The Bar Remembers on first lift done', () => {
    const c = base()
    c.results[resultKey('2026-11-10', 's0006')] = res('2026-11-10', 's0006')
    expect(satisfiedBadges(c)).toContain('bar_remembers')
  })
  it('The Reset needs 7 straight wake-times from Nov 26', () => {
    const c = base()
    c.today = '2026-12-10'
    for (let i = 0; i < 6; i++) {
      const d = `2026-11-${26 + i}`.replace('11-31', '12-01').replace('11-32', '12-02')
      c.habits[habitKey(d, 'wake_time')] = { date: d, key: 'wake_time', done: true }
    }
    expect(satisfiedBadges(c)).not.toContain('reset')
    for (const d of ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'])
      c.habits[habitKey(d, 'wake_time')] = { date: d, key: 'wake_time', done: true }
    expect(satisfiedBadges(c)).toContain('reset')
  })
  it('The Number unlocks on the Jan 20 time trial entry', () => {
    const c = base()
    c.settings.fiveK.push({ seconds: 1320, date: '2027-01-20' })
    expect(satisfiedBadges(c)).toContain('tt')
  })
  it('Fully Depreciated at 400 shoe miles', () => {
    const c = base()
    c.settings.shoes[0].miles = 400
    expect(satisfiedBadges(c)).toContain('depreciated')
  })
  it('Monumental on the marathon', () => {
    const c = base()
    c.today = '2027-11-07'
    c.results[resultKey('2027-11-06', 's0396')] = res('2027-11-06', 's0396', { finish_time_sec: 4 * 3600 })
    expect(satisfiedBadges(c)).toContain('monumental')
  })
})
