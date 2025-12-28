"use client"

import { Chip } from "@heroui/react"
import { config } from "@/lib/config"

export default function EnvironmentIndicator() {
  if (config.environment === "production") {
    return null
  }

  const getEnvironmentColor = () => {
    switch (config.environment) {
      case "development":
        return "success"
      case "staging":
        return "warning"
      default:
        return "default"
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Chip color={getEnvironmentColor() as any} variant="flat" size="sm" className="font-mono">
        {config.environmentName}
      </Chip>
    </div>
  )
}
