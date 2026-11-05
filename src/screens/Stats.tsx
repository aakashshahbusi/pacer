import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { content, labels } from '../data/content'
import { plan } from '../data/plan'
import { Card, Screen, SectionTitle } from '../components/ui'
import { useStore } from '../store/store'
import { useToday } from '../lib/today'
import { computeStreak } from '../lib/streak'
import { longRunProgression, milesByWeek, runningPRs, runsCompleted, totalMiles } from '../lib/stats'
import { liftPRs } from '../lib/lifts'
import { fmtClock, formatMonthDay, formatMonthDayYear, toISO } from '../lib/dates'
import { badgeDefs } from '../lib/badges'
import { ShoesManager } from '../components/ShoesManager'
import { ownWords } from '../lib/eggs'

function MilesByWeekChart({ data, currentIndex }: { data: ReturnType<typeof milesByWeek>; currentIndex: number }) {
  const W = 343
  const H = 150
  const padB = 18
  const max = Math.max(...data.map((d) => Math.max(d.planned, d.actual)), 1)
  const n = data.length
  const slot = W / n
  const bw = Math.max(2, slot - 1.5)
  const y = (v: number) => (H - padB) - (v / max) * (H - padB - 6)
  // month ticks
  const ticks: { x: number; label: string }[] = []
  let lastMonth = ''
  data.forEach((d, i) => {
    const m = d.start.slice(0, 7)
    if (m !== lastMonth) {
      lastMonth = m
      ticks.push({ x: i * slot, label: formatMonthDay(d.start).split(' ')[0] })
    }
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Miles by week">
      {[0.5, 1].map((f) => (
        <line key={f} x1={0} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeWidth={1} />
      ))}
      {data.map((d, i) => (
        <g key={d.index}>
          <rect x={i * slot} y={y(d.planned)} width={bw} height={(H - padB) - y(d.planned)} fill="none" stroke="var(--muted)" strokeOpacity={0.45} strokeWidth={1} rx={1} />
          {d.actual > 0 && (
            <rect x={i * slot} y={y(d.actual)} width={bw} height={(H - padB) - y(d.actual)} fill={d.actual >= d.planned ? 'var(--success)' : 'var(--accent)'} rx={1} />
          )}
          {d.index === currentIndex && <rect x={i * slot - 0.75} y={0} width={bw + 1.5} height={H - padB} fill="var(--text)" fillOpacity={0.06} rx={1} />}
        </g>
      ))}
      {ticks.filter((_, i) => i % 2 === 0).map((t) => (
        <text key={t.x} x={t.x} y={H - 4} fill="var(--muted)" fontSize={9} fontFamily="inherit">{t.label}</text>
      ))}
      <text x={W - 2} y={y(max) + 9} fill="var(--muted)" fontSize={9} textAnchor="end">{Math.round(max)} mi</text>
    </svg>
  )
}

export default function Stats() {
  const today = useToday()
  const { results, habits, liftLogs, settings, badges } = useStore()
  const streak = useMemo(() => computeStreak(today, results, habits), [today, results, habits])
  const miles = useMemo(() => totalMiles(results), [results])
  const byWeek = useMemo(() => milesByWeek(results), [results])
  const longRuns = useMemo(() => longRunProgression(results), [results])
  const prs = useMemo(() => runningPRs(results, settings), [results, settings])
  const lifts = useMemo(() => liftPRs(liftLogs), [liftLogs])
  const runs = useMemo(() => runsCompleted(results), [results])
  const shoeWords = ownWords('shoe tracker')
  const currentWeek = plan.days.find((d) => d.date === today)?.week_index ?? -1
  const plannedSoFar = byWeek.filter((w) => w.start <= today).reduce((a, w) => a + w.planned, 0)

  const lrData = longRuns.map((p) => ({ w: p.index, d: formatMonthDay(p.start), planned: p.planned || null, actual: p.actual }))

  return (
    <Screen title={labels.stats_page} subtitle={`${content.athlete.name} · since ${formatMonthDayYear(plan.start)}`}>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Streak</div>
          <div className="tabular text-[40px] font-bold leading-none mt-1">{streak.current}</div>
          <div className="text-[13px] text-muted mt-1">days · longest {streak.longest}</div>
        </Card>
        <Card>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Total miles</div>
          <div className="tabular text-[40px] font-bold leading-none mt-1">{miles}</div>
          <div className="text-[13px] text-muted mt-1 tabular">{runs} runs · {Math.round(plannedSoFar)} planned to date</div>
        </Card>
      </div>

      <SectionTitle>Miles by week</SectionTitle>
      <Card>
        <MilesByWeekChart data={byWeek} currentIndex={currentWeek} />
        <div className="mt-1 flex gap-4 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 border border-muted/60" /> planned</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 bg-success" /> actual (met)</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 bg-accent" /> actual (under)</span>
        </div>
      </Card>

      <SectionTitle>Long-run progression</SectionTitle>
      <Card>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lrData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} labelFormatter={(l, p) => `Week ${(p?.[0]?.payload as { w: number })?.w ?? ''} · ${l}`} />
              <Line type="monotone" dataKey="planned" stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls name="planned" />
              <Line type="monotone" dataKey="actual" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 2.5, fill: 'var(--accent)', strokeWidth: 0 }} isAnimationActive={false} connectNulls name="done" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Running PRs</SectionTitle>
      <Card className="divide-y divide-border">
        {prs.map((p) => (
          <div key={p.distance_mi} className="flex items-center justify-between py-2.5 gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{p.label}</div>
              <div className="text-[12px] text-muted truncate">{formatMonthDayYear(p.date)} · {p.source}{p.note ? ` · ${p.note}` : ''}</div>
            </div>
            <div className="tabular text-[20px] font-bold shrink-0">{fmtClock(p.seconds, p.distance_mi >= 10)}</div>
          </div>
        ))}
      </Card>

      <SectionTitle>Lift PRs</SectionTitle>
      <Card className="divide-y divide-border">
        {lifts.map((l) => (
          <div key={l.label} className="flex items-center justify-between py-2.5">
            <span className="font-semibold">{l.label}</span>
            {l.best ? (
              <span className="text-right tabular">
                <span className="font-bold text-[18px]">{l.best.weight} × {l.best.reps || '—'}</span>
                <span className="block text-[12px] text-muted">est. 1RM {Math.round(l.best.e1rm)}</span>
              </span>
            ) : (
              <span className="text-muted text-[14px]">not yet</span>
            )}
          </div>
        ))}
      </Card>

      <SectionTitle right={<span className="text-[13px] text-muted tabular">{Object.keys(badges).length}/{badgeDefs.length}</span>}>Badges</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {badgeDefs.map((b) => {
          const u = badges[b.key]
          return (
            <Card key={b.key} className={`${u ? 'border-accent/50' : 'opacity-55'}`}>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${u ? 'bg-accent text-white' : 'bg-surface2 text-muted'}`}>
                  {b.name.slice(0, 1)}
                </span>
                <span className="font-bold leading-tight">{b.name}</span>
              </div>
              <p className="mt-2 text-[13px] leading-snug">{u ? b.desc : b.unlock}</p>
              {u && <p className="mt-1 text-[11px] text-muted tabular">{formatMonthDayYear(toISO(new Date(u.unlockedAt)))}</p>}
            </Card>
          )
        })}
      </div>

      <SectionTitle>{labels.shoe_tracker}</SectionTitle>
      {shoeWords && <p className="mb-2 text-[14px] text-muted italic">{shoeWords.text} <span className="not-italic">— {shoeWords.source}</span></p>}
      <ShoesManager />
    </Screen>
  )
}
