/**
 * Encryption Service Adapter for AI Optimization System
 * Provides simple encrypt/decrypt functions for AI cache security
 */

import { createHash, randomBytes, createCipher, createDecipher } from 'crypto';

const ENCRYPTION_KEY =
  process.env.AI_CACHE_ENCRYPTION_KEY || 'default-key-for-development-only';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt text data for AI cache storage
 * @param text Text to encrypt
 * @returns Encrypted string
 */
export function encrypt(text: string): string {
  try {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const cipher = createCipher(ALGORITHM, ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text on error to prevent data loss
  }
}

/**
 * Decrypt text data from AI cache storage
 * @param encryptedText Encrypted text to decrypt
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText;
    }

    const decipher = createDecipher(ALGORITHM, ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return original text on error to prevent data loss
  }
}

/**
 * Generate a secure hash for data integrity checking
 * @param data Data to hash
 * @returns SHA-256 hash
 */
export function generateHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random key
 * @param length Key length in bytes
 * @returns Random key as hex string
 */
export function generateSecureKey(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
