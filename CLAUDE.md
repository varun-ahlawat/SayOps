# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SayOps is an AI-powered customer representatives platform built with Next.js 15 and React 19. It allows users to create intelligent agents that handle customer phone calls, answer questions, and complete requests.

## Commands

### Development
```bash
npm install                    # Install dependencies
npm run dev                    # Run development server (http://localhost:3000)
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
```

### Database Setup
```bash
# One-time setup: Create BigQuery dataset and tables
gcloud auth application-default login
./scripts/setup-bigquery.sh
```

### Deployment
```bash
# Deploy via Cloud Build (configured in cloudbuild.yaml)
gcloud builds submit --config cloudbuild.yaml
```

## Architecture

### Stack
- **Framework:** Next.js 15 with App Router
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Database:** BigQuery only (6 tables: users, agents, call_history, conversation_turns, daily_call_stats, user_documents)
- **Auth:** Firebase (client SDK for frontend, firebase-admin for API routes)
- **Vector Search:** BigQuery VECTOR_SEARCH with Vertex AI text-embedding-005
- **Charts:** Recharts
- **3D Graphics:** Three.js, React Three Fiber
- **Forms:** React Hook Form, Zod
- **GCP Project:** evently-486001
- **Deployment:** Cloud Run via Cloud Build + Docker

### Authentication Flow
1. Frontend uses Firebase client SDK ([lib/firebase.ts](lib/firebase.ts)) with Google Sign-In
2. [lib/auth-context.tsx](lib/auth-context.tsx) provides `AuthProvider` and `useAuth()` hook
3. API routes use `verifyToken()` from [lib/firebase-admin.ts](lib/firebase-admin.ts) to validate JWT from `Authorization: Bearer <token>` header
4. All API calls go through [lib/api-client.ts](lib/api-client.ts) which automatically attaches auth headers

### Database Layer
- [lib/bigquery.ts](lib/bigquery.ts) provides typed helpers: `query<T>()`, `insertRow()`, `insertRows()`, `table()`
- Uses Application Default Credentials (ADC) — authenticate via `gcloud auth application-default login`
- [lib/types.ts](lib/types.ts) defines TypeScript interfaces matching BigQuery schema
- No caching layer (no Redis) — queries hit BigQuery directly

### Vector Search Pipeline
- [lib/embeddings.ts](lib/embeddings.ts) implements document search via BigQuery vector embeddings
- Text → embeddings via Vertex AI `text-embedding-005` model
- File uploads stored in `user_documents` table with OCR pipeline placeholder for PDFs
- `vectorSearch()` uses BigQuery `VECTOR_SEARCH` with cosine distance
- OLM-OCR integration is a placeholder (see `extractTextWithOlmOcr()`)

### API Routes
All routes under [app/api/](app/api/):
- **Authentication:** All routes verify Firebase token via `verifyToken()`
- **Pattern:** Export `GET`, `POST`, `PUT`, `DELETE` functions from `route.ts` files
- **Error handling:** Return `NextResponse.json({ error: "..." }, { status: ... })`
- **User context:** Extract `uid` from verified token to scope queries

Key routes:
- `/api/user` — User CRUD
- `/api/agents` — Agent management
- `/api/agents/[agentId]/calls` — Call history
- `/api/stats` — Dashboard analytics
- `/api/upload` — File upload with multipart/form-data
- `/api/documents` — List uploaded documents

### Environment Variables
```bash
# Firebase Client SDK (NEXT_PUBLIC_ prefix for browser access)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# GCP (server-side only)
GCP_PROJECT_ID=evently-486001
BQ_DATASET=sayops

# Optional
OLM_OCR_API_URL=http://localhost:8080/api/ocr
```

## Project Structure

```
SayOps/
├── app/                       # Next.js App Router
│   ├── page.tsx              # Landing page
│   ├── login/                # Login page
│   ├── signup/               # Signup page
│   ├── dashboard/            # Main dashboard
│   ├── create-agent/         # Agent creation wizard
│   └── api/                  # API routes (backend)
│       ├── user/
│       ├── agents/
│       ├── stats/
│       ├── upload/
│       └── documents/
├── components/               # React components
│   └── ui/                   # shadcn/ui primitives (60+ components)
├── lib/                      # Core utilities
│   ├── firebase.ts           # Firebase client SDK init
│   ├── firebase-admin.ts     # Firebase admin + verifyToken()
│   ├── bigquery.ts           # BigQuery client + helpers
│   ├── types.ts              # Shared TypeScript types
│   ├── auth-context.tsx      # React AuthProvider
│   ├── api-client.ts         # Frontend API fetch wrappers
│   ├── embeddings.ts         # Vector search pipeline
│   └── utils.ts              # cn() utility for Tailwind
├── hooks/                    # Custom React hooks
├── scripts/
│   └── setup-bigquery.sh     # One-time BigQuery setup
├── Dockerfile                # Multi-stage Docker build
├── cloudbuild.yaml           # Cloud Build CI/CD config
└── next.config.mjs           # Next.js config (standalone output, ignoreBuildErrors: true)
```

## Key Conventions

### TypeScript
- `next.config.mjs` has `ignoreBuildErrors: true` — TypeScript errors don't block builds
- All types in [lib/types.ts](lib/types.ts) match BigQuery schema exactly (snake_case fields)
- API routes should validate request bodies before querying BigQuery

### Firebase Auth
- Client: Use `useAuth()` hook from [lib/auth-context.tsx](lib/auth-context.tsx)
- Server: Always call `verifyToken(req.headers.get("authorization"))` in API routes
- Token is passed as `Authorization: Bearer <token>` header

### BigQuery Queries
- Use parameterized queries via `query<T>(sql, params)` to prevent injection
- Use `table("table_name")` helper to get fully qualified table names
- Example:
  ```typescript
  const users = await query<User>(
    `SELECT * FROM ${table("users")} WHERE id = @uid`,
    { uid }
  )
  ```

### Component Organization
- Use shadcn/ui components from [components/ui/](components/ui/)
- Prefer `"use client"` directive for interactive components
- Server components by default (App Router convention)

### File Uploads
- Stored directly in BigQuery `user_documents` table (no Cloud Storage)
- Files are base64-encoded or stored as raw text
- OCR pipeline is a placeholder — see [lib/embeddings.ts](lib/embeddings.ts)

## Deployment

### Docker
- Multi-stage build in [Dockerfile](Dockerfile)
- Standalone Next.js output mode
- Runs on port 8080 in production
- Firebase config passed as build args

### Cloud Build
- [cloudbuild.yaml](cloudbuild.yaml) defines CI/CD pipeline
- Builds Docker image → pushes to Artifact Registry → deploys to Cloud Run
- Firebase env vars set as substitutions
- Cloud Run config: 512Mi memory, 1 CPU, 0-10 instances

### Cloud Run
- Service name: `sayops`
- Region: `us-central1`
- Unauthenticated access (auth handled by Firebase in-app)
- Environment variables: `GCP_PROJECT_ID`, `BQ_DATASET`

## BigQuery Schema

6 tables in dataset `sayops`:

1. **users** — User accounts
2. **agents** — AI agent configurations
3. **call_history** — Call records
4. **conversation_turns** — Turn-by-turn conversation data
5. **daily_call_stats** — Aggregated daily metrics
6. **user_documents** — Uploaded files + vector embeddings (ARRAY<FLOAT64>)

Vector search index: `idx_user_documents_embedding` (IVF, COSINE distance)

Run `./scripts/setup-bigquery.sh` to create schema.

## Google Cloud Services

All services use Application Default Credentials (ADC):

1. **BigQuery** — Database for all data
2. **Firebase Auth** — User authentication
3. **Vertex AI** — Text embeddings (text-embedding-005)
4. **Cloud Run** — Hosting
5. **Cloud Build** — CI/CD
6. **Artifact Registry** — Docker image storage (us-central1-docker.pkg.dev)

Enable required APIs:
```bash
gcloud services enable bigquery.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

## Common Tasks

### Add a New API Route
1. Create `app/api/your-route/route.ts`
2. Export HTTP method handlers (GET, POST, etc.)
3. Verify Firebase token: `const uid = await verifyToken(req.headers.get("authorization"))`
4. Query BigQuery via `query<T>()` or `insertRow()`
5. Return `NextResponse.json(data)`

### Add a New Table
1. Add schema to `scripts/setup-bigquery.sh`
2. Add TypeScript interface to [lib/types.ts](lib/types.ts)
3. Run setup script or manually create via `bq mk --table`

### Add Vector Search to Agent
1. Upload documents via `/api/upload`
2. Call `processDocument(documentId)` from [lib/embeddings.ts](lib/embeddings.ts)
3. Query via `vectorSearch(queryText, agentId)` in your API route
