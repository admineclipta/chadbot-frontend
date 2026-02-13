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
  Spinner,
  Avatar,
} from "@heroui/react"
import { UserPlus, Search } from "lucide-react"
import { toast } from "sonner"
import { apiService } from "@/lib/api"
import type { UserDto } from "@/lib/api-types"

interface AssignConversationModalProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  customerName: string
  currentAssignedUserId?: string | number | null // ID del usuario actualmente asignado
  currentUser?: { id: string; name?: string; [key: string]: any } // Usuario logueado actual
  onAssignSuccess: (userName: string) => void
}

export default function AssignConversationModal({
  isOpen,
  onClose,
  conversationId,
  customerName,
  currentAssignedUserId,
  currentUser,
  onAssignSuccess,
}: AssignConversationModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [users, setUsers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentAssignedUser, setCurrentAssignedUser] = useState<UserDto | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const isUnassigned = currentAssignedUserId === null || currentAssignedUserId === undefined || currentAssignedUserId === -1 || currentAssignedUserId === "-1"

  const getUserDisplayName = (user: UserDto) => user.displayName || user.name || user.email
  const getSearchableText = (user: UserDto) =>
    `${user.displayName || ""} ${user.name || ""} ${user.email || ""}`.toLowerCase()

  // Buscar usuarios cuando cambie el término de búsqueda
  useEffect(() => {
    const searchUsers = async () => {
      if (!isOpen || !initialLoadDone) return

      try {
        setSearchLoading(true)
        const response = await apiService.getUsers(0, 100, true)
        // Filtrar solo usuarios activos
        let activeUsers = response.content.filter(user => user.active)

        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          activeUsers = activeUsers.filter((user) => getSearchableText(user).includes(term))
        }
        
        // Asegurar que el usuario logueado siempre esté en la lista si no está ya
        if (currentUser) {
          const currentUserId = currentUser.id
          const userInList = activeUsers.find(user => user.id === currentUserId)
          
          if (!userInList) {
            // Crear el objeto del usuario logueado si no está en la lista
            const loggedUserObj = {
              id: currentUserId,
              clientId: "",
              email: currentUser.email || "",
              name: currentUser.name || "Usuario",
              displayName: currentUser.name || "Usuario",
              agentId: currentUserId,
              active: true,
              lastLoginAt: null,
              createdAt: new Date().toISOString(),
              roles: [],
            }
            
            // Solo agregar si coincide con el término de búsqueda o si no hay término
            if (!searchTerm || getSearchableText(loggedUserObj).includes(searchTerm.toLowerCase())) {
              activeUsers.unshift(loggedUserObj)
            }
          }
        }
        
        setUsers(activeUsers)
      } catch (error) {
        console.error("Error al buscar usuarios:", error)
        toast.error("Error al cargar usuarios")
        setUsers([])
      } finally {
        setSearchLoading(false)
      }
    }

    // Debounce la búsqueda - solo si ya se completó la carga inicial
    if (initialLoadDone) {
      const timeoutId = setTimeout(searchUsers, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [searchTerm, isOpen, initialLoadDone])

  // Cargar usuario actualmente asignado cuando se abre el modal
  useEffect(() => {
    const loadCurrentAssignedUser = async () => {
      try {
        if (!isUnassigned && currentAssignedUserId) {
          // Si hay un usuario asignado, cargarlo
          const allUsers = await apiService.getUsers(0, 100, true)
          const assignedUser = allUsers.content.find(user => user.id === String(currentAssignedUserId))
          
          if (assignedUser) {
            setCurrentAssignedUser(assignedUser)
            setSelectedUserId(assignedUser.id)
            setUsers([assignedUser])
          } else {
            setCurrentAssignedUser(null)
          }
        } else if (currentUser) {
          // Si no hay usuario asignado, preseleccionar al usuario actual
          const allUsers = await apiService.getUsers(0, 100, true)
          let loggedUser = allUsers.content.find(user => user.id === currentUser.id)
          
          // Si el usuario logueado no está en la lista de agentes, crearlo
          if (!loggedUser && currentUser.name) {
            loggedUser = {
              id: currentUser.id,
              clientId: "",
              email: currentUser.email || "",
              name: currentUser.name,
              displayName: currentUser.name,
              agentId: currentUser.id,
              active: true,
              lastLoginAt: null,
              createdAt: new Date().toISOString(),
              roles: [],
            }
          }
          
          if (loggedUser) {
            setSelectedUserId(loggedUser.id)
            // Incluir al usuario logueado en la lista inicial
            const usersWithLoggedUser = loggedUser ? [loggedUser] : []
            setUsers(usersWithLoggedUser)
          }
          setCurrentAssignedUser(null)
        } else {
          setCurrentAssignedUser(null)
        }
      } catch (error) {
        console.error("Error al cargar usuario:", error)
        setCurrentAssignedUser(null)
      } finally {
        setInitialLoadDone(true)
      }
    }

    if (isOpen) {
      setInitialLoadDone(false)
      loadCurrentAssignedUser()
    }
  }, [isOpen, currentAssignedUserId])

  // Limpiar estado al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("")
      setSelectedUserId("")
      setUsers([])
      setCurrentAssignedUser(null)
      setInitialLoadDone(false)
    }
  }, [isOpen])

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("Por favor selecciona un agente")
      return
    }

    try {
      setAssigning(true)
      
      await apiService.assignConversation(conversationId, {
        agentIds: [selectedUserId],
      })

      // Encontrar el nombre del usuario asignado
      const assignedUser = users.find(user => user.id === selectedUserId)
      const userName = assignedUser ? getUserDisplayName(assignedUser) : "el agente"

      // Mostrar toast de éxito
      toast.success(`Conversación asignada exitosamente`, {
        description: `La conversación con ${customerName} ha sido asignada a ${userName}`,
      })

      // Notificar al componente padre
      onAssignSuccess(userName)
      
      // Cerrar modal
      onClose()
    } catch (error) {
      console.error("Error al asignar conversación:", error)
      toast.error("Error al asignar conversación", {
        description: "No se pudo asignar la conversación. Inténtalo nuevamente.",
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async () => {
    try {
      setAssigning(true)
      
      // Usar el endpoint específico de unassign
      await apiService.unassignConversacion({
        ConversationId: parseInt(conversationId),
        StatusName: "Activa"
      })

      // Mostrar toast de éxito
      toast.success("Conversación desasignada exitosamente", {
        description: `La conversación con ${customerName} ahora será manejada por inteligencia artificial`,
      })

      // Notificar al componente padre
          onAssignSuccess("Inteligencia Artificial")
      
      // Cerrar modal
      onClose()
    } catch (error) {
      console.error("Error al desasignar conversación:", error)
      toast.error("Error al desasignar conversación", {
        description: "No se pudo desasignar la conversación. Inténtalo nuevamente.",
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleClose = () => {
    if (!assigning) {
      onClose()
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="md"
      isDismissable={!assigning}
      hideCloseButton={assigning}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Asignar Conversación</span>
          </div>
          <p className="text-sm text-gray-500 font-normal">
            Asignar la conversación con <strong>{customerName}</strong> a un agente
          </p>
        </ModalHeader>
        
        <ModalBody>
          <div className="space-y-4">
            {/* Información del usuario actualmente asignado */}
            {currentAssignedUser && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                  ACTUALMENTE ASIGNADO A:
                </p>
                <div className="flex items-center gap-3">
                  <Avatar
                    size="sm"
                    name={getUserDisplayName(currentAssignedUser)}
                    className="flex-shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {getUserDisplayName(currentAssignedUser)}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {currentAssignedUser.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay asignación */}
            {initialLoadDone && !currentAssignedUser && isUnassigned && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                  ESTADO ACTUAL:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Conversación manejada por inteligencia artificial
                </p>
              </div>
            )}

            {/* Campo de búsqueda */}
            <Input
              placeholder="Buscar agente por nombre..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              startContent={<Search className="h-4 w-4 text-gray-400" />}
              endContent={searchLoading && <Spinner size="sm" />}
              disabled={assigning}
            />

            {/* Selector de usuario */}
            <Select
              placeholder="Seleccionar agente"
              aria-label="Seleccionar agente para asignar la conversación"
              selectedKeys={selectedUserId ? [selectedUserId] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setSelectedUserId(selected || "")
              }}
              disabled={assigning || users.length === 0}
              isLoading={searchLoading}
            >
              {users.map((user) => (
                <SelectItem
                  key={user.id}
                  textValue={getUserDisplayName(user)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      size="sm"
                      name={getUserDisplayName(user)}
                      className="flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {getUserDisplayName(user)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </Select>

            {/* Mensaje cuando no hay usuarios */}
            {!searchLoading && users.length === 0 && searchTerm && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No se encontraron agentes con el término "{searchTerm}"
              </div>
            )}

            {/* Mensaje inicial */}
            {!searchLoading && users.length === 0 && !searchTerm && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Escribe para buscar agentes disponibles
              </div>
            )}
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button 
            color="danger" 
            variant="light" 
            onPress={handleClose}
            disabled={assigning}
          >
            Cancelar
          </Button>
          
          {/* Botón para desasignar (solo si hay usuario asignado) */}
          {currentAssignedUser && (
            <Button 
              color="warning" 
              variant="flat"
              onPress={handleUnassign}
              disabled={assigning}
              isLoading={assigning}
            >
              {assigning ? "Desasignando..." : "Desasignar"}
            </Button>
          )}
          
          <Button 
            color="primary" 
            onPress={handleAssign}
            disabled={!selectedUserId || assigning}
            isLoading={assigning}
            startContent={!assigning && <UserPlus className="h-4 w-4" />}
          >
            {assigning ? "Asignando..." : currentAssignedUser ? "Reasignar" : "Asignar"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
