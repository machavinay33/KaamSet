import { PAYMENT_LABELS, STATUS_LABELS, type BookingStatus, type PaymentStatus } from '@/lib/booking/rules';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  in_progress: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200',
  completed: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  cancelled: 'bg-stone-100 text-stone-700 ring-1 ring-stone-200',
  rejected: 'bg-red-50 text-red-800 ring-1 ring-red-200',
};
const PAY_STYLES: Record<PaymentStatus, string> = {
  unpaid: 'bg-stone-100 text-stone-700 ring-1 ring-stone-200',
  paid: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  refunded: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200',
};
export const StatusBadge = ({ status }: { status: BookingStatus }) => <span className={`badge ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <span className={`badge ${PAY_STYLES[status]}`}>{PAYMENT_LABELS[status]}</span>;
