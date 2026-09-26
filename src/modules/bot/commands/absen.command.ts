import type { CommandContext, Context } from 'grammy';
import { getOrCreateProfileByChatId } from '../bot-profile.service';
import {
  attendanceService,
  createAttendanceKeyboard,
  createSchedulePresetsKeyboard,
  normalizeTimeString,
} from '@/modules/attendance/attendance.service';

export async function handleAbsenCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  if (!chatId) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) return;

  const record = attendanceService.getTodayRecord(profile.id, chatId);
  const setting = attendanceService.getUserSetting(profile.id, chatId);

  if (record.status === 'CONFIRMED') {
    const timeStr = record.confirmedAt
      ? new Date(record.confirmedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '';
    return ctx.reply(
      `📋 *STATUS ABSEN HARI INI:* ✅ *SUDAH ABSEN*

👤 *Nama:* ${profile.full_name || username}
📅 *Tanggal:* ${record.date}
🏢 *Batas Jam Masuk:* ${setting.deadlineTime} WIB
⏰ *Waktu Konfirmasi:* ${timeStr} WIB

_Pengingat absen 5 menitan telah dimatikan untuk hari ini._`,
      { parse_mode: 'Markdown' }
    );
  }

  return ctx.reply(
    `📋 *STATUS ABSEN HARI INI:* ⏳ *BELUM ABSEN*

👤 *Nama:* ${profile.full_name || username}
📅 *Tanggal:* ${record.date}
🏢 *Batas Jam Masuk Kantor:* *${setting.deadlineTime} WIB*
🔔 *Pengingat Awal (H-1 Jam):* *${setting.reminderTime} WIB*
🔄 *Jeda Pengingat:* Setiap *5 menit* sampai Anda konfirmasi sudah absen.

_Jika Anda sudah absen sekarang, silakan tekan tombol di bawah:_
_Gunakan perintah /setabsen jika ingin mengubah jam masuk kantor._`,
    {
      parse_mode: 'Markdown',
      reply_markup: createAttendanceKeyboard(),
    }
  );
}

export async function handleSetAbsenCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  if (!chatId) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) return;

  const rawArgs = ctx.match?.trim();

  // If arguments provided: e.g. "/setabsen 08:00" or "/setabsen 08:00 07:15"
  if (rawArgs) {
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    const deadlineStr = normalizeTimeString(parts[0]);
    const reminderStr = parts[1] ? normalizeTimeString(parts[1]) : undefined;

    if (!deadlineStr) {
      return ctx.reply(
        `⚠️ *Format jam tidak valid.*

💡 *Contoh cara mengatur jam masuk:*
• \`/setabsen 08:00\` — Masuk kantor jam 08:00 (diingatkan mulai 07:00 / H-1 jam)
• \`/setabsen 08:30\` — Masuk kantor jam 08:30 (diingatkan mulai 07:30)
• \`/setabsen 09:00 08:15\` — Masuk jam 09:00 (diingatkan khusus jam 08:15)

_Atau ketik \`/setabsen\` tanpa angka untuk memilih tombol cepat._`,
        { parse_mode: 'Markdown' }
      );
    }

    const updated = attendanceService.updateUserSetting(
      profile.id,
      chatId,
      deadlineStr,
      reminderStr || undefined
    );

    return ctx.reply(
      `✅ *Jadwal Pengingat Absen Berhasil Diatur!*

🏢 *Batas Jam Masuk Kantor:* *${updated.deadlineTime} WIB*
🔔 *Pengingat Awal (H-1 Jam):* *${updated.reminderTime} WIB*
🔄 *Jeda Notifikasi:* Setiap *5 menit* sampai dibalas 'saya sudah absen'

_Bot akan otomatis mulai mengirimkan pengingat pada jam ${updated.reminderTime} WIB setiap hari kerja._`,
      { parse_mode: 'Markdown' }
    );
  }

  // No arguments: show current settings with interactive presets
  const current = attendanceService.getUserSetting(profile.id, chatId);

  return ctx.reply(
    `⚙️ *PENGATURAN JAM PENGINGAT ABSEN*

👤 *Pengguna:* ${profile.full_name || username}
🏢 *Jam Masuk Kantor Saat Ini:* *${current.deadlineTime} WIB*
🔔 *Pengingat Awal (H-1 Jam):* *${current.reminderTime} WIB*
🔄 *Jeda Loop:* Setiap *5 menit*

💡 *Pilih jadwal cepat di bawah:*
_Atau ketik manual:_ \`/setabsen 08:00\``,
    {
      parse_mode: 'Markdown',
      reply_markup: createSchedulePresetsKeyboard(),
    }
  );
}

export async function handleTesAbsenCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  if (!chatId) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) return;

  // Activate test mode for attendance nag loop
  attendanceService.triggerTestReminder(profile.id, chatId);

  return ctx.reply(
    `🧪 *Mode Uji Coba Pengingat Absen Aktif!*

Bot akan mulai mengirimkan pengingat absen sekarang, dan akan mengingatkan ulang setiap *5 menit* jika Anda belum membalas atau menekan tombol konfirmasi.

_Silakan tunggu pengingat atau balas pesan ini dengan:_\n👉 \`saya sudah absen\``,
    {
      parse_mode: 'Markdown',
      reply_markup: createAttendanceKeyboard(),
    }
  );
}
