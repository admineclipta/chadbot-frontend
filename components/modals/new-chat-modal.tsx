"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react"
import { MessageCircle, Search, Send, User } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"
import { apiService, ApiError } from "@/lib/api"
import type {
  Contact,
  CreateOutboundConversationRequest,
  CreateOutboundConversationResponse,
  OutboundConfigCredential,
  OutboundErrorCode,
} from "@/lib/api-types"

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (result: CreateOutboundConversationResponse) => void
}

interface DynamicField {
  key: string
  description: string
  examples: string[]
  required: boolean
}

const OUTBOUND_ERROR_MESSAGES: Record<OutboundErrorCode, string> = {
  OUTBOUND_001: "Canal no habilitado para outbound V1.",
  OUTBOUND_002: "Telegram requiere inbound previo. Outbound V1 no lo permite.",
  OUTBOUND_003: "En V1 el mensaje inicial debe ser solo texto.",
  OUTBOUND_004: "Falta externalContactId para poder crear el canal del contacto.",
}

function inferRegexByExamples(examples: string[]): RegExp | null {
  if (!examples || examples.length === 0) return null
  const normalized = examples
    .map((example) => String(example).trim())
    .filter(Boolean)

  if (normalized.length === 0) return null

  const allDigits = normalized.every((example) => /^\d+$/.test(example))
  if (allDigits) return /^\d+$/

  const allWhatsappJidOrDigits = normalized.every((example) =>
    /^\d+(@s\.whatsapp\.net)?$/.test(example),
  )
  if (allWhatsappJidOrDigits) return /^\d+(@s\.whatsapp\.net)?$/

  return null
}

function extractDynamicRecipientFields(
  credential: OutboundConfigCredential | null,
): DynamicField[] {
  if (!credential?.recipientJsonSchema?.properties) return []

  const properties = credential.recipientJsonSchema.properties
  const required = credential.recipientJsonSchema.required || []

  return Object.entries(properties)
    .filter(([key, value]) => {
      const schema = value as Record<string, unknown>
      const type = schema.type
      return key !== "metadata" && type === "string"
    })
    .map(([key, value]) => {
      const schema = value as Record<string, unknown>
      const examples = Array.isArray(schema.examples)
        ? schema.examples.map((item) => String(item))
        : []

      return {
        key,
        description:
          typeof schema.description === "string" && schema.description.trim()
            ? schema.description
            : key,
        examples,
        required: required.includes(key),
      }
    })
}

function getContactChannelsLabel(contact: Contact): string {
  const unique = Array.from(
    new Set(
      (contact.messagingChannels || [])
        .map((channel) => channel.serviceTypeName)
        .filter(Boolean),
    ),
  )

  if (unique.length === 0) return "Sin canales"
  return unique.join(" · ")
}

export default function NewChatModal({
  isOpen,
  onClose,
  onSuccess,
}: NewChatModalProps) {
  const [step, setStep] = useState(1)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [sending, setSending] = useState(false)

  const [credentials, setCredentials] = useState<OutboundConfigCredential[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState("")

  const [contactMode, setContactMode] = useState<"new" | "existing">("new")
  const [fullName, setFullName] = useState("")
  const [existingContactId, setExistingContactId] = useState("")
  const [existingContactSearch, setExistingContactSearch] = useState("")
  const [existingContacts, setExistingContacts] = useState<Contact[]>([])
  const [recipientValues, setRecipientValues] = useState<Record<string, string>>(
    {},
  )
  const [initialMessage, setInitialMessage] = useState("")

  const selectedCredential = useMemo(
    () =>
      credentials.find((item) => item.credentialId === selectedCredentialId) ||
      null,
    [credentials, selectedCredentialId],
  )

  const recipientFields = useMemo(
    () => extractDynamicRecipientFields(selectedCredential),
    [selectedCredential],
  )

  const selectedExistingContact = useMemo(
    () => existingContacts.find((item) => item.id === existingContactId) || null,
    [existingContacts, existingContactId],
  )

  const resetForm = () => {
    setStep(1)
    setSelectedCredentialId("")
    setContactMode("new")
    setFullName("")
    setExistingContactId("")
    setExistingContactSearch("")
    setExistingContacts([])
    setRecipientValues({})
    setInitialMessage("")
  }

  const handleClose = () => {
    if (sending) return
    resetForm()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return

    const loadConfig = async () => {
      try {
        setLoadingConfig(true)
        const response = await apiService.getOutboundConversationConfig()
        const items = Array.isArray(response.credentials)
          ? response.credentials
          : []
        setCredentials(items)

        if (items.length === 1) {
          setSelectedCredentialId(items[0].credentialId)
        }
      } catch (error) {
        console.error("Error loading outbound config:", error)
        toast.error("No se pudo cargar la configuracion outbound")
      } finally {
        setLoadingConfig(false)
      }
    }

    void loadConfig()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || contactMode !== "existing") return

    const abortController = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setLoadingContacts(true)
        const response = await apiService.getContacts(
          0,
          20,
          existingContactSearch.trim() || undefined,
          abortController.signal,
        )
        setExistingContacts(response.content)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        console.error("Error loading contacts:", error)
        toast.error("No se pudieron cargar contactos")
      } finally {
        setLoadingContacts(false)
      }
    }, 250)

    return () => {
      abortController.abort()
      clearTimeout(timeout)
    }
  }, [isOpen, contactMode, existingContactSearch])

  useEffect(() => {
    // Clean stale keys when credential changes schema.
    setRecipientValues((prev) => {
      if (!selectedCredential) return {}
      const allowedKeys = new Set(recipientFields.map((field) => field.key))
      const next = Object.entries(prev).filter(([key]) => allowedKeys.has(key))
      return Object.fromEntries(next)
    })
  }, [selectedCredential, recipientFields])

  const recipientValidationErrors = useMemo(() => {
    const errors: Record<string, string> = {}

    recipientFields.forEach((field) => {
      const value = (recipientValues[field.key] || "").trim()
      if (field.required && !value) {
        errors[field.key] = "Campo requerido"
        return
      }

      if (!value) return

      const regex = inferRegexByExamples(field.examples)
      if (regex && !regex.test(value)) {
        errors[field.key] = "Formato invalido para este campo"
      }
    })

    return errors
  }, [recipientFields, recipientValues])

  const selectedContactHasChannelForCredential = useMemo(() => {
    if (!selectedExistingContact || !selectedCredentialId) return false
    return (selectedExistingContact.messagingChannels || []).some(
      (channel) => channel.credentialId === selectedCredentialId,
    )
  }, [selectedCredentialId, selectedExistingContact])

  const shouldRequireRecipientFields =
    contactMode === "new" ||
    (contactMode === "existing" &&
      Boolean(selectedExistingContact) &&
      !selectedContactHasChannelForCredential)

  const areRecipientFieldsValid = useMemo(() => {
    if (!shouldRequireRecipientFields) return true
    return recipientFields.every((field) => {
      const value = (recipientValues[field.key] || "").trim()
      const hasError = Boolean(recipientValidationErrors[field.key])
      if (field.required && !value) return false
      return !hasError
    })
  }, [
    recipientFields,
    recipientValidationErrors,
    recipientValues,
    shouldRequireRecipientFields,
  ])

  const isStepOneValid = Boolean(selectedCredentialId)
  const isStepTwoValid =
    contactMode === "new"
      ? fullName.trim().length > 0 && areRecipientFieldsValid
      : existingContactId.length > 0 && areRecipientFieldsValid
  const isStepThreeValid = initialMessage.trim().length > 0

  const handleSubmit = async () => {
    if (!isStepOneValid || !isStepTwoValid || !isStepThreeValid) return

    const payload: CreateOutboundConversationRequest = {
      credentialId: selectedCredentialId,
      contact:
        contactMode === "new"
          ? {
              mode: "new",
              fullName: fullName.trim(),
            }
          : {
              mode: "existing",
              contactId: existingContactId,
            },
      initialMessage: {
        type: "text",
        text: initialMessage.trim(),
      },
    }

    if (shouldRequireRecipientFields) {
      const externalContactId =
        recipientValues.externalContactId?.trim() || ""

      payload.recipient = {
        externalContactId,
      }
    }

    try {
      setSending(true)
      const result = await apiService.createOutboundConversation(payload)

      if (onSuccess) {
        onSuccess(result)
      } else {
        toast.success("Conversacion creada", {
          description: result.reusedConversation
            ? "Se reutilizo una conversacion existente"
            : "Se creo una conversacion nueva",
        })
      }

      handleClose()
    } catch (error) {
      console.error("Error creating outbound conversation:", error)

      if (error instanceof ApiError && error.errorCode) {
        const outboundCode = error.errorCode as OutboundErrorCode
        const message = OUTBOUND_ERROR_MESSAGES[outboundCode]
        if (message) {
          toast.error("No se pudo crear la conversacion", {
            description: message,
          })
          return
        }
      }

      toast.error("No se pudo crear la conversacion", {
        description:
          error instanceof ApiError
            ? error.message
            : "Error inesperado al crear conversacion outbound",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <MessageCircle className="h-5 w-5 text-primary" />
            Nueva conversacion
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              size="sm"
              color={step >= 1 ? "primary" : "default"}
              variant={step === 1 ? "solid" : "flat"}
            >
              1. Credencial
            </Chip>
            <Chip
              size="sm"
              color={step >= 2 ? "primary" : "default"}
              variant={step === 2 ? "solid" : "flat"}
            >
              2. Contacto
            </Chip>
            <Chip
              size="sm"
              color={step >= 3 ? "primary" : "default"}
              variant={step === 3 ? "solid" : "flat"}
            >
              3. Mensaje
            </Chip>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              {loadingConfig ? (
                <div className="py-5 text-sm text-slate-500 dark:text-slate-400">
                  Cargando credenciales...
                </div>
              ) : credentials.length === 0 ? (
                <div className="py-5 text-sm text-slate-500 dark:text-slate-400">
                  No hay credenciales outbound activas.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {credentials.map((credential) => {
                    const isSelected =
                      selectedCredentialId === credential.credentialId

                    return (
                      <button
                        key={credential.credentialId}
                        type="button"
                        onClick={() =>
                          setSelectedCredentialId(credential.credentialId)
                        }
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {credential.credentialName ||
                            credential.name ||
                            credential.credentialId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {credential.serviceTypeName ||
                            credential.serviceTypeCode ||
                            "Evolution API"}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Tabs
                selectedKey={contactMode}
                onSelectionChange={(value) => {
                  const mode = String(value) as "new" | "existing"
                  setContactMode(mode)
                  setRecipientValues({})
                }}
                variant="underlined"
                color="primary"
              >
                <Tab key="new" title="Nuevo">
                  <div className="space-y-3 pt-3">
                    <Input
                      label="Nombre completo"
                      placeholder="Ej: Juan Perez"
                      startContent={<User className="h-4 w-4 text-slate-400" />}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      isRequired
                    />

                    {recipientFields.map((field) => {
                      const value = recipientValues[field.key] || ""
                      return (
                        <Input
                          key={field.key}
                          label={field.description}
                          placeholder={
                            field.examples.length > 0
                              ? `Ej: ${field.examples.join(" | ")}`
                              : "Completa este campo"
                          }
                          value={value}
                          onChange={(event) =>
                            setRecipientValues((prev) => ({
                              ...prev,
                              [field.key]: event.target.value.trim(),
                            }))
                          }
                          isRequired={field.required}
                          isInvalid={Boolean(recipientValidationErrors[field.key])}
                          errorMessage={recipientValidationErrors[field.key]}
                        />
                      )
                    })}
                  </div>
                </Tab>

                <Tab key="existing" title="Existente">
                  <div className="space-y-3 pt-3">
                    <Input
                      label="Buscar contacto"
                      placeholder="Buscar por nombre"
                      value={existingContactSearch}
                      onChange={(event) =>
                        setExistingContactSearch(event.target.value)
                      }
                      isClearable
                      onClear={() => setExistingContactSearch("")}
                      startContent={<Search className="h-4 w-4 text-slate-400" />}
                    />

                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      {loadingContacts ? (
                        <div className="space-y-2 py-1" aria-hidden="true">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <div
                              key={`contact-skeleton-${index}`}
                              className="h-14 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/70"
                            />
                          ))}
                        </div>
                      ) : existingContacts.length === 0 ? (
                        <div className="py-3 text-sm text-slate-500 dark:text-slate-400">
                          No hay resultados.
                        </div>
                      ) : (
                        existingContacts.map((contact) => {
                          const isSelected = existingContactId === contact.id
                          return (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => setExistingContactId(contact.id)}
                              className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                              }`}
                            >
                              <Avatar name={contact.fullName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {contact.fullName}
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {getContactChannelsLabel(contact)}
                                </p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>

                    {selectedExistingContact && shouldRequireRecipientFields && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                        El contacto no tiene canal para esta credencial. Completa los datos de destino.
                      </div>
                    )}

                    {shouldRequireRecipientFields &&
                      recipientFields.map((field) => {
                        const value = recipientValues[field.key] || ""
                        return (
                          <Input
                            key={field.key}
                            label={field.description}
                            placeholder={
                              field.examples.length > 0
                                ? `Ej: ${field.examples.join(" | ")}`
                                : "Completa este campo"
                            }
                            value={value}
                            onChange={(event) =>
                              setRecipientValues((prev) => ({
                                ...prev,
                                [field.key]: event.target.value.trim(),
                              }))
                            }
                            isRequired={field.required}
                            isInvalid={Boolean(
                              recipientValidationErrors[field.key],
                            )}
                            errorMessage={recipientValidationErrors[field.key]}
                          />
                        )
                      })}
                  </div>
                </Tab>
              </Tabs>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Textarea
                label="Mensaje"
                placeholder="Escribe tu mensaje"
                minRows={4}
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                isRequired
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleClose} isDisabled={sending}>
            Cancelar
          </Button>

          {step > 1 && (
            <Button
              variant="flat"
              onPress={() => setStep((prev) => prev - 1)}
              isDisabled={sending}
            >
              Anterior
            </Button>
          )}

          {step === 1 && (
            <Button
              color="primary"
              onPress={() => setStep(2)}
              isDisabled={!isStepOneValid || loadingConfig}
            >
              Siguiente
            </Button>
          )}

          {step === 2 && (
            <Button
              color="primary"
              onPress={() => setStep(3)}
              isDisabled={!isStepTwoValid}
            >
              Siguiente
            </Button>
          )}

          {step === 3 && (
            <Button
              color="success"
              onPress={handleSubmit}
              isLoading={sending}
              isDisabled={!isStepThreeValid}
              startContent={!sending ? <Send className="h-4 w-4" /> : undefined}
            >
              {sending ? "Creando..." : "Crear conversacion"}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
