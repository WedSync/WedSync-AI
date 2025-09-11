/**
 * ID Generator Utilities
 * Provides various ID generation functions for the application
 */

import { randomBytes, randomUUID } from 'crypto';

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Generate a short ID (8 characters, URL-safe)
 */
export function generateShortId(): string {
  return randomBytes(6).toString('base64url').substring(0, 8);
}

/**
 * Generate a wedding-specific ID
 * Format: WED-YYYYMMDD-XXXX
 */
export function generateWeddingId(weddingDate?: Date): string {
  const date = weddingDate || new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(2).toString('hex').toUpperCase();
  return `WED-${dateStr}-${randomPart}`;
}

/**
 * Generate a vendor-specific ID
 * Format: VEN-TYPE-XXXX
 */
export function generateVendorId(vendorType: string): string {
  const type = vendorType.toUpperCase().substring(0, 4);
  const randomPart = randomBytes(2).toString('hex').toUpperCase();
  return `VEN-${type}-${randomPart}`;
}

/**
 * Generate a client-specific ID
 * Format: CLI-XXXX-XXXX
 */
export function generateClientId(): string {
  const part1 = randomBytes(2).toString('hex').toUpperCase();
  const part2 = randomBytes(2).toString('hex').toUpperCase();
  return `CLI-${part1}-${part2}`;
}

/**
 * Generate a secure token (32 characters)
 */
export function generateSecureToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Generate a numeric ID (for compatibility)
 */
export function generateNumericId(): string {
  return (
    Date.now().toString() +
    Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
  );
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return 'session_' + randomBytes(16).toString('base64url');
}

/**
 * Generate a webhook ID
 */
export function generateWebhookId(): string {
  return 'whk_' + randomBytes(12).toString('base64url');
}

/**
 * Generate an integration ID
 */
export function generateIntegrationId(integrationType: string): string {
  const type = integrationType.toUpperCase().substring(0, 3);
  const randomPart = randomBytes(8).toString('base64url');
  return `INT-${type}-${randomPart}`;
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate custom ID format (e.g., WED-20250101-ABCD)
 */
export function isValidCustomId(id: string, prefix: string): boolean {
  const regex = new RegExp(`^${prefix}-[A-Z0-9]+-[A-Z0-9]+$`);
  return regex.test(id);
}
