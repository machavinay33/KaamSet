-- KaamSet MIHAN service area and structured customer address fields.
-- Apply after migrations 0001-0005. Existing booking rows remain intact.

alter table public.bookings
  add column if not exists township text,
  add column if not exists building_name text,
  add column if not exists flat_number text;

alter table public.bookings drop constraint if exists bookings_township_check;
alter table public.bookings add constraint bookings_township_check
  check (township is null or township in ('Shiv Khailasa township', 'Moraj Waterfalls', 'Bloomdale', 'First City'));

alter table public.bookings drop constraint if exists bookings_building_name_check;
alter table public.bookings add constraint bookings_building_name_check
  check (building_name is null or char_length(building_name) between 1 and 80);

alter table public.bookings drop constraint if exists bookings_flat_number_check;
alter table public.bookings add constraint bookings_flat_number_check
  check (flat_number is null or char_length(flat_number) between 1 and 40);

-- Keep the legacy combined address column for existing admin/customer views and integrations.
alter table public.bookings drop constraint if exists bookings_flat_identifier_check;
alter table public.bookings add constraint bookings_flat_identifier_check
  check (char_length(flat_identifier) between 1 and 150);

-- This deployment uses the new RPC signature; remove the old service-role-only overload.
drop function if exists public.create_booking(uuid, date, uuid, text, text, text, text, text, text, uuid);

create function public.create_booking(
  p_service_id uuid, p_date date, p_slot_id uuid, p_name text, p_phone text,
  p_township text, p_building_name text, p_flat_number text, p_instructions text,
  p_reference text, p_token_hash text, p_idempotency uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.services;
  t public.time_slots;
  v_err text;
  v_status public.booking_status;
  v_id uuid;
  v_ref text;
  v_active int;
  v_con text;
begin
  if p_township is null or p_township not in ('Shiv Khailasa township', 'Moraj Waterfalls', 'Bloomdale', 'First City')
     or nullif(trim(p_building_name), '') is null or nullif(trim(p_flat_number), '') is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_address');
  end if;

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

  insert into public.bookings (
    reference, lookup_token_hash, idempotency_key, service_id, service_name, service_price_inr, service_duration_minutes,
    customer_name, customer_phone, township, building_name, flat_number, flat_identifier,
    booking_date, slot_id, slot_label, slot_start_time, slot_end_time, instructions, status, terms_accepted_at, confirmed_at
  )
  values (
    p_reference, p_token_hash, p_idempotency, s.id, s.name, s.price_inr, s.duration_minutes,
    p_name, p_phone, p_township, trim(p_building_name), trim(p_flat_number),
    concat_ws(', ', trim(p_building_name), 'Flat ' || trim(p_flat_number)),
    p_date, t.id, t.label, t.start_time, t.end_time, nullif(p_instructions, ''),
    v_status, now(), case when v_status = 'confirmed' then now() else null end
  )
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

revoke all on function public.create_booking(uuid, date, uuid, text, text, text, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, date, uuid, text, text, text, text, text, text, text, text, uuid) to service_role;

create or replace function public._booking_view(b public.bookings) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reference', b.reference, 'service_id', b.service_id, 'service_name', b.service_name,
    'price_inr', b.service_price_inr, 'duration_minutes', b.service_duration_minutes, 'booking_date', b.booking_date,
    'slot_label', b.slot_label, 'slot_start_time', b.slot_start_time, 'slot_end_time', b.slot_end_time,
    'status', b.status, 'payment_status', b.payment_status, 'customer_name', b.customer_name,
    'township', b.township, 'building_name', b.building_name, 'flat_number', b.flat_number,
    'flat_identifier', b.flat_identifier, 'instructions', b.instructions, 'created_at', b.created_at,
    'cancellation_reason', b.cancellation_reason,
    'can_cancel', public._customer_can(b, 'cancel'), 'can_reschedule', public._customer_can(b, 'reschedule')
  );
$$;

-- Bring existing site settings in line with the requested service area and WhatsApp number.
insert into public.business_settings (key, value, is_public)
values ('society.name', to_jsonb('MIHAN'::text), true)
on conflict (key) do update set value = excluded.value, is_public = excluded.is_public;

insert into public.business_settings (key, value, is_public)
values ('contact.whatsapp', to_jsonb('+91 95293 41654'::text), true)
on conflict (key) do update set value = excluded.value, is_public = excluded.is_public;

-- Update only the old default terms sentence; leave any unrelated custom policy text unchanged.
update public.business_settings
set value = to_jsonb(replace(
  value #>> '{}',
  'Service is available only to residents of Shiv Kailasa Society.',
  'Services are available across MIHAN, including Shiv Khailasa township, Moraj Waterfalls, Bloomdale and First City.'
))
where key = 'policy.terms'
  and value #>> '{}' like '%Service is available only to residents of Shiv Kailasa Society.%';
