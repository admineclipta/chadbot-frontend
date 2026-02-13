"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  SelectSection,
  Spinner,
  Chip,
  Avatar,
} from "@heroui/react"
import { ArrowLeft, Save, Bot } from "lucide-react"
import { apiService } from "@/lib/api"
import type {
  Assistant,
  AiCredentialResponseDto,
  Team,
  CreateAssistantRequest,
  UpdateAssistantRequest,
} from "@/lib/api-types"
import { toast } from "sonner"

interface AssistantFormProps {
  assistantId?: string
  onBack?: () => void
}

export default function AssistantForm({ assistantId, onBack }: AssistantFormProps) {
  const router = useRouter()
  const isEditMode = !!assistantId

  const modelSections = [
    {
      label: "OpenAI",
      models: [
        { label: "GPT-4o", value: "gpt-4o" },
        { label: "GPT-4.1", value: "gpt-4.1" },
        { label: "GPT-4.5", value: "gpt-4.5" },
        { label: "GPT-5", value: "gpt-5" },
        { label: "GPT-5.2", value: "gpt-5.2" },
        { label: "o1", value: "o1" },
        { label: "o3", value: "o3" },
        { label: "DALL-E", value: "dall-e" },
        { label: "Whisper", value: "whisper" },
      ],
    },
    {
      label: "Google (DeepMind)",
      models: [
        { label: "Gemini 1.5", value: "gemini-1.5" },
        { label: "Gemini 2.x", value: "gemini-2" },
        { label: "PaLM 2", value: "palm-2" },
      ],
    },
    {
      label: "Anthropic",
      models: [
        { label: "Claude 3 Haiku", value: "claude-3-haiku" },
        { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
        { label: "Claude 3 Opus", value: "claude-3-opus" },
        { label: "Claude 3.5 Sonnet", value: "claude-3.5-sonnet" },
        { label: "Claude 3.5 Opus", value: "claude-3.5-opus" },
      ],
    },
    {
      label: "Meta",
      models: [
        { label: "Llama 2", value: "llama-2" },
        { label: "Llama 3", value: "llama-3" },
        { label: "Llama 3.1", value: "llama-3.1" },
        { label: "Llama 3.2", value: "llama-3.2" },
        { label: "Code Llama", value: "code-llama" },
      ],
    },
  ]

  const modelValues = new Set(
    modelSections.flatMap((section) => section.models.map((model) => model.value)),
  )

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [credentialId, setCredentialId] = useState("")
  const [teamId, setTeamId] = useState<string>("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [temperature, setTemperature] = useState("")
  const [model, setModel] = useState("")
  const [maxTokens, setMaxTokens] = useState("")
  const [topP, setTopP] = useState("")
  const [presencePenalty, setPresencePenalty] = useState("")
  const [frequencyPenalty, setFrequencyPenalty] = useState("")
  const [isCustomModel, setIsCustomModel] = useState(false)

  // Data states
  const [credentials, setCredentials] = useState<AiCredentialResponseDto[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [assistant, setAssistant] = useState<Assistant | null>(null)

  useEffect(() => {
    loadFormData()
  }, [assistantId])

  const loadFormData = async () => {
    try {
      setLoadingData(true)

      // Cargar credenciales y equipos en paralelo
      const [credentialsResponse, teamsResponse] = await Promise.all([
        apiService.getAiCredentials(),
        apiService.getTeams(0, 100),
      ])

      // Filtrar solo credenciales activas
      setCredentials(credentialsResponse.content.filter(cred => cred.active))
      setTeams(teamsResponse.content)

      // Si es modo edición, cargar datos del asistente
      if (assistantId) {
        const assistantData = await apiService.getAssistantById(assistantId)
        setAssistant(assistantData)
        setName(assistantData.name)
        setDescription(assistantData.description)
        setCredentialId(assistantData.credentialId)
        setTeamId(assistantData.teamId || "")

        const metadata = assistantData.metadata || {}
        setSystemPrompt(metadata.system_prompt || "")
        setTemperature(
          metadata.temperature !== undefined && metadata.temperature !== null
            ? String(metadata.temperature)
            : "",
        )
        setMaxTokens(
          metadata.max_tokens !== undefined && metadata.max_tokens !== null
            ? String(metadata.max_tokens)
            : "",
        )
        setTopP(
          metadata.top_p !== undefined && metadata.top_p !== null
            ? String(metadata.top_p)
            : "",
        )
        setPresencePenalty(
          metadata.presence_penalty !== undefined &&
          metadata.presence_penalty !== null
            ? String(metadata.presence_penalty)
            : "",
        )
        setFrequencyPenalty(
          metadata.frequency_penalty !== undefined &&
          metadata.frequency_penalty !== null
            ? String(metadata.frequency_penalty)
            : "",
        )

        const incomingModel = metadata.model || ""
        setModel(incomingModel)
        setIsCustomModel(Boolean(incomingModel && !modelValues.has(incomingModel)))
      }
    } catch (error) {
      console.error("Error loading form data:", error)
      toast.error("Error al cargar los datos del formulario")
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    if (!credentialId) {
      toast.error("Debes seleccionar una credencial de IA")
      return
    }

    try {
      setLoading(true)

      const metadata: Record<string, any> = {}
      const trimmedSystemPrompt = systemPrompt.trim()
      const trimmedModel = model.trim()
      const parsedTemperature = temperature.trim()
        ? Number.parseFloat(temperature)
        : null
      const parsedMaxTokens = maxTokens.trim()
        ? Number.parseInt(maxTokens, 10)
        : null
      const parsedTopP = topP.trim() ? Number.parseFloat(topP) : null
      const parsedPresencePenalty = presencePenalty.trim()
        ? Number.parseFloat(presencePenalty)
        : null
      const parsedFrequencyPenalty = frequencyPenalty.trim()
        ? Number.parseFloat(frequencyPenalty)
        : null

      if (trimmedSystemPrompt) metadata.system_prompt = trimmedSystemPrompt
      if (trimmedModel) metadata.model = trimmedModel
      if (parsedTemperature !== null && !Number.isNaN(parsedTemperature))
        metadata.temperature = parsedTemperature
      if (parsedMaxTokens !== null && !Number.isNaN(parsedMaxTokens))
        metadata.max_tokens = parsedMaxTokens
      if (parsedTopP !== null && !Number.isNaN(parsedTopP))
        metadata.top_p = parsedTopP
      if (parsedPresencePenalty !== null && !Number.isNaN(parsedPresencePenalty))
        metadata.presence_penalty = parsedPresencePenalty
      if (parsedFrequencyPenalty !== null && !Number.isNaN(parsedFrequencyPenalty))
        metadata.frequency_penalty = parsedFrequencyPenalty

      if (isEditMode) {
        const updateData: UpdateAssistantRequest = {
          name: name.trim(),
          description: description.trim(),
          credentialId,
          ...(teamId && { teamId }),
          ...(Object.keys(metadata).length > 0 && { metadata }),
        }
        await apiService.updateAssistant(assistantId, updateData)
        toast.success("Asistente actualizado exitosamente")
      } else {
        const createData: CreateAssistantRequest = {
          name: name.trim(),
          description: description.trim(),
          credentialId,
          ...(teamId && { teamId }),
          ...(Object.keys(metadata).length > 0 && { metadata }),
        }
        await apiService.createAssistant(createData)
        toast.success("Asistente creado exitosamente")
      }

      if (onBack) {
        onBack()
      } else {
        router.push("/")
      }
    } catch (error) {
      console.error("Error saving assistant:", error)
      toast.error(
        isEditMode
          ? "Error al actualizar el asistente"
          : "Error al crear el asistente"
      )
    } finally {
      setLoading(false)
    }
  }

  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="flat"
          onPress={() => {
            if (onBack) {
              onBack()
            } else {
              router.push("/")
            }
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Editar Asistente" : "Nuevo Asistente"}
          </h1>
          <p className="text-default-500 mt-1">
            {isEditMode
              ? "Modifica la configuración del asistente"
              : "Configura un nuevo asistente de IA"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold">
                Información del Asistente
              </span>
            </div>
          </CardHeader>
          <CardBody className="gap-4">
            {/* Nombre */}
            <Input
              label="Nombre"
              placeholder="Ej: Asistente de Ventas"
              value={name}
              onValueChange={setName}
              isRequired
              variant="bordered"
            />

            {/* Descripción */}
            <Textarea
              label="Descripción"
              placeholder="Describe la función de este asistente..."
              value={description}
              onValueChange={setDescription}
              minRows={3}
              variant="bordered"
            />

            {/* Credencial de IA */}
            <Select
              label="Credencial de IA"
              placeholder={
                credentials.length === 0
                  ? "No hay credenciales configuradas"
                  : "Selecciona una credencial"
              }
              selectedKeys={credentialId ? [credentialId] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setCredentialId(selected)
              }}
              isRequired
              variant="bordered"
              isDisabled={credentials.length === 0}
              renderValue={(items) => {
                return items.map((item) => {
                  const credential = credentials.find((c) => c.id === item.key)
                  if (!credential) return null
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <span>{credential.name}</span>
                      <span className="text-default-500 text-sm">
                        ({credential.metadata?.model || "Sin modelo"})
                      </span>
                    </div>
                  )
                })
              }}
            >
              {credentials.map((credential) => (
                <SelectItem key={credential.id}>
                  {credential.name} ({credential.metadata?.model || "Sin modelo"})
                </SelectItem>
              ))}
            </Select>

            {credentials.length === 0 && (
              <p className="text-sm text-warning">
                No tienes credenciales de IA configuradas. Por favor, configura
                una antes de crear un asistente.
              </p>
            )}

            {/* Equipo (opcional) */}
            <Select
              label="Equipo (Opcional)"
              placeholder="Selecciona un equipo"
              selectedKeys={teamId ? [teamId] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setTeamId(selected || "")
              }}
              variant="bordered"
              renderValue={(items) => {
                return items.map((item) => {
                  const team = teams.find((t) => t.id === item.key)
                  if (!team) return null
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <Avatar
                        name={getTeamInitials(team.name)}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <span>{team.name}</span>
                    </div>
                  )
                })
              }}
            >
              {teams.map((team) => (
                <SelectItem
                  key={team.id}
                  startContent={
                    <Avatar
                      name={getTeamInitials(team.name)}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  }
                >
                  {team.name}
                </SelectItem>
              ))}
            </Select>

            {/* Metadata - System Prompt */}
            <Textarea
              label="System Prompt (Opcional)"
              placeholder="Eres un asistente experto en..."
              value={systemPrompt}
              onValueChange={setSystemPrompt}
              minRows={4}
              variant="bordered"
              description="Instrucciones base para el comportamiento del asistente"
            />

            {/* Metadata - Temperature */}
            <Input
              label="Temperature (Opcional)"
              placeholder="0.7"
              value={temperature}
              onValueChange={setTemperature}
              type="number"
              step="0.1"
              min="0"
              max="2"
              variant="bordered"
              description="Controla la creatividad (0 = determinista, 2 = muy creativo)"
            />

            {/* Metadata - Model */}
            <Select
              label="Modelo (Opcional)"
              placeholder="Selecciona un modelo"
              selectedKeys={
                isCustomModel
                  ? ["custom"]
                  : model
                  ? [model]
                  : []
              }
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                if (selected === "custom") {
                  setIsCustomModel(true)
                  setModel("")
                  return
                }
                setIsCustomModel(false)
                setModel(selected || "")
              }}
              variant="bordered"
              description="Sobrescribe el modelo de la credencial seleccionada"
              isClearable
              onClear={() => {
                setIsCustomModel(false)
                setModel("")
              }}
            >
              {modelSections.map((section) => (
                <SelectSection key={section.label} title={section.label}>
                  {section.models.map((option) => (
                    <SelectItem key={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectSection>
              ))}
              <SelectSection title="Personalizado">
                <SelectItem key="custom">Otro modelo</SelectItem>
              </SelectSection>
            </Select>

            {isCustomModel && (
              <Input
                label="Modelo personalizado"
                placeholder="gpt-5.2"
                value={model}
                onValueChange={setModel}
                variant="bordered"
                description="Ingresa el codigo exacto del modelo"
              />
            )}

            {/* Metadata - Max tokens */}
            <Input
              label="Max tokens (Opcional)"
              placeholder="2048"
              value={maxTokens}
              onValueChange={setMaxTokens}
              type="number"
              step="1"
              min="1"
              variant="bordered"
            />

            {/* Metadata - Top P */}
            <Input
              label="Top P (Opcional)"
              placeholder="1.0"
              value={topP}
              onValueChange={setTopP}
              type="number"
              step="0.1"
              min="0"
              max="1"
              variant="bordered"
            />

            {/* Metadata - Presence penalty */}
            <Input
              label="Presence penalty (Opcional)"
              placeholder="0"
              value={presencePenalty}
              onValueChange={setPresencePenalty}
              type="number"
              step="0.1"
              min="-2"
              max="2"
              variant="bordered"
            />

            {/* Metadata - Frequency penalty */}
            <Input
              label="Frequency penalty (Opcional)"
              placeholder="0"
              value={frequencyPenalty}
              onValueChange={setFrequencyPenalty}
              type="number"
              step="0.1"
              min="-2"
              max="2"
              variant="bordered"
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="flat"
                onPress={() => {
                  if (onBack) {
                    onBack()
                  } else {
                    router.push("/")
                  }
                }}
                isDisabled={loading}
              >
                Cancelar
              </Button>
              <Button
                color="primary"
                type="submit"
                isLoading={loading}
                startContent={!loading && <Save className="w-4 h-4" />}
              >
                {loading
                  ? "Guardando..."
                  : isEditMode
                  ? "Actualizar Asistente"
                  : "Crear Asistente"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>

      {/* Status Info (solo en modo edición) */}
      {isEditMode && assistant && (
        <Card>
          <CardHeader>
            <span className="text-lg font-semibold">Estado del Asistente</span>
          </CardHeader>
          <CardBody className="gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-default-500">Estado:</span>
              {assistant.isDefault && (
                <Chip size="sm" color="success" variant="flat">
                  Por defecto
                </Chip>
              )}
              {assistant.isActive ? (
                <Chip size="sm" color="primary" variant="flat">
                  Activo
                </Chip>
              ) : (
                <Chip size="sm" color="default" variant="flat">
                  Inactivo
                </Chip>
              )}
            </div>
            <div className="text-sm text-default-500">
              <p>Creado: {new Date(assistant.createdAt).toLocaleString("es-AR")}</p>
              <p>Actualizado: {new Date(assistant.updatedAt).toLocaleString("es-AR")}</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
