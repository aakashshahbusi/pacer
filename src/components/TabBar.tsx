import { Icon, type IconName } from './Icon'
import { navigate, type Tab } from '../lib/route'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'week', label: 'Week', icon: 'week' },
  { id: 'plan', label: 'Plan', icon: 'plan' },
  { id: 'lifts', label: 'Lifts', icon: 'lifts' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'more', label: 'More', icon: 'more' },
]

export function TabBar({ active }: { active: Tab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-bg/90 backdrop-blur border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main"
    >
      <ul className="mx-auto max-w-[560px] grid grid-cols-6">
        {TABS.map((t) => {
          const on = t.id === active
          return (
            <li key={t.id}>
              <button
                onClick={() => navigate(t.id)}
                className={`w-full flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${on ? 'text-text' : 'text-muted'}`}
                aria-current={on ? 'page' : undefined}
              >
                <Icon name={t.icon} size={22} className={on ? 'text-accent' : ''} />
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
