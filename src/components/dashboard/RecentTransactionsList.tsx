'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, Trash2, ShoppingBag } from 'lucide-react';
import { formatIDR, formatDate } from '@/lib/utils';
import type { TransactionWithDetails } from '@/types';
import { deleteTransactionAction } from '@/modules/transactions/transaction.actions';

interface RecentTransactionsListProps {
  transactions: TransactionWithDetails[];
}

export function RecentTransactionsList({ transactions }: RecentTransactionsListProps) {
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    setIsDeleting(id);
    await deleteTransactionAction(id);
    setIsDeleting(null);
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>Catatan pengeluaran & pemasukan terakhir</CardDescription>
          </div>
        </div>
      </CardHeader>

      {transactions.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50 text-slate-400" />
          Belum ada transaksi yang tercatat. Kirim pesan ke bot Telegram untuk mulai mencatat!
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="py-3.5 flex items-center justify-between group hover:bg-slate-900/30 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                    tx.is_expense
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {tx.is_expense ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-100">{tx.item}</p>
                  <p className="text-xs text-slate-400">
                    {tx.category?.name || 'Lainnya'} • {formatDate(tx.date)}
                    {tx.wallet && ` • ${tx.wallet.name}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-bold ${
                    tx.is_expense ? 'text-slate-100' : 'text-emerald-400'
                  }`}
                >
                  {tx.is_expense ? '-' : '+'}
                  {formatIDR(Number(tx.amount))}
                </span>

                <button
                  onClick={() => handleDelete(tx.id)}
                  disabled={isDeleting === tx.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer rounded-lg hover:bg-rose-500/10"
                  title="Hapus transaksi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
