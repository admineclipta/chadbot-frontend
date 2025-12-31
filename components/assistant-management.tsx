"use client"

import { useEffect, useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Spinner,
  Chip,
  Divider,
  Pagination,
  Switch,
  Avatar,
  Tooltip,
} from "@heroui/react"
import {
  Bot,
  Plus,
  Search,
  ArrowUpDown,
  Edit,
  Trash2,
  Star,
  StarOff,
} from "lucide-react"
import { apiService } from "@/lib/api"
import type { Assistant, Team } from "@/lib/api-types"
import { toast } from "sonner"
import AssistantForm from "./assistant-form"

type AssistantView = "list" | "create" | "edit"

export default function AssistantManagement() {
  // View state
  const [currentAssistantView, setCurrentAssistantView] = useState<AssistantView>("list")
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null)

  // Data states
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [defaultOnly, setDefaultOnly] = useState(false)
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // UI states
  const [loading, setLoading] = useState(true)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDefaultModalOpen, setIsDefaultModalOpen] = useState(false)
  const [isTeamSelectorModalOpen, setIsTeamSelectorModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Search debounce
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Load teams on mount
  useEffect(() => {
    loadTeams()
  }, [])

  // Load assistants cuando cambien los filtros
  useEffect(() => {
    loadAssistants()
  }, [currentPage, sortDirection, defaultOnly, selectedTeamId])

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      if (currentPage === 1) {
        loadAssistants()
      } else {
        setCurrentPage(1)
      }
    }, 500)

    setSearchTimeout(timeout)

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout)
    }
  }, [searchQuery])

  const loadTeams = async () => {
    try {
      const response = await apiService.getTeams(0, 100)
      setTeams(response.content)
    } catch (error) {
      console.error("Error loading teams:", error)
    }
  }

  const loadAssistants = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAssistants({
        page: currentPage - 1, // API usa 0-indexed
        size: 12,
        sortBy: "created_at",
        direction: sortDirection,
        ...(defaultOnly && { defaultOnly: true }),
        ...(selectedTeamId && { teamId: selectedTeamId }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      })
      setAssistants(response.content)
      setTotalPages(response.totalPages)
      setTotalElements(response.totalElements)
    } catch (error) {
      console.error("Error loading assistants:", error)
      toast.error("Error al cargar los asistentes")
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsPreviewModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingAssistantId(id)
    setCurrentAssistantView("edit")
  }

  const handleCreate = () => {
    setEditingAssistantId(null)
    setCurrentAssistantView("create")
  }

  const handleBackToList = () => {
    setCurrentAssistantView("list")
    setEditingAssistantId(null)
    loadAssistants()
  }

  const handleDeleteClick = (assistant: Assistant) => {
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
      loadAssistants()
    } catch (error) {
      console.error("Error deleting assistant:", error)
      toast.error("Error al eliminar el asistente")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetDefaultClick = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsDefaultModalOpen(true)
  }

  const handleSetDefaultConfirm = async () => {
    if (!selectedAssistant) return

    try {
      setActionLoading(true)
      await apiService.setAssistantAsDefault(selectedAssistant.id)
      toast.success("Asistente establecido como predeterminado")
      setIsDefaultModalOpen(false)
      loadAssistants()
    } catch (error) {
      console.error("Error setting assistant as default:", error)
      toast.error("Error al establecer como predeterminado")
    } finally {
      setActionLoading(false)
    }
  }

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "DESC" ? "ASC" : "DESC"))
  }

  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getTeamColor = (index: number) => {
    const pastelColors = [
      "#FFB3BA", // Pastel Pink
      "#BAFFC9", // Pastel Mint
      "#BAE1FF", // Pastel Blue
      "#FFFFBA", // Pastel Yellow
      "#FFD9BA", // Pastel Peach
      "#E0BBE4", // Pastel Lavender
      "#FFDFD3", // Pastel Coral
      "#C7CEEA", // Pastel Periwinkle
      "#B5EAD7", // Pastel Teal
      "#FFC8DD", // Pastel Rose
    ]
    return pastelColors[index % pastelColors.length]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {currentAssistantView === "list" && (
          <>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Asistentes</h1>
              <p className="text-default-500 mt-1">
                Gestiona tus asistentes de IA
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={handleCreate}
            >
              Nuevo Asistente
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-col gap-4">
              {/* Row 1: Search and Sort */}
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="Buscar asistentes..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  startContent={<Search className="w-4 h-4 text-default-400" />}
                  className="flex-1"
                  isClearable
                  onClear={() => setSearchQuery("")}
                />
                <Button
                  variant="flat"
                  startContent={<ArrowUpDown className="w-4 h-4" />}
                  onPress={toggleSortDirection}
                  className="md:w-auto"
                >
                  {sortDirection === "DESC" ? "Más recientes" : "Más antiguos"}
                </Button>
              </div>

              {/* Row 2: Filters */}
              <div className="flex flex-col md:flex-row gap-3 items-center">
                {/* Team Filter with AvatarGroup */}
                {teams.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-default-600">Equipos:</span>
                    <div className="flex items-center gap-2">
                      {/* Avatar for "All Teams" */}
                      <Tooltip content="Todos los equipos" placement="top">
                        <Avatar
                          name="Todos"
                          size="sm"
                          className={`cursor-pointer transition-all ${
                            !selectedTeamId
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "opacity-60 hover:opacity-100"
                          }`}
                          onClick={() => {
                            setSelectedTeamId("")
                            setCurrentPage(1)
                          }}
                          isBordered={!selectedTeamId}
                          style={{
                            backgroundColor: "#E8E8E8",
                          }}
                        />
                      </Tooltip>
                      
                      {/* Show first 3 teams */}
                      {teams.slice(0, 3).map((team, index) => (
                        <Tooltip key={team.id} content={team.name} placement="top">
                          <Avatar
                            name={getTeamInitials(team.name)}
                            size="sm"
                            className={`cursor-pointer transition-all ${
                              selectedTeamId === team.id
                                ? "ring-2 ring-success ring-offset-2 ring-offset-background"
                                : "opacity-60 hover:opacity-100"
                            }`}
                            onClick={() => {
                              setSelectedTeamId(team.id)
                              setCurrentPage(1)
                            }}
                            isBordered={selectedTeamId === team.id}
                            style={{
                              backgroundColor: getTeamColor(index),
                            }}
                          />
                        </Tooltip>
                      ))}
                      
                      {/* Show "+N" avatar if more than 3 teams */}
                      {teams.length > 3 && (
                        <Tooltip content="Ver más equipos" placement="top">
                          <Avatar
                            name={`+${teams.length - 3}`}
                            size="sm"
                            className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                            onClick={() => setIsTeamSelectorModalOpen(true)}
                            isBordered
                            style={{
                              backgroundColor: "#F0F0F0",
                            }}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}

                {/* Default Only Toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    isSelected={defaultOnly}
                    onValueChange={(value) => {
                      setDefaultOnly(value)
                      setCurrentPage(1)
                    }}
                  />
                  <span className="text-sm text-default-600">
                    Solo asistente predeterminado
                  </span>
                </div>

                {/* Results count */}
                <span className="text-sm text-default-500 ml-auto">
                  {totalElements} {totalElements === 1 ? "asistente" : "asistentes"}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" color="primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && assistants.length === 0 && (
          <Card>
            <CardBody className="py-20">
              <div className="flex flex-col items-center gap-3 text-center">
                <Bot className="w-16 h-16 text-default-300" />
                <div>
                  <h3 className="text-xl font-semibold mb-1">
                    No hay asistentes
                  </h3>
                  <p className="text-default-500">
                    {searchQuery || selectedTeamId || defaultOnly
                      ? "No se encontraron asistentes con los filtros aplicados"
                      : "Comienza creando tu primer asistente"}
                  </p>
                </div>
                {!searchQuery && !selectedTeamId && !defaultOnly && (
                  <Button
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={handleCreate}
                  >
                    Crear Asistente
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Assistants Grid */}
        {!loading && assistants.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assistants.map((assistant) => (
                <Card key={assistant.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-col items-start gap-2 pb-2">
                    <div className="flex items-center gap-3 w-full">
                      <Bot className="w-6 h-6 text-primary flex-shrink-0" />
                      <h3 className="text-lg font-semibold flex-1 truncate">
                        {assistant.name}
                      </h3>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {assistant.isDefault && (
                        <Chip size="sm" variant="flat" color="success">
                          Por defecto
                        </Chip>
                      )}
                      {assistant.isActive ? (
                        <Chip size="sm" variant="flat" color="primary">
                          Activo
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="flat" color="default">
                          Inactivo
                        </Chip>
                      )}
                    </div>
                  </CardHeader>
                  <CardBody className="gap-3 pt-0">
                    <p className="text-sm text-default-500 line-clamp-2">
                      {assistant.description}
                    </p>
                    <div className="text-xs text-default-400">
                      <p>Creado: {formatDate(assistant.createdAt)}</p>
                    </div>
                    <Divider />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => handlePreview(assistant)}
                        className="flex-1"
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        isIconOnly
                        onPress={() => handleEdit(assistant.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!assistant.isDefault && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="success"
                          isIconOnly
                          onPress={() => handleSetDefaultClick(assistant)}
                        >
                          <StarOff className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        isIconOnly
                        onPress={() => handleDeleteClick(assistant)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  showControls
                  color="primary"
                />
              </div>
            )}
          </>
        )}

        {/* Preview Modal */}
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-primary" />
                <span>{selectedAssistant?.name}</span>
              </div>
              <div className="flex gap-2">
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
                  <p className="text-sm font-semibold text-default-700 mb-2">
                    Descripción:
                  </p>
                  <p className="text-sm text-default-600">
                    {selectedAssistant?.description}
                  </p>
                </div>
                <Divider />
                <div>
                  <p className="text-sm font-semibold text-default-700 mb-2">
                    Prompt del Sistema:
                  </p>
                  <div className="bg-default-100 p-4 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {selectedAssistant?.systemPrompt || "Sin prompt configurado"}
                    </ReactMarkdown>
                  </div>
                </div>
                <Divider />
                <div className="text-sm text-default-500">
                  <p>
                    <strong>ID:</strong> {selectedAssistant?.id}
                  </p>
                  <p>
                    <strong>Creado:</strong>{" "}
                    {selectedAssistant && formatDate(selectedAssistant.createdAt)}
                  </p>
                  <p>
                    <strong>Actualizado:</strong>{" "}
                    {selectedAssistant && formatDate(selectedAssistant.updatedAt)}
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="flat"
                onPress={() => setIsPreviewModalOpen(false)}
              >
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

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
        >
          <ModalContent>
            <ModalHeader>Eliminar Asistente</ModalHeader>
            <ModalBody>
              <p>
                ¿Estás seguro de que deseas eliminar el asistente{" "}
                <strong>{selectedAssistant?.name}</strong>?
              </p>
              <p className="text-sm text-danger mt-2">
                Esta acción no se puede deshacer.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setIsDeleteModalOpen(false)}
                isDisabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                color="danger"
                onPress={handleDeleteConfirm}
                isLoading={actionLoading}
              >
                Eliminar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Set Default Confirmation Modal */}
        <Modal
          isOpen={isDefaultModalOpen}
          onClose={() => setIsDefaultModalOpen(false)}
        >
          <ModalContent>
            <ModalHeader>Establecer como Predeterminado</ModalHeader>
            <ModalBody>
              <p>
                ¿Deseas establecer <strong>{selectedAssistant?.name}</strong> como
                el asistente predeterminado?
              </p>
              <p className="text-sm text-warning mt-2">
                El asistente actual perderá este estado.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setIsDefaultModalOpen(false)}
                isDisabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                color="success"
                onPress={handleSetDefaultConfirm}
                isLoading={actionLoading}
                startContent={!actionLoading && <Star className="w-4 h-4" />}
              >
                Establecer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Team Selector Modal */}
        <Modal
          isOpen={isTeamSelectorModalOpen}
          onClose={() => setIsTeamSelectorModalOpen(false)}
          size="md"
        >
          <ModalContent>
            <ModalHeader>Seleccionar Equipo</ModalHeader>
            <ModalBody>
              <div className="space-y-2">
                {/* Option to show all teams */}
                <Card
                  isPressable
                  onPress={() => {
                    setSelectedTeamId("")
                    setCurrentPage(1)
                    setIsTeamSelectorModalOpen(false)
                  }}
                  className={`${
                    !selectedTeamId
                      ? "border-2 border-primary bg-primary-50 dark:bg-primary-900/20"
                      : ""
                  }`}
                >
                  <CardBody className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name="Todos" size="sm" color="primary" />
                      <div>
                        <p className="font-semibold">Todos los equipos</p>
                        <p className="text-xs text-default-500">
                          Mostrar asistentes de todos los equipos
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* List all teams */}
                {teams.map((team, index) => (
                  <Card
                    key={team.id}
                    isPressable
                    onPress={() => {
                      setSelectedTeamId(team.id)
                      setCurrentPage(1)
                      setIsTeamSelectorModalOpen(false)
                    }}
                    className={`${
                      selectedTeamId === team.id
                        ? "border-2 border-success bg-success-50 dark:bg-success-900/20"
                        : ""
                    }`}
                  >
                    <CardBody className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={getTeamInitials(team.name)}
                          size="sm"
                          style={{
                            backgroundColor: getTeamColor(index),
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{team.name}</p>
                          {team.description && (
                            <p className="text-xs text-default-500 line-clamp-1">
                              {team.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setIsTeamSelectorModalOpen(false)}
              >
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
          </>
        )}

        {/* Create/Edit Form View */}
        {(currentAssistantView === "create" || currentAssistantView === "edit") && (
          <AssistantForm 
            assistantId={editingAssistantId || undefined}
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  )
}
