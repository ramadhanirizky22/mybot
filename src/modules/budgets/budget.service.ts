import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BudgetWithProgress } from '@/types';
import type { SetBudgetInput } from './budget.schema';

export async function getBudgetsWithProgress(
  userId: string,
  month: number,
  year: number
): Promise<BudgetWithProgress[]> {
  // 1. Fetch budgets for the specified month & year
  const { data: budgets, error } = await supabaseAdmin
    .from('budgets')
    .select(
      `
      *,
      category:categories(id, name, icon)
    `
    )
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year);

  if (error || !budgets) {
    console.error('Error fetching budgets:', error);
    return [];
  }

  // 2. Compute date range for this month
  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  // 3. Fetch spending grouped by category
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('is_expense', true)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);

  const spentMap = new Map<string, number>();
  for (const tx of (transactions || []) as any[]) {
    if (tx.category_id) {
      const current = spentMap.get(tx.category_id) || 0;
      spentMap.set(tx.category_id, current + Number(tx.amount));
    }
  }

  // 4. Map budgets with progress
  return (budgets as any[]).map((b) => {
    const spent = spentMap.get(b.category_id) || 0;
    const limit = Number(b.limit_amount);
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    return {
      ...(b as unknown as BudgetWithProgress),
      spent_amount: spent,
      percentage,
      is_over_limit: spent > limit,
      is_near_limit: percentage >= 80 && spent <= limit,
    };
  });
}

export async function upsertBudget(userId: string, input: SetBudgetInput) {
  const { data, error } = await supabaseAdmin
    .from('budgets')
    .upsert(
      {
        user_id: userId,
        category_id: input.categoryId,
        month: input.month,
        year: input.year,
        limit_amount: input.limitAmount,
      },
      { onConflict: 'user_id, category_id, month, year' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBudget(userId: string, budgetId: string) {
  const { error } = await supabaseAdmin
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}
