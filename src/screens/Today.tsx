import React, { useEffect, useMemo, useRef, useState } from 'react'
import { clampToPlan, getDay, getDayOffset, plan } from '../data/plan'
import { copy } from '../data/content'
import { useToday } from '../lib/today'
import { diffDays, formatLong } from '../lib/dates'
import { nextRace, shortRaceName } from '../lib/selectors'
import { useActions, useStore } from '../store/store'
import { HabitRow } from '../components/HabitRow'
import { computeStreak, dayCounts, hasSkip, isDayClosed } from '../lib/streak'
import { eggFor, streakMilestone } from '../lib/eggs'
import { SessionCard } from '../components/SessionCard'
import { PaceLine } from '../components/PaceLine'
import { LiftBody, type LiftBodyHandle } from '../components/LiftBody'
import type { PlanDay, Session } from '../types'
import { Button, Card, Muted } from '../components/ui'
import { Icon } from '../components/Icon'
import { navigate, type Route } from '../lib/route'

const ISO = /^\d{4}-\d{2}-\d{2}$/

function TodaySessionCard({ day, session }: { day: PlanDay; session: Session }) {
  const liftRef = useRef<LiftBodyHandle>(null)
  if (session.kind === 'lift') {
    return (
      <SessionCard
        day={day}
        session={session}
        body={<LiftBody ref={liftRef} day={day} session={session} />}
        onBeforeDone={() => liftRef.current?.saveAll() ?? Promise.resolve()}
      />
    )
  }
  const body = session.kind === 'run' || session.kind === 'race' ? <PaceLine session={session} /> : undefined
  return <SessionCard day={day} session={session} body={body} />
}

function relativeLabel(selected: string, today: string): string {
  const d = diffDays(today, selected)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d > 1) return `In ${d} days`
  return `${-d} days ago`
}

export default function Today({ route }: { route: Route }) {
  const today = useToday()
  const { settings, results, habits } = useStore()
  const { updateSettings } = useActions()
  const initial = route.sub && ISO.test(route.sub) && getDay(route.sub) ? route.sub : clampToPlan(today)
  const [date, setDate] = useState(initial)

  // Follow route changes (Plan → jump to date).
  useEffect(() => {
    if (route.sub && ISO.test(route.sub) && getDay(route.sub)) setDate(route.sub)
  }, [route.sub])

  const day = getDay(date) ?? plan.days[0]
  const prev = getDayOffset(date, -1)
  const next = getDayOffset(date, 1)
  const race = useMemo(() => nextRace(date), [date])

  const go = (d: string | undefined) => {
    if (!d) return
    setDate(d)
    navigate('today', d === clampToPlan(today) ? null : d)
  }

  // Swipe between days.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) {
      if (dx < 0) go(next?.date)
      else go(prev?.date)
    }
  }

  const streak = useMemo(() => computeStreak(today, results, habits), [today, results, habits])
  const egg = useMemo(() => eggFor(day, { today, results }), [day, today, results])
  const milestone = useMemo(() => streakMilestone(date, results, habits), [date, results, habits])
  const closed = isDayClosed(day, results, habits)
  const counts = dayCounts(day, results, habits)
  const skipped = hasSkip(day, results)
  const visibleSessions = day.sessions.filter((s) => !(s.optional && settings.hiddenOptional.includes(s.id)))
  const hiddenSessions = day.sessions.filter((s) => s.optional && settings.hiddenOptional.includes(s.id))
  const isToday = date === clampToPlan(today)

  return (
    <div className="px-4 pb-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} key={date}>
      {/* Header */}
      <header className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <button className="p-2 -ml-2 text-muted disabled:opacity-30" onClick={() => go(prev?.date)} disabled={!prev} aria-label="Previous day">
            <Icon name="chevron-left" />
          </button>
          <div className="text-center">
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{relativeLabel(date, today)}</div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight">{formatLong(date)}</h1>
          </div>
          <button className="p-2 -mr-2 text-muted disabled:opacity-30" onClick={() => go(next?.date)} disabled={!next} aria-label="Next day">
            <Icon name="chevron-right" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-surface2 border border-border px-3 py-1 text-[13px] text-muted">
            <span className="text-text font-semibold">{day.phase_name}</span> · {day.week_label}
          </span>
          {day.deload && <span className="rounded-full bg-accent/15 text-accent px-3 py-1 text-[13px] font-semibold">Deload</span>}
          {streak.current > 0 && (
            <span className="rounded-full bg-success/15 text-success px-3 py-1 text-[13px] font-semibold tabular">
              {streak.current}-day streak
            </span>
          )}
          {race && (
            <span className="rounded-full bg-accent text-white px-3 py-1 text-[13px] font-semibold tabular">
              {race.days === 0 ? `${shortRaceName(race.race)} today` : `${shortRaceName(race.race)} in ${race.days} day${race.days === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
        {!isToday && (
          <div className="mt-3 flex justify-center">
            <Button variant="ghost" className="py-1.5 text-[14px]" onClick={() => go(clampToPlan(today))}>
              <Icon name="today" size={16} /> Back to today
            </Button>
          </div>
        )}
      </header>

      {milestone && (
        <p className="text-center text-[15px] font-semibold px-2 mb-2 fade-in">{milestone}</p>
      )}
      {egg && (
        <p className="text-muted text-[16px] italic text-center px-2 mb-4">
          {egg.text}
          {egg.source && <span className="not-italic text-[13px]"> — {egg.source}</span>}
        </p>
      )}

      {isToday && streak.brokeYesterday > 0 && (
        <div className="mb-4 rounded-[16px] border border-border bg-surface px-4 py-3 text-[15px]">
          <span className="font-semibold">{copy.streak_broken}</span>
          <span className="text-muted"> Longest so far: {streak.longest} days.</span>
        </div>
      )}

      {closed && (
        <div className={`mb-4 rounded-[16px] border px-4 py-3 fade-in ${counts ? 'border-success/40 bg-success/10' : 'border-border bg-surface'}`}>
          <div className="flex items-center gap-2 font-bold text-[17px]">
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${counts ? 'bg-success text-black' : 'bg-surface2 text-muted'}`}>
              <Icon name="check" size={16} />
            </span>
            {copy.all_done}
          </div>
          <p className="mt-1 text-[14px] text-muted">
            {counts
              ? isToday
                ? `Counts toward the streak. It ticks over at midnight${streak.current ? ` → ${streak.current + 1}` : ''}.`
                : 'This day counts toward the streak.'
              : skipped
                ? 'A skipped session means this day won\'t count toward the streak.'
                : 'This day won\'t count toward the streak.'}
          </p>
        </div>
      )}

      {/* Sessions */}
      <div className="space-y-3">
        {visibleSessions.map((s) => (
          <TodaySessionCard key={s.id} day={day} session={s} />
        ))}
        {visibleSessions.length === 0 && (
          <Card>
            <Muted>{copy.empty_today}</Muted>
          </Card>
        )}
        {hiddenSessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-dashed border-border px-4 py-2.5">
            <span className="min-w-0 truncate text-[16px] text-muted">
              {s.title} <span className="text-[12px] font-semibold uppercase tracking-wide">· optional · hidden</span>
            </span>
            <button
              className="shrink-0 text-[14px] font-semibold text-text"
              onClick={() => updateSettings((st) => ({ ...st, hiddenOptional: st.hiddenOptional.filter((id) => id !== s.id) }))}
            >
              Show
            </button>
          </div>
        ))}
      </div>

      <HabitRow day={day} />

      {/* Notes */}
      {day.notes.length > 0 && (
        <div className="mt-5 rounded-[16px] border border-dashed border-border p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-1">Notes</div>
          <ul className="space-y-1">
            {day.notes.map((n, i) => (
              <li key={i} className="text-[16px] text-muted">{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Context footer */}
      <p className="mt-6 text-center text-[12px] text-muted/70">
        {day.block === 'Taper' || /taper/i.test(day.week_label) ? copy.taper : `${day.block} · Week ${day.week_index} of ${plan.weeks.length} · ${day.location}`}
      </p>
    </div>
  )
}
