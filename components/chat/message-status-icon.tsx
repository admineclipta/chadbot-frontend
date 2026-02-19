"use client"

import { Check, CheckCheck } from "lucide-react"
import type { MessageStatus } from "@/lib/api-types"

interface MessageStatusIconProps {
  status: MessageStatus
  className?: string
}

/**
 * Displays message delivery status icon
 * - delivered: Single check (gray)
 * - sent: Double check (gray)
 * - read: Double check (blue)
 * - failed: No icon shown
 */
export default function MessageStatusIcon({
  status,
  className = "",
}: MessageStatusIconProps) {
  if (status === "failed") {
    return null
  }

  if (status === "delivered") {
    return (
      <Check
        size={14}
        className={`text-gray-400 flex-shrink-0 ${className}`}
        aria-label="Entregado"
      />
    )
  }

  if (status === "sent") {
    return (
      <CheckCheck
        size={14}
        className={`text-gray-400 flex-shrink-0 ${className}`}
        aria-label="Enviado"
      />
    )
  }

  if (status === "read") {
    return (
      <CheckCheck
        size={14}
        className={`text-blue-500 flex-shrink-0 ${className}`}
        aria-label="Leído"
      />
    )
  }

  return null
}
