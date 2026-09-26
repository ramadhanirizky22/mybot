import Tesseract from 'tesseract.js';

export interface OcrReceiptResult {
  amount: number;
  merchant: string;
  isExpense: boolean;
  rawText: string;
}

/**
 * Clean unwanted status-bar text lines (e.g., "05.02 50 NC @D", "4G", "WIFI")
 */
function cleanStatusNoise(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;
  // Clock time at start like 05.02, 04.55, 12:30
  if (/^\d{1,2}[.:]\d{2}/.test(trimmed) && trimmed.length < 20) return false;
  // Battery / signal noise
  if (/^(\d{1,3}%\s*|NC\s*|@D\s*|4G\s*|LTE\s*|WIFI\s*|B\/s\s*)+$/i.test(trimmed)) return false;
  // UI buttons
  if (/^(edit|hapus|bagikan|selesai|kembali|beranda)$/i.test(trimmed)) return false;
  return true;
}

/**
 * Extracts merchant, transaction type (income vs expense), and total amount from OCR text string.
 */
export function parseReceiptText(text: string): { amount: number; merchant: string; isExpense: boolean } {
  let amount = 0;
  let merchant = '';

  const cleanText = text.replace(/\r/g, '');

  // 1. Detect Income vs Expense
  // Keywords indicating incoming funds / income:
  const isIncome = /(uang\s*masuk|detail\s*pemasukan|pemasukan|transfer\s*masuk|dana\s*masuk|diterima\s*dari|terima\s*transfer|kredit|\bcr\b)/i.test(
    cleanText
  );
  const isExpense = !isIncome;

  // 2. Extract Merchant / Item / Sender
  if (isIncome) {
    // E.g. "Transfer BRI - NBMB SRI MURDIAWATI TO RAMADHANI RIZKY S"
    const transferMatch = cleanText.match(
      /Transfer\s+([A-Za-z0-9\s\-]+?)(?=\n|\r|Jumlah|Total|Nominal|Rp|Tanggal|$)/i
    );
    if (transferMatch && transferMatch[0]) {
      merchant = transferMatch[0].trim();
    } else {
      const fromMatch = cleanText.match(/(?:Dari|Pengirim|Sumber\s*Dana)\s*[:\n]\s*([^\n\r]+)/i);
      if (fromMatch && fromMatch[1]) {
        merchant = `Transfer dari ${fromMatch[1].trim()}`;
      } else {
        merchant = 'Transfer Masuk';
      }
    }
  } else {
    // Expense: Look for store or merchant name
    const merchantMatch = cleanText.match(
      /(?:Nama\s*Merchant|Tujuan|Merchant|Penerima|Toko|Lokasi)\s*[:\n]\s*([^\n\r]+)/i
    );

    if (merchantMatch && merchantMatch[1]) {
      const candidate = merchantMatch[1].trim();
      // Ignore generic app labels
      if (!/^(qris|transfer|bca|bri|mandiri|dana|gopay|ovo)/i.test(candidate)) {
        merchant = candidate;
      }
    }

    if (!merchant) {
      const lines = cleanText
        .split('\n')
        .map((l) => l.trim())
        .filter(cleanStatusNoise)
        .filter((l) => !/^(transaksi|berhasil|struk|nota|pembayaran|tanggal|wib|total)/i.test(l));

      if (lines.length > 0) {
        merchant = lines[0];
      }
    }

    if (!merchant) {
      merchant = 'Struk Pembelian';
    }
  }

  // 3. Extract Total Amount
  // Matches:
  // "Jumlah Rp250.000"
  // "Total Transaksi Rp28.000"
  // "Total Bayar Rp 28.000"
  const totalKeywordsMatch = cleanText.match(
    /(?:Total\s*Transaksi|Total\s*Bayar|Total\s*Tagihan|Jumlah\s*Bayar|Jumlah|Total|Nominal)\s*[:\n]?\s*(?:Rp\.?\s*)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,10})/i
  );

  if (totalKeywordsMatch && totalKeywordsMatch[1]) {
    const rawNum = totalKeywordsMatch[1].replace(/[.,]/g, '');
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Fallback 1: Match any "RpXX.XXX" or "Rp XX.XXX"
  if (!amount) {
    const rpMatches = cleanText.matchAll(/Rp\.?\s*([0-9]{1,3}(?:[.,][0-9]{3})+)/gi);
    for (const m of rpMatches) {
      const val = parseInt(m[1].replace(/[.,]/g, ''), 10);
      if (val > amount) {
        amount = val;
      }
    }
  }

  // Fallback 2: Standalone currency numbers
  if (!amount) {
    const numMatches = cleanText.matchAll(/\b([0-9]{1,3}(?:[.,][0-9]{3})+)\b/g);
    for (const m of numMatches) {
      const val = parseInt(m[1].replace(/[.,]/g, ''), 10);
      if (val >= 1000 && val < 50000000 && val > amount) {
        amount = val;
      }
    }
  }

  return { amount, merchant, isExpense };
}

/**
 * Downloads image buffer from Telegram and runs Tesseract OCR.
 */
export async function performReceiptOcr(fileUrl: string): Promise<OcrReceiptResult> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from Telegram: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Run Tesseract OCR
    const ocrResult = await Tesseract.recognize(imageBuffer, 'eng+ind', {
      logger: () => {},
    });

    const rawText = ocrResult.data.text || '';
    const { amount, merchant, isExpense } = parseReceiptText(rawText);

    return {
      amount,
      merchant,
      isExpense,
      rawText,
    };
  } catch (error) {
    console.error('OCR Processing error:', error);
    return {
      amount: 0,
      merchant: 'Struk Belanja',
      isExpense: true,
      rawText: '',
    };
  }
}
