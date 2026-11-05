import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

interface ToastMsg {
  id: number
  title: string
  body?: string
}

const Ctx = createContext<(title: string, body?: string) => void>(() => {})

export function useToast() {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const idRef = useRef(0)
  const show = useCallback((title: string, body?: string) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, title, body }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed left-0 right-0 z-50 flex flex-col items-center gap-2 px-4" style={{ top: 'calc(12px + env(safe-area-inset-top))' }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto w-full max-w-[420px] rounded-[16px] border border-accent/50 bg-surface px-4 py-3 shadow-none" role="status">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">Badge unlocked</div>
            <div className="text-[17px] font-bold leading-tight">{t.title}</div>
            {t.body && <div className="text-[14px] text-muted mt-0.5">{t.body}</div>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
