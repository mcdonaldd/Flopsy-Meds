# Flopsy's Meds 🐕

A medication tracker for Flopsy's recovery after her veterinary hospitalization (discharged June 6, 2026). Vite + React frontend styled with the Plinth design system, Express + SQLite backend with cookie-based authentication. No UI component library.

## Features

- **Accounts** — email + password authentication (bcrypt-hashed, JWT in an httpOnly cookie). Each account gets its own medication list and dose history, stored in SQLite. New accounts are pre-seeded with Flopsy's discharge meds.
- **Daily tracker** — the day's doses **in the order they're given** (morning → midday → afternoon → evening → bedtime), with done/not-done state, per-dose notes, time given, and prev/next day navigation. The eye ointment (3–4×/day) appears once per application time.
- **Manage meds** — edit, remove, **stop, or restart** any medication, and reorder with ▲/▼ arrows. Short-term meds carry an end date and automatically drop off the tracker after it passes.
- **Document intake** — upload a photo or PDF of discharge paperwork; the server calls the Anthropic API to extract medications into structured JSON for you to confirm, edit, or discard individually.
- **Manual entry** — add a single medication by hand.
- **Emergency footer** — BluePearl NE Portland (503) 501-2375, Heart & Soul Urgent Care (503) 749-9400, and warning signs to watch for (pale gums, collapse, difficulty breathing, rapid breathing).

## Setup

```sh
npm install
cp .env.example .env    # paste your Anthropic API key
npm run server          # API on http://localhost:3001
npm run dev             # app on http://localhost:5173 (proxies /api to :3001)
```

## Architecture

- `server/` — Express API: auth (`/api/auth/*`), meds CRUD + reordering (`/api/meds*`), dose log upsert (`/api/doselog`), and document extraction (`/api/extract`). Data lives in `server/data/flopsy.sqlite` (gitignored).
- `src/` — React app. `MedsContext` keeps an in-memory copy of the signed-in user's state and syncs every change to the API.
- The Anthropic key (`ANTHROPIC_API_KEY` in `.env`) is **read only by the server** and never shipped to the browser. The extraction call uses model `claude-sonnet-4-20250514` (set in `server/extract.js`); that model is deprecated and retires **June 15, 2026** — swap the constant to `claude-sonnet-4-6` when it does.
- Auth sessions survive server restarts (the JWT secret persists in `server/data/jwt-secret`). This is still a local-use app: it serves plain HTTP on localhost — put it behind TLS before exposing it anywhere.

## Data model

```
users    (id, email, password_hash, created_at)
meds     (id, user_id, name, dose, timing, instructions,
          short_term, end_date, color, active, sort_order)
dose_log (user_id, day, med_id, given, given_at, note)
```

`sort_order` drives the dose sequence shown in the tracker. Seed data lives in `server/seedMeds.js`.
