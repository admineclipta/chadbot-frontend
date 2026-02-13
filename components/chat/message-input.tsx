"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button, Textarea, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Card, CardBody } from "@heroui/react"
import { SendIcon, PaperclipIcon, SmileIcon, BoldIcon, ItalicIcon, ListIcon, ImageIcon, FileIcon, MessageSquare, AlertTriangle, VideoIcon, MusicIcon } from "lucide-react"
import { isOutside24HourWindow } from "@/lib/utils"
import TemplateMessageModal from "@/components/modals/template-message-modal"
import type { Message } from "@/lib/types"

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void
  disabled?: boolean
  isBlurred?: boolean
  messages?: Message[]
  conversationId?: string
  customerName?: string
  customerPhone?: string
  onMessageSent?: () => void
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  isBlurred = false,
  messages = [],
  conversationId = "",
  customerName = "",
  customerPhone = "",
  onMessageSent
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const stickerInputRef = useRef<HTMLInputElement>(null)

  // Validar si está fuera de la ventana de 24 horas
  const isOutsideWindow = isOutside24HourWindow(messages)

  const handleSend = () => {
    if (isOutsideWindow && message.trim()) {
      // Si está fuera de la ventana de 24 horas y intenta enviar texto, abrir modal de plantillas
      setShowTemplateModal(true)
      return
    }

    if (message.trim() || attachments.length > 0) {
      onSendMessage(message.trim(), attachments)
      setMessage("")
      setAttachments([])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (isOutsideWindow && message.trim()) {
        setShowTemplateModal(true)
      } else {
        handleSend()
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const insertFormatting = (format: string) => {
    const textarea = document.querySelector("textarea")
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)

    let formattedText = ""
    switch (format) {
      case "bold":
        formattedText = `**${selectedText || "texto en negrita"}**`
        break
      case "italic":
        formattedText = `*${selectedText || "texto en cursiva"}*`
        break
      case "list":
        formattedText = `\n• ${selectedText || "elemento de lista"}`
        break
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)
  }

  const emojis = ["😊", "👍", "❤️", "😂", "🎉", "👏", "🔥", "💯"]

  return (
    <div className={`p-4 ${isBlurred ? 'filter blur-[1px] opacity-80' : ''} transition-all duration-300`}>
      {/* 24 Hour Window Warning - Solo mostrar si está fuera de la ventana */}
      {isOutsideWindow && (
        <Card className="mb-3 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardBody className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Ventana de 24 horas expirada
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Solo puedes enviar mensajes de plantilla de WhatsApp Business. Los mensajes de texto libre están bloqueados.
                </p>
              </div>
              <Button
                size="sm"
                color="warning"
                variant="flat"
                onPress={() => setShowTemplateModal(true)}
                startContent={<MessageSquare className="h-3 w-3" />}
                className="flex-shrink-0"
              >
                Plantillas
              </Button>
            </div>
          </CardBody>
        </Card>
      )}


      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</span>
              <Button
                size="sm"
                variant="light"
                color="danger"
                onClick={() => removeAttachment(index)}
                className="min-w-unit-6 w-6 h-6 p-0"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting Toolbar */}
      {!disabled && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
        <Button
          size="sm"
          variant="light"
          isIconOnly
          onClick={() => insertFormatting("bold")}
          title="Negrita"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <BoldIcon className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="light"
          isIconOnly
          onClick={() => insertFormatting("italic")}
          title="Cursiva"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="light"
          isIconOnly
          onClick={() => insertFormatting("list")}
          title="Lista"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <ListIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

        <Dropdown>
          <DropdownTrigger>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              title="Adjuntar"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <PaperclipIcon className="h-4 w-4" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            <DropdownItem
              key="image"
              startContent={<ImageIcon className="h-4 w-4" />}
              onClick={() => imageInputRef.current?.click()}
            >
              Imagen
            </DropdownItem>
            <DropdownItem
              key="video"
              startContent={<VideoIcon className="h-4 w-4" />}
              onClick={() => videoInputRef.current?.click()}
            >
              Video
            </DropdownItem>
            <DropdownItem
              key="audio"
              startContent={<MusicIcon className="h-4 w-4" />}
              onClick={() => audioInputRef.current?.click()}
            >
              Audio
            </DropdownItem>
            <DropdownItem
              key="sticker"
              startContent={<ImageIcon className="h-4 w-4" />}
              onClick={() => stickerInputRef.current?.click()}
            >
              Sticker
            </DropdownItem>
            <DropdownItem 
              key="file"
              startContent={<FileIcon className="h-4 w-4" />} 
              onClick={() => fileInputRef.current?.click()}
            >
              Documento
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        <Dropdown>
          <DropdownTrigger>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              title="Emoji"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <SmileIcon className="h-4 w-4" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            {emojis.map((emoji) => (
              <DropdownItem key={emoji} onClick={() => setMessage((prev) => prev + emoji)}>
                {emoji}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
      )}

      {/* Message Input */}
      <div className="flex gap-2">
        {/* Botón de Plantillas - Siempre visible a la izquierda */}
        <Button
          variant="bordered"
          isIconOnly
          onClick={() => setShowTemplateModal(true)}
          isDisabled={disabled}
          title="Enviar mensaje de plantilla"
          className="flex-shrink-0"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={
            disabled 
              ? "No tienes permisos para escribir en esta conversación" 
              : isOutsideWindow 
                ? "Ventana de 24h expirada. Usa el botón de plantillas ➜"
                : "Escribe tu mensaje..."
          }
          minRows={1}
          maxRows={4}
          className="flex-1"
          variant="bordered"
          isDisabled={disabled || isOutsideWindow}
          classNames={{
            input: "text-gray-900 dark:text-white",
            inputWrapper: `${
              isOutsideWindow 
                ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600" 
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            }`,
          }}
        />

        <Button
          color="primary"
          isIconOnly
          onClick={handleSend}
          isDisabled={disabled || (!message.trim() && attachments.length === 0)}
          className={`${
            isOutsideWindow 
              ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600" 
              : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          }`}
          title={isOutsideWindow ? "Abrir selector de plantillas" : "Enviar mensaje"}
        >
          {isOutsideWindow ? <MessageSquare className="h-4 w-4" /> : <SendIcon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Hidden File Inputs */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
      <input ref={videoInputRef} type="file" multiple accept="video/*" className="hidden" onChange={handleFileSelect} />
      <input ref={audioInputRef} type="file" multiple accept="audio/*" className="hidden" onChange={handleFileSelect} />
      <input ref={stickerInputRef} type="file" multiple accept="image/webp,image/png" className="hidden" onChange={handleFileSelect} />

      {/* Template Message Modal */}
      <TemplateMessageModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        conversationId={conversationId}
        customerName={customerName}
        customerPhone={customerPhone}
        onMessageSent={onMessageSent}
        showWarning={isOutsideWindow}
      />
    </div>
  )
}
