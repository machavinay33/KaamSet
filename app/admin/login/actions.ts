'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdmin } from '@/lib/auth/admin';
import { rateLimit } from '@/lib/security/request';

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/admin') && !s.startsWith('//') && !s.startsWith('/admin/login') ? s : '/admin';
};

export async function signInAction(fd: FormData) {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safeNext(fd.get('next'));
  if (!(await rateLimit('admin-login', 10, 900, await headers()))) redirect('/admin/login?error=rate');
  if (!z.string().email().safeParse(email).success || !password || password.length > 200) redirect('/admin/login?error=invalid');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/admin/login?error=invalid');
  if (!(await getAdmin())) { await supabase.auth.signOut(); redirect('/admin/login?error=forbidden'); }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
