"use client"

import { useState, useEffect } from "react"
import { Card, CardBody, Switch, Chip, Button } from "@heroui/react"
import { Activity, Bell, RefreshCw } from "lucide-react"
import type { SseConnectionState } from "@/lib/api-types"

interface MessagesSectionProps {
  sseState?: SseConnectionState
  lastHeartbeatAt?: Date | null
  onReconnect?: () => void
  isReconnecting?: boolean
}

export default function MessagesSection({
  sseState = "connecting",
  lastHeartbeatAt = null,
  onReconnect,
  isReconnecting = false,
}: MessagesSectionProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const notificationsStoredValue = localStorage.getItem("chadbot_notifications")
      setNotificationsEnabled(notificationsStoredValue === "true")
    }
  }, [])

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    
    if (typeof window !== "undefined") {
      localStorage.setItem("chadbot_notifications", enabled.toString())
    }

    // Solicitar permisos de notificación si se habilita
    if (enabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }

  const getSseLabel = (state: SseConnectionState): string => {
    switch (state) {
      case "connected":
        return "En vivo"
      case "connecting":
        return "Reconectando..."
      case "degraded":
        return "Modo degradado"
      default:
        return "Sin conexión"
    }
  }

  const getSseColor = (state: SseConnectionState) => {
    switch (state) {
      case "connected":
        return "success" as const
      case "connecting":
        return "warning" as const
      case "degraded":
        return "warning" as const
      default:
        return "danger" as const
    }
  }

  const formatHeartbeat = (value: Date | null): string => {
    if (!value) return "Sin heartbeat recibido"
    return `Último heartbeat: ${value.toLocaleTimeString()}`
  }

  return (
    <div className="py-6 space-y-6">
      {/* SSE Section */}
      <Card>
        <CardBody className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Estado de conexión en tiempo real</h3>
              <p className="text-sm text-default-500 mb-4">
                Los mensajes entrantes se actualizan por SSE en tiempo real
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Chip color={getSseColor(sseState)} variant="flat" size="sm">
                  {getSseLabel(sseState)}
                </Chip>
                <span className="text-xs text-default-500">
                  {formatHeartbeat(lastHeartbeatAt)}
                </span>
              </div>
              <Button
                className="mt-4"
                color="primary"
                variant="flat"
                size="sm"
                isLoading={isReconnecting}
                onPress={() => onReconnect?.()}
                startContent={<RefreshCw className="h-4 w-4" />}
              >
                Reconectar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardBody className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                <Bell className="h-6 w-6 text-secondary" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Notificaciones del Navegador</h3>
                  <p className="text-sm text-default-500">
                    Recibe notificaciones cuando lleguen nuevos mensajes
                  </p>
                </div>
                <Switch
                  isSelected={notificationsEnabled}
                  onValueChange={handleNotificationsChange}
                  classNames={{
                    wrapper: "group-data-[selected=true]:bg-secondary",
                  }}
                />
              </div>
              {notificationsEnabled && "Notification" in window && Notification.permission === "denied" && (
                <div className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                  <p className="text-sm text-warning-600 dark:text-warning-400">
                    Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración de tu navegador.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
