"use client"

import type React from "react"

import { HeroUIProvider, ToastProvider } from "@heroui/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { CSRConfig } from "@/components/shared/csr-config"
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
        <ToastProvider placement="bottom-right" />
        <Toaster />
      </NextThemesProvider>
    </HeroUIProvider>
  )
}
