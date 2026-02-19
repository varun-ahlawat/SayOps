# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpeakOps is an AI-powered customer representative platform. The frontend is a Next.js app consuming the `zl-backend` Elysia API via a centralized API client (`lib/api-client.ts`). The platform's AI assistant is called **Eva** (Everything Assistant) — it replaces the old "Super Agent" / "Strategy Assistant" naming.

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
- **Forms:** react-hook-form + zod validation
- **Auth:** Firebase Client SDK (Google Sign-In), dev bypass when `NODE_ENV=development`
- **API:** Direct fetch to `zl-backend` via `lib/api-client.ts` (BFF pattern, no local API routes)
- **Theme:** next-themes (dark/light mode)
- **Notifications:** sonner (toast)

### Repository Structure
```
SpeakOps/
├── app/                           # Next.js App Router pages
│   ├── layout.tsx                 # Global: ThemeProvider, AuthProvider, PersistentEva, Toaster
│   ├── page.tsx                   # Landing page
│   ├── login/                     # Google Sign-In
│   ├── signup/                    # Sign-up flow
│   ├── dashboard/                 # Main dashboard (stats, charts, call history, agent cards)
│   ├── agents/
│   │   └── [agentId]/             # Agent detail: Settings tab + Test tab
│   ├── create-agent/              # Agent creation wizard (provisions Twilio number)
│   ├── documents/                 # Knowledge base (upload/manage documents)
│   ├── history/                   # Call history with recordings
│   ├── integrations/              # Google Calendar, Gmail, HubSpot connect/disconnect
│   ├── settings/                  # Org settings + team invite management
│   ├── chat/
│   │   └── [conversationId]/      # Full-page Eva conversation
│   └── invite/
│       └── [token]/               # Org invite acceptance
├── components/
│   ├── ui/                        # shadcn/ui primitives (60+ components)
│   ├── eva/                       # Eva chat widget system
│   │   ├── PersistentEva.tsx      # Wrapper in global layout
│   │   ├── EvaChatWidget.tsx      # Floating chat widget (resizable, persistent)
│   │   └── useEvaChat.ts          # Hook: messages, size, localStorage persistence
│   ├── agent/                     # Agent management components
│   │   ├── AgentSettingsForm.tsx   # react-hook-form: Basic Info, System Prompt, Advanced Settings
│   │   ├── TestModeSimulator.tsx   # Chat interface for testing agent behavior
│   │   └── ConnectorSelector.tsx   # Checkbox grid for connectors (Google Calendar, Gmail, HubSpot)
│   ├── sidebar/                   # Sidebar sub-components
│   │   ├── NavAgents.tsx          # Collapsible agent list + create button
│   │   └── NavChatHistory.tsx     # Recent chat history
│   ├── app-sidebar.tsx            # Main sidebar layout
│   ├── nav-user.tsx               # User dropdown (account, logout)
│   ├── call-history-table.tsx     # Expandable call table with transcripts
│   ├── section-cards.tsx          # Dashboard stat cards
│   └── site-header.tsx            # Page header with sidebar trigger
├── lib/
│   ├── api-client.ts              # Centralized API wrapper (all backend calls)
│   ├── auth-context.tsx           # React Auth provider (Firebase + dev bypass)
│   ├── types.ts                   # TypeScript interfaces matching Supabase schema
│   ├── firebase.ts                # Firebase client init
│   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
```

### Routing

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login`, `/signup` | Authentication |
| `/dashboard` | Main dashboard with stats, charts, agent cards |
| `/agents/[agentId]` | Agent detail page (Settings + Test tabs) |
| `/create-agent` | Agent creation wizard |
| `/documents` | Knowledge base management |
| `/history` | Call history with audio playback |
| `/integrations` | Third-party integrations (Google, Gmail, HubSpot) |
| `/settings` | Org settings, team invites |
| `/chat/[conversationId]` | Full-page Eva conversation |
| `/invite/[token]` | Accept org invitation |

### Eva Chat Widget
Eva is the platform's AI assistant (backed by the `super` agent on the backend). The widget:
- Floats bottom-right on all pages (`PersistentEva` in global layout)
- Is resizable by dragging the top-left corner
- Persists size and open state to `localStorage` (`eva-chat-state` key)
- Can be maximized to full-page chat at `/chat/[conversationId]`
- Sends messages via `chatWithAgent(prompt, 'super')`

### Agent Detail Page (`/agents/[agentId]`)
Two tabs:
1. **Settings** — `AgentSettingsForm`: name, description, system prompt, advanced settings (knowledge base toggle, connector checkboxes)
2. **Test** — `TestModeSimulator`: chat-based testing interface to emulate customer interactions

### Connector System
Agents can be assigned connectors (Google Calendar, Gmail, HubSpot) via checkboxes in Advanced Settings. The `enabled_connectors` array on the Agent type controls which third-party tools the agent can use. Connectors are authorized at the org level (`/integrations`), but access is per-agent.

## Key Conventions

- **BFF Pattern:** No `app/api/` routes. All data via `lib/api-client.ts` to `zl-backend`.
- **Eva, not Super Agent:** The user-facing name is "Eva". Backend agent ID is still `'super'`.
- **Phone numbers:** Real Twilio toll-free numbers provisioned by backend. Frontend displays `agent.phone_number` — never generates fake numbers.
- **No Twilio in frontend.** All phone ops handled by `zl-backend`.
- **shadcn/ui:** All UI primitives live in `components/ui/`. Use existing components before creating new ones.
- **Icons:** Use `@tabler/icons-react` consistently.
- **Audio:** Call recordings are mulaw 8kHz from GCS, streamed via signed URLs.

## Environment Variables
- `NEXT_PUBLIC_BACKEND_URL` or `AGENT_BACKEND_URL`: URL of `zl-backend` (default `http://localhost:3001`)
- `NEXT_PUBLIC_FIREBASE_*`: Standard Firebase config keys
