# Fuel Price Predictor (Sri Lanka)

Tracks Sri Lanka retail fuel prices (Lanka IOC / CPC) and estimates near-term
prices by approximating CPC's cost-reflective pricing formula, driven by
trends in global crude oil prices and the USD/LKR exchange rate.

See [`/methodology`](src/app/methodology/page.tsx) for how predictions are
built and their limitations — CPC has never published an authoritative
formula, so this is a best-effort approximation, not an official source.

## Stack

- Next.js 16 (App Router) + TypeScript, Tailwind CSS
- Prisma ORM 7 (driver-adapter mode, `@prisma/adapter-pg`) + PostgreSQL
- Vercel Cron for scheduled ingestion

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (any Postgres
   host — Neon, Supabase, or local), `EIA_API_KEY` (free, from
   [eia.gov/opendata](https://www.eia.gov/opendata/register.php)), and
   `CRON_SECRET` (any random string, used to authorize the ingestion route).

2. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   ```

3. Apply the schema and seed the formula config:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Run ingestion once manually to populate data (or wait for the cron job
   in production):

   ```bash
   npm run dev
   # in another terminal:
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Data sources

| Data | Source | Reliability |
|---|---|---|
| Retail prices | [lankaioc.com/our-product](https://www.lankaioc.com/our-product/) | Working, scraped |
| Retail prices | ceypetco.gov.lk (CPC) | **Unreliable** — the site frequently times out; the scraper (`src/lib/scrapers/cpc.ts`) is a stub. Enter CPC prices manually if needed. |
| USD/LKR exchange rate | CBSL's legacy lookup tool | Working, scraped (undocumented endpoint — see `src/lib/scrapers/cbsl.ts`) |
| Crude oil price | [EIA Open Data API](https://www.eia.gov/opendata/) (Brent, series `RBRTE`) | Working — a proxy for the Singapore Platts benchmark CPC actually uses |

Every ingestion run is logged to the `IngestionLog` table so scraper failures
are visible rather than silent.

## Formula config

`FormulaConfig` holds versioned tax/margin constants (VAT, excise duty, port
handling, distribution/dealer margins) per fuel type. These are **not**
official published figures — see `prisma/seed.ts` for how the seed values
were back-solved from real observed retail prices. Update them by hand
(directly in the database, or build an admin UI) whenever tax policy changes.

## Scripts

- `npm run dev` / `build` / `start` — standard Next.js
- `npm run db:push` — push the Prisma schema to the database (no migration
  history; use `db:migrate` instead once the schema stabilizes)
- `npm run db:migrate` — create/apply a versioned migration
- `npm run db:seed` — seed `FormulaConfig`
- `npm run db:studio` — Prisma Studio

## Deploying

Deploy to Vercel as a normal Next.js app. `vercel.json` configures a daily
cron hitting `/api/cron/ingest` — set `CRON_SECRET` as an environment
variable in the Vercel project so Vercel's cron requests authenticate
(Vercel automatically sends it as a Bearer token to cron routes).
