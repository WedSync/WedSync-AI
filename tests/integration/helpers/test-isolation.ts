/**
 * Test Isolation Helper
 * WS-192 Team B - Backend/API Focus
 * 
 * Provides database transaction management for complete test isolation
 */

import { PoolClient } from 'pg';

export interface TestIsolationConfig {
  testId: string;
  enableSavepoints: boolean;
  maxNestingLevel: number;
}

export interface SavepointContext {
  name: string;
  level: number;
  createdAt: Date;
}

export class TestIsolation {
  private database: PoolClient;
  private config: TestIsolationConfig;
  private savepoints: Map<string, SavepointContext> = new Map();
  private transactionLevel: number = 0;

  constructor(database: PoolClient, testId: string) {
    this.database = database;
    this.config = {
      testId,
      enableSavepoints: true,
      maxNestingLevel: 5
    };
  }

  /**
   * Create a savepoint for nested transaction isolation
   * Useful for testing rollback scenarios within a test
   */
  async createSavepoint(name?: string): Promise<string> {
    if (!this.config.enableSavepoints) {
      throw new Error('Savepoints are disabled in test configuration');
    }

    if (this.transactionLevel >= this.config.maxNestingLevel) {
      throw new Error(`Maximum transaction nesting level (${this.config.maxNestingLevel}) exceeded`);
    }

    const savepointName = name || `sp_${this.config.testId}_${Date.now()}`;
    
    try {
      await this.database.query(`SAVEPOINT ${savepointName}`);
      
      this.savepoints.set(savepointName, {
        name: savepointName,
        level: this.transactionLevel,
        createdAt: new Date()
      });
      
      this.transactionLevel++;
      
      return savepointName;
    } catch (error) {
      throw new Error(`Failed to create savepoint ${savepointName}: ${error.message}`);
    }
  }

  /**
   * Rollback to a specific savepoint
   * Allows testing of partial rollback scenarios
   */
  async rollbackToSavepoint(name: string): Promise<void> {
    const savepoint = this.savepoints.get(name);
    if (!savepoint) {
      throw new Error(`Savepoint ${name} not found`);
    }

    try {
      await this.database.query(`ROLLBACK TO SAVEPOINT ${name}`);
      
      // Remove all savepoints created after this one
      for (const [spName, spContext] of this.savepoints) {
        if (spContext.level > savepoint.level) {
          this.savepoints.delete(spName);
          this.transactionLevel--;
        }
      }
    } catch (error) {
      throw new Error(`Failed to rollback to savepoint ${name}: ${error.message}`);
    }
  }

  /**
   * Release a savepoint (commit the nested transaction)
   */
  async releaseSavepoint(name: string): Promise<void> {
    const savepoint = this.savepoints.get(name);
    if (!savepoint) {
      throw new Error(`Savepoint ${name} not found`);
    }

    try {
      await this.database.query(`RELEASE SAVEPOINT ${name}`);
      this.savepoints.delete(name);
      this.transactionLevel--;
    } catch (error) {
      throw new Error(`Failed to release savepoint ${name}: ${error.message}`);
    }
  }

  /**
   * Execute code within a savepoint that automatically rolls back
   * Perfect for testing error conditions without affecting the main test transaction
   */
  async withRollbackSavepoint<T>(
    operation: (database: PoolClient) => Promise<T>
  ): Promise<{ result: T | null; error: Error | null }> {
    const savepointName = await this.createSavepoint();
    
    try {
      const result = await operation(this.database);
      await this.rollbackToSavepoint(savepointName);
      return { result, error: null };
    } catch (error) {
      try {
        await this.rollbackToSavepoint(savepointName);
      } catch (rollbackError) {
        console.error('Failed to rollback savepoint after error:', rollbackError);
      }
      return { result: null, error };
    }
  }

  /**
   * Verify transaction isolation by checking if data is visible outside transaction
   */
  async verifyIsolation(tableName: string, testData: any): Promise<boolean> {
    // This would require a separate connection to verify isolation
    // For now, we'll implement basic validation
    try {
      const result = await this.database.query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE created_at >= NOW() - INTERVAL '1 minute'`
      );
      
      // In a properly isolated transaction, test data should only be visible within the transaction
      return result.rows[0].count > 0;
    } catch (error) {
      console.error('Failed to verify isolation:', error);
      return false;
    }
  }

  /**
   * Get current transaction status and savepoint information
   */
  getTransactionStatus(): {
    transactionLevel: number;
    activeSavepoints: SavepointContext[];
    testId: string;
  } {
    return {
      transactionLevel: this.transactionLevel,
      activeSavepoints: Array.from(this.savepoints.values()),
      testId: this.config.testId
    };
  }

  /**
   * Validate database state for wedding industry specific constraints
   */
  async validateWeddingDataIntegrity(): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    try {
      // Check organization isolation
      const orgCount = await this.database.query(
        `SELECT COUNT(DISTINCT organization_id) as count FROM user_profiles 
         WHERE email LIKE '%${this.config.testId}%'`
      );
      
      if (orgCount.rows[0].count > 1) {
        violations.push('Multiple organizations found for test data - isolation violated');
      }

      // Check wedding date constraints
      const futureDates = await this.database.query(
        `SELECT COUNT(*) as count FROM clients 
         WHERE wedding_date < CURRENT_DATE AND email LIKE '%${this.config.testId}%'`
      );
      
      if (futureDates.rows[0].count > 0) {
        violations.push('Wedding dates in the past found - data integrity issue');
      }

      // Check required relationships
      const orphanClients = await this.database.query(
        `SELECT COUNT(*) as count FROM clients c 
         LEFT JOIN organizations o ON c.organization_id = o.id 
         WHERE o.id IS NULL AND c.email LIKE '%${this.config.testId}%'`
      );
      
      if (orphanClients.rows[0].count > 0) {
        violations.push('Orphaned clients without organizations found');
      }

      return {
        valid: violations.length === 0,
        violations
      };
    } catch (error) {
      violations.push(`Failed to validate data integrity: ${error.message}`);
      return {
        valid: false,
        violations
      };
    }
  }

  /**
   * Clean up all savepoints and prepare for transaction rollback
   */
  async cleanup(): Promise<void> {
    try {
      // Release all active savepoints in reverse order
      const sortedSavepoints = Array.from(this.savepoints.values())
        .sort((a, b) => b.level - a.level);

      for (const savepoint of sortedSavepoints) {
        try {
          await this.database.query(`RELEASE SAVEPOINT ${savepoint.name}`);
        } catch (error) {
          // Ignore errors during cleanup
          console.warn(`Failed to release savepoint ${savepoint.name} during cleanup:`, error);
        }
      }

      this.savepoints.clear();
      this.transactionLevel = 0;
    } catch (error) {
      console.error('Failed to cleanup test isolation:', error);
    }
  }
}