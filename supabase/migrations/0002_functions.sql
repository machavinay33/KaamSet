-- Business logic lives in SECURITY DEFINER functions. Execute rights are locked down in 0004_grants.sql.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_profiles where user_id = auth.uid() and is_active);
$$;

create or replace function public._setting_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(value #>> '{}', '')::int from public.business_settings where key = p_key), p_default);
$$;
create or replace function public._setting_bool(p_key text, p_default boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.business_settings where key = p_key), p_default);
$$;

create or replace function public._audit(p_action text, p_entity text, p_entity_id text, p_details jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_entity_id, p_details);
$$;

create or replace function public._require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
end $$;

create or replace function public._transition_allowed(p_from public.booking_status, p_to public.booking_status) returns boolean
language sql immutable as $$
  select case p_from
    when 'pending' then p_to in ('confirmed','rejected','cancelled')
    when 'confirmed' then p_to in ('in_progress','cancelled')
    when 'in_progress' then p_to in ('completed','cancelled')
    else false end;
$$;

-- Returns NULL when bookable, otherwise a reason code. p_strict adds lead-time / advance-window rules (customers).
create or replace function public._window_error(p_service uuid, p_date date, p_slot uuid, p_strict boolean) returns text
language plpgsql stable security definer set search_path = public as $$
declare s public.services; t public.time_slots; v_start timestamptz; v_lead int; v_adv int; v_today date; v_dow smallint;
begin
  if not public._setting_bool('booking.enabled', true) then return 'bookings_disabled'; end if;
  select * into s from public.services where id = p_service;
  if not found or not s.is_active or not s.is_bookable then return 'service_unavailable'; end if;
  select * into t from public.time_slots where id = p_slot and is_active;
  if not found then return 'slot_unavailable'; end if;
  if exists (select 1 from public.service_slots where service_id = p_service)
     and not exists (select 1 from public.service_slots where service_id = p_service and slot_id = p_slot) then
    return 'slot_unavailable';
  end if;
  v_dow := extract(dow from p_date)::smallint;
  if not (v_dow = any (t.weekdays)) then return 'closed_day'; end if;
  if s.allowed_weekdays is not null and not (v_dow = any (s.allowed_weekdays)) then return 'closed_day'; end if;
  if exists (select 1 from public.blocked_dates b where b.blocked_on = p_date and (b.service_id is null or b.service_id = p_service)) then
    return 'blocked_date';
  end if;
  v_today := (now() at time zone 'Asia/Kolkata')::date;
  if p_date < v_today then return 'in_past'; end if;
  if p_strict then
    v_start := (p_date + t.start_time) at time zone 'Asia/Kolkata';
    v_lead := coalesce(s.min_lead_hours, public._setting_int('booking.min_lead_hours', 4));
    v_adv := coalesce(s.max_advance_days, public._setting_int('booking.max_advance_days', 14));
    if v_start < now() + make_interval(hours => v_lead) then return 'too_soon'; end if;
    if p_date > v_today + v_adv then return 'too_far'; end if;
  end if;
  return null;
end $$;

create or replace function public._slot_remaining(p_service uuid, p_date date, p_slot uuid, p_exclude uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare t public.time_slots; s public.services; v_slot int; v_srv int; v_rem int;
begin
  select * into t from public.time_slots where id = p_slot;
  select * into s from public.services where id = p_service;
  if t.id is null or s.id is null then return 0; end if;
  select count(*) into v_slot from public.bookings
    where booking_date = p_date and slot_id = p_slot and status not in ('cancelled','rejected') and (p_exclude is null or id <> p_exclude);
  v_rem := t.max_bookings - v_slot;
  if s.max_per_slot is not null then
    select count(*) into v_srv from public.bookings
      where booking_date = p_date and slot_id = p_slot and service_id = p_service and status not in ('cancelled','rejected') and (p_exclude is null or id <> p_exclude);
    v_rem := least(v_rem, s.max_per_slot - v_srv);
  end if;
  return greatest(v_rem, 0);
end $$;

-- Public (anon-callable): slot availability for a service and date. Exposes no personal data.
create or replace function public.get_available_slots(p_service uuid, p_date date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r record; v_err text; v_rem int; v_out jsonb := '[]'::jsonb; v_any boolean := false; v_first text := null;
begin
  if p_service is null or p_date is null then return jsonb_build_object('status','invalid','slots','[]'::jsonb); end if;
  for r in select id, label, start_time, end_time from public.time_slots where is_active order by sort_order, start_time loop
    v_err := public._window_error(p_service, p_date, r.id, true);
    v_rem := 0;
    if v_err is null then
      v_rem := public._slot_remaining(p_service, p_date, r.id, null);
      if v_rem = 0 then v_err := 'slot_full'; end if;
    end if;
    if v_err = 'slot_unavailable' then continue; end if;
    if v_err is null then v_any := true; elsif v_first is null then v_first := v_err; end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('id', r.id, 'label', r.label, 'start_time', r.start_time,
      'end_time', r.end_time, 'remaining', v_rem, 'available', v_err is null, 'reason', v_err));
  end loop;
  return jsonb_build_object('status', case when v_any then 'ok' else coalesce(v_first, 'no_slots') end, 'slots', v_out);
end $$;

-- Service-role only. Atomic, capacity-safe booking creation.
create or replace function public.create_booking(
  p_service_id uuid, p_date date, p_slot_id uuid, p_name text, p_phone text, p_flat text, p_instructions text,
  p_reference text, p_token_hash text, p_idempotency uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.services; t public.time_slots; v_err text; v_status public.booking_status; v_id uuid; v_ref text; v_active int; v_con text;
begin
  select reference, status into v_ref, v_status from public.bookings where idempotency_key = p_idempotency;
  if found then return jsonb_build_object('ok', true, 'duplicate', true, 'reference', v_ref, 'status', v_status); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_date::text || ':' || p_slot_id::text, 0));

  v_err := public._window_error(p_service_id, p_date, p_slot_id, true);
  if v_err is not null then return jsonb_build_object('ok', false, 'code', v_err); end if;

  if exists (select 1 from public.bookings where customer_phone = p_phone and service_id = p_service_id and booking_date = p_date
             and slot_id = p_slot_id and status not in ('cancelled','rejected')) then
    return jsonb_build_object('ok', false, 'code', 'already_booked');
  end if;
  select count(*) into v_active from public.bookings
    where customer_phone = p_phone and status in ('pending','confirmed','in_progress') and booking_date >= (now() at time zone 'Asia/Kolkata')::date;
  if v_active >= public._setting_int('booking.max_active_per_phone', 5) then
    return jsonb_build_object('ok', false, 'code', 'too_many_active');
  end if;
  if public._slot_remaining(p_service_id, p_date, p_slot_id, null) <= 0 then
    return jsonb_build_object('ok', false, 'code', 'slot_full');
  end if;

  select * into s from public.services where id = p_service_id;
  select * into t from public.time_slots where id = p_slot_id;
  v_status := case when public._setting_bool('booking.auto_confirm', false) then 'confirmed'::public.booking_status else 'pending'::public.booking_status end;

  insert into public.bookings (reference, lookup_token_hash, idempotency_key, service_id, service_name, service_price_inr, service_duration_minutes,
    customer_name, customer_phone, flat_identifier, booking_date, slot_id, slot_label, slot_start_time, slot_end_time, instructions,
    status, terms_accepted_at, confirmed_at)
  values (p_reference, p_token_hash, p_idempotency, s.id, s.name, s.price_inr, s.duration_minutes,
    p_name, p_phone, p_flat, p_date, t.id, t.label, t.start_time, t.end_time, nullif(p_instructions, ''),
    v_status, now(), case when v_status = 'confirmed' then now() else null end)
  returning id into v_id;

  insert into public.booking_status_history (booking_id, from_status, to_status, actor, reason)
  values (v_id, null, v_status, 'customer', 'Booking submitted');

  return jsonb_build_object('ok', true, 'duplicate', false, 'reference', p_reference, 'status', v_status);
exception when unique_violation then
  get stacked diagnostics v_con = constraint_name;
  if v_con = 'bookings_reference_key' then return jsonb_build_object('ok', false, 'code', 'reference_collision'); end if;
  select reference, status into v_ref, v_status from public.bookings where idempotency_key = p_idempotency;
  return jsonb_build_object('ok', true, 'duplicate', true, 'reference', v_ref, 'status', v_status);
end $$;

create or replace function public._customer_can(b public.bookings, p_action text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_allowed boolean; v_hours int; v_start timestamptz;
begin
  if b.status not in ('pending','confirmed') then return false; end if;
  if p_action = 'cancel' then
    v_allowed := public._setting_bool('cancellation.customer_allowed', true);
    v_hours := public._setting_int('cancellation.min_hours_before', 6);
  else
    v_allowed := public._setting_bool('reschedule.customer_allowed', true);
    v_hours := public._setting_int('reschedule.min_hours_before', 12);
  end if;
  if not v_allowed then return false; end if;
  v_start := (b.booking_date + b.slot_start_time) at time zone 'Asia/Kolkata';
  return v_start >= now() + make_interval(hours => v_hours);
end $$;

-- Safe, customer-facing projection. No internal notes, ids, workers, token hash.
create or replace function public._booking_view(b public.bookings) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('reference', b.reference, 'service_id', b.service_id, 'service_name', b.service_name,
    'price_inr', b.service_price_inr, 'duration_minutes', b.service_duration_minutes, 'booking_date', b.booking_date,
    'slot_label', b.slot_label, 'slot_start_time', b.slot_start_time, 'slot_end_time', b.slot_end_time,
    'status', b.status, 'payment_status', b.payment_status, 'customer_name', b.customer_name,
    'flat_identifier', b.flat_identifier, 'instructions', b.instructions, 'created_at', b.created_at,
    'cancellation_reason', b.cancellation_reason,
    'can_cancel', public._customer_can(b, 'cancel'), 'can_reschedule', public._customer_can(b, 'reschedule'));
$$;

create or replace function public.lookup_booking(p_reference text, p_token_hash text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where reference = p_reference and lookup_token_hash = p_token_hash;
  if not found then return null; end if;
  return public._booking_view(b);
end $$;

create or replace function public.customer_cancel_booking(p_reference text, p_token_hash text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where reference = p_reference and lookup_token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public._customer_can(b, 'cancel') then return jsonb_build_object('ok', false, 'code', 'not_allowed'); end if;
  update public.bookings set status = 'cancelled', cancelled_by = 'customer', cancellation_reason = left(nullif(p_reason, ''), 300) where id = b.id;
  insert into public.booking_status_history (booking_id, from_status, to_status, actor, reason)
  values (b.id, b.status, 'cancelled', 'customer', left(nullif(p_reason, ''), 300));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public._apply_reschedule(p_id uuid, p_date date, p_slot uuid, p_actor text, p_admin uuid, p_reason text, p_strict boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bookings; t public.time_slots; v_err text; v_new public.booking_status; v_old_label text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_date::text || ':' || p_slot::text, 0));
  select * into b from public.bookings where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if b.status not in ('pending','confirmed') then return jsonb_build_object('ok', false, 'code', 'not_reschedulable'); end if;
  if b.booking_date = p_date and b.slot_id = p_slot then return jsonb_build_object('ok', false, 'code', 'no_change'); end if;
  v_err := public._window_error(b.service_id, p_date, p_slot, p_strict);
  if v_err is not null then return jsonb_build_object('ok', false, 'code', v_err); end if;
  if public._slot_remaining(b.service_id, p_date, p_slot, b.id) <= 0 then return jsonb_build_object('ok', false, 'code', 'slot_full'); end if;
  select * into t from public.time_slots where id = p_slot;
  v_old_label := b.booking_date::text || ' ' || b.slot_label;
  if p_actor = 'customer' then
    v_new := case when public._setting_bool('booking.auto_confirm', false) then 'confirmed'::public.booking_status else 'pending'::public.booking_status end;
  else
    v_new := b.status;
  end if;
  update public.bookings set booking_date = p_date, slot_id = t.id, slot_label = t.label, slot_start_time = t.start_time,
    slot_end_time = t.end_time, status = v_new, confirmed_at = case when v_new = 'pending' then null else coalesce(confirmed_at, case when v_new = 'confirmed' then now() end) end
  where id = b.id;
  insert into public.booking_status_history (booking_id, from_status, to_status, actor, changed_by, reason)
  values (b.id, b.status, v_new, p_actor, p_admin, 'Rescheduled from ' || v_old_label || ' to ' || p_date::text || ' ' || t.label || coalesce(' - ' || nullif(p_reason, ''), ''));
  return jsonb_build_object('ok', true, 'status', v_new);
end $$;

create or replace function public.customer_reschedule_booking(p_reference text, p_token_hash text, p_date date, p_slot uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where reference = p_reference and lookup_token_hash = p_token_hash;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public._customer_can(b, 'reschedule') then return jsonb_build_object('ok', false, 'code', 'not_allowed'); end if;
  return public._apply_reschedule(b.id, p_date, p_slot, 'customer', null, null, true);
end $$;

-- ===== Admin RPCs (callable by authenticated users; each verifies is_admin() inside) =====
create or replace function public.admin_change_status(p_booking_id uuid, p_to public.booking_status, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_reason text := left(nullif(trim(coalesce(p_reason, '')), ''), 300);
begin
  perform public._require_admin();
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public._transition_allowed(b.status, p_to) then return jsonb_build_object('ok', false, 'code', 'invalid_transition'); end if;
  if p_to in ('cancelled','rejected') and v_reason is null then return jsonb_build_object('ok', false, 'code', 'reason_required'); end if;
  update public.bookings set status = p_to,
    confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end,
    completed_at = case when p_to = 'completed' then now() else completed_at end,
    cancelled_by = case when p_to in ('cancelled','rejected') then 'admin' else cancelled_by end,
    cancellation_reason = case when p_to in ('cancelled','rejected') then v_reason else cancellation_reason end
  where id = b.id;
  insert into public.booking_status_history (booking_id, from_status, to_status, actor, changed_by, reason)
  values (b.id, b.status, p_to, 'admin', auth.uid(), v_reason);
  perform public._audit('booking.status_changed', 'booking', b.id::text, jsonb_build_object('reference', b.reference, 'from', b.status, 'to', p_to, 'reason', v_reason));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_reschedule_booking(p_booking_id uuid, p_date date, p_slot uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  perform public._require_admin();
  v := public._apply_reschedule(p_booking_id, p_date, p_slot, 'admin', auth.uid(), left(p_reason, 300), false);
  if (v->>'ok')::boolean then
    perform public._audit('booking.rescheduled', 'booking', p_booking_id::text, jsonb_build_object('date', p_date, 'slot', p_slot, 'reason', p_reason));
  end if;
  return v;
end $$;

create or replace function public.admin_record_payment(p_booking_id uuid, p_kind text, p_amount numeric, p_method text, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_paid numeric;
begin
  perform public._require_admin();
  if p_kind not in ('payment','refund') or p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'code', 'invalid_payment'); end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  select coalesce(sum(case kind when 'payment' then amount else -amount end), 0) into v_paid from public.payment_records where booking_id = b.id;
  if p_kind = 'payment' then
    if b.status not in ('confirmed','in_progress','completed') then return jsonb_build_object('ok', false, 'code', 'payment_not_allowed'); end if;
    if b.payment_status = 'paid' then return jsonb_build_object('ok', false, 'code', 'already_paid'); end if;
  else
    if b.payment_status <> 'paid' then return jsonb_build_object('ok', false, 'code', 'nothing_to_refund'); end if;
    if p_amount > v_paid then return jsonb_build_object('ok', false, 'code', 'refund_too_large'); end if;
  end if;
  insert into public.payment_records (booking_id, kind, amount, method, note, recorded_by)
  values (b.id, p_kind, p_amount, p_method, left(nullif(p_note, ''), 300), auth.uid());
  update public.bookings set payment_status = case when p_kind = 'payment' then 'paid'::public.payment_status else 'refunded'::public.payment_status end where id = b.id;
  perform public._audit('booking.payment_' || p_kind, 'booking', b.id::text, jsonb_build_object('reference', b.reference, 'amount', p_amount, 'method', p_method));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date; v_collected numeric; v_expected numeric; v_unpaid_done numeric;
begin
  perform public._require_admin();
  select coalesce(sum(case kind when 'payment' then amount else -amount end), 0) into v_collected from public.payment_records;
  select coalesce(sum(service_price_inr), 0) into v_expected from public.bookings where status in ('pending','confirmed','in_progress') and payment_status = 'unpaid';
  select coalesce(sum(service_price_inr), 0) into v_unpaid_done from public.bookings where status = 'completed' and payment_status = 'unpaid';
  return jsonb_build_object(
    'today', (select count(*) from public.bookings where booking_date = v_today and status not in ('cancelled','rejected')),
    'pending', (select count(*) from public.bookings where status = 'pending'),
    'confirmed', (select count(*) from public.bookings where status = 'confirmed'),
    'in_progress', (select count(*) from public.bookings where status = 'in_progress'),
    'completed', (select count(*) from public.bookings where status = 'completed'),
    'cancelled', (select count(*) from public.bookings where status = 'cancelled'),
    'rejected', (select count(*) from public.bookings where status = 'rejected'),
    'upcoming', (select count(*) from public.bookings where booking_date >= v_today and status in ('pending','confirmed')),
    'revenue_collected', v_collected,
    'expected_open', v_expected,
    'completed_unpaid', v_unpaid_done);
end $$;

create or replace function public.admin_log_export(p_filters jsonb, p_rows int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  perform public._audit('bookings.exported', 'booking', null, jsonb_build_object('filters', p_filters, 'rows', p_rows));
end $$;

-- Rate limiting (service role only)
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_start timestamptz; v_hits int;
begin
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_limit;
end $$;

-- Generic audit trigger for admin-editable configuration tables
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_new jsonb := to_jsonb(new); v_old jsonb := to_jsonb(old);
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_new->>'id', v_old->>'id', v_new->>'key', v_old->>'key'),
          jsonb_build_object('old', v_old, 'new', v_new));
  return null;
end $$;

create trigger audit_services after insert or update or delete on public.services for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.service_categories for each row execute function public.audit_row_change();
create trigger audit_slots after insert or update or delete on public.time_slots for each row execute function public.audit_row_change();
create trigger audit_service_slots after insert or update or delete on public.service_slots for each row execute function public.audit_row_change();
create trigger audit_blocked after insert or update or delete on public.blocked_dates for each row execute function public.audit_row_change();
create trigger audit_settings after insert or update or delete on public.business_settings for each row execute function public.audit_row_change();
create trigger audit_workers after insert or update or delete on public.workers for each row execute function public.audit_row_change();
create trigger audit_assignments after insert or update or delete on public.booking_assignments for each row execute function public.audit_row_change();
