"use client"

import { useState } from "react"
import { MessageCircle, Clock, Phone, MoreVertical, Info, Tag as TagIcon } from "lucide-react"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react"
import Image from "next/image"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import MessageStatusIcon from "./message-status-icon"
import MessageTypeIndicator from "./message-type-indicator"
import ConversationTagsPopover from "./conversation-tags-popover"
import ConversationInfoModal from "./conversation-info-modal"
import ConversationTagsModal from "./conversation-tags-modal"
import ContactInfoModal from "./contact-info-modal"
import type { Conversation } from "@/lib/types"
import { formatConversationTime } from "@/lib/utils"
import { getChannelDisplayName, getChannelIcon } from "@/lib/messaging-channels"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  onUserClick?: (userId: string) => void
  loading?: boolean
  error?: string | null
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onUserClick,
  loading,
  error,
  currentPage = 0,
  totalPages = 1,
  onPageChange,
}: ConversationListProps) {
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  const [contactInfoModalOpen, setContactInfoModalOpen] = useState(false)
  const [selectedConvForInfo, setSelectedConvForInfo] = useState<Conversation | null>(null)
  const [selectedConvForTags, setSelectedConvForTags] = useState<Conversation | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  const handleOpenInfo = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    setSelectedConvForInfo(conversation)
    setInfoModalOpen(true)
  }

  const handleOpenTags = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    setSelectedConvForTags(conversation)
    setTagsModalOpen(true)
  }

  const handleOpenContactInfo = (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation()
    setSelectedContactId(contactId)
    setContactInfoModalOpen(true)
  }

  const getStatusBadgeType = (status: string): 'active' | 'intervened' | 'closed' | 'pending' => {
    switch (status) {
      case 'ACTIVE':
        return 'active'
      case 'INTERVENED':
        return 'intervened'
      case 'CLOSED':
        return 'closed'
      default:
        return 'pending'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'ACTIVE':
        return 'Activa'
      case 'INTERVENED':
        return 'Intervenida'
      case 'CLOSED':
        return 'Cerrada'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="w-96 border-r border-slate-200 bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-96 border-r border-slate-200 bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 text-sm font-semibold">Error al cargar</p>
          <p className="text-slate-500 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Conversaciones
          </h2>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
            {conversations.length}
          </span>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hay conversaciones</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {conversations.map((conversation) => {
              const isSelected = selectedConversation?.id === conversation.id
              const isHovered = hoveredConversation === conversation.id
              const contactName = conversation.customer?.name || conversation.customer?.phone || 'Sin nombre'
              const lastMessage = conversation.lastMessage || 'Sin mensajes'
              const time = conversation.lastActivity 
                ? formatConversationTime(conversation.lastActivity)
                : ''

              return (
                <div
                  key={conversation.id}
                  className={`group relative border-b border-slate-100 last:border-0 transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                      : 'hover:bg-slate-50 cursor-pointer'
                  }`}
                  onMouseEnter={() => setHoveredConversation(conversation.id)}
                  onMouseLeave={() => setHoveredConversation(null)}
                  onClick={() => onSelectConversation(conversation)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          onClick={(e) => handleOpenContactInfo(e, conversation.customer.id)}
                          className="cursor-pointer"
                        >
                          <Avatar
                            name={contactName}
                            size="lg"
                            gradient="mixed"
                            online={conversation.status === 'ACTIVE'}
                            className="group-hover:scale-110 transition-transform"
                          />
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name and Time */}
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-semibold truncate ${
                            isSelected ? 'text-blue-900' : 'text-slate-900'
                          }`}>
                            {contactName}
                          </h3>
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                            {time}
                          </span>
                        </div>

                        {/* Last Message */}
                        <div className="flex items-center gap-1 mb-2">
                          {conversation.lastMessageType && (
                            <MessageTypeIndicator
                              type={conversation.lastMessageType}
                            />
                          )}
                          <p className={`text-sm truncate ${
                            conversation.unreadCount > 0 
                              ? 'text-slate-900 font-medium' 
                              : 'text-slate-600'
                          }`}>
                            {lastMessage}
                          </p>
                          {conversation.lastMessageStatus && (
                            <MessageStatusIcon
                              status={conversation.lastMessageStatus}
                              className="ml-auto flex-shrink-0"
                            />
                          )}
                        </div>

                        {/* Tags and Channel */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Status Badge */}
                          <Badge status={getStatusBadgeType(conversation.status)}>
                            {getStatusLabel(conversation.status)}
                          </Badge>

                          {/* Channel */}
                          {conversation.integration && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Image 
                                src={getChannelIcon(conversation.integration)}
                                alt={getChannelDisplayName(conversation.integration)}
                                width={14}
                                height={14}
                                className="flex-shrink-0"
                              />
                              {getChannelDisplayName(conversation.integration)}
                            </span>
                          )}

                          {/* Tags */}
                          {conversation.tags && conversation.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {conversation.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-md"
                                >
                                  {tag.label}
                                </span>
                              ))}
                              {conversation.tags.length > 2 && (
                                <span className="text-xs text-slate-500">
                                  +{conversation.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions (visible on hover) */}
                      {(isHovered || isSelected) && (
                        <div className="flex items-center ml-2">
                          <Dropdown>
                            <DropdownTrigger>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-600" />
                              </button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Opciones de conversación">
                              <DropdownItem
                                key="info"
                                startContent={<Info className="w-4 h-4" />}
                                onPress={() => {
                                  setSelectedConvForInfo(conversation)
                                  setInfoModalOpen(true)
                                }}
                              >
                                Información
                              </DropdownItem>
                              <DropdownItem
                                key="tags"
                                startContent={<TagIcon className="w-4 h-4" />}
                                onPress={() => {
                                  setSelectedConvForTags(conversation)
                                  setTagsModalOpen(true)
                                }}
                              >
                                Tags
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(currentPage)}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600">
              Página {currentPage + 1} de {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 2)}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {infoModalOpen && selectedConvForInfo && (
        <ConversationInfoModal
          conversation={selectedConvForInfo}
          isOpen={infoModalOpen}
          onClose={() => {
            setInfoModalOpen(false)
            setSelectedConvForInfo(null)
          }}
        />
      )}

      {tagsModalOpen && selectedConvForTags && (
        <ConversationTagsModal
          tags={selectedConvForTags.tags}
          isOpen={tagsModalOpen}
          onClose={() => {
            setTagsModalOpen(false)
            setSelectedConvForTags(null)
          }}
        />
      )}

      {/* Contact Info Modal */}
      {contactInfoModalOpen && selectedContactId && (
        <ContactInfoModal
          contactId={selectedContactId}
          isOpen={contactInfoModalOpen}
          onClose={() => {
            setContactInfoModalOpen(false)
            setSelectedContactId(null)
          }}
        />
      )}
    </div>
  )
}
