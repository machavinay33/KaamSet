export type AdminProfile = { user_id: string; full_name: string; role: string; is_active: boolean };

/** Pure check used by requireAdmin(); the database re-checks via is_admin() and RLS on every query. */
export function isActiveAdmin(profile: AdminProfile | null | undefined, userId: string | null | undefined): profile is AdminProfile {
  return !!profile && !!userId && profile.user_id === userId && profile.is_active === true && profile.role === 'admin';
}
