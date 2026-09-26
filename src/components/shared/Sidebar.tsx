'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  CalendarClock,
  Settings,
  Bot,
  LogOut,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transaksi', href: '/transactions', icon: Receipt },
  { name: 'Anggaran (Budgets)', href: '/budgets', icon: PieChart },
  { name: 'Langganan (Subs)', href: '/subscriptions', icon: CalendarClock },
  { name: 'Pengaturan Bot', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl h-screen sticky top-0 px-4 py-6 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
          <Bot className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            TeleSpend
          </span>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Telegram Tracker
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bot Info card */}
      <div className="mt-auto mb-4 p-3.5 rounded-xl glass-card border border-emerald-500/20 bg-emerald-950/10">
        <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-emerald-400">
          <Bot className="h-3.5 w-3.5" />
          Bot Telegram Siap
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Kirim pesan pengeluaran cepat di Telegram, otomatis sinkron ke sini.
        </p>
      </div>

      {/* Logout */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors w-full cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </aside>
  );
}
