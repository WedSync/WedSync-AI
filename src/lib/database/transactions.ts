/**
 * Database Transaction Management for Wedding Platform
 * Ensures data integrity for critical wedding operations
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type SupabaseClient = ReturnType<typeof createClient<Database>>;

interface TransactionOptions {
  timeout?: number; // Transaction timeout in milliseconds
  retries?: number; // Number of retry attempts
  isolationLevel?: 'READ_COMMITTED' | 'SERIALIZABLE';
}

interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rollbackReason?: string;
}

class WeddingDatabaseTransaction {
  private client: SupabaseClient;
  private transactionId: string;
  private operations: Array<() => Promise<any>> = [];
  private rollbackOperations: Array<() => Promise<any>> = [];
  private isActive = false;

  constructor(client: SupabaseClient, options: TransactionOptions = {}) {
    this.client = client;
    this.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add operation to transaction
  addOperation<T>(
    operation: () => Promise<T>,
    rollback?: () => Promise<void>,
  ): this {
    this.operations.push(operation);
    if (rollback) {
      this.rollbackOperations.unshift(rollback); // Reverse order for rollback
    }
    return this;
  }

  // Execute all operations atomically
  async execute<T>(): Promise<TransactionResult<T>> {
    if (this.isActive) {
      return {
        success: false,
        error: 'Transaction already active',
      };
    }

    this.isActive = true;
    const results: any[] = [];
    let operationIndex = 0;

    try {
      // Execute operations sequentially
      for (const operation of this.operations) {
        try {
          const result = await operation();
          results.push(result);
          operationIndex++;
        } catch (operationError) {
          // Operation failed - initiate rollback
          await this.rollback(operationIndex);
          return {
            success: false,
            error:
              operationError instanceof Error
                ? operationError.message
                : 'Operation failed',
            rollbackReason: `Operation ${operationIndex + 1} failed`,
          };
        }
      }

      this.isActive = false;
      return {
        success: true,
        data: results as T,
      };
    } catch (error) {
      await this.rollback(operationIndex);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  private async rollback(failedIndex: number): Promise<void> {
    try {
      // Execute rollback operations up to the failed index
      const rollbacksToExecute = this.rollbackOperations.slice(0, failedIndex);

      for (const rollbackOp of rollbacksToExecute) {
        try {
          await rollbackOp();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
          // Continue with other rollbacks even if one fails
        }
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }

    this.isActive = false;
  }
}

// Wedding-specific transaction patterns
export class WeddingTransactions {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // Create client with all related data atomically
  async createClientWithDetails(clientData: {
    client: any;
    weddingDetails: any;
    emergencyContact?: any;
    preferences?: any;
  }): Promise<TransactionResult<any>> {
    const transaction = new WeddingDatabaseTransaction(this.client);

    let clientId: string;
    let weddingDetailsId: string;
    let emergencyContactId: string | null = null;

    transaction
      // 1. Create client record
      .addOperation(
        async () => {
          const { data, error } = await this.client
            .from('clients')
            .insert(clientData.client)
            .select()
            .single();

          if (error) throw error;
          clientId = data.id;
          return data;
        },
        async () => {
          // Rollback: Delete client
          if (clientId) {
            await this.client.from('clients').delete().eq('id', clientId);
          }
        },
      )
      // 2. Create wedding details
      .addOperation(
        async () => {
          const { data, error } = await this.client
            .from('wedding_details')
            .insert({ ...clientData.weddingDetails, client_id: clientId })
            .select()
            .single();

          if (error) throw error;
          weddingDetailsId = data.id;
          return data;
        },
        async () => {
          // Rollback: Delete wedding details
          if (weddingDetailsId) {
            await this.client
              .from('wedding_details')
              .delete()
              .eq('id', weddingDetailsId);
          }
        },
      );

    // 3. Create emergency contact if provided
    if (clientData.emergencyContact) {
      transaction.addOperation(
        async () => {
          const { data, error } = await this.client
            .from('emergency_contacts')
            .insert({ ...clientData.emergencyContact, client_id: clientId })
            .select()
            .single();

          if (error) throw error;
          emergencyContactId = data.id;
          return data;
        },
        async () => {
          // Rollback: Delete emergency contact
          if (emergencyContactId) {
            await this.client
              .from('emergency_contacts')
              .delete()
              .eq('id', emergencyContactId);
          }
        },
      );
    }

    return await transaction.execute();
  }

  // Update client with optimistic locking
  async updateClientAtomic(
    clientId: string,
    updates: any,
    expectedVersion: number,
  ): Promise<TransactionResult<any>> {
    const transaction = new WeddingDatabaseTransaction(this.client);

    let originalData: any = null;

    transaction
      // 1. Check version and get original data
      .addOperation(async () => {
        const { data, error } = await this.client
          .from('clients')
          .select('*, version')
          .eq('id', clientId)
          .single();

        if (error) throw error;
        if (data.version !== expectedVersion) {
          throw new Error(
            'Client data was modified by another user. Please refresh and try again.',
          );
        }

        originalData = data;
        return data;
      })
      // 2. Update with version increment
      .addOperation(
        async () => {
          const { data, error } = await this.client
            .from('clients')
            .update({
              ...updates,
              version: expectedVersion + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', clientId)
            .eq('version', expectedVersion) // Double-check version
            .select()
            .single();

          if (error) throw error;
          if (!data) {
            throw new Error(
              'Update failed - data was modified by another user',
            );
          }

          return data;
        },
        async () => {
          // Rollback: Restore original data
          if (originalData) {
            await this.client
              .from('clients')
              .update(originalData)
              .eq('id', clientId);
          }
        },
      );

    return await transaction.execute();
  }

  // Process payment with booking confirmation
  async processPaymentWithBooking(paymentData: {
    payment: any;
    booking: any;
    vendorId: string;
    clientId: string;
  }): Promise<TransactionResult<any>> {
    const transaction = new WeddingDatabaseTransaction(this.client);

    let paymentId: string;
    let bookingId: string;

    transaction
      // 1. Create payment record
      .addOperation(
        async () => {
          const { data, error } = await this.client
            .from('payments')
            .insert(paymentData.payment)
            .select()
            .single();

          if (error) throw error;
          paymentId = data.id;
          return data;
        },
        async () => {
          // Rollback: Mark payment as failed/cancelled
          if (paymentId) {
            await this.client
              .from('payments')
              .update({ status: 'cancelled' })
              .eq('id', paymentId);
          }
        },
      )
      // 2. Create booking with payment reference
      .addOperation(
        async () => {
          const { data, error } = await this.client
            .from('vendor_bookings')
            .insert({
              ...paymentData.booking,
              payment_id: paymentId,
              status: 'confirmed',
            })
            .select()
            .single();

          if (error) throw error;
          bookingId = data.id;
          return data;
        },
        async () => {
          // Rollback: Cancel booking
          if (bookingId) {
            await this.client
              .from('vendor_bookings')
              .update({ status: 'cancelled' })
              .eq('id', bookingId);
          }
        },
      )
      // 3. Update vendor availability
      .addOperation(
        async () => {
          const { data, error } = await this.client
            .from('vendor_availability')
            .update({ is_booked: true, booked_by: paymentData.clientId })
            .eq('vendor_id', paymentData.vendorId)
            .eq('date', paymentData.booking.booking_date)
            .select();

          if (error) throw error;
          return data;
        },
        async () => {
          // Rollback: Restore vendor availability
          await this.client
            .from('vendor_availability')
            .update({ is_booked: false, booked_by: null })
            .eq('vendor_id', paymentData.vendorId)
            .eq('date', paymentData.booking.booking_date);
        },
      );

    return await transaction.execute();
  }

  // Bulk import clients with validation
  async bulkImportClients(clients: any[]): Promise<TransactionResult<any>> {
    const transaction = new WeddingDatabaseTransaction(this.client);
    const createdIds: string[] = [];

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);

      transaction.addOperation(
        async () => {
          const { data, error } = await this.client
            .from('clients')
            .insert(batch)
            .select('id');

          if (error) throw error;
          createdIds.push(...data.map((d) => d.id));
          return data;
        },
        async () => {
          // Rollback: Delete created clients
          if (createdIds.length > 0) {
            await this.client.from('clients').delete().in('id', createdIds);
          }
        },
      );
    }

    return await transaction.execute();
  }
}

// Utility functions for common patterns
export async function withTransaction<T>(
  client: SupabaseClient,
  operations: Array<{
    execute: () => Promise<any>;
    rollback?: () => Promise<void>;
  }>,
  options: TransactionOptions = {},
): Promise<TransactionResult<T>> {
  const transaction = new WeddingDatabaseTransaction(client, options);

  for (const op of operations) {
    transaction.addOperation(op.execute, op.rollback);
  }

  return await transaction.execute<T>();
}

// Error types for better error handling
export class TransactionError extends Error {
  constructor(
    message: string,
    public transactionId: string,
    public operationIndex?: number,
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class OptimisticLockError extends Error {
  constructor(message: string = 'Data was modified by another user') {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

// Export wedding-specific transaction utilities
export { WeddingDatabaseTransaction, WeddingTransactions };
