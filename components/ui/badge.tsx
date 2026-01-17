import React from 'react'

interface BadgeProps {
  status: 'active' | 'intervened' | 'closed' | 'pending'
  children: React.ReactNode
  showDot?: boolean
}

export function Badge({ status, children, showDot = true }: BadgeProps) {
  const styles = {
    active: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500'
    },
    intervened: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500'
    },
    closed: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-500'
    },
    pending: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500'
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
