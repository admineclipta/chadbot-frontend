"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Button, Card, CardBody, CardHeader, Chip, Divider, Spinner } from "@heroui/react"
import { Bot, Building2, MessageSquare, RefreshCw, Shield, X } from "lucide-react"
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
import { useIsMobile } from "@/hooks/use-mobile"
import { apiService } from "@/lib/api"
import type { AiCredentialDto, MessagingCredentialDto, ServiceTypeDto } from "@/lib/api-types"

const COMPANY_NODE_ID = "company"
const MESSAGING_CATEGORY_NODE_ID = "category-messaging"
const AI_CATEGORY_NODE_ID = "category-ai"
const CREDENTIAL_NODE_PREFIX = "credential-"

type CredentialType = "messaging" | "ai"

interface CredentialGraphItem {
  id: string
  nodeId: string
  credentialType: CredentialType
  name: string
  serviceTypeId: number
  serviceName: string
  active: boolean
  createdAt: string
  webhookIdentity?: string
  usageLimit?: number
  usageUnit?: string
  usageResetAt?: string
}

interface CompanyNodeData {
  label: string
}

interface CategoryNodeData {
  label: string
  credentialCount: number
  type: CredentialType
}

interface CredentialNodeData {
  item: CredentialGraphItem
  isSelected: boolean
}

const CompanyNode = memo(({ data }: NodeProps<CompanyNodeData>) => {
  return (
    <div className="w-[220px] rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-sm dark:border-primary/40 dark:bg-primary/20">
      <div className="mb-2 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{data.label}</p>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">Mapa de credenciales configuradas</p>
      <Handle type="source" position={Position.Right} id="to-messaging" className="!bg-slate-400 dark:!bg-slate-500" style={{ top: "38%" }} />
      <Handle type="source" position={Position.Right} id="to-ai" className="!bg-slate-400 dark:!bg-slate-500" style={{ top: "70%" }} />
    </div>
  )
})

CompanyNode.displayName = "CompanyNode"

const CategoryNode = memo(({ data }: NodeProps<CategoryNodeData>) => {
  const isMessaging = data.type === "messaging"
  return (
    <div
      className={`w-[250px] rounded-2xl border p-4 shadow-sm ${
        isMessaging
          ? "border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20"
          : "border-secondary-300 bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-900/20"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 dark:!bg-slate-500" />
      <div className="flex items-center gap-2">
        {isMessaging ? (
          <MessageSquare className="h-5 w-5 text-primary" />
        ) : (
          <Bot className="h-5 w-5 text-secondary" />
        )}
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{data.label}</p>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        {data.credentialCount} {data.credentialCount === 1 ? "credencial" : "credenciales"}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-slate-400 dark:!bg-slate-500" />
    </div>
  )
})

CategoryNode.displayName = "CategoryNode"

const CredentialNode = memo(({ data }: NodeProps<CredentialNodeData>) => {
  const icon = data.item.credentialType === "messaging" ? MessageSquare : Bot
  const Icon = icon
  return (
    <div
      className={`w-[260px] rounded-2xl border p-3 text-left shadow-sm transition-all ${
        data.isSelected
          ? "border-primary ring-2 ring-primary/40"
          : "border-slate-200 bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 dark:!bg-slate-500" />
      <div className="mb-2 flex items-start gap-2">
        <Icon
          className={`mt-0.5 h-4 w-4 ${
            data.item.credentialType === "messaging" ? "text-primary" : "text-secondary"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{data.item.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-300">{data.item.serviceName}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Chip size="sm" color={data.item.active ? "success" : "danger"} variant="flat">
          {data.item.active ? "Activo" : "Inactivo"}
        </Chip>
        <Chip size="sm" variant="flat">
          {data.item.credentialType === "messaging" ? "Mensajería" : "IA"}
        </Chip>
      </div>
    </div>
  )
})

CredentialNode.displayName = "CredentialNode"

const nodeTypes = {
  companyNode: CompanyNode,
  categoryNode: CategoryNode,
  credentialNode: CredentialNode,
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function normalizeCredentials(
  messagingCredentials: MessagingCredentialDto[],
  messagingServices: ServiceTypeDto[],
  aiCredentials: AiCredentialDto[],
  aiServices: ServiceTypeDto[],
): CredentialGraphItem[] {
  const messagingServiceById = new Map(messagingServices.map((service) => [service.id, service.name]))
  const aiServiceById = new Map(aiServices.map((service) => [service.id, service.name]))

  const messagingItems: CredentialGraphItem[] = messagingCredentials.map((credential) => ({
    id: credential.id,
    nodeId: `${CREDENTIAL_NODE_PREFIX}messaging-${credential.id}`,
    credentialType: "messaging",
    name: credential.name,
    serviceTypeId: credential.serviceTypeId,
    serviceName: messagingServiceById.get(credential.serviceTypeId) || "Servicio desconocido",
    active: credential.active,
    createdAt: credential.createdAt,
    webhookIdentity: credential.webhookIdentity,
  }))

  const aiItems: CredentialGraphItem[] = aiCredentials.map((credential) => ({
    id: credential.id,
    nodeId: `${CREDENTIAL_NODE_PREFIX}ai-${credential.id}`,
    credentialType: "ai",
    name: credential.name,
    serviceTypeId: credential.serviceTypeId,
    serviceName: aiServiceById.get(credential.serviceTypeId) || "Servicio desconocido",
    active: credential.active,
    createdAt: credential.createdAt,
    usageLimit: credential.usageLimit,
    usageUnit: credential.usageUnit,
    usageResetAt: credential.usageResetAt,
  }))

  return [...messagingItems, ...aiItems]
}

export default function CredentialsGraphView() {
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [credentialItems, setCredentialItems] = useState<CredentialGraphItem[]>([])
  const [selectedCredentialNodeId, setSelectedCredentialNodeId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [messagingServices, messagingCredentialsResponse, aiServices, aiCredentialsResponse] =
        await Promise.all([
          apiService.getMessagingServices(),
          apiService.getMessagingCredentials(0, 200, true),
          apiService.getAiServices(),
          apiService.getAiCredentials(0, 200, true),
        ])

      const normalized = normalizeCredentials(
        messagingCredentialsResponse.content,
        messagingServices,
        aiCredentialsResponse.content,
        aiServices,
      )

      setCredentialItems(normalized)
      setSelectedCredentialNodeId((current) =>
        current && normalized.some((item) => item.nodeId === current) ? current : null,
      )
    } catch (loadError) {
      console.error("Error loading credentials graph data:", loadError)
      setError("No se pudieron cargar las credenciales.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedCredentialDetail = useMemo(() => {
    if (!selectedCredentialNodeId) return null
    return credentialItems.find((item) => item.nodeId === selectedCredentialNodeId) || null
  }, [credentialItems, selectedCredentialNodeId])

  const messagingItems = useMemo(
    () =>
      credentialItems
        .filter((item) => item.credentialType === "messaging")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [credentialItems],
  )

  const aiItems = useMemo(
    () =>
      credentialItems
        .filter((item) => item.credentialType === "ai")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [credentialItems],
  )

  const nodes = useMemo<Node<CompanyNodeData | CategoryNodeData | CredentialNodeData>[]>(() => {
    const nodeList: Node<CompanyNodeData | CategoryNodeData | CredentialNodeData>[] = []

    if (isMobile) {
      const companyY = 40
      const messagingCategoryY = 220
      const aiCategoryY = 540
      const credentialX = 360

      nodeList.push({
        id: COMPANY_NODE_ID,
        type: "companyNode",
        position: { x: 20, y: companyY },
        data: { label: "Tu empresa" },
      })

      nodeList.push({
        id: MESSAGING_CATEGORY_NODE_ID,
        type: "categoryNode",
        position: { x: 20, y: messagingCategoryY },
        data: { label: "Mensajería", credentialCount: messagingItems.length, type: "messaging" },
      })

      nodeList.push({
        id: AI_CATEGORY_NODE_ID,
        type: "categoryNode",
        position: { x: 20, y: aiCategoryY },
        data: { label: "Inteligencia Artificial", credentialCount: aiItems.length, type: "ai" },
      })

      messagingItems.forEach((item, index) => {
        nodeList.push({
          id: item.nodeId,
          type: "credentialNode",
          position: { x: credentialX, y: messagingCategoryY - 20 + index * 130 },
          data: { item, isSelected: selectedCredentialNodeId === item.nodeId },
        })
      })

      aiItems.forEach((item, index) => {
        nodeList.push({
          id: item.nodeId,
          type: "credentialNode",
          position: { x: credentialX, y: aiCategoryY - 20 + index * 130 },
          data: { item, isSelected: selectedCredentialNodeId === item.nodeId },
        })
      })

      return nodeList
    }

    const companyY = 300
    const categoryX = 340
    const credentialX = 700
    const messagingY = 120
    const aiY = 520

    nodeList.push({
      id: COMPANY_NODE_ID,
      type: "companyNode",
      position: { x: 40, y: companyY },
      data: { label: "Tu empresa" },
    })

    nodeList.push({
      id: MESSAGING_CATEGORY_NODE_ID,
      type: "categoryNode",
      position: { x: categoryX, y: messagingY },
      data: { label: "Mensajería", credentialCount: messagingItems.length, type: "messaging" },
    })

    nodeList.push({
      id: AI_CATEGORY_NODE_ID,
      type: "categoryNode",
      position: { x: categoryX, y: aiY },
      data: { label: "Inteligencia Artificial", credentialCount: aiItems.length, type: "ai" },
    })

    messagingItems.forEach((item, index) => {
      nodeList.push({
        id: item.nodeId,
        type: "credentialNode",
        position: { x: credentialX, y: messagingY - 40 + index * 130 },
        data: { item, isSelected: selectedCredentialNodeId === item.nodeId },
      })
    })

    aiItems.forEach((item, index) => {
      nodeList.push({
        id: item.nodeId,
        type: "credentialNode",
        position: { x: credentialX, y: aiY - 40 + index * 130 },
        data: { item, isSelected: selectedCredentialNodeId === item.nodeId },
      })
    })

    return nodeList
  }, [aiItems, isMobile, messagingItems, selectedCredentialNodeId])

  const edges = useMemo<Edge[]>(() => {
    const edgeList: Edge[] = [
      {
        id: "company-messaging",
        source: COMPANY_NODE_ID,
        sourceHandle: "to-messaging",
        target: MESSAGING_CATEGORY_NODE_ID,
        type: "bezier",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2, stroke: "#5413ee" },
      },
      {
        id: "company-ai",
        source: COMPANY_NODE_ID,
        sourceHandle: "to-ai",
        target: AI_CATEGORY_NODE_ID,
        type: "bezier",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2, stroke: "#84cc16" },
      },
    ]

    messagingItems.forEach((item) => {
      edgeList.push({
        id: `${MESSAGING_CATEGORY_NODE_ID}-${item.nodeId}`,
        source: MESSAGING_CATEGORY_NODE_ID,
        target: item.nodeId,
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2, stroke: "#8b5cf6" },
      })
    })

    aiItems.forEach((item) => {
      edgeList.push({
        id: `${AI_CATEGORY_NODE_ID}-${item.nodeId}`,
        source: AI_CATEGORY_NODE_ID,
        target: item.nodeId,
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { strokeWidth: 2, stroke: "#84cc16" },
      })
    })

    return edgeList
  }, [aiItems, messagingItems])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-danger-300 bg-danger-50 dark:border-danger-700 dark:bg-danger-900/20">
        <CardBody className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-danger-700 dark:text-danger-300">
            <Shield className="h-4 w-4" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button
            color="danger"
            variant="flat"
            startContent={<RefreshCw className="h-4 w-4" />}
            onPress={() => void loadData()}
          >
            Reintentar
          </Button>
        </CardBody>
      </Card>
    )
  }

  const totalCredentials = credentialItems.length

  return (
    <div className="py-6">
      <div className={`grid grid-cols-1 gap-4 ${selectedCredentialDetail ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <Card className="min-h-[540px] border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-col items-start gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
            <p className="text-base font-semibold text-slate-900 dark:text-white">Mapa de credenciales</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Vista de solo lectura de servicios de mensajería e inteligencia artificial.
            </p>
            {totalCredentials === 0 && (
              <p className="text-xs text-warning-700 dark:text-warning-300">
                No hay credenciales configuradas.
              </p>
            )}
          </CardHeader>
          <CardBody className="p-0">
            <div className={isMobile ? "h-[560px]" : "h-[calc(100vh-340px)] min-h-[540px]"}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  if (node.type === "credentialNode") {
                    setSelectedCredentialNodeId(node.id)
                    return
                  }
                  setSelectedCredentialNodeId(null)
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

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            selectedCredentialDetail
              ? "w-full translate-x-0 opacity-100 lg:min-w-[320px]"
              : "pointer-events-none w-0 translate-x-4 opacity-0"
          }`}
        >
          {selectedCredentialDetail && (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-col items-start gap-1">
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      Detalle de credencial
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Solo lectura</p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setSelectedCredentialNodeId(null)}
                    aria-label="Cerrar panel de detalles"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nombre</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedCredentialDetail.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tipo</p>
                    <p className="text-sm text-slate-900 dark:text-white">
                      {selectedCredentialDetail.credentialType === "messaging"
                        ? "Mensajería"
                        : "Inteligencia Artificial"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Estado</p>
                    <Chip
                      size="sm"
                      color={selectedCredentialDetail.active ? "success" : "danger"}
                      variant="flat"
                    >
                      {selectedCredentialDetail.active ? "Activo" : "Inactivo"}
                    </Chip>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Servicio</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCredentialDetail.serviceName}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Creado</p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {formatDate(selectedCredentialDetail.createdAt)}
                  </p>
                </div>

                <Divider />

                {selectedCredentialDetail.credentialType === "messaging" ? (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Webhook Identity</p>
                    <p className="break-all font-mono text-sm text-slate-900 dark:text-white">
                      {selectedCredentialDetail.webhookIdentity || "No definido"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Límite de uso</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedCredentialDetail.usageLimit
                          ? `${selectedCredentialDetail.usageLimit.toLocaleString()} ${selectedCredentialDetail.usageUnit || "tokens"}`
                          : "No definido"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Reset de uso</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedCredentialDetail.usageResetAt
                          ? formatDate(selectedCredentialDetail.usageResetAt)
                          : "No definido"}
                      </p>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
