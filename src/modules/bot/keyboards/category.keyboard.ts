import { InlineKeyboard } from 'grammy';

export function createCategoryKeyboard(transactionId: string, isExpense: boolean = true) {
  const keyboard = new InlineKeyboard();

  // Toggle button to flip between income and expense
  const toggleText = isExpense ? '🔄 Ubah ke Pemasukan' : '🔄 Ubah ke Pengeluaran';
  const toggleAction = isExpense ? `type:${transactionId}:income` : `type:${transactionId}:expense`;

  keyboard.text(toggleText, toggleAction).row();

  if (isExpense) {
    keyboard
      .text('🍔 Makanan', `cat:${transactionId}:Makanan & Minuman`)
      .text('🚗 Transport', `cat:${transactionId}:Transportasi`)
      .row()
      .text('🛍️ Belanja', `cat:${transactionId}:Belanja`)
      .text('🧾 Tagihan', `cat:${transactionId}:Tagihan & Utilitas`)
      .row()
      .text('🎮 Hiburan', `cat:${transactionId}:Hiburan`)
      .text('💊 Kesehatan', `cat:${transactionId}:Kesehatan`)
      .row();
  } else {
    keyboard
      .text('💼 Gaji / Upah', `cat:${transactionId}:Gaji`)
      .text('💸 Transfer Masuk', `cat:${transactionId}:Transfer Masuk`)
      .row()
      .text('📈 Investasi', `cat:${transactionId}:Investasi & Tabungan`)
      .text('🎁 Pemasukan Lain', `cat:${transactionId}:Lainnya`)
      .row();
  }

  keyboard.text('❌ Batalkan / Undo', `undo:${transactionId}`);
  return keyboard;
}

export function createUndoKeyboard(transactionId: string) {
  return new InlineKeyboard().text('❌ Batalkan / Undo Transaksi', `undo:${transactionId}`);
}
