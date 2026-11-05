import { useEffect, useState } from 'react'

export type Tab = 'today' | 'week' | 'plan' | 'lifts' | 'stats' | 'more'
export type MorePage = 'log' | 'guide' | 'settings' | null

export interface Route {
  tab: Tab
  sub: string | null // e.g. more/log, more/settings, lifts/<program>
}

const TABS: Tab[] = ['today', 'week', 'plan', 'lifts', 'stats', 'more']

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '')
  const [tab, ...rest] = clean.split('/')
  const t = (TABS as string[]).includes(tab) ? (tab as Tab) : 'today'
  return { tab: t, sub: rest.length ? rest.join('/') : null }
}

export function toHash(tab: Tab, sub?: string | null): string {
  return `#/${tab}${sub ? `/${sub}` : ''}`
}

export function navigate(tab: Tab, sub?: string | null) {
  const h = toHash(tab, sub)
  if (window.location.hash !== h) window.location.hash = h
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}
