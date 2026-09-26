import { Bot, InlineKeyboard } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export interface AttendanceRecord {
  userId: string;
  chatId: number;
  date: string; // YYYY-MM-DD
  status: 'PENDING' | 'CONFIRMED';
  confirmedAt?: string | null;
  lastNagAt?: string | null;
  nagCount: number;
  isTestMode?: boolean;
}

export interface AttendanceSetting {
  userId: string;
  chatId: number;
  deadlineTime: string; // e.g. "08:00"
  reminderTime: string; // e.g. "07:00" (H-1 hour)
  nagIntervalMinutes: number; // default 5
  isActive: boolean;
}

const DATA_FILE = path.resolve(process.cwd(), '.data/attendance.json');
const SETTINGS_FILE = path.resolve(process.cwd(), '.data/attendance_settings.json');

function getWibDate(): { dateStr: string; hours: number; minutes: number; now: Date } {
  // WIB is UTC+7
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const year = wib.getFullYear();
  const month = String(wib.getMonth() + 1).padStart(2, '0');
  const day = String(wib.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  return {
    dateStr,
    hours: wib.getHours(),
    minutes: wib.getMinutes(),
    now: wib,
  };
}

export function normalizeTimeString(input: string): string | null {
  if (!input) return null;
  const clean = input.trim().replace('.', ':');
  // Match "8", "08", "08:00", "8:30", "08:30"
  const match = clean.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateHMinus1(timeStr: string): string {
  const norm = normalizeTimeString(timeStr) || '08:00';
  const [hStr, mStr] = norm.split(':');
  let h = parseInt(hStr, 10) - 1;
  if (h < 0) h = 23;
  return `${String(h).padStart(2, '0')}:${mStr}`;
}

function loadAttendanceStore(): Record<string, AttendanceRecord> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveAttendanceStore(data: Record<string, AttendanceRecord>) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving attendance store:', err);
  }
}

function loadAttendanceSettings(): Record<string, AttendanceSetting> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveAttendanceSettings(data: Record<string, AttendanceSetting>) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving attendance settings:', err);
  }
}

export function createAttendanceKeyboard() {
  return new InlineKeyboard().text('✅ Saya Sudah Absen', 'absen:confirm');
}

export function createSchedulePresetsKeyboard() {
  return new InlineKeyboard()
    .text('🏢 Kantor 08:00 (Ingat 07:00)', 'absen:set:08:00:07:00')
    .row()
    .text('🏢 Kantor 08:30 (Ingat 07:30)', 'absen:set:08:30:07:30')
    .row()
    .text('🏢 Kantor 09:00 (Ingat 08:00)', 'absen:set:09:00:08:00')
    .row()
    .text('🌙 Malam 23:00 (Ingat 22:00)', 'absen:set:23:00:22:00')
    .row()
    .text('🧪 Uji Coba Pengingat Sekarang', 'absen:test');
}

export const attendanceService = {
  getUserSetting(userId: string, chatId: number = 0): AttendanceSetting {
    const settings = loadAttendanceSettings();
    const key = userId || String(chatId);
    if (!settings[key]) {
      settings[key] = {
        userId,
        chatId,
        deadlineTime: '08:00', // Default jam 8 pagi
        reminderTime: '07:00', // Default H-1 jam
        nagIntervalMinutes: 5,
        isActive: true,
      };
      saveAttendanceSettings(settings);
    }
    return settings[key];
  },

  updateUserSetting(
    userId: string,
    chatId: number,
    deadlineTime: string,
    reminderTime?: string
  ): AttendanceSetting {
    const normDeadline = normalizeTimeString(deadlineTime) || '08:00';
    const normReminder = reminderTime
      ? normalizeTimeString(reminderTime) || calculateHMinus1(normDeadline)
      : calculateHMinus1(normDeadline);

    const settings = loadAttendanceSettings();
    const key = userId || String(chatId);

    const updated: AttendanceSetting = {
      userId,
      chatId,
      deadlineTime: normDeadline,
      reminderTime: normReminder,
      nagIntervalMinutes: 5,
      isActive: true,
    };

    settings[key] = updated;
    saveAttendanceSettings(settings);

    // Async sync to Supabase table attendance_settings
    try {
      (supabaseAdmin as any)
        .from('attendance_settings')
        .upsert(
          {
            user_id: userId,
            deadline_time: normDeadline,
            night_reminder_time: normReminder,
            nag_interval_minutes: 5,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .then(() => {}, () => {});
    } catch {}

    return updated;
  },

  getTodayRecord(userId: string, chatId: number): AttendanceRecord {
    const { dateStr } = getWibDate();
    const key = `${userId}_${dateStr}`;
    const store = loadAttendanceStore();

    if (!store[key]) {
      store[key] = {
        userId,
        chatId,
        date: dateStr,
        status: 'PENDING',
        confirmedAt: null,
        lastNagAt: null,
        nagCount: 0,
      };
      saveAttendanceStore(store);
    }

    return store[key];
  },

  confirmAttendance(userIdOrChatId: string | number): AttendanceRecord | null {
    const { dateStr, now } = getWibDate();
    const store = loadAttendanceStore();

    let targetRecord: AttendanceRecord | null = null;
    let targetKey: string | null = null;

    // Search by key, userId, or chatId
    for (const [k, rec] of Object.entries(store)) {
      if (
        rec.userId === String(userIdOrChatId) ||
        rec.chatId === Number(userIdOrChatId) ||
        k.startsWith(`${userIdOrChatId}_`)
      ) {
        targetRecord = rec;
        targetKey = k;
        break;
      }
    }

    if (targetRecord && targetKey) {
      targetRecord.status = 'CONFIRMED';
      targetRecord.confirmedAt = now.toISOString();
      targetRecord.isTestMode = false;
      store[targetKey] = targetRecord;
      saveAttendanceStore(store);

      // Async sync to Supabase attendance_logs
      try {
        (supabaseAdmin as any)
          .from('attendance_logs')
          .upsert(
            {
              user_id: targetRecord.userId,
              date: targetRecord.date,
              status: 'CONFIRMED',
              confirmed_at: targetRecord.confirmedAt,
              nag_count: targetRecord.nagCount,
              last_nag_at: targetRecord.lastNagAt,
            },
            { onConflict: 'user_id,date' }
          )
          .then(() => {}, () => {});
      } catch {}

      return targetRecord;
    }

    // If no record was active today, mark confirmed so reminders never trigger
    const newKey = `${userIdOrChatId}_${dateStr}`;
    const newRecord: AttendanceRecord = {
      userId: String(userIdOrChatId),
      chatId: typeof userIdOrChatId === 'number' ? userIdOrChatId : 0,
      date: dateStr,
      status: 'CONFIRMED',
      confirmedAt: now.toISOString(),
      lastNagAt: null,
      nagCount: 0,
      isTestMode: false,
    };
    store[newKey] = newRecord;
    saveAttendanceStore(store);
    return newRecord;
  },

  triggerTestReminder(userId: string, chatId: number) {
    const { dateStr } = getWibDate();
    const key = `${userId}_${dateStr}`;
    const store = loadAttendanceStore();

    store[key] = {
      userId,
      chatId,
      date: dateStr,
      status: 'PENDING',
      confirmedAt: null,
      lastNagAt: null,
      nagCount: 0,
      isTestMode: true,
    };
    saveAttendanceStore(store);
    return store[key];
  },

  async checkAndSendReminders(bot: Bot) {
    const { dateStr, hours, minutes, now } = getWibDate();
    const store = loadAttendanceStore();

    // Load registered profiles from Supabase to ensure all users with telegram_chat_id are tracked
    try {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, telegram_chat_id, full_name')
        .not('telegram_chat_id', 'is', null);

      for (const p of profiles || []) {
        if (!p.telegram_chat_id) continue;
        const key = `${p.id}_${dateStr}`;
        if (!store[key]) {
          store[key] = {
            userId: p.id,
            chatId: p.telegram_chat_id,
            date: dateStr,
            status: 'PENDING',
            confirmedAt: null,
            lastNagAt: null,
            nagCount: 0,
          };
        }
      }
    } catch {
      // Local store handles fallback seamlessly
    }

    const NAG_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

    for (const [key, record] of Object.entries(store)) {
      if (record.status === 'CONFIRMED') {
        continue; // Absen sudah selesai, pengingat mati
      }

      // Get user schedule setting (default deadline 08:00, reminder 07:00)
      const setting = attendanceService.getUserSetting(record.userId, record.chatId);
      if (!setting.isActive) continue;

      const currentMinutes = hours * 60 + minutes;
      const [rH, rM] = setting.reminderTime.split(':').map(Number);
      const [dH, dM] = setting.deadlineTime.split(':').map(Number);
      const reminderMinutes = rH * 60 + rM;
      const deadlineMinutes = dH * 60 + dM;

      let isInWindow = false;
      if (reminderMinutes <= deadlineMinutes) {
        // Normal daytime schedule (e.g. 07:00 to 08:00 + 30 min buffer)
        isInWindow = currentMinutes >= reminderMinutes && currentMinutes <= deadlineMinutes + 30;
      } else {
        // Overnight schedule (e.g. 23:00 to 00:00 or 23:00 to 08:00)
        isInWindow = currentMinutes >= reminderMinutes || currentMinutes <= deadlineMinutes + 30;
      }

      const shouldTrigger = isInWindow || record.isTestMode;
      if (!shouldTrigger) {
        continue;
      }

      const nowMs = now.getTime();
      const lastNagMs = record.lastNagAt ? new Date(record.lastNagAt).getTime() : 0;
      const timeSinceLastNag = nowMs - lastNagMs;

      // Send initial or nag after 5 minutes
      if (lastNagMs === 0 || timeSinceLastNag >= NAG_INTERVAL_MS) {
        const nextNagCount = (record.nagCount || 0) + 1;
        
        let headerTitle = '';
        let urgencyText = '';

        if (nextNagCount === 1) {
          headerTitle = `⏰ *PENGINGAT AWAL ABSEN (Pukul ${setting.reminderTime} WIB)*`;
          urgencyText = `Batas jam masuk kantor / absensi: *${setting.deadlineTime} WIB* (Pengingat H-1 Jam).`;
        } else {
          headerTitle = `🔔 *PENGINGAT ABSEN KE-${nextNagCount} (Jeda 5 Menit)*`;
          urgencyText = `Batas jam masuk kantor: *${setting.deadlineTime} WIB*.\nAnda belum melakukan konfirmasi absensi. Bot akan terus mengingatkan setiap *5 menit*!`;
        }

        // Calculate remaining minutes to deadline
        let remainingMinutes = deadlineMinutes - currentMinutes;
        if (remainingMinutes < 0 && reminderMinutes > deadlineMinutes) {
          remainingMinutes += 1440;
        }
        if (remainingMinutes > 0 && remainingMinutes <= 30) {
          urgencyText += `\n\n⚠️ *PERHATIAN:* Sisa waktu hanya tinggal *${remainingMinutes} menit* lagi menuju jam ${setting.deadlineTime} WIB!`;
        }

        const message = `${headerTitle}
🚨 *PENGINGAT ABSENSI WAJIB*

Halo! Jangan lupa untuk melakukan absen sekarang sebelum batas waktu masuk berakhir.
${urgencyText}

🛑 *Cara Mematikan Pengingat:*
• Balas chat ini dengan: \`saya sudah absen\` (atau \`sudah absen\`)
• Atau tekan tombol konfirmasi di bawah:`;

        try {
          await bot.api.sendMessage(record.chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: createAttendanceKeyboard(),
          });

          record.lastNagAt = now.toISOString();
          record.nagCount = nextNagCount;
          saveAttendanceStore(store);
          console.log(`[Attendance] Sent reminder #${nextNagCount} to chatId: ${record.chatId} for deadline ${setting.deadlineTime}`);

          // Async sync log to Supabase
          try {
            (supabaseAdmin as any)
              .from('attendance_logs')
              .upsert(
                {
                  user_id: record.userId,
                  date: record.date,
                  status: 'PENDING',
                  nag_count: nextNagCount,
                  last_nag_at: record.lastNagAt,
                },
                { onConflict: 'user_id,date' }
              )
              .then(() => {}, () => {});
          } catch {}
        } catch (err) {
          console.error(`[Attendance] Failed to send reminder to chatId ${record.chatId}:`, err);
        }
      }
    }
  },
};
