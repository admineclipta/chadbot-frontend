"use client"

import { useEffect } from "react"
import { Card, CardBody, Avatar, Chip, Badge, Spinner, Select, SelectItem } from "@heroui/react"
import { MessageSquare, Phone, Clock } from "lucide-react"
import UserAvatar from "./user-avatar"
import type { Conversation, Tag } from "@/lib/types"
import { CONVERSATION_STATUS_CONFIG } from "@/lib/types"
import type { ConversationStatus } from "@/lib/api-types"
import { formatConversationTime } from "@/lib/utils"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  onUserClick: (userId: string) => void
  loading?: boolean
  error?: string | null
  // Props para filtro de representante
  showRepresentativeFilter?: boolean
  selectedRepresentativeFilter?: "all" | "mine" | number
  onRepresentativeFilterChange?: (filter: "all" | "mine" | number) => void
  availableRepresentatives?: Array<{id: number, name: string}>
  currentUser?: any
  // Props para paginación
  hasMoreConversations?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  // Props para filtros de estado
  selectedStatusFilter?: ConversationStatus | "all"
  onStatusFilterChange?: (status: ConversationStatus | "all") => void
  // Props para filtros de tags
  selectedTags?: string[]
  onTagsFilterChange?: (tags: string[]) => void
  availableTags?: Tag[]
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onUserClick,
  loading,
  error,
  showRepresentativeFilter = false,
  selectedRepresentativeFilter = "all",
  onRepresentativeFilterChange,
  availableRepresentatives = [],
  currentUser,
  hasMoreConversations = false,
  onLoadMore,
  loadingMore = false,
  selectedStatusFilter = "all",
  onStatusFilterChange,
  selectedTags = [],
  onTagsFilterChange,
  availableTags = [],
}: ConversationListProps) {

  // Calcular contador por estado
  const getStatusCount = (status: ConversationStatus | "all") => {
    if (status === "all") return conversations.length;
    return conversations.filter(c => c.status === status).length;
  };

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
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">Error al cargar conversaciones</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversaciones
          </h2>
          <Chip color="primary" size="sm" variant="flat">
            {conversations.length}
          </Chip>
        </div>
      </div>

      {/* Chips de filtro de estado */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <Chip
            variant={selectedStatusFilter === "all" ? "solid" : "flat"}
            color={selectedStatusFilter === "all" ? "primary" : "default"}
            size="sm"
            className="cursor-pointer"
            onClick={() => onStatusFilterChange?.("all")}
          >
            Todas ({getStatusCount("all")})
          </Chip>
          {(Object.keys(CONVERSATION_STATUS_CONFIG) as ConversationStatus[]).map((status) => (
            <Chip
              key={status}
              variant={selectedStatusFilter === status ? "solid" : "flat"}
              color={selectedStatusFilter === status ? CONVERSATION_STATUS_CONFIG[status].color : "default"}
              size="sm"
              className="cursor-pointer"
              onClick={() => onStatusFilterChange?.(status)}
            >
              {CONVERSATION_STATUS_CONFIG[status].label} ({getStatusCount(status)})
            </Chip>
          ))}
        </div>
      </div>

      {/* Filtro de tags */}
      {availableTags.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <Select
            label="Filtrar por tags"
            placeholder="Seleccionar tags"
            selectionMode="multiple"
            selectedKeys={selectedTags}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys) as string[];
              onTagsFilterChange?.(selected);
            }}
            size="sm"
            variant="bordered"
            className="max-w-full"
          >
            {availableTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </Select>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedTags.map((tagId) => {
                const tag = availableTags.find(t => t.id === tagId);
                return tag ? (
                  <Chip
                    key={tagId}
                    size="sm"
                    variant="flat"
                    onClose={() => {
                      const newTags = selectedTags.filter(id => id !== tagId);
                      onTagsFilterChange?.(newTags);
                    }}
                  >
                    {tag.name}
                  </Chip>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtro por representante */}
      {showRepresentativeFilter && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Select
            label="Filtrar por agente"
            placeholder="Seleccionar agente"
            selectedKeys={[selectedRepresentativeFilter.toString()]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              if (onRepresentativeFilterChange) {
                if (selected === "all") {
                  onRepresentativeFilterChange("all")
                } else {
                  onRepresentativeFilterChange(Number.parseInt(selected))
                }
              }
            }}
            size="sm"
            variant="bordered"
            items={[
              { key: "all", label: "Todas las conversaciones" },
              ...availableRepresentatives.map(rep => ({ key: rep.id.toString(), label: rep.name }))
            ]}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No hay conversaciones</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  isPressable
                  isHoverable
                  className={`cursor-pointer transition-all w-full h-24 ${
                    selectedConversation?.id === conversation.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
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
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {conversation.customer.name}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getIntegrationIcon(conversation.integration)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatConversationTime(conversation.lastActivity)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate mb-2 flex-1">
                          {conversation.lastMessage}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {conversation.customer.phone}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            {/* Chip de estado de conversación */}
                            <Chip 
                              color={CONVERSATION_STATUS_CONFIG[conversation.status].color} 
                              size="sm" 
                              variant="dot" 
                              className="text-xs"
                            >
                              {CONVERSATION_STATUS_CONFIG[conversation.status].label}
                            </Chip>
                            
                            {/* Tags adicionales (si los hay) */}
                            {conversation.tags.slice(0, 1).map((tag) => (
                              <Chip key={tag.id} color={tag.color as any} size="sm" variant="flat" className="text-xs">
                                {tag.name}
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

            {/* Load More Button */}
            {hasMoreConversations && onLoadMore && (
              <div className="p-2">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Spinner size="sm" color="white" />
                      <span>Cargando...</span>
                    </>
                  ) : (
                    <span>Cargar más conversaciones</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
