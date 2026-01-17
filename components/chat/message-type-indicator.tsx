"use client"

import { ImageIcon, Mic, FileText, Video } from "lucide-react"
import type { MessageType } from "@/lib/api-types"

interface MessageTypeIndicatorProps {
  type: MessageType
  content?: {
    text?: string
    caption?: string
  }
  className?: string
}

/**
 * Displays message type indicator with icon + text for media types
 * or shows the actual text content (truncated) for text messages
 */
export default function MessageTypeIndicator({
  type,
  content,
  className = "",
}: MessageTypeIndicatorProps) {
  const baseIconClass = "text-gray-500 flex-shrink-0"

  // For non-text types, show icon + generic text
  if (type === "image") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <ImageIcon size={14} className={baseIconClass} />
        <span className="text-xs text-gray-600 truncate">Imagen</span>
      </div>
    )
  }

  if (type === "audio") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Mic size={14} className={baseIconClass} />
        <span className="text-xs text-gray-600 truncate">Audio</span>
      </div>
    )
  }

  if (type === "document") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <FileText size={14} className={baseIconClass} />
        <span className="text-xs text-gray-600 truncate">Documento</span>
      </div>
    )
  }

  if (type === "video") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Video size={14} className={baseIconClass} />
        <span className="text-xs text-gray-600 truncate">Video</span>
      </div>
    )
  }

  // For text type, show the actual content (truncated)
  const textContent = content?.text || content?.caption || ""
  
  return (
    <span className={`text-xs text-gray-600 truncate ${className}`}>
      {textContent}
    </span>
  )
}
