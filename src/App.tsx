import { useEffect } from 'react'
import { useRoute } from './lib/route'
import { TabBar } from './components/TabBar'
import { useStore } from './store/store'
import { Screen, Muted } from './components/ui'
import Today from './screens/Today'

function Placeholder({ title }: { title: string }) {
  return (
    <Screen title={title}>
      <Muted>Coming up in the build order.</Muted>
    </Screen>
  )
}

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
    case 'week': body = <Placeholder title="Budget vs. Actual" />; break
    case 'plan': body = <Placeholder title="Plan" />; break
    case 'lifts': body = <Placeholder title="Lifts" />; break
    case 'stats': body = <Placeholder title="Soft hands. Hard data." />; break
    default: body = <Placeholder title="More" />
  }

  return (
    <div className="min-h-full mx-auto max-w-[560px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <main className="pb-[calc(76px+env(safe-area-inset-bottom))]">
        {ready ? body : <div className="p-6 text-muted">Loading…</div>}
      </main>
      <TabBar active={route.tab} />
    </div>
  )
}
