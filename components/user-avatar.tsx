"use client"

import React, { useMemo } from "react"
import { Avatar } from "@heroui/react"

interface UserAvatarProps {
  name: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  onClick?: (event?: React.MouseEvent) => void
  showTooltip?: boolean
}

// Colores pastel suaves
const pastelColors = [
  "bg-rose-200 text-rose-800",        // Rosa suave
  "bg-pink-200 text-pink-800",       // Rosa claro
  "bg-fuchsia-200 text-fuchsia-800", // Fucsia suave
  "bg-purple-200 text-purple-800",   // Púrpura suave
  "bg-violet-200 text-violet-800",   // Violeta suave
  "bg-indigo-200 text-indigo-800",   // Índigo suave
  "bg-blue-200 text-blue-800",       // Azul suave
  "bg-sky-200 text-sky-800",         // Cielo suave
  "bg-cyan-200 text-cyan-800",       // Cian suave
  "bg-teal-200 text-teal-800",       // Verde azulado suave
  "bg-emerald-200 text-emerald-800", // Esmeralda suave
  "bg-green-200 text-green-800",     // Verde suave
  "bg-lime-200 text-lime-800",       // Lima suave
  "bg-yellow-200 text-yellow-800",   // Amarillo suave
  "bg-amber-200 text-amber-800",     // Ámbar suave
  "bg-orange-200 text-orange-800",   // Naranja suave
  "bg-red-200 text-red-800",         // Rojo suave
  "bg-slate-200 text-slate-800",     // Pizarra suave
  "bg-gray-200 text-gray-800",       // Gris suave
  "bg-zinc-200 text-zinc-800",       // Zinc suave
]

// Función para obtener las iniciales de un nombre
const getInitials = (name: string): string => {
  if (!name) return "??"
  
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    // Si solo hay una palabra, tomar las primeras dos letras
    return words[0].substring(0, 2).toUpperCase()
  } else {
    // Si hay múltiples palabras, tomar la primera letra de las primeras dos palabras
    return (words[0][0] + words[1][0]).toUpperCase()
  }
}

// Función para generar un color consistente basado en el nombre
const getColorFromName = (name: string): string => {
  if (!name) return pastelColors[0]
  
  // Crear un hash simple del nombre para obtener un índice consistente
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convertir a entero de 32 bits
  }
  
  // Usar el valor absoluto del hash para obtener un índice
  const index = Math.abs(hash) % pastelColors.length
  return pastelColors[index]
}

// Función para obtener el tamaño del avatar
const getAvatarSize = (size: string = "md"): string => {
  switch (size) {
    case "sm":
      return "w-8 h-8 text-xs"
    case "md":
      return "w-10 h-10 text-sm"
    case "lg":
      return "w-12 h-12 text-base"
    case "xl":
      return "w-16 h-16 text-lg"
    default:
      return "w-10 h-10 text-sm"
  }
}

export default function UserAvatar({ 
  name, 
  size = "md", 
  className = "", 
  onClick, 
  showTooltip = false 
}: UserAvatarProps) {
  const initials = useMemo(() => getInitials(name), [name])
  const colorClass = useMemo(() => getColorFromName(name), [name])
  const sizeClass = useMemo(() => getAvatarSize(size), [size])
  
  const avatarElement = (
    <div
      className={`
        ${sizeClass}
        ${colorClass}
        rounded-full
        flex
        items-center
        justify-center
        font-semibold
        shadow-sm
        transition-all
        duration-200
        ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {initials}
    </div>
  )

  // Si se requiere tooltip, envolver con el componente de HeroUI
  if (showTooltip) {
    return (
      <div className="relative group">
        {avatarElement}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-[9999]">
          {name}
        </div>
      </div>
    )
  }

  return avatarElement
}
