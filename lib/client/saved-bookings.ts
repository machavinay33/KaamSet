'use client';
export type Saved = { reference: string; key: string; savedAt: number };
export type BookingView = {
  reference: string; service_id: string; service_name: string; price_inr: number; duration_minutes: number | null;
  booking_date: string; preferred_time: string | null; slot_label: string; slot_start_time: string; slot_end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'; payment_status: 'unpaid' | 'paid' | 'refunded';
  customer_name: string; township: string | null; building_name: string | null; flat_number: string | null; flat_identifier: string; instructions: string | null; created_at: string;
  cancellation_reason: string | null; can_cancel: boolean; can_reschedule: boolean;
};

const STORE = 'kaamset.bookings.v1';

export function loadSaved(): Saved[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return Array.isArray(raw) ? raw.filter((r) => r?.reference && r?.key) : [];
  } catch { return []; }
}
export function saveBooking(reference: string, key: string) {
  try {
    const list = loadSaved().filter((r) => r.reference !== reference);
    list.unshift({ reference, key, savedAt: Date.now() });
    localStorage.setItem(STORE, JSON.stringify(list.slice(0, 20)));
  } catch { /* storage unavailable (private mode): the private link still works */ }
}
export function removeSaved(reference: string) {
  try { localStorage.setItem(STORE, JSON.stringify(loadSaved().filter((r) => r.reference !== reference))); } catch { /* ignore */ }
}

export async function lookupMany(items: { reference: string; key: string }[]): Promise<{ reference: string; booking: BookingView | null }[]> {
  if (!items.length) return [];
  const res = await fetch('/api/bookings/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items.slice(0, 10) }) });
  if (res.status === 429) throw new Error('Too many attempts. Please wait a few minutes and try again.');
  if (!res.ok) throw new Error('Could not load your bookings. Please try again.');
  const json = await res.json();
  return json.results;
}

export function privateLink(reference: string, key: string) {
  return `${window.location.origin}/my-bookings#ref=${encodeURIComponent(reference)}&key=${encodeURIComponent(key)}`;
}
