import type { LiftLog, LiftSet } from '../types'
import { content, getProgram, programKeys } from '../data/content'

/** Lower-body lifts get +10 lb, everything else +5 lb (lift_programs.general.progression). */
export function isLowerBody(name: string): boolean {
  return /squat|romanian|rdl|deadlift|leg press|leg curl|calf|nordic|glute bridge|hamstring/i.test(name)
}

export function increment(name: string): number {
  return isLowerBody(name) ? 10 : 5
}

/** Canonical identity for an exercise across program variants (e.g. "Overhead press (barbell or dumbbells)" ≡ "Overhead press"). */
export function exerciseKey(name: string): string {
  let k = name.toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (k === 'one-arm dumbbell row') k = 'single-arm dumbbell row'
  return k
}

export function sortLogsDesc(logs: LiftLog[]): LiftLog[] {
  return [...logs].sort((a, b) => (a.date === b.date ? (a.loggedAt < b.loggedAt ? 1 : -1) : a.date < b.date ? 1 : -1))
}

/** Every log for an exercise (by canonical key), newest first. */
export function logsFor(all: Record<string, LiftLog> | LiftLog[], name: string): LiftLog[] {
  const key = exerciseKey(name)
  const list = Array.isArray(all) ? all : Object.values(all)
  return sortLogsDesc(list.filter((l) => exerciseKey(l.exercise) === key && l.sets.some((s) => s.weight != null || s.reps != null)))
}

/** The most recent log for an exercise, excluding a specific date+session (the one being edited). */
export function lastLogFor(all: Record<string, LiftLog> | LiftLog[], name: string, exclude?: { date: string; session_id: string }): LiftLog | undefined {
  return logsFor(all, name).find((l) => !exclude || !(l.date === exclude.date && l.session_id === exclude.session_id))
}

export function topSet(sets: LiftSet[]): LiftSet | null {
  let best: LiftSet | null = null
  for (const s of sets) {
    if (s.weight == null) continue
    if (!best || (s.weight > (best.weight ?? -1)) || (s.weight === best.weight && (s.reps ?? 0) > (best.reps ?? 0))) best = s
  }
  return best
}

/** Epley estimated 1RM: weight × (1 + reps/30). */
export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export interface HistoryPoint {
  date: string
  weight: number
  reps: number
  e1rm: number
}

/** Top-set weight over time, oldest first. */
export function exerciseHistory(all: Record<string, LiftLog> | LiftLog[], name: string): HistoryPoint[] {
  const pts: HistoryPoint[] = []
  for (const l of logsFor(all, name)) {
    const t = topSet(l.sets)
    if (!t || t.weight == null) continue
    pts.push({ date: l.date, weight: t.weight, reps: t.reps ?? 0, e1rm: epley(t.weight, t.reps ?? 1) })
  }
  return pts.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function bestSet(all: Record<string, LiftLog> | LiftLog[], name: string): HistoryPoint | null {
  let best: HistoryPoint | null = null
  for (const p of exerciseHistory(all, name)) {
    if (!best || p.weight > best.weight || (p.weight === best.weight && p.reps > best.reps)) best = p
  }
  return best
}

/** The main lifts for the PR list, matched against program exercise names. */
export const MAIN_LIFTS: { label: string; match: RegExp }[] = [
  { label: 'Back squat', match: /^barbell back squat/i },
  { label: 'Bench press', match: /^barbell bench press/i },
  { label: 'Deadlift', match: /^trap-bar deadlift|^conventional deadlift|^deadlift/i },
  { label: 'Overhead press', match: /^overhead press/i },
  { label: 'Barbell row', match: /^barbell row/i },
]

/** Every distinct exercise name across all programs, in program order. */
export function allExerciseNames(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const keys = [...programKeys, 'bodyweight_fallback']
  for (const k of keys) {
    const p = getProgram(k)
    if (!p) continue
    for (const e of p.exercises) {
      const key = exerciseKey(e.name)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(e.name)
      }
    }
  }
  return out
}

export function liftPRs(all: Record<string, LiftLog> | LiftLog[]) {
  const list = Array.isArray(all) ? all : Object.values(all)
  return MAIN_LIFTS.map((m) => {
    const names = new Set(list.filter((l) => m.match.test(l.exercise)).map((l) => l.exercise))
    let best: HistoryPoint | null = null
    for (const n of names) {
      const b = bestSet(list, n)
      if (b && (!best || b.weight > best.weight || (b.weight === best.weight && b.reps > best.reps))) best = b
    }
    return { label: m.label, best }
  })
}

export const generalNotes = content.lift_programs.general

/** Build the initial set rows for the logger: this session's saved log, else the last log's weights/reps, else blanks. */
export function initialSets(
  all: Record<string, LiftLog>,
  name: string,
  setCount: number,
  current: { date: string; session_id: string },
  existing?: LiftLog,
): LiftSet[] {
  const rows: LiftSet[] = Array.from({ length: setCount }, () => ({ weight: null, reps: null }))
  const source = existing ?? lastLogFor(all, name, current)
  if (source) {
    for (let i = 0; i < setCount; i++) {
      const s = source.sets[i] ?? source.sets[source.sets.length - 1]
      if (s) rows[i] = { weight: s.weight, reps: s.reps }
    }
  }
  return rows
}
