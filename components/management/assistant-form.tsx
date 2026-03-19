"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Accordion,
  AccordionItem,
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  SelectSection,
  Spinner,
  Switch,
  Textarea,
} from "@heroui/react"
import { ArrowLeft, Bot, Save } from "lucide-react"
import { apiService } from "@/lib/api"
import type {
  AiCredentialResponseDto,
  Assistant,
  AssistantMetadata,
  CreateAssistantRequest,
  ReroutePolicy,
  Team,
  UpdateAssistantRequest,
} from "@/lib/api-types"
import { toast } from "sonner"

interface AssistantFormProps {
  assistantId?: string
  onBack?: () => void
  onSuccess?: () => void
  mode?: "page" | "drawer-create" | "drawer-edit"
}

const DEFAULT_ASSISTANT_MODEL = "gpt-5.2"
const DEFAULT_REROUTE_MIN_MESSAGES = 3
const DEFAULT_REROUTE_MIN_MINUTES = 10
const DEFAULT_REROUTE_HISTORY_WINDOW = 6
const DEFAULT_REROUTE_FALLBACK_TEXT = "¿Querés que te ayude con otro tema?"

function parseNumberOrDefault(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function getDefaultReroutePolicy(model: string): ReroutePolicy {
  return {
    enabled: true,
    min_messages: DEFAULT_REROUTE_MIN_MESSAGES,
    min_minutes: DEFAULT_REROUTE_MIN_MINUTES,
    history_window: DEFAULT_REROUTE_HISTORY_WINDOW,
    fallback_clarification_text: DEFAULT_REROUTE_FALLBACK_TEXT,
    model: model || DEFAULT_ASSISTANT_MODEL,
  }
}

export default function AssistantForm({
  assistantId,
  onBack,
  onSuccess,
  mode = "page",
}: AssistantFormProps) {
  const router = useRouter()
  const isEditMode = !!assistantId
  const isDrawerMode = mode === "drawer-create" || mode === "drawer-edit"
  const isDrawerCreateMode = mode === "drawer-create" && !isEditMode

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

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [credentialId, setCredentialId] = useState("")
  const [teamId, setTeamId] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [temperature, setTemperature] = useState("")
  const [model, setModel] = useState(DEFAULT_ASSISTANT_MODEL)
  const [maxTokens, setMaxTokens] = useState("")
  const [topP, setTopP] = useState("")
  const [presencePenalty, setPresencePenalty] = useState("")
  const [frequencyPenalty, setFrequencyPenalty] = useState("")
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [isRouter, setIsRouter] = useState(false)
  const [assistantMetadata, setAssistantMetadata] = useState<AssistantMetadata>({})
  const [rerouteEnabled, setRerouteEnabled] = useState(true)
  const [rerouteMinMessages, setRerouteMinMessages] = useState(
    String(DEFAULT_REROUTE_MIN_MESSAGES),
  )
  const [rerouteMinMinutes, setRerouteMinMinutes] = useState(
    String(DEFAULT_REROUTE_MIN_MINUTES),
  )
  const [rerouteHistoryWindow, setRerouteHistoryWindow] = useState(
    String(DEFAULT_REROUTE_HISTORY_WINDOW),
  )
  const [rerouteFallbackText, setRerouteFallbackText] = useState(
    DEFAULT_REROUTE_FALLBACK_TEXT,
  )
  const [rerouteModel, setRerouteModel] = useState(DEFAULT_ASSISTANT_MODEL)
  const [isCustomRerouteModel, setIsCustomRerouteModel] = useState(false)

  const [credentials, setCredentials] = useState<AiCredentialResponseDto[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [assistant, setAssistant] = useState<Assistant | null>(null)

  useEffect(() => {
    void loadFormData()
  }, [assistantId])

  const loadFormData = async () => {
    try {
      setLoadingData(true)
      const [credentialsResponse, teamsResponse] = await Promise.all([
        apiService.getAiCredentials(),
        apiService.getTeams(0, 100),
      ])

      setCredentials(credentialsResponse.content.filter((cred) => cred.active))
      setTeams(teamsResponse.content)

      if (assistantId) {
        const assistantData = await apiService.getAssistantById(assistantId)
        setAssistant(assistantData)
        setName(assistantData.name)
        setDescription(assistantData.description)
        setCredentialId(assistantData.credentialId)
        setTeamId(assistantData.teamId || "")

        const metadata = assistantData.metadata || {}
        setAssistantMetadata(metadata)
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
          metadata.presence_penalty !== undefined && metadata.presence_penalty !== null
            ? String(metadata.presence_penalty)
            : "",
        )
        setFrequencyPenalty(
          metadata.frequency_penalty !== undefined && metadata.frequency_penalty !== null
            ? String(metadata.frequency_penalty)
            : "",
        )

        const incomingModel = metadata.model || ""
        setModel(incomingModel)
        setIsCustomModel(Boolean(incomingModel && !modelValues.has(incomingModel)))
        setIsRouter(Boolean(assistantData.isRouter ?? metadata.isRouter))

        const modelForDefaults = incomingModel || DEFAULT_ASSISTANT_MODEL
        const defaultReroutePolicy = getDefaultReroutePolicy(modelForDefaults)
        const reroutePolicy = metadata.reroute_policy || defaultReroutePolicy
        const rerouteModelValue = reroutePolicy.model || modelForDefaults

        setRerouteEnabled(
          typeof reroutePolicy.enabled === "boolean"
            ? reroutePolicy.enabled
            : defaultReroutePolicy.enabled,
        )
        setRerouteMinMessages(
          String(reroutePolicy.min_messages ?? defaultReroutePolicy.min_messages),
        )
        setRerouteMinMinutes(
          String(reroutePolicy.min_minutes ?? defaultReroutePolicy.min_minutes),
        )
        setRerouteHistoryWindow(
          String(reroutePolicy.history_window ?? defaultReroutePolicy.history_window),
        )
        setRerouteFallbackText(
          reroutePolicy.fallback_clarification_text ||
            defaultReroutePolicy.fallback_clarification_text,
        )
        setRerouteModel(rerouteModelValue)
        setIsCustomRerouteModel(
          Boolean(rerouteModelValue && !modelValues.has(rerouteModelValue)),
        )
      } else {
        setAssistant(null)
        setName("")
        setDescription("")
        setCredentialId("")
        setTeamId("")
        setAssistantMetadata({})
        setSystemPrompt("")
        setTemperature("")
        setModel(DEFAULT_ASSISTANT_MODEL)
        setMaxTokens("")
        setTopP("")
        setPresencePenalty("")
        setFrequencyPenalty("")
        setIsCustomModel(false)
        setIsRouter(false)
        setRerouteEnabled(true)
        setRerouteMinMessages(String(DEFAULT_REROUTE_MIN_MESSAGES))
        setRerouteMinMinutes(String(DEFAULT_REROUTE_MIN_MINUTES))
        setRerouteHistoryWindow(String(DEFAULT_REROUTE_HISTORY_WINDOW))
        setRerouteFallbackText(DEFAULT_REROUTE_FALLBACK_TEXT)
        setRerouteModel(DEFAULT_ASSISTANT_MODEL)
        setIsCustomRerouteModel(false)
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

    const trimmedSystemPrompt = systemPrompt.trim()
    if (!isEditMode && !trimmedSystemPrompt) {
      toast.error("Las instrucciones son obligatorias")
      return
    }

    try {
      setLoading(true)

      const metadata: AssistantMetadata = {
        ...(isEditMode ? assistantMetadata : {}),
      }
      const trimmedModel = model.trim()
      const parsedTemperature = temperature.trim() ? Number.parseFloat(temperature) : null
      const parsedMaxTokens = maxTokens.trim() ? Number.parseInt(maxTokens, 10) : null
      const parsedTopP = topP.trim() ? Number.parseFloat(topP) : null
      const parsedPresencePenalty = presencePenalty.trim()
        ? Number.parseFloat(presencePenalty)
        : null
      const parsedFrequencyPenalty = frequencyPenalty.trim()
        ? Number.parseFloat(frequencyPenalty)
        : null
      const modelFromMetadata = String(metadata.model || "").trim()
      const effectiveAssistantModel =
        trimmedModel || modelFromMetadata || DEFAULT_ASSISTANT_MODEL

      if (isEditMode) {
        if (trimmedSystemPrompt) metadata.system_prompt = trimmedSystemPrompt
        if (trimmedModel) metadata.model = trimmedModel
      } else {
        metadata.system_prompt = trimmedSystemPrompt
        metadata.model = effectiveAssistantModel
      }

      if (parsedTemperature !== null && !Number.isNaN(parsedTemperature)) {
        metadata.temperature = parsedTemperature
      }
      if (parsedMaxTokens !== null && !Number.isNaN(parsedMaxTokens)) {
        metadata.max_tokens = parsedMaxTokens
      }
      if (parsedTopP !== null && !Number.isNaN(parsedTopP)) {
        metadata.top_p = parsedTopP
      }
      if (parsedPresencePenalty !== null && !Number.isNaN(parsedPresencePenalty)) {
        metadata.presence_penalty = parsedPresencePenalty
      }
      if (parsedFrequencyPenalty !== null && !Number.isNaN(parsedFrequencyPenalty)) {
        metadata.frequency_penalty = parsedFrequencyPenalty
      }

      if (isRouter) {
        const trimmedRerouteModel = rerouteModel.trim()
        metadata.reroute_policy = {
          enabled: rerouteEnabled,
          min_messages: parseNumberOrDefault(
            rerouteMinMessages,
            DEFAULT_REROUTE_MIN_MESSAGES,
          ),
          min_minutes: parseNumberOrDefault(
            rerouteMinMinutes,
            DEFAULT_REROUTE_MIN_MINUTES,
          ),
          history_window: parseNumberOrDefault(
            rerouteHistoryWindow,
            DEFAULT_REROUTE_HISTORY_WINDOW,
          ),
          fallback_clarification_text:
            rerouteFallbackText.trim() || DEFAULT_REROUTE_FALLBACK_TEXT,
          model:
            trimmedRerouteModel || effectiveAssistantModel || DEFAULT_ASSISTANT_MODEL,
        }
      }

      if (isEditMode) {
        const updateData: UpdateAssistantRequest = {
          name: name.trim(),
          description: description.trim(),
          credentialId,
          isRouter,
          ...(teamId && { teamId }),
          metadata,
        }
        await apiService.updateAssistant(assistantId, updateData)
        toast.success("Asistente actualizado exitosamente")
      } else {
        const createData: CreateAssistantRequest = {
          name: name.trim(),
          description: description.trim(),
          credentialId,
          isRouter,
          ...(teamId && { teamId }),
          metadata,
        }
        await apiService.createAssistant(createData)
        toast.success("Asistente creado exitosamente")
      }

      if (onSuccess) {
        onSuccess()
      } else if (onBack) {
        onBack()
      } else {
        router.push("/")
      }
    } catch (error) {
      console.error("Error saving assistant:", error)
      toast.error(
        isEditMode
          ? "Error al actualizar el asistente"
          : "Error al crear el asistente",
      )
    } finally {
      setLoading(false)
    }
  }

  const getTeamInitials = (teamName: string) =>
    teamName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)

  const advancedFields = (
    <div className="grid grid-cols-1 gap-3">
      <Input
        label="Temperatura"
        placeholder="0.7"
        value={temperature}
        onValueChange={setTemperature}
        type="number"
        step="0.1"
        min="0"
        max="2"
        variant="bordered"
      />

      <Select
        label="Modelo"
        placeholder="Selecciona un modelo"
        selectedKeys={isCustomModel ? ["custom"] : model ? [model] : []}
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
        description={`Por defecto se usa ${DEFAULT_ASSISTANT_MODEL}`}
      >
        {modelSections.map((section) => (
          <SelectSection key={section.label} title={section.label}>
            {section.models.map((option) => (
              <SelectItem key={option.value}>{option.label}</SelectItem>
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
        />
      )}

      <Input
        label="Max tokens"
        placeholder="2048"
        value={maxTokens}
        onValueChange={setMaxTokens}
        type="number"
        step="1"
        min="1"
        variant="bordered"
      />

      <Input
        label="Top P"
        placeholder="1.0"
        value={topP}
        onValueChange={setTopP}
        type="number"
        step="0.1"
        min="0"
        max="1"
        variant="bordered"
      />

      <Input
        label="Presence penalty"
        placeholder="0"
        value={presencePenalty}
        onValueChange={setPresencePenalty}
        type="number"
        step="0.1"
        min="-2"
        max="2"
        variant="bordered"
      />

      <Input
        label="Frequency penalty"
        placeholder="0"
        value={frequencyPenalty}
        onValueChange={setFrequencyPenalty}
        type="number"
        step="0.1"
        min="-2"
        max="2"
        variant="bordered"
      />
    </div>
  )

  const rerouteFields = (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Politica de reroute
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Controla cuándo volver a evaluar el derivador.
          </p>
        </div>
        <Switch isSelected={rerouteEnabled} onValueChange={setRerouteEnabled}>
          Habilitado
        </Switch>
      </div>

      <Input
        label="Mensajes mínimos"
        placeholder={String(DEFAULT_REROUTE_MIN_MESSAGES)}
        value={rerouteMinMessages}
        onValueChange={setRerouteMinMessages}
        type="number"
        step="1"
        min="1"
        variant="bordered"
      />

      <Input
        label="Minutos mínimos"
        placeholder={String(DEFAULT_REROUTE_MIN_MINUTES)}
        value={rerouteMinMinutes}
        onValueChange={setRerouteMinMinutes}
        type="number"
        step="1"
        min="1"
        variant="bordered"
      />

      <Input
        label="Ventana de historial"
        placeholder={String(DEFAULT_REROUTE_HISTORY_WINDOW)}
        value={rerouteHistoryWindow}
        onValueChange={setRerouteHistoryWindow}
        type="number"
        step="1"
        min="1"
        variant="bordered"
      />

      <Textarea
        label="Texto fallback"
        placeholder={DEFAULT_REROUTE_FALLBACK_TEXT}
        value={rerouteFallbackText}
        onValueChange={setRerouteFallbackText}
        minRows={2}
        variant="bordered"
      />

      <Select
        label="Modelo de reroute"
        placeholder="Selecciona un modelo"
        selectedKeys={isCustomRerouteModel ? ["custom"] : rerouteModel ? [rerouteModel] : []}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string
          if (selected === "custom") {
            setIsCustomRerouteModel(true)
            setRerouteModel("")
            return
          }
          setIsCustomRerouteModel(false)
          setRerouteModel(selected || "")
        }}
        variant="bordered"
        description={`Si queda vacío se usa ${DEFAULT_ASSISTANT_MODEL}`}
      >
        {modelSections.map((section) => (
          <SelectSection key={section.label} title={section.label}>
            {section.models.map((option) => (
              <SelectItem key={option.value}>{option.label}</SelectItem>
            ))}
          </SelectSection>
        ))}
        <SelectSection title="Personalizado">
          <SelectItem key="custom">Otro modelo</SelectItem>
        </SelectSection>
      </Select>

      {isCustomRerouteModel && (
        <Input
          label="Modelo reroute personalizado"
          placeholder={DEFAULT_ASSISTANT_MODEL}
          value={rerouteModel}
          onValueChange={setRerouteModel}
          variant="bordered"
        />
      )}
    </div>
  )

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className={isDrawerMode ? "space-y-4 pb-2" : "space-y-6 pb-8"}>
      {!isDrawerMode && (
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
                ? "Modifica la configuracion del asistente"
                : "Configura un nuevo asistente de IA"}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className={isDrawerMode ? "border-none shadow-none bg-transparent" : ""}>
          {!isDrawerMode && (
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold">Informacion del Asistente</span>
              </div>
            </CardHeader>
          )}
          <CardBody className="gap-4">
            <Input
              label="Nombre"
              placeholder="Ej: Asistente de Ventas"
              value={name}
              onValueChange={setName}
              isRequired
              variant="bordered"
            />

            <Textarea
              label="Descripcion"
              placeholder="Describe la funcion de este asistente..."
              value={description}
              onValueChange={setDescription}
              minRows={3}
              variant="bordered"
            />

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
            >
              {credentials.map((credential) => (
                <SelectItem key={credential.id}>{credential.name}</SelectItem>
              ))}
            </Select>

            {credentials.length === 0 && (
              <p className="text-sm text-warning">
                No tienes credenciales de IA configuradas. Configura una antes de crear un asistente.
              </p>
            )}

            {!isDrawerCreateMode && (
              <Select
                label="Equipo (Opcional)"
                placeholder="Selecciona un equipo"
                selectedKeys={teamId ? [teamId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string
                  setTeamId(selected || "")
                }}
                variant="bordered"
                renderValue={(items) =>
                  items.map((item) => {
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
                }
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
            )}

            <Textarea
              label={isEditMode ? "Instrucciones (Opcional)" : "Instrucciones"}
              placeholder="Define instrucciones claras para el asistente..."
              value={systemPrompt}
              onValueChange={setSystemPrompt}
              minRows={4}
              variant="bordered"
              isRequired={!isEditMode}
              description="Estas instrucciones guian el comportamiento del agente."
            />

            <div className="rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <Switch isSelected={isRouter} onValueChange={setIsRouter}>
                Es un agente derivador
              </Switch>
            </div>

            {isDrawerCreateMode ? (
              <Accordion variant="splitted">
                <AccordionItem
                  key="advanced"
                  aria-label="Opciones avanzadas"
                  title="Opciones avanzadas"
                  subtitle="Temperatura, modelo, tokens y penalties"
                >
                  {advancedFields}
                </AccordionItem>
              </Accordion>
            ) : (
              advancedFields
            )}

            {isRouter && rerouteFields}

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

      {isEditMode && assistant && !isDrawerCreateMode && (
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
