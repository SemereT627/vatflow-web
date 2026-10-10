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
- **Auth** — Supabase-backed sessions, auto sign-out after 2 hours of inactivity.
- **Mobile sync** — `/api/products` and `/api/sales/sync` authenticate the mobile app via
  a bearer token and keep both clients' VAT math and RLS scoping in one place.

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
