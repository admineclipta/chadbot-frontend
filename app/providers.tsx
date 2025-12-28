"use client"

import type React from "react"

import { HeroUIProvider } from "@heroui/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { CSRConfig } from "@/components/csr-config"
import { Toaster } from "sonner"

export interface ProvidersProps {
  children: React.ReactNode
  themeProps?: ThemeProviderProps
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <HeroUIProvider>
      <NextThemesProvider {...themeProps} attribute="class" defaultTheme="light">
        <CSRConfig />
        {children}
        <Toaster />
      </NextThemesProvider>
    </HeroUIProvider>
  )
}
