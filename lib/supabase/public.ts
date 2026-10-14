import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

/** Anonymous client for public catalogue reads. RLS limits it to active services, active slots and public settings. */
export function publicClient() {
  const env = publicEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
