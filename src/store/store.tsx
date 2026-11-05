import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Badge, CustomLog, ExportBundle, HabitLog, LiftLog, SessionResult, Settings,
} from '../types'
import { clearAll, habitKey, liftKey, loadAll, put, del, resultKey, writeAll } from './db'
import { defaultSettings, normalizeSettings } from './defaults'
import { nowISO } from '../lib/dates'
import { findSession } from '../data/plan'
import { creditedMiles, isRunLike } from '../lib/selectors'
import { round1 } from '../lib/weeks'

export interface StoreState {
  ready: boolean
  results: Record<string, SessionResult>
  liftLogs: Record<string, LiftLog>
  habits: Record<string, HabitLog>
  customLogs: CustomLog[]
  settings: Settings
  badges: Record<string, Badge>
  /** bumps after every persisted save — badge evaluation listens to it */
  saveTick: number
}

export interface StoreActions {
  setResult(r: Omit<SessionResult, 'loggedAt'> & { loggedAt?: string }): Promise<void>
  clearResult(date: string, sessionId: string): Promise<void>
  setLiftLog(l: Omit<LiftLog, 'loggedAt'> & { loggedAt?: string }): Promise<void>
  setHabit(date: string, key: string, done: boolean): Promise<void>
  addCustomLog(c: Omit<CustomLog, 'id' | 'loggedAt'>): Promise<void>
  deleteCustomLog(id: string): Promise<void>
  updateSettings(patch: Partial<Settings> | ((s: Settings) => Settings)): Promise<void>
  unlockBadge(key: string, at?: string): Promise<void>
  exportBundle(): ExportBundle
  importBundle(b: ExportBundle): Promise<void>
  resetAll(): Promise<void>
}

const StateCtx = createContext<StoreState | null>(null)
const ActionsCtx = createContext<StoreActions | null>(null)

const emptyState = (): StoreState => ({
  ready: false,
  results: {},
  liftLogs: {},
  habits: {},
  customLogs: [],
  settings: defaultSettings(),
  badges: {},
  saveTick: 0,
})

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(emptyState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let alive = true
    loadAll()
      .then((shape) => {
        if (!alive) return
        const results: Record<string, SessionResult> = {}
        for (const r of shape.results) {
          const { _k, ...rest } = r
          results[_k] = rest
        }
        const liftLogs: Record<string, LiftLog> = {}
        for (const l of shape.liftLogs) {
          const { _k, ...rest } = l
          liftLogs[_k] = rest
        }
        const habits: Record<string, HabitLog> = {}
        for (const h of shape.habits) {
          const { _k, ...rest } = h
          habits[_k] = rest
        }
        const badges: Record<string, Badge> = {}
        for (const b of shape.badges) badges[b.key] = b
        setState({
          ready: true,
          results,
          liftLogs,
          habits,
          customLogs: shape.customLogs.sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1)),
          settings: normalizeSettings(shape.settings),
          badges,
          saveTick: 0,
        })
      })
      .catch((err) => {
        console.error('Pacer: could not open IndexedDB, running in memory', err)
        if (alive) setState((s) => ({ ...s, ready: true }))
      })
    return () => {
      alive = false
    }
  }, [])

  const bump = (s: StoreState): StoreState => ({ ...s, saveTick: s.saveTick + 1 })

  /** Completed runs credit their miles to the active shoe; undoing/changing a result adjusts it back. */
  const shoeAdjusted = (settings: Settings, date: string, sessionId: string, before: SessionResult | undefined, after: SessionResult | undefined): Settings | null => {
    const session = findSession(date, sessionId)
    if (!session || !isRunLike(session)) return null
    const delta = creditedMiles(session, after) - creditedMiles(session, before)
    if (delta === 0) return null
    const active = settings.shoes.find((sh) => sh.active && !sh.retired) ?? settings.shoes.find((sh) => sh.active)
    if (!active) return null
    return { ...settings, shoes: settings.shoes.map((sh) => (sh.id === active.id ? { ...sh, miles: Math.max(0, round1(sh.miles + delta)) } : sh)) }
  }

  const setResult = useCallback<StoreActions['setResult']>(async (r) => {
    const rec: SessionResult = { ...r, loggedAt: r.loggedAt ?? nowISO() }
    const key = resultKey(r.date, r.session_id)
    const prev = stateRef.current.results[key]
    const nextSettings = shoeAdjusted(stateRef.current.settings, r.date, r.session_id, prev, rec)
    setState((s) => bump({ ...s, results: { ...s.results, [key]: rec }, settings: nextSettings ?? s.settings }))
    await put('results', { ...rec, _k: key })
    if (nextSettings) await put('settings', nextSettings, 'settings')
  }, [])

  const clearResult = useCallback<StoreActions['clearResult']>(async (date, sessionId) => {
    const key = resultKey(date, sessionId)
    const prev = stateRef.current.results[key]
    const nextSettings = shoeAdjusted(stateRef.current.settings, date, sessionId, prev, undefined)
    setState((s) => {
      const next = { ...s.results }
      delete next[key]
      return bump({ ...s, results: next, settings: nextSettings ?? s.settings })
    })
    await del('results', key)
    if (nextSettings) await put('settings', nextSettings, 'settings')
  }, [])

  const setLiftLog = useCallback<StoreActions['setLiftLog']>(async (l) => {
    const rec: LiftLog = { ...l, loggedAt: l.loggedAt ?? nowISO() }
    const key = liftKey(l.date, l.session_id, l.exercise)
    setState((s) => bump({ ...s, liftLogs: { ...s.liftLogs, [key]: rec } }))
    await put('liftLogs', { ...rec, _k: key })
  }, [])

  const setHabit = useCallback<StoreActions['setHabit']>(async (date, hk, done) => {
    const rec: HabitLog = { date, key: hk, done }
    const key = habitKey(date, hk)
    setState((s) => bump({ ...s, habits: { ...s.habits, [key]: rec } }))
    await put('habits', { ...rec, _k: key })
  }, [])

  const addCustomLog = useCallback<StoreActions['addCustomLog']>(async (c) => {
    const rec: CustomLog = { ...c, id: uid(), loggedAt: nowISO() }
    setState((s) => bump({ ...s, customLogs: [rec, ...s.customLogs] }))
    await put('customLogs', rec)
  }, [])

  const deleteCustomLog = useCallback<StoreActions['deleteCustomLog']>(async (id) => {
    setState((s) => bump({ ...s, customLogs: s.customLogs.filter((c) => c.id !== id) }))
    await del('customLogs', id)
  }, [])

  const updateSettings = useCallback<StoreActions['updateSettings']>(async (patch) => {
    const prev = stateRef.current.settings
    const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
    setState((s) => bump({ ...s, settings: next }))
    await put('settings', next, 'settings')
  }, [])

  const unlockBadge = useCallback<StoreActions['unlockBadge']>(async (key, at) => {
    if (stateRef.current.badges[key]) return
    const rec: Badge = { key, unlockedAt: at ?? nowISO() }
    setState((s) => ({ ...s, badges: { ...s.badges, [key]: rec } }))
    await put('badges', rec)
  }, [])

  const exportBundle = useCallback<StoreActions['exportBundle']>(() => {
    const s = stateRef.current
    return {
      app: 'Pacer',
      version: 1,
      exportedAt: nowISO(),
      sessionResults: Object.values(s.results),
      liftLogs: Object.values(s.liftLogs),
      habitLogs: Object.values(s.habits),
      customLogs: s.customLogs,
      settings: s.settings,
      badges: Object.values(s.badges),
    }
  }, [])

  const importBundle = useCallback<StoreActions['importBundle']>(async (b) => {
    if (!b || b.app !== 'Pacer' || !Array.isArray(b.sessionResults)) throw new Error('Not a Pacer export')
    const results: Record<string, SessionResult> = {}
    for (const r of b.sessionResults) results[resultKey(r.date, r.session_id)] = r
    const liftLogs: Record<string, LiftLog> = {}
    for (const l of b.liftLogs ?? []) liftLogs[liftKey(l.date, l.session_id, l.exercise)] = l
    const habits: Record<string, HabitLog> = {}
    for (const h of b.habitLogs ?? []) habits[habitKey(h.date, h.key)] = h
    const badges: Record<string, Badge> = {}
    for (const bd of b.badges ?? []) badges[bd.key] = bd
    const settings = normalizeSettings(b.settings)
    const customLogs = [...(b.customLogs ?? [])].sort((a, c) => (a.loggedAt < c.loggedAt ? 1 : -1))
    await clearAll()
    await writeAll({
      results: Object.entries(results).map(([key, r]) => ({ ...r, _k: key })),
      liftLogs: Object.entries(liftLogs).map(([key, l]) => ({ ...l, _k: key })),
      habits: Object.entries(habits).map(([key, h]) => ({ ...h, _k: key })),
      customLogs,
      settings,
      badges: Object.values(badges),
    })
    setState((s) => bump({ ...s, results, liftLogs, habits, customLogs, settings, badges }))
  }, [])

  const resetAll = useCallback<StoreActions['resetAll']>(async () => {
    await clearAll()
    setState((s) => bump({ ...emptyState(), ready: true, saveTick: s.saveTick }))
  }, [])

  const actions = useMemo<StoreActions>(
    () => ({
      setResult, clearResult, setLiftLog, setHabit, addCustomLog, deleteCustomLog,
      updateSettings, unlockBadge, exportBundle, importBundle, resetAll,
    }),
    [setResult, clearResult, setLiftLog, setHabit, addCustomLog, deleteCustomLog, updateSettings, unlockBadge, exportBundle, importBundle, resetAll],
  )

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useStore(): StoreState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function useActions(): StoreActions {
  const a = useContext(ActionsCtx)
  if (!a) throw new Error('useActions outside StoreProvider')
  return a
}

export { resultKey, liftKey, habitKey }
