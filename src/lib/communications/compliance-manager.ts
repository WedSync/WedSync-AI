import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { Database } from '@/types/database';

interface ComplianceConfig {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

interface UnsubscribeToken {
  recipientId: string;
  campaignId: string;
  organizationId: string;
  email: string;
  expiresAt: Date;
}

/**
 * CAN-SPAM and GDPR compliance manager for guest communications
 * Handles unsubscribe management, compliance headers, and consent tracking
 */
export class ComplianceManager {
  private static readonly UNSUBSCRIBE_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Add CAN-SPAM compliant headers and footer to email content
   */
  static async addComplianceElements(
    content: string,
    organizationId: string,
    recipientEmail: string,
    campaignId: string,
  ): Promise<{
    content: string;
    headers: Record<string, string>;
    unsubscribeUrl: string;
  }> {
    const supabase = await createClient();

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, billing_address, support_email, website_url')
      .eq('id', organizationId)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Generate unsubscribe token
    const unsubscribeToken = await this.generateUnsubscribeToken({
      recipientId: recipientEmail,
      campaignId,
      organizationId,
      email: recipientEmail,
      expiresAt: new Date(Date.now() + this.UNSUBSCRIBE_TOKEN_EXPIRY),
    });

    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${unsubscribeToken}`;

    // CAN-SPAM compliant footer
    const complianceFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
  <p style="margin: 8px 0;">
    This email was sent to ${recipientEmail} by ${org.name}
  </p>
  <p style="margin: 8px 0;">
    ${org.billing_address || 'Address not provided'}
  </p>
  <p style="margin: 8px 0;">
    <a href="${unsubscribeUrl}" style="color: #3b82f6; text-decoration: underline;">
      Unsubscribe from these emails
    </a>
    |
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy" style="color: #3b82f6; text-decoration: underline;">
      Privacy Policy
    </a>
    |
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/terms" style="color: #3b82f6; text-decoration: underline;">
      Terms of Service
    </a>
  </p>
  <p style="margin: 8px 0; font-size: 11px; color: #9ca3af;">
    © ${new Date().getFullYear()} ${org.name}. All rights reserved.
  </p>
</div>`;

    // Add footer to content
    const compliantContent = content + complianceFooter;

    // CAN-SPAM compliant headers
    const headers = {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Campaign-ID': campaignId,
      'X-Organization-ID': organizationId,
      'Reply-To': org.support_email || 'noreply@wedsync.com',
      Precedence: 'bulk',
    };

    return {
      content: compliantContent,
      headers,
      unsubscribeUrl,
    };
  }

  /**
   * Check if recipient has unsubscribed
   */
  static async isUnsubscribed(
    email: string,
    organizationId: string,
  ): Promise<boolean> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('unsubscribe_list')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single();

    return !!data;
  }

  /**
   * Process unsubscribe request
   */
  static async processUnsubscribe(token: string): Promise<{
    success: boolean;
    message: string;
    email?: string;
  }> {
    const supabase = await createClient();

    try {
      // Verify and decode token
      const decoded = await this.verifyUnsubscribeToken(token);
      if (!decoded) {
        return {
          success: false,
          message: 'Invalid or expired unsubscribe link',
        };
      }

      // Check if already unsubscribed
      const isAlreadyUnsubscribed = await this.isUnsubscribed(
        decoded.email,
        decoded.organizationId,
      );

      if (isAlreadyUnsubscribed) {
        return {
          success: true,
          message: 'You are already unsubscribed',
          email: decoded.email,
        };
      }

      // Add to unsubscribe list
      const { error } = await supabase.from('unsubscribe_list').insert({
        email: decoded.email,
        organization_id: decoded.organizationId,
        campaign_id: decoded.campaignId,
        unsubscribed_at: new Date().toISOString(),
        method: 'link_click',
        ip_address: null, // Would be set from request context
        user_agent: null, // Would be set from request context
      });

      if (error) {
        throw error;
      }

      // Update guest preferences if they exist
      await supabase
        .from('guest_preferences')
        .update({
          email_opt_out: true,
          updated_at: new Date().toISOString(),
        })
        .eq('email', decoded.email)
        .eq('organization_id', decoded.organizationId);

      // Log the unsubscribe event
      await this.logComplianceEvent('unsubscribe', decoded.organizationId, {
        email: decoded.email,
        campaignId: decoded.campaignId,
        method: 'link_click',
      });

      return {
        success: true,
        message: 'You have been successfully unsubscribed',
        email: decoded.email,
      };
    } catch (error) {
      console.error('Unsubscribe processing error:', error);
      return {
        success: false,
        message: 'An error occurred while processing your unsubscribe request',
      };
    }
  }

  /**
   * Process re-subscribe request (opt back in)
   */
  static async processResubscribe(
    email: string,
    organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    try {
      // Remove from unsubscribe list
      const { error } = await supabase
        .from('unsubscribe_list')
        .delete()
        .eq('email', email)
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      // Update guest preferences
      await supabase
        .from('guest_preferences')
        .update({
          email_opt_out: false,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .eq('organization_id', organizationId);

      // Log the resubscribe event
      await this.logComplianceEvent('resubscribe', organizationId, {
        email,
        method: 'user_action',
      });

      return {
        success: true,
        message: 'You have been successfully resubscribed',
      };
    } catch (error) {
      console.error('Resubscribe processing error:', error);
      return {
        success: false,
        message: 'An error occurred while processing your resubscribe request',
      };
    }
  }

  /**
   * Validate email content for compliance
   */
  static async validateCompliance(
    content: string,
    subject: string,
    organizationId: string,
  ): Promise<{
    isCompliant: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for misleading subject lines
    const misleadingTerms = [
      'free',
      'winner',
      'act now',
      'limited time',
      'urgent',
    ];
    const subjectLower = subject.toLowerCase();

    misleadingTerms.forEach((term) => {
      if (
        subjectLower.includes(term) &&
        !content.toLowerCase().includes(term)
      ) {
        issues.push(
          `Subject line contains "${term}" but content doesn't support this claim`,
        );
        suggestions.push(
          `Remove misleading terms from subject or ensure content supports the claim`,
        );
      }
    });

    // Check for sender identification
    if (!content.includes('sent by') && !content.includes('from')) {
      issues.push("Email doesn't clearly identify the sender");
      suggestions.push('Add clear sender identification in the email body');
    }

    // Check for physical address
    if (!content.includes('address') && !content.includes('located at')) {
      issues.push('Missing physical postal address (required by CAN-SPAM)');
      suggestions.push(
        "Include your organization's valid physical postal address",
      );
    }

    // Check for unsubscribe mechanism
    if (!content.includes('unsubscribe') && !content.includes('opt-out')) {
      issues.push('Missing unsubscribe link or instructions');
      suggestions.push('Add a clear and conspicuous unsubscribe mechanism');
    }

    // Check for adult content warnings if needed
    const adultKeywords = ['adult', '18+', 'mature'];
    const hasAdultContent = adultKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword),
    );

    if (hasAdultContent && !subject.toLowerCase().includes('adult')) {
      issues.push('Adult content detected but not marked in subject');
      suggestions.push('Add "ADULT" label to subject line for adult content');
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Generate unsubscribe token
   */
  private static async generateUnsubscribeToken(
    data: UnsubscribeToken,
  ): Promise<string> {
    const supabase = await createClient();

    // Create token payload
    const payload = JSON.stringify(data);

    // Generate secure token
    const token = crypto
      .createHash('sha256')
      .update(payload + process.env.UNSUBSCRIBE_SECRET!)
      .digest('hex');

    // Store token for verification
    await supabase.from('unsubscribe_tokens').insert({
      token,
      recipient_email: data.email,
      campaign_id: data.campaignId,
      organization_id: data.organizationId,
      expires_at: data.expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    return token;
  }

  /**
   * Verify unsubscribe token
   */
  private static async verifyUnsubscribeToken(
    token: string,
  ): Promise<UnsubscribeToken | null> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('unsubscribe_tokens')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!data) {
      return null;
    }

    return {
      recipientId: data.recipient_email,
      campaignId: data.campaign_id,
      organizationId: data.organization_id,
      email: data.recipient_email,
      expiresAt: new Date(data.expires_at),
    };
  }

  /**
   * Log compliance-related events for audit trail
   */
  private static async logComplianceEvent(
    eventType: string,
    organizationId: string,
    details: Record<string, any>,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('compliance_audit_log').insert({
      event_type: eventType,
      organization_id: organizationId,
      details,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get compliance report for organization
   */
  static async getComplianceReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalEmailsSent: number;
    totalUnsubscribes: number;
    unsubscribeRate: number;
    complianceScore: number;
    violations: Array<{ date: string; issue: string }>;
    recommendations: string[];
  }> {
    const supabase = await createClient();

    // Get email statistics
    const { count: emailCount } = await supabase
      .from('email_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'sent');

    // Get unsubscribe statistics
    const { count: unsubscribeCount } = await supabase
      .from('unsubscribe_list')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('unsubscribed_at', startDate.toISOString())
      .lte('unsubscribed_at', endDate.toISOString());

    // Get compliance violations
    const { data: violations } = await supabase
      .from('compliance_audit_log')
      .select('created_at, details')
      .eq('organization_id', organizationId)
      .eq('event_type', 'compliance_violation')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalEmails = emailCount || 0;
    const totalUnsubs = unsubscribeCount || 0;
    const unsubRate = totalEmails > 0 ? (totalUnsubs / totalEmails) * 100 : 0;

    // Calculate compliance score
    let complianceScore = 100;
    if (unsubRate > 2) complianceScore -= 20; // High unsubscribe rate
    if (violations && violations.length > 0)
      complianceScore -= violations.length * 5;
    if (unsubRate > 5) complianceScore -= 30; // Very high unsubscribe rate

    // Generate recommendations
    const recommendations: string[] = [];
    if (unsubRate > 2) {
      recommendations.push(
        'High unsubscribe rate detected. Review email frequency and content relevance.',
      );
    }
    if (violations && violations.length > 0) {
      recommendations.push(
        'Compliance violations detected. Review and address issues immediately.',
      );
    }
    if (complianceScore < 80) {
      recommendations.push(
        'Consider implementing double opt-in for better list quality.',
      );
      recommendations.push('Review email segmentation to improve targeting.');
    }

    return {
      totalEmailsSent: totalEmails,
      totalUnsubscribes: totalUnsubs,
      unsubscribeRate: parseFloat(unsubRate.toFixed(2)),
      complianceScore: Math.max(0, complianceScore),
      violations:
        violations?.map((v) => ({
          date: v.created_at,
          issue: v.details.issue || 'Compliance violation',
        })) || [],
      recommendations,
    };
  }

  /**
   * Bulk suppress emails for bounced or complained addresses
   */
  static async suppressEmails(
    emails: Array<{ email: string; reason: 'bounce' | 'complaint' | 'manual' }>,
    organizationId: string,
  ): Promise<{ success: boolean; suppressed: number }> {
    const supabase = await createClient();

    try {
      const suppressionData = emails.map((item) => ({
        email: item.email,
        organization_id: organizationId,
        suppression_reason: item.reason,
        suppressed_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('email_suppressions')
        .upsert(suppressionData, {
          onConflict: 'email,organization_id',
        });

      if (error) throw error;

      return {
        success: true,
        suppressed: emails.length,
      };
    } catch (error) {
      console.error('Email suppression error:', error);
      return {
        success: false,
        suppressed: 0,
      };
    }
  }
}

export const complianceManager = new ComplianceManager();
