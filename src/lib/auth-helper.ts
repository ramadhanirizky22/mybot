import { createClient } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';

export async function getCurrentUserId(): Promise<{ userId: string; isGuest: boolean } | null> {
  // 1. Try to read active session from cookies if in request scope
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return { userId: user.id, isGuest: false };
    }
  } catch {
    // No request context or cookies not set
  }

  // 2. In local / single-user mode, fallback to the latest active profile in Supabase
  try {
    const { data: latestProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestProfile) {
      return { userId: latestProfile.id, isGuest: true };
    }
  } catch (err) {
    console.error('Error getting latest profile from Supabase:', err);
  }

  return null;
}
