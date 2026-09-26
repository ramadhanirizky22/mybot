'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Send,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { Profile } from '@/types';

import { generateBindingTokenAction } from './settings-actions';

interface SettingsViewProps {
  profile: Profile | null;
  botUsername: string;
}

export function SettingsView({ profile, botUsername }: SettingsViewProps) {
  const [token, setToken] = React.useState('BIND-DEMO');
  const [copied, setCopied] = React.useState(false);
  const [isLinked, setIsLinked] = React.useState(!!profile?.telegram_chat_id);

  React.useEffect(() => {
    generateBindingTokenAction().then((res) => {
      if (res.token) setToken(res.token);
    });
  }, []);

  const telegramLink = `https://t.me/${botUsername}?start=${token}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateNewToken = async () => {
    const res = await generateBindingTokenAction();
    if (res.token) setToken(res.token);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-6 border-b border-slate-800/60">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Pengaturan Akun & Integrasi Bot
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola koneksi Telegram Bot, kunci keamanan, dan preferensi akun Anda
        </p>
      </div>

      {/* Telegram Binding Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Status Penautan Telegram</h3>
              <p className="text-xs text-slate-400">
                Hubungkan bot @{botUsername} untuk input transaksi instan
              </p>
            </div>
          </div>

          <Badge variant={isLinked ? 'success' : 'warning'} className="gap-1.5 py-1 px-3">
            {isLinked ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Terhubung
              </>
            ) : (
              'Belum Terhubung'
            )}
          </Badge>
        </div>

        {isLinked ? (
          <div className="space-y-4 pt-4 border-t border-slate-800/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Telegram Chat ID</span>
                <span className="font-mono text-sm font-semibold text-slate-200">
                  {profile?.telegram_chat_id || '987654321'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Telegram Username</span>
                <span className="text-sm font-semibold text-slate-200">
                  @{profile?.telegram_username || 'user_telegram'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                onClick={() => setIsLinked(false)}
              >
                Putuskan Tautan Telegram
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-4 border-t border-slate-800/60">
            <p className="text-sm text-slate-300 leading-relaxed">
              Ikuti langkah mudah berikut untuk mengaitkan akun Telegram Anda dengan TeleSpend:
            </p>

            {/* Step 1: Direct link */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Opsi 1: Tautkan Langsung 1-Klik
              </span>
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
              >
                <Send className="h-4 w-4" />
                Buka Telegram & Tautkan Sekarang
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </div>

            {/* Step 2: Manual Token */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Opsi 2: Salin Kode Verifikasi Manual
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 flex items-center bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 font-mono text-base font-bold text-emerald-400 tracking-wider">
                  /start {token}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(`/start ${token}`)}
                    className="gap-1.5"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Tersalin!' : 'Salin Perintah'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateNewToken} title="Generate kode baru">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kirimkan kode di atas ke chat bot <code className="text-emerald-400">@{botUsername}</code> di Telegram.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Security & Webhook Guidelines Info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Keamanan & Perlindungan Data (PRD Sec. 6)</h3>
            <p className="text-xs text-slate-400">Arsitektur proteksi terpasang pada TeleSpend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">🔐 Row Level Security (RLS)</span>
            Semua tabel PostgreSQL dilindungi RLS, pengguna hanya dapat membaca dan menulis data miliknya.
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">🛡️ Anti-Spoofing Webhook</span>
            Validasi token Telegram menggunakan <code className="text-emerald-300">crypto.timingSafeEqual()</code> mencegah serangan timing.
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">⚡ Budget Respon Webhook</span>
            Webhook memproses dan mengembalikan HTTP 200 dalam waktu &lt; 1500 ms untuk stabilitas polling Telegram.
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">🔢 64-bit Integer Safe</span>
            Kolom Telegram Chat ID menggunakan tipe PostgreSQL <code className="text-emerald-300">BIGINT</code> aman dari overflow.
          </div>
        </div>
      </Card>
    </div>
  );
}
