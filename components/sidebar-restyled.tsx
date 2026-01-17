"use client"

import { useState } from "react"
import Image from "next/image"
import { MessageCircle, Users, Contact, Bot, Settings, Send, LogOut, ChevronDown, Menu } from "lucide-react"
import { Button as HeroButton, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react"
import UserAvatar from "./user-avatar"
import type { User } from "@/lib/types"
import BulkMessageModal from "./bulk-message-modal"
import SettingsModal from "./settings-modal"
import NewChatModal from "./new-chat-modal"

interface SidebarProps {
  user: User | null
  currentView: "welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "settings"
  onViewChange: (view: "welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "settings") => void
  conversationsCount?: number
  onLogout?: () => void
}

// Helper para verificar si el usuario tiene permisos de admin
function hasAdminPermissions(user: User | null): boolean {
  if (!user) return false
  
  if (user.roles && Array.isArray(user.roles)) {
    const hasAdminRole = user.roles.some((role) => {
      const roleCode = role.code?.toLowerCase() || ''
      return roleCode.includes('admin') || roleCode === 'owner' || roleCode.includes('superadmin') || roleCode.includes('administrador')
    })
    if (hasAdminRole) return true
  }

  if (user.permissions && Array.isArray(user.permissions)) {
    const adminPermissions = ['manage_users', 'manage_client', 'view_users', 'manage_teams']
    const hasAdminPerm = user.permissions.some((perm) => adminPermissions.includes(perm.code))
    if (hasAdminPerm) return true
  }

  return false
}

export default function Sidebar({
  user,
  currentView,
  onViewChange,
  conversationsCount = 0,
  onLogout,
}: SidebarProps) {
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [newChatModalOpen, setNewChatModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const isAdmin = hasAdminPermissions(user)

  const handleLogout = () => {
    localStorage.removeItem("chadbot_token")
    if (onLogout) {
      onLogout()
    } else {
      window.location.href = "/login"
    }
  }

  const menuItems = [
    { id: 'conversations', label: 'Conversaciones', icon: MessageCircle, badge: conversationsCount, show: true },
    { id: 'contacts', label: 'Contactos', icon: Contact, show: true },
    { id: 'users', label: 'Usuarios', icon: Users, show: isAdmin },
    { id: 'teams', label: 'Equipos', icon: Users, show: isAdmin },
    { id: 'assistants', label: 'Asistentes', icon: Bot, show: true },
    { id: 'settings', label: 'Configuración', icon: Settings, show: true },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-white border-r border-slate-200 flex flex-col shadow-lg fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-center">
            <Image src="/logo-chadbot-violeta.png" alt="Chadbot" width={100} height={33} className="object-contain" />
          </div>
        </div>

        {/* Nuevo Button con Dropdown */}
        <div className="p-4 border-b border-slate-200">
          <Dropdown>
            <DropdownTrigger>
              <HeroButton
                color="default"
                variant="flat"
                fullWidth
                startContent={<Send className="h-4 w-4" />}
                endContent={<ChevronDown className="h-4 w-4" />}
                className="justify-between"
              >
                Nuevo
              </HeroButton>
            </DropdownTrigger>
            <DropdownMenu aria-label="Opciones de mensajes">
              <DropdownItem
                key="new-chat"
                startContent={<MessageCircle className="h-4 w-4" />}
                onPress={() => {
                  setNewChatModalOpen(true)
                  setMobileMenuOpen(false)
                }}
              >
                Nuevo Chat
              </DropdownItem>
              <DropdownItem
                key="bulk-message"
                startContent={<Users className="h-4 w-4" />}
                onPress={() => {
                  setBulkModalOpen(true)
                  setMobileMenuOpen(false)
                }}
              >
                Mensaje Masivo
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">
            Navegación
          </div>
          
          {menuItems.filter(item => item.show).map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            const baseClasses = "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200"
            const activeClasses = "bg-gradient-to-r from-blue-600 to-violet-700 text-white shadow-lg scale-[1.02]"
            const inactiveClasses = "text-slate-600 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]"
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as any)
                  setMobileMenuOpen(false)
                }}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} group`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-blue-600'} transition-colors`} />
                  <span className={isActive ? '' : 'group-hover:text-slate-900'}>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Menu con HeroUI Dropdown */}
        {user && (
          <div className="p-4 border-t border-slate-200">
            <Dropdown placement="top-start">
              <DropdownTrigger>
                <HeroButton
                  variant="light"
                  className="w-full justify-start h-auto p-3 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3 w-full">
                    <UserAvatar
                      name={user.name || user.email || 'User'}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-slate-900 truncate text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </div>
                </HeroButton>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem
                  key="settings"
                  startContent={<Settings className="h-4 w-4" />}
                  onPress={() => {
                    onViewChange("settings")
                    setMobileMenuOpen(false)
                  }}
                >
                  Configuración
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<LogOut className="h-4 w-4" />}
                  onPress={handleLogout}
                >
                  Cerrar Sesión
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>

      {/* Modals */}
      {bulkModalOpen && (
        <BulkMessageModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
        />
      )}

      {newChatModalOpen && (
        <NewChatModal
          isOpen={newChatModalOpen}
          onClose={() => setNewChatModalOpen(false)}
        />
      )}
    </>
  )
}
