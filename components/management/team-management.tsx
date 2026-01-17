"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Pagination,
  Card,
  CardBody,
  Skeleton,
  Textarea,
  Select,
  SelectItem,
} from "@heroui/react"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  Users,
  Calendar,
  Eye,
  Ban,
  CheckCircle,
  UserPlus,
  UserMinus,
} from "lucide-react"
import type { Team, TeamMember, CreateTeamRequest, UpdateTeamRequest } from "@/lib/api-types"
import { apiService } from "@/lib/api"
import { useApi } from "@/hooks/use-api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { toast } from "sonner"

interface TeamFormData {
  name: string
  description: string
}

export default function TeamManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
  })
  const [refreshKey, setRefreshKey] = useState(0)

  // Team members management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<any[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])

  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure()
  const {
    isOpen: isViewOpen,
    onOpen: onViewOpen,
    onOpenChange: onViewOpenChange,
  } = useDisclosure()
  const {
    isOpen: isMembersOpen,
    onOpen: onMembersOpen,
    onOpenChange: onMembersOpenChange,
  } = useDisclosure()

  // Cargar equipos con auto-cancelación y debounce
  const { data: teamsData, loading, error, refetch } = useApi(
    (signal) => apiService.getTeams(currentPage, pageSize, signal),
    [currentPage, refreshKey],
    DEBOUNCE_SEARCH_MS
  )

  const teams = teamsData?.content || []
  const totalElements = teamsData?.totalElements || 0

  // Filtrar equipos por búsqueda (frontend)
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Mostrar error si existe
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  // Debug: Monitor teamMembers changes
  useEffect(() => {
    console.log('🔄 teamMembers state changed:', teamMembers)
    console.log('📊 teamMembers length:', teamMembers.length)
  }, [teamMembers])

  // Reset page cuando cambia el término de búsqueda
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setCurrentPage(0)
    }
  }

  // Paginación
  const handlePageChange = (page: number) => {
    setCurrentPage(page - 1)
  }

  // Crear nuevo equipo
  const handleCreate = () => {
    setIsEditing(false)
    setSelectedTeam(null)
    setFormData({
      name: "",
      description: "",
    })
    onOpen()
  }

  // Editar equipo
  const handleEdit = (team: Team) => {
    setIsEditing(true)
    setSelectedTeam(team)
    setFormData({
      name: team.name,
      description: team.description || "",
    })
    onOpen()
  }

  // Ver detalles
  const handleView = (team: Team) => {
    setSelectedTeam(team)
    onViewOpen()
  }

  // Guardar (crear o editar)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del equipo es requerido")
      return
    }

    try {
      const teamData: CreateTeamRequest | UpdateTeamRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      }

      if (isEditing && selectedTeam) {
        await apiService.updateTeam(selectedTeam.id, teamData)
        toast.success("Equipo actualizado correctamente")
      } else {
        await apiService.createTeam(teamData)
        toast.success("Equipo creado correctamente")
      }

      setRefreshKey((prev) => prev + 1)
      onOpenChange()
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el equipo")
    }
  }

  // Confirmar eliminación
  const handleDeleteConfirm = (team: Team) => {
    setSelectedTeam(team)
    onDeleteOpen()
  }

  // Eliminar equipo
  const handleDelete = async () => {
    if (!selectedTeam) return

    try {
      await apiService.deleteTeam(selectedTeam.id)
      toast.success("Equipo eliminado correctamente")
      setRefreshKey((prev) => prev + 1)
      onDeleteOpenChange()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el equipo")
    }
  }

  // Activar/Desactivar equipo
  const handleToggleActive = async (team: Team) => {
    try {
      if (team.active) {
        await apiService.deactivateTeam(team.id)
        toast.success("Equipo desactivado correctamente")
      } else {
        await apiService.activateTeam(team.id)
        toast.success("Equipo activado correctamente")
      }
      setRefreshKey((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar el estado del equipo")
    }
  }

  // Gestionar miembros
  const handleManageMembers = async (team: Team) => {
    setSelectedTeam(team)
    setLoadingMembers(true)
    
    try {
      // Cargar miembros del equipo
      console.log('🔍 Loading members for team:', team.id)
      const members = await apiService.getTeamMembers(team.id)
      console.log('✅ Members received:', members)
      console.log('📊 Members count:', members?.length || 0)
      setTeamMembers(members || [])

      // Cargar usuarios disponibles (en API v1, los agentes son usuarios)
      const usersResponse = await apiService.getUsers(0, 100)
      console.log('👥 Available users:', usersResponse.content?.length || 0)
      setAvailableAgents(usersResponse.content || [])
      
      onMembersOpen()
    } catch (error: any) {
      console.error('❌ Error loading members:', error)
      toast.error(error.message || "Error al cargar los miembros")
    } finally {
      setLoadingMembers(false)
    }
  }

  // Agregar miembros al equipo
  const handleAddMembers = async () => {
    if (!selectedTeam || selectedAgentIds.length === 0) return

    try {
      await apiService.addTeamMembers(selectedTeam.id, selectedAgentIds)
      toast.success(`${selectedAgentIds.length} miembro(s) agregado(s) correctamente`)
      
      // Recargar miembros
      const members = await apiService.getTeamMembers(selectedTeam.id)
      setTeamMembers(members)
      setSelectedAgentIds([])
    } catch (error: any) {
      toast.error(error.message || "Error al agregar miembros")
    }
  }

  // Eliminar miembro del equipo
  const handleRemoveMember = async (agentId: string) => {
    if (!selectedTeam) return

    try {
      await apiService.deleteTeamMember(selectedTeam.id, agentId)
      toast.success("Miembro eliminado correctamente")
      
      // Recargar miembros
      const members = await apiService.getTeamMembers(selectedTeam.id)
      setTeamMembers(members)
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el miembro")
    }
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize))

  // Usuarios disponibles para agregar (que tengan agentId y no estén ya en el equipo)
  const agentsToAdd = availableAgents.filter(
    (user) => user.agentId && !teamMembers.some((member) => member.agentId === user.agentId)
  )

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Equipos</h1>
              <p className="text-default-500 mt-1">
                Administra equipos de agentes de tu organización
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={handleCreate}
            >
              Nuevo Equipo
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-2 w-full">
              <Input
                placeholder="Buscar equipos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                startContent={<Search className="w-4 h-4 text-default-400" />}
                className="flex-1"
                isClearable
                onClear={() => setSearchTerm("")}
              />
            </div>
          </CardBody>
        </Card>

        {/* Tabla de equipos */}
        <Card>
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de equipos"
              classNames={{
                wrapper: "min-h-[400px]",
              }}
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>DESCRIPCIÓN</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>CREADO</TableColumn>
                <TableColumn align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  loading ? (
                    <div className="flex flex-col gap-3 py-8">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-6">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/5 rounded-lg" />
                            <Skeleton className="h-3 w-2/5 rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    "No hay equipos disponibles"
                  )
                }
                isLoading={loading}
                loadingContent={<Spinner label="Cargando..." />}
              >
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{team.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-default-500 max-w-md truncate">
                        {team.description || "Sin descripción"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={team.active ? "success" : "danger"}
                        startContent={
                          team.active ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Ban className="w-3 h-3" />
                          )
                        }
                      >
                        {team.active ? "Activo" : "Inactivo"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-default-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(team.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleView(team)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="primary"
                          onPress={() => handleManageMembers(team)}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Acciones del equipo">
                            <DropdownItem
                              key="edit"
                              startContent={<Edit className="w-4 h-4" />}
                              onPress={() => handleEdit(team)}
                            >
                              Editar
                            </DropdownItem>
                            <DropdownItem
                              key="toggle"
                              startContent={
                                team.active ? (
                                  <Ban className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )
                              }
                              onPress={() => handleToggleActive(team)}
                            >
                              {team.active ? "Desactivar" : "Activar"}
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<Trash2 className="w-4 h-4" />}
                              onPress={() => handleDeleteConfirm(team)}
                            >
                              Eliminar
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Paginación */}
        {totalElements > pageSize && (
          <div className="flex justify-center mt-4">
            <Pagination
              total={totalPages}
              page={currentPage + 1}
              onChange={handlePageChange}
              showControls
              color="primary"
            />
          </div>
        )}

        {/* Modal Crear/Editar */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  {isEditing ? "Editar Equipo" : "Nuevo Equipo"}
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <Input
                      label="Nombre del Equipo"
                      placeholder="Ej: Ventas, Soporte, Marketing"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      isRequired
                      variant="bordered"
                    />

                    <Textarea
                      label="Descripción"
                      placeholder="Describe el propósito de este equipo..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      variant="bordered"
                      minRows={3}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancelar
                  </Button>
                  <Button color="primary" onPress={handleSave}>
                    {isEditing ? "Actualizar" : "Crear"}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Modal Ver Detalles */}
        <Modal isOpen={isViewOpen} onOpenChange={onViewOpenChange} size="2xl">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Detalles del Equipo</ModalHeader>
                <ModalBody>
                  {selectedTeam && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary">
                          <Users className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{selectedTeam.name}</h3>
                          <p className="text-sm text-default-500">
                            ID: {selectedTeam.id}
                          </p>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={selectedTeam.active ? "success" : "danger"}
                            className="mt-2"
                          >
                            {selectedTeam.active ? "Activo" : "Inactivo"}
                          </Chip>
                        </div>
                      </div>

                      {selectedTeam.description && (
                        <Card className="bg-default-50">
                          <CardBody>
                            <p className="text-sm text-default-500 mb-1">Descripción</p>
                            <p className="text-sm">{selectedTeam.description}</p>
                          </CardBody>
                        </Card>
                      )}

                      <Card className="bg-default-50">
                        <CardBody className="gap-3">
                          <div>
                            <p className="text-xs text-default-500 mb-1">Creado</p>
                            <p className="text-sm">{formatDate(selectedTeam.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-default-500 mb-1">
                              Última actualización
                            </p>
                            <p className="text-sm">{formatDate(selectedTeam.updatedAt)}</p>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button onPress={onClose}>Cerrar</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Modal Gestionar Miembros */}
        <Modal
          isOpen={isMembersOpen}
          onOpenChange={onMembersOpenChange}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  Miembros del Equipo: {selectedTeam?.name}
                </ModalHeader>
                <ModalBody>
                  {loadingMembers ? (
                    <div className="flex justify-center py-8">
                      <Spinner label="Cargando miembros..." />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Agregar miembros */}
                      <div>
                        <h4 className="font-semibold mb-2">Agregar Miembros</h4>
                        <div className="flex gap-2">
                          <Select
                            label="Seleccionar usuarios"
                            placeholder="Elige uno o más usuarios"
                            selectionMode="multiple"
                            selectedKeys={selectedAgentIds}
                            onSelectionChange={(keys) =>
                              setSelectedAgentIds(Array.from(keys) as string[])
                            }
                            variant="bordered"
                            className="flex-1"
                            renderValue={(items) => {
                              return (
                                <div className="flex flex-wrap gap-2">
                                  {items.map((item) => {
                                    const user = agentsToAdd.find(u => u.agentId === item.key)
                                    return (
                                      <Chip key={item.key} size="sm" variant="flat" color="primary">
                                        {user?.displayName || user?.name || item.key}
                                      </Chip>
                                    )
                                  })}
                                </div>
                              )
                            }}
                          >
                            {agentsToAdd.map((user) => (
                              <SelectItem key={user.agentId!} value={user.agentId!}>
                                {user.displayName || user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </Select>
                          <Button
                            color="primary"
                            onPress={handleAddMembers}
                            isDisabled={selectedAgentIds.length === 0}
                            startContent={<UserPlus className="w-4 h-4" />}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>

                      {/* Lista de miembros actuales */}
                      <div>
                        <h4 className="font-semibold mb-2">
                          Miembros Actuales ({teamMembers.length})
                        </h4>
                        {teamMembers.length === 0 ? (
                          <Card className="bg-default-50">
                            <CardBody>
                              <p className="text-sm text-default-400 text-center py-4">
                                Este equipo no tiene miembros
                              </p>
                            </CardBody>
                          </Card>
                        ) : (
                          <div className="space-y-2">
                            {teamMembers.map((member) => (
                              <Card key={member.agentId} className="bg-default-50">
                                <CardBody>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold">
                                        {member.agentName}
                                      </p>
                                      <p className="text-sm text-default-500">
                                        {member.agentEmail}
                                      </p>
                                    </div>
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      color="danger"
                                      variant="light"
                                      onPress={() => handleRemoveMember(member.agentId)}
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardBody>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button onPress={onClose}>Cerrar</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Modal Confirmar Eliminación */}
        <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Confirmar Eliminación</ModalHeader>
                <ModalBody>
                  <p>
                    ¿Estás seguro de que deseas eliminar el equipo{" "}
                    <strong>{selectedTeam?.name}</strong>? Esta acción no se puede
                    deshacer.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancelar
                  </Button>
                  <Button color="danger" onPress={handleDelete}>
                    Eliminar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  )
}
