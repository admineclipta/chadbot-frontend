"use client"

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from "react"
import { Card, CardHeader, CardBody, Avatar, Chip, Spinner, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, ButtonGroup } from "@heroui/react"
import { Phone, Clock, Bot, User, UserCheck, Sparkles, UserCog, UserPlus, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import MessageInput from "./message-input"
import AISummaryPanel from "./ai-summary-panel"
import AssignConversationModal from "./assign-conversation-modal"
import UserAvatar from "./user-avatar"
import ApiErrorAlert from "./api-error-alert"
import { apiService } from "@/lib/api"
import type { Conversation, Message } from "@/lib/types"
import { CONVERSATION_STATUS_CONFIG } from "@/lib/types"
import type { ConversationStatus } from "@/lib/api-types"
import { mapApiMensajeToMessage } from "@/lib/types"
import { formatMessageTime } from "@/lib/utils"

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
  autoRefreshInterval?: number // Intervalo en segundos (por defecto 10)
  onAutoRefreshIntervalChange?: (interval: number) => void
  initialPaginationInfo?: { totalRecords: number; currentPage: number; pageSize: number } | null
  refreshKey?: number // Key para forzar reset de paginación
  currentUser?: { id: string; [key: string]: any } // Usuario actual para intervenciones
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
    onLoadOlderMessages, 
    onRefreshMessages,
    autoRefreshInterval = 10,
    onAutoRefreshIntervalChange,
    initialPaginationInfo,
    refreshKey,
    currentUser
  }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showSummaryPanel, setShowSummaryPanel] = useState(false)
    const [intervenirLoading, setIntervenirLoading] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [apiError, setApiError] = useState<{show: boolean, message?: string} | null>(null)
    
    // Estados para carga de mensajes antiguos
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMoreMessages, setHasMoreMessages] = useState(true)
    const [lastScrollHeight, setLastScrollHeight] = useState(0)
    const [remainingMessages, setRemainingMessages] = useState(0)
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
    const pageSize = 20

    // Estados para auto-refresh (simplificado - siempre activo)
    const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
    const [currentRefreshInterval, setCurrentRefreshInterval] = useState(autoRefreshInterval)
    const [botImageError, setBotImageError] = useState(false)

    // Función para obtener las iniciales de un nombre
    const getInitials = (name: string): string => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Obtener el ID del usuario logueado desde props
    useEffect(() => {
      if (currentUser) {
        setCurrentUserId(currentUser.id)
        setCurrentUserRole(currentUser.role || null)
      }
    }, [currentUser])

    // Reset pagination cuando cambie la conversación
    useEffect(() => {
      setCurrentPage(1)
      setHasMoreMessages(true)
      setLoadingOlderMessages(false)
      setRemainingMessages(0)
      setShouldAutoScroll(true)
      setLastRefreshTime(new Date())
      lastMessageRef.current = null // Reset la referencia del último mensaje
    }, [conversation.id])

    // Reset pagination cuando cambie la refreshKey (para forzar refresco)
    useEffect(() => {
      if (refreshKey !== undefined) {
        setCurrentPage(1)
        setHasMoreMessages(true)
        setLoadingOlderMessages(false)
        setRemainingMessages(0)
        setShouldAutoScroll(true)
        lastMessageRef.current = null
      }
    }, [refreshKey])

    // Actualizar mensajes restantes cuando se reciba información de paginación inicial
    useEffect(() => {
      if (initialPaginationInfo && currentPage === 1) {
        // Solo recalcular si estamos en la página 1 (inicial)
        const { totalRecords, currentPage, pageSize } = initialPaginationInfo
        // Calcular cuántos mensajes quedan por cargar
        const messagesAlreadyLoaded = currentPage * pageSize
        const remaining = totalRecords - messagesAlreadyLoaded
        
        setRemainingMessages(Math.max(0, remaining))
        setHasMoreMessages(remaining > 0)
      }
    }, [initialPaginationInfo, currentPage])

    // Auto-refresh de mensajes (siempre activo)
    useEffect(() => {
      if (!onRefreshMessages) return

      // Limpiar intervalo anterior
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }

      // Configurar nuevo intervalo
      refreshIntervalRef.current = setInterval(() => {
        // Solo refrescar si no estamos cargando mensajes antiguos y no hay modales abiertos
        if (!loadingOlderMessages && !showSummaryPanel && !showAssignModal) {
          onRefreshMessages()
          setLastRefreshTime(new Date())
        }
      }, currentRefreshInterval * 1000)

      // Cleanup del intervalo
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }, [onRefreshMessages, currentRefreshInterval, loadingOlderMessages, showSummaryPanel, showAssignModal])

    // Función para actualizar el intervalo de refresh (será llamada desde el modal de configuraciones)
    const updateRefreshInterval = useCallback((newInterval: number) => {
      setCurrentRefreshInterval(newInterval)
      setLastRefreshTime(new Date())
      // Notificar al componente padre para persistir la configuración
      if (onAutoRefreshIntervalChange) {
        onAutoRefreshIntervalChange(newInterval)
      }
    }, [onAutoRefreshIntervalChange])

    // Exposer la función para que el componente padre pueda actualizarla
    useEffect(() => {
      // Esta función se puede llamar desde el componente padre
      if (window && typeof window === 'object') {
        (window as any).updateChatRefreshInterval = updateRefreshInterval
      }
    }, [updateRefreshInterval])

    // Función para cargar mensajes más antiguos (activada por botón)
    const loadOlderMessages = useCallback(async () => {
      if (loadingOlderMessages || !hasMoreMessages) return

      try {
        setLoadingOlderMessages(true)
        
        // Deshabilitar auto-scroll mientras cargamos mensajes antiguos
        setShouldAutoScroll(false)
        
        // Guardar la altura actual del scroll antes de cargar mensajes
        if (scrollContainerRef.current) {
          setLastScrollHeight(scrollContainerRef.current.scrollHeight)
        }
        
        const nextPage = currentPage + 1
        
        // Cargar mensajes más antiguos usando orden descendente y paginación
        const paginationResponse = await apiService.getMensajesWithPagination(
          Number.parseInt(conversation.id),
          nextPage,
          pageSize,
          "desc" // Descendente: más recientes primero, pero página 2+ son más antiguos
        )

        if (!paginationResponse || paginationResponse.Data.length === 0) {
          setHasMoreMessages(false)
          toast.success("No hay más mensajes anteriores")
          return
        }

        // Mapear mensajes de la API y ordenar cronológicamente
        const mappedOlderMessages = paginationResponse.Data.map(mapApiMensajeToMessage).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        
        // Notificar al componente padre para agregar los mensajes más antiguos AL INICIO
        if (onLoadOlderMessages) {
          onLoadOlderMessages(mappedOlderMessages)
        }

        setCurrentPage(nextPage)

        // Actualizar mensajes restantes basándose en la respuesta de paginación
        const messagesAlreadyLoaded = paginationResponse.CurrentPage * paginationResponse.PageSize
        const remaining = paginationResponse.TotalRecords - messagesAlreadyLoaded
        
        setRemainingMessages(Math.max(0, remaining))
        
        // Si no quedan más mensajes o recibimos menos que el pageSize, desactivar el botón
        if (remaining <= 0 || paginationResponse.Data.length < pageSize) {
          setHasMoreMessages(false)
        }

        // Mostrar notificación de éxito
        toast.success(`Se cargaron ${paginationResponse.Data.length} mensajes anteriores`)

      } catch (error) {
        console.error("Error loading older messages:", error)
        toast.error("Error al cargar mensajes anteriores")
      } finally {
        setLoadingOlderMessages(false)
        // NO re-habilitar auto-scroll aquí, se re-habilitará cuando sea necesario
      }
    }, [conversation.id, currentPage, loadingOlderMessages, hasMoreMessages, onLoadOlderMessages, pageSize])

    // Manejar scroll solo para mantener la posición después de cargar mensajes antiguos
    const handleScroll = useCallback(() => {
      // Función simplificada, solo para eventos de scroll si es necesario
    }, [])

    // Mantener scroll en la posición correcta después de cargar mensajes antiguos
    useEffect(() => {
      if (lastScrollHeight > 0 && scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const newScrollHeight = container.scrollHeight
        const scrollDifference = newScrollHeight - lastScrollHeight
        
        // Mantener la posición relativa del scroll después de agregar mensajes antiguos
        // Sin usar scrollBehavior smooth para que sea instantáneo
        const originalBehavior = container.style.scrollBehavior
        container.style.scrollBehavior = 'auto'
        container.scrollTop = scrollDifference
        container.style.scrollBehavior = originalBehavior
        
        setLastScrollHeight(0)
      }
    }, [conversation.messages, lastScrollHeight])

    const scrollToBottom = (behavior: "auto" | "smooth" = "auto") => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }

    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }))

    // Referencia para rastrear el último mensaje y detectar mensajes nuevos
    const lastMessageRef = useRef<string | null>(null)

    // Solo hacer scroll automático cuando se envía un nuevo mensaje, NO cuando se cargan mensajes antiguos
    useEffect(() => {
      if (conversation.messages.length > 0) {
        const lastMessage = conversation.messages[conversation.messages.length - 1]
        
        // Si hay un mensaje nuevo al final (no al principio) y no estamos cargando mensajes antiguos
        if (lastMessage.id !== lastMessageRef.current && !loadingOlderMessages && lastScrollHeight === 0) {
          // Re-habilitar auto-scroll cuando hay un mensaje nuevo
          setShouldAutoScroll(true)
          scrollToBottom("auto")
        }
        
        // Actualizar la referencia del último mensaje
        lastMessageRef.current = lastMessage.id
      }
    }, [conversation.messages, loadingOlderMessages, lastScrollHeight])

    // Estado para manejar el loading del cambio de estado
    const [changingStatus, setChangingStatus] = useState(false)

    // Función para obtener el estado actual de la conversación
    const getCurrentState = (): ConversationStatus => {
      return conversation.status
    }

    // Función para obtener configuración del estado actual
    const getCurrentStateConfig = () => {
      return CONVERSATION_STATUS_CONFIG[conversation.status]
    }

    // Función para obtener el botón principal según el estado
    const getMainButtonText = (status: ConversationStatus) => {
      const config = CONVERSATION_STATUS_CONFIG[status]
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
      return CONVERSATION_STATUS_CONFIG[currentStatus].allowedTransitions
    }

    // Función para cambiar el estado de la conversación
    const handleStatusChange = async (newStatus: ConversationStatus) => {
      try {
        setChangingStatus(true)
        setApiError(null) // Limpiar error anterior
        
        // Usar API v1 para cambiar el estado
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
        
        // Mostrar alerta de error de API si es un error de intervención
        if (newState === "Intervenida") {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido"
          setApiError({
            show: true,
            message: errorMessage.includes("Network") || errorMessage.includes("fetch") 
              ? "No se pudo conectar con el servidor de agentes de IA. Verifica tu conexión e intenta nuevamente."
              : "Error al comunicarse con el servicio de agentes de IA. El servicio podría no estar disponible."
          })
        }
        
        const errorMessage = newState === "Intervenida" 
          ? "Error al intervenir la conversación"
          : "Error al cambiar el estado de la conversación"
        toast.error(errorMessage)
      } finally {
        setChangingStatus(false)
      }
    }

    // Listener para la tecla ESC
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          if (showSummaryPanel) {
            // Si el panel de resumen está abierto, cerrarlo
            setShowSummaryPanel(false)
          } else if (onCloseChat) {
            // Si no hay panel abierto, cerrar el chat
            onCloseChat()
          }
        }
      }

      // Solo agregar el listener si no hay panel de resumen abierto
      // El panel tiene su propio listener con mayor prioridad
      if (!showSummaryPanel) {
        document.addEventListener("keydown", handleKeyDown)
      }
      
      return () => {
        document.removeEventListener("keydown", handleKeyDown)
      }
    }, [showSummaryPanel, onCloseChat])

    const handleIntervenirConversacion = async () => {
      try {
        setIntervenirLoading(true)
        setApiError(null) // Limpiar error anterior
        
        // Usar API v1 para asignar la conversación al agente actual
        if (!currentUserId) {
          throw new Error("Usuario no autenticado")
        }
        
        await apiService.assignConversation(conversation.id, { agentId: currentUserId })
        
        // Cambiar estado a INTERVENED
        await apiService.changeConversationStatus(conversation.id, { status: "INTERVENED" })
        
        // Actualizar la conversación localmente
        const updatedConversation: Conversation = {
          ...conversation,
          id_representante: Number.parseInt(currentUserId),
          status: "INTERVENED",
          archived: false
        }
        
        // Notificar al componente padre sobre el cambio
        if (onConversationUpdate) {
          onConversationUpdate(updatedConversation)
        }

        // Mostrar notificación de éxito
        toast.success("Conversación intervenida exitosamente", {
          description: "Ahora puedes responder como agente en esta conversación"
        })
      } catch (error) {
        console.error("Error al intervenir conversación:", error)
        
        // Mostrar alerta de error de API
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        setApiError({
          show: true,
          message: errorMessage.includes("Network") || errorMessage.includes("fetch") 
            ? "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente."
            : "Error al comunicarse con el servicio. El servicio podría no estar disponible."
        })
        
        toast.error("Error al intervenir la conversación", {
          description: "No se pudo tomar el control de la conversación. Inténtalo nuevamente."
        })
      } finally {
        setIntervenirLoading(false)
      }
    }

    const handleAssignSuccess = (userName: string) => {
      // Recargar la conversación para reflejar los cambios
      if (onConversationUpdate) {
        const updatedConversation = {
          ...conversation,
          // Nota: Idealmente aquí deberíamos recargar desde la API
          // para obtener el id_representante correcto
        }
        onConversationUpdate(updatedConversation)
      }
    }

    // Verificar permisos del usuario actual
    const canIntervene = conversation.id_representante === -1
    const isCurrentUserAssigned = conversation.id_representante === Number.parseInt(currentUserId || "1")
    const isAssignedToOtherUser = conversation.id_representante !== null && 
                                  conversation.id_representante !== -1 && 
                                  conversation.id_representante !== Number.parseInt(currentUserId || "1")
    const canSendMessages = conversation.id_representante === -1 || isCurrentUserAssigned
    const isAdmin = currentUserRole === "admin"



    const getSenderIcon = (sender: string) => {
      switch (sender) {
        case "client":
          return <User className="h-4 w-4" />
        case "bot":
          return <Bot className="h-4 w-4" />
        case "agent":
          return <UserCheck className="h-4 w-4" />
        default:
          return <User className="h-4 w-4" />
      }
    }

    const getSenderColor = (sender: string) => {
      switch (sender) {
        case "client":
          return "primary"
        case "bot":
          return "secondary"
        case "agent":
          return "success"
        default:
          return "default"
      }
    }

    const getSenderLabel = (sender: string) => {
      switch (sender) {
        case "client":
          return "Cliente"
        case "bot":
          return "Bot"
        case "agent":
          return "Agente"
        default:
          return "Usuario"
      }
    }

    return (
      <>
        <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 ${showSummaryPanel ? 'mr-96' : ''} transition-all duration-300`}>
          {/* Chat Header */}
          <Card className="rounded-none border-b">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={conversation.customer.name}
                    size="md"
                    className="cursor-pointer"
                    onClick={() => onUserClick(conversation.customer.id)}
                    showTooltip={true}
                  />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{conversation.customer.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{conversation.customer.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAssignedToOtherUser && (
                    <Chip size="sm" color="danger" variant="flat">
                      Intervenida por otro usuario
                    </Chip>
                  )}

                  {/* Botón Asignar - solo visible para administradores */}
                  {isAdmin && (
                    <Button
                      size="sm"
                      color="secondary"
                      variant="flat"
                      startContent={<UserPlus className="h-4 w-4" />}
                      onPress={() => setShowAssignModal(true)}
                    >
                      Asignar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    className="rainbow-hover transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium"
                    startContent={<Sparkles className="h-4 w-4" />}
                    onPress={() => setShowSummaryPanel(true)}
                  >
                    Resumir
                  </Button>
                  
                  {/* Botón de estado con dropdown */}
                  <ButtonGroup size="sm">
                    <Button
                      color={getCurrentStateConfig().color}
                      variant="flat"
                      isLoading={changingStatus}
                      onPress={() => handleStatusChange(getMainButtonTargetState(getCurrentState()))}
                    >
                      {getMainButtonText(getCurrentState())}
                    </Button>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          color={getCurrentStateConfig().color}
                          variant="flat"
                          isIconOnly
                          isDisabled={changingStatus}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Estados de conversación"
                        onAction={(key) => handleStatusChange(key as ConversationStatus)}
                      >
                        {getDropdownStates(getCurrentState()).map((status) => (
                          <DropdownItem key={status} className="text-sm">
                            {CONVERSATION_STATUS_CONFIG[status].label}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  </ButtonGroup>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Messages Area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ scrollBehavior: "smooth" }}
            onScroll={handleScroll}
          >
            {/* Alerta de error de API de agentes IA */}
            {apiError?.show && (
              <ApiErrorAlert
                title="Error de comunicación con agentes de IA"
                description={apiError.message || "No se pudo conectar con el servidor de agentes de IA. El servicio podría no estar disponible o no responder en este momento."}
                onRetry={() => {
                  setApiError(null)
                  handleIntervenirConversacion()
                }}
                onGoHome={() => {
                  setApiError(null)
                  if (onCloseChat) onCloseChat()
                }}
                showRetry={true}
                showGoHome={true}
                className="mb-4"
              />
            )}

            {/* Botón para cargar mensajes anteriores */}
            {hasMoreMessages && remainingMessages > 0 && conversation.messages.length > 0 && (
              <div className="flex justify-center py-4">
                <Button
                  size="md"
                  variant="bordered"
                  color="primary"
                  onPress={loadOlderMessages}
                  isLoading={loadingOlderMessages}
                  disabled={loadingOlderMessages}
                  className="mb-2 font-medium"
                  startContent={!loadingOlderMessages && <Clock className="h-4 w-4" />}
                >
                  {loadingOlderMessages ? "Cargando mensajes..." : `Cargar mensajes anteriores (${remainingMessages})`}
                </Button>
              </div>
            )}

            {/* Indicador de que no hay más mensajes */}
            {!hasMoreMessages && conversation.messages.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="text-sm text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  No hay más mensajes anteriores
                </div>
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-700">Error al cargar mensajes: {error}</p>
              </div>
            )}

            {!loading && !error && conversation.messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No hay mensajes en esta conversación</p>
              </div>
            )}

            {conversation.messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.sender === "agent" || message.sender === "bot" ? "justify-end" : "justify-start"} mb-4`}>
                {/* Avatar - solo para lado izquierdo (cliente) */}
                {message.sender === "client" && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                        {getInitials(conversation.customer.name)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Avatar para bot en el lado derecho */}
                {message.sender === "bot" && (
                  <div className="flex-shrink-0 mt-1 order-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center overflow-hidden shadow-sm">
                      {!botImageError ? (
                        <img 
                          src="/openai.png" 
                          alt="Bot" 
                          className="w-6 h-6 object-contain"
                          onError={() => setBotImageError(true)}
                        />
                      ) : (
                        <Bot className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      )}
                    </div>
                  </div>
                )}

                <div className={`flex flex-col max-w-xs lg:max-w-md ${message.sender === "bot" ? "order-1" : ""}`}>
                  <div
                    className={`px-4 py-3 rounded-lg shadow-sm ${
                      message.sender === "agent"
                        ? "bg-blue-500 text-white rounded-br-sm"
                        : message.sender === "bot"
                          ? "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 rounded-br-sm border border-purple-200 dark:border-purple-700"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={getSenderColor(message.sender) as any}
                        startContent={getSenderIcon(message.sender)}
                        className="text-xs"
                      >
                        {getSenderLabel(message.sender)}
                      </Chip>
                      <span className="text-xs opacity-70 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="text-xs bg-black bg-opacity-10 rounded p-2 flex items-center gap-1">
                            📎 {attachment.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar - solo para lado derecho (agente) */}
                {message.sender === "agent" && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-300">
                        AG
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <Card className="rounded-none border-t">
            <CardBody className="p-0 relative overflow-hidden">
              {/* Overlay para conversaciones no intervenidas */}
              {canIntervene && (
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-blue-50/85 to-purple-50/85 dark:from-blue-900/85 dark:to-purple-900/85 backdrop-blur-[0.5px] flex items-center justify-center group cursor-pointer transition-all duration-300 hover:from-blue-50/60 hover:to-purple-50/60 dark:hover:from-blue-900/60 dark:hover:to-purple-900/60 animate-fade-in-scale hover:scale-[1.02] ai-overlay-container"
                     onClick={handleIntervenirConversacion}>
                  <div className="flex items-center gap-4 px-6 ai-overlay-content max-w-lg mx-auto">
                    <div className="flex-shrink-0">
                      <Bot className="h-10 w-10 text-blue-500 dark:text-blue-400 animate-ai-pulse group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300 mb-1">
                        Esta conversación está siendo controlada por inteligencia artificial
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                        {intervenirLoading ? "Interviniendo..." : "Haz clic aquí para intervenir y tomar el control manual"}
                      </p>
                    </div>
                    
                    {intervenirLoading && (
                      <div className="flex-shrink-0">
                        <Spinner size="sm" color="warning" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <MessageInput 
                onSendMessage={onSendMessage} 
                disabled={!canSendMessages} 
                isBlurred={canIntervene}
                messages={conversation.messages}
                conversationId={conversation.id}
                customerName={conversation.customer.name}
                customerPhone={conversation.customer.phone}
                onMessageSent={() => {
                  // Refrescar mensajes después de enviar plantilla
                  if (onRefreshMessages) {
                    onRefreshMessages()
                  }
                }}
              />
            </CardBody>
          </Card>
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
          customerName={conversation.customer.name}
          currentAssignedUserId={conversation.id_representante !== -1 ? conversation.id_representante : null}
          currentUser={currentUser}
          onAssignSuccess={handleAssignSuccess}
        />
      </>
    )
  },
)

ChatView.displayName = "ChatView"

export default ChatView