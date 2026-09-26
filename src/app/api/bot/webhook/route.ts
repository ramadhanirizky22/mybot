import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";
import { env } from "@/config/env";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token") || "";

    // Timing-safe secret verification to prevent timing attacks
    const isLengthMatch = secretHeader.length === env.TELEGRAM_SECRET_TOKEN.length;
    const isValidSecret =
      isLengthMatch &&
      crypto.timingSafeEqual(
        Buffer.from(secretHeader),
        Buffer.from(env.TELEGRAM_SECRET_TOKEN)
      );

    if (!isValidSecret) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const update = await req.json();
    
    // Process update asynchronously to maintain response time budget < 1500ms
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[Telegram Webhook Error]:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "TeleSpend Telegram Webhook",
    timestamp: new Date().toISOString(),
  });
}
