// Placeholder rate limiting
import { NextRequest, NextResponse } from 'next/server';

export function rateLimit(options: any) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Placeholder implementation
    return null; // Allow all requests in development
  };
}
