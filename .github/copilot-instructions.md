# Chadbot Frontend - AI Agent Instructions

## Project Overview

**Multi-tenant chat interface** for AI-powered sales automation built with **Next.js 15 (CSR)**, **React 19**, **TypeScript**, and **HeroUI**.

### Multi-Tenant Architecture

**CRITICAL**: This is a **multi-client system**. The backend enforces tenant isolation via JWT tokens containing `client_id`. All API calls require `Authorization: Bearer <token>` header. Each client has its own isolated data space - conversations, contacts, messages, and agents are automatically filtered by `client_id` on the backend.

### Technical Stack

**Client-Side Rendered (CSR)** Next.js application exported as static files (`output: 'export'`):

- **Framework**: Next.js 15.5+ (CSR mode - no SSR/SSG)
- **UI**: HeroUI 2.8+ + Tailwind CSS 3.4+
- **Typography**: Bricolage Grotesque (primary font)
- **State**: React hooks (useState, useEffect, useCallback)
- **HTTP**: Native Fetch API with centralized wrapper
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner
- **Icons**: Lucide React
- **Responsive**: Mobile-first design with `useIsMobile` hook (breakpoint: 768px)

## Architecture

### Project Structure

```
app/                    # Next.js App Router (CSR pages)
├── page.tsx           # Main dashboard
├── login/             # Authentication
├── contacts/          # Contact management
├── teams/             # Team management
└── layout.tsx         # Root layout
components/            # React UI components (modular structure)
├── chat/              # Chat & conversation components
│   ├── chat-view.tsx
│   ├── conversation-list.tsx
│   ├── conversation-filters.tsx
│   ├── message-input.tsx
│   └── message-*.tsx
├── layout/            # Navigation & layout
│   ├── sidebar.tsx
│   └── environment-indicator.tsx
├── management/        # User/contact/team management
│   ├── user-management.tsx
│   ├── contact-management.tsx
│   ├── team-management.tsx
│   └── assistant-management.tsx
├── modals/            # All modal dialogs
│   ├── contact-info-modal.tsx
│   ├── new-chat-modal.tsx
│   └── *.modal.tsx
├── settings/          # Settings & configuration
│   ├── settings-view.tsx
│   └── *-section.tsx
├── shared/            # Shared utilities
│   ├── api-error-alert.tsx
│   ├── searchable-select.tsx
│   └── theme-provider.tsx
└── ui/                # Base UI components
    ├── avatar.tsx
    ├── button.tsx
    └── ...
lib/                   # Business logic & API client
├── api.ts            # Centralized HTTP client (API v1)
├── api-types.ts      # Backend API contracts
├── types.ts          # Frontend domain models
├── config.ts         # Environment configuration
└── utils.ts          # Utilities
hooks/                 # Custom React hooks
├── use-api.ts        # Data fetching hook
├── use-theme.ts      # Theme management
└── use-mobile.tsx    # Mobile breakpoint detection
public/               # Static assets
scripts/              # Build scripts
```

## Critical Patterns

### 1. CSR (Client-Side Rendering) Mode

**CRITICAL**: Uses `output: 'export'` in [next.config.mjs](next.config.mjs):

- Pure static files (no Node.js server)
- No API routes - all backend calls via external REST API (v1)
- No SSR/SSG - data fetched client-side
- Deploy to any static host (Netlify, Vercel, S3, CDN)

### 2. Design System & Color Palette

**Brand Colors** (defined in [tailwind.config.js](tailwind.config.js)):

```css
brand: {
  primary: '#3805F2',    // Relleno interior corazón (deep purple)
  purple: '#7957F2',     // Bordes letras (medium purple)
  lavender: '#977EF2',   // Contraste borde (light purple)
  lime: '#BDF26D',       // Color isotipo (bright lime green)
  light: '#F2F2F2',      // Fondo (light gray)
}
```

**HeroUI Theme Colors**:

- **Primary**: `#5413ee` (purple) - Main actions, buttons, links
- **Secondary**: `#c1fe72` (lime) - Accents, highlights, success states
- **Background (Light)**: `#ffffff`
- **Background (Dark)**: `#0D1117`
- **Foreground (Light)**: `#11181C`
- **Foreground (Dark)**: `#ECEDEE`

**Usage Guidelines**:

- Use `brand.primary` for hero sections and brand identity
- Use HeroUI's `primary` color for interactive elements (buttons, links)
- Use `secondary` (lime) for CTAs, success states, and important highlights
- Maintain WCAG AA contrast ratios for accessibility
- Dark mode automatically adjusts colors via `next-themes`

### 3. Mobile-First Responsive Design

**CRITICAL**: All new components and features MUST be mobile-responsive by default.

**Key Patterns**:

1. **Use `useIsMobile` Hook** ([hooks/use-mobile.tsx](hooks/use-mobile.tsx)):

   ```typescript
   import { useIsMobile } from "@/hooks/use-mobile";

   const isMobile = useIsMobile(); // true if viewport < 768px
   ```

2. **Mobile Breakpoint**: `768px` (matches Tailwind's `md:` breakpoint)

3. **Responsive Layout Strategies**:
   - Stack vertically on mobile, horizontal on desktop
   - Hide/show elements conditionally: `{isMobile ? <MobileView /> : <DesktopView />}`
   - Adjust spacing: smaller padding/margins on mobile
   - Mobile menus: hamburger menu, slide-out sidebars with overlay
   - Touch-friendly hit targets: minimum 44x44px for buttons

4. **Tailwind Responsive Classes**:

   ```tsx
   // Mobile-first approach (base styles = mobile, then override for larger screens)
   <div className="flex flex-col md:flex-row gap-2 md:gap-4">
   <button className="w-full md:w-auto px-4 py-2 text-sm md:text-base">
   ```

5. **Common Mobile Patterns**:
   - **Sidebar**: Fixed off-canvas, slides in on mobile, static on desktop
   - **Chat View**: Full-screen on mobile with back button, split-pane on desktop
   - **Modals**: Full-screen on mobile, centered dialog on desktop
   - **Tables**: Convert to cards or horizontal scroll on mobile

**Testing**: Always test at these breakpoints:

- Mobile: 375px (iPhone SE), 414px (iPhone Plus)
- Tablet: 768px (iPad)
- Desktop: 1024px, 1440px, 1920px

### 4. Centralized API Service

All HTTP calls flow through `ApiService` class in [lib/api.ts](lib/api.ts):

```typescript
// ✅ CORRECT - Use apiService singleton
const data = await apiService.getConversations();

// ❌ WRONG - Direct fetch bypasses auth/error handling
const response = await fetch(`${url}/endpoint`); // DON'T
```

**Responsibilities**:

- JWT token management (localStorage key: `chadbot_token`)
- Auto-attach Authorization headers
- Centralized error handling
- Multi-tenant client_id extraction from JWT
- Environment-based URL configuration (API v1)

### 5. Type Safety: API Types vs Domain Types

**Two separate type systems**:

- **`api-types.ts`**: Backend contracts (matches Java DTOs exactly)
- **`types.ts`**: Frontend domain models (UI-friendly)

```typescript
// Backend API type
interface ApiResponse {
  Id: number;
  CreatedDate: string; // ISO string
}

// Frontend domain type
interface DomainModel {
  id: string;
  createdAt: Date; // Parsed Date object
}

// Mapper function converts between them
const model = mapApiResponseToDomain(apiResponse);
```

**Why?** Decouples UI from backend changes, enables domain logic.

### 6. Authentication & JWT

**Flow**: Login → JWT → localStorage → Auto-attach to requests

```typescript
// Login stores token
localStorage.setItem("chadbot_token", token);

// ApiService auto-attaches to all requests
headers: {
  Authorization: `Bearer ${token}`;
}
```

**JWT contains**: `client_id`, user ID, email, roles, expiration. Backend validates all permissions and filters by `client_id`.

### 7. Custom `useApi` Hook

[hooks/use-api.ts](hooks/use-api.ts) provides declarative data fetching:

```typescript
const { data, loading, error, refetch } = useApi(
  () => apiService.getData(filters),
  [filters], // Re-fetch when dependencies change
);
```

**Features**: Loading/error states, dependency tracking, manual refetch, cleanup on unmount.

### 8. Environment Configuration

[lib/config.ts](lib/config.ts) determines API URL by hostname at runtime:

```typescript
// localhost → dev backend
// staging domain → staging backend
// production domain → production backend
```

**No build-time env vars** - single build for all environments.

### 9. Backend API Reference

**CRITICAL**: Consult [docs/AI_FRONTEND_API_REFERENCE.md](../docs/AI_FRONTEND_API_REFERENCE.md) for complete backend API documentation.

This reference includes:

- **Architecture Overview**: Spring Boot WebFlux, Hexagonal Architecture, Multi-Tenant
- **All API Endpoints**: Auth, Users, Roles, Teams, Clients, Credentials, Agents, Assistants, Contacts, Conversations, Messages, Tags
- **Request/Response DTOs**: Complete type definitions for all operations
- **Permissions Model**: Required permissions for each endpoint
- **WebSocket Events**: Real-time updates for conversations and messages
- **Query Parameters**: Pagination, filtering, sorting options
- **Error Responses**: Standard error codes and messages

**When to use**:

- Before implementing any API call
- When adding new features that require backend integration
- When debugging API errors or unexpected responses
- When understanding data models and relationships

## Development Workflows

### Build & Run

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build (static export)
npm run build         # or npm run build:csr

# Preview production build
npm run preview

# Serve static files
npm run serve         # Node.js
npm run serve:python  # Python
```

### Environment Setup

**Required**:

1. Backend API running (Spring Boot - API v1)
2. Valid JWT token (login via `/api/v1/auth/login`)

**Optional**:

- Modify [lib/config.ts](lib/config.ts) for custom API URLs
- Update [next.config.mjs](next.config.mjs) for base paths

## Code Style Guidelines

### Component Structure

```tsx
"use client" // CSR directive

import statements

interface Props {
  // Prop types
}

export default function Component({ props }: Props) {
  // State
  // Effects
  // Handlers
  // Render
}
```

### Naming Conventions

- **Components**: PascalCase (`ChatView`)
- **Functions**: camelCase (`handleSendMessage`)
- **Hooks**: camelCase with `use` prefix (`useApi`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

### Performance Best Practices

- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Avoid unnecessary re-renders with `React.memo` (for large lists)
- Be careful with `useEffect` dependencies (avoid objects/arrays without memoization)

### Error Handling

```typescript
try {
  const result = await apiService.someMethod();
  // Success handling
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error("Error inesperado");
  }
}
```

## When Adding Features

1. **New API endpoint?** → Consult [docs/AI_FRONTEND_API_REFERENCE.md](../docs/AI_FRONTEND_API_REFERENCE.md) for endpoint specs, then add method to `ApiService` in [lib/api.ts](lib/api.ts), define types in [lib/api-types.ts](lib/api-types.ts), create mapper in [lib/types.ts](lib/types.ts).

2. **New page/view?** → Create in `app/` folder, update navigation in [components/sidebar.tsx](components/sidebar.tsx).

3. **New component?** → Place in `components/`, import in parent, follow HeroUI design system and mobile-first approach.

4. **New hook?** → Create in `hooks/`, use `useApi` pattern for data fetching.

## Common Gotchas

1. **JWT Expiration**: No auto-refresh. On 401, redirect to `/login`.

2. **Type Mismatches**: Always use mapper functions when consuming API responses.

3. **Dark Mode**: Uses `next-themes` with localStorage. Script in `<head>` prevents flash.

4. **Pagination Reset**: When changing filters, reset `currentPage` to 1 and clear existing data.

5. **CSR Build**: Run `npm run build` to catch TypeScript errors before deployment.

## Deployment

```bash
# Build for production
npm run build:csr
# → Generates /dist folder with static files

# Deploy to static host
# Netlify: drag /dist folder
# Vercel: vercel --prod
# AWS S3: aws s3 sync dist/ s3://bucket-name
```

### Nginx Configuration

```nginx
location / {
  root /var/www/chadbot-frontend/dist;
  try_files $uri $uri/ /index.html; # SPA fallback
}
```
