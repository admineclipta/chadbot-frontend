"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
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
  Accordion,
  AccordionItem,
} from "@heroui/react"
import { Upload, FileText, Send, Users, MessageSquare, Eye } from "lucide-react"
import { toast } from "sonner"
import { apiService } from "@/lib/api"
import type { PlantillaWhatsApp, ContactoCSV, TemplateComponents } from "@/lib/api-types"

interface BulkMessageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BulkMessageModal({ isOpen, onClose }: BulkMessageModalProps) {
  const [step, setStep] = useState(1)
  const [plantillas, setPlantillas] = useState<PlantillaWhatsApp[]>([])
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaWhatsApp | null>(null)
  const [contactos, setContactos] = useState<ContactoCSV[]>([])
  const [templateParams, setTemplateParams] = useState<TemplateComponents>({
    Header: [],
    Body: [],
    Button: [],
  })
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      const lines = csv.split("\n")
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

      if (!headers.includes("name") || !headers.includes("numero")) {
        toast.error("Formato de archivo incorrecto", {
          description: "El archivo CSV debe tener las columnas 'name' y 'numero'"
        })
        return
      }

      const nameIndex = headers.indexOf("name")
      const numeroIndex = headers.indexOf("numero")

      const contacts: ContactoCSV[] = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line) {
          const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
          if (values[nameIndex] && values[numeroIndex]) {
            contacts.push({
              name: values[nameIndex],
              numero: values[numeroIndex],
            })
          }
        }
      }

      setContactos(contacts)
      setStep(3)
    }
    reader.readAsText(file)
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

  const handleSendMessages = async () => {
    if (!selectedPlantilla || contactos.length === 0) return

    try {
      setSending(true)
      setSendProgress(0)

      const messages = contactos.map((contacto) => ({
        DestinationNumber: contacto.numero,
        FullName: contacto.name,
        TemplateComponents: templateParams,
      }))

      const payload = {
        Template: {
          TemplateName: selectedPlantilla.Name,
          TemplateLanguage: selectedPlantilla.Language,
        },
        Messages: messages,
      }

      // Simular progreso
      const progressInterval = setInterval(() => {
        setSendProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await apiService.enviarMensajesPlantilla(payload)

      clearInterval(progressInterval)
      setSendProgress(100)

      setTimeout(() => {
        toast.success("¡Mensajes enviados exitosamente!", {
          description: `Mensajes enviados a ${contactos.length} contactos`
        })
        handleClose()
      }, 1000)
    } catch (error) {
      console.error("Error sending messages:", error)
      toast.error("Error al enviar mensajes", {
        description: "Por favor, intenta nuevamente."
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedPlantilla(null)
    setContactos([])
    setTemplateParams({ Header: [], Body: [], Button: [] })
    setSendProgress(0)
    onClose()
  }

  const bodyParams = selectedPlantilla?.BodyComponent?.Text ? parseTemplateBody(selectedPlantilla.BodyComponent.Text) : []

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Envío Masivo de Mensajes</h2>
          <div className="flex items-center gap-2">
            <Chip key="step-1" color={step >= 1 ? "success" : "default"} variant={step === 1 ? "solid" : "bordered"} size="sm">
              1. Plantilla
            </Chip>
            <Chip key="step-2" color={step >= 2 ? "success" : "default"} variant={step === 2 ? "solid" : "bordered"} size="sm">
              2. Contactos
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
          {/* Paso 1: Seleccionar Plantilla */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
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

          {/* Paso 2: Subir CSV */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cargar Contactos desde CSV
              </h3>

              <Card>
                <CardBody className="text-center py-8">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="font-semibold mb-2">Sube tu archivo CSV</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    El archivo debe tener las columnas: <code>name</code> y <code>numero</code>
                  </p>
                  <Button
                    color="primary"
                    variant="flat"
                    startContent={<FileText className="h-4 w-4" />}
                    onPress={() => fileInputRef.current?.click()}
                  >
                    Seleccionar Archivo CSV
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </CardBody>
              </Card>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Formato del CSV:</h5>
                <pre className="text-sm bg-white p-2 rounded border">
                  {`name,numero
Juan Pérez,5493513922751
María García,5493518507761
Carlos López,5493519876543`}
                </pre>
              </div>
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
                      <h4 className="font-semibold">Contactos Cargados</h4>
                    </CardHeader>
                    <CardBody>
                      <p className="text-sm text-gray-600 mb-2">
                        Se enviarán mensajes a <strong>{contactos.length}</strong> contactos
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {contactos.slice(0, 5).map((contacto) => (
                          <div key={`${contacto.numero}-${contacto.name}`} className="text-sm bg-gray-50 p-2 rounded">
                            {contacto.name} - {contacto.numero}
                          </div>
                        ))}
                        {contactos.length > 5 && (
                          <p className="text-xs text-gray-500">... y {contactos.length - 5} más</p>
                        )}
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
                        Este mensaje se enviará a todos los contactos del CSV
                      </p>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Paso 4: Enviar */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Send className="h-5 w-5" />
                Confirmar y Enviar Mensajes
              </h3>

              <Card>
                <CardBody>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{contactos.length}</p>
                        <p className="text-sm text-gray-600">Contactos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">{selectedPlantilla?.Name}</p>
                        <p className="text-sm text-gray-600">Plantilla</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning">{bodyParams.length}</p>
                        <p className="text-sm text-gray-600">Parámetros</p>
                      </div>
                    </div>

                    {sending && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Enviando mensajes...</span>
                          <span>{sendProgress}%</span>
                        </div>
                        <Progress value={sendProgress} color="success" />
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              <Accordion>
                <AccordionItem key="preview" title="Ver resumen completo">
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium mb-2">Plantilla seleccionada:</h5>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedPlantilla?.Name}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Vista previa del mensaje:</h5>
                      <div className="text-sm bg-green-50 p-3 rounded border-l-4 border-green-400">
                        {getPreviewMessage()}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Primeros 3 contactos:</h5>
                      <div className="space-y-1">
                        {contactos.slice(0, 3).map((contacto) => (
                          <div key={`summary-${contacto.numero}-${contacto.name}`} className="text-sm bg-gray-50 p-2 rounded">
                            {contacto.name} - {contacto.numero}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionItem>
              </Accordion>
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
            <Button color="primary" onPress={() => setStep(2)} isDisabled={!selectedPlantilla}>
              Siguiente
            </Button>
          )}

          {step === 3 && (
            <Button color="primary" onPress={() => setStep(4)} isDisabled={contactos.length === 0}>
              Continuar
            </Button>
          )}

          {step === 4 && (
            <Button
              color="success"
              onPress={handleSendMessages}
              isLoading={sending}
              startContent={!sending ? <Send className="h-4 w-4" /> : null}
            >
              {sending ? `Enviando... ${sendProgress}%` : `Enviar a ${contactos.length} contactos`}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
