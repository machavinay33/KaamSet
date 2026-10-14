'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Overview' }, { href: '/admin/bookings', label: 'Bookings' }, { href: '/admin/services', label: 'Services' },
  { href: '/admin/availability', label: 'Availability' }, { href: '/admin/workers', label: 'Workers' }, { href: '/admin/settings', label: 'Settings' },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {ITEMS.map((i) => {
          const on = i.href === '/admin' ? path === '/admin' : path.startsWith(i.href);
          return <li key={i.href}><Link href={i.href} aria-current={on ? 'page' : undefined} className={`block rounded-lg px-3.5 py-2 text-sm font-medium ${on ? 'bg-brand-100 text-brand-800' : 'text-ink-600 hover:bg-brand-50'}`}>{i.label}</Link></li>;
        })}
      </ul>
    </nav>
  );
}
