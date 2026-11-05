import { useEffect, useRef, useState } from 'react'
import { labels } from '../data/content'
import { ownWords, ruleSix } from '../lib/eggs'
import { Button } from './ui'
import { Icon } from './Icon'
import { fmtClock } from '../lib/dates'

const TEN_MIN = 10 * 60

/** The 10-minute rule screen: Rule 6, a 10:00 countdown, then "Still want to stop? It counts." */
export function TenMinute({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [left, setLeft] = useState(TEN_MIN)
  const [running, setRunning] = useState(false)
  const endAt = useRef<number | null>(null)
  const words = ownWords('the 10-minute rule screen')

  useEffect(() => {
    if (!open) {
      setLeft(TEN_MIN)
      setRunning(false)
      endAt.current = null
    }
  }, [open])

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endAt.current == null) return
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) setRunning(false)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running])

  if (!open) return null
  const start = () => {
    endAt.current = Date.now() + left * 1000
    setRunning(true)
  }
  const pause = () => {
    setRunning(false)
  }
  const finished = left === 0

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col" role="dialog" aria-modal="true" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Rule {ruleSix?.n} · {ruleSix?.name}</span>
        <button onClick={onClose} className="p-2 -mr-2 text-muted" aria-label="Close"><Icon name="x" /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight">{labels.ten_minute_rule}</h1>
        {words && <p className="mt-2 text-[14px] text-muted">{words.text} <span className="not-italic">— {words.source}</span></p>}
        <div className={`tabular mt-8 text-[88px] font-bold leading-none ${finished ? 'text-success' : ''}`}>{fmtClock(left)}</div>
        {!finished ? (
          <div className="mt-8 flex gap-3">
            {running ? (
              <Button onClick={pause} className="px-8">Pause</Button>
            ) : (
              <Button variant="primary" onClick={start} className="px-8"><Icon name="play" size={16} /> {left === TEN_MIN ? 'Start ten minutes' : 'Resume'}</Button>
            )}
          </div>
        ) : (
          <div className="mt-8 w-full max-w-[360px] fade-in">
            <p className="text-[19px] font-semibold">Still want to stop? It counts.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="success" onClick={onDone}><Icon name="check" size={18} /> Done</Button>
              <Button variant="primary" onClick={onClose}>Keep going</Button>
            </div>
          </div>
        )}
        {ruleSix && <p className="mt-10 max-w-[360px] text-[15px] leading-relaxed text-muted">{ruleSix.text}</p>}
      </div>
    </div>
  )
}
