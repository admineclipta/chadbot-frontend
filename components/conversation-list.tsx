"use client"

import { Card, CardBody, Chip, Badge, Spinner, Pagination } from "@heroui/react"
import { MessageSquare, Phone, Clock } from "lucide-react"
import UserAvatar from "./user-avatar"
import type { Conversation } from "@/lib/types"
import { CONVERSATION_STATUS_CONFIG } from "@/lib/types"
import { formatConversationTime } from "@/lib/utils"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  onUserClick: (userId: string) => void
  loading?: boolean
  error?: string | null
  // Props para paginación
  currentPage: number // 0-indexed
  totalPages: number
  onPageChange: (page: number) => void // Recibe 1-indexed de HeroUI
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onUserClick,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
}: ConversationListProps) {

  const getIntegrationIcon = (integration: string) => {
    switch (integration.toLowerCase()) {
      case "whatsapp":
        return "💬"
      case "telegram":
        return "✈️"
      case "facebook":
        return "📘"
      case "instagram":
        return "📷"
      default:
        return "💬"
    }
  }

  if (loading) {
    return (
      <div className="w-80 border-r border-divider bg-background flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-80 border-r border-divider bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-danger text-sm">Error al cargar conversaciones</p>
          <p className="text-default-500 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-divider bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-divider">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversaciones
          </h2>
          <Chip color="primary" size="sm" variant="flat">
            {conversations.length}
          </Chip>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-default-400 mx-auto mb-3" />
              <p className="text-default-500">No hay conversaciones</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                isPressable
                isHoverable
                className={`cursor-pointer transition-all w-full h-24 ${
                  selectedConversation?.id === conversation.id
                    ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
                    : "hover:bg-default-100 dark:hover:bg-default-50"
                }`}
                onPress={() => onSelectConversation(conversation)}
              >
                <CardBody className="p-3 h-full flex flex-col justify-between">
                  <div className="flex items-start gap-3 h-full">
                    {/* Avatar */}
                    <div className="relative">
                      <UserAvatar
                        name={conversation.customer.name}
                        size="md"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e?.stopPropagation()
                          onUserClick(conversation.customer.id)
                        }}
                        showTooltip={true}
                      />
                      {conversation.unreadCount > 0 && (
                        <Badge
                          content={conversation.unreadCount}
                          color="danger"
                          size="sm"
                          className="absolute -top-1 -right-1"
                        >
                          <div />
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground truncate text-sm">
                          {conversation.customer.name}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-default-500">
                            {getIntegrationIcon(conversation.integration)}
                          </span>
                          <span className="text-xs text-default-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatConversationTime(conversation.lastActivity)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-default-600 truncate mb-2 flex-1">
                        {conversation.lastMessage}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Phone className="h-3 w-3 text-default-400" />
                          <span className="text-xs text-default-500 truncate">
                            {conversation.customer.phone}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {/* Chip de estado de conversación */}
                          <Chip 
                            color={CONVERSATION_STATUS_CONFIG[conversation.status]?.color || "default"} 
                            size="sm" 
                            variant="dot" 
                            className="text-xs"
                          >
                            {CONVERSATION_STATUS_CONFIG[conversation.status]?.label || conversation.status}
                          </Chip>
                          
                          {/* Tags adicionales (si los hay) */}
                          {conversation.tags.slice(0, 1).map((tag) => (
                          <Chip key={tag.id} style={{ backgroundColor: tag.color, color: "#000" }} size="sm" variant="flat" className="text-xs">
                            {tag.label}
                            </Chip>
                          ))}
                          {conversation.tags.length > 1 && (
                            <Chip size="sm" variant="flat" color="default" className="text-xs">
                              +{conversation.tags.length - 1}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-divider flex justify-center">
          <Pagination
            total={totalPages}
            page={currentPage + 1} // Convertir de 0-indexed a 1-indexed
            onChange={onPageChange} // onPageChange ya maneja la conversión
            showControls
            color="primary"
            size="sm"
          />
        </div>
      )}
    </div>
  )
}
