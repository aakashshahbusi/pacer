import { Card, Screen } from '../components/ui'
import { Icon } from '../components/Icon'
import { navigate, type Route } from '../lib/route'
import SettingsScreen from './Settings'
import { labels, content } from '../data/content'

function Placeholder({ title }: { title: string }) {
  return (
    <Screen title={title} back={() => navigate('more')}>
      <p className="text-muted">Coming up in the build order.</p>
    </Screen>
  )
}

export default function More({ route }: { route: Route }) {
  const page = route.sub?.split('/')[0] ?? null
  if (page === 'settings') return <SettingsScreen />
  if (page === 'log') return <Placeholder title="Log" />
  if (page === 'guide') return <Placeholder title="Guide" />

  const items: { id: string; title: string; sub: string }[] = [
    { id: 'log', title: 'Log', sub: content.habits.custom_log.description },
    { id: 'guide', title: 'Guide', sub: 'Nutrition, sleep, the 7 rules, Sunday check-in, gear, swimming, races' },
    { id: 'settings', title: `Settings — ${labels.settings_pace_section}`, sub: '5K time, wake times, shoes, theme, backup' },
  ]
  return (
    <Screen title="More" subtitle={content.app.tagline}>
      <div className="space-y-3">
        {items.map((it) => (
          <Card key={it.id} className="flex items-center justify-between gap-3 active:bg-surface2" onClick={() => navigate('more', it.id)} role="button">
            <div>
              <div className="font-bold text-[17px]">{it.title}</div>
              <div className="text-[13px] text-muted">{it.sub}</div>
            </div>
            <Icon name="chevron-right" className="text-muted shrink-0" />
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-[13px] text-muted">{labels.long_term}</p>
    </Screen>
  )
}
