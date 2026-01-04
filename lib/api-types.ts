// ============================================
// CHADBOT API v1 Types (Multi-Tenant)
// ============================================

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

// User data (extracted from JWT)
export interface LoginUser {
  id: string;
  email: string;
  roles: string[];
}

// JWT Payload (decoded)
export interface JWTPayload {
  sub: string; // user id
  email: string;
  client_id: string; // IMPORTANTE: Multi-tenant
  roles: string[];
  exp: number;
  iat: number;
}

// Contact Types
export interface MessagingChannelDto {
  contactId: string;
  credentialId: string;
  serviceTypeName: string;
  externalContactId: string;
  metadata?: Record<string, any>;
}

export interface Contact {
  id: string;
  clientId: string;
  fullName: string;
  metadata?: Record<string, any>;
  blocked: boolean;
  messagingChannels: MessagingChannelDto[];
  createdAt: string;
  updatedAt: string;
  // Legacy - mantener para compatibilidad
  phone?: string;
  email?: string;
  customFields?: Record<string, any>;
  name?: string;
  phoneNumber?: string;
}

export interface ContactListResponse {
  content: Contact[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ContactMessagingChannelRequest {
  credentialId: string;
  externalContactId: string;
  metadata?: Record<string, any>;
}

export interface ContactRequest {
  fullName: string;
  metadata?: Record<string, any>;
  messagingChannels?: ContactMessagingChannelRequest[];
}

export interface ContactUpdateRequest extends ContactRequest {}

// Conversation Types
export type ConversationStatus =
  | "ACTIVE"
  | "INTERVENED"
  | "NO_ANSWER"
  | "CLOSED";

export interface Conversation {
  id: string;
  contactId: string;
  contact?: Contact; // Puede incluir datos del contacto
  status: ConversationStatus;
  assignedAgentId?: string;
  assignedAgent?: Agent; // Puede incluir datos del agente
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListResponse {
  content: Conversation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ConversationDetailResponse extends Conversation {
  contact: Contact;
  assignedAgent?: Agent;
}

// Message Types
export type SenderType = "CONTACT" | "AGENT" | "SYSTEM";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderName: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  status: MessageStatus;
  createdAt: string;
}

export interface MessageListResponse {
  content: Message[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  type?: MessageType;
}

export interface SendImageRequest {
  conversationId: string;
  imageUrl: string;
  caption?: string;
}

export interface SendMessageResponse {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
}

// Agent Types
export interface Agent {
  id: string;
  displayName: string;
  email?: string;
  online: boolean;
  active: boolean;
  createdAt: string;
}

export interface AgentListResponse {
  content: Agent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AgentStatusRequest {
  online: boolean;
}

// Tag Types
export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

// Conversation Actions
export interface AssignConversationRequest {
  agentId: string;
}

export interface ChangeConversationStatusRequest {
  status: ConversationStatus;
}

export interface CreateConversationRequest {
  contactId: string;
  initialMessage?: string;
}

// Channel / Credentials Types
export type MessagingServiceType = "WHATSAPP" | "TELEGRAM";
export type AiProviderType = "OPENAI" | "GEMINI";

export interface ActiveChannelResponseDto {
  serviceType: MessagingServiceType;
  displayName: string;
  hasCredentials: boolean;
}

export interface MessagingServiceDto {
  id: number;
  code: string;
  name: string;
  hasCredentials: boolean;
}

export interface MessagingCredentialResponseDto {
  id: string;
  messagingServiceType: MessagingServiceType;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagingCredentialRequestDto {
  messagingServiceType: MessagingServiceType;
  accessToken: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
}

export interface AiCredentialResponseDto {
  id: string;
  clientId: string;
  serviceTypeId: number;
  name: string;
  metadata: Record<string, any>;
  usageLimit: number;
  currentUsage: number;
  usageUnit: string;
  usageResetAt: string | null;
  remainingUsage: number;
  usagePercentage: number;
  hasReachedLimit: boolean;
  isNearLimit: boolean;
  active: boolean;
  createdAt: string;
}

export interface AiCredentialRequestDto {
  aiProviderType: AiProviderType;
  apiKey: string;
  model: string;
  temperature?: number;
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// User Management Types
export interface UserDto {
  id: string; // UUID
  clientId: string; // UUID
  email: string;
  name: string;
  displayName: string | null;
  agentId: string | null; // UUID o null
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleDto[];
}

export interface RoleDto {
  id: number;
  code: string;
  name: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
}

export interface UserRequest {
  Email: string;
  Password: string;
  FirstName: string;
  LastName: string;
  IsActive: boolean;
}

export interface UserUpdateRequest {
  Email?: string;
  Password?: string;
  FirstName?: string;
  LastName?: string;
  IsActive?: boolean;
}

export interface AssignRolesRequest {
  userId: number;
  roleIds: number[];
}

export interface UserListResponse {
  content: UserDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ============================================
// Team Types
// ============================================

export interface Team {
  id: string;
  clientId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListResponse {
  content: Team[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ============================================
// Assistant Types
// ============================================

export interface Assistant {
  id: string;
  clientId: string;
  aiCredentialId: string;
  name: string;
  description: string;
  systemPrompt: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantListResponse {
  content: Assistant[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type SortDirection = "ASC" | "DESC";

export interface GetAssistantsParams {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: SortDirection;
  teamId?: string;
  defaultOnly?: boolean;
  search?: string;
}

export interface CreateAssistantRequest {
  teamId?: string;
  name: string;
  description: string;
  credentialId: string;
  metadata?: Record<string, any>;
}

export interface UpdateAssistantRequest {
  teamId?: string;
  name?: string;
  description?: string;
  credentialId?: string;
  metadata?: Record<string, any>;
}

// WebSocket Event Types
export type WebSocketEventType =
  | "CONVERSATION_CREATED"
  | "CONVERSATION_ASSIGNED"
  | "CONVERSATION_STATUS_CHANGED"
  | "NEW_MESSAGE"
  | "AGENT_PRESENCE_CHANGED";

export interface WebSocketEvent {
  type: WebSocketEventType;
  timestamp: string;
  data: any;
}

export interface ConversationEvent extends WebSocketEvent {
  type:
    | "CONVERSATION_CREATED"
    | "CONVERSATION_ASSIGNED"
    | "CONVERSATION_STATUS_CHANGED";
  data: Conversation;
}

export interface MessageEvent extends WebSocketEvent {
  type: "NEW_MESSAGE";
  data: {
    message: Message;
    conversation: Conversation;
  };
}

export interface AgentPresenceEvent extends WebSocketEvent {
  type: "AGENT_PRESENCE_CHANGED";
  data: {
    agentId: string;
    online: boolean;
  };
}

// Standard API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  errors?: string[];
}

// Error Response
export interface ErrorResponse {
  errorCode: string;
  message: string;
  timestamp: string;
}

// Custom API Error Class
export class ApiError extends Error {
  public status: number;
  public errorCode?: string;

  constructor({
    message,
    status,
    errorCode,
  }: {
    message: string;
    status: number;
    errorCode?: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

// ============================================
// Legacy Types (v2 - Para migración gradual)
// ============================================
// Mantener estos tipos temporalmente para compatibilidad
// Eliminar cuando se complete la migración

export interface LegacyConversacion {
  Telefono: string;
  ConversacionId: string;
  FechaInicio: string;
  ThreadOpenAiId: string;
  NombreEstado: string;
  IsRepresentante: boolean;
}

export interface LegacyConversacion {
  Telefono: string;
  ConversacionId: string;
  FechaInicio: string;
  ThreadOpenAiId: string;
  NombreEstado: string;
  IsRepresentante: boolean;
}

export interface LegacyConversacionesResponse {
  ConversacionId: number;
  ClienteId: number;
  ClienteNombreApellido: string;
  ClienteTelefono: string;
  FechaInicio: string;
  EstadoNombre: string;
  IdRepresentante?: number;
  MensajeTexto: string;
  MensajeFecha?: string;
  MensajeTipoRemitente: string;
}

// Mappers: Legacy v2 -> New v1
export function mapLegacyConversationToNew(
  legacy: LegacyConversacionesResponse
): Conversation {
  return {
    id: legacy.ConversacionId.toString(),
    contactId: legacy.ClienteId.toString(),
    contact: {
      id: legacy.ClienteId.toString(),
      name: legacy.ClienteNombreApellido,
      phoneNumber: legacy.ClienteTelefono,
      createdAt: legacy.FechaInicio,
      updatedAt: legacy.FechaInicio,
    },
    status: mapLegacyStatus(legacy.EstadoNombre),
    assignedAgentId: legacy.IdRepresentante?.toString(),
    lastMessageAt: legacy.MensajeFecha || legacy.FechaInicio,
    unreadCount: 0,
    createdAt: legacy.FechaInicio,
    updatedAt: legacy.FechaInicio,
  };
}

function mapLegacyStatus(legacyStatus: string): ConversationStatus {
  const statusMap: Record<string, ConversationStatus> = {
    Activo: "ACTIVE",
    Intervenido: "INTERVENED",
    "Sin respuesta": "NO_ANSWER",
    Cerrado: "CLOSED",
  };
  return statusMap[legacyStatus] || "ACTIVE";
}

// ============================================
// Current User Types (Auth/Me Endpoint)
// ============================================

export interface PermissionDto {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface RoleDto {
  id: number;
  code: string;
  name: string;
  permissions: PermissionDto[];
}

export interface CurrentUserResponse {
  id: string;
  clientId: string;
  email: string;
  name: string;
  displayName: string;
  agentId: string;
  active: boolean;
  lastLoginAt: string;
  createdAt: string;
  roles: RoleDto[];
  permissions: PermissionDto[];
}

// ============================================
// Credentials Types
// ============================================

export interface ServiceTypeDto {
  id: number;
  code: string;
  name: string;
  hasCredentials: boolean;
}

export interface MessagingCredentialDto {
  id: string;
  clientId: string;
  serviceTypeId: number;
  name: string;
  webhookIdentity: string;
  metadata: Record<string, any>;
  active: boolean;
  createdAt: string;
}

export interface MessagingCredentialsListResponse {
  content: MessagingCredentialDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateMessagingCredentialRequest {
  serviceTypeId: number;
  name: string;
  webhookIdentity: string;
  metadata: Record<string, any>;
}

export interface UpdateMessagingCredentialRequest {
  serviceTypeId: number;
  name: string;
  webhookIdentity: string;
  metadata: Record<string, any>;
}

export interface AiCredentialDto {
  id: string;
  clientId: string;
  serviceTypeId: number;
  name: string;
  metadata: Record<string, any>;
  usageLimit?: number;
  usageUnit?: string;
  usageResetAt?: string;
  active: boolean;
  createdAt: string;
}

export interface AiCredentialsListResponse {
  content: AiCredentialDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateAiCredentialRequest {
  serviceTypeId: number;
  name: string;
  metadata: Record<string, any>;
  usageLimit?: number;
  usageUnit?: string;
  usageResetAt?: string;
}

export interface UpdateAiCredentialRequest {
  serviceTypeId: number;
  name: string;
  metadata: Record<string, any>;
  usageLimit?: number;
  usageUnit?: string;
  usageResetAt?: string;
}
