import { Bot, InlineKeyboard } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatIDR } from '@/lib/utils';
import { env } from '@/config/env';

function getWibDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const year = wib.getFullYear();
  const month = String(wib.getMonth() + 1).padStart(2, '0');
  const day = String(wib.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = daysIndo[wib.getDay()];
  const formattedDate = `${dayName}, ${wib.getDate()} ${monthsIndo[wib.getMonth()]} ${year}`;

  const startOfDay = new Date(Date.UTC(year, wib.getMonth(), wib.getDate(), -7, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(year, wib.getMonth(), wib.getDate(), 16, 59, 59, 999)).toISOString();
  const startOfMonth = new Date(Date.UTC(year, wib.getMonth(), 1, -7, 0, 0, 0)).toISOString();

  return {
    dateStr,
    formattedDate,
    startOfDay,
    endOfDay,
    startOfMonth,
  };
}

export async function sendDailyRecapToUser(
  bot: { api: { sendMessage: any } } | Bot,
  userId: string,
  chatId: number,
  fullName?: string
) {
  const { formattedDate, startOfDay, endOfDay, startOfMonth } = getWibDate();

  // 1. Fetch transactions for today
  const { data: todayTx, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('id, item, amount, is_expense, date, category_id, categories(name)')
    .eq('user_id', userId)
    .gte('date', startOfDay)
    .lte('date', endOfDay)
    .order('created_at', { ascending: true });

  if (txError) {
    console.error(`[Daily Recap] Error fetching today tx for ${userId}:`, txError);
    return false;
  }

  // 2. Fetch monthly transactions for context
  const { data: monthTx } = await supabaseAdmin
    .from('transactions')
    .select('amount, is_expense')
    .eq('user_id', userId)
    .eq('is_expense', true)
    .gte('date', startOfMonth);

  // 3. Fetch active budgets
  const { data: budgets } = await supabaseAdmin
    .from('budgets')
    .select('limit_amount')
    .eq('user_id', userId);

  const expensesToday = (todayTx || []).filter((t: any) => t.is_expense);
  const incomeToday = (todayTx || []).filter((t: any) => !t.is_expense);

  const totalExpenseToday = expensesToday.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalIncomeToday = incomeToday.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const totalMonthExpense = (monthTx || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalMonthlyBudget = (budgets || []).reduce((sum: number, b: any) => sum + Number(b.limit_amount || 0), 0);

  // Group by category
  const catMap: Record<string, { amount: number; count: number }> = {};
  for (const t of expensesToday) {
    const catName = (t as any).categories?.name || 'Lainnya';
    if (!catMap[catName]) {
      catMap[catName] = { amount: 0, count: 0 };
    }
    catMap[catName].amount += Number((t as any).amount || 0);
    catMap[catName].count += 1;
  }

  let message = `🌙 *REKAP PENGELUARAN MALAM (21:00 WIB)*\n📅 ${formattedDate}\n👤 ${fullName || 'Pengguna'}\n\n`;

  if (expensesToday.length === 0) {
    message += `🎉 *Luar biasa! Belum ada pengeluaran yang dicatat hari ini.*\nDompet Anda tetap aman dan hemat hari ini. 👍\n\n`;
    if (totalIncomeToday > 0) {
      message += `💰 *Pemasukan Hari Ini:* ${formatIDR(totalIncomeToday)}\n\n`;
    }
  } else {
    message += `💸 *Total Pengeluaran Hari Ini:*\n👉 *${formatIDR(totalExpenseToday)}* _(${expensesToday.length} transaksi)_\n`;
    if (totalIncomeToday > 0) {
      message += `💰 *Total Pemasukan:* ${formatIDR(totalIncomeToday)}\n`;
    }
    message += `\n📂 *Rincian Kategori:*\n`;
    for (const [catName, data] of Object.entries(catMap)) {
      message += `• ${catName}: *${formatIDR(data.amount)}* _(${data.count}x)_\n`;
    }

    message += `\n📝 *Daftar Transaksi Hari Ini:*\n`;
    expensesToday.forEach((t: any, i: number) => {
      message += `${i + 1}. ${t.item} — *${formatIDR(Number(t.amount))}*\n`;
    });
    message += `\n`;
  }

  // Monthly summary & budget health
  message += `📊 *Kondisi Keuangan Bulan Ini:*\n`;
  message += `• Total Pengeluaran: *${formatIDR(totalMonthExpense)}*\n`;
  if (totalMonthlyBudget > 0) {
    const remaining = totalMonthlyBudget - totalMonthExpense;
    const percentage = Math.round((totalMonthExpense / totalMonthlyBudget) * 100);
    const statusIcon = percentage <= 70 ? '🟢' : percentage <= 90 ? '🟡' : '🔴';
    message += `• Kuota Anggaran: ${formatIDR(totalMonthlyBudget)}\n`;
    message += `• Sisa Budget: ${statusIcon} *${formatIDR(remaining)}* (${100 - percentage}% tersisa)\n`;
  }

  message += `\n💡 _Ada pengeluaran atau jajan yang belum sempat dicatat hari ini?_\nCukup ketik langsung pesan Anda (misal: \`kopi 25k jajan cash\`) atau kirim foto struk!`;

  const keyboard = new InlineKeyboard();
  if (env.APP_URL && !env.APP_URL.includes('localhost')) {
    keyboard.url('🌐 Buka Web Dashboard', env.APP_URL).row();
  }
  keyboard.text('📊 Rekap Lengkap', 'rekap:refresh');

  try {
    await bot.api.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    console.log(`[Daily Recap] Successfully sent 21:00 recap to chatId: ${chatId}`);
    return true;
  } catch (err) {
    console.error(`[Daily Recap] Failed to send recap to chatId ${chatId}:`, err);
    return false;
  }
}

export async function processDailyRecapBatch(bot: Bot) {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_chat_id, full_name')
      .not('telegram_chat_id', 'is', null);

    if (error) {
      console.error('[Daily Recap Batch] Error fetching profiles:', error);
      return { total: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const p of profiles || []) {
      if (!p.telegram_chat_id) continue;
      const success = await sendDailyRecapToUser(
        bot,
        p.id,
        p.telegram_chat_id,
        p.full_name || undefined
      );
      if (success) sent++;
      else failed++;
    }

    return { total: profiles?.length || 0, sent, failed };
  } catch (err) {
    console.error('[Daily Recap Batch] Execution error:', err);
    return { total: 0, sent: 0, failed: 0 };
  }
}
