"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface AppVersionInfo {
  version: string
  commit: string | null
  builtAt: string | null
}

interface UseAppVersionOptions {
  enableUpdateCheck?: boolean
  pollingIntervalMs?: number
}

const DEFAULT_POLLING_INTERVAL_MS = 5 * 60 * 1000

function getVersionKey(versionInfo: AppVersionInfo): string {
  return `${versionInfo.version}:${versionInfo.commit || ""}`
}

function parseVersionPayload(payload: unknown): AppVersionInfo | null {
  if (!payload || typeof payload !== "object") return null

  const parsed = payload as Partial<AppVersionInfo>
  if (typeof parsed.version !== "string" || parsed.version.length === 0) return null

  return {
    version: parsed.version,
    commit: typeof parsed.commit === "string" ? parsed.commit : null,
    builtAt: typeof parsed.builtAt === "string" ? parsed.builtAt : null,
  }
}

export function formatAppVersion(versionInfo: AppVersionInfo | null): string {
  if (!versionInfo) return "v..."
  return `v${versionInfo.version}`
}

export function useAppVersion(options: UseAppVersionOptions = {}) {
  const {
    enableUpdateCheck = false,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  } = options

  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null)
  const [latestVersionInfo, setLatestVersionInfo] = useState<AppVersionInfo | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)

  const initialVersionKeyRef = useRef<string | null>(null)

  const fetchVersionInfo = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return parseVersionPayload(data)
    } catch {
      return null
    }
  }, [])

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const next = await fetchVersionInfo(signal)
    if (!next) return

    setVersionInfo((prev) => prev ?? next)
    setLatestVersionInfo(next)

    const nextKey = getVersionKey(next)
    if (!initialVersionKeyRef.current) {
      initialVersionKeyRef.current = nextKey
      return
    }

    setHasUpdate(initialVersionKeyRef.current !== nextKey)
  }, [fetchVersionInfo])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    if (!enableUpdateCheck) return

    const intervalId = window.setInterval(() => {
      void refresh()
    }, pollingIntervalMs)

    return () => window.clearInterval(intervalId)
  }, [enableUpdateCheck, pollingIntervalMs, refresh])

  return {
    versionInfo: latestVersionInfo || versionInfo,
    latestVersionInfo,
    hasUpdate,
    refresh,
  }
}
