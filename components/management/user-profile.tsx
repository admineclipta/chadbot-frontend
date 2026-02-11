"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardBody, Avatar, Button, Chip, Spinner } from "@heroui/react"
import { X, Phone, Mail, MapPin, Calendar, MessageSquare, Clock, Tag, User } from "lucide-react"
import { mockConversations } from "@/lib/mock-data"
import UserAvatar from "./user-avatar"
import { formatDate, formatDateTime } from "@/lib/utils"

interface UserProfileProps {
  userId: string
  onClose: () => void
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    // Simular carga de datos del usuario
    const loadUserProfile = async () => {
      setLoading(true)

      // Buscar el usuario en las conversaciones mock
      const conversation = mockConversations.find((conv) => conv.customer.id === userId)

      if (conversation) {
        // Simular datos adicionales del perfil
        const profile = {
          ...conversation.customer,
          location: "Buenos Aires, Argentina",
          joinDate: new Date("2024-01-15"),
          totalConversations: 8,
          lastActivity: conversation.lastActivity,
          tags: conversation.tags,
          notes: "Cliente frecuente, prefiere comunicación por WhatsApp. Muy colaborativo y puntual en los pagos.",
          conversationHistory: [
            {
              id: "1",
              date: new Date("2024-12-15"),
              subject: "Consulta sobre producto",
              status: "Resuelto",
            },
            {
              id: "2",
              date: new Date("2024-12-10"),
              subject: "Problema con entrega",
              status: "Resuelto",
            },
            {
              id: "3",
              date: new Date("2024-12-05"),
              subject: "Solicitud de cotización",
              status: "En proceso",
            },
          ],
        }

        setTimeout(() => {
          setUserProfile(profile)
          setLoading(false)
        }, 800)
      } else {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [userId])

  // Agregar listener para la tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])



  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil del Usuario
          </h2>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="md" />
          </div>
        ) : userProfile ? (
          <>
            {/* Basic Info */}
            <Card>
              <CardBody className="text-center p-6">
                <UserAvatar 
                  name={userProfile.name} 
                  size="xl" 
                  className="mx-auto mb-4" 
                />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{userProfile.name}</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{userProfile.phone}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{userProfile.email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{userProfile.location}</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Tags */}
            {userProfile.tags && userProfile.tags.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h4>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {userProfile.tags.map((tag: any) => (
                      <Chip key={tag.id} color={tag.color as any} size="sm" variant="flat">
                        {tag.name}
                      </Chip>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Statistics */}
            <Card>
              <CardHeader className="pb-2">
                <h4 className="font-semibold">Estadísticas</h4>
              </CardHeader>
              <CardBody className="pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <MessageSquare className="h-4 w-4" />
                    <span>Total conversaciones</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{userProfile.totalConversations}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span>Cliente desde</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(userProfile.joinDate)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock className="h-4 w-4" />
                    <span>Última actividad</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatDateTime(userProfile.lastActivity)}
                  </span>
                </div>
              </CardBody>
            </Card>

            {/* Notes */}
            {userProfile.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <h4 className="font-semibold">Notas</h4>
                </CardHeader>
                <CardBody className="pt-0">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{userProfile.notes}</p>
                </CardBody>
              </Card>
            )}

            {/* Conversation History */}
            <Card>
              <CardHeader className="pb-2">
                <h4 className="font-semibold">Historial de Conversaciones</h4>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-3">
                  {userProfile.conversationHistory.map((conv: any) => (
                    <div key={conv.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-medium text-sm text-gray-900 dark:text-white">{conv.subject}</h5>
                        <Chip size="sm" color={conv.status === "Resuelto" ? "success" : "warning"} variant="flat">
                          {conv.status}
                        </Chip>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(conv.date)}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Usuario no encontrado</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
