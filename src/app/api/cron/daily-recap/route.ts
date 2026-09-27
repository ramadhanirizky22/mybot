import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram';
import { processDailyRecapBatch } from '@/modules/recap/daily-recap.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Cron] Executing Daily Evening Recap at 21:00 WIB...');
    const result = await processDailyRecapBatch(bot);

    return NextResponse.json({
      success: true,
      message: 'Daily evening recap processed successfully',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Cron Daily Recap Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
