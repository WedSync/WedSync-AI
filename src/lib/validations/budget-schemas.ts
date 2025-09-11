import { z } from 'zod';

// Base budget schemas
export const budgetQuerySchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID format'),
  includeTransactions: z.boolean().optional().default(false),
});

export const budgetCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long'),
  allocated_amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large'),
  spent_amount: z
    .number()
    .min(0, 'Spent amount cannot be negative')
    .optional()
    .default(0),
  color_code: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z
    .string()
    .min(1, 'Icon is required')
    .max(50, 'Icon name too long')
    .optional(),
  display_order: z
    .number()
    .int()
    .min(0, 'Display order must be non-negative')
    .optional(),
  wedding_id: z.string().uuid('Invalid wedding ID format'),
});

export const budgetUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    allocated_amount: z.number().positive().max(1000000).optional(),
    spent_amount: z.number().min(0).max(1000000).optional(),
    color_code: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .optional(),
    icon: z.string().min(1).max(50).optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be updated',
  );

export const budgetTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  budget_category_id: z.string().uuid('Invalid category ID format'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(100000, 'Amount too large'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description too long'),
  transaction_date: z
    .string()
    .datetime('Invalid date format')
    .or(z.date())
    .optional(),
  payment_status: z
    .enum(['pending', 'paid', 'overdue'])
    .optional()
    .default('pending'),
  receipt_url: z.string().url('Invalid receipt URL').optional(),
  wedding_id: z.string().uuid('Invalid wedding ID format'),
});

export const budgetTransactionUpdateSchema = z
  .object({
    amount: z.number().positive().max(100000).optional(),
    description: z.string().min(1).max(500).optional(),
    transaction_date: z.string().datetime().or(z.date()).optional(),
    payment_status: z.enum(['pending', 'paid', 'overdue']).optional(),
    receipt_url: z.string().url().or(z.literal('')).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be updated',
  );

// API request/response schemas
export const createBudgetCategoryRequest = budgetCategorySchema.omit({
  id: true,
  spent_amount: true,
});

export const updateBudgetCategoryRequest = z.object({
  categoryId: z.string().uuid('Invalid category ID format'),
  updates: budgetUpdateSchema,
});

export const createTransactionRequest = budgetTransactionSchema.omit({
  id: true,
});

export const updateTransactionRequest = z.object({
  transactionId: z.string().uuid('Invalid transaction ID format'),
  updates: budgetTransactionUpdateSchema,
});

// Bulk operations
export const bulkUpdateCategoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().uuid(),
        updates: budgetUpdateSchema,
      }),
    )
    .min(1, 'At least one category must be updated')
    .max(50, 'Too many categories to update'),
});

export const reorderCategoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().uuid(),
        display_order: z.number().int().min(0),
      }),
    )
    .min(1, 'At least one category must be provided'),
});

// Export functionality
export const exportBudgetSchema = z.object({
  format: z.enum(['pdf', 'csv', 'xlsx']),
  includeTransactions: z.boolean().optional().default(true),
  dateRange: z
    .object({
      start: z.string().datetime().or(z.date()),
      end: z.string().datetime().or(z.date()),
    })
    .optional(),
  categories: z.array(z.string().uuid()).optional(), // Specific categories to export
});

// Type exports for TypeScript
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;
export type BudgetTransaction = z.infer<typeof budgetTransactionSchema>;
export type CreateBudgetCategoryRequest = z.infer<
  typeof createBudgetCategoryRequest
>;
export type UpdateBudgetCategoryRequest = z.infer<
  typeof updateBudgetCategoryRequest
>;
export type CreateTransactionRequest = z.infer<typeof createTransactionRequest>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionRequest>;
export type ExportBudgetRequest = z.infer<typeof exportBudgetSchema>;
