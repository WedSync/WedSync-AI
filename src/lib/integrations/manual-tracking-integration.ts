/**
 * WS-164: Manual Tracking Integration
 * OCR receipt processing, file storage, and accounting API integration
 * Team C Integration Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { financialApiSecurity } from '@/lib/security/financial-api-security';
import { budgetIntegration } from './budget-integration';

export interface ReceiptData {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrData?: ExtractedReceiptData;
  expenseId?: string;
}

export interface ExtractedReceiptData {
  merchantName?: string;
  merchantAddress?: string;
  totalAmount: number;
  taxAmount?: number;
  tipAmount?: number;
  currency: string;
  date?: Date;
  items: ReceiptItem[];
  confidence: number;
  rawText: string;
  metadata: Record<string, any>;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface ExpenseApprovalWorkflow {
  id: string;
  expenseId: string;
  weddingId: string;
  currentStep:
    | 'pending'
    | 'couple_review'
    | 'planner_approval'
    | 'approved'
    | 'rejected';
  approvers: WorkflowApprover[];
  approvalHistory: ApprovalStep[];
  dueDate?: Date;
  escalationRules: EscalationRule[];
}

export interface WorkflowApprover {
  userId: string;
  role: 'couple' | 'planner' | 'coordinator' | 'vendor';
  required: boolean;
  order: number;
}

export interface ApprovalStep {
  stepId: string;
  approverId: string;
  action: 'approved' | 'rejected' | 'requested_changes';
  comment?: string;
  timestamp: Date;
  attachments?: string[];
}

export interface EscalationRule {
  condition: 'timeout' | 'amount_threshold' | 'category_type';
  value: any;
  escalateTo: string;
  actionType: 'notify' | 'auto_approve' | 'require_additional_approval';
}

export interface AccountingIntegration {
  provider: 'quickbooks' | 'xero' | 'freshbooks';
  companyId: string;
  accessToken: string;
  lastSyncAt?: Date;
  syncStatus: 'connected' | 'error' | 'expired';
}

export class ManualTrackingIntegration {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  /**
   * Upload and process receipt with OCR
   */
  async uploadReceiptWithOCR(
    file: File,
    weddingId: string,
    userId: string,
    options?: {
      autoCreateExpense?: boolean;
      budgetCategoryId?: string;
      tags?: string[];
    },
  ): Promise<{
    success: boolean;
    receiptData?: ReceiptData;
    expenseId?: string;
    error?: string;
  }> {
    try {
      // 1. Upload file to secure storage
      const uploadResult = await this.uploadFile(file, weddingId, userId);
      if (!uploadResult.success) {
        return { success: false, error: 'File upload failed' };
      }

      // 2. Create receipt record
      const { data: receiptData, error: receiptError } = await this.supabase
        .from('receipts')
        .insert({
          file_name: file.name,
          file_url: uploadResult.fileUrl!,
          mime_type: file.type,
          file_size: file.size,
          wedding_id: weddingId,
          uploaded_by: userId,
          ocr_status: 'pending',
        })
        .select()
        .single();

      if (receiptError) {
        throw new Error(
          `Failed to create receipt record: ${receiptError.message}`,
        );
      }

      // 3. Process OCR asynchronously
      const ocrResult = await this.processReceiptOCR(
        receiptData.id,
        uploadResult.fileUrl!,
      );

      let expenseId: string | undefined;

      // 4. Auto-create expense if requested and OCR successful
      if (
        options?.autoCreateExpense &&
        ocrResult.success &&
        ocrResult.extractedData
      ) {
        const expenseResult = await this.createExpenseFromReceipt(
          weddingId,
          userId,
          ocrResult.extractedData,
          receiptData.id,
          options.budgetCategoryId,
          options.tags,
        );

        if (expenseResult.success) {
          expenseId = expenseResult.expenseId;

          // Update receipt with expense ID
          await this.supabase
            .from('receipts')
            .update({ expense_id: expenseId })
            .eq('id', receiptData.id);
        }
      }

      return {
        success: true,
        receiptData: receiptData,
        expenseId,
      };
    } catch (error) {
      console.error('Receipt upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * OCR Processing using Tesseract or cloud OCR service
   */
  private async processReceiptOCR(
    receiptId: string,
    fileUrl: string,
  ): Promise<{
    success: boolean;
    extractedData?: ExtractedReceiptData;
    error?: string;
  }> {
    try {
      // Update status to processing
      await this.supabase
        .from('receipts')
        .update({ ocr_status: 'processing' })
        .eq('id', receiptId);

      // Simulate OCR processing (in production, use actual OCR service)
      const extractedData = await this.performOCRExtraction(fileUrl);

      // Update receipt with OCR results
      await this.supabase
        .from('receipts')
        .update({
          ocr_status: 'completed',
          ocr_data: extractedData,
        })
        .eq('id', receiptId);

      return { success: true, extractedData };
    } catch (error) {
      console.error('OCR processing error:', error);

      // Update status to failed
      await this.supabase
        .from('receipts')
        .update({ ocr_status: 'failed' })
        .eq('id', receiptId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  }

  /**
   * Mock OCR extraction (replace with actual OCR service)
   */
  private async performOCRExtraction(
    fileUrl: string,
  ): Promise<ExtractedReceiptData> {
    // In production, this would use services like:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Form Recognizer
    // - Tesseract.js for client-side processing

    // Mock extracted data
    const mockExtractedData: ExtractedReceiptData = {
      merchantName: 'Wedding Venue LLC',
      merchantAddress: '123 Wedding St, City, State 12345',
      totalAmount: 2500.0,
      taxAmount: 200.0,
      currency: 'USD',
      date: new Date(),
      items: [
        {
          description: 'Venue rental',
          quantity: 1,
          unitPrice: 2000.0,
          totalPrice: 2000.0,
          category: 'venue',
        },
        {
          description: 'Setup fee',
          quantity: 1,
          unitPrice: 300.0,
          totalPrice: 300.0,
          category: 'venue',
        },
      ],
      confidence: 0.85,
      rawText:
        'WEDDING VENUE LLC\n123 Wedding St\nCity, State 12345\n\nVenue rental    $2,000.00\nSetup fee       $300.00\nSubtotal        $2,300.00\nTax             $200.00\nTotal           $2,500.00',
      metadata: {
        ocrEngine: 'mock',
        processingTime: '2.3s',
        imageQuality: 'good',
      },
    };

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return mockExtractedData;
  }

  /**
   * Create expense from OCR-extracted receipt data
   */
  private async createExpenseFromReceipt(
    weddingId: string,
    userId: string,
    extractedData: ExtractedReceiptData,
    receiptId: string,
    budgetCategoryId?: string,
    tags?: string[],
  ): Promise<{ success: boolean; expenseId?: string; error?: string }> {
    try {
      // Auto-categorize if no budget category specified
      let categoryId = budgetCategoryId;
      if (!categoryId && extractedData.merchantName) {
        const classification = await budgetIntegration.categorizeExpense(
          extractedData.merchantName,
          extractedData.totalAmount,
          extractedData.merchantName,
          weddingId,
        );

        // Find budget category by name
        const { data: category } = await this.supabase
          .from('budget_calculations')
          .select('id')
          .eq('wedding_id', weddingId)
          .eq('category', classification.category)
          .single();

        categoryId = category?.id;
      }

      // Create expense record
      const { data: expense, error: expenseError } = await this.supabase
        .from('expense_tracking')
        .insert({
          wedding_id: weddingId,
          budget_category_id: categoryId,
          expense_name: extractedData.merchantName || 'Manual Receipt Entry',
          description: `Receipt processed: ${extractedData.items.map((i) => i.description).join(', ')}`,
          amount: extractedData.totalAmount,
          currency: extractedData.currency,
          status: 'confirmed',
          confirmation_required: false,
          expense_date:
            extractedData.date?.toISOString().split('T')[0] ||
            new Date().toISOString().split('T')[0],
          receipt_url: receiptId, // Link to receipt
          tags: [...(tags || []), 'receipt_processed', 'ocr_extracted'],
          created_by: userId,
          metadata: {
            receipt_id: receiptId,
            ocr_confidence: extractedData.confidence,
            merchant_name: extractedData.merchantName,
            tax_amount: extractedData.taxAmount,
            items_count: extractedData.items.length,
            processing_method: 'ocr_automatic',
          },
        })
        .select()
        .single();

      if (expenseError) {
        throw new Error(`Failed to create expense: ${expenseError.message}`);
      }

      // Update budget if category is specified
      if (categoryId) {
        await budgetIntegration.updateBudgetCalculations(weddingId, {
          categoryId,
          amount: extractedData.totalAmount,
          status: 'confirmed',
        });
      }

      // Create approval workflow if needed
      if (extractedData.totalAmount > 500) {
        // Threshold for approval
        await this.createApprovalWorkflow(
          expense.id,
          weddingId,
          extractedData.totalAmount,
        );
      }

      return { success: true, expenseId: expense.id };
    } catch (error) {
      console.error('Create expense error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create expense',
      };
    }
  }

  /**
   * File upload to secure storage
   */
  private async uploadFile(
    file: File,
    weddingId: string,
    userId: string,
  ): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    try {
      const fileName = `receipts/${weddingId}/${Date.now()}-${file.name}`;

      const { data, error } = await this.supabase.storage
        .from('wedding-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from('wedding-documents')
        .getPublicUrl(fileName);

      return {
        success: true,
        fileUrl: publicUrlData.publicUrl,
      };
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Create expense approval workflow
   */
  private async createApprovalWorkflow(
    expenseId: string,
    weddingId: string,
    amount: number,
  ): Promise<void> {
    try {
      // Get wedding details to determine approvers
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('couple_id, partner_id')
        .eq('id', weddingId)
        .single();

      if (!wedding) return;

      // Define approval workflow based on amount
      const approvers: WorkflowApprover[] = [
        {
          userId: wedding.couple_id,
          role: 'couple',
          required: true,
          order: 1,
        },
      ];

      // Add planner approval for large expenses
      if (amount > 1000) {
        const { data: planner } = await this.supabase
          .from('wedding_team_members')
          .select('user_id')
          .eq('wedding_id', weddingId)
          .eq('role', 'planner')
          .single();

        if (planner) {
          approvers.push({
            userId: planner.user_id,
            role: 'planner',
            required: true,
            order: 2,
          });
        }
      }

      const escalationRules: EscalationRule[] = [
        {
          condition: 'timeout',
          value: 48, // hours
          escalateTo: wedding.partner_id || wedding.couple_id,
          actionType: 'notify',
        },
        {
          condition: 'amount_threshold',
          value: 2000,
          escalateTo: 'admin',
          actionType: 'require_additional_approval',
        },
      ];

      // Create workflow
      const { error } = await this.supabase
        .from('expense_approval_workflows')
        .insert({
          expense_id: expenseId,
          wedding_id: weddingId,
          current_step: 'pending',
          approvers,
          approval_history: [],
          due_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 3 days
          escalation_rules: escalationRules,
        });

      if (error) {
        console.error('Failed to create approval workflow:', error);
      }
    } catch (error) {
      console.error('Approval workflow creation error:', error);
    }
  }

  /**
   * Sync with accounting software (QuickBooks/Xero)
   */
  async syncWithAccounting(
    weddingId: string,
    provider: 'quickbooks' | 'xero',
    expenseIds: string[],
  ): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    try {
      let syncedCount = 0;
      const errors: string[] = [];

      // Get integration settings
      const { data: integration } = await this.supabase
        .from('accounting_integrations')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('provider', provider)
        .single();

      if (!integration) {
        return {
          success: false,
          syncedCount: 0,
          errors: ['No accounting integration found'],
        };
      }

      // Get expenses to sync
      const { data: expenses, error: expenseError } = await this.supabase
        .from('expense_tracking')
        .select('*')
        .in('id', expenseIds)
        .eq('wedding_id', weddingId);

      if (expenseError || !expenses) {
        return {
          success: false,
          syncedCount: 0,
          errors: ['Failed to fetch expenses'],
        };
      }

      // Sync each expense
      for (const expense of expenses) {
        try {
          const syncResult = await this.syncExpenseToAccounting(
            expense,
            provider,
            integration,
          );
          if (syncResult.success) {
            syncedCount++;

            // Update expense with accounting reference
            await this.supabase
              .from('expense_tracking')
              .update({
                metadata: {
                  ...expense.metadata,
                  accounting_sync: {
                    provider,
                    external_id: syncResult.externalId,
                    synced_at: new Date().toISOString(),
                  },
                },
              })
              .eq('id', expense.id);
          } else {
            errors.push(
              `Failed to sync expense ${expense.id}: ${syncResult.error}`,
            );
          }
        } catch (error) {
          errors.push(`Error syncing expense ${expense.id}: ${error}`);
        }
      }

      return { success: errors.length === 0, syncedCount, errors };
    } catch (error) {
      console.error('Accounting sync error:', error);
      return {
        success: false,
        syncedCount: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
      };
    }
  }

  /**
   * Sync individual expense to accounting software
   */
  private async syncExpenseToAccounting(
    expense: any,
    provider: 'quickbooks' | 'xero',
    integration: AccountingIntegration,
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      const accountingData = this.prepareAccountingData(expense, provider);

      const result = await financialApiSecurity.makeSecureApiRequest(
        provider,
        provider === 'quickbooks'
          ? '/v3/company/expenses'
          : '/api.xro/2.0/Expenses',
        'POST',
        accountingData,
        {
          auditAction: `sync_expense_to_${provider}`,
          userId: expense.created_by,
        },
      );

      if (result.success && result.data) {
        const externalId =
          provider === 'quickbooks'
            ? result.data.QueryResponse?.Expense?.[0]?.Id
            : result.data.Expenses?.[0]?.ExpenseID;

        return { success: true, externalId };
      }

      return { success: false, error: 'Sync request failed' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync error',
      };
    }
  }

  /**
   * Prepare expense data for accounting software
   */
  private prepareAccountingData(
    expense: any,
    provider: 'quickbooks' | 'xero',
  ): any {
    const baseDate = new Date(expense.expense_date).toISOString().split('T')[0];

    if (provider === 'quickbooks') {
      return {
        Name: expense.expense_name,
        Amount: expense.amount,
        Description: expense.description,
        TxnDate: baseDate,
        Category: expense.tags?.[0] || 'Wedding Expenses',
        PaymentType: 'Cash', // Default payment type
        Memo: `Wedding expense - ${expense.expense_name}`,
        Status: 'Paid',
      };
    } else {
      // Xero
      return {
        Date: baseDate,
        Contact: {
          Name: expense.metadata?.merchant_name || 'Wedding Vendor',
        },
        LineItems: [
          {
            Description: expense.expense_name,
            UnitAmount: expense.amount,
            TaxType: 'NONE',
            AccountCode: '400', // Default expense account
          },
        ],
        Status: 'PAID',
        Reference: expense.id,
      };
    }
  }

  /**
   * Process expense approval
   */
  async processExpenseApproval(
    workflowId: string,
    approverId: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string,
    attachments?: string[],
  ): Promise<{ success: boolean; nextStep?: string; completed?: boolean }> {
    try {
      // Get workflow details
      const { data: workflow, error: workflowError } = await this.supabase
        .from('expense_approval_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        return { success: false };
      }

      // Create approval step
      const approvalStep: ApprovalStep = {
        stepId: crypto.randomUUID(),
        approverId,
        action,
        comment,
        timestamp: new Date(),
        attachments,
      };

      // Update approval history
      const updatedHistory = [
        ...(workflow.approval_history || []),
        approvalStep,
      ];

      // Determine next step
      let nextStep = workflow.current_step;
      let completed = false;

      if (action === 'rejected') {
        nextStep = 'rejected';
        completed = true;
      } else if (action === 'approved') {
        // Check if all required approvers have approved
        const requiredApprovers = workflow.approvers.filter(
          (a: any) => a.required,
        );
        const approvedBy = updatedHistory
          .filter((h) => h.action === 'approved')
          .map((h) => h.approverId);

        const allApproved = requiredApprovers.every((approver: any) =>
          approvedBy.includes(approver.userId),
        );

        if (allApproved) {
          nextStep = 'approved';
          completed = true;
        } else {
          // Move to next approval step
          const currentApprover = requiredApprovers.find(
            (a: any) => a.userId === approverId,
          );
          const nextApprover = requiredApprovers.find(
            (a: any) =>
              a.order > (currentApprover?.order || 0) &&
              !approvedBy.includes(a.userId),
          );

          nextStep = nextApprover ? 'pending' : 'approved';
          completed = !nextApprover;
        }
      }

      // Update workflow
      const { error: updateError } = await this.supabase
        .from('expense_approval_workflows')
        .update({
          current_step: nextStep,
          approval_history: updatedHistory,
          ...(completed && { completed_at: new Date().toISOString() }),
        })
        .eq('id', workflowId);

      if (updateError) {
        throw new Error(`Failed to update workflow: ${updateError.message}`);
      }

      // Update expense status if workflow is complete
      if (completed) {
        const finalStatus = nextStep === 'approved' ? 'confirmed' : 'rejected';
        await this.supabase
          .from('expense_tracking')
          .update({ status: finalStatus })
          .eq('id', workflow.expense_id);
      }

      return { success: true, nextStep, completed };
    } catch (error) {
      console.error('Approval processing error:', error);
      return { success: false };
    }
  }

  /**
   * Bulk expense operations
   */
  async bulkProcessExpenses(
    weddingId: string,
    operations: Array<{
      expenseId: string;
      operation: 'approve' | 'reject' | 'sync_accounting' | 'categorize';
      data?: any;
    }>,
  ): Promise<{
    success: boolean;
    results: Array<{ expenseId: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{
      expenseId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const operation of operations) {
      try {
        let operationResult: { success: boolean; error?: string } = {
          success: false,
        };

        switch (operation.operation) {
          case 'approve':
            // Auto-approve expense
            operationResult = await this.autoApproveExpense(
              operation.expenseId,
            );
            break;
          case 'reject':
            // Reject expense
            operationResult = await this.rejectExpense(
              operation.expenseId,
              operation.data?.reason,
            );
            break;
          case 'sync_accounting':
            // Sync to accounting software
            const syncResult = await this.syncWithAccounting(
              weddingId,
              operation.data?.provider,
              [operation.expenseId],
            );
            operationResult = {
              success: syncResult.success,
              error: syncResult.errors[0],
            };
            break;
          case 'categorize':
            // Re-categorize expense
            operationResult = await this.recategorizeExpense(
              operation.expenseId,
              operation.data?.categoryId,
            );
            break;
        }

        results.push({
          expenseId: operation.expenseId,
          success: operationResult.success,
          error: operationResult.error,
        });
      } catch (error) {
        results.push({
          expenseId: operation.expenseId,
          success: false,
          error: error instanceof Error ? error.message : 'Operation failed',
        });
      }
    }

    const overallSuccess = results.every((r) => r.success);
    return { success: overallSuccess, results };
  }

  private async autoApproveExpense(
    expenseId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('expense_tracking')
      .update({ status: 'confirmed' })
      .eq('id', expenseId);

    return { success: !error, error: error?.message };
  }

  private async rejectExpense(
    expenseId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('expense_tracking')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', expenseId);

    return { success: !error, error: error?.message };
  }

  private async recategorizeExpense(
    expenseId: string,
    categoryId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('expense_tracking')
      .update({ budget_category_id: categoryId })
      .eq('id', expenseId);

    return { success: !error, error: error?.message };
  }
}

export const manualTrackingIntegration = new ManualTrackingIntegration();
