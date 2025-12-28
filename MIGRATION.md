# 🚀 Migración Completada: ChatVRM → Chadbot (API v1 Multi-Tenant)

### Estado Actual de Migración

- ✅ **Fase 1 Completada** - Migración a API v1 y Separación de Conceptos
- ✅ **Fase 2 Completada** - Rediseño de Navegación y Filtros
- ✅ **Fase 3 Completada** - Modal de Información del Cliente
- ⏳ **Fase 4** - Gestión de Credenciales (Pendiente)
- ⏳ **Fase 5** - Mejoras en Mensajería WhatsApp (Pendiente)
- ⏳ **Fase 6** - Sistema de Gestión de Tags (Pendiente)

---

## ✅ Cambios Realizados

### 1. **Nuevos Tipos de API (lib/api-types.ts)**

- ✅ Tipos completos para API v1 según documentación
- ✅ Entidades: `Contact`, `Conversation`, `Message`, `Agent`
- ✅ Estados de conversación: `ACTIVE`, `INTERVENED`, `NO_ANSWER`, `CLOSED`
- ✅ Tipos de mensaje: `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`
- ✅ Tipos de remitente: `CONTACT`, `AGENT`, `SYSTEM`
- ✅ Soporte para WebSocket events
- ✅ Paginación estándar con `content`, `page`, `size`, `totalElements`, `totalPages`
- ✅ JWT Payload con `client_id` para multi-tenancy
- ✅ Tipos legacy mantenidos para migración gradual

### 2. **Configuración Actualizada (lib/config.ts)**

- ✅ URLs de API actualizadas a `/api/v1/`
- ✅ Agregado soporte para WebSocket (`wsUrl`)
- ✅ Configuración por ambiente:
  - **Development**: `http://localhost:8080/api/v1/`
  - **Staging**: `https://chadbot-backend-dev.azurewebsites.net/api/v1/`
  - **Production**: `https://chadbot-backend.azurewebsites.net/api/v1/`

### 3. **API Service Reescrito (lib/api.ts)**

- ✅ Endpoints simplificados según API v1
- ✅ Extracción automática de `client_id` del JWT
- ✅ Logging mejorado con emojis para debugging
- ✅ Métodos implementados:
  - **Auth**: `login()`, `logout()`, `getUserFromToken()`, `getClientId()`
  - **Conversations**: `getConversations()`, `getConversationById()`, `createConversation()`, `assignConversation()`, `changeConversationStatus()`
  - **Messages**: `getMessages()`, `sendMessage()`, `sendImage()`
  - **Contacts**: `getContacts()`, `getContactById()`, `createContact()`
  - **Agents**: `getAgents()`, `updateAgentStatus()`
- ✅ Error handling mejorado con códigos de error
- ✅ Token storage actualizado a `chadbot_token`

### 4. **Actualización de Referencias**

- ✅ `package.json`: Nombre cambiado a "chadbot"
- ✅ LocalStorage keys:
  - `chatvrm_token` → `chadbot_token`
  - `chatvrm_user` → `chadbot_user`
  - `chatvrm_notifications` → `chadbot_notifications`
  - `chatvrm_autoRefreshInterval` → `chadbot_autoRefreshInterval`
- ✅ Textos de interfaz:
  - "ChatVRM" → "Chadbot"
  - Títulos y mensajes actualizados
- ✅ Console logs actualizados con nuevo nombre

### 5. **Documentación Actualizada**

- ✅ [.github/copilot-instructions.md](.github/copilot-instructions.md): Reflejando API v1
- ✅ Secciones de migración actualizadas
- ✅ Arquitectura multi-tenant documentada

## 🎯 Arquitectura Multi-Tenant

### Cómo Funciona

1. **Login** → Backend devuelve JWT con `client_id`

   ```json
   {
     "token": "eyJ...",
     "user": { "id": "...", "email": "...", "roles": [...] }
   }
   ```

2. **JWT Decode** → Frontend extrae `client_id` automáticamente

   ```typescript
   const payload = decodeJWT(token);
   const clientId = payload.client_id; // Identificador del tenant
   ```

3. **Todas las requests** → Token en header + Backend filtra por `client_id`
   ```
   Authorization: Bearer eyJ...
   ```
   - Backend automáticamente filtra conversaciones, contactos, mensajes por `client_id`
   - No se requiere enviar `client_id` explícitamente
   - Aislamiento total entre clientes

## 📋 Próximos Pasos

### Inmediatos

1. **Actualizar componentes** para usar nuevos tipos
   - `chat-view.tsx` → Usar `Conversation` y `Message` nuevos
   - `conversation-list.tsx` → Usar `ConversationListResponse`
   - `user-management.tsx` → Migrar a endpoints de agents
2. **Implementar WebSocket** para tiempo real

   - Conectar a `config.wsUrl`
   - Suscribirse a topics según documentación
   - Actualizar UI en tiempo real

3. **Adaptar componentes específicos**
   - `assign-conversation-modal.tsx` → Usar `assignConversation()`
   - `bulk-message-modal.tsx` → Adaptar a nuevo formato
   - `template-message-modal.tsx` → Revisar si es necesario

### Futuros

- 🔄 **Validación de licencia** por cliente
- 🔄 **White-labeling** (temas/logos personalizados por cliente)
- 🔄 **Analytics** por cliente
- 🔄 **Límites de uso** por licencia

## 🧪 Testing

### Verificar Funcionalidad

1. **Login**

   ```typescript
   const response = await apiService.login({
     email: "user@example.com",
     password: "password123",
   });
   // Debe guardar token en localStorage
   ```

2. **Verificar client_id**

   ```typescript
   const clientId = apiService.getClientId();
   console.log("Client ID:", clientId); // Debe mostrar UUID del cliente
   ```

3. **Obtener conversaciones**

   ```typescript
   const conversations = await apiService.getConversations(0, 20, "ACTIVE");
   // Debe retornar solo conversaciones del cliente autenticado
   ```

4. **Enviar mensaje**
   ```typescript
   const response = await apiService.sendMessage({
     conversationId: "uuid-aqui",
     content: "Hola mundo",
     type: "TEXT",
   });
   ```

## 📝 Notas Importantes

### LocalStorage Keys

Todos los componentes que usen localStorage deben usar las nuevas keys:

- `chadbot_token` (no `chatvrm_token`)
- `chadbot_user` (no `chatvrm_user`)
- etc.

### Paginación

La API v1 usa el estándar:

```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8
}
```

(No usar `pageIndex`, usar `page` con base 0)

### Estados de Conversación

Mapeo de estados (para componentes legacy):

- "Activo" → `ACTIVE`
- "Intervenido" → `INTERVENED`
- "Sin respuesta" → `NO_ANSWER`
- "Cerrado" → `CLOSED`

## 🔗 Referencias

- [API Documentation](api-documentation.md) - Documentación completa de la API v1
- [Copilot Instructions](.github/copilot-instructions.md) - Guía para AI agents
- [lib/api-types.ts](lib/api-types.ts) - Tipos de TypeScript
- [lib/api.ts](lib/api.ts) - Cliente HTTP
- [lib/config.ts](lib/config.ts) - Configuración de ambientes

---

## 🎯 Plan de Migración a Arquitectura Multicanal

### Objetivo

Transformar Chadbot en una aplicación multicanal con navegación dinámica, gestión de credenciales, sistema de tags independiente, y vista detallada de información del cliente.

### Prioridades

- ✅ **WhatsApp primero**: Mantener y mejorar funcionalidad existente
- 🔄 **Telegram**: Preparar estructura pero implementar después
- ⏳ **WebSocket**: Posponer hasta que backend esté listo
- ✅ **Información del cliente**: Modal al hacer click en avatar

### Fases de Implementación

#### **Fase 1: Migración a API v1 y Separación de Conceptos** (1-2 semanas)

**Objetivo**: Reemplazar llamadas legacy y separar estados de tags

**Tareas**:

1. **Migrar capa API**
   - ✅ Métodos v1 ya definidos en `lib/api.ts`
   - 🔄 Actualizar todos los componentes para usar nuevos métodos
   - 🔄 Reemplazar `getConversaciones()` → `getConversations()`
   - 🔄 Reemplazar `getMensajes()` → `getMessages()`
   - 🔄 Reemplazar `sendMessage()` → usar nueva firma con tipos
2. **Actualizar mappers en `lib/types.ts`**

   - 🔄 Separar `status: ConversationStatus` de `tags: Tag[]`
   - 🔄 Crear constante `CONVERSATION_STATUS_CONFIG`:
     ```typescript
     const CONVERSATION_STATUS_CONFIG = {
       ACTIVE: {
         label: "Activa",
         color: "success",
         transitions: ["INTERVENED", "CLOSED"],
       },
       INTERVENED: {
         label: "Intervenida",
         color: "warning",
         transitions: ["ACTIVE", "CLOSED", "NO_ANSWER"],
       },
       NO_ANSWER: {
         label: "No Contesta",
         color: "danger",
         transitions: ["ACTIVE", "CLOSED"],
       },
       CLOSED: { label: "Cerrada", color: "default", transitions: ["ACTIVE"] },
     };
     ```
   - 🔄 Eliminar tags de estado en mappers (actualmente tags contienen "A Intervenir", "Cerrada", etc.)

3. **Implementar sistema de tags real**
   - 🔄 Endpoints en `lib/api.ts`: `getTags()`, `createTag()`, `updateTag()`, `deleteTag()`
   - 🔄 Endpoints de asignación: `assignTagToConversation()`, `removeTagFromConversation()`

**Archivos a modificar**:

- `lib/api.ts` - Migrar métodos
- `lib/types.ts` - Separar status y tags
- `app/page.tsx` - Actualizar llamadas API
- `components/chat-view.tsx` - Usar nuevos tipos
- `components/conversation-list.tsx` - Usar `ConversationListResponse`

---

#### **Fase 2: Rediseño de Navegación y Filtros** (1 semana)

**Objetivo**: Navegación dinámica por canales + filtros de estado como chips

**Tareas**:

1. **Rediseñar `components/sidebar.tsx`**

   - 🔄 Eliminar menu items hardcodeados (`"Pendientes"`, `"En curso"`, etc.)
   - 🔄 Crear sección "Canales" **dinámica**:
     - Obtener canales de `GET /api/v1/credentials/channels`
     - Mostrar solo canales con `hasCredentials: true`
     - Formato: `📱 WhatsApp Business (24 nuevos)` usando `displayName`
     - Contador de mensajes no leídos por canal
   - 🔄 Agregar endpoint en `lib/api.ts`:
     ```typescript
     async getActiveChannels(): Promise<ActiveChannelResponseDto[]>
     ```
   - 🔄 Mantener sección Admin (Usuarios, Asistentes)
   - 🔄 Agregar indicador visual de canal seleccionado

2. **Crear chips de estado en `components/conversation-list.tsx`**

   - 🔄 Componente `StatusFilterChips` horizontal arriba de la lista
   - 🔄 Chips: `Todas | Activas | Intervenidas | No Contesta | Cerradas`
   - 🔄 Contador por estado: `Activas (12)` - calculado client-side
   - 🔄 Estado seleccionado con color primario

3. **Agregar filtro de tags**

   - 🔄 Componente `TagFilterDropdown` con multi-select
   - 🔄 Cargar tags de `GET /api/v1/tags`
   - 🔄 Mostrar tags disponibles con colores
   - 🔄 Badge con cantidad de tags seleccionados

4. **Implementar filtro por canal en conversaciones**
   - 🔄 Actualizar `getConversations()` en `lib/api.ts` para aceptar `messagingServiceType?`
   - 🔄 Pasar `messagingServiceType` del canal seleccionado en sidebar
   - 🔄 Formato: `GET /api/v1/conversations?status=ACTIVE&messagingServiceType=WHATSAPP`

**Archivos a modificar**:

- `components/sidebar.tsx` - Rediseño con canales dinámicos
- `components/conversation-list.tsx` - Agregar chips de filtro
- `app/page.tsx` - Estado `selectedChannel` y `selectedTags`
- `lib/api.ts` - Agregar `getActiveChannels()`, actualizar `getConversations()`
- `lib/api-types.ts` - Agregar `ActiveChannelResponseDto`

---

#### **Fase 3: Modal de Información del Cliente** (3-4 días)

**Objetivo**: Vista detallada del contacto al hacer click en avatar

**Tareas**:

1. **Crear `components/contact-info-modal.tsx`**

   - 🔄 Diseño con tabs:
     - **Información**: Nombre, teléfono, email
     - **Metadata**: Campos personalizados (clave-valor editables)
     - **Conversaciones**: Historial de chats con este contacto
     - **Tags**: Tags asignados a sus conversaciones
   - 🔄 Permitir edición de nombre, email, metadata
   - 🔄 Botón "Guardar cambios" que llame a `updateContact()`

2. **Actualizar `components/user-avatar.tsx`**

   - 🔄 Hacer avatar clickeable (agregar prop `onClick`)
   - 🔄 Cambiar cursor a pointer
   - 🔄 Agregar hover effect

3. **Agregar endpoint en `lib/api.ts`**
   - 🔄 `getContactDetails(contactId: string): Promise<Contact>`
   - 🔄 `updateContact(contactId: string, data: Partial<Contact>): Promise<Contact>`

**Archivos a modificar**:

- `components/contact-info-modal.tsx` - Crear nuevo
- `components/user-avatar.tsx` - Agregar onClick
- `components/conversation-list.tsx` - Abrir modal al click en avatar
- `lib/api.ts` - Endpoints de contacto

---

#### **Fase 4: Gestión de Credenciales de Canales** (1 semana)

**Objetivo**: UI para configurar credenciales de WhatsApp, Telegram y AI

**Tareas**:

1. **Actualizar `components/settings-modal.tsx`** - Tab "Credenciales de Mensajería"

   - 🔄 Listar credenciales existentes con `GET /api/v1/credentials/messaging`
   - 🔄 Mostrar tabla de credenciales configuradas:
     - Columnas: Servicio | Phone Number ID | Estado | Acciones
     - Estado calculado desde `GET /api/v1/credentials/channels` (hasCredentials)
   - 🔄 Botón "+ Agregar Canal" que abre formulario modal:
     - **WhatsApp Business**:
       - Select: `messagingServiceType: "WHATSAPP"`
       - Input: `accessToken` (password type)
       - Input: `phoneNumberId`
       - Input: `businessAccountId` (WABA ID)
       - Input: `webhookVerifyToken` (opcional)
     - **Telegram**:
       - Select: `messagingServiceType: "TELEGRAM"`
       - Input: `accessToken` (Bot Token - password type)
   - 🔄 Editar credencial existente (PUT)
   - 🔄 Eliminar credencial (DELETE con confirmación)

2. **Tab "Configuración IA"**

   - 🔄 Listar credenciales AI con `GET /api/v1/credentials/ai`
   - 🔄 Formulario para crear/editar:
     - Select: `aiProviderType: "OPENAI" | "GEMINI"`
     - Input: `apiKey` (password type)
     - Input: `model` (ej: "gpt-4", "gemini-pro")
     - Slider: `temperature` (0-1, default 0.7)
   - 🔄 Indicador de credencial activa/en uso

3. **Agregar endpoints en `lib/api.ts`**
   - 🔄 `getMessagingCredentials(): Promise<PageResponseDto<MessagingCredentialResponseDto>>`
   - 🔄 `getMessagingCredentialById(id: string): Promise<MessagingCredentialResponseDto>`
   - 🔄 `createMessagingCredential(data: MessagingCredentialRequestDto): Promise<MessagingCredentialResponseDto>`
   - 🔄 `updateMessagingCredential(id: string, data: MessagingCredentialRequestDto): Promise<MessagingCredentialResponseDto>`
   - 🔄 `deleteMessagingCredential(id: string): Promise<void>`
   - 🔄 `getAiCredentials(): Promise<PageResponseDto<AiCredentialResponseDto>>`
   - 🔄 `createAiCredential(data: AiCredentialRequestDto): Promise<AiCredentialResponseDto>`
   - 🔄 `updateAiCredential(id: string, data: AiCredentialRequestDto): Promise<AiCredentialResponseDto>`
   - 🔄 `deleteAiCredential(id: string): Promise<void>`

**Archivos a modificar**:

- `components/settings-modal.tsx` - Tabs de credenciales
- `lib/api-types.ts` - Importar tipos de request (MessagingCredentialRequestDto, AiCredentialRequestDto)
- `lib/api.ts` - Endpoints CRUD de credenciales

---

#### **Fase 5: Mejoras en Mensajería WhatsApp** (3-4 días)

**Objetivo**: Mejorar indicadores de estado y experiencia de envío

**Tareas**:

1. **Actualizar `components/chat-view.tsx`**

   - 🔄 Agregar iconos de estado de mensaje:
     - `SENT`: ✓ (gris)
     - `DELIVERED`: ✓✓ (gris)
     - `READ`: ✓✓ (azul)
   - 🔄 Mostrar hora de envío/recepción
   - 🔄 Mejorar diseño de burbujas de mensaje
   - 🔄 Agregar indicador de "escribiendo..." (preparar para WebSocket futuro)

2. **Actualizar modals de templates**

   - 🔄 `components/new-chat-modal.tsx` - Migrar a API v1
   - 🔄 `components/bulk-message-modal.tsx` - Migrar a API v1
   - 🔄 `components/template-message-modal.tsx` - Migrar a API v1
   - 🔄 Mejorar preview de templates
   - 🔄 Validación de parámetros mejorada

3. **Validación de ventana 24h**
   - 🔄 Mantener para WhatsApp
   - 🔄 Preparar para NO aplicar en Telegram (bandera `requiresTemplateAfter24h`)

**Archivos a modificar**:

- `components/chat-view.tsx` - Estados de mensaje
- `components/new-chat-modal.tsx` - Migrar API
- `components/bulk-message-modal.tsx` - Migrar API
- `components/template-message-modal.tsx` - Migrar API

---

#### **Fase 6: Sistema de Gestión de Tags** (3-4 días)

**Objetivo**: CRUD completo de tags y asignación a conversaciones

**Tareas**:

1. **Crear `components/tag-manager.tsx`**

   - 🔄 Lista de tags existentes con colores
   - 🔄 Formulario de creación:
     - Input: Nombre
     - ColorPicker: Color
     - Textarea: Descripción
   - 🔄 Edición inline de tags
   - 🔄 Eliminación con confirmación
   - 🔄 Vista previa del chip

2. **Agregar gestión de tags en conversaciones**

   - 🔄 Componente `TagSelector` en `chat-view.tsx` header
   - 🔄 Dropdown multi-select con tags disponibles
   - 🔄 Chips de tags asignados (removibles)
   - 🔄 Botón "+ Agregar tag"

3. **Implementar filtro de tags**
   - 🔄 `TagFilterChips` en `conversation-list.tsx`
   - 🔄 Multi-select de tags
   - 🔄 Contador de conversaciones por tag

**Archivos a modificar**:

- `components/tag-manager.tsx` - Crear nuevo
- `components/settings-modal.tsx` - Integrar TagManager
- `components/chat-view.tsx` - Agregar TagSelector
- `components/conversation-list.tsx` - Filtro de tags
- `lib/api.ts` - Endpoints de tags

---

### Consideraciones Técnicas

#### **1. Metadata Personalizado para Contactos**

El tipo `Contact` en API v1 tiene `metadata?: Record<string, any>`:

```typescript
// Ejemplo de metadata
{
  "Empresa": "ACME Corp",
  "Cargo": "Gerente de Ventas",
  "Industria": "Tecnología",
  "Notas": "Cliente VIP"
}
```

**Implementación en ContactInfoModal**:

- Tab "Metadata" con lista de pares clave-valor
- Botón "+ Agregar campo"
- Input para clave + input para valor
- Guardar como objeto JSON en backend

#### **2. Campo `subject` de Conversación**

API v1 incluye `subject?: string` en `Conversation`:

**Opciones**:

- ❌ Ignorar por ahora (no crítico)
- ✅ Agregar como título editable en `chat-view.tsx` header
- ✅ Mostrar como "Asunto: [subject]" o input inline si es null

**Recomendación**: Agregar en Fase 2 junto con mejoras de navegación.

#### **3. Transiciones de Estado**

Configuración de transiciones permitidas por estado:

```typescript
const CONVERSATION_STATUS_CONFIG = {
  ACTIVE: {
    label: "Activa",
    color: "success",
    icon: "MessageCircle",
    allowedTransitions: ["INTERVENED", "CLOSED", "NO_ANSWER"],
  },
  INTERVENED: {
    label: "Intervenida",
    color: "warning",
    icon: "MessageCircleHeart",
    allowedTransitions: ["ACTIVE", "CLOSED", "NO_ANSWER"],
  },
  NO_ANSWER: {
    label: "No Contesta",
    color: "danger",
    icon: "PhoneOff",
    allowedTransitions: ["ACTIVE", "CLOSED", "INTERVENED"],
  },
  CLOSED: {
    label: "Cerrada",
    color: "default",
    icon: "X",
    allowedTransitions: ["ACTIVE"],
  },
};
```

Usar en `chat-view.tsx` para mostrar solo botones de transición válidos.

#### **4. Estructura de Canales (Dinámicos desde API)**

```typescript
// Ya no necesitamos hardcodear canales - la API los provee dinámicamente

// Respuesta de GET /api/v1/credentials/channels
interface ActiveChannelResponseDto {
  serviceType: "WHATSAPP" | "TELEGRAM";
  displayName: string; // "WhatsApp Business", "Telegram"
  hasCredentials: boolean;
}

// Configuración adicional del frontend (comportamiento UI)
const CHANNEL_UI_CONFIG: Record<
  string,
  {
    icon: string;
    requiresTemplate24h: boolean;
    supportsMedia: string[];
  }
> = {
  WHATSAPP: {
    icon: "💬",
    requiresTemplate24h: true,
    supportsMedia: ["image", "video", "audio", "document"],
  },
  TELEGRAM: {
    icon: "✈️",
    requiresTemplate24h: false,
    supportsMedia: [
      "image",
      "video",
      "audio",
      "document",
      "sticker",
      "location",
    ],
  },
};

// Uso en componentes:
// 1. Obtener canales activos de la API
const activeChannels = await apiService.getActiveChannels();

// 2. Filtrar solo los que tienen credenciales
const enabledChannels = activeChannels.filter((ch) => ch.hasCredentials);

// 3. Combinar con configuración UI
const channelsForUI = enabledChannels.map((ch) => ({
  ...ch,
  ...CHANNEL_UI_CONFIG[ch.serviceType],
}));
```

---

### Estimación de Tiempo Total

| Fase                         | Duración    | Dependencias   |
| ---------------------------- | ----------- | -------------- |
| Fase 1: API v1 + Separación  | 1-2 semanas | -              |
| Fase 2: Navegación + Filtros | 1 semana    | Fase 1         |
| Fase 3: Modal Contacto       | 3-4 días    | Fase 1         |
| Fase 4: Credenciales         | 1 semana    | Fase 2         |
| Fase 5: Mejoras Mensajería   | 3-4 días    | Fase 1         |
| Fase 6: Gestión Tags         | 3-4 días    | Fase 1, Fase 2 |

**Total estimado**: 4-6 semanas (dependiendo de paralelización)

---

### Ventajas de la Arquitectura API v1

✅ **Canales dinámicos**: No hardcodear - obtener de `/credentials/channels`  
✅ **Filtrado por canal**: Backend filtra conversaciones por `messagingServiceType`  
✅ **Gestión de credenciales**: CRUD completo de credenciales de mensajería y IA  
✅ **Tags independientes**: Sistema completo de etiquetado separado de estados  
✅ **Multi-tenant automático**: `clientId` en JWT filtra todo automáticamente  
✅ **Equipos y asignación**: Asignar conversaciones a equipos o agentes individuales  
✅ **Asistentes configurables**: Múltiples asistentes de IA con prompts personalizados

### Próximos Pasos Inmediatos

1. ✅ Documentar plan de migración (este documento)
2. ✅ Actualizar plan con endpoints de canales dinámicos
3. 🔄 Comenzar Fase 1: Migrar API y separar conceptos
4. 🔄 Crear branch `feature/multichannel-migration`
5. 🔄 Actualizar `lib/types.ts` con `CONVERSATION_STATUS_CONFIG`
6. 🔄 Agregar `lib/api-types.ts` con tipos de request/response faltantes
7. 🔄 Reemplazar llamadas legacy en `app/page.tsx`

---

## 🚨 Pendientes Backend (Para Equipo de API)

### Endpoints Faltantes Requeridos por Frontend

#### 1. **Conversaciones por Contacto**

```http
GET /api/v1/conversations/by-contact/{contactId}
```

**Descripción**: Obtener todas las conversaciones históricas de un contacto específico  
**Parámetros**:

- `contactId` (path): ID del contacto
- Parámetros de paginación opcionales: `page`, `size`

**Response**:

```json
{
  "content": [
    {
      "id": "uuid",
      "contactId": "uuid",
      "status": "ACTIVE",
      "createdAt": "2024-12-28T10:00:00Z",
      "lastMessageAt": "2024-12-28T10:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 5,
  "totalPages": 1
}
```

**Uso Frontend**: Tab "Conversaciones" en [ContactInfoModal](components/contact-info-modal.tsx#L176-L201)

---

#### 2. **Actualización de Contacto (PUT)**

```http
PUT /api/v1/contacts/{contactId}
```

**Descripción**: Actualizar información del contacto (nombre, email, metadata)  
**Body**:

```json
{
  "name": "string",
  "email": "string",
  "metadata": {
    "empresa": "ACME Corp",
    "cargo": "CEO",
    "custom_field": "custom_value"
  }
}
```

**Response**: Contact actualizado completo

**Uso Frontend**: Botón "Guardar" en tabs "Información" y "Metadata" de [ContactInfoModal](components/contact-info-modal.tsx#L110-L133)

**✅ Status**: Implementado en frontend con `apiService.updateContact()` - requiere confirmación de backend

---

### Features Futuras (Fase 4-6)

#### 3. **Filtrado de Conversaciones por Canal**

```http
GET /api/v1/conversations?messagingServiceType=WHATSAPP&status=ACTIVE
```

**Descripción**: Filtrar conversaciones por tipo de canal (WhatsApp, Telegram)  
**Query Params**:

- `messagingServiceType`: `WHATSAPP`, `TELEGRAM`, etc.
- `status`: `ACTIVE`, `INTERVENED`, `NO_ANSWER`, `CLOSED`

**Uso Frontend**: Selector de canales en Sidebar (Fase 2 preparada en UI)

---

#### 4. **WebSocket para Mensajes en Tiempo Real**

```websocket
WS /api/v1/ws
```

**Descripción**: Conexión WebSocket para recibir mensajes entrantes sin polling

**Events esperados**:

- `new_message`: Nuevo mensaje en conversación
- `conversation_status_changed`: Cambio de estado
- `typing_indicator`: Contacto escribiendo

**Uso Frontend**: Reemplazo de polling actual (auto-refresh cada 10s)

---

### Prioridad de Implementación

| Endpoint                          | Prioridad | Fase   | Bloqueante |
| --------------------------------- | --------- | ------ | ---------- |
| GET /conversations/by-contact/:id | 🔴 Alta   | Fase 3 | Sí         |
| PUT /contacts/:id                 | 🔴 Alta   | Fase 3 | Sí         |
| Query param messagingServiceType  | 🟡 Media  | Fase 4 | No         |
| WebSocket /ws                     | 🟢 Baja   | Fase 5 | No         |

---

**Plan creado el**: Diciembre 27, 2024  
**Última actualización**: Diciembre 28, 2024 - Fase 3 completada, pendientes backend documentados  
**Estado**: 📝 Planificación completa - Listo para implementar  
**Versión API**: v1 (Multi-Tenant)  
**Prioridad**: 🔥 WhatsApp primero, Telegram preparado
