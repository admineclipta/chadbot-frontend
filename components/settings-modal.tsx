"use client"

import { useState, useEffect } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Switch,
  Card,
  CardBody,
  Divider,
  Select,
  SelectItem,
} from "@heroui/react"
import { useAppTheme } from "@/hooks/use-theme"
import { Settings, Moon, Sun, Palette, Monitor, Bell, RefreshCw } from "lucide-react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  autoRefreshInterval?: number
  onAutoRefreshIntervalChange?: (interval: number) => void
}

export default function SettingsModal({ isOpen, onClose, autoRefreshInterval = 10, onAutoRefreshIntervalChange }: SettingsModalProps) {
  const { theme, setTheme, mounted } = useAppTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme || "system")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [currentRefreshInterval, setCurrentRefreshInterval] = useState(autoRefreshInterval)

  // Opciones de intervalo de actualización
  const refreshIntervalOptions = [
    { key: "5", label: "5 segundos", value: 5 },
    { key: "10", label: "10 segundos", value: 10 },
    { key: "15", label: "15 segundos", value: 15 },
    { key: "30", label: "30 segundos", value: 30 },
    { key: "60", label: "1 minuto", value: 60 },
  ]

  // Actualizar selectedTheme cuando cambie el tema
  useEffect(() => {
    if (mounted && theme) {
      setSelectedTheme(theme)
    }
  }, [theme, mounted])

  // Sincronizar el intervalo local con el prop
  useEffect(() => {
    setCurrentRefreshInterval(autoRefreshInterval)
  }, [autoRefreshInterval])

  // Cargar configuración de notificaciones desde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chadbot_notifications")
      setNotificationsEnabled(saved === "true")
    }
  }, [])

  const themeOptions = [
    {
      key: "light",
      label: "Modo Claro",
      icon: Sun,
      description: "Interfaz clara y luminosa",
    },
    {
      key: "dark",
      label: "Modo Oscuro",
      icon: Moon,
      description: "Interfaz oscura para ambientes con poca luz",
    },
    {
      key: "system",
      label: "Seguir Sistema",
      icon: Monitor,
      description: "Usar la configuración del sistema operativo",
    },
  ]

  const handleThemeChange = (themeKey: string) => {
    setSelectedTheme(themeKey)
    setTheme(themeKey)
  }

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    localStorage.setItem("chadbot_notifications", enabled.toString())
    
    // Solicitar permisos de notificación si se habilita
    if (enabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }

  const handleRefreshIntervalChange = (intervalString: string) => {
    const newInterval = parseInt(intervalString)
    setCurrentRefreshInterval(newInterval)
    if (onAutoRefreshIntervalChange) {
      onAutoRefreshIntervalChange(newInterval)
    }
  }

  // Mostrar un skeleton o loading si no está montado
  if (!mounted) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
      classNames={{
        base: "bg-white dark:bg-gray-900",
        header: "border-b border-gray-200 dark:border-gray-700",
        body: "py-6",
        closeButton: "hover:bg-gray-100 dark:hover:bg-gray-800",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="text-xl font-semibold text-gray-900 dark:text-white">Configuración</span>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* Sección de Apariencia */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Apariencia</h3>
              </div>
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <CardBody className="p-4">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Personaliza la apariencia de la aplicación
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {themeOptions.map((option) => {
                        const Icon = option.icon
                        const isSelected = selectedTheme === option.key
                        
                        return (
                          <div
                            key={option.key}
                            className={`
                              flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                              ${isSelected 
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/20" 
                                : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              }
                            `}
                            onClick={() => handleThemeChange(option.key)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                flex items-center justify-center w-10 h-10 rounded-lg
                                ${isSelected 
                                  ? "bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-400" 
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                }
                              `}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className={`font-medium ${isSelected ? "text-purple-700 dark:text-purple-300" : "text-gray-900 dark:text-white"}`}>
                                  {option.label}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                            
                            <div className={`
                              w-5 h-5 rounded-full border-2 flex items-center justify-center
                              ${isSelected 
                                ? "border-purple-500 bg-purple-500" 
                                : "border-gray-300 dark:border-gray-600"
                              }
                            `}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Divider />

            {/* Sección de Auto-refresh */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Actualización automática</h3>
              </div>
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <CardBody className="p-4">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white mb-2">Intervalo de actualización</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Frecuencia con la que se actualizan automáticamente los mensajes
                      </p>
                      <Select
                        selectedKeys={[currentRefreshInterval.toString()]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string
                          if (selected) handleRefreshIntervalChange(selected)
                        }}
                        className="max-w-xs"
                        label="Intervalo de actualización"
                        variant="bordered"
                        color="primary"
                        classNames={{
                          trigger: "border-gray-300 dark:border-gray-600",
                        }}
                      >
                        {refreshIntervalOptions.map((option) => (
                          <SelectItem key={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Divider />

            {/* Sección de Notificaciones */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notificaciones</h3>
              </div>
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Notificaciones de escritorio</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Recibir notificaciones cuando lleguen nuevos mensajes
                      </p>
                    </div>
                    <Switch 
                      isSelected={notificationsEnabled}
                      onValueChange={handleNotificationsChange}
                      color="primary"
                      classNames={{
                        base: "max-w-fit",
                        wrapper: "group-data-[selected=true]:bg-purple-600",
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>

            <Divider />

            {/* Información de la aplicación */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Información</h3>
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <CardBody className="p-4">
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Versión:</span>
                      <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Última actualización:</span>
                      <span className="font-medium">Enero 2024</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
