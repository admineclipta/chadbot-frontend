"use client"

import { useState, useEffect } from "react"
import { Card, CardBody } from "@heroui/react"
import { useAppTheme } from "@/hooks/use-theme"
import { Sun, Moon, Monitor } from "lucide-react"

export default function AppearanceSection() {
  const { theme, setTheme, mounted } = useAppTheme()
  const [selectedTheme, setSelectedTheme] = useState("system")

  useEffect(() => {
    if (mounted) {
      setSelectedTheme(theme || "system")
    }
  }, [theme, mounted])

  const themeOptions = [
    {
      key: "light",
      label: "Claro",
      description: "Tema claro para el día",
      icon: Sun,
    },
    {
      key: "dark",
      label: "Oscuro",
      description: "Tema oscuro para la noche",
      icon: Moon,
    },
    {
      key: "system",
      label: "Sistema",
      description: "Usa la configuración de tu sistema",
      icon: Monitor,
    },
  ]

  const handleThemeChange = (themeKey: string) => {
    setSelectedTheme(themeKey)
    setTheme(themeKey)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="py-6">
      <Card>
        <CardBody className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Tema de la aplicación</h3>
            <p className="text-sm text-default-500 mt-1">
              Personaliza la apariencia de la aplicación
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedTheme === option.key

              return (
                <div
                  key={option.key}
                  className={`
                    relative flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20 shadow-lg"
                        : "border-default-200 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-default-50 dark:hover:bg-default-100/10"
                    }
                  `}
                  onClick={() => handleThemeChange(option.key)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`
                      flex items-center justify-center w-16 h-16 rounded-full mb-4
                      ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-default-100 dark:bg-default-200/10 text-default-600"
                      }
                    `}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  <p
                    className={`font-semibold text-center ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="text-sm text-default-500 text-center mt-1">
                    {option.description}
                  </p>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
