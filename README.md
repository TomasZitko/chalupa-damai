# Chalupa Reservation System

Cloudflare-native reservation system for Czech chalupy. Backend runs on Cloudflare Workers (Hono.js) with D1 (SQLite), frontend on Cloudflare Pages (Vite + React).

---

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | Cloudflare Workers + Hono.js      |
| Database | Cloudflare D1 (SQLite, via Drizzle ORM) |
| Frontend | Cloudflare Pages + Vite + React   |
| Email    | Resend                            |
| iCal sync| Cron trigger every 20 minutes     |

---

## One-Time Setup

### 1. Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### 2. Create the D1 database

```bash
wrangler d1 create chalupa-db
```

Copy the `database_id` from the output and paste it into [backend/wrangler.toml](backend/wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "chalupa-db"
database_id = "paste-your-id-here"
```

### 3. Run database migrations

```bash
cd backend

# Apply to local (miniflare) — used during wrangler dev
wrangler d1 migrations apply chalupa-db

# Apply to remote (production)
wrangler d1 migrations apply chalupa-db --remote
```

Migrations are in [backend/migrations/](backend/migrations/). They run in filename order.

### 4. Add a property (chalupa) row

Edit [backend/migrations/0002_seed_property.sql](backend/migrations/0002_seed_property.sql) — replace:
- `owner@example.com` with the owner's email
- The bcrypt hash placeholder with a real hash (see below)
- `damai` with your desired URL slug

**Generate the bcrypt hash:**
```bash
node -e "console.log(require('bcryptjs').hashSync('your_password', 12))"
# or:
cd backend && npm run hash-password
```

Then re-apply migrations (the seed uses `INSERT OR IGNORE` so it's safe to run again):
```bash
wrangler d1 migrations apply chalupa-db --remote
```

### 5. Set production secrets

```bash
cd backend
wrangler secret put RESEND_API_KEY        # from resend.com dashboard
wrangler secret put JWT_SECRET            # any long random string
wrangler secret put ADMIN_PASSWORD_HASH   # bcrypt hash from step 4
```

### 6. Local development secrets

Create `backend/.dev.vars` (git-ignored):

```ini
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=re_xxxx
JWT_SECRET=dev-secret-change-in-prod
ADMIN_PASSWORD_HASH=$2a$12$...
```

---

## Deploy

### Backend (Cloudflare Workers)

```bash
cd backend
npm run deploy
```

The worker will be live at `https://chalupa-backend.workers.dev` (or your custom domain).

### Frontend (Cloudflare Pages)

```bash
cd frontend
cp .env.example .env.local
# Fill in VITE_API_URL and VITE_PROPERTY_ID in .env.local
npm run build
```

Then deploy `frontend/dist/` via the Cloudflare Pages dashboard, or use the CLI:

```bash
wrangler pages deploy frontend/dist --project-name chalupa-frontend
```

Set environment variables in the Cloudflare Pages dashboard under **Settings → Environment variables**.

---

## Adding a New Chalupa Client

1. **Insert a property row** into D1 — either via a new seed migration or directly:

   ```bash
   wrangler d1 execute chalupa-db --remote --command \
     "INSERT INTO properties (name, slug, owner_email, owner_password_hash, active) \
      VALUES ('Chalupa XYZ', 'xyz', 'owner@xyz.cz', '\$2a\$12\$...hash...', 1);"
   ```

2. **Get the property ID** (used in the frontend config):

   ```bash
   wrangler d1 execute chalupa-db --remote --command \
     "SELECT id, slug FROM properties WHERE slug='xyz';"
   ```

3. **Set `VITE_PROPERTY_ID`** in the frontend `.env.local` (or Cloudflare Pages env var) to the returned `id`.

4. **Share the iCal export URL** with the client so they can paste it into each platform:

   ```
   https://chalupa-backend.workers.dev/ical/{slug}.ics
   ```

   Example: `https://chalupa-backend.workers.dev/ical/damai.ics`

5. **Add iCal import feeds** from each platform into the admin panel. The worker polls them every 20 minutes automatically.

---

## iCal URLs to Paste Into Each Platform

The client pastes the export URL **into** each platform's "import/sync calendar" setting so those platforms know which dates are blocked:

| Platform       | Where to paste                              |
|----------------|---------------------------------------------|
| Booking.com    | Property → Calendar → Connect channels      |
| Airbnb         | Calendar → Availability → Import calendar   |
| e-chalupy.cz   | Správa nemovitostí → Synchronizace kalendáře |
| TripAdvisor / Vrbo | Channel manager → Sync external calendar |

The URL format is always:
```
https://chalupa-backend.workers.dev/ical/{slug}.ics
```

---

## Project Structure

```
.
├── backend/
│   ├── migrations/          # D1 SQL migrations (run in order)
│   │   ├── 0001_init.sql    # Schema: properties, ical_feeds, blocked_dates, reservations
│   │   └── 0002_seed_property.sql
│   ├── src/
│   │   ├── index.js         # Hono app + cron handler
│   │   ├── lib/
│   │   │   ├── schema.js    # Drizzle ORM table definitions
│   │   │   ├── db.js        # D1 connection helper
│   │   │   ├── auth.js      # JWT helpers
│   │   │   ├── icalSync.js  # Fetch & upsert external iCal feeds
│   │   │   ├── icalGenerate.js # Export reservations as .ics
│   │   │   └── email.js     # Resend email templates
│   │   └── routes/
│   │       ├── auth.js      # POST /api/auth/login
│   │       ├── reservations.js
│   │       ├── admin.js     # Protected admin endpoints
│   │       └── ical.js      # GET /ical/:slug.ics
│   ├── wrangler.toml
│   ├── drizzle.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   ├── .env.example
│   └── package.json
└── .gitignore
```

---

## Why D1 (not Supabase)

D1 runs co-located with the Worker — zero cold-start latency, no connection pooling, no idle pausing. For a low-traffic reservation system this is the right tradeoff: simple, cheap, always available.
