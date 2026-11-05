import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { content, getProgram, programKeys } from '../data/content'
import { Card, Muted, Screen, SectionTitle } from '../components/ui'
import { Icon } from '../components/Icon'
import { navigate, type Route } from '../lib/route'
import { useStore } from '../store/store'
import { allExerciseNames, bestSet, epley, exerciseHistory, exerciseKey, liftPRs, logsFor, topSet } from '../lib/lifts'
import { formatMonthDay, formatMonthDayYear } from '../lib/dates'
import { watchUrl } from '../components/LiftBody'
import type { Exercise } from '../types'

const PROGRAM_LIST = [...programKeys, 'bodyweight_fallback'] as const

function ExerciseRow({ ex }: { ex: Exercise }) {
  const { liftLogs } = useStore()
  const best = bestSet(liftLogs, ex.name)
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <button className="text-left min-w-0 flex-1" onClick={() => navigate('lifts', `ex/${encodeURIComponent(exerciseKey(ex.name))}`)}>
        <div className="font-semibold leading-snug">{ex.name}</div>
        <div className="text-[13px] text-muted tabular">
          {ex.sets} × {ex.reps} · rest {ex.rest}
          {best ? ` · best ${best.weight} × ${best.reps || '—'}` : ''}
        </div>
        {ex.note && <div className="text-[13px] text-muted mt-0.5">{ex.note}</div>}
        {ex.home_variant && <div className="text-[13px] mt-0.5"><span className="text-accent font-semibold">Home: </span><span className="text-muted">{ex.home_variant}</span></div>}
      </button>
      <a href={watchUrl(ex)} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-surface2 px-2.5 py-1 text-[13px] font-semibold">
        <Icon name="play" size={12} /> watch
      </a>
    </div>
  )
}

function ProgramView({ programKey }: { programKey: string }) {
  const p = getProgram(programKey)
  if (!p) return <Screen title="Lifts" back={() => navigate('lifts')} backLabel="Lifts"><Muted>Unknown program.</Muted></Screen>
  return (
    <Screen title={p.title} subtitle={p.duration_min ? `~${p.duration_min} min` : undefined} back={() => navigate('lifts')} backLabel="Lifts">
      <Card className="divide-y divide-border py-1">
        {p.exercises.map((ex) => (
          <ExerciseRow key={ex.name} ex={ex} />
        ))}
      </Card>
      <SectionTitle>How to run it</SectionTitle>
      <Card className="space-y-2 text-[15px]">
        <p><span className="font-semibold">Reps in reserve. </span>{content.lift_programs.general.rep_in_reserve}</p>
        <p><span className="font-semibold">First session. </span>{content.lift_programs.general.first_session}</p>
        <p><span className="font-semibold">Progression. </span>{content.lift_programs.general.progression}</p>
        <p><span className="font-semibold">Light week. </span>{content.lift_programs.general.light_week}</p>
        <p><span className="font-semibold">Soreness. </span>{content.lift_programs.general.soreness}</p>
        <p><span className="font-semibold">Log. </span>{content.lift_programs.general.log}</p>
      </Card>
    </Screen>
  )
}

function ExerciseView({ exKey }: { exKey: string }) {
  const { liftLogs } = useStore()
  const name = useMemo(() => allExerciseNames().find((n) => exerciseKey(n) === exKey) ?? exKey, [exKey])
  const history = exerciseHistory(liftLogs, name)
  const best = bestSet(liftLogs, name)
  const last = logsFor(liftLogs, name)[0]
  const lastTop = last ? topSet(last.sets) : null
  const e1rm = lastTop && lastTop.weight != null ? epley(lastTop.weight, lastTop.reps ?? 1) : null
  const data = history.map((h) => ({ d: formatMonthDay(h.date), weight: h.weight, reps: h.reps }))

  return (
    <Screen title={name} back={() => navigate('lifts')} backLabel="Lifts">
      {!last ? (
        <Card><Muted>No sets logged yet. Log them from the lift card on Today.</Muted></Card>
      ) : (
        <>
          {history.length > 0 && <Card>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2">Top set over time</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} formatter={(v: number, _n, p) => [`${v} lb × ${(p.payload as { reps: number }).reps}`, 'Top set']} />
                  <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Card className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Best set</div>
              <div className="tabular text-[22px] font-bold mt-1">{best ? `${best.weight}×${best.reps || '—'}` : '—'}</div>
              {best && <div className="text-[11px] text-muted">{formatMonthDay(best.date)}</div>}
            </Card>
            <Card className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Est. 1RM</div>
              <div className="tabular text-[22px] font-bold mt-1">{e1rm ? Math.round(e1rm) : '—'}</div>
              <div className="text-[11px] text-muted">est. · Epley</div>
            </Card>
            <Card className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sessions</div>
              <div className="tabular text-[22px] font-bold mt-1">{logsFor(liftLogs, name).length}</div>
            </Card>
          </div>
          {last && (
            <>
              <SectionTitle>Last session · {formatMonthDayYear(last.date)}</SectionTitle>
              <Card>
                <div className="grid grid-cols-3 gap-2">
                  {last.sets.map((s, i) => (
                    <div key={i} className="rounded-lg bg-surface2 px-2 py-2 text-center tabular">
                      <div className="text-[11px] text-muted">Set {i + 1}</div>
                      <div className="font-bold">{s.weight ?? '—'} × {s.reps ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  )
}

export default function Lifts({ route }: { route: Route }) {
  const { liftLogs } = useStore()
  if (route.sub?.startsWith('ex/')) return <ExerciseView exKey={decodeURIComponent(route.sub.slice(3))} />
  if (route.sub) return <ProgramView programKey={route.sub} />
  const prs = liftPRs(liftLogs)

  return (
    <Screen title="Lifts" subtitle={content.lift_programs.general.learning}>
      <SectionTitle>Programs</SectionTitle>
      <div className="space-y-2">
        {PROGRAM_LIST.map((k) => {
          const p = getProgram(k)
          if (!p) return null
          return (
            <Card key={k} role="button" onClick={() => navigate('lifts', k)} className="flex items-center justify-between gap-3 active:bg-surface2">
              <div>
                <div className="font-bold text-[17px]">{p.title}</div>
                <div className="text-[13px] text-muted">
                  {p.exercises.length} exercises{p.duration_min ? ` · ~${p.duration_min} min` : ''}{p.phase != null ? ` · Phase ${p.phase}` : ''}
                </div>
              </div>
              <Icon name="chevron-right" className="text-muted shrink-0" />
            </Card>
          )
        })}
      </div>

      <SectionTitle>PRs · main lifts</SectionTitle>
      <Card className="divide-y divide-border">
        {prs.map((p) => (
          <div key={p.label} className="flex items-center justify-between py-2.5">
            <span className="font-semibold">{p.label}</span>
            {p.best ? (
              <span className="text-right tabular">
                <span className="font-bold text-[18px]">{p.best.weight} × {p.best.reps || '—'}</span>
                <span className="block text-[12px] text-muted">est. 1RM {Math.round(p.best.e1rm)} · {formatMonthDay(p.best.date)}</span>
              </span>
            ) : (
              <span className="text-muted text-[14px]">not yet</span>
            )}
          </div>
        ))}
      </Card>
    </Screen>
  )
}
