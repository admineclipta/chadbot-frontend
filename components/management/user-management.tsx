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
  Switch,
  Select,
  SelectItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  User,
  Mail,
  Calendar,
  Eye,
  Shield,
  Info,
} from "lucide-react"
import type { UserDto, Role, RoleDto, UserRequest, UserUpdateRequest } from "@/lib/api-types"
import { useUserManagement } from "@/hooks/use-user-management"
import UserAvatar from "@/components/management/user-avatar"
import { apiService } from "@/lib/api"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface UserFormData {
  name: string
  displayName: string
  email: string
  password: string
  active: boolean
}

export default function UserManagement() {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null)
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null)
  const [loadingUserDetails, setLoadingUserDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    displayName: "",
    email: "",
    password: "",
    active: true,
  })

  // Estados para el modal de asignar roles
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [loadingRoles, setLoadingRoles] = useState(false)

  const {
    users,
    loading,
    totalCount,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useUserManagement()

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
    isOpen: isRolesOpen,
    onOpen: onRolesOpen,
    onOpenChange: onRolesOpenChange,
  } = useDisclosure()

  useEffect(() => {
    loadUsers(currentPage, pageSize)
  }, [currentPage, pageSize]) // Removemos loadUsers de las dependencias

  // Efecto para cargar roles iniciales cuando se abre el modal
  useEffect(() => {
    if (isRolesOpen) {
      // Cargar todos los roles cuando se abre el modal
      handleLoadRoles()
    }
  }, [isRolesOpen])

  // Handler seguro para cambio de página
  const handlePageChange = (page: number) => {
    const maxPages = Math.max(1, Math.ceil(totalCount / pageSize))
    // page viene de 1-indexed del componente Pagination, convertir a 0-indexed
    const validPage = Math.min(Math.max(1, page), maxPages) - 1
    setCurrentPage(validPage)
  }

  // Filtrar usuarios por término de búsqueda
  const filteredUsers = (users || [])
    .filter((user) => user && user.id !== undefined && user.id !== null) // Asegurar que cada usuario tenga un ID válido
    .filter(
      (user) =>
        (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

  // Abrir modal para crear usuario
  const handleCreate = () => {
    setSelectedUser(null)
    setIsEditing(false)
    setFormData({
      name: "",
      displayName: "",
      email: "",
      password: "",
      active: true,
    })
    onOpen()
  }

  // Abrir modal para editar usuario
  const handleEdit = (user: UserDto) => {
    setSelectedUser(user)
    setIsEditing(true)
    setFormData({
      name: user.name,
      displayName: user.displayName || "",
      email: user.email,
      password: "", // No mostrar password actual
      active: user.active,
    })
    onOpen()
  }

  // Ver detalles del usuario
  const handleView = async (user: UserDto) => {
    setSelectedUser(user)
    setSelectedUserDetails(user) // Usar directamente el usuario (ya tiene roles)
    onViewOpen()
  }

  // Preparar eliminación
  const handleDeleteConfirm = (user: UserDto) => {
    setSelectedUser(user)
    onDeleteOpen()
  }

  // Eliminar usuario
  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      await deleteUser(selectedUser.id)
      loadUsers(currentPage, pageSize)
      onDeleteOpenChange()
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  // Abrir modal para asignar roles
  const handleAssignRoles = async (user: UserDto) => {
    setSelectedUser(user)
    setSelectedRoles(new Set())
    
    // Usar los roles que ya vienen en el objeto usuario
    const userRoles = user.roles || []
    const userRoleIds = new Set(userRoles.map((role: RoleDto) => role.id.toString()))
    setSelectedRoles(userRoleIds)
    
    onRolesOpen()
  }

  // Cargar todos los roles disponibles
  const handleLoadRoles = async () => {
    setLoadingRoles(true)
    
    try {
      const roles = await apiService.getRoles()
      setAvailableRoles(roles)
    } catch (error) {
      console.error("Error loading roles:", error)
      toast.error("Error al cargar roles")
    } finally {
      setLoadingRoles(false)
    }
  }

  // Guardar asignación de roles
  const handleSaveRoles = async () => {
    if (!selectedUser) return

    try {
      const roleIds = Array.from(selectedRoles).map(id => parseInt(id))
      
      await apiService.assignRolesToUser({
        userId: selectedUser.id,
        roleIds: roleIds
      })
      
      // Recargar la lista de usuarios para reflejar los cambios de roles
      await loadUsers(currentPage, pageSize)
      
      toast.success("Roles asignados exitosamente")
      onRolesOpenChange()
    } catch (error) {
      console.error("Error assigning roles:", error)
      toast.error("Error al asignar roles")
    }
  }

  // Guardar usuario (crear o editar)
  const handleSave = async () => {
    try {
      if (isEditing && selectedUser) {
        // Actualizar usuario existente
        const updateData: UserUpdateRequest = {
          Email: formData.email,
          FirstName: formData.name.split(' ')[0] || formData.name,
          LastName: formData.name.split(' ').slice(1).join(' ') || '',
          IsActive: formData.active,
        }
        if (formData.password) {
          updateData.Password = formData.password
        }
        await updateUser(selectedUser.id, updateData)
      } else {
        // Crear nuevo usuario
        const newUserData: UserRequest = {
          Email: formData.email,
          Password: formData.password,
          FirstName: formData.name.split(' ')[0] || formData.name,
          LastName: formData.name.split(' ').slice(1).join(' ') || '',
          IsActive: formData.active,
        }
        await createUser(newUserData)
      }
      loadUsers(currentPage, pageSize)
      onOpenChange()
    } catch (error) {
      console.error("Error saving user:", error)
    }
  }

  const columns = [
    { key: "avatar", label: "" },
    { key: "name", label: "Nombre" },
    { key: "displayName", label: "Usuario" },
    { key: "email", label: "Email" },
    { key: "active", label: "Estado" },
    { key: "actions", label: "Acciones" },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Administración de Usuarios
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestiona usuarios del sistema (ABMC)
          </p>
        </div>
        <Button
          color="primary"
          onPress={handleCreate}
          startContent={<Plus className="h-4 w-4" />}
        >
          Nuevo Usuario
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, usuario o email..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          startContent={<Search className="h-4 w-4 text-gray-400" />}
          className="max-w-md"
        />
      </div>

      {/* Vista móvil - Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner label="Cargando usuarios..." />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay usuarios disponibles</p>
            </div>
          ) : (
            <>
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <UserAvatar user={user} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{user.name}</h3>
                          <p className="text-sm text-gray-500 truncate">@{user.displayName}</p>
                        </div>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={user.active ? "success" : "danger"}
                        >
                          {user.active ? "Activo" : "Inactivo"}
                        </Chip>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => handleView(user)}
                          startContent={<Eye className="w-4 h-4" />}
                          className="flex-1"
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => handleEdit(user)}
                          startContent={<Edit className="w-4 h-4" />}
                          className="flex-1"
                        >
                          Editar
                        </Button>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="flat">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            <DropdownItem
                              startContent={<Shield className="h-4 w-4" />}
                              onPress={() => handleAssignRoles(user)}
                            >
                              Roles
                            </DropdownItem>
                            <DropdownItem
                              color="danger"
                              startContent={<Trash2 className="h-4 w-4" />}
                              onPress={() => handleDeleteConfirm(user)}
                            >
                              Eliminar
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* Vista desktop - Tabla */
        <Table aria-label="Tabla de usuarios">
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={filteredUsers}
            isLoading={loading}
            loadingContent={<Spinner label="Cargando usuarios..." />}
          >
          {(user) => (
            <TableRow key={`user-${user.id}`}>
              <TableCell>
                <UserAvatar 
                  name={user.name} 
                  size="sm" 
                  showTooltip={true}
                />
              </TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.displayName || '-'}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Chip
                  color={user.active ? "success" : "danger"}
                  variant="flat"
                  size="sm"
                >
                  {user.active ? "Activo" : "Inactivo"}
                </Chip>
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key={`view-${user.id}`}
                      startContent={<Eye className="h-4 w-4" />}
                      onPress={() => handleView(user)}
                    >
                      Ver detalles
                    </DropdownItem>
                    <DropdownItem
                      key={`edit-${user.id}`}
                      startContent={<Edit className="h-4 w-4" />}
                      onPress={() => handleEdit(user)}
                    >
                      Editar
                    </DropdownItem>
                    <DropdownItem
                      key={`roles-${user.id}`}
                      startContent={<Shield className="h-4 w-4" />}
                      onPress={() => handleAssignRoles(user)}
                    >
                      Asignar roles
                    </DropdownItem>
                    <DropdownItem
                      key={`delete-${user.id}`}
                      color="danger"
                      startContent={<Trash2 className="h-4 w-4" />}
                      onPress={() => handleDeleteConfirm(user)}
                    >
                      Eliminar
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      )}

      {/* Paginación */}
      <div className="flex justify-center mt-4">
        {!loading && totalCount > 0 && Math.ceil(totalCount / pageSize) > 1 && (
          <Pagination
            key={`pagination-${totalCount}-${pageSize}`}
            total={Math.max(1, Math.ceil(totalCount / pageSize))}
            page={currentPage + 1}
            onChange={handlePageChange}
            showControls
            showShadow
            color="primary"
          />
        )}
      </div>

      {/* Modal de creación/edición */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {isEditing ? "Editar Usuario" : "Crear Usuario"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Nombre Completo"
                    placeholder="Ingrese el nombre completo"
                    value={formData.name}
                    onValueChange={(value) =>
                      setFormData({ ...formData, name: value })
                    }
                    startContent={<User className="h-4 w-4" />}
                  />
                  <Input
                    label="Usuario (displayName)"
                    placeholder="Ingrese el nombre de usuario"
                    value={formData.displayName}
                    onValueChange={(value) =>
                      setFormData({ ...formData, displayName: value })
                    }
                    startContent={<User className="h-4 w-4" />}
                  />
                  <Input
                    label="Email"
                    placeholder="Ingrese el email"
                    type="email"
                    value={formData.email}
                    onValueChange={(value) =>
                      setFormData({ ...formData, email: value })
                    }
                    startContent={<Mail className="h-4 w-4" />}
                  />
                  <Input
                    label={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
                    placeholder={isEditing ? "Dejar vacío para mantener actual" : "Ingrese la contraseña"}
                    type="password"
                    value={formData.password}
                    onValueChange={(value) =>
                      setFormData({ ...formData, password: value })
                    }
                  />
                  <div className="flex items-center justify-between">
                    <span>Estado del usuario</span>
                    <Switch
                      isSelected={formData.active}
                      onValueChange={(checked) =>
                        setFormData({ ...formData, active: checked })
                      }
                    >
                      {formData.active ? "Activo" : "Inactivo"}
                    </Switch>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
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

      {/* Modal de confirmación de eliminación */}
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirmar Eliminación
              </ModalHeader>
              <ModalBody>
                <p>
                  ¿Estás seguro de que deseas eliminar al usuario{" "}
                  <strong>
                    {selectedUser?.name}
                  </strong>
                  ?
                </p>
                <p className="text-sm text-gray-500">
                  Esta acción no se puede deshacer.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
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

      {/* Modal de visualización */}
      <Modal isOpen={isViewOpen} onOpenChange={onViewOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Detalles del Usuario
              </ModalHeader>
              <ModalBody>
                {selectedUserDetails ? (
                  <div className="space-y-4">
                    {/* Avatar y título del usuario */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <UserAvatar 
                        name={selectedUserDetails.name} 
                        size="lg" 
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {selectedUserDetails.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedUserDetails.email}
                        </p>
                        {selectedUserDetails.displayName && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            @{selectedUserDetails.displayName}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">ID</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{selectedUserDetails.id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Estado
                        </p>
                        <Chip
                          color={selectedUserDetails.active ? "success" : "danger"}
                          variant="flat"
                          size="sm"
                        >
                          {selectedUserDetails.active ? "Activo" : "Inactivo"}
                        </Chip>
                      </div>
                      {selectedUserDetails.agentId && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-500">Agent ID</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{selectedUserDetails.agentId}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500">Creado</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(selectedUserDetails.createdAt).toLocaleDateString()}</p>
                      </div>
                      {selectedUserDetails.lastLoginAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Último Login</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(selectedUserDetails.lastLoginAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Sección de Roles */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Roles Asignados
                      </p>
                      {selectedUserDetails.roles && selectedUserDetails.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedUserDetails.roles.map((role: any) => (
                            <div key={role.id} className="inline-flex">
                              {role.description ? (
                                <Popover placement="top" showArrow>
                                  <PopoverTrigger>
                                    <div className="cursor-help">
                                      <Chip
                                        color="primary"
                                        variant="flat"
                                        size="sm"
                                        startContent={<Shield className="h-3 w-3" />}
                                      >
                                        {role.name}
                                      </Chip>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="max-w-xs">
                                    <div className="px-1 py-2">
                                      <div className="text-small font-bold mb-1">Descripción</div>
                                      <div className="text-tiny text-gray-600 dark:text-gray-300">{role.description}</div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Chip
                                  color="primary"
                                  variant="flat"
                                  size="sm"
                                  startContent={<Shield className="h-3 w-3" />}
                                >
                                  {role.name}
                                </Chip>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          Sin roles asignados
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No se pudieron cargar los detalles del usuario</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de asignación de roles */}
      <Modal isOpen={isRolesOpen} onOpenChange={onRolesOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                    <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Gestionar Roles</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedUser?.name}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="pb-6">
                {loadingRoles ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Selecciona los roles para este usuario
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableRoles.map((role) => {
                          const isSelected = selectedRoles.has(role.id.toString())
                          return (
                            <div
                              key={role.id}
                              className={`
                                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                ${isSelected 
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                                }
                              `}
                              onClick={() => {
                                const newSelectedRoles = new Set(selectedRoles)
                                if (isSelected) {
                                  newSelectedRoles.delete(role.id.toString())
                                } else {
                                  newSelectedRoles.add(role.id.toString())
                                }
                                setSelectedRoles(newSelectedRoles)
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`
                                  flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                                  ${isSelected 
                                    ? 'border-primary-500 bg-primary-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                  }
                                `}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className={`
                                      font-medium text-sm
                                      ${isSelected 
                                        ? 'text-primary-900 dark:text-primary-100' 
                                        : 'text-gray-900 dark:text-gray-100'
                                      }
                                    `}>
                                      {role.name}
                                    </h5>
                                    {role.description && (
                                      <Popover placement="right" showArrow>
                                        <PopoverTrigger>
                                          <button
                                            className="inline-flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            style={{ width: '20px', height: '20px', minWidth: '20px' }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="max-w-xs">
                                          <div className="px-1 py-2">
                                            <div className="text-small font-bold mb-1">Descripción</div>
                                            <div className="text-tiny text-gray-600 dark:text-gray-300">{role.description}</div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  </div>
                                  <p className={`
                                    text-xs leading-relaxed
                                    ${isSelected 
                                      ? 'text-primary-700 dark:text-primary-300' 
                                      : 'text-gray-500 dark:text-gray-400'
                                    }
                                  `}>
                                    {role.code}
                                  </p>
                                </div>
                              </div>
                              
                              {isSelected && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {selectedRoles.size > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Roles seleccionados ({selectedRoles.size})
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(selectedRoles).map(roleId => {
                            const role = availableRoles.find(r => r.id.toString() === roleId)
                            return role ? (
                              <Chip
                                key={roleId}
                                size="sm"
                                color="primary"
                                variant="flat"
                                startContent={<Shield className="h-3 w-3" />}
                              >
                                {role.name}
                              </Chip>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleSaveRoles}
                  isDisabled={loadingRoles}
                  startContent={<Shield className="h-4 w-4" />}
                >
                  {loadingRoles ? "Guardando..." : "Guardar cambios"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
