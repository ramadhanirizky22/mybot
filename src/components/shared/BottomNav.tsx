'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  CalendarClock,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNav = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Transaksi', href: '/transactions', icon: Receipt },
  { name: 'Anggaran', href: '/budgets', icon: PieChart },
  { name: 'Langganan', href: '/subscriptions', icon: CalendarClock },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2">
      <div className="flex items-center justify-around">
        {mobileNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-all',
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg mb-0.5 transition-colors',
                  isActive ? 'bg-emerald-500/15' : 'bg-transparent'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
