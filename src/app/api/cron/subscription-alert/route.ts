import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bot } from "@/lib/telegram";
import { formatIDR } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    const currentDay = today.getDate(); // 1 - 31
    const tomorrowDay = new Date(today.setDate(today.getDate() + 1)).getDate();

    // Query active subscriptions that are due tomorrow or today
    const { data: subs, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, name, amount, billing_day, user_id")
      .eq("is_active", true)
      .in("billing_day", [currentDay, tomorrowDay]);

    if (error) {
      console.error("Cron fetch subscriptions error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let notifiedCount = 0;

    for (const sub of subs || []) {
      // Find user's telegram_chat_id
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", sub.user_id)
        .single();

      if (profile?.telegram_chat_id) {
        const isToday = sub.billing_day === currentDay;
        const timingText = isToday ? "HARI INI" : "BESOK";

        const alertMessage = `🔔 *Pengingat Tagihan Berlangganan!*

Tagihan untuk *${sub.name}* jatuh tempo *${timingText}* (tanggal ${sub.billing_day}).
💵 *Estimasi Biaya:* ${formatIDR(Number(sub.amount))}

Pastikan saldo atau dana di rekening/e-wallet Anda mencukupi untuk perpanjangan otomatis.`;

        try {
          await bot.api.sendMessage(profile.telegram_chat_id, alertMessage, {
            parse_mode: "Markdown",
          });
          notifiedCount++;
        } catch (botErr) {
          console.error(`Failed to send alert to chat_id ${profile.telegram_chat_id}:`, botErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: subs?.length || 0,
      notified: notifiedCount,
    });
  } catch (err) {
    console.error("Cron subscription-alert error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
