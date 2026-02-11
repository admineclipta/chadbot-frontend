# Chadbot Backend - API Reference for Frontend AI Agent

**Backend Version:** Java 21 + Spring Boot 3.5+ WebFlux (Reactive)  
**Architecture:** Hexagonal Architecture + Multi-Tenant  
**Base URL:** `/api/v1`  
**Auth:** JWT Bearer Token in `Authorization` header

---

## 🏗️ Architecture Overview

### Tech Stack

- **Reactive:** Spring WebFlux + R2DBC (PostgreSQL)
- **Pattern:** Ports & Adapters (Hexagonal)
- **Layers:** Domain → Application → Infrastructure
- **Multi-Tenant:** Every endpoint validates `client_id` for data isolation

### Key Concepts

- **Multi-Channel:** WhatsApp + Telegram integrations
- **AI Assistants:** OpenAI GPT-4 + Google Gemini
- **Conversation States:** ACTIVE (AI-handled) → INTERVENED (human agent) → NO_ANSWER → CLOSED
- **Real-time:** WebSocket events for messages/conversations

### Data Models

- **Client:** Tenant (isolation boundary)
- **User:** Internal staff with roles/permissions
- **Agent:** Users who handle conversations
- **Team:** Groups of agents
- **Contact:** External prospects (WhatsApp/Telegram IDs)
- **Conversation:** Chat thread with state machine
- **Message:** Polymorphic (TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT, TEMPLATE, STICKER, LOCATION)
- **Assistant:** AI config (system prompts, model, temperature)
- **Credential:** API keys for WhatsApp/Telegram/OpenAI/Gemini

---

## 🔐 Authentication & Permissions

### Public Endpoints (No Auth Required)

```
POST /api/v1/auth/login
POST /api/v1/auth/reset-password/{token}
```

### Auth Flow

1. **Login:** `POST /api/v1/auth/login` → Returns JWT token
2. **Attach Token:** All requests must include `Authorization: Bearer <token>`
3. **Get Current User:** `GET /api/v1/auth/me`

### Permission Model

Every endpoint requires specific permissions (enforced via `@PreAuthorize`). See [Permission Summary](#-permission-summary) below.

---

## 📋 API Endpoints

### 1️⃣ Authentication (`/auth`)

| Method | Endpoint                  | Request             | Response          | Auth |
| ------ | ------------------------- | ------------------- | ----------------- | ---- |
| POST   | `/login`                  | `{email, password}` | `{token, user}`   | ❌   |
| GET    | `/me`                     | -                   | `UserResponseDto` | ✅   |
| POST   | `/reset-password/{token}` | `{newPassword}`     | 204               | ❌   |

---

### 2️⃣ Users (`/users`)

**Permissions:** `view_users`, `manage_users`

| Method | Endpoint               | Request                                             | Response                           |
| ------ | ---------------------- | --------------------------------------------------- | ---------------------------------- |
| GET    | `/`                    | `page, size, search, roleId, sortBy, sortDirection` | `PageResponseDto<UserResponseDto>` |
| GET    | `/{id}`                | -                                                   | `UserResponseDto`                  |
| POST   | `/`                    | `CreateUserDto`                                     | `UserResponseDto` (201)            |
| PUT    | `/{id}`                | `UpdateUserDto`                                     | `UserResponseDto`                  |
| DELETE | `/{id}`                | -                                                   | 204                                |
| POST   | `/{id}/reset-password` | -                                                   | `ResetTokenResponseDto` (201)      |
| PUT    | `/change-password`     | `{oldPassword, newPassword}`                        | 204                                |

**DTOs:**

- `CreateUserDto`: email, firstName, lastName, password, roleId
- `UpdateUserDto`: firstName, lastName, roleId, isActive
- `UserResponseDto`: id, email, firstName, lastName, role, agent, createdAt, updatedAt

---

### 3️⃣ Roles (`/roles`)

**Permissions:** `view_roles`  
**Note:** Roles are system-global, not per-tenant.

| Method | Endpoint       | Request                                     | Response                           |
| ------ | -------------- | ------------------------------------------- | ---------------------------------- |
| GET    | `/`            | `page, size, search, sortBy, sortDirection` | `PageResponseDto<RoleResponseDto>` |
| GET    | `/{id}`        | -                                           | `RoleResponseDto`                  |
| GET    | `/code/{code}` | -                                           | `RoleResponseDto`                  |

**DTOs:**

- `RoleResponseDto`: id, code, name, description, permissions[]

---

### 4️⃣ Teams (`/teams`)

**Permissions:** `view_teams`, `manage_teams`

| Method | Endpoint                      | Request              | Response                           |
| ------ | ----------------------------- | -------------------- | ---------------------------------- |
| GET    | `/`                           | `page, size`         | `PageResponseDto<TeamResponseDto>` |
| GET    | `/{id}`                       | -                    | `TeamResponseDto`                  |
| POST   | `/`                           | `CreateTeamDto`      | `TeamResponseDto` (201)            |
| PUT    | `/{id}`                       | `UpdateTeamDto`      | `TeamResponseDto`                  |
| DELETE | `/{id}`                       | -                    | 204                                |
| PATCH  | `/{id}/activate`              | -                    | `TeamResponseDto`                  |
| PATCH  | `/{id}/deactivate`            | -                    | `TeamResponseDto`                  |
| GET    | `/{teamId}/members`           | -                    | `List<AgentResponseDto>`           |
| POST   | `/{teamId}/members`           | `{agentIds: UUID[]}` | `TeamResponseDto` (201)            |
| DELETE | `/{teamId}/members/{agentId}` | -                    | 204                                |

**DTOs:**

- `CreateTeamDto`: name, description
- `TeamResponseDto`: id, name, description, isActive, clientId, members[]

---

### 5️⃣ Clients (`/clients`)

**Permissions:** `view_clients`, `manage_client`  
**Note:** Super-admin functionality for managing tenants.

| Method | Endpoint | Request                                     | Response                             |
| ------ | -------- | ------------------------------------------- | ------------------------------------ |
| GET    | `/`      | `page, size, search, sortBy, sortDirection` | `PageResponseDto<ClientResponseDto>` |
| GET    | `/{id}`  | -                                           | `ClientResponseDto`                  |
| POST   | `/`      | `CreateClientDto`                           | `ClientResponseDto` (201)            |
| PUT    | `/{id}`  | `UpdateClientDto`                           | `ClientResponseDto`                  |
| DELETE | `/{id}`  | -                                           | 204                                  |

**DTOs:**

- `CreateClientDto`: name, taxId
- `ClientResponseDto`: id, name, taxId, createdAt, updatedAt

---

### 6️⃣ Credentials (`/credentials`)

**Permissions:** `view_credentials`, `manage_credentials`

#### AI Credentials

| Method | Endpoint       | Request                       | Response                                   |
| ------ | -------------- | ----------------------------- | ------------------------------------------ |
| GET    | `/ai/services` | -                             | `List<AiService>` (OPENAI, GEMINI)         |
| GET    | `/ai`          | `page, size, includeInactive` | `PageResponseDto<AiCredentialResponseDto>` |
| GET    | `/ai/{id}`     | -                             | `AiCredentialResponseDto`                  |
| POST   | `/ai`          | `CreateAiCredentialDto`       | `AiCredentialResponseDto` (201)            |
| PUT    | `/ai/{id}`     | `UpdateAiCredentialDto`       | `AiCredentialResponseDto`                  |
| DELETE | `/ai/{id}`     | -                             | 204                                        |

**DTOs:**

- `CreateAiCredentialDto`: name, apiKey, aiService, model, isActive
- `AiCredentialResponseDto`: id, name, aiService, model, isActive, clientId

#### Messaging Credentials

| Method | Endpoint              | Request                        | Response                                          |
| ------ | --------------------- | ------------------------------ | ------------------------------------------------- |
| GET    | `/messaging/services` | -                              | `List<MessagingServiceType>` (WHATSAPP, TELEGRAM) |
| GET    | `/messaging`          | `page, size, includeInactive`  | `PageResponseDto<MessagingCredentialResponseDto>` |
| GET    | `/messaging/{id}`     | -                              | `MessagingCredentialResponseDto`                  |
| POST   | `/messaging`          | `CreateMessagingCredentialDto` | `MessagingCredentialResponseDto` (201)            |
| PUT    | `/messaging/{id}`     | `UpdateMessagingCredentialDto` | `MessagingCredentialResponseDto`                  |
| DELETE | `/messaging/{id}`     | -                              | 204                                               |

**DTOs:**

- `CreateMessagingCredentialDto`: name, messagingServiceType, credentials (JSON), webhookUrl, isActive
- `MessagingCredentialResponseDto`: id, name, messagingServiceType, webhookUrl, isActive

---

### 7️⃣ Agents (`/agents`)

**Permissions:** `view_agents`, `manage_agents`

#### Work Schedules

| Method | Endpoint                    | Request                 | Response                        |
| ------ | --------------------------- | ----------------------- | ------------------------------- |
| GET    | `/{agentId}/work-schedules` | -                       | `List<WorkScheduleResponseDto>` |
| POST   | `/{agentId}/work-schedules` | `CreateWorkScheduleDto` | `WorkScheduleResponseDto` (201) |
| PUT    | `/work-schedules/{id}`      | `UpdateWorkScheduleDto` | `WorkScheduleResponseDto`       |
| DELETE | `/work-schedules/{id}`      | -                       | 204                             |

**DTOs:**

- `CreateWorkScheduleDto`: dayOfWeek (1-7), startTime, endTime
- `WorkScheduleResponseDto`: id, agentId, dayOfWeek, startTime, endTime

#### Unavailabilities

| Method | Endpoint                      | Request                   | Response                          |
| ------ | ----------------------------- | ------------------------- | --------------------------------- |
| GET    | `/{agentId}/unavailabilities` | -                         | `List<UnavailabilityResponseDto>` |
| POST   | `/{agentId}/unavailabilities` | `CreateUnavailabilityDto` | `UnavailabilityResponseDto` (201) |
| PUT    | `/unavailabilities/{id}`      | `UpdateUnavailabilityDto` | `UnavailabilityResponseDto`       |
| DELETE | `/unavailabilities/{id}`      | -                         | 204                               |

**DTOs:**

- `CreateUnavailabilityDto`: startDateTime, endDateTime, reason
- `UnavailabilityResponseDto`: id, agentId, startDateTime, endDateTime, reason

---

### 8️⃣ Assistants (`/assistants`)

**Permissions:** `view_assistants`, `manage_assistants`

| Method | Endpoint        | Request                                                                                                      | Response                                |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| GET    | `/`             | `page, size, messagingCredentialId, isDefault, messagingServiceType, includeInactive, sortBy, sortDirection` | `PageResponseDto<AssistantResponseDto>` |
| GET    | `/default`      | -                                                                                                            | `AssistantResponseDto`                  |
| GET    | `/{id}`         | -                                                                                                            | `AssistantResponseDto`                  |
| POST   | `/`             | `CreateAssistantDto`                                                                                         | `AssistantResponseDto` (201)            |
| PUT    | `/{id}/default` | -                                                                                                            | `AssistantResponseDto`                  |
| PUT    | `/{id}`         | `UpdateAssistantDto`                                                                                         | `AssistantResponseDto`                  |
| DELETE | `/{id}`         | -                                                                                                            | 204                                     |

**DTOs:**

- `CreateAssistantDto`: name, description, systemPrompt, aiCredentialId, teamId, messagingCredentialId, isDefault, isActive
- `AssistantResponseDto`: id, name, description, systemPrompt, aiCredential, team, messagingCredential, isDefault, isActive

---

### 9️⃣ Contacts (`/contacts`)

**Permissions:** `view_contacts`, `manage_contacts`

| Method | Endpoint | Request              | Response                              |
| ------ | -------- | -------------------- | ------------------------------------- |
| GET    | `/`      | `page, size, search` | `PageResponseDto<ContactResponseDto>` |
| GET    | `/{id}`  | -                    | `ContactResponseDto`                  |
| POST   | `/`      | `CreateContactDto`   | `ContactResponseDto` (201)            |
| PUT    | `/{id}`  | `UpdateContactDto`   | `ContactResponseDto`                  |

**DTOs:**

- `CreateContactDto`: fullName, externalContactId, messagingServiceType
- `ContactResponseDto`: id, fullName, externalContactId, messagingServiceType, clientId, createdAt, updatedAt

---

### 🔟 Conversations (`/conversations`)

**Permissions:** `view_conversations`, `manage_conversations`

| Method | Endpoint                     | Request                                                                                            | Response                                   |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| GET    | `/`                          | `page, size, status, agentId, teamId, tagIds, messagingServiceType, search, sortBy, sortDirection` | `PageResponseDto<ConversationResponseDto>` |
| GET    | `/{id}`                      | -                                                                                                  | `ConversationResponseDto`                  |
| PUT    | `/{id}/status`               | `{status}`                                                                                         | `ConversationResponseDto`                  |
| PUT    | `/{id}/team`                 | `{teamId}`                                                                                         | `ConversationResponseDto`                  |
| PUT    | `/{id}/agents`               | `{agentIds: UUID[]}`                                                                               | `ConversationResponseDto`                  |
| PUT    | `/{id}/tags`                 | `{tagIds: UUID[]}`                                                                                 | `ConversationResponseDto`                  |
| GET    | `/{conversationId}/messages` | `page, size, sortBy, sortDirection`                                                                | `PageResponseDto<MessageResponseDto>`      |

**Filters:**

- `status`: active, intervened, closed, no_answer
- `tagIds`: OR behavior (matches ANY tag)
- `search`: Searches contact name and external contact ID
- `sortBy`: createdAt, updatedAt, status, contactName
- `sortDirection`: ASC, DESC

**DTOs:**

- `ConversationResponseDto`: id, contact, assistant, team, agents[], tags[], status, lastMessageAt, unreadCount, createdAt, updatedAt
- `MessageResponseDto`: id, conversationId, type, text, mediaUrl, status, direction, sender, createdAt

---

### 1️⃣1️⃣ Conversation Notes (`/conversations/{conversationId}/notes`)

**Permissions:** `view_conversations`, `manage_conversations`

| Method | Endpoint                  | Request      | Response                           |
| ------ | ------------------------- | ------------ | ---------------------------------- |
| GET    | `/{conversationId}/notes` | `page, size` | `PageResponseDto<NoteResponseDto>` |
| POST   | `/{conversationId}/notes` | `{content}`  | `NoteResponseDto` (201)            |
| PUT    | `/notes/{id}`             | `{content}`  | `NoteResponseDto`                  |
| DELETE | `/notes/{id}`             | -            | 204                                |

**DTOs:**

- `NoteResponseDto`: id, conversationId, content, author, createdAt, updatedAt

---

### 1️⃣2️⃣ Messages (`/messages`)

**Permission:** `send_messages`

| Method | Endpoint | Request                 | Response                 |
| ------ | -------- | ----------------------- | ------------------------ |
| POST   | `/send`  | `SendMessageRequestDto` | `SendMessageResponseDto` |

**Request Types:**

```json
// Text Message
{
  "conversationId": "uuid",
  "type": "text",
  "text": "Hello!"
}

// Image Message
{
  "conversationId": "uuid",
  "type": "image",
  "url": "https://...",
  "caption": "Optional caption"
}

// WhatsApp Template
{
  "conversationId": "uuid",
  "type": "template_whatsapp",
  "templateName": "hello_world",
  "languageCode": "en",
  "components": [...],
  "text": "Fallback text"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Message sent successfully",
  "messageId": "uuid",
  "error": null
}
```

---

### 1️⃣3️⃣ Templates (`/templates`)

**Permission:** `view_credentials`

| Method | Endpoint                      | Request                    | Response                               |
| ------ | ----------------------------- | -------------------------- | -------------------------------------- |
| GET    | `/credentials/{credentialId}` | `templateName, page, size` | `PageResponseDto<TemplateResponseDto>` |

**DTOs:**

- `TemplateResponseDto`: id, name, language, status, category, components (header, body, footer, buttons)

---

### 1️⃣4️⃣ Broadcast (`/broadcast`)

**Permission:** `send_messages`

| Method | Endpoint | Request                      | Response |
| ------ | -------- | ---------------------------- | -------- |
| POST   | `/send`  | `BroadcastMessageRequestDto` | 200 OK   |

**Request:**

```json
{
  "messagingCredentialId": "uuid",
  "recipients": ["whatsapp_id_1", "whatsapp_id_2"],
  "type": "text",
  "text": "Broadcast message"
}
```

---

### 1️⃣5️⃣ Auto Messages (`/inactivity-auto-messages`)

**Permissions:** `view_auto_messages`, `manage_auto_messages`

| Method | Endpoint  | Request                          | Response                                            |
| ------ | --------- | -------------------------------- | --------------------------------------------------- |
| GET    | `/`       | `page, size`                     | `PageResponseDto<InactivityAutoMessageResponseDto>` |
| GET    | `/active` | `page, size`                     | `PageResponseDto<InactivityAutoMessageResponseDto>` |
| GET    | `/{id}`   | -                                | `InactivityAutoMessageResponseDto`                  |
| POST   | `/`       | `CreateInactivityAutoMessageDto` | `InactivityAutoMessageResponseDto` (201)            |
| PUT    | `/{id}`   | `UpdateInactivityAutoMessageDto` | `InactivityAutoMessageResponseDto`                  |
| DELETE | `/{id}`   | -                                | 204                                                 |

**DTOs:**

- `CreateInactivityAutoMessageDto`: triggerAfterHours, messageContent, isActive
- `InactivityAutoMessageResponseDto`: id, triggerAfterHours, messageContent, isActive, clientId

---

### 1️⃣6️⃣ Tags (`/tags`)

**Permissions:** `view_tags`, `manage_tags`

| Method | Endpoint | Request        | Response                          |
| ------ | -------- | -------------- | --------------------------------- |
| GET    | `/`      | `page, size`   | `PageResponseDto<TagResponseDto>` |
| GET    | `/{id}`  | -              | `TagResponseDto`                  |
| POST   | `/`      | `CreateTagDto` | `TagResponseDto` (201)            |
| PUT    | `/{id}`  | `UpdateTagDto` | `TagResponseDto`                  |
| DELETE | `/{id}`  | -              | 204                               |

**DTOs:**

- `CreateTagDto`: name, color
- `TagResponseDto`: id, name, color, agentId, clientId

---

## 🔑 Permission Summary

| Permission             | Endpoints                                                   |
| ---------------------- | ----------------------------------------------------------- |
| `view_users`           | GET /users, /users/{id}                                     |
| `manage_users`         | POST/PUT/DELETE /users                                      |
| `view_roles`           | GET /roles                                                  |
| `view_teams`           | GET /teams                                                  |
| `manage_teams`         | POST/PUT/DELETE/PATCH /teams                                |
| `view_clients`         | GET /clients                                                |
| `manage_client`        | POST/PUT/DELETE /clients                                    |
| `view_credentials`     | GET /credentials, /templates                                |
| `manage_credentials`   | POST/PUT/DELETE /credentials                                |
| `view_agents`          | GET /agents                                                 |
| `manage_agents`        | POST/PUT/DELETE /agents (schedules, unavailabilities)       |
| `view_assistants`      | GET /assistants                                             |
| `manage_assistants`    | POST/PUT/DELETE /assistants                                 |
| `view_contacts`        | GET /contacts                                               |
| `manage_contacts`      | POST/PUT /contacts                                          |
| `view_conversations`   | GET /conversations, /conversations/{id}/messages            |
| `manage_conversations` | PUT /conversations (status, team, agents, tags), Notes CRUD |
| `send_messages`        | POST /messages/send, /broadcast/send                        |
| `view_auto_messages`   | GET /inactivity-auto-messages                               |
| `manage_auto_messages` | POST/PUT/DELETE /inactivity-auto-messages                   |
| `view_tags`            | GET /tags                                                   |
| `manage_tags`          | POST/PUT/DELETE /tags                                       |

---

## 📡 WebSocket Events (Real-time)

**Connection:** Requires JWT token  
**Topics:**

- `/topic/conversations/{conversationId}` - Message events
- `/topic/conversations` - Conversation state updates

**Event Types:**

- `message.received` - New incoming message
- `message.sent` - Outgoing message sent
- `message.delivered` - Message delivered
- `message.read` - Message read by recipient
- `conversation.status_changed` - Status update (ACTIVE → INTERVENED → CLOSED)
- `conversation.agent_assigned` - Agent assignment
- `conversation.team_updated` - Team change

---

## 📊 Common Response Patterns

### Pagination Response

```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 145,
  "totalPages": 8,
  "first": true,
  "last": false
}
```

### Error Response

```json
{
  "timestamp": "2026-01-18T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "path": "/api/v1/users"
}
```

### Success with Data

```json
{
  "id": "uuid",
  "name": "Resource name",
  "createdAt": "2026-01-18T10:30:00Z",
  "updatedAt": "2026-01-18T10:30:00Z"
}
```

---

## 🚨 Important Notes for AI Agent

1. **Multi-Tenant:** ALWAYS use `client_id` from JWT. Never access data from other tenants.

2. **Reactive Responses:** All endpoints return `Mono<T>` or `Flux<T>`. Frontend should handle async responses.

3. **Status Codes:**
   - 200 OK - Success
   - 201 Created - Resource created
   - 204 No Content - Deletion success
   - 400 Bad Request - Validation error
   - 401 Unauthorized - No/invalid token
   - 403 Forbidden - Insufficient permissions
   - 404 Not Found - Resource not found
   - 500 Internal Server Error

4. **Conversation State Machine:**
   - **ACTIVE** - AI handles conversation
   - **INTERVENED** - Human agent took over
   - **NO_ANSWER** - Contact not responding
   - **CLOSED** - Conversation finished

5. **Message Types:** TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT, TEMPLATE, STICKER, LOCATION

6. **AI Workflow:**
   - Prospect messages → Webhook → AI processes → Checks `derivar` field
   - If `derivar: true` → Agent assigned → State changes to INTERVENED

7. **Pagination Defaults:** `page=0`, `size=20` (max 100 for contacts)

8. **Sort Defaults:** Usually `createdAt DESC` or `updatedAt DESC`

9. **Search:** Partial matches on name/email/externalContactId

10. **UUID Format:** All IDs are UUIDs v4

---

**Last Updated:** 2026-01-18  
**API Version:** v1  
**Backend:** Java 21 + Spring Boot 3.5+ WebFlux
