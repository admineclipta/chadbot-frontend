"use client"

import { useState } from "react"
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
  Switch,
} from "@heroui/react"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  Tag as TagIcon,
  Eye,
} from "lucide-react"
import type { Tag, CreateTagRequest, UpdateTagRequest } from "@/lib/api-types"
import { apiService } from "@/lib/api"
import { useApi } from "@/hooks/use-api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface TagFormData {
  label: string
  color: string
  isPrivate: boolean
}

// Colores predefinidos para tags
const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#64748b", // slate
]

export default function TagManagement() {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TagFormData>({
    label: "",
    color: TAG_COLORS[0],
    isPrivate: false,
  })
  const [refreshKey, setRefreshKey] = useState(0)

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

  // Cargar tags con auto-cancelación y debounce
  const { data: tagsData, loading, error, refetch } = useApi(
    (signal) => apiService.getTags(currentPage, pageSize, searchTerm, signal),
    [currentPage, searchTerm, refreshKey],
    DEBOUNCE_SEARCH_MS
  )

  const tags = tagsData?.content || []
  const totalPages = tagsData?.totalPages || 0
  const totalElements = tagsData?.totalElements || 0

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(0) // Reset page on search
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedTag(null)
    setFormData({
      label: "",
      color: TAG_COLORS[0],
      isPrivate: false,
    })
    onOpen()
  }

  const handleEdit = (tag: Tag) => {
    setIsEditing(true)
    setSelectedTag(tag)
    setFormData({
      label: tag.label,
      color: tag.color,
      isPrivate: tag.isPrivate,
    })
    onOpen()
  }

  const handleView = (tag: Tag) => {
    setSelectedTag(tag)
    onViewOpen()
  }

  const handleDeleteClick = (tag: Tag) => {
    setSelectedTag(tag)
    onDeleteOpen()
  }

  const handleSubmit = async () => {
    try {
      if (isEditing && selectedTag) {
        const updateData: UpdateTagRequest = {
          label: formData.label,
          color: formData.color,
          isPrivate: formData.isPrivate,
        }
        await apiService.updateTag(selectedTag.id, updateData)
        toast.success("Tag actualizado exitosamente")
      } else {
        const createData: CreateTagRequest = {
          label: formData.label,
          color: formData.color,
          isPrivate: formData.isPrivate,
        }
        await apiService.createTag(createData)
        toast.success("Tag creado exitosamente")
      }
      setRefreshKey((prev) => prev + 1)
      onOpenChange()
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el tag")
    }
  }

  const handleDelete = async () => {
    if (!selectedTag) return

    try {
      await apiService.deleteTag(selectedTag.id)
      toast.success("Tag eliminado exitosamente")
      setRefreshKey((prev) => prev + 1)
      onDeleteOpenChange()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el tag")
    }
  }

  // Render helpers
  const renderColorPicker = () => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Color</label>
      <div className="grid grid-cols-6 md:grid-cols-9 gap-2">
        {TAG_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setFormData({ ...formData, color })}
            className={cn(
              "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
              formData.color === color
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : "border-default-200"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div
          className="w-12 h-12 rounded-lg border-2 border-default-200"
          style={{ backgroundColor: formData.color }}
        />
        <Input
          label="Color personalizado"
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="flex-1"
        />
      </div>
    </div>
  )

  const renderTagChip = (tag: Tag) => (
    <Chip
      style={{
        backgroundColor: tag.color,
        color: getContrastColor(tag.color),
      }}
      variant="flat"
      size="sm"
    >
      {tag.label}
    </Chip>
  )

  // Utility: Determine text color based on background
  const getContrastColor = (hexColor: string) => {
    const rgb = parseInt(hexColor.slice(1), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = (rgb >> 0) & 0xff
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma < 128 ? "#ffffff" : "#000000"
  }

  // Mobile card view
  const renderMobileCard = (tag: Tag) => (
    <Card key={tag.id} className="mb-3">
      <CardBody>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="w-4 h-4 text-default-500" />
              <span className="font-semibold">{tag.label}</span>
            </div>
            <div className="mb-2">{renderTagChip(tag)}</div>
            <div className="text-xs text-default-500">
              ID: {tag.id.slice(0, 8)}...
            </div>
            {tag.isPrivate && (
              <Chip size="sm" color="warning" variant="flat" className="mt-2">
                Privado
              </Chip>
            )}
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Acciones del tag">
              <DropdownItem
                key="view"
                startContent={<Eye className="w-4 h-4" />}
                onPress={() => handleView(tag)}
              >
                Ver detalles
              </DropdownItem>
              <DropdownItem
                key="edit"
                startContent={<Edit className="w-4 h-4" />}
                onPress={() => handleEdit(tag)}
              >
                Editar
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Trash2 className="w-4 h-4" />}
                onPress={() => handleDeleteClick(tag)}
              >
                Eliminar
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </CardBody>
    </Card>
  )

  // Desktop table view
  const renderDesktopTable = () => (
    <Table aria-label="Tags">
      <TableHeader>
        <TableColumn>NOMBRE</TableColumn>
        <TableColumn>VISTA PREVIA</TableColumn>
        <TableColumn>COLOR</TableColumn>
        <TableColumn>TIPO</TableColumn>
        <TableColumn>FECHA CREACIÓN</TableColumn>
        <TableColumn>ACCIONES</TableColumn>
      </TableHeader>
      <TableBody
        items={tags}
        emptyContent="No se encontraron tags"
        loadingContent={<Spinner />}
        loadingState={loading ? "loading" : "idle"}
      >
        {(tag) => (
          <TableRow key={tag.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-default-500" />
                <span className="font-medium">{tag.label}</span>
              </div>
            </TableCell>
            <TableCell>{renderTagChip(tag)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-default-200"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs text-default-500">{tag.color}</span>
              </div>
            </TableCell>
            <TableCell>
              {tag.isPrivate ? (
                <Chip size="sm" color="warning" variant="flat">
                  Privado
                </Chip>
              ) : (
                <Chip size="sm" color="success" variant="flat">
                  Público
                </Chip>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm text-default-500">
                {new Date(tag.createdAt).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </TableCell>
            <TableCell>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Acciones del tag">
                  <DropdownItem
                    key="view"
                    startContent={<Eye className="w-4 h-4" />}
                    onPress={() => handleView(tag)}
                  >
                    Ver detalles
                  </DropdownItem>
                  <DropdownItem
                    key="edit"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => handleEdit(tag)}
                  >
                    Editar
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => handleDeleteClick(tag)}
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
  )

  return (
    <div className="h-full flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Tags</h1>
          <p className="text-sm text-default-500 mt-1">
            Administra las etiquetas para organizar conversaciones
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={handleCreate}
          className="w-full md:w-auto"
        >
          Crear Tag
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          className="flex-1"
          placeholder="Buscar tags..."
          startContent={<Search className="w-4 h-4 text-default-400" />}
          value={searchTerm}
          onValueChange={handleSearch}
          isClearable
          onClear={() => handleSearch("")}
        />
        {totalElements > 0 && (
          <div className="flex items-center gap-2 text-sm text-default-500">
            <TagIcon className="w-4 h-4" />
            <span>
              {totalElements} tag{totalElements !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="bg-danger-50 border-danger-200">
          <CardBody>
            <p className="text-danger text-sm">{error.message}</p>
          </CardBody>
        </Card>
      )}

      {/* Content: Mobile Cards or Desktop Table */}
      <div className="flex-1 overflow-auto">
        {loading && !tags.length ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardBody>
                  <Skeleton className="h-16 rounded" />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : isMobile ? (
          tags.map(renderMobileCard)
        ) : (
          renderDesktopTable()
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={totalPages}
            page={currentPage + 1}
            onChange={(page) => setCurrentPage(page - 1)}
            showControls
            size={isMobile ? "sm" : "md"}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size={isMobile ? "full" : "2xl"}
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <TagIcon className="w-5 h-5" />
                  <span>{isEditing ? "Editar Tag" : "Crear Nuevo Tag"}</span>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Nombre del tag"
                    placeholder="Ej: Cliente VIP, Urgente, Seguimiento..."
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    isRequired
                  />
                  <Switch
                    isSelected={formData.isPrivate}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isPrivate: value })
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Tag Privado</span>
                      <span className="text-xs text-default-500">
                        Solo tú podrás ver este tag
                      </span>
                    </div>
                  </Switch>
                  {renderColorPicker()}
                  <div className="p-4 bg-default-100 rounded-lg">
                    <p className="text-sm font-medium mb-2">Vista previa:</p>
                    <div className="flex items-center gap-2">
                      <Chip
                        style={{
                          backgroundColor: formData.color,
                          color: getContrastColor(formData.color),
                        }}
                        variant="flat"
                      >
                        {formData.label || "Nombre del tag"}
                      </Chip>
                      {formData.isPrivate && (
                        <Chip size="sm" color="warning" variant="flat">
                          Privado
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isDisabled={!formData.label.trim()}
                >
                  {isEditing ? "Guardar Cambios" : "Crear Tag"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewOpen} onOpenChange={onViewOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <TagIcon className="w-5 h-5" />
                  <span>Detalles del Tag</span>
                </div>
              </ModalHeader>
              <ModalBody>
                {selectedTag && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm text-default-500 mb-1">Nombre</p>
                      <p className="font-semibold">{selectedTag.label}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-500 mb-1">
                        Vista previa
                      </p>
                      {renderTagChip(selectedTag)}
                    </div>
                    <div>
                      <p className="text-sm text-default-500 mb-1">Color</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-default-200"
                          style={{ backgroundColor: selectedTag.color }}
                        />
                        <span className="font-mono text-sm">
                          {selectedTag.color}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-default-500 mb-1">Tipo</p>
                      {selectedTag.isPrivate ? (
                        <Chip size="sm" color="warning" variant="flat">
                          Privado
                        </Chip>
                      ) : (
                        <Chip size="sm" color="success" variant="flat">
                          Público
                        </Chip>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-default-500 mb-1">ID</p>
                      <p className="font-mono text-xs">{selectedTag.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-default-500 mb-1">
                        Fecha de creación
                      </p>
                      <p className="text-sm">
                        {new Date(selectedTag.createdAt).toLocaleString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  startContent={<Edit className="w-4 h-4" />}
                  onPress={() => {
                    onClose()
                    if (selectedTag) handleEdit(selectedTag)
                  }}
                >
                  Editar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirmar Eliminación</ModalHeader>
              <ModalBody>
                <p>
                  ¿Estás seguro de que deseas eliminar el tag{" "}
                  <strong>{selectedTag?.label}</strong>?
                </p>
                <p className="text-sm text-default-500 mt-2">
                  Esta acción no se puede deshacer. El tag será removido de
                  todas las conversaciones asociadas.
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
  )
}
