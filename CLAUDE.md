# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpeakOps is an AI-powered customer representative platform. The frontend is a Next.js app consuming the `zl-backend` Elysia API via a centralized API client (`lib/api-client.ts`). The platform's AI assistant is called **Eva** (Everything Virtual Assistant) — it replaces the old "Super Agent" / "Strategy Assistant" naming.

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Development server (http://localhost:3000)
npm run build                  # Production build
npm run lint                   # ESLint
```

## Architecture

### Stack
- **Framework:** Next.js 15 (App Router), React 19
- **UI:** Tailwind CSS, shadcn/ui (Radix primitives), @tabler/icons-react
- **State:** Zustand 5 with `persist` middleware (localStorage)
- **Forms:** react-hook-form + zod validation
- **Auth:** Firebase Client SDK (Google Sign-In), dev bypass when `NODE_ENV=development`
- **API:** Direct fetch to `zl-backend` via `lib/api-client.ts` (BFF pattern, no local API routes)
- **Chat rendering:** react-markdown + remark-gfm
- **Charts:** recharts, @tanstack/react-table
- **Drag & Drop:** @dnd-kit
- **Layout:** react-resizable-panels, embla-carousel-react
- **Theme:** next-themes (dark/light mode)
- **Notifications:** sonner (toast)

### Repository Structure
```
SpeakOps/
├── app/                           # Next.js App Router pages
│   ├── layout.tsx                 # Root layout: ThemeProvider, AuthProvider, Toaster
│   ├── page.tsx                   # Landing page (unauthenticated hero)
│   ├── login/page.tsx             # Google Sign-In page
│   ├── signup/                    # Sign-up flow (page.tsx + SignUpForm.tsx)
│   ├── (authenticated)/           # Protected route group
│   │   ├── layout.tsx             # Sidebar + PanelContainer + PersistentEva
│   │   └── dashboard/page.tsx     # SPA entry — all views render here
│   └── invite/[token]/            # Org invite acceptance
│
├── components/
│   ├── ui/                        # 60+ shadcn/ui primitives
│   ├── panels/                    # SPA view panels (one per view)
│   │   ├── PanelContainer.tsx     # Routes view via URL search params
│   │   ├── DashboardPanel.tsx     # Stats, charts, call history, agent cards
│   │   ├── AgentDetailPanel.tsx   # Agent settings + test tabs
│   │   ├── CreateAgentPanel.tsx   # Agent creation wizard
│   │   ├── DocumentsPanel.tsx     # Knowledge base (upload/manage)
│   │   ├── HistoryPanel.tsx       # Call history with recordings
│   │   ├── SettingsPanel.tsx      # Org settings + team invites
│   │   └── IntegrationsPanel.tsx  # OAuth connect/disconnect for channels
│   ├── chat/                      # Chat UI components
│   │   ├── UniversalChat.tsx      # Main chat widget (bubble + fullscreen modes)
│   │   ├── ChatMessage.tsx        # Message renderer (Markdown, tool calls)
│   │   ├── ToolCallIndicator.tsx  # Tool execution badges
│   │   └── index.ts
│   ├── eva/                       # Eva chat system wrappers
│   │   ├── PersistentEva.tsx      # Global layout wrapper → UniversalChat
│   │   ├── EvaChatWidget.tsx      # Legacy wrapper (delegates to UniversalChat)
│   │   └── useEvaChat.ts          # Legacy hook (use evaChatStore instead)
│   ├── agent/                     # Agent management components
│   │   ├── AgentSettingsForm.tsx   # react-hook-form: Basic, Prompt, Advanced
│   │   ├── TestModeSimulator.tsx   # Chat interface for testing agent behavior
│   │   └── ConnectorSelector.tsx   # Checkbox grid for connectors
│   ├── sidebar/                   # Sidebar sub-components
│   │   ├── NavAgents.tsx          # Searchable agent list + create button
│   │   ├── NavChatHistory.tsx     # Recent Eva conversations
│   │   ├── NavCallHistory.tsx     # Recent calls
│   │   ├── NavDocuments.tsx       # Document list
│   │   ├── NavIntegrations.tsx    # Integration status
│   │   └── NavSection.tsx         # Reusable section with search
│   ├── app-sidebar.tsx            # Main sidebar layout (resizable)
│   ├── nav-user.tsx               # User dropdown (account, logout)
│   ├── site-header.tsx            # Page header with sidebar trigger
│   ├── section-cards.tsx          # Dashboard stat cards
│   ├── call-history-table.tsx     # Expandable call table with transcripts
│   ├── chart-area-interactive.tsx # Messages-per-day chart (recharts)
│   └── data-table.tsx             # @tanstack/react-table wrapper
│
├── stores/                        # Zustand state management
│   ├── evaChatStore.ts            # Chat: messages, conversation, fullscreen, queue
│   ├── conversationsStore.ts      # Eva conversations cache (2 min TTL)
│   ├── agentsStore.ts             # Agents list cache (5 min TTL)
│   └── sidebarStore.ts            # Sidebar width, collapse, section search
│
├── hooks/                         # Custom React hooks
│   ├── useViewParams.ts           # URL search params → view state
│   ├── useChatUrlSync.ts          # Bidirectional ?chat param sync
│   ├── useScrollShortcut.ts       # Keyboard shortcut for chat
│   ├── use-mobile.tsx             # Media query breakpoint
│   └── use-toast.ts               # Toast notifications
│
├── lib/
│   ├── api-client.ts              # Centralized API wrapper (all backend calls)
│   ├── auth-context.tsx           # React Auth provider (Firebase + dev bypass)
│   ├── types.ts                   # TypeScript interfaces matching Supabase schema
│   ├── firebase.ts                # Firebase client initialization
│   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
│
├── middleware.ts                  # Route redirects (SPA → /dashboard?view=...)
├── tailwind.config.ts
├── tsconfig.json                  # Path alias: @/* → ./
└── components.json                # shadcn/ui config
```

### SPA Routing Architecture

The app uses a **single `/dashboard` page** with URL search params for navigation — NOT traditional Next.js file-based routes. This preserves Eva chat state across view switches.

**`middleware.ts` redirects:**
```
/documents        →  /dashboard?view=documents
/history          →  /dashboard?view=history
/integrations     →  /dashboard?view=integrations
/settings         →  /dashboard?view=settings
/create-agent     →  /dashboard?view=create-agent
/agents/{id}      →  /dashboard?view=agent&agentId={id}
/chat/{id}        →  /dashboard?view=agent&chat={id}&chatFullscreen=true
```

**View types** (from `hooks/useViewParams.ts`):
```typescript
type ViewId = "dashboard" | "documents" | "history" | "integrations"
             | "settings" | "agent" | "create-agent"
```

**`PanelContainer.tsx`** reads `?view=` and renders the corresponding panel. Panels are lazy-mounted (only rendered after first visit to avoid unnecessary renders).

### State Management (Zustand)

Four stores with localStorage persistence where needed:

| Store | Key State | Persistence |
|-------|-----------|-------------|
| `evaChatStore` | messages, conversationId, isOpen, isFullscreen, size, queue | `eva-chat-state` (localStorage) |
| `conversationsStore` | evaConversations, messages by ID | No (2 min cache TTL) |
| `agentsStore` | agents list | No (5 min cache TTL) |
| `sidebarStore` | width (200-400px), isCollapsed, section search state | `sidebar-state` (localStorage) |

### Eva Chat Widget

Eva is the platform's AI assistant (backed by the `super` agent on the backend). The system has three render modes:

1. **Collapsed** — floating button (bottom-right)
2. **Open bubble** — resizable widget (380x520px default), drag top-left corner to resize
3. **Fullscreen** — `fixed inset-0` overlay covering entire viewport

**Key components:**
- `PersistentEva.tsx` — in root layout, renders unconditionally
- `UniversalChat.tsx` — main chat component (replaced old EvaChatWidget)
- `ChatMessage.tsx` — renders Markdown (react-markdown + remark-gfm), tool call badges

**Chat URL sync** (`useChatUrlSync.ts`):
- Bidirectional: `?chat=<id>&chatFullscreen=true` ↔ `evaChatStore`
- Uses `skipRef` to prevent render loops
- Allows sharing chat links and refreshing without losing context

**Message flow:**
1. User types → sends via `chatWithAgent(prompt, 'super', undefined, conversationId, history)`
2. If Eva is already thinking, message queues automatically (drained when ready)
3. Backend returns `{ toolCalls, output }` (plus a `broadcast` compatibility alias)
4. If `navigate_to_page` tool called → stored in `pendingNavigation` → panel switches via `setView()`

### Agent Detail Page (`/agents/[agentId]`)
Two tabs:
1. **Settings** — `AgentSettingsForm`: name, description, system prompt, advanced settings (knowledge base toggle, platform checkboxes, connector checkboxes)
2. **Test** — `TestModeSimulator`: chat-based testing interface to emulate customer interactions

### Connector & Channel System
Agents can be assigned connectors (Google Calendar, Gmail, HubSpot) via checkboxes in Advanced Settings. The `enabled_connectors` array controls which third-party tools the agent can use. Connectors are authorized at the org level (`/integrations`), but access is per-agent.

**Platform checkboxes:** SMS, Voice, Web Chat, Facebook, Instagram, WhatsApp, Telegram

**IntegrationsPanel** supports:
- Google Calendar (OAuth)
- Gmail (OAuth)
- Facebook Messenger (OAuth)
- WhatsApp (manual phone number ID + WABA ID)
- Telegram (bot token)
- HubSpot (coming soon)

## Key Conventions

- **SPA with URL params:** Navigate via `setView()` / `useViewParams()`, not Next.js router. All authenticated views render inside `/dashboard`.
- **BFF Pattern:** No `app/api/` routes. All data via `lib/api-client.ts` to `zl-backend`.
- **Eva, not Super Agent:** The user-facing name is "Eva". Backend agent ID is still `'super'`.
- **Zustand for state:** Use stores in `stores/` for shared state. Prefer store over prop drilling or React context.
- **Phone numbers:** Real Twilio toll-free numbers provisioned by backend. Frontend displays `agent.phone_number` — never generates fake numbers.
- **No Twilio in frontend.** All phone ops handled by `zl-backend`.
- **shadcn/ui:** All UI primitives live in `components/ui/`. Use existing components before creating new ones.
- **Icons:** Use `@tabler/icons-react` consistently.
- **Audio:** Call recordings are mulaw 8kHz from GCS, streamed via signed URLs.
- **Assistant payloads:** Backend returns `broadcast` as a compatibility alias of `output`; use plain assistant text.

## Environment Variables
- `NEXT_PUBLIC_BACKEND_URL` or `AGENT_BACKEND_URL`: URL of `zl-backend` (default `http://localhost:3001`)
- `NEXT_PUBLIC_FIREBASE_*`: Standard Firebase config keys (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)
- `NEXT_PUBLIC_USE_REAL_AUTH`: Set to `'true'` to disable dev auth bypass
- `NEXT_PUBLIC_APP_URL`: Frontend URL (for OAuth redirects)
