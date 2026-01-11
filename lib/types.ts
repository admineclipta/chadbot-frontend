import type {
  Conversacion,
  ConversacionesResponse,
  Mensaje,
  UserDto,
  ConversationStatus,
} from "./api-types";

// ============================================
// Configuración de Estados de Conversación
// ============================================

export const CONVERSATION_STATUS_CONFIG = {
  ACTIVE: {
    label: "Activa",
    color: "success" as const,
    icon: "MessageCircle",
    allowedTransitions: [
      "INTERVENED",
      "CLOSED",
      "NO_ANSWER",
    ] as ConversationStatus[],
  },
  INTERVENED: {
    label: "Intervenida",
    color: "warning" as const,
    icon: "MessageCircleHeart",
    allowedTransitions: [
      "ACTIVE",
      "CLOSED",
      "NO_ANSWER",
    ] as ConversationStatus[],
  },
  NO_ANSWER: {
    label: "No Contesta",
    color: "danger" as const,
    icon: "PhoneOff",
    allowedTransitions: [
      "ACTIVE",
      "CLOSED",
      "INTERVENED",
    ] as ConversationStatus[],
  },
  CLOSED: {
    label: "Cerrada",
    color: "default" as const,
    icon: "X",
    allowedTransitions: ["ACTIVE"] as ConversationStatus[],
  },
} as const;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "admin" | "agent" | "supervisor";
  roles?: Array<{
    id: number;
    code: string;
    name: string;
    permissions?: Array<{
      id: number;
      code: string;
      name: string;
      description?: string;
    }>;
  }>;
  permissions?: Array<{
    id: number;
    code: string;
    name: string;
    description?: string;
  }>;
  displayName?: string;
  agentId?: string;
}

// Funciones de utilidad para convertir entre UserDto y User
export function mapUserDtoToUser(userDto: UserDto): User {
  return {
    id: userDto.id.toString(),
    name: `${userDto.nombre} ${userDto.apellido}`.trim(),
    email: userDto.mail,
    avatar: `https://cdn-icons-png.flaticon.com/512/6596/6596121.png`,
    role: "agent", // Rol por defecto, se puede mejorar con datos reales de roles
  };
}

export function mapUserToUserRequest(user: User, password?: string): any {
  const [nombre, ...apellidoParts] = user.name.split(" ");
  return {
    Email: user.email,
    Password: password || "",
    nombre: nombre || "",
    apellido: apellidoParts.join(" ") || "",
    activo: 1,
  };
}

// Tipos para ABMC de usuarios
export interface ApiUser {
  id: number;
  nombre: string;
  apellido: string;
  mail: string;
  password: string;
  activo: number;
  fecha_creacion: string;
  fecha_ultimo_login: string;
  token_recuperacion: string;
  fecha_token: string;
}

export interface UserListResponse {
  usuarios: ApiUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
}

export interface Tag {
  id: string;
  name: string;
  color: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  description?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface Message {
  id: string;
  content: string;
  sender: "client" | "bot" | "agent";
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  customer: Customer;
  messages: Message[];
  lastMessage: string;
  lastActivity: Date;
  status: ConversationStatus; // Usar tipo del API v1
  unreadCount: number;
  tags: Tag[]; // Tags separados del status
  integration: "whatsapp" | "telegram" | "facebook" | "instagram";
  archived?: boolean;
  id_representante: number;
  subject?: string; // Agregado según API v1
}

// Funciones de mapeo para convertir datos de la API a tipos locales
export function mapApiConversacionToConversation(
  apiConv: Conversacion
): Conversation {
  // Determinar status basado en el estado de la API
  const status: ConversationStatus =
    apiConv.NombreEstado === "Activa" ? "ACTIVE" : "CLOSED";

  return {
    id: apiConv.ConversacionId,
    customer: {
      id: "unknown",
      name: "Cliente",
      email: "cliente@email.com",
      phone: apiConv.Telefono,
      avatar: `https://cdn-icons-png.flaticon.com/512/6596/6596121.png`,
    },
    messages: [], // Se cargan por separado
    lastMessage: "Cargando...",
    lastActivity: new Date(apiConv.FechaInicio),
    status: status,
    unreadCount: 0,
    tags: [], // Tags separados - se cargarán de la API
    integration: "whatsapp", // Por defecto
    archived: status === "CLOSED",
    id_representante: apiConv.IsRepresentante ? 1 : -1, // -1 para conversaciones sin asignar
  };
}

export function mapApiConversacionesResponseToConversation(
  apiConv: ConversacionesResponse
): Conversation {
  // Mapeo de estados legacy a ConversationStatus
  const statusMap: Record<string, ConversationStatus> = {
    Activa: "ACTIVE",
    Intervenida: "INTERVENED",
    "Sin respuesta": "NO_ANSWER",
    Cerrada: "CLOSED",
  };
  const status = statusMap[apiConv.EstadoNombre] || "ACTIVE";

  return {
    id: apiConv.ConversacionId.toString(),
    customer: {
      id: apiConv.ClienteId.toString(),
      name: apiConv.ClienteNombreApellido,
      email: `${apiConv.ClienteNombreApellido.toLowerCase().replace(
        /\s+/g,
        "."
      )}@email.com`,
      phone: apiConv.ClienteTelefono,
      avatar: `https://cdn-icons-png.flaticon.com/512/6596/6596121.png`,
    },
    messages: [], // Se cargan por separado
    lastMessage: apiConv.MensajeTexto || "Sin mensajes",
    lastActivity: (() => {
      const dateStr = apiConv.MensajeFecha || apiConv.FechaInicio;
      return new Date(dateStr.includes("Z") ? dateStr : dateStr + "Z");
    })(),
    status: status,
    unreadCount: 0,
    tags: [], // Tags separados - se cargarán de la API
    integration: "whatsapp", // Por defecto
    archived: status === "CLOSED",
    id_representante:
      apiConv.IdRepresentante != null ? apiConv.IdRepresentante : -1, // Usar -1 para conversaciones sin asignar
  };
}

export function mapApiMensajeToMessage(apiMsg: Mensaje): Message {
  // Función helper para normalizar el tipo de remitente
  const getSenderType = (senderType: string): "client" | "bot" | "agent" => {
    const normalizedType = senderType.toLowerCase().trim();

    if (normalizedType === "cliente" || normalizedType === "client") {
      return "client";
    }
    if (
      normalizedType === "bot" ||
      normalizedType === "ia" ||
      normalizedType === "ai" ||
      normalizedType === "sistema" ||
      normalizedType === "system"
    ) {
      return "bot";
    }
    // Por defecto, cualquier otro tipo es considerado como agente/representante
    return "agent";
  };

  return {
    id: apiMsg.Id
      ? apiMsg.Id.toString()
      : Math.random().toString(36).substr(2, 9),
    content: apiMsg.Content || "",
    sender: getSenderType(apiMsg.SenderType?.Type || "agent"),
    timestamp: apiMsg.Timestamp
      ? new Date(
          apiMsg.Timestamp.includes("Z")
            ? apiMsg.Timestamp
            : apiMsg.Timestamp + "Z"
        )
      : new Date(),
  };
}
