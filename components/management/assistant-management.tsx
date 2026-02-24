"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react"
import {
  AlertTriangle,
  Bot,
  Edit,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react"
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow"
import "reactflow/dist/style.css"
import { toast } from "sonner"
import AssistantForm from "@/components/management/assistant-form"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiService } from "@/lib/api"
import type { Assistant, UpdateAssistantRequest } from "@/lib/api-types"

type AssistantView = "map" | "create" | "edit"
const CREATE_ROOT_NODE_ID = "__create_root__"
const CREATE_FROM_ROUTER_NODE_ID = "__create_from_router__"

interface AssistantNodeData {
  assistant: Assistant
  isRouter: boolean
  isSelected: boolean
}

interface CreateNodeData {
  label: string
}

const AssistantNode = memo(({ data }: NodeProps<AssistantNodeData>) => {
  const { assistant, isRouter, isSelected } = data
  const promptPreview = String(assistant.metadata?.system_prompt || "Sin prompt configurado")
  const targetPosition = isRouter ? Position.Left : Position.Left
  const sourcePosition = isRouter ? Position.Right : Position.Right

  return (
    <div
      className={`w-[240px] rounded-2xl border p-3 text-left shadow-sm transition-all ${
        isRouter
          ? "border-lime-400 bg-lime-50 dark:border-lime-500 dark:bg-lime-950/30"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      } ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
          : "hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={targetPosition}
        className={`${isRouter ? "opacity-0" : "opacity-100"} !bg-slate-400 dark:!bg-slate-500`}
      />
      <div className="mb-2 flex items-start gap-2">
        <Bot className={`mt-0.5 h-4 w-4 ${isRouter ? "text-lime-700 dark:text-lime-300" : "text-primary"}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{assistant.name}</p>
          <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{assistant.description || "Sin descripción"}</p>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {isRouter && (
          <Chip size="sm" color="secondary" variant="flat">
            Derivador
          </Chip>
        )}
        {assistant.isDefault && (
          <Chip size="sm" color="success" variant="flat">
            Default
          </Chip>
        )}
        <Chip size="sm" color={assistant.isActive ? "primary" : "default"} variant="flat">
          {assistant.isActive ? "Activo" : "Inactivo"}
        </Chip>
      </div>
      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{promptPreview}</p>
      <Handle
        type="source"
        position={sourcePosition}
        className={`${isRouter ? "opacity-100" : "opacity-0"} !bg-slate-400 dark:!bg-slate-500`}
      />
    </div>
  )
})

AssistantNode.displayName = "AssistantNode"

const CreateAssistantNode = memo(({ data }: NodeProps<CreateNodeData>) => {
  return (
    <div className="w-[220px] rounded-2xl border-2 border-dashed border-slate-400 bg-slate-100/90 p-4 text-center shadow-sm dark:border-slate-500 dark:bg-slate-800/80">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-slate-400 text-slate-600 dark:border-slate-500 dark:text-slate-300">
        <Plus className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{data.label}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Click para crear</p>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 dark:!bg-slate-500"
      />
    </div>
  )
})

CreateAssistantNode.displayName = "CreateAssistantNode"

const nodeTypes = { assistantNode: AssistantNode, createNode: CreateAssistantNode }

function getIsRouter(assistant: Assistant) {
  return Boolean(assistant.metadata?.isRouter)
}

function getMergedMetadata(assistant: Assistant, patch: Record<string, unknown>) {
  return {
    ...(assistant.metadata || {}),
    ...patch,
  }
}

export default function AssistantManagement() {
  const isMobile = useIsMobile()

  const [currentAssistantView, setCurrentAssistantView] = useState<AssistantView>("map")
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null)

  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [bootstrapInProgress, setBootstrapInProgress] = useState(false)
  const [hasRouterConflict, setHasRouterConflict] = useState(false)
  const [needsManualRouterSelection, setNeedsManualRouterSelection] = useState(false)

  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDefaultModalOpen, setIsDefaultModalOpen] = useState(false)

  const handleEdit = useCallback((id: string) => {
    setEditingAssistantId(id)
    setCurrentAssistantView("edit")
  }, [])

  const handleCreate = useCallback(() => {
    setEditingAssistantId(null)
    setCurrentAssistantView("create")
  }, [])

  const updateAssistantMetadata = useCallback(
    async (assistant: Assistant, metadataPatch: Record<string, unknown>) => {
      const payload: UpdateAssistantRequest = {
        metadata: getMergedMetadata(assistant, metadataPatch),
      }
      return apiService.updateAssistant(assistant.id, payload)
    },
    [],
  )

  const handleNormalizeRouters = useCallback(
    async (list: Assistant[]) => {
      const routers = list.filter(getIsRouter)
      setHasRouterConflict(routers.length > 1)
      setNeedsManualRouterSelection(false)

      if (routers.length > 1) return list

      if (routers.length === 1) return list

      const defaultAssistant = list.find((assistant) => assistant.isDefault)
      if (!defaultAssistant) {
        setNeedsManualRouterSelection(true)
        return list
      }

      setBootstrapInProgress(true)
      try {
        const updated = await updateAssistantMetadata(defaultAssistant, { isRouter: true })
        toast.success(`Se asignó "${updated.name}" como derivador automáticamente`)
        return list.map((assistant) => (assistant.id === updated.id ? updated : assistant))
      } catch (error) {
        console.error("Error assigning default assistant as router:", error)
        toast.error("No se pudo asignar el derivador automáticamente")
        return list
      } finally {
        setBootstrapInProgress(false)
      }
    },
    [updateAssistantMetadata],
  )

  const loadAssistants = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiService.getAssistants({
        page: 0,
        size: 200,
        sortBy: "created_at",
        direction: "DESC",
      })

      const normalized = await handleNormalizeRouters(response.content)
      setAssistants(normalized)
      setSelectedAssistantId((current) => {
        if (current && !normalized.some((assistant) => assistant.id === current)) {
          return null
        }
        return current
      })
    } catch (error) {
      console.error("Error loading assistants:", error)
      toast.error("Error al cargar los asistentes")
    } finally {
      setLoading(false)
    }
  }, [handleNormalizeRouters])

  const handleBackToMap = useCallback(() => {
    setCurrentAssistantView("map")
    setEditingAssistantId(null)
    void loadAssistants()
  }, [loadAssistants])

  useEffect(() => {
    void loadAssistants()
  }, [loadAssistants])

  const filteredAssistants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return assistants

    const matches = assistants.filter((assistant) => {
      const systemPrompt = String(assistant.metadata?.system_prompt || "")
      const metadataText = JSON.stringify(assistant.metadata || {}).toLowerCase()
      return (
        assistant.name.toLowerCase().includes(query) ||
        assistant.description.toLowerCase().includes(query) ||
        systemPrompt.toLowerCase().includes(query) ||
        metadataText.includes(query) ||
        assistant.id.toLowerCase().includes(query)
      )
    })
    return matches
  }, [assistants, searchQuery])

  const routerAssistant = useMemo(
    () => filteredAssistants.find(getIsRouter),
    [filteredAssistants],
  )

  const selectedAssistantModel = useMemo(() => {
    if (!selectedAssistantId) return null
    return assistants.find((assistant) => assistant.id === selectedAssistantId) || null
  }, [assistants, selectedAssistantId])

  const nodes = useMemo<Node<AssistantNodeData | CreateNodeData>[]>(() => {
    if (filteredAssistants.length === 0) {
      return [
        {
          id: CREATE_ROOT_NODE_ID,
          type: "createNode",
          position: { x: 20, y: 120 },
          data: {
            label: "Crear primer asistente",
          },
        },
      ]
    }

    const nodeList: Node<AssistantNodeData | CreateNodeData>[] = []
    const router = filteredAssistants.find(getIsRouter)
    const nonRouter = filteredAssistants.filter((assistant) => !getIsRouter(assistant))

    if (router) {
      nodeList.push({
        id: router.id,
        type: "assistantNode",
        position: { x: 0, y: 160 },
        data: {
          assistant: router,
          isRouter: true,
          isSelected: selectedAssistantId === router.id,
        },
      })

      nodeList.push({
        id: CREATE_FROM_ROUTER_NODE_ID,
        type: "createNode",
        position: { x: 420, y: 0 },
        data: {
          label: "Crear asistente",
        },
      })
    }

    nonRouter.forEach((assistant, index) => {
      const rowCount = isMobile ? 4 : 3
      const row = index % rowCount
      const col = Math.floor(index / rowCount)
      const gapX = 320
      const gapY = 190
      const x = 420 + col * gapX
      const y = 250 + row * gapY

      nodeList.push({
        id: assistant.id,
        type: "assistantNode",
        position: { x, y },
        data: {
          assistant,
          isRouter: false,
          isSelected: selectedAssistantId === assistant.id,
        },
      })
    })

    return nodeList
  }, [filteredAssistants, isMobile, selectedAssistantId])

  const edges = useMemo<Edge[]>(() => {
    if (!routerAssistant) return []

    const assistantEdges = filteredAssistants
      .filter((assistant) => assistant.id !== routerAssistant.id)
      .map((assistant) => ({
        id: `${routerAssistant.id}-${assistant.id}`,
        source: routerAssistant.id,
        target: assistant.id,
        type: "bezier",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2, stroke: "#7c3aed" },
      }))

    const createEdge: Edge = {
      id: `${routerAssistant.id}-${CREATE_FROM_ROUTER_NODE_ID}`,
      source: routerAssistant.id,
      target: CREATE_FROM_ROUTER_NODE_ID,
      type: "bezier",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      style: { strokeWidth: 2, stroke: "#94a3b8", strokeDasharray: "6 6" },
    }

    return [...assistantEdges, createEdge]
  }, [filteredAssistants, routerAssistant])

  const handlePreview = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsPreviewModalOpen(true)
  }

  const handleSetDefaultClick = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsDefaultModalOpen(true)
  }

  const handleDeleteClick = (assistant: Assistant) => {
    if (getIsRouter(assistant)) {
      toast.error("No puedes eliminar el derivador. Primero transfiere el rol.")
      return
    }
    setSelectedAssistant(assistant)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedAssistant) return
    try {
      setActionLoading(true)
      await apiService.deleteAssistant(selectedAssistant.id)
      toast.success("Asistente eliminado exitosamente")
      setIsDeleteModalOpen(false)
      await loadAssistants()
    } catch (error) {
      console.error("Error deleting assistant:", error)
      toast.error("Error al eliminar el asistente")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetDefaultConfirm = async () => {
    if (!selectedAssistant) return
    try {
      setActionLoading(true)
      await apiService.setAssistantAsDefault(selectedAssistant.id)
      toast.success("Asistente establecido como predeterminado")
      setIsDefaultModalOpen(false)
      await loadAssistants()
    } catch (error) {
      console.error("Error setting assistant as default:", error)
      toast.error("Error al establecer como predeterminado")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetRouter = async (targetAssistant: Assistant) => {
    if (getIsRouter(targetAssistant)) return

    const currentRouter = assistants.find(getIsRouter)
    try {
      setActionLoading(true)
      await updateAssistantMetadata(targetAssistant, { isRouter: true })
      if (currentRouter && currentRouter.id !== targetAssistant.id) {
        await updateAssistantMetadata(currentRouter, { isRouter: false })
      }
      toast.success(`"${targetAssistant.name}" ahora es el derivador`)
      setSelectedAssistantId(targetAssistant.id)
      await loadAssistants()
    } catch (error) {
      console.error("Error changing router assistant:", error)
      toast.error("No se pudo actualizar el derivador")
    } finally {
      setActionLoading(false)
    }
  }

  const handleFixRouterConflict = async () => {
    const routers = assistants.filter(getIsRouter)
    if (routers.length <= 1) return

    const routerToKeep = routers.find((assistant) => assistant.isDefault) || routers[0]
    const toDisable = routers.filter((assistant) => assistant.id !== routerToKeep.id)

    try {
      setActionLoading(true)
      for (const assistant of toDisable) {
        await updateAssistantMetadata(assistant, { isRouter: false })
      }
      toast.success(`Conflicto resuelto. "${routerToKeep.name}" quedó como derivador`)
      await loadAssistants()
    } catch (error) {
      console.error("Error fixing router conflict:", error)
      toast.error("No se pudo corregir el conflicto de derivadores")
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (currentAssistantView === "create" || currentAssistantView === "edit") {
    return (
      <div className="p-6 h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          <AssistantForm
            assistantId={editingAssistantId || undefined}
            onBack={handleBackToMap}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Asistentes</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Mapa de relación entre tus asistentes impulsados por inteligencia artificial.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Buscar por nombre, descripción o prompt..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="h-4 w-4 text-slate-500 dark:text-slate-300" />}
              className="min-w-[260px]"
              isClearable
              onClear={() => setSearchQuery("")}
            />
            <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={handleCreate}>
              Nuevo Asistente
            </Button>
          </div>
        </div>

        {hasRouterConflict && (
          <Card className="border-warning-300 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20">
            <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-warning-600" />
                <div>
                  <p className="font-semibold text-warning-800 dark:text-warning-200">Hay más de un derivador configurado</p>
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    Debe existir uno solo. Puedes corregirlo automáticamente.
                  </p>
                </div>
              </div>
              <Button color="warning" onPress={handleFixRouterConflict} isLoading={actionLoading}>
                Corregir derivador
              </Button>
            </CardBody>
          </Card>
        )}

        {needsManualRouterSelection && !loading && (
          <Card className="border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20">
            <CardBody className="flex flex-col gap-2">
              <p className="font-semibold text-primary-800 dark:text-primary-200">No hay derivador definido</p>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                Selecciona un asistente desde el panel lateral y presiona &quot;Marcar como derivador&quot;.
              </p>
            </CardBody>
          </Card>
        )}

        {loading || bootstrapInProgress ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <div className={`grid flex-1 grid-cols-1 gap-4 ${selectedAssistantModel ? "lg:grid-cols-[1fr_320px]" : ""}`}>
            <Card className="min-h-[520px] border border-slate-200 dark:border-slate-700">
              <CardBody className="p-0">
                <div className={isMobile ? "h-[560px]" : "h-[calc(100vh-260px)] min-h-[540px]"}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodeClick={(_, node) => {
                      if (node.id === CREATE_ROOT_NODE_ID || node.id === CREATE_FROM_ROUTER_NODE_ID) {
                        handleCreate()
                        return
                      }
                      setSelectedAssistantId(node.id)
                    }}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable
                    panOnDrag
                    zoomOnScroll
                    minZoom={0.35}
                    className="bg-slate-50 dark:bg-slate-950"
                  >
                    <Controls showInteractive={false} />
                    <Background gap={20} size={1} color="#94a3b8" />
                  </ReactFlow>
                </div>
              </CardBody>
            </Card>

            {selectedAssistantModel && (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-col items-start gap-1">
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">Detalle del asistente</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {filteredAssistants.length} {filteredAssistants.length === 1 ? "resultado" : "resultados"}
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setSelectedAssistantId(null)}
                    aria-label="Cerrar panel de detalles"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="gap-3">
                <>
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={selectedAssistantModel.name.substring(0, 2).toUpperCase()}
                        className={getIsRouter(selectedAssistantModel) ? "bg-lime-300 text-lime-900" : "bg-primary text-white"}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{selectedAssistantModel.name}</p>
                        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{selectedAssistantModel.description || "Sin descripción"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getIsRouter(selectedAssistantModel) && (
                        <Chip size="sm" color="secondary" variant="flat">Derivador</Chip>
                      )}
                      {selectedAssistantModel.isDefault && (
                        <Chip size="sm" color="success" variant="flat">Default</Chip>
                      )}
                      <Chip size="sm" color={selectedAssistantModel.isActive ? "primary" : "default"} variant="flat">
                        {selectedAssistantModel.isActive ? "Activo" : "Inactivo"}
                      </Chip>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <p className="mb-1 font-semibold">system_prompt</p>
                      <p className="line-clamp-5">{String(selectedAssistantModel.metadata?.system_prompt || "Sin prompt configurado")}</p>
                    </div>
                    <Divider />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="flat" onPress={() => handlePreview(selectedAssistantModel)}>
                        Ver
                      </Button>
                      <Button color="primary" variant="flat" startContent={<Edit className="h-4 w-4" />} onPress={() => handleEdit(selectedAssistantModel.id)}>
                        Editar
                      </Button>
                      {!selectedAssistantModel.isDefault ? (
                        <Button color="success" variant="flat" startContent={<StarOff className="h-4 w-4" />} onPress={() => handleSetDefaultClick(selectedAssistantModel)}>
                          Default
                        </Button>
                      ) : (
                        <Button color="success" variant="flat" startContent={<Star className="h-4 w-4" />} isDisabled>
                          Default
                        </Button>
                      )}
                      <Button
                        color="secondary"
                        variant="flat"
                        onPress={() => void handleSetRouter(selectedAssistantModel)}
                        isLoading={actionLoading}
                        isDisabled={getIsRouter(selectedAssistantModel)}
                      >
                        Marcar como derivador
                      </Button>
                      <Button
                        color="danger"
                        variant="flat"
                        startContent={<Trash2 className="h-4 w-4" />}
                        onPress={() => handleDeleteClick(selectedAssistantModel)}
                        isDisabled={getIsRouter(selectedAssistantModel)}
                        className="col-span-2"
                      >
                        Eliminar
                      </Button>
                    </div>
                    {getIsRouter(selectedAssistantModel) && (
                      <p className="text-xs text-warning-600 dark:text-warning-300">
                        El derivador no se puede eliminar. Primero transfiere el rol.
                      </p>
                    )}
                </>
              </CardBody>
            </Card>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-primary" />
              <span>{selectedAssistant?.name}</span>
            </div>
            <div className="flex gap-2">
              {selectedAssistant && getIsRouter(selectedAssistant) && (
                <Chip size="sm" variant="flat" color="secondary">
                  Derivador
                </Chip>
              )}
              {selectedAssistant?.isDefault && (
                <Chip size="sm" variant="flat" color="success">
                  Por defecto
                </Chip>
              )}
              {selectedAssistant?.isActive ? (
                <Chip size="sm" variant="flat" color="primary">
                  Activo
                </Chip>
              ) : (
                <Chip size="sm" variant="flat" color="default">
                  Inactivo
                </Chip>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-default-700">Descripción:</p>
                <p className="text-sm text-default-600">{selectedAssistant?.description}</p>
              </div>
              <Divider />
              <div>
                <p className="mb-2 text-sm font-semibold text-default-700">Prompt del Sistema:</p>
                <div className="prose prose-sm max-w-none rounded-lg bg-default-100 p-4 dark:prose-invert">
                  <ReactMarkdown>{String(selectedAssistant?.metadata?.system_prompt || "Sin prompt configurado")}</ReactMarkdown>
                </div>
              </div>
              <Divider />
              <div className="text-sm text-default-500">
                <p><strong>ID:</strong> {selectedAssistant?.id}</p>
                <p><strong>Creado:</strong> {selectedAssistant && formatDate(selectedAssistant.createdAt)}</p>
                <p><strong>Actualizado:</strong> {selectedAssistant && formatDate(selectedAssistant.updatedAt)}</p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="default" variant="flat" onPress={() => setIsPreviewModalOpen(false)}>
              Cerrar
            </Button>
            <Button
              color="primary"
              onPress={() => {
                setIsPreviewModalOpen(false)
                if (selectedAssistant) handleEdit(selectedAssistant.id)
              }}
            >
              Editar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Eliminar Asistente</ModalHeader>
          <ModalBody>
            <p>
              ¿Estás seguro de que deseas eliminar el asistente <strong>{selectedAssistant?.name}</strong>?
            </p>
            <p className="mt-2 text-sm text-danger">Esta acción no se puede deshacer.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setIsDeleteModalOpen(false)} isDisabled={actionLoading}>
              Cancelar
            </Button>
            <Button color="danger" onPress={() => void handleDeleteConfirm()} isLoading={actionLoading}>
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isDefaultModalOpen}
        onClose={() => setIsDefaultModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Establecer como Predeterminado</ModalHeader>
          <ModalBody>
            <p>
              ¿Deseas establecer <strong>{selectedAssistant?.name}</strong> como el asistente predeterminado?
            </p>
            <p className="mt-2 text-sm text-warning">El asistente actual perderá este estado.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setIsDefaultModalOpen(false)} isDisabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              color="success"
              onPress={() => void handleSetDefaultConfirm()}
              isLoading={actionLoading}
              startContent={!actionLoading && <Star className="h-4 w-4" />}
            >
              Establecer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
