# ChillOuts — Meet Up. Find Each Other. Chill.

Single full-stack Next.js (App Router, TypeScript) + Tailwind v4 + shadcn/ui + PostgreSQL (Docker) + Prisma 6 + OpenStreetMap/Leaflet.

## Stack (Bun only — no npm/yarn/pnpm/npx)

```bash
bun install
docker compose up -d        # PostgreSQL 18 (needs Docker daemon)
docker compose ps
bun run db:setup            # migrate + seed
bun run db:seed             # reseed demo data
bun run dev                 # http://localhost:3000
bun run build
bun run lint
```

Local note: `.env` → `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chillouts"`.
Copy `.env.example` to `.env`. Never commit `.env`.

## Auth (Auth.js v5)

- Production: **Google only** (`/login` shows Continue with Google). First sign-in auto-provisions a `User` row by verified email.
- Development: Google (if `GOOGLE_CLIENT_ID/SECRET` set) **plus** demo-user picker (Credentials provider, registered dev-only).
- Sessions are signed JWTs; all routes derive identity server-side via `lib/auth.ts`.

Google setup (your step): Cloud Console → OAuth consent screen → Web client →
authorized redirect `https://<app>.vercel.app/api/auth/callback/google`
(and `http://localhost:3000/api/auth/callback/google` for local) → set env vars.

## Core flows

- Create: `/chillouts/create` (name*, your name*, where, lat/lng, max, description)
- Join: invite code on home, QR/link share dialog, or Join button
- Share location: explicit opt-in via browser geolocation, 8s polling for live markers
- Host moderation: participant ⋮ menu → Block → AlertDialog confirm → server block (revokes access, deletes live location, hides marker, prevents rejoin + location POSTs with 403). Blocked list → Unblock.
- End ChillOut (host), Leave (participant; host has no Leave).

Seeded demo users (dev): rory ivor (host), Elena Rostova, Marcus Vance, Maya Lin, Arjun Rao (blocked on Evening ChillOut), Priya Nair.

## Developer Mode (dev-only, admin-only)

Gate (all server-enforced): `NODE_ENV=development` + `ENABLE_LOCATION_DEV_MODE=true` + session email in `DEV_MODE_ADMINS`.
Absent in production → simulation impossible there.
When ON: search real places (`/api/geocode` → Nominatim, throttled+cached) or pick on map; shares marked `isSimulated` (violet marker, Sim badge); same OSRM ETA pipeline as real mode.

## Deploy (Vercel + Neon)

1. Neon project → pooled URL (`DATABASE_URL`) + direct URL (`DIRECT_URL`).
2. Vercel env: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (fresh random), `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_APP_URL=https://<app>.vercel.app`, `AUTH_TRUST_HOST=true`. Omit dev-mode vars.
3. `prisma migrate deploy` → first Google sign-in provisions your user. Do not seed demo data in prod.

OpenStreetMap tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with attribution, Leaflet via Client Component (`components/chillout-map-loader.tsx` + `chillout-map-impl.tsx`, never SSR-rendered). Driving ETA via OSRM (cached, haversine fallback).

## Reference

Built from `stitch_web_app_prototype_re_creation.zip` (4 screens). Progress log: `CHECKLIST.md`.
