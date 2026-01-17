"use client"

import { useState, useEffect } from "react"
import { Button, Tooltip } from "@heroui/react"
import { Sparkles, RotateCcw } from "lucide-react"
import { getUIVersion, setUIVersion } from "@/lib/config"

export default function UIVersionToggle() {
  const [currentVersion, setCurrentVersion] = useState<"original" | "restyled">("restyled")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrentVersion(getUIVersion())
  }, [])

  const handleToggle = () => {
    const newVersion = currentVersion === "restyled" ? "original" : "restyled"
    setUIVersion(newVersion)
  }

  // No renderizar hasta que esté montado (evita hydration mismatch)
  if (!mounted) return null

  const isRestyled = currentVersion === "restyled"

  return (
    <Tooltip
      content={
        isRestyled
          ? "Cambiar a versión original"
          : "Cambiar a nueva versión (Beta)"
      }
      placement="left"
    >
      <Button
        isIconOnly
        variant={isRestyled ? "flat" : "solid"}
        color={isRestyled ? "default" : "secondary"}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
        onPress={handleToggle}
      >
        {isRestyled ? (
          <RotateCcw className="h-5 w-5" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </Button>
    </Tooltip>
  )
}
