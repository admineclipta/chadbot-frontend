"use client"

import { useState } from "react"
import { Tabs, Tab, Card, CardBody } from "@heroui/react"
import { User, Palette, MessageSquare, Key } from "lucide-react"
import AboutMeSection from "@/components/settings/about-me-section"
import AppearanceSection from "@/components/settings/appearance-section"
import MessagesSection from "@/components/settings/messages-section"
import CredentialsSection from "@/components/settings/credentials-section"

interface SettingsViewProps {
  autoRefreshInterval?: number
  onAutoRefreshIntervalChange?: (interval: number) => void
}

export default function SettingsView({
  autoRefreshInterval,
  onAutoRefreshIntervalChange,
}: SettingsViewProps) {
  const [selectedTab, setSelectedTab] = useState<string>("about")

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-divider bg-white dark:bg-slate-800 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-xs md:text-sm text-default-500 mt-1">
          Administra tu perfil, preferencias y credenciales de servicios
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
        <div className="max-w-6xl mx-auto w-full">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            variant="underlined"
            classNames={{
              tabList: "gap-4 md:gap-6 w-full relative rounded-none p-0 border-b border-divider overflow-x-auto",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-0 h-12 flex-shrink-0",
              tabContent: "group-data-[selected=true]:text-primary text-sm md:text-base",
              panel: "w-full"
            }}
          >
            <Tab
              key="about"
              title={
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Sobre Mi</span>
                </div>
              }
            >
              <AboutMeSection />
            </Tab>

            <Tab
              key="appearance"
              title={
                <div className="flex items-center space-x-2">
                  <Palette className="h-4 w-4" />
                  <span>Apariencia</span>
                </div>
              }
            >
              <AppearanceSection />
            </Tab>

            <Tab
              key="messages"
              title={
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Mensajes</span>
                </div>
              }
            >
              <MessagesSection
                autoRefreshInterval={autoRefreshInterval}
                onAutoRefreshIntervalChange={onAutoRefreshIntervalChange}
              />
            </Tab>

            <Tab
              key="credentials"
              title={
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Credenciales</span>
                </div>
              }
            >
              <CredentialsSection />
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
