/**
 * Examples of secure API route implementations with Zod validation
 * SECURITY: Shows how to properly validate and secure API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withValidation,
  withQueryValidation,
  withSecureValidation,
} from './middleware';
import {
  clientSchema,
  supplierSchema,
  paginationSchema,
  searchSchema,
  paymentSchema,
  authSchema,
} from './schemas';

// Example: Secure Client Creation API
// Usage: POST /api/clients
export const createClientHandler = withSecureValidation(
  clientSchema,
  async (request: NextRequest, validatedData) => {
    // validatedData is now type-safe and validated
    try {
      // Your database logic here - data is guaranteed to be valid
      console.log('Creating client:', validatedData.name);

      return NextResponse.json(
        {
          success: true,
          message: 'Client created successfully',
          data: { id: crypto.randomUUID(), ...validatedData },
        },
        { status: 201 },
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to create client',
        },
        { status: 500 },
      );
    }
  },
);

// Example: Secure Client List API with Query Validation
// Usage: GET /api/clients?page=1&limit=20&sort=desc
export const listClientsHandler = withQueryValidation(
  paginationSchema.extend({
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', 'pending', 'completed']).optional(),
  }),
  async (request: NextRequest, validatedQuery) => {
    try {
      // Your database query here with validated pagination/filters
      const { page, limit, sort, search, status } = validatedQuery;

      return NextResponse.json({
        success: true,
        data: {
          clients: [], // Your actual client data
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch clients',
        },
        { status: 500 },
      );
    }
  },
);

// Example: Secure Payment Processing API
// Usage: POST /api/payments
export const createPaymentHandler = withSecureValidation(
  paymentSchema,
  async (request: NextRequest, validatedData) => {
    try {
      // Additional business logic validation
      if (validatedData.amount > 100000) {
        // $100k limit
        return NextResponse.json(
          {
            error: 'AMOUNT_TOO_LARGE',
            message: 'Payment amount exceeds maximum allowed limit',
          },
          { status: 400 },
        );
      }

      // Process payment with validated data
      console.log('Processing payment:', validatedData.amount);

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          id: crypto.randomUUID(),
          ...validatedData,
          status: 'processing',
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'PAYMENT_ERROR',
          message: 'Failed to process payment',
        },
        { status: 500 },
      );
    }
  },
);

// Example: Search API with Complex Validation
// Usage: GET /api/search?query=photographer&category=suppliers
export const searchHandler = withQueryValidation(
  searchSchema.extend({
    category: z.enum(['clients', 'suppliers', 'communications', 'payments']),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
  async (request: NextRequest, validatedQuery) => {
    try {
      const { query, category, filters, page, limit } = validatedQuery;

      // Secure search implementation
      // The query is already sanitized by our schema

      return NextResponse.json({
        success: true,
        data: {
          results: [], // Your search results
          query,
          category,
          pagination: { page, limit, total: 0 },
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'SEARCH_ERROR',
          message: 'Search operation failed',
        },
        { status: 500 },
      );
    }
  },
);

// Example: File Upload API with Validation
// Usage: POST /api/upload
import { withFileValidation } from './middleware';

export const uploadHandler = withFileValidation(
  ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  10 * 1024 * 1024, // 10MB limit
  async (request: NextRequest, file: File) => {
    try {
      // File is validated and safe to process
      const buffer = await file.arrayBuffer();

      // Your file processing logic here
      console.log(`Processing file: ${file.name}, size: ${file.size}`);

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: file.name,
          size: file.size,
          type: file.type,
          url: `/uploads/${crypto.randomUUID()}-${file.name}`,
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'UPLOAD_ERROR',
          message: 'File upload failed',
        },
        { status: 500 },
      );
    }
  },
);

// Example: Authentication API
// Usage: POST /api/auth/login
export const loginHandler = withValidation(
  authSchema,
  async (request: NextRequest, validatedData) => {
    try {
      const { email, password } = validatedData;

      // Your authentication logic here
      // Email is guaranteed to be valid format
      // Password meets complexity requirements

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          user: { email },
          token: 'jwt-token-here',
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
        { status: 401 },
      );
    }
  },
);

// Example: Combined Body and Query Validation
// Usage: POST /api/clients/search?page=1&limit=20
import { withFullValidation } from './middleware';

export const clientSearchHandler = withFullValidation(
  z.object({
    query: z.string().min(1).max(100),
    filters: z.record(z.string(), z.string()).optional(),
  }),
  paginationSchema,
  async (request: NextRequest, validatedBody, validatedQuery) => {
    try {
      const { query, filters } = validatedBody;
      const { page, limit, sort } = validatedQuery;

      return NextResponse.json({
        success: true,
        data: {
          results: [],
          pagination: { page, limit, total: 0 },
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'SEARCH_ERROR',
          message: 'Client search failed',
        },
        { status: 500 },
      );
    }
  },
);

// How to use these handlers in your API routes:
/*

// In /app/api/clients/route.ts
import { createClientHandler, listClientsHandler } from '@/lib/validation/examples'

export const POST = createClientHandler
export const GET = listClientsHandler

// In /app/api/payments/route.ts  
import { createPaymentHandler } from '@/lib/validation/examples'

export const POST = createPaymentHandler

// In /app/api/search/route.ts
import { searchHandler } from '@/lib/validation/examples'

export const GET = searchHandler

// In /app/api/upload/route.ts
import { uploadHandler } from '@/lib/validation/examples'

export const POST = uploadHandler

// In /app/api/auth/login/route.ts
import { loginHandler } from '@/lib/validation/examples'

export const POST = loginHandler

*/
