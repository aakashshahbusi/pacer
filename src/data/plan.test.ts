import { describe, it, expect } from 'vitest'
import { plan, daysOfWeek, getDay } from './plan'
import { content, getProgram } from './content'

describe('plan.json', () => {
  it('covers every day from 2026-11-05 to 2027-11-06 with no empty day', () => {
    expect(plan.days.length).toBe(367)
    expect(plan.days[0].date).toBe('2026-11-05')
    expect(plan.days[plan.days.length - 1].date).toBe('2027-11-06')
    for (const d of plan.days) expect(d.sessions.length).toBeGreaterThan(0)
  })
  it('has 53 weeks whose planned miles equal the non-optional run+race miles', () => {
    expect(plan.weeks.length).toBe(53)
    for (const w of plan.weeks) {
      const miles = daysOfWeek(w.index)
        .flatMap((d) => d.sessions)
        .filter((s) => (s.kind === 'run' || s.kind === 'race') && !s.optional)
        .reduce((a, s) => a + (s.distance_mi ?? 0), 0)
      expect(Math.round(miles * 10) / 10).toBeCloseTo(w.planned_miles, 1)
    }
  })
  it('contains the acceptance-criteria days', () => {
    expect(getDay('2026-11-08')?.sessions[0].title).toBe('The Slow One · 3 mi')
    expect(getDay('2027-01-20')?.sessions[0].title).toBe('5K TIME TRIAL')
    expect(getDay('2027-06-26')?.sessions[0].kind).toBe('race')
    expect(getDay('2027-11-06')?.sessions[0].kind).toBe('race')
  })
  it('every lift session points at a program in content.json', () => {
    for (const d of plan.days)
      for (const s of d.sessions)
        if (s.kind === 'lift') expect(getProgram(s.program), `${d.date} ${s.id}`).toBeDefined()
  })
})

describe('content.json', () => {
  it('has the expected top-level keys', () => {
    for (const k of ['app', 'athlete', 'phases', 'pace_engine', 'lift_programs', 'nutrition', 'sleep', 'rules', 'sunday_check_in', 'gear', 'swimming', 'races', 'key_dates', 'habits', 'easter_eggs', 'app_copy'])
      expect(content).toHaveProperty(k)
    expect(content.races.length).toBe(8)
    expect(content.easter_eggs.badges.length).toBe(15)
  })
})
