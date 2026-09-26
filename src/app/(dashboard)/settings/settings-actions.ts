'use server';

import { createClient } from '@/lib/supabase/server';
import { localStore } from '@/lib/storage/local-store';
import { env } from '@/config/env';

export async function generateBindingTokenAction() {
  const token = 'BIND-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const isSupabaseLive =
    env.NEXT_PUBLIC_SUPABASE_URL &&
    !env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder');

  if (isSupabaseLive) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('profiles')
          .update({ binding_token: token })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to update binding_token in Supabase:', err);
    }
  }

  // Also record in local store
  localStore.setBindingToken('user-default-1', token);

  return { token };
}
