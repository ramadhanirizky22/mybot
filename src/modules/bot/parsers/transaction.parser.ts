export interface ParsedTransaction {
  item: string;
  amount: number;
  categoryName: string;
  walletName?: string;
  isExpense: boolean;
  rawText: string;
}

/**
 * Parses shorthand or formatted nominal string into numeric amount.
 * Examples:
 *   "25k" -> 25000
 *   "50rb" -> 50000
 *   "50 ribu" -> 50000
 *   "1.5jt" -> 1500000
 *   "1.5 juta" -> 1500000
 *   "35.000" -> 35000
 *   "150000" -> 150000
 */
export function parseNominal(str: string): number | null {
  const cleaned = str.trim().toLowerCase().replace(/^(rp\.?|idr)\s*/i, '');

  if (/^[0-9]+(\.[0-9]+)?\s*(jt|juta)$/i.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/(jt|juta)/g, '').trim());
    return isNaN(num) ? null : Math.round(num * 1000000);
  }

  if (/^[0-9]+(\.[0-9]+)?\s*(k|rb|ribu)$/i.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/(k|rb|ribu)/g, '').trim());
    return isNaN(num) ? null : Math.round(num * 1000);
  }

  // Handle dot or comma thousands separator (e.g. 25.000 or 25,000)
  const normalized = cleaned.replace(/[.,]/g, '');
  const num = parseFloat(normalized);
  return isNaN(num) || num <= 0 ? null : num;
}

const WALLET_KEYWORDS = [
  'cash',
  'tunai',
  'gopay',
  'ovo',
  'dana',
  'shopeepay',
  'spay',
  'bca',
  'mandiri',
  'bri',
  'bni',
  'jago',
  'jenius',
  'seabank',
];

/**
 * Main transaction text parser supporting standard commands and natural conversational language.
 */
export function parseTransactionText(rawText: string): ParsedTransaction | null {
  const clean = rawText.trim();
  if (!clean || clean.startsWith('/')) return null;

  // Check for income indicators
  const isIncome = /^(dapat|terima|gaji|income|masuk|bonus|transfer masuk)\b/i.test(clean);
  const isExpense = !isIncome;

  let textToParse = clean;

  // 1. Detect and extract wallet
  let detectedWallet: string | undefined = undefined;

  // Pattern with preposition: pake/pakai/via/dari/di [wallet]
  const prepWalletMatch = textToParse.match(/\b(?:pake|pakai|via|dari|di)\s+([a-zA-Z0-9_\-]+)\b/i);
  if (prepWalletMatch) {
    detectedWallet = prepWalletMatch[1];
    textToParse = textToParse.replace(prepWalletMatch[0], ' ').trim();
  } else {
    // Check if the last word matches known wallets
    const tokens = textToParse.split(/\s+/);
    const lastToken = tokens[tokens.length - 1]?.toLowerCase();
    if (tokens.length >= 3 && WALLET_KEYWORDS.includes(lastToken)) {
      detectedWallet = tokens.pop();
      textToParse = tokens.join(' ').trim();
    }
  }

  // 2. Normalize spaced nominals like "50 ribu" -> "50rb", "1.5 juta" -> "1.5jt"
  textToParse = textToParse
    .replace(/(\d+(?:\.\d+)?)\s+(ribu|rb)/gi, '$1rb')
    .replace(/(\d+(?:\.\d+)?)\s+(juta|jt)/gi, '$1jt');

  // 3. Find nominal token in the remaining text
  const words = textToParse.split(/\s+/);
  if (words.length < 2) return null;

  let nominalIdx = -1;
  let detectedAmount: number | null = null;

  for (let i = 0; i < words.length; i++) {
    const amount = parseNominal(words[i]);
    if (amount !== null && amount > 0) {
      nominalIdx = i;
      detectedAmount = amount;
      break;
    }
  }

  if (nominalIdx === -1 || detectedAmount === null) {
    return null;
  }

  // 4. Extract item
  const itemParts = words.slice(0, nominalIdx);
  if (itemParts.length === 0) return null;

  let item = itemParts.join(' ').replace(/^(tadi|kemarin)\s+/i, '').trim();

  // If item starts with generic verbs like beli / bayar followed by an item name
  if (/^(beli|bayar|pesan)\s+/i.test(item) && item.split(/\s+/).length > 1) {
    item = item.replace(/^(beli|bayar|pesan)\s+/i, '').trim();
  }

  if (!item) return null;

  // 5. Extract category
  const restAfterNominal = words.slice(nominalIdx + 1);
  const categoryName = restAfterNominal.join(' ').trim() || 'Lainnya';

  return {
    item: capitalize(item),
    amount: detectedAmount,
    categoryName: capitalize(categoryName),
    walletName: detectedWallet ? capitalize(detectedWallet) : undefined,
    isExpense,
    rawText: clean,
  };
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
