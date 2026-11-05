import React, { useEffect, useMemo, useRef, useState } from 'react'
import { clampToPlan, getDay, getDayOffset, plan } from '../data/plan'
import { copy } from '../data/content'
import { useToday } from '../lib/today'
import { diffDays, formatLong } from '../lib/dates'
import { nextRace, shortRaceName } from '../lib/selectors'
import { useStore } from '../store/store'
import { SessionCard } from '../components/SessionCard'
import { Button, Card, Muted } from '../components/ui'
import { Icon } from '../components/Icon'
import { navigate, type Route } from '../lib/route'

const ISO = /^\d{4}-\d{2}-\d{2}$/

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
  const { settings } = useStore()
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

  const visibleSessions = day.sessions.filter((s) => !(s.optional && settings.hiddenOptional.includes(s.id)))
  const hiddenCount = day.sessions.length - visibleSessions.length
  const isToday = date === clampToPlan(today)

  return (
    <div className="px-4 pb-6 fade-in" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} key={date}>
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

      {/* Easter egg line (pinned only for now; rotation arrives in step 10) */}
      {day.egg && <p className="text-muted text-[15px] italic text-center px-2 mb-4">{day.egg}</p>}

      {/* Sessions */}
      <div className="space-y-3">
        {visibleSessions.map((s) => (
          <SessionCard key={s.id} day={day} session={s} />
        ))}
        {visibleSessions.length === 0 && (
          <Card>
            <Muted>{copy.empty_today}</Muted>
          </Card>
        )}
        {hiddenCount > 0 && (
          <p className="text-center text-[13px] text-muted">
            {hiddenCount} optional session{hiddenCount === 1 ? '' : 's'} hidden ·{' '}
            <button className="underline" onClick={() => navigate('more', 'settings')}>manage</button>
          </p>
        )}
      </div>

      {/* Notes */}
      {day.notes.length > 0 && (
        <div className="mt-5 rounded-[16px] border border-dashed border-border p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-1">Notes</div>
          <ul className="space-y-1">
            {day.notes.map((n, i) => (
              <li key={i} className="text-[15px] text-muted">{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Context footer */}
      <p className="mt-6 text-center text-[12px] text-muted/70">
        {day.location === 'India' ? copy.india : `${day.block} · Week ${day.week_index} of ${plan.weeks.length} · ${day.location}`}
      </p>
    </div>
  )
}
