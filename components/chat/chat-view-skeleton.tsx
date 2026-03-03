"use client"

import { ArrowLeft } from "lucide-react"
import MessageComposerSkeleton from "./message-composer-skeleton"

interface ChatViewSkeletonProps {
  showBackButton?: boolean
  messageRows?: number
}

export function OlderMessagesSkeleton() {
  return (
    <div className="space-y-3 py-2" aria-hidden="true">
      <div className="flex justify-start">
        <div className="h-14 w-64 rounded-2xl rounded-tl-sm bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="h-16 w-56 rounded-2xl rounded-tr-sm bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
      </div>
    </div>
  )
}

export default function ChatViewSkeleton({
  showBackButton = false,
  messageRows = 6,
}: ChatViewSkeletonProps) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 h-full max-h-full overflow-hidden w-full">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 md:py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBackButton && (
              <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700/70 lg:hidden flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
            )}
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700/70" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700/70" />
              <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-700/70" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700/70" />
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700/70" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0" aria-hidden="true">
        {Array.from({ length: messageRows }).map((_, index) => {
          const isOutgoing = index % 2 === 1
          return (
            <div
              key={index}
              className={`flex items-end gap-2 ${isOutgoing ? "justify-end" : "justify-start"}`}
            >
              {!isOutgoing && (
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
              )}
              <div className={`w-full md:max-w-[70%] ${isOutgoing ? "items-end" : "items-start"} flex flex-col gap-2`}>
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
                <div
                  className={`h-14 rounded-2xl ${isOutgoing ? "w-56 rounded-tr-sm" : "w-64 rounded-tl-sm"} bg-slate-200 dark:bg-slate-700/70 animate-pulse`}
                />
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
              </div>
              {isOutgoing && (
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
              )}
            </div>
          )
        })}
      </div>

      <MessageComposerSkeleton />
    </div>
  )
}
