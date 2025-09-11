/**
 * Enterprise Wedding PDF Processing Helper Methods
 *
 * This file contains specialized helper methods for wedding guest list processing,
 * optimized for enterprise-scale operations during wedding season.
 */

import {
  GuestRecord,
  ExtractedField,
  WeddingProcessingMetadata,
} from './optimized-processor';
import { DatabaseOptimizer } from '@/lib/database-optimizer';

/**
 * Wedding season detection
 */
export function isWeddingSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 4 && month <= 10; // April through October
}

/**
 * Determine processing priority based on workload and context
 */
export function determineProcessingPriority(
  pageCount: number,
  expectedGuestCount: number,
  userPriority?: 'low' | 'medium' | 'high' | 'urgent',
): 'low' | 'medium' | 'high' | 'urgent' {
  if (userPriority) return userPriority;

  // Auto-determine priority based on scale and season
  const isWeddingSeasonActive = isWeddingSeason();

  if (expectedGuestCount > 500 || pageCount > 50) {
    return isWeddingSeasonActive ? 'urgent' : 'high';
  }

  if (expectedGuestCount > 200 || pageCount > 20) {
    return isWeddingSeasonActive ? 'high' : 'medium';
  }

  return isWeddingSeasonActive ? 'medium' : 'low';
}

/**
 * Create optimized chunks based on processing priority
 */
export function createOptimizedChunks(
  totalPages: number,
  baseChunkSize: number,
  priority: 'low' | 'medium' | 'high' | 'urgent',
): number[][] {
  // Adjust chunk size based on priority
  const priorityMultiplier = {
    low: 0.5,
    medium: 1,
    high: 1.5,
    urgent: 2,
  };

  const chunkSize = Math.ceil(baseChunkSize * priorityMultiplier[priority]);
  const chunks: number[][] = [];

  for (let i = 1; i <= totalPages; i += chunkSize) {
    const chunk = [];
    for (let j = 0; j < chunkSize && i + j <= totalPages; j++) {
      chunk.push(i + j);
    }
    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Extract guest records from processed fields
 */
export async function extractGuestRecordsFromChunk(
  fields: ExtractedField[],
  startPageNumber: number,
): Promise<GuestRecord[]> {
  const guestRecords: GuestRecord[] = [];
  const currentGuest: Partial<GuestRecord> = {};

  // Group fields by potential guest records
  const guestGroups = groupFieldsByGuest(fields);

  for (const group of guestGroups) {
    const guestRecord = await buildGuestRecordFromFields(
      group,
      startPageNumber,
    );
    if (guestRecord) {
      guestRecords.push(guestRecord);
    }
  }

  return guestRecords;
}

/**
 * Group fields that belong to the same guest
 */
function groupFieldsByGuest(fields: ExtractedField[]): ExtractedField[][] {
  const groups: ExtractedField[][] = [];
  let currentGroup: ExtractedField[] = [];

  fields.forEach((field, index) => {
    // Detect potential guest record boundaries
    if (isGuestRecordStart(field)) {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
      }
      currentGroup = [field];
    } else if (isGuestField(field)) {
      currentGroup.push(field);
    }

    // End of fields or major gap indicates record boundary
    if (index === fields.length - 1 || hasFieldGap(field, fields[index + 1])) {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
    }
  });

  return groups.filter((group) => group.length > 0);
}

/**
 * Check if field indicates start of new guest record
 */
function isGuestRecordStart(field: ExtractedField): boolean {
  const label = field.label.toLowerCase();
  return (
    label.includes('name') ||
    label.includes('guest') ||
    label.includes('first name') ||
    label.includes('lastName') ||
    (field.type === 'text' && field.value.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/))
  );
}

/**
 * Check if field is guest-related
 */
function isGuestField(field: ExtractedField): boolean {
  const label = field.label.toLowerCase();
  const guestFieldKeywords = [
    'name',
    'email',
    'phone',
    'address',
    'guest',
    'plus',
    'dietary',
    'table',
    'rsvp',
    'ceremony',
    'reception',
    'contact',
    'mobile',
  ];

  return guestFieldKeywords.some((keyword) => label.includes(keyword));
}

/**
 * Check for significant gap between fields (indicates new record)
 */
function hasFieldGap(field1: ExtractedField, field2: ExtractedField): boolean {
  if (!field2) return true;
  return field2.pageNumber !== field1.pageNumber;
}

/**
 * Build guest record from grouped fields
 */
async function buildGuestRecordFromFields(
  fields: ExtractedField[],
  pageNumber: number,
): Promise<GuestRecord | null> {
  if (fields.length === 0) return null;

  const guestRecord: GuestRecord = {
    id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    firstName: '',
    lastName: '',
    confidence: 0,
    pageNumber,
    sourceFields: fields.map((f) => f.id),
    validationErrors: [],
  };

  // Extract values from fields
  for (const field of fields) {
    const label = field.label.toLowerCase();
    const value = field.value.trim();

    if (label.includes('first') || label.includes('given')) {
      guestRecord.firstName = value;
    } else if (
      label.includes('last') ||
      label.includes('surname') ||
      label.includes('family')
    ) {
      guestRecord.lastName = value;
    } else if (label.includes('email') || field.type === 'email') {
      guestRecord.email = value;
    } else if (
      label.includes('phone') ||
      label.includes('mobile') ||
      field.type === 'phone'
    ) {
      guestRecord.phone = value;
    } else if (label.includes('address') || field.type === 'address') {
      guestRecord.address = value;
    } else if (label.includes('dietary')) {
      guestRecord.dietaryRestrictions = value;
    } else if (label.includes('table')) {
      guestRecord.tableNumber = value;
    } else if (
      label.includes('plus') &&
      (value.toLowerCase().includes('yes') ||
        value.toLowerCase().includes('true'))
    ) {
      guestRecord.plusOne = true;
    } else if (label.includes('rsvp')) {
      guestRecord.rsvpStatus = mapRSVPStatus(value);
    } else if (
      label.includes('name') &&
      !guestRecord.firstName &&
      !guestRecord.lastName
    ) {
      // Try to split full name
      const nameParts = value.split(' ');
      if (nameParts.length >= 2) {
        guestRecord.firstName = nameParts[0];
        guestRecord.lastName = nameParts.slice(1).join(' ');
      }
    }
  }

  // Calculate confidence based on completeness and field confidence
  const fieldConfidences = fields.map((f) => f.confidence);
  const avgFieldConfidence =
    fieldConfidences.reduce((sum, conf) => sum + conf, 0) /
    fieldConfidences.length;
  const completenessScore = calculateCompletenessScore(guestRecord);
  guestRecord.confidence = (avgFieldConfidence + completenessScore) / 2;

  // Validate guest record
  const validationErrors = validateGuestRecord(guestRecord);
  guestRecord.validationErrors = validationErrors;

  // Only return if we have at least a name
  if (!guestRecord.firstName && !guestRecord.lastName) {
    return null;
  }

  return guestRecord;
}

/**
 * Map RSVP status from text
 */
function mapRSVPStatus(value: string): 'pending' | 'accepted' | 'declined' {
  const lowerValue = value.toLowerCase();
  if (
    lowerValue.includes('accept') ||
    lowerValue.includes('yes') ||
    lowerValue.includes('attending')
  ) {
    return 'accepted';
  }
  if (
    lowerValue.includes('decline') ||
    lowerValue.includes('no') ||
    lowerValue.includes('not attending')
  ) {
    return 'declined';
  }
  return 'pending';
}

/**
 * Calculate completeness score for guest record
 */
function calculateCompletenessScore(guest: GuestRecord): number {
  let score = 0;
  let maxScore = 0;

  // Essential fields
  if (guest.firstName) {
    score += 30;
  }
  maxScore += 30;

  if (guest.lastName) {
    score += 30;
  }
  maxScore += 30;

  // Important fields
  if (guest.email) {
    score += 20;
  }
  maxScore += 20;

  if (guest.phone) {
    score += 15;
  }
  maxScore += 15;

  // Optional fields
  if (guest.address) {
    score += 3;
  }
  maxScore += 3;

  if (guest.rsvpStatus && guest.rsvpStatus !== 'pending') {
    score += 2;
  }
  maxScore += 2;

  return score / maxScore;
}

/**
 * Validate guest record and return errors
 */
function validateGuestRecord(guest: GuestRecord): string[] {
  const errors: string[] = [];

  if (!guest.firstName) {
    errors.push('Missing first name');
  }

  if (!guest.lastName) {
    errors.push('Missing last name');
  }

  if (guest.email && !isValidEmail(guest.email)) {
    errors.push('Invalid email format');
  }

  if (guest.phone && !isValidPhone(guest.phone)) {
    errors.push('Invalid phone format');
  }

  return errors;
}

/**
 * Email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone validation (flexible for international formats)
 */
function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

/**
 * Deduplicate guest records using intelligent matching
 */
export async function deduplicateGuestRecords(
  guests: GuestRecord[],
): Promise<{ deduplicatedGuests: GuestRecord[]; duplicateCount: number }> {
  const deduplicatedGuests: GuestRecord[] = [];
  const duplicates: GuestRecord[] = [];

  for (const guest of guests) {
    const existingGuest = findDuplicateGuest(guest, deduplicatedGuests);

    if (existingGuest) {
      // Merge information from duplicate
      const mergedGuest = mergeGuestRecords(existingGuest, guest);
      const existingIndex = deduplicatedGuests.indexOf(existingGuest);
      deduplicatedGuests[existingIndex] = mergedGuest;
      duplicates.push(guest);
    } else {
      deduplicatedGuests.push(guest);
    }
  }

  return {
    deduplicatedGuests,
    duplicateCount: duplicates.length,
  };
}

/**
 * Find duplicate guest using similarity matching
 */
function findDuplicateGuest(
  guest: GuestRecord,
  existingGuests: GuestRecord[],
): GuestRecord | null {
  for (const existing of existingGuests) {
    if (isGuestDuplicate(guest, existing)) {
      return existing;
    }
  }
  return null;
}

/**
 * Check if two guests are duplicates
 */
function isGuestDuplicate(guest1: GuestRecord, guest2: GuestRecord): boolean {
  // Exact name match
  if (
    guest1.firstName.toLowerCase() === guest2.firstName.toLowerCase() &&
    guest1.lastName.toLowerCase() === guest2.lastName.toLowerCase()
  ) {
    return true;
  }

  // Email match
  if (
    guest1.email &&
    guest2.email &&
    guest1.email.toLowerCase() === guest2.email.toLowerCase()
  ) {
    return true;
  }

  // Phone match
  if (guest1.phone && guest2.phone) {
    const phone1 = guest1.phone.replace(/\D/g, '');
    const phone2 = guest2.phone.replace(/\D/g, '');
    if (phone1 === phone2 && phone1.length >= 10) {
      return true;
    }
  }

  // Fuzzy name matching for typos
  const nameScore = calculateNameSimilarity(
    `${guest1.firstName} ${guest1.lastName}`.toLowerCase(),
    `${guest2.firstName} ${guest2.lastName}`.toLowerCase(),
  );

  return nameScore > 0.85; // 85% similarity threshold
}

/**
 * Calculate name similarity using Levenshtein distance
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (name1 === name2) return 1;

  const len1 = name1.length;
  const len2 = name2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(name1, name2);
  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Merge two guest records, keeping the best information
 */
function mergeGuestRecords(
  existing: GuestRecord,
  duplicate: GuestRecord,
): GuestRecord {
  const merged: GuestRecord = { ...existing };

  // Use highest confidence values
  if (duplicate.confidence > existing.confidence) {
    merged.firstName = duplicate.firstName || existing.firstName;
    merged.lastName = duplicate.lastName || existing.lastName;
  }

  // Fill in missing information
  merged.email = merged.email || duplicate.email;
  merged.phone = merged.phone || duplicate.phone;
  merged.address = merged.address || duplicate.address;
  merged.dietaryRestrictions =
    merged.dietaryRestrictions || duplicate.dietaryRestrictions;
  merged.tableNumber = merged.tableNumber || duplicate.tableNumber;
  merged.plusOne = merged.plusOne ?? duplicate.plusOne;
  merged.rsvpStatus =
    merged.rsvpStatus !== 'pending' ? merged.rsvpStatus : duplicate.rsvpStatus;
  merged.invitationType = merged.invitationType || duplicate.invitationType;

  // Merge source fields
  merged.sourceFields = [
    ...new Set([...merged.sourceFields, ...duplicate.sourceFields]),
  ];

  // Use best confidence
  merged.confidence = Math.max(existing.confidence, duplicate.confidence);

  // Merge validation errors (unique only)
  merged.validationErrors = [
    ...new Set([...existing.validationErrors, ...duplicate.validationErrors]),
  ];

  return merged;
}

/**
 * Generate unique processing ID for tracking
 */
export function generateProcessingId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
