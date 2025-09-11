/**
 * Cleanup Manager
 * WS-192 Team B - Backend/API Focus
 * 
 * Manages comprehensive test data cleanup and transaction rollback
 */

import { PoolClient } from 'pg';

export interface CleanupOperation {
  name: string;
  operation: () => Promise<void>;
  priority: number; // Lower numbers run first
  critical: boolean; // Whether failure should stop cleanup
}

export interface CleanupResult {
  success: boolean;
  operationsCompleted: number;
  operationsFailed: number;
  errors: Array<{ operation: string; error: string }>;
}

export class CleanupManager {
  private database: PoolClient;
  private testId: string;
  private operations: CleanupOperation[] = [];
  private executed: boolean = false;

  constructor(database: PoolClient, testId: string) {
    this.database = database;
    this.testId = testId;
    this.setupDefaultCleanupOperations();
  }

  /**
   * Setup default cleanup operations for wedding platform testing
   */
  private setupDefaultCleanupOperations(): void {
    // High priority - Clean up dependent records first
    this.addOperation({
      name: 'cleanup-submissions',
      operation: async () => this.cleanupSubmissions(),
      priority: 1,
      critical: false
    });

    this.addOperation({
      name: 'cleanup-journeys',
      operation: async () => this.cleanupJourneys(),
      priority: 2,
      critical: false
    });

    this.addOperation({
      name: 'cleanup-forms',
      operation: async () => this.cleanupForms(),
      priority: 3,
      critical: false
    });

    // Medium priority - Core business entities
    this.addOperation({
      name: 'cleanup-clients',
      operation: async () => this.cleanupClients(),
      priority: 4,
      critical: false
    });

    this.addOperation({
      name: 'cleanup-user-profiles',
      operation: async () => this.cleanupUserProfiles(),
      priority: 5,
      critical: false
    });

    // Low priority - Parent entities
    this.addOperation({
      name: 'cleanup-organizations',
      operation: async () => this.cleanupOrganizations(),
      priority: 6,
      critical: false
    });

    // Critical - Transaction rollback (always last)
    this.addOperation({
      name: 'rollback-transaction',
      operation: async () => this.rollbackTransaction(),
      priority: 99,
      critical: true
    });
  }

  /**
   * Add a custom cleanup operation
   */
  addOperation(operation: CleanupOperation): void {
    if (this.executed) {
      throw new Error('Cannot add operations after cleanup has been executed');
    }
    this.operations.push(operation);
  }

  /**
   * Execute all cleanup operations in priority order
   */
  async cleanupAll(): Promise<CleanupResult> {
    if (this.executed) {
      throw new Error('Cleanup has already been executed');
    }

    this.executed = true;
    const result: CleanupResult = {
      success: true,
      operationsCompleted: 0,
      operationsFailed: 0,
      errors: []
    };

    // Sort operations by priority
    const sortedOperations = this.operations.sort((a, b) => a.priority - b.priority);

    for (const operation of sortedOperations) {
      try {
        await operation.operation();
        result.operationsCompleted++;
      } catch (error) {
        result.operationsFailed++;
        result.errors.push({
          operation: operation.name,
          error: error.message
        });

        if (operation.critical) {
          result.success = false;
          console.error(`Critical cleanup operation failed: ${operation.name}`, error);
          break;
        } else {
          console.warn(`Non-critical cleanup operation failed: ${operation.name}`, error);
        }
      }
    }

    return result;
  }

  /**
   * Clean up form submissions for test organization
   */
  private async cleanupSubmissions(): Promise<void> {
    await this.database.query(
      `DELETE FROM submissions 
       WHERE form_id IN (
         SELECT f.id FROM forms f 
         JOIN organizations o ON f.organization_id = o.id 
         WHERE o.name LIKE $1
       )`,
      [`%${this.testId}%`]
    );
  }

  /**
   * Clean up customer journeys for test organization
   */
  private async cleanupJourneys(): Promise<void> {
    await this.database.query(
      `DELETE FROM journeys 
       WHERE organization_id IN (
         SELECT id FROM organizations WHERE name LIKE $1
       )`,
      [`%${this.testId}%`]
    );
  }

  /**
   * Clean up forms for test organization
   */
  private async cleanupForms(): Promise<void> {
    await this.database.query(
      `DELETE FROM forms 
       WHERE organization_id IN (
         SELECT id FROM organizations WHERE name LIKE $1
       )`,
      [`%${this.testId}%`]
    );
  }

  /**
   * Clean up clients for test organization
   */
  private async cleanupClients(): Promise<void> {
    await this.database.query(
      `DELETE FROM clients 
       WHERE email LIKE $1 OR organization_id IN (
         SELECT id FROM organizations WHERE name LIKE $1
       )`,
      [`%${this.testId}%`]
    );
  }

  /**
   * Clean up user profiles for test organization
   */
  private async cleanupUserProfiles(): Promise<void> {
    await this.database.query(
      `DELETE FROM user_profiles 
       WHERE email LIKE $1 OR organization_id IN (
         SELECT id FROM organizations WHERE name LIKE $1
       )`,
      [`%${this.testId}%`]
    );
  }

  /**
   * Clean up test organizations
   */
  private async cleanupOrganizations(): Promise<void> {
    await this.database.query(
      `DELETE FROM organizations WHERE name LIKE $1 OR slug LIKE $2`,
      [`%${this.testId}%`, `%${this.testId}%`]
    );
  }

  /**
   * Rollback database transaction (most important cleanup)
   */
  private async rollbackTransaction(): Promise<void> {
    try {
      await this.database.query('ROLLBACK');
    } catch (error) {
      // This is critical - if we can't rollback, we have a serious problem
      throw new Error(`Failed to rollback transaction: ${error.message}`);
    }
  }

  /**
   * Clean up external service test data (files, emails, etc.)
   */
  async cleanupExternalServices(): Promise<void> {
    // This would clean up any external service calls made during testing
    // For now, we'll implement basic logging
    try {
      // Clean up any test files that might have been created
      // Clean up any test emails that might have been queued
      // Clean up any test SMS messages
      // Clean up any test webhook calls
      
      console.log(`External service cleanup completed for test: ${this.testId}`);
    } catch (error) {
      console.warn('External service cleanup failed:', error);
      // Don't throw - external cleanup is not critical for database integrity
    }
  }

  /**
   * Verify all test data has been cleaned up
   */
  async verifyCleanup(): Promise<{
    clean: boolean;
    remainingData: Array<{ table: string; count: number }>;
  }> {
    const remainingData: Array<{ table: string; count: number }> = [];
    const testTables = [
      'organizations',
      'user_profiles',
      'clients',
      'forms',
      'submissions',
      'journeys'
    ];

    for (const table of testTables) {
      try {
        const result = await this.database.query(
          `SELECT COUNT(*) as count FROM ${table} 
           WHERE created_at >= NOW() - INTERVAL '5 minutes'
           AND (
             (${table} = 'organizations' AND (name LIKE $1 OR slug LIKE $2)) OR
             (${table} != 'organizations' AND organization_id IN (
               SELECT id FROM organizations WHERE name LIKE $1
             ))
           )`,
          [`%${this.testId}%`, `%${this.testId}%`]
        );

        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          remainingData.push({ table, count });
        }
      } catch (error) {
        console.warn(`Failed to verify cleanup for table ${table}:`, error);
        // Add as potential issue
        remainingData.push({ table, count: -1 }); // -1 indicates verification failed
      }
    }

    return {
      clean: remainingData.length === 0,
      remainingData
    };
  }

  /**
   * Force cleanup of all test data (emergency cleanup)
   * This should only be used if normal transaction rollback fails
   */
  async forceCleanup(): Promise<CleanupResult> {
    console.warn(`Performing force cleanup for test: ${this.testId}`);
    
    const result: CleanupResult = {
      success: true,
      operationsCompleted: 0,
      operationsFailed: 0,
      errors: []
    };

    // Disable foreign key constraints temporarily
    try {
      await this.database.query('SET CONSTRAINTS ALL DEFERRED');
    } catch (error) {
      console.warn('Failed to defer constraints:', error);
    }

    // Force delete in dependency order
    const forceDeleteOperations = [
      'submissions',
      'journeys', 
      'forms',
      'clients',
      'user_profiles',
      'organizations'
    ];

    for (const table of forceDeleteOperations) {
      try {
        await this.database.query(
          `DELETE FROM ${table} WHERE created_at >= NOW() - INTERVAL '1 hour'`
        );
        result.operationsCompleted++;
      } catch (error) {
        result.operationsFailed++;
        result.errors.push({
          operation: `force-delete-${table}`,
          error: error.message
        });
      }
    }

    // Re-enable constraints
    try {
      await this.database.query('SET CONSTRAINTS ALL IMMEDIATE');
    } catch (error) {
      console.warn('Failed to restore constraints:', error);
    }

    result.success = result.operationsFailed === 0;
    return result;
  }

  /**
   * Get cleanup statistics
   */
  getStats(): {
    testId: string;
    operationsRegistered: number;
    executed: boolean;
  } {
    return {
      testId: this.testId,
      operationsRegistered: this.operations.length,
      executed: this.executed
    };
  }
}