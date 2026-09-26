import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, 'Nama langganan wajib diisi (contoh: Netflix, Spotify)'),
  amount: z.coerce.number().positive('Nominal tagihan harus lebih dari 0'),
  billingDay: z.coerce.number().int().min(1).max(31, 'Tanggal tagihan antara 1 - 31'),
  isActive: z.boolean().default(true),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
