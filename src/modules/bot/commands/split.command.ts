import type { CommandContext, Context } from 'grammy';
import { parseNominal } from '../parsers/transaction.parser';
import { formatIDR } from '@/lib/utils';

export async function handleSplitCommand(ctx: CommandContext<Context>) {
  const text = ctx.match?.trim();

  if (!text) {
    return ctx.reply(
      `💸 *Format Penggunaan Split Bill:*
\`/split [nominal] [jumlah_orang] [keterangan]\`

*Contoh:*
• \`/split 150k 3 Makan Malam\`
• \`/split 60000 2 Kopi Sore\`
• \`/split 1.2jt 4 Sewa Villa\``,
      { parse_mode: 'Markdown' }
    );
  }

  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    return ctx.reply('⚠️ Format salah. Minimal masukkan nominal dan jumlah orang. Contoh: `/split 120k 4 Pizza`', {
      parse_mode: 'Markdown',
    });
  }

  const nominalStr = parts[0];
  const peopleStr = parts[1];
  const description = parts.slice(2).join(' ') || 'Patungan';

  const totalAmount = parseNominal(nominalStr);
  const peopleCount = parseInt(peopleStr, 10);

  if (!totalAmount || totalAmount <= 0) {
    return ctx.reply('⚠️ Nominal tidak valid. Contoh nominal: `150k`, `200rb`, `50000`.', { parse_mode: 'Markdown' });
  }

  if (isNaN(peopleCount) || peopleCount <= 1) {
    return ctx.reply('⚠️ Jumlah orang harus berupa angka dan minimal 2 orang.');
  }

  const perPerson = Math.ceil(totalAmount / peopleCount);

  return ctx.reply(
    `🧾 *TAGIHAN SPLIT BILL*
📌 *Acara/Item:* ${description}
💰 *Total Tagihan:* ${formatIDR(totalAmount)}
👥 *Jumlah Orang:* ${peopleCount} orang

───────────────────
👉 *Per Orang Bayar:*
*${formatIDR(perPerson)}*
───────────────────

_Pesan ini siap di-forward ke grup WhatsApp atau Telegram._`,
    { parse_mode: 'Markdown' }
  );
}
