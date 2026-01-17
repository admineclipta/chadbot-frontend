"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Users, Contact, Bot, Settings, Send, Search, Filter, ChevronDown, Plus, TrendingUp, Clock, CheckCheck, Sparkles } from "lucide-react"
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

export default function HomeRestyled() {
  const router = useRouter()
  const chatViewRef = useRef<ChatViewRef>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState<"welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "settings">("welcome")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10)
  const [messagesRefreshKey, setMessagesRefreshKey] = useState<number>(0)
  const [selectedRepresentativeFilter, setSelectedRepresentativeFilter] = useState<"all" | "mine" | number>("all")
  const [availableRepresentatives, setAvailableRepresentatives] = useState<Array<{id: number, name: string}>>([])
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [totalElements, setTotalElements] = useState<number>(0)
  const [hasMoreConversations, setHasMoreConversations] = useState<boolean>(false)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)

  // Estados para filtros
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

  // Verificar autenticación
  useEffect(() => {
    const token = localStorage.getItem("chadbot_token")
    if (!token) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)
  }, [router])

  // Cargar usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await apiService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error("Error loading user:", error)
      }
    }

    if (isAuthenticated) {
      fetchUser()
    }
  }, [isAuthenticated])

  // WELCOME VIEW - Vista principal mejorada con cards
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (currentView === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-lg">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transition-transform hover:scale-110 duration-300">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">Chadbot</div>
                <div className="text-xs text-slate-500">Sales Automation</div>
              </div>
            </div>
          </div>

          {/* Usuario */}
          {user && (
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-md">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Nuevo Button */}
          <div className="p-4">
            <button 
              onClick={() => setCurrentView("conversations")}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Ver Conversaciones
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">
              Navegación
            </div>
            
            {[
              { id: 'conversations', label: 'Conversaciones', icon: MessageCircle, badge: conversations.length },
              { id: 'contacts', label: 'Contactos', icon: Contact },
              { id: 'users', label: 'Usuarios', icon: Users },
              { id: 'teams', label: 'Equipos', icon: Users },
              { id: 'assistants', label: 'Asistentes', icon: Bot },
              { id: 'settings', label: 'Configuración', icon: Settings },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
                    <span className="group-hover:text-slate-900">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 text-center">
              Chadbot v2.0 • {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Bienvenido a Chadbot 👋
              </h1>
              <p className="text-lg text-slate-600">
                Tu plataforma de automatización de ventas con IA
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Conversaciones Activas */}
              <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                    +12%
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {conversations.filter(c => c.status === 'ACTIVE').length}
                </div>
                <div className="text-sm text-slate-600">Conversaciones Activas</div>
              </div>

              {/* Conversaciones Intervenidas */}
              <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6 text-amber-600" />
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
                    -5%
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {conversations.filter(c => c.status === 'INTERVENED').length}
                </div>
                <div className="text-sm text-slate-600">Intervenidas</div>
              </div>

              {/* Total Conversaciones */}
              <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                    +8%
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {conversations.length}
                </div>
                <div className="text-sm text-slate-600">Total de Hoy</div>
              </div>

              {/* Tiempo Promedio */}
              <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-6 h-6 text-violet-600" />
                  </div>
                  <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg">
                    -15%
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">2.5m</div>
                <div className="text-sm text-slate-600">Tiempo de Respuesta</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setCurrentView("conversations")}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600">Nueva Conversación</div>
                    <div className="text-xs text-slate-500">Iniciar un chat</div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentView("contacts")}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Contact className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-600">Agregar Contacto</div>
                    <div className="text-xs text-slate-500">Nuevo cliente</div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentView("assistants")}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-violet-500 hover:bg-violet-50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 group-hover:text-violet-600">Configurar IA</div>
                    <div className="text-xs text-slate-500">Asistentes</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Actividad Reciente</h2>
                <button 
                  onClick={() => setCurrentView("conversations")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Ver todas →
                </button>
              </div>
              <div className="space-y-3">
                {conversations.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      setCurrentView("conversations")
                    }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-semibold shadow-md group-hover:scale-110 transition-transform">
                      {conv.contact?.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {conv.contact?.name || conv.contact?.phone || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {conv.lastMessage?.content || 'Sin mensajes'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conv.status === 'ACTIVE' ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200">
                          Intervenida
                        </span>
                      )}
                      <CheckCheck className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <EnvironmentIndicator />
      </div>
    )
  }

  // El resto de las vistas seguirían usando los componentes existentes por ahora
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          user={user}
          conversationsCount={conversations.length}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === "conversations" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Aquí iría la vista de conversaciones mejorada */}
              <div className="w-96 border-r border-slate-200 bg-white">
                <ConversationList
                  conversations={conversations}
                  selectedConversation={selectedConversation}
                  onSelectConversation={setSelectedConversation}
                  loading={false}
                />
              </div>
              {selectedConversation && (
                <div className="flex-1">
                  <ChatView
                    ref={chatViewRef}
                    conversation={selectedConversation}
                    onSendMessage={() => {}}
                    onUserClick={setSelectedUserId}
                  />
                </div>
              )}
            </div>
          )}
          
          {currentView === "profile" && user && (
            <UserProfile user={user} onBack={() => setCurrentView("welcome")} />
          )}
          
          {currentView === "users" && (
            <UserManagement />
          )}
          
          {currentView === "contacts" && (
            <ContactManagement />
          )}
          
          {currentView === "teams" && (
            <TeamManagement />
          )}
          
          {currentView === "assistants" && (
            <AssistantManagement />
          )}
          
          {currentView === "settings" && (
            <SettingsView />
          )}
        </div>
      </div>
      
      <EnvironmentIndicator />
      
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
