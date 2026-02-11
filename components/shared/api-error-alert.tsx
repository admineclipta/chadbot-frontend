"use client"

import { Alert, Button } from "@heroui/react"
import { RefreshCw, Home } from "lucide-react"

interface ApiErrorAlertProps {
  title?: string
  description?: string
  onRetry?: () => void
  onGoHome?: () => void
  showRetry?: boolean
  showGoHome?: boolean
  className?: string
}

export default function ApiErrorAlert({
  title = "Error de conexión con la API",
  description = "No se pudo conectar con el servidor. El servicio podría no estar disponible o no responder en este momento.",
  onRetry,
  onGoHome,
  showRetry = true,
  showGoHome = false,
  className = "",
}: ApiErrorAlertProps) {
  return (
    <div className={`flex items-center justify-center w-full p-4 ${className}`}>
      <Alert
        color="danger"
        title={title}
        description={description}
        variant="faded"
        endContent={
          <div className="flex gap-2">
            {showRetry && onRetry && (
              <Button
                color="danger"
                size="sm"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={onRetry}
              >
                Reintentar
              </Button>
            )}
            {showGoHome && onGoHome && (
              <Button
                color="danger"
                size="sm"
                variant="bordered"
                startContent={<Home className="w-4 h-4" />}
                onPress={onGoHome}
              >
                Ir al inicio
              </Button>
            )}
          </div>
        }
        className="max-w-2xl"
      />
    </div>
  )
}
