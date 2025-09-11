/**
 * Guest Data Validation Engine - WS-151
 * Team C - Batch 13: Comprehensive validation with detailed error reporting
 *
 * Features:
 * - Guest data validation rules
 * - Email and phone number validation
 * - Address normalization
 * - Duplicate detection algorithms
 * - CSV content parsing and validation
 * - Detailed error reporting with suggestions
 */

import { createClient } from '@/lib/supabase/server';

export interface GuestValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: GuestValidationError[];
  warnings: GuestValidationError[];
  duplicates: DuplicateGuest[];
  statistics: ValidationStatistics;
}

export interface DuplicateGuest {
  row: number;
  field: 'email' | 'phone' | 'full_name';
  value: string;
  matchedGuestId?: string;
  matchedGuestName?: string;
  confidenceScore: number;
}

export interface ValidationStatistics {
  totalRows: number;
  validRows: number;
  rowsWithWarnings: number;
  rowsWithErrors: number;
  duplicatesFound: number;
  missingRequiredFields: number;
  invalidEmails: number;
  invalidPhones: number;
  emptyRows: number;
  nameVariations: number;
}

export interface GuestData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  dietary_requirements?: string;
  plus_one?: boolean;
  plus_one_name?: string;
  rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'tentative';
  table_assignment?: string;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  row_number: number;
}

export class GuestValidator {
  private supabase = createClient();

  // Common email domain typos for correction suggestions
  private readonly emailDomainCorrections: Record<string, string> = {
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmil.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
  };

  // Phone number country codes and formats
  private readonly phoneFormats = [
    {
      country: 'US',
      pattern: /^(\+?1)?[\s\-]?(\d{3})[\s\-]?(\d{3})[\s\-]?(\d{4})$/,
      format: '+1 ($2) $3-$4',
    },
    {
      country: 'UK',
      pattern: /^(\+?44)?[\s\-]?(\d{4})[\s\-]?(\d{6})$/,
      format: '+44 $2 $3',
    },
    {
      country: 'CA',
      pattern: /^(\+?1)?[\s\-]?(\d{3})[\s\-]?(\d{3})[\s\-]?(\d{4})$/,
      format: '+1 ($2) $3-$4',
    },
  ];

  // Common name variations for duplicate detection
  private readonly nameVariations: Record<string, string[]> = {
    robert: ['bob', 'rob', 'bobby'],
    william: ['bill', 'billy', 'will', 'willy'],
    richard: ['rick', 'ricky', 'dick'],
    james: ['jim', 'jimmy', 'jamie'],
    michael: ['mike', 'micky'],
    christopher: ['chris', 'christie'],
    matthew: ['matt', 'matty'],
    andrew: ['andy', 'drew'],
    joshua: ['josh'],
    daniel: ['dan', 'danny'],
    elizabeth: ['liz', 'beth', 'betty', 'eliza'],
    jennifer: ['jen', 'jenny', 'jenni'],
    jessica: ['jess', 'jessy'],
    margaret: ['maggie', 'peggy', 'meg'],
    patricia: ['pat', 'patty', 'tricia'],
    linda: ['lynn', 'lindy'],
    barbara: ['barb', 'barbie'],
    susan: ['sue', 'susie', 'suzy'],
    karen: ['kare', 'karrie'],
    nancy: ['nan', 'nance'],
  };

  /**
   * Validate a batch of guest data
   */
  async validateGuestBatch(
    guestData: GuestData[],
    clientId: string,
    checkExistingGuests: boolean = true,
  ): Promise<ValidationResult> {
    const errors: GuestValidationError[] = [];
    const warnings: GuestValidationError[] = [];
    const duplicates: DuplicateGuest[] = [];

    const statistics: ValidationStatistics = {
      totalRows: guestData.length,
      validRows: 0,
      rowsWithWarnings: 0,
      rowsWithErrors: 0,
      duplicatesFound: 0,
      missingRequiredFields: 0,
      invalidEmails: 0,
      invalidPhones: 0,
      emptyRows: 0,
      nameVariations: 0,
    };

    // Check for duplicates within the import data
    const internalDuplicates = this.findInternalDuplicates(guestData);
    duplicates.push(...internalDuplicates);
    statistics.duplicatesFound += internalDuplicates.length;

    // Check against existing guests if requested
    if (checkExistingGuests) {
      const existingDuplicates = await this.findExistingDuplicates(
        guestData,
        clientId,
      );
      duplicates.push(...existingDuplicates);
      statistics.duplicatesFound += existingDuplicates.length;
    }

    // Validate each guest row
    for (let i = 0; i < guestData.length; i++) {
      const guest = guestData[i];
      const rowErrors: GuestValidationError[] = [];
      const rowWarnings: GuestValidationError[] = [];

      // Check for empty rows
      if (this.isEmptyRow(guest)) {
        statistics.emptyRows++;
        rowWarnings.push({
          row: guest.row_number,
          field: 'row',
          value: '',
          message: 'Empty row detected',
          severity: 'warning',
          code: 'EMPTY_ROW',
          suggestion: 'Remove empty rows or add guest data',
        });
      } else {
        // Required field validation
        const requiredErrors = this.validateRequiredFields(guest);
        if (requiredErrors.length > 0) {
          rowErrors.push(...requiredErrors);
          statistics.missingRequiredFields++;
        }

        // Name validation and normalization
        const nameValidation = this.validateAndNormalizeName(guest);
        rowWarnings.push(...nameValidation.warnings);
        if (nameValidation.hasVariations) {
          statistics.nameVariations++;
        }

        // Email validation
        if (guest.email) {
          const emailValidation = this.validateEmail(
            guest.email,
            guest.row_number,
          );
          if (emailValidation) {
            if (emailValidation.severity === 'error') {
              rowErrors.push(emailValidation);
              statistics.invalidEmails++;
            } else {
              rowWarnings.push(emailValidation);
            }
          }
        }

        // Phone validation
        if (guest.phone) {
          const phoneValidation = this.validateAndNormalizePhone(
            guest.phone,
            guest.row_number,
          );
          if (phoneValidation.error) {
            if (phoneValidation.error.severity === 'error') {
              rowErrors.push(phoneValidation.error);
              statistics.invalidPhones++;
            } else {
              rowWarnings.push(phoneValidation.error);
            }
          }
          // Update normalized phone back to guest object
          if (phoneValidation.normalizedPhone) {
            guest.phone = phoneValidation.normalizedPhone;
          }
        }

        // Dietary requirements validation
        if (guest.dietary_requirements) {
          const dietaryWarnings = this.validateDietaryRequirements(
            guest.dietary_requirements,
            guest.row_number,
          );
          rowWarnings.push(...dietaryWarnings);
        }

        // RSVP status validation
        if (guest.rsvp_status) {
          const rsvpValidation = this.validateRsvpStatus(
            guest.rsvp_status,
            guest.row_number,
          );
          if (rsvpValidation) {
            rowWarnings.push(rsvpValidation);
          }
        }

        // Plus one validation
        if (guest.plus_one && !guest.plus_one_name) {
          rowWarnings.push({
            row: guest.row_number,
            field: 'plus_one_name',
            value: guest.plus_one_name,
            message:
              'Guest marked as bringing plus one but no plus one name provided',
            severity: 'warning',
            code: 'MISSING_PLUS_ONE_NAME',
            suggestion: 'Add plus one name or uncheck plus one option',
          });
        }

        // Address normalization
        if (guest.address) {
          const addressNormalization = this.normalizeAddress(guest);
          rowWarnings.push(...addressNormalization.warnings);
        }
      }

      // Update statistics
      if (rowErrors.length === 0 && rowWarnings.length === 0) {
        statistics.validRows++;
      } else if (rowErrors.length > 0) {
        statistics.rowsWithErrors++;
      } else if (rowWarnings.length > 0) {
        statistics.rowsWithWarnings++;
      }

      errors.push(...rowErrors);
      warnings.push(...rowWarnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      duplicates,
      statistics,
    };
  }

  /**
   * Check if a row is empty
   */
  private isEmptyRow(guest: GuestData): boolean {
    const fields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'dietary_requirements',
      'plus_one_name',
      'notes',
    ];
    return fields.every((field) => {
      const value = (guest as any)[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
  }

  /**
   * Validate required fields for guest data
   */
  private validateRequiredFields(guest: GuestData): GuestValidationError[] {
    const errors: GuestValidationError[] = [];

    // At least one of: first_name, last_name, or email must be present
    const hasFirstName = guest.first_name && guest.first_name.trim();
    const hasLastName = guest.last_name && guest.last_name.trim();
    const hasEmail = guest.email && guest.email.trim();

    if (!hasFirstName && !hasLastName && !hasEmail) {
      errors.push({
        row: guest.row_number,
        field: 'required',
        value: '',
        message:
          'At least first name, last name, or email address must be provided',
        severity: 'error',
        code: 'MISSING_REQUIRED_FIELDS',
        suggestion: 'Add guest name or email address',
      });
    }

    return errors;
  }

  /**
   * Validate and normalize guest names
   */
  private validateAndNormalizeName(guest: GuestData): {
    warnings: GuestValidationError[];
    hasVariations: boolean;
  } {
    const warnings: GuestValidationError[] = [];
    let hasVariations = false;

    // Normalize name capitalization
    if (guest.first_name) {
      const normalized = this.normalizeName(guest.first_name);
      if (normalized !== guest.first_name) {
        guest.first_name = normalized;
        warnings.push({
          row: guest.row_number,
          field: 'first_name',
          value: guest.first_name,
          message: 'First name capitalization normalized',
          severity: 'info',
          code: 'NAME_NORMALIZED',
        });
      }

      // Check for common name variations
      const variations = this.getNameVariations(guest.first_name.toLowerCase());
      if (variations.length > 0) {
        hasVariations = true;
        warnings.push({
          row: guest.row_number,
          field: 'first_name',
          value: guest.first_name,
          message: `Potential name variations detected: ${variations.join(', ')}`,
          severity: 'info',
          code: 'NAME_VARIATIONS',
          suggestion: 'Check for potential duplicate guests with similar names',
        });
      }
    }

    if (guest.last_name) {
      const normalized = this.normalizeName(guest.last_name);
      if (normalized !== guest.last_name) {
        guest.last_name = normalized;
        warnings.push({
          row: guest.row_number,
          field: 'last_name',
          value: guest.last_name,
          message: 'Last name capitalization normalized',
          severity: 'info',
          code: 'NAME_NORMALIZED',
        });
      }
    }

    if (guest.plus_one_name) {
      const normalized = this.normalizeName(guest.plus_one_name);
      if (normalized !== guest.plus_one_name) {
        guest.plus_one_name = normalized;
      }
    }

    return { warnings, hasVariations };
  }

  /**
   * Normalize name capitalization
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => {
        // Handle hyphenated names
        if (part.includes('-')) {
          return part
            .split('-')
            .map(
              (subPart) =>
                subPart.charAt(0).toUpperCase() +
                subPart.slice(1).toLowerCase(),
            )
            .join('-');
        }
        // Handle names with apostrophes (O'Connor, D'Angelo)
        if (part.includes("'")) {
          const parts = part.split("'");
          return (
            parts[0].charAt(0).toUpperCase() +
            parts[0].slice(1).toLowerCase() +
            "'" +
            parts[1].charAt(0).toUpperCase() +
            parts[1].slice(1).toLowerCase()
          );
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Get name variations for duplicate detection
   */
  private getNameVariations(name: string): string[] {
    const lowerName = name.toLowerCase().trim();
    return this.nameVariations[lowerName] || [];
  }

  /**
   * Validate email address with detailed error reporting
   */
  private validateEmail(
    email: string,
    rowNumber: number,
  ): GuestValidationError | null {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return null;

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return {
        row: rowNumber,
        field: 'email',
        value: email,
        message: 'Invalid email format',
        severity: 'error',
        code: 'INVALID_EMAIL_FORMAT',
        suggestion: 'Check for missing @ symbol, spaces, or invalid characters',
      };
    }

    // Check for common domain typos
    const domain = trimmedEmail.split('@')[1];
    const correction = this.emailDomainCorrections[domain];
    if (correction) {
      return {
        row: rowNumber,
        field: 'email',
        value: email,
        message: `Possible typo in email domain. Did you mean "${trimmedEmail.replace(domain, correction)}"?`,
        severity: 'warning',
        code: 'EMAIL_DOMAIN_TYPO',
        suggestion: `Consider correcting to: ${trimmedEmail.replace(domain, correction)}`,
      };
    }

    // Check for suspicious patterns
    if (
      trimmedEmail.includes('..') ||
      trimmedEmail.startsWith('.') ||
      trimmedEmail.endsWith('.')
    ) {
      return {
        row: rowNumber,
        field: 'email',
        value: email,
        message:
          'Email contains suspicious patterns (consecutive dots or leading/trailing dots)',
        severity: 'warning',
        code: 'SUSPICIOUS_EMAIL_PATTERN',
        suggestion: 'Verify email address is correct',
      };
    }

    return null;
  }

  /**
   * Validate and normalize phone number
   */
  private validateAndNormalizePhone(
    phone: string,
    rowNumber: number,
  ): {
    error: GuestValidationError | null;
    normalizedPhone: string | null;
  } {
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      return { error: null, normalizedPhone: null };
    }

    // Remove all non-digit characters except +
    const digitsOnly = trimmedPhone.replace(/[^\d+]/g, '');

    // Check minimum and maximum length
    if (digitsOnly.length < 10) {
      return {
        error: {
          row: rowNumber,
          field: 'phone',
          value: phone,
          message: `Phone number too short (${digitsOnly.length} digits). Minimum 10 digits required.`,
          severity: 'error',
          code: 'PHONE_TOO_SHORT',
          suggestion: 'Add missing digits or country code',
        },
        normalizedPhone: null,
      };
    }

    if (digitsOnly.length > 15) {
      return {
        error: {
          row: rowNumber,
          field: 'phone',
          value: phone,
          message: `Phone number too long (${digitsOnly.length} digits). Maximum 15 digits allowed.`,
          severity: 'error',
          code: 'PHONE_TOO_LONG',
          suggestion: 'Remove extra digits',
        },
        normalizedPhone: null,
      };
    }

    // Try to format according to known patterns
    for (const format of this.phoneFormats) {
      const match = trimmedPhone.match(format.pattern);
      if (match) {
        const formatted = format.format.replace(
          /\$(\d+)/g,
          (_, num) => match[parseInt(num)] || '',
        );
        return {
          error: null,
          normalizedPhone: formatted,
        };
      }
    }

    // If no specific format matched, return a generic formatted version
    if (digitsOnly.length === 10) {
      const formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      return {
        error: {
          row: rowNumber,
          field: 'phone',
          value: phone,
          message: 'Phone number format normalized to US format',
          severity: 'info',
          code: 'PHONE_NORMALIZED',
        },
        normalizedPhone: formatted,
      };
    }

    return {
      error: {
        row: rowNumber,
        field: 'phone',
        value: phone,
        message: 'Unrecognized phone number format',
        severity: 'warning',
        code: 'UNRECOGNIZED_PHONE_FORMAT',
        suggestion: 'Verify phone number format and country code',
      },
      normalizedPhone: digitsOnly,
    };
  }

  /**
   * Validate dietary requirements
   */
  private validateDietaryRequirements(
    dietary: string,
    rowNumber: number,
  ): GuestValidationError[] {
    const warnings: GuestValidationError[] = [];
    const trimmed = dietary.trim();

    // Check for common allergens and dietary restrictions
    const commonDietary = [
      'vegetarian',
      'vegan',
      'gluten-free',
      'dairy-free',
      'nut allergy',
      'shellfish allergy',
      'kosher',
      'halal',
      'pescatarian',
      'no pork',
      'lactose intolerant',
      'diabetic',
      'low sodium',
      'keto',
    ];

    const normalized = trimmed.toLowerCase();
    let foundMatch = false;

    for (const common of commonDietary) {
      if (normalized.includes(common.toLowerCase())) {
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch && trimmed.length > 0) {
      warnings.push({
        row: rowNumber,
        field: 'dietary_requirements',
        value: dietary,
        message: 'Unusual dietary requirement detected',
        severity: 'info',
        code: 'UNUSUAL_DIETARY',
        suggestion: 'Verify this dietary requirement is accurate',
      });
    }

    return warnings;
  }

  /**
   * Validate RSVP status
   */
  private validateRsvpStatus(
    status: string,
    rowNumber: number,
  ): GuestValidationError | null {
    const validStatuses = [
      'pending',
      'attending',
      'not_attending',
      'tentative',
    ];
    const normalized = status.toLowerCase().trim();

    if (!validStatuses.includes(normalized)) {
      return {
        row: rowNumber,
        field: 'rsvp_status',
        value: status,
        message: `Invalid RSVP status. Must be one of: ${validStatuses.join(', ')}`,
        severity: 'warning',
        code: 'INVALID_RSVP_STATUS',
        suggestion: `Use one of: ${validStatuses.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * Normalize address information
   */
  private normalizeAddress(guest: GuestData): {
    warnings: GuestValidationError[];
  } {
    const warnings: GuestValidationError[] = [];

    if (guest.address) {
      // Basic address normalization
      const normalized = guest.address
        .replace(/\b(st|ST)\b/g, 'Street')
        .replace(/\b(ave|AVE)\b/g, 'Avenue')
        .replace(/\b(blvd|BLVD)\b/g, 'Boulevard')
        .replace(/\b(dr|DR)\b/g, 'Drive')
        .replace(/\b(ct|CT)\b/g, 'Court')
        .replace(/\b(ln|LN)\b/g, 'Lane')
        .replace(/\b(rd|RD)\b/g, 'Road')
        .trim();

      if (normalized !== guest.address) {
        guest.address = normalized;
        warnings.push({
          row: guest.row_number,
          field: 'address',
          value: guest.address,
          message: 'Address normalized (street abbreviations expanded)',
          severity: 'info',
          code: 'ADDRESS_NORMALIZED',
        });
      }
    }

    // Validate ZIP code format
    if (guest.zip_code) {
      const zipPattern = /^\d{5}(-\d{4})?$/;
      if (!zipPattern.test(guest.zip_code.trim())) {
        warnings.push({
          row: guest.row_number,
          field: 'zip_code',
          value: guest.zip_code,
          message:
            'ZIP code format may be invalid (expected: 12345 or 12345-6789)',
          severity: 'warning',
          code: 'INVALID_ZIP_FORMAT',
          suggestion: 'Use 5-digit ZIP code or ZIP+4 format',
        });
      }
    }

    return { warnings };
  }

  /**
   * Find duplicate guests within the import data
   */
  private findInternalDuplicates(guestData: GuestData[]): DuplicateGuest[] {
    const duplicates: DuplicateGuest[] = [];
    const emailMap = new Map<string, number[]>();
    const phoneMap = new Map<string, number[]>();
    const nameMap = new Map<string, number[]>();

    // Build maps
    guestData.forEach((guest, index) => {
      if (guest.email) {
        const email = guest.email.toLowerCase().trim();
        if (!emailMap.has(email)) emailMap.set(email, []);
        emailMap.get(email)!.push(index);
      }

      if (guest.phone) {
        const phone = guest.phone.replace(/[^\d]/g, '');
        if (!phoneMap.has(phone)) phoneMap.set(phone, []);
        phoneMap.get(phone)!.push(index);
      }

      if (guest.first_name && guest.last_name) {
        const fullName = `${guest.first_name.toLowerCase().trim()} ${guest.last_name.toLowerCase().trim()}`;
        if (!nameMap.has(fullName)) nameMap.set(fullName, []);
        nameMap.get(fullName)!.push(index);
      }
    });

    // Find duplicates
    emailMap.forEach((indices, email) => {
      if (indices.length > 1) {
        indices.forEach((index) => {
          duplicates.push({
            row: guestData[index].row_number,
            field: 'email',
            value: email,
            confidenceScore: 100,
          });
        });
      }
    });

    phoneMap.forEach((indices, phone) => {
      if (indices.length > 1) {
        indices.forEach((index) => {
          duplicates.push({
            row: guestData[index].row_number,
            field: 'phone',
            value: phone,
            confidenceScore: 95,
          });
        });
      }
    });

    nameMap.forEach((indices, name) => {
      if (indices.length > 1) {
        indices.forEach((index) => {
          duplicates.push({
            row: guestData[index].row_number,
            field: 'full_name',
            value: name,
            confidenceScore: 85,
          });
        });
      }
    });

    return duplicates;
  }

  /**
   * Find duplicates against existing guests in database
   */
  private async findExistingDuplicates(
    guestData: GuestData[],
    clientId: string,
  ): Promise<DuplicateGuest[]> {
    const duplicates: DuplicateGuest[] = [];

    try {
      const emails = guestData.map((g) => g.email).filter(Boolean);
      const phones = guestData
        .map((g) => g.phone?.replace(/[^\d]/g, ''))
        .filter(Boolean);

      // Check email duplicates
      if (emails.length > 0) {
        const { data: existingGuests } = await this.supabase
          .from('guests')
          .select('id, email, first_name, last_name')
          .eq('client_id', clientId)
          .in('email', emails);

        if (existingGuests) {
          guestData.forEach((guest) => {
            if (guest.email) {
              const match = existingGuests.find(
                (existing) =>
                  existing.email?.toLowerCase() === guest.email?.toLowerCase(),
              );
              if (match) {
                duplicates.push({
                  row: guest.row_number,
                  field: 'email',
                  value: guest.email,
                  matchedGuestId: match.id,
                  matchedGuestName:
                    `${match.first_name} ${match.last_name}`.trim(),
                  confidenceScore: 100,
                });
              }
            }
          });
        }
      }

      // Check phone duplicates
      if (phones.length > 0) {
        const { data: existingGuests } = await this.supabase
          .from('guests')
          .select('id, phone, first_name, last_name')
          .eq('client_id', clientId);

        if (existingGuests) {
          guestData.forEach((guest) => {
            if (guest.phone) {
              const guestPhone = guest.phone.replace(/[^\d]/g, '');
              const match = existingGuests.find((existing) => {
                if (!existing.phone) return false;
                const existingPhone = existing.phone.replace(/[^\d]/g, '');
                return existingPhone === guestPhone;
              });

              if (match) {
                duplicates.push({
                  row: guest.row_number,
                  field: 'phone',
                  value: guest.phone,
                  matchedGuestId: match.id,
                  matchedGuestName:
                    `${match.first_name} ${match.last_name}`.trim(),
                  confidenceScore: 95,
                });
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking for existing duplicates:', error);
    }

    return duplicates;
  }
}

/**
 * CSV Content Parser
 */
export function parseCSVContent(csvText: string): GuestData[] {
  const lines = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const dataRows = lines.slice(1);

  return dataRows.map((line, index) => {
    const values = parseCSVLine(line);
    const guest: GuestData = { row_number: index + 2 };

    values.forEach((value, cellIndex) => {
      const header = headers[cellIndex];
      if (!header || !value.trim()) return;

      switch (header) {
        case 'first name':
        case 'first_name':
        case 'firstname':
        case 'fname':
          guest.first_name = value.trim();
          break;
        case 'last name':
        case 'last_name':
        case 'lastname':
        case 'lname':
        case 'surname':
          guest.last_name = value.trim();
          break;
        case 'email':
        case 'email address':
        case 'email_address':
          guest.email = value.trim().toLowerCase();
          break;
        case 'phone':
        case 'phone number':
        case 'phone_number':
        case 'mobile':
        case 'cell':
          guest.phone = value.trim();
          break;
        case 'dietary requirements':
        case 'dietary_requirements':
        case 'dietary':
        case 'allergies':
        case 'special dietary needs':
          guest.dietary_requirements = value.trim();
          break;
        case 'plus one':
        case 'plus_one':
        case '+1':
        case 'bring guest':
          guest.plus_one = ['true', '1', 'yes', 'y'].includes(
            value.toLowerCase().trim(),
          );
          break;
        case 'plus one name':
        case 'plus_one_name':
        case '+1 name':
        case 'guest name':
          guest.plus_one_name = value.trim();
          break;
        case 'rsvp':
        case 'rsvp status':
        case 'rsvp_status':
        case 'attendance':
          const rsvpValue = value.toLowerCase().trim();
          if (rsvpValue.includes('attend') && !rsvpValue.includes('not')) {
            guest.rsvp_status = 'attending';
          } else if (
            rsvpValue.includes('not') ||
            rsvpValue.includes('decline')
          ) {
            guest.rsvp_status = 'not_attending';
          } else if (
            rsvpValue.includes('tentative') ||
            rsvpValue.includes('maybe')
          ) {
            guest.rsvp_status = 'tentative';
          } else {
            guest.rsvp_status = 'pending';
          }
          break;
        case 'table':
        case 'table assignment':
        case 'table_assignment':
        case 'table number':
          guest.table_assignment = value.trim();
          break;
        case 'notes':
        case 'comments':
        case 'special notes':
        case 'remarks':
          guest.notes = value.trim();
          break;
        case 'address':
          guest.address = value.trim();
          break;
        case 'city':
          guest.city = value.trim();
          break;
        case 'state':
          guest.state = value.trim();
          break;
        case 'zip':
        case 'zip code':
        case 'zip_code':
        case 'postal code':
          guest.zip_code = value.trim();
          break;
      }
    });

    return guest;
  });
}

/**
 * Parse a single CSV line, handling quotes and commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * File validation utility
 */
export function validateFile(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];

  if (file.size > maxSize) {
    errors.push(
      `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 10MB.`,
    );
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(
      `Invalid file type (${extension}). Only CSV and Excel files are allowed.`,
    );
  }

  return { valid: errors.length === 0, errors };
}

// Export singleton instance
export const guestValidator = new GuestValidator();
