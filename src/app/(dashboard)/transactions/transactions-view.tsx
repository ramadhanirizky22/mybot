'use client';

import * as React from 'react';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Search,
  Filter,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatIDR, formatDate } from '@/lib/utils';
import type { TransactionWithDetails } from '@/types';
import { deleteTransactionAction } from '@/modules/transactions/transaction.actions';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';

interface TransactionsViewProps {
  initialTransactions: TransactionWithDetails[];
  total: number;
}

export function TransactionsView({ initialTransactions, total }: TransactionsViewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('ALL');
  const [selectedType, setSelectedType] = React.useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);

  // Filter transactions in client for immediate responsive feedback
  const filtered = React.useMemo(() => {
    return initialTransactions.filter((tx) => {
      const matchSearch =
        tx.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.raw_text && tx.raw_text.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'ALL' ||
        tx.category?.name?.toLowerCase() === selectedCategory.toLowerCase();

      const matchType =
        selectedType === 'ALL' ||
        (selectedType === 'EXPENSE' && tx.is_expense) ||
        (selectedType === 'INCOME' && !tx.is_expense);

      return matchSearch && matchCategory && matchType;
    });
  }, [initialTransactions, searchTerm, selectedCategory, selectedType]);

  // CSV Export feature as required in PRD
  const exportToCSV = () => {
    const headers = ['ID', 'Tanggal', 'Item', 'Tipe', 'Kategori', 'Dompet', 'Nominal', 'Pesan Asli'];
    const rows = filtered.map((tx) => [
      tx.id,
      tx.date,
      `"${tx.item.replace(/"/g, '""')}"`,
      tx.is_expense ? 'Pengeluaran' : 'Pemasukan',
      tx.category?.name || 'Lainnya',
      tx.wallet?.name || 'Utama',
      tx.amount,
      `"${(tx.raw_text || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `telespend_transaksi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    await deleteTransactionAction(id);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Buku Transaksi (Ledger)"
        subtitle="Daftar seluruh catatan pemasukan dan pengeluaran Anda"
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Filter and Actions Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari item atau catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="h-11 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="EXPENSE">Pengeluaran Saja</option>
              <option value="INCOME">Pemasukan Saja</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Ekspor CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/70 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Item & Catatan</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Dompet</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada transaksi yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        {tx.is_expense ? (
                          <ArrowDownLeft className="h-4 w-4 text-rose-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" />
                        )}
                        <span>{tx.item}</span>
                      </div>
                      {tx.raw_text && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          &quot;{tx.raw_text}&quot;
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-slate-300">
                        {tx.category?.name || 'Lainnya'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {tx.wallet?.name || 'Cash'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span className={tx.is_expense ? 'text-slate-100' : 'text-emerald-400'}>
                        {tx.is_expense ? '-' : '+'}
                        {formatIDR(Number(tx.amount))}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
