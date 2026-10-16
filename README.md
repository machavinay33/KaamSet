# KaamSet - Home chores, sorted.

Hyperlocal home-services booking across **MIHAN, Nagpur**. Next.js (App Router) + TypeScript, Tailwind, Supabase (Postgres, Auth), Framer Motion, React Hook Form + Zod. Deploys to Vercel.

No customer accounts, no payment gateway. Customers book, then view/cancel/reschedule through a **private access link**; the admin manages everything at `/admin`.

## 1. Local setup
```bash
node -v        # 20.9+
npm install
cp .env.example .env.local    # fill in values (see below)
```

## 2. Supabase project
1. Create a project at supabase.com. In **Authentication > Providers > Email** keep email sign-in on but **turn off "Allow new users to sign up"** (admins are created by the script, never publicly).
2. Copy **Project URL**, **anon key** and **service_role key** (Settings > API) into `.env.local`. The service-role key is server-only: never prefix it with `NEXT_PUBLIC_`.
3. Generate `APP_SECRET`: `openssl rand -base64 48`.

## 3. Run migrations
Run in order in the Supabase **SQL editor** (or `supabase db push` with the CLI):
`supabase/migrations/0001_schema.sql` -> `0002_functions.sql` -> `0003_rls.sql` -> `0004_grants.sql` -> `0005_default_settings.sql` -> `0006_mihan_address.sql` -> `0007_service_images.sql` -> `0008_preferred_time.sql`.

Optional, **development only**: `supabase/seed.sql` (demo services with placeholder prices). Do not ship demo prices: edit every service in `/admin/services` before launch.

Then run `supabase/tests/rls_verification.sql` in the SQL editor: every check must print `PASS` and nothing may raise `FAIL`.

## 4. Create the first admin
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-unique-password' ADMIN_NAME='Your Name' npm run create-admin
```
This uses the service-role key locally to create the Auth user and an `admin_profiles` row. Alternative (no script): create the user in Supabase > Authentication > Users, then run
`insert into admin_profiles (user_id, full_name) values ('<user uuid>', 'Your Name');`
Sign in at `/admin/login`. There is no public admin registration; users without an active `admin_profiles` row can sign in to Supabase Auth but see nothing (RLS) and are rejected by the app.

## 5. Run
```bash
npm run dev          # http://localhost:3000
npm run verify       # lint + typecheck + tests + production build
```
First steps in `/admin/settings`: contact phone/WhatsApp (shown only when filled), policies (review the templates), payment methods, booking rules. Then `/admin/services` and `/admin/availability` (blocked dates and holidays). Customers enter a preferred time; every booking request remains Pending until the team confirms it.

## 6. Deploy to Vercel
1. Push to GitHub, import the repo in Vercel (framework: Next.js).
2. Add environment variables (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET`, and `NEXT_PUBLIC_SITE_URL=https://www.kaamset.online` (the canonical domain, no trailing slash).
3. Deploy. The apex domain redirects to `www`, which is the canonical site URL. In Supabase > Authentication > URL Configuration set Site URL to `https://www.kaamset.online`.
4. In Google Search Console, verify the `kaamset.online` Domain property and submit `https://www.kaamset.online/sitemap.xml`. Inspect the homepage and `/services` URL to monitor crawling and indexing.

## How it works (security summary)
- **Booking creation** goes only through `POST /api/bookings` (Zod-validated, rate-limited, honeypot, same-origin check) which calls the service-role-only preferred-time RPC `create_booking`. The RPC re-checks date restrictions, lead time and duplicates, snapshots service name/price from the DB (the client never supplies price, status or payment fields), and inserts every request as Pending for manual confirmation.
- **Duplicate protection:** per-form idempotency key + same-phone/service/date/time check + per-phone active-booking cap. Customer rescheduling returns the request to Pending for team confirmation.
- **Customer lookup:** a booking is returned only when its reference **and** a 192-bit private access key match (only a SHA-256 hash is stored). Mobile number or reference alone never reveals anything. The key is shown once as a private link (`/my-bookings#ref=...&key=...`, fragment never sent to the server) and saved in the browser's local storage on that device. Responses never include IDs, internal notes, workers or token hashes.
- **OTP:** not enabled (no provider configured), and the UI says so honestly. Integration point: `lib/notifications/otp.ts`.
- **Admin:** Supabase Auth password login; every admin page/action calls `requireAdmin()` on the server; the database re-checks `is_admin()` in RLS policies and inside every admin RPC. Status transitions, rescheduling and payments are enforced in SQL functions. Sensitive changes are written to `audit_logs`.
- **Rate limiting:** DB-backed (`check_rate_limit`), works across serverless instances; fails closed.
- Policy-by-policy explanation: `docs/RLS_POLICIES.md`. Launch steps: `docs/LAUNCH_CHECKLIST.md`.

## Project layout
`app/(site)` customer pages - `app/admin` admin - `app/api` booking endpoints - `lib` validation, security, data - `supabase/migrations` schema, functions, RLS, grants - `tests` Vitest suites.

## Services that still need credentials / decisions
| Item | Status |
|---|---|
| Supabase project + keys | required |
| Vercel project + env vars | required |
| Domain / DNS | optional |
| SMS/WhatsApp OTP or notifications (MSG91, Twilio, Meta WhatsApp Cloud API) | not configured; integration point documented |
| Email notifications | not configured |
| Contact phone/WhatsApp, real prices, final policy text | enter in admin |
| Backups | enable in Supabase (paid plans: PITR) or schedule `pg_dump` |
