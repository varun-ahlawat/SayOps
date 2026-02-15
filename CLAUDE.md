# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpeakOps is an AI-powered customer representative platform. It uses a BFF (Backend-for-Frontend) pattern, consuming the `zl-backend` Elysia API on port 3001.

## Commands

### Development
```bash
npm install                    # Install dependencies
npm run dev                    # Run development server (http://localhost:3000)
npm run build                  # Build for production
npm run lint                   # Run ESLint
```

## Architecture

### Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Auth:** Firebase Client SDK (Google Sign-In)
- **API Client:** Direct fetch to `zl-backend` (BFF Pattern)
- **Theme:** `next-themes` (Dark/Light mode support)

### Repository Structure
```
SayOps/
├── app/                       # Next.js App Router
│   ├── (auth)/                # Auth related pages (login, signup)
│   ├── assistant/             # Business Assistant strategy sessions
│   ├── dashboard/             # Main dashboard analytics
│   ├── history/               # Call history with audio playback
│   ├── documents/             # Knowledge base management
│   ├── create-agent/         # Simple agent creation wizard
│   └── layout.tsx            # Global layout with ThemeProvider and SuperAgent widget
├── components/               # UI components
│   ├── ui/                   # shadcn/ui primitives
│   ├── nav-*.tsx             # Sidebar sub-components
│   └── super-agent-chat.tsx  # Floating assistant widget
├── lib/                      # Core utilities
│   ├── api-client.ts         # Centralized API fetcher (zl-backend wrapper)
│   ├── firebase.ts           # Firebase client initialization
│   ├── auth-context.tsx      # React Auth provider
│   └── types.ts              # Shared TS interfaces (Supabase schema)
```

## Key Conventions

- **BFF Pattern:** No local `app/api` routes. All data is fetched via `lib/api-client.ts` from `zl-backend`.
- **Naming:** Be direct and intuitive (e.g., "Create Agent" instead of "Quick Create").
- **Navigation:** Use Next.js `Link` for all internal routing.
- **Audio:** Call recordings are mulaw 8kHz from GCS, streamed via signed URLs.

## Environment Variables
- `AGENT_BACKEND_URL`: URL of `zl-backend` (usually http://localhost:3001)
- `NEXT_PUBLIC_FIREBASE_*`: Standard Firebase config keys
