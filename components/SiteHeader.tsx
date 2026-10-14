'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CalendarCheck, CalendarPlus, Home, Menu, Phone, Sparkles, X } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/my-bookings', label: 'My Bookings' },
  { href: '/contact', label: 'Contact' },
];
const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/services', label: 'Services', icon: Sparkles },
  { href: '/book', label: 'Book', icon: CalendarPlus, primary: true },
  { href: '/my-bookings', label: 'My Bookings', icon: CalendarCheck },
  { href: '/contact', label: 'Contact', icon: Phone },
];
const active = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="KaamSet home" className="shrink-0">
            <Image src="/logo-header.png" alt="KaamSet" width={150} height={40} priority className="h-9 w-auto sm:h-10" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(path, n.href) ? 'page' : undefined}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium ${active(path, n.href) ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-brand-50 hover:text-ink-900'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/book" className="btn-primary hidden sm:inline-flex">Book a Service</Link>
            <button className="btn-secondary px-3 md:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-menu" aria-label="Mobile" className="border-t border-line bg-white md:hidden">
            <ul className="container-page py-2">
              {NAV.map((n) => (
                <li key={n.href}><Link href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-ink-800 hover:bg-brand-50">{n.label}</Link></li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon; const on = active(path, t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? 'page' : undefined} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium">
                  {t.primary ? (
                    <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-ink-900 shadow-soft ring-4 ring-white"><Icon className="h-5 w-5" aria-hidden /></span>
                  ) : (
                    <Icon className={`h-5 w-5 ${on ? 'text-brand-700' : 'text-ink-500'}`} aria-hidden />
                  )}
                  <span className={on ? 'text-brand-800' : 'text-ink-600'}>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
