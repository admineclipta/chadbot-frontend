"use client"

import { useState } from "react"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react"
import { Plus, Edit, Trash2, Calendar, TrendingUp } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { apiService } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import CredentialFormModal from "./credential-form-modal"

export default function AiCredentialsPanel() {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<any>(null)
  const [deletingCredential, setDeletingCredential] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    data: servicesData,
    loading: servicesLoading,
  } = useApi(() => apiService.getAiServices(), [])

  const {
    data: credentialsData,
    loading: credentialsLoading,
    refetch: refetchCredentials,
  } = useApi(
    () => apiService.getAiCredentials(currentPage, 10, true),
    [currentPage]
  )

  const handleCreate = () => {
    setEditingCredential(null)
    setIsFormModalOpen(true)
  }

  const handleEdit = (credential: any) => {
    setEditingCredential(credential)
    setIsFormModalOpen(true)
  }

  const handleDeleteClick = (credential: any) => {
    setDeletingCredential(credential)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingCredential) return

    try {
      setIsDeleting(true)
      await apiService.deleteAiCredential(deletingCredential.id)
      toast.success("Credencial eliminada exitosamente")
      setIsDeleteModalOpen(false)
      setDeletingCredential(null)
      refetchCredentials()
    } catch (error) {
      console.error("Error deleting credential:", error)
      toast.error("Error al eliminar la credencial")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFormSuccess = () => {
    setIsFormModalOpen(false)
    setEditingCredential(null)
    refetchCredentials()
  }

  const getServiceName = (serviceTypeId: number) => {
    return servicesData?.find((s) => s.id === serviceTypeId)?.name || "Desconocido"
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP", { locale: es })
    } catch {
      return dateString
    }
  }

  if (servicesLoading || credentialsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-default-500">
          Gestiona tus credenciales de servicios de IA
        </p>
        <Button
          color="secondary"
          startContent={<Plus className="h-4 w-4" />}
          onPress={handleCreate}
        >
          Nueva Credencial
        </Button>
      </div>

      {credentialsData?.content.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center">
            <p className="text-default-500">No hay credenciales de IA configuradas</p>
            <Button
              color="secondary"
              variant="flat"
              className="mt-4"
              startContent={<Plus className="h-4 w-4" />}
              onPress={handleCreate}
            >
              Crear primera credencial
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentialsData?.content.map((credential) => (
              <Card key={credential.id}>
                <CardHeader className="flex justify-between items-start pb-2">
                  <div className="flex-1">
                    <p className="font-semibold">{credential.name}</p>
                    <p className="text-sm text-default-500">
                      {getServiceName(credential.serviceTypeId)}
                    </p>
                  </div>
                  <Chip
                    color={credential.active ? "success" : "danger"}
                    variant="flat"
                    size="sm"
                  >
                    {credential.active ? "Activo" : "Inactivo"}
                  </Chip>
                </CardHeader>
                <CardBody className="pt-2">
                  <div className="space-y-2 mb-4">
                    {credential.usageLimit && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-default-400" />
                        <p className="text-xs text-default-500">
                          Límite: {credential.usageLimit.toLocaleString()}{" "}
                          {credential.usageUnit || "tokens"}
                        </p>
                      </div>
                    )}
                    {credential.usageResetAt && (
                      <div className="flex items-center gap-2 text-xs text-default-400">
                        <Calendar className="h-3 w-3" />
                        <span>Reset: {formatDate(credential.usageResetAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-default-400">
                      <Calendar className="h-3 w-3" />
                      <span>Creado: {formatDate(credential.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      startContent={<Edit className="h-3 w-3" />}
                      onPress={() => handleEdit(credential)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash2 className="h-3 w-3" />}
                      onPress={() => handleDeleteClick(credential)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {credentialsData && credentialsData.totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination
                total={credentialsData.totalPages}
                page={currentPage + 1}
                onChange={(page) => setCurrentPage(page - 1)}
                showControls
              />
            </div>
          )}
        </>
      )}

      <CredentialFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingCredential(null)
        }}
        onSuccess={handleFormSuccess}
        credential={editingCredential}
        services={servicesData || []}
        type="ai"
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingCredential(null)
        }}
      >
        <ModalContent>
          <ModalHeader>Confirmar Eliminación</ModalHeader>
          <ModalBody>
            <p>
              ¿Estás seguro de que deseas eliminar la credencial{" "}
              <strong>{deletingCredential?.name}</strong>?
            </p>
            <p className="text-sm text-warning mt-2">
              Esta acción no se puede deshacer y puede afectar los asistentes que usen esta credencial.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setIsDeleteModalOpen(false)
                setDeletingCredential(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
