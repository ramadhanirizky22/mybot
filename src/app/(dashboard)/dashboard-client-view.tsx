'use client';

import * as React from 'react';
import { Header } from '@/components/shared/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { DailyExpenseChart } from '@/components/dashboard/DailyExpenseChart';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { RecentTransactionsList } from '@/components/dashboard/RecentTransactionsList';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';
import { Wallet, TrendingDown, Calendar, ArrowUpRight, Copy, Check, MessageSquare } from 'lucide-react';
import type { DashboardSummary } from '@/types';

interface DashboardClientViewProps {
  initialSummary: DashboardSummary;
}

export function DashboardClientView({ initialSummary }: DashboardClientViewProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const copyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Dashboard Ringkasan"
        subtitle="Analisis keuangan & riwayat transaksi real-time TeleSpend"
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Quick Bot Prompt Helper Card */}
      <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-teal-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Coba kirim ke Telegram Bot:
            </p>
            <p className="text-xs text-slate-400">
              Format: <code className="text-emerald-400">[item] [nominal] [kategori] [dompet]</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['kopi 25k jajan cash', 'bensin 50rb gopay', '/rekap', '/budget'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => copyCommand(cmd)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              {copiedText === cmd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Saldo"
          amount={initialSummary.totalBalance}
          icon={Wallet}
          variant="emerald"
          subtitle="Akumulasi semua dompet"
        />
        <StatCard
          title="Pengeluaran Bulan Ini"
          amount={initialSummary.monthlyExpense}
          icon={TrendingDown}
          variant="rose"
          subtitle="Bulan berjalan"
          isExpense
        />
        <StatCard
          title="Pengeluaran Hari Ini"
          amount={initialSummary.todayExpense}
          icon={Calendar}
          variant="amber"
          subtitle="Aktivitas hari ini"
        />
        <StatCard
          title="Pemasukan Bulan Ini"
          amount={initialSummary.monthlyIncome}
          icon={ArrowUpRight}
          variant="indigo"
          subtitle="Pendapatan terverifikasi"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyExpenseChart data={initialSummary.dailyTrends} />
        <CategoryBreakdown categories={initialSummary.topCategories} />
      </div>

      {/* Recent Transactions Ledger Preview */}
      <RecentTransactionsList transactions={initialSummary.recentTransactions} />

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
