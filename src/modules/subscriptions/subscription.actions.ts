'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
} from './subscription.schema';
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from './subscription.service';

export async function addSubscriptionAction(input: CreateSubscriptionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: Harap login terlebih dahulu' };
  }

  const validated = createSubscriptionSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.issues?.[0]?.message || 'Input tidak valid' };
  }

  try {
    const data = await createSubscription(user.id, validated.data);
    revalidatePath('/subscriptions');
    revalidatePath('/(dashboard)', 'page');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menambah langganan';
    return { error: message };
  }
}

export async function toggleSubscriptionStatusAction(id: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  try {
    const data = await updateSubscription(user.id, { id, isActive });
    revalidatePath('/subscriptions');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengubah status langganan';
    return { error: message };
  }
}

export async function deleteSubscriptionAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  try {
    await deleteSubscription(user.id, id);
    revalidatePath('/subscriptions');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus langganan';
    return { error: message };
  }
}
