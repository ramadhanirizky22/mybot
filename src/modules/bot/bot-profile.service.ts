import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function getOrCreateProfileByChatId(
  chatId: number,
  username?: string
): Promise<{ id: string; full_name: string | null } | null> {
  try {
    // 1. Check if profile already linked with this chatId
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // 2. Automatically create auth user in Supabase
    const email = `telegram_${chatId}@telespend.app`;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: username || 'Pengguna Telegram' },
    });

    if (createError) {
      // User might already exist in auth.users, try finding it
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const match = list.users.find((u) => u.email === email);
      if (match) {
        await supabaseAdmin
          .from('profiles')
          .update({
            telegram_chat_id: chatId,
            telegram_username: username || null,
            full_name: username || 'Pengguna Telegram',
          })
          .eq('id', match.id);

        return { id: match.id, full_name: username || 'Pengguna Telegram' };
      }
      console.error('Error creating auth user:', createError);
      return null;
    }

    if (newUser?.user) {
      // Update profile with telegram_chat_id
      const { data: updatedProfile } = await supabaseAdmin
        .from('profiles')
        .update({
          telegram_chat_id: chatId,
          telegram_username: username || null,
          full_name: username || 'Pengguna Telegram',
          updated_at: new Date().toISOString(),
        })
        .eq('id', newUser.user.id)
        .select('id, full_name')
        .maybeSingle();

      return updatedProfile || { id: newUser.user.id, full_name: username || 'Pengguna Telegram' };
    }
  } catch (err) {
    console.error('Error in getOrCreateProfileByChatId:', err);
  }

  return null;
}
