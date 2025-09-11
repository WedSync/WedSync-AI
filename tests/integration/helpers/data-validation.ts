/**
 * Data Validation Helper
 * WS-192 Team B - Backend/API Focus
 * 
 * Provides comprehensive data validation for wedding platform integration testing
 */

import { PoolClient } from 'pg';

export interface ValidationRule {
  name: string;
  description: string;
  validator: (data: any, context: ValidationContext) => Promise<ValidationResult>;
  critical: boolean;
}

export interface ValidationContext {
  database: PoolClient;
  organizationId: string;
  testId: string;
  tableName?: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: any;
}

export interface DataValidationReport {
  passed: number;
  failed: number;
  critical: number;
  warnings: number;
  results: Array<{
    rule: string;
    result: ValidationResult;
    critical: boolean;
  }>;
}

export class DataValidator {
  private rules: ValidationRule[] = [];
  private context: ValidationContext;

  constructor(context: ValidationContext) {
    this.context = context;
    this.setupWeddingPlatformRules();
  }

  /**
   * Setup validation rules specific to wedding platform business logic
   */
  private setupWeddingPlatformRules(): void {
    // Organization isolation rules
    this.addRule({
      name: 'organization-isolation',
      description: 'Verify that all data belongs to the correct organization',
      validator: this.validateOrganizationIsolation.bind(this),
      critical: true
    });

    // Wedding date constraints
    this.addRule({
      name: 'wedding-date-future',
      description: 'Wedding dates should be in the future or within reasonable past range',
      validator: this.validateWeddingDates.bind(this),
      critical: false
    });

    // Email format validation
    this.addRule({
      name: 'email-format',
      description: 'All email addresses should be properly formatted',
      validator: this.validateEmailFormats.bind(this),
      critical: true
    });

    // Required relationships
    this.addRule({
      name: 'required-relationships',
      description: 'All entities should have required parent relationships',
      validator: this.validateRequiredRelationships.bind(this),
      critical: true
    });

    // Wedding business logic
    this.addRule({
      name: 'wedding-business-logic',
      description: 'Wedding-specific business rules and constraints',
      validator: this.validateWeddingBusinessLogic.bind(this),
      critical: false
    });

    // Data consistency
    this.addRule({
      name: 'data-consistency',
      description: 'Cross-table data consistency validation',
      validator: this.validateDataConsistency.bind(this),
      critical: true
    });

    // Form validation
    this.addRule({
      name: 'form-structure',
      description: 'Form configuration and structure validation',
      validator: this.validateFormStructure.bind(this),
      critical: false
    });

    // Journey validation
    this.addRule({
      name: 'journey-steps',
      description: 'Customer journey steps and workflow validation',
      validator: this.validateJourneySteps.bind(this),
      critical: false
    });
  }

  /**
   * Add a custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Run all validation rules and generate report
   */
  async validate(): Promise<DataValidationReport> {
    const report: DataValidationReport = {
      passed: 0,
      failed: 0,
      critical: 0,
      warnings: 0,
      results: []
    };

    for (const rule of this.rules) {
      try {
        const result = await rule.validator(null, this.context);
        
        report.results.push({
          rule: rule.name,
          result,
          critical: rule.critical
        });

        if (result.valid) {
          report.passed++;
        } else {
          report.failed++;
          if (rule.critical) {
            report.critical++;
          } else {
            report.warnings++;
          }
        }
      } catch (error) {
        report.failed++;
        report.critical++;
        report.results.push({
          rule: rule.name,
          result: {
            valid: false,
            message: `Validation failed with error: ${error.message}`,
            details: { error: error.message, stack: error.stack }
          },
          critical: true
        });
      }
    }

    return report;
  }

  /**
   * Validate organization isolation
   */
  private async validateOrganizationIsolation(data: any, context: ValidationContext): Promise<ValidationResult> {
    const tables = ['user_profiles', 'clients', 'forms', 'journeys'];
    const violations = [];

    for (const table of tables) {
      try {
        // Check for data belonging to other organizations
        const result = await context.database.query(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE organization_id != $1 
           AND created_at >= NOW() - INTERVAL '5 minutes'`,
          [context.organizationId]
        );

        if (result.rows[0].count > 0) {
          violations.push(`${table}: Found ${result.rows[0].count} records belonging to other organizations`);
        }
      } catch (error) {
        // Table might not exist or have organization_id column
        if (!error.message.includes('does not exist') && !error.message.includes('column')) {
          violations.push(`${table}: Error checking isolation - ${error.message}`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      message: violations.length === 0 
        ? 'Organization isolation verified' 
        : `Organization isolation violations found: ${violations.join(', ')}`,
      details: { violations }
    };
  }

  /**
   * Validate wedding dates are reasonable
   */
  private async validateWeddingDates(data: any, context: ValidationContext): Promise<ValidationResult> {
    const result = await context.database.query(
      `SELECT COUNT(*) as past_count, 
       COUNT(CASE WHEN wedding_date > CURRENT_DATE + INTERVAL '5 years' THEN 1 END) as far_future_count
       FROM clients 
       WHERE organization_id = $1 
       AND wedding_date < CURRENT_DATE - INTERVAL '1 year'`,
      [context.organizationId]
    );

    const pastCount = parseInt(result.rows[0].past_count);
    const farFutureCount = parseInt(result.rows[0].far_future_count);
    const issues = [];

    if (pastCount > 0) {
      issues.push(`${pastCount} weddings more than 1 year in the past`);
    }

    if (farFutureCount > 0) {
      issues.push(`${farFutureCount} weddings more than 5 years in the future`);
    }

    return {
      valid: issues.length === 0,
      message: issues.length === 0 
        ? 'Wedding dates are within reasonable ranges' 
        : `Wedding date issues: ${issues.join(', ')}`,
      details: { pastCount, farFutureCount }
    };
  }

  /**
   * Validate email formats
   */
  private async validateEmailFormats(data: any, context: ValidationContext): Promise<ValidationResult> {
    const emailTables = [
      { table: 'clients', column: 'email' },
      { table: 'user_profiles', column: 'email' }
    ];

    const invalidEmails = [];

    for (const { table, column } of emailTables) {
      try {
        const result = await context.database.query(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE organization_id = $1 
           AND ${column} IS NOT NULL 
           AND ${column} !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'`,
          [context.organizationId]
        );

        if (result.rows[0].count > 0) {
          invalidEmails.push(`${table}.${column}: ${result.rows[0].count} invalid emails`);
        }
      } catch (error) {
        if (!error.message.includes('does not exist')) {
          invalidEmails.push(`${table}.${column}: Error validating - ${error.message}`);
        }
      }
    }

    return {
      valid: invalidEmails.length === 0,
      message: invalidEmails.length === 0 
        ? 'All email formats are valid' 
        : `Invalid email formats found: ${invalidEmails.join(', ')}`,
      details: { invalidEmails }
    };
  }

  /**
   * Validate required relationships exist
   */
  private async validateRequiredRelationships(data: any, context: ValidationContext): Promise<ValidationResult> {
    const orphans = [];

    // Check for orphaned clients (without organization)
    try {
      const clientResult = await context.database.query(
        `SELECT COUNT(*) as count FROM clients c 
         LEFT JOIN organizations o ON c.organization_id = o.id 
         WHERE o.id IS NULL AND c.organization_id = $1`,
        [context.organizationId]
      );

      if (clientResult.rows[0].count > 0) {
        orphans.push(`clients: ${clientResult.rows[0].count} without valid organization`);
      }
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        orphans.push(`clients: Error checking relationships - ${error.message}`);
      }
    }

    // Check for orphaned forms (without organization)
    try {
      const formResult = await context.database.query(
        `SELECT COUNT(*) as count FROM forms f 
         LEFT JOIN organizations o ON f.organization_id = o.id 
         WHERE o.id IS NULL AND f.organization_id = $1`,
        [context.organizationId]
      );

      if (formResult.rows[0].count > 0) {
        orphans.push(`forms: ${formResult.rows[0].count} without valid organization`);
      }
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        orphans.push(`forms: Error checking relationships - ${error.message}`);
      }
    }

    return {
      valid: orphans.length === 0,
      message: orphans.length === 0 
        ? 'All required relationships are valid' 
        : `Orphaned records found: ${orphans.join(', ')}`,
      details: { orphans }
    };
  }

  /**
   * Validate wedding-specific business logic
   */
  private async validateWeddingBusinessLogic(data: any, context: ValidationContext): Promise<ValidationResult> {
    const violations = [];

    try {
      // Check for negative guest counts
      const guestResult = await context.database.query(
        `SELECT COUNT(*) as count FROM clients 
         WHERE organization_id = $1 AND guest_count < 0`,
        [context.organizationId]
      );

      if (guestResult.rows[0].count > 0) {
        violations.push(`${guestResult.rows[0].count} clients with negative guest count`);
      }

      // Check for unreasonable budgets
      const budgetResult = await context.database.query(
        `SELECT COUNT(*) as negative_count,
         COUNT(CASE WHEN budget > 1000000 THEN 1 END) as excessive_count
         FROM clients 
         WHERE organization_id = $1 
         AND (budget < 0 OR budget > 1000000)`,
        [context.organizationId]
      );

      const negativeCount = parseInt(budgetResult.rows[0].negative_count);
      const excessiveCount = parseInt(budgetResult.rows[0].excessive_count);

      if (negativeCount > 0) {
        violations.push(`${negativeCount} clients with negative budget`);
      }

      if (excessiveCount > 0) {
        violations.push(`${excessiveCount} clients with budget over $1M`);
      }
    } catch (error) {
      if (!error.message.includes('does not exist') && !error.message.includes('column')) {
        violations.push(`Error validating business logic: ${error.message}`);
      }
    }

    return {
      valid: violations.length === 0,
      message: violations.length === 0 
        ? 'Wedding business logic validation passed' 
        : `Business logic violations: ${violations.join(', ')}`,
      details: { violations }
    };
  }

  /**
   * Validate data consistency across tables
   */
  private async validateDataConsistency(data: any, context: ValidationContext): Promise<ValidationResult> {
    const inconsistencies = [];

    try {
      // Verify client counts match across related tables
      const clientCount = await context.database.query(
        `SELECT COUNT(*) as count FROM clients WHERE organization_id = $1`,
        [context.organizationId]
      );

      const submissionCount = await context.database.query(
        `SELECT COUNT(DISTINCT client_id) as count FROM submissions s
         JOIN forms f ON s.form_id = f.id 
         WHERE f.organization_id = $1`,
        [context.organizationId]
      );

      // More clients than submissions is OK, but more submissions than clients is not
      if (submissionCount.rows[0].count > clientCount.rows[0].count) {
        inconsistencies.push('More form submissions than clients exist');
      }
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        inconsistencies.push(`Error checking consistency: ${error.message}`);
      }
    }

    return {
      valid: inconsistencies.length === 0,
      message: inconsistencies.length === 0 
        ? 'Data consistency validation passed' 
        : `Inconsistencies found: ${inconsistencies.join(', ')}`,
      details: { inconsistencies }
    };
  }

  /**
   * Validate form structure and configuration
   */
  private async validateFormStructure(data: any, context: ValidationContext): Promise<ValidationResult> {
    const issues = [];

    try {
      // Check for forms without proper configuration
      const formResult = await context.database.query(
        `SELECT COUNT(*) as count FROM forms 
         WHERE organization_id = $1 
         AND (configuration IS NULL OR configuration = '{}' OR configuration = '')`,
        [context.organizationId]
      );

      if (formResult.rows[0].count > 0) {
        issues.push(`${formResult.rows[0].count} forms without proper configuration`);
      }

      // Check for forms without names
      const nameResult = await context.database.query(
        `SELECT COUNT(*) as count FROM forms 
         WHERE organization_id = $1 
         AND (name IS NULL OR name = '' OR LENGTH(TRIM(name)) = 0)`,
        [context.organizationId]
      );

      if (nameResult.rows[0].count > 0) {
        issues.push(`${nameResult.rows[0].count} forms without names`);
      }
    } catch (error) {
      if (!error.message.includes('does not exist') && !error.message.includes('column')) {
        issues.push(`Error validating forms: ${error.message}`);
      }
    }

    return {
      valid: issues.length === 0,
      message: issues.length === 0 
        ? 'Form structure validation passed' 
        : `Form issues found: ${issues.join(', ')}`,
      details: { issues }
    };
  }

  /**
   * Validate customer journey steps and workflow
   */
  private async validateJourneySteps(data: any, context: ValidationContext): Promise<ValidationResult> {
    const issues = [];

    try {
      // Check for journeys without steps
      const journeyResult = await context.database.query(
        `SELECT COUNT(*) as count FROM journeys 
         WHERE organization_id = $1 
         AND (steps IS NULL OR steps = '[]' OR steps = '')`,
        [context.organizationId]
      );

      if (journeyResult.rows[0].count > 0) {
        issues.push(`${journeyResult.rows[0].count} journeys without steps defined`);
      }

      // Check for journeys without names
      const nameResult = await context.database.query(
        `SELECT COUNT(*) as count FROM journeys 
         WHERE organization_id = $1 
         AND (name IS NULL OR name = '' OR LENGTH(TRIM(name)) = 0)`,
        [context.organizationId]
      );

      if (nameResult.rows[0].count > 0) {
        issues.push(`${nameResult.rows[0].count} journeys without names`);
      }
    } catch (error) {
      if (!error.message.includes('does not exist') && !error.message.includes('column')) {
        issues.push(`Error validating journeys: ${error.message}`);
      }
    }

    return {
      valid: issues.length === 0,
      message: issues.length === 0 
        ? 'Journey validation passed' 
        : `Journey issues found: ${issues.join(', ')}`,
      details: { issues }
    };
  }

  /**
   * Validate specific data record
   */
  async validateRecord(tableName: string, recordId: string): Promise<ValidationResult> {
    const recordContext = { ...this.context, tableName };
    
    try {
      const record = await this.context.database.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [recordId]
      );

      if (record.rows.length === 0) {
        return {
          valid: false,
          message: `Record ${recordId} not found in ${tableName}`,
          details: { recordId, tableName }
        };
      }

      // Run validation rules specific to this record
      const report = await this.validate();
      
      return {
        valid: report.critical === 0,
        message: report.critical === 0 
          ? `Record validation passed` 
          : `Record validation failed with ${report.critical} critical issues`,
        details: { validationReport: report, record: record.rows[0] }
      };
    } catch (error) {
      return {
        valid: false,
        message: `Error validating record: ${error.message}`,
        details: { error: error.message, recordId, tableName }
      };
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalRules: number;
    criticalRules: number;
    warningRules: number;
    customRules: number;
  } {
    const criticalCount = this.rules.filter(rule => rule.critical).length;
    const warningCount = this.rules.filter(rule => !rule.critical).length;
    
    return {
      totalRules: this.rules.length,
      criticalRules: criticalCount,
      warningRules: warningCount,
      customRules: this.rules.filter(rule => !rule.name.includes('wedding')).length
    };
  }
}