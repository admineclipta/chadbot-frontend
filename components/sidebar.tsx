"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Badge,
  Divider,
  Spinner,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  MessageCircle,
  Archive,
  LogOut,
  ChevronDown,
  Send,
  Settings,
  Users,
  Bot,
} from "lucide-react";
import type { User } from "@/lib/types";
import type { ActiveChannelResponseDto } from "@/lib/api-types";
import { apiService } from "@/lib/api";
import UserAvatar from "./user-avatar";
import BulkMessageModal from "./bulk-message-modal";
import SettingsModal from "./settings-modal";
import NewChatModal from "./new-chat-modal";

interface SidebarProps {
  user: User;
  currentView:
    | "welcome"
    | "conversations"
    | "profile"
    | "users"
    | "assistants";
  onViewChange: (
    view:
      | "welcome"
      | "conversations"
      | "profile"
      | "users"
      | "assistants"
  ) => void;
  onLogout: () => void;
  autoRefreshInterval?: number;
  onAutoRefreshIntervalChange?: (interval: number) => void;
  selectedChannel?: string;
  onChannelChange?: (channel: string) => void;
}

export default function Sidebar({
  user,
  currentView,
  onViewChange,
  onLogout,
  autoRefreshInterval,
  onAutoRefreshIntervalChange,
  selectedChannel,
  onChannelChange,
}: SidebarProps) {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [activeChannels, setActiveChannels] = useState<ActiveChannelResponseDto[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Cargar canales activos al montar
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoadingChannels(true);
        const channels = await apiService.getActiveChannels();
        const enabledChannels = channels.filter(ch => ch.hasCredentials);
        setActiveChannels(enabledChannels);
        
        // Si no hay canal seleccionado y hay canales disponibles, seleccionar el primero
        if (!selectedChannel && enabledChannels.length > 0 && onChannelChange) {
          onChannelChange(enabledChannels[0].serviceType);
        }
      } catch (error) {
        console.error("Error loading channels:", error);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, []);

  // Configuración UI de canales - Componente de ícono
  const ChannelIcon = ({ serviceType }: { serviceType: string }) => {
    console.log("ChannelIcon serviceType:", serviceType); // Debug
    const type = serviceType?.toUpperCase();
    
    if (type?.includes("WHATSAPP")) {
      return <Image src="/WhatsApp.png" alt="WhatsApp" width={20} height={20} />;
    }
    if (type?.includes("TELEGRAM")) {
      return <Image src="/Telegram_2019_Logo.png" alt="Telegram" width={20} height={20} />;
    }
    return <MessageCircle className="h-5 w-5" />;
  };

  const menuItems = [
    {
      key: "conversations",
      label: "Conversaciones",
      icon: MessageCircle,
      count: 0,
    },
  ];

  const adminMenuItems = [
    {
      key: "admin-users",
      label: "Usuarios",
      icon: Users,
      count: 0,
    },
    {
      key: "admin-assistants",
      label: "Asistentes",
      icon: Bot,
      count: 0,
    },
  ];

  return (
    <>
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <Image src="/logo-chadbot-violeta.png" alt="Chadbot" width={120} height={40} className="object-contain" />
          </div>
        </div>

        {/* Message Actions Dropdown */}
        <div className="p-4">
          <Dropdown>
            <DropdownTrigger>
              <Button
                color="primary"
                variant="flat"
                fullWidth
                startContent={<Send className="h-4 w-4" />}
                endContent={<ChevronDown className="h-4 w-4" />}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
              >
                Nuevo
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Opciones de mensajes">
              <DropdownItem
                key="new-chat"
                startContent={<MessageCircle className="h-4 w-4" />}
                onPress={() => setIsNewChatModalOpen(true)}
              >
                Nuevo Chat
              </DropdownItem>
              <DropdownItem
                key="bulk-message"
                startContent={<Users className="h-4 w-4" />}
                onPress={() => setIsBulkModalOpen(true)}
              >
                Mensaje Masivo
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        <Divider />

        {/* Canales Section */}
        <div className="p-4">
          {loadingChannels ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : activeChannels.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
              No hay canales configurados
            </p>
          ) : (
            <Select
              label="Canal"
              placeholder="Seleccionar canal"
              selectedKeys={selectedChannel ? [selectedChannel] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                if (selected && onChannelChange) {
                  onChannelChange(selected);
                }
              }}
              size="sm"
              variant="bordered"
              className="max-w-full"
              endContent={selectedChannel ? <ChannelIcon serviceType={selectedChannel} /> : null}
            >
              {activeChannels.map((channel) => (
                <SelectItem
                  key={channel.serviceType}
                  value={channel.serviceType}
                  textValue={channel.displayName}
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon serviceType={channel.serviceType} />
                    <span>{channel.displayName}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          )}
        </div>

        <Divider />

        {/* Navigation */}
        <div className="flex-1 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Conversaciones
            </h2>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.key;

              return (
                <Button
                  key={item.key}
                  variant={isActive ? "flat" : "light"}
                  color={isActive ? "primary" : "default"}
                  fullWidth
                  className={`justify-start h-12 ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onPress={() => onViewChange(item.key as any)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <Badge
                        color={isActive ? "primary" : "default"}
                        size="sm"
                        variant="flat"
                      >
                        {item.count}
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}

            {/* Sección de Administración - Solo para admins */}
            {user.role === "admin" && (
              <>
                <Divider className="my-4" />
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Administración
                </h2>

                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    (item.key === "admin-users" && currentView === "users") ||
                    (item.key === "admin-assistants" && currentView === "assistants") ||
                    currentView === item.key;

                  return (
                    <Button
                      key={item.key}
                      variant={isActive ? "flat" : "light"}
                      color={isActive ? "primary" : "default"}
                      fullWidth
                      className={`justify-start h-12 ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onPress={() =>
                        onViewChange(
                          item.key === "admin-users"
                            ? "users"
                            : item.key === "admin-assistants"
                            ? "assistants"
                            : (item.key as any)
                        )
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {item.count > 0 && (
                          <Badge
                            color={isActive ? "primary" : "default"}
                            size="sm"
                            variant="flat"
                          >
                            {item.count}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Dropdown placement="top-start">
            <DropdownTrigger>
              <Button
                variant="light"
                className="w-full justify-start h-auto p-3 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3 w-full">
                  <UserAvatar
                    name={user.name}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="settings"
                startContent={<Settings className="h-4 w-4" />}
                onPress={() => setIsSettingsModalOpen(true)}
              >
                Configuración
              </DropdownItem>
              <DropdownItem
                key="logout"
                color="danger"
                startContent={<LogOut className="h-4 w-4" />}
                onPress={onLogout}
              >
                Cerrar Sesión
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <BulkMessageModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        autoRefreshInterval={autoRefreshInterval}
        onAutoRefreshIntervalChange={onAutoRefreshIntervalChange}
      />
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </>
  );
}
