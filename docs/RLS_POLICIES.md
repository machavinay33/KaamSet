# RLS and privilege model

Defence in depth: (1) `0004_grants.sql` revokes everything from `anon`/`authenticated` and re-grants the minimum; (2) RLS policies decide rows; (3) business rules run in `SECURITY DEFINER` functions whose EXECUTE rights are locked down. `is_admin()` = active row in `admin_profiles` for `auth.uid()`.

| Table | anon | signed-in non-admin | admin | Policy / reason |
|---|---|---|---|---|
| admin_profiles | none | own row only | own row only | `admin_profiles_self_read`. No write policy: roles change only via service role/SQL editor, so no privilege escalation from the API. |
| service_categories, services, time_slots | active rows, read | same | all rows, full write | `*_public_read` (`using is_active`) and `*_admin_all` (`is_admin()`). Prices are public by design; edits are admin only. Fixed-slot tables/functions remain for legacy compatibility; the current customer flow uses preferred times. |
| business_settings | `is_public` rows, read | same | all, full write | `settings_public_read`, `settings_admin_all`. Contains no secrets. |
| service_slots, blocked_dates, workers, worker_services, booking_assignments | none | none | full | `*_admin_all`. Worker phone numbers never reach the public. |
| bookings | none | none | read only | `bookings_admin_read`. No insert/update/delete policy: writes go through RPCs enforcing transitions, date/time rules and service snapshots. Customers access bookings only via service-role RPCs keyed by reference + token hash. |
| booking_status_history, payment_records, audit_logs | none | none | read only | `*_admin_read`. Rows are written by RPCs/triggers only, so history cannot be edited or deleted through the API. |
| booking_notes | none | none | read + insert (author must be self) | `notes_admin_read`, `notes_admin_insert`. Internal notes are never selected by customer-facing RPCs. |
| rate_limits | none | none | none | RLS on, no policies: service role only. |

## Functions
- Anonymous-callable: `get_available_slots` (no personal data).
- Admin-callable (verify `is_admin()` inside, raise `42501` otherwise): `admin_change_status`, `admin_set_preferred_time`, `admin_reschedule_booking` (legacy), `admin_record_payment`, `admin_dashboard_stats`, `admin_log_export`.
- Service-role only: preferred-time `create_booking` overload, `lookup_booking`, `customer_cancel_booking`, `customer_reschedule_preferred`, `customer_reschedule_booking` (legacy), `check_rate_limit`.
- Internal helpers (`_window_error`, `_slot_remaining`, `_apply_reschedule`, `_preferred_time_error`, `_booking_view`, ...) have no grants.

Verify with `supabase/tests/rls_verification.sql`.
