import React from 'react'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  gradient?: 'blue' | 'violet' | 'emerald' | 'amber' | 'mixed'
  online?: boolean
  className?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export function Avatar({ name, size = 'md', gradient = 'mixed', online, className = '', onClick }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-20 h-20 text-2xl',
  }

  const gradients = {
    blue: 'from-blue-400 to-blue-600',
    violet: 'from-violet-400 to-violet-600',
    emerald: 'from-emerald-400 to-emerald-600',
    amber: 'from-amber-400 to-amber-600',
    mixed: 'from-blue-500 to-violet-600',
  }

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
  const clickableClass = onClick ? 'cursor-pointer' : ''

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      ;(onClick as React.MouseEventHandler<HTMLDivElement>)(e as unknown as React.MouseEvent<HTMLDivElement>)
    }
  }

  return (
    <div
      className={`relative ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${gradients[gradient]} flex items-center justify-center text-white font-semibold shadow-md ${clickableClass}`}>
        {initials}
      </div>
      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
      )}
    </div>
  )
}
