import type { CommandContext, Context } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateProfileByChatId } from '../bot-profile.service';
import { formatIDR } from '@/lib/utils';

export async function handleRekapCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  if (!chatId) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) {
    return ctx.reply('⚠️ Tidak dapat memuat profil pengguna.');
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let totalToday = 0;
  let totalWeek = 0;
  let totalMonth = 0;

  const { data: transactions, error } = await supabaseAdmin
    .from('transactions')
    .select('amount, date, is_expense')
    .eq('user_id', profile.id)
    .eq('is_expense', true)
    .gte('date', startOfMonth);

  if (error) {
    console.error('Error in /rekap:', error);
    return ctx.reply('⚠️ Gagal mengambil data rekap pengeluaran. Silakan coba kembali.');
  }

  for (const t of transactions || []) {
    const tDate = t.date;
    const amount = Number(t.amount);
    totalMonth += amount;
    if (tDate >= startOfWeek) totalWeek += amount;
    if (tDate >= startOfDay) totalToday += amount;
  }

  return ctx.reply(
    `📊 *Rekap Pengeluaran TeleSpend*
👤 ${profile.full_name || username}

📅 *Hari Ini:*
${formatIDR(totalToday)}

📆 *Minggu Ini:*
${formatIDR(totalWeek)}

🗓️ *Bulan Ini (${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}):*
${formatIDR(totalMonth)}

_Gunakan /budget untuk melihat batas kuota anggaran._`,
    { parse_mode: 'Markdown' }
  );
}
