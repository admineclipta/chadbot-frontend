"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button, addToast } from "@heroui/react"
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
import type {
  ConversationAssignedRealtimeEvent,
  ConversationStatus,
  MessagingServiceType,
  ConversationSortField,
  SortDirection,
  Message as ApiMessage,
  MessageCreatedRealtimeEvent,
  SseConnectionState,
  UserNotificationRealtimeEvent,
  CreateOutboundConversationResponse,
} from "@/lib/api-types"
import { apiService } from "@/lib/api"
import { clearAuthSession } from "@/lib/auth-session"
import { DEBOUNCE_SEARCH_MS } from "@/lib/config"
import { useApi } from "@/hooks/use-api"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { cn, parseApiTimestamp } from "@/lib/utils"
import { useMessagesRealtimeSse } from "@/hooks/use-messages-realtime-sse"
import { useNotificationsSse } from "@/hooks/use-notifications-sse"
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat"
import {
  getOrCreatePresenceSessionId,
  rotatePresenceSessionId,
} from "@/lib/presence"

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

const PRESENCE_AUTH_TOKEN_KEY = "chadbot_presence_auth_token"

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
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [presenceSessionId, setPresenceSessionId] = useState<string | null>(null)
  const [sseReconnectKey, setSseReconnectKey] = useState<number>(0)
  const [sseFailureSince, setSseFailureSince] = useState<number | null>(null)
  const [isFallbackActive, setIsFallbackActive] = useState(false)
  const [isSseReconnectRequested, setIsSseReconnectRequested] = useState(false)
  const shownAssignmentToastIdsRef = useRef<Set<string>>(new Set())
  const shownGenericToastIdsRef = useRef<Set<string>>(new Set())
  const openedConversationFromQueryRef = useRef<Set<string>>(new Set())
  const inboxRefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inboxDirtyRef = useRef(false)
  const [selectedRepresentativeFilter, setSelectedRepresentativeFilter] = useState<"all" | "mine" | number>("all") // Filtro por representante
  const [availableRepresentatives, setAvailableRepresentatives] = useState<Array<{id: number, name: string}>>([]) // Lista de representantes disponibles
  
  // Estados para paginación (0-indexed)
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [totalElements, setTotalElements] = useState<number>(0)
  const [hasMoreConversations, setHasMoreConversations] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [messagesPage, setMessagesPage] = useState<number>(0)
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState<boolean>(false)

  // Estados para filtros nuevos (Fase 2 - mejorados)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ConversationStatus | "all">("INTERVENED")
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

  const handleLoadMoreConversations = useCallback(() => {
    if (conversations.length === 0) return
    if (loadingMore || conversationsLoading || !hasMoreConversations) return
    setLoadingMore(true)
    setCurrentPage((prev) => prev + 1)
  }, [conversations.length, conversationsLoading, hasMoreConversations, loadingMore])

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
    setConversations([])
    setCurrentPage(0)
    setHasMoreConversations(true)
    setLoadingMore(false)
  }, [])

  // Resetear a página 0 cuando cambian los filtros
  useEffect(() => {
    setConversations([])
    setCurrentPage(0)
    setHasMoreConversations(true)
    setLoadingMore(false)
  }, [searchTerm, selectedChannel, selectedStatusFilter, selectedTeam, selectedAgent, selectedTags, sortBy, sortDirection])

  // Al abrir la vista de conversaciones, la bandeja por defecto es "Intervenida"
  useEffect(() => {
    if (currentView !== "conversations") return
    setSelectedStatusFilter("INTERVENED")
    setConversations([])
    setCurrentPage(0)
    setHasMoreConversations(true)
    setLoadingMore(false)
    setSelectedConversation(null)
  }, [currentView])

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
    [selectedConversation?.id],
  )

  useEffect(() => {
    setMessagesPage(0)
    setHasMoreMessages(false)
    setLoadingOlderMessages(false)
  }, [selectedConversation?.id])

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
      fileUrl = msg.file.storageUri || msg.file.fileUrl || null
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
        && msg.file
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

  const mapMessageCreatedSseToDomainMessage = useCallback(
    (event: MessageCreatedRealtimeEvent): Message => {
      const rawType = String(event.message?.type || event.type || "").toLowerCase()
      const normalizedType: Message["type"] =
        rawType === "text" ||
        rawType === "image" ||
        rawType === "video" ||
        rawType === "audio" ||
        rawType === "document" ||
        rawType === "sticker"
          ? (rawType as Message["type"])
          : "text"

      const senderType = String(
        event.message?.senderType || event.senderType || "",
      ).toUpperCase()
      const sender: Message["sender"] =
        senderType === "AGENT"
          ? "agent"
          : senderType === "BOT"
            ? "bot"
            : "client"

      const content =
        typeof (event.message?.content ?? event.content) === "string"
          ? ({ text: event.message?.content ?? event.content } as Record<string, unknown>)
          : (((event.message?.content ?? event.content) || {}) as Record<string, unknown>)
      const text =
        (typeof content.text === "string" ? content.text : "") ||
        (typeof content.caption === "string" ? content.caption : "") ||
        ""

      return {
        id: event.message?.messageId || event.messageId || crypto.randomUUID(),
        content: text,
        sender,
        senderName: sender === "client" ? "Cliente" : sender === "bot" ? "Bot" : "Agente",
        timestamp: parseApiTimestamp(event.message?.sentAt || event.sentAt || event.timestamp),
        type: normalizedType,
        status: "delivered",
      }
    },
    [parseApiTimestamp],
  )

  const refreshSelectedConversationMessages = useCallback(
    async (conversationId: string, mode: "replace" | "merge" = "replace") => {
      try {
        const response = await apiService.getMessages(conversationId, 0, 20)
        const mappedMessages = response.content.map(mapApiMessageToDomain).reverse()

        setSelectedConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev

          const nextMessages =
            mode === "replace"
              ? mappedMessages
              : [...prev.messages, ...mappedMessages.filter((m) => !prev.messages.some((pm) => pm.id === m.id))]

          return {
            ...prev,
            messages: nextMessages,
            lastMessage: nextMessages[nextMessages.length - 1]?.content || prev.lastMessage,
          }
        })
        setMessagesPage(response.page)
        setHasMoreMessages(!response.last)
      } catch (error) {
        console.error("[SSE] Failed re-syncing selected conversation messages", error)
      }
    },
    [mapApiMessageToDomain],
  )

  const markConversationAsReadLocally = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv,
      ),
    )

    setSelectedConversation((prev) =>
      prev && prev.id === conversationId
        ? { ...prev, unreadCount: 0 }
        : prev,
    )
  }, [])

  const openConversationById = useCallback(
    async (conversationId: string) => {
      setCurrentView("conversations")

      const existing = conversations.find((conv) => conv.id === conversationId)
      if (existing) {
        setSelectedConversation({ ...existing, unreadCount: 0 })
        markConversationAsReadLocally(conversationId)
        return
      }

      try {
        const fetchedConversation = await apiService.getConversationById(conversationId)
        const fetchedConversationMarkedAsRead = {
          ...fetchedConversation,
          unreadCount: 0,
        }
        setConversations((prev) => {
          const withoutTarget = prev.filter((conv) => conv.id !== fetchedConversation.id)
          const next = [fetchedConversationMarkedAsRead, ...withoutTarget]
          next.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
          return next
        })
        setSelectedConversation(fetchedConversationMarkedAsRead)
      } catch (error) {
        console.error("[SSE] Failed opening conversation from notification", error)
        addToast({
          title: "No se pudo abrir la conversación",
          severity: "danger",
        })
      }
    },
    [conversations, markConversationAsReadLocally],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isAuthenticated) return

    const url = new URL(window.location.href)
    const conversationId = url.searchParams.get("openConversationId")
    if (!conversationId) return
    if (openedConversationFromQueryRef.current.has(conversationId)) return

    openedConversationFromQueryRef.current.add(conversationId)
    void openConversationById(conversationId)

    url.searchParams.delete("openConversationId")
    const cleanUrl = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, "", cleanUrl)
  }, [isAuthenticated, openConversationById])

  const playNotificationSound = useCallback(async () => {
    if (typeof window === "undefined") return

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const context = new AudioContextClass()
      if (context.state === "suspended") {
        await context.resume()
      }
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)
      oscillator.onended = () => {
        void context.close()
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Notifications] Could not play sound", error)
      }
    }
  }, [])

  const notifyBrowser = useCallback(
    (title: string, body: string, conversationId?: string) => {
      if (typeof window === "undefined") return

      const notificationsEnabled =
        localStorage.getItem("chadbot_notifications") === "true"
      if (!notificationsEnabled) return

      if (!("Notification" in window)) return

      // Mostrar notificación nativa principalmente cuando la app no está en foco.
      if (document.visibilityState === "visible" && document.hasFocus()) return

      void playNotificationSound()

      if (Notification.permission === "granted") {
        const notification = new Notification(title, { body, tag: conversationId })
        notification.onclick = () => {
          window.focus()
          if (conversationId) {
            void openConversationById(conversationId)
          }
          notification.close()
        }
        return
      }
    },
    [openConversationById, playNotificationSound],
  )

  useEffect(() => {
    const token = localStorage.getItem("chadbot_token")
    const userData = localStorage.getItem("chadbot_user")

    if (token && userData) {
      const lastPresenceAuthToken = sessionStorage.getItem(PRESENCE_AUTH_TOKEN_KEY)
      const nextPresenceSessionId =
        lastPresenceAuthToken && lastPresenceAuthToken !== token
          ? rotatePresenceSessionId()
          : getOrCreatePresenceSessionId()

      sessionStorage.setItem(PRESENCE_AUTH_TOKEN_KEY, token)
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
      apiService.setToken(token)
      setAuthToken(token)
      setPresenceSessionId(nextPresenceSessionId)
    } else {
      sessionStorage.removeItem(PRESENCE_AUTH_TOKEN_KEY)
      setPresenceSessionId(null)
      router.push("/login")
    }
  }, [router])

  const {
    permissionState: pushPermissionState,
    isSupported: pushSupported,
    isSecureContext: pushSecureContext,
    isSubscribed: pushSubscribed,
    isBusy: pushBusy,
    error: pushError,
    enablePushNotifications,
    disablePushNotifications,
  } = usePushNotifications({
    enabled: isAuthenticated,
    token: authToken,
  })

  const scheduleInboxRefetch = useCallback(() => {
    if (inboxRefetchTimeoutRef.current) {
      clearTimeout(inboxRefetchTimeoutRef.current)
      inboxRefetchTimeoutRef.current = null
    }

    inboxRefetchTimeoutRef.current = setTimeout(() => {
      void refetchConversations()
    }, 700)
  }, [refetchConversations])

  useEffect(() => {
    if (currentView !== "conversations") return
    if (!inboxDirtyRef.current) return

    inboxDirtyRef.current = false
    void refetchConversations()
  }, [currentView, refetchConversations])

  useEffect(() => {
    return () => {
      if (inboxRefetchTimeoutRef.current) {
        clearTimeout(inboxRefetchTimeoutRef.current)
        inboxRefetchTimeoutRef.current = null
      }
    }
  }, [])

  const handleMessageCreatedSse = useCallback(
    (event: MessageCreatedRealtimeEvent) => {
      const incomingMessage = mapMessageCreatedSseToDomainMessage(event)
      const conversationExistsInLocalPage = conversations.some(
        (conv) => conv.id === event.conversationId,
      )
      const activeConversationId = selectedConversation?.id
      const isForActiveConversation = activeConversationId === event.conversationId
      const isAppInForeground =
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      const normalizedSenderType = String(
        event.message?.senderType || event.senderType || "",
      ).toUpperCase()
      const isContactMessage = normalizedSenderType === "CONTACT"
      const eventLastMessagePreview =
        event.conversation?.lastMessagePreview || event.lastMessagePreview
      const shouldSuppressNotification = isForActiveConversation && isAppInForeground && isContactMessage
      const lastActivityAt = parseApiTimestamp(
        event.conversation?.lastMessageAt ||
          event.lastMessageAt ||
          event.message?.sentAt ||
          event.sentAt ||
          event.timestamp,
      )

      setConversations((prev) => {
        const targetIndex = prev.findIndex((conv) => conv.id === event.conversationId)
        if (targetIndex === -1) return prev

        const targetConversation = prev[targetIndex]
        const updatedConversation: Conversation = {
          ...targetConversation,
          lastMessage:
            eventLastMessagePreview ||
            incomingMessage.content ||
            targetConversation.lastMessage,
          lastActivity: lastActivityAt,
          unreadCount:
            !isContactMessage
              ? targetConversation.unreadCount || 0
              : shouldSuppressNotification
                ? 0
                : (targetConversation.unreadCount || 0) + 1,
        }

        const next = prev.map((conv) =>
          conv.id === event.conversationId ? updatedConversation : conv,
        )
        next.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        return next
      })

      if (!conversationExistsInLocalPage) {
        if (currentView === "conversations" || selectedConversation?.id) {
          scheduleInboxRefetch()
        } else {
          inboxDirtyRef.current = true
        }
      }

      setSelectedConversation((prev) => {
        if (!prev || prev.id !== event.conversationId) return prev
        if (prev.messages.some((msg) => msg.id === incomingMessage.id)) return prev

        return {
          ...prev,
          messages: [...prev.messages, incomingMessage],
          lastMessage:
            eventLastMessagePreview ||
            incomingMessage.content ||
            prev.lastMessage,
          lastActivity: lastActivityAt,
          unreadCount:
            isContactMessage && shouldSuppressNotification
              ? 0
              : prev.unreadCount,
        }
      })

      const shouldAutoscroll = chatViewRef.current?.isNearBottom() ?? true
      if (shouldAutoscroll) {
        setTimeout(() => {
          chatViewRef.current?.scrollToBottom("smooth")
        }, 50)
      }
    },
    [
      currentView,
      conversations,
      mapMessageCreatedSseToDomainMessage,
      parseApiTimestamp,
      scheduleInboxRefetch,
      selectedConversation?.id,
    ],
  )

  const sseEnabled = isAuthenticated && !!authToken

  usePresenceHeartbeat({
    enabled: sseEnabled,
    token: authToken,
    presenceSessionId,
  })

  const handleConversationAssignedSse = useCallback(
    (event: ConversationAssignedRealtimeEvent) => {
      const toastKey = `${event.conversationId}:${event.timestamp}`
      if (shownAssignmentToastIdsRef.current.has(toastKey)) return
      shownAssignmentToastIdsRef.current.add(toastKey)

      refetchConversations()

      addToast({
        title: "Se te asignó una nueva conversación",
        description:
          event.assignmentSource === "AUTO"
            ? "Asignación automática recibida"
            : "Asignación manual recibida",
        severity: "success",
        endContent: (
          <Button
            size="sm"
            variant="light"
            color="primary"
            onPress={() => {
              void openConversationById(event.conversationId)
            }}
          >
            Abrir
          </Button>
        ),
      })
      notifyBrowser(
        "Nueva conversación asignada",
        event.assignmentSource === "AUTO"
          ? "Asignación automática recibida"
          : "Asignación manual recibida",
        event.conversationId,
      )
    },
    [notifyBrowser, openConversationById, refetchConversations],
  )

  const handleNotificationSse = useCallback(
    (event: UserNotificationRealtimeEvent) => {
      const rawType = String(event.type || event.eventType || "").toUpperCase()
      const conversationId =
        (typeof event.conversationId === "string" && event.conversationId) ||
        (typeof event.entityId === "string" && event.entityId) ||
        ""

      if (!rawType || !conversationId) return

      if (rawType === "NEW_MESSAGE") {
        const toastKey = `NEW_MESSAGE:${conversationId}:${event.timestamp || "no-ts"}`
        if (shownGenericToastIdsRef.current.has(toastKey)) return
        shownGenericToastIdsRef.current.add(toastKey)

        addToast({
          title: event.title || "Nuevo mensaje",
          description: event.message || "Tienes un nuevo mensaje en una conversación",
          severity: "primary",
          endContent: (
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={() => {
                void openConversationById(conversationId)
              }}
            >
              Abrir
            </Button>
          ),
        })
        notifyBrowser(
          event.title || "Nuevo mensaje",
          event.message || "Tienes un nuevo mensaje en una conversación",
          conversationId,
        )
        return
      }

      if (rawType === "CONVERSATION_ASSIGNED") {
        const assignmentEvent: ConversationAssignedRealtimeEvent = {
          eventType: "CONVERSATION_ASSIGNED",
          clientId: "",
          agentId: "",
          conversationId,
          assignmentSource:
            event.assignmentSource === "AUTO" ? "AUTO" : "MANUAL",
          timestamp:
            typeof event.timestamp === "string"
              ? event.timestamp
              : new Date().toISOString(),
        }
        handleConversationAssignedSse(assignmentEvent)
      }
    },
    [
      handleConversationAssignedSse,
      openConversationById,
      notifyBrowser,
    ],
  )

  const {
    connectionState: rawMessagesSseConnectionState,
    lastHeartbeatAt: sseLastHeartbeatAt,
  } = useMessagesRealtimeSse({
    enabled: sseEnabled,
    token: authToken,
    presenceSessionId,
    reconnectKey: sseReconnectKey,
    onMessageCreated: handleMessageCreatedSse,
  })

  useNotificationsSse({
    enabled: sseEnabled,
    token: authToken,
    presenceSessionId,
    reconnectKey: sseReconnectKey,
    onConversationAssigned: handleConversationAssignedSse,
    onNotification: handleNotificationSse,
  })

  const sseConnectionState: SseConnectionState =
    isFallbackActive && rawMessagesSseConnectionState !== "connected"
      ? "degraded"
      : rawMessagesSseConnectionState

  const handleManualSseReconnect = useCallback(() => {
    setIsSseReconnectRequested(true)
    setSseReconnectKey((prev) => prev + 1)
    setTimeout(() => {
      setIsSseReconnectRequested(false)
    }, 1200)
  }, [])

  const previousSseStateRef = useRef<SseConnectionState>("connecting")
  const fallbackActivationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const previousState = previousSseStateRef.current

    if (previousState !== rawMessagesSseConnectionState) {
      console.info(
        `[SSE] Connection state changed: ${previousState} -> ${rawMessagesSseConnectionState}`,
      )
      previousSseStateRef.current = rawMessagesSseConnectionState
    }

    if (rawMessagesSseConnectionState === "connected") {
      setSseFailureSince(null)
      setIsFallbackActive(false)

      if (previousState !== "connected") {
        refetchConversations()
        if (selectedConversation?.id) {
          refreshSelectedConversationMessages(selectedConversation.id, "replace")
        }
      }
      return
    }

    if (
      rawMessagesSseConnectionState === "error" ||
      rawMessagesSseConnectionState === "degraded"
    ) {
      setSseFailureSince((prev) => prev ?? Date.now())
    }
  }, [
    rawMessagesSseConnectionState,
    refetchConversations,
    refreshSelectedConversationMessages,
    selectedConversation?.id,
  ])

  useEffect(() => {
    if (fallbackActivationTimeoutRef.current) {
      clearTimeout(fallbackActivationTimeoutRef.current)
      fallbackActivationTimeoutRef.current = null
    }

    if (
      !sseEnabled ||
      !(rawMessagesSseConnectionState === "error" || rawMessagesSseConnectionState === "degraded") ||
      sseFailureSince === null
    ) {
      return
    }

    const elapsed = Date.now() - sseFailureSince
    const remaining = 30000 - elapsed

    if (remaining <= 0) {
      setIsFallbackActive(true)
      return
    }

    fallbackActivationTimeoutRef.current = setTimeout(() => {
      setIsFallbackActive(true)
    }, remaining)

    return () => {
      if (fallbackActivationTimeoutRef.current) {
        clearTimeout(fallbackActivationTimeoutRef.current)
        fallbackActivationTimeoutRef.current = null
      }
    }
  }, [rawMessagesSseConnectionState, sseEnabled, sseFailureSince])

  useEffect(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current)
      fallbackIntervalRef.current = null
    }

    if (!isFallbackActive || !sseEnabled || currentView !== "conversations") {
      return
    }

    const runFallbackSync = () => {
      console.warn("[SSE] Running fallback REST sync")
      refetchConversations()
      if (selectedConversation?.id) {
        refreshSelectedConversationMessages(selectedConversation.id, "replace")
      }
    }

    runFallbackSync()
    fallbackIntervalRef.current = setInterval(runFallbackSync, 15000)

    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
    }
  }, [
    currentView,
    isFallbackActive,
    refetchConversations,
    refreshSelectedConversationMessages,
    selectedConversation?.id,
    sseEnabled,
  ])

  // Actualizar conversaciones cuando lleguen de la API
  useEffect(() => {
    if (apiConversaciones) {
      // API v1 con mapper automatico - ya viene en formato domain
      setConversations((prev) => {
        if (apiConversaciones.page === 0) {
          return apiConversaciones.content
        }

        const merged = [...prev, ...apiConversaciones.content]
        const deduped = new Map<string, Conversation>()
        merged.forEach((conv) => {
          deduped.set(conv.id, conv)
        })

        return Array.from(deduped.values())
      })

      // Actualizar informacion de paginacion
      setTotalPages(apiConversaciones.totalPages)
      setTotalElements(apiConversaciones.totalElements)
      setHasMoreConversations(apiConversaciones.page < apiConversaciones.totalPages - 1)
      setLoadingMore(false)
    }
  }, [apiConversaciones])

  useEffect(() => {
    if (conversationsError) {
      setLoadingMore(false)
    }
  }, [conversationsError])

  // Actualizar mensajes cuando lleguen de la API
  useEffect(() => {
    if (apiMensajesResponse && selectedConversation) {
      // API v1 retorna MessageListResponse con nueva estructura
      const mappedMessages = apiMensajesResponse.content.map(mapApiMessageToDomain)

      // Como vienen ordenados DESC (mas reciente primero), invertimos para orden cronologico
      const sortedMessages = mappedMessages.reverse()

      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: sortedMessages,
              lastMessage: sortedMessages[sortedMessages.length - 1]?.content || "Sin mensajes",
            }
          : null,
      )
      setMessagesPage(apiMensajesResponse.page)
      setHasMoreMessages(!apiMensajesResponse.last)
      setLoadingOlderMessages(false)
    }
  }, [apiMensajesResponse, mapApiMessageToDomain, selectedConversation?.id])

  const handleLoadOlderMessages = useCallback(async (): Promise<number> => {
    if (!selectedConversation || loadingOlderMessages || !hasMoreMessages) {
      return 0
    }

    const nextPage = messagesPage + 1

    try {
      setLoadingOlderMessages(true)
      const response = await apiService.getMessages(
        selectedConversation.id,
        nextPage,
        20,
      )
      const olderMessages = response.content.map(mapApiMessageToDomain).reverse()
      let added = 0

      setSelectedConversation((prev) => {
        if (!prev || prev.id !== selectedConversation.id) return prev

        const existingIds = new Set(prev.messages.map((msg) => msg.id))
        const uniqueOlder = olderMessages.filter((msg) => !existingIds.has(msg.id))
        added = uniqueOlder.length

        return {
          ...prev,
          messages: [...uniqueOlder, ...prev.messages],
        }
      })

      setMessagesPage(response.page)
      setHasMoreMessages(!response.last)
      return added
    } catch (error) {
      console.error("Error loading older messages:", error)
      return 0
    } finally {
      setLoadingOlderMessages(false)
    }
  }, [hasMoreMessages, loadingOlderMessages, mapApiMessageToDomain, messagesPage, selectedConversation])

  const handleRefreshMessages = useCallback(async () => {
    if (!selectedConversation) return
    await refreshSelectedConversationMessages(selectedConversation.id, "replace")
  }, [refreshSelectedConversationMessages, selectedConversation])

  const handleLogout = async () => {
    const nextPresenceSessionId = rotatePresenceSessionId()
    sessionStorage.removeItem(PRESENCE_AUTH_TOKEN_KEY)
    try {
      await apiService.logout()
      setIsAuthenticated(false)
      setAuthToken(null)
      setPresenceSessionId(nextPresenceSessionId)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Forzar logout local aunque falle la API
      clearAuthSession()
      setIsAuthenticated(false)
      setAuthToken(null)
      setPresenceSessionId(nextPresenceSessionId)
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
                  lastMessage: content,
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
    setSelectedConversation({ ...conversation, unreadCount: 0 })
    markConversationAsReadLocally(conversation.id)
  }, [markConversationAsReadLocally])

  const handleOutboundConversationCreated = useCallback(
    async (result: CreateOutboundConversationResponse) => {
      addToast({
        title: result.reusedConversation
          ? "Conversación reutilizada"
          : "Conversación creada",
        description: result.reusedConversation
          ? "Se reutilizó una conversación existente y se envió el primer mensaje."
          : "Se creó una nueva conversación y se envió el primer mensaje.",
        severity: "success",
      })

      try {
        await refetchConversations()
      } catch (error) {
        console.error("Error refreshing conversations after outbound create:", error)
      }

      await openConversationById(result.conversationId)
    },
    [openConversationById, refetchConversations],
  )

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
    setHasMoreConversations(true)
    setLoadingMore(false)
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
                onConversationCreated={handleOutboundConversationCreated}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedStatusFilter={selectedStatusFilter}
                onStatusFilterChange={setSelectedStatusFilter}
                onUserClick={handleUserClick}
                loading={conversationsLoading && currentPage === 0}
                error={conversationsError}
                hasMore={hasMoreConversations}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMoreConversations}
                sseConnectionState={sseConnectionState}
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
                  hasMoreMessages={hasMoreMessages}
                  loadingOlderMessages={loadingOlderMessages}
                  onRefreshMessages={handleRefreshMessages}
                  initialPaginationInfo={null}
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
            <SettingsView
              sseState={sseConnectionState}
              sseLastHeartbeatAt={sseLastHeartbeatAt}
              onSseReconnect={handleManualSseReconnect}
              isSseReconnecting={isSseReconnectRequested}
              pushPermissionState={pushPermissionState}
              pushSupported={pushSupported}
              pushSecureContext={pushSecureContext}
              pushSubscribed={pushSubscribed}
              pushBusy={pushBusy}
              pushError={pushError}
              onEnablePush={() => {
                void enablePushNotifications()
              }}
              onDisablePush={() => {
                void disablePushNotifications()
              }}
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

