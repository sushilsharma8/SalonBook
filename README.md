<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

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
