"use client"

import { useState, useEffect } from "react"
import { Card, CardBody, CardHeader, Button, Spinner } from "@heroui/react"
import { X, Sparkles, Bot } from "lucide-react"
import { apiService } from "@/lib/api"
import type { ResumenConversacionResponse } from "@/lib/api-types"

interface AISummaryPanelProps {
  conversationId: string
  isOpen: boolean
  onClose: () => void
}

export default function AISummaryPanel({ conversationId, isOpen, onClose }: AISummaryPanelProps) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [typingText, setTypingText] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchSummary()
    }
  }, [isOpen, conversationId])

  // Agregar listener para la tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true) // true para capturar en fase de captura
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [isOpen, onClose])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      setSummary(null)
      setTypingText("")
      setIsTyping(false)
      
      const response = await apiService.getResumenConversacion(conversationId)
      
      if (response.resumen) {
        // Simular el efecto de typing de IA
        setIsTyping(true)
        typeText(response.resumen)
      } else {
        setError("No se pudo generar el resumen")
      }
    } catch (err) {
      console.error("Error fetching summary:", err)
      setError("Error al obtener el resumen de la conversación")
    } finally {
      setLoading(false)
    }
  }

  const typeText = (text: string) => {
    let index = 0
    const interval = setInterval(() => {
      if (index < text.length) {
        setTypingText((prev) => prev + text[index])
        index++
      } else {
        clearInterval(interval)
        setSummary(text)
        setIsTyping(false)
      }
    }, 20) // Velocidad de typing
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50 animate-slide-in-right">
      <Card className="h-full rounded-none">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="h-5 w-5 text-purple-500" />
                <Sparkles className="h-3 w-3 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <h3 className="font-semibold text-lg">Resumen IA</h3>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardBody className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center h-32 space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-spin-slow opacity-20"></div>
                <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-pulse"></div>
                <Bot className="absolute inset-0 m-auto h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-gray-500">Analizando conversación...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 text-sm">{error}</p>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                className="mt-2"
                onPress={fetchSummary}
              >
                Reintentar
              </Button>
            </div>
          )}

          {(isTyping || summary) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Asistente IA</p>
                  {isTyping && (
                    <div className="flex items-center gap-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-xs text-gray-500">escribiendo...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {isTyping ? typingText : summary}
                    {isTyping && (
                      <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>

              {summary && !isTyping && (
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={fetchSummary}
                    startContent={<Sparkles className="h-3 w-3" />}
                  >
                    Generar nuevo resumen
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
