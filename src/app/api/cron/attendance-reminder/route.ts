import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram';
import { attendanceService } from '@/modules/attendance/attendance.service';

export async function GET(req: NextRequest) {
  try {
    await attendanceService.checkAndSendReminders(bot);

    return NextResponse.json({
      success: true,
      message: 'Attendance reminders check triggered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron attendance-reminder error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
