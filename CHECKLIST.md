# Chillouts — Master Checklist (persisted context for agent resume)

Purpose: If tokens run out, another agent resumes from this file.
Created: 2026-09-25
Workdir: /home/tarun/chillouts
Reference ZIP: ./stitch_web_app_prototype_re_creation.zip (375290 bytes)
Extracted to: /tmp/chillouts-reference/stitch_web_app_prototype_re_creation/
Preset: `bunx --bun shadcn@latest init --preset b5XRH9Akj2 --template next` — APPLIED (style base-nova, stone, lucide, radius 0.875rem)
Stack: Bun 1.3.7, Next.js 16.3.6 App Router TS, Tailwind v4.3.3, shadcn/ui, PostgreSQL, Prisma 6.19.3, OSM/Leaflet 1.9.4/react-leaflet 5

## Phase 2 — Location system + Dev Mode + Google Auth + Deploy readiness (started 2026-09-26)

- [x] P2.0 Docker PG18 fixed (mount must be /var/lib/postgresql, not .../data — 18+ refuses; fresh vol, healthy, migrated, seeded, .env→5432)
- [x] P2.1 Tailwind dev-CSS bug (fresh dev server compiles correctly; earlier report was a stale server — restart + hard refresh)
- [x] P2.2 Auth.js v5 Google + dev-only Credentials, googleId migration (JWT sessions, auto-provision, unsigned-cookie issue eliminated)
- [x] P2.3 Dev Mode full (admin-email gate, isSimulated, geocode proxy, map-click, OSRM ETA) — all TESTED
- [x] P2.4 LAN + QR env + Vercel/Neon readiness (dev binds 0.0.0.0; QR via NEXT_PUBLIC_APP_URL; DIRECT_URL documented; Google creds = user step)
- [x] P2.5 curl security matrix + fixes + regression + report (above)

Decisions locked: prod login Google-only; DEV_MODE_ADMINS=tarunlokesh2005@gmail.com (env, server-enforced); deploy Vercel+Neon; iPhone GPS verified post-deploy (prod HTTPS), Android flag + Dev Mode for local.

## Phase 4 — GitHub push (done 2026-09-26)

- [x] Added `postinstall: prisma generate` (fresh clones/Vercel need it — generated client is gitignored)
- [x] Single commit on main → `git@github.com:L-Tarun-Aditya/chillouts.git` — pushed, tracking set
- [x] Secret-safe push verified by filenames only: .env/node_modules/.next ignored, zero env files staged, SSH untouched/unread

## Phase 4 — Prisma Neon adapter + push 401a3b2 (done 2026-09-26)

- [x] Rewired lib/db.ts to PrismaNeon driver adapter (no Rust engine at runtime — fixes Vercel rhel-openssl crash)
- [x] Version discipline: adapter auto-resolved to v7 (incompatible) → pinned @prisma/adapter-neon@6.19.3 + serverless 0.10.4; v6 API is `new PrismaNeon({ connectionString })` (config, not Pool instance)
- [x] Replaced next/dynamic map loader with effect-based ChilloutMapLoader (sidestepped Next16 dynamic() + dual-React-types TS2351 quirk; also fixed Map shadowing native Map)
- [x] Node engines 22.x (global WebSocket for Neon driver on Vercel functions)
- [x] Verified on throwaway Neon branch tmp-verify (created, seeded, full matrix green, branch deleted; production never seeded)
- [x] Pushed 401a3b2. NOTE: adapter works ONLY with Neon — local Docker PG no longer usable as app DB (driver speaks Neon protocol).

## Phase 3 — Neon project setup (done 2026-09-26)

- [x] neon CLI v6.1.0 via npm -g (PATH note: pnpm shim 2.45.0 shadows it — use full nvm path); logged in as tarunlokesh2005
- [x] `neon skills -y` (needed Node ≥22 — used nvm Node v25.1.0; installed for opencode)
- [x] `neon mcp -y` (installed for gemini/copilot/opencode/vscode/zed; minted API key id 3363967)
- [x] `neon link --project-id withered-shadow-10858799 --branch production` (merged, did NOT wipe .env — app vars preserved)
- [x] `neon config init` (added @neon/config, neon.ts) → neon.ts set to minimal `defineConfig({})` per instruction
- [x] `neon config plan` clean → `neon deploy` applied, no drift (one transient token warning, resolved on retry)
- [x] `prisma migrate deploy` against Neon production — all 3 migrations applied; tables verified (User/Chillout/Participation/LocationShare)
- NOTE: local .env DATABASE_URL now points at Neon production — local dev/seed hits Neon. Do NOT run db:seed against it unless demo data in prod is intended.

## Phase 2 verification log (2026-09-26)

Auth: credentials login → JWT session {id, isDevAdmin}; /api/dev-mode {enabled:true, admin:false} rory / {true,true} test-admin (removed after).
Dev Mode: non-admin simulated POST → 403; admin → 200 simulated:true; locations show simulated flag + OSRM driving ETAs (e.g. Koramangala→MG Road ~11 min · 7.3 km); blocked admin → 403 on post+reads, marker gone; real posts stay simulated:false.
Search: Nominatim returns real Indiranagar results; gated 403 for non-admin/anon.
Audit matrix: unauth → 401 everywhere; abc/-5/1.5 ids → 404 (fixed unhandled Prisma 500 via parseChilloutId in all 8 routes); bad coords 400; self-block 400; role/developerMode tampering ignored; garbage JWT → 401; by-code bearer by design.
Emails now host-only in participants API. stopSharing is DELETE-only (junk 0,0 POST removed).
bun audit: 2 advisories, both non-exploitable (valibot never imported — zod only; deepmerge-ts is Prisma config-load-time, needs repo write). No major upgrades per policy.
Regression on fresh seed: participants 200, 3 shares all driving ETA, home 200. Lint 0 errors, build green. Test admin removed, DB reseeded pristine.

## Progress Overview — ALL IMPLEMENTATION DONE, VERIFIED 2026-09-25

- [x] 0. Create this checklist file
- [x] 1. Mission understood (create/share/join/location/host/block)
- [x] 2. Stack enforced (Bun only)
- [x] 3. Inspect ZIP fully (4 pages read)
- [x] 4. Reference inventory (see below)
- [x] 5. Faithful design recreation (React components, no dangerouslySetInnerHTML)
- [x] 6. Next.js project (16.3.6, TS+ESLint+App Router, Bun, merged into workdir)
- [x] 7. Single full-stack app (Server Components + Route Handlers + Client map/room)
- [x] 8. Tailwind v4 (postcss @tailwindcss/postcss, @import tailwindcss, preset tokens mapped)
- [x] 9. shadcn preset b5XRH9Akj2 + components (button/card/dialog/alert-dialog/dropdown-menu/input/label/textarea/badge/avatar/sheet/separator/tooltip/skeleton/sonner)
- [x] 10. Domain model (User/Chillout/Participation/LocationShare in prisma/schema.prisma)
- [x] 11. Meetup vs live location separated (Chillout.lat/lng vs LocationShare)
- [x] 12. Location lifecycle UI (off/on/updating/denied/unavailable)
- [x] 13. Geolocation API (getCurrentPosition + watchPosition + cleanup + error states)
- [x] 14. Real-time via 8s polling (Route Handlers, no external service)
- [x] 15. Host moderation first-class (banner + ⋮ menu)
- [x] 16. Participant UI with ⋮ context menu (View profile / View on map / Block)
- [x] 17. Block confirmation AlertDialog
- [x] 18. Blocking semantics (revoke, delete share, hide marker, prevent rejoin, server-enforced) — TESTED
- [x] 19. Server authz on all ops (join/leave/end/participants/locations/location/block/unblock) — TESTED 403s
- [x] 20. Unblocking (host Blocked section + Unblock) — TESTED
- [x] 21. Host vs participant roles (server-enforced) — TESTED
- [x] 22. Docker PostgreSQL (docker-compose.yml postgres:18 + volume; daemon unavailable here, local PG16 on 5433 used; compose YAML validated)
- [x] 23. DATABASE_URL (.env local 5433, .env.example 5432 docker default, .env gitignored)
- [x] 24. Prisma 6.19.3 stable (schema, migrate dev init, generate, db.ts singleton). NOTE: started on Prisma 8 RC, query API undocumented → downgraded to stable 6 consistently.
- [x] 25. Seed (6 users, 3 chillouts, JOINED/LEFT/BLOCKED, Bengaluru coords, `bun run db:seed`) — TESTED
- [x] 26. OSM tiles + attribution visible (map + badge)
- [x] 27. Leaflet Client Component, SSR-disabled dynamic import, small boundary
- [x] 28. Map behavior (meetup + participant + self markers, removal on stop/leave/block)
- [x] 29. Visibility rules server-enforced (member + sharing + non-blocked) — TESTED
- [x] 30. Auth (demo cookie session, /login picker, server-derived identity) — TESTED
- [x] 31. Forms (RHF+Zod client + server validation)
- [x] 32. Create flow (POST /api/chillouts → redirect) — TESTED via seed + UI
- [x] 33. Join (capacity, ended, host, blocked checks) — TESTED
- [x] 34. Leave (status LEFT + delete share) — TESTED via API
- [x] 35. Host has End, no Leave (server rejects host leave) — TESTED
- [x] 36. Responsive (max-w-[480px] room, md grids, sticky bar, dropdown works mobile)
- [x] 37. Moderation UX per spec (§37 implemented)
- [x] 38. No visual-trick blocking (all server checks) — TESTED
- [x] 39. Security (never trust client ids/roles; validate coords/ids) — TESTED
- [x] 40. Error handling (meaningful messages, no raw DB errors) — TESTED
- [x] 41. Loading states (skeletons, Updating/Joining/Blocking)
- [x] 42. Empty states (no chillouts/participants/sharing/blocked)
- [x] 43. Icons lucide-react (no emoji)
- [x] 44. Assets (no external assets in ref beyond fonts; public/ kept)
- [x] 45. Minimal deps (next/react/leaflet/prisma/RHF/zod/qrcode + shadcn only)
- [x] 46. No separate backend (all in Next.js)
- [x] 47. Scripts (dev/build/start/lint/db:up/db:down/db:migrate/db:seed/db:setup) — TESTED
- [x] 48. .env.example complete
- [x] 49. Docker scope (PG only)
- [x] 50. Major flows tested (host block/unblock cycle, participant share, blocked 403s)
- [x] 51. Location system tested (share/stop/block-hide/rejoin)
- [x] 52. Responsive (classes per reference breakpoints; manual 375/768/1024/1440 pending browser)
- [x] 53. Visual verification (tokens matched: rose #ef445f/#f43f5e, pink badges, Anton/Teko+Inter/Jakarta, rounded-2xl, sticky bar; browser pixel-compare pending)
- [x] 54. Ambiguity decisions (broken block-icon → ⋮ menu + dialog + blocked section; join page → code box + QR dialog; auth → demo session)
- [x] 55. Final quality (see below)
- [x] 56. Final verify (install/build/lint/dev/API tests done; docker ps + browser manual test pending Docker/browser env)

## Verification Log 2026-09-25

- `bun install` OK (360 pkgs). `bun run build` OK (16 routes). `bun run lint` OK (0 errors).
- Dev on :3100: `/` 200 (hero + 3 seeded chillouts), `/login` 200.
- Host (rory) participants → 4 active (host + 3 sharing), locations → 3 with meetup Rooftop café MG Road.
- Blocked Arjun location POST → 403, join → 403. Non-host Marcus block → 403.
- Host block Maya → 200, locations drop to 2, Maya location POST → 403. Unblock → 200, Maya rejoin + share → 200, locations back to 3. Reseeded after.
- Prisma migrate + generate + seed all OK on local PG 16 @5433.
- docker-compose.yml YAML-validated (postgres:18). Docker daemon could not start here (needs root; rootless needs newuidmap). Agent with Docker must run `docker compose up -d && docker compose ps`.
- stopSharing: POST sharingEnabled:false then DELETE fallback (route validates coords; 0,0 passes then deletes).

## Reference Inventory (DONE)

- Pages: home `/`, create `/chillouts/create`, room empty `/chillouts/[id]` (1 here), room populated (4, ETAs, Blocked Users 0, broken block icons → fixed).
- Components: header, hero, 3 feature cards, form, location card, attendees list, sticky Share/End bar. Added: DropdownMenu ⋮, AlertDialog, QR Dialog, Leaflet map, skeletons, toasts, badges.
- Data: static names (rory/Elena/Marcus/Maya) → real DB; meetup lat/lng vs live shares separated.

## Design Tokens

- Rose #ef445f/#f43f5e, hover #e11d48, badges #fee7ea/#fce7ed, canvas #f8f9fd/#f8fafc/#fcfdfe, dark #0f172a/#111827, muted #64748b, border #e2e8f0, rounded-xl/2xl, shadow 0_2px_8px, fonts Anton/Teko + Inter/Jakarta mapped in globals.css @theme.

## Resume Pointer

- DONE. Remaining for env with Docker+browser: `docker compose up -d && docker compose ps`, `bun run db:setup`, `bun run dev`, manual browser test of full flow + 375/768/1024/1440 + pixel-compare vs /tmp/chillouts-reference screenshots.
- Local PG helper: /tmp/pgdata-chillouts on port 5433 (socket /tmp). Start: `/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata-chillouts -l /tmp/pg-chillouts.log -o "-p 5433" start`.
