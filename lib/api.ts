import { config } from "./config";
import {
  type LoginRequest,
  type LoginResponse,
  type JWTPayload,
  type Conversation,
  type ConversationListResponse,
  type ConversationDetailResponse,
  type ConversationStatus,
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
  type Tag,
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
  type UserListResponse,
  type Role,
  type AssignRolesRequest,
  type Assistant,
  type AssistantListResponse,
  type GetAssistantsParams,
  type CreateAssistantRequest,
  type UpdateAssistantRequest,
  type Team,
  type TeamListResponse,
  ApiError,
} from "./api-types";

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
        .join("")
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

  constructor() {
    this.baseUrl = config.apiUrl;
    this.token =
      typeof window !== "undefined"
        ? localStorage.getItem("chadbot_token")
        : null;

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
    signal?: AbortSignal
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      defaultHeaders.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      signal,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Manejar 401 Unauthorized
      if (response.status === 401) {
        this.handleUnauthorized();
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

  private handleUnauthorized() {
    // Limpiar credenciales
    this.token = null;
    this.clientId = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("chadbot_token");
      localStorage.removeItem("chadbot_user");

      // Redirigir al login
      window.location.href = "/login";
    }
  }

  // ============================================
  // Authentication
  // ============================================

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log(
      "🔐 [CHADBOT API] Login request to:",
      `${this.baseUrl}auth/login`
    );
    console.log(
      "📤 [CHADBOT API] Request body:",
      JSON.stringify(credentials, null, 2)
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

      if (typeof window !== "undefined") {
        localStorage.setItem("chadbot_token", response.accessToken);

        // Extraer datos del usuario del JWT
        if (payload) {
          const user = {
            id: payload.sub,
            email: payload.email,
            roles: Array.isArray(payload.roles)
              ? payload.roles
              : [payload.roles],
          };
          localStorage.setItem("chadbot_user", JSON.stringify(user));
        }
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.clientId = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("chadbot_token");
      localStorage.removeItem("chadbot_user");
      console.log("👋 [CHADBOT API] Logged out");
    }
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

  async getConversations(
    page: number = 0,
    size: number = 20,
    status?: ConversationStatus,
    messagingServiceType?: MessagingServiceType,
    fetchContactInfo: boolean = true,
    signal?: AbortSignal
  ): Promise<ConversationListResponse> {
    let url = `conversations?page=${page}&size=${size}&fetchContactInfo=${fetchContactInfo}`;
    if (status) {
      url += `&status=${status}`;
    }
    if (messagingServiceType) {
      url += `&messagingServiceType=${messagingServiceType}`;
    }

    console.log(`📋 [CHADBOT API] Fetching conversations: ${url}`);
    return this.request<ConversationListResponse>(url, {}, signal);
  }

  async getConversationById(id: string, signal?: AbortSignal): Promise<ConversationDetailResponse> {
    console.log(`🔍 [CHADBOT API] Fetching conversation: ${id}`);
    return this.request<ConversationDetailResponse>(`conversations/${id}`, {}, signal);
  }

  /**
   * Create a new conversation.
   * Note: Write operations do not support cancellation to prevent interrupting transactions.
   */
  async createConversation(
    data: CreateConversationRequest
  ): Promise<Conversation> {
    console.log(`➕ [CHADBOT API] Creating conversation`);
    return this.request<Conversation>("conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async assignConversation(
    conversationId: string,
    data: AssignConversationRequest
  ): Promise<Conversation> {
    console.log(
      `👤 [CHADBOT API] Assigning conversation ${conversationId} to agent ${data.agentId}`
    );
    return this.request<Conversation>(
      `conversations/${conversationId}/assign`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async changeConversationStatus(
    conversationId: string,
    data: ChangeConversationStatusRequest
  ): Promise<Conversation> {
    console.log(
      `🔄 [CHADBOT API] Changing conversation ${conversationId} status to ${data.status}`
    );
    return this.request<Conversation>(
      `conversations/${conversationId}/status`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  // ============================================
  // Messages
  // ============================================

  async getMessages(
    conversationId: string,
    page: number = 0,
    size: number = 50,
    signal?: AbortSignal
  ): Promise<MessageListResponse> {
    console.log(
      `💬 [CHADBOT API] Fetching messages for conversation ${conversationId}`
    );
    return this.request<MessageListResponse>(
      `messages?conversationId=${conversationId}&page=${page}&size=${size}`,
      {},
      signal
    );
  }

  /**
   * Send a message to a conversation.
   * Note: Write operations do not support cancellation to prevent interrupting transactions.
   */
  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    console.log(
      `📤 [CHADBOT API] Sending message to conversation ${data.conversationId}`
    );
    return this.request<SendMessageResponse>("messages/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendImage(data: SendImageRequest): Promise<SendMessageResponse> {
    console.log(
      `🖼️ [CHADBOT API] Sending image to conversation ${data.conversationId}`
    );
    return this.request<SendMessageResponse>("messages/image", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Agents
  // ============================================

  async getAgents(onlineOnly?: boolean, signal?: AbortSignal): Promise<AgentListResponse> {
    let url = "agents";
    if (onlineOnly !== undefined) {
      url += `?onlineOnly=${onlineOnly}`;
    }

    console.log(`👥 [CHADBOT API] Fetching agents`);
    return this.request<AgentListResponse>(url, {}, signal);
  }

  async updateAgentStatus(
    agentId: string,
    data: AgentStatusRequest
  ): Promise<Agent> {
    console.log(
      `🟢 [CHADBOT API] Updating agent ${agentId} status to ${
        data.online ? "online" : "offline"
      }`
    );
    return this.request<Agent>(`agents/${agentId}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Tags
  // ============================================

  async getTags(signal?: AbortSignal): Promise<Tag[]> {
    console.log(`🏷️ [CHADBOT API] Fetching tags`);
    return this.request<Tag[]>("tags", {}, signal);
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
    tagId: string
  ): Promise<void> {
    console.log(
      `🏷️ [CHADBOT API] Assigning tag ${tagId} to conversation ${conversationId}`
    );
    return this.request<void>(`conversations/${conversationId}/tags/${tagId}`, {
      method: "POST",
    });
  }

  async removeTagFromConversation(
    conversationId: string,
    tagId: string
  ): Promise<void> {
    console.log(
      `🏷️ [CHADBOT API] Removing tag ${tagId} from conversation ${conversationId}`
    );
    return this.request<void>(`conversations/${conversationId}/tags/${tagId}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // Channels / Credentials
  // ============================================

  async getActiveChannels(signal?: AbortSignal): Promise<ActiveChannelResponseDto[]> {
    console.log("📡 [CHADBOT API] Fetching active channels");
    return this.request<ActiveChannelResponseDto[]>("credentials/channels", {}, signal);
  }

  // ============================================
  // Contact Management
  // ============================================

  async getContacts(
    page: number = 0,
    size: number = 20,
    search?: string,
    signal?: AbortSignal
  ): Promise<ContactListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    console.log(`📇 [CHADBOT API] Fetching contacts (page ${page}, size ${size}${search ? `, search: ${search}` : ''})`);
    return this.request<ContactListResponse>(`contacts?${params.toString()}`, {}, signal);
  }

  async getContactById(contactId: string, signal?: AbortSignal): Promise<Contact> {
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
    contactData: ContactUpdateRequest
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
    signal?: AbortSignal
  ): Promise<UserListResponse> {
    console.log(`👥 [CHADBOT API] Fetching users (page ${page}, size ${size})`);
    return this.request<UserListResponse>(`users?page=${page}&size=${size}`, {}, signal);
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
    userData: UserUpdateRequest
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
    signal?: AbortSignal
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
      `🤖 [CHADBOT API] Fetching assistants with params: ${queryParams.toString()}`
    );
    return this.request<AssistantListResponse>(
      `assistants?${queryParams.toString()}`,
      {},
      signal
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
    data: UpdateAssistantRequest
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
    signal?: AbortSignal
  ): Promise<TeamListResponse> {
    console.log(`👥 [CHADBOT API] Fetching teams (page ${page}, size ${size})`);
    return this.request<TeamListResponse>(`teams?page=${page}&size=${size}`, {}, signal);
  }

  // ============================================
  // Current User / Settings
  // ============================================

  async getCurrentUser(signal?: AbortSignal): Promise<import("./api-types").CurrentUserResponse> {
    console.log("👤 [CHADBOT API] Fetching current user info");
    return this.request<import("./api-types").CurrentUserResponse>("auth/me", {}, signal);
  }

  // ============================================
  // Messaging Credentials
  // ============================================

  async getMessagingServices(signal?: AbortSignal): Promise<
    import("./api-types").ServiceTypeDto[]
  > {
    console.log("📱 [CHADBOT API] Fetching messaging service types");
    return this.request<import("./api-types").ServiceTypeDto[]>(
      "credentials/messaging/services",
      {},
      signal
    );
  }

  async getMessagingCredentials(
    page: number = 0,
    size: number = 20,
    includeInactive: boolean = true,
    signal?: AbortSignal
  ): Promise<import("./api-types").MessagingCredentialsListResponse> {
    console.log(
      `🔑 [CHADBOT API] Fetching messaging credentials (page ${page}, size ${size})`
    );
    return this.request<import("./api-types").MessagingCredentialsListResponse>(
      `credentials/messaging?page=${page}&size=${size}&includeInactive=${includeInactive}`,
      {},
      signal
    );
  }

  async createMessagingCredential(
    data: import("./api-types").CreateMessagingCredentialRequest
  ): Promise<import("./api-types").MessagingCredentialDto> {
    console.log("➕ [CHADBOT API] Creating messaging credential:", data.name);
    return this.request<import("./api-types").MessagingCredentialDto>(
      "credentials/messaging",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateMessagingCredential(
    id: string,
    data: import("./api-types").UpdateMessagingCredentialRequest
  ): Promise<import("./api-types").MessagingCredentialDto> {
    console.log("✏️ [CHADBOT API] Updating messaging credential:", id);
    return this.request<import("./api-types").MessagingCredentialDto>(
      `credentials/messaging/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
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

  async getAiServices(signal?: AbortSignal): Promise<import("./api-types").ServiceTypeDto[]> {
    console.log("🤖 [CHADBOT API] Fetching AI service types");
    return this.request<import("./api-types").ServiceTypeDto[]>(
      "credentials/ai/services",
      {},
      signal
    );
  }

  async getAiCredentials(
    page: number = 0,
    size: number = 20,
    includeInactive: boolean = true,
    signal?: AbortSignal
  ): Promise<import("./api-types").AiCredentialsListResponse> {
    console.log(
      `🔑 [CHADBOT API] Fetching AI credentials (page ${page}, size ${size})`
    );
    return this.request<import("./api-types").AiCredentialsListResponse>(
      `credentials/ai?page=${page}&size=${size}&includeInactive=${includeInactive}`,
      {},
      signal
    );
  }

  async createAiCredential(
    data: import("./api-types").CreateAiCredentialRequest
  ): Promise<import("./api-types").AiCredentialDto> {
    console.log("➕ [CHADBOT API] Creating AI credential:", data.name);
    return this.request<import("./api-types").AiCredentialDto>(
      "credentials/ai",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateAiCredential(
    id: string,
    data: import("./api-types").UpdateAiCredentialRequest
  ): Promise<import("./api-types").AiCredentialDto> {
    console.log("✏️ [CHADBOT API] Updating AI credential:", id);
    return this.request<import("./api-types").AiCredentialDto>(
      `credentials/ai/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteAiCredential(id: string): Promise<void> {
    console.log("🗑️ [CHADBOT API] Deleting AI credential:", id);
    return this.request<void>(`credentials/ai/${id}`, {
      method: "DELETE",
    });
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

  setToken(token: string) {
    this.token = token;
    const payload = decodeJWT(token);
    this.clientId = payload?.client_id || null;

    if (typeof window !== "undefined") {
      localStorage.setItem("chadbot_token", token);
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

// Singleton instance
export const apiService = new ApiService();
