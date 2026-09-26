import { z } from 'zod';

export const setBudgetSchema = z.object({
  categoryId: z.string().uuid('Kategori wajib dipilih'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  limitAmount: z.coerce.number().positive('Batas anggaran harus lebih dari 0'),
});

export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
