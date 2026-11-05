import React, { useMemo, useRef, useState } from 'react'
import { content, labels } from '../data/content'
import { Button, Card, Field, Muted, Screen, SectionTitle, inputClass } from '../components/ui'
import { useActions, useStore } from '../store/store'
import { allZones, currentFiveK } from '../lib/pace'
import { fmtClock, formatMonthDayYear, parseClock, todayISO } from '../lib/dates'
import type { ExportBundle } from '../types'
import { Icon } from '../components/Icon'
import { navigate } from '../lib/route'
import { ShoesManager } from '../components/ShoesManager'

function ZonePreview({ seconds, estimated }: { seconds: number; estimated: boolean }) {
  const zones = useMemo(() => allZones(seconds), [seconds])
  return (
    <div className="mt-3 rounded-xl bg-surface2/60 border border-border divide-y divide-border">
      {zones.map((z) => (
        <div key={z.key} className="flex items-center justify-between px-3 py-2">
          <span className="text-[14px] text-muted">{z.label}</span>
          <span className="text-right">
            <span className="tabular font-semibold">{z.range}</span>
            {z.treadmill && <span className="block text-[12px] text-muted">treadmill {z.treadmill}</span>}
          </span>
        </div>
      ))}
      {estimated && <div className="px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-accent">estimated</div>}
    </div>
  )
}

export default function SettingsScreen() {
  const { settings } = useStore()
  const { updateSettings, exportBundle, importBundle, resetAll } = useActions()
  const [timeText, setTimeText] = useState('')
  const [dateText, setDateText] = useState(todayISO())
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const current = currentFiveK(settings)
  const typed = parseClock(timeText)
  const previewSeconds = typed && typed > 0 ? typed : current ? current.seconds : content.athlete.baseline_5k_seconds_for_pace_engine
  const previewEstimated = !(typed && typed > 0) && !current

  const saveFiveK = async () => {
    const sec = parseClock(timeText)
    if (!sec || sec < 600 || sec > 3600) {
      setErr('Enter a 5K time as mm:ss')
      return
    }
    await updateSettings((s) => ({ ...s, fiveK: [...s.fiveK, { seconds: sec, date: dateText || todayISO() }] }))
    setTimeText('')
    setErr(null)
    setMsg('Saved. Every pace in the plan just updated.')
  }

  const removeFiveK = (i: number) => updateSettings((s) => ({ ...s, fiveK: s.fiveK.filter((_, j) => j !== i) }))

  const doExport = async () => {
    const bundle = exportBundle()
    const json = JSON.stringify(bundle, null, 2)
    const name = `pacer-export-${todayISO()}.json`
    const file = new File([json], name, { type: 'application/json' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'Pacer export' })
        return
      } catch {
        /* fall through to download */
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportBundle()))
      setMsg('Export copied to the clipboard.')
    } catch {
      setMsg('Could not copy. Use Export instead.')
    }
  }

  const doImportText = async (text: string) => {
    try {
      const parsed = JSON.parse(text) as ExportBundle
      await importBundle(parsed)
      setMsg('Imported. Everything restored.')
      setPasteOpen(false)
      setPasteText('')
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    await doImportText(await f.text())
    e.target.value = ''
  }

  const wakeKeys = Object.keys(content.sleep.wake_time)

  return (
    <Screen title="Settings" back={() => navigate('more')} backLabel="More">
      {msg && (
        <div className="mb-3 rounded-xl bg-surface2 border border-border px-3 py-2 text-[14px] flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-muted"><Icon name="x" size={16} /></button>
        </div>
      )}

      <SectionTitle>{labels.settings_pace_section}</SectionTitle>
      <Card>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">Current 5K</span>
          {current ? (
            <span className="tabular text-[22px] font-bold">{fmtClock(current.seconds)} <span className="text-[13px] text-muted font-medium">{formatMonthDayYear(current.date)}</span></span>
          ) : (
            <span className="text-[14px] text-muted text-right max-w-[70%]">{content.athlete.baseline_5k_label}</span>
          )}
        </div>
        <p className="text-[14px] text-muted mt-2">{content.pace_engine.description}</p>
        <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2">
          <Field label="5K time (mm:ss)">
            <input className={`${inputClass} tabular text-[20px]`} inputMode="numeric" placeholder="22:00" value={timeText} onChange={(e) => { setTimeText(e.target.value); setErr(null) }} />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" value={dateText} min={content.app.start} onChange={(e) => setDateText(e.target.value)} />
          </Field>
        </div>
        {err && <p className="text-accent text-[14px] mb-2">{err}</p>}
        <Button variant="primary" className="w-full" onClick={saveFiveK} disabled={!typed}>Save 5K time</Button>
        <ZonePreview seconds={previewSeconds} estimated={previewEstimated} />
        {settings.fiveK.length > 0 && (
          <div className="mt-4">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-1">History</div>
            <ul className="divide-y divide-border">
              {[...settings.fiveK].map((e, i) => ({ e, i })).sort((a, b) => (a.e.date < b.e.date ? 1 : -1)).map(({ e, i }) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span className="tabular font-semibold">{fmtClock(e.seconds)}</span>
                  <span className="text-muted text-[14px]">{formatMonthDayYear(e.date)}</span>
                  <button className="text-[13px] text-muted" onClick={() => removeFiveK(i)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <SectionTitle>Wake times</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          {wakeKeys.map((k) => (
            <Field key={k} label={k}>
              <input className={`${inputClass} tabular`} inputMode="numeric" value={settings.wakeTimes[k] ?? ''} onChange={(e) => updateSettings((s) => ({ ...s, wakeTimes: { ...s.wakeTimes, [k]: e.target.value } }))} />
            </Field>
          ))}
        </div>
        <Muted className="text-[13px]">{content.sleep.guardrails[0]}</Muted>
      </Card>

      <SectionTitle>Shoes</SectionTitle>
      <ShoesManager />

      <SectionTitle>Theme</SectionTitle>
      <Card className="flex items-center justify-between">
        <span>Appearance</span>
        <div className="flex rounded-xl bg-surface2 border border-border p-1">
          {(['dark', 'light'] as const).map((t) => (
            <button key={t} onClick={() => updateSettings({ theme: t })} className={`px-4 py-1.5 rounded-lg text-[14px] font-semibold ${settings.theme === t ? 'bg-text text-bg' : 'text-muted'}`}>
              {t === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card className="space-y-2">
        <Button className="w-full" onClick={doExport}><Icon name="share" size={18} /> Export JSON</Button>
        <Button className="w-full" variant="ghost" onClick={copyExport}>Copy export to clipboard</Button>
        <Button className="w-full" onClick={() => fileRef.current?.click()}>Import JSON file</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        <Button className="w-full" variant="ghost" onClick={() => setPasteOpen((o) => !o)}>Paste an export instead</Button>
        {pasteOpen && (
          <div>
            <textarea className={`${inputClass} h-28 text-[13px]`} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder='{"app":"Pacer",…}' />
            <Button variant="primary" className="w-full mt-2" disabled={!pasteText.trim()} onClick={() => doImportText(pasteText)}>Import pasted JSON</Button>
          </div>
        )}
        <div className="pt-2 border-t border-border">
          {!confirmReset ? (
            <Button className="w-full" variant="danger" onClick={() => setConfirmReset(true)}>Reset everything</Button>
          ) : (
            <div className="space-y-2">
              <p className="text-[14px] text-muted">This deletes every check-off, lift log, habit, custom log, badge and setting on this device. Export first.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="danger" onClick={async () => { await resetAll(); setConfirmReset(false); setMsg('Reset. Clean slate.') }}>Yes, reset</Button>
                <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <SectionTitle>Install on iPhone</SectionTitle>
      <Card>
        <ol className="list-decimal pl-5 space-y-1 text-[15px]">
          <li>Open Pacer in Safari.</li>
          <li>Tap <strong>Share</strong> (the square with the arrow).</li>
          <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
        </ol>
        <Muted className="mt-2 text-[13px]">{content.app_copy.offline}</Muted>
      </Card>

      <p className="mt-6 text-center text-[12px] text-muted/70">{content.app.name} · {content.app.tagline} · coached by {content.app.coach}</p>
    </Screen>
  )
}
