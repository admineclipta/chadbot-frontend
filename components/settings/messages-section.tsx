"use client"

import { useState, useEffect } from "react"
import { Card, CardBody, Select, SelectItem, Switch } from "@heroui/react"
import { RefreshCw, Bell } from "lucide-react"

interface MessagesSectionProps {
  autoRefreshInterval?: number
  onAutoRefreshIntervalChange?: (interval: number) => void
}

export default function MessagesSection({
  autoRefreshInterval,
  onAutoRefreshIntervalChange,
}: MessagesSectionProps) {
  const [currentRefreshInterval, setCurrentRefreshInterval] = useState(
    autoRefreshInterval?.toString() || "10"
  )
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const notificationsStoredValue = localStorage.getItem("chadbot_notifications")
      setNotificationsEnabled(notificationsStoredValue === "true")
    }
  }, [])

  const refreshIntervals = [
    { value: "5", label: "5 segundos" },
    { value: "10", label: "10 segundos" },
    { value: "15", label: "15 segundos" },
    { value: "30", label: "30 segundos" },
    { value: "60", label: "1 minuto" },
  ]

  const handleRefreshIntervalChange = (value: string) => {
    setCurrentRefreshInterval(value)
    const newInterval = parseInt(value)
    
    if (typeof window !== "undefined") {
      localStorage.setItem("chadbot_autoRefreshInterval", value)
    }
    
    if (onAutoRefreshIntervalChange) {
      onAutoRefreshIntervalChange(newInterval)
    }
  }

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

  return (
    <div className="py-6 space-y-6">
      {/* Auto-refresh Section */}
      <Card>
        <CardBody className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Actualización Automática</h3>
              <p className="text-sm text-default-500 mb-4">
                Configura con qué frecuencia se actualizan los mensajes en las conversaciones
              </p>
              <Select
                label="Intervalo de actualización"
                placeholder="Selecciona un intervalo"
                selectedKeys={[currentRefreshInterval]}
                onChange={(e) => handleRefreshIntervalChange(e.target.value)}
                classNames={{
                  base: "w-full md:max-w-xs",
                }}
              >
                {refreshIntervals.map((interval) => (
                  <SelectItem key={interval.value}>
                    {interval.label}
                  </SelectItem>
                ))}
              </Select>
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
