'use client';

import { Bot, Plus, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenQuickAdd?: () => void;
}

export function Header({ title, subtitle, onOpenQuickAdd }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-slate-800/60">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="https://t.me/TeleSpendBot"
          target="_blank"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
        >
          <Send className="h-3.5 w-3.5" />
          Buka Telegram Bot
        </Link>

        {onOpenQuickAdd && (
          <Button onClick={onOpenQuickAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Catat Cepat
          </Button>
        )}
      </div>
    </header>
  );
}
