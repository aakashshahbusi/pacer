import React, { useState } from 'react'
import type { PlanDay, Session, SessionResult } from '../types'
import { Button, Card, Field, Sheet, Tag, inputClass } from './ui'
import { Icon } from './Icon'
import { useActions, useStore } from '../store/store'
import { resultFor } from '../lib/selectors'
import { fmtClock, parseClock } from '../lib/dates'
import { TenMinute } from './TenMinute'
import { ownWords } from '../lib/eggs'

export interface SessionCardProps {
  day: PlanDay
  session: Session
  /** Extra body rendered between the header and the status row (lift exercises, pace line…). */
  body?: React.ReactNode
  /** Extra links shown under the status row (e.g. "Don't feel like it"). */
  footer?: React.ReactNode
  /** Called after a Done is saved (used for confirmations). */
  onDone?: (r: SessionResult) => void
  /** Awaited before a Done is recorded (lift set logs). */
  onBeforeDone?: () => Promise<void>
}

export function Details({ items, defaultOpen = false }: { items: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!items.length) return null
  return (
    <div className="mt-3">
      {!defaultOpen && (
        <button className="flex items-center gap-1 text-[14px] font-semibold text-muted" onClick={() => setOpen((o) => !o)}>
          <Icon name="chevron-down" size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide details' : `Details (${items.length})`}
        </button>
      )}
      {open && (
        <ul className="mt-2 space-y-2 fade-in">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2 text-[16px] leading-snug">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted/70" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function MetaRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">{children}</div>
}

function StatusLine({ r, session, onUndo }: { r: SessionResult; session: Session; onUndo: () => void }) {
  const label =
    r.status === 'done' ? 'Done' : r.status === 'partial' ? 'Partial' : 'Skipped'
  const tone = r.status === 'skipped' ? 'text-muted' : 'text-success'
  const extra: string[] = []
  if ((r.status === 'done' || r.status === 'partial') && r.actual_mi != null && (session.kind === 'run' || session.kind === 'race'))
    extra.push(`${r.actual_mi} mi`)
  if (r.finish_time_sec) extra.push(fmtClock(r.finish_time_sec, session.kind === 'race' && (session.distance_mi ?? 0) >= 10))
  if (r.actual_min) extra.push(`${r.actual_min} min`)
  return (
    <div className="mt-4 flex items-center justify-between check-pop">
      <div className={`flex items-center gap-2 font-semibold ${tone}`}>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${r.status === 'skipped' ? 'bg-surface2' : 'bg-success/15'}`}>
          <Icon name={r.status === 'skipped' ? 'x' : 'check'} size={16} />
        </span>
        <span>
          {label}
          {extra.length ? <span className="text-muted font-medium"> · {extra.join(' · ')}</span> : null}
        </span>
      </div>
      <button className="text-[14px] text-muted underline-offset-2 active:underline" onClick={onUndo}>
        Undo
      </button>
    </div>
  )
}

export function SessionCard({ day, session, body, footer, onDone, onBeforeDone }: SessionCardProps) {
  const { results, settings } = useStore()
  const { setResult, clearResult, updateSettings } = useActions()
  const r = resultFor(results, day.date, session.id)
  const [partialOpen, setPartialOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [partialMi, setPartialMi] = useState('')
  const [partialMin, setPartialMin] = useState('')
  const [finish, setFinish] = useState('')
  const [finishErr, setFinishErr] = useState<string | null>(null)
  const [tenOpen, setTenOpen] = useState(false)

  const isRun = session.kind === 'run' || session.kind === 'race'
  const isRace = session.kind === 'race'
  const isTT = session.pace_key === 'tt'
  const simple = session.kind === 'rest' || session.kind === 'off' || session.kind === 'travel' || session.kind === 'flex'
  const hidden = settings.hiddenOptional.includes(session.id)
  const longWords = ownWords('finish of any long run')

  const save = async (partial: Partial<SessionResult> & { status: SessionResult['status'] }) => {
    if (partial.status !== 'skipped' && onBeforeDone) await onBeforeDone()
    const rec = { date: day.date, session_id: session.id, ...partial }
    await setResult(rec)
    if (partial.status === 'done') onDone?.({ ...rec, loggedAt: new Date().toISOString() })
  }

  const markDone = () => {
    if (isRace || isTT) {
      setFinish('')
      setFinishErr(null)
      setFinishOpen(true)
      return
    }
    void save({ status: 'done', actual_mi: session.distance_mi })
  }

  const saveFinish = async (withTime: boolean) => {
    let sec: number | undefined
    if (withTime) {
      const parsed = parseClock(finish)
      if (parsed == null || parsed <= 0) {
        setFinishErr(isTT ? 'Enter the 5K as mm:ss' : 'Enter the finish as h:mm:ss or mm:ss')
        return
      }
      sec = parsed
    }
    await save({ status: 'done', actual_mi: session.distance_mi, finish_time_sec: sec })
    if (isTT && sec) {
      await updateSettings((s) => ({ ...s, fiveK: [...s.fiveK, { seconds: sec!, date: day.date }] }))
    }
    setFinishOpen(false)
  }

  const savePartial = async () => {
    const mi = parseFloat(partialMi)
    const min = parseInt(partialMin, 10)
    await save({
      status: 'partial',
      actual_mi: isRun && !Number.isNaN(mi) ? mi : undefined,
      actual_min: !Number.isNaN(min) ? min : undefined,
    })
    setPartialOpen(false)
    setPartialMi('')
    setPartialMin('')
  }

  const toggleHidden = () =>
    updateSettings((s) => ({
      ...s,
      hiddenOptional: hidden ? s.hiddenOptional.filter((id) => id !== session.id) : [...s.hiddenOptional, session.id],
    }))

  const raceStyle = isRace ? 'border-accent/50 bg-[color-mix(in_srgb,var(--surface),var(--accent)_7%)]' : ''
  const doneStyle = r && r.status !== 'skipped' ? 'border-success/30' : ''

  return (
    <Card className={`${raceStyle} ${doneStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={isRace ? 'accent' : 'muted'}>{session.subtitle}</Tag>
            {session.optional && (
              <button onClick={toggleHidden} className="text-[12px] font-semibold uppercase tracking-wide text-muted/80 border border-border rounded-md px-2 py-0.5">
                optional{hidden ? ' · hidden' : ''}
              </button>
            )}
          </div>
          <h3 className={`mt-2 font-bold leading-tight ${isRace ? 'text-[22px]' : 'text-[19px]'}`}>{session.title}</h3>
        </div>
        {session.distance_mi != null && (
          <div className="text-right shrink-0">
            <div className="tabular text-[30px] font-bold leading-none">{session.distance_mi}</div>
            <div className="text-[12px] text-muted font-semibold uppercase tracking-wide">mi</div>
          </div>
        )}
      </div>

      {body}

      <MetaRow>
        {session.est_min > 0 && (
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={14} /> ~{session.est_min} min
          </span>
        )}
        {session.location && <span>{session.location}</span>}
      </MetaRow>

      <Details items={session.details} defaultOpen={isRace} />

      {r ? (
        <>
          <StatusLine r={r} session={session} onUndo={() => clearResult(day.date, session.id)} />
          {r.status !== 'skipped' && session.pace_key === 'long' && longWords && (
            <p className="mt-2 text-[16px] text-muted fade-in">{longWords.text} <span>— {longWords.source}</span></p>
          )}
        </>
      ) : simple ? (
        <div className="mt-4">
          <Button variant="secondary" className="w-full" onClick={() => save({ status: 'done' })}>
            <Icon name="check" size={18} /> Got it
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <Button variant="primary" onClick={markDone} className="py-3.5">
            <Icon name="check" size={18} /> Done
          </Button>
          <Button variant="secondary" onClick={() => save({ status: 'skipped' })}>Skipped</Button>
          <Button variant="secondary" onClick={() => setPartialOpen(true)}>Partial</Button>
        </div>
      )}

      {!r && (session.kind === 'run' || session.kind === 'lift') && (
        <div className="mt-3 text-center">
          <button className="text-[14px] text-muted underline-offset-4 underline decoration-muted/40" onClick={() => setTenOpen(true)}>
            Don't feel like it
          </button>
        </div>
      )}

      {footer}

      <TenMinute
        open={tenOpen}
        onClose={() => setTenOpen(false)}
        onDone={() => {
          setTenOpen(false)
          if (isRun) {
            // "It counts" — but a partial run still needs its miles (§4.1), so go through the Partial sheet.
            setPartialMi('')
            setPartialMin('10')
            setPartialOpen(true)
          } else {
            void save({ status: 'done' })
          }
        }}
      />

      <Sheet open={partialOpen} onClose={() => setPartialOpen(false)} title="Partial">
        {isRun && (
          <Field label="Actual miles">
            <input className={inputClass} inputMode="decimal" type="number" step="0.1" min="0" value={partialMi} onChange={(e) => setPartialMi(e.target.value)} placeholder={String(session.distance_mi ?? '')} autoFocus />
          </Field>
        )}
        <Field label="Minutes (optional)">
          <input className={inputClass} inputMode="numeric" type="number" min="0" value={partialMin} onChange={(e) => setPartialMin(e.target.value)} placeholder={String(session.est_min || '')} />
        </Field>
        <Button variant="primary" className="w-full" onClick={savePartial} disabled={isRun && (partialMi === '' || Number.isNaN(parseFloat(partialMi)))}>
          Save partial
        </Button>
      </Sheet>

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title={isTT ? 'Your 5K time' : 'Finish time'}>
        <p className="text-muted text-[15px] mb-3">{isTT ? 'Every pace in the plan updates from this number.' : 'Records a PR for this distance.'}</p>
        <Field label={isTT ? 'mm:ss' : 'h:mm:ss'} hint="Digits only works too: 2200 → 22:00.">
          <input className={`${inputClass} tabular text-[22px]`} inputMode="numeric" value={finish} onChange={(e) => { setFinish(e.target.value); setFinishErr(null) }} placeholder={isTT ? '22:00 or 2200' : '2:05:00 or 20500'} autoFocus />
        </Field>
        {finishErr && <p className="text-accent text-[14px] mb-2">{finishErr}</p>}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button variant="primary" onClick={() => saveFinish(true)}>Save</Button>
          <Button variant="ghost" onClick={() => saveFinish(false)}>No time</Button>
        </div>
      </Sheet>
    </Card>
  )
}
