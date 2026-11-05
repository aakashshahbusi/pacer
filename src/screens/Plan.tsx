import { useMemo, useState } from 'react'
import { plan, daysOfWeek, getDay, clampToPlan } from '../data/plan'
import { content } from '../data/content'
import { Card, Screen, inputClass } from '../components/ui'
import { Icon } from '../components/Icon'
import { useStore } from '../store/store'
import { useToday } from '../lib/today'
import { diffDays, fmtClock, formatMonthDay, formatMonthDayYear, dowShort } from '../lib/dates'
import { navigate } from '../lib/route'
import { resultFor, isCompleted } from '../lib/selectors'
import type { PlanDay, PlanWeek, Race } from '../types'
import { dotState } from '../lib/weeks'

function raceResult(race: Race, results: ReturnType<typeof useStore>['results']) {
  const day = getDay(race.date)
  if (!day) return null
  const s = day.sessions.find((x) => x.kind === 'race' || x.pace_key === 'tt')
  if (!s) return null
  const r = resultFor(results, day.date, s.id)
  return r ?? null
}

function RaceLadder({ today }: { today: string }) {
  const { results } = useStore()
  return (
    <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {content.races.map((r) => {
        const days = diffDays(today, r.date)
        const res = raceResult(r, results)
        const past = days < 0
        const tone = r.date === '2027-11-06' ? 'border-accent/60' : r.date === '2027-06-26' ? 'border-accent/40' : 'border-border'
        return (
          <button
            key={r.date}
            onClick={() => navigate('today', r.date)}
            className={`shrink-0 w-[156px] rounded-[14px] border bg-surface p-3 text-left ${tone} ${past ? 'opacity-70' : ''}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted tabular">{formatMonthDayYear(r.date)}</div>
            <div className="mt-1 font-bold text-[15px] leading-tight line-clamp-2 min-h-[38px]">{r.name}</div>
            <div className="mt-1 tabular text-[13px] text-muted">{r.distance_mi} mi</div>
            <div className="mt-2 tabular text-[14px] font-semibold">
              {res && isCompleted(res)
                ? <span className="text-success">{res.finish_time_sec ? fmtClock(res.finish_time_sec, r.distance_mi >= 10) : 'done'}</span>
                : days === 0
                  ? <span className="text-accent">today</span>
                  : past
                    ? <span className="text-muted">{-days} days ago</span>
                    : <span>in {days} days</span>}
            </div>
            <div className="mt-1 text-[12px] text-muted leading-snug line-clamp-2">{r.role}</div>
            <div className={`mt-2 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${/register/i.test(r.status) ? 'bg-accent/15 text-accent' : 'bg-surface2 text-muted'}`}>
              {r.status.split(' — ')[0].split(' (')[0]}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function DayRow({ day, today }: { day: PlanDay; today: string }) {
  const { results } = useStore()
  const isToday = day.date === today
  return (
    <button onClick={() => navigate('today', day.date)} className={`w-full flex items-start gap-3 py-2 text-left ${isToday ? 'bg-surface2/60 -mx-2 px-2 rounded-lg' : ''}`}>
      <span className="w-12 shrink-0 tabular">
        <span className="block text-[11px] font-semibold uppercase text-muted">{dowShort(day.date)}</span>
        <span className="block text-[15px] font-bold leading-tight">{formatMonthDay(day.date).split(' ')[1]}</span>
      </span>
      <span className="min-w-0 flex-1">
        {day.sessions.map((s) => {
          const st = dotState(day, s, results)
          return (
            <span key={s.id} className="flex items-center gap-2 text-[14px] leading-snug">
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${st === 'done' ? 'bg-success' : st === 'partial' ? 'bg-success/50' : st === 'skipped' ? 'bg-accent' : 'border border-muted/60'}`} />
              <span className={`${s.optional ? 'text-muted' : ''} truncate`}>{s.title}{s.optional ? ' (optional)' : ''}</span>
            </span>
          )
        })}
      </span>
      {day.egg && <span className="h-1.5 w-1.5 rounded-full bg-accent/60 mt-2 shrink-0" aria-label="pinned line" />}
    </button>
  )
}

function WeekRow({ week, today, defaultOpen }: { week: PlanWeek; today: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const days = useMemo(() => daysOfWeek(week.index), [week.index])
  const current = today >= week.start && today <= week.end
  return (
    <div className={`rounded-xl border ${current ? 'border-accent/50' : 'border-border'} bg-surface`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted tabular">
              Week {week.index} · {formatMonthDay(week.start)} – {formatMonthDay(week.end)}
            </div>
            <div className="font-semibold text-[15px] leading-tight mt-0.5 truncate">{week.label}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {week.deload && <span className="rounded-md bg-accent/15 text-accent px-1.5 py-0.5 text-[11px] font-semibold uppercase">Deload</span>}
            <Icon name="chevron-down" size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1 tabular text-[13px]">
          <span><span className="font-bold text-[15px]">{week.planned_miles}</span> <span className="text-muted">mi</span></span>
          <span><span className="font-bold text-[15px]">{week.long_run_mi || '—'}</span> <span className="text-muted">long</span></span>
          <span><span className="font-bold text-[15px]">{week.runs}</span> <span className="text-muted">runs</span></span>
          <span><span className="font-bold text-[15px]">{week.lifts}</span> <span className="text-muted">lifts</span></span>
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-2 fade-in">
          <p className="py-2 text-[13px] text-muted">{week.focus}</p>
          <div className="divide-y divide-border">
            {days.map((d) => (
              <DayRow key={d.date} day={d} today={today} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Block({ phaseId, block, weeks, today, defaultOpen }: { phaseId: number; block: string; weeks: PlanWeek[]; today: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const info = content.phases.find((p) => p.id === phaseId)?.blocks?.find((b) => b.name === block)
  const miles = weeks.reduce((a, w) => a + w.planned_miles, 0)
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left py-1">
        <div>
          <div className="font-bold text-[17px]">{block}</div>
          <div className="text-[13px] text-muted tabular">
            {info?.dates ?? `${formatMonthDay(weeks[0].start)} – ${formatMonthDay(weeks[weeks.length - 1].end)}`} · {weeks.length} weeks · {Math.round(miles)} mi
            {info ? ` · long ${info.long_run}` : ''}
          </div>
        </div>
        <Icon name="chevron-down" size={18} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 mt-1 fade-in">
          {info?.note && <p className="text-[14px] text-muted px-1">{info.note}</p>}
          {weeks.map((w) => (
            <WeekRow key={w.index} week={w} today={today} defaultOpen={today >= w.start && today <= w.end} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlanScreen() {
  const todayRaw = useToday()
  const today = clampToPlan(todayRaw)
  const [jump, setJump] = useState(today)

  const phases = useMemo(() => {
    return plan.phases.map((ph) => {
      const weeks = plan.weeks.filter((w) => w.phase === ph.id)
      const blocks: { block: string; weeks: PlanWeek[] }[] = []
      for (const w of weeks) {
        const last = blocks[blocks.length - 1]
        if (last && last.block === w.block) last.weeks.push(w)
        else blocks.push({ block: w.block, weeks: [w] })
      }
      return { phase: ph, blocks, miles: weeks.reduce((a, w) => a + w.planned_miles, 0) }
    })
  }, [])

  return (
    <Screen title="Plan" subtitle={`${plan.days.length} days · ${plan.weeks.length} weeks · ${content.app.start} → ${content.app.end}`}>
      <RaceLadder today={todayRaw} />

      <div className="mt-4 flex items-center gap-2">
        <input type="date" className={`${inputClass} py-2`} value={jump} min={plan.start} max={plan.end} onChange={(e) => setJump(e.target.value)} />
        <button onClick={() => jump && getDay(jump) && navigate('today', jump)} className="shrink-0 rounded-xl bg-surface2 border border-border px-4 py-2.5 font-semibold text-[15px]">
          Jump
        </button>
      </div>

      {phases.map(({ phase, blocks, miles }) => (
        <Card key={phase.id} className="mt-4">
          <PhaseHeader id={phase.id} name={phase.name} start={phase.start} end={phase.end} goal={phase.goal} miles={miles} />
          {blocks.map((b) => (
            <Block
              key={b.block}
              phaseId={phase.id}
              block={b.block}
              weeks={b.weeks}
              today={today}
              defaultOpen={b.weeks.some((w) => today >= w.start && today <= w.end)}
            />
          ))}
        </Card>
      ))}
    </Screen>
  )
}

function PhaseHeader({ id, name, start, end, goal, miles }: { id: number; name: string; start: string; end: string; goal: string; miles: number }) {
  const cp = content.phases.find((p) => p.id === id)
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">Phase {id}</div>
      <h2 className="text-[22px] font-bold leading-tight">{name}</h2>
      <div className="text-[13px] text-muted tabular">{formatMonthDayYear(start)} – {formatMonthDayYear(end)} · {Math.round(miles)} mi planned</div>
      <p className="mt-2 text-[15px]">{goal}</p>
      {cp?.one_liner && <p className="mt-1 text-[14px] text-muted italic">{cp.one_liner}</p>}
    </div>
  )
}
