/**
 * Client-safe crypto utilities
 * Browser-compatible functions for generating secure IDs
 */

/**
 * Generate a secure alphanumeric ID (browser-safe)
 * @param length - Length of the ID (default: 9)
 * @returns Secure alphanumeric ID
 */
export function generateAlphanumericId(length: number = 9): string {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyz';
  const array = new Uint8Array(length);

  // Use browser's crypto API
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for SSR or non-crypto environments
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length];
  }

  return result;
}

/**
 * Generate a secure random ID
 * @param length - Length of the ID (default: 16)
 * @returns Secure random ID string
 */
export function generateSecureId(length: number = 16): string {
  const array = new Uint8Array(Math.ceil(length / 2));

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Generate a UUID v4 (browser-safe)
 * @returns UUID string
 */
export function generateUUID(): string {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID();
  }

  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a secure token (browser-safe)
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(bytes: number = 32): string {
  const array = new Uint8Array(bytes);

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a secure numeric code (for OTP, verification codes, etc.)
 * @param digits - Number of digits (default: 6)
 * @returns Numeric code string
 */
export function generateNumericCode(digits: number = 6): string {
  const max = Math.pow(10, digits) - 1;
  const array = new Uint32Array(1);

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    array[0] = Math.floor(Math.random() * 0xffffffff);
  }

  const num = array[0] % (max + 1);
  return num.toString().padStart(digits, '0');
}

/**
 * Generate a secure URL-safe token
 * @param bytes - Number of random bytes (default: 32)
 * @returns Base64 URL-safe encoded token
 */
export function generateUrlSafeToken(bytes: number = 32): string {
  const array = new Uint8Array(bytes);

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to base64 manually
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }

  if (typeof window !== 'undefined' && window.btoa) {
    return window
      .btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Fallback to hex encoding
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Replace insecure Math.random() ID generation
 * This is a drop-in replacement for Math.random().toString(36).substr(2, 9)
 * @returns Secure 9-character alphanumeric ID
 */
export function generateLegacyCompatibleId(): string {
  return generateAlphanumericId(9);
}
