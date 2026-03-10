import { config } from "./config";
import {
  AUTH_EXPIRED_EVENT,
  buildSafeNextPath,
  clearAuthSession,
  getAuthToken,
  isPublicAuthPath,
  isTokenExpired,
  setAuthSession,
} from "./auth-session";
import {
  type LoginRequest,
  type LoginResponse,
  type JWTPayload,
  type Conversation,
  type ConversationListResponse,
  type ConversationDetailResponse,
  type ConversationStatus,
  type ConversationSortField,
  type SortDirection,
  type Message,
  type MessageListResponse,
  type SendMessageRequest,
  type SendMessageResponse,
  type SendImageRequest,
  type Contact,
  type ContactListResponse,
  type ContactRequest,
  type ContactUpdateRequest,
  type Agent,
  type AgentListResponse,
  type AgentStatusRequest,
  type AssignConversationRequest,
  type ChangeConversationStatusRequest,
  type CreateConversationRequest,
  type OutboundConfigResponse,
  type OutboundConfigCredential,
  type CreateOutboundConversationRequest,
  type CreateOutboundConversationResponse,
  type Tag,
  type TagListResponse,
  type CreateTagRequest,
  type UpdateTagRequest,
  type ActiveChannelResponseDto,
  type MessagingServiceDto,
  type MessagingServiceType,
  type MessagingCredentialResponseDto,
  type MessagingCredentialRequestDto,
  type AiCredentialResponseDto,
  type AiCredentialRequestDto,
  type PageResponseDto,
  type UserDto,
  type UserRequest,
  type UserUpdateRequest,
  type ChangePasswordRequest,
  type ResetPasswordTokenResponse,
  type UserListResponse,
  type Role,
  type AssignRolesRequest,
  type Assistant,
  type AssistantListResponse,
  type GetAssistantsParams,
  type CreateAssistantRequest,
  type UpdateAssistantRequest,
  type Team,
  // New API v1 types
  type ApiConversationResponse,
  type ApiConversation,
  type TeamListResponse,
  type CreateTeamRequest,
  type UpdateTeamRequest,
  type TeamMember,
  type AddTeamMembersRequest,
  type NoteResponseDto,
  type CreateNoteRequest,
  type UpdateNoteRequest,
  type NoteListResponse,
  type PlantillaWhatsApp,
  type TemplateComponents,
  type TemplateListResponse,
  type EnviarMensajesPlantillaRequest,
  type EnviarMensajesPlantillaResponse,
  type ContactoCSV,
  type DashboardSummary,
  type MembershipCurrentResponseDto,
  type MembershipUsageResponseDto,
  type MembershipUsageAlertDto,
  type MembershipOperationsSummaryDto,
  type MembershipPlansResponseDto,
  type MembershipChangePlanRequestDto,
  type MembershipChangePlanResponseDto,
  type MembershipFeaturePolicyResponseDto,
  type MembershipFeaturePolicyUpdateRequestDto,
  type BillingInvoiceDto,
  type PushPublicKeyResponse,
  type PushSubscriptionUpsertRequest,
  type PushSubscriptionDeleteRequest,
  type EvaSendMessageRequest,
  type EvaSendMessageResponse,
  type EvaConfirmActionResponse,
  type EvaCancelActionResponse,
  type EvaSessionListResponse,
  type EvaSessionMessageListLike,
  type EvaSettingsResponse,
  type EvaSettingsUpdateRequest,
  type EvaUsageResponse,
  ApiError,
} from "./api-types";
import { mapApiConversationToDomain } from "./types";
import type { Conversation as DomainConversation } from "./types";

export { ApiError } from "./api-types";

// Función para decodificar JWT (extraer payload)
function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private clientId: string | null = null;
  private isHandlingAuthFailure = false;
  private lastAuthFailureAt = 0;

  constructor() {
    this.baseUrl = config.apiUrl;
    this.token = getAuthToken();

    // Extraer client_id del token
    if (this.token) {
      const payload = decodeJWT(this.token);
      this.clientId = payload?.client_id || null;
    }
  }

  /**
   * Internal HTTP request method with optional AbortSignal for cancellation support.
   *
   * Read operations (GET) should pass an AbortSignal for cancellation support.
   * Write operations (POST/PUT/DELETE) typically don't pass signal to prevent
   * interrupting transactions mid-flight.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const isFormData = options.body instanceof FormData;
    const defaultHeaders: HeadersInit = {};

    if (!isFormData) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    this.token = getAuthToken();
    const isPublicAuthEndpoint =
      endpoint === "auth/login" || endpoint.startsWith("auth/reset-password");

    if (!isPublicAuthEndpoint && this.token && isTokenExpired()) {
      this.handleAuthFailure("expired");
      throw new ApiError({
        message: "Sesión expirada. Por favor, inicia sesión nuevamente.",
        status: 401,
        errorCode: "AUTH_001",
      });
    }

    if (this.token) {
      defaultHeaders.Authorization = `Bearer ${this.token}`;
    }

    // Build config without signal first
    const config: RequestInit = {
      method: options.method,
      body: options.body,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      mode: "cors",
      credentials: "omit",
    };

    // Only include signal if it's actually provided and valid
    if (signal !== undefined && signal !== null) {
      config.signal = signal;
    }

    try {
      const response = await fetch(url, config);

      // Manejar 401 Unauthorized
      if (response.status === 401) {
        this.handleAuthFailure("unauthorized");
        throw new ApiError({
          message: "Sesión expirada. Por favor, inicia sesión nuevamente.",
          status: 401,
          errorCode: "AUTH_001",
        });
      }

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = `HTTP_${response.status}`;

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            errorCode = errorData.errorCode || errorCode;
          } catch (e) {
            // Si falla el parsing, usar mensaje por defecto
          }
        } else {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }

        throw new ApiError({
          message: errorMessage,
          status: response.status,
          errorCode,
        });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      // Handle AbortError silently (request was intentionally cancelled)
      if (error instanceof Error && error.name === "AbortError") {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[ApiService] Request aborted: ${endpoint}`);
        }
        throw error;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError({
        message:
          error instanceof Error ? error.message : "Network error occurred",
        status: 0,
        errorCode: "NETWORK_ERROR",
      });
    }
  }

  public handleAuthFailure(
    reason: "expired" | "unauthorized",
    options: { redirect?: boolean; showToastEvent?: boolean } = {},
  ) {
    const { redirect = true, showToastEvent = true } = options;
    const now = Date.now();

    if (this.isHandlingAuthFailure && now - this.lastAuthFailureAt < 1500) {
      return;
    }

    this.isHandlingAuthFailure = true;
    this.lastAuthFailureAt = now;

    this.token = null;
    this.clientId = null;
    clearAuthSession();

    if (typeof window !== "undefined") {
      if (showToastEvent) {
        window.dispatchEvent(
          new CustomEvent(AUTH_EXPIRED_EVENT, {
            detail: { reason, at: now },
          }),
        );
      }

      if (redirect) {
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const safeNext = buildSafeNextPath(currentPath);
        const isPublicPath =
          isPublicAuthPath(window.location.pathname) ||
          window.location.pathname.startsWith("/reset-password/");

        let loginUrl = "/login";
        if (safeNext && !isPublicPath) {
          loginUrl += `?next=${encodeURIComponent(safeNext)}`;
        }

        if (!isPublicAuthPath(window.location.pathname)) {
          window.location.replace(loginUrl);
        }
      }
    }

    setTimeout(() => {
      this.isHandlingAuthFailure = false;
    }, 1200);
  }

  // ============================================
  // Authentication
  // ============================================

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log(
      "🔐 [CHADBOT API] Login request to:",
      `${this.baseUrl}auth/login`,
    );
    console.log(
      "📤 [CHADBOT API] Request body:",
      JSON.stringify(credentials, null, 2),
    );

    const response = await this.request<LoginResponse>("auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    console.log("✅ [CHADBOT API] Login successful");

    if (response.accessToken) {
      this.token = response.accessToken;

      // Decodificar token para obtener client_id y datos del usuario
      const payload = decodeJWT(response.accessToken);
      this.clientId = payload?.client_id || null;
      const jwtUser = payload
        ? {
            id: payload.sub,
            email: payload.email,
            roles: Array.isArray(payload.roles)
              ? payload.roles
              : [payload.roles],
          }
        : undefined;

      if (typeof window !== "undefined") {
        setAuthSession({
          accessToken: response.accessToken,
          expiresIn: response.expiresIn,
          user: jwtUser,
        });
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.clientId = null;
    clearAuthSession();
    console.log("[CHADBOT API] Logged out");
  }

  getUserFromToken(token: string): JWTPayload | null {
    return decodeJWT(token);
  }

  getClientId(): string | null {
    return this.clientId;
  }

  // ============================================
  // Conversations
  // ============================================

  /**
   * Fetches conversations with new API v1 schema
   * Automatically maps backend response to frontend domain model
   */
  async getConversations(
    page: number = 0,
    size: number = 20,
    status?: ConversationStatus,
    messagingServiceType?: MessagingServiceType,
    fetchContactInfo: boolean = true,
    search?: string,
    teamId?: string,
    agentId?: string,
    tags?: string[],
    sortBy?: ConversationSortField,
    sortDirection?: SortDirection,
    signal?: AbortSignal,
  ): Promise<{
    content: DomainConversation[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }> {
    let url = `conversations?page=${page}&size=${size}&fetchContactInfo=${fetchContactInfo}`;

    if (status) {
      url += `&status=${status.toLowerCase()}`;
    }
    if (messagingServiceType) {
      url += `&messagingServiceType=${messagingServiceType}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    if (teamId) {
      url += `&teamId=${teamId}`;
    }
    if (agentId) {
      url += `&agentId=${agentId}`;
    }
    if (tags && tags.length > 0) {
      url += `&tags=${tags.join(",")}`;
    }
    if (sortBy) {
      url += `&sortBy=${sortBy}`;
    }
    if (sortDirection) {
      url += `&sortDirection=${sortDirection}`;
    }

    console.log(`📋 [CHADBOT API] Fetching conversations: ${url}`);

    // Fetch from new API v1 endpoint
    const response = await this.request<ApiConversationResponse>(
      url,
      {},
      signal,
    );

    // Map API response to domain model
    const mappedConversations = response.content.map(
      mapApiConversationToDomain,
    );

    return {
      content: mappedConversations,
      page: response.page,
      size: response.size,
      totalElements: response.totalElements,
      totalPages: response.totalPages,
    };
  }

  /**
   * Fetches a single conversation by ID with new API v1 schema
   * Automatically maps backend response to frontend domain model
   */
  async getConversationById(
    id: string,
    signal?: AbortSignal,
  ): Promise<DomainConversation> {
    console.log(`🔍 [CHADBOT API] Fetching conversation: ${id}`);
    const response = await this.request<ApiConversation>(
      `conversations/${id}`,
      {},
      signal,
    );
    return mapApiConversationToDomain(response);
  }

  /**
   * Create a new conversation.
   * Note: Write operations do not support cancellation to prevent interrupting transactions.
   */
  async createConversation(
    data: CreateConversationRequest,
  ): Promise<Conversation> {
    console.log(`➕ [CHADBOT API] Creating conversation`);
    return this.request<Conversation>("conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getOutboundConversationConfig(
    signal?: AbortSignal,
  ): Promise<OutboundConfigResponse> {
    console.log("📨 [CHADBOT API] Fetching outbound conversation config");
    const response = await this.request<OutboundConfigResponse | OutboundConfigCredential[]>(
      "conversations/outbound/config",
      {},
      signal,
    );

    // Backend may return an object with credentials or a direct list.
    if (Array.isArray(response)) {
      return { credentials: response };
    }

    return {
      credentials: Array.isArray(response.credentials)
        ? response.credentials
        : [],
      recipientSchema: response.recipientSchema,
      messageSchema: response.messageSchema,
    };
  }

  async createOutboundConversation(
    payload: CreateOutboundConversationRequest,
  ): Promise<CreateOutboundConversationResponse> {
    console.log("📨 [CHADBOT API] Creating outbound conversation");
    return this.request<CreateOutboundConversationResponse>(
      "conversations/outbound",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  async assignConversation(
    conversationId: string,
    data: AssignConversationRequest,
  ): Promise<Conversation> {
    console.log(
      `👤 [CHADBOT API] Assigning conversation ${conversationId} to agents ${data.agentIds.join(", ")}`,
    );
    return this.request<Conversation>(
      `conversations/${conversationId}/agents`,
      {
        method: "PUT",
        body: JSON.stringify({ agentIds: data.agentIds }),
      },
    );
  }

  async changeConversationStatus(
    conversationId: string,
    data: ChangeConversationStatusRequest,
  ): Promise<Conversation> {
    console.log(
      `🔄 [CHADBOT API] Changing conversation ${conversationId} status to ${data.status}`,
    );
    return this.request<Conversation>(
      `conversations/${conversationId}/status`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  // ============================================
  // Messages
  // ============================================

  async getMessages(
    conversationId: string,
    page: number = 0,
    size: number = 50,
    sortBy: string = "createdAt",
    direction: "ASC" | "DESC" = "DESC",
    signal?: AbortSignal,
  ): Promise<MessageListResponse> {
    console.log(
      `💬 [CHADBOT API] Fetching messages for conversation ${conversationId} (page ${page}, size ${size}, sort: ${sortBy} ${direction})`,
    );
    return this.request<MessageListResponse>(
      `conversations/${conversationId}/messages?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`,
      {},
      signal,
    );
  }

  /**
   * Send a message to a conversation.
   * Note: Write operations do not support cancellation to prevent interrupting transactions.
   */
  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    console.log(
      `📤 [CHADBOT API] Sending message to conversation ${data.conversationId}`,
    );

    const metadata = {
      conversationId: data.conversationId,
      type: data.type ?? "text",
      ...(data.text && { text: data.text }),
      ...(data.caption && { caption: data.caption }),
    };

    const formData = new FormData();
    formData.append("metadata", JSON.stringify(metadata));

    if (data.file) {
      formData.append("file", data.file);
    }

    return this.request<SendMessageResponse>("messages/send", {
      method: "POST",
      body: formData,
    });
  }

  async sendImage(data: SendImageRequest): Promise<SendMessageResponse> {
    console.log(
      `🖼️ [CHADBOT API] Sending image to conversation ${data.conversationId}`,
    );
    return this.request<SendMessageResponse>("messages/image", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Agents
  // ============================================

  async getAgents(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<AgentListResponse> {
    console.log(
      `👥 [CHADBOT API] Fetching agents (page ${page}, size ${size})`,
    );
    return this.request<AgentListResponse>(
      `agents?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  async updateAgentStatus(
    agentId: string,
    data: AgentStatusRequest,
  ): Promise<Agent> {
    console.log(
      `🟢 [CHADBOT API] Updating agent ${agentId} status to ${
        data.online ? "online" : "offline"
      }`,
    );
    return this.request<Agent>(`agents/${agentId}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Tags
  // ============================================

  async getTags(
    page: number = 0,
    size: number = 20,
    search?: string,
    signal?: AbortSignal,
  ): Promise<TagListResponse> {
    let url = `tags?page=${page}&size=${size}`;

    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }

    console.log(`🏷️ [CHADBOT API] Fetching tags: ${url}`);
    return this.request<TagListResponse>(url, {}, signal);
  }

  async createTag(data: CreateTagRequest): Promise<Tag> {
    console.log(`➕ [CHADBOT API] Creating tag: ${data.name}`);
    return this.request<Tag>("tags", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTag(tagId: string, data: UpdateTagRequest): Promise<Tag> {
    console.log(`✏️ [CHADBOT API] Updating tag ${tagId}`);
    return this.request<Tag>(`tags/${tagId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTag(tagId: string): Promise<void> {
    console.log(`🗑️ [CHADBOT API] Deleting tag ${tagId}`);
    return this.request<void>(`tags/${tagId}`, {
      method: "DELETE",
    });
  }

  async assignTagToConversation(
    conversationId: string,
    tagId: string,
  ): Promise<void> {
    console.log(
      `🏷️ [CHADBOT API] Assigning tag ${tagId} to conversation ${conversationId}`,
    );
    return this.request<void>(`conversations/${conversationId}/tags/${tagId}`, {
      method: "POST",
    });
  }

  async setConversationTags(
    conversationId: string,
    tagIds: string[],
  ): Promise<void> {
    console.log(
      `🏷️ [CHADBOT API] Setting tags for conversation ${conversationId}: ${tagIds.join(", ")}`,
    );
    return this.request<void>(`conversations/${conversationId}/tags`, {
      method: "PUT",
      body: JSON.stringify({ tagIds }),
    });
  }

  async removeTagFromConversation(
    conversationId: string,
    tagId: string,
  ): Promise<void> {
    console.log(
      `🏷️ [CHADBOT API] Removing tag ${tagId} from conversation ${conversationId}`,
    );
    return this.request<void>(`conversations/${conversationId}/tags/${tagId}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // Channels / Credentials
  // ============================================

  async getActiveChannels(
    signal?: AbortSignal,
  ): Promise<ActiveChannelResponseDto[]> {
    console.log("📡 [CHADBOT API] Fetching active channels");
    return this.request<ActiveChannelResponseDto[]>(
      "credentials/channels",
      {},
      signal,
    );
  }

  // ============================================
  // Contact Management
  // ============================================

  async getContacts(
    page: number = 0,
    size: number = 20,
    search?: string,
    signal?: AbortSignal,
  ): Promise<ContactListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    console.log(
      `📇 [CHADBOT API] Fetching contacts (page ${page}, size ${size}${
        search ? `, search: ${search}` : ""
      })`,
    );
    return this.request<ContactListResponse>(
      `contacts?${params.toString()}`,
      {},
      signal,
    );
  }

  async getContactById(
    contactId: string,
    signal?: AbortSignal,
  ): Promise<Contact> {
    console.log(`🔍 [CHADBOT API] Fetching contact ${contactId}`);
    return this.request<Contact>(`contacts/${contactId}`, {}, signal);
  }

  async createContact(contactData: ContactRequest): Promise<Contact> {
    console.log(`➕ [CHADBOT API] Creating contact: ${contactData.fullName}`);
    return this.request<Contact>(`contacts`, {
      method: "POST",
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(
    contactId: string,
    contactData: ContactUpdateRequest,
  ): Promise<Contact> {
    console.log(`✏️ [CHADBOT API] Updating contact ${contactId}`);
    return this.request<Contact>(`contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(contactId: string): Promise<void> {
    console.log(`🗑️ [CHADBOT API] Deleting contact ${contactId}`);
    return this.request<void>(`contacts/${contactId}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // User Management
  // ============================================

  async getUsers(
    page: number = 0,
    size: number = 20,
    signalOrOnlyAgents?: AbortSignal | boolean,
    onlyAgents?: boolean,
  ): Promise<UserListResponse> {
    const signal =
      typeof signalOrOnlyAgents === "boolean" ? undefined : signalOrOnlyAgents;
    const onlyAgentsParam =
      typeof signalOrOnlyAgents === "boolean" ? signalOrOnlyAgents : onlyAgents;
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("size", size.toString());
    if (onlyAgentsParam !== undefined) {
      queryParams.append("onlyAgents", String(onlyAgentsParam));
    }
    console.log(
      `👥 [CHADBOT API] Fetching users (page ${page}, size ${size}, onlyAgents ${onlyAgentsParam ?? "unset"})`,
    );
    return this.request<UserListResponse>(
      `users?${queryParams.toString()}`,
      {},
      signal,
    );
  }

  async getUserById(userId: string, signal?: AbortSignal): Promise<UserDto> {
    console.log(`🔍 [CHADBOT API] Fetching user ${userId}`);
    return this.request<UserDto>(`users/${userId}`, {}, signal);
  }

  async createUser(userData: UserRequest): Promise<UserDto> {
    console.log(`➕ [CHADBOT API] Creating user: ${userData.Email}`);
    return this.request<UserDto>(`users`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(
    userId: string,
    userData: UserUpdateRequest,
  ): Promise<UserDto> {
    console.log(`✏️ [CHADBOT API] Updating user ${userId}`);
    return this.request<UserDto>(`users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    console.log(`🗑️ [CHADBOT API] Deleting user ${userId}`);
    return this.request<void>(`users/${userId}`, {
      method: "DELETE",
    });
  }

  async getRoles(signal?: AbortSignal): Promise<Role[]> {
    console.log(`🔐 [CHADBOT API] Fetching roles`);
    return this.request<Role[]>(`roles`, {}, signal);
  }

  async assignRolesToUser(data: AssignRolesRequest): Promise<void> {
    console.log(`🔐 [CHADBOT API] Assigning roles to user ${data.userId}`);
    return this.request<void>(`usuarios/${data.userId}/roles`, {
      method: "POST",
      body: JSON.stringify({ roleIds: data.roleIds }),
    });
  }

  // ============================================
  // Assistants
  // ============================================

  async getAssistants(
    params: GetAssistantsParams = {},
    signal?: AbortSignal,
  ): Promise<AssistantListResponse> {
    const {
      page = 0,
      size = 20,
      sortBy,
      direction,
      teamId,
      defaultOnly,
      search,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("size", size.toString());

    if (sortBy) queryParams.append("sortBy", sortBy);
    if (direction) queryParams.append("direction", direction);
    if (teamId) queryParams.append("teamId", teamId);
    if (defaultOnly !== undefined)
      queryParams.append("defaultOnly", defaultOnly.toString());
    if (search) queryParams.append("search", search);

    console.log(
      `🤖 [CHADBOT API] Fetching assistants with params: ${queryParams.toString()}`,
    );
    return this.request<AssistantListResponse>(
      `assistants?${queryParams.toString()}`,
      {},
      signal,
    );
  }

  async getAssistantById(id: string, signal?: AbortSignal): Promise<Assistant> {
    console.log(`🔍 [CHADBOT API] Fetching assistant ${id}`);
    return this.request<Assistant>(`assistants/${id}`, {}, signal);
  }

  async createAssistant(data: CreateAssistantRequest): Promise<Assistant> {
    console.log(`➕ [CHADBOT API] Creating assistant: ${data.name}`);
    return this.request<Assistant>("assistants", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAssistant(
    id: string,
    data: UpdateAssistantRequest,
  ): Promise<Assistant> {
    console.log(`✏️ [CHADBOT API] Updating assistant ${id}`);
    return this.request<Assistant>(`assistants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAssistant(id: string): Promise<void> {
    console.log(`🗑️ [CHADBOT API] Deleting assistant ${id}`);
    return this.request<void>(`assistants/${id}`, {
      method: "DELETE",
    });
  }

  async setAssistantAsDefault(id: string): Promise<Assistant> {
    console.log(`⭐ [CHADBOT API] Setting assistant ${id} as default`);
    return this.request<Assistant>(`assistants/${id}/default`, {
      method: "PUT",
    });
  }

  // ============================================
  // Teams
  // ============================================

  async getTeams(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<TeamListResponse> {
    console.log(`👥 [CHADBOT API] Fetching teams (page ${page}, size ${size})`);
    return this.request<TeamListResponse>(
      `teams?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  // ============================================
  // Current User / Settings
  // ============================================

  async getCurrentUser(
    signal?: AbortSignal,
  ): Promise<import("./api-types").CurrentUserResponse> {
    console.log("👤 [CHADBOT API] Fetching current user info");
    return this.request<import("./api-types").CurrentUserResponse>(
      "auth/me",
      {},
      signal,
    );
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    console.log("🔒 [CHADBOT API] Changing password");
    await this.request<void>("users/change-password", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async createResetPasswordToken(
    userId: string,
  ): Promise<ResetPasswordTokenResponse> {
    console.log(`🔑 [CHADBOT API] Creating reset token for user ${userId}`);
    return this.request<ResetPasswordTokenResponse>(
      `users/${userId}/reset-password`,
      {
        method: "POST",
      },
    );
  }

  async resetPasswordWithToken(
    tokenHash: string,
    newPassword: string,
  ): Promise<void> {
    console.log("🔁 [CHADBOT API] Resetting password with token");
    await this.request<void>(`auth/reset-password/${tokenHash}`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  }

  // ============================================
  // Messaging Credentials
  // ============================================

  async getMessagingServices(
    signal?: AbortSignal,
  ): Promise<import("./api-types").ServiceTypeDto[]> {
    console.log("📱 [CHADBOT API] Fetching messaging service types");
    return this.request<import("./api-types").ServiceTypeDto[]>(
      "credentials/messaging/services",
      {},
      signal,
    );
  }

  async getMessagingCredentials(
    page: number = 0,
    size: number = 20,
    includeInactive: boolean = true,
    signal?: AbortSignal,
  ): Promise<import("./api-types").MessagingCredentialsListResponse> {
    console.log(
      `🔑 [CHADBOT API] Fetching messaging credentials (page ${page}, size ${size})`,
    );
    return this.request<import("./api-types").MessagingCredentialsListResponse>(
      `credentials/messaging?page=${page}&size=${size}&includeInactive=${includeInactive}`,
      {},
      signal,
    );
  }

  async createMessagingCredential(
    data: import("./api-types").CreateMessagingCredentialRequest,
  ): Promise<import("./api-types").MessagingCredentialDto> {
    console.log("➕ [CHADBOT API] Creating messaging credential:", data.name);
    return this.request<import("./api-types").MessagingCredentialDto>(
      "credentials/messaging",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async updateMessagingCredential(
    id: string,
    data: import("./api-types").UpdateMessagingCredentialRequest,
  ): Promise<import("./api-types").MessagingCredentialDto> {
    console.log("✏️ [CHADBOT API] Updating messaging credential:", id);
    return this.request<import("./api-types").MessagingCredentialDto>(
      `credentials/messaging/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteMessagingCredential(id: string): Promise<void> {
    console.log("🗑️ [CHADBOT API] Deleting messaging credential:", id);
    return this.request<void>(`credentials/messaging/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // AI Credentials
  // ============================================

  async getAiServices(
    signal?: AbortSignal,
  ): Promise<import("./api-types").ServiceTypeDto[]> {
    console.log("🤖 [CHADBOT API] Fetching AI service types");
    return this.request<import("./api-types").ServiceTypeDto[]>(
      "credentials/ai/services",
      {},
      signal,
    );
  }

  async getAiCredentials(
    page: number = 0,
    size: number = 20,
    includeInactive: boolean = true,
    signal?: AbortSignal,
  ): Promise<import("./api-types").AiCredentialsListResponse> {
    console.log(
      `🔑 [CHADBOT API] Fetching AI credentials (page ${page}, size ${size})`,
    );
    return this.request<import("./api-types").AiCredentialsListResponse>(
      `credentials/ai?page=${page}&size=${size}&includeInactive=${includeInactive}`,
      {},
      signal,
    );
  }

  async createAiCredential(
    data: import("./api-types").CreateAiCredentialRequest,
  ): Promise<import("./api-types").AiCredentialDto> {
    console.log("➕ [CHADBOT API] Creating AI credential:", data.name);
    return this.request<import("./api-types").AiCredentialDto>(
      "credentials/ai",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async updateAiCredential(
    id: string,
    data: import("./api-types").UpdateAiCredentialRequest,
  ): Promise<import("./api-types").AiCredentialDto> {
    console.log("✏️ [CHADBOT API] Updating AI credential:", id);
    return this.request<import("./api-types").AiCredentialDto>(
      `credentials/ai/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteAiCredential(id: string): Promise<void> {
    console.log("🗑️ [CHADBOT API] Deleting AI credential:", id);
    return this.request<void>(`credentials/ai/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // Team Management
  // ============================================

  async getTeams(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<TeamListResponse> {
    console.log(`👥 [CHADBOT API] Fetching teams (page ${page}, size ${size})`);
    return this.request<TeamListResponse>(
      `teams?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  async getTeamById(teamId: string, signal?: AbortSignal): Promise<Team> {
    console.log(`🔍 [CHADBOT API] Fetching team ${teamId}`);
    return this.request<Team>(`teams/${teamId}`, {}, signal);
  }

  async createTeam(teamData: CreateTeamRequest): Promise<Team> {
    console.log(`➕ [CHADBOT API] Creating team: ${teamData.name}`);
    return this.request<Team>(`teams`, {
      method: "POST",
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(teamId: string, teamData: UpdateTeamRequest): Promise<Team> {
    console.log(`✏️ [CHADBOT API] Updating team ${teamId}`);
    return this.request<Team>(`teams/${teamId}`, {
      method: "PUT",
      body: JSON.stringify(teamData),
    });
  }

  async activateTeam(teamId: string): Promise<void> {
    console.log(`✅ [CHADBOT API] Activating team ${teamId}`);
    return this.request<void>(`teams/${teamId}/activate`, {
      method: "PATCH",
    });
  }

  async deactivateTeam(teamId: string): Promise<void> {
    console.log(`❌ [CHADBOT API] Deactivating team ${teamId}`);
    return this.request<void>(`teams/${teamId}/deactivate`, {
      method: "PATCH",
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    console.log(`🗑️ [CHADBOT API] Deleting team ${teamId}`);
    return this.request<void>(`teams/${teamId}`, {
      method: "DELETE",
    });
  }

  async getTeamMembers(
    teamId: string,
    signal?: AbortSignal,
  ): Promise<TeamMember[]> {
    console.log(`👥 [CHADBOT API] Fetching members for team ${teamId}`);
    return this.request<TeamMember[]>(`teams/${teamId}/members`, {}, signal);
  }

  async addTeamMembers(teamId: string, agentIds: string[]): Promise<void> {
    console.log(
      `➕ [CHADBOT API] Adding ${agentIds.length} members to team ${teamId}`,
    );
    return this.request<void>(`teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ agentIds }),
    });
  }

  async deleteTeamMember(teamId: string, agentId: string): Promise<void> {
    console.log(
      `🗑️ [CHADBOT API] Removing agent ${agentId} from team ${teamId}`,
    );
    return this.request<void>(`teams/${teamId}/members/${agentId}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // Conversation Notes
  // ============================================

  async getConversationNotes(
    conversationId: string,
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<NoteListResponse> {
    console.log(
      `📝 [CHADBOT API] Fetching notes for conversation ${conversationId}`,
    );
    const url = `conversations/${conversationId}/notes?page=${page}&size=${size}`;
    return this.request<NoteListResponse>(url, {}, signal);
  }

  async createNote(
    conversationId: string,
    note: string,
    isPrivate: boolean = false,
  ): Promise<NoteResponseDto> {
    console.log(
      `➕ [CHADBOT API] Creating note for conversation ${conversationId}`,
    );
    const payload: CreateNoteRequest = { note, isPrivate };
    return this.request<NoteResponseDto>(
      `conversations/${conversationId}/notes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  async updateNote(
    noteId: string,
    note: string,
    isPrivate?: boolean,
  ): Promise<NoteResponseDto> {
    console.log(`✏️ [CHADBOT API] Updating note ${noteId}`);
    const payload: UpdateNoteRequest = { note, isPrivate };
    return this.request<NoteResponseDto>(`conversations/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    console.log(`🗑️ [CHADBOT API] Deleting note ${noteId}`);
    return this.request<void>(`conversations/notes/${noteId}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // Templates (WhatsApp Business)
  // ============================================

  /**
   * Get templates by messaging credential ID
   * @param credentialId - The messaging credential ID to fetch templates for
   * @param templateName - Optional filter by template name
   * @param page - Page number (default: 0)
   * @param size - Page size (default: 20)
   * @param signal - Optional abort signal
   */
  async getTemplatesByCredential(
    credentialId: string,
    templateName?: string,
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<import("./api-types").TemplateListResponse> {
    console.log(
      `📋 [CHADBOT API] Fetching templates for credential ${credentialId}`,
    );
    let url = `templates/${credentialId}?page=${page}&size=${size}`;
    if (templateName) {
      url += `&templateName=${encodeURIComponent(templateName)}`;
    }
    return this.request<import("./api-types").TemplateListResponse>(
      url,
      {},
      signal,
    );
  }

  /**
   * Legacy method - Get all templates (deprecated, use getTemplatesByCredential)
   * This method fetches templates without a specific credential ID filter.
   * For proper multi-tenant support, use getTemplatesByCredential instead.
   */
  async getPlantillas(
    signal?: AbortSignal,
  ): Promise<import("./api-types").PlantillaWhatsApp[]> {
    console.log("⚠️ [CHADBOT API] Using deprecated getPlantillas method");
    // This is a fallback that returns empty array
    // The proper way is to select a credential first and use getTemplatesByCredential
    return [];
  }

  /**
   * Send template messages to multiple recipients
   * @param payload - The template message payload
   */
  async enviarMensajesPlantilla(
    payload: import("./api-types").EnviarMensajesPlantillaRequest,
  ): Promise<import("./api-types").EnviarMensajesPlantillaResponse> {
    console.log(
      `📤 [CHADBOT API] Sending template messages: ${payload.Template.TemplateName}`,
    );
    // This endpoint may vary depending on your backend implementation
    // Adjust the endpoint path as needed
    return this.request<import("./api-types").EnviarMensajesPlantillaResponse>(
      "messages/template/bulk",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  // ============================================
  // Membership & Billing (Tenant)
  // ============================================

  async getMembershipCurrent(
    signal?: AbortSignal,
  ): Promise<MembershipCurrentResponseDto> {
    console.log("💳 [CHADBOT API] Fetching current membership");
    return this.request<MembershipCurrentResponseDto>(
      "membership/current",
      {},
      signal,
    );
  }

  async getMembershipUsage(
    signal?: AbortSignal,
  ): Promise<MembershipUsageResponseDto> {
    console.log("📈 [CHADBOT API] Fetching membership usage");
    return this.request<MembershipUsageResponseDto>("membership/usage", {}, signal);
  }

  async getMembershipUsageAlerts(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<MembershipUsageAlertDto[]> {
    console.log(
      `🚨 [CHADBOT API] Fetching usage alerts (page ${page}, size ${size})`,
    );
    return this.request<MembershipUsageAlertDto[]>(
      `membership/usage/alerts?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  async getMembershipOperationsSummary(
    recentAlerts: number = 10,
    recentEvents: number = 10,
    signal?: AbortSignal,
  ): Promise<MembershipOperationsSummaryDto> {
    console.log("🧾 [CHADBOT API] Fetching membership operations summary");
    return this.request<MembershipOperationsSummaryDto>(
      `membership/operations/summary?recentAlerts=${recentAlerts}&recentEvents=${recentEvents}`,
      {},
      signal,
    );
  }

  async getMembershipPlans(
    currency: "ARS" | "USD",
    signal?: AbortSignal,
  ): Promise<MembershipPlansResponseDto> {
    console.log(`🗂️ [CHADBOT API] Fetching membership plans in ${currency}`);
    return this.request<MembershipPlansResponseDto>(
      `membership/plans?currency=${currency}`,
      {},
      signal,
    );
  }

  async requestMembershipPlanChange(
    payload: MembershipChangePlanRequestDto,
  ): Promise<MembershipChangePlanResponseDto> {
    console.log(
      `🔁 [CHADBOT API] Requesting membership plan change to ${payload.targetPlanCode}`,
    );
    return this.request<MembershipChangePlanResponseDto>("membership/change-plan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMembershipFeaturePolicy(
    featureKey: string,
    signal?: AbortSignal,
  ): Promise<MembershipFeaturePolicyResponseDto> {
    console.log(
      `🧠 [CHADBOT API] Fetching membership feature policy for ${featureKey}`,
    );
    return this.request<MembershipFeaturePolicyResponseDto>(
      `membership/features/${encodeURIComponent(featureKey)}/policy`,
      {},
      signal,
    );
  }

  async updateMembershipFeaturePolicy(
    featureKey: string,
    payload: MembershipFeaturePolicyUpdateRequestDto,
  ): Promise<MembershipFeaturePolicyResponseDto> {
    console.log(
      `🧠 [CHADBOT API] Updating membership feature policy for ${featureKey} to ${payload.mode}`,
    );
    return this.request<MembershipFeaturePolicyResponseDto>(
      `membership/features/${encodeURIComponent(featureKey)}/policy`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  }

  async getBillingInvoices(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<BillingInvoiceDto[]> {
    console.log(
      `🧾 [CHADBOT API] Fetching billing invoices (page ${page}, size ${size})`,
    );
    return this.request<BillingInvoiceDto[]>(
      `billing/invoices?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  // ============================================
  // Eva Assistant
  // ============================================

  async sendEvaMessage(payload: EvaSendMessageRequest): Promise<EvaSendMessageResponse> {
    console.log("[CHADBOT API] Sending Eva message");
    return this.request<EvaSendMessageResponse>("eva/chat/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async confirmEvaAction(actionId: string): Promise<EvaConfirmActionResponse> {
    console.log(`[CHADBOT API] Confirming Eva action ${actionId}`);
    return this.request<EvaConfirmActionResponse>(`eva/actions/${actionId}/confirm`, {
      method: "POST",
    });
  }

  async cancelEvaAction(actionId: string): Promise<EvaCancelActionResponse> {
    console.log(`[CHADBOT API] Canceling Eva action ${actionId}`);
    return this.request<EvaCancelActionResponse>(`eva/actions/${actionId}/cancel`, {
      method: "POST",
    });
  }

  async getEvaSessions(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal,
  ): Promise<EvaSessionListResponse> {
    return this.request<EvaSessionListResponse>(
      `eva/chat/sessions?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  async getEvaSessionMessages(
    sessionId: string,
    page: number = 0,
    size: number = 50,
    signal?: AbortSignal,
  ): Promise<EvaSessionMessageListLike> {
    return this.request<EvaSessionMessageListLike>(
      `eva/chat/sessions/${encodeURIComponent(sessionId)}/messages?page=${page}&size=${size}`,
      {},
      signal,
    );
  }

  async getEvaUsage(signal?: AbortSignal): Promise<EvaUsageResponse> {
    return this.request<EvaUsageResponse>("eva/usage", {}, signal);
  }

  async getEvaSettings(signal?: AbortSignal): Promise<EvaSettingsResponse> {
    return this.request<EvaSettingsResponse>("eva/settings", {}, signal);
  }

  async updateEvaSettings(
    payload: EvaSettingsUpdateRequest,
  ): Promise<EvaSettingsResponse> {
    return this.request<EvaSettingsResponse>("eva/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  // ============================================
  // Dashboard
  // ============================================

  /**
   * Get dashboard statistics and recent activity
   * @returns Dashboard summary with conversation stats, token usage, and recent conversations
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    console.log("📊 [CHADBOT API] Fetching dashboard summary");
    return this.request<DashboardSummary>("dashboard/summary", {
      method: "GET",
    });
  }

  // ============================================
  // Push Notifications
  // ============================================

  async getPushPublicKey(
    signal?: AbortSignal,
  ): Promise<PushPublicKeyResponse> {
    return this.request<PushPublicKeyResponse>("push/public-key", {}, signal);
  }

  async registerPushSubscription(
    data: PushSubscriptionUpsertRequest,
  ): Promise<void> {
    await this.request<void>("push/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deletePushSubscription(
    payload: PushSubscriptionDeleteRequest,
  ): Promise<void> {
    await this.request<void>("push/subscriptions", {
      method: "DELETE",
      body: JSON.stringify(payload),
    });
  }

  async sendPresenceHeartbeat(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.request<void>(
      "realtime/presence/heartbeat",
      {
        method: "POST",
        headers: {
          "X-Presence-Session-Id": sessionId,
        },
      },
      signal,
    );
  }

  // ============================================
  // Utility Methods
  // ============================================

  getEnvironmentInfo() {
    return {
      apiUrl: this.baseUrl,
      wsUrl: config.wsUrl,
      environment: config.environment,
      environmentName: config.environmentName,
      clientId: this.clientId,
    };
  }

  getRealtimeIncomingMessagesUrl(): string {
    return `${this.baseUrl}realtime/messages/incoming`;
  }

  getRealtimeAssignmentsUrl(): string {
    return `${this.baseUrl}realtime/agents/assignments`;
  }

  getRealtimeNotificationsUrl(): string {
    return `${this.baseUrl}realtime/notifications`;
  }

  getEvaStreamUrl(sessionId: string): string {
    return `${this.baseUrl}eva/chat/stream?sessionId=${encodeURIComponent(sessionId)}`;
  }

  setToken(token: string) {
    this.token = token;
    const payload = decodeJWT(token);
    this.clientId = payload?.client_id || null;

    setAuthSession({
      accessToken: token,
    });
  }

  getToken(): string | null {
    return this.token ?? getAuthToken();
  }
}

// Singleton instance
export const apiService = new ApiService();



