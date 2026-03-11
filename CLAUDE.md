# CLAUDE.md — EHR Reconciliation Project

This file documents the codebase structure, development workflows, and conventions for AI assistants working in this repository.

## Project Overview

`ehr-reconciliation` is an Electronic Health Record (EHR) reconciliation tool. The project is in early scaffolding phase — the skeleton is in place but core reconciliation and validation logic has not yet been implemented.

The architecture is a **TypeScript monorepo** with two independent packages:
- `client/` — React 19 + Vite frontend (port 5173)
- `server/` — Express 5 + Node.js backend (port 3001)

The server expects an Anthropic API key (`ANTHROPIC_API_KEY`), indicating AI-assisted reconciliation logic is planned.

---

## Repository Structure

```
ehr-reconciliation/
├── .env.example          # Required env var template (copy to .env)
├── .gitignore
├── CLAUDE.md             # This file
├── client/               # React frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.css
│   │   ├── App.tsx       # Root component (currently Vite scaffold)
│   │   ├── index.css
│   │   └── main.tsx      # Entry point — mounts <App /> to #root
│   ├── eslint.config.js  # Flat ESLint config
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json     # Composite config (references app + node)
│   ├── tsconfig.app.json # App source TS config
│   ├── tsconfig.node.json # Vite config TS config
│   └── vite.config.ts
└── server/               # Express backend
    ├── src/
    │   └── index.ts      # Entry point — Express app setup
    ├── package.json
    └── tsconfig.json
```

---

## Environment Setup

Copy `.env.example` to `.env` in the **project root** and fill in values:

```
ANTHROPIC_API_KEY=   # Required for AI-assisted reconciliation
API_SECRET_KEY=      # Custom API auth secret
PORT=3001            # Server port (default: 3001)
```

The server loads `.env` via `dotenv.config()` at startup. The client (Vite) reads env vars prefixed with `VITE_` — add those to `client/.env` if needed.

---

## Development Workflows

### Starting development servers

Both servers must run concurrently in separate terminals:

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev        # nodemon + ts-node, auto-reloads on change

# Terminal 2 — Frontend
cd client
npm install
npm run dev        # Vite dev server with HMR
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health → `{ "status": "ok" }`

### Running tests

```bash
cd server
npm run test       # Vitest (watch mode by default)
```

No test files exist yet. Add tests under `server/src/` with `.test.ts` or `.spec.ts` suffixes.

### Linting

```bash
cd client
npm run lint       # ESLint on all *.ts and *.tsx files
```

No lint script exists on the server yet; TypeScript strict mode (`tsc --noEmit`) serves as a type check.

### Building for production

```bash
# Server
cd server
npm run build      # tsc → outputs to dist/

# Client
cd client
npm run build      # tsc -b && vite build → outputs to dist/
npm run preview    # Preview the production build locally
```

---

## Architecture & Key Conventions

### TypeScript

- **Strict mode is enabled** on both client and server. No `any` unless unavoidable and commented.
- Server targets `ES2020` / `commonjs` modules.
- Client targets `ES2022` / `ESNext` modules (bundler resolution via Vite).
- Never disable `strict`, `noUnusedLocals`, or `noUnusedParameters` without discussion.

### Server (Express 5)

- Entry: `server/src/index.ts`
- CORS is locked to `http://localhost:5173`. Update this list when deploying.
- All routes should be grouped under `/api/` prefixes.
- Planned route namespaces (currently commented out):
  - `POST /api/reconcile` — reconciliation logic
  - `POST /api/validate` — validation logic
- Use **Zod** (`zod` is already installed) for all request body validation at route boundaries.
- Export `app` as default from `index.ts` to support testing without starting the server.

### Client (React 19 + Vite)

- Entry: `client/src/main.tsx` → `App.tsx`
- `App.tsx` is currently the Vite scaffold (counter demo). Replace with real application UI.
- React 19 strict mode is enabled in `main.tsx` — double-invocation of effects in development is intentional.
- No state management library is installed; use React context for shared state until complexity warrants something more.
- No component library is installed; build components from scratch or add one explicitly.

### Validation

- **Zod** is installed on the server for runtime schema validation.
- Define Zod schemas close to where they are used (in the route file or a sibling `*.schema.ts` file).
- Infer TypeScript types from Zod schemas (`z.infer<typeof Schema>`) rather than duplicating types.

### Anthropic / AI Integration

- The `ANTHROPIC_API_KEY` env var is present in `.env.example`, indicating AI-powered features are planned.
- When adding Anthropic SDK usage, install `@anthropic-ai/sdk` in `server/`.
- Keep all AI calls server-side; never expose the API key to the client.

---

## What Has Not Been Implemented Yet

The following are scaffolded but empty:

| Area | Status |
|---|---|
| `/api/reconcile` route | Commented placeholder only |
| `/api/validate` route | Commented placeholder only |
| Anthropic SDK integration | Not installed |
| Database / ORM | Not configured |
| Authentication middleware | Not implemented |
| Client UI | Default Vite scaffold |
| Tests | No test files exist |
| CI/CD | No GitHub Actions configured |

When implementing these, follow the conventions above and update this file.

---

## Git Conventions

- Branch format: `claude/<task-id>` for AI-assisted work.
- Commit message format: `<type>: <short description>` (e.g., `feat: add reconcile route`, `fix: cors origin`, `chore: update deps`).
- Never commit `.env` — it is in `.gitignore`.
- `node_modules/` and `dist/` are gitignored at the root.
