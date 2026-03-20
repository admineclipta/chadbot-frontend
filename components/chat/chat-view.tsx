"use client"

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback, useLayoutEffect } from "react"
import { Phone, MoreVertical, ArrowLeft, Bot, User, X, Sparkles, UserPlus, Send, Orbit, Tag as TagIcon, Info } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  Button as HeroButton,
  Tooltip,
  Tabs,
  Tab,
  Image as HeroImage
} from "@heroui/react"
import ConversationTagsModal from "@/components/modals/conversation-tags-modal"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import MessageStatusIcon from "./message-status-icon"
import MessageInput from "./message-input"
import ConversationNotes from "./conversation-notes"
import ChatViewSkeleton, { OlderMessagesSkeleton } from "./chat-view-skeleton"
import type { MessageInputRef } from "./message-input"
import type { ConversationNotesRef } from "./conversation-notes"
import AISummaryPanel from "@/components/shared/ai-summary-panel"
import MessageMarkdown from "@/components/shared/message-markdown"
import AssignConversationModal from "@/components/modals/assign-conversation-modal"
import ContactInfoModal from "@/components/modals/contact-info-modal"
import ConversationInfoModal from "@/components/modals/conversation-info-modal"
import { apiService, ApiError } from "@/lib/api"
import type { Conversation, Message } from "@/lib/types"
import type { ConversationStatus } from "@/lib/api-types"
import { formatMessageTime } from "@/lib/utils"
import { getChannelDisplayName, getChannelIcon } from "@/lib/messaging-channels"

function getFirstName(value?: string): string | null {
  if (!value) return null
  const parts = value.trim().split(/\s+/)
  return parts.length > 0 ? parts[0] : null
}

function getNonEmptyText(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function MediaError({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {label}
    </div>
  )
}

function MessageMedia({ message, isAccent }: { message: Message; isAccent: boolean }) {
  const [hasError, setHasError] = useState(false)
  const mediaType = message.type
  const fileUrl = (message.file as any)?.fileUrl || (message.file as any)?.url || null
  const fileStatus = message.file?.status
  const showError = hasError || fileStatus === "error" || !fileUrl
  if (mediaType === "audio") {
    console.log("[AUDIO] fileUrl:", fileUrl, message.file)
  }

  if (!mediaType || mediaType === "text") {
    return null
  }

  if (showError) {
    return <MediaError label="Archivo no disponible" />
  }

  if (mediaType === "image") {
    return (
      <HeroImage
        src={fileUrl}
        alt={message.file?.filename || "Imagen"}
        radius="lg"
        className="max-w-full rounded-xl object-cover"
        width={360}
        onError={() => setHasError(true)}
      />
    )
  }

  if (mediaType === "video") {
    return (
      <video
        controls
        className="max-w-full rounded-xl"
        onError={() => setHasError(true)}
        src={fileUrl}
      />
    )
  }

  if (mediaType === "audio") {
    return (
      <>
        <div className="w-full flex justify-center">
          <audio
            controls
            className="w-full md:w-[700px]"
            onError={() => setHasError(true)}
            src={fileUrl || undefined}
          >
            Tu navegador no soporta audio. <a href={fileUrl} target="_blank" rel="noopener">Abrir audio</a>
          </audio>
        </div>
        {hasError && (
          <MediaError label={`No se pudo cargar el audio (${fileUrl})`} />
        )}
        {!hasError && !fileUrl && (
          <MediaError label="Audio no disponible" />
        )}
        {!hasError && fileUrl && (
          <div className="text-xs mt-2">
            <a href={fileUrl} target="_blank" rel="noopener" className="underline text-blue-600">Abrir audio en nueva pestaña</a>
          </div>
        )}
      </>
    )
  }

  if (mediaType === "document") {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
          isAccent
            ? "bg-white/20 text-white"
            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        }`}
      >
        📄 {message.file?.filename || "Documento"}
      </a>
    )
  }

  if (mediaType === "sticker") {
    return (
      <HeroImage
        src={fileUrl}
        alt={message.file?.filename || "Sticker"}
        radius="lg"
        className="max-w-32 max-h-32 rounded-xl object-cover"
        width={128}
        onError={() => setHasError(true)}
      />
    )
  }

  return null
}

type UiConversationStatus = "active" | "intervened" | "closed" | "no_answer"

const STATUS_OPTIONS: Array<{ key: UiConversationStatus; label: string }> = [
  { key: "active", label: "Activa" },
  { key: "intervened", label: "Intervenida" },
  { key: "closed", label: "Cerrada" },
  { key: "no_answer", label: "Sin respuesta" },
]

function normalizeStatus(status: string): UiConversationStatus {
  const normalized = status.toLowerCase()
  if (normalized === "active") return "active"
  if (normalized === "intervened") return "intervened"
  if (normalized === "closed") return "closed"
  return "no_answer"
}

function toApiStatus(status: UiConversationStatus): ConversationStatus {
  return status as unknown as ConversationStatus
}

function toLegacyStatus(status: UiConversationStatus): ConversationStatus {
  switch (status) {
    case "active":
      return "ACTIVE" as ConversationStatus
    case "intervened":
      return "INTERVENED" as ConversationStatus
    case "closed":
      return "CLOSED" as ConversationStatus
    default:
      return "NO_ANSWER" as ConversationStatus
  }
}

interface ChatViewProps {
  conversation: Conversation
  onSendMessage: (content: string, attachments?: File[]) => void
  onUserClick: (userId: string) => void
  loading?: boolean
  error?: string | null
  onConversationUpdate?: (conversation: Conversation) => void
  onCloseChat?: () => void
  onLoadOlderMessages?: () => Promise<number>
  hasMoreMessages?: boolean
  loadingOlderMessages?: boolean
  onRefreshMessages?: () => void
  autoRefreshInterval?: number
  onAutoRefreshIntervalChange?: (interval: number) => void
  initialPaginationInfo?: { totalRecords: number; currentPage: number; pageSize: number } | null
  refreshKey?: number
  currentUser?: { id: string; [key: string]: any }
}

export interface ChatViewRef {
  scrollToBottom: (behavior?: "auto" | "smooth") => void
  isNearBottom: (thresholdPx?: number) => boolean
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
    hasMoreMessages = false,
    loadingOlderMessages = false,
    onRefreshMessages,
    currentUser,
  }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const tabContentInnerRef = useRef<HTMLDivElement>(null)
    const messageInputRef = useRef<MessageInputRef>(null)
    const conversationNotesRef = useRef<ConversationNotesRef>(null)
    const pendingScrollAdjustRef = useRef<{ prevScrollHeight: number; prevScrollTop: number } | null>(null)
    const loadingOlderRef = useRef(false)
    const prevConversationIdRef = useRef<string>(conversation.id)
    const prevMessageCountRef = useRef<number>(conversation.messages.length)
    const [showSummaryPanel, setShowSummaryPanel] = useState(false)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [tagsModalOpen, setTagsModalOpen] = useState(false)
    const [showContactInfoModal, setShowContactInfoModal] = useState(false)
    const [showConversationInfoModal, setShowConversationInfoModal] = useState(false)
    const [intervenirLoading, setIntervenirLoading] = useState(false)
    const [changingStatus, setChangingStatus] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("responder")
    const [tabContentHeight, setTabContentHeight] = useState<number>(220)
    const [originAdImageError, setOriginAdImageError] = useState(false)

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, [])

    useImperativeHandle(ref, () => ({
      scrollToBottom,
      isNearBottom: (thresholdPx: number = 180) => {
        const container = scrollContainerRef.current
        if (!container) return true
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight
        return distanceFromBottom <= thresholdPx
      },
    }))

    useEffect(() => {
      const conversationChanged = prevConversationIdRef.current !== conversation.id
      const previousCount = prevMessageCountRef.current
      const currentCount = conversation.messages.length
      const initialMessagesLoaded = previousCount === 0 && currentCount > 0

      if (
        (conversationChanged || initialMessagesLoaded) &&
        !pendingScrollAdjustRef.current
      ) {
        scrollToBottom("auto")
      }

      prevConversationIdRef.current = conversation.id
      prevMessageCountRef.current = currentCount
    }, [conversation.id, conversation.messages.length, scrollToBottom])

    const tryLoadOlderMessages = useCallback(async () => {
      if (
        !onLoadOlderMessages ||
        !hasMoreMessages ||
        loadingOlderMessages ||
        loadingOlderRef.current
      ) {
        return
      }

      const container = scrollContainerRef.current
      if (!container) return

      loadingOlderRef.current = true
      pendingScrollAdjustRef.current = {
        prevScrollHeight: container.scrollHeight,
        prevScrollTop: container.scrollTop,
      }

      try {
        const added = await onLoadOlderMessages()
        if (!added) {
          pendingScrollAdjustRef.current = null
        }
      } finally {
        loadingOlderRef.current = false
      }
    }, [hasMoreMessages, loadingOlderMessages, onLoadOlderMessages])

    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container || !onLoadOlderMessages) return

      const topThresholdPx = 80
      const handleScroll = () => {
        if (container.scrollTop <= topThresholdPx) {
          void tryLoadOlderMessages()
        }
      }

      container.addEventListener("scroll", handleScroll)
      return () => {
        container.removeEventListener("scroll", handleScroll)
      }
    }, [onLoadOlderMessages, tryLoadOlderMessages])

    useLayoutEffect(() => {
      const pending = pendingScrollAdjustRef.current
      const container = scrollContainerRef.current
      if (!pending || !container) return

      const heightDiff = container.scrollHeight - pending.prevScrollHeight
      container.scrollTop = pending.prevScrollTop + Math.max(heightDiff, 0)
      pendingScrollAdjustRef.current = null
    }, [conversation.messages.length])

    useEffect(() => {
      setActiveTab("responder")
    }, [conversation.id])

    useEffect(() => {
      setOriginAdImageError(false)
    }, [conversation.id, conversation.conversationOrigin?.adImageUrl])

    useLayoutEffect(() => {
      const updateHeight = () => {
        const el = tabContentInnerRef.current
        if (!el) return
        setTabContentHeight(el.scrollHeight)
      }

      updateHeight()
      const raf = window.requestAnimationFrame(updateHeight)

      const observer = new ResizeObserver(() => updateHeight())
      if (tabContentInnerRef.current) {
        observer.observe(tabContentInnerRef.current)
      }

      return () => {
        window.cancelAnimationFrame(raf)
        observer.disconnect()
      }
    }, [activeTab, conversation.id, conversation.messages.length, conversation.status])

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
    const normalizedStatus = normalizeStatus(conversation.status)
    const isActive = normalizedStatus === 'active'
    const canIntervene = normalizedStatus === 'active' && currentUser
    const canSendMessages = normalizedStatus !== 'closed'
    const conversationOrigin = conversation.conversationOrigin
    const shouldShowOriginAdMessage = Boolean(conversationOrigin) && !hasMoreMessages
    const hasConversationMessages = Boolean(conversation.messages?.length)
    const shouldShowEmptyState = !hasConversationMessages && !shouldShowOriginAdMessage
    const sourceUrl = getNonEmptyText(conversationOrigin?.sourceUrl)
    const adImageUrl = getNonEmptyText(conversationOrigin?.adImageUrl)
    const postText = getNonEmptyText(conversationOrigin?.postText)
    const originInfoEntries: Array<{ label: string; value: string }> = [
      { label: "Entry Point", value: getNonEmptyText(conversationOrigin?.entryPoint) || "" },
      { label: "Source App", value: getNonEmptyText(conversationOrigin?.sourceApp) || "" },
      { label: "Source Type", value: getNonEmptyText(conversationOrigin?.sourceType) || "" },
      { label: "Source ID", value: getNonEmptyText(conversationOrigin?.sourceId) || "" },
      { label: "Source URL", value: sourceUrl || "" },
      { label: "CTA", value: getNonEmptyText(conversationOrigin?.ctaText) || "" },
      { label: "Flow ID", value: getNonEmptyText(conversationOrigin?.flowId) || "" },
      { label: "CTWA CLID", value: getNonEmptyText(conversationOrigin?.ctwaClid) || "" },
    ].filter((item) => item.value)

    useEffect(() => {
      if (loading || error) return

      const rafId = window.requestAnimationFrame(() => {
        if (activeTab === "notas") {
          conversationNotesRef.current?.focus()
          return
        }

        if (canSendMessages && !canIntervene) {
          messageInputRef.current?.focus()
        }
      })

      return () => window.cancelAnimationFrame(rafId)
    }, [activeTab, conversation.id, loading, error, canSendMessages, canIntervene])

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
      const normalized = normalizeStatus(status)
      const option = STATUS_OPTIONS.find((item) => item.key === normalized)
      return option?.label || status
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
        await apiService.changeConversationStatus(conversation.id, { status: toApiStatus("intervened") })
        
        toast.success('Conversación intervenida exitosamente')
        
        // Actualizar el estado de la conversación
        if (onConversationUpdate) {
          onConversationUpdate({
            ...conversation,
            status: toLegacyStatus("intervened"),
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

    const handleSetTagsForConversation = async (conversationId: string, tagIds: string[]) => {
      try {
        await apiService.setConversationTags(conversationId, tagIds)
        toast.success("Etiquetas actualizadas")
        if (onConversationUpdate) {
          // Optionally inform parent to refresh conversation
          onConversationUpdate({ ...conversation, tags: (conversation.tags || []).filter(t => tagIds.includes(t.id)) })
        }
      } catch (err: any) {
        console.error(err)
        toast.error(err?.message || "Error actualizando etiquetas")
      }
    }

    const handleAddTagFromModal = async (label: string) => {
      try {
        const newTag = await apiService.createTag({ label, color: "#BDF26D", isPrivate: false })

        try {
          await apiService.setConversationTags(conversation.id, [newTag.id])
          toast.success("Etiquetas actualizadas")
          if (onConversationUpdate) {
            onConversationUpdate({ ...conversation, tags: (conversation.tags || []).concat(newTag) })
          }
        } catch (e: any) {
          // If conversation not found, swallow but still acknowledge tag creation
          if (e instanceof ApiError && e.status === 404) {
            console.warn('Conversation not found while assigning tag, tag created:', newTag)
            toast.success("Etiqueta creada")
            if (onConversationUpdate) {
              onConversationUpdate({ ...conversation, tags: (conversation.tags || []).concat(newTag) })
            }
          } else {
            throw e
          }
        }
      } catch (err: any) {
        console.error(err)
        toast.error(err?.message || "Error creando etiqueta")
      }
    }

    const handleRemoveTagFromModal = async (tagId: string) => {
      try {
        const remaining = (conversation.tags || []).filter(t => t.id !== tagId).map(t => t.id)
        await handleSetTagsForConversation(conversation.id, remaining)
      } catch (err: any) {
        console.error(err)
        toast.error(err?.message || "Error removiendo etiqueta")
      }
    }

    const handleAssignSuccess = () => {
      if (onRefreshMessages) {
        onRefreshMessages()
      }
      toast.success('Conversación asignada exitosamente')
    }

    const handleStatusChange = async (newStatus: UiConversationStatus) => {
      try {
        setChangingStatus(true)

        await apiService.changeConversationStatus(conversation.id, { status: toApiStatus(newStatus) })
        
        // Actualizar la conversación localmente
        const updatedConversation: Conversation = {
          ...conversation,
          status: toLegacyStatus(newStatus),
          archived: newStatus === "closed"
        }

        // Notificar al componente padre sobre el cambio
        if (onConversationUpdate) {
          onConversationUpdate(updatedConversation)
        }

        const statusLabel = STATUS_OPTIONS.find((option) => option.key === newStatus)?.label || newStatus
        toast.success(`Estado cambiado a "${statusLabel}" exitosamente`)
      } catch (error) {
        console.error("Error al cambiar estado:", error)
        toast.error("Error al cambiar el estado de la conversación")
      } finally {
        setChangingStatus(false)
      }
    }

    const isInitialMessagesLoading =
      Boolean(loading) && (!conversation.messages || conversation.messages.length === 0)

    if (isInitialMessagesLoading) {
      return <ChatViewSkeleton showBackButton={Boolean(onCloseChat)} />
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
                onClick={() => setShowConversationInfoModal(true)}
              >
                <Avatar
                  name={contactName}
                  size="lg"
                  gradient="mixed"
                  online={isActive}
                  className="flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowContactInfoModal(true)
                  }}
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
                {loading && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse hidden sm:inline">
                    Actualizando...
                  </span>
                )}
                {/* TODO: Botón de IA - Comentar por el momento */}
                {/*
                <button 
                  disabled
                  className="p-2 md:p-2.5 rounded-lg transition-colors hidden sm:flex opacity-50 cursor-not-allowed"
                  title="Resumen IA (próximamente)"
                  aria-disabled="true"
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                </button>
                */}

                {/* Selector de estado */}
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <span className="inline-flex">
                      <Tooltip content="Cambiar de estado" placement="bottom">
                        <button 
                          disabled={changingStatus}
                          className="p-2 md:p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Cambiar estado"
                        >
                          <Orbit className="w-4 h-4 md:w-5 md:h-5 text-slate-600 group-hover:text-blue-600" />
                        </button>
                      </Tooltip>
                    </span>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Estados de conversación">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownItem
                        key={status.key}
                        onPress={() => {
                          if (status.key !== normalizedStatus) {
                            handleStatusChange(status.key)
                          }
                        }}
                      >
                        {status.label}
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
                    <DropdownItem
                      key="tags"
                      startContent={<TagIcon className="w-4 h-4" />}
                      onPress={() => setTagsModalOpen(true)}
                    >
                      Etiquetas
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
            {loadingOlderMessages && (
              <OlderMessagesSkeleton />
            )}
            {shouldShowOriginAdMessage && conversationOrigin && (
              <div className="flex justify-start items-end gap-2">
                <Avatar
                  name="AD"
                  size="sm"
                  gradient="mixed"
                  className="flex-shrink-0"
                />

                <div className="w-full max-w-full md:max-w-[70%] flex flex-col items-start">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Publicidad</span>
                  </div>

                  <div className="rounded-2xl rounded-tl-sm px-3 py-3 md:px-4 md:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm w-full">
                    {adImageUrl ? (
                      sourceUrl ? (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/ad relative block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          title="Abrir origen de la publicidad"
                        >
                          {!originAdImageError ? (
                            <img
                              src={adImageUrl}
                              alt="Imagen de publicidad de origen"
                              className="w-full h-auto object-cover transition-transform duration-200 group-hover/ad:scale-[1.01]"
                              loading="lazy"
                              onError={() => setOriginAdImageError(true)}
                            />
                          ) : (
                            <div className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-8 text-sm text-slate-600 dark:text-slate-300 text-center">
                              No se pudo cargar la imagen de la publicidad.
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-slate-900/0 group-hover/ad:bg-slate-900/35 transition-colors flex items-end justify-center">
                            <span className="mb-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900 opacity-0 group-hover/ad:opacity-100 transition-opacity">
                              Abrir anuncio
                            </span>
                          </div>
                        </a>
                      ) : !originAdImageError ? (
                        <img
                          src={adImageUrl}
                          alt="Imagen de publicidad de origen"
                          className="w-full h-auto object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                          loading="lazy"
                          onError={() => setOriginAdImageError(true)}
                        />
                      ) : (
                        <div className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-8 text-sm text-slate-600 dark:text-slate-300 text-center">
                          No se pudo cargar la imagen de la publicidad.
                        </div>
                      )
                    ) : null}

                    {postText ? (
                      <div className="mt-3 text-slate-800 dark:text-slate-100">
                        <MessageMarkdown content={postText} />
                      </div>
                    ) : null}

                    {originInfoEntries.length > 0 ? (
                      <details className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200 select-none">
                          Más info
                        </summary>
                        <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          {originInfoEntries.map((item) => (
                            <p key={item.label} className="break-words">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}:</span>{" "}
                              {item.value}
                            </p>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            {hasConversationMessages ? (
              conversation.messages.map((message) => {
                const isSent = message.sender === 'agent' || message.sender === 'bot'
                const isBot = message.sender === 'bot'
                const isAgent = message.sender === 'agent'
                const senderFirstName = getFirstName(message.senderName)
                const senderLabel = message.senderName
                  ? isBot
                    ? message.senderName
                    : senderFirstName || message.senderName
                  : getSenderLabel(message.sender)
                
                return (
                  <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {/* Avatar izquierdo (cliente) */}
                    {!isSent && (
                      <Avatar
                        name={contactName}
                        size="sm"
                        gradient="blue"
                        className="flex-shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowContactInfoModal(true)
                        }}
                      />
                    )}

                    <div className={`w-full max-w-full md:max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender Label */}
                      <div className={`text-xs text-slate-500 dark:text-slate-400 mb-1 px-1 flex items-center gap-1`}>
                        {isBot && <Bot className="w-3 h-3" />}
                        {isAgent && <User className="w-3 h-3" />}
                        <span>{senderLabel}</span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-3 py-2 md:px-4 md:py-3 ${
                        isSent 
                          ? isBot
                            ? 'bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 rounded-tr-sm'
                            : 'bg-gradient-to-r from-blue-600 to-violet-700 text-white shadow-lg shadow-blue-500/20 rounded-tr-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-tl-sm'
                      }`}>
                        {message.type === "text" || !message.type ? (
                          <MessageMarkdown
                            content={message.content || ""}
                            accent={isSent && !isBot}
                          />
                        ) : (
                          <div className="space-y-2">
                            <MessageMedia message={message} isAccent={isSent && !isBot} />
                            {message.content ? (
                              <MessageMarkdown
                                content={message.content}
                                accent={isSent && !isBot}
                              />
                            ) : null}
                          </div>
                        )}

                        {(!message.type || message.type === "text") && message.attachments && message.attachments.length > 0 && (
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
                        <span>{formatMessageTime(message.timestamp)}</span>
                        {isSent && message.status && (
                          <MessageStatusIcon status={message.status} className="ml-1" />
                        )}
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
                            name={senderLabel || "Agente"}
                            size="sm"
                            gradient="emerald"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            ) : shouldShowEmptyState ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Send className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No hay mensajes en esta conversación</p>
                </div>
              </div>
            ) : null}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area with Tabs */}
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 relative flex-shrink-0">
            {/* Overlay para conversaciones no intervenidas */}
            {canIntervene && (
              <div 
                className="absolute inset-0 z-10 bg-gradient-to-b from-blue-50/95 to-violet-50/95 dark:from-slate-950/95 dark:to-slate-900/95 backdrop-blur-sm flex items-center justify-center cursor-pointer group hover:from-blue-50/90 hover:to-violet-50/90 dark:hover:from-slate-950/90 dark:hover:to-slate-900/90 transition-all"
                onClick={handleIntervenirConversacion}
              >
                <div className="flex items-center gap-4 px-6 max-w-lg">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6 text-blue-600 animate-pulse" />
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
            
            {/* Tabs Container */}
            <Tabs
              aria-label="Opciones de conversacion"
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
              <Tab key="responder" title="Responder" />
              <Tab key="notas" title="Notas del chat" />
            </Tabs>

            <div
              className="overflow-hidden transition-[height] duration-300 ease-out"
              style={{ height: `${tabContentHeight}px` }}
            >
              <div ref={tabContentInnerRef}>
                {activeTab === "notas" ? (
                  <ConversationNotes
                    ref={conversationNotesRef}
                    conversationId={conversation.id}
                    className="h-[300px] md:h-[400px]"
                  />
                ) : (
                  <MessageInput
                    ref={messageInputRef}
                    onSendMessage={onSendMessage}
                    disabled={!canSendMessages}
                    isBlurred={!!canIntervene}
                    messages={conversation.messages}
                    conversationId={conversation.id}
                    customerName={conversation.customer?.name || ""}
                    customerPhone={conversation.customer?.phone || ""}
                    onMessageSent={() => {
                      if (onRefreshMessages) {
                        onRefreshMessages()
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Conversation Tags Modal */}
          {tagsModalOpen && (
            <ConversationTagsModal
              tags={conversation.tags || []}
              isOpen={tagsModalOpen}
              onClose={() => setTagsModalOpen(false)}
              onAddTag={handleAddTagFromModal}
              onRemoveTag={handleRemoveTagFromModal}
              onSetTags={(tagIds: string[]) => handleSetTagsForConversation(conversation.id, tagIds)}
            />
          )}
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
        
        <ConversationInfoModal
          isOpen={showConversationInfoModal}
          onClose={() => setShowConversationInfoModal(false)}
          conversation={conversation}
        />
      </>
    )
  }
)

ChatView.displayName = "ChatView"

export default ChatView


