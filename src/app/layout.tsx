import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TeleSpend — Zero-Friction Expense Tracker via Telegram & Next.js',
  description:
    'TeleSpend memangkas hambatan pencatatan keuangan pribadi ke titik nol dengan integrasi bot Telegram, Supabase PostgreSQL RLS, analitik real-time, dan subscription tracker.',
  keywords: [
    'expense tracker',
    'telegram bot finance',
    'pencatat keuangan',
    'personal finance',
    'supabase finance',
    'telespend',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`dark ${inter.className}`}>
      <body className="bg-[#070b14] text-slate-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
