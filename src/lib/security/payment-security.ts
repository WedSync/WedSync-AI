import { createClient } from '@/lib/supabase/server';

export interface PaymentSecurityCheck {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PaymentSecurityValidator {
  private supabase;

  constructor() {
    this.supabase = null;
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
  }

  async validatePaymentIntent(
    userId: string,
    amount: number,
    organizationId: string,
  ): Promise<PaymentSecurityCheck> {
    await this.initSupabase();

    const result: PaymentSecurityCheck = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if user belongs to organization
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('organization_id, role')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        result.valid = false;
        result.errors.push('User profile not found');
        return result;
      }

      if (profile.organization_id !== organizationId) {
        result.valid = false;
        result.errors.push('User does not belong to this organization');
        return result;
      }

      // Validate amount
      if (amount <= 0) {
        result.valid = false;
        result.errors.push('Invalid payment amount');
      }

      if (amount > 10000 * 100) {
        // $10,000 limit
        result.warnings.push('Large payment amount detected');
      }

      // Check for suspicious activity
      const recentPayments = await this.getRecentPayments(organizationId);
      if (recentPayments.length > 10) {
        result.warnings.push('High payment frequency detected');
      }
    } catch (error) {
      result.valid = false;
      result.errors.push('Payment validation failed');
    }

    return result;
  }

  private async getRecentPayments(organizationId: string): Promise<any[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: payments } = await this.supabase
      .from('payments')
      .select('id, amount, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', oneHourAgo.toISOString());

    return payments || [];
  }

  async logPaymentAttempt(
    userId: string,
    organizationId: string,
    amount: number,
    successful: boolean,
    error?: string,
  ): Promise<void> {
    await this.initSupabase();

    try {
      await this.supabase.from('payment_audit_logs').insert({
        user_id: userId,
        organization_id: organizationId,
        amount,
        successful,
        error_message: error,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log payment attempt:', error);
    }
  }
}

export const paymentSecurity = new PaymentSecurityValidator();
