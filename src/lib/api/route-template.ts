/**
 * API Route Template System
 * Provides standardized route handlers for consistent API structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId?: string;
}

export interface RouteContext {
  user: AuthenticatedUser;
  params?: any;
  searchParams?: URLSearchParams;
}

export type RouteHandler<T = any> = (
  context: RouteContext,
  validatedData: T,
) => Promise<ApiResponse>;

/**
 * Create a standardized POST route handler
 */
export function createPostRoute<T>(
  schema: z.ZodSchema<T>,
  handler: RouteHandler<T>,
) {
  return async (request: NextRequest) => {
    try {
      // Basic implementation - will be enhanced
      const body = await request.json();
      const validatedData = schema.parse(body);

      // Mock authenticated user for now
      const context: RouteContext = {
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
        },
        searchParams: new URL(request.url).searchParams,
      };

      const result = await handler(context, validatedData);

      if (result.success) {
        return NextResponse.json(result, { status: 200 });
      } else {
        return NextResponse.json(result, { status: 400 });
      }
    } catch (error) {
      console.error('Route error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}

/**
 * Create a standardized GET route handler
 */
export function createGetRoute<T>(
  schema: z.ZodSchema<T>,
  handler: RouteHandler<T>,
) {
  return async (request: NextRequest) => {
    try {
      const searchParams = new URL(request.url).searchParams;
      const queryData = Object.fromEntries(searchParams.entries());
      const validatedData = schema.parse(queryData);

      // Mock authenticated user for now
      const context: RouteContext = {
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
        },
        searchParams,
      };

      const result = await handler(context, validatedData);

      if (result.success) {
        return NextResponse.json(result, { status: 200 });
      } else {
        return NextResponse.json(result, { status: 400 });
      }
    } catch (error) {
      console.error('Route error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}

export { type ApiResponse, type AuthenticatedUser, type RouteContext };
