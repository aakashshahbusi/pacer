import { describe, it, expect } from 'vitest'
import { allZones, formatZone, p5k, paceFor, riegelTime, round5, treadmillMph, zone, formatMph, currentFiveK } from './pace'
import { fmtClock } from './dates'

const T = 22 * 60 // 22:00

describe('pace engine — worked example (5K = 22:00)', () => {
  it('p5k is 7:05/mi', () => {
    expect(fmtClock(round5(p5k(T)))).toBe('7:05')
  })
  it('easy 9:10–9:55', () => expect(formatZone(zone(T, 'easy'))).toBe('9:10 – 9:55 /mi'))
  it('long 9:20–10:15', () => expect(formatZone(zone(T, 'long'))).toBe('9:20 – 10:15 /mi'))
  it('tempo 7:45–8:10', () => expect(formatZone(zone(T, 'tempo'))).toBe('7:45 – 8:10 /mi'))
  it('hm 7:45–7:55', () => expect(formatZone(zone(T, 'hm'))).toBe('7:45 – 7:55 /mi'))
  it('mp 8:40–9:15', () => expect(formatZone(zone(T, 'mp'))).toBe('8:40 – 9:15 /mi'))
  it('shakeout = easy', () => expect(formatZone(zone(T, 'shakeout'))).toBe(formatZone(zone(T, 'easy'))))
  it('treadmill for easy slower end is 6.0 mph', () => {
    expect(formatMph(treadmillMph(round5(zone(T, 'easy').hi)))).toBe('6.0 mph')
    expect(formatMph(treadmillMph(600))).toBe('6.0 mph') // 10:00/mi → 6.0
  })
  it('riegel scales 5K → marathon', () => {
    expect(Math.round(riegelTime(T, 26.2188))).toBe(Math.round(T * Math.pow(26.2188 / 3.10686, 1.06)))
  })
  it('allZones preview matches', () => {
    const z = Object.fromEntries(allZones(T).map((x) => [x.key, x.range]))
    expect(z.easy).toBe('9:10 – 9:55 /mi')
    expect(z.mp).toBe('8:40 – 9:15 /mi')
  })
})

describe('paceFor', () => {
  it('shows the talk-test fallback for easy/long when no 5K is entered', () => {
    const p = paceFor('easy', { fiveK: [] })!
    expect(p.mode).toBe('talk')
    expect(p.primary).toBe('Talk test. Full sentences. Treadmill 6.0 mph.')
    expect(paceFor('long', { fiveK: [] })!.mode).toBe('talk')
  })
  it('shows numbers once a 5K is entered', () => {
    const p = paceFor('easy', { fiveK: [{ seconds: T, date: '2027-01-20' }] })!
    expect(p.mode).toBe('zone')
    expect(p.primary).toBe('9:10 – 9:55 /mi')
    expect(p.secondary).toBe('treadmill 6.0 mph')
    expect(p.estimated).toBe(false)
  })
  it('tempo uses the baseline and is tagged estimated with no 5K', () => {
    const p = paceFor('tempo', { fiveK: [] })!
    expect(p.mode).toBe('zone')
    expect(p.estimated).toBe(true)
  })
  it('hills and strides are effort-only', () => {
    expect(paceFor('hills', { fiveK: [] })!.mode).toBe('effort')
    expect(paceFor('hills', { fiveK: [] })!.primary).toBe('strong effort, tall posture, quick steps')
    expect(paceFor('strides', { fiveK: [] })!.primary).toBe('fast but relaxed, 20 seconds')
  })
  it('tt shows last 5K pace as the reference', () => {
    const p = paceFor('tt', { fiveK: [{ seconds: T, date: '2027-01-20' }] })!
    expect(p.mode).toBe('tt')
    expect(p.primary).toContain('7:05')
  })
  it('currentFiveK picks the latest by date', () => {
    expect(currentFiveK({ fiveK: [{ seconds: 1300, date: '2027-03-01' }, { seconds: 1320, date: '2027-01-20' }] })!.seconds).toBe(1300)
  })
})

describe('parseClock', () => {
  it('accepts colon and digits-only forms', async () => {
    const { parseClock } = await import('./dates')
    expect(parseClock('22:00')).toBe(1320)
    expect(parseClock('2200')).toBe(1320)
    expect(parseClock('3:45:00')).toBe(13500)
    expect(parseClock('34500')).toBe(13500)
    expect(parseClock('20500')).toBe(7500)
    expect(parseClock('12')).toBeNull()
    expect(parseClock('')).toBeNull()
    expect(parseClock('2290')).toBeNull()
  })
})
