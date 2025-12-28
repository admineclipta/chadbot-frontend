"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Progress,
} from "@heroui/react"
import { Send, MessageCircle, Eye, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { apiService } from "@/lib/api"
import type { PlantillaWhatsApp, TemplateComponents } from "@/lib/api-types"

interface TemplateMessageModalProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  customerName: string
  customerPhone: string
  onMessageSent?: () => void
  showWarning?: boolean // Para mostrar o no el warning de 24 horas
}

export default function TemplateMessageModal({ 
  isOpen, 
  onClose, 
  conversationId,
  customerName,
  customerPhone,
  onMessageSent,
  showWarning = true
}: TemplateMessageModalProps) {
  const [step, setStep] = useState(1)
  const [plantillas, setPlantillas] = useState<PlantillaWhatsApp[]>([])
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaWhatsApp | null>(null)
  const [templateParams, setTemplateParams] = useState<TemplateComponents>({
    Header: [],
    Body: [],
    Button: [],
  })
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Cargar plantillas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadPlantillas()
    }
  }, [isOpen])

  const loadPlantillas = async () => {
    try {
      setLoading(true)
      const data = await apiService.getPlantillas()
      setPlantillas(data)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast.error("Error al cargar plantillas")
    } finally {
      setLoading(false)
    }
  }

  const parseTemplateBody = (body: string): string[] => {
    if (!body) return []
    const matches = body.match(/\{\{(\d+)\}\}/g)
    return matches ? matches.map((match) => match.replace(/[{}]/g, "")) : []
  }

  const getPreviewMessage = (): string => {
    if (!selectedPlantilla?.BodyComponent?.Text) return ""

    let preview = selectedPlantilla.BodyComponent.Text
    templateParams.Body.forEach((param, index) => {
      const placeholder = `{{${index + 1}}}`
      preview = preview.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        param || `[Parámetro ${index + 1}]`,
      )
    })

    return preview
  }

  const handleSendTemplate = async () => {
    if (!selectedPlantilla) return

    try {
      setSending(true)

      // Limpiar el número de teléfono para asegurar el formato correcto
      // Si ya tiene código de país (empieza con +), quitamos el + y espacios/guiones
      // Si no tiene código de país, asumimos que es argentino y agregamos 549
      let cleanPhoneNumber = customerPhone.replace(/\D/g, '')
      
      // Si no empieza con código de país argentino, agregarlo
      if (!cleanPhoneNumber.startsWith('549')) {
        // Si empieza con 54, agregar el 9
        if (cleanPhoneNumber.startsWith('54')) {
          cleanPhoneNumber = '549' + cleanPhoneNumber.substring(2)
        } else {
          // Si no tiene código de país, asumir Argentina y agregarlo
          cleanPhoneNumber = '549' + cleanPhoneNumber
        }
      }

      const payload = {
        Template: {
          TemplateName: selectedPlantilla.Name,
          TemplateLanguage: selectedPlantilla.Language,
        },
        Messages: [
          {
            DestinationNumber: cleanPhoneNumber,
            FullName: customerName,
            TemplateComponents: templateParams,
          },
        ],
      }

      await apiService.enviarMensajesPlantilla(payload)

      toast.success("¡Mensaje de plantilla enviado exitosamente!", {
        description: `Plantilla "${selectedPlantilla.Name}" enviada a ${customerName}`
      })

      // Llamar callback para refrescar mensajes
      if (onMessageSent) {
        onMessageSent()
      }

      handleClose()
    } catch (error) {
      console.error("Error sending template message:", error)
      toast.error("Error al enviar mensaje de plantilla", {
        description: "Por favor, intenta nuevamente."
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedPlantilla(null)
    setTemplateParams({ Header: [], Body: [], Button: [] })
    onClose()
  }

  const bodyParams = selectedPlantilla?.BodyComponent?.Text ? parseTemplateBody(selectedPlantilla.BodyComponent.Text) : []
  const canProceed = step === 1 ? selectedPlantilla : bodyParams.every((_, index) => templateParams.Body[index]?.trim())

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">Enviar Mensaje de Plantilla</h2>
          <p className="text-sm text-gray-500 font-normal">
            Para: {customerName} ({customerPhone})
          </p>
        </ModalHeader>

        <ModalBody>
          {/* Paso 1: Seleccionar Plantilla */}
          {step === 1 && (
            <div className="space-y-4">
              {showWarning && (
                <div className="flex items-center gap-2 text-orange-700 mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  <div className="text-sm">
                    <p className="font-medium">Ventana de 24 horas expirada</p>
                    <p className="text-orange-600">Solo puedes enviar mensajes de plantilla de WhatsApp Business</p>
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Selecciona una Plantilla de WhatsApp Business
              </h3>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Progress size="sm" isIndeterminate aria-label="Cargando plantillas..." className="max-w-md" />
                </div>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {plantillas.map((plantilla) => (
                    <Card
                      key={plantilla.Id}
                      isPressable
                      isHoverable
                      className={`cursor-pointer transition-all ${
                        selectedPlantilla?.Id === plantilla.Id ? "ring-2 ring-primary" : ""
                      }`}
                      onPress={() => setSelectedPlantilla(plantilla)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start w-full">
                          <div>
                            <h4 className="font-semibold">{plantilla.Name}</h4>
                            <p className="text-sm text-gray-500">
                              Categoría: {plantilla.Category} • Idioma: {plantilla.Language}
                            </p>
                          </div>
                          <div className="text-xs text-right">
                            <div className={`px-2 py-1 rounded-full text-white ${
                              plantilla.Status === "APPROVED" ? "bg-green-500" : "bg-yellow-500"
                            }`}>
                              {plantilla.Status}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        {plantilla.HeaderComponent?.Text && (
                          <div className="text-sm font-medium text-gray-800 mb-1">
                            {plantilla.HeaderComponent.Text}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 line-clamp-3">
                          {plantilla.BodyComponent?.Text || "Sin contenido"}
                        </div>
                        {plantilla.FooterComponent?.Text && (
                          <div className="text-xs text-gray-500 mt-2">
                            {plantilla.FooterComponent.Text}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Configurar Parámetros */}
          {step === 2 && selectedPlantilla && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Configurar Parámetros de la Plantilla
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <h4 className="font-semibold">Destinatario</h4>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Nombre:</span> {customerName}
                        </div>
                        <div>
                          <span className="font-medium">Teléfono:</span> {customerPhone}
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {bodyParams.length > 0 && (
                    <Card>
                      <CardHeader>
                        <h4 className="font-semibold">Parámetros del Mensaje</h4>
                      </CardHeader>
                      <CardBody className="space-y-3">
                        {bodyParams.map((param, index) => (
                          <Input
                            key={`body-param-${index}-${param}`}
                            label={`Parámetro ${index + 1}`}
                            placeholder={`Valor para {{${index + 1}}}`}
                            value={templateParams.Body[index] || ""}
                            onChange={(e) => {
                              const newParams = { ...templateParams }
                              newParams.Body[index] = e.target.value
                              setTemplateParams(newParams)
                            }}
                          />
                        ))}
                      </CardBody>
                    </Card>
                  )}
                </div>

                <div>
                  <Card>
                    <CardHeader>
                      <h4 className="font-semibold">Vista Previa del Mensaje</h4>
                    </CardHeader>
                    <CardBody>
                      <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                        {selectedPlantilla.HeaderComponent?.Text && (
                          <div className="font-semibold mb-2">{selectedPlantilla.HeaderComponent.Text}</div>
                        )}
                        <div className="whitespace-pre-wrap">{getPreviewMessage()}</div>
                        {selectedPlantilla.FooterComponent?.Text && (
                          <div className="text-sm text-gray-600 mt-2">{selectedPlantilla.FooterComponent.Text}</div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancelar
          </Button>
          
          {step === 1 && (
            <Button
              color="primary"
              onPress={() => setStep(2)}
              isDisabled={!selectedPlantilla}
              endContent={<MessageCircle className="h-4 w-4" />}
            >
              Continuar
            </Button>
          )}

          {step === 2 && (
            <div className="flex gap-2">
              <Button
                variant="light"
                onPress={() => setStep(1)}
                startContent={<MessageCircle className="h-4 w-4" />}
              >
                Atrás
              </Button>
              <Button
                color="primary"
                onPress={handleSendTemplate}
                isLoading={sending}
                isDisabled={!canProceed}
                startContent={!sending && <Send className="h-4 w-4" />}
              >
                {sending ? "Enviando..." : "Enviar Mensaje"}
              </Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}