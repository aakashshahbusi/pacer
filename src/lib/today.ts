import { useEffect, useState } from 'react'
import { todayISO } from './dates'

/** The current local date, re-evaluated every 30 s so it rolls over at midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO())
  useEffect(() => {
    const tick = () => {
      const t = todayISO()
      setToday((prev) => (prev === t ? prev : t))
    }
    const id = window.setInterval(tick, 30_000)
    const onVis = () => tick()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [])
  return today
}
