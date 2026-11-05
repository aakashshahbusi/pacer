import { useEffect } from 'react'
import { useActions, useStore } from '../store/store'
import { useToday } from '../lib/today'
import { badgeDefs, satisfiedBadges } from '../lib/badges'
import { useToast } from './Toast'

/** Evaluates badge unlock rules after every save and shows the app's only toast. */
export function BadgeWatcher() {
  const { ready, saveTick, results, liftLogs, habits, settings, badges } = useStore()
  const { unlockBadge } = useActions()
  const today = useToday()
  const toast = useToast()

  useEffect(() => {
    if (!ready) return
    const satisfied = satisfiedBadges({ today, results, liftLogs, habits, settings })
    for (const key of satisfied) {
      if (badges[key]) continue
      const def = badgeDefs.find((b) => b.key === key)
      void unlockBadge(key)
      if (def) toast(def.name, def.desc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, saveTick, today])

  return null
}
