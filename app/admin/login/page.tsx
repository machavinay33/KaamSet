import Image from 'next/image';
import type { Metadata } from 'next';
import { signInAction } from './actions';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };
const ERRORS: Record<string, string> = {
  invalid: 'Incorrect email or password.', forbidden: 'This account does not have admin access.', rate: 'Too many attempts. Please wait 15 minutes.',
};

export default async function AdminLogin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="card w-full max-w-sm p-7">
        <Image src="/logo-header.png" alt="KaamSet" width={160} height={42} className="mx-auto h-10 w-auto" priority />
        <h1 className="mt-6 text-center text-xl font-bold">Admin sign in</h1>
        {sp.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{ERRORS[sp.error] ?? ERRORS.invalid}</p>}
        <form action={signInAction} className="mt-5 space-y-4">
          <input type="hidden" name="next" value={sp.next ?? ''} />
          <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="input" /></div>
          <div><label htmlFor="password" className="label">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
        <p className="mt-5 text-center text-xs text-ink-500">Admin accounts are created by the site owner. There is no public sign-up.</p>
      </div>
    </main>
  );
}
