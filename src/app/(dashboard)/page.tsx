import { getCurrentUserId } from '@/lib/auth-helper';
import { getDashboardAnalytics } from '@/modules/transactions/transaction.service';
import { DashboardClientView } from './dashboard-client-view';
import type { DashboardSummary } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let summary: DashboardSummary = {
    totalBalance: 0,
    monthlyExpense: 0,
    monthlyIncome: 0,
    todayExpense: 0,
    recentTransactions: [],
    topCategories: [],
    dailyTrends: [],
  };

  try {
    const auth = await getCurrentUserId();
    if (auth?.userId) {
      summary = await getDashboardAnalytics(auth.userId);
    }
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
  }

  return <DashboardClientView initialSummary={summary} />;
}
