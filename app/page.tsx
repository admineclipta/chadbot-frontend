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
import type { Conversation, User, Message, Tag } from "@/lib/types"
import type { ConversationStatus, MessagingServiceType, ConversationSortField, SortDirection } from "@/lib/api-types"
import { mapApiConversacionToConversation, mapApiConversacionesResponseToConversation, mapApiMensajeToMessage } from "@/lib/types"
import { apiService } from "@/lib/api"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { useApi } from "@/hooks/use-api"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export default function Home() {
  const router = useRouter()
  const chatViewRef = useRef<ChatViewRef>(null)
  const isMobile = useIsMobile()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState<"welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "tags" | "settings">("welcome")
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
          conversationId: selectedConversation.id,
          content: content,
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

  const handleCloseChat = useCallback(() => {
    if (isMobile) {
      setSelectedConversation(null)
    }
  }, [isMobile])

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
        {currentView === "welcome" && (
          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto p-4 md:p-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Bienvenido a Chadbot 👋
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Tu plataforma de automatización de ventas con IA
                </p>
                {conversationsError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-red-700 dark:text-red-300 text-sm">Error al cargar conversaciones: {conversationsError}</p>
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Conversaciones Activas */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 text-xs font-semibold rounded-lg">
                      +12%
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {conversations.filter(c => c.status === 'ACTIVE').length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Conversaciones Activas</div>
                </div>

                {/* Conversaciones Intervenidas */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 text-xs font-semibold rounded-lg">
                      -5%
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {conversations.filter(c => c.status === 'INTERVENED').length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Intervenidas</div>
                </div>

                {/* Total Conversaciones */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-semibold rounded-lg">
                      +8%
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {conversations.length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total de Hoy</div>
                </div>

                {/* Tiempo Promedio */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-200 text-xs font-semibold rounded-lg">
                      -15%
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">2.5m</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Tiempo de Respuesta</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setCurrentView("conversations")}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">Nueva Conversación</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Iniciar un chat</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setCurrentView("contacts")}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Agregar Contacto</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Nuevo cliente</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setCurrentView("assistants")}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400">Configurar IA</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Asistentes</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Actividad Reciente</h2>
                  <button 
                    onClick={() => setCurrentView("conversations")}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
                  >
                    Ver todas →
                  </button>
                </div>
                <div className="space-y-3">
                  {conversations.slice(0, 5).length > 0 ? (
                    conversations.slice(0, 5).map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedConversation(conv)
                          setCurrentView("conversations")
                        }}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-semibold shadow-md group-hover:scale-110 transition-transform">
                          {(conv.customer?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {conv.customer?.name || conv.customer?.phone || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {conv.lastMessage || 'Sin mensajes'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {conv.status === 'ACTIVE' ? (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-1"></span>
                              Activa
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-800">
                              Intervenida
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>No hay conversaciones recientes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "conversations" && (
          <div className="flex-1 flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
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
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto">
            <UserManagement />
          </div>
        )}

        {currentView === "contacts" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto">
            <ContactManagement />
          </div>
        )}

        {currentView === "teams" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto">
            <TeamManagement />
          </div>
        )}

        {currentView === "assistants" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto">
            <AssistantManagement />
          </div>
        )}

        {currentView === "tags" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto">
            <TagManagement />
          </div>
        )}

        {currentView === "settings" && (
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-x-hidden overflow-y-auto">
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
