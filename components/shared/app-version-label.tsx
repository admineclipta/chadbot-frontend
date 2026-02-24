"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatAppVersion, useAppVersion } from "@/hooks/use-app-version"

interface AppVersionLabelProps {
  className?: string
  enableUpdateCheck?: boolean
}

export default function AppVersionLabel({
  className,
  enableUpdateCheck = false,
}: AppVersionLabelProps) {
  const { versionInfo, latestVersionInfo, hasUpdate } = useAppVersion({
    enableUpdateCheck,
  })
  const notifiedVersionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enableUpdateCheck || !hasUpdate || !latestVersionInfo) return

    const updateKey = `${latestVersionInfo.version}:${latestVersionInfo.commit || ""}`
    if (notifiedVersionRef.current === updateKey) return

    notifiedVersionRef.current = updateKey

    toast.info("Nueva version disponible", {
      description: `${formatAppVersion(latestVersionInfo)} lista para recargar`,
      duration: 12000,
      action: {
        label: "Recargar",
        onClick: () => window.location.reload(),
      },
    })
  }, [enableUpdateCheck, hasUpdate, latestVersionInfo])

  return (
    <span
      className={cn(
        "block text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500",
        className,
      )}
      aria-label="Application version"
    >
      {formatAppVersion(versionInfo)}
    </span>
  )
}
