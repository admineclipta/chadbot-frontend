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
  Chip,
  Progress,
} from "@heroui/react"
import { Send, MessageCircle, Phone, User, Eye } from "lucide-react"
import { toast } from "sonner"
import { apiService } from "@/lib/api"
import type { PlantillaWhatsApp, TemplateComponents } from "@/lib/api-types"
import CountrySelector from "./country-selector"
import { countries, type Country } from "@/lib/countries"

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [step, setStep] = useState(1)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(
    countries.find(c => c.code === "AR") || null
  )
  const [phoneNumber, setPhoneNumber] = useState("")
  const [contactName, setContactName] = useState("")
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

  const handleSendMessage = async () => {
    if (!selectedPlantilla || !phoneNumber || !contactName || !selectedCountry) return

    try {
      setSending(true)

      // Formar el número completo con código de país
      const fullPhoneNumber = `${selectedCountry.dialCode.replace('+', '')}${phoneNumber}`

      const payload = {
        Template: {
          TemplateName: selectedPlantilla.Name,
          TemplateLanguage: selectedPlantilla.Language,
        },
        Messages: [
          {
            DestinationNumber: fullPhoneNumber,
            FullName: contactName,
            TemplateComponents: templateParams,
          },
        ],
      }

      await apiService.enviarMensajesPlantilla(payload)

      toast.success("¡Mensaje enviado exitosamente!", {
        description: `Mensaje enviado a ${contactName} (${selectedCountry.dialCode}${phoneNumber})`
      })
      handleClose()
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Error al enviar mensaje", {
        description: "Por favor, intenta nuevamente."
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedCountry(countries.find(c => c.code === "AR") || null)
    setPhoneNumber("")
    setContactName("")
    setSelectedPlantilla(null)
    setTemplateParams({ Header: [], Body: [], Button: [] })
    onClose()
  }

  const isPhoneValid = phoneNumber.length >= 7 && phoneNumber.length <= 15 && /^\d+$/.test(phoneNumber)
  const isNameValid = contactName.trim().length > 0
  const bodyParams = selectedPlantilla?.BodyComponent?.Text ? parseTemplateBody(selectedPlantilla.BodyComponent.Text) : []

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Nuevo Chat</h2>
          <div className="flex items-center gap-2">
            <Chip key="step-1" color={step >= 1 ? "success" : "default"} variant={step === 1 ? "solid" : "bordered"} size="sm">
              1. Contacto
            </Chip>
            <Chip key="step-2" color={step >= 2 ? "success" : "default"} variant={step === 2 ? "solid" : "bordered"} size="sm">
              2. Plantilla
            </Chip>
            <Chip key="step-3" color={step >= 3 ? "success" : "default"} variant={step === 3 ? "solid" : "bordered"} size="sm">
              3. Configurar
            </Chip>
            <Chip key="step-4" color={step >= 4 ? "success" : "default"} variant={step === 4 ? "solid" : "bordered"} size="sm">
              4. Enviar
            </Chip>
          </div>
        </ModalHeader>

        <ModalBody>
          {/* Paso 1: Datos del Contacto */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos del Contacto
              </h3>

              <Card>
                <CardBody className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código de País</label>
                    <CountrySelector
                      selectedCountry={selectedCountry}
                      onCountrySelect={setSelectedCountry}
                      placeholder="Seleccionar país"
                    />
                  </div>

                  <Input
                    label="Número de Teléfono"
                    placeholder="Ej: 1234567890 (sin código de país)"
                    value={phoneNumber}
                    onChange={(e) => {
                      // Solo permitir números
                      const value = e.target.value.replace(/\D/g, "")
                      setPhoneNumber(value)
                    }}
                    startContent={
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {selectedCountry?.dialCode || "+"}
                        </span>
                      </div>
                    }
                    description="Solo el número local, sin código de país"
                    isInvalid={phoneNumber.length > 0 && !isPhoneValid}
                    errorMessage={
                      phoneNumber.length > 0 && !isPhoneValid 
                        ? "El número debe tener entre 7 y 15 dígitos" 
                        : ""
                    }
                  />

                  <Input
                    label="Nombre del Contacto"
                    placeholder="Ej: Juan Pérez"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    startContent={<User className="h-4 w-4 text-gray-400" />}
                    description="Nombre que aparecerá en la conversación"
                    isInvalid={contactName.length > 0 && !isNameValid}
                    errorMessage={contactName.length > 0 && !isNameValid ? "El nombre no puede estar vacío" : ""}
                  />
                </CardBody>
              </Card>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Instrucciones:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Selecciona el país para obtener el código correcto</li>
                  <li>• Ingresa solo el número local (sin código de país)</li>
                  <li>• Verifica que el número sea correcto antes de continuar</li>
                  {selectedCountry && (
                    <li className="mt-2 p-2 bg-white rounded border">
                      <strong>Número completo:</strong> {selectedCountry.dialCode}{phoneNumber || "XXXXXXXXX"}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Paso 2: Seleccionar Plantilla */}
          {step === 2 && (
            <div className="space-y-4">
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
                              {plantilla.Language} • {plantilla.Status}
                            </p>
                          </div>
                          {selectedPlantilla?.Id === plantilla.Id && (
                            <Chip color="success" size="sm">
                              Seleccionada
                            </Chip>
                          )}
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        {plantilla.HeaderComponent.Text && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">HEADER:</p>
                            <p className="text-sm font-medium">{plantilla.HeaderComponent.Text}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">BODY:</p>
                          <p className="text-sm">{plantilla.BodyComponent.Text}</p>
                        </div>
                        {plantilla.FooterComponent.Text && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">FOOTER:</p>
                            <p className="text-sm text-gray-500">{plantilla.FooterComponent.Text}</p>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Configurar Parámetros */}
          {step === 3 && selectedPlantilla && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Configurar Parámetros de la Plantilla
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <h4 className="font-semibold">Información del Contacto</h4>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Nombre:</span> {contactName}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Teléfono:</span> {selectedCountry?.dialCode}{phoneNumber}
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
                      <p className="text-xs text-gray-500 mt-2">
                        Este mensaje se enviará a {contactName} ({selectedCountry?.dialCode}{phoneNumber})
                      </p>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Paso 4: Confirmar y Enviar */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Send className="h-5 w-5" />
                Confirmar y Enviar Mensaje
              </h3>

              <Card>
                <CardBody>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{contactName}</p>
                        <p className="text-sm text-gray-600">Contacto</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">{selectedCountry?.dialCode}{phoneNumber}</p>
                        <p className="text-sm text-gray-600">Teléfono</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning">{selectedPlantilla?.Name}</p>
                        <p className="text-sm text-gray-600">Plantilla</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Vista previa final del mensaje:</h5>
                        <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                          {selectedPlantilla?.HeaderComponent?.Text && (
                            <div className="font-semibold mb-2">{selectedPlantilla.HeaderComponent.Text}</div>
                          )}
                          <div className="whitespace-pre-wrap">{getPreviewMessage()}</div>
                          {selectedPlantilla?.FooterComponent?.Text && (
                            <div className="text-sm text-gray-600 mt-2">{selectedPlantilla.FooterComponent.Text}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleClose} isDisabled={sending}>
            Cancelar
          </Button>

          {step > 1 && step < 4 && (
            <Button variant="flat" onPress={() => setStep(step - 1)} isDisabled={sending}>
              Anterior
            </Button>
          )}

          {step === 1 && (
            <Button color="primary" onPress={() => setStep(2)} isDisabled={!isPhoneValid || !isNameValid || !selectedCountry}>
              Siguiente
            </Button>
          )}

          {step === 2 && (
            <Button color="primary" onPress={() => setStep(3)} isDisabled={!selectedPlantilla}>
              Siguiente
            </Button>
          )}

          {step === 3 && (
            <Button color="primary" onPress={() => setStep(4)}>
              Continuar
            </Button>
          )}

          {step === 4 && (
            <Button
              color="success"
              onPress={handleSendMessage}
              isLoading={sending}
              startContent={!sending ? <Send className="h-4 w-4" /> : null}
            >
              {sending ? "Enviando..." : "Enviar Mensaje"}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
