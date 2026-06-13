import type { ReactNode } from 'react'

export function ReviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#806246]">
        {title}
      </div>
      {children}
    </section>
  )
}
