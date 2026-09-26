import type { Database, WalletType } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Budget = Database['public']['Tables']['budgets']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export interface TransactionWithDetails extends Transaction {
  category?: Category | null;
  wallet?: Wallet | null;
}

export interface BudgetWithProgress extends Budget {
  category?: Category | null;
  spent_amount: number;
  percentage: number;
  is_over_limit: boolean;
  is_near_limit: boolean; // >= 80%
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyExpense: number;
  monthlyIncome: number;
  todayExpense: number;
  recentTransactions: TransactionWithDetails[];
  topCategories: { categoryName: string; amount: number; percentage: number; icon?: string | null }[];
  dailyTrends: { date: string; amount: number }[];
}

export { type WalletType };
