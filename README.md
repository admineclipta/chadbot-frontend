# 🤖 Chadbot Frontend

> Multi-tenant AI-powered sales automation platform - Client-side rendered (CSR) Next.js application

![Next.js](https://img.shields.io/badge/Next.js-15.5-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![API](https://img.shields.io/badge/API-v1-green)

## 🎯 Overview

Chadbot is a **multi-tenant chat interface** for AI-powered sales automation. Prospects reach out via WhatsApp/Telegram → AI responds and qualifies them → When ready to buy → Human agent is assigned to close the sale.

### Key Features

- 🏢 **Multi-Tenant Architecture** - Complete data isolation per client via JWT `client_id`
- 💬 **Real-time Chat** - WebSocket support for instant updates
- 🤖 **AI Integration** - Automated responses with seamless human handoff
- 📱 **Multi-Channel** - WhatsApp, Telegram support
- 🎨 **Modern UI** - Built with HeroUI and Tailwind CSS
- 🚀 **Static Deployment** - Pure CSR, deploy anywhere (no Node.js server needed)

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15.5+ (CSR mode - `output: 'export'`)
- **UI Library**: HeroUI 2.8+ + Tailwind CSS 3.4+
- **State Management**: React hooks (useState, useEffect, useCallback)
- **HTTP Client**: Native Fetch API with centralized wrapper
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner
- **Icons**: Lucide React

### Project Structure

```
chadbot-frontend/
├── app/                    # Next.js App Router (CSR pages)
│   ├── page.tsx           # Main dashboard
│   ├── login/             # Authentication
│   └── layout.tsx         # Root layout
├── components/            # React UI components
│   ├── chat-view.tsx
│   ├── conversation-list.tsx
│   ├── sidebar.tsx
│   └── ...
├── lib/                   # Business logic & API client
│   ├── api.ts            # Centralized HTTP client (API v1)
│   ├── api-types.ts      # TypeScript types for API
│   ├── config.ts         # Environment configuration
│   └── utils.ts          # Utilities
├── hooks/                 # Custom React hooks
│   ├── use-api.ts        # Data fetching hook
│   └── use-theme.ts      # Theme management
└── public/               # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chadbot Backend API running (v1)

### Installation

```bash
# Clone the repository
git clone https://github.com/admineclipta/chadbot-frontend.git
cd chadbot-frontend

# Install dependencies
npm install --force

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Configuration

The application auto-detects the environment based on hostname (see [lib/config.ts](lib/config.ts)):

- **localhost** → `http://localhost:8080/api/v1/`
- **staging domain** → `https://chadbot-backend-dev.azurewebsites.net/api/v1/`
- **production domain** → `https://chadbot-backend.azurewebsites.net/api/v1/`

No build-time environment variables needed - single build works everywhere! 🎉

## 🔐 Authentication

### Multi-Tenant Flow

1. **Login** → POST `/api/v1/auth/login`

   ```json
   { "email": "user@example.com", "password": "pass123" }
   ```

2. **Receive JWT** with embedded `client_id`:

   ```json
   {
     "token": "eyJ...",
     "user": { "id": "uuid", "email": "...", "roles": [...] }
   }
   ```

3. **All requests** → Token in `Authorization` header

   ```
   Authorization: Bearer eyJ...
   ```

4. **Backend filters** all data by `client_id` automatically
   - Conversations, contacts, messages, agents
   - Complete tenant isolation
   - No need to send `client_id` explicitly

### Token Storage

- **Key**: `chadbot_token` in localStorage
- **Duration**: 24 hours
- **Refresh**: 7 days

## 📡 API Integration

### API Service

All HTTP calls go through the singleton `apiService` in [lib/api.ts](lib/api.ts):

```typescript
import { apiService } from "@/lib/api";

// Login
const response = await apiService.login({ email, password });

// Get conversations (auto-filtered by client_id)
const conversations = await apiService.getConversations(0, 20, "ACTIVE");

// Send message
const message = await apiService.sendMessage({
  conversationId: "uuid",
  content: "Hello!",
  type: "TEXT",
});
```

### WebSocket Support

Real-time updates via WebSocket (to be implemented):

```typescript
import { config } from "@/lib/config";

const socket = new SockJS(config.wsUrl);
const stompClient = Stomp.over(socket);

// Subscribe to conversation events
stompClient.subscribe(`/topic/conversations/${clientId}`, (event) => {
  // Handle CONVERSATION_CREATED, CONVERSATION_ASSIGNED, etc.
});

// Subscribe to messages
stompClient.subscribe(`/topic/messages/${conversationId}`, (event) => {
  // Handle NEW_MESSAGE
});
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build           # Production build (static export)
npm run build:csr       # Alias for build

# Preview
npm run preview         # Preview production build

# Serve
npm run serve           # Serve static files (Node.js)
npm run serve:python    # Serve static files (Python)

# Utilities
npm run clean           # Clean dependencies
```

### Code Style

Follow these conventions:

- **Components**: PascalCase (`ChatView.tsx`)
- **Functions**: camelCase (`handleSendMessage`)
- **Hooks**: camelCase with `use` prefix (`useApi`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

Use `"use client"` directive for all client components (CSR mode).

## 📦 Build & Deployment

### Production Build

```bash
npm run build
# Generates /dist folder with static files
```

### Deploy Options

#### Netlify

```bash
# Drag /dist folder to Netlify dashboard
```

#### Vercel

```bash
vercel --prod
```

#### AWS S3

```bash
aws s3 sync dist/ s3://your-bucket-name
```

#### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/chadbot-frontend/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Verify JWT token saved in localStorage (`chadbot_token`)
- [ ] Check `client_id` extracted from token
- [ ] Load conversations (only from current client)
- [ ] Open conversation and view messages
- [ ] Send text message
- [ ] Send image
- [ ] Assign conversation to agent
- [ ] Change conversation status
- [ ] Logout and verify token cleared

## 🔄 Migration from ChatVRM

See [MIGRATION.md](MIGRATION.md) for detailed migration notes from ChatVRM to Chadbot with API v1.

**Key changes**:

- ✅ Renamed from ChatVRM to Chadbot
- ✅ Migrated from API v2 → API v1
- ✅ Multi-tenant architecture implemented
- ✅ localStorage keys updated (`chatvrm_*` → `chadbot_*`)
- ✅ Simplified API endpoints and types

## 📚 Documentation

- [API Documentation](api-documentation.md) - Complete API v1 reference
- [Migration Guide](MIGRATION.md) - ChatVRM → Chadbot migration notes
- [Copilot Instructions](.github/copilot-instructions.md) - AI agent guidelines

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
2. Make changes following code style guidelines
3. Test thoroughly
4. Submit PR with clear description

### When Adding Features

- **New API endpoint?** → Add method to `ApiService` + types in `api-types.ts`
- **New page/view?** → Create in `app/` folder + update navigation
- **New component?** → Follow HeroUI design system
- **New hook?** → Use `useApi` pattern for data fetching

## 📄 License

[Your License Here]

## 🆘 Support

For issues and questions:

- Create an issue in GitHub
- Contact: [your-email@example.com]

---

**Built with** ❤️ **by Your Team**  
**Version**: 1.0.0 (API v1)  
**Last Updated**: December 2024
