import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Subscription } from '@/types';
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from './subscription.schema';

export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('billing_day', { ascending: true });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return (data as Subscription[]) || [];
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      name: input.name,
      amount: input.amount,
      billing_day: input.billingDay,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubscription(userId: string, input: UpdateSubscriptionInput) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      ...(input.name && { name: input.name }),
      ...(input.amount && { amount: input.amount }),
      ...(input.billingDay && { billing_day: input.billingDay }),
      ...(typeof input.isActive === 'boolean' && { is_active: input.isActive }),
    })
    .eq('id', input.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubscription(userId: string, subscriptionId: string) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}
