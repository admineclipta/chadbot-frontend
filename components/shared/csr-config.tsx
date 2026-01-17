"use client"

import { useEffect } from "react"

export function CSRConfig() {
  useEffect(() => {
    // Configuración específica para Client-Side Rendering
    
    // 1. Deshabilitamos la precarga de rutas (no necesaria en CSR)
    if (typeof window !== "undefined") {
      const links = document.querySelectorAll('link[rel="prefetch"]')
      links.forEach(link => link.remove())
    }

    // 2. Configuramos el tema inicial desde localStorage
    const initializeTheme = () => {
      try {
        const savedTheme = localStorage.getItem("theme") || "light"
        document.documentElement.setAttribute("data-theme", savedTheme)
        document.documentElement.classList.remove("light", "dark")
        document.documentElement.classList.add(savedTheme)
      } catch (error) {
        console.warn("Error initializing theme:", error)
        document.documentElement.classList.add("light")
      }
    }

    initializeTheme()

    // 3. Configuramos el manejo de errores para CSR
    const handleError = (error: ErrorEvent) => {
      console.error("CSR Error:", error.error)
      // Aquí puedes agregar tu lógica de manejo de errores
    }

    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
