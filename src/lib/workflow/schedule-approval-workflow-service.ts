// WS-161: Schedule Change Approval Workflow Service
import { createClient } from '@/lib/supabase/server';
import { SupplierScheduleEmailService } from '@/lib/email/supplier-schedule-service';
import { SupplierScheduleSMSService } from '@/lib/messaging/supplier-schedule-sms-service';
import { SupplierScheduleEvent, SupplierContactInfo } from '@/types/suppliers';

export interface ScheduleChangeRequest {
  id: string;
  wedding_id: string;
  organization_id: string;
  supplier_id: string;
  schedule_event_id: string;

  // Change details
  change_type:
    | 'time_update'
    | 'location_update'
    | 'details_update'
    | 'cancellation'
    | 'new_booking';
  change_reason: string;
  requested_by: string;
  requested_by_role: 'supplier' | 'planner' | 'coordinator' | 'admin';

  // Original vs New values
  original_values: {
    start_time?: string;
    end_time?: string;
    location?: string;
    venue_name?: string;
    venue_address?: string;
    setup_time?: string;
    breakdown_time?: string;
    special_instructions?: string;
    [key: string]: any;
  };

  new_values: {
    start_time?: string;
    end_time?: string;
    location?: string;
    venue_name?: string;
    venue_address?: string;
    setup_time?: string;
    breakdown_time?: string;
    special_instructions?: string;
    [key: string]: any;
  };

  // Budget impact
  cost_implications?: {
    additional_cost: number;
    cost_breakdown: Array<{
      item: string;
      amount: number;
      reason: string;
    }>;
    cost_justification: string;
  };

  // Approval workflow
  approval_status:
    | 'pending'
    | 'couple_reviewing'
    | 'approved'
    | 'rejected'
    | 'expired'
    | 'cancelled';
  requires_couple_approval: boolean;
  requires_planner_approval: boolean;
  auto_approve_threshold?: number;

  // Timeline
  created_at: Date;
  expires_at: Date;
  couple_notified_at?: Date;
  couple_responded_at?: Date;
  approved_at?: Date;
  implemented_at?: Date;

  // Communication
  couple_notification_sent: boolean;
  reminder_count: number;
  communication_preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    whatsapp_notifications: boolean;
    notification_frequency: 'immediate' | 'daily_digest' | 'weekly_digest';
  };

  // Responses
  couple_response?: {
    decision: 'approved' | 'rejected' | 'request_changes';
    response_message?: string;
    concerns?: string[];
    alternative_suggestions?: {
      preferred_time?: string;
      preferred_location?: string;
      conditions?: string[];
    };
    responded_by: string;
    responded_at: Date;
  };

  planner_response?: {
    recommendation: 'approve' | 'reject' | 'modify';
    recommendation_reason: string;
    priority_assessment: 'low' | 'medium' | 'high' | 'critical';
    impact_analysis: string;
    responded_by: string;
    responded_at: Date;
  };
}

export interface ApprovalWorkflowSettings {
  wedding_id: string;
  organization_id: string;

  // Automatic approval rules
  auto_approve_minor_changes: boolean;
  auto_approve_time_window_minutes: number;
  auto_approve_cost_threshold: number;

  // Approval requirements
  couple_approval_required_for: string[];
  planner_approval_required_for: string[];

  // Communication settings
  notification_preferences: {
    immediate_notifications: boolean;
    daily_digest: boolean;
    weekly_digest: boolean;
    sms_for_urgent: boolean;
    whatsapp_enabled: boolean;
  };

  // Timing settings
  default_approval_timeout_hours: number;
  urgent_approval_timeout_hours: number;
  reminder_intervals_hours: number[];

  // Escalation rules
  escalation_enabled: boolean;
  escalation_after_hours: number;
  escalation_recipients: string[];
}

export interface ApprovalStats {
  total_requests: number;
  pending_approvals: number;
  approved_requests: number;
  rejected_requests: number;
  expired_requests: number;

  average_response_time_hours: number;
  auto_approved_percentage: number;

  by_change_type: Record<string, number>;
  by_supplier: Record<string, number>;
  by_month: Record<string, number>;

  couple_satisfaction: {
    response_rate: number;
    approval_rate: number;
    concerns_raised: number;
  };
}

export class ScheduleApprovalWorkflowService {
  /**
   * Create a new schedule change request requiring approval
   */
  static async createScheduleChangeRequest(
    changeRequest: Omit<
      ScheduleChangeRequest,
      | 'id'
      | 'created_at'
      | 'expires_at'
      | 'approval_status'
      | 'couple_notification_sent'
      | 'reminder_count'
    >,
    organizationId: string,
  ): Promise<{
    success: boolean;
    request_id?: string;
    auto_approved?: boolean;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Get workflow settings
      const workflowSettings = await this.getWorkflowSettings(
        changeRequest.wedding_id,
        organizationId,
      );

      // Determine if auto-approval applies
      const autoApprovalResult = await this.checkAutoApproval(
        changeRequest,
        workflowSettings,
      );

      // Calculate expiration time
      const isUrgent = this.isUrgentChange(changeRequest);
      const timeoutHours = isUrgent
        ? workflowSettings.urgent_approval_timeout_hours
        : workflowSettings.default_approval_timeout_hours;

      const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

      // Create the request record
      const requestData = {
        ...changeRequest,
        approval_status: autoApprovalResult.shouldAutoApprove
          ? 'approved'
          : 'pending',
        expires_at: expiresAt.toISOString(),
        couple_notification_sent: false,
        reminder_count: 0,
        created_at: new Date().toISOString(),
        ...(autoApprovalResult.shouldAutoApprove && {
          approved_at: new Date().toISOString(),
          couple_responded_at: new Date().toISOString(),
        }),
      };

      const { data: createdRequest, error: createError } = await supabase
        .from('schedule_change_requests')
        .insert(requestData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // If auto-approved, implement the change immediately
      if (autoApprovalResult.shouldAutoApprove) {
        await this.implementApprovedChange(
          createdRequest.id,
          organizationId,
          'auto_approval',
        );

        // Notify couple of auto-approved change
        await this.sendAutoApprovalNotification(createdRequest, organizationId);

        return {
          success: true,
          request_id: createdRequest.id,
          auto_approved: true,
        };
      }

      // Otherwise, start the approval workflow
      await this.initiateApprovalWorkflow(createdRequest, organizationId);

      return {
        success: true,
        request_id: createdRequest.id,
        auto_approved: false,
      };
    } catch (error) {
      console.error('Failed to create schedule change request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process couple's response to a change request
   */
  static async processCoupleResponse(
    requestId: string,
    coupleResponse: {
      decision: 'approved' | 'rejected' | 'request_changes';
      response_message?: string;
      concerns?: string[];
      alternative_suggestions?: {
        preferred_time?: string;
        preferred_location?: string;
        conditions?: string[];
      };
    },
    responderId: string,
    organizationId: string,
  ): Promise<{
    success: boolean;
    status?: 'approved' | 'rejected' | 'requires_negotiation';
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Get the change request
      const { data: changeRequest } = await supabase
        .from('schedule_change_requests')
        .select(
          `
          *,
          wedding:weddings(couple_names, client_email, planner_name, planner_email),
          supplier:suppliers(name, email, company_name),
          schedule_event:supplier_schedule_events(title, start_time, end_time)
        `,
        )
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .single();

      if (!changeRequest) {
        return { success: false, error: 'Change request not found' };
      }

      if (
        changeRequest.approval_status !== 'couple_reviewing' &&
        changeRequest.approval_status !== 'pending'
      ) {
        return {
          success: false,
          error: 'Change request is not awaiting couple response',
        };
      }

      // Update the request with couple's response
      const responseData = {
        ...coupleResponse,
        responded_by: responderId,
        responded_at: new Date().toISOString(),
      };

      let newStatus = changeRequest.approval_status;
      let approvedAt = null;

      switch (coupleResponse.decision) {
        case 'approved':
          newStatus = 'approved';
          approvedAt = new Date().toISOString();
          break;
        case 'rejected':
          newStatus = 'rejected';
          break;
        case 'request_changes':
          newStatus = 'pending'; // Back to planner for negotiation
          break;
      }

      const { error: updateError } = await supabase
        .from('schedule_change_requests')
        .update({
          couple_response: responseData,
          couple_responded_at: new Date().toISOString(),
          approval_status: newStatus,
          ...(approvedAt && { approved_at: approvedAt }),
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Take action based on couple's decision
      if (coupleResponse.decision === 'approved') {
        // Implement the change
        await this.implementApprovedChange(
          requestId,
          organizationId,
          'couple_approval',
        );

        // Notify supplier and planner of approval
        await this.notifyChangeApproved(changeRequest, organizationId);

        return { success: true, status: 'approved' };
      } else if (coupleResponse.decision === 'rejected') {
        // Notify supplier and planner of rejection
        await this.notifyChangeRejected(
          changeRequest,
          coupleResponse,
          organizationId,
        );

        return { success: true, status: 'rejected' };
      } else {
        // Request for changes - notify planner
        await this.notifyChangesRequested(
          changeRequest,
          coupleResponse,
          organizationId,
        );

        return { success: true, status: 'requires_negotiation' };
      }
    } catch (error) {
      console.error('Failed to process couple response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get pending approvals for a wedding or organization
   */
  static async getPendingApprovals(
    organizationId: string,
    weddingId?: string,
    filters: {
      supplier_id?: string;
      change_type?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    approvals: ScheduleChangeRequest[];
    total: number;
    urgent_count: number;
    expiring_soon_count: number;
  }> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('schedule_change_requests')
        .select(
          `
          *,
          wedding:weddings(couple_names, client_email, wedding_date),
          supplier:suppliers(name, email, company_name, role),
          schedule_event:supplier_schedule_events(
            title, start_time, end_time, location
          )
        `,
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .in('approval_status', ['pending', 'couple_reviewing'])
        .order('created_at', { ascending: false });

      if (weddingId) {
        query = query.eq('wedding_id', weddingId);
      }

      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters.change_type) {
        query = query.eq('change_type', filters.change_type);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const approvals = (data || []).map((item) => ({
        ...item,
        created_at: new Date(item.created_at),
        expires_at: new Date(item.expires_at),
        couple_notified_at: item.couple_notified_at
          ? new Date(item.couple_notified_at)
          : undefined,
        couple_responded_at: item.couple_responded_at
          ? new Date(item.couple_responded_at)
          : undefined,
        approved_at: item.approved_at ? new Date(item.approved_at) : undefined,
        implemented_at: item.implemented_at
          ? new Date(item.implemented_at)
          : undefined,
      }));

      // Calculate urgency and expiry counts
      const now = new Date();
      const urgentCount = approvals.filter(
        (a) =>
          this.isUrgentChange(a) ||
          a.expires_at.getTime() - now.getTime() < 2 * 60 * 60 * 1000, // Expires within 2 hours
      ).length;

      const expiringSoonCount = approvals.filter(
        (a) => a.expires_at.getTime() - now.getTime() < 24 * 60 * 60 * 1000, // Expires within 24 hours
      ).length;

      return {
        approvals,
        total: count || 0,
        urgent_count: urgentCount,
        expiring_soon_count: expiringSoonCount,
      };
    } catch (error) {
      console.error('Failed to get pending approvals:', error);
      throw error;
    }
  }

  /**
   * Send reminder notifications for pending approvals
   */
  static async sendApprovalReminders(organizationId: string): Promise<{
    reminders_sent: number;
    errors: string[];
  }> {
    try {
      const supabase = await createClient();

      // Get requests that need reminders
      const { data: pendingRequests } = await supabase
        .from('schedule_change_requests')
        .select(
          `
          *,
          wedding:weddings(couple_names, client_email, planner_name, planner_email),
          supplier:suppliers(name, email, company_name)
        `,
        )
        .eq('organization_id', organizationId)
        .in('approval_status', ['pending', 'couple_reviewing'])
        .lt(
          'expires_at',
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ); // Expiring within 24 hours

      if (!pendingRequests?.length) {
        return { reminders_sent: 0, errors: [] };
      }

      const results = { reminders_sent: 0, errors: [] as string[] };

      // Send reminders for each pending request
      for (const request of pendingRequests) {
        try {
          const hoursSinceCreated =
            (Date.now() - new Date(request.created_at).getTime()) /
            (1000 * 60 * 60);
          const workflowSettings = await this.getWorkflowSettings(
            request.wedding_id,
            organizationId,
          );

          // Check if reminder is due
          const shouldSendReminder =
            workflowSettings.reminder_intervals_hours.some(
              (interval) => Math.abs(hoursSinceCreated - interval) < 1, // Within 1 hour of reminder time
            );

          if (shouldSendReminder && request.reminder_count < 3) {
            await this.sendApprovalReminder(request, organizationId);

            // Update reminder count
            await supabase
              .from('schedule_change_requests')
              .update({
                reminder_count: request.reminder_count + 1,
              })
              .eq('id', request.id);

            results.reminders_sent++;
          }
        } catch (error) {
          results.errors.push(`Request ${request.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to send approval reminders:', error);
      throw error;
    }
  }

  /**
   * Get approval workflow statistics
   */
  static async getApprovalStats(
    organizationId: string,
    weddingId?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<ApprovalStats> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('schedule_change_requests')
        .select(
          `
          *,
          supplier:suppliers(name, role)
        `,
        )
        .eq('organization_id', organizationId);

      if (weddingId) {
        query = query.eq('wedding_id', weddingId);
      }

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: requests } = await query;

      if (!requests) {
        // Return empty stats
        return {
          total_requests: 0,
          pending_approvals: 0,
          approved_requests: 0,
          rejected_requests: 0,
          expired_requests: 0,
          average_response_time_hours: 0,
          auto_approved_percentage: 0,
          by_change_type: {},
          by_supplier: {},
          by_month: {},
          couple_satisfaction: {
            response_rate: 0,
            approval_rate: 0,
            concerns_raised: 0,
          },
        };
      }

      // Calculate statistics
      const stats: ApprovalStats = {
        total_requests: requests.length,
        pending_approvals: requests.filter((r) =>
          ['pending', 'couple_reviewing'].includes(r.approval_status),
        ).length,
        approved_requests: requests.filter(
          (r) => r.approval_status === 'approved',
        ).length,
        rejected_requests: requests.filter(
          (r) => r.approval_status === 'rejected',
        ).length,
        expired_requests: requests.filter(
          (r) => r.approval_status === 'expired',
        ).length,
        average_response_time_hours: 0,
        auto_approved_percentage: 0,
        by_change_type: {},
        by_supplier: {},
        by_month: {},
        couple_satisfaction: {
          response_rate: 0,
          approval_rate: 0,
          concerns_raised: 0,
        },
      };

      // Calculate response time
      const respondedRequests = requests.filter((r) => r.couple_responded_at);
      if (respondedRequests.length > 0) {
        const totalResponseTime = respondedRequests.reduce((sum, request) => {
          const responseTime =
            new Date(request.couple_responded_at).getTime() -
            new Date(request.created_at).getTime();
          return sum + responseTime;
        }, 0);
        stats.average_response_time_hours =
          totalResponseTime / respondedRequests.length / (1000 * 60 * 60);
      }

      // Auto-approval percentage
      const autoApprovedCount = requests.filter(
        (r) =>
          r.approval_status === 'approved' &&
          (!r.couple_responded_at ||
            new Date(r.couple_responded_at).getTime() ===
              new Date(r.created_at).getTime()),
      ).length;
      stats.auto_approved_percentage =
        (autoApprovedCount / requests.length) * 100;

      // Group by change type
      requests.forEach((request) => {
        stats.by_change_type[request.change_type] =
          (stats.by_change_type[request.change_type] || 0) + 1;
      });

      // Group by supplier
      requests.forEach((request) => {
        if (request.supplier) {
          const supplierKey = request.supplier.name;
          stats.by_supplier[supplierKey] =
            (stats.by_supplier[supplierKey] || 0) + 1;
        }
      });

      // Group by month
      requests.forEach((request) => {
        const monthKey = new Date(request.created_at).toISOString().slice(0, 7); // YYYY-MM
        stats.by_month[monthKey] = (stats.by_month[monthKey] || 0) + 1;
      });

      // Couple satisfaction metrics
      const totalWithCoupleResponse = requests.filter(
        (r) => r.couple_response,
      ).length;
      const approvedByCoupleCount = requests.filter(
        (r) => r.couple_response?.decision === 'approved',
      ).length;
      const concernsRaisedCount = requests.filter(
        (r) => r.couple_response?.concerns?.length > 0,
      ).length;

      stats.couple_satisfaction = {
        response_rate: (totalWithCoupleResponse / requests.length) * 100,
        approval_rate:
          totalWithCoupleResponse > 0
            ? (approvedByCoupleCount / totalWithCoupleResponse) * 100
            : 0,
        concerns_raised: concernsRaisedCount,
      };

      return stats;
    } catch (error) {
      console.error('Failed to get approval stats:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async getWorkflowSettings(
    weddingId: string,
    organizationId: string,
  ): Promise<ApprovalWorkflowSettings> {
    try {
      const supabase = await createClient();

      const { data: settings } = await supabase
        .from('schedule_approval_settings')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('organization_id', organizationId)
        .single();

      if (settings) {
        return settings;
      }

      // Return default settings
      return {
        wedding_id: weddingId,
        organization_id: organizationId,
        auto_approve_minor_changes: true,
        auto_approve_time_window_minutes: 15,
        auto_approve_cost_threshold: 100,
        couple_approval_required_for: [
          'time_update',
          'location_update',
          'cancellation',
        ],
        planner_approval_required_for: ['new_booking'],
        notification_preferences: {
          immediate_notifications: true,
          daily_digest: false,
          weekly_digest: false,
          sms_for_urgent: true,
          whatsapp_enabled: false,
        },
        default_approval_timeout_hours: 48,
        urgent_approval_timeout_hours: 6,
        reminder_intervals_hours: [12, 24, 36],
        escalation_enabled: true,
        escalation_after_hours: 72,
        escalation_recipients: [],
      };
    } catch (error) {
      console.error('Failed to get workflow settings:', error);
      // Return minimal default settings
      return {
        wedding_id: weddingId,
        organization_id: organizationId,
        auto_approve_minor_changes: false,
        auto_approve_time_window_minutes: 0,
        auto_approve_cost_threshold: 0,
        couple_approval_required_for: [
          'time_update',
          'location_update',
          'cancellation',
          'new_booking',
        ],
        planner_approval_required_for: [],
        notification_preferences: {
          immediate_notifications: true,
          daily_digest: false,
          weekly_digest: false,
          sms_for_urgent: false,
          whatsapp_enabled: false,
        },
        default_approval_timeout_hours: 48,
        urgent_approval_timeout_hours: 12,
        reminder_intervals_hours: [24],
        escalation_enabled: false,
        escalation_after_hours: 48,
        escalation_recipients: [],
      };
    }
  }

  private static async checkAutoApproval(
    changeRequest: Omit<
      ScheduleChangeRequest,
      | 'id'
      | 'created_at'
      | 'expires_at'
      | 'approval_status'
      | 'couple_notification_sent'
      | 'reminder_count'
    >,
    settings: ApprovalWorkflowSettings,
  ): Promise<{ shouldAutoApprove: boolean; reason?: string }> {
    // Don't auto-approve if couple approval is required for this change type
    if (
      settings.couple_approval_required_for.includes(changeRequest.change_type)
    ) {
      return {
        shouldAutoApprove: false,
        reason: 'Couple approval required for this change type',
      };
    }

    // Don't auto-approve if there are cost implications above threshold
    if (
      changeRequest.cost_implications &&
      changeRequest.cost_implications.additional_cost >
        settings.auto_approve_cost_threshold
    ) {
      return {
        shouldAutoApprove: false,
        reason: 'Cost implications exceed auto-approval threshold',
      };
    }

    // Check if it's a minor change that can be auto-approved
    if (settings.auto_approve_minor_changes) {
      const isMinorChange = await this.isMinorChange(changeRequest, settings);
      if (isMinorChange) {
        return {
          shouldAutoApprove: true,
          reason: 'Minor change within auto-approval criteria',
        };
      }
    }

    return {
      shouldAutoApprove: false,
      reason: 'Does not meet auto-approval criteria',
    };
  }

  private static async isMinorChange(
    changeRequest: Omit<
      ScheduleChangeRequest,
      | 'id'
      | 'created_at'
      | 'expires_at'
      | 'approval_status'
      | 'couple_notification_sent'
      | 'reminder_count'
    >,
    settings: ApprovalWorkflowSettings,
  ): Promise<boolean> {
    if (changeRequest.change_type === 'time_update') {
      const originalStart = new Date(
        changeRequest.original_values.start_time || 0,
      );
      const newStart = new Date(changeRequest.new_values.start_time || 0);
      const timeDiffMinutes =
        Math.abs(newStart.getTime() - originalStart.getTime()) / (1000 * 60);

      return timeDiffMinutes <= settings.auto_approve_time_window_minutes;
    }

    if (changeRequest.change_type === 'details_update') {
      // Consider details updates minor if they don't change core event info
      const hasLocationChange =
        changeRequest.new_values.location !==
        changeRequest.original_values.location;
      const hasTimeChange =
        changeRequest.new_values.start_time !==
        changeRequest.original_values.start_time;

      return !hasLocationChange && !hasTimeChange;
    }

    return false;
  }

  private static isUrgentChange(
    changeRequest: Pick<
      ScheduleChangeRequest,
      'change_type' | 'original_values' | 'cost_implications'
    >,
  ): boolean {
    // Cancellations are always urgent
    if (changeRequest.change_type === 'cancellation') {
      return true;
    }

    // Changes with significant cost implications are urgent
    if (
      changeRequest.cost_implications &&
      changeRequest.cost_implications.additional_cost > 500
    ) {
      return true;
    }

    // Changes happening soon are urgent
    if (changeRequest.original_values.start_time) {
      const eventStart = new Date(changeRequest.original_values.start_time);
      const hoursUntilEvent =
        (eventStart.getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursUntilEvent < 48; // Less than 48 hours
    }

    return false;
  }

  private static async initiateApprovalWorkflow(
    changeRequest: ScheduleChangeRequest,
    organizationId: string,
  ): Promise<void> {
    // Send notification to couple
    await this.sendCoupleApprovalNotification(changeRequest, organizationId);

    // Update request status
    const supabase = await createClient();
    await supabase
      .from('schedule_change_requests')
      .update({
        approval_status: 'couple_reviewing',
        couple_notified_at: new Date().toISOString(),
        couple_notification_sent: true,
      })
      .eq('id', changeRequest.id);
  }

  private static async implementApprovedChange(
    requestId: string,
    organizationId: string,
    approvalType: 'auto_approval' | 'couple_approval' | 'planner_approval',
  ): Promise<void> {
    try {
      const supabase = await createClient();

      // Get the change request details
      const { data: changeRequest } = await supabase
        .from('schedule_change_requests')
        .select('*')
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .single();

      if (!changeRequest) {
        throw new Error('Change request not found');
      }

      // Apply the changes to the schedule event
      const { error: updateError } = await supabase
        .from('supplier_schedule_events')
        .update({
          ...changeRequest.new_values,
          updated_at: new Date().toISOString(),
        })
        .eq('id', changeRequest.schedule_event_id)
        .eq('organization_id', organizationId);

      if (updateError) {
        throw updateError;
      }

      // Mark the change request as implemented
      await supabase
        .from('schedule_change_requests')
        .update({
          implemented_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Log the implementation
      await supabase.from('schedule_change_activity_log').insert({
        change_request_id: requestId,
        activity_type: 'change_implemented',
        approval_type: approvalType,
        implemented_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to implement approved change:', error);
      throw error;
    }
  }

  private static async sendCoupleApprovalNotification(
    changeRequest: ScheduleChangeRequest,
    organizationId: string,
  ): Promise<void> {
    // Implementation would send email/SMS to couple about pending approval
    console.log(
      `Sending approval notification to couple for change request ${changeRequest.id}`,
    );
  }

  private static async sendAutoApprovalNotification(
    changeRequest: ScheduleChangeRequest,
    organizationId: string,
  ): Promise<void> {
    // Implementation would notify couple that change was auto-approved
    console.log(
      `Sending auto-approval notification for change request ${changeRequest.id}`,
    );
  }

  private static async sendApprovalReminder(
    changeRequest: any,
    organizationId: string,
  ): Promise<void> {
    // Implementation would send reminder to couple
    console.log(
      `Sending approval reminder for change request ${changeRequest.id}`,
    );
  }

  private static async notifyChangeApproved(
    changeRequest: any,
    organizationId: string,
  ): Promise<void> {
    // Implementation would notify supplier and planner of approval
    console.log(`Notifying of approved change request ${changeRequest.id}`);
  }

  private static async notifyChangeRejected(
    changeRequest: any,
    coupleResponse: any,
    organizationId: string,
  ): Promise<void> {
    // Implementation would notify supplier and planner of rejection
    console.log(`Notifying of rejected change request ${changeRequest.id}`);
  }

  private static async notifyChangesRequested(
    changeRequest: any,
    coupleResponse: any,
    organizationId: string,
  ): Promise<void> {
    // Implementation would notify planner that couple requested changes
    console.log(
      `Notifying of change request requiring negotiation ${changeRequest.id}`,
    );
  }
}
