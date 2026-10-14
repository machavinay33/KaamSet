import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { signOutAction } from '../login/actions';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin(); // server-side role check on every request
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/admin" aria-label="Admin home"><Image src="/logo-header.png" alt="KaamSet admin" width={140} height={37} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink-600 sm:inline">{profile.full_name}</span>
            <form action={signOutAction}><button className="btn-secondary btn-sm" type="submit"><LogOut className="h-4 w-4" aria-hidden /> Sign out</button></form>
          </div>
        </div>
        <div className="container-page pb-2"><AdminNav /></div>
      </header>
      <main className="container-page py-8">{children}</main>
    </div>
  );
}
