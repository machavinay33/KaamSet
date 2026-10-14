// Creates the first admin. Run once:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' ADMIN_NAME='Your Name' npm run create-admin
// Uses the service-role key from .env.local (server-side only). Never run this in the browser.
import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name } = process.env;
if (!url || !key || !email || !password) { console.error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL and ADMIN_PASSWORD.'); process.exit(1); }
if (password.length < 12) { console.error('Use a password of at least 12 characters.'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
let userId = data?.user?.id;
if (error) {
  if (!/already|registered/i.test(error.message)) { console.error('Could not create user:', error.message); process.exit(1); }
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!userId) { console.error('User exists but could not be found.'); process.exit(1); }
}
const { error: pErr } = await db.from('admin_profiles').upsert({ user_id: userId, full_name: name || email, role: 'admin', is_active: true });
if (pErr) { console.error('Could not create admin profile:', pErr.message); process.exit(1); }
console.log(`Admin ready: ${email}. Sign in at /admin/login`);
