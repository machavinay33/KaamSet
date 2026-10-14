-- RLS / privilege verification. Run in the Supabase SQL editor AFTER migrations (and ideally after loading demo data).
-- Each block either prints NOTICE PASS or raises an exception (FAIL). Everything is rolled back.
begin;

-- 1) Anonymous visitors cannot touch booking-related tables at all
set local role anon;
do $$ declare t text; begin
  foreach t in array array['bookings','booking_status_history','payment_records','booking_notes','audit_logs','admin_profiles','workers','booking_assignments','blocked_dates','service_slots','rate_limits'] loop
    begin
      execute format('select 1 from public.%I limit 1', t);
      raise exception 'FAIL: anon can read %', t;
    exception when insufficient_privilege then raise notice 'PASS: anon cannot read %', t; end;
  end loop;
end $$;

do $$ begin
  begin update public.services set price_inr = 0; raise exception 'FAIL: anon can update services';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot update services'; end;
  begin insert into public.business_settings(key, value) values ('x','1'); raise exception 'FAIL: anon can insert settings';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot insert settings'; end;
  begin perform public.create_booking(null,null,null,null,null,null,null,null,null,null); raise exception 'FAIL: anon can call create_booking';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot call create_booking'; end;
  begin perform public.lookup_booking('KS-AAAAAAAA', repeat('a',64)); raise exception 'FAIL: anon can call lookup_booking';
  exception when insufficient_privilege then raise notice 'PASS: anon cannot call lookup_booking'; end;
end $$;

-- anon sees only active catalogue rows and public settings
do $$ declare n int; begin
  select count(*) into n from public.services where not is_active; if n <> 0 then raise exception 'FAIL: anon sees inactive services'; end if;
  select count(*) into n from public.business_settings where not is_public; if n <> 0 then raise exception 'FAIL: anon sees private settings'; end if;
  raise notice 'PASS: anon catalogue/settings scoped';
end $$;
reset role;

-- 2) A signed-in NON-admin user sees nothing and cannot write or escalate
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from public.bookings; if n <> 0 then raise exception 'FAIL: non-admin sees bookings'; end if;
  select count(*) into n from public.audit_logs; if n <> 0 then raise exception 'FAIL: non-admin sees audit logs'; end if;
  select count(*) into n from public.admin_profiles; if n <> 0 then raise exception 'FAIL: non-admin sees admin profiles'; end if;
  raise notice 'PASS: non-admin reads nothing';
  begin insert into public.admin_profiles(user_id, full_name) values ('00000000-0000-0000-0000-000000000001','x'); raise exception 'FAIL: privilege escalation';
  exception when insufficient_privilege then raise notice 'PASS: cannot self-assign admin'; end;
  begin insert into public.services(slug,name,price_inr) values ('hack','Hack',0); raise exception 'FAIL: non-admin inserted service';
  exception when insufficient_privilege then raise notice 'PASS: non-admin cannot insert services'; end;
  begin perform public.admin_change_status(gen_random_uuid(), 'completed', null); raise exception 'FAIL: non-admin RPC allowed';
  exception when insufficient_privilege then raise notice 'PASS: admin RPC rejects non-admin'; end;
  begin perform public.admin_dashboard_stats(); raise exception 'FAIL: non-admin stats';
  exception when insufficient_privilege then raise notice 'PASS: stats rejects non-admin'; end;
end $$;
reset role;
rollback;
