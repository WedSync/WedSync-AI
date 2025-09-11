/**
 * WS-109: Financial Data Processing Service
 *
 * Handles comprehensive financial data tracking and processing for the marketplace
 * commission system including revenue records, earnings accumulation, and tax preparation.
 *
 * Team B - Batch 8 - Round 2
 */

import { createClient } from '@supabase/supabase-js';
import Decimal from 'decimal.js';
import { commissionCalculationService } from './commissionCalculationService';
import { payoutProcessingService } from './payoutProcessingService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface SaleTransaction {
  sale_id: string;
  creator_id: string;
  template_id: string;
  customer_id: string;
  gross_amount: number; // in cents
  payment_method: 'stripe' | 'paypal' | 'bank_transfer';
  currency: string;
  sale_date: Date;
  promotional_code?: string;
  bundle_sale?: boolean;
}

interface CommissionBreakdown {
  sale_id: string;
  creator_id: string;
  gross_amount_cents: number;
  commission_rate: number;
  commission_amount_cents: number;
  creator_earnings_cents: number;
  stripe_fee_cents: number;
  vat_amount_cents: number;
  net_platform_revenue_cents: number;
  creator_tier: string;
  calculation_timestamp: Date;
}

interface EarningsAccumulation {
  creator_id: string;
  total_earnings_cents: number;
  total_commission_paid_cents: number;
  pending_earnings_cents: number;
  lifetime_sales_count: number;
  lifetime_revenue_cents: number;
  current_month_earnings_cents: number;
  current_year_earnings_cents: number;
  last_updated: Date;
}

interface TaxDocumentData {
  creator_id: string;
  tax_year: number;
  total_earnings_cents: number;
  total_commission_deducted_cents: number;
  vat_collected_cents: number;
  quarterly_breakdown: Array<{
    quarter: number;
    earnings_cents: number;
    commission_cents: number;
    vat_cents: number;
  }>;
  document_generated: boolean;
  document_sent_date?: Date;
}

interface FinancialAnalytics {
  period_start: Date;
  period_end: Date;
  total_revenue_cents: number;
  total_commission_paid_cents: number;
  total_creators_paid: number;
  average_sale_amount_cents: number;
  top_performing_creators: Array<{
    creator_id: string;
    earnings_cents: number;
    sales_count: number;
  }>;
  revenue_by_tier: Record<string, number>;
}

// =====================================================================================
// FINANCIAL DATA PROCESSING SERVICE
// =====================================================================================

class FinancialDataProcessingService {
  // =====================================================================================
  // REVENUE RECORD CREATION
  // =====================================================================================

  async recordSaleTransaction(transaction: SaleTransaction): Promise<{
    success: boolean;
    revenue_record_id?: string;
    commission_breakdown?: CommissionBreakdown;
    error?: string;
  }> {
    try {
      // Start transaction for data consistency
      const { data, error: transactionError } = await supabase.rpc(
        'begin_financial_transaction',
      );

      if (transactionError) {
        throw new Error(
          `Transaction start failed: ${transactionError.message}`,
        );
      }

      // 1. Create revenue record
      const revenueRecord = await this.createRevenueRecord(transaction);

      if (!revenueRecord.success) {
        await supabase.rpc('rollback_financial_transaction');
        return revenueRecord;
      }

      // 2. Calculate and store commission breakdown
      const commissionResult = await this.processCommissionBreakdown(
        transaction,
        revenueRecord.revenue_record_id!,
      );

      if (!commissionResult.success) {
        await supabase.rpc('rollback_financial_transaction');
        return commissionResult;
      }

      // 3. Update earnings accumulation
      const earningsResult = await this.updateEarningsAccumulation(
        transaction.creator_id,
        commissionResult.commission_breakdown!,
      );

      if (!earningsResult.success) {
        await supabase.rpc('rollback_financial_transaction');
        return { success: false, error: earningsResult.error };
      }

      // 4. Update tax document data
      await this.updateTaxDocumentData(
        transaction.creator_id,
        commissionResult.commission_breakdown!,
      );

      // Commit transaction
      await supabase.rpc('commit_financial_transaction');

      // 5. Queue tier evaluation (async, don't wait)
      this.queueTierEvaluation(transaction.creator_id).catch(console.error);

      return {
        success: true,
        revenue_record_id: revenueRecord.revenue_record_id,
        commission_breakdown: commissionResult.commission_breakdown,
      };
    } catch (error) {
      console.error('Financial data processing error:', error);

      // Ensure rollback on any error
      try {
        await supabase.rpc('rollback_financial_transaction');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown financial processing error',
      };
    }
  }

  private async createRevenueRecord(transaction: SaleTransaction): Promise<{
    success: boolean;
    revenue_record_id?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('marketplace_revenue_records')
        .insert({
          sale_id: transaction.sale_id,
          creator_id: transaction.creator_id,
          template_id: transaction.template_id,
          customer_id: transaction.customer_id,
          gross_amount_cents: transaction.gross_amount,
          payment_method: transaction.payment_method,
          currency: transaction.currency,
          sale_timestamp: transaction.sale_date.toISOString(),
          promotional_code: transaction.promotional_code,
          bundle_sale: transaction.bundle_sale || false,
          processed_at: new Date().toISOString(),
          financial_year: transaction.sale_date.getFullYear(),
          financial_quarter: Math.ceil(
            (transaction.sale_date.getMonth() + 1) / 3,
          ),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Revenue record creation failed: ${error.message}`);
      }

      return {
        success: true,
        revenue_record_id: data.id,
      };
    } catch (error) {
      console.error('Revenue record creation error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Revenue record creation failed',
      };
    }
  }

  // =====================================================================================
  // COMMISSION BREAKDOWN STORAGE
  // =====================================================================================

  private async processCommissionBreakdown(
    transaction: SaleTransaction,
    revenueRecordId: string,
  ): Promise<{
    success: boolean;
    commission_breakdown?: CommissionBreakdown;
    error?: string;
  }> {
    try {
      // Calculate commission using the commission calculation service
      const calculation =
        await commissionCalculationService.calculateCommission({
          creatorId: transaction.creator_id,
          saleAmount: transaction.gross_amount / 100, // Convert cents to pounds
          templateId: transaction.template_id,
          promotionalCode: transaction.promotional_code,
          currency: transaction.currency,
        });

      // Create commission breakdown record
      const breakdown: CommissionBreakdown = {
        sale_id: transaction.sale_id,
        creator_id: transaction.creator_id,
        gross_amount_cents: transaction.gross_amount,
        commission_rate: calculation.commission_rate,
        commission_amount_cents: Math.round(
          calculation.commission_amount * 100,
        ),
        creator_earnings_cents: Math.round(calculation.creator_earnings * 100),
        stripe_fee_cents: Math.round(calculation.breakdown.stripe_fee * 100),
        vat_amount_cents: Math.round(calculation.breakdown.vat_amount * 100),
        net_platform_revenue_cents: Math.round(
          calculation.breakdown.platform_commission * 100,
        ),
        creator_tier: calculation.creator_tier,
        calculation_timestamp: new Date(),
      };

      // Store commission breakdown
      const { data, error } = await supabase
        .from('marketplace_commission_records')
        .insert({
          revenue_record_id: revenueRecordId,
          sale_id: breakdown.sale_id,
          creator_id: breakdown.creator_id,
          gross_amount_cents: breakdown.gross_amount_cents,
          commission_rate: breakdown.commission_rate,
          commission_amount_cents: breakdown.commission_amount_cents,
          creator_earnings_cents: breakdown.creator_earnings_cents,
          stripe_fee_cents: breakdown.stripe_fee_cents,
          vat_amount_cents: breakdown.vat_amount_cents,
          net_platform_revenue_cents: breakdown.net_platform_revenue_cents,
          creator_tier_at_sale: breakdown.creator_tier,
          calculated_at: breakdown.calculation_timestamp.toISOString(),
          payout_status: 'pending',
          financial_year: transaction.sale_date.getFullYear(),
          financial_quarter: Math.ceil(
            (transaction.sale_date.getMonth() + 1) / 3,
          ),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(
          `Commission breakdown storage failed: ${error.message}`,
        );
      }

      return {
        success: true,
        commission_breakdown: breakdown,
      };
    } catch (error) {
      console.error('Commission breakdown processing error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Commission breakdown processing failed',
      };
    }
  }

  // =====================================================================================
  // EARNINGS ACCUMULATION TRACKING
  // =====================================================================================

  private async updateEarningsAccumulation(
    creatorId: string,
    breakdown: CommissionBreakdown,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentYear = new Date(now.getFullYear(), 0, 1);

      // Use upsert to handle new creators and existing creators
      const { error } = await supabase
        .from('marketplace_creator_earnings_summary')
        .upsert(
          {
            creator_id: creatorId,
            total_earnings_cents: breakdown.creator_earnings_cents,
            pending_earnings_cents: breakdown.creator_earnings_cents,
            lifetime_sales_count: 1,
            lifetime_revenue_cents: breakdown.gross_amount_cents,
            current_month_earnings_cents: breakdown.creator_earnings_cents,
            current_year_earnings_cents: breakdown.creator_earnings_cents,
            last_updated: now.toISOString(),
          },
          {
            onConflict: 'creator_id',
            ignoreDuplicates: false,
          },
        );

      if (error) {
        // Try manual increment if upsert fails
        const updateResult = await this.incrementEarningsAccumulation(
          creatorId,
          breakdown,
        );
        if (!updateResult.success) {
          throw new Error(`Earnings accumulation failed: ${error.message}`);
        }
      }

      // Update monthly and quarterly aggregates
      await this.updatePeriodicAggregates(creatorId, breakdown, now);

      return { success: true };
    } catch (error) {
      console.error('Earnings accumulation update error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Earnings accumulation update failed',
      };
    }
  }

  private async incrementEarningsAccumulation(
    creatorId: string,
    breakdown: CommissionBreakdown,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentYear = new Date(now.getFullYear(), 0, 1);

      // Get current earnings or create if doesn't exist
      let { data: current, error: fetchError } = await supabase
        .from('marketplace_creator_earnings_summary')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Not found is OK
        throw new Error(
          `Failed to fetch current earnings: ${fetchError.message}`,
        );
      }

      if (!current) {
        // Create new record
        const { error: insertError } = await supabase
          .from('marketplace_creator_earnings_summary')
          .insert({
            creator_id: creatorId,
            total_earnings_cents: breakdown.creator_earnings_cents,
            pending_earnings_cents: breakdown.creator_earnings_cents,
            lifetime_sales_count: 1,
            lifetime_revenue_cents: breakdown.gross_amount_cents,
            current_month_earnings_cents: breakdown.creator_earnings_cents,
            current_year_earnings_cents: breakdown.creator_earnings_cents,
            last_updated: now.toISOString(),
          });

        if (insertError) {
          throw new Error(
            `Failed to create earnings record: ${insertError.message}`,
          );
        }
      } else {
        // Update existing record
        const isCurrentMonth =
          new Date(current.last_updated).getMonth() === now.getMonth();
        const isCurrentYear =
          new Date(current.last_updated).getFullYear() === now.getFullYear();

        const { error: updateError } = await supabase
          .from('marketplace_creator_earnings_summary')
          .update({
            total_earnings_cents:
              current.total_earnings_cents + breakdown.creator_earnings_cents,
            pending_earnings_cents:
              current.pending_earnings_cents + breakdown.creator_earnings_cents,
            lifetime_sales_count: current.lifetime_sales_count + 1,
            lifetime_revenue_cents:
              current.lifetime_revenue_cents + breakdown.gross_amount_cents,
            current_month_earnings_cents: isCurrentMonth
              ? current.current_month_earnings_cents +
                breakdown.creator_earnings_cents
              : breakdown.creator_earnings_cents,
            current_year_earnings_cents: isCurrentYear
              ? current.current_year_earnings_cents +
                breakdown.creator_earnings_cents
              : breakdown.creator_earnings_cents,
            last_updated: now.toISOString(),
          })
          .eq('creator_id', creatorId);

        if (updateError) {
          throw new Error(
            `Failed to update earnings record: ${updateError.message}`,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Earnings increment error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Earnings increment failed',
      };
    }
  }

  private async updatePeriodicAggregates(
    creatorId: string,
    breakdown: CommissionBreakdown,
    saleDate: Date,
  ): Promise<void> {
    try {
      const year = saleDate.getFullYear();
      const month = saleDate.getMonth() + 1;
      const quarter = Math.ceil(month / 3);

      // Update monthly aggregate
      await supabase.from('marketplace_creator_monthly_earnings').upsert(
        {
          creator_id: creatorId,
          year: year,
          month: month,
          earnings_cents: breakdown.creator_earnings_cents,
          sales_count: 1,
          revenue_cents: breakdown.gross_amount_cents,
        },
        {
          onConflict: 'creator_id,year,month',
          ignoreDuplicates: false,
        },
      );

      // Update quarterly aggregate
      await supabase.from('marketplace_creator_quarterly_earnings').upsert(
        {
          creator_id: creatorId,
          year: year,
          quarter: quarter,
          earnings_cents: breakdown.creator_earnings_cents,
          sales_count: 1,
          revenue_cents: breakdown.gross_amount_cents,
        },
        {
          onConflict: 'creator_id,year,quarter',
          ignoreDuplicates: false,
        },
      );
    } catch (error) {
      console.error('Periodic aggregates update error:', error);
      // Don't throw - this is supplementary data
    }
  }

  // =====================================================================================
  // TAX DOCUMENT DATA PREPARATION
  // =====================================================================================

  private async updateTaxDocumentData(
    creatorId: string,
    breakdown: CommissionBreakdown,
  ): Promise<void> {
    try {
      const taxYear = breakdown.calculation_timestamp.getFullYear();
      const quarter = Math.ceil(
        (breakdown.calculation_timestamp.getMonth() + 1) / 3,
      );

      // Get or create tax document record
      let { data: taxDoc, error: fetchError } = await supabase
        .from('marketplace_creator_tax_documents')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('tax_year', taxYear)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Tax document fetch failed: ${fetchError.message}`);
      }

      if (!taxDoc) {
        // Create new tax document record
        const quarterlyBreakdown = Array(4)
          .fill(null)
          .map((_, i) => ({
            quarter: i + 1,
            earnings_cents:
              i + 1 === quarter ? breakdown.creator_earnings_cents : 0,
            commission_cents:
              i + 1 === quarter ? breakdown.commission_amount_cents : 0,
            vat_cents: i + 1 === quarter ? breakdown.vat_amount_cents : 0,
          }));

        const { error: insertError } = await supabase
          .from('marketplace_creator_tax_documents')
          .insert({
            creator_id: creatorId,
            tax_year: taxYear,
            total_earnings_cents: breakdown.creator_earnings_cents,
            total_commission_deducted_cents: breakdown.commission_amount_cents,
            vat_collected_cents: breakdown.vat_amount_cents,
            quarterly_breakdown: quarterlyBreakdown,
            document_generated: false,
            last_updated: new Date().toISOString(),
          });

        if (insertError) {
          throw new Error(
            `Tax document creation failed: ${insertError.message}`,
          );
        }
      } else {
        // Update existing tax document
        const updatedQuarterlyBreakdown = [...taxDoc.quarterly_breakdown];
        const quarterIndex = quarter - 1;

        updatedQuarterlyBreakdown[quarterIndex] = {
          quarter: quarter,
          earnings_cents:
            (updatedQuarterlyBreakdown[quarterIndex]?.earnings_cents || 0) +
            breakdown.creator_earnings_cents,
          commission_cents:
            (updatedQuarterlyBreakdown[quarterIndex]?.commission_cents || 0) +
            breakdown.commission_amount_cents,
          vat_cents:
            (updatedQuarterlyBreakdown[quarterIndex]?.vat_cents || 0) +
            breakdown.vat_amount_cents,
        };

        const { error: updateError } = await supabase
          .from('marketplace_creator_tax_documents')
          .update({
            total_earnings_cents:
              taxDoc.total_earnings_cents + breakdown.creator_earnings_cents,
            total_commission_deducted_cents:
              taxDoc.total_commission_deducted_cents +
              breakdown.commission_amount_cents,
            vat_collected_cents:
              taxDoc.vat_collected_cents + breakdown.vat_amount_cents,
            quarterly_breakdown: updatedQuarterlyBreakdown,
            document_generated: false, // Mark for regeneration
            last_updated: new Date().toISOString(),
          })
          .eq('creator_id', creatorId)
          .eq('tax_year', taxYear);

        if (updateError) {
          throw new Error(`Tax document update failed: ${updateError.message}`);
        }
      }
    } catch (error) {
      console.error('Tax document update error:', error);
      // Don't throw - this is supplementary data that can be regenerated
    }
  }

  // =====================================================================================
  // FINANCIAL ANALYTICS & REPORTING
  // =====================================================================================

  async generateFinancialAnalytics(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<FinancialAnalytics | null> {
    try {
      // Get revenue records for the period
      const { data: revenueData, error: revenueError } = await supabase
        .from('marketplace_revenue_records')
        .select('*')
        .gte('sale_timestamp', periodStart.toISOString())
        .lt('sale_timestamp', periodEnd.toISOString());

      if (revenueError) {
        throw new Error(`Revenue data fetch failed: ${revenueError.message}`);
      }

      // Get commission records for the period
      const { data: commissionData, error: commissionError } = await supabase
        .from('marketplace_commission_records')
        .select('*')
        .gte('calculated_at', periodStart.toISOString())
        .lt('calculated_at', periodEnd.toISOString());

      if (commissionError) {
        throw new Error(
          `Commission data fetch failed: ${commissionError.message}`,
        );
      }

      // Calculate analytics
      const totalRevenue =
        revenueData?.reduce(
          (sum, record) => sum + record.gross_amount_cents,
          0,
        ) || 0;
      const totalCommissionPaid =
        commissionData?.reduce(
          (sum, record) => sum + record.creator_earnings_cents,
          0,
        ) || 0;

      const uniqueCreators = new Set(
        commissionData?.map((record) => record.creator_id) || [],
      );
      const totalCreatorsPaid = uniqueCreators.size;

      const averageSaleAmount = revenueData?.length
        ? totalRevenue / revenueData.length
        : 0;

      // Top performing creators
      const creatorEarnings = new Map<
        string,
        { earnings: number; sales: number }
      >();
      commissionData?.forEach((record) => {
        const existing = creatorEarnings.get(record.creator_id) || {
          earnings: 0,
          sales: 0,
        };
        creatorEarnings.set(record.creator_id, {
          earnings: existing.earnings + record.creator_earnings_cents,
          sales: existing.sales + 1,
        });
      });

      const topPerformingCreators = Array.from(creatorEarnings.entries())
        .sort((a, b) => b[1].earnings - a[1].earnings)
        .slice(0, 10)
        .map(([creator_id, data]) => ({
          creator_id,
          earnings_cents: data.earnings,
          sales_count: data.sales,
        }));

      // Revenue by tier
      const revenueByTier: Record<string, number> = {};
      commissionData?.forEach((record) => {
        const tier = record.creator_tier_at_sale || 'unknown';
        revenueByTier[tier] =
          (revenueByTier[tier] || 0) + record.creator_earnings_cents;
      });

      return {
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue_cents: totalRevenue,
        total_commission_paid_cents: totalCommissionPaid,
        total_creators_paid: totalCreatorsPaid,
        average_sale_amount_cents: Math.round(averageSaleAmount),
        top_performing_creators: topPerformingCreators,
        revenue_by_tier: revenueByTier,
      };
    } catch (error) {
      console.error('Financial analytics generation error:', error);
      return null;
    }
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  async getCreatorEarningsHistory(
    creatorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{
    date: string;
    earnings_cents: number;
    sales_count: number;
  }> | null> {
    try {
      let query = supabase
        .from('marketplace_commission_records')
        .select('calculated_at, creator_earnings_cents')
        .eq('creator_id', creatorId)
        .order('calculated_at', { ascending: true });

      if (startDate) {
        query = query.gte('calculated_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lt('calculated_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Earnings history fetch failed: ${error.message}`);
      }

      // Group by date
      const dailyEarnings = new Map<
        string,
        { earnings: number; count: number }
      >();

      data?.forEach((record) => {
        const date = new Date(record.calculated_at).toISOString().split('T')[0];
        const existing = dailyEarnings.get(date) || { earnings: 0, count: 0 };
        dailyEarnings.set(date, {
          earnings: existing.earnings + record.creator_earnings_cents,
          count: existing.count + 1,
        });
      });

      return Array.from(dailyEarnings.entries()).map(([date, data]) => ({
        date,
        earnings_cents: data.earnings,
        sales_count: data.count,
      }));
    } catch (error) {
      console.error('Creator earnings history error:', error);
      return null;
    }
  }

  private async queueTierEvaluation(creatorId: string): Promise<void> {
    try {
      // This would typically queue a background job
      // For now, we'll just log it
      console.log(`Queued tier evaluation for creator: ${creatorId}`);

      // In a real implementation, this might:
      // - Add to a Redis queue
      // - Schedule a background job
      // - Trigger a webhook to a tier evaluation service
    } catch (error) {
      console.error('Tier evaluation queueing error:', error);
      // Don't throw - this is non-critical
    }
  }

  // =====================================================================================
  // DATA INTEGRITY METHODS
  // =====================================================================================

  async validateFinancialDataIntegrity(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    valid: boolean;
    issues: Array<{
      type: string;
      description: string;
      count: number;
    }>;
  }> {
    try {
      const issues: Array<{
        type: string;
        description: string;
        count: number;
      }> = [];

      // Check for orphaned commission records (no corresponding revenue record)
      const { data: orphanedCommissions, error: orphanError } = await supabase
        .from('marketplace_commission_records')
        .select('id, sale_id')
        .gte('calculated_at', startDate.toISOString())
        .lt('calculated_at', endDate.toISOString())
        .not(
          'revenue_record_id',
          'in',
          `(${'SELECT id FROM marketplace_revenue_records'})`,
        );

      if (orphanError) {
        console.error('Orphaned commission check failed:', orphanError);
      } else if (orphanedCommissions && orphanedCommissions.length > 0) {
        issues.push({
          type: 'orphaned_commissions',
          description:
            'Commission records without corresponding revenue records',
          count: orphanedCommissions.length,
        });
      }

      // Check for missing commission records (revenue without commission)
      const { data: missingCommissions, error: missingError } = await supabase
        .from('marketplace_revenue_records')
        .select('id, sale_id')
        .gte('sale_timestamp', startDate.toISOString())
        .lt('sale_timestamp', endDate.toISOString())
        .not(
          'id',
          'in',
          `(${'SELECT revenue_record_id FROM marketplace_commission_records WHERE revenue_record_id IS NOT NULL'})`,
        );

      if (missingError) {
        console.error('Missing commission check failed:', missingError);
      } else if (missingCommissions && missingCommissions.length > 0) {
        issues.push({
          type: 'missing_commissions',
          description:
            'Revenue records without corresponding commission calculations',
          count: missingCommissions.length,
        });
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      console.error('Financial data integrity validation error:', error);
      return {
        valid: false,
        issues: [
          {
            type: 'validation_error',
            description: 'Failed to validate data integrity',
            count: 1,
          },
        ],
      };
    }
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const financialDataProcessingService =
  new FinancialDataProcessingService();
export type {
  SaleTransaction,
  CommissionBreakdown,
  EarningsAccumulation,
  TaxDocumentData,
  FinancialAnalytics,
};
