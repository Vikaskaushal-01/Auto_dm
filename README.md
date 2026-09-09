# AutoDM — AI Social Automation OS

AI-powered Instagram AutoDM, creator analytics, and automation platform. Phase 1
(this build): authentication, dashboard, profile/follower/content analytics,
comment-to-DM automations with a keyword-trigger + DM builder, link tracking,
and AutoDM funnel/comparison analytics — all running on realistic seeded demo
data. Architecture is designed so later phases (visual flow builder, CRM/inbox,
multi-channel connectors, monetization, agency/white-label) can be added
without reworking what's here. See `docs/` or ask for the full product spec.

## Stack

Next.js 16 (App Router) · TypeScript · MongoDB (Native Driver) · NextAuth v5
(Credentials) · Tailwind CSS · Recharts · Zod

## Getting started

1. **MongoDB**:
   Ensure MongoDB is running locally (e.g. `brew services start mongodb-community`). Default URI is `mongodb://127.0.0.1:27017/autodm`.

2. **Install dependencies and configure environment**:

   ```bash
   npm install
   cp .env.example .env   # then fill in AUTH_SECRET / TOKEN_ENCRYPTION_KEY
   ```

3. **Seed demo data**:

   ```bash
   npm run seed
   ```

   Seeding populates 90 days of follower/content history plus an AutoDM
   funnel with thousands of realistic rows. It creates the demo login:
   `demo@autodm.app` / `Demo1234!`.

4. **Run the dev server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (or the port indicated if 3000 is occupied) — you'll land on
   `/login`. Use the demo credentials above, or register a new account (which
   bootstraps its own workspace + demo Instagram account automatically).

### Regenerating demo data

Settings → Integrations → "Regenerate Demo Data" reseeds the current
workspace with a fresh randomized dataset. It's fire-and-forget (~5 minutes)
since a full regen is far too slow to hold open a request for.

## Instagram data: demo vs. live

Every page reads Instagram data through `InstagramConnector`
(`src/lib/connectors/instagram/`), never directly. Right now
`DemoInstagramConnector` serves everything from the seeded database. Wiring up
real data later means implementing `GraphAPIInstagramConnector` (already
stubbed with the Graph API endpoint mapping for each method) and setting
`META_APP_ID` / `META_APP_SECRET` / `META_REDIRECT_URI` in `.env` — no UI or
page code needs to change.

## Known issue: production build on this machine

`next build` currently fails in this specific dev environment (Windows, `D:`
drive formatted FAT32) — both Turbopack and webpack hit filesystem errors
tied to reparse points / symlink probing that FAT32 doesn't support. This is
an environment/tooling limitation, not an application bug: `npm run dev`
(webpack) is unaffected and is what this project has been built and verified
against. Building for production should work normally on a standard NTFS
volume or in a normal CI/hosting environment (e.g. Vercel, a Linux CI
runner). See the comment in `next.config.ts` for the specific errors
encountered and what was ruled out.

## Project structure

- `src/app/(auth)` — login/register
- `src/app/(dashboard)` — everything behind auth: dashboard, analytics,
  automations, settings
- `src/components` — `ui/` (primitives), `charts/`, `analytics/`,
  `layout/`, `automations/`, `settings/`
- `src/lib/analytics` — the shared metric-computation layer
  (`computeMetric`, funnel, content/link/automation aggregation). Every
  displayed number goes through this, never a raw database query in a page.
- `src/lib/connectors` — platform connector abstraction (Instagram now;
  the pattern is meant to be repeated per-platform later)
- `src/server/actions` — Next.js Server Actions (mutations)
- `src/lib/db.ts` — native MongoDB database client and collections
- `src/types/models.ts` — full TypeScript data models
- `src/db/seed/` — demo data generators, reusable by both `src/db/seed.ts`
  and the in-app "Regenerate Demo Data" action
