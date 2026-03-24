"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type InstallOutcome = "accepted" | "dismissed" | "unavailable"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
}

const INSTALL_BANNER_DISMISSED_KEY = "chadbot_pwa_install_banner_dismissed"

function getIsInstalled(): boolean {
  if (typeof window === "undefined") return false

  const isStandaloneDisplayMode =
    window.matchMedia?.("(display-mode: standalone)")?.matches ?? false
  const isStandaloneNavigator = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  )

  return isStandaloneDisplayMode || isStandaloneNavigator
}

function getIsIosSafariBrowser(): boolean {
  if (typeof window === "undefined") return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIOSDevice =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)

  const isWebkitSafari =
    /safari/.test(userAgent) &&
    !/crios|fxios|edgios|chrome|android/.test(userAgent)

  return isIOSDevice && isWebkitSafari
}

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  const isIosSafari = useMemo(() => getIsIosSafariBrowser(), [])

  const refreshInstallationState = useCallback(() => {
    setIsInstalled(getIsInstalled())
  }, [])

  const dismissBanner = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "true")
    setDismissed(true)
  }, [])

  const resetBannerDismiss = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(INSTALL_BANNER_DISMISSED_KEY)
    setDismissed(false)
  }, [])

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable"

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return choice.outcome
    } catch {
      setDeferredPrompt(null)
      return "unavailable"
    }
  }, [deferredPrompt])

  useEffect(() => {
    if (typeof window === "undefined") return

    setDismissed(localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === "true")
    refreshInstallationState()

    const mediaQuery = window.matchMedia("(display-mode: standalone)")

    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent
      installEvent.preventDefault()
      setDeferredPrompt(installEvent)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    const onDisplayModeChange = () => {
      refreshInstallationState()
    }

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener,
    )
    window.addEventListener("appinstalled", onAppInstalled)
    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", onDisplayModeChange)
    } else if ("addListener" in mediaQuery) {
      mediaQuery.addListener(onDisplayModeChange)
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener,
      )
      window.removeEventListener("appinstalled", onAppInstalled)
      if ("removeEventListener" in mediaQuery) {
        mediaQuery.removeEventListener("change", onDisplayModeChange)
      } else if ("removeListener" in mediaQuery) {
        mediaQuery.removeListener(onDisplayModeChange)
      }
    }
  }, [refreshInstallationState])

  return {
    isInstalled,
    canPromptInstall: !isInstalled && deferredPrompt !== null,
    isIosSafariNotInstalled: !isInstalled && isIosSafari,
    dismissed,
    promptInstall,
    dismissBanner,
    resetBannerDismiss,
    refreshInstallationState,
  }
}
