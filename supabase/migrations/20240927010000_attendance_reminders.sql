-- Attendance Reminder Schema Migration

create table if not exists public.attendance_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  is_active boolean default true not null,
  night_reminder_time text default '23:00' not null,
  deadline_time text default '00:00' not null,
  nag_interval_minutes integer default 5 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.attendance_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date text not null, -- YYYY-MM-DD
  status text default 'PENDING' not null check (status in ('PENDING', 'CONFIRMED')),
  confirmed_at timestamp with time zone,
  last_nag_at timestamp with time zone,
  nag_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

alter table public.attendance_settings enable row level security;
alter table public.attendance_logs enable row level security;

create policy "Users can manage own attendance settings" on public.attendance_settings
  for all using (auth.uid() = user_id);

create policy "Users can manage own attendance logs" on public.attendance_logs
  for all using (auth.uid() = user_id);
