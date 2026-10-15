import { publicClient } from '@/lib/supabase/public';
import { defaultSettings, type Settings } from '@/lib/settings-schema';

export type Service = {
  id: string; category_id: string | null; slug: string; name: string; description: string; icon: string;
  price_inr: number; price_note: string | null; duration_minutes: number | null; is_bookable: boolean; unavailable_message: string | null;
  max_advance_days: number | null; min_lead_hours: number | null; sort_order: number;
};
export type Category = { id: string; name: string; slug: string; sort_order: number };
export type Slot = { id: string; label: string; start_time: string; end_time: string; weekdays: number[]; sort_order: number };

export async function getSettings(): Promise<Settings> {
  const { data } = await publicClient().from('business_settings').select('key, value');
  const out: Settings = defaultSettings();
  for (const row of data ?? []) if (row.key in out) out[row.key] = row.value;
  if (!String(out['contact.whatsapp'] ?? '').trim()) out['contact.whatsapp'] = '+91 95293 41654';
  return out;
}

export async function getCatalog(): Promise<{ categories: Category[]; services: Service[]; error: boolean }> {
  const db = publicClient();
  const [c, s] = await Promise.all([
    db.from('service_categories').select('id, name, slug, sort_order').order('sort_order').order('name'),
    db.from('services')
      .select('id, category_id, slug, name, description, icon, price_inr, price_note, duration_minutes, is_bookable, unavailable_message, max_advance_days, min_lead_hours, sort_order')
      .order('sort_order').order('name'),
  ]);
  const services = ((s.data ?? []) as any[]).map((x) => ({ ...x, price_inr: Number(x.price_inr) })) as Service[];
  return { categories: (c.data ?? []) as Category[], services, error: !!(c.error || s.error) };
}

export async function getSlots(): Promise<Slot[]> {
  const { data } = await publicClient().from('time_slots').select('id, label, start_time, end_time, weekdays, sort_order').order('sort_order').order('start_time');
  return (data ?? []) as Slot[];
}
