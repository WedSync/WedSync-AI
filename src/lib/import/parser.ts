/**
 * CSV/Excel Import Parser for Wedding Client Data
 * WS-033: Intelligent parsing engine for various data formats
 */

import { parseISO, parse, isValid, format } from 'date-fns';

export interface ParsedCoupleNames {
  bride?: string;
  groom?: string;
  combined: string;
  confidence: number;
}

export interface ParsedWeddingData {
  first_name?: string;
  last_name?: string;
  partner_first_name?: string;
  partner_last_name?: string;
  email?: string;
  phone?: string;
  wedding_date?: Date | null;
  venue_name?: string;
  venue_address?: string;
  guest_count?: number;
  budget_range?: string;
  status?: string;
  package_name?: string;
  package_price?: number;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  parse_confidence: number;
  warnings: string[];
}

export class WeddingDataParser {
  private readonly dateFormats = [
    'MM/dd/yyyy',
    'M/d/yyyy',
    'MM-dd-yyyy',
    'yyyy-MM-dd',
    'dd/MM/yyyy',
    'MMMM d, yyyy',
    'MMM d, yyyy',
    'MMMM dd, yyyy',
    'dd-MMM-yyyy',
    'yyyy/MM/dd',
  ];

  private readonly coupleNamePatterns = [
    // "John & Jane Smith"
    /^([A-Za-z]+)\s*&\s*([A-Za-z]+)\s+([A-Za-z]+)$/,
    // "John and Jane Smith"
    /^([A-Za-z]+)\s+and\s+([A-Za-z]+)\s+([A-Za-z]+)$/,
    // "Smith, John and Jane"
    /^([A-Za-z]+),\s*([A-Za-z]+)\s+and\s+([A-Za-z]+)$/,
    // "John Smith & Jane Doe"
    /^([A-Za-z]+\s+[A-Za-z]+)\s*&\s*([A-Za-z]+\s+[A-Za-z]+)$/,
    // "John Smith and Jane Doe"
    /^([A-Za-z]+\s+[A-Za-z]+)\s+and\s+([A-Za-z]+\s+[A-Za-z]+)$/,
  ];

  /**
   * Parse a row of data into structured wedding client data
   */
  parseRow(
    row: Record<string, any>,
    columnMappings: Record<string, string>,
  ): ParsedWeddingData {
    const warnings: string[] = [];
    let confidence = 100;

    const parsed: ParsedWeddingData = {
      parse_confidence: 100,
      warnings: [],
    };

    // Parse each mapped field
    for (const [sourceCol, targetField] of Object.entries(columnMappings)) {
      const value = row[sourceCol];
      if (!value) continue;

      switch (targetField) {
        case 'couple_names':
          const coupleData = this.parseCoupleNames(String(value));
          parsed.first_name = coupleData.bride?.split(' ')[0];
          parsed.last_name = coupleData.bride?.split(' ')[1];
          parsed.partner_first_name = coupleData.groom?.split(' ')[0];
          parsed.partner_last_name = coupleData.groom?.split(' ')[1];
          if (coupleData.confidence < 100) {
            warnings.push(`Couple names may need review: "${value}"`);
            confidence = Math.min(confidence, coupleData.confidence);
          }
          break;

        case 'wedding_date':
          const date = this.parseDate(String(value));
          if (date) {
            parsed.wedding_date = date;
          } else {
            warnings.push(`Could not parse wedding date: "${value}"`);
            confidence -= 10;
          }
          break;

        case 'email':
          const email = this.normalizeEmail(String(value));
          if (this.isValidEmail(email)) {
            parsed.email = email;
          } else {
            warnings.push(`Invalid email format: "${value}"`);
            confidence -= 15;
          }
          break;

        case 'phone':
          const phone = this.normalizePhone(String(value));
          if (phone) {
            parsed.phone = phone;
          } else {
            warnings.push(`Could not parse phone number: "${value}"`);
            confidence -= 5;
          }
          break;

        case 'guest_count':
          const guests = this.parseNumber(value);
          if (guests !== null) {
            parsed.guest_count = guests;
          } else {
            warnings.push(`Invalid guest count: "${value}"`);
            confidence -= 5;
          }
          break;

        case 'package_price':
          const price = this.parseCurrency(value);
          if (price !== null) {
            parsed.package_price = price;
          } else {
            warnings.push(`Could not parse package price: "${value}"`);
            confidence -= 5;
          }
          break;

        case 'priority_level':
          const priority = this.normalizePriority(String(value));
          if (priority) {
            parsed.priority_level = priority;
          }
          break;

        case 'status':
          parsed.status = this.normalizeStatus(String(value));
          break;

        default:
          // Direct mapping for other fields
          if (targetField in parsed) {
            (parsed as any)[targetField] = String(value).trim();
          }
      }
    }

    // If no couple names were parsed, try to extract from first_name/last_name fields
    if (!parsed.first_name && row.first_name) {
      parsed.first_name = String(row.first_name).trim();
    }
    if (!parsed.last_name && row.last_name) {
      parsed.last_name = String(row.last_name).trim();
    }

    parsed.warnings = warnings;
    parsed.parse_confidence = Math.max(0, confidence);

    return parsed;
  }

  /**
   * Parse couple names from various formats
   */
  parseCoupleNames(input: string): ParsedCoupleNames {
    const trimmed = input.trim();

    // Try each pattern
    for (const pattern of this.coupleNamePatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        if (match.length === 4) {
          // Format: "John & Jane Smith" or "Smith, John and Jane"
          if (match[0].includes(',')) {
            // "Smith, John and Jane"
            return {
              bride: `${match[3]} ${match[1]}`,
              groom: `${match[2]} ${match[1]}`,
              combined: trimmed,
              confidence: 90,
            };
          } else {
            // "John & Jane Smith"
            return {
              bride: `${match[2]} ${match[3]}`,
              groom: `${match[1]} ${match[3]}`,
              combined: trimmed,
              confidence: 95,
            };
          }
        } else if (match.length === 3) {
          // Format: "John Smith & Jane Doe"
          const names = match[0].split(/\s*&\s*|\s+and\s+/);
          if (names.length === 2) {
            return {
              bride: names[1].trim(),
              groom: names[0].trim(),
              combined: trimmed,
              confidence: 100,
            };
          }
        }
      }
    }

    // Fallback: treat as single name
    return {
      combined: trimmed,
      confidence: 50,
    };
  }

  /**
   * Parse various date formats
   */
  parseDate(input: string): Date | null {
    const trimmed = input.trim();

    // Try ISO format first
    try {
      const isoDate = parseISO(trimmed);
      if (isValid(isoDate)) return isoDate;
    } catch {}

    // Try each date format
    for (const formatStr of this.dateFormats) {
      try {
        const date = parse(trimmed, formatStr, new Date());
        if (isValid(date)) return date;
      } catch {}
    }

    // Try JavaScript's native Date parser as last resort
    try {
      const date = new Date(trimmed);
      if (isValid(date) && !isNaN(date.getTime())) {
        return date;
      }
    } catch {}

    return null;
  }

  /**
   * Normalize email address
   */
  normalizeEmail(input: string): string {
    return input.trim().toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Normalize phone number
   */
  normalizePhone(input: string): string | null {
    // Remove all non-digit characters except +
    const cleaned = input.replace(/[^\d+]/g, '');

    // Check if it's a valid length
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null;
    }

    // Format as standard US phone if 10 digits
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Format as international if starts with + or has country code
    if (cleaned.startsWith('+') || cleaned.length > 10) {
      return cleaned;
    }

    return cleaned;
  }

  /**
   * Parse number from various formats
   */
  parseNumber(input: any): number | null {
    if (typeof input === 'number') return input;

    const str = String(input).trim().replace(/,/g, '');
    const num = parseFloat(str);

    return isNaN(num) ? null : num;
  }

  /**
   * Parse currency values
   */
  parseCurrency(input: any): number | null {
    if (typeof input === 'number') return input;

    // Remove currency symbols and commas
    const str = String(input)
      .trim()
      .replace(/[$£€¥₹]/g, '')
      .replace(/,/g, '');

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  /**
   * Normalize priority level
   */
  normalizePriority(
    input: string,
  ): 'low' | 'medium' | 'high' | 'urgent' | null {
    const lower = input.toLowerCase().trim();

    if (lower.includes('urgent') || lower === 'u' || lower === '1')
      return 'urgent';
    if (lower.includes('high') || lower === 'h' || lower === '2') return 'high';
    if (lower.includes('medium') || lower === 'm' || lower === '3')
      return 'medium';
    if (lower.includes('low') || lower === 'l' || lower === '4') return 'low';

    return null;
  }

  /**
   * Normalize status
   */
  normalizeStatus(input: string): string {
    const lower = input.toLowerCase().trim();

    // Map common variations to standard statuses
    if (lower.includes('book') || lower.includes('confirm')) return 'booked';
    if (lower.includes('lead') || lower.includes('prospect')) return 'lead';
    if (lower.includes('inquir')) return 'inquiry';
    if (lower.includes('cancel')) return 'cancelled';
    if (lower.includes('complete') || lower.includes('done'))
      return 'completed';

    return lower;
  }

  /**
   * Batch parse multiple rows
   */
  parseRows(
    rows: Record<string, any>[],
    columnMappings: Record<string, string>,
  ): { data: ParsedWeddingData[]; summary: ParseSummary } {
    const results: ParsedWeddingData[] = [];
    const summary: ParseSummary = {
      total: rows.length,
      successful: 0,
      warnings: 0,
      errors: 0,
      averageConfidence: 0,
    };

    let totalConfidence = 0;

    for (const row of rows) {
      const parsed = this.parseRow(row, columnMappings);
      results.push(parsed);

      if (parsed.warnings.length === 0 && parsed.parse_confidence === 100) {
        summary.successful++;
      } else if (parsed.warnings.length > 0) {
        summary.warnings++;
      }

      totalConfidence += parsed.parse_confidence;
    }

    summary.averageConfidence = Math.round(totalConfidence / rows.length);

    return { data: results, summary };
  }
}

export interface ParseSummary {
  total: number;
  successful: number;
  warnings: number;
  errors: number;
  averageConfidence: number;
}

// Export singleton instance
export const weddingDataParser = new WeddingDataParser();
