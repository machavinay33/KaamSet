# Launch checklist

## Supabase
- [ ] Migrations 0001-0005 applied in order; `supabase/tests/rls_verification.sql` all PASS
- [ ] Demo seed NOT loaded (or all demo prices/services replaced)
- [ ] Email sign-ups disabled; only intended admin users exist
- [ ] Service-role key stored only in Vercel env (never in client code, repo or logs)
- [ ] Backups: enable daily backups / PITR, or schedule `pg_dump`; do a test restore
- [ ] Auth URL configuration: Site URL set to the production domain

## Environment (Vercel)
- [ ] NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_SECRET (32+ random chars), NEXT_PUBLIC_SITE_URL
- [ ] Production URL / custom domain added, HTTPS active, `NEXT_PUBLIC_SITE_URL` matches

## Admin
- [ ] First admin created with a strong unique password; admin login works; a non-admin account is rejected
- [ ] Settings filled: contact, hours, payment methods, cancellation/reschedule limits, auto-confirm choice
- [ ] Policies reviewed by someone qualified (the shipped texts are templates, including the privacy policy)
- [ ] Real services, prices, slots, capacities and holidays entered

## Security
- [ ] Rate limiting verified: more than 8 booking POSTs / 10 min from one IP returns 429
- [ ] Anonymous `GET /rest/v1/bookings` with the anon key returns permission denied
- [ ] Wrong access key on `/api/bookings/lookup` returns no booking; reference alone shows nothing
- [ ] `npm audit` reviewed; dependencies up to date

## End-to-end tests (on production URL)
- [ ] Resident books a service; confirmation shows reference, service, date, slot, status
- [ ] Resubmitting/double-clicking does not create a second booking
- [ ] Fill a slot to capacity; the next attempt shows "slot full"
- [ ] Booking visible in My Bookings with its private link, and NOT visible from another browser without the link
- [ ] Admin sees it, confirms it, marks in progress, completed, records payment; resident sees updated status
- [ ] Customer cancel/reschedule respects the configured time limits
- [ ] CSV export opens correctly; audit log rows appear
- [ ] Mobile check on Android Chrome and iPhone Safari; 404 page and error states
