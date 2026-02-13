"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { MessageCircle, Clock, Phone, MoreVertical, Info, Tag as TagIcon, Search, SlidersHorizontal, Users, ChevronDown } from "lucide-react"
import { 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  useDisclosure, 
  Kbd,
  Select,
  SelectItem,
  Chip,
  Divider,
  type SelectedItems,
} from "@heroui/react"
import Image from "next/image"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import MessageStatusIcon from "./message-status-icon"
import MessageTypeIndicator from "./message-type-indicator"
import ConversationTagsPopover from "./conversation-tags-popover"
import ConversationInfoModal from "./conversation-info-modal"
import ConversationTagsModal from "./conversation-tags-modal"
import ContactInfoModal from "./contact-info-modal"
import NewChatModal from "./new-chat-modal"
import BulkMessageModal from "./bulk-message-modal"
import SearchableSelect from "./searchable-select"
import SearchableMultiSelect from "./searchable-multi-select"
import type { Conversation } from "@/lib/types"
import type {
  ConversationStatus,
  ConversationSortField,
  SortDirection,
  Team,
  UserDto,
  Tag,
  MessagingServiceDto,
} from "@/lib/api-types"
import { formatConversationTime, generatePastelColor } from "@/lib/utils"
import { getChannelDisplayName, getChannelIcon } from "@/lib/messaging-channels"
import { apiService } from "@/lib/api"
import { useApi } from "@/hooks/use-api"

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

const statusOptions: { key: ConversationStatus | "all"; label: string; color: "default" | "success" | "warning" | "danger" }[] = [
  { key: "ACTIVE", label: "Activa", color: "success" },
  { key: "INTERVENED", label: "Intervenida", color: "warning" },
  { key: "CLOSED", label: "Cerrada", color: "default" },
  { key: "NO_ANSWER", label: "Sin respuesta", color: "danger" },
]

const sortFieldOptions: { key: ConversationSortField; label: string }[] = [
  { key: "updatedAt", label: "Última actualización" },
  { key: "createdAt", label: "Fecha de creación" },
  { key: "status", label: "Estado" },
  { key: "contactName", label: "Nombre del contacto" },
]

const sortDirectionOptions: { key: SortDirection; label: string }[] = [
  { key: "DESC", label: "Descendente" },
  { key: "ASC", label: "Ascendente" },
]

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
  const [searchTerm, setSearchTerm] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { isOpen: isFiltersOpen, onOpen: onFiltersOpen, onOpenChange: onFiltersOpenChange } = useDisclosure()
  const [newChatModalOpen, setNewChatModalOpen] = useState(false)
  const [bulkMessageModalOpen, setBulkMessageModalOpen] = useState(false)

  // Estados temporales para el modal de filtros
  const [tempStatus, setTempStatus] = useState<ConversationStatus | "all">("all")
  const [tempChannel, setTempChannel] = useState<string | undefined>(undefined)
  const [tempTeam, setTempTeam] = useState("")
  const [tempAgent, setTempAgent] = useState("")
  const [tempTags, setTempTags] = useState<string[]>([])
  const [tempSortBy, setTempSortBy] = useState<ConversationSortField>("updatedAt")
  const [tempSortDirection, setTempSortDirection] = useState<SortDirection>("DESC")

  // Fetch teams
  const { data: teamsData, loading: teamsLoading } = useApi(
    (signal) => apiService.getTeams(0, 100, signal),
    [],
    0
  )

  // Fetch users (agentes)
  const { data: usersData, loading: usersLoading } = useApi(
    (signal) => apiService.getUsers(0, 100, signal),
    [],
    0
  )

  // Fetch tags
  const { data: tagsData, loading: tagsLoading } = useApi(
    (signal) => apiService.getTags(0, 100, undefined, signal),
    [],
    0
  )

  // Fetch messaging services
  const { data: messagingServices, loading: channelsLoading } = useApi(
    (signal) => apiService.getMessagingServices(signal),
    [],
    []
  )

  const teams = teamsData?.content || []
  const users = usersData?.content || []
  const tags = tagsData?.content || []
  const channels = messagingServices || []

  // Filtrar users que tengan agentId
  const agents = useMemo(() => users.filter(u => u.agentId !== null), [users])

  // Atajo de teclado para enfocar búsqueda (Ctrl+K o Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Aplicar filtros del modal (por ahora solo cierra el modal)
  const handleApplyFilters = () => {
    // TODO: Implementar lógica de filtrado
    console.log("Filtros aplicados:", {
      status: tempStatus,
      channel: tempChannel,
      team: tempTeam,
      agent: tempAgent,
      tags: tempTags,
      sortBy: tempSortBy,
      sortDirection: tempSortDirection,
    })
    onFiltersOpenChange()
  }

  // Limpiar filtros temporales en el modal
  const handleClearFiltersInModal = () => {
    setTempStatus("all")
    setTempChannel(undefined)
    setTempTeam("")
    setTempAgent("")
    setTempTags([])
    setTempSortBy("updatedAt")
    setTempSortDirection("DESC")
  }

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

  const normalizeStatus = (status: string): string => status.toLowerCase()

  const getStatusBadgeType = (status: string): 'active' | 'intervened' | 'closed' | 'pending' => {
    switch (normalizeStatus(status)) {
      case 'active':
        return 'active'
      case 'intervened':
        return 'intervened'
      case 'closed':
        return 'closed'
      default:
        return 'pending'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (normalizeStatus(status)) {
      case 'active':
        return 'Activa'
      case 'intervened':
        return 'Intervenida'
      case 'closed':
        return 'Cerrada'
      case 'no_answer':
        return 'Sin respuesta'
      default:
        return status
    }
  }

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (conversation.lastMessage) return conversation.lastMessage

    if (conversation.lastMessageType) {
      switch (conversation.lastMessageType) {
        case "image":
          return "Imagen"
        case "video":
          return "Video"
        case "audio":
          return "Audio"
        case "document":
          return "Documento"
        default:
          return ""
      }
    }

    return "Sin mensajes"
  }

  if (loading) {
    return (
      <div className="w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-sm font-semibold">Error al cargar</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full md:w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Conversaciones
            </h2>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  color="primary"
                  size="sm"
                  className="min-w-0"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0"
                  >
                    <path
                      d="M12 14V11M12 11V8M12 11H9M12 11H15M7.12357 18.7012L5.59961 19.9203C4.76744 20.5861 4.35115 20.9191 4.00098 20.9195C3.69644 20.9198 3.40845 20.7813 3.21846 20.5433C3 20.2696 3 19.7369 3 18.6712V7.2002C3 6.08009 3 5.51962 3.21799 5.0918C3.40973 4.71547 3.71547 4.40973 4.0918 4.21799C4.51962 4 5.08009 4 6.2002 4H17.8002C18.9203 4 19.4801 4 19.9079 4.21799C20.2842 4.40973 20.5905 4.71547 20.7822 5.0918C21 5.5192 21 6.07899 21 7.19691V14.8036C21 15.9215 21 16.4805 20.7822 16.9079C20.5905 17.2842 20.2843 17.5905 19.908 17.7822C19.4806 18 18.9215 18 17.8036 18H9.12256C8.70652 18 8.49829 18 8.29932 18.0408C8.12279 18.0771 7.95216 18.1368 7.79168 18.2188C7.61149 18.3108 7.44964 18.4403 7.12722 18.6982L7.12357 18.7012Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Opciones de nuevas conversaciones">
                <DropdownItem
                  key="new-chat"
                  startContent={<MessageCircle className="h-4 w-4" />}
                  onPress={() => setNewChatModalOpen(true)}
                >
                  Nuevo Chat
                </DropdownItem>
                <DropdownItem
                  key="bulk-message"
                  startContent={<Users className="h-4 w-4" />}
                  onPress={() => setBulkMessageModalOpen(true)}
                >
                  Mensaje Masivo
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-16 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1">
                <Kbd keys={["command"]}>K</Kbd>
              </div>
            </div>
            <button 
              onClick={onFiltersOpen}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <SlidersHorizontal className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No hay conversaciones</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {conversations.map((conversation) => {
              const isSelected = selectedConversation?.id === conversation.id
              const isHovered = hoveredConversation === conversation.id
              const contactName = conversation.customer?.name || conversation.customer?.phone || 'Sin nombre'
              const lastMessage = getLastMessagePreview(conversation)
              const time = conversation.lastActivity 
                ? formatConversationTime(conversation.lastActivity)
                : ''

              return (
                <div
                  key={conversation.id}
                  className={`group relative border-b border-slate-100 dark:border-slate-800 last:border-0 transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-600' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
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
                            isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {contactName}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
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
                              ? 'text-slate-900 dark:text-slate-100 font-medium' 
                              : 'text-slate-600 dark:text-slate-400'
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
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
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
                                  className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-200 text-xs font-medium rounded-md"
                                >
                                  {tag.label}
                                </span>
                              ))}
                              {conversation.tags.length > 2 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
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
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(currentPage)}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Página {currentPage + 1} de {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 2)}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Filters Modal */}
      <Modal 
        isOpen={isFiltersOpen} 
        onOpenChange={onFiltersOpenChange}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Filtros de conversaciones
              </ModalHeader>
              <ModalBody>
                {/* Sección: Estado (Chips) */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Estado</h3>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      variant={tempStatus === "all" ? "solid" : "flat"}
                      color={tempStatus === "all" ? "primary" : "default"}
                      className="cursor-pointer"
                      onClick={() => setTempStatus("all")}
                    >
                      Todos
                    </Chip>
                    {statusOptions.map((option) => (
                      <Chip
                        key={option.key}
                        variant={tempStatus === option.key ? "solid" : "flat"}
                        color={tempStatus === option.key ? option.color : "default"}
                        className="cursor-pointer"
                        onClick={() => setTempStatus(option.key)}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Sección: Canal */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Canal de Mensajería</label>
                  {channelsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <Select
                      label="Canal"
                      placeholder="Todos los canales"
                      selectedKeys={tempChannel ? [tempChannel] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string
                        setTempChannel(selected === "all" ? undefined : selected)
                      }}
                      classNames={{
                        trigger: "min-h-12",
                      }}
                      renderValue={(items: SelectedItems<MessagingServiceDto>) => {
                        const item = Array.from(items)[0]
                        if (!item) return "Todos los canales"
                        const service = channels.find(c => c.code === item.key)
                        if (!service) return "Todos los canales"
                        
                        const ChannelIcon = ({ code }: { code: string }) => {
                          const type = code?.toLowerCase()
                          if (type?.includes("whatsapp")) {
                            return <Image src="/WhatsApp.png" alt="WhatsApp" width={16} height={16} />
                          }
                          if (type?.includes("telegram")) {
                            return <Image src="/Telegram_2019_Logo.png" alt="Telegram" width={16} height={16} />
                          }
                          return <MessageCircle className="h-4 w-4" />
                        }
                        
                        return (
                          <div className="flex items-center gap-2">
                            <ChannelIcon code={service.code} />
                            <span>{service.name}</span>
                          </div>
                        )
                      }}
                    >
                      <SelectItem key="all" value="all">
                        Todos los canales
                      </SelectItem>
                      {channels
                        .filter(service => service.hasCredentials)
                        .map((service) => {
                          const ChannelIcon = ({ code }: { code: string }) => {
                            const type = code?.toLowerCase()
                            if (type?.includes("whatsapp")) {
                              return <Image src="/WhatsApp.png" alt="WhatsApp" width={20} height={20} />
                            }
                            if (type?.includes("telegram")) {
                              return <Image src="/Telegram_2019_Logo.png" alt="Telegram" width={20} height={20} />
                            }
                            return <MessageCircle className="h-5 w-5" />
                          }
                          
                          return (
                            <SelectItem key={service.code} value={service.code} textValue={service.name}>
                              <div className="flex items-center gap-2">
                                <ChannelIcon code={service.code} />
                                <span>{service.name}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                    </Select>
                  )}
                </div>

                <Divider />

                {/* Sección: Equipo */}
                <div>
                  <SearchableSelect<Team>
                    label="Equipo"
                    items={teams}
                    selectedKey={tempTeam}
                    placeholder="Todos los equipos"
                    searchPlaceholder="Buscar equipos..."
                    isLoading={teamsLoading}
                    getKey={(team) => team.id}
                    getTextValue={(team) => team.name}
                    renderSelectedValue={(team) => (
                      <Chip size="sm" variant="flat">
                        {team.name}
                      </Chip>
                    )}
                    renderItem={(team) => (
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col">
                          <span className="text-small">{team.name}</span>
                          {team.description && (
                            <span className="text-tiny text-default-400">{team.description}</span>
                          )}
                        </div>
                      </div>
                    )}
                    onChange={setTempTeam}
                    emptyLabel="Todos los equipos"
                  />
                </div>

                <Divider />

                {/* Sección: Agente */}
                <div>
                  <SearchableSelect<UserDto>
                    label="Agente"
                    items={agents}
                    selectedKey={tempAgent}
                    placeholder="Todos los agentes"
                    searchPlaceholder="Buscar agentes..."
                    isLoading={usersLoading}
                    getKey={(agent) => agent.agentId!}
                    getTextValue={(agent) => agent.displayName || agent.name}
                    renderSelectedValue={(agent) => agent ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={agent.displayName || agent.name}
                          size="sm"
                          className="w-5 h-5"
                          style={{ backgroundColor: generatePastelColor(agent.agentId || agent.id) }}
                        />
                        <span className="text-sm">{agent.displayName || agent.name}</span>
                      </div>
                    ) : null}
                    renderItem={(agent) => (
                      <div className="flex gap-2 items-center">
                        <Avatar
                          name={agent.displayName || agent.name}
                          size="sm"
                          className="w-6 h-6 shrink-0"
                          style={{ backgroundColor: generatePastelColor(agent.agentId || agent.id) }}
                        />
                        <div className="flex flex-col">
                          <span className="text-small">{agent.displayName || agent.name}</span>
                          <span className="text-tiny text-default-400">{agent.email}</span>
                        </div>
                      </div>
                    )}
                    onChange={setTempAgent}
                    emptyLabel="Todos los agentes"
                  />
                </div>

                <Divider />

                {/* Sección: Etiquetas */}
                <div>
                  <SearchableMultiSelect<Tag>
                    label="Etiquetas"
                    items={tags}
                    selectedKeys={tempTags}
                    placeholder="Todas las etiquetas"
                    searchPlaceholder="Buscar etiquetas..."
                    isLoading={tagsLoading}
                    getKey={(tag) => tag.id}
                    getTextValue={(tag) => tag.label}
                    renderSelectedChip={(tag) => (
                      <Chip
                        size="sm"
                        style={{ backgroundColor: tag.color, color: "#000" }}
                        className="text-xs"
                      >
                        {tag.label}
                      </Chip>
                    )}
                    renderItem={(tag, isSelected) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-small">{tag.label}</span>
                      </div>
                    )}
                    onChange={setTempTags}
                    emptyLabel="Todas las etiquetas"
                    maxChipsDisplay={3}
                  />
                </div>

                <Divider />

                {/* Sección: Ordenamiento */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Ordenamiento</h3>
                  <div className="flex gap-2">
                    <Select
                      placeholder="Ordenar por"
                      selectedKeys={[tempSortBy]}
                      onChange={(e) => setTempSortBy(e.target.value as ConversationSortField)}
                      size="sm"
                      className="flex-1"
                    >
                      {sortFieldOptions.map((option) => (
                        <SelectItem key={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                    
                    <Select
                      placeholder="Dirección"
                      selectedKeys={[tempSortDirection]}
                      onChange={(e) => setTempSortDirection(e.target.value as SortDirection)}
                      size="sm"
                      className="flex-1"
                    >
                      {sortDirectionOptions.map((option) => (
                        <SelectItem key={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button 
                  variant="light" 
                  onPress={handleClearFiltersInModal}
                >
                  Limpiar filtros
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleApplyFilters}
                >
                  Filtrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modales para nuevas conversaciones */}
      <NewChatModal 
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
      />
      
      <BulkMessageModal 
        isOpen={bulkMessageModalOpen}
        onClose={() => setBulkMessageModalOpen(false)}
      />
    </div>
    </>
  )
}
