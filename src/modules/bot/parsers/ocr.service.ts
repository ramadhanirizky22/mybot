import Tesseract from 'tesseract.js';
import { env } from '@/config/env';

export interface OcrReceiptResult {
  amount: number;
  merchant: string;
  isExpense: boolean;
  rawText: string;
  suggestedCategory?: string;
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
 * Recognizes receipt/transfer slip using Google Gemini Vision (ultra-fast, accurate, understands Indonesian receipts).
 */
async function performGeminiOcr(imageBuffer: Buffer): Promise<OcrReceiptResult | null> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const base64Data = imageBuffer.toString('base64');
    // Use gemini-2.5-flash or gemini-1.5-flash
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Kamu adalah sistem OCR AI pencatat keuangan Indonesia (seperti QRIS, transfer bank BRI/BCA/Mandiri/BNI/Dana/GoPay/OVO/ShopeePay, dan struk belanja).
Analisis gambar struk / bukti transfer ini dan ekstrak data berikut dalam format JSON MURNI (tanpa markdown backtick):
{
  "amount": <number bulat tanpa titik/koma/Rp, contoh: 28000. Jika tidak ada nominal isi 0>,
  "merchant": "<nama toko / nama merchant QRIS / tujuan transfer / sumber dana jika transfer masuk>",
  "isExpense": <boolean, true jika transaksi pembayaran/belanja/uang keluar/QRIS Bayar, false jika transfer masuk/diterima dari/top up>,
  "suggestedCategory": "<string: Makanan & Minuman | Belanja | Transportasi | Tagihan & Utilitas | Investasi & Tabungan | Lainnya>"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Gemini OCR] HTTP error ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText);
    const amount = Number(parsed.amount) || 0;
    const merchant = String(parsed.merchant || '').trim();
    const isExpense = parsed.isExpense !== false;

    console.log(`[Gemini OCR] Successfully recognized: ${merchant} - Rp${amount}`);

    return {
      amount,
      merchant: merchant || (isExpense ? 'Struk Pembelian' : 'Transfer Masuk'),
      isExpense,
      rawText: candidateText,
      suggestedCategory: parsed.suggestedCategory,
    };
  } catch (error) {
    console.warn('[Gemini OCR] Failed, falling back to local OCR:', error);
    return null;
  }
}

/**
 * Runs local Tesseract OCR with safe serverless configuration (cache in /tmp, single language 'eng').
 */
async function performTesseractOcr(imageBuffer: Buffer): Promise<OcrReceiptResult> {
  let worker: any = null;
  try {
    console.log('[Tesseract OCR] Initializing worker in /tmp...');
    worker = await Tesseract.createWorker('eng', 1, {
      cachePath: '/tmp',
      logger: () => {},
    });

    // Run recognition with 25-second safeguard timeout
    const ret = await Promise.race([
      worker.recognize(imageBuffer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tesseract OCR timeout (25s exceeded)')), 25000)
      ),
    ]);

    const rawText = ret?.data?.text || '';
    const { amount, merchant, isExpense } = parseReceiptText(rawText);

    return {
      amount,
      merchant,
      isExpense,
      rawText,
    };
  } catch (error) {
    console.error('[Tesseract OCR] Processing error:', error);
    return {
      amount: 0,
      merchant: 'Struk Belanja',
      isExpense: true,
      rawText: '',
    };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}

/**
 * Runs free OCR.Space API as a fast cloud fallback (takes ~1-2 seconds, zero serverless CPU overhead).
 */
async function performOcrSpace(imageBuffer: Buffer): Promise<OcrReceiptResult | null> {
  const apiKey = env.OCR_SPACE_API_KEY || 'K87899142388957';

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
    formData.append('file', blob, 'receipt.jpg');
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.ParsedResults?.[0]?.ParsedText || '';
    if (!rawText || rawText.trim().length === 0) return null;

    console.log('[OCR.Space] Extracted text length:', rawText.length);
    const { amount, merchant, isExpense } = parseReceiptText(rawText);
    if (!amount || amount <= 0) return null;

    return {
      amount,
      merchant,
      isExpense,
      rawText,
    };
  } catch (err) {
    console.warn('[OCR.Space] Failed or timed out:', err);
    return null;
  }
}

/**
 * Downloads image buffer from Telegram and extracts receipt details.
 * Prioritizes Gemini Vision AI (if configured) for 1-2s response & 99% accuracy,
 * followed by OCR.Space cloud API, and finally local Tesseract OCR.
 */
export async function performReceiptOcr(fileUrl: string): Promise<OcrReceiptResult> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from Telegram: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 1. Try Gemini Vision first if GEMINI_API_KEY is configured (Free & Best)
    if (env.GEMINI_API_KEY) {
      const geminiResult = await performGeminiOcr(imageBuffer);
      if (geminiResult && geminiResult.amount > 0) {
        return geminiResult;
      }
    }

    // 2. Try fast cloud OCR (OCR.Space - Free, fast 1-2s, no serverless CPU bottleneck)
    const ocrSpaceResult = await performOcrSpace(imageBuffer);
    if (ocrSpaceResult && ocrSpaceResult.amount > 0) {
      return ocrSpaceResult;
    }

    // 3. Fallback to local Tesseract OCR
    return await performTesseractOcr(imageBuffer);
  } catch (error) {
    console.error('Receipt OCR handler error:', error);
    return {
      amount: 0,
      merchant: 'Struk Belanja',
      isExpense: true,
      rawText: '',
    };
  }
}
