import React from 'react'

interface CardProps {
  children: React.ReactNode
  hover?: boolean
  className?: string
  onClick?: () => void
}

export function Card({ children, hover = true, className = '', onClick }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${hover ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer' : ''} transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
