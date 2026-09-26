import { z } from 'zod';

export const createTransactionSchema = z.object({
  item: z.string().min(1, 'Nama item/keperluan wajib diisi'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  categoryId: z.string().uuid().optional().nullable(),
  walletId: z.string().uuid().optional().nullable(),
  isExpense: z.boolean().default(true),
  date: z.string().optional(),
  rawText: z.string().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().uuid(),
});

export const filterTransactionSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  isExpense: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type FilterTransactionInput = z.infer<typeof filterTransactionSchema>;
