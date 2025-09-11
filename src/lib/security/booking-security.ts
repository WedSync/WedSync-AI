import { NextRequest } from 'next/server';
import { validateApiKey } from './api-key-rotation';
import { validateInput } from './input-validation';

export interface BookingSecurityContext {
  userId: string;
  bookingId: string;
  permissions: string[];
}

export async function validateBookingAccess(
  request: NextRequest,
  bookingId: string,
): Promise<BookingSecurityContext | null> {
  try {
    // Validate API key
    const apiValidation = await validateApiKey(request);
    if (!apiValidation.isValid) {
      return null;
    }

    // Validate input
    const inputValidation = validateInput({ bookingId });
    if (!inputValidation.isValid) {
      return null;
    }

    // Return security context
    return {
      userId: apiValidation.userId,
      bookingId,
      permissions: apiValidation.permissions,
    };
  } catch (error) {
    console.error('Booking security validation failed:', error);
    return null;
  }
}

export function hasBookingPermission(
  context: BookingSecurityContext,
  permission: string,
): boolean {
  return (
    context.permissions.includes(permission) ||
    context.permissions.includes('booking:all')
  );
}
