/**
 * Data Validation Engine for CSV/Excel Import
 * WS-033: Comprehensive validation with detailed error reporting
 */

import { isAfter, isBefore, isValid, addYears, subYears } from 'date-fns';
import { createClient } from '@/lib/supabase/server';

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  duplicates: DuplicateInfo[];
  statistics: ValidationStatistics;
}

export interface DuplicateInfo {
  row: number;
  field: string;
  value: string;
  matchedClientId?: string;
  matchedClientName?: string;
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
  invalidDates: number;
}

export class ImportValidator {
  private supabase = createClient();

  /**
   * Validate a batch of client data
   */
  async validateBatch(
    data: any[],
    checkExistingClients: boolean = true,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const duplicates: DuplicateInfo[] = [];

    const statistics: ValidationStatistics = {
      totalRows: data.length,
      validRows: 0,
      rowsWithWarnings: 0,
      rowsWithErrors: 0,
      duplicatesFound: 0,
      missingRequiredFields: 0,
      invalidEmails: 0,
      invalidPhones: 0,
      invalidDates: 0,
    };

    // Check for duplicates within the import data
    const internalDuplicates = this.findInternalDuplicates(data);
    duplicates.push(...internalDuplicates);
    statistics.duplicatesFound += internalDuplicates.length;

    // Check against existing clients if requested
    if (checkExistingClients) {
      const existingDuplicates = await this.findExistingDuplicates(data);
      duplicates.push(...existingDuplicates);
      statistics.duplicatesFound += existingDuplicates.length;
    }

    // Validate each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Account for header row and 1-based indexing
      const rowErrors: ValidationError[] = [];
      const rowWarnings: ValidationError[] = [];

      // Required field validation
      const requiredErrors = this.validateRequiredFields(row, rowNum);
      if (requiredErrors.length > 0) {
        rowErrors.push(...requiredErrors);
        statistics.missingRequiredFields++;
      }

      // Email validation
      if (row.email) {
        const emailError = this.validateEmail(row.email, rowNum);
        if (emailError) {
          if (emailError.severity === 'error') {
            rowErrors.push(emailError);
            statistics.invalidEmails++;
          } else {
            rowWarnings.push(emailError);
          }
        }
      }

      // Phone validation
      if (row.phone) {
        const phoneError = this.validatePhone(row.phone, rowNum);
        if (phoneError) {
          if (phoneError.severity === 'error') {
            rowErrors.push(phoneError);
            statistics.invalidPhones++;
          } else {
            rowWarnings.push(phoneError);
          }
        }
      }

      // Wedding date validation
      if (row.wedding_date) {
        const dateError = this.validateWeddingDate(row.wedding_date, rowNum);
        if (dateError) {
          if (dateError.severity === 'error') {
            rowErrors.push(dateError);
            statistics.invalidDates++;
          } else {
            rowWarnings.push(dateError);
          }
        }
      }

      // Guest count validation
      if (row.guest_count) {
        const guestError = this.validateGuestCount(row.guest_count, rowNum);
        if (guestError) {
          rowWarnings.push(guestError);
        }
      }

      // Package price validation
      if (row.package_price) {
        const priceError = this.validatePackagePrice(row.package_price, rowNum);
        if (priceError) {
          rowWarnings.push(priceError);
        }
      }

      // Status validation
      if (row.status) {
        const statusError = this.validateStatus(row.status, rowNum);
        if (statusError) {
          rowWarnings.push(statusError);
        }
      }

      // Priority level validation
      if (row.priority_level) {
        const priorityError = this.validatePriority(row.priority_level, rowNum);
        if (priorityError) {
          rowWarnings.push(priorityError);
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
   * Validate required fields
   */
  private validateRequiredFields(row: any, rowNum: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Either email or couple names must be present
    const hasEmail = row.email && row.email.trim();
    const hasFirstName = row.first_name && row.first_name.trim();
    const hasCoupleNames =
      (row.first_name || row.partner_first_name) &&
      (row.last_name || row.partner_last_name);

    if (!hasEmail && !hasFirstName && !hasCoupleNames) {
      errors.push({
        row: rowNum,
        field: 'required',
        value: '',
        message: 'Either email or client names must be provided',
        severity: 'error',
        suggestion:
          'Add at least an email address or first name for this client',
      });
    }

    return errors;
  }

  /**
   * Validate email address
   */
  private validateEmail(email: string, rowNum: number): ValidationError | null {
    const trimmed = email.trim();

    if (!trimmed) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return {
        row: rowNum,
        field: 'email',
        value: email,
        message: 'Invalid email format',
        severity: 'error',
        suggestion: 'Check for typos or missing @ symbol',
      };
    }

    // Check for common typos
    const commonTypos = [
      'gmial.com',
      'gmai.com',
      'gmil.com', // Gmail typos
      'yahooo.com',
      'yaho.com', // Yahoo typos
      'hotmial.com',
      'hotmai.com', // Hotmail typos
      'outlok.com',
      'outloo.com', // Outlook typos
    ];

    const domain = trimmed.split('@')[1]?.toLowerCase();
    if (domain && commonTypos.some((typo) => domain.includes(typo))) {
      return {
        row: rowNum,
        field: 'email',
        value: email,
        message: 'Possible typo in email domain',
        severity: 'warning',
        suggestion: 'Check the domain name for common typos',
      };
    }

    return null;
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone: string, rowNum: number): ValidationError | null {
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

    if (!cleaned) return null;

    // Check for valid length (10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        row: rowNum,
        field: 'phone',
        value: phone,
        message: `Phone number has ${cleaned.length} digits (expected 10-15)`,
        severity: 'error',
        suggestion: 'Check for missing or extra digits',
      };
    }

    // Check if it contains only digits and optional +
    if (!/^[\+]?[\d]+$/.test(cleaned)) {
      return {
        row: rowNum,
        field: 'phone',
        value: phone,
        message: 'Phone number contains invalid characters',
        severity: 'error',
        suggestion: 'Remove any letters or special characters',
      };
    }

    return null;
  }

  /**
   * Validate wedding date
   */
  private validateWeddingDate(
    date: any,
    rowNum: number,
  ): ValidationError | null {
    if (!date) return null;

    let weddingDate: Date;

    // Handle different date formats
    if (date instanceof Date) {
      weddingDate = date;
    } else if (typeof date === 'string') {
      weddingDate = new Date(date);
    } else {
      return {
        row: rowNum,
        field: 'wedding_date',
        value: date,
        message: 'Invalid date format',
        severity: 'error',
        suggestion: 'Use format like MM/DD/YYYY or YYYY-MM-DD',
      };
    }

    // Check if date is valid
    if (!isValid(weddingDate)) {
      return {
        row: rowNum,
        field: 'wedding_date',
        value: date,
        message: 'Invalid date',
        severity: 'error',
        suggestion: 'Check the date format and values',
      };
    }

    const now = new Date();
    const twoYearsAgo = subYears(now, 2);
    const threeYearsFromNow = addYears(now, 3);

    // Check if date is too far in the past
    if (isBefore(weddingDate, twoYearsAgo)) {
      return {
        row: rowNum,
        field: 'wedding_date',
        value: date,
        message: 'Wedding date is more than 2 years in the past',
        severity: 'warning',
        suggestion: 'Verify this is the correct date',
      };
    }

    // Check if date is too far in the future
    if (isAfter(weddingDate, threeYearsFromNow)) {
      return {
        row: rowNum,
        field: 'wedding_date',
        value: date,
        message: 'Wedding date is more than 3 years in the future',
        severity: 'warning',
        suggestion: 'Verify this is the correct date',
      };
    }

    return null;
  }

  /**
   * Validate guest count
   */
  private validateGuestCount(
    count: any,
    rowNum: number,
  ): ValidationError | null {
    const num = typeof count === 'number' ? count : parseInt(String(count));

    if (isNaN(num)) {
      return {
        row: rowNum,
        field: 'guest_count',
        value: count,
        message: 'Guest count must be a number',
        severity: 'warning',
        suggestion: 'Enter a numeric value',
      };
    }

    if (num < 0) {
      return {
        row: rowNum,
        field: 'guest_count',
        value: count,
        message: 'Guest count cannot be negative',
        severity: 'warning',
        suggestion: 'Enter a positive number',
      };
    }

    if (num > 1000) {
      return {
        row: rowNum,
        field: 'guest_count',
        value: count,
        message: 'Unusually high guest count',
        severity: 'warning',
        suggestion: 'Verify this number is correct',
      };
    }

    return null;
  }

  /**
   * Validate package price
   */
  private validatePackagePrice(
    price: any,
    rowNum: number,
  ): ValidationError | null {
    const num =
      typeof price === 'number'
        ? price
        : parseFloat(String(price).replace(/[$,]/g, ''));

    if (isNaN(num)) {
      return {
        row: rowNum,
        field: 'package_price',
        value: price,
        message: 'Package price must be a number',
        severity: 'warning',
        suggestion: 'Enter a numeric value without currency symbols',
      };
    }

    if (num < 0) {
      return {
        row: rowNum,
        field: 'package_price',
        value: price,
        message: 'Package price cannot be negative',
        severity: 'warning',
        suggestion: 'Enter a positive amount',
      };
    }

    if (num > 100000) {
      return {
        row: rowNum,
        field: 'package_price',
        value: price,
        message: 'Unusually high package price',
        severity: 'warning',
        suggestion: 'Verify this amount is correct',
      };
    }

    return null;
  }

  /**
   * Validate status
   */
  private validateStatus(
    status: string,
    rowNum: number,
  ): ValidationError | null {
    const validStatuses = [
      'lead',
      'inquiry',
      'booked',
      'completed',
      'cancelled',
    ];
    const normalized = status.toLowerCase().trim();

    if (!validStatuses.includes(normalized)) {
      return {
        row: rowNum,
        field: 'status',
        value: status,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        severity: 'warning',
        suggestion: `Change to one of: ${validStatuses.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * Validate priority level
   */
  private validatePriority(
    priority: string,
    rowNum: number,
  ): ValidationError | null {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const normalized = priority.toLowerCase().trim();

    if (!validPriorities.includes(normalized)) {
      return {
        row: rowNum,
        field: 'priority_level',
        value: priority,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
        severity: 'warning',
        suggestion: `Change to one of: ${validPriorities.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * Find duplicates within the import data
   */
  private findInternalDuplicates(data: any[]): DuplicateInfo[] {
    const duplicates: DuplicateInfo[] = [];
    const emailMap = new Map<string, number[]>();
    const phoneMap = new Map<string, number[]>();

    // Build maps of values to row numbers
    data.forEach((row, index) => {
      const rowNum = index + 2;

      if (row.email) {
        const email = row.email.toLowerCase().trim();
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email)!.push(rowNum);
      }

      if (row.phone) {
        const phone = row.phone.replace(/[\s\-\(\)\.]/g, '');
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, []);
        }
        phoneMap.get(phone)!.push(rowNum);
      }
    });

    // Find duplicates
    emailMap.forEach((rows, email) => {
      if (rows.length > 1) {
        rows.forEach((row) => {
          duplicates.push({
            row,
            field: 'email',
            value: email,
          });
        });
      }
    });

    phoneMap.forEach((rows, phone) => {
      if (rows.length > 1) {
        rows.forEach((row) => {
          duplicates.push({
            row,
            field: 'phone',
            value: phone,
          });
        });
      }
    });

    return duplicates;
  }

  /**
   * Find duplicates against existing clients in database
   */
  private async findExistingDuplicates(data: any[]): Promise<DuplicateInfo[]> {
    const duplicates: DuplicateInfo[] = [];
    const emails = data.map((row) => row.email).filter(Boolean);
    const phones = data.map((row) => row.phone).filter(Boolean);

    if (emails.length === 0 && phones.length === 0) {
      return duplicates;
    }

    try {
      // Check for existing emails
      if (emails.length > 0) {
        const { data: existingEmails } = await this.supabase
          .from('clients')
          .select('id, email, first_name, last_name')
          .in('email', emails);

        if (existingEmails) {
          data.forEach((row, index) => {
            if (row.email) {
              const match = existingEmails.find(
                (client) =>
                  client.email?.toLowerCase() === row.email.toLowerCase(),
              );
              if (match) {
                duplicates.push({
                  row: index + 2,
                  field: 'email',
                  value: row.email,
                  matchedClientId: match.id,
                  matchedClientName:
                    `${match.first_name} ${match.last_name}`.trim(),
                });
              }
            }
          });
        }
      }

      // Check for existing phones
      if (phones.length > 0) {
        const cleanedPhones = phones.map((p) => p.replace(/[\s\-\(\)\.]/g, ''));
        const { data: existingPhones } = await this.supabase
          .from('clients')
          .select('id, phone, first_name, last_name')
          .in('phone', cleanedPhones);

        if (existingPhones) {
          data.forEach((row, index) => {
            if (row.phone) {
              const cleanPhone = row.phone.replace(/[\s\-\(\)\.]/g, '');
              const match = existingPhones.find(
                (client) =>
                  client.phone?.replace(/[\s\-\(\)\.]/g, '') === cleanPhone,
              );
              if (match) {
                duplicates.push({
                  row: index + 2,
                  field: 'phone',
                  value: row.phone,
                  matchedClientId: match.id,
                  matchedClientName:
                    `${match.first_name} ${match.last_name}`.trim(),
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

// Export singleton instance
export const importValidator = new ImportValidator();
