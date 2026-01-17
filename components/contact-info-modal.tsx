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
  Tabs,
  Tab,
  Card,
  CardBody,
  Chip,
  Spinner,
  Textarea,
} from "@heroui/react"
import { User, Phone, Mail, Calendar, Tag as TagIcon, MessageSquare, Plus, X, Save } from "lucide-react"
import { toast } from "sonner"
import UserAvatar from "./user-avatar"
import { apiService } from "@/lib/api"
import type { Contact, Conversation } from "@/lib/api-types"
import { formatConversationTime } from "@/lib/utils"

interface ContactInfoModalProps {
  isOpen: boolean
  onClose: () => void
  contactId: string
  onContactUpdate?: (contact: Contact) => void
}

export default function ContactInfoModal({
  isOpen,
  onClose,
  contactId,
  onContactUpdate,
}: ContactInfoModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contact, setContact] = useState<Contact | null>(null)
  const [editedContact, setEditedContact] = useState<Partial<Contact>>({})
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isEditing, setIsEditing] = useState(false)

  // Estados para metadata
  const [newMetadataKey, setNewMetadataKey] = useState("")
  const [newMetadataValue, setNewMetadataValue] = useState("")

  useEffect(() => {
    if (isOpen && contactId) {
      loadContactDetails()
    }
  }, [isOpen, contactId])

  const loadContactDetails = async () => {
    try {
      setLoading(true)
      const contactData = await apiService.getContactById(contactId)
      
      // Extract phone from messagingChannels
      const phone = contactData.messagingChannels?.[0]?.externalContactId || contactData.phone || ""
      
      // Extract email from metadata
      const email = contactData.metadata?.email || contactData.email || ""
      
      // Extract other metadata fields
      const location = contactData.metadata?.location || ""
      const source = contactData.metadata?.source || ""
      
      // Merge all data
      const enrichedContact = {
        ...contactData,
        phone,
        email,
        customFields: {
          ...contactData.metadata,
          ...contactData.customFields,
        }
      }
      
      setContact(enrichedContact)
      setEditedContact({
        fullName: enrichedContact.fullName,
        email: enrichedContact.email,
        customFields: enrichedContact.customFields || {},
      })

      // Cargar conversaciones del contacto
      // TODO: Implementar endpoint específico para conversaciones por contacto
      // const convs = await apiService.getConversationsByContact(contactId)
      // setConversations(convs)
    } catch (error) {
      console.error("Error loading contact:", error)
      toast.error("Error al cargar información del contacto")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!contact) return

    try {
      setSaving(true)
      const updated = await apiService.updateContact(contactId, {
        fullName: editedContact.fullName || contact.fullName,
        email: editedContact.email,
        customFields: editedContact.customFields,
      })

      setContact(updated)
      setIsEditing(false)
      toast.success("Contacto actualizado exitosamente")

      if (onContactUpdate) {
        onContactUpdate(updated)
      }
    } catch (error) {
      console.error("Error updating contact:", error)
      toast.error("Error al actualizar contacto")
    } finally {
      setSaving(false)
    }
  }

  const handleAddMetadata = () => {
    if (!newMetadataKey.trim() || !newMetadataValue.trim()) {
      toast.error("Ingresa una clave y valor para el campo")
      return
    }

    setEditedContact((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [newMetadataKey]: newMetadataValue,
      },
    }))

    setNewMetadataKey("")
    setNewMetadataValue("")
  }

  const handleRemoveMetadata = (key: string) => {
    setEditedContact((prev) => {
      const newMetadata = { ...prev.customFields }
      delete newMetadata[key]
      return {
        ...prev,
        customFields: newMetadata,
      }
    })
  }

  const handleCancel = () => {
    if (contact) {
      setEditedContact({
        fullName: contact.fullName,
        email: contact.email,
        customFields: contact.customFields || {},
      })
    }
    setIsEditing(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "py-6",
      }}
    >
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                {contact && (
                  <UserAvatar 
                    name={contact.fullName || "Cliente"} 
                    size="lg" 
                    showTooltip={true}
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold">
                    {contact?.fullName || "Cargando..."}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Información del contacto
                  </p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : contact ? (
                <Tabs aria-label="Información del contacto" variant="underlined">
                  {/* Tab: Información Básica */}
                  <Tab
                    key="info"
                    title={
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Información</span>
                      </div>
                    }
                  >
                    <Card>
                      <CardBody className="gap-4">
                        <div className="flex justify-end">
                          {!isEditing ? (
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              onPress={() => setIsEditing(true)}
                            >
                              Editar
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="flat"
                                onPress={handleCancel}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                color="primary"
                                startContent={<Save className="h-4 w-4" />}
                                onPress={handleSave}
                                isLoading={saving}
                              >
                                Guardar
                              </Button>
                            </div>
                          )}
                        </div>

                        <Input
                          label="Nombre"
                          placeholder="Nombre del contacto"
                          value={editedContact.fullName || ""}
                          onChange={(e) =>
                            setEditedContact((prev) => ({
                              ...prev,
                              fullName: e.target.value,
                            }))
                          }
                          isReadOnly={!isEditing}
                          startContent={<User className="h-4 w-4" />}
                        />

                        <Input
                          label="Teléfono"
                          placeholder="Número de teléfono"
                          value={contact.phone || ""}
                          isReadOnly
                          startContent={<Phone className="h-4 w-4" />}
                          description="El teléfono no se puede modificar"
                        />

                        <Input
                          label="Email"
                          placeholder="email@ejemplo.com"
                          type="email"
                          value={editedContact.email || ""}
                          onChange={(e) =>
                            setEditedContact((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          isReadOnly={!isEditing}
                          startContent={<Mail className="h-4 w-4" />}
                        />

                        <div className="flex gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Creado: {new Date(contact.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Actualizado: {new Date(contact.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Tab>

                  {/* Tab: Metadata */}
                  <Tab
                    key="metadata"
                    title={
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4" />
                        <span>Metadata</span>
                      </div>
                    }
                  >
                    <Card>
                      <CardBody className="gap-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Campos personalizados para este contacto
                          </p>
                          {!isEditing && (
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              onPress={() => setIsEditing(true)}
                            >
                              Editar
                            </Button>
                          )}
                        </div>

                        {isEditing && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Clave (ej: Empresa)"
                              value={newMetadataKey}
                              onChange={(e) => setNewMetadataKey(e.target.value)}
                              size="sm"
                            />
                            <Input
                              placeholder="Valor (ej: ACME Corp)"
                              value={newMetadataValue}
                              onChange={(e) => setNewMetadataValue(e.target.value)}
                              size="sm"
                            />
                            <Button
                              size="sm"
                              color="primary"
                              isIconOnly
                              onPress={handleAddMetadata}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        <div className="space-y-2">
                          {Object.entries(editedContact.customFields || {}).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-semibold">{key}</p>
                                  <p className="text-sm text-gray-600">
                                    {String(value)}
                                  </p>
                                </div>
                                {isEditing && (
                                  <Button
                                    size="sm"
                                    color="danger"
                                    variant="flat"
                                    isIconOnly
                                    onPress={() => handleRemoveMetadata(key)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )
                          )}

                          {Object.keys(editedContact.customFields || {}).length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">
                              No hay campos personalizados
                            </p>
                          )}
                        </div>

                        {isEditing && (
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={handleCancel}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              color="primary"
                              startContent={<Save className="h-4 w-4" />}
                              onPress={handleSave}
                              isLoading={saving}
                            >
                              Guardar
                            </Button>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </Tab>

                  {/* Tab: Conversaciones */}
                  <Tab
                    key="conversations"
                    title={
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Conversaciones</span>
                      </div>
                    }
                  >
                    <Card>
                      <CardBody>
                        {conversations.length > 0 ? (
                          <div className="space-y-2">
                            {conversations.map((conv) => (
                              <div
                                key={conv.id}
                                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      Conversación #{conv.id.slice(0, 8)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatConversationTime(
                                        new Date(conv.createdAt)
                                      )}
                                    </p>
                                  </div>
                                  <Chip size="sm" variant="flat">
                                    {conv.status}
                                  </Chip>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-8">
                            No hay conversaciones con este contacto
                          </p>
                        )}
                      </CardBody>
                    </Card>
                  </Tab>
                </Tabs>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No se pudo cargar la información del contacto
                </p>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={onModalClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
