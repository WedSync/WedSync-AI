import { createClient } from '@/lib/supabase/server';

export interface TrialExtensionRequest {
  id: string;
  trialSessionId: string;
  requestedDays: number;
  businessJustification: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  autoApprovalEligible: boolean;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

export interface ExtensionCriteria {
  minROI: number;
  minConversionScore: number;
  maxExtensionsAllowed: number;
  maxTotalExtensionDays: number;
  requiredEngagement: number;
}

export interface ExtensionRecommendation {
  eligible: boolean;
  recommendedDays: number;
  autoApprovalRecommended: boolean;
  reasons: string[];
  requiresManualReview: boolean;
  riskFactors: string[];
}

export class TrialExtensionManager {
  private supabase = createClient();

  // Extension criteria by supplier type
  private extensionCriteria: Record<string, ExtensionCriteria> = {
    photographer: {
      minROI: 1000,
      minConversionScore: 40,
      maxExtensionsAllowed: 2,
      maxTotalExtensionDays: 21,
      requiredEngagement: 30,
    },
    planner: {
      minROI: 2500,
      minConversionScore: 45,
      maxExtensionsAllowed: 2,
      maxTotalExtensionDays: 21,
      requiredEngagement: 35,
    },
    florist: {
      minROI: 800,
      minConversionScore: 35,
      maxExtensionsAllowed: 2,
      maxTotalExtensionDays: 14,
      requiredEngagement: 25,
    },
    venue: {
      minROI: 5000,
      minConversionScore: 50,
      maxExtensionsAllowed: 1,
      maxTotalExtensionDays: 14,
      requiredEngagement: 40,
    },
    caterer: {
      minROI: 1500,
      minConversionScore: 40,
      maxExtensionsAllowed: 2,
      maxTotalExtensionDays: 21,
      requiredEngagement: 30,
    },
    dj: {
      minROI: 600,
      minConversionScore: 35,
      maxExtensionsAllowed: 2,
      maxTotalExtensionDays: 14,
      requiredEngagement: 25,
    },
    default: {
      minROI: 1000,
      minConversionScore: 40,
      maxExtensionsAllowed: 2,
      maxTotalExtensionDays: 21,
      requiredEngagement: 30,
    },
  };

  async evaluateExtensionEligibility(
    trialSessionId: string,
    requestedDays: number,
  ): Promise<ExtensionRecommendation> {
    // Get trial session data
    const { data: trial } = await this.supabase
      .from('trial_sessions')
      .select('supplier_type, business_size, started_at, ends_at')
      .eq('id', trialSessionId)
      .single();

    if (!trial) {
      return {
        eligible: false,
        recommendedDays: 0,
        autoApprovalRecommended: false,
        reasons: ['Trial session not found'],
        requiresManualReview: false,
        riskFactors: [],
      };
    }

    const criteria =
      this.extensionCriteria[trial.supplier_type] ||
      this.extensionCriteria.default;

    // Get current metrics
    const [roi, conversionScore, previousExtensions, engagement] =
      await Promise.all([
        this.getCurrentROI(trialSessionId),
        this.getCurrentConversionScore(trialSessionId),
        this.getPreviousExtensions(trialSessionId),
        this.getEngagementMetrics(trialSessionId),
      ]);

    const reasons: string[] = [];
    const riskFactors: string[] = [];
    let eligible = true;
    let autoApprovalRecommended = true;

    // Check ROI threshold
    if (roi < criteria.minROI) {
      eligible = false;
      autoApprovalRecommended = false;
      reasons.push(
        `ROI of $${Math.round(roi)} is below minimum threshold of $${criteria.minROI}`,
      );
      riskFactors.push('insufficient_roi');
    } else {
      reasons.push(`Strong ROI performance: $${Math.round(roi)}`);
    }

    // Check conversion score
    if (conversionScore < criteria.minConversionScore) {
      autoApprovalRecommended = false;
      if (conversionScore < criteria.minConversionScore - 15) {
        eligible = false;
        reasons.push(
          `Conversion score of ${conversionScore}% is significantly below threshold`,
        );
        riskFactors.push('low_conversion_probability');
      } else {
        reasons.push(
          `Conversion score of ${conversionScore}% requires manual review`,
        );
        riskFactors.push('marginal_conversion_score');
      }
    } else {
      reasons.push(`Good conversion potential: ${conversionScore}%`);
    }

    // Check previous extensions
    if (previousExtensions.length >= criteria.maxExtensionsAllowed) {
      eligible = false;
      reasons.push(
        `Maximum extensions (${criteria.maxExtensionsAllowed}) already used`,
      );
      riskFactors.push('max_extensions_reached');
    }

    // Check total extension days
    const totalExtensionDays = previousExtensions.reduce(
      (sum, ext) => sum + ext.days_granted,
      0,
    );
    if (totalExtensionDays + requestedDays > criteria.maxTotalExtensionDays) {
      const maxAllowed = criteria.maxTotalExtensionDays - totalExtensionDays;
      if (maxAllowed <= 0) {
        eligible = false;
        reasons.push('Maximum total extension days reached');
        riskFactors.push('max_extension_days_reached');
      } else {
        reasons.push(
          `Can only grant ${maxAllowed} days instead of ${requestedDays}`,
        );
      }
    }

    // Check engagement
    if (engagement < criteria.requiredEngagement) {
      autoApprovalRecommended = false;
      reasons.push(`Low engagement score: ${engagement}%`);
      riskFactors.push('low_engagement');
    } else {
      reasons.push(`Good engagement: ${engagement}%`);
    }

    // Determine recommended days
    let recommendedDays = requestedDays;
    if (eligible) {
      const remainingDays = criteria.maxTotalExtensionDays - totalExtensionDays;
      recommendedDays = Math.min(requestedDays, remainingDays);

      // Adjust based on performance
      if (roi > criteria.minROI * 2) {
        // Strong ROI allows full request
        recommendedDays = Math.min(requestedDays, remainingDays);
      } else if (conversionScore < criteria.minConversionScore + 10) {
        // Marginal performance gets shorter extension
        recommendedDays = Math.min(recommendedDays, 7);
      }
    }

    return {
      eligible,
      recommendedDays,
      autoApprovalRecommended: autoApprovalRecommended && eligible,
      reasons,
      requiresManualReview: eligible && !autoApprovalRecommended,
      riskFactors,
    };
  }

  async requestExtension(
    trialSessionId: string,
    requestedDays: number,
    businessJustification: string,
    userId: string,
  ): Promise<{
    success: boolean;
    requestId?: string;
    message: string;
    autoApproved?: boolean;
  }> {
    try {
      // Evaluate eligibility
      const evaluation = await this.evaluateExtensionEligibility(
        trialSessionId,
        requestedDays,
      );

      if (!evaluation.eligible) {
        return {
          success: false,
          message: `Extension request denied: ${evaluation.reasons.join('; ')}`,
        };
      }

      // Create extension request
      const { data: request, error } = await this.supabase
        .from('trial_extension_requests')
        .insert({
          trial_session_id: trialSessionId,
          requested_by: userId,
          requested_days: evaluation.recommendedDays,
          business_justification: businessJustification,
          status: evaluation.autoApprovalRecommended ? 'approved' : 'pending',
          auto_approval_eligible: evaluation.autoApprovalRecommended,
          evaluation_data: {
            originalRequest: requestedDays,
            evaluation: evaluation,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // If auto-approved, extend the trial immediately
      if (evaluation.autoApprovalRecommended) {
        await this.approveExtension(
          request.id,
          'system',
          'Auto-approved based on performance metrics',
        );
      }

      // Send notification
      await this.sendExtensionNotification(
        trialSessionId,
        evaluation.autoApprovalRecommended ? 'approved' : 'submitted',
        evaluation.recommendedDays,
      );

      return {
        success: true,
        requestId: request.id,
        autoApproved: evaluation.autoApprovalRecommended,
        message: evaluation.autoApprovalRecommended
          ? `Extension approved! Your trial has been extended by ${evaluation.recommendedDays} days.`
          : `Extension request submitted for review. You requested ${requestedDays} days, we recommend ${evaluation.recommendedDays} days.`,
      };
    } catch (error) {
      console.error('Error requesting extension:', error);
      return {
        success: false,
        message: 'Failed to submit extension request. Please try again.',
      };
    }
  }

  async approveExtension(
    requestId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the request
      const { data: request } = await this.supabase
        .from('trial_extension_requests')
        .select('trial_session_id, requested_days')
        .eq('id', requestId)
        .single();

      if (!request) {
        return { success: false, message: 'Extension request not found' };
      }

      // Update the trial end date
      const { data: trial } = await this.supabase
        .from('trial_sessions')
        .select('ends_at')
        .eq('id', request.trial_session_id)
        .single();

      if (!trial) {
        return { success: false, message: 'Trial session not found' };
      }

      const newEndDate = new Date(trial.ends_at);
      newEndDate.setDate(newEndDate.getDate() + request.requested_days);

      // Update trial session
      await this.supabase
        .from('trial_sessions')
        .update({ ends_at: newEndDate.toISOString() })
        .eq('id', request.trial_session_id);

      // Update request status
      await this.supabase
        .from('trial_extension_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: approvedBy,
          notes,
        })
        .eq('id', requestId);

      // Record the extension
      await this.supabase.from('trial_extensions').insert({
        trial_session_id: request.trial_session_id,
        extension_request_id: requestId,
        days_granted: request.requested_days,
        new_end_date: newEndDate.toISOString(),
        granted_by: approvedBy,
        reason: notes || 'Approved based on trial performance',
      });

      // Send approval notification
      await this.sendExtensionNotification(
        request.trial_session_id,
        'approved',
        request.requested_days,
      );

      return {
        success: true,
        message: `Extension approved. Trial extended by ${request.requested_days} days.`,
      };
    } catch (error) {
      console.error('Error approving extension:', error);
      return { success: false, message: 'Failed to approve extension' };
    }
  }

  async rejectExtension(
    requestId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data: request } = await this.supabase
        .from('trial_extension_requests')
        .select('trial_session_id')
        .eq('id', requestId)
        .single();

      if (!request) {
        return { success: false, message: 'Extension request not found' };
      }

      // Update request status
      await this.supabase
        .from('trial_extension_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: rejectedBy,
          notes: reason,
        })
        .eq('id', requestId);

      // Send rejection notification
      await this.sendExtensionNotification(
        request.trial_session_id,
        'rejected',
        0,
        reason,
      );

      return { success: true, message: 'Extension request rejected' };
    } catch (error) {
      console.error('Error rejecting extension:', error);
      return { success: false, message: 'Failed to reject extension' };
    }
  }

  async getExtensionHistory(trialSessionId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('trial_extension_requests')
      .select(
        `
        *,
        trial_extensions(days_granted, new_end_date, granted_by, reason)
      `,
      )
      .eq('trial_session_id', trialSessionId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  async getPendingExtensionRequests(): Promise<any[]> {
    const { data } = await this.supabase
      .from('trial_extension_requests')
      .select(
        `
        *,
        trial_sessions(
          supplier_type,
          business_size,
          user_profiles(first_name, last_name, email)
        )
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    return data || [];
  }

  private async getCurrentROI(trialSessionId: string): Promise<number> {
    const { data } = await this.supabase
      .from('trial_roi_calculations')
      .select('total_roi_value')
      .eq('trial_session_id', trialSessionId)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .single();

    return data?.total_roi_value || 0;
  }

  private async getCurrentConversionScore(
    trialSessionId: string,
  ): Promise<number> {
    const { data } = await this.supabase
      .from('trial_conversion_scores')
      .select('overall_conversion_probability')
      .eq('trial_session_id', trialSessionId)
      .order('score_date', { ascending: false })
      .limit(1)
      .single();

    return data?.overall_conversion_probability || 0;
  }

  private async getPreviousExtensions(trialSessionId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('trial_extensions')
      .select('days_granted, new_end_date')
      .eq('trial_session_id', trialSessionId)
      .order('created_at', { ascending: true });

    return data || [];
  }

  private async getEngagementMetrics(trialSessionId: string): Promise<number> {
    const { data: trial } = await this.supabase
      .from('trial_sessions')
      .select('started_at')
      .eq('id', trialSessionId)
      .single();

    if (!trial) return 0;

    const { data: usage } = await this.supabase
      .from('trial_usage_analytics')
      .select('date')
      .eq('trial_session_id', trialSessionId);

    if (!usage) return 0;

    const startDate = new Date(trial.started_at);
    const totalDays = Math.ceil(
      (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const activeDays = new Set(usage.map((u) => u.date)).size;

    return Math.min(100, (activeDays / totalDays) * 100);
  }

  private async sendExtensionNotification(
    trialSessionId: string,
    type: 'submitted' | 'approved' | 'rejected',
    days: number,
    reason?: string,
  ): Promise<void> {
    const { data: trial } = await this.supabase
      .from('trial_sessions')
      .select('user_profiles(email, first_name)')
      .eq('id', trialSessionId)
      .single();

    if (!trial?.user_profiles?.email) return;

    const templates = {
      submitted: {
        subject: 'Trial Extension Request Submitted',
        message: `Hi ${trial.user_profiles.first_name}, your request to extend your trial by ${days} days has been submitted for review. We'll get back to you within 24 hours.`,
      },
      approved: {
        subject: 'Trial Extension Approved! 🎉',
        message: `Great news ${trial.user_profiles.first_name}! Your trial has been extended by ${days} days. Make the most of this additional time to explore WedSync's features.`,
      },
      rejected: {
        subject: 'Trial Extension Request Update',
        message: `Hi ${trial.user_profiles.first_name}, we weren't able to approve your trial extension request. ${reason || 'Please contact support for more information.'}`,
      },
    };

    const template = templates[type];

    // In production, send actual email
    console.log(
      `Email to ${trial.user_profiles.email}: ${template.subject} - ${template.message}`,
    );

    // Record notification
    await this.supabase.from('trial_notifications').insert({
      trial_session_id: trialSessionId,
      type: 'extension_' + type,
      message: template.message,
      sent_at: new Date().toISOString(),
    });
  }

  async getExtensionAnalytics(supplierType?: string): Promise<{
    totalRequests: number;
    approvalRate: number;
    averageDaysRequested: number;
    averageDaysGranted: number;
    autoApprovalRate: number;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    let query = this.supabase.from('trial_extension_requests').select('*');

    if (supplierType) {
      query = query.eq('trial_sessions.supplier_type', supplierType);
    }

    const { data: requests } = await query;

    if (!requests || requests.length === 0) {
      return {
        totalRequests: 0,
        approvalRate: 0,
        averageDaysRequested: 0,
        averageDaysGranted: 0,
        autoApprovalRate: 0,
        topReasons: [],
      };
    }

    const totalRequests = requests.length;
    const approvedRequests = requests.filter((r) => r.status === 'approved');
    const autoApprovedRequests = requests.filter(
      (r) => r.auto_approval_eligible && r.status === 'approved',
    );

    const approvalRate = (approvedRequests.length / totalRequests) * 100;
    const autoApprovalRate =
      (autoApprovedRequests.length / totalRequests) * 100;
    const averageDaysRequested =
      requests.reduce((sum, r) => sum + r.requested_days, 0) / totalRequests;

    // Get granted days from extensions table
    const { data: extensions } = await this.supabase
      .from('trial_extensions')
      .select('days_granted')
      .in(
        'extension_request_id',
        approvedRequests.map((r) => r.id),
      );

    const averageDaysGranted =
      extensions && extensions.length > 0
        ? extensions.reduce((sum, e) => sum + e.days_granted, 0) /
          extensions.length
        : 0;

    // Analyze rejection reasons
    const rejectedRequests = requests.filter((r) => r.status === 'rejected');
    const reasonCounts: Record<string, number> = {};

    rejectedRequests.forEach((r) => {
      const reason = r.notes || 'No reason provided';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests,
      approvalRate,
      averageDaysRequested,
      averageDaysGranted,
      autoApprovalRate,
      topReasons,
    };
  }
}
