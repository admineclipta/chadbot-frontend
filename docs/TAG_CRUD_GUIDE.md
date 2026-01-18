# CRUD de Tags - Guía de Uso

## Descripción

Se ha implementado un sistema completo de gestión de tags (etiquetas) para organizar y categorizar conversaciones en Chadbot.

## Características

### ✅ Funcionalidades Implementadas

1. **Crear Tag** - Formulario con selector de colores predefinidos y personalizado
2. **Toggle de Privacidad** - Controlar si el tag es privado (solo visible para ti) o público (visible para todo el equipo)
3. **Editar Tag** - Modificar nombre, color y privacidad de tags existentes
4. **Eliminar Tag** - Confirmación antes de eliminar
5. **Vista Previa** - Vista en tiempo real de cómo se verá el tag
6. **Responsive Design** - Adaptado para móvil y escritorio

### 🎨 Características del Selector de Color

- **18 colores predefinidos** organizados en una paleta visual
- **Selector de color personalizado** para cualquier color HEX
- **Vista previa en vivo** del tag con contraste automático de texto
- **Interfaz intuitiva** con cuadrícula de colores clickeables

### 📱 Interfaz Responsive

- **Vista Móvil**: Tarjetas apiladas con menú desplegable de acciones
- **Vista Escritorio**: Tabla completa con todas las columnas
- **Navegación**: Acceso desde el sidebar en la sección "Tags"

## Acceso

### Desde el Sidebar

1. Hacer clic en el menú **"Tags"** (icono de etiqueta) en el sidebar
2. Se abrirá la vista de gestión de tags

### Desde la Página Principal

- La vista de tags está integrada en el dashboard principal
- Se puede acceder directamente desde la navegación lateral

## Uso

### Crear un Nuevo Tag

1. Clic en el botón **"Crear Tag"**
2. Ingresar el nombre del tag (ej: "Cliente VIP", "Urgente", "Seguimiento")
3. **Configurar privacidad**:
   - ✅ **Tag Privado**: Solo tú podrás ver este tag
   - ❌ **Tag Público**: Visible para todo tu equipo
4. Seleccionar un color de la paleta o usar el selector personalizado
5. Ver la vista previa en tiempo real (muestra el tag y el indicador "Privado" si aplica)
6. Clic en **"Crear Tag"**

### Editar un Tag

, color o configuración de privacidad 4. Ver la vista previa actualizada 5. Clic en **"Guardar Cambios"**

**Nota sobre privacidad**:

- Si cambias un tag de **público a privado**, solo tú podrás verlo en las conversaciones
- Si cambias un tag de **privado a público**, todo tu equipo podrá verlo

3. Modificar nombre o color
4. Ver la vista previa actualizada
5. Clic en **"Guardar Cambios"**

### Ver Detalles de un Tag

1. Clic en el menú de acciones del tag
2. Seleccionar **"Ver detalles"**
3. Se mostrará información completa:
   - Nombre
   - Vista previa con el color aplicado
   - Código de color HEX
   - Tipo (Privado/Público)
   - ID único
   - Fecha de creación

### Eliminar un Tag

1. Clic en el menú de acciones del tag
2. Seleccionar **"Eliminar"**
3. Confirmar la eliminación en el modal
4. **Nota**: El tag será removido de todas las conversaciones asociadas

### Buscar Tags

- Usar el campo de búsqueda en la parte superior
- La búsqueda filtra por nombre del tag en tiempo real
- Se aplica debounce para optimizar rendimiento

## Permisos

Según el backend, se requieren los siguientes permisos:

- **`view_tags`**: Para ver la lista de tags
- **`manage_tags`**: Para crear, editar y eliminar tags

## Integración con el Backend

### Endpoints Utilizados

- `GET /api/v1/tags` - Listar tags (paginado)
- `GET /api/v1/tags/{id}` - Obtener tag por ID
- `POST /api/v1/tags` - Crear nuevo tag
- `PUT /api/v1/tags/{id}` - Actualizar tag
- `DELETE /api/v1/tags/{id}` - Eliminar tag

### Modelo de Datos

**Request (Crear/Editar)**:

```typescript
{
  label: string; // Nombre del tag
  color: string; // Color en formato HEX (#RRGGBB)
  isPrivate: boolean; // true = solo visible para el creador, false = visible para todos
}
```

**Ejemplo de creación**:

```json
{
  "label": "No responde",
  "color": "#AAF432",
  "isPrivate": false
}
```

**Response**:

```typescript
{
  id: string;
  clientId: string;
  agentId?: string;
  label: string;      // Nombre del tag
  color: string;      // Color HEX
  isPrivate: boolean; // Si es privado del agente
  createdAt: string;  // ISO timestamp
}
```

## Archivos Modificados/Creados

### ✨ Archivos Nuevos

- `components/management/tag-management.tsx` - Componente principal del CRUD
- `app/tags/page.tsx` - Página de la ruta /tags

### 📝 Archivos Modificados

- `components/layout/sidebar.tsx` - Agregado enlace "Tags" en el menú
- `app/page.tsx` - Agregada vista de tags en el router principal
- `lib/api-types.ts` - Ajustados tipos CreateTagRequest y UpdateTagRequest

### 📚 Archivos Existentes (Sin cambios)

- `lib/api.ts` - Ya contení

### Tags Privados vs Públicos

- **Tags Privados** (`isPrivate: true`):
  - Solo visibles para el usuario que los creó
  - Útiles para organización personal de conversaciones
  - No aparecen en filtros de otros usuarios
  - Identificados con chip "Privado" color amarillo

- **Tags Públicos** (`isPrivate: false`):
  - Visibles para todos los usuarios del mismo cliente (tenant)
  - Útiles para organización compartida del equipo
  - Aparecen en filtros de todos los usuarios
  - Identificados con chip "Público" color verdea los métodos para tags
- `lib/types.ts` - No requirió cambios
- `hooks/use-api.ts` - Utilizado sin modificaciones

## Consideraciones Técnicas

### Multi-Tenant

- Los tags están aislados por `client_id` automáticamente
- El backend filtra tags según el cliente del JWT token

### Optimización

- **Debounce en búsqueda**: 300ms (configurable en `lib/config.ts`)
- **Paginación**: 20 items por página
- **Cancelación de requests**: Uso de AbortSignal para prevenir race conditions

### Responsive Design

- **Breakpoint móvil**: 768px (hook `useIsMobile`)
- **Vistas alternativas**: Tarjetas en móvil, tabla en escritorio
- **Touch-friendly**: Botones de tamaño adecuado para touch (44x44px mínimo)

### Accesibilidad

- **Contraste de texto**: Se calcula automáticamente según el color de fondo
- **Aria labels**: Todos los botones y dropdowns tienen labels apropiados
- **Teclado**: Navegación completa por teclado

## Próximas Mejoras Sugeridas

1. **Filtro de tags en conversaciones** - Ya soportado por el backend
2. **Tags privados vs públicos** - Backend ya distingue `isPrivate`
3. **Asignación masiva de tags** - A múltiples conversaciones
4. **Estadísticas de uso** - Mostrar cuántas conversaciones tienen cada tag
5. **Drag & drop** - Para reordenar tags por prioridad
6. **Categorías de tags** - Agrupar tags por categorías

## Soporte

Para más información sobre la API, consultar:

- `docs/AI_FRONTEND_API_REFERENCE.md` - Sección 1️⃣6️⃣ Tags

---

**Fecha de Implementación**: 18 de Enero, 2026  
**Versión**: 1.0.0
