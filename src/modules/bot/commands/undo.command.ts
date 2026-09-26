import type { CommandContext, Context } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateProfileByChatId } from '../bot-profile.service';
import { formatIDR } from '@/lib/utils';

export async function handleUndoCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  if (!chatId) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) {
    return ctx.reply('⚠️ Tidak dapat memuat profil pengguna.');
  }

  // Get most recent transaction
  const { data: lastTx, error } = await supabaseAdmin
    .from('transactions')
    .select('id, item, amount, date')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !lastTx) {
    return ctx.reply('ℹ️ Tidak ada transaksi terakhir yang ditemukan untuk dibatalkan.');
  }

  // Delete transaction
  const { error: deleteError } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', lastTx.id);

  if (deleteError) {
    return ctx.reply('⚠️ Gagal membatalkan transaksi. Silakan coba kembali.');
  }

  return ctx.reply(
    `🗑️ *Transaksi Berhasil Dibatalkan:*
• *Item:* ${lastTx.item}
• *Nominal:* ${formatIDR(Number(lastTx.amount))}
• *ID:* \`${lastTx.id.slice(0, 8)}...\`

Data telah dihapus dari pencatatan TeleSpend.`,
    { parse_mode: 'Markdown' }
  );
}
