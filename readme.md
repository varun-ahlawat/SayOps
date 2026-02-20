# SpeakOps

AI-powered customer representatives platform. Create intelligent agents that handle customer phone calls, answer questions, and complete requests.

## Features

- AI agent creation with custom training data
- Call history and analytics dashboard
- Token usage tracking
- Multi-agent support

## Getting Started

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm or pnpm
- **Docker** (Recommended for development)

### Quick Start (Docker)

**Option A: Full Stack (Recommended)**
Go to the `zl-backend` repository and run `docker compose up`. This orchestrates both Frontend and Backend with hot reloading.

**Option B: Frontend Only (Standalone)**
Run the frontend in isolation. It will try to connect to a backend at `http://localhost:3001` (host machine).

```bash
# Run with Hot Reloading
docker compose up

# Run Production Image (Pre-Push Check)
docker compose -f docker-compose.test.yml up
```

### Manual Setup (No Docker)

1. Fork and Clone
   ```bash
   git clone https://github.com/YOUR_USERNAME/SpeakOps.git
   cd SpeakOps
   ```

2. Install Dependencies
   ```bash
   # We use Bun now!
   bun install
   ```

3. Run the Development Server
   ```bash
   bun run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Build for Production
   ```bash
   bun run build
   bun start
   ```

## Tech Stack

- **Runtime:** Bun
- **Framework:** Next.js 15 with App Router
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Charts:** Recharts
- **3D Graphics:** Three.js, React Three Fiber
- **Forms:** React Hook Form, Zod

## Project Structure

```
SpeakOps/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── create-agent/      # Agent creation wizard
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                   # Utilities and mock data
└── hooks/                 # Custom React hooks
```

## License

MIT
