import { getCurrentUserId } from '@/lib/auth-helper';
import { getTransactions } from '@/modules/transactions/transaction.service';
import { TransactionsView } from './transactions-view';
import type { TransactionWithDetails } from '@/types';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  let transactions: TransactionWithDetails[] = [];
  let total = 0;

  try {
    const auth = await getCurrentUserId();
    if (auth?.userId) {
      const res = await getTransactions(auth.userId, { limit: 100 });
      transactions = res.data;
      total = res.total;
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }

  return <TransactionsView initialTransactions={transactions} total={total} />;
}
