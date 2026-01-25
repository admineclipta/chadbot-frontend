"use client"

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from "react"
import { Phone, Video, MoreVertical, ArrowLeft, Clock, Bot, User, X, Sparkles, UserPlus, CheckCheck, Check, Send, ChevronDown, Orbit } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  ButtonGroup,
  Button as HeroButton,
  Tabs,
  Tab
} from "@heroui/react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import MessageInput from "./message-input"
import ConversationNotes from "./conversation-notes"
import AISummaryPanel from "@/components/shared/ai-summary-panel"
import AssignConversationModal from "@/components/modals/assign-conversation-modal"
import ContactInfoModal from "@/components/modals/contact-info-modal"
import { apiService } from "@/lib/api"
import type { Conversation, Message } from "@/lib/types"
import { CONVERSATION_STATUS_CONFIG } from "@/lib/types"
import type { ConversationStatus } from "@/lib/api-types"
import { formatMessageTime } from "@/lib/utils"
import { getChannelDisplayName, getChannelIcon } from "@/lib/messaging-channels"

interface ChatViewProps {
  conversation: Conversation
  onSendMessage: (content: string, attachments?: File[]) => void
  onUserClick: (userId: string) => void
  loading?: boolean
  error?: string | null
  onConversationUpdate?: (conversation: Conversation) => void
  onCloseChat?: () => void
  onLoadOlderMessages?: (messages: Message[]) => void
  onRefreshMessages?: () => void
  autoRefreshInterval?: number
  onAutoRefreshIntervalChange?: (interval: number) => void
  initialPaginationInfo?: { totalRecords: number; currentPage: number; pageSize: number } | null
  refreshKey?: number
  currentUser?: { id: string; [key: string]: any }
}

export interface ChatViewRef {
  scrollToBottom: (behavior?: "auto" | "smooth") => void
}

const ChatView = forwardRef<ChatViewRef, ChatViewProps>(
  ({ 
    conversation, 
    onSendMessage, 
    onUserClick, 
    loading, 
    error, 
    onConversationUpdate, 
    onCloseChat, 
    onRefreshMessages,
    currentUser,
  }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showSummaryPanel, setShowSummaryPanel] = useState(false)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [showContactInfoModal, setShowContactInfoModal] = useState(false)
    const [intervenirLoading, setIntervenirLoading] = useState(false)
    const [changingStatus, setChangingStatus] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("responder")

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, [])

    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }))

    useEffect(() => {
      scrollToBottom("auto")
    }, [conversation.id, scrollToBottom])

    const contactName = conversation.customer?.name || conversation.customer?.phone || 'Sin nombre'
    const contactPhone = conversation.customer?.phone || 'Sin teléfono'
    const isActive = conversation.status === 'ACTIVE'
    const canIntervene = conversation.status === 'ACTIVE' && currentUser
    const canSendMessages = conversation.status !== 'CLOSED'

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

    const getSenderLabel = (sender: string): string => {
      switch (sender) {
        case 'client':
          return 'Cliente'
        case 'bot':
          return 'Bot'
        case 'agent':
          return 'Agente'
        default:
          return sender
      }
    }

    const handleIntervenirConversacion = async () => {
      if (intervenirLoading) return

      try {
        setIntervenirLoading(true)
        await apiService.changeConversationStatus(conversation.id, { status: 'INTERVENED' })
        
        toast.success('Conversación intervenida exitosamente')
        
        // Actualizar el estado de la conversación
        if (onConversationUpdate) {
          onConversationUpdate({
            ...conversation,
            status: 'INTERVENED',
          })
        }

        // Refrescar mensajes
        if (onRefreshMessages) {
          onRefreshMessages()
        }
      } catch (error: any) {
        console.error('Error al intervenir conversación:', error)
        toast.error(error.message || 'Error al intervenir la conversación')
      } finally {
        setIntervenirLoading(false)
      }
    }

    const handleAssignSuccess = () => {
      if (onRefreshMessages) {
        onRefreshMessages()
      }
      toast.success('Conversación asignada exitosamente')
    }

    // Función para obtener el estado actual de la conversación
    const getCurrentState = (): ConversationStatus => {
      return conversation.status
    }

    // Función para obtener configuración del estado actual
    const getCurrentStateConfig = () => {
      return CONVERSATION_STATUS_CONFIG[conversation.status] || CONVERSATION_STATUS_CONFIG.ACTIVE
    }

    // Función para obtener el botón principal según el estado
    const getMainButtonText = (status: ConversationStatus) => {
      const config = CONVERSATION_STATUS_CONFIG[status]
      if (!config) return "Cambiar Estado"
      
      const transitions = config.allowedTransitions
      
      // Priorizar transiciones más comunes
      if (status === "ACTIVE" && transitions.includes("INTERVENED")) {
        return "Intervenir"
      }
      if (status === "INTERVENED" && transitions.includes("CLOSED")) {
        return "Cerrar"
      }
      if ((status === "CLOSED" || status === "NO_ANSWER") && transitions.includes("ACTIVE")) {
        return "Activar"
      }
      
      // Fallback: usar primera transición disponible
      return CONVERSATION_STATUS_CONFIG[transitions[0]]?.label || "Cambiar Estado"
    }

    // Función para obtener el estado objetivo del botón principal
    const getMainButtonTargetState = (status: ConversationStatus): ConversationStatus => {
      const config = CONVERSATION_STATUS_CONFIG[status]
      if (!config || !config.allowedTransitions || config.allowedTransitions.length === 0) {
        return "CLOSED"
      }
      
      const transitions = config.allowedTransitions
      
      // Priorizar transiciones más comunes
      if (status === "ACTIVE" && transitions.includes("INTERVENED")) {
        return "INTERVENED"
      }
      if (status === "INTERVENED" && transitions.includes("CLOSED")) {
        return "CLOSED"
      }
      if ((status === "CLOSED" || status === "NO_ANSWER") && transitions.includes("ACTIVE")) {
        return "ACTIVE"
      }
      
      // Fallback: usar primera transición disponible
      return transitions[0] || "CLOSED"
    }

    // Función para obtener los estados disponibles en el dropdown
    const getDropdownStates = (currentStatus: ConversationStatus): ConversationStatus[] => {
      const config = CONVERSATION_STATUS_CONFIG[currentStatus]
      return config?.allowedTransitions || []
    }

    // Función para cambiar el estado de la conversación
    const handleStatusChange = async (newStatus: ConversationStatus) => {
      try {
        setChangingStatus(true)
        
        await apiService.changeConversationStatus(conversation.id, { status: newStatus })
        
        // Actualizar la conversación localmente
        const updatedConversation: Conversation = {
          ...conversation,
          status: newStatus,
          archived: newStatus === "CLOSED"
        }

        // Notificar al componente padre sobre el cambio
        if (onConversationUpdate) {
          onConversationUpdate(updatedConversation)
        }

        const statusLabel = CONVERSATION_STATUS_CONFIG[newStatus].label
        toast.success(`Estado cambiado a "${statusLabel}" exitosamente`)
      } catch (error) {
        console.error("Error al cambiar estado:", error)
        toast.error("Error al cambiar el estado de la conversación")
      } finally {
        setChangingStatus(false)
      }
    }

    const getMessageStatusIcon = (status?: string) => {
      switch (status) {
        case 'sent':
          return <Check className="w-4 h-4 text-slate-400" />
        case 'delivered':
          return <CheckCheck className="w-4 h-4 text-slate-400" />
        case 'read':
          return <CheckCheck className="w-4 h-4 text-blue-600" />
        default:
          return null
      }
    }

    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <X className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
            </div>
            
            {/* Error Message */}
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">
              Error al cargar la conversación
            </h3>
            <p className="text-slate-600 text-sm md:text-base mb-6">
              {error}
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <HeroButton
                color="danger"
                variant="flat"
                onPress={onCloseChat}
                startContent={<ArrowLeft className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Volver al listado
              </HeroButton>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 h-full max-h-full overflow-hidden w-full">
          {/* Chat Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 md:py-4 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              {/* Back button - Mobile only, separate from contact info */}
              {onCloseChat && (
                <button 
                  onClick={onCloseChat}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors lg:hidden flex-shrink-0"
                  aria-label="Volver a conversaciones"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              
              {/* Info del contacto */}
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors flex-1 min-w-0"
                onClick={() => setShowContactInfoModal(true)}
              >
                <Avatar
                  name={contactName}
                  size="lg"
                  gradient="mixed"
                  online={isActive}
                  className="flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1 flex-wrap">
                    <span className="truncate">{contactName}</span>
                    <Badge status={getStatusBadgeType(conversation.status)} showDot={true}>
                      {getStatusLabel(conversation.status)}
                    </Badge>
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{contactPhone}</span>
                    </div>
                    {conversation.integration && (
                      <div className="flex items-center gap-1">
                        <span>•</span>
                        <Image 
                          src={getChannelIcon(conversation.integration)}
                          alt={getChannelDisplayName(conversation.integration)}
                          width={16}
                          height={16}
                          className="flex-shrink-0"
                        />
                        <span className="hidden sm:inline">{getChannelDisplayName(conversation.integration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <button 
                  onClick={() => setShowSummaryPanel(true)}
                  className="p-2 md:p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group hidden sm:flex"
                  title="Resumen IA"
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-slate-600 group-hover:text-violet-600" />
                </button>

                {/* Dropdown de cambiar estado */}
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <button 
                      disabled={changingStatus}
                      className="p-2 md:p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cambiar estado"
                    >
                      <Orbit className="w-4 h-4 md:w-5 md:h-5 text-slate-600 group-hover:text-blue-600" />
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Estados de conversación"
                    onAction={(key) => handleStatusChange(key as ConversationStatus)}
                  >
                    {getDropdownStates(getCurrentState()).map((status) => (
                      <DropdownItem key={status}>
                        {CONVERSATION_STATUS_CONFIG[status].label}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>

                {/* Dropdown de opciones */}
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-slate-600" />
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Opciones de conversación">
                    <DropdownItem 
                      key="assign" 
                      startContent={<UserPlus className="w-4 h-4" />}
                      onPress={() => setShowAssignModal(true)}
                    >
                      Asignar usuario
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0"
          >
            {conversation.messages && conversation.messages.length > 0 ? (
              conversation.messages.map((message) => {
                const isSent = message.sender === 'agent' || message.sender === 'bot'
                const isBot = message.sender === 'bot'
                const isAgent = message.sender === 'agent'
                
                return (
                  <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {/* Avatar izquierdo (cliente) */}
                    {!isSent && (
                      <Avatar
                        name={contactName}
                        size="sm"
                        gradient="blue"
                        className="flex-shrink-0"
                      />
                    )}

                    <div className={`w-full max-w-full md:max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender Label */}
                      <div className={`text-xs text-slate-500 dark:text-slate-400 mb-1 px-1 flex items-center gap-1`}>
                        {isBot && <Bot className="w-3 h-3" />}
                        {isAgent && <User className="w-3 h-3" />}
                        <span>{getSenderLabel(message.sender)}</span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-3 py-2 md:px-4 md:py-3 ${
                        isSent 
                          ? isBot
                            ? 'bg-violet-100 border border-violet-200 rounded-tr-sm'
                            : 'bg-gradient-to-r from-blue-600 to-violet-700 text-white shadow-lg shadow-blue-500/20 rounded-tr-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-tl-sm'
                      }`}>
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isSent && !isBot ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {message.content}
                        </p>

                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment) => (
                              <div 
                                key={attachment.id} 
                                className={`text-xs rounded p-2 flex items-center gap-1 ${
                                  isSent && !isBot ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                                }`}
                              >
                                📎 {attachment.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Time and Status */}
                      <div className={`flex items-center gap-2 mt-1 px-2 text-xs text-slate-500`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatMessageTime(message.timestamp)}</span>
                      </div>
                    </div>

                    {/* Avatar derecho (bot/agente) */}
                    {isSent && (
                      <div className="flex-shrink-0">
                        {isBot ? (
                          <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-violet-600" />
                          </div>
                        ) : (
                          <Avatar
                            name="AG"
                            size="sm"
                            gradient="emerald"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Send className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No hay mensajes en esta conversación</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area with Tabs */}
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 relative flex-shrink-0">
            {/* Overlay para conversaciones no intervenidas */}
            {canIntervene && (
              <div 
                className="absolute inset-0 z-10 bg-gradient-to-b from-blue-50/95 to-violet-50/95 backdrop-blur-sm flex items-center justify-center cursor-pointer group hover:from-blue-50/90 hover:to-violet-50/90 transition-all"
                onClick={handleIntervenirConversacion}
              >
                <div className="flex items-center gap-4 px-6 max-w-lg">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      IA controlando la conversación
                    </p>
                    <p className="text-xs text-slate-600">
                      {intervenirLoading ? "Interviniendo..." : "Haz clic para intervenir y tomar control"}
                    </p>
                  </div>
                  {intervenirLoading && (
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
            )}
            
            {/* Tabs Container */}
            <Tabs
              aria-label="Opciones de conversación"
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              classNames={{
                base: "w-full",
                tabList: "w-full bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700",
                cursor: "bg-white dark:bg-slate-700 shadow-sm",
                tab: "h-10 font-medium",
                tabContent: "text-slate-600 group-data-[selected=true]:text-blue-600"
              }}
            >
              <Tab 
                key="responder" 
                title="Responder"
              >
                <div className="p-0">
                  <MessageInput 
                    onSendMessage={onSendMessage} 
                    disabled={!canSendMessages} 
                    isBlurred={!!canIntervene}
                    messages={conversation.messages}
                    conversationId={conversation.id}
                    customerName={conversation.customer?.name || ''}
                    customerPhone={conversation.customer?.phone || ''}
                    onMessageSent={() => {
                      if (onRefreshMessages) {
                        onRefreshMessages()
                      }
                    }}
                  />
                </div>
              </Tab>
              <Tab 
                key="notas" 
                title="Notas del chat"
              >
                <div className="h-[300px] md:h-[400px]">
                  <ConversationNotes 
                    conversationId={conversation.id}
                    className="h-full"
                  />
                </div>
              </Tab>
            </Tabs>
          </div>
        </div>

        {/* AI Summary Panel */}
        <AISummaryPanel
          conversationId={conversation.id}
          isOpen={showSummaryPanel}
          onClose={() => setShowSummaryPanel(false)}
        />

        {/* Assign Conversation Modal */}
        <AssignConversationModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          conversationId={conversation.id}
          customerName={conversation.customer?.name || ''}
          currentAssignedUserId={conversation.id_representante !== -1 ? conversation.id_representante : null}
          currentUser={currentUser}
          onAssignSuccess={handleAssignSuccess}
        />

        {/* Contact Info Modal */}
        <ContactInfoModal
          contactId={conversation.customer.id}
          isOpen={showContactInfoModal}
          onClose={() => setShowContactInfoModal(false)}
        />
      </>
    )
  }
)

ChatView.displayName = "ChatView"

export default ChatView
