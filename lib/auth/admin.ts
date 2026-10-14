import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActiveAdmin, type AdminProfile } from '@/lib/auth/roles';

export async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // verifies the JWT with Supabase Auth
  if (!user) return null;
  const { data: profile } = await supabase.from('admin_profiles').select('user_id, full_name, role, is_active').eq('user_id', user.id).maybeSingle();
  if (!isActiveAdmin(profile as AdminProfile | null, user.id)) return null;
  return { supabase, user, profile: profile as AdminProfile };
}

/** Server-side authorisation. Call at the top of every admin page, action and route handler. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login?error=forbidden');
  return admin;
}
