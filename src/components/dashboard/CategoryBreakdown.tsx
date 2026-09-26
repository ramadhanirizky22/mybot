import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatIDR } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { PieChart } from 'lucide-react';

interface CategoryBreakdownProps {
  categories: {
    categoryName: string;
    amount: number;
    percentage: number;
  }[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle>Distribusi Kategori</CardTitle>
        <CardDescription>Alokasi pengeluaran per kategori bulan ini</CardDescription>
      </CardHeader>

      {categories.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
          <PieChart className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
          Belum ada data pengeluaran kategori bulan ini.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.slice(0, 5).map((item) => (
            <div key={item.categoryName} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{item.categoryName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">{item.percentage}%</span>
                  <span className="text-emerald-400 font-semibold">{formatIDR(item.amount)}</span>
                </div>
              </div>
              <Progress value={item.percentage} max={100} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
