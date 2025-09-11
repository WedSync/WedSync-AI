import { z } from 'zod';

// Base validation schemas that GDPR components need
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')
  .max(255, 'Email is too long');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');

export const messageSchema = z
  .string()
  .min(1, 'Message is required')
  .max(2000, 'Message is too long');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number is too long')
  .optional();

// Additional schemas for GDPR components
export const gdprRequestSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
  requestType: z.enum([
    'access',
    'rectification',
    'erasure',
    'restrict_processing',
    'data_portability',
    'object',
    'withdraw_consent',
  ]),
  description: messageSchema.min(
    20,
    'Please provide a detailed description (minimum 20 characters)',
  ),
  confirmIdentity: z
    .boolean()
    .refine((val) => val === true, 'You must confirm your identity'),
  consentToProcess: z
    .boolean()
    .refine(
      (val) => val === true,
      'You must consent to processing this request',
    ),
});

export const consentUpdateSchema = z.object({
  necessary: z.boolean().default(true),
  analytics: z.boolean(),
  marketing: z.boolean(),
  functional: z.boolean(),
  version: z.string().default('1.0'),
});

export const dataExportSchema = z.object({
  email: emailSchema,
  dataTypes: z
    .array(
      z.enum(['profile', 'weddings', 'vendors', 'communications', 'analytics']),
    )
    .min(1, 'Select at least one data type'),
  format: z.enum(['json', 'csv']).default('json'),
  confirmIdentity: z
    .boolean()
    .refine((val) => val === true, 'You must confirm your identity'),
});
