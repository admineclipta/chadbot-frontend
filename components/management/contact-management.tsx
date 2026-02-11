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
} from "@heroui/react"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  User,
  Phone,
  Calendar,
  Eye,
  MessageSquare,
  Ban,
  CheckCircle,
} from "lucide-react"
import type { Contact, ContactRequest } from "@/lib/api-types"
import { apiService } from "@/lib/api"
import { useApi } from "@/hooks/use-api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface ContactFormData {
  fullName: string
  metadata: Record<string, any>
}

export default function ContactManagement() {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    metadata: {},
  })
  const [newMetadataKey, setNewMetadataKey] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const {
    isOpen: isAddFieldOpen,
    onOpen: onAddFieldOpen,
    onOpenChange: onAddFieldOpenChange,
  } = useDisclosure()
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

  // Cargar contactos con auto-cancelación y debounce
  const { data: contactsData, loading, error, refetch } = useApi(
    (signal) => apiService.getContacts(currentPage, pageSize, searchTerm || undefined, signal),
    [currentPage, searchTerm, refreshKey],
    DEBOUNCE_SEARCH_MS
  )

  const contacts = contactsData?.content || []
  const totalElements = contactsData?.totalElements || 0

  // Mostrar error si existe
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  // Buscar contactos (ya no necesario con debounce automático, pero lo mantenemos para el botón)
  const handleSearch = () => {
    setCurrentPage(0)
    setRefreshKey(prev => prev + 1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Handler seguro para cambio de página
  const handlePageChange = (page: number) => {
    const maxPages = Math.max(1, Math.ceil(totalElements / pageSize))
    const validPage = Math.min(Math.max(1, page), maxPages) - 1
    setCurrentPage(validPage)
  }

  // Abrir modal para crear contacto
  const handleCreate = () => {
    setSelectedContact(null)
    setIsEditing(false)
    setFormData({
      fullName: "",
      metadata: {},
    })
    onOpen()
  }

  // Abrir modal para editar contacto
  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact)
    setIsEditing(true)
    setFormData({
      fullName: contact.fullName,
      metadata: contact.metadata || {},
    })
    onOpen()
  }

  // Ver detalles del contacto
  const handleView = (contact: Contact) => {
    setSelectedContact(contact)
    onViewOpen()
  }

  // Preparar eliminación
  const handleDeleteConfirm = (contact: Contact) => {
    setSelectedContact(contact)
    onDeleteOpen()
  }

  // Eliminar contacto
  const handleDelete = async () => {
    if (!selectedContact) return

    try {
      await apiService.deleteContact(selectedContact.id)
      toast.success("Contacto eliminado exitosamente")
      setRefreshKey(prev => prev + 1)
      onDeleteOpenChange()
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast.error("Error al eliminar contacto")
    }
  }

  // Guardar contacto (crear o editar)
  const handleSave = async () => {
    try {
      if (!formData.fullName.trim()) {
        toast.error("El nombre completo es requerido")
        return
      }

      const contactData: ContactRequest = {
        fullName: formData.fullName,
        metadata: Object.keys(formData.metadata).length > 0 ? formData.metadata : undefined,
      }

      if (isEditing && selectedContact) {
        await apiService.updateContact(selectedContact.id, contactData)
        toast.success("Contacto actualizado exitosamente")
      } else {
        await apiService.createContact(contactData)
        toast.success("Contacto creado exitosamente")
      }

      setRefreshKey(prev => prev + 1)
      onOpenChange()
    } catch (error) {
      console.error("Error saving contact:", error)
      toast.error(isEditing ? "Error al actualizar contacto" : "Error al crear contacto")
    }
  }

  // Agregar campo de metadata
  const addMetadataField = () => {
    setNewMetadataKey("")
    onAddFieldOpen()
  }

  const confirmAddMetadataField = () => {
    if (newMetadataKey && newMetadataKey.trim()) {
      setFormData({
        ...formData,
        metadata: { ...formData.metadata, [newMetadataKey.trim()]: "" },
      })
      onAddFieldOpenChange()
    }
  }

  // Actualizar campo de metadata
  const updateMetadataField = (key: string, value: string) => {
    setFormData({
      ...formData,
      metadata: { ...formData.metadata, [key]: value },
    })
  }

  // Eliminar campo de metadata
  const removeMetadataField = (key: string) => {
    const newMetadata = { ...formData.metadata }
    delete newMetadata[key]
    setFormData({
      ...formData,
      metadata: newMetadata,
    })
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

  // Obtener el primer canal de mensajería
  const getPrimaryChannel = (contact: Contact) => {
    if (contact.messagingChannels && contact.messagingChannels.length > 0) {
      return contact.messagingChannels[0]
    }
    return null
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize))

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Contactos</h1>
              <p className="text-default-500 mt-1">
                Administra y visualiza los contactos de tu organización
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={handleCreate}
            >
              Nuevo Contacto
            </Button>
          </div>
        </div>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2 w-full">
            <Input
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              startContent={<Search className="w-4 h-4 text-default-400" />}
              className="flex-1"
              isClearable
              onClear={() => {
                setSearchTerm("")
                setCurrentPage(0)
              }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Vista móvil - Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded-lg" />
                        <Skeleton className="h-3 w-1/2 rounded-lg" />
                        <Skeleton className="h-3 w-2/3 rounded-lg" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </>
          ) : contacts.length === 0 ? (
            <Card>
              <CardBody className="p-8">
                <div className="text-center text-default-500">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay contactos disponibles</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              {contacts.map((contact) => {
                const primaryChannel = getPrimaryChannel(contact)
                return (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary flex-shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-base truncate">{contact.fullName}</h3>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={contact.blocked ? "danger" : "success"}
                              startContent={
                                contact.blocked ? (
                                  <Ban className="w-3 h-3" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )
                              }
                            >
                              {contact.blocked ? "Bloqueado" : "Activo"}
                            </Chip>
                          </div>
                          
                          {contact.metadata?.phone && (
                            <p className="text-sm text-default-600 flex items-center gap-1 mb-1">
                              <Phone className="w-3 h-3" />
                              {contact.metadata.phone}
                            </p>
                          )}
                          
                          {primaryChannel ? (
                            <div className="text-sm text-default-500 mb-2">
                              <span className="font-medium">{primaryChannel.serviceTypeName}</span>
                              <span className="mx-1">•</span>
                              <span className="text-xs">{primaryChannel.externalContactId}</span>
                            </div>
                          ) : (
                            <p className="text-sm text-default-400 mb-2">Sin canal</p>
                          )}
                          
                          <div className="flex items-center gap-1 text-xs text-default-400 mb-3">
                            <Calendar className="w-3 h-3" />
                            {formatDate(contact.createdAt)}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => handleView(contact)}
                              startContent={<Eye className="w-4 h-4" />}
                              className="flex-1"
                            >
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="primary"
                              onPress={() => handleEdit(contact)}
                              startContent={<Edit className="w-4 h-4" />}
                              className="flex-1"
                            >
                              Editar
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              color="danger"
                              onPress={() => handleDeleteConfirm(contact)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      ) : (
        /* Vista desktop - Tabla */
        <Card>
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de contactos"
              classNames={{
                wrapper: "min-h-[400px]",
              }}
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>CANAL PRINCIPAL</TableColumn>
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
                    "No hay contactos disponibles"
                  )
                }
                isLoading={loading}
                loadingContent={<Spinner label="Cargando..." />}
              >
                {contacts.map((contact) => {
                  const primaryChannel = getPrimaryChannel(contact)
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{contact.fullName}</p>
                            {contact.metadata?.phone && (
                              <p className="text-xs text-default-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.metadata.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {primaryChannel ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {primaryChannel.serviceTypeName}
                            </span>
                            <span className="text-xs text-default-500">
                              {primaryChannel.externalContactId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-default-400">Sin canal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={contact.blocked ? "danger" : "success"}
                          startContent={
                            contact.blocked ? (
                              <Ban className="w-3 h-3" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )
                          }
                        >
                          {contact.blocked ? "Bloqueado" : "Activo"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-default-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(contact.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => handleView(contact)}
                          >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Acciones del contacto">
                            <DropdownItem
                              key="edit"
                              startContent={<Edit className="w-4 h-4" />}
                              onPress={() => handleEdit(contact)}
                            >
                              Editar
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<Trash2 className="w-4 h-4" />}
                              onPress={() => handleDeleteConfirm(contact)}
                            >
                              Eliminar
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
      )}

      {/* Paginación */}
      {totalElements > pageSize && (
        <div className="flex justify-center">
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
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {isEditing ? "Editar Contacto" : "Nuevo Contacto"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Nombre Completo"
                    placeholder="Ej: Juan Pérez"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    isRequired
                    variant="bordered"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Metadata (Campos personalizados)
                      </label>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={addMetadataField}
                        startContent={<Plus className="w-3 h-3" />}
                      >
                        Agregar Campo
                      </Button>
                    </div>
                    <Card className="bg-default-50">
                      <CardBody className="gap-2">
                        {Object.keys(formData.metadata).length === 0 ? (
                          <p className="text-sm text-default-400 text-center py-4">
                            No hay campos personalizados
                          </p>
                        ) : (
                          Object.entries(formData.metadata).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <Input
                                size="sm"
                                label={key}
                                value={value as string}
                                onChange={(e) =>
                                  updateMetadataField(key, e.target.value)
                                }
                                variant="bordered"
                              />
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => removeMetadataField(key)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </CardBody>
                    </Card>
                    <p className="text-xs text-default-400">
                      Los canales de mensajería se configurarán automáticamente cuando el
                      contacto envíe un mensaje
                    </p>
                  </div>
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
              <ModalHeader>Detalles del Contacto</ModalHeader>
              <ModalBody>
                {selectedContact && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary">
                        <User className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">
                          {selectedContact.fullName}
                        </h3>
                        <p className="text-sm text-default-500">
                          ID: {selectedContact.id}
                        </p>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={selectedContact.blocked ? "danger" : "success"}
                          className="mt-2"
                        >
                          {selectedContact.blocked ? "Bloqueado" : "Activo"}
                        </Chip>
                      </div>
                    </div>

                    <Card className="bg-default-50">
                      <CardBody className="gap-3">
                        <div>
                          <p className="text-xs text-default-500 mb-1">Creado</p>
                          <p className="text-sm">
                            {formatDate(selectedContact.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-default-500 mb-1">
                            Última actualización
                          </p>
                          <p className="text-sm">
                            {formatDate(selectedContact.updatedAt)}
                          </p>
                        </div>
                      </CardBody>
                    </Card>

                    {selectedContact.metadata &&
                      Object.keys(selectedContact.metadata).length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Metadata</h4>
                          <Card className="bg-default-50">
                            <CardBody className="gap-2">
                              {Object.entries(selectedContact.metadata).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-sm text-default-500">
                                      {key}:
                                    </span>
                                    <span className="text-sm font-medium">
                                      {String(value)}
                                    </span>
                                  </div>
                                )
                              )}
                            </CardBody>
                          </Card>
                        </div>
                      )}

                    {selectedContact.messagingChannels &&
                      selectedContact.messagingChannels.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Canales de Mensajería
                          </h4>
                          <div className="space-y-2">
                            {selectedContact.messagingChannels.map(
                              (channel, index) => (
                                <Card key={index} className="bg-default-50">
                                  <CardBody className="gap-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">
                                        {channel.serviceTypeName}
                                      </span>
                                      <Chip size="sm" variant="flat" color="primary">
                                        {channel.externalContactId}
                                      </Chip>
                                    </div>
                                    {channel.metadata &&
                                      Object.keys(channel.metadata).length > 0 && (
                                        <div className="text-xs text-default-500">
                                          {Object.entries(channel.metadata).map(
                                            ([key, value]) => (
                                              <div key={key}>
                                                {key}: {String(value)}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                  </CardBody>
                                </Card>
                              )
                            )}
                          </div>
                        </div>
                      )}
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

      {/* Modal Agregar Campo Metadata */}
      <Modal isOpen={isAddFieldOpen} onOpenChange={onAddFieldOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Agregar Campo Personalizado</ModalHeader>
              <ModalBody>
                <Input
                  label="Nombre del campo"
                  placeholder="Ej: teléfono, empresa, ciudad..."
                  value={newMetadataKey}
                  onChange={(e) => setNewMetadataKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      confirmAddMetadataField()
                    }
                  }}
                  autoFocus
                  variant="bordered"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  onPress={confirmAddMetadataField}
                  isDisabled={!newMetadataKey.trim()}
                >
                  Agregar
                </Button>
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
                  ¿Estás seguro de que deseas eliminar el contacto{" "}
                  <strong>{selectedContact?.fullName}</strong>? Esta acción no se
                  puede deshacer.
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
