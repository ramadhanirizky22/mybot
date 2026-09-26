'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatIDR } from '@/lib/utils';

interface DailyExpenseChartProps {
  data: { date: string; amount: number }[];
}

export function DailyExpenseChart({ data }: DailyExpenseChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Prepare real last 7 days from actual data
  const chartData = React.useMemo(() => {
    if (data && data.length > 0) return data;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        amount: 0,
      });
    }
    return days;
  }, [data]);

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 10000);

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tren Pengeluaran Harian</CardTitle>
            <CardDescription>Aktivitas pengeluaran 14 hari terakhir</CardDescription>
          </div>
          {hoveredIndex !== null && (
            <div className="text-right">
              <span className="text-xs text-slate-400">
                {new Date(chartData[hoveredIndex].date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <p className="text-sm font-bold text-emerald-400">
                {formatIDR(chartData[hoveredIndex].amount)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2 px-1">
        {chartData.map((item, idx) => {
          const heightPct = item.amount > 0 ? Math.max(8, Math.round((item.amount / maxAmount) * 100)) : 4;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.date}
              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-10 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[11px] text-slate-100 whitespace-nowrap shadow-xl z-20 pointer-events-none">
                  {formatIDR(item.amount)}
                </div>
              )}

              {/* Bar */}
              <div
                className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                  item.amount === 0
                    ? 'bg-slate-800'
                    : isHovered
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-500/40'
                    : 'bg-emerald-500/70 hover:bg-emerald-400'
                }`}
                style={{ height: `${heightPct}%` }}
              />

              {/* Label */}
              <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">
                {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
