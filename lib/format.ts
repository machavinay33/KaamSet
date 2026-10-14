export function formatINR(n: number | string): string {
  const v = Number(n);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v);
}

/** 'YYYY-MM-DD' -> '14 Oct 2026' style label (timezone-safe). */
export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** '09:00:00' -> '9:00 AM' */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Builds tel:/wa.me hrefs for Indian numbers. Returns null if the number is not usable. */
export function phoneLinks(raw: string | null | undefined): { tel: string; wa: string } | null {
  const d = digitsOnly(raw ?? '');
  const national = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 10 ? d : d.length === 11 && d.startsWith('0') ? d.slice(1) : null;
  if (!national || !/^[6-9]\d{9}$/.test(national)) return null;
  return { tel: `tel:+91${national}`, wa: `https://wa.me/91${national}` };
}
