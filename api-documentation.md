# 📱 CHADBOT API - Resumen Corregido para Frontend

## 🎯 Propósito

Sistema multi-canal (WhatsApp/Telegram) con IA que automatiza conversaciones de ventas. Prospectos escriben → IA responde → Cuando están listos → Agente humano cierra.

---

## 🔐 Autenticación

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "pass123"
}
```

**Respuesta Real:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400000,
  "tokenType": "Bearer"
}
```

⚠️ **NO devuelve datos del usuario en el login**. Para obtener info del usuario:

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Usar token en todos los requests:**

```
Authorization: Bearer <accessToken>
```

---

## 📊 DTOs Reales (Respuestas de la API)

### ConversationResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "contactId": "uuid",
  "assignedAgentId": "uuid" | null,
  "assignedTeamId": "uuid" | null,
  "assistantId": "uuid" | null,
  "status": "ACTIVE | INTERVENED | NO_ANSWER | CLOSED",
  "subject": "string" | null,
  "createdAt": "2025-12-27T10:30:00Z",
  "updatedAt": "2025-12-27T10:35:00Z",
  "closedAt": "2025-12-27T11:00:00Z" | null
}
```

### MessageResponseDto

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderType": "CONTACT | AGENT | SYSTEM",
  "senderId": "uuid",
  "messageType": "TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT | TEMPLATE | STICKER | LOCATION",
  "textContent": "Contenido del mensaje",
  "status": "SENT | DELIVERED | READ | FAILED",
  "createdAt": "2025-12-27T10:30:00Z",
  "updatedAt": "2025-12-27T10:30:05Z"
}
```

⚠️ **No incluye `mediaUrl` ni `senderName` directamente en MessageResponseDto**

### ContactResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "fullName": "Juan Pérez",
  "email": "juan@email.com" | null,
  "phone": "+5215512345678",
  "customFields": { "ciudad": "CDMX", "empresa": "ABC" },
  "createdAt": "2025-12-27T10:00:00Z",
  "updatedAt": "2025-12-27T10:05:00Z"
}
```

⚠️ **Campo es `fullName`, no `name`; `phone` no `phoneNumber`**

### AgentResponseDto

```json
{
  "id": "uuid",
  "userId": "uuid",
  "clientId": "uuid",
  "displayName": "María López",
  "active": true,
  "createdAt": "2025-12-27T09:00:00Z"
}
```

⚠️ **No incluye campo `online` en el DTO básico**

### TagResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "name": "Urgente",
  "color": "#FF0000",
  "createdAt": "2025-12-27T09:00:00Z"
}
```

### ConversationTagResponseDto

```json
{
  "conversationId": "uuid",
  "tagId": "uuid",
  "tagName": "Urgente",
  "tagColor": "#FF0000",
  "appliedByAgentId": "uuid",
  "appliedByAgentName": "Juan Pérez",
  "createdAt": "2025-12-27T10:00:00Z"
}
```

### TeamResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "name": "Equipo Ventas",
  "description": "Equipo principal de ventas",
  "createdAt": "2025-12-27T09:00:00Z",
  "updatedAt": "2025-12-27T09:00:00Z"
}
```

### TeamMemberResponseDto

```json
{
  "teamId": "uuid",
  "agentId": "uuid",
  "agentName": "María López",
  "agentEmail": "maria@empresa.com"
}
```

### AssistantResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "aiCredentialId": "uuid",
  "name": "Asistente Ventas Internet",
  "description": "Asistente especializado en ventas de planes de internet",
  "systemPrompt": "Eres un asistente especializado en...",
  "isDefault": true,
  "isActive": true,
  "createdAt": "2025-12-27T09:00:00Z",
  "updatedAt": "2025-12-27T09:00:00Z"
}
```

### AiCredentialResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "aiProviderType": "OPENAI | GEMINI",
  "model": "gpt-4",
  "temperature": 0.7,
  "createdAt": "2025-12-27T09:00:00Z"
}
```

⚠️ **No expone `apiKey` por seguridad**

### MessagingCredentialResponseDto

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "messagingServiceType": "WHATSAPP | TELEGRAM",
  "phoneNumberId": "1234567890",
  "businessAccountId": "9876543210",
  "createdAt": "2025-12-27T09:00:00Z"
}
```

⚠️ **No expone `accessToken` ni `webhookVerifyToken` por seguridad**

### ActiveChannelResponseDto

```json
{
  "serviceType": "WHATSAPP",
  "displayName": "WhatsApp Business",
  "hasCredentials": true
}
```

### PageResponseDto<T>

```json
{
  "content": [
    /* array de objetos */
  ],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8,
  "first": true,
  "last": false
}
```

---

## 🔌 Endpoints Reales

### 📋 Conversaciones

```http
GET /api/v1/conversations?page=0&size=20&status=ACTIVE
→ PageResponseDto<ConversationResponseDto>

GET /api/v1/conversations/{id}
→ ConversationResponseDto

POST /api/v1/conversations
Body: ConversationRequestDto
→ ConversationResponseDto (201)

PUT /api/v1/conversations/{id}/status
Body: { "status": "CLOSED" }
→ ConversationResponseDto

POST /api/v1/conversations/{id}/agents?agentId={uuid}
→ ConversationResponseDto (asigna agente)

POST /api/v1/conversations/{id}/close
→ ConversationResponseDto
```

### 💬 Mensajes

```http
GET /api/v1/messages?conversationId={uuid}&page=0&size=50
→ PageResponseDto<MessageResponseDto>

POST /api/v1/messages
Body: MessageRequestDto
→ MessageResponseDto (201)
Permiso: send_messages

POST /api/v1/messages/send
Body: SendMessageRequest
→ SendMessageResponse
Permiso: send_messages

POST /api/v1/messages/text
Body: { credentialId, serviceType, recipient, text }
→ SendMessageResponse

POST /api/v1/messages/image
Body: { credentialId, serviceType, recipient, mediaUrl, caption }
→ SendMessageResponse

POST /api/v1/messages/audio
POST /api/v1/messages/video
POST /api/v1/messages/document
POST /api/v1/messages/sticker
POST /api/v1/messages/location
POST /api/v1/messages/template

GET /api/v1/messages/templates?credentialId={uuid}&serviceType=WHATSAPP&businessAccountId={id}
→ JsonNode (lista de templates de WhatsApp)
Permiso: view_templates
```

### 📇 Contactos

```http
GET /api/v1/contacts?page=0&size=20&search=nombre
→ PageResponseDto<ContactResponseDto>
Permiso: view_contacts

GET /api/v1/contacts/{id}
→ ContactResponseDto

POST /api/v1/contacts
Body: { fullName, email, phone, customFields }
→ ContactResponseDto (201)
Permiso: manage_contacts

PUT /api/v1/contacts/{id}
Body: ContactRequestDto
→ ContactResponseDto
Permiso: manage_contacts
```

### 👔 Agentes

```http
GET /api/v1/agents/{agentId}/work-schedules
→ Flux<AgentWorkScheduleResponseDto>
Permiso: view_agents

POST /api/v1/agents/{agentId}/work-schedules
Body: AgentWorkScheduleRequestDto
→ AgentWorkScheduleResponseDto (201)
Permiso: manage_agents

GET /api/v1/agents/{agentId}/unavailabilities
→ Flux<AgentUnavailabilityResponseDto>

POST /api/v1/agents/{agentId}/unavailabilities
Body: AgentUnavailabilityRequestDto
→ AgentUnavailabilityResponseDto (201)
```

### 🏷️ Tags (Etiquetas)

```http
GET /api/v1/tags?page=0&size=20
→ PageResponseDto<TagResponseDto>
Permiso: view_tags

GET /api/v1/tags/{id}
→ TagResponseDto
Permiso: view_tags

POST /api/v1/tags
Body: { name, color }
→ TagResponseDto (201)
Permiso: manage_tags

PUT /api/v1/tags/{id}
Body: { name, color }
→ TagResponseDto
Permiso: manage_tags

DELETE /api/v1/tags/{id}
→ 204 No Content
Permiso: manage_tags
```

### 🔖 Tags en Conversaciones

```http
POST /api/v1/conversations/{conversationId}/tags
Body: { tagId }
→ ConversationTagResponseDto (201)
Permiso: manage_conversations

DELETE /api/v1/conversations/{conversationId}/tags/{tagId}
→ 204 No Content
Permiso: manage_conversations

GET /api/v1/conversations/{conversationId}/tags
→ Flux<ConversationTagResponseDto>
Permiso: view_conversations

GET /api/v1/conversations/tags/{tagId}/conversations
→ Flux<UUID> (lista de IDs de conversaciones)
Permiso: view_conversations
```

### 👥 Teams (Equipos)

```http
GET /api/v1/teams?page=0&size=20
→ PageResponseDto<TeamResponseDto>
Permiso: manage_teams

GET /api/v1/teams/{id}
→ TeamResponseDto
Permiso: manage_teams

POST /api/v1/teams
Body: { name, description }
→ TeamResponseDto (201)
Permiso: manage_teams

PUT /api/v1/teams/{id}
Body: { name, description }
→ TeamResponseDto
Permiso: manage_teams

DELETE /api/v1/teams/{id}
→ 204 No Content
Permiso: manage_teams

PATCH /api/v1/teams/{id}/activate
→ TeamResponseDto
Permiso: manage_teams

PATCH /api/v1/teams/{id}/deactivate
→ TeamResponseDto
Permiso: manage_teams
```

### 👨‍👩‍👧‍👦 Miembros de Equipos

```http
GET /api/v1/teams/{teamId}/members
→ Flux<TeamMemberResponseDto>
Permiso: manage_teams

POST /api/v1/teams/{teamId}/members
Body: { agentIds: [uuid, uuid, ...] }
→ Flux<TeamMemberResponseDto> (201)
Permiso: manage_teams

DELETE /api/v1/teams/{teamId}/members/{agentId}
→ 204 No Content
Permiso: manage_teams
```

### 🤖 Asistentes de IA

```http
GET /api/v1/assistants?page=0&size=20
→ PageResponseDto<AssistantResponseDto>
Permiso: view_assistants

GET /api/v1/assistants/default
→ AssistantResponseDto (asistente por defecto del cliente)
Permiso: view_assistants

GET /api/v1/assistants/{id}
→ AssistantResponseDto
Permiso: view_assistants

POST /api/v1/assistants
Body: { aiCredentialId, name, description, systemPrompt }
→ AssistantResponseDto (201)
Permiso: manage_assistants

PUT /api/v1/assistants/{id}
Body: { name, description, systemPrompt }
→ AssistantResponseDto
Permiso: manage_assistants

DELETE /api/v1/assistants/{id}
→ 204 No Content
Permiso: manage_assistants

PUT /api/v1/assistants/{id}/default
→ AssistantResponseDto (marca como asistente por defecto)
Permiso: manage_assistants

PUT /api/v1/assistants/{id}/activate
→ AssistantResponseDto
Permiso: manage_assistants

PUT /api/v1/assistants/{id}/deactivate
→ AssistantResponseDto
Permiso: manage_assistants
```

### 🔑 Credenciales

```http
GET /api/v1/credentials/ai?page=0&size=20
→ PageResponseDto<AiCredentialResponseDto>
Permiso: view_credentials

GET /api/v1/credentials/ai/{id}
→ AiCredentialResponseDto
Permiso: view_credentials

POST /api/v1/credentials/ai
Body: { aiProviderType, apiKey, model, temperature }
→ AiCredentialResponseDto (201)
Permiso: manage_credentials

PUT /api/v1/credentials/ai/{id}
Body: { aiProviderType, apiKey, model, temperature }
→ AiCredentialResponseDto
Permiso: manage_credentials

DELETE /api/v1/credentials/ai/{id}
→ 204 No Content
Permiso: manage_credentials

GET /api/v1/credentials/messaging?page=0&size=20
→ PageResponseDto<MessagingCredentialResponseDto>
Permiso: view_credentials

GET /api/v1/credentials/messaging/{id}
→ MessagingCredentialResponseDto
Permiso: view_credentials

POST /api/v1/credentials/messaging
Body: { messagingServiceType, accessToken, phoneNumberId, businessAccountId, webhookVerifyToken }
→ MessagingCredentialResponseDto (201)
Permiso: manage_credentials

PUT /api/v1/credentials/messaging/{id}
Body: { messagingServiceType, accessToken, phoneNumberId, businessAccountId, webhookVerifyToken }
→ MessagingCredentialResponseDto
Permiso: manage_credentials

DELETE /api/v1/credentials/messaging/{id}
→ 204 No Content
Permiso: manage_credentials

GET /api/v1/credentials/channels
→ Flux<ActiveChannelResponseDto>
Permiso: view_credentials
```

---

## 🔴 WebSocket - Eventos en Tiempo Real

### Conexión

```javascript
const socket = new SockJS("http://localhost:8080/ws");
const stompClient = Stomp.over(socket);

stompClient.connect(
  {
    Authorization: "Bearer " + accessToken,
  },
  () => {
    console.log("Conectado a WebSocket");
  }
);
```

### Suscripciones

**1. Conversaciones (por cliente)**

```javascript
stompClient.subscribe("/topic/conversations/" + clientId, (message) => {
  const event = JSON.parse(message.body);
  // Eventos: CONVERSATION_CREATED, CONVERSATION_ASSIGNED, CONVERSATION_STATUS_CHANGED
  console.log(event.type, event.conversationId);
});
```

**2. Mensajes (por conversación)**

```javascript
stompClient.subscribe("/topic/messages/" + conversationId, (message) => {
  const event = JSON.parse(message.body);
  // Evento: NEW_MESSAGE
  // event.message contiene el MessageResponseDto completo
  console.log("Nuevo mensaje:", event.message);
});
```

**3. Presencia de agentes**

```javascript
stompClient.subscribe("/topic/agent-presence/" + clientId, (message) => {
  const event = JSON.parse(message.body);
  // { type: "AGENT_PRESENCE", agentId: "...", online: true/false }
});
```

---

## ⚠️ Diferencias Clave vs Documentación

1. **Login NO devuelve datos del usuario** - usar `/auth/me`
2. **Contact usa `fullName` y `phone`**, no `name` ni `phoneNumber`
3. **Message NO incluye `mediaUrl`** ni `senderName` en el DTO base
4. **Agent NO incluye `online`** en AgentResponseDto base
5. **PageResponseDto incluye `first` y `last`** para navegación
6. **Asignar agente** es `POST /conversations/{id}/agents?agentId=X` (query param)
7. **Endpoints de mensajes** son múltiples: `/text`, `/image`, `/audio`, etc.
8. **Nuevos endpoints agregados**:
   - Tags y etiquetado de conversaciones
   - Teams y gestión de miembros
   - Asistentes de IA con activación/desactivación
   - Credenciales (AI y Messaging) con gestión completa
   - Canales activos disponibles
9. **Assistant incluye `isDefault` y `isActive`** para configuración
10. **Conversations admite filtros por `status` y `messagingServiceType`** en el GET
11. **Teams tiene operaciones PATCH** para activar/desactivar (además de CRUD básico)

---

## 🚀 Base URL

```
http://localhost:8080/api/v1
```

Todos los endpoints (excepto `/auth/login`) requieren:

```
Authorization: Bearer <accessToken>
```

---

## 💡 Flujo Frontend Típico

### 1. Login y Setup

```javascript
// 1. Login
const { accessToken, expiresIn } = await login(email, password);

// 2. Obtener info usuario
const userProfile = await fetch("/api/v1/auth/me", {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// 3. Conectar WebSocket
connectWebSocket(accessToken, userProfile.clientId);
```

### 2. Dashboard

```javascript
// Cargar conversaciones
const conversations = await fetch(
  "/api/v1/conversations?page=0&size=20&status=ACTIVE"
);

// Escuchar cambios
stompClient.subscribe("/topic/conversations/" + clientId, updateConversations);
stompClient.subscribe("/topic/agent-presence/" + clientId, updateAgentStatus);
```

### 3. Vista de Conversación

```javascript
// Cargar conversación
const conversation = await fetch("/api/v1/conversations/" + id);

// Cargar mensajes
const messages = await fetch(
  `/api/v1/messages?conversationId=${id}&page=0&size=50`
);

// Cargar tags de la conversación
const tags = await fetch(`/api/v1/conversations/${id}/tags`);

// Escuchar nuevos mensajes
stompClient.subscribe("/topic/messages/" + id, (msg) => {
  addMessageToUI(JSON.parse(msg.body).message);
});

// Enviar mensaje
await fetch("/api/v1/messages", {
  method: "POST",
  body: JSON.stringify({
    conversationId: id,
    senderType: "AGENT",
    senderId: agentId,
    messageType: "TEXT",
    textContent: "Hola",
  }),
});

// Agregar tag a conversación
await fetch(`/api/v1/conversations/${id}/tags`, {
  method: "POST",
  body: JSON.stringify({ tagId: selectedTagId }),
});

// Asignar a equipo
await fetch(`/api/v1/conversations/${id}/teams?teamId=${teamId}`, {
  method: "POST",
});
```

### 4. Gestión de Tags

```javascript
// Crear nuevo tag
const newTag = await fetch("/api/v1/tags", {
  method: "POST",
  body: JSON.stringify({
    name: "Urgente",
    color: "#FF0000",
  }),
});

// Listar todos los tags del cliente
const tags = await fetch("/api/v1/tags?page=0&size=50");

// Ver conversaciones con un tag específico
const conversationIds = await fetch(
  `/api/v1/conversations/tags/${tagId}/conversations`
);
```

### 5. Gestión de Equipos

```javascript
// Crear equipo
const newTeam = await fetch("/api/v1/teams", {
  method: "POST",
  body: JSON.stringify({
    name: "Ventas CDMX",
    description: "Equipo de ventas de la Ciudad de México",
  }),
});

// Agregar miembros al equipo
await fetch(`/api/v1/teams/${teamId}/members`, {
  method: "POST",
  body: JSON.stringify({
    agentIds: [agentId1, agentId2, agentId3],
  }),
});

// Listar miembros
const members = await fetch(`/api/v1/teams/${teamId}/members`);

// Activar/Desactivar equipo
await fetch(`/api/v1/teams/${teamId}/activate`, { method: "PATCH" });
await fetch(`/api/v1/teams/${teamId}/deactivate`, { method: "PATCH" });
```

### 6. Configuración de Asistentes de IA

```javascript
// Obtener asistente por defecto
const defaultAssistant = await fetch("/api/v1/assistants/default");

// Crear nuevo asistente
const assistant = await fetch("/api/v1/assistants", {
  method: "POST",
  body: JSON.stringify({
    aiCredentialId: credentialId,
    name: "Asistente Soporte Técnico",
    description: "Especializado en resolver problemas técnicos",
    systemPrompt: "Eres un experto en soporte técnico...",
  }),
});

// Establecer como asistente por defecto
await fetch(`/api/v1/assistants/${assistantId}/default`, { method: "PUT" });

// Activar/Desactivar
await fetch(`/api/v1/assistants/${assistantId}/activate`, { method: "PUT" });
await fetch(`/api/v1/assistants/${assistantId}/deactivate`, { method: "PUT" });
```

### 7. Gestión de Credenciales

```javascript
// Crear credencial de IA (OpenAI/Gemini)
const aiCred = await fetch("/api/v1/credentials/ai", {
  method: "POST",
  body: JSON.stringify({
    aiProviderType: "OPENAI",
    apiKey: "sk-...",
    model: "gpt-4",
    temperature: 0.7,
  }),
});

// Crear credencial de mensajería (WhatsApp/Telegram)
const msgCred = await fetch("/api/v1/credentials/messaging", {
  method: "POST",
  body: JSON.stringify({
    messagingServiceType: "WHATSAPP",
    accessToken: "EAA...",
    phoneNumberId: "123456789",
    businessAccountId: "987654321",
    webhookVerifyToken: "my_verify_token",
  }),
});

// Ver canales activos disponibles
const channels = await fetch("/api/v1/credentials/channels");
// Retorna: [{ serviceType: "WHATSAPP", displayName: "WhatsApp Business", hasCredentials: true }, ...]
```
