import type { User, Conversation } from "./types";

export const mockUser: User = {
  id: "1",
  name: "Juan Agente",
  email: "juan@chadbot.com",
  avatar: "/placeholder-user.jpg",
  role: "agent",
};

export const mockConversations: Conversation[] = [
  {
    id: "1",
    customer: {
      id: "1",
      name: "María García",
      email: "maria@email.com",
      phone: "+54 9 351 123-4567",
      avatar: "/placeholder-user.jpg",
    },
    messages: [
      {
        id: "1",
        content: "Hola, tengo una consulta sobre mi pedido",
        sender: "client",
        timestamp: new Date("2024-12-15T10:30:00"),
      },
      {
        id: "2",
        content:
          "¡Hola María! Claro, te ayudo con tu consulta. ¿Podrías darme tu número de pedido?",
        sender: "agent",
        timestamp: new Date("2024-12-15T10:32:00"),
      },
      {
        id: "3",
        content: "Sí, es el #12345",
        sender: "client",
        timestamp: new Date("2024-12-15T10:33:00"),
      },
    ],
    lastMessage: "Sí, es el #12345",
    lastActivity: new Date("2024-12-15T10:33:00"),
    status: "active",
    unreadCount: 1,
    tags: [
      { id: "1", name: "Urgente", color: "danger" },
      { id: "2", name: "Pedido", color: "primary" },
    ],
    integration: "whatsapp",
    id_representante: 1,
  },
  {
    id: "2",
    customer: {
      id: "2",
      name: "Carlos López",
      email: "carlos@email.com",
      phone: "+54 9 351 987-6543",
      avatar: "/placeholder-user.jpg",
    },
    messages: [
      {
        id: "4",
        content: "Buenos días, ¿tienen stock del producto X?",
        sender: "client",
        timestamp: new Date("2024-12-15T09:15:00"),
      },
      {
        id: "5",
        content:
          "Buenos días Carlos! Sí, tenemos stock disponible. ¿Cuántas unidades necesitas?",
        sender: "agent",
        timestamp: new Date("2024-12-15T09:17:00"),
      },
    ],
    lastMessage:
      "Buenos días Carlos! Sí, tenemos stock disponible. ¿Cuántas unidades necesitas?",
    lastActivity: new Date("2024-12-15T09:17:00"),
    status: "active",
    unreadCount: 0,
    tags: [{ id: "3", name: "Stock", color: "success" }],
    integration: "telegram",
    id_representante: 2,
  },
];
