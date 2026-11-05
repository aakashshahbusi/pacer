import planJson from '../../plan.json'
import type { Plan, PlanDay, PlanWeek } from '../types'

export const plan = planJson as unknown as Plan

const dayByDate = new Map<string, PlanDay>()
const dayIndex = new Map<string, number>()
plan.days.forEach((d, i) => {
  dayByDate.set(d.date, d)
  dayIndex.set(d.date, i)
})

const weekByIndex = new Map<number, PlanWeek>()
plan.weeks.forEach((w) => weekByIndex.set(w.index, w))

export function getDay(date: string): PlanDay | undefined {
  return dayByDate.get(date)
}

export function getDayOffset(date: string, offset: number): PlanDay | undefined {
  const i = dayIndex.get(date)
  if (i === undefined) return undefined
  return plan.days[i + offset]
}

export function getWeek(index: number): PlanWeek | undefined {
  return weekByIndex.get(index)
}

export function daysOfWeek(index: number): PlanDay[] {
  return plan.days.filter((d) => d.week_index === index)
}

export function findSession(date: string, sessionId: string) {
  return getDay(date)?.sessions.find((s) => s.id === sessionId)
}

/** Clamp any ISO date into the plan range. */
export function clampToPlan(date: string): string {
  if (date < plan.start) return plan.start
  if (date > plan.end) return plan.end
  return date
}
