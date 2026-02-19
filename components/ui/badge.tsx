import React from 'react'

interface BadgeProps {
  status: 'active' | 'intervened' | 'closed' | 'pending'
  children: React.ReactNode
  showDot?: boolean
}

export function Badge({ status, children, showDot = true }: BadgeProps) {
  const styles = {
    active: {
      bg: 'bg-emerald-100 dark:bg-emerald-900',
      text: 'text-emerald-700 dark:text-emerald-200',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500 dark:bg-emerald-400'
    },
    intervened: {
      bg: 'bg-amber-100 dark:bg-amber-900',
      text: 'text-amber-700 dark:text-amber-200',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500 dark:bg-amber-400'
    },
    closed: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-500 dark:bg-slate-400'
    },
    pending: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-700 dark:text-blue-200',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500 dark:bg-blue-400'
    },
  }

  const style = styles[status]

  return (
    <span className={`px-2 py-1 ${style.bg} ${style.text} ${style.border} text-xs font-semibold rounded-lg border inline-flex items-center gap-1.5`}>
      {showDot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`}></span>}
      {children}
    </span>
  )
}
