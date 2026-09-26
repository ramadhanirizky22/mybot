import { getCurrentUserId } from '@/lib/auth-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBudgetsWithProgress } from '@/modules/budgets/budget.service';
import { BudgetsView } from './budgets-view';
import type { BudgetWithProgress } from '@/types';

export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let budgets: BudgetWithProgress[] = [];
  let categories: { id: string; name: string }[] = [];

  try {
    const auth = await getCurrentUserId();
    if (auth?.userId) {
      budgets = await getBudgetsWithProgress(auth.userId, currentMonth, currentYear);
    }

    const { data: dbCategories } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (dbCategories && dbCategories.length > 0) {
      categories = dbCategories;
    }
  } catch (err) {
    console.error('Error fetching budgets:', err);
  }

  return <BudgetsView initialBudgets={budgets} categories={categories} />;
}
