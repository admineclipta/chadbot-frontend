import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  icon?: React.ReactNode
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  icon,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-600',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
