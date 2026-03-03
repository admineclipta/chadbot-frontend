"use client"

interface ConversationListSkeletonProps {
  items?: number
}

export default function ConversationListSkeleton({
  items = 8,
}: ConversationListSkeletonProps) {
  return (
    <div className="space-y-0" aria-hidden="true">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="border-b border-slate-100 dark:border-slate-800 p-4"
        >
          <div className="flex items-start gap-3 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700/70" />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700/70" />
                <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700/70" />
              </div>

              <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700/70" />

              <div className="flex items-center gap-2">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700/70" />
                <div className="h-5 w-14 rounded-md bg-slate-200 dark:bg-slate-700/70" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
