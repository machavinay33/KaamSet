import type { Metadata } from 'next';
import { MyBookingsClient } from '@/components/MyBookingsClient';
import { otpConfigured } from '@/lib/notifications/otp';

export const metadata: Metadata = { title: 'My Bookings', robots: { index: false } };

export default function MyBookingsPage() {
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">My Bookings</h1>
      <p className="mb-8 mt-2 text-ink-600">View, reschedule or cancel your bookings. No account needed.</p>
      <MyBookingsClient otpConfigured={otpConfigured()} />
    </div>
  );
}
