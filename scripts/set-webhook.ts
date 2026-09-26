import fs from 'fs';
import path from 'path';

// Pre-load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {}
}

async function run() {
  const { bot } = await import('../src/lib/telegram');
  const { env } = await import('../src/config/env');

  const appUrl = process.argv[2] || env.APP_URL;

  if (!appUrl || appUrl.includes('localhost')) {
    console.error('❌ Error: Masukkan domain production HTTPS Anda!');
    console.log('👉 Contoh: npm run bot:set-webhook https://tele-spend.vercel.app');
    process.exit(1);
  }

  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/bot/webhook`;
  console.log(`🤖 Mendaftarkan Webhook ke Telegram: ${webhookUrl}`);

  await bot.api.setWebhook(webhookUrl, {
    secret_token: env.TELEGRAM_SECRET_TOKEN,
    drop_pending_updates: true,
  });

  const info = await bot.api.getWebhookInfo();
  console.log('✅ Webhook Berhasil Diaktifkan!');
  console.log(`📌 Webhook URL Aktif: ${info.url}`);
  console.log('🚀 Bot Anda sekarang otomatis aktif 24/7 di cloud!');
}

run().catch((err) => {
  console.error('❌ Gagal mengaktifkan webhook:', err);
  process.exit(1);
});
