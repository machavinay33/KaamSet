-- KaamSet schema. Run migrations in order (0001 -> 0005).
create extension if not exists pgcrypto with schema extensions;

create type public.booking_status as enum ('pending','confirmed','in_progress','completed','cancelled','rejected');
create type public.payment_status as enum ('unpaid','paid','refunded');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Admin role mapping. Rows are created only via the documented setup process (service role / SQL editor).
create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  role text not null default 'admin' check (role in ('admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.business_settings (
  key text primary key check (char_length(key) <= 80),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create trigger trg_settings_updated before update on public.business_settings for each row execute function public.set_updated_at();

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 600),
  icon text not null default 'sparkles',
  price_inr numeric(10,2) not null check (price_inr >= 0),
  price_note text check (price_note is null or char_length(price_note) <= 40),
  duration_minutes int check (duration_minutes is null or duration_minutes between 5 and 1440),
  is_active boolean not null default true,        -- visible to the public
  is_bookable boolean not null default true,      -- temporary switch: visible but not bookable
  unavailable_message text check (unavailable_message is null or char_length(unavailable_message) <= 200),
  max_per_slot int check (max_per_slot is null or max_per_slot > 0),
  allowed_weekdays smallint[] check (allowed_weekdays is null or allowed_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  min_lead_hours int check (min_lead_hours is null or min_lead_hours >= 0),
  max_advance_days int check (max_advance_days is null or max_advance_days between 1 and 365),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_idx on public.services(category_id);
create index services_active_sort_idx on public.services(is_active, sort_order);
create trigger trg_services_updated before update on public.services for each row execute function public.set_updated_at();

create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 2 and 40),
  start_time time not null,
  end_time time not null,
  max_bookings int not null default 3 check (max_bookings > 0),
  weekdays smallint[] not null default '{0,1,2,3,4,5,6}' check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create trigger trg_slots_updated before update on public.time_slots for each row execute function public.set_updated_at();

-- If a service has rows here it may only be booked in these slots; no rows = all slots.
create table public.service_slots (
  service_id uuid not null references public.services(id) on delete cascade,
  slot_id uuid not null references public.time_slots(id) on delete cascade,
  primary key (service_id, slot_id)
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_on date not null,
  service_id uuid references public.services(id) on delete cascade, -- null = all services
  reason text check (reason is null or char_length(reason) <= 120),
  created_at timestamptz not null default now()
);
create unique index blocked_dates_unique on public.blocked_dates (blocked_on, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^KS-[A-Z0-9]{8}$'),
  lookup_token_hash text not null check (char_length(lookup_token_hash) = 64),
  idempotency_key uuid not null unique,
  service_id uuid not null references public.services(id) on delete restrict,
  -- snapshots: later service edits never rewrite history
  service_name text not null,
  service_price_inr numeric(10,2) not null check (service_price_inr >= 0),
  service_duration_minutes int,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^[6-9][0-9]{9}$'),
  flat_identifier text not null check (char_length(flat_identifier) between 1 and 40),
  booking_date date not null,
  slot_id uuid not null references public.time_slots(id) on delete restrict,
  slot_label text not null,
  slot_start_time time not null,
  slot_end_time time not null,
  instructions text check (instructions is null or char_length(instructions) <= 500),
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 300),
  cancelled_by text check (cancelled_by in ('customer','admin')),
  terms_accepted_at timestamptz not null,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_slot_active_idx on public.bookings (booking_date, slot_id) where status not in ('cancelled','rejected');
create index bookings_status_idx on public.bookings (status);
create index bookings_date_idx on public.bookings (booking_date);
create index bookings_phone_idx on public.bookings (customer_phone);
create index bookings_service_idx on public.bookings (service_id);
create trigger trg_bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor text not null check (actor in ('customer','admin','system')),
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index booking_history_booking_idx on public.booking_status_history (booking_id, created_at);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('payment','refund')),
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash','upi','card','bank_transfer','other')),
  note text check (note is null or char_length(note) <= 300),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now()
);
create index payment_records_booking_idx on public.payment_records (booking_id);

create table public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index booking_notes_booking_idx on public.booking_notes (booking_id, created_at);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text check (phone is null or char_length(phone) <= 20),   -- admin-only, never exposed publicly
  notes text check (notes is null or char_length(notes) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_workers_updated before update on public.workers for each row execute function public.set_updated_at();

create table public.worker_services (
  worker_id uuid not null references public.workers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (worker_id, service_id)
);

create table public.booking_assignments (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (booking_id, worker_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- DB-backed rate limiting (works across serverless instances). Keys are salted hashes, never raw IPs.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
