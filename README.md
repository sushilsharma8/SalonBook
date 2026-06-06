 
# SalonBook

SalonBook is a full-stack salon booking app with:

- React + Vite frontend
- Express API server
- Prisma ORM
- Neon Postgres database

## Prerequisites

- Node.js 20+
- npm
- A Neon database (or use the project Neon DB already created)
- A Gemini API key (if you use Gemini-backed features)

## Environment Setup

1. Copy environment template:
   `cp .env.example .env`
2. Update values in `.env`:
   - `DATABASE_URL` (Neon Postgres connection string)
   - `JWT_SECRET` (long random string)
   - `GEMINI_API_KEY` (if needed)
   - `APP_URL` (optional for local dev)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (recommended for persistent image uploads)
   - `SUPABASE_STORAGE_BUCKET` (optional, defaults to `salon-images`)
   - `SUPABASE_STORAGE_FOLDER` (optional, defaults to `salons`)

## Local Development

1. Install dependencies:
   `npm install`
2. Generate Prisma client:
   `npx prisma generate`
3. Push schema to Neon:
   `npx prisma db push`
4. Seed demo data (optional):
   `npm run seed`
5. Start dev server:
   `npm run dev`

App runs at `http://localhost:3000`.

## Useful Commands

- `npm run dev` - run Express + Vite in dev mode
- `npm run build` - build frontend assets with Vite
- `npm run start` - run production server locally
- `npm run lint` - TypeScript type check
- `npm run seed` - seed demo data into the configured DB

## Vercel Deployment

This repo includes Vercel config via `vercel.json` and serverless entrypoint at `api/index.ts`.

Before deploying, set these environment variables in Vercel project settings:

- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY` (if required)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (optional)
- `SUPABASE_STORAGE_FOLDER` (optional)

## Image Upload Storage

- `POST /api/seller/upload-images` uses Supabase Storage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
- Without Supabase config, the server falls back to local disk (`uploads`) in dev and `/tmp/uploads` on Vercel.
- For production, Supabase Storage is strongly recommended because local/serverless file systems are not durable.

Deploy:

1. Login:
   `npx vercel login`
2. Deploy to production:
   `npx vercel --prod`

## Database Notes

- Prisma schema lives in `prisma/schema.prisma`.
- For schema changes in development, update schema and run:
  `npx prisma db push`
- For production-safe schema evolution, prefer Prisma migrations (`prisma migrate`) with a checked-in migrations history.
