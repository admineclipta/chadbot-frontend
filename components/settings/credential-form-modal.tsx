"use client"

import { useState, useEffect } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Divider,
} from "@heroui/react"
import { Plus, Trash2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { toast } from "sonner"
import type { ServiceTypeDto } from "@/lib/api-types"

interface CredentialFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  credential?: any
  services: ServiceTypeDto[]
  type: "messaging" | "ai"
}

// Campos recomendados por servicio
const RECOMMENDED_FIELDS: Record<string, string[]> = {
  // Messaging - WhatsApp
  whatsapp: ["access_token", "phone_number_id", "business_account_id", "webhook_verify_token"],
  // AI - OpenAI
  openai: ["apiKey", "model", "temperature", "maxTokens", "topP"],
  // Defaults
  messaging: ["access_token", "phone_number", "webhook_verify_token"],
  ai: ["apiKey", "model", "temperature"],
}

export default function CredentialFormModal({
  isOpen,
  onClose,
  onSuccess,
  credential,
  services,
  type,
}: CredentialFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serviceTypeId, setServiceTypeId] = useState<string>("")
  const [name, setName] = useState("")
  const [webhookIdentity, setWebhookIdentity] = useState("")
  const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>([])
  
  // AI-specific fields
  const [usageLimit, setUsageLimit] = useState("")
  const [usageUnit, setUsageUnit] = useState("tokens")
  const [usageResetAt, setUsageResetAt] = useState("")

  useEffect(() => {
    if (credential) {
      // Edit mode
      setServiceTypeId(credential.serviceTypeId.toString())
      setName(credential.name)
      setWebhookIdentity(credential.webhookIdentity || "")
      
      // Convert metadata to key-value pairs
      const fields = Object.entries(credential.metadata || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }))
      setMetadataFields(fields)

      // AI-specific
      if (type === "ai") {
        setUsageLimit(credential.usageLimit?.toString() || "")
        setUsageUnit(credential.usageUnit || "tokens")
        setUsageResetAt(credential.usageResetAt || "")
      }
    } else {
      // Create mode - reset all fields
      resetForm()
    }
  }, [credential, isOpen])

  const resetForm = () => {
    setServiceTypeId("")
    setName("")
    setWebhookIdentity("")
    setMetadataFields([])
    setUsageLimit("")
    setUsageUnit("tokens")
    setUsageResetAt("")
  }

  const getRecommendedFields = () => {
    if (!serviceTypeId) return []
    
    const service = services.find(s => s.id.toString() === serviceTypeId)
    if (!service) return []

    const serviceCode = service.code.toLowerCase()
    return RECOMMENDED_FIELDS[serviceCode] || RECOMMENDED_FIELDS[type] || []
  }

  const initializeRecommendedFields = () => {
    const recommended = getRecommendedFields()
    const existingKeys = new Set(metadataFields.map(f => f.key))
    
    const newFields = recommended
      .filter(key => !existingKeys.has(key))
      .map(key => ({ key, value: "" }))
    
    setMetadataFields([...metadataFields, ...newFields])
  }

  const addMetadataField = () => {
    setMetadataFields([...metadataFields, { key: "", value: "" }])
  }

  const removeMetadataField = (index: number) => {
    setMetadataFields(metadataFields.filter((_, i) => i !== index))
  }

  const updateMetadataField = (index: number, field: "key" | "value", value: string) => {
    const newFields = [...metadataFields]
    newFields[index][field] = value
    setMetadataFields(newFields)
  }

  const handleSubmit = async () => {
    // Validation
    if (!serviceTypeId) {
      toast.error("Selecciona un servicio")
      return
    }
    if (!name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (type === "messaging" && !webhookIdentity.trim()) {
      toast.error("El webhook identity es requerido")
      return
    }

    // Convert metadata fields to object
    const metadata: Record<string, any> = {}
    for (const field of metadataFields) {
      if (field.key.trim()) {
        metadata[field.key] = field.value
      }
    }

    try {
      setIsSubmitting(true)

      if (type === "messaging") {
        const data = {
          serviceTypeId: parseInt(serviceTypeId),
          name: name.trim(),
          webhookIdentity: webhookIdentity.trim(),
          metadata,
        }

        if (credential) {
          await apiService.updateMessagingCredential(credential.id, data)
          toast.success("Credencial actualizada exitosamente")
        } else {
          await apiService.createMessagingCredential(data)
          toast.success("Credencial creada exitosamente")
        }
      } else {
        const data: any = {
          serviceTypeId: parseInt(serviceTypeId),
          name: name.trim(),
          metadata,
        }

        if (usageLimit) {
          data.usageLimit = parseInt(usageLimit)
        }
        if (usageUnit) {
          data.usageUnit = usageUnit
        }
        if (usageResetAt) {
          data.usageResetAt = usageResetAt
        }

        if (credential) {
          await apiService.updateAiCredential(credential.id, data)
          toast.success("Credencial actualizada exitosamente")
        } else {
          await apiService.createAiCredential(data)
          toast.success("Credencial creada exitosamente")
        }
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving credential:", error)
      toast.error("Error al guardar la credencial")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          {credential ? "Editar" : "Nueva"} Credencial {type === "messaging" ? "de Mensajería" : "de IA"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Servicio"
              placeholder="Selecciona un servicio"
              selectedKeys={serviceTypeId ? [serviceTypeId] : []}
              onChange={(e) => setServiceTypeId(e.target.value)}
              isRequired
            >
              {services.map((service) => (
                <SelectItem key={service.id.toString()}>
                  {service.name}
                </SelectItem>
              ))}
            </Select>

            <Input
              label="Nombre"
              placeholder="Ej: WhatsApp Principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
            />

            {type === "messaging" && (
              <Input
                label="Webhook Identity"
                placeholder="Identificador único del webhook"
                value={webhookIdentity}
                onChange={(e) => setWebhookIdentity(e.target.value)}
                isRequired
              />
            )}

            {type === "ai" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Límite de Uso"
                    placeholder="Ej: 1000000"
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                  />
                  <Input
                    label="Unidad de Uso"
                    placeholder="Ej: tokens"
                    value={usageUnit}
                    onChange={(e) => setUsageUnit(e.target.value)}
                  />
                </div>
                <Input
                  label="Reset de Uso"
                  type="datetime-local"
                  value={usageResetAt}
                  onChange={(e) => setUsageResetAt(e.target.value)}
                />
              </>
            )}

            <Divider className="my-2" />

            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-semibold">Metadata</p>
                  <p className="text-xs text-default-500">
                    Configuración específica del servicio (pares clave-valor)
                  </p>
                </div>
                <div className="flex gap-2">
                  {metadataFields.length === 0 && serviceTypeId && (
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      onPress={initializeRecommendedFields}
                    >
                      Campos Recomendados
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    startContent={<Plus className="h-3 w-3" />}
                    onPress={addMetadataField}
                  >
                    Agregar Campo
                  </Button>
                </div>
              </div>

              {metadataFields.length === 0 ? (
                <div className="text-center py-4 text-sm text-default-400">
                  No hay campos de metadata. Haz clic en "Agregar Campo" o "Campos Recomendados"
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {metadataFields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <Input
                        placeholder="Clave"
                        value={field.key}
                        onChange={(e) => updateMetadataField(index, "key", e.target.value)}
                        size="sm"
                        classNames={{ base: "flex-1" }}
                      />
                      <Input
                        placeholder="Valor"
                        value={field.value}
                        onChange={(e) => updateMetadataField(index, "value", e.target.value)}
                        size="sm"
                        classNames={{ base: "flex-1" }}
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={() => removeMetadataField(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color={type === "messaging" ? "primary" : "secondary"}
            onPress={handleSubmit}
            isLoading={isSubmitting}
          >
            {credential ? "Actualizar" : "Crear"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
