import fs from 'fs';
import path from 'path';

// Pre-load .env.local if not already loaded
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Already loaded or unsupported
  }
}

async function start() {
  // Dynamically import bot AFTER env variables are guaranteed loaded
  const { bot } = await import('../src/lib/telegram');

  console.log('🤖 Menghubungkan ke Telegram Bot...');
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  const botInfo = await bot.api.getMe();
  console.log(`✅ Berhasil terhubung sebagai @${botInfo.username} (${botInfo.first_name})`);
  console.log('🚀 TeleSpend Telegram Bot berjalan dalam mode Polling...');
  console.log('👉 Silakan kirim pesan atau /start di Telegram ke: https://t.me/' + botInfo.username);

  bot.start();

  // Background Nag & Reminder Loop (runs every 30 seconds to evaluate 5-minute nag interval)
  const { attendanceService } = await import('../src/modules/attendance/attendance.service');
  console.log('⏰ Attendance Reminder Service diaktifkan (Jadwal: 23:00 WIB / jeda 5 menit nag loop)...');

  // Initial check after 3 seconds
  setTimeout(() => {
    attendanceService.checkAndSendReminders(bot).catch((err) => {
      console.error('[Attendance] Initial check error:', err);
    });
  }, 3000);

  // Periodic check every 30 seconds
  setInterval(() => {
    attendanceService.checkAndSendReminders(bot).catch((err) => {
      console.error('[Attendance] Interval check error:', err);
    });
  }, 30000);
}

start().catch((err) => {
  console.error('❌ Gagal menjalankan bot polling:', err);
});
