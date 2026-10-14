-- Row Level Security. Every table is RLS-enabled; there is no anonymous access to any booking-related table.
alter table public.admin_profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.time_slots enable row level security;
alter table public.service_slots enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payment_records enable row level security;
alter table public.booking_notes enable row level security;
alter table public.workers enable row level security;
alter table public.worker_services enable row level security;
alter table public.booking_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;  -- no policies: service role only

-- admin_profiles: a user may read only their own row. No insert/update/delete policy => only service role / SQL editor can change roles.
create policy admin_profiles_self_read on public.admin_profiles for select to authenticated using (user_id = auth.uid());

-- Public catalogue: only active rows are readable by visitors.
create policy categories_public_read on public.service_categories for select to anon, authenticated using (is_active);
create policy categories_admin_all on public.service_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy services_public_read on public.services for select to anon, authenticated using (is_active);
create policy services_admin_all on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy slots_public_read on public.time_slots for select to anon, authenticated using (is_active);
create policy slots_admin_all on public.time_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy settings_public_read on public.business_settings for select to anon, authenticated using (is_public);
create policy settings_admin_all on public.business_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admin-only tables
create policy service_slots_admin_all on public.service_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy blocked_dates_admin_all on public.blocked_dates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy workers_admin_all on public.workers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy worker_services_admin_all on public.worker_services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy assignments_admin_all on public.booking_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bookings & related: admin READ only. All writes go through validated SECURITY DEFINER functions (transition + capacity rules).
create policy bookings_admin_read on public.bookings for select to authenticated using (public.is_admin());
create policy history_admin_read on public.booking_status_history for select to authenticated using (public.is_admin());
create policy payments_admin_read on public.payment_records for select to authenticated using (public.is_admin());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
create policy notes_admin_read on public.booking_notes for select to authenticated using (public.is_admin());
create policy notes_admin_insert on public.booking_notes for insert to authenticated with check (public.is_admin() and author_id = auth.uid());
