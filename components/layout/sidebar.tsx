"use client"

import { useState } from "react"
import Image from "next/image"
import { MessageCircle, Users, Contact, Bot, Settings, Send, LogOut, ChevronDown, Menu, Tag } from "lucide-react"
import { Button as HeroButton, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react"
import UserAvatar from "@/components/management/user-avatar"
import type { User } from "@/lib/types"
import BulkMessageModal from "@/components/modals/bulk-message-modal"
import SettingsModal from "@/components/modals/settings-modal"
import NewChatModal from "@/components/modals/new-chat-modal"

interface SidebarProps {
  user: User | null
  currentView: "welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "tags" | "settings"
  onViewChange: (view: "welcome" | "conversations" | "profile" | "users" | "contacts" | "teams" | "assistants" | "tags" | "settings") => void
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

  const renderMenuItem = (item: {
    id: string
    label: string
    icon: typeof MessageCircle
    badge?: number
  }) => {
    const Icon = item.icon
    const isActive = currentView === item.id
    const baseClasses = "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200"
    const activeClasses = "bg-gradient-to-r from-blue-600 to-violet-700 text-white shadow-lg scale-[1.02]"
    const inactiveClasses = "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"

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
          <Icon className={`w-5 h-5 ${isActive ? "" : "group-hover:text-blue-600 dark:group-hover:text-blue-400"} transition-colors`} />
          <span className={isActive ? "" : "group-hover:text-slate-900 dark:group-hover:text-slate-100"}>{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive ? "bg-white/20 text-white" : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"}`}>
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem("chadbot_token")
    if (onLogout) {
      onLogout()
    } else {
      window.location.href = "/login"
    }
  }

  const menuSections = [
    {
      title: "Mensajeria",
      items: [
        { id: "conversations", label: "Conversaciones", icon: MessageCircle, badge: conversationsCount, show: true },
        { id: "contacts", label: "Contactos", icon: Contact, show: true },
        { id: "tags", label: "Etiquetas", icon: Tag, show: true },
      ],
    },
    {
      title: "Automatizacion",
      items: [
        { id: "assistants", label: "Asistentes", icon: Bot, show: true },
      ],
    },
    {
      title: "Administracion",
      items: [
        { id: "users", label: "Usuarios", icon: Users, show: isAdmin },
        { id: "teams", label: "Equipos", icon: Users, show: isAdmin },
      ],
    },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
      >
        <Menu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-lg fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              onViewChange('welcome')
              setMobileMenuOpen(false)
            }}
            className="flex items-center justify-center gap-3 w-full hover:opacity-70 transition-opacity duration-200 cursor-pointer active:scale-[0.98]"
          >
            <Image src="/chadbot-isotipo.png" alt="Chadbot" width={40} height={40} className="object-contain" />
            <span className="text-2xl font-bold font-bricolage" style={{ color: '#4d00ff' }}>chadbot</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
          {menuSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.show)
            if (visibleItems.length === 0) return null

            return (
              <div key={section.title}>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 uppercase tracking-wider">
                  {section.title}
                </div>

                <div className="space-y-1">
                  {visibleItems.map(renderMenuItem)}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User Menu con HeroUI Dropdown */}
        {user && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <Dropdown placement="top-start">
              <DropdownTrigger>
                <HeroButton
                  variant="light"
                  className="w-full justify-start h-auto p-3 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3 w-full">
                    <UserAvatar
                      name={user.name || user.email || 'User'}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
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
