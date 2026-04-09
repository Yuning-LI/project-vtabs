'use client'

import Link from 'next/link'
import type { LearnGuideCard } from '@/lib/learn/content'

type LearnGuideCardGridProps = {
  guides: LearnGuideCard[]
}

export default function LearnGuideCardGrid({ guides }: LearnGuideCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {guides.map(guide => (
        <Link
          key={guide.slug}
          href={`/learn/${guide.slug}`}
          className="page-warm-card-link flex h-full flex-col p-5"
        >
          <div className="page-warm-pill-muted w-fit px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]">
            {guide.kind === 'hub' ? 'Hub Page' : 'Learning Guide'}
          </div>
          <h3 className="mt-4 text-xl font-bold leading-tight text-stone-900">{guide.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-700">{guide.description}</p>
          <div className="mt-5 text-sm font-semibold text-stone-900">Open guide →</div>
        </Link>
      ))}
    </div>
  )
}
