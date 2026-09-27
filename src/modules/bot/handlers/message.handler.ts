import type { Context } from 'grammy';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateProfileByChatId } from '../bot-profile.service';
import { parseTransactionText } from '../parsers/transaction.parser';
import { performReceiptOcr } from '../parsers/ocr.service';
import { createCategoryKeyboard, createUndoKeyboard } from '../keyboards/category.keyboard';
import { attendanceService, createAttendanceKeyboard } from '@/modules/attendance/attendance.service';
import { formatIDR } from '@/lib/utils';
import { env } from '@/config/env';

export async function handleTextMessage(ctx: Context) {
  const text = ctx.message?.text?.trim();
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';

  if (!text || !chatId || text.startsWith('/')) return;

  // 0. Check if user is confirming attendance (e.g., "saya sudah absen", "sudah absen", "udah absen")
  if (/(saya\s+|sy\s+)?(sudah|udah|telah|dah)\s*absen/i.test(text)) {
    const profile = await getOrCreateProfileByChatId(chatId, username);
    attendanceService.confirmAttendance(profile?.id || chatId);

    const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    });

    return ctx.reply(
      `🎉 *Konfirmasi Diterima! Status: SUDAH ABSEN*\n\n` +
      `✅ Waktu konfirmasi: *${nowTimeStr} WIB*\n` +
      `🛑 *Pengingat 5 menitan otomatis DIMATIKAN.*\n\n` +
      `Terima kasih telah absen tepat waktu! Pengingat tidak akan mengganggu Anda lagi hari ini. 💤`,
      { parse_mode: 'Markdown' }
    );
  }

  // 1. Parse text
  const parsed = parseTransactionText(text);

  if (!parsed) {
    return ctx.reply(
      `🤔 TeleSpend belum dapat mengenali format pesan ini.

💡 *Contoh format cepat:*
• \`kopi 25k jajan cash\`
• \`bensin 50rb gopay\`
• \`gaji 5jt transfer\`
• Atau kalimat santai: \`tadi beli bensin 50 ribu pake gopay\``,
      { parse_mode: 'Markdown' }
    );
  }

  // 2. Resolve or automatically create user profile in Supabase
  const profile = await getOrCreateProfileByChatId(chatId, username);

  if (!profile) {
    return ctx.reply('⚠️ Terjadi kendala saat menghubungkan akun Anda ke database. Silakan coba kembali.');
  }

  // 3. Resolve category
  let categoryId: string | null = null;
  const { data: category } = await supabaseAdmin
    .from('categories')
    .select('id')
    .ilike('name', `%${parsed.categoryName}%`)
    .limit(1)
    .maybeSingle();

  if (category) {
    categoryId = category.id;
  } else {
    const { data: fallbackCat } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', 'Lainnya')
      .maybeSingle();
    categoryId = fallbackCat?.id || null;
  }

  // 4. Resolve wallet
  let walletId: string | null = null;
  if (parsed.walletName) {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', profile.id)
      .ilike('name', `%${parsed.walletName}%`)
      .limit(1)
      .maybeSingle();

    if (wallet) walletId = wallet.id;
  }

  if (!walletId) {
    const { data: defaultWallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (defaultWallet) {
      walletId = defaultWallet.id;
    } else {
      const { data: newWallet } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: profile.id,
          name: parsed.walletName || 'Cash',
          type: 'CASH',
          balance: 0,
        })
        .select('id')
        .single();
      walletId = newWallet?.id || null;
    }
  }

  // 5. Insert transaction into Supabase
  const { data: newTx, error: insertError } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: profile.id,
      item: parsed.item,
      amount: parsed.amount,
      category_id: categoryId,
      wallet_id: walletId,
      is_expense: parsed.isExpense,
      raw_text: parsed.rawText,
      date: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !newTx) {
    console.error('Insert transaction error:', insertError);
    return ctx.reply('⚠️ Gagal mencatat transaksi ke database. Silakan coba kembali.');
  }

  const categoryDisplay = parsed.categoryName || 'Lainnya';
  const typeText = parsed.isExpense ? 'Pengeluaran' : 'Pemasukan';
  const typeEmoji = parsed.isExpense ? '💸' : '💰';

  return ctx.reply(
    `✅ *${typeEmoji} ${typeText} Berhasil Dicatat!*

📌 *Item:* ${parsed.item}
💵 *Nominal:* ${formatIDR(parsed.amount)}
🏷️ *Kategori:* ${categoryDisplay}
👛 *Dompet:* ${parsed.walletName || 'Cash'}

_Ubah kategori atau batalkan transaksi di bawah jika salah input:_`,
    {
      parse_mode: 'Markdown',
      reply_markup: createCategoryKeyboard(newTx.id, parsed.isExpense),
    }
  );
}

export async function handlePhotoMessage(ctx: Context) {
  const chatId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
  const photos = ctx.message?.photo;

  if (!chatId || !photos || photos.length === 0) return;

  const profile = await getOrCreateProfileByChatId(chatId, username);
  if (!profile) return;

  const statusMsg = await ctx.reply('🔍 *Menganalisis foto struk/transfer dengan OCR...*', {
    parse_mode: 'Markdown',
  });

  try {
    // 1. Get highest resolution photo from Telegram
    const highestRes = photos[photos.length - 1];
    const file = await ctx.api.getFile(highestRes.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // 2. Perform OCR text extraction
    const ocr = await performReceiptOcr(fileUrl);

    // 3. Caption priority if user explicitly typed nominal/intent
    const caption = ctx.message?.caption?.trim();
    let finalAmount = ocr.amount;
    let finalItem = ocr.merchant || (ocr.isExpense ? 'Struk Belanja' : 'Transfer Masuk');
    let finalIsExpense = ocr.isExpense;

    if (caption) {
      const parsedCaption = parseTransactionText(caption);
      if (parsedCaption) {
        finalAmount = parsedCaption.amount || finalAmount;
        finalItem = parsedCaption.item || finalItem;
        finalIsExpense = parsedCaption.isExpense;
      }
    }

    if (!finalAmount || finalAmount <= 0) {
      await ctx.api.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      return ctx.reply(
        `⚠️ *Tidak berhasil mendeteksi nominal transaksi dari foto ini.*\n\n` +
        (ocr.merchant ? `📌 *Terdeteksi:* ${ocr.merchant}\n\n` : '') +
        `💡 _Tips:_ Pastikan foto struk terang, atau ketik langsung nominalnya:\n` +
        `Contoh: \`28000 MP-TOKO SULTHAN\` atau kirim foto disertai caption \`28000\`.`,
        { parse_mode: 'Markdown' }
      );
    }

    // 4. Determine category
    let catSearch = ocr.suggestedCategory || 'Lainnya';
    if (!ocr.suggestedCategory) {
      if (!finalIsExpense) {
        catSearch = 'Investasi & Tabungan';
      } else if (/kopi|cafe|coffee|resto|makan|food|mie|bakso|burger|tea/i.test(finalItem)) {
        catSearch = 'Makanan & Minuman';
      } else if (/spbu|pertamina|shell|gojek|grab|taxi|bensin/i.test(finalItem)) {
        catSearch = 'Transportasi';
      } else if (/pln|listrik|pdam|wifi|indihome|bpjs|tagihan/i.test(finalItem)) {
        catSearch = 'Tagihan & Utilitas';
      } else if (/toko|mart|indomaret|alfamart|supermarket/i.test(finalItem)) {
        catSearch = 'Belanja';
      }
    }

    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .ilike('name', `%${catSearch}%`)
      .limit(1)
      .maybeSingle();

    // 5. Insert transaction into Supabase
    const { data: newTx } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: profile.id,
        item: finalItem,
        amount: finalAmount,
        category_id: cat?.id || null,
        is_expense: finalIsExpense,
        raw_text: `[OCR Receipt] ${finalItem} - ${formatIDR(finalAmount)}`,
        date: new Date().toISOString(),
      })
      .select('id')
      .single();

    // Delete loading message
    await ctx.api.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    const typeTitle = finalIsExpense ? '💸 Struk Pengeluaran' : '💰 Bukti Pemasukan / Uang Masuk';
    const typeLabel = finalIsExpense ? 'Pengeluaran' : 'Pemasukan';

    return ctx.reply(
      `🧾 *${typeTitle} Terdeteksi!*

📌 *Keterangan:* ${finalItem}
💵 *Nominal:* ${formatIDR(finalAmount)}
🏷️ *Jenis:* *${typeLabel}*
📂 *Kategori:* ${cat?.name || 'Lainnya'}

_Gunakan tombol di bawah untuk ubah jenis, ganti kategori, atau batalkan:_`,
      {
        parse_mode: 'Markdown',
        reply_markup: newTx ? createCategoryKeyboard(newTx.id, finalIsExpense) : undefined,
      }
    );
  } catch (err: any) {
    console.error('Error handling receipt photo:', err);
    await ctx.api.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    return ctx.reply(
      `⚠️ *Terjadi kendala saat membaca struk.*\n\n💡 _Tips:_ Silakan ketik langsung secara manual, contoh: \`28000 MP-TOKO SULTHAN\``,
      { parse_mode: 'Markdown' }
    );
  }
}

export async function handleCallbackQuery(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // Handle Attendance confirmation: absen:confirm
  if (data === 'absen:confirm') {
    const chatId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
    if (!chatId) return;

    const profile = await getOrCreateProfileByChatId(chatId, username);
    attendanceService.confirmAttendance(profile?.id || chatId);

    await ctx.answerCallbackQuery({ text: '✅ Absen berhasil dikonfirmasi!' });

    const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    });

    await ctx.editMessageText(
      `🎉 *Absen Berhasil Dikonfirmasi!*\n\n` +
      `👤 *User:* ${profile?.full_name || username}\n` +
      `⏰ *Waktu Konfirmasi:* ${nowTimeStr} WIB\n` +
      `🛑 *Pengingat 5 menitan telah dimatikan.*\n\n` +
      `_Status: Absensi hari ini sudah tercatat. Pengingat tidak akan dikirimkan lagi._ 💤`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Handle Setting schedule preset: absen:set:<deadlineH>:<deadlineM>:<reminderH>:<reminderM>
  if (data.startsWith('absen:set:')) {
    const parts = data.split(':');
    const deadline = `${parts[2]}:${parts[3]}`;
    const reminder = `${parts[4]}:${parts[5]}`;
    const chatId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
    if (!chatId) return;

    const profile = await getOrCreateProfileByChatId(chatId, username);
    if (!profile) return;

    const updated = attendanceService.updateUserSetting(profile.id, chatId, deadline, reminder);

    await ctx.answerCallbackQuery({ text: `✅ Jadwal diatur: Masuk ${updated.deadlineTime}` });

    await ctx.editMessageText(
      `✅ *Jadwal Pengingat Absen Berhasil Diatur!*\n\n` +
      `🏢 *Batas Jam Masuk Kantor:* *${updated.deadlineTime} WIB*\n` +
      `🔔 *Pengingat Awal (H-1 Jam):* *${updated.reminderTime} WIB*\n` +
      `🔄 *Jeda Notifikasi:* Setiap *5 menit* sampai Anda konfirmasi sudah absen.\n\n` +
      `_Bot akan aktif mengingatkan Anda pada jam ${updated.reminderTime} WIB._`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Handle test trigger button: absen:test
  if (data === 'absen:test') {
    const chatId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
    if (!chatId) return;

    const profile = await getOrCreateProfileByChatId(chatId, username);
    if (!profile) return;

    attendanceService.triggerTestReminder(profile.id, chatId);

    await ctx.answerCallbackQuery({ text: '🧪 Uji coba pengingat aktif!' });

    await ctx.editMessageText(
      `🧪 *Mode Uji Coba Pengingat Absen Aktif!*\n\n` +
      `Bot sedang menjalankan simulasi pengingat.\n` +
      `Bot akan mengingatkan Anda setiap *5 menit* sampai Anda konfirmasi sudah absen.\n\n` +
      `_Silakan balas dengan pesan:_\n👉 \`saya sudah absen\``,
      {
        parse_mode: 'Markdown',
        reply_markup: createAttendanceKeyboard(),
      }
    );
    return;
  }

  // Handle Rekap refresh button: rekap:refresh
  if (data === 'rekap:refresh') {
    const chatId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || 'Pengguna';
    if (!chatId) return;

    await ctx.answerCallbackQuery({ text: 'Memperbarui rekap...' });
    const profile = await getOrCreateProfileByChatId(chatId, username);
    if (profile) {
      const { sendDailyRecapToUser } = await import('@/modules/recap/daily-recap.service');
      await sendDailyRecapToUser(ctx, profile.id, chatId, profile.full_name || username);
    }
    return;
  }

  // Handle Undo: undo:<txId>
  if (data.startsWith('undo:')) {
    const txId = data.replace('undo:', '');
    await supabaseAdmin.from('transactions').delete().eq('id', txId);

    await ctx.answerCallbackQuery({ text: 'Transaksi berhasil dibatalkan.' });
    await ctx.editMessageText('❌ Transaksi ini telah dibatalkan dan dihapus.');
    return;
  }

  // Handle Toggle Income / Expense Type: type:<txId>:<targetType>
  if (data.startsWith('type:')) {
    const parts = data.split(':');
    const txId = parts[1];
    const targetType = parts[2];
    const isExpense = targetType === 'expense';

    await supabaseAdmin
      .from('transactions')
      .update({ is_expense: isExpense })
      .eq('id', txId);

    await ctx.answerCallbackQuery({
      text: `Jenis transaksi diubah menjadi: ${isExpense ? 'Pengeluaran' : 'Pemasukan'}`,
    });

    await ctx.editMessageReplyMarkup({
      reply_markup: createCategoryKeyboard(txId, isExpense),
    });
    return;
  }

  // Handle Category selection: cat:<txId>:<categoryName>
  if (data.startsWith('cat:')) {
    const parts = data.split(':');
    const txId = parts[1];
    const categoryName = parts[2];

    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id')
      .ilike('name', `%${categoryName}%`)
      .limit(1)
      .maybeSingle();

    if (category) {
      await supabaseAdmin
        .from('transactions')
        .update({ category_id: category.id })
        .eq('id', txId);

      await ctx.answerCallbackQuery({ text: `Kategori diubah: ${categoryName}` });
    }
  }
}
