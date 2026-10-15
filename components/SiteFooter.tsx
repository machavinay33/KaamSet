import Image from 'next/image';
import Link from 'next/link';
import { phoneLinks } from '@/lib/format';
import type { Settings } from '@/lib/settings-schema';

export function SiteFooter({ settings }: { settings: Settings }) {
  const phone = phoneLinks(settings['contact.phone']);
  return (
    <footer className="mt-20 border-t border-line bg-white pb-24 md:pb-0">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Image src="/logo.png" alt="KaamSet - Home chores, sorted." width={220} height={62} className="h-14 w-auto" />
          <p className="mt-4 max-w-sm text-sm text-ink-600">
            Serving MIHAN, including Shiv Khailasa township, Moraj Waterfalls, Bloomdale and First City.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link className="hover:text-brand-800" href="/services">Services</Link></li>
            <li><Link className="hover:text-brand-800" href="/book">Book a Service</Link></li>
            <li><Link className="hover:text-brand-800" href="/my-bookings">My Bookings</Link></li>
            <li><Link className="hover:text-brand-800" href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold">Policies</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link className="hover:text-brand-800" href="/policies/terms">Service terms</Link></li>
            <li><Link className="hover:text-brand-800" href="/policies/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-brand-800" href="/policies/cancellation">Cancellation policy</Link></li>
            <li><Link className="hover:text-brand-800" href="/policies/payment">Payments</Link></li>
          </ul>
          {phone && <p className="mt-4 text-sm"><a className="font-medium text-brand-800 underline" href={phone.tel}>{settings['contact.phone']}</a></p>}
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-500">&copy; {new Date().getFullYear()} KaamSet. Home chores, sorted.</div>
    </footer>
  );
}
