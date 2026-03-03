"use client"

interface FilterControlsSkeletonProps {
  rows?: number
}

export default function FilterControlsSkeleton({
  rows = 1,
}: FilterControlsSkeletonProps) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-2">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700/70" />
          <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700/70" />
        </div>
      ))}
    </div>
  )
}
