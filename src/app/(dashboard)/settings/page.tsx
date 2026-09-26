import { getCurrentUserId } from '@/lib/auth-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SettingsView } from './settings-view';
import { env } from '@/config/env';
import type { Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  let profile: Profile | null = null;

  try {
    const auth = await getCurrentUserId();
    if (auth?.userId) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', auth.userId)
        .maybeSingle();

      if (data) {
        profile = data as Profile;
      }
    }
  } catch (err) {
    console.error('Error fetching profile in settings:', err);
  }

  return (
    <SettingsView
      profile={profile}
      botUsername={env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'money_riki_bot'}
    />
  );
}
