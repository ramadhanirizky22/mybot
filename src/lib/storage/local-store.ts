import fs from 'fs';
import path from 'path';

export interface LocalTransaction {
  id: string;
  user_id: string;
  item: string;
  amount: number;
  category_id: string | null;
  category_name?: string;
  wallet_id: string | null;
  wallet_name?: string;
  is_expense: boolean;
  date: string;
  raw_text?: string | null;
  created_at: string;
}

export interface LocalProfile {
  id: string;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  binding_token: string | null;
  full_name: string | null;
}

interface LocalStoreData {
  profiles: LocalProfile[];
  transactions: LocalTransaction[];
  bindingTokens: Record<string, string>; // token -> profileId
}

const DATA_DIR = process.env.VERCEL || process.env.NODE_ENV === 'production'
  ? path.join('/tmp', '.data')
  : path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataFile(): LocalStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalStoreData = {
      profiles: [
        {
          id: 'user-default-1',
          telegram_chat_id: null,
          telegram_username: null,
          binding_token: 'BIND-DEMO',
          full_name: 'Pengguna TeleSpend',
        },
      ],
      transactions: [],
      bindingTokens: {
        'BIND-DEMO': 'user-default-1',
      },
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { profiles: [], transactions: [], bindingTokens: {} };
  }
}

function saveData(data: LocalStoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local store:', err);
  }
}

export const localStore = {
  getProfileByChatId(chatId: number): LocalProfile | undefined {
    const data = ensureDataFile();
    return data.profiles.find((p) => p.telegram_chat_id === chatId);
  },

  getProfileByBindingToken(token: string): LocalProfile | undefined {
    const data = ensureDataFile();
    const cleanToken = token.trim().toUpperCase();
    return data.profiles.find((p) => p.binding_token?.toUpperCase() === cleanToken);
  },

  setBindingToken(profileId: string, token: string) {
    const data = ensureDataFile();
    let profile = data.profiles.find((p) => p.id === profileId);
    if (!profile) {
      profile = {
        id: profileId,
        telegram_chat_id: null,
        telegram_username: null,
        binding_token: token,
        full_name: 'Pengguna TeleSpend',
      };
      data.profiles.push(profile);
    } else {
      profile.binding_token = token;
    }
    data.bindingTokens[token] = profileId;
    saveData(data);
  },

  bindTelegramChatId(chatId: number, username?: string, token?: string): LocalProfile {
    const data = ensureDataFile();
    let profile: LocalProfile | undefined;

    if (token) {
      profile = data.profiles.find((p) => p.binding_token?.toUpperCase() === token.trim().toUpperCase());
    }

    if (!profile) {
      profile = data.profiles.find((p) => p.telegram_chat_id === chatId);
    }

    if (!profile) {
      // Find the first unbound profile or create new
      profile = data.profiles.find((p) => !p.telegram_chat_id) || {
        id: 'user-' + chatId,
        telegram_chat_id: chatId,
        telegram_username: username || 'User',
        binding_token: null,
        full_name: username || 'Pengguna TeleSpend',
      };
      if (!data.profiles.some((p) => p.id === profile!.id)) {
        data.profiles.push(profile);
      }
    }

    profile.telegram_chat_id = chatId;
    profile.telegram_username = username || profile.telegram_username;
    profile.binding_token = null; // consume token

    saveData(data);
    return profile;
  },

  addTransaction(tx: Omit<LocalTransaction, 'id' | 'created_at'>): LocalTransaction {
    const data = ensureDataFile();
    const newTx: LocalTransaction = {
      ...tx,
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };
    data.transactions.unshift(newTx);
    saveData(data);
    return newTx;
  },

  getTransactions(userId: string): LocalTransaction[] {
    const data = ensureDataFile();
    return data.transactions.filter((t) => t.user_id === userId);
  },

  deleteLastTransaction(userId: string): LocalTransaction | null {
    const data = ensureDataFile();
    const idx = data.transactions.findIndex((t) => t.user_id === userId);
    if (idx === -1) return null;
    const removed = data.transactions.splice(idx, 1)[0];
    saveData(data);
    return removed;
  },
};
