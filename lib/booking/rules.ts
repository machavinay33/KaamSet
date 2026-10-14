export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];
export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected',
};
export const PAYMENT_LABELS: Record<PaymentStatus, string> = { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' };

/** Mirrors public._transition_allowed in SQL (the database is the source of truth). */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};
export const canTransition = (from: BookingStatus, to: BookingStatus) => TRANSITIONS[from].includes(to);
export const reasonRequired = (to: BookingStatus) => to === 'cancelled' || to === 'rejected';
/** Statuses that occupy slot capacity. */
export const CAPACITY_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];

export const hasCapacity = (booked: number, max: number) => booked < max;

/** Date + 'HH:MM[:SS]' in India time -> absolute Date. */
export function slotStart(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${t}+05:30`);
}

/** Earliest/latest bookable calendar dates (IST) for given lead time and advance window. */
export function bookableDateBounds(now: Date, leadHours: number, maxAdvanceDays: number) {
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  const earliest = fmt(new Date(now.getTime() + leadHours * 3600_000));
  const latest = fmt(new Date(now.getTime() + maxAdvanceDays * 86_400_000));
  return { earliest, latest };
}

export function customerCanAct(opts: { status: BookingStatus; date: string; startTime: string; now: Date; allowed: boolean; minHoursBefore: number }) {
  if (!opts.allowed) return false;
  if (opts.status !== 'pending' && opts.status !== 'confirmed') return false;
  return slotStart(opts.date, opts.startTime).getTime() >= opts.now.getTime() + opts.minHoursBefore * 3600_000;
}
