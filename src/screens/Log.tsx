import { useMemo, useState } from 'react'
import { content } from '../data/content'
import { Button, Card, Field, Muted, Screen, Sheet, inputClass } from '../components/ui'
import { Icon } from '../components/Icon'
import { navigate } from '../lib/route'
import { useActions, useStore } from '../store/store'
import { useToday } from '../lib/today'
import { formatShort, todayISO } from '../lib/dates'
import { sundayExport } from '../lib/export'
import { clampToPlan } from '../data/plan'

const UNIT_HINT: Record<string, string> = {
  Food: '',
  Sleep: 'h',
  Pickleball: 'min',
  Body: '/10',
  Weight: 'lb',
  Note: '',
}

function typeShort(t: string) {
  return t.split(' (')[0]
}

export default function Log() {
  const today = useToday()
  const state = useStore()
  const { addCustomLog, deleteCustomLog } = useActions()
  const types = content.habits.custom_log.types
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(types[0])
  const [text, setText] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [date, setDate] = useState(todayISO())
  const [msg, setMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const pickType = (t: string) => {
    setType(t)
    setUnit(UNIT_HINT[typeShort(t).split(' /')[0]] ?? '')
  }

  const save = async () => {
    if (!text.trim() && value === '') return
    const v = value === '' ? undefined : Number(value)
    await addCustomLog({ date, type, text: text.trim(), value: v != null && !Number.isNaN(v) ? v : undefined, unit: unit.trim() || undefined })
    setText('')
    setValue('')
    setOpen(false)
  }

  const grouped = useMemo(() => {
    const m = new Map<string, typeof state.customLogs>()
    for (const c of state.customLogs) {
      if (!m.has(c.date)) m.set(c.date, [])
      m.get(c.date)!.push(c)
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [state.customLogs])

  const exportSunday = async () => {
    const t = sundayExport(clampToPlan(today), state)
    try {
      await navigator.clipboard.writeText(t)
      setMsg('Last 7 days copied. Paste it to Claude.')
    } catch {
      setMsg('Clipboard blocked — select the text below and copy it.')
    }
    setPreview(t)
  }

  return (
    <Screen
      title="Log"
      back={() => navigate('more')}
      backLabel="More"
      right={
        <Button variant="primary" className="py-2 text-[14px]" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> Add
        </Button>
      }
    >
      <Muted className="mb-3 text-[14px]">{content.habits.custom_log.rule}</Muted>
      <Card className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold">Sunday export</div>
          <div className="text-[13px] text-muted">Last 7 days as plain text, for the check-in.</div>
        </div>
        <Button className="py-2 text-[14px] shrink-0" onClick={exportSunday}>Copy</Button>
      </Card>
      {msg && (
        <div className="mt-2 rounded-xl bg-surface2 border border-border px-3 py-2 text-[14px] flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => { setMsg(null); setPreview(null) }} className="text-muted"><Icon name="x" size={16} /></button>
        </div>
      )}
      {preview && (
        <textarea readOnly className={`${inputClass} mt-2 h-48 text-[12px] font-mono`} value={preview} onFocus={(e) => e.target.select()} />
      )}

      <div className="mt-5 space-y-4">
        {grouped.length === 0 && <Muted>No entries yet. Add food, sleep, pickleball minutes, how the body feels, or a note.</Muted>}
        {grouped.map(([d, entries]) => (
          <div key={d}>
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted mb-1">{formatShort(d)}{d === today ? ' · today' : ''}</div>
            <Card className="divide-y divide-border py-1">
              {entries.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{typeShort(c.type)}</div>
                    <div className="text-[15px]">
                      {c.text}
                      {c.value != null && <span className="tabular font-semibold"> {c.text ? '· ' : ''}{c.value}{c.unit ? ` ${c.unit}` : ''}</span>}
                    </div>
                  </div>
                  <button className="text-muted text-[13px] shrink-0" onClick={() => deleteCustomLog(c.id)}>Delete</button>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add to the log">
        <div className="flex flex-wrap gap-2 mb-3">
          {types.map((t) => (
            <button key={t} onClick={() => pickType(t)} className={`rounded-full border px-3 py-1.5 text-[14px] font-medium ${type === t ? 'bg-text text-bg border-text' : 'bg-surface2 text-muted border-border'}`}>
              {typeShort(t)}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted mb-2">{type}</p>
        <Field label="What">
          <textarea className={`${inputClass} h-20`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Free text" autoFocus />
        </Field>
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
          <Field label="Number (optional)">
            <input className={`${inputClass} tabular`} type="number" inputMode="decimal" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Unit">
            <input className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="min, h, lb" />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Button variant="primary" className="w-full" onClick={save} disabled={!text.trim() && value === ''}>Save</Button>
      </Sheet>
    </Screen>
  )
}
