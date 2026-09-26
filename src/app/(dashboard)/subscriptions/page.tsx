import { getCurrentUserId } from '@/lib/auth-helper';
import { getSubscriptions } from '@/modules/subscriptions/subscription.service';
import { SubscriptionsView } from './subscriptions-view';
import type { Subscription } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  let subscriptions: Subscription[] = [];

  try {
    const auth = await getCurrentUserId();
    if (auth?.userId) {
      subscriptions = await getSubscriptions(auth.userId);
    }
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
  }

  return <SubscriptionsView initialSubscriptions={subscriptions} />;
}
