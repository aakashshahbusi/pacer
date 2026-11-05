import { content } from '../data/content'
import { Card, Muted, Screen, SectionTitle } from '../components/ui'
import { navigate, type Route } from '../lib/route'
import { formatMonthDayYear } from '../lib/dates'
import { Icon } from '../components/Icon'

const TABS = [
  { id: 'phases', label: 'Phases' },
  { id: 'rules', label: 'The 7 rules' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'sunday', label: 'Sunday' },
  { id: 'races', label: 'Races' },
  { id: 'gear', label: 'Gear' },
  { id: 'swimming', label: 'Swimming' },
] as const

type TabId = (typeof TABS)[number]['id']

function P({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <p className="text-[16px] leading-relaxed">
      {label && <span className="font-semibold">{label} </span>}
      {children}
    </p>
  )
}

function KeyLabel(k: string) {
  return k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function Phases() {
  return (
    <div className="space-y-3">
      {content.phases.map((ph) => (
        <Card key={ph.id}>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">Phase {ph.id} · {ph.dates}</div>
          <h3 className="text-[22px] font-bold leading-tight">{ph.name}</h3>
          <p className="text-muted italic mt-0.5">{ph.one_liner}</p>
          <P label="Done looks like.">{ph.what_done_looks_like}</P>
          {ph.rule && <P label="Rule.">{ph.rule}</P>}
          <div className="mt-3 rounded-xl bg-surface2/60 border border-border divide-y divide-border">
            {Object.entries(ph.template).map(([d, t]) => (
              <div key={d} className="flex gap-3 px-3 py-1.5 text-[16px]">
                <span className="w-10 font-semibold text-muted">{d}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          {ph.blocks && (
            <div className="mt-3 space-y-2">
              {ph.blocks.map((b) => (
                <div key={b.name} className="rounded-xl border border-border p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{b.name}</span>
                    <span className="text-[13px] text-muted">{b.dates}</span>
                  </div>
                  <div className="text-[13px] text-muted tabular mt-0.5">Mileage {b.mileage} · long run {b.long_run} · lifts {b.lifts}</div>
                  <p className="text-[16px] mt-1">{b.note}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function Rules() {
  return (
    <div className="space-y-3">
      {content.rules.map((r) => (
        <Card key={r.n}>
          <div className="flex items-baseline gap-3">
            <span className="tabular text-[28px] font-bold text-accent leading-none">{r.n}</span>
            <h3 className="text-[19px] font-bold">{r.name}</h3>
          </div>
          <p className="mt-2 text-[16px] leading-relaxed">{r.text}</p>
        </Card>
      ))}
    </div>
  )
}

function Nutrition() {
  const n = content.nutrition
  return (
    <div className="space-y-3">
      <Card><P label="Principle.">{n.principle}</P></Card>
      <Card><P label="The loop.">{n.the_loop}</P></Card>
      <Card>
        <h3 className="font-bold text-[18px]">Breakfast · {n.breakfast.where}</h3>
        <P>{n.breakfast.what}</P>
        <Muted className="mt-1">{n.breakfast.when}</Muted>
      </Card>
      <Card>
        <h3 className="font-bold text-[18px]">Lunch & dinner · {n.lunch_dinner.where}</h3>
        <P>{n.lunch_dinner.what}</P>
        <Muted className="mt-1">{n.lunch_dinner.note}</Muted>
      </Card>
      <Card>
        <h3 className="font-bold text-[18px]">Late night</h3>
        <P>{n.late_night.rule}</P>
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted mt-3 mb-1">Costco list</div>
        <ul className="list-disc pl-5 space-y-0.5 text-[16px]">
          {n.late_night.costco_list.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </Card>
      <Card>
        <h3 className="font-bold text-[18px]">Run fueling</h3>
        <div className="mt-2 space-y-2">
          {Object.entries(n.run_fueling).map(([k, v]) => (
            <P key={k} label={`${KeyLabel(k)}.`}>{v}</P>
          ))}
        </div>
      </Card>
      <Card><P label="Muscle.">{n.muscle_note}</P></Card>
    </div>
  )
}

function Sleep() {
  const s = content.sleep
  return (
    <div className="space-y-3">
      <Card>
        <h3 className="font-bold text-[18px]">Wake time</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {Object.entries(s.wake_time).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface2/60 border border-border px-3 py-2">
              <div className="text-[12px] text-muted font-semibold">{k}</div>
              <div className="tabular text-[24px] font-bold">{v}</div>
            </div>
          ))}
        </div>
        <P label="Bedtime.">{s.bedtime}</P>
      </Card>
      <Card>
        <h3 className="font-bold text-[18px]">Guardrails</h3>
        <ul className="mt-2 space-y-2">
          {s.guardrails.map((g) => (
            <li key={g} className="flex gap-2 text-[16px] leading-relaxed"><span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{g}</li>
          ))}
        </ul>
      </Card>
      <Card><P label="The reset.">{s.reset}</P></Card>
      <Card><P label="Morning sequence.">{s.morning_sequence}</P></Card>
      <Card><P label="Data.">{s.data}</P></Card>
    </div>
  )
}

function Sunday() {
  const c = content.sunday_check_in
  return (
    <div className="space-y-3">
      <Card>
        <P label="When.">{c.when}</P>
        <P label="How.">{c.how}</P>
      </Card>
      <Card>
        <h3 className="font-bold text-[18px]">Claude pulls from Strava</h3>
        <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[16px]">{c.claude_pulls_from_strava.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>
      <Card>
        <h3 className="font-bold text-[18px]">You report</h3>
        <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[16px]">{c.you_report.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>
      <Card><P label="You get.">{c.you_get}</P></Card>
      <Card><P label="Monthly.">{c.monthly}</P></Card>
      <Card>
        <P label="Pacer export.">{c.pacer_export}</P>
        <div className="mt-2 flex gap-2">
          <button onClick={() => navigate('week')} className="rounded-xl bg-surface2 border border-border px-3 py-2 text-[14px] font-semibold">Open Budget vs. Actual</button>
          <button onClick={() => navigate('more', 'log')} className="rounded-xl bg-surface2 border border-border px-3 py-2 text-[14px] font-semibold">Sunday export</button>
        </div>
      </Card>
    </div>
  )
}

function Races() {
  return (
    <div className="space-y-3">
      {content.races.map((r) => (
        <Card key={r.date} role="button" onClick={() => navigate('today', r.date)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted tabular">{formatMonthDayYear(r.date)}{r.start ? ` · ${r.start}` : ''}</div>
              <h3 className="font-bold text-[18px] leading-tight">{r.name}</h3>
            </div>
            <div className="tabular text-[22px] font-bold shrink-0">{r.distance_mi}<span className="text-[12px] text-muted font-semibold"> mi</span></div>
          </div>
          <P label="Where.">{r.where}</P>
          <P label="Role.">{r.role}</P>
          {r.course && <P label="Course.">{r.course}</P>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${/register/i.test(r.status) ? 'bg-accent/15 text-accent' : 'bg-surface2 text-muted'}`}>{r.status}</span>
            {r.url && (
              <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-text underline-offset-2 underline">
                site <Icon name="external" size={12} />
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function Gear() {
  return (
    <Card className="divide-y divide-border">
      {content.gear.map((g) => (
        <div key={g.item} className="py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold text-[16px]">{g.item}</span>
            <span className="text-[13px] text-muted text-right">{g.when}</span>
          </div>
          <p className="text-[16px] text-muted mt-0.5">{g.note}</p>
        </div>
      ))}
    </Card>
  )
}

function Swimming() {
  const s = content.swimming
  return (
    <div className="space-y-3">
      <Card><P label="Starts.">{s.starts}</P></Card>
      <Card><P label="First session.">{s.first_session}</P></Card>
      <Card><P label="Fast path.">{s.fast_path}</P></Card>
      <Card><P label="Why.">{s.why}</P></Card>
    </div>
  )
}

export default function Guide({ route }: { route: Route }) {
  const sub = route.sub?.split('/')[1] as TabId | undefined
  const tab: TabId = TABS.some((t) => t.id === sub) ? (sub as TabId) : 'phases'
  const body =
    tab === 'phases' ? <Phases /> :
    tab === 'rules' ? <Rules /> :
    tab === 'nutrition' ? <Nutrition /> :
    tab === 'sleep' ? <Sleep /> :
    tab === 'sunday' ? <Sunday /> :
    tab === 'races' ? <Races /> :
    tab === 'gear' ? <Gear /> : <Swimming />

  return (
    <Screen title="Guide" back={() => navigate('more')} backLabel="More">
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-3">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => navigate('more', `guide/${t.id}`)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold ${tab === t.id ? 'bg-text text-bg border-text' : 'bg-surface2 text-muted border-border'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <SectionTitle>{TABS.find((t) => t.id === tab)?.label}</SectionTitle>
      {body}
    </Screen>
  )
}
