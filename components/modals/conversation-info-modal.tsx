"use client"

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Divider,
  Avatar,
  AvatarGroup,
} from "@heroui/react"
import {
  Users,
  UserCircle,
  Phone,
  Calendar,
  Tag,
  Clock,
  MessageSquare,
  Hash,
} from "lucide-react"
import type { Conversation } from "@/lib/types"
import { CONVERSATION_STATUS_CONFIG } from "@/lib/types"
import { formatDateTime, formatDate } from "@/lib/utils"
import { getChannelDisplayName } from "@/lib/messaging-channels"

interface ConversationInfoModalProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation | null
}

export default function ConversationInfoModal({
  isOpen,
  onClose,
  conversation,
}: ConversationInfoModalProps) {
  if (!conversation) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-background/80 backdrop-blur-sm",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Información de la Conversación</span>
              </div>
              <p className="text-xs text-default-500 font-normal">
                ID: {conversation.id}
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* Sección: Contacto */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <UserCircle className="h-4 w-4 text-primary" />
                    Información del Contacto
                  </h3>
                  <div className="bg-default-50 dark:bg-default-100/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={conversation.customer.name}
                        size="lg"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          {conversation.customer.name}
                        </p>
                        {conversation.customer.email && (
                          <p className="text-sm text-default-500">
                            {conversation.customer.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Divider />
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-default-500" />
                      <span className="text-sm text-foreground">
                        {conversation.customer.phone}
                      </span>
                    </div>
                    <Divider />
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-default-500" />
                      <span className="text-sm text-default-500 mr-2">Canal:</span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={(() => {
                          const channel = (conversation.integration || "").toLowerCase()
                          if (channel.includes("whatsapp") || channel.includes("evolution")) {
                            return "success"
                          }
                          if (channel.includes("telegram")) {
                            return "primary"
                          }
                          if (channel.includes("facebook") || channel.includes("messenger")) {
                            return "secondary"
                          }
                          return "default"
                        })()}
                      >
                        {getChannelDisplayName(conversation.integration || "")}
                      </Chip>
                    </div>
                  </div>
                </div>

                {/* Sección: Estado y Etiquetas */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-primary" />
                    Estado y Etiquetas
                  </h3>
                  <div className="bg-default-50 dark:bg-default-100/50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-default-500 mb-2">Estado</p>
                      <Chip
                        color={
                          CONVERSATION_STATUS_CONFIG[conversation.status]
                            ?.color || "default"
                        }
                        size="md"
                        variant="flat"
                      >
                        {CONVERSATION_STATUS_CONFIG[conversation.status]
                          ?.label || conversation.status}
                      </Chip>
                    </div>
                    {conversation.tags && conversation.tags.length > 0 && (
                      <>
                        <Divider />
                        <div>
                          <p className="text-xs text-default-500 mb-2">
                            Etiquetas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {conversation.tags.map((tag) => (
                              <Chip
                                key={tag.id}
                                size="sm"
                                variant="flat"
                                color="primary"
                              >
                                {tag.label}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Sección: Equipo (adaptado a la estructura actual) */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    Equipo y Participantes
                  </h3>
                  <div className="bg-default-50 dark:bg-default-100/50 rounded-lg p-4 space-y-3">
                    {/* Representante asignado */}
                    <div>
                      <p className="text-xs text-default-500 mb-2">
                        Representante Asignado
                      </p>
                      {conversation.id_representante > 0 ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            size="sm"
                            name="Representante"
                            className="bg-primary-100 text-primary"
                          />
                          <span className="text-sm text-foreground">
                            ID: {conversation.id_representante}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-default-500">
                          Sin asignar
                        </div>
                      )}
                    </div>
                    <Divider />
                    {/* Participante (Cliente) */}
                    <div>
                      <p className="text-xs text-default-500 mb-2">
                        Cliente
                      </p>
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={conversation.customer.name}
                          size="sm"
                        />
                        <span className="text-sm text-foreground">
                          {conversation.customer.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Fechas */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    Información Temporal
                  </h3>
                  <div className="bg-default-50 dark:bg-default-100/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-default-500" />
                        <span className="text-sm text-default-500">
                          Fecha de Creación
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(conversation.lastActivity)}
                      </span>
                    </div>
                    <Divider />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-default-500" />
                        <span className="text-sm text-default-500">
                          Última Actualización
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatDateTime(conversation.lastActivity)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                {conversation.subject && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Asunto
                    </h3>
                    <div className="bg-default-50 dark:bg-default-100/50 rounded-lg p-4">
                      <p className="text-sm text-foreground">
                        {conversation.subject}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
