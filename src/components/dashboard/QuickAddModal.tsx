'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addTransactionAction } from '@/modules/transactions/transaction.actions';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [item, setItem] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [isExpense, setIsExpense] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, ''));

    if (!item.trim()) {
      setError('Item tidak boleh kosong');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal harus lebih dari 0');
      return;
    }

    setLoading(true);
    const res = await addTransactionAction({
      item: item.trim(),
      amount: parsedAmount,
      isExpense,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setItem('');
      setAmount('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 rounded-2xl relative shadow-2xl border border-slate-700/80">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-100 mb-1">Catat Transaksi</h2>
        <p className="text-xs text-slate-400 mb-5">Tambahkan pengeluaran atau pemasukan secara manual</p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpense(true)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isExpense ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-400'
              }`}
            >
              💸 Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setIsExpense(false)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isExpense ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400'
              }`}
            >
              💰 Pemasukan
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nama Item / Pengeluaran
            </label>
            <Input
              placeholder="Contoh: Kopi Latte, Makan Siang"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nominal (Rp)
            </label>
            <Input
              type="number"
              placeholder="25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
