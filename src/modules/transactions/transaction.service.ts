import { supabaseAdmin } from '@/lib/supabase/admin';
import type { FilterTransactionInput, CreateTransactionInput } from './transaction.schema';
import type { TransactionWithDetails, DashboardSummary } from '@/types';

export async function getTransactions(userId: string, filters: FilterTransactionInput) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('transactions')
    .select(
      `
      *,
      category:categories(id, name, icon),
      wallet:wallets(id, name, type)
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (filters.search) {
    query = query.ilike('item', `%${filters.search}%`);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.walletId) {
    query = query.eq('wallet_id', filters.walletId);
  }

  if (typeof filters.isExpense === 'boolean') {
    query = query.eq('is_expense', filters.isExpense);
  }

  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching transactions:', error);
    return { data: [], total: 0, page, totalPages: 0 };
  }

  return {
    data: (data as unknown as TransactionWithDetails[]) || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: userId,
      item: input.item,
      amount: input.amount,
      category_id: input.categoryId || null,
      wallet_id: input.walletId || null,
      is_expense: input.isExpense,
      date: input.date || new Date().toISOString(),
      raw_text: input.rawText || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

export async function getDashboardAnalytics(userId: string): Promise<DashboardSummary> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Get all wallets balance
  const { data: wallets } = await supabaseAdmin
    .from('wallets')
    .select('balance')
    .eq('user_id', userId);

  const totalBalance = (wallets || []).reduce((acc, w: any) => acc + Number(w.balance || 0), 0);

  // 2. Get this month's transactions
  const { data: monthTx } = await supabaseAdmin
    .from('transactions')
    .select(
      `
      *,
      category:categories(id, name, icon)
    `
    )
    .eq('user_id', userId)
    .gte('date', startOfMonth)
    .order('date', { ascending: false });

  let monthlyExpense = 0;
  let monthlyIncome = 0;
  let todayExpense = 0;
  const categoryTotals: Record<string, { name: string; amount: number; icon?: string | null }> = {};
  const dailyTotals: Record<string, number> = {};

  for (const tx of (monthTx || []) as any[]) {
    const amount = Number(tx.amount);
    const dayStr = tx.date ? tx.date.split('T')[0] : '';

    if (tx.is_expense) {
      monthlyExpense += amount;
      if (dayStr) {
        dailyTotals[dayStr] = (dailyTotals[dayStr] || 0) + amount;
      }

      if (tx.date >= startOfDay) {
        todayExpense += amount;
      }

      // Group by category
      const cat = tx.category;
      const catName = cat?.name || 'Lainnya';
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, amount: 0, icon: cat?.icon };
      }
      categoryTotals[catName].amount += amount;
    } else {
      monthlyIncome += amount;
    }
  }

  // Top categories sorted
  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      categoryName: c.name,
      amount: c.amount,
      percentage: monthlyExpense > 0 ? Math.round((c.amount / monthlyExpense) * 100) : 0,
      icon: c.icon,
    }));

  // Daily trends for last 14 days
  const dailyTrends = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, amount]) => ({ date, amount }));

  // 3. Get recent transactions
  const { data: recentTransactions } = await supabaseAdmin
    .from('transactions')
    .select(
      `
      *,
      category:categories(id, name, icon),
      wallet:wallets(id, name, type)
    `
    )
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  return {
    totalBalance,
    monthlyExpense,
    monthlyIncome,
    todayExpense,
    recentTransactions: (recentTransactions as unknown as TransactionWithDetails[]) || [],
    topCategories,
    dailyTrends,
  };
}
