"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectItem, Kbd } from "@heroui/react"
import Sidebar from "@/components/sidebar"
import ConversationList from "@/components/conversation-list"
import ConversationFilters from "@/components/conversation-filters"
import ChatView, { type ChatViewRef } from "@/components/chat-view"
import UserProfile from "@/components/user-profile"
import UserManagement from "@/components/user-management"
import ContactManagement from "@/components/contact-management"
import TeamManagement from "@/components/team-management"
import AssistantManagement from "@/components/assistant-management"
import SettingsView from "@/components/settings-view"
import EnvironmentIndicator from "@/components/environment-indicator"
import ContactInfoModal from "@/components/contact-info-modal"
import type { Conversation, User, Message, Tag } from "@/lib/types"
import type { ConversationStatus, MessagingServiceType, ConversationSortField, SortDirection } from "@/lib/api-types"
import { mapApiConversacionToConversation, mapApiConversacionesResponseToConversation, mapApiMensajeToMessage } from "@/lib/types"
import { apiService } from "@/lib/api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { useApi } from "@/hooks/use-api"

export default function Home() {
  const router = useRouter()
  const chatViewRef = useRef<ChatViewRef>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState<"welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "settings">("welcome")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10) // Intervalo por defecto de 10 segundos
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
  }, [searchTerm, selectedStatusFilter, selectedTeam, selectedAgent, selectedTags, sortBy, sortDirection])

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
    (signal) =>
      selectedConversation ? apiService.getMessages(selectedConversation.id, 0, 20, signal) : Promise.resolve(null),
    [selectedConversation?.id, messagesRefreshKey], // Incluir refreshKey para forzar refresco
  )

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
      // API v1 retorna ConversationListResponse con paginación
      const mappedConversations = apiConversaciones.content.map(conv => ({
        id: conv.id,
        customer: conv.contact ? {
          id: conv.contact.contactId || conv.contact.id,
          name: conv.contact.fullName || "Cliente",
          email: conv.contact.email || "",
          phone: conv.contact.metadata?.phone || conv.contact.phone || "",
          avatar: "https://cdn-icons-png.flaticon.com/512/6596/6596121.png",
        } : {
          id: conv.contactId,
          name: "Cliente",
          email: "",
          phone: "",
          avatar: "https://cdn-icons-png.flaticon.com/512/6596/6596121.png",
        },
        messages: [],
        lastMessage: "",
        lastActivity: conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
        status: conv.status?.toUpperCase() as any || "ACTIVE",
        unreadCount: 0,
        tags: conv.tags || [],
        integration: conv.contact?.messagingChannel?.serviceTypeName?.toLowerCase().replace(/\s/g, '') || "whatsapp" as const,
        archived: conv.status?.toLowerCase() === "closed",
        id_representante: conv.agents?.[0]?.userId ? Number.parseInt(conv.agents[0].userId) : -1,
      }))
      
      setConversations(mappedConversations)
      
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
      const mappedMessages = apiMensajesResponse.content.map(msg => {
        // Determinar el contenido del mensaje
        const messageContent = msg.content?.text || msg.content?.caption || "";
        
        // Determinar el tipo de sender
        let senderType: "client" | "agent" | "bot" = "client";
        if (msg.sender.type === "agent") {
          senderType = "agent";
        } else if (msg.sender.type === "bot") {
          senderType = "bot";
        }

        // Construir URL del archivo si existe
        let mediaUrl: string | undefined;
        if (msg.file && msg.file.status === "available") {
          // Construir URL desde storageUri (ajustar según tu configuración)
          mediaUrl = `/api/files/${msg.file.id}`;
        }

        return {
          id: msg.id,
          content: messageContent,
          sender: senderType,
          timestamp: new Date(msg.createdAt),
          attachments: mediaUrl ? [{
            id: msg.file!.id,
            name: msg.file!.metadata?.filename || "Media",
            type: msg.type,
            url: mediaUrl,
          }] : undefined,
        };
      });
      
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
  }, [apiMensajesResponse]) // Remover selectedConversation de las dependencias para evitar el loop infinito

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

  // Función para manejar el cambio del intervalo de auto-refresh
  const handleAutoRefreshIntervalChange = useCallback((newInterval: number) => {
    setAutoRefreshInterval(newInterval)
    // Guardar en localStorage para persistir la configuración
    localStorage.setItem("chadbot_autoRefreshInterval", newInterval.toString())
  }, [])

  // Cargar configuración del intervalo desde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chadbot_autoRefreshInterval")
      if (saved) {
        const interval = parseInt(saved)
        if (interval >= 5 && interval <= 60) {
          setAutoRefreshInterval(interval)
        }
      }
    }
  }, [])
  const handleRefreshMessages = useCallback(async () => {
    if (!selectedConversation) return

    try {
      // Obtener mensajes más recientes usando API v1
      const response = await apiService.getMessages(selectedConversation.id, 0, 20)

      if (response && response.content.length > 0) {
        const mappedMessages = response.content.map(msg => {
          const messageContent = msg.content?.text || msg.content?.caption || "";
          let senderType: "client" | "agent" | "bot" = "client";
          if (msg.sender.type === "agent") {
            senderType = "agent";
          } else if (msg.sender.type === "bot") {
            senderType = "bot";
          }

          let mediaUrl: string | undefined;
          if (msg.file && msg.file.status === "available") {
            mediaUrl = `/api/files/${msg.file.id}`;
          }

          return {
            id: msg.id,
            content: messageContent,
            sender: senderType,
            timestamp: new Date(msg.createdAt),
            attachments: mediaUrl ? [{
              id: msg.file!.id,
              name: msg.file!.metadata?.filename || "Media",
              type: msg.type,
              url: mediaUrl,
            }] : undefined,
          };
        }).reverse(); // Invertir porque vienen DESC
        
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
  }, [selectedConversation])

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

      const newMessage = {
        id: Date.now().toString(),
        content,
        sender: "agent" as const,
        timestamp: new Date(),
        attachments: attachments?.map((file) => ({
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          url: URL.createObjectURL(file),
        })),
      }

      try {
        // Crear el mensaje localmente primero para UX inmediata
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, newMessage],
                lastMessage: content,
              }
            : null,
        )

        // Enviar a la API
        await apiService.sendMessage({
          numero_telefono: selectedConversation.customer.phone || "",
          conversacion_id: selectedConversation.id,
          mensaje: content,
          tipo_remitente: "Representante", // o el tipo apropiado
        })

        // Refrescar mensajes después de enviar y hacer scroll
        setTimeout(() => {
          refetchMessages()
          // Hacer scroll al final después de enviar el mensaje
          setTimeout(() => {
            chatViewRef.current?.scrollToBottom("smooth")
          }, 200)
        }, 1000)
      } catch (error) {
        console.error("Error sending message:", error)
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
    },
    [selectedConversation, user, refetchMessages],
  )

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
    // Forzar refresco de mensajes incluso si es la misma conversación
    setMessagesRefreshKey(prev => prev + 1)
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

  const handleCloseChat = useCallback(() => {
    setSelectedConversation(null)
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
    <div className="flex h-screen overflow-hidden bg-background">
      <EnvironmentIndicator />

      <Sidebar 
        user={user} 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout} 
        autoRefreshInterval={autoRefreshInterval}
        onAutoRefreshIntervalChange={handleAutoRefreshIntervalChange}
        selectedChannel={selectedChannel}
        onChannelChange={handleChannelChange}
      />

      <div className="flex-1 flex">
        {currentView === "welcome" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">Bienvenido a Chadbot</h2>
              <p className="text-default-500">Selecciona una navegación para comenzar</p>
              {conversationsError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">Error al cargar conversaciones: {conversationsError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === "conversations" && (
          <>
            <div className="flex flex-col h-full">
              {/* Componente de filtros */}
              <div className="p-3">
                <ConversationFilters
                  searchTerm={searchTerm}
                  selectedStatus={selectedStatusFilter}
                  selectedTeam={selectedTeam}
                  selectedAgent={selectedAgent}
                  selectedTags={selectedTags}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSearchChange={setSearchTerm}
                  onStatusChange={setSelectedStatusFilter}
                  onTeamChange={setSelectedTeam}
                  onAgentChange={setSelectedAgent}
                  onTagsChange={setSelectedTags}
                  onSortByChange={setSortBy}
                  onSortDirectionChange={setSortDirection}
                  onClearFilters={handleClearFilters}
                />
              </div>

              {/* Lista de conversaciones con paginación */}
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

            {selectedConversation ? (
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
                autoRefreshInterval={autoRefreshInterval}
                onAutoRefreshIntervalChange={handleAutoRefreshIntervalChange}
                initialPaginationInfo={null}
                refreshKey={messagesRefreshKey}
                currentUser={user}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center border-l border-divider">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Selecciona una conversación</h3>
                  <p className="text-default-500">Elige una conversación para comenzar a chatear</p>
                </div>
              </div>
            )}
          </>
        )}

        {currentView === "users" && (
          <div className="flex-1">
            <UserManagement />
          </div>
        )}

        {currentView === "contacts" && (
          <div className="flex-1">
            <ContactManagement />
          </div>
        )}

        {currentView === "teams" && (
          <div className="flex-1">
            <TeamManagement />
          </div>
        )}

        {currentView === "assistants" && (
          <div className="flex-1">
            <AssistantManagement />
          </div>
        )}

        {currentView === "settings" && (
          <div className="flex-1">
            <SettingsView 
              autoRefreshInterval={autoRefreshInterval}
              onAutoRefreshIntervalChange={handleAutoRefreshIntervalChange}
            />
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
