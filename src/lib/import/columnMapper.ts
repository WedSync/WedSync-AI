/**
 * Column Mapping Engine for CSV/Excel Import
 * WS-033: Intelligent column detection and mapping for wedding data
 */

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  detectedType?: 'text' | 'email' | 'phone' | 'date' | 'number' | 'currency';
}

export interface MappingSuggestion {
  field: string;
  suggestions: string[];
  confidence: number[];
}

export class ColumnMapper {
  // Wedding-specific column patterns
  private readonly columnPatterns: Record<string, string[]> = {
    // Names
    first_name: [
      'first_name',
      'firstname',
      'fname',
      'client_first',
      'bride_first',
      'given_name',
    ],
    last_name: [
      'last_name',
      'lastname',
      'lname',
      'surname',
      'client_last',
      'bride_last',
      'family_name',
    ],
    partner_first_name: [
      'partner_first',
      'groom_first',
      'spouse_first',
      'partner_fname',
      'fiance_first',
    ],
    partner_last_name: [
      'partner_last',
      'groom_last',
      'spouse_last',
      'partner_lname',
      'fiance_last',
    ],
    couple_names: [
      'couple',
      'couple_names',
      'client_names',
      'bride_groom',
      'names',
      'clients',
    ],

    // Contact
    email: [
      'email',
      'email_address',
      'e_mail',
      'contact_email',
      'primary_email',
      'mail',
    ],
    phone: [
      'phone',
      'phone_number',
      'telephone',
      'mobile',
      'cell',
      'contact_phone',
      'tel',
    ],

    // Wedding Details
    wedding_date: [
      'wedding_date',
      'event_date',
      'ceremony_date',
      'date',
      'wedding_day',
      'big_day',
    ],
    venue_name: [
      'venue',
      'venue_name',
      'location',
      'place',
      'ceremony_venue',
      'reception_venue',
    ],
    venue_address: [
      'venue_address',
      'address',
      'location_address',
      'venue_location',
      'full_address',
    ],

    // Numbers
    guest_count: [
      'guest_count',
      'guests',
      'number_of_guests',
      'guest_number',
      'attendees',
      'pax',
    ],
    budget_range: [
      'budget',
      'budget_range',
      'price_range',
      'investment',
      'package_price',
    ],

    // Service
    package_name: [
      'package',
      'package_name',
      'service',
      'plan',
      'service_package',
      'offering',
    ],
    package_price: [
      'price',
      'package_price',
      'cost',
      'amount',
      'total',
      'fee',
      'rate',
    ],

    // Status
    status: [
      'status',
      'client_status',
      'booking_status',
      'lead_status',
      'stage',
      'state',
    ],
    priority_level: [
      'priority',
      'priority_level',
      'importance',
      'urgency',
      'tier',
      'rank',
    ],
    notes: [
      'notes',
      'comments',
      'remarks',
      'description',
      'details',
      'memo',
      'additional_info',
    ],
  };

  // Data type detection patterns
  private readonly typePatterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[\d\s\-\(\)]+$/,
    date: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$|^[A-Za-z]+\s+\d{1,2},?\s+\d{4}$/,
    number: /^\d+$/,
    currency: /^[$£€¥₹]?\s*[\d,]+\.?\d*$/,
  };

  /**
   * Auto-detect column mappings based on column headers
   */
  autoDetectMappings(
    columns: string[],
    sampleData?: Record<string, any>[],
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const usedTargets = new Set<string>();

    for (const column of columns) {
      const normalizedColumn = this.normalizeColumnName(column);
      let bestMatch: ColumnMapping | null = null;
      let highestConfidence = 0;

      // Check each target field pattern
      for (const [targetField, patterns] of Object.entries(
        this.columnPatterns,
      )) {
        if (usedTargets.has(targetField)) continue;

        const confidence = this.calculateConfidence(normalizedColumn, patterns);

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            sourceColumn: column,
            targetField,
            confidence,
            detectedType: this.detectDataType(column, sampleData),
          };
        }
      }

      // Only add mapping if confidence is above threshold
      if (bestMatch && highestConfidence >= 50) {
        mappings.push(bestMatch);
        usedTargets.add(bestMatch.targetField);
      } else {
        // Add unmapped column with type detection
        mappings.push({
          sourceColumn: column,
          targetField: '',
          confidence: 0,
          detectedType: this.detectDataType(column, sampleData),
        });
      }
    }

    return mappings;
  }

  /**
   * Calculate mapping confidence based on pattern matching
   */
  private calculateConfidence(columnName: string, patterns: string[]): number {
    let maxConfidence = 0;

    for (const pattern of patterns) {
      let confidence = 0;

      // Exact match
      if (columnName === pattern) {
        confidence = 100;
      }
      // Contains pattern
      else if (columnName.includes(pattern)) {
        confidence = 80;
      }
      // Pattern contains column
      else if (pattern.includes(columnName)) {
        confidence = 70;
      }
      // Fuzzy match
      else {
        const similarity = this.calculateSimilarity(columnName, pattern);
        if (similarity > 0.6) {
          confidence = Math.round(similarity * 60);
        }
      }

      maxConfidence = Math.max(maxConfidence, confidence);
    }

    return maxConfidence;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - distance / maxLength;
  }

  /**
   * Normalize column name for comparison
   */
  private normalizeColumnName(column: string): string {
    return column
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Detect data type based on column name and sample data
   */
  private detectDataType(
    column: string,
    sampleData?: Record<string, any>[],
  ): 'text' | 'email' | 'phone' | 'date' | 'number' | 'currency' {
    const normalizedColumn = this.normalizeColumnName(column);

    // Check column name patterns first
    if (normalizedColumn.includes('email')) return 'email';
    if (
      normalizedColumn.includes('phone') ||
      normalizedColumn.includes('mobile')
    )
      return 'phone';
    if (normalizedColumn.includes('date')) return 'date';
    if (
      normalizedColumn.includes('price') ||
      normalizedColumn.includes('cost') ||
      normalizedColumn.includes('amount') ||
      normalizedColumn.includes('budget')
    )
      return 'currency';
    if (
      normalizedColumn.includes('count') ||
      normalizedColumn.includes('number') ||
      normalizedColumn.includes('guests')
    )
      return 'number';

    // Check sample data if available
    if (sampleData && sampleData.length > 0) {
      const samples = sampleData
        .slice(0, 10)
        .map((row) => row[column])
        .filter((val) => val != null && val !== '');

      if (samples.length > 0) {
        // Check if majority match a specific type
        const typeCounts: Record<string, number> = {
          email: 0,
          phone: 0,
          date: 0,
          number: 0,
          currency: 0,
          text: 0,
        };

        for (const sample of samples) {
          const sampleStr = String(sample).trim();

          if (this.typePatterns.email.test(sampleStr)) typeCounts.email++;
          else if (this.typePatterns.phone.test(sampleStr)) typeCounts.phone++;
          else if (this.typePatterns.date.test(sampleStr)) typeCounts.date++;
          else if (this.typePatterns.currency.test(sampleStr))
            typeCounts.currency++;
          else if (this.typePatterns.number.test(sampleStr))
            typeCounts.number++;
          else typeCounts.text++;
        }

        // Return the most common type (excluding text)
        let maxCount = 0;
        let detectedType: any = 'text';

        for (const [type, count] of Object.entries(typeCounts)) {
          if (
            type !== 'text' &&
            count > maxCount &&
            count >= samples.length * 0.6
          ) {
            maxCount = count;
            detectedType = type;
          }
        }

        return detectedType;
      }
    }

    return 'text';
  }

  /**
   * Get mapping suggestions for unmapped columns
   */
  getSuggestions(column: string, usedTargets: Set<string>): MappingSuggestion {
    const normalizedColumn = this.normalizeColumnName(column);
    const suggestions: { field: string; confidence: number }[] = [];

    for (const [targetField, patterns] of Object.entries(this.columnPatterns)) {
      if (usedTargets.has(targetField)) continue;

      const confidence = this.calculateConfidence(normalizedColumn, patterns);
      if (confidence > 30) {
        suggestions.push({ field: targetField, confidence });
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return {
      field: column,
      suggestions: suggestions.slice(0, 3).map((s) => s.field),
      confidence: suggestions.slice(0, 3).map((s) => s.confidence),
    };
  }

  /**
   * Validate column mappings
   */
  validateMappings(mappings: ColumnMapping[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const targetCounts = new Map<string, number>();

    // Check for duplicate target mappings
    for (const mapping of mappings) {
      if (mapping.targetField) {
        const count = (targetCounts.get(mapping.targetField) || 0) + 1;
        targetCounts.set(mapping.targetField, count);

        if (count > 1) {
          issues.push(`Multiple columns mapped to ${mapping.targetField}`);
        }
      }
    }

    // Check for required fields
    const requiredFields = ['email', 'first_name'];
    const mappedFields = new Set(
      mappings.map((m) => m.targetField).filter(Boolean),
    );

    for (const required of requiredFields) {
      if (!mappedFields.has(required) && !mappedFields.has('couple_names')) {
        issues.push(
          `Required field '${required}' is not mapped (unless couple_names is mapped)`,
        );
      }
    }

    // Check type mismatches
    for (const mapping of mappings) {
      if (mapping.targetField && mapping.detectedType) {
        const expectedType = this.getExpectedType(mapping.targetField);
        if (
          expectedType &&
          mapping.detectedType !== expectedType &&
          mapping.detectedType !== 'text'
        ) {
          issues.push(
            `Type mismatch for ${mapping.sourceColumn}: expected ${expectedType}, detected ${mapping.detectedType}`,
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get expected data type for a target field
   */
  private getExpectedType(field: string): string | null {
    const typeMap: Record<string, string> = {
      email: 'email',
      phone: 'phone',
      wedding_date: 'date',
      guest_count: 'number',
      package_price: 'currency',
      budget_range: 'currency',
    };

    return typeMap[field] || null;
  }

  /**
   * Apply manual mapping override
   */
  applyManualMapping(
    mappings: ColumnMapping[],
    sourceColumn: string,
    targetField: string,
  ): ColumnMapping[] {
    return mappings.map((mapping) => {
      if (mapping.sourceColumn === sourceColumn) {
        return {
          ...mapping,
          targetField,
          confidence: 100, // Manual mapping has full confidence
        };
      }
      // Clear any existing mapping to this target
      if (
        mapping.targetField === targetField &&
        mapping.sourceColumn !== sourceColumn
      ) {
        return {
          ...mapping,
          targetField: '',
          confidence: 0,
        };
      }
      return mapping;
    });
  }
}

// Export singleton instance
export const columnMapper = new ColumnMapper();
