# Flopsy's Meds 🐕

A medication tracker for Flopsy's recovery after her veterinary hospitalization (discharged June 6, 2026). Vite + React frontend styled with the Plinth design system, Supabase backend (Postgres + Auth). No UI component library.

## Features

- **Accounts** — email + password authentication via Supabase Auth. Each account gets its own medication list and dose history. New accounts are pre-seeded with Flopsy's discharge meds.
- **Daily tracker** — the day's doses **in the order they're given** (morning → midday → afternoon → evening → bedtime), with done/not-done state, per-dose notes, time given, and prev/next day navigation. The eye ointment (3–4×/day) appears once per application time.
- **Manage meds** — edit, remove, **stop, or restart** any medication, and reorder with ▲/▼ arrows. Short-term meds carry an end date and automatically drop off the tracker after it passes.
- **Document intake** — upload a photo or PDF of discharge paperwork; the local extraction server calls the Anthropic API to extract medications into structured JSON for you to confirm, edit, or discard individually.
- **Manual entry** — add a single medication by hand.
- **Emergency footer** — BluePearl NE Portland (503) 501-2375, Heart & Soul Urgent Care (503) 749-9400, and warning signs to watch for (pale gums, collapse, difficulty breathing, rapid breathing).

## Setup

### 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor → New query**, paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Go to **Authentication → Providers → Email** and turn off **Confirm email** — otherwise you'll need to click a confirmation link in your inbox before the app logs you in.
4. Copy your project URL and anon key from **Project Settings → API**.

### 2. Environment

```sh
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your project settings.
# Add ANTHROPIC_API_KEY only if you want the document intake feature.
```

### 3. Run

```sh
npm install
npm run dev        # app on http://localhost:5173 (core features only)
```

For document intake (uploading discharge paperwork), the extraction endpoint needs to run. Two options:

```sh
# Option A — Vercel CLI (runs frontend + serverless function together)
npx vercel dev

# Option B — standalone local server + Vite proxy
npm run server &   # extraction server on :3001
npm run dev
```

### 4. Deploy to Vercel

1. Push the repo to GitHub.
2. In the [Vercel dashboard](https://vercel.com), click **Add New Project** and import the repo.
3. Add three environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.
4. Deploy — Vercel auto-detects Vite and serves `api/extract.js` as a serverless function.

## Architecture

- **Supabase** — Postgres database + Auth. Two tables (`meds`, `dose_log`) with Row Level Security so each account sees only its own data. Schema is in `supabase/schema.sql`.
- **`src/`** — React app. `AuthContext` uses the Supabase JS client for auth. `MedsContext` queries Supabase directly for all reads and writes.
- **`api/extract.js`** — Vercel serverless function for document intake. Imports `server/extract.js` which does the Anthropic call. `ANTHROPIC_API_KEY` is set in Vercel's environment — never in the browser bundle. Uses `claude-sonnet-4-6`.
- **Vite proxy** — `/api/extract` is proxied to the local extraction server during `npm run dev`; on Vercel, the same path resolves to the serverless function automatically.

## Data model

```
-- Supabase Postgres
meds     (id, user_id, name, dose, timing, instructions,
          short_term, end_date, color, active, sort_order, created_at)
dose_log (user_id, day, med_id, given, given_at, note)
```

`sort_order` drives the dose sequence shown in the tracker. Seed data is in `src/data/seedMeds.js` and is inserted client-side on first sign-in.
