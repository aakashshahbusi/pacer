import { useState } from 'react'
import { Button, Card, Field, ProgressBar, inputClass } from './ui'
import { useActions, useStore } from '../store/store'
import { todayISO, formatMonthDayYear } from '../lib/dates'
import type { Shoe } from '../types'

export function ShoesManager() {
  const { settings } = useStore()
  const { updateSettings } = useActions()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [retireAt, setRetireAt] = useState('400')
  const [first, setFirst] = useState(todayISO())

  const update = (fn: (shoes: Shoe[]) => Shoe[]) => updateSettings((s) => ({ ...s, shoes: fn(s.shoes) }))

  const setActive = (id: string) => update((shoes) => shoes.map((sh) => ({ ...sh, active: sh.id === id })))
  const retire = (id: string) =>
    update((shoes) => {
      const next = shoes.map((sh) => (sh.id === id ? { ...sh, retired: true, active: false } : sh))
      if (!next.some((sh) => sh.active)) {
        const firstLive = next.find((sh) => !sh.retired)
        if (firstLive) firstLive.active = true
      }
      return next
    })
  const unretire = (id: string) => update((shoes) => shoes.map((sh) => (sh.id === id ? { ...sh, retired: false } : sh)))
  const adjust = (id: string, miles: number) => update((shoes) => shoes.map((sh) => (sh.id === id ? { ...sh, miles: Math.max(0, Math.round(miles * 10) / 10) } : sh)))
  const addPair = () => {
    const n = name.trim()
    if (!n) return
    update((shoes) => [
      ...shoes,
      { id: `shoe-${Date.now().toString(36)}`, name: n, firstRun: first, miles: 0, retireAt: Number(retireAt) || 400, active: shoes.every((s) => s.retired) },
    ])
    setAdding(false)
    setName('')
  }

  return (
    <div className="space-y-3">
      {settings.shoes.map((sh) => (
        <Card key={sh.id} className={sh.retired ? 'opacity-60' : ''}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-[17px]">{sh.name}</div>
              <div className="text-[13px] text-muted">First run {formatMonthDayYear(sh.firstRun)}{sh.retired ? ' · retired' : sh.active ? ' · active' : ''}</div>
            </div>
            <div className="text-right tabular">
              <span className="text-[22px] font-bold">{sh.miles.toFixed(1)}</span>
              <span className="text-muted text-[13px]"> / {sh.retireAt} mi</span>
            </div>
          </div>
          <div className="mt-3"><ProgressBar value={sh.miles} max={sh.retireAt} tone={sh.miles >= sh.retireAt ? 'accent' : 'success'} /></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[13px] text-muted">
              Adjust
              <input className={`${inputClass} w-24 py-1.5 tabular`} type="number" inputMode="decimal" step="0.1" value={sh.miles} onChange={(e) => adjust(sh.id, parseFloat(e.target.value) || 0)} />
            </label>
            <span className="flex-1" />
            {!sh.retired && !sh.active && <Button className="py-1.5 text-[14px]" onClick={() => setActive(sh.id)}>Make active</Button>}
            {!sh.retired ? (
              <Button variant="ghost" className="py-1.5 text-[14px]" onClick={() => retire(sh.id)}>Retire</Button>
            ) : (
              <Button variant="ghost" className="py-1.5 text-[14px]" onClick={() => unretire(sh.id)}>Un-retire</Button>
            )}
          </div>
        </Card>
      ))}
      {adding ? (
        <Card>
          <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike Vomero (pair 2)" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Retire at (mi)"><input className={inputClass} type="number" inputMode="numeric" value={retireAt} onChange={(e) => setRetireAt(e.target.value)} /></Field>
            <Field label="First run"><input className={inputClass} type="date" value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={addPair} disabled={!name.trim()}>Add pair</Button>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <Button className="w-full" onClick={() => setAdding(true)}>Add pair</Button>
      )}
    </div>
  )
}
