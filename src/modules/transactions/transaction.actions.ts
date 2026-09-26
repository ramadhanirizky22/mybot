'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createTransactionSchema, type CreateTransactionInput } from './transaction.schema';
import { createTransaction, deleteTransaction } from './transaction.service';

export async function addTransactionAction(input: CreateTransactionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: Harap login terlebih dahulu' };
  }

  const validated = createTransactionSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.issues?.[0]?.message || 'Input tidak valid' };
  }

  try {
    const data = await createTransaction(user.id, validated.data);
    revalidatePath('/(dashboard)', 'page');
    revalidatePath('/transactions');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mencatat transaksi';
    return { error: message };
  }
}

export async function deleteTransactionAction(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    await deleteTransaction(user.id, transactionId);
    revalidatePath('/(dashboard)', 'page');
    revalidatePath('/transactions');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus transaksi';
    return { error: message };
  }
}
