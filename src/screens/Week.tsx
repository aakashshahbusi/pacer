import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { plan } from '../data/plan'
import { labels } from '../data/content'
import { Button, Card, Screen } from '../components/ui'
import { Icon } from '../components/Icon'
import { useStore } from '../store/store'
import { useToday } from '../lib/today'
import { dotState, summarizeWeek, weekIndexFor } from '../lib/weeks'
import { clampToPlan } from '../data/plan'
import { formatMonthDay, fromISO } from '../lib/dates'
import { navigate } from '../lib/route'
import type { PlanDay, Session } from '../types'

function Dot({ state, optional }: { state: ReturnType<typeof dotState>; optional: boolean }) {
  const base = optional ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'
  const cls =
    state === 'done'
      ? 'bg-success'
      : state === 'partial'
        ? 'bg-success/50'
        : state === 'skipped'
          ? 'bg-accent'
          : 'border border-muted/60 bg-transparent'
  return <span className={`inline-block rounded-full ${base} ${cls}`} />
}

function sessionDots(day: PlanDay, results: Parameters<typeof dotState>[2]) {
  const quiet = (s: Session) => s.optional || s.kind === 'rest' || s.kind === 'off' || s.kind === 'travel' || s.kind === 'flex'
  return day.sessions.map((s) => <Dot key={s.id} state={dotState(day, s, results)} optional={quiet(s)} />)
}

export default function Week() {
  const today = useToday()
  const { results } = useStore()
  const [index, setIndex] = useState(() => weekIndexFor(clampToPlan(today)))
  const [sharing, setSharing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const summary = useMemo(() => summarizeWeek(index, results), [index, results])
  const first = plan.weeks[0].index
  const last = plan.weeks[plan.weeks.length - 1].index

  if (!summary) return null
  const { week } = summary
  const isCurrent = index === weekIndexFor(clampToPlan(today))

  const share = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0B0B0D',
        cacheBust: true,
      })
      const blob = await (await fetch(dataUrl)).blob()
      const name = `pacer-week-${week.index}-${week.start}.png`
      const file = new File([blob], name, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `${labels.weekly_summary} · Week ${week.index}` })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = name
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') console.error('share failed', e)
    } finally {
      setSharing(false)
    }
  }

  const pct = summary.plannedMiles > 0 ? Math.min(1, summary.actualMiles / summary.plannedMiles) : 0

  return (
    <Screen
      title={labels.weekly_summary}
      subtitle={`Week ${week.index} of ${plan.weeks.length}`}
      right={
        <Button variant="secondary" className="py-2 text-[14px]" onClick={share} disabled={sharing}>
          <Icon name="share" size={16} /> {sharing ? 'Rendering…' : 'Share'}
        </Button>
      }
    >
      <div className="flex items-center justify-between mb-3">
        <button className="p-2 -ml-2 text-muted disabled:opacity-30" disabled={index <= first} onClick={() => setIndex((i) => i - 1)} aria-label="Previous week">
          <Icon name="chevron-left" />
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold">
            {formatMonthDay(week.start)} – {formatMonthDay(week.end)}
          </div>
          <div className="text-[13px] text-muted">
            {week.phase_name} · {week.block}
          </div>
        </div>
        <button className="p-2 -mr-2 text-muted disabled:opacity-30" disabled={index >= last} onClick={() => setIndex((i) => i + 1)} aria-label="Next week">
          <Icon name="chevron-right" />
        </button>
      </div>
      {!isCurrent && (
        <div className="flex justify-center mb-3">
          <Button variant="ghost" className="py-1.5 text-[14px]" onClick={() => setIndex(weekIndexFor(clampToPlan(today)))}>This week</Button>
        </div>
      )}

      <div ref={cardRef} className="rounded-[16px] bg-bg">
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{labels.weekly_summary}</div>
              <div className="text-[18px] font-bold leading-tight mt-0.5">{week.label}</div>
            </div>
            {week.deload && <span className="shrink-0 rounded-full bg-accent/15 text-accent px-3 py-1 text-[12px] font-semibold uppercase tracking-wide">Deload</span>}
          </div>

          {/* Mon–Sun strip */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            {summary.strip.map(({ date, day }) => {
              const d = fromISO(date)
              const isToday = date === today
              return (
                <button
                  key={date}
                  disabled={!day}
                  onClick={() => day && navigate('today', date)}
                  className={`flex flex-col items-center rounded-xl py-2 ${isToday ? 'bg-surface2 border border-border' : ''} ${day ? '' : 'opacity-30'}`}
                >
                  <span className="text-[11px] font-semibold uppercase text-muted">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}</span>
                  <span className={`tabular text-[15px] font-bold ${date < today && day ? '' : 'text-text'}`}>{d.getDate()}</span>
                  <span className="mt-1.5 flex flex-wrap justify-center gap-1 min-h-[10px]">{day ? sessionDots(day, results) : null}</span>
                </button>
              )
            })}
          </div>

          {/* Big pair */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Planned</div>
              <div className="tabular text-[44px] font-bold leading-none mt-1">{summary.plannedMiles}</div>
              <div className="text-[13px] text-muted">miles</div>
            </div>
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Actual</div>
              <div className={`tabular text-[44px] font-bold leading-none mt-1 ${summary.actualMiles >= summary.plannedMiles && summary.plannedMiles > 0 ? 'text-success' : ''}`}>{summary.actualMiles}</div>
              <div className="text-[13px] text-muted">miles</div>
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-surface2 overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct * 100}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-surface2/70 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Long run</div>
              <div className="tabular text-[18px] font-bold">
                {summary.longRunPlanned > 0 ? (
                  <>
                    {summary.longRunDone != null ? <span className="text-success">{summary.longRunDone}</span> : <span className="text-muted">—</span>}
                    <span className="text-muted text-[14px] font-medium"> / {summary.longRunPlanned}</span>
                  </>
                ) : (
                  <span className="text-muted">none</span>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-surface2/70 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Runs</div>
              <div className="tabular text-[18px] font-bold">
                {summary.runsDone}<span className="text-muted text-[14px] font-medium"> / {summary.runsPlanned}</span>
              </div>
            </div>
            <div className="rounded-xl bg-surface2/70 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Lifts</div>
              <div className="tabular text-[18px] font-bold">
                {summary.liftsDone}<span className="text-muted text-[14px] font-medium"> / {summary.liftsPlanned}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[15px]">
            <span className="font-semibold">Focus. </span>
            {week.focus}
          </p>
          {summary.sessionsSkipped > 0 && (
            <p className="mt-1 text-[13px] text-muted">{summary.sessionsSkipped} skipped</p>
          )}
          <div className="mt-3 text-[11px] text-muted/70 tabular">Pacer · {formatMonthDay(week.start)} – {formatMonthDay(week.end)}</div>
        </Card>
      </div>

      <p className="mt-4 text-center text-[13px] text-muted">Share renders this card as a PNG for the Sunday check-in.</p>
    </Screen>
  )
}
