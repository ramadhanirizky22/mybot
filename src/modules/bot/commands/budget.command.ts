import type { CommandContext, Context } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateProfileByChatId } from '../bot-profile.service';
import { formatIDR } from '@/lib/utils';

export async function handleBudgetCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  if (!chatId) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) {
    return ctx.reply('⚠️ Tidak dapat memuat profil pengguna.');
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Get budgets for this month
  const { data: budgets } = await supabaseAdmin
    .from('budgets')
    .select('id, category_id, limit_amount')
    .eq('user_id', profile.id)
    .eq('month', currentMonth)
    .eq('year', currentYear);

  if (!budgets || budgets.length === 0) {
    return ctx.reply(
      `🎯 Belum ada target anggaran yang disetel untuk bulan ${now.toLocaleString('id-ID', { month: 'long' })}.
Atur anggaran bulanan melalui Web Dashboard TeleSpend menu **Anggaran (Budgets)**.`
    );
  }

  // 2. Get category names
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name');

  const categoryMap = new Map((categories || []).map((c) => [c.id, c.name]));

  // 3. Get total spent per category this month
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', profile.id)
    .eq('is_expense', true)
    .gte('date', startOfMonth);

  const spentMap = new Map<string, number>();
  for (const t of transactions || []) {
    if (t.category_id) {
      const current = spentMap.get(t.category_id) || 0;
      spentMap.set(t.category_id, current + Number(t.amount));
    }
  }

  let message = `🎯 *Status Anggaran Bulan Ini (${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })})*\n\n`;

  for (const b of budgets) {
    const catName = categoryMap.get(b.category_id) || 'Kategori Lain';
    const limit = Number(b.limit_amount);
    const spent = spentMap.get(b.category_id) || 0;
    const pct = Math.round((spent / limit) * 100);

    const filledBlocks = Math.min(10, Math.floor(pct / 10));
    const emptyBlocks = 10 - filledBlocks;
    const bar = '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

    let statusEmoji = '🟢';
    if (pct >= 100) statusEmoji = '🔴 (OVER BUDGET!)';
    else if (pct >= 80) statusEmoji = '⚠️ (PERINGATAN ≥ 80%)';

    message += `*${catName}* ${statusEmoji}\n`;
    message += `[${bar}] ${pct}%\n`;
    message += `Terpakai: ${formatIDR(spent)} / ${formatIDR(limit)}\n\n`;
  }

  return ctx.reply(message, { parse_mode: 'Markdown' });
}
