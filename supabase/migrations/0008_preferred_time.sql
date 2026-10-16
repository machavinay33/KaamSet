-- Replace customer-selected fixed time slots with a requested time that the KaamSet team confirms.
-- Existing booking rows and their slot snapshots remain intact for historical display.

alter table public.bookings
  add column if not exists preferred_time time;

alter table public.bookings
  alter column slot_id drop not null;

-- Keep older deployments/settings from automatically confirming new bookings during rollout.
update public.business_settings
set value = to_jsonb(false)
where key = 'booking.auto_confirm';

create index if not exists bookings_preferred_time_lookup_idx
  on public.bookings (customer_phone, service_id, booking_date, (coalesce(preferred_time, slot_start_time)))
  where status in ('pending', 'confirmed', 'in_progress');

-- Internal validator shared by new booking, customer reschedule and admin time-update RPCs.
-- Returns NULL when the requested service/date/time can be reviewed by the team.
create or replace function public._preferred_time_error(
  p_service_id uuid,
  p_date date,
  p_preferred_time time,
  p_customer_phone text,
  p_ignore_booking uuid
) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  s public.services;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_dow smallint;
  v_lead int;
  v_advance int;
  v_requested_at timestamptz;
begin
  if p_preferred_time is null then return 'invalid_time'; end if;
  if p_date is null then return 'invalid_date'; end if;
  if not public._setting_bool('booking.enabled', true) then return 'bookings_disabled'; end if;

  select * into s from public.services where id = p_service_id;
  if not found or not s.is_active or not s.is_bookable then return 'service_unavailable'; end if;
  if p_date < v_today then return 'in_past'; end if;

  v_dow := extract(dow from p_date)::smallint;
  if s.allowed_weekdays is not null and not (v_dow = any (s.allowed_weekdays)) then
    return 'closed_day';
  end if;
  if exists (
    select 1 from public.blocked_dates b
    where b.blocked_on = p_date and (b.service_id is null or b.service_id = p_service_id)
  ) then
    return 'blocked_date';
  end if;

  v_lead := coalesce(s.min_lead_hours, public._setting_int('booking.min_lead_hours', 4));
  v_advance := coalesce(s.max_advance_days, public._setting_int('booking.max_advance_days', 14));
  v_requested_at := (p_date + p_preferred_time) at time zone 'Asia/Kolkata';
  if v_requested_at < now() + make_interval(hours => v_lead) then return 'too_soon'; end if;
  if p_date > v_today + v_advance then return 'too_far'; end if;

  if p_customer_phone is not null and exists (
    select 1 from public.bookings b
    where b.customer_phone = p_customer_phone
      and b.service_id = p_service_id
      and b.booking_date = p_date
      and coalesce(b.preferred_time, b.slot_start_time) = p_preferred_time
      and b.status in ('pending', 'confirmed', 'in_progress')
      and (p_ignore_booking is null or b.id <> p_ignore_booking)
  ) then
    return 'already_booked';
  end if;

  return null;
end $$;
revoke all on function public._preferred_time_error(uuid, date, time, text, uuid) from public, anon, authenticated, service_role;

-- New overload for the customer-selected time. Kept separate from the legacy slot RPC during rollout.
create or replace function public.create_booking(
  p_service_id uuid,
  p_date date,
  p_preferred_time time,
  p_name text,
  p_phone text,
  p_township text,
  p_building_name text,
  p_flat_number text,
  p_instructions text,
  p_reference text,
  p_token_hash text,
  p_idempotency uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.services;
  v_err text;
  v_id uuid;
  v_ref text;
  v_status public.booking_status;
  v_active int;
  v_con text;
begin
  if p_township is null or p_township not in ('Shiv Khailasa township', 'Moraj Waterfalls', 'Bloomdale', 'First City')
     or nullif(trim(p_building_name), '') is null or nullif(trim(p_flat_number), '') is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_address');
  end if;

  select reference, status into v_ref, v_status
  from public.bookings where idempotency_key = p_idempotency;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'reference', v_ref, 'status', v_status);
  end if;

  if p_preferred_time is null then return jsonb_build_object('ok', false, 'code', 'invalid_time'); end if;
  if p_date is null then return jsonb_build_object('ok', false, 'code', 'invalid_date'); end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_service_id::text || ':' || p_date::text || ':' || p_preferred_time::text || ':' || p_phone, 0
  ));

  v_err := public._preferred_time_error(p_service_id, p_date, p_preferred_time, p_phone, null);
  if v_err is not null then return jsonb_build_object('ok', false, 'code', v_err); end if;

  select count(*) into v_active
  from public.bookings
  where customer_phone = p_phone
    and status in ('pending', 'confirmed', 'in_progress')
    and booking_date >= (now() at time zone 'Asia/Kolkata')::date;
  if v_active >= public._setting_int('booking.max_active_per_phone', 5) then
    return jsonb_build_object('ok', false, 'code', 'too_many_active');
  end if;

  select * into s from public.services where id = p_service_id;
  v_status := 'pending'::public.booking_status;

  insert into public.bookings (
    reference, lookup_token_hash, idempotency_key, service_id, service_name, service_price_inr, service_duration_minutes,
    customer_name, customer_phone, township, building_name, flat_number, flat_identifier,
    booking_date, preferred_time, slot_id, slot_label, slot_start_time, slot_end_time,
    instructions, status, terms_accepted_at, confirmed_at
  ) values (
    p_reference, p_token_hash, p_idempotency, s.id, s.name, s.price_inr, s.duration_minutes,
    p_name, p_phone, p_township, trim(p_building_name), trim(p_flat_number),
    concat_ws(', ', trim(p_building_name), 'Flat ' || trim(p_flat_number)),
    p_date, p_preferred_time, null, 'Preferred time', p_preferred_time, p_preferred_time,
    nullif(p_instructions, ''), v_status, now(), null
  ) returning id into v_id;

  insert into public.booking_status_history (booking_id, from_status, to_status, actor, reason)
  values (v_id, null, v_status, 'customer', 'Booking request submitted; preferred time awaits team confirmation');

  return jsonb_build_object('ok', true, 'duplicate', false, 'reference', p_reference, 'status', v_status);
exception when unique_violation then
  get stacked diagnostics v_con = constraint_name;
  if v_con = 'bookings_reference_key' then
    return jsonb_build_object('ok', false, 'code', 'reference_collision');
  end if;
  select reference, status into v_ref, v_status from public.bookings where idempotency_key = p_idempotency;
  return jsonb_build_object('ok', true, 'duplicate', true, 'reference', v_ref, 'status', v_status);
end $$;

revoke all on function public.create_booking(uuid, date, time, text, text, text, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, date, time, text, text, text, text, text, text, text, text, uuid) to service_role;

-- Customer projection includes the requested time; old rows continue to use their stored slot snapshot.
create or replace function public._booking_view(b public.bookings) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reference', b.reference, 'service_id', b.service_id, 'service_name', b.service_name,
    'price_inr', b.service_price_inr, 'duration_minutes', b.service_duration_minutes, 'booking_date', b.booking_date,
    'preferred_time', b.preferred_time,
    'slot_label', b.slot_label, 'slot_start_time', b.slot_start_time, 'slot_end_time', b.slot_end_time,
    'status', b.status, 'payment_status', b.payment_status, 'customer_name', b.customer_name,
    'township', b.township, 'building_name', b.building_name, 'flat_number', b.flat_number,
    'flat_identifier', b.flat_identifier, 'instructions', b.instructions, 'created_at', b.created_at,
    'cancellation_reason', b.cancellation_reason,
    'can_cancel', public._customer_can(b, 'cancel'), 'can_reschedule', public._customer_can(b, 'reschedule')
  );
$$;

-- Customer changes a requested date/time; every change returns the request to Pending for staff review.
create or replace function public.customer_reschedule_preferred(
  p_reference text,
  p_token_hash text,
  p_date date,
  p_preferred_time time
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_err text;
  v_old_time time;
begin
  select * into b from public.bookings
  where reference = p_reference and lookup_token_hash = p_token_hash
  for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public._customer_can(b, 'reschedule') then return jsonb_build_object('ok', false, 'code', 'not_allowed'); end if;

  v_old_time := coalesce(b.preferred_time, b.slot_start_time);
  if b.booking_date = p_date and v_old_time = p_preferred_time then
    return jsonb_build_object('ok', false, 'code', 'no_change');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    b.service_id::text || ':' || p_date::text || ':' || p_preferred_time::text || ':' || b.customer_phone, 0
  ));
  v_err := public._preferred_time_error(b.service_id, p_date, p_preferred_time, b.customer_phone, b.id);
  if v_err is not null then return jsonb_build_object('ok', false, 'code', v_err); end if;

  update public.bookings
  set booking_date = p_date, preferred_time = p_preferred_time, slot_id = null,
      slot_label = 'Preferred time', slot_start_time = p_preferred_time, slot_end_time = p_preferred_time,
      status = 'pending', confirmed_at = null
  where id = b.id;

  insert into public.booking_status_history (booking_id, from_status, to_status, actor, reason)
  values (b.id, b.status, 'pending', 'customer',
    'Customer requested a new preferred time: ' || b.booking_date::text || ' ' || v_old_time::text || ' → ' || p_date::text || ' ' || p_preferred_time::text || '; awaiting team confirmation');

  return jsonb_build_object('ok', true, 'status', 'pending');
end $$;
revoke all on function public.customer_reschedule_preferred(text, text, date, time) from public, anon, authenticated;
grant execute on function public.customer_reschedule_preferred(text, text, date, time) to service_role;

-- Staff may update the requested date/time after reviewing it. This action never changes a Pending request to Confirmed.
create or replace function public.admin_set_preferred_time(
  p_booking_id uuid,
  p_date date,
  p_preferred_time time,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_err text;
  v_old_time time;
  v_reason text := left(nullif(trim(coalesce(p_reason, '')), ''), 300);
begin
  perform public._require_admin();
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if b.status not in ('pending', 'confirmed') then return jsonb_build_object('ok', false, 'code', 'not_reschedulable'); end if;

  v_old_time := coalesce(b.preferred_time, b.slot_start_time);
  if b.booking_date = p_date and v_old_time = p_preferred_time then
    return jsonb_build_object('ok', false, 'code', 'no_change');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    b.service_id::text || ':' || p_date::text || ':' || p_preferred_time::text || ':' || b.customer_phone, 0
  ));
  v_err := public._preferred_time_error(b.service_id, p_date, p_preferred_time, b.customer_phone, b.id);
  if v_err is not null then return jsonb_build_object('ok', false, 'code', v_err); end if;

  update public.bookings
  set booking_date = p_date, preferred_time = p_preferred_time, slot_id = null,
      slot_label = 'Preferred time', slot_start_time = p_preferred_time, slot_end_time = p_preferred_time
  where id = b.id;

  perform public._audit('booking.preferred_time_updated', 'booking', b.id::text,
    jsonb_build_object('reference', b.reference, 'from_date', b.booking_date, 'from_time', v_old_time,
                       'to_date', p_date, 'to_time', p_preferred_time, 'reason', v_reason));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_set_preferred_time(uuid, date, time, text) from public, anon, authenticated;
grant execute on function public.admin_set_preferred_time(uuid, date, time, text) to authenticated;
