"use client"

import { useState } from "react"
import { Accordion, AccordionItem } from "@heroui/react"
import { MessageSquare, Bot } from "lucide-react"
import MessagingCredentialsPanel from "./messaging-credentials-panel"
import AiCredentialsPanel from "./ai-credentials-panel"

export default function CredentialsSection() {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(["messaging"]))

  return (
    <div className="py-6">
      <Accordion
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
        variant="splitted"
      >
        <AccordionItem
          key="messaging"
          aria-label="Mensajería"
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Mensajería</p>
                <p className="text-sm text-default-500">WhatsApp, Telegram y otros servicios</p>
              </div>
            </div>
          }
        >
          <MessagingCredentialsPanel />
        </AccordionItem>

        <AccordionItem
          key="ai"
          aria-label="Inteligencia Artificial"
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                <Bot className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold">Inteligencia Artificial</p>
                <p className="text-sm text-default-500">OpenAI, Azure AI y otros modelos</p>
              </div>
            </div>
          }
        >
          <AiCredentialsPanel />
        </AccordionItem>
      </Accordion>
    </div>
  )
}
