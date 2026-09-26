import * as React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatIDR } from '@/lib/utils';

interface StatCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo';
  isExpense?: boolean;
}

export function StatCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  variant = 'emerald',
}: StatCardProps) {
  const iconVariants = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <Card className="relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-2">
            {formatIDR(amount)}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>

        <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center border', iconVariants[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
