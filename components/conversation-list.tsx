"use client"

import { useState } from "react"
import { Card, CardBody, Chip, Badge, Spinner, Pagination, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react"
import { MessageSquare, Clock, ChevronDown, Tag as TagIcon, Info } from "lucide-react"
import UserAvatar from "./user-avatar"
import MessageStatusIcon from "./message-status-icon"
import MessageTypeIndicator from "./message-type-indicator"
import ConversationTagsPopover from "./conversation-tags-popover"
import ConversationInfoModal from "./conversation-info-modal"
import ConversationTagsModal from "./conversation-tags-modal"
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
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  const [selectedConvForInfo, setSelectedConvForInfo] = useState<Conversation | null>(null)
  const [selectedConvForTags, setSelectedConvForTags] = useState<Conversation | null>(null)

  const handleOpenInfo = (conversation: Conversation) => {
    setSelectedConvForInfo(conversation)
    setInfoModalOpen(true)
  }

  const handleOpenTags = (conversation: Conversation) => {
    setSelectedConvForTags(conversation)
    setTagsModalOpen(true)
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
              <div 
                key={conversation.id}
                className="relative"
                onMouseEnter={() => setHoveredConversation(conversation.id)}
                onMouseLeave={() => setHoveredConversation(null)}
              >
                <Card
                  isPressable
                  isHoverable
                  className={`cursor-pointer transition-all w-full h-24 ${
                    selectedConversation?.id === conversation.id
                      ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
                      : "hover:bg-default-100 dark:hover:bg-default-50"
                  }`}
                  onPress={() => onSelectConversation(conversation)}
                >
                  <CardBody className="p-3 h-full">
                    <div className="flex items-start gap-3 h-full">
                      {/* Avatar with unread badge */}
                      <div className="relative flex-shrink-0">
                        {conversation.unreadCount > 0 ? (
                          <Badge
                            content={conversation.unreadCount}
                            color="primary"
                            size="sm"
                            placement="top-right"
                          >
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
                          </Badge>
                        ) : (
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
                        )}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        {/* Row 1: Name + Time */}
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-foreground truncate text-sm flex-1 mr-2">
                            {conversation.customer.name}
                          </h3>
                          <span className="text-xs text-default-500 flex items-center gap-1 flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatConversationTime(conversation.lastActivity)}
                          </span>
                        </div>

                        {/* Row 2: Last message with status + type */}
                        <div className="flex items-center gap-1.5 mb-2">
                          {/* Message status icon (before content) */}
                          {conversation.lastMessageStatus && (
                            <MessageStatusIcon
                              status={conversation.lastMessageStatus}
                            />
                          )}
                          
                          {/* Message type indicator or text content */}
                          <MessageTypeIndicator
                            type={conversation.lastMessageType || "text"}
                            content={{
                              text: conversation.lastMessage,
                            }}
                            className="flex-1 min-w-0"
                          />
                        </div>

                        {/* Row 3: Status + Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Status chip */}
                          <Chip 
                            color={CONVERSATION_STATUS_CONFIG[conversation.status]?.color || "default"} 
                            size="sm" 
                            variant="dot" 
                            className="text-xs flex-shrink-0"
                          >
                            {CONVERSATION_STATUS_CONFIG[conversation.status]?.label || conversation.status}
                          </Chip>
                          
                          {/* Tags with popover */}
                          <ConversationTagsPopover tags={conversation.tags} />
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
                
                {/* Dropdown menu - aparece en hover */}
                {hoveredConversation === conversation.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          className="backdrop-blur-md bg-background/60 dark:bg-background/80 border border-divider shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu 
                        aria-label="Opciones de conversación"
                        onAction={(key) => {
                          if (key === "tags") {
                            handleOpenTags(conversation)
                          } else if (key === "info") {
                            handleOpenInfo(conversation)
                          }
                        }}
                      >
                        <DropdownItem
                          key="tags"
                          startContent={<TagIcon className="h-4 w-4" />}
                        >
                          Etiquetas
                        </DropdownItem>
                        <DropdownItem
                          key="info"
                          startContent={<Info className="h-4 w-4" />}
                        >
                          Información
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                )}
              </div>
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
      
      {/* Modal de información */}
      <ConversationInfoModal
        isOpen={infoModalOpen}
        onClose={() => {
          setInfoModalOpen(false)
          setSelectedConvForInfo(null)
        }}
        conversation={selectedConvForInfo}
      />
      
      {/* Modal de etiquetas */}
      <ConversationTagsModal
        isOpen={tagsModalOpen}
        onClose={() => {
          setTagsModalOpen(false)
          setSelectedConvForTags(null)
        }}
        tags={selectedConvForTags?.tags || []}
        // onAddTag y onRemoveTag se pueden implementar más adelante
        // cuando se integre con la API
      />
    </div>
  )
}
