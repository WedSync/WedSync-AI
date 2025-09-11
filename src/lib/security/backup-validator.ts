import { createClient } from '@/lib/supabase/server';

interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    tableCount: number;
    recordCount: number;
    estimatedSize: string;
  };
}

export class BackupValidator {
  private supabase;

  constructor() {
    this.supabase = null; // Will be initialized when needed
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
  }

  async validateBackupIntegrity(
    backupData: any,
  ): Promise<BackupValidationResult> {
    await this.initSupabase();

    const result: BackupValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: {
        tableCount: 0,
        recordCount: 0,
        estimatedSize: '0 MB',
      },
    };

    try {
      // Validate backup data structure
      if (!backupData || typeof backupData !== 'object') {
        result.valid = false;
        result.errors.push('Invalid backup data format');
        return result;
      }

      // Check for required tables
      const requiredTables = [
        'user_profiles',
        'organizations',
        'clients',
        'forms',
        'journeys',
      ];

      for (const table of requiredTables) {
        if (!backupData[table]) {
          result.warnings.push(`Missing table: ${table}`);
        } else {
          result.metadata.tableCount++;
          result.metadata.recordCount += Array.isArray(backupData[table])
            ? backupData[table].length
            : 0;
        }
      }

      // Validate data integrity
      await this.validateDataRelationships(backupData, result);

      // Estimate size
      const dataString = JSON.stringify(backupData);
      const sizeBytes = new Blob([dataString]).size;
      result.metadata.estimatedSize = this.formatBytes(sizeBytes);

      // Check for sensitive data
      this.checkSensitiveData(backupData, result);
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return result;
  }

  private async validateDataRelationships(
    backupData: any,
    result: BackupValidationResult,
  ) {
    // Check organization -> user relationships
    if (backupData.user_profiles && backupData.organizations) {
      const orgIds = backupData.organizations.map((org: any) => org.id);
      const orphanedUsers = backupData.user_profiles.filter(
        (user: any) =>
          user.organization_id && !orgIds.includes(user.organization_id),
      );

      if (orphanedUsers.length > 0) {
        result.warnings.push(
          `Found ${orphanedUsers.length} users without valid organizations`,
        );
      }
    }

    // Check client -> organization relationships
    if (backupData.clients && backupData.organizations) {
      const orgIds = backupData.organizations.map((org: any) => org.id);
      const orphanedClients = backupData.clients.filter(
        (client: any) =>
          client.organization_id && !orgIds.includes(client.organization_id),
      );

      if (orphanedClients.length > 0) {
        result.warnings.push(
          `Found ${orphanedClients.length} clients without valid organizations`,
        );
      }
    }
  }

  private checkSensitiveData(backupData: any, result: BackupValidationResult) {
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'hash'];

    const checkObject = (obj: any, path: string = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      Object.keys(obj).forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;

        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          result.warnings.push(
            `Potential sensitive data found at: ${fullPath}`,
          );
        }

        if (typeof obj[key] === 'object') {
          checkObject(obj[key], fullPath);
        }
      });
    };

    Object.keys(backupData).forEach((table) => {
      if (Array.isArray(backupData[table])) {
        backupData[table].forEach((record: any, index: number) => {
          checkObject(record, `${table}[${index}]`);
        });
      }
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async validateBackupPermissions(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    await this.initSupabase();

    try {
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('role, permissions, organization_id')
        .eq('user_id', userId)
        .single();

      if (!profile) return false;

      // Check if user belongs to the organization
      if (profile.organization_id !== organizationId) return false;

      // Check permissions
      return (
        profile.role === 'super_admin' ||
        profile.permissions?.includes('backup:create') ||
        profile.permissions?.includes('backup:manage')
      );
    } catch (error) {
      console.error('Error validating backup permissions:', error);
      return false;
    }
  }
}

export const backupValidator = new BackupValidator();
