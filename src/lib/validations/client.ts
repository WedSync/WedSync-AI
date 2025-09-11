import { z } from 'zod';

// Phone number validation
const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

// Client status enum
export const clientStatusEnum = z.enum([
  'lead',
  'active',
  'inactive',
  'archived',
]);

// Client creation schema
export const createClientSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),

  email: z.string().email('Invalid email address').toLowerCase(),

  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .nullable(),

  status: clientStatusEnum.default('lead'),

  weddingDate: z.string().datetime().optional().nullable(),

  budget: z
    .number()
    .min(0, 'Budget cannot be negative')
    .max(10000000, 'Budget exceeds maximum allowed')
    .optional()
    .nullable(),

  notes: z.string().max(1000, 'Notes too long').optional().nullable(),

  partnerFirstName: z
    .string()
    .max(50, 'Partner first name is too long')
    .optional()
    .nullable(),

  partnerLastName: z
    .string()
    .max(50, 'Partner last name is too long')
    .optional()
    .nullable(),

  partnerEmail: z
    .string()
    .email('Invalid partner email address')
    .optional()
    .nullable(),

  partnerPhone: z
    .string()
    .regex(phoneRegex, 'Invalid partner phone number format')
    .optional()
    .nullable(),
});

// Client update schema (all fields optional)
export const updateClientSchema = createClientSchema.partial();

// Client search/filter schema
export const clientFilterSchema = z.object({
  status: z.enum(['all', ...clientStatusEnum.options]).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z
    .enum(['created_at', 'first_name', 'last_name', 'wedding_date', 'budget'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Type exports
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientFilterInput = z.infer<typeof clientFilterSchema>;
export type ClientStatus = z.infer<typeof clientStatusEnum>;
