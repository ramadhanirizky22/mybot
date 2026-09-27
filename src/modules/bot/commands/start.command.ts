import type { CommandContext, Context } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateProfileByChatId } from '../bot-profile.service';

export async function handleStartCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';

  if (!chatId) {
    return ctx.reply('⚠️ Tidak dapat mendeteksi informasi Telegram Anda.');
  }

  const token = ctx.match?.trim();

  // If a binding token was passed: /start <token>
  if (token) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, telegram_chat_id')
      .ilike('binding_token', token)
      .maybeSingle();

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          binding_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      return ctx.reply(
        `🎉 *Selamat datang di TeleSpend, ${profile.full_name || username}!*
Akun Telegram Anda berhasil ditautkan ke akun Web TeleSpend.

💡 *Cara Mencatat Pengeluaran:*
Cukup ketik pesan singkat, contoh:
• \`kopi 25k jajan cash\`
• \`bensin 50rb gopay\`
• \`makan siang 35.000\`
• Kirim foto nota/struk belanja untuk deteksi otomatis!

📱 *Daftar Perintah:*
• /rekap — Rekap pengeluaran hari ini, minggu ini, & bulan ini
• /tesrekap — Simulasi rekap malam otomatis (21:00 WIB)
• /budget — Pantau kuota anggaran kategori
• /split [nominal] [orang] [ket] — Hitung patungan / split bill
• /absen — Cek status absensi harian & pengingat
• /setabsen — Atur jam masuk kantor (default 08:00)
• /tesabsen — Uji coba loop pengingat absen 5 menitan
• /undo — Batalkan transaksi terakhir`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  // Auto-link or find profile for this chatId
  const profile = await getOrCreateProfileByChatId(chatId, username);

  return ctx.reply(
    `🎉 *Selamat datang di TeleSpend, ${profile?.full_name || username}!*
Akun Anda telah aktif dan terhubung ke database TeleSpend.

💡 *Mulai Mencatat Pengeluaran:*
Ketik langsung pesan pengeluaran Anda, contoh:
• \`kopi 25k jajan cash\`
• \`bensin 50rb gopay\`
• \`makan siang 35.000\`
• Kirim foto nota/struk belanja untuk OCR otomatis!

📱 *Daftar Perintah:*
• /rekap — Rekap pengeluaran hari ini, minggu ini, & bulan ini
• /tesrekap — Simulasi rekap malam otomatis (21:00 WIB)
• /budget — Pantau kuota anggaran kategori
• /split [nominal] [orang] [ket] — Hitung patungan / split bill
• /absen — Cek status absensi harian & pengingat
• /setabsen — Atur jam masuk kantor (default 08:00)
• /tesabsen — Uji coba loop pengingat absen 5 menitan
• /undo — Batalkan transaksi terakhir`,
    { parse_mode: 'Markdown' }
  );
}
