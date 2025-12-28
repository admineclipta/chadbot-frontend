"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter()

  useEffect(() => {
    // Configuraciones adicionales para CSR
    const handleRouteChange = () => {
      // Aquí puedes agregar lógica de tracking o analytics para CSR
      console.log("Route changed (CSR)")
    }

    // En CSR, podemos manejar la navegación directamente
    handleRouteChange()
  }, [router])

  return <>{children}</>
}
