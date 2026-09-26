# Product Requirement Document (PRD)

**Project Name:** TeleSpend (Personal Finance & Expense Tracker via Telegram Bot)
**Version:** 1.0.0
**Status:** Approved for Implementation
**Primary Database:** Supabase (PostgreSQL with Native Row Level Security)
**Framework:** Next.js (App Router, Server Actions, Route Handlers)
**Language:** TypeScript (Strict Mode)

---

## 1. Executive Summary & Core Objective

### 1.1 Problem Statement

Sebagian besar aplikasi pencatat keuangan (*expense tracker*) konvensional ditinggalkan pengguna karena *high input friction*: harus membuka aplikasi, login, menunggu splash screen, dan mengisi form multi-field. Di sisi lain, aplikasi pesan instan seperti Telegram dibuka puluhan kali sehari, ringan, dan memiliki Bot API yang responsif.

### 1.2 Solution

TeleSpend memangkas hambatan pencatatan ke titik nol (*zero-friction*). Pengguna mencatat transaksi cukup dengan mengirim pesan singkat (`kopi 25k jajan cash`) atau foto struk belanja ke bot Telegram. Data langsung diparsing dan disimpan ke database **Supabase** secara terenkripsi dan terisolasi per akun, serta tersinkronisasi *real-time* ke web dashboard Next.js untuk kebutuhan analitik, budgeting, split-bill, dan subscription tracking.

---

## 2. Functional Requirements

### 2.1 Telegram Bot (Interface Utama)

- **Quick Text Capture & Parsing**
  - Format standar: `[item] [nominal] [kategori] [dompet]`.
  - Dukungan shorthand angka: `25k` → 25.000, `50rb` → 50.000, `1.5jt` → 1.500.000.
  - Parser kalimat alami via regex (contoh: `"tadi beli bensin 50 ribu pake gopay"`).
- **Receipt OCR Parsing**
  - Menerima kiriman foto/gambar nota atau struk belanja.
  - Mengekstrak total harga dan nama toko secara otomatis, lalu menampilkan inline keyboard konfirmasi kategori.
- **Inline Keyboards & Quick Interaction**
  - Tombol pemilihan kategori cepat jika user tidak menuliskan kategori di pesan.
  - Tombol `[ ❌ Batalkan / Undo ]` pada setiap pesan konfirmasi transaksi untuk menghapus data terakhir bila ada kesalahan ketik.
- **Command Handlers**
  - `/start` — Mendaftarkan dan mengaitkan akun Telegram (`chat_id`) dengan profil akun Supabase.
  - `/rekap` — Menampilkan ringkasan total pengeluaran hari ini, minggu ini, dan bulan ini.
  - `/budget` — Menampilkan status penggunaan kuota anggaran per kategori.
  - `/split [nominal] [jumlah_orang] [keterangan]` — Menghitung pembagian bayar dan menghasilkan format teks tagihan siap salin/forward.
  - `/undo` — Menghapus baris transaksi terakhir yang dimasukkan.

### 2.2 Web Application Dashboard (Next.js)

- **Authentication** — Integrasi penuh dengan **Supabase Auth** (Email/Magic Link/OAuth).
- **Telegram Account Binding** — Halaman pengaturan untuk menautkan Telegram Chat ID dengan kode verifikasi sekali pakai (OTP / Secret Binding Token).
- **Ledger & Filters** — Tabel transaksi lengkap dengan pagination server-side, multi-filter (kategori, dompet, rentang tanggal), serta fitur ekspor CSV.
- **Budgeting Engine** — Form alokasi kuota anggaran bulanan per kategori dan konfigurasi peringatan jika pemakaian mencapai ≥ 80%.
- **Subscription / Recurring Tracker** — Pengingat otomatis untuk tagihan bulanan/tahunan (Netflix, Spotify, Cloud Hosting, Domain) via Telegram sebelum jatuh tempo.
- **Visual Analytics** — Grafik tren pengeluaran harian dan pie chart alokasi biaya per kategori.

---

## 3. Technology Stack

| Layer | Stack | Keterangan |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Menggunakan Route Handlers (`app/api/...`) dan Server Actions |
| **Language** | TypeScript | Strict typing, zero `any` policy |
| **Primary Database** | Supabase (PostgreSQL) | Managed Postgres, Row Level Security (RLS), real-time capabilities |
| **Database Client** | `@supabase/supabase-js` + Drizzle / Kysely | Type-safe query builder dengan typed schema |
| **Bot Framework** | `grammY` | Modular, ringan, kompatibel penuh dengan Webhook & Edge runtime |
| **Data Validation** | Zod | Runtime payload validator (Webhook, Env, Server Actions) |
| **Styling & UI** | Tailwind CSS + Shadcn UI | Accessible, clean, dan modular UI components |

---

## 4. Supabase Database Schema (DDL & Row Level Security)

Skema database dieksekusi langsung di PostgreSQL Supabase dengan menerapkan **Row Level Security (RLS)** secara ketat:

```sql
-- Aktifkan UUID extension
create extension if not exists "uuid-ossp";

-- 1. Enum Tipe Dompet
create type wallet_type as enum ('CASH', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD');

-- 2. Profiles / Users Table (Terkoneksi ke auth.users Supabase)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  telegram_chat_id bigint unique,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Wallets Table
create table public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type wallet_type default 'CASH'::wallet_type not null,
  balance numeric(15, 2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Categories Table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- null = default system category
  name text not null,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Transactions Table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  wallet_id uuid references public.wallets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(15, 2) not null check (amount > 0),
  item text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  is_expense boolean default true not null,
  raw_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_transactions_user_date on public.transactions(user_id, date desc);

-- 6. Budgets Table
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  month smallint not null check (month between 1 and 12),
  year smallint not null,
  limit_amount numeric(15, 2) not null check (limit_amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, category_id, month, year)
);

-- 7. Subscriptions / Recurring Table
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(15, 2) not null check (amount > 0),
  billing_day smallint not null check (billing_day between 1 and 31),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.subscriptions enable row level security;

-- Rule: User hanya dapat mengelola data miliknya sendiri
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can manage own wallets" on public.wallets for all using (auth.uid() = user_id);

create policy "Users can view system and own categories" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "Users can manage own categories" on public.categories
  for all using (auth.uid() = user_id);

create policy "Users can manage own transactions" on public.transactions for all using (auth.uid() = user_id);
create policy "Users can manage own budgets" on public.budgets for all using (auth.uid() = user_id);
create policy "Users can manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);
```

---

## 5. Folder Structure & Architecture (Modular Screaming Architecture)

```
tele-spend/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/                       # Supabase Auth routes (login, register, callback)
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── (dashboard)/                  # Protected Dashboard Views
│   │   │   ├── layout.tsx                # Sidebar & user session guard
│   │   │   ├── page.tsx                  # Dashboard analytics overview
│   │   │   ├── transactions/page.tsx     # Transaction ledger & filter table
│   │   │   ├── budgets/page.tsx          # Budget setup & limits
│   │   │   ├── subscriptions/page.tsx    # Recurring bills tracker
│   │   │   └── settings/page.tsx         # Telegram ID binding & API keys
│   │   ├── api/
│   │   │   ├── bot/
│   │   │   │   └── webhook/route.ts      # Telegram Bot Webhook Receiver
│   │   │   └── cron/
│   │   │       └── subscription-alert/
│   │   │           └── route.ts          # Scheduled reminder check
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/                       # Shared Presentation Layer
│   │   ├── ui/                           # Primitive UI components (Shadcn)
│   │   ├── dashboard/                    # Charts, KPI cards, summary widgets
│   │   └── shared/                       # Navbar, sidebar, data tables
│   │
│   ├── config/                           # Environment & App Settings
│   │   └── env.ts                        # Zod-parsed environment schema
│   │
│   ├── lib/                              # External Clients & Singletons
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client (client components)
│   │   │   ├── server.ts                 # Server client with cookies (Server Components)
│   │   │   └── admin.ts                  # Service role client (khusus Bot Webhook)
│   │   └── telegram.ts                   # grammY bot instance setup
│   │
│   ├── modules/                          # Decoupled Feature Modules (DRY)
│   │   ├── bot/                          # Telegram bot logic
│   │   │   ├── commands/                 # /start, /rekap, /budget, /undo
│   │   │   ├── handlers/                 # Message parser, receipt OCR handler
│   │   │   ├── keyboards/                # Inline buttons generator
│   │   │   ├── parsers/                  # Regex parsing engine
│   │   │   └── bot.service.ts
│   │   ├── transactions/                 # Core transaction logic
│   │   │   ├── transaction.schema.ts     # Zod validation schemas
│   │   │   ├── transaction.service.ts    # Supabase queries & business logic
│   │   │   └── transaction.actions.ts    # Next.js Server Actions
│   │   ├── budgets/
│   │   └── subscriptions/
│   │
│   └── types/                            # Global & Database Typings
│       ├── database.types.ts             # Auto-generated Supabase types
│       └── index.ts
│
├── .env.example
├── middleware.ts                         # Supabase Session Refresh & Route Guard
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 6. Security & Protection Guidelines

### 6.1 Webhook Verification (Anti-Spoofing)

Webhook didaftarkan ke Telegram dengan secret token:

```
setWebhook?url=<URL>&secret_token=<TELEGRAM_SECRET_TOKEN>
```

Di file `app/api/bot/webhook/route.ts`, header `x-telegram-bot-api-secret-token` diverifikasi menggunakan `crypto.timingSafeEqual()` untuk mencegah eksploitasi timing attack.

### 6.2 Service Role Isolation (Supabase)

Webhook Telegram tidak membawa user session browser, sehingga webhook menggunakan `supabase/admin.ts` (menggunakan `SUPABASE_SERVICE_ROLE_KEY`).

Akses Service Role hanya diizinkan di dalam webhook dan cron job. Sebelum query dijalankan, sistem wajib memvalidasi bahwa `ctx.from.id` (Telegram Chat ID) benar-benar terdaftar di tabel `public.profiles`. Jika tidak terdaftar, request langsung di-reject.

### 6.3 Integer Overflow Protection

Telegram `chat_id` dan `user_id` berada di rentang 64-bit integer. Kolom database `telegram_chat_id` wajib menggunakan tipe `BIGINT` (bukan `INTEGER`), dan dipetakan sebagai string/BigInt pada runtime TypeScript untuk mencegah pemotongan nilai (truncation error).

### 6.4 Input Validation

Semua data string, nominal, dan input tanggal wajib divalidasi dengan schema Zod sebelum di-insert ke Supabase. Nilai angka wajib diverifikasi > 0.

---

## 7. Implementation Reference Code

### 7.1 Strict Environment Validation (`src/config/env.ts`)

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase Anon Key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase Service Role Key is required"),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "Telegram Bot Token is required"),
  TELEGRAM_SECRET_TOKEN: z.string().min(16, "Secret token must be at least 16 characters"),
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid App URL"),
});

export const env = envSchema.parse(process.env);
```

### 7.2 Supabase Admin Client (`src/lib/supabase/admin.ts`)

```typescript
import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { Database } from "@/types/database.types";

// Khusus digunakan di Webhook & Background Jobs (Bypass RLS dengan validasi chat_id ketat)
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
```

### 7.3 Text Parser Module (`src/modules/bot/parsers/transaction.parser.ts`)

```typescript
export interface ParsedTransaction {
  item: string;
  amount: number;
  categoryName: string;
}

export function parseTransactionText(rawText: string): ParsedTransaction | null {
  const clean = rawText.trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 2) return null;

  const item = parts[0];
  const nominalStr = parts[1].toLowerCase();
  const categoryName = parts.slice(2).join(" ") || "Lainnya";

  let amount = 0;
  if (nominalStr.includes("k") || nominalStr.includes("rb")) {
    const num = parseFloat(nominalStr.replace(/[^0-9.]/g, ""));
    amount = num * 1000;
  } else if (nominalStr.includes("jt")) {
    const num = parseFloat(nominalStr.replace(/[^0-9.]/g, ""));
    amount = num * 1000000;
  } else {
    amount = parseFloat(nominalStr.replace(/[^0-9]/g, ""));
  }

  if (isNaN(amount) || amount <= 0) return null;

  return { item, amount, categoryName };
}
```

### 7.4 Telegram Webhook Route Handler (`src/app/api/bot/webhook/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";
import { env } from "@/config/env";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token") || "";

    const isValidSecret =
      secretHeader.length === env.TELEGRAM_SECRET_TOKEN.length &&
      crypto.timingSafeEqual(
        Buffer.from(secretHeader),
        Buffer.from(env.TELEGRAM_SECRET_TOKEN)
      );

    if (!isValidSecret) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const update = await req.json();
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[Telegram Webhook Error]:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
```

---

## 8. Non-Functional Requirements & Performance

- **Webhook Response Budget** — Response HTTP 200 wajib dikembalikan ke Telegram dalam tempo < 1500 ms untuk menghindari auto-retry dari server Telegram.
- **Idempotency** — Gunakan Telegram `update_id` sebagai deduplication key di tabel temporary atau memory cache untuk mencegah double entry saat jaringan fluktuatif.
- **Mobile First Dashboard** — Tampilan web dirancang optimal untuk layar ponsel (PWA-ready) dengan skor Lighthouse Performance ≥ 90.
