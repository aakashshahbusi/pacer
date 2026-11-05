import { useEffect } from 'react'
import { useRoute } from './lib/route'
import { TabBar } from './components/TabBar'
import { useStore } from './store/store'
import Today from './screens/Today'
import More from './screens/More'
import Lifts from './screens/Lifts'
import Week from './screens/Week'
import PlanScreen from './screens/Plan'
import Stats from './screens/Stats'
import { ToastProvider } from './components/Toast'
import { BadgeWatcher } from './components/BadgeWatcher'

export default function App() {
  const route = useRoute()
  const { settings, ready } = useStore()

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#F4F4F6' : '#0B0B0D')
  }, [settings.theme])

  let body: JSX.Element
  switch (route.tab) {
    case 'today': body = <Today route={route} />; break
    case 'week': body = <Week />; break
    case 'plan': body = <PlanScreen />; break
    case 'lifts': body = <Lifts route={route} />; break
    case 'stats': body = <Stats />; break
    default: body = <More route={route} />
  }

  return (
    <ToastProvider>
      <BadgeWatcher />
      <div className="min-h-full mx-auto max-w-[560px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <main className="pb-[calc(76px+env(safe-area-inset-bottom))]">
          {ready ? body : <div className="p-6 text-muted">Loading…</div>}
        </main>
        <TabBar active={route.tab} />
      </div>
    </ToastProvider>
  )
}
