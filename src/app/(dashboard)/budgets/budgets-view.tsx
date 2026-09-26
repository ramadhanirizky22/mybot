'use client';

import * as React from 'react';
import { Header } from '@/components/shared/Header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, AlertTriangle, CheckCircle2, AlertOctagon, Trash2, X } from 'lucide-react';
import { formatIDR } from '@/lib/utils';
import type { BudgetWithProgress } from '@/types';
import { setBudgetAction, deleteBudgetAction } from '@/modules/budgets/budget.actions';

interface BudgetsViewProps {
  initialBudgets: BudgetWithProgress[];
  categories: { id: string; name: string }[];
}

export function BudgetsView({ initialBudgets, categories }: BudgetsViewProps) {
  const [budgets, setBudgets] = React.useState<BudgetWithProgress[]>(initialBudgets);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id || '');
  const [limitAmount, setLimitAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const now = new Date();
  const currentMonthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsedLimit = parseFloat(limitAmount.replace(/[^0-9]/g, ''));

    if (!categoryId) {
      setError('Pilih kategori');
      return;
    }
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setError('Limit anggaran harus lebih dari 0');
      return;
    }

    setLoading(true);
    const res = await setBudgetAction({
      categoryId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      limitAmount: parsedLimit,
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setIsModalOpen(false);
      setLimitAmount('');
      window.location.reload();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus anggaran kategori ini?')) return;
    await deleteBudgetAction(id);
    setBudgets(budgets.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Anggaran Bulanan ({currentMonthName})
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Alokasi batas pengeluaran kategori dengan sistem peringatan otomatis ≥ 80%
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Atur Anggaran Kategori
        </Button>
      </div>

      {/* Grid of Budget Cards */}
      {budgets.length === 0 ? (
        <Card className="py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-slate-200">Belum ada anggaran yang disetel</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Mulai atur alokasi anggaran bulanan untuk mengontrol pengeluaran Anda.
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            Mulai Setel Anggaran
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const limit = Number(b.limit_amount);
            const spent = Number(b.spent_amount);
            const remaining = Math.max(0, limit - spent);

            return (
              <Card key={b.id} className="relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-base text-slate-100">
                        {b.category?.name || 'Kategori'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kuota: {formatIDR(limit)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {b.is_over_limit ? (
                        <Badge variant="danger" className="gap-1 text-[11px]">
                          <AlertOctagon className="h-3 w-3" /> Over
                        </Badge>
                      ) : b.is_near_limit ? (
                        <Badge variant="warning" className="gap-1 text-[11px]">
                          <AlertTriangle className="h-3 w-3" /> ≥ 80%
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Aman
                        </Badge>
                      )}

                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="my-4">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-400">Penggunaan:</span>
                      <span
                        className={
                          b.is_over_limit
                            ? 'text-rose-400'
                            : b.is_near_limit
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {b.percentage}%
                      </span>
                    </div>
                    <Progress value={b.percentage} max={100} />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Terpakai</span>
                    <span className="font-semibold text-slate-200">{formatIDR(spent)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">
                      {b.is_over_limit ? 'Kelebihan' : 'Sisa Kuota'}
                    </span>
                    <span
                      className={`font-semibold ${
                        b.is_over_limit ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {b.is_over_limit ? `+${formatIDR(spent - limit)}` : formatIDR(remaining)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Budget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl relative shadow-2xl border border-slate-700/80">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Setel Anggaran Kategori</h3>
            <p className="text-xs text-slate-400 mb-5">
              Alokasikan batas pengeluaran untuk bulan {currentMonthName}
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSetBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Pilih Kategori
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Limit Anggaran Bulanan (Rp)
                </label>
                <Input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan Anggaran'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
