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
  Button as HeroButton
} from "@heroui/react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import MessageInput from "./message-input"
import AISummaryPanel from "./ai-summary-panel"
import AssignConversationModal from "./assign-conversation-modal"
import ContactInfoModal from "./contact-info-modal"
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

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, [])

    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }))

    useEffect(() => {
      scrollToBottom("auto")
    }, [conversation.id, scrollToBottom])

    // Event listener para cerrar con tecla ESC
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        // Solo cerrar si ESC es presionado y no hay modales abiertos
        if (event.key === 'Escape' && onCloseChat) {
          // Verificar si hay modales abiertos
          const hasOpenModal = document.querySelector('[role="dialog"]') !== null
          if (!hasOpenModal) {
            event.preventDefault()
            event.stopPropagation()
            onCloseChat()
          }
        }
      }

      document.addEventListener('keydown', handleEscape, true)
      return () => {
        document.removeEventListener('keydown', handleEscape, true)
      }
    }, [onCloseChat])

    const contactName = conversation.customer?.name || conversation.customer?.phone || 'Sin nombre'
    const contactPhone = conversation.customer?.phone || 'Sin teléfono'
    const isActive = conversation.status === 'ACTIVE'
    const canIntervene = conversation.status === 'ACTIVE' && currentUser
    const canSendMessages = conversation.status !== 'CLOSED'

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
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold mb-1">Error al cargar el chat</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 h-full overflow-hidden">
          {/* Chat Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              {/* Info del contacto */}
              <div 
                className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg p-2 -ml-2 transition-colors"
                onClick={() => setShowContactInfoModal(true)}
              >
                {onCloseChat && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseChat()
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors lg:hidden"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>
                )}
                
                <Avatar
                  name={contactName}
                  size="lg"
                  gradient="mixed"
                  online={isActive}
                />
                
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
                    {contactName}
                    <Badge status={getStatusBadgeType(conversation.status)} showDot={true}>
                      {getStatusLabel(conversation.status)}
                    </Badge>
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Phone className="w-3 h-3" />
                    <span>{contactPhone}</span>
                    {conversation.integration && (
                      <>
                        <span>•</span>
                        <Image 
                          src={getChannelIcon(conversation.integration)}
                          alt={getChannelDisplayName(conversation.integration)}
                          width={16}
                          height={16}
                          className="flex-shrink-0"
                        />
                        <span>{getChannelDisplayName(conversation.integration)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSummaryPanel(true)}
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                  title="Resumen IA"
                >
                  <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                </button>

                {/* Dropdown de cambiar estado */}
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <button 
                      disabled={changingStatus}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cambiar estado"
                    >
                      <Orbit className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
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
                      <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-300" />
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
            className="flex-1 overflow-y-auto p-6 space-y-4"
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

                    <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender Label */}
                      <div className={`text-xs text-slate-500 dark:text-slate-400 mb-1 px-1 flex items-center gap-1`}>
                        {isBot && <Bot className="w-3 h-3" />}
                        {isAgent && <User className="w-3 h-3" />}
                        <span>{getSenderLabel(message.sender)}</span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-4 py-3 ${
                        isSent 
                          ? isBot
                            ? 'bg-violet-100 dark:bg-violet-900 border border-violet-200 dark:border-violet-800 rounded-tr-sm'
                            : 'bg-gradient-to-r from-blue-600 to-violet-700 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10 rounded-tr-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-tl-sm'
                      }`}>
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
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
                      <div className={`flex items-center gap-2 mt-1 px-2 text-xs text-slate-500 dark:text-slate-400`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatMessageTime(message.timestamp)}</span>
                      </div>
                    </div>

                    {/* Avatar derecho (bot/agente) */}
                    {isSent && (
                      <div className="flex-shrink-0">
                        {isBot ? (
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 border border-violet-200 dark:border-violet-800 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
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
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <Send className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p>No hay mensajes en esta conversación</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 relative">
            {/* Overlay para conversaciones no intervenidas */}
            {canIntervene && (
              <div 
                className="absolute inset-0 z-10 bg-gradient-to-b from-blue-50/95 to-violet-50/95 dark:from-slate-950/95 dark:to-slate-900/95 backdrop-blur-sm flex items-center justify-center cursor-pointer group hover:from-blue-50/90 hover:to-violet-50/90 dark:hover:from-slate-950/90 dark:hover:to-slate-900/90 transition-all"
                onClick={handleIntervenirConversacion}
              >
                <div className="flex items-center gap-4 px-6 max-w-lg">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-1">
                      IA controlando la conversación
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-200">
                      {intervenirLoading ? "Interviniendo..." : "Haz clic para intervenir y tomar control"}
                    </p>
                  </div>
                  {intervenirLoading && (
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
            )}
            
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
