import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Exercise, LiftSet, PlanDay, Session } from '../types'
import { getProgram, labels } from '../data/content'
import { useActions, useStore } from '../store/store'
import { liftKey } from '../store/db'
import { generalNotes, increment, initialSets } from '../lib/lifts'
import { isHomeDay } from '../lib/selectors'
import { Icon } from './Icon'
import { navigate } from '../lib/route'
import { exerciseKey } from '../lib/lifts'

export interface LiftBodyHandle {
  /** Persist every exercise row that has a weight. Called by the card's Done. */
  saveAll: () => Promise<void>
}

export function watchUrl(ex: Exercise): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.video_query)}`
}

function SetRow({ i, set, onChange }: { i: number; set: LiftSet; onChange: (s: LiftSet) => void }) {
  const cls = 'w-full rounded-lg bg-surface2 border border-border px-2 py-2 text-center tabular text-[16px] outline-none focus:border-muted placeholder:text-muted/50'
  return (
    <div className="grid grid-cols-[28px_1fr_16px_1fr] items-center gap-1.5">
      <span className="text-[12px] text-muted text-center">{i + 1}</span>
      <input className={cls} inputMode="decimal" type="number" step="2.5" min="0" placeholder="lb" value={set.weight ?? ''} onChange={(e) => onChange({ ...set, weight: e.target.value === '' ? null : Number(e.target.value) })} />
      <span className="text-center text-muted text-[12px]">×</span>
      <input className={cls} inputMode="numeric" type="number" min="0" placeholder="reps" value={set.reps ?? ''} onChange={(e) => onChange({ ...set, reps: e.target.value === '' ? null : Number(e.target.value) })} />
    </div>
  )
}

interface ExerciseCardProps {
  ex: Exercise
  day: PlanDay
  session: Session
  setCount: number
  home: boolean
  register: (name: string, rows: () => LiftSet[]) => void
}

function ExerciseCard({ ex, day, session, setCount, home, register }: ExerciseCardProps) {
  const { liftLogs } = useStore()
  const { setLiftLog } = useActions()
  const existing = liftLogs[liftKey(day.date, session.id, ex.name)]
  const [rows, setRows] = useState<LiftSet[]>(() => initialSets(liftLogs, ex.name, setCount, { date: day.date, session_id: session.id }, existing))
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const touched = useRef(false)

  useEffect(() => {
    register(ex.name, () => rowsRef.current)
  }, [ex.name, register])

  // Persist edits as they happen so a half-finished session survives a closed tab.
  useEffect(() => {
    if (!touched.current) return
    const id = window.setTimeout(() => {
      void setLiftLog({ date: day.date, session_id: session.id, program: session.program ?? '', exercise: ex.name, sets: rowsRef.current })
    }, 400)
    return () => window.clearTimeout(id)
  }, [rows, day.date, session.id, session.program, ex.name, setLiftLog])

  const update = (i: number, s: LiftSet) => {
    touched.current = true
    setRows((r) => r.map((x, j) => (j === i ? s : x)))
  }

  const scaleIt = () => {
    touched.current = true
    const inc = increment(ex.name)
    setRows((r) => {
      const base = r.find((x) => x.weight != null)?.weight ?? null
      return r.map((x) => ({ ...x, weight: (x.weight ?? base ?? 0) + inc }))
    })
  }

  const isPrefill = !existing && rows.some((r) => r.weight != null)

  return (
    <div className="rounded-xl border border-border bg-surface2/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button className="text-left font-semibold text-[16px] leading-snug" onClick={() => navigate('lifts', `ex/${encodeURIComponent(exerciseKey(ex.name))}`)}>
            {ex.name}
          </button>
          <div className="text-[13px] text-muted tabular">
            {setCount} × {ex.reps} · rest {ex.rest}
          </div>
        </div>
        <a href={watchUrl(ex)} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[13px] font-semibold text-text">
          <Icon name="play" size={12} /> watch
        </a>
      </div>
      {ex.note && <p className="mt-1.5 text-[16px] text-muted">{ex.note}</p>}
      {home && ex.home_variant && (
        <p className="mt-1.5 text-[16px]"><span className="font-semibold text-accent">Home: </span>{ex.home_variant}</p>
      )}
      <div className="mt-3 space-y-1.5">
        {rows.map((s, i) => (
          <SetRow key={i} i={i} set={s} onChange={(v) => update(i, v)} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[12px] text-muted">{isPrefill ? 'Prefilled from last time' : existing ? 'Logged' : ''}</span>
        <button onClick={scaleIt} className="inline-flex items-center gap-1 rounded-full bg-surface border border-border px-3 py-1 text-[13px] font-semibold active:bg-accent active:text-white">
          <Icon name="plus" size={12} /> {labels.add_weight_button} +{increment(ex.name)}
        </button>
      </div>
    </div>
  )
}

export const LiftBody = React.forwardRef<LiftBodyHandle, { day: PlanDay; session: Session }>(function LiftBody({ day, session }, ref) {
  const { setLiftLog } = useActions()
  const program = getProgram(session.program)
  const home = isHomeDay(day)
  const getters = useRef(new Map<string, () => LiftSet[]>())
  const register = useMemo(
    () => (name: string, rows: () => LiftSet[]) => {
      getters.current.set(name, rows)
    },
    [],
  )

  useImperativeHandle(ref, () => ({
    async saveAll() {
      const ops: Promise<void>[] = []
      for (const [name, get] of getters.current) {
        const rows = get()
        if (rows.some((r) => r.weight != null || r.reps != null))
          ops.push(setLiftLog({ date: day.date, session_id: session.id, program: session.program ?? '', exercise: name, sets: rows }))
      }
      await Promise.all(ops)
    },
  }))

  if (!program) return null
  const setCountFor = (ex: Exercise) => (session.light ? Math.min(2, ex.sets) : ex.sets)

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{program.title}</span>
        {session.light && <span className="text-[11px] font-semibold uppercase tracking-wide text-accent shrink-0">light</span>}
      </div>
      {session.light && <p className="mt-1 text-[16px] text-muted">{generalNotes.light_week}</p>}
      {home && <p className="mt-1 text-[13px] text-muted">Home variants shown where the program has one.</p>}
      <div className="mt-2 space-y-2">
        {program.exercises.map((ex) => (
          <ExerciseCard key={ex.name} ex={ex} day={day} session={session} setCount={setCountFor(ex)} home={home} register={register} />
        ))}
      </div>
      <p className="mt-2 text-[16px] text-muted">{generalNotes.rep_in_reserve}</p>
    </div>
  )
})
