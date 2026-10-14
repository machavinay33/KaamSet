-- Least-privilege grants. RLS decides which rows; these decide which operations are even possible.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
-- NOTE: any function you add in future migrations must be followed by REVOKE EXECUTE ... FROM public, anon, authenticated.

grant select on public.service_categories, public.services, public.time_slots, public.business_settings to anon, authenticated;
grant select, insert, update, delete on public.service_categories, public.services, public.time_slots, public.service_slots,
  public.blocked_dates, public.business_settings, public.workers, public.worker_services, public.booking_assignments to authenticated;
grant select on public.admin_profiles, public.bookings, public.booking_status_history, public.payment_records, public.audit_logs to authenticated;
grant select, insert on public.booking_notes to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.admin_change_status(uuid, public.booking_status, text) to authenticated;
grant execute on function public.admin_reschedule_booking(uuid, date, uuid, text) to authenticated;
grant execute on function public.admin_record_payment(uuid, text, numeric, text, text) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_log_export(jsonb, int) to authenticated;

grant execute on function public.create_booking(uuid, date, uuid, text, text, text, text, text, text, uuid) to service_role;
grant execute on function public.lookup_booking(text, text) to service_role;
grant execute on function public.customer_cancel_booking(text, text, text) to service_role;
grant execute on function public.customer_reschedule_booking(text, text, date, uuid) to service_role;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
