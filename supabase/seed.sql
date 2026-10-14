-- DEVELOPMENT / DEMO DATA ONLY. Prices below are placeholders, NOT real prices. Do not load in production
-- (or edit every service in /admin/services before launch).
insert into public.service_categories (name, slug, sort_order) values
 ('Cleaning', 'cleaning', 10), ('Repairs', 'repairs', 20), ('Appliances', 'appliances', 30)
on conflict (slug) do nothing;

insert into public.services (category_id, slug, name, description, icon, price_inr, price_note, duration_minutes, sort_order)
select c.id, v.slug, v.name, v.descr, v.icon, v.price, v.note, v.dur, v.ord from (values
 ('cleaning','home-cleaning','Home cleaning','Sweeping, mopping and dusting for your flat. [DEMO]','sparkles',499,'per visit',120,10),
 ('repairs','plumbing','Plumbing','Leaks, taps and fittings fixed. [DEMO]','droplets',299,'visit charge',60,20),
 ('repairs','electrician','Electrician','Switches, fans, lights and wiring checks. [DEMO]','zap',299,'visit charge',60,30),
 ('appliances','ac-service','AC service','Cleaning and checkup of split AC. [DEMO]','snowflake',599,'per unit',60,40)
) as v(cat, slug, name, descr, icon, price, note, dur, ord)
join public.service_categories c on c.slug = v.cat
on conflict (slug) do nothing;

insert into public.time_slots (label, start_time, end_time, max_bookings, sort_order) values
 ('Morning', '09:00', '12:00', 3, 10), ('Afternoon', '12:00', '15:00', 3, 20), ('Evening', '15:00', '18:00', 3, 30);
