"use client"

import { Card, CardBody, Chip, Button } from "@heroui/react"
import { Activity, Bell, RefreshCw } from "lucide-react"
import type { SseConnectionState } from "@/lib/api-types"

interface MessagesSectionProps {
  sseState?: SseConnectionState
  lastHeartbeatAt?: Date | null
  onReconnect?: () => void
  isReconnecting?: boolean
  pushPermissionState?: "unsupported" | NotificationPermission
  pushSupported?: boolean
  pushSecureContext?: boolean
  pushSubscribed?: boolean
  pushBusy?: boolean
  pushError?: string | null
  onEnablePush?: () => void
  onDisablePush?: () => void
}

export default function MessagesSection({
  sseState = "connecting",
  lastHeartbeatAt = null,
  onReconnect,
  isReconnecting = false,
  pushPermissionState = "unsupported",
  pushSupported = false,
  pushSecureContext = false,
  pushSubscribed = false,
  pushBusy = false,
  pushError = null,
  onEnablePush,
  onDisablePush,
}: MessagesSectionProps) {
  const getSseLabel = (state: SseConnectionState): string => {
    switch (state) {
      case "connected":
        return "En vivo"
      case "connecting":
        return "Reconectando..."
      case "degraded":
        return "Modo degradado"
      default:
        return "Sin conexion"
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
    return `Ultimo heartbeat: ${value.toLocaleTimeString()}`
  }

  const getPermissionLabel = (): string => {
    switch (pushPermissionState) {
      case "granted":
        return pushSubscribed ? "Activo en este dispositivo" : "Permiso concedido"
      case "denied":
        return "Bloqueado por el navegador"
      case "default":
        return "Permiso pendiente"
      default:
        return "No disponible"
    }
  }

  const getPermissionColor = () => {
    switch (pushPermissionState) {
      case "granted":
        return "success" as const
      case "denied":
        return "danger" as const
      case "default":
        return "warning" as const
      default:
        return "default" as const
    }
  }

  return (
    <div className="py-6 space-y-6">
      <Card>
        <CardBody className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Estado de conexion en tiempo real</h3>
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
                    Recibe notificaciones push del sistema para mensajes y asignaciones
                  </p>
                </div>
                <Chip color={getPermissionColor()} variant="flat" size="sm">
                  {getPermissionLabel()}
                </Chip>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button
                  color="primary"
                  onPress={() => onEnablePush?.()}
                  isLoading={pushBusy}
                  isDisabled={!pushSupported || !pushSecureContext || pushPermissionState === "denied"}
                >
                  Activar notificaciones push
                </Button>
                <Button
                  color="default"
                  variant="flat"
                  onPress={() => onDisablePush?.()}
                  isLoading={pushBusy}
                  isDisabled={!pushSupported || !pushSecureContext || !pushSubscribed}
                >
                  Desactivar en este dispositivo
                </Button>
              </div>

              {!pushSupported && (
                <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  <p className="text-sm text-danger-600 dark:text-danger-400">
                    Este navegador no soporta Web Push (Service Worker + Push API).
                  </p>
                </div>
              )}

              {pushSupported && !pushSecureContext && (
                <div className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                  <p className="text-sm text-warning-600 dark:text-warning-400">
                    Web Push requiere HTTPS. En desarrollo, http://localhost si esta permitido.
                  </p>
                </div>
              )}

              {pushPermissionState === "denied" && (
                <div className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                  <p className="text-sm text-warning-600 dark:text-warning-400">
                    Las notificaciones estan bloqueadas. Habilitalas desde la configuracion del sitio en Chrome.
                  </p>
                </div>
              )}

              {pushError && (
                <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  <p className="text-sm text-danger-600 dark:text-danger-400">{pushError}</p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
