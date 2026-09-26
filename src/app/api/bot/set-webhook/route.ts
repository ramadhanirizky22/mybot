import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";
import { env } from "@/config/env";

export async function GET(req: NextRequest) {
  try {
    // Automatically detect current deployment domain or fallback to APP_URL
    const origin = req.nextUrl.origin;
    const webhookUrl = `${origin}/api/bot/webhook`;

    console.log(`Setting Telegram webhook to: ${webhookUrl}`);

    await bot.api.setWebhook(webhookUrl, {
      secret_token: env.TELEGRAM_SECRET_TOKEN,
      drop_pending_updates: true,
    });

    const webhookInfo = await bot.api.getWebhookInfo();

    return NextResponse.json({
      success: true,
      message: "✅ Webhook Telegram berhasil diaktifkan!",
      webhookUrl: webhookInfo.url,
      hasCustomCertificate: webhookInfo.has_custom_certificate,
      pendingUpdateCount: webhookInfo.pending_update_count,
    });
  } catch (error: any) {
    console.error("Gagal menyetel webhook:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Gagal menghubungkan webhook ke Telegram",
      },
      { status: 500 }
    );
  }
}
