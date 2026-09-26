'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { setBudgetSchema, type SetBudgetInput } from './budget.schema';
import { upsertBudget, deleteBudget } from './budget.service';

export async function setBudgetAction(input: SetBudgetInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: Harap login terlebih dahulu' };
  }

  const validated = setBudgetSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.issues?.[0]?.message || 'Input tidak valid' };
  }

  try {
    const data = await upsertBudget(user.id, validated.data);
    revalidatePath('/budgets');
    revalidatePath('/(dashboard)', 'page');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyetel anggaran';
    return { error: message };
  }
}

export async function deleteBudgetAction(budgetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    await deleteBudget(user.id, budgetId);
    revalidatePath('/budgets');
    revalidatePath('/(dashboard)', 'page');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus anggaran';
    return { error: message };
  }
}
