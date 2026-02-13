"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectItem, Kbd } from "@heroui/react"
import Sidebar from "@/components/layout/sidebar"
import ConversationList from "@/components/chat/conversation-list"
import ConversationFilters from "@/components/chat/conversation-filters"
import ChatView, { type ChatViewRef } from "@/components/chat/chat-view"
import UserProfile from "@/components/management/user-profile"
import UserManagement from "@/components/management/user-management"
import ContactManagement from "@/components/management/contact-management"
import TeamManagement from "@/components/management/team-management"
import AssistantManagement from "@/components/management/assistant-management"
import TagManagement from "@/components/management/tag-management"
import SettingsView from "@/components/settings/settings-view"
import EnvironmentIndicator from "@/components/layout/environment-indicator"
import ContactInfoModal from "@/components/modals/contact-info-modal"
import HomeDashboard from "@/components/home-dashboard"
import type { Conversation, User, Message, Tag } from "@/lib/types"
import type { ConversationStatus, MessagingServiceType, ConversationSortField, SortDirection, Message as ApiMessage } from "@/lib/api-types"
import { apiService } from "@/lib/api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { useApi } from "@/hooks/use-api"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn, parseApiTimestamp } from "@/lib/utils"

// Función helper para determinar el tipo de mensaje basado en el tipo MIME
const getMessageTypeFromFile = (file: File): "image" | "video" | "audio" | "document" | "sticker" => {
  const mimeType = file.type.toLowerCase();

  if (mimeType.startsWith("image/")) {
    // Verificar si es un sticker (webp es común para stickers)
    if (mimeType === "image/webp") {
      return "sticker";
    }
    return "image";
  } else if (mimeType.startsWith("video/")) {
    return "video";
  } else if (mimeType.startsWith("audio/")) {
    return "audio";
  } else {
    return "document";
  }
};

export default function Home() {
  const router = useRouter()
  const chatViewRef = useRef<ChatViewRef>(null)
  const isMobile = useIsMobile()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState<"dashboard" | "welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "tags" | "settings">("dashboard")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messagesRefreshKey, setMessagesRefreshKey] = useState<number>(0) // Key para forzar refresco de mensajes
  const [selectedRepresentativeFilter, setSelectedRepresentativeFilter] = useState<"all" | "mine" | number>("all") // Filtro por representante
  const [availableRepresentatives, setAvailableRepresentatives] = useState<Array<{id: number, name: string}>>([]) // Lista de representantes disponibles
  
  // Estados para paginación (0-indexed)
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [totalElements, setTotalElements] = useState<number>(0)
  const [hasMoreConversations, setHasMoreConversations] = useState<boolean>(false)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)

  // Estados para filtros nuevos (Fase 2 - mejorados)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ConversationStatus | "all">("all")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<ConversationSortField>("updatedAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("DESC")
  const [availableTags, setAvailableTags] = useState<Tag[]>([])

  // Estado para modal de información del cliente
  const [contactInfoModalOpen, setContactInfoModalOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  // Cargar tags disponibles al montar
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tagsResponse = await apiService.getTags(0, 100);
        setAvailableTags(tagsResponse.content);
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };

    if (isAuthenticated) {
      fetchTags();
    }
  }, [isAuthenticated]);

  // Hook para cargar conversaciones desde la API con todos los filtros
  const {
    data: apiConversaciones,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useApi(
    (signal) => {
      // Cargar todas las conversaciones cuando estamos en la vista de conversaciones
      if (currentView !== "conversations") {
        return Promise.resolve(null);
      }

      // Determinar el status a filtrar (si no es "all")
      const statusParam = selectedStatusFilter !== "all" ? selectedStatusFilter : undefined;
      
      // Usar API v1 con paginación completa y todos los filtros
      return apiService.getConversations(
        currentPage,
        20, // Tamaño de página
        statusParam,
        selectedChannel?.toUpperCase() as any, // MessagingServiceType
        true, // fetchContactInfo
        searchTerm || undefined,
        selectedTeam || undefined,
        selectedAgent || undefined,
        selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        sortDirection,
        signal
      )
    },
    [isAuthenticated, currentView, currentPage, selectedChannel, selectedStatusFilter, searchTerm, selectedTeam, selectedAgent, selectedTags, sortBy, sortDirection],
    DEBOUNCE_SEARCH_MS
  )

  // Función para cambiar de página
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page - 1) // HeroUI Pagination es 1-indexed, API es 0-indexed
    setSelectedConversation(null) // Limpiar conversación seleccionada al cambiar de página
  }, [])

  // Función para limpiar todos los filtros
  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedStatusFilter("all")
    setSelectedChannel(undefined)
    setSelectedTeam("")
    setSelectedAgent("")
    setSelectedTags([])
    setSortBy("updatedAt")
    setSortDirection("DESC")
    setCurrentPage(0)
  }, [])

  // Resetear a página 0 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, selectedChannel, selectedStatusFilter, selectedTeam, selectedAgent, selectedTags, sortBy, sortDirection])

  // TODO: Implementar filtrado por agente en API v1
  // Hook para cargar lista de representantes disponibles
  // const {
  //   data: apiRepresentatives,
  // } = useApi(
  //   () => isAuthenticated ? apiService.getAgents(false) : Promise.resolve(null),
  //   [isAuthenticated],
  // )

  // Hook para cargar mensajes de la conversación seleccionada (mensajes más recientes)
  const {
    data: apiMensajesResponse,
    loading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useApi(
    (signal?: AbortSignal) =>
      selectedConversation ? apiService.getMessages(selectedConversation.id, 0, 20) : Promise.resolve(null),
    [selectedConversation?.id, messagesRefreshKey], // Incluir refreshKey para forzar refresco
  )

  const getMessageFileUrl = useCallback((file?: any): string | null => {
    if (!file) return null
    return file.fileUrl || null
  }, [])

  const mapApiMessageToDomain = useCallback((msg: ApiMessage): Message => {
    const messageContent = msg.content?.text || msg.content?.caption || ""
    const senderType: "client" | "agent" | "bot" = msg.sender?.type === "agent"
      ? "agent"
      : msg.sender?.type === "bot"
        ? "bot"
        : "client"
    let fileUrl = getMessageFileUrl(msg.file)
    if (!fileUrl && msg.file) {
      fileUrl = msg.file.url || msg.file.storageUri || msg.file.fileUrl || null
    }

    return {
      id: msg.id,
      content: messageContent,
      sender: senderType,
      senderId: msg.sender?.id,
      senderName: msg.sender?.name,
      timestamp: parseApiTimestamp(msg.createdAt),
      status: msg.status,
      type: msg.type,
      file: msg.file
        ? {
            id: msg.file.id,
            url: fileUrl,
            status: msg.file.status,
            mimeType: msg.file.metadata?.mime_type,
            filename: msg.file.metadata?.filename,
            sizeBytes: msg.file.metadata?.size_bytes,
            width: msg.file.metadata?.width,
            height: msg.file.metadata?.height,
          }
        : undefined,
      attachments: fileUrl
        ? [
            {
              id: msg.file.id,
              name: msg.file.metadata?.filename || "Media",
              type: msg.type,
              url: fileUrl,
            },
          ]
        : undefined,
    }
  }, [getMessageFileUrl, parseApiTimestamp])

  useEffect(() => {
    const token = localStorage.getItem("chadbot_token")
    const userData = localStorage.getItem("chadbot_user")

    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
      apiService.setToken(token)
    } else {
      router.push("/login")
    }
  }, [router])

  // Actualizar conversaciones cuando lleguen de la API
  useEffect(() => {
    if (apiConversaciones) {
      // API v1 con mapper automático - ya viene en formato domain
      setConversations(apiConversaciones.content)
      
      // Actualizar información de paginación
      setTotalPages(apiConversaciones.totalPages)
      setTotalElements(apiConversaciones.totalElements)
      setHasMoreConversations(apiConversaciones.page < apiConversaciones.totalPages - 1)
    }
  }, [apiConversaciones])

  // Actualizar mensajes cuando lleguen de la API
  useEffect(() => {
    if (apiMensajesResponse && selectedConversation) {
      // API v1 retorna MessageListResponse con nueva estructura
      const mappedMessages = apiMensajesResponse.content.map(mapApiMessageToDomain)
      
      // Como vienen ordenados DESC (más reciente primero), invertimos para orden cronológico
      const sortedMessages = mappedMessages.reverse();
      
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: sortedMessages,
              lastMessage: sortedMessages[sortedMessages.length - 1]?.content || "Sin mensajes",
            }
          : null,
      )
    }
  }, [apiMensajesResponse, mapApiMessageToDomain]) // Remover selectedConversation de las dependencias para evitar el loop infinito

  // Función para manejar la carga de mensajes más antiguos
  const handleLoadOlderMessages = useCallback((olderMessages: Message[]) => {
    setSelectedConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...olderMessages, ...prev.messages], // Agregar al inicio
          }
        : null,
    )
  }, [])

  const handleRefreshMessages = useCallback(async () => {
    if (!selectedConversation) return

    try {
      // Obtener mensajes más recientes usando API v1
      const response = await apiService.getMessages(selectedConversation.id, 0, 20)

      if (response && response.content.length > 0) {
        const mappedMessages = response.content.map(mapApiMessageToDomain).reverse()
        
        setSelectedConversation((prev) => {
          if (!prev) return null

          // Comparar con los mensajes actuales para ver si hay nuevos
          const currentLastMessageId = prev.messages[prev.messages.length - 1]?.id
          const newLastMessageId = mappedMessages[mappedMessages.length - 1]?.id

          // Si hay nuevos mensajes, actualizar
          if (currentLastMessageId !== newLastMessageId) {
            // Encontrar mensajes que no están en la lista actual
            const currentMessageIds = new Set(prev.messages.map(m => m.id))
            const newMessages = mappedMessages.filter(m => !currentMessageIds.has(m.id))

            if (newMessages.length > 0) {
              // Hacer scroll automático solo si el usuario está cerca del final
              setTimeout(() => {
                chatViewRef.current?.scrollToBottom("smooth")
              }, 100)

              return {
                ...prev,
                messages: [...prev.messages, ...newMessages],
                lastMessage: mappedMessages[mappedMessages.length - 1]?.content || prev.lastMessage,
              }
            }
          }

          return prev
        })
      }
    } catch (error) {
      console.error("Error refreshing messages:", error)
      // No mostrar toast para evitar spam, solo log silencioso
    }
  }, [mapApiMessageToDomain, selectedConversation])

  const handleLogout = async () => {
    try {
      await apiService.logout()
      setIsAuthenticated(false)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Forzar logout local aunque falle la API
      localStorage.removeItem("chadbot_token")
      localStorage.removeItem("chadbot_user")
      setIsAuthenticated(false)
      router.push("/login")
    }
  }

  const handleSendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      if (!selectedConversation || !user) return

      // Si hay attachments, enviar cada uno como mensaje multimedia
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const messageType = getMessageTypeFromFile(file);
          const newMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: content || file.name,
            sender: "agent" as const,
            senderId: user.id,
            senderName: user.name,
            timestamp: new Date(),
            status: "sent" as const,
            type: messageType,
            file: {
              id: Date.now().toString(),
              filename: file.name,
              fileUrl: URL.createObjectURL(file),
              mimeType: file.type,
              sizeBytes: file.size,
            },
          }

          try {
            // Crear el mensaje localmente primero para UX inmediata
            setSelectedConversation((prev) =>
              prev
                ? {
                    ...prev,
                    messages: [...prev.messages, newMessage],
                    lastMessage: content || file.name,
                  }
                : null,
            )

            // Enviar a la API
            await apiService.sendMessage({
              conversationId: selectedConversation.id,
              type: messageType,
              text: content,
              file: file,
              caption: content,
            })

          } catch (error) {
            console.error("Error sending file message:", error)
            // Revertir el mensaje optimista en caso de error
            setSelectedConversation((prev) =>
              prev
                ? {
                    ...prev,
                    messages: prev.messages.filter((msg) => msg.id !== newMessage.id),
                  }
                : null,
            )
          }
        }
      } else if (content.trim()) {
        // Enviar mensaje de texto normal
        const newMessage = {
          id: Date.now().toString(),
          content,
          sender: "agent" as const,
          senderId: user.id,
          senderName: user.name,
          timestamp: new Date(),
          status: "sent" as const,
          type: "text" as const,
        }

        try {
          // Crear el mensaje localmente primero para UX inmediata
          setSelectedConversation((prev) =>
            prev
              ? {
                  ...prev,
                  messages: [...prev.messages, newMessage],
                    lastMessage: content || file.name,
                }
              : null,
          )

          // Enviar a la API
          await apiService.sendMessage({
            conversationId: selectedConversation.id,
            type: "text",
            text: content,
          })

        } catch (error) {
          console.error("Error sending text message:", error)
          // Revertir el mensaje optimista en caso de error
          setSelectedConversation((prev) =>
            prev
              ? {
                ...prev,
                messages: prev.messages.filter((msg) => msg.id !== newMessage.id),
              }
              : null,
          )
        }
      }

      // Refrescar mensajes después de enviar y hacer scroll
      setTimeout(() => {
        refetchMessages()
        // Hacer scroll al final después de enviar el mensaje
        setTimeout(() => {
          chatViewRef.current?.scrollToBottom("smooth")
        }, 200)
      }, 1000)
    },
    [selectedConversation, user, refetchMessages],
  )

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
    // Forzar refresco de mensajes incluso si es la misma conversación
    setMessagesRefreshKey(prev => prev + 1)
  }, [])

  const handleCloseChat = useCallback(() => {
    setSelectedConversation(null)
  }, [])

  const handleConversationUpdate = useCallback((updatedConversation: Conversation) => {
    // Actualizar la conversación seleccionada
    setSelectedConversation(updatedConversation)
    
    // Actualizar también en la lista de conversaciones
    setConversations(prev => 
      prev.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    )
  }, [])

  const handleUserClick = useCallback((contactId: string) => {
    setSelectedContactId(contactId)
    setContactInfoModalOpen(true)
  }, [])

  const handleContactUpdate = useCallback((updatedContact: any) => {
    // Actualizar el contacto en la conversación seleccionada
    if (selectedConversation && selectedConversation.customer.id === updatedContact.id) {
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              customer: {
                ...prev.customer,
                name: updatedContact.name,
                email: updatedContact.email || "",
              },
            }
          : null
      )
    }

    // Actualizar también en la lista de conversaciones
    setConversations((prev) =>
      prev.map((conv) =>
        conv.customer.id === updatedContact.id
          ? {
              ...conv,
              customer: {
                ...conv.customer,
                name: updatedContact.name,
                email: updatedContact.email || "",
              },
            }
          : conv
      )
    )
  }, [selectedConversation])

  const handleChannelChange = useCallback((channel: string) => {
    // Cerrar conversación actual al cambiar de canal
    setSelectedConversation(null)
    // Limpiar lista de conversaciones actual
    setConversations([])
    // Resetear paginación
    setCurrentPage(0)
    setSelectedChannel(channel)
  }, [])

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background max-w-full">
      <EnvironmentIndicator />

      <Sidebar 
        user={user} 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 min-w-0 overflow-hidden">
        {currentView === "dashboard" && (
          <HomeDashboard 
            conversationsCount={conversations.length}
            onSelectConversation={handleSelectConversation}
            onViewChange={setCurrentView as any}
          />
        )}

        {currentView === "welcome" && (
          <HomeDashboard 
            conversationsCount={conversations.length}
            onSelectConversation={handleSelectConversation}
            onViewChange={setCurrentView as any}
          />
        )}

        {currentView === "conversations" && (
          <div className="flex-1 flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-900 relative pt-16 md:pt-0">
            {/* Conversation List - Hide on mobile when chat is open */}
            <div className={cn(
              "h-full transition-all duration-300",
              isMobile ? (selectedConversation ? "hidden" : "w-full") : "flex-shrink-0"
            )}>
              <ConversationList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                onUserClick={handleUserClick}
                loading={conversationsLoading}
                error={conversationsError}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>

            {/* Right panel - Chat View - Show only when conversation selected */}
            {selectedConversation && (
              <div className={cn(
                "flex flex-col h-full overflow-hidden",
                isMobile ? "w-full absolute inset-0 z-10 bg-white dark:bg-slate-900" : "flex-1"
              )}>
                <ChatView
                  ref={chatViewRef}
                  conversation={selectedConversation}
                  onSendMessage={handleSendMessage}
                  onUserClick={handleUserClick}
                  loading={messagesLoading}
                  error={messagesError}
                  onConversationUpdate={handleConversationUpdate}
                  onCloseChat={handleCloseChat}
                  onLoadOlderMessages={handleLoadOlderMessages}
                  onRefreshMessages={handleRefreshMessages}
                  initialPaginationInfo={null}
                  refreshKey={messagesRefreshKey}
                  currentUser={user}
                />
              </div>
            )}
            
            {/* Desktop placeholder - only show on desktop when no conversation selected */}
            {!isMobile && !selectedConversation && (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Selecciona una conversación</h3>
                  <p className="text-slate-600 dark:text-slate-400">Elige una conversación de la lista para comenzar a chatear</p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === "users" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
            <UserManagement />
          </div>
        )}

        {currentView === "contacts" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
            <ContactManagement />
          </div>
        )}

        {currentView === "teams" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
            <TeamManagement />
          </div>
        )}

        {currentView === "assistants" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
            <AssistantManagement />
          </div>
        )}

        {currentView === "tags" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
            <TagManagement />
          </div>
        )}

        {currentView === "settings" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
            <SettingsView />
          </div>
        )}

        {selectedUserId && <UserProfile userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
        
        {contactInfoModalOpen && selectedContactId && (
          <ContactInfoModal
            isOpen={contactInfoModalOpen}
            onClose={() => {
              setContactInfoModalOpen(false)
              setSelectedContactId(null)
            }}
            contactId={selectedContactId}
            onContactUpdate={handleContactUpdate}
          />
        )}
      </div>
    </div>
  )
}
