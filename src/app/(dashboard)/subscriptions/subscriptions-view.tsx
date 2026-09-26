'use client';

import * as React from 'react';
import { Header } from '@/components/shared/Header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Bell, Calendar, Trash2, X, CheckCircle2 } from 'lucide-react';
import { formatIDR } from '@/lib/utils';
import type { Subscription } from '@/types';
import {
  addSubscriptionAction,
  toggleSubscriptionStatusAction,
  deleteSubscriptionAction,
} from '@/modules/subscriptions/subscription.actions';

interface SubscriptionsViewProps {
  initialSubscriptions: Subscription[];
}

export function SubscriptionsView({ initialSubscriptions }: SubscriptionsViewProps) {
  const [subs, setSubs] = React.useState<Subscription[]>(initialSubscriptions);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [billingDay, setBillingDay] = React.useState('1');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const today = new Date();
  const currentDay = today.getDate();

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    const parsedDay = parseInt(billingDay, 10);

    if (!name.trim()) {
      setError('Nama langganan tidak boleh kosong');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal tagihan harus lebih dari 0');
      return;
    }
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError('Tanggal tagihan harus antara 1 sampai 31');
      return;
    }

    setLoading(true);
    const res = await addSubscriptionAction({
      name: name.trim(),
      amount: parsedAmount,
      billingDay: parsedDay,
      isActive: true,
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setIsModalOpen(false);
      setName('');
      setAmount('');
      window.location.reload();
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleSubscriptionStatusAction(id, !currentStatus);
    setSubs(
      subs.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s))
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus langganan ini?')) return;
    await deleteSubscriptionAction(id);
    setSubs(subs.filter((s) => s.id !== id));
  };

  // Calculate monthly recurring total
  const totalMonthlyCommitment = subs
    .filter((s) => s.is_active)
    .reduce((acc, s) => acc + Number(s.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Langganan & Tagihan Rutin
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau tagihan berulang dengan notifikasi otomatis via Telegram sebelum jatuh tempo
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Langganan
        </Button>
      </div>

      {/* Summary Banner */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">
            Total Komitmen Bulanan
          </span>
          <p className="text-2xl font-bold text-slate-100 mt-1">
            {formatIDR(totalMonthlyCommitment)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
          <Bell className="h-4 w-4" />
          Notifikasi Telegram dikirim otomatis H-1 sebelum tanggal jatuh tempo.
        </div>
      </div>

      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subs.map((s) => {
          const daysLeft =
            s.billing_day >= currentDay
              ? s.billing_day - currentDay
              : 30 - (currentDay - s.billing_day);

          return (
            <Card
              key={s.id}
              className={`flex flex-col justify-between transition-all ${
                !s.is_active ? 'opacity-60 border-dashed' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-base text-slate-100">{s.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tanggal {s.billing_day} setiap bulan
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(s.id, s.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium border cursor-pointer transition-all ${
                        s.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {s.is_active ? 'Aktif' : 'Non-aktif'}
                    </button>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="my-4">
                  <span className="text-xs text-slate-400">Biaya Langganan:</span>
                  <p className="text-xl font-bold text-slate-100">{formatIDR(Number(s.amount))}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {daysLeft === 0 ? (
                    <span className="text-amber-400 font-bold">Jatuh Tempo Hari Ini!</span>
                  ) : daysLeft === 1 ? (
                    <span className="text-amber-400 font-bold">Jatuh tempo besok</span>
                  ) : (
                    <span>{daysLeft} hari lagi</span>
                  )}
                </span>

                <span className="text-[11px] text-slate-400">Pengingat aktif</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Add Subscription */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl relative shadow-2xl border border-slate-700/80">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Tambah Langganan Baru</h3>
            <p className="text-xs text-slate-400 mb-5">
              Catat tagihan berulang untuk mendapatkan pengingat sebelum jatuh tempo
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nama Layanan / Tagihan
                </label>
                <Input
                  placeholder="Contoh: Netflix Premium, Spotify, VPS Hosting"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nominal Tagihan (Rp)
                </label>
                <Input
                  type="number"
                  placeholder="Contoh: 186000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tanggal Jatuh Tempo Setiap Bulan (1 - 31)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="15"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
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
                  {loading ? 'Menyimpan...' : 'Simpan Langganan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
