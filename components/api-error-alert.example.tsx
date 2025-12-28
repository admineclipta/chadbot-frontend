/**
 * Ejemplo de uso del componente ApiErrorAlert
 * 
 * Este archivo muestra diferentes casos de uso del componente de alerta de error
 * para errores de API relacionados con agentes de IA
 */

import ApiErrorAlert from "./api-error-alert"

export function ApiErrorAlertExamples() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Ejemplo 1: Error de conexión con reintentar</h2>
        <ApiErrorAlert
          title="Error de comunicación con agentes de IA"
          description="No se pudo conectar con el servidor de agentes de IA. El servicio podría no estar disponible o no responder en este momento."
          onRetry={() => console.log("Reintentando...")}
          showRetry={true}
          showGoHome={false}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Ejemplo 2: Error con opciones de reintentar e ir al inicio</h2>
        <ApiErrorAlert
          title="Error al intervenir conversación"
          description="No se pudo intervenir la conversación. El servicio de agentes de IA no está respondiendo."
          onRetry={() => console.log("Reintentando intervención...")}
          onGoHome={() => console.log("Volviendo al inicio...")}
          showRetry={true}
          showGoHome={true}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Ejemplo 3: Error de red</h2>
        <ApiErrorAlert
          title="Error de conexión"
          description="Verifica tu conexión a internet e intenta nuevamente."
          onRetry={() => console.log("Reintentando...")}
          showRetry={true}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Ejemplo 4: Servicio no disponible</h2>
        <ApiErrorAlert
          title="Servicio no disponible"
          description="El servicio de agentes de IA está temporalmente fuera de servicio. Por favor, intenta más tarde."
          onGoHome={() => console.log("Volviendo al inicio...")}
          showRetry={false}
          showGoHome={true}
        />
      </div>
    </div>
  )
}
