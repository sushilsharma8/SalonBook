# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SalonBook is a full-stack salon booking app: React 19 + Vite 6 frontend with Express 4 backend, Prisma 6 ORM, and PostgreSQL. A single `server.ts` monolith serves both the REST API and the Vite-powered SPA in dev mode on port 3000.

### Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **PostgreSQL 16** running locally on port 5432
- A `.env` file with `DATABASE_URL` pointing to a local Postgres database (see `.env.example`)

### Key commands

See `package.json` scripts and `README.md` for the full list. Highlights:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Generate Prisma client | `npx prisma generate` |
| Push schema to DB | `npx prisma db push` |
| Seed demo data | `npm run seed` |
| Dev server (port 3000) | `npm run dev` |
| Lint (TypeScript check) | `npm run lint` |
| Build frontend | `npm run build` |

### Non-obvious caveats

- **PostgreSQL must be running** before starting the dev server or running Prisma commands. Start it with `sudo pg_ctlcluster 16 main start`.
- **Prisma generate** must run after `npm install` (or whenever `prisma/schema.prisma` changes) to generate the typed client in `node_modules/@prisma/client`.
- **`npm run lint`** runs `tsc --noEmit` (TypeScript type-checking only, no ESLint).
- The dev server uses Vite middleware mode (not a separate Vite dev server), so both API and frontend are served from `http://localhost:3000`.
- `JWT_SECRET` has a hardcoded dev fallback (`'super-secret-key-for-dev'`), so the server starts fine without it set in `.env`.
- `GEMINI_API_KEY` and `GOOGLE_MAPS_PLATFORM_KEY` are optional; the app degrades gracefully without them.
- There are no automated test suites in this project; validation is done via `npm run lint` (TypeScript check) and manual testing.
