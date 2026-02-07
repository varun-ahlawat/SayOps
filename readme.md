# SayOps

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

### Fork and Clone

1. Fork this repository by clicking the "Fork" button at the top right of the GitHub page

2. Clone your forked repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SayOps.git
   cd SayOps
   ```

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Build for Production

```bash
npm run build
npm run start
```

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Charts:** Recharts
- **3D Graphics:** Three.js, React Three Fiber
- **Forms:** React Hook Form, Zod

## Project Structure

```
SayOps/
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
