import { openDB, type IDBPDatabase } from 'idb'
import type { Badge, CustomLog, HabitLog, LiftLog, SessionResult, Settings } from '../types'

export const DB_NAME = 'pacer'
export const DB_VERSION = 1

export type Keyed<T> = T & { _k: string }

export const resultKey = (date: string, sessionId: string) => `${date}|${sessionId}`
export const liftKey = (date: string, sessionId: string, exercise: string) => `${date}|${sessionId}|${exercise}`
export const habitKey = (date: string, habit: string) => `${date}|${habit}`

export interface DBShape {
  results: Keyed<SessionResult>[]
  liftLogs: Keyed<LiftLog>[]
  habits: Keyed<HabitLog>[]
  customLogs: CustomLog[]
  settings: Settings | undefined
  badges: Badge[]
}

let dbPromise: Promise<IDBPDatabase> | null = null

export function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('results')) d.createObjectStore('results', { keyPath: '_k' })
        if (!d.objectStoreNames.contains('liftLogs')) d.createObjectStore('liftLogs', { keyPath: '_k' })
        if (!d.objectStoreNames.contains('habits')) d.createObjectStore('habits', { keyPath: '_k' })
        if (!d.objectStoreNames.contains('customLogs')) d.createObjectStore('customLogs', { keyPath: 'id' })
        if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings')
        if (!d.objectStoreNames.contains('badges')) d.createObjectStore('badges', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function loadAll(): Promise<DBShape> {
  const d = await db()
  const [results, liftLogs, habits, customLogs, settings, badges] = await Promise.all([
    d.getAll('results'),
    d.getAll('liftLogs'),
    d.getAll('habits'),
    d.getAll('customLogs'),
    d.get('settings', 'settings'),
    d.getAll('badges'),
  ])
  return { results, liftLogs, habits, customLogs, settings, badges }
}

export async function put(store: string, value: unknown, key?: string) {
  const d = await db()
  await d.put(store, value, key)
}

export async function del(store: string, key: string) {
  const d = await db()
  await d.delete(store, key)
}

export async function clearAll() {
  const d = await db()
  const tx = d.transaction(['results', 'liftLogs', 'habits', 'customLogs', 'settings', 'badges'], 'readwrite')
  await Promise.all([
    tx.objectStore('results').clear(),
    tx.objectStore('liftLogs').clear(),
    tx.objectStore('habits').clear(),
    tx.objectStore('customLogs').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('badges').clear(),
    tx.done,
  ])
}

export async function writeAll(shape: DBShape) {
  const d = await db()
  const tx = d.transaction(['results', 'liftLogs', 'habits', 'customLogs', 'settings', 'badges'], 'readwrite')
  const ops: Promise<unknown>[] = []
  for (const r of shape.results) ops.push(tx.objectStore('results').put(r))
  for (const l of shape.liftLogs) ops.push(tx.objectStore('liftLogs').put(l))
  for (const h of shape.habits) ops.push(tx.objectStore('habits').put(h))
  for (const c of shape.customLogs) ops.push(tx.objectStore('customLogs').put(c))
  if (shape.settings) ops.push(tx.objectStore('settings').put(shape.settings, 'settings'))
  for (const b of shape.badges) ops.push(tx.objectStore('badges').put(b))
  ops.push(tx.done)
  await Promise.all(ops)
}
