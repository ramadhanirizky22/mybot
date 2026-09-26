'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mail, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isMagicLink, setIsMagicLink] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Tautan login telah dikirim ke email Anda! Silakan cek kotak masuk.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // If user doesn't exist, try signing up
          if (error.message.includes('Invalid login credentials')) {
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
            });
            if (signUpError) throw signUpError;
            setMessage({
              type: 'success',
              text: 'Akun baru berhasil didaftarkan! Mengalihkan ke dashboard...',
            });
            router.push('/');
            router.refresh();
            return;
          }
          throw error;
        }
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-xl shadow-emerald-500/20 mb-3">
            <Bot className="h-8 w-8 stroke-[2.2]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            TeleSpend
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Zero-friction personal expense tracking via Telegram & Next.js
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 sm:p-8 backdrop-blur-2xl bg-slate-900/60 border border-slate-700/80 shadow-2xl">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setIsMagicLink(false)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isMagicLink ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => setIsMagicLink(true)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isMagicLink ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400'
              }`}
            >
              Magic Link (OTP)
            </button>
          </div>

          {message && (
            <div
              className={`p-3.5 mb-5 rounded-xl text-xs border ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {!isMagicLink && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-2 h-11 text-sm font-semibold" disabled={loading}>
              {loading ? 'Memproses...' : isMagicLink ? 'Kirim Magic Link' : 'Masuk / Daftar Akun'}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Direct Demo / Preview Access Button */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Lanjutkan sebagai Tamu (Mode Preview Dashboard)
            </button>
          </div>
        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>PostgreSQL Row Level Security (RLS) Protected</span>
        </div>
      </div>
    </div>
  );
}
