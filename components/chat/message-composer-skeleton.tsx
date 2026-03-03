"use client"

export default function MessageComposerSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex-shrink-0" aria-hidden="true">
      <div className="w-full border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 px-4 py-2">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-7 w-24 rounded-md bg-slate-200 dark:bg-slate-700/70" />
          <div className="h-7 w-28 rounded-md bg-slate-200 dark:bg-slate-700/70" />
        </div>
      </div>

      <div className="p-4 animate-pulse space-y-3">
        <div className="h-20 w-full rounded-xl bg-slate-200 dark:bg-slate-700/70" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-700/70" />
            <div className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-700/70" />
          </div>
          <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700/70" />
        </div>
      </div>
    </div>
  )
}
