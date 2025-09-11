import {
  randomBytes,
  randomUUID,
  createCipherGCM,
  createDecipherGCM,
  scrypt,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Generate a cryptographically secure random ID
 * @param length - Length of the ID (default: 16)
 * @returns Secure random ID string
 */
export function generateSecureId(length: number = 16): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Generate a secure token for sessions, CSRF, etc.
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Generate a secure alphanumeric ID (similar to Math.random().toString(36))
 * @param length - Length of the ID (default: 9)
 * @returns Secure alphanumeric ID
 */
export function generateAlphanumericId(length: number = 9): string {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }

  return result;
}

/**
 * Generate a secure numeric code (for OTP, verification codes, etc.)
 * @param digits - Number of digits (default: 6)
 * @returns Numeric code string
 */
export function generateNumericCode(digits: number = 6): string {
  const max = Math.pow(10, digits) - 1;
  const bytes = randomBytes(4); // 4 bytes = 32 bits, enough for up to 10 digits
  const num = bytes.readUInt32BE(0) % (max + 1);
  return num.toString().padStart(digits, '0');
}

/**
 * Generate a secure URL-safe token
 * @param bytes - Number of random bytes (default: 32)
 * @returns Base64 URL-safe encoded token
 */
export function generateUrlSafeToken(bytes: number = 32): string {
  return randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Replace insecure Math.random() ID generation
 * This is a drop-in replacement for Math.random().toString(36).substr(2, 9)
 * @returns Secure 9-character alphanumeric ID
 */
export function generateLegacyCompatibleId(): string {
  return generateAlphanumericId(9);
}

// AES-256-GCM Encryption Implementation

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Encrypt data using AES-256-GCM with PBKDF2 key derivation
 * @param data - Data to encrypt
 * @param password - Password for encryption
 * @returns Promise<EncryptedData> - Encrypted data with metadata
 */
export async function encryptData(
  data: string,
  password: string,
): Promise<EncryptedData> {
  try {
    // Generate random salt and IV
    const salt = randomBytes(32);
    const iv = randomBytes(16);

    // Derive key using scrypt (PBKDF2 alternative, more secure)
    const key = (await scryptAsync(password, salt, 32)) as Buffer;

    // Create cipher
    const cipher = createCipherGCM('aes-256-gcm', key, iv);

    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data with metadata
 * @param password - Password for decryption
 * @returns Promise<string> - Decrypted data
 */
export async function decryptData(
  encryptedData: EncryptedData,
  password: string,
): Promise<string> {
  try {
    // Convert hex strings back to buffers
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    // Derive the same key using the stored salt
    const key = (await scryptAsync(password, salt, 32)) as Buffer;

    // Create decipher
    const decipher = createDecipherGCM('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`,
    );
  }
}

/**
 * Encrypt sensitive data for storage (using environment key)
 * @param data - Data to encrypt
 * @returns Promise<string> - Base64 encoded encrypted data
 */
export async function encryptForStorage(data: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  const encrypted = await encryptData(data, encryptionKey);
  return Buffer.from(JSON.stringify(encrypted)).toString('base64');
}

/**
 * Decrypt data from storage (using environment key)
 * @param encryptedData - Base64 encoded encrypted data
 * @returns Promise<string> - Decrypted data
 */
export async function decryptFromStorage(
  encryptedData: string,
): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  try {
    const encrypted: EncryptedData = JSON.parse(
      Buffer.from(encryptedData, 'base64').toString('utf8'),
    );
    return await decryptData(encrypted, encryptionKey);
  } catch (error) {
    throw new Error(
      `Storage decryption failed: ${error instanceof Error ? error.message : 'Invalid data format'}`,
    );
  }
}

/**
 * Hash sensitive data (one-way, for verification purposes)
 * @param data - Data to hash
 * @param salt - Optional salt (generates random if not provided)
 * @returns Object with hash and salt
 */
export function hashData(
  data: string,
  salt?: string,
): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(32).toString('hex');
  const { createHash } = require('crypto');
  const hash = createHash('sha256')
    .update(data + actualSalt)
    .digest('hex');

  return {
    hash,
    salt: actualSalt,
  };
}

/**
 * Verify hashed data
 * @param data - Original data to verify
 * @param hash - Hash to compare against
 * @param salt - Salt used in original hash
 * @returns boolean - Whether the data matches
 */
export function verifyHashedData(
  data: string,
  hash: string,
  salt: string,
): boolean {
  const { hash: computedHash } = hashData(data, salt);
  return computedHash === hash;
}
