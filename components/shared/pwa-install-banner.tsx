"use client"

import { useMemo, useState } from "react"
import { Button } from "@heroui/react"
import { Download, Share2, Smartphone, X } from "lucide-react"

interface PwaInstallBannerProps {
  canPromptInstall: boolean
  isIosSafariNotInstalled: boolean
  onPromptInstall: () => void
  onDismiss: () => void
}

export default function PwaInstallBanner({
  canPromptInstall,
  isIosSafariNotInstalled,
  onPromptInstall,
  onDismiss,
}: PwaInstallBannerProps) {
  const [showIosSteps, setShowIosSteps] = useState(false)

  const description = useMemo(() => {
    if (isIosSafariNotInstalled) {
      return "Instala CHADBOT en tu iPhone para habilitar notificaciones push incluso con la app cerrada."
    }

    return "Instala CHADBOT en tu celular para abrir más rápido y recibir notificaciones push del sistema."
  }, [isIosSafariNotInstalled])

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 md:hidden">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-primary-100 dark:bg-primary-900/40 p-2">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Instala CHADBOT
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Cerrar recordatorio de instalación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {canPromptInstall && (
              <Button
                color="primary"
                className="h-11"
                startContent={<Download className="h-4 w-4" />}
                onPress={onPromptInstall}
              >
                Instalar app
              </Button>
            )}

            {isIosSafariNotInstalled && (
              <Button
                color="secondary"
                variant="flat"
                className="h-11"
                startContent={<Share2 className="h-4 w-4" />}
                onPress={() => setShowIosSteps((prev) => !prev)}
              >
                {showIosSteps ? "Ocultar pasos" : "Cómo instalar en iPhone"}
              </Button>
            )}
          </div>

          {isIosSafariNotInstalled && showIosSteps && (
            <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                1. Abre el menú Compartir en Safari.
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                2. Toca "Agregar a pantalla de inicio".
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                3. Abre la app desde el ícono y activa notificaciones en Ajustes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
