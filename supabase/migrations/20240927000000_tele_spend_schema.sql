-- TeleSpend - Supabase Database Schema (DDL & Row Level Security)
-- Version: 1.0.0

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Enum Tipe Dompet
do $$ begin
  create type wallet_type as enum ('CASH', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD');
exception
  when duplicate_object then null;
end $$;

-- 2. Profiles / Users Table (Terkoneksi ke auth.users Supabase)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  telegram_chat_id bigint unique,
  telegram_username text,
  binding_token text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Wallets Table
create table if not exists public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type wallet_type default 'CASH'::wallet_type not null,
  balance numeric(15, 2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Categories Table
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- null = default system category
  name text not null,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Transactions Table
create table if not exists public.transactions (
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

create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);

-- 6. Budgets Table
create table if not exists public.budgets (
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
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(15, 2) not null check (amount > 0),
  billing_day smallint not null check (billing_day between 1 and 31),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Seed Default System Categories (user_id is null)
insert into public.categories (name, icon, user_id)
select * from (values
  ('Makanan & Minuman', 'Utensils', null::uuid),
  ('Transportasi', 'Car', null::uuid),
  ('Belanja', 'ShoppingBag', null::uuid),
  ('Tagihan & Utilitas', 'Receipt', null::uuid),
  ('Hiburan', 'Gamepad2', null::uuid),
  ('Kesehatan', 'HeartPulse', null::uuid),
  ('Pendidikan', 'GraduationCap', null::uuid),
  ('Investasi & Tabungan', 'TrendingUp', null::uuid),
  ('Lainnya', 'MoreHorizontal', null::uuid)
) as c(name, icon, user_id)
where not exists (
  select 1 from public.categories where user_id is null
);

-- ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.subscriptions enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can manage own wallets" on public.wallets;
drop policy if exists "Users can view system and own categories" on public.categories;
drop policy if exists "Users can manage own categories" on public.categories;
drop policy if exists "Users can manage own transactions" on public.transactions;
drop policy if exists "Users can manage own budgets" on public.budgets;
drop policy if exists "Users can manage own subscriptions" on public.subscriptions;

-- Profiles: User can view and update own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Wallets
create policy "Users can manage own wallets" on public.wallets for all using (auth.uid() = user_id);

-- Categories
create policy "Users can view system and own categories" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "Users can manage own categories" on public.categories
  for all using (auth.uid() = user_id);

-- Transactions
create policy "Users can manage own transactions" on public.transactions for all using (auth.uid() = user_id);

-- Budgets
create policy "Users can manage own budgets" on public.budgets for all using (auth.uid() = user_id);

-- Subscriptions
create policy "Users can manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);

-- Trigger to automatically create a profile when auth.users is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  
  -- Create default Cash wallet for new user
  insert into public.wallets (user_id, name, type, balance)
  values (new.id, 'Cash', 'CASH', 0.00);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
