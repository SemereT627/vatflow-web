# VatFlow

VatFlow is a ledger & VAT desk for small Ethiopian retailers. Sellers record sales on
receipts with VAT category (`G` — VAT applies, `S` — exempt/special), and admins get a
dashboard, product catalog, seller management, and Ministry-ready VAT exports — all with
dates shown in the Ethiopian calendar alongside Gregorian.

This is the web app. A companion Expo app ([vatflow-mobile](../vatflow-mobile)) lets
sellers record sales offline in the field and sync them here.

## Features

- **Dashboard** — gross sales, VAT collected, receipts issued, avg. basket, a revenue/VAT
  trend chart, top products, VAT category split, seller activity, and recent sales, over
  a configurable date range. Exportable to XLSX.
- **Sales** — record, search, and paginate sales; view full receipt detail in a popover;
  edit buyer details and sale date after the fact (amounts/VAT category/receipt number
  stay locked once recorded — void and re-record to fix those); void/restore a sale.
- **Products** — catalog with per-unit pricing, active/inactive status, and custom units
  of measure.
- **Sellers** (admin) — manage seller accounts for the shop.
- **Reports** (admin) — generate the Ministry's monthly VAT export template.
- **Auth** — Supabase-backed sessions, auto sign-out after 30 minutes of inactivity (with a 2-minute on-screen warning;
  skipped for 30 days when "Keep me signed in on this device" is ticked at the code step), and
  required two-step sign-in (authenticator app / TOTP) on the web: `/login` asks for the code
  right after the password, enrolling on first use. Admins reset a seller's authenticator from the Sellers page; an
  admin's own reset is `node --env-file=.env.local scripts/reset-mfa.mjs <email>`. Run
  `supabase/migrations/0001-mfa-admin-writes.sql` so admin writes need it in the DB too.
- **Mobile sync** — `/api/products` and `/api/sales/sync` authenticate the mobile app via
  a bearer token and keep both clients' VAT math and RLS scoping in one place.

- **Backups** — Vercel Cron (`vercel.json`, daily 00:00 UTC = 03:00 Addis) calls
  `/api/cron/backup` (`src/lib/backup.ts`): every table as one gzipped JSON in a private
  Vercel Blob store (`backups/`, kept 30 days), read back and row-count checked. It holds
  every shop's data, so it's only in the Vercel dashboard (Storage → Blob), not the app.
  Auth accounts aren't included. Add new tables to `BACKUP_TABLES`, parents first.

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · Supabase (Postgres + Auth) · Tailwind CSS 4
· TanStack Query · react-hook-form + zod · Recharts-free hand-rolled SVG charts

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and fill in your Supabase project's values:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — server-only, needed to create seller accounts. Never expose to the client. |
   | `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob store for nightly backups — set by connecting the store to the project in Vercel. Production only. |
   | `CRON_SECRET` | Random secret Vercel Cron sends as a Bearer token to `/api/cron/backup`. Production only. |

3. Apply the schema in `supabase/schema.sql` to your Supabase project (SQL editor or CLI).

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint

## Project structure

```text
src/app/              Routes — dashboard, sales, admin/{products,sellers,reports,settings}
src/app/actions/      Server actions (sales, products, sellers, units, shop)
src/app/api/          Bearer-token API routes consumed by vatflow-mobile
src/components/       UI components
src/lib/              Supabase clients, session/profile helpers, VAT math, Ethiopian
                       calendar conversion, query helpers
src/proxy.ts           Auth guard + inactivity-based session expiry (Next.js "proxy",
                       the renamed middleware convention in this Next.js version)
supabase/schema.sql    Database schema
```
