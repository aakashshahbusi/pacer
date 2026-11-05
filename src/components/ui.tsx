import React from 'react'
import { Icon } from './Icon'

type DivProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className = '', children, ...rest }: DivProps) {
  return (
    <div
      className={`rounded-[16px] bg-surface border border-border p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger'

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-[16px] leading-none select-none transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none'
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-accent text-white active:bg-[#a90d27]',
    secondary: 'bg-surface2 text-text border border-border active:bg-[color-mix(in_srgb,var(--surface2),var(--text)_8%)]',
    ghost: 'bg-transparent text-muted active:text-text',
    success: 'bg-success text-black',
    danger: 'bg-transparent text-accent border border-accent/40',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Chip({
  active = false,
  tone = 'neutral',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tone?: 'neutral' | 'accent' | 'success' }) {
  const tones = {
    neutral: active ? 'bg-text text-bg border-text' : 'bg-surface2 text-muted border-border',
    accent: active ? 'bg-accent text-white border-accent' : 'bg-surface2 text-muted border-border',
    success: active ? 'bg-success/15 text-success border-success/40' : 'bg-surface2 text-muted border-border',
  }
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] font-medium leading-none transition-colors ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'accent' | 'success' }) {
  const t = {
    muted: 'bg-surface2 text-muted',
    accent: 'bg-accent/15 text-accent',
    success: 'bg-success/15 text-success',
  }[tone]
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide ${t}`}>{children}</span>
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-2 mt-6 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {right}
    </div>
  )
}

export function Muted({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-muted text-[15px] ${className}`}>{children}</p>
}

export function Screen({ title, subtitle, children, right, back, backLabel = 'Back' }: { title: string; subtitle?: string; right?: React.ReactNode; back?: () => void; backLabel?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pb-6 fade-in">
      {back && (
        <button onClick={back} className="mt-3 -ml-1 flex items-center gap-1 text-[15px] font-semibold text-muted">
          <Icon name="back" size={18} /> {backLabel}
        </button>
      )}
      <header className="pt-3 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted text-[15px] mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </div>
  )
}

/** Simple bottom sheet / modal. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-[560px] rounded-t-[20px] bg-surface border-t border-border p-4 fade-in max-h-[88vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        {title && <h3 className="text-[18px] font-bold mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-[13px] font-semibold text-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-muted mt-1">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl bg-surface2 border border-border px-3 py-3 text-[16px] outline-none focus:border-muted placeholder:text-muted/60'

export function ProgressBar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'success' | 'muted' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const color = { accent: 'bg-accent', success: 'bg-success', muted: 'bg-muted' }[tone]
  return (
    <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
    </div>
  )
}
