import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  weddingEncryption,
  ENCRYPTED_FIELD_TYPES,
  getEncryptedFieldsForType,
} from '@/lib/security/wedding-data-encryption';

export interface SecureDataOptions {
  autoEncrypt?: boolean;
  autoDecrypt?: boolean;
  auditLog?: boolean;
}

export class SecureDataService {
  private supabase = createClientComponentClient();
  private readonly defaultOptions: SecureDataOptions = {
    autoEncrypt: true,
    autoDecrypt: true,
    auditLog: true,
  };

  /**
   * Store guest data with automatic encryption
   */
  async storeGuestData(
    weddingId: string,
    guestData: any,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let dataToStore = guestData;

      if (opts.autoEncrypt) {
        dataToStore = await weddingEncryption.encryptGuestData(
          weddingId,
          guestData,
        );
      }

      const { data, error } = await this.supabase
        .from('wedding_guests')
        .insert({
          wedding_id: weddingId,
          ...dataToStore,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'encrypt', 'guest_data');
      }

      return opts.autoDecrypt
        ? await weddingEncryption.decryptGuestData(data)
        : data;
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'encrypt',
          'guest_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Retrieve guest data with automatic decryption
   */
  async getGuestData(
    weddingId: string,
    guestId?: string,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let query = this.supabase
        .from('wedding_guests')
        .select('*')
        .eq('wedding_id', weddingId);

      if (guestId) {
        query = query.eq('id', guestId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'decrypt', 'guest_data');
      }

      if (!opts.autoDecrypt) return data;

      // Decrypt the data
      if (Array.isArray(data)) {
        return await weddingEncryption.decryptBulkData(
          data,
          getEncryptedFieldsForType('GUEST_DATA'),
        );
      } else {
        return await weddingEncryption.decryptGuestData(data);
      }
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'decrypt',
          'guest_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Update guest data with automatic encryption
   */
  async updateGuestData(
    weddingId: string,
    guestId: string,
    updates: any,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let dataToUpdate = updates;

      if (opts.autoEncrypt) {
        dataToUpdate = await weddingEncryption.encryptGuestData(
          weddingId,
          updates,
        );
      }

      const { data, error } = await this.supabase
        .from('wedding_guests')
        .update({
          ...dataToUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .select()
        .single();

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'encrypt', 'guest_data');
      }

      return opts.autoDecrypt
        ? await weddingEncryption.decryptGuestData(data)
        : data;
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'encrypt',
          'guest_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Store budget data with automatic encryption
   */
  async storeBudgetData(
    weddingId: string,
    budgetData: any,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let dataToStore = budgetData;

      if (opts.autoEncrypt) {
        dataToStore = await weddingEncryption.encryptBudgetData(
          weddingId,
          budgetData,
        );
      }

      const { data, error } = await this.supabase
        .from('wedding_budget_items')
        .insert({
          wedding_id: weddingId,
          ...dataToStore,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'encrypt', 'budget_data');
      }

      return opts.autoDecrypt
        ? await weddingEncryption.decryptBudgetData(data)
        : data;
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'encrypt',
          'budget_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Retrieve budget data with automatic decryption
   */
  async getBudgetData(
    weddingId: string,
    budgetId?: string,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let query = this.supabase
        .from('wedding_budget_items')
        .select('*')
        .eq('wedding_id', weddingId);

      if (budgetId) {
        query = query.eq('id', budgetId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'decrypt', 'budget_data');
      }

      if (!opts.autoDecrypt) return data;

      // Decrypt the data
      if (Array.isArray(data)) {
        return await weddingEncryption.decryptBulkData(
          data,
          getEncryptedFieldsForType('BUDGET_DATA'),
        );
      } else {
        return await weddingEncryption.decryptBudgetData(data);
      }
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'decrypt',
          'budget_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Store vendor data with automatic encryption
   */
  async storeVendorData(
    weddingId: string,
    vendorData: any,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let dataToStore = vendorData;

      if (opts.autoEncrypt) {
        dataToStore = await weddingEncryption.encryptVendorData(
          weddingId,
          vendorData,
        );
      }

      const { data, error } = await this.supabase
        .from('wedding_vendors')
        .insert({
          wedding_id: weddingId,
          ...dataToStore,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'encrypt', 'vendor_data');
      }

      return opts.autoDecrypt
        ? await weddingEncryption.decryptVendorData(data)
        : data;
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'encrypt',
          'vendor_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Retrieve vendor data with automatic decryption
   */
  async getVendorData(
    weddingId: string,
    vendorId?: string,
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let query = this.supabase
        .from('wedding_vendors')
        .select('*')
        .eq('wedding_id', weddingId);

      if (vendorId) {
        query = query.eq('id', vendorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'decrypt', 'vendor_data');
      }

      if (!opts.autoDecrypt) return data;

      // Decrypt the data
      if (Array.isArray(data)) {
        return await weddingEncryption.decryptBulkData(
          data,
          getEncryptedFieldsForType('VENDOR_DATA'),
        );
      } else {
        return await weddingEncryption.decryptVendorData(data);
      }
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'decrypt',
          'vendor_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Bulk import guests with encryption
   */
  async bulkImportGuests(
    weddingId: string,
    guestsData: any[],
    options?: SecureDataOptions,
  ) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let dataToStore = guestsData;

      if (opts.autoEncrypt) {
        dataToStore = await weddingEncryption.encryptBulkData(
          weddingId,
          guestsData,
          getEncryptedFieldsForType('GUEST_DATA'),
        );
      }

      // Add wedding_id and timestamps to all records
      const recordsToInsert = dataToStore.map((guest) => ({
        wedding_id: weddingId,
        ...guest,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await this.supabase
        .from('wedding_guests')
        .insert(recordsToInsert)
        .select();

      if (error) throw error;

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'encrypt', 'guest_data_bulk');
      }

      if (!opts.autoDecrypt) return data;

      return await weddingEncryption.decryptBulkData(
        data,
        getEncryptedFieldsForType('GUEST_DATA'),
      );
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'encrypt',
          'guest_data_bulk',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Search encrypted data (limited capability)
   */
  async searchGuestsByName(
    weddingId: string,
    searchTerm: string,
    options?: SecureDataOptions,
  ) {
    // Note: Full-text search on encrypted data is not possible
    // This would require specialized encrypted search techniques
    // For now, we'll fetch all guests and search client-side

    const allGuests = await this.getGuestData(weddingId, undefined, options);

    if (!searchTerm.trim()) return allGuests;

    return allGuests.filter((guest: any) => {
      const fullName = guest.fullName || '';
      return fullName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  /**
   * Export wedding data with decryption
   */
  async exportWeddingData(weddingId: string, options?: SecureDataOptions) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const [guests, budget, vendors] = await Promise.all([
        this.getGuestData(weddingId, undefined, opts),
        this.getBudgetData(weddingId, undefined, opts),
        this.getVendorData(weddingId, undefined, opts),
      ]);

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'export', 'full_wedding_data');
      }

      return {
        guests,
        budget,
        vendors,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'export',
          'full_wedding_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Delete all wedding data securely
   */
  async deleteWeddingData(weddingId: string, options?: SecureDataOptions) {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Delete all related data
      const deletePromises = [
        this.supabase
          .from('wedding_guests')
          .delete()
          .eq('wedding_id', weddingId),
        this.supabase
          .from('wedding_budget_items')
          .delete()
          .eq('wedding_id', weddingId),
        this.supabase
          .from('wedding_vendors')
          .delete()
          .eq('wedding_id', weddingId),
        this.supabase
          .from('wedding_encryption_keys')
          .delete()
          .eq('wedding_id', weddingId),
      ];

      await Promise.all(deletePromises);

      if (opts.auditLog) {
        await this.logDataOperation(weddingId, 'delete', 'full_wedding_data');
      }

      return { success: true };
    } catch (error) {
      if (opts.auditLog) {
        await this.logDataOperation(
          weddingId,
          'delete',
          'full_wedding_data',
          false,
          error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Log data operation for audit trail
   */
  private async logDataOperation(
    weddingId: string,
    operation: string,
    fieldPath?: string,
    success: boolean = true,
    errorMessage?: string,
  ) {
    try {
      await this.supabase.from('encryption_audit_log').insert({
        wedding_id: weddingId,
        operation,
        field_path: fieldPath,
        success,
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log data operation:', error);
      // Don't throw - this is just logging
    }
  }

  /**
   * Get encryption statistics for a wedding
   */
  async getEncryptionStats(weddingId: string) {
    try {
      const { data, error } = await this.supabase
        .from('encryption_stats')
        .select('*')
        .eq('wedding_id', weddingId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to get encryption stats:', error);
      return null;
    }
  }

  /**
   * Rotate encryption key for a wedding
   */
  async rotateEncryptionKey(weddingId: string) {
    try {
      const { data, error } = await this.supabase.rpc(
        'rotate_wedding_encryption_key',
        { p_wedding_id: weddingId },
      );

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to rotate encryption key:', error);
      throw error;
    }
  }
}

// Singleton instance
export const secureDataService = new SecureDataService();

// React hook for secure data operations
export function useSecureData() {
  return {
    storeGuestData: secureDataService.storeGuestData.bind(secureDataService),
    getGuestData: secureDataService.getGuestData.bind(secureDataService),
    updateGuestData: secureDataService.updateGuestData.bind(secureDataService),
    storeBudgetData: secureDataService.storeBudgetData.bind(secureDataService),
    getBudgetData: secureDataService.getBudgetData.bind(secureDataService),
    storeVendorData: secureDataService.storeVendorData.bind(secureDataService),
    getVendorData: secureDataService.getVendorData.bind(secureDataService),
    bulkImportGuests:
      secureDataService.bulkImportGuests.bind(secureDataService),
    searchGuestsByName:
      secureDataService.searchGuestsByName.bind(secureDataService),
    exportWeddingData:
      secureDataService.exportWeddingData.bind(secureDataService),
    deleteWeddingData:
      secureDataService.deleteWeddingData.bind(secureDataService),
    getEncryptionStats:
      secureDataService.getEncryptionStats.bind(secureDataService),
    rotateEncryptionKey:
      secureDataService.rotateEncryptionKey.bind(secureDataService),
  };
}
