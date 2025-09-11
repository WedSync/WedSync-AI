// WS-161: Supplier Schedule Feedback Service
import { createClient } from '@/lib/supabase/server';
import { SupplierScheduleEmailService } from '@/lib/email/supplier-schedule-service';
import { SupplierScheduleSMSService } from '@/lib/messaging/supplier-schedule-sms-service';
import { SupplierScheduleEvent, SupplierContactInfo } from '@/types/suppliers';

export interface SupplierFeedback {
  id: string;
  supplier_id: string;
  organization_id: string;
  schedule_event_id: string;
  feedback_type:
    | 'conflict'
    | 'availability'
    | 'suggestion'
    | 'concern'
    | 'confirmation';
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Feedback content
  subject: string;
  description: string;
  conflict_reason?: string;

  // Scheduling details
  original_start_time: Date;
  original_end_time: Date;
  suggested_start_time?: Date;
  suggested_end_time?: Date;
  flexible_hours?: number;

  // Alternative suggestions
  alternative_dates?: Array<{
    date: string;
    start_time: string;
    end_time: string;
    notes?: string;
    preference_score: number;
  }>;

  // Communication preferences
  response_urgency: 'immediate' | 'same_day' | 'within_24h' | 'flexible';
  preferred_contact_method: 'email' | 'sms' | 'phone' | 'whatsapp';

  // Metadata
  submitted_at: Date;
  responded_at?: Date;
  resolved_at?: Date;
  submitted_by_supplier: boolean;

  // Response tracking
  planner_response?: string;
  resolution_notes?: string;
  acceptance_status?: 'accepted' | 'counter_proposed' | 'rejected';

  // Impact assessment
  affects_other_vendors: boolean;
  requires_couple_approval: boolean;
  budget_implications?: {
    additional_cost: number;
    cost_reason: string;
  };
}

export interface ConflictReport {
  supplier_id: string;
  schedule_event_id: string;
  conflict_type:
    | 'double_booking'
    | 'travel_time'
    | 'equipment_conflict'
    | 'personal_unavailable'
    | 'other';
  conflict_details: {
    conflicting_event?: {
      title: string;
      start_time: string;
      end_time: string;
      location?: string;
    };
    travel_time_needed?: number;
    equipment_required?: string[];
    availability_window?: {
      available_from: string;
      available_until: string;
    };
    other_details?: string;
  };
  suggested_solutions: Array<{
    solution_type:
      | 'reschedule'
      | 'partial_availability'
      | 'equipment_rental'
      | 'subcontractor';
    description: string;
    implementation_notes?: string;
    additional_cost?: number;
  }>;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface FeedbackResponse {
  feedback_id: string;
  responder_id: string;
  responder_role: 'planner' | 'coordinator' | 'admin' | 'couple';
  response_type:
    | 'acknowledge'
    | 'counter_propose'
    | 'accept'
    | 'reject'
    | 'request_more_info';
  response_message: string;

  // Proposed changes if counter-proposing
  counter_proposal?: {
    new_start_time?: string;
    new_end_time?: string;
    new_location?: string;
    compensation?: {
      amount: number;
      reason: string;
    };
    conditions?: string[];
  };

  // Next steps
  requires_followup: boolean;
  followup_deadline?: Date;
  assigned_to?: string;

  created_at: Date;
}

export class SupplierScheduleFeedbackService {
  /**
   * Submit feedback from a supplier about a schedule event
   */
  static async submitSupplierFeedback(
    feedback: Omit<
      SupplierFeedback,
      'id' | 'submitted_at' | 'status' | 'submitted_by_supplier'
    >,
    submitterId: string,
  ): Promise<{
    success: boolean;
    feedback_id?: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Validate supplier access
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id, name, email, organization_id')
        .eq('id', feedback.supplier_id)
        .eq('organization_id', feedback.organization_id)
        .single();

      if (!supplier) {
        return { success: false, error: 'Supplier not found or access denied' };
      }

      // Validate schedule event exists
      const { data: scheduleEvent } = await supabase
        .from('supplier_schedule_events')
        .select('*')
        .eq('id', feedback.schedule_event_id)
        .eq('organization_id', feedback.organization_id)
        .single();

      if (!scheduleEvent) {
        return { success: false, error: 'Schedule event not found' };
      }

      // Create feedback record
      const feedbackData = {
        ...feedback,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
        submitted_by_supplier: true,
        id: undefined, // Let database generate
      };

      const { data: createdFeedback, error: createError } = await supabase
        .from('supplier_schedule_feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Notify planners about the feedback
      await this.notifyPlannersOfFeedback(
        createdFeedback,
        supplier,
        scheduleEvent,
      );

      // Create activity log entry
      await supabase.from('supplier_feedback_activity_log').insert({
        feedback_id: createdFeedback.id,
        activity_type: 'feedback_submitted',
        actor_id: submitterId,
        actor_type: 'supplier',
        details: {
          feedback_type: feedback.feedback_type,
          priority: feedback.priority,
          has_alternatives:
            feedback.alternative_dates && feedback.alternative_dates.length > 0,
        },
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        feedback_id: createdFeedback.id,
      };
    } catch (error) {
      console.error('Failed to submit supplier feedback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit a conflict report with detailed conflict information
   */
  static async submitConflictReport(
    conflictReport: ConflictReport,
    organizationId: string,
    submitterId: string,
  ): Promise<{
    success: boolean;
    feedback_id?: string;
    conflict_id?: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Get schedule event details
      const { data: scheduleEvent } = await supabase
        .from('supplier_schedule_events')
        .select(
          `
          *,
          wedding:weddings!inner(
            couple_names, wedding_date, planner_name, planner_email
          )
        `,
        )
        .eq('id', conflictReport.schedule_event_id)
        .eq('organization_id', organizationId)
        .single();

      if (!scheduleEvent) {
        return { success: false, error: 'Schedule event not found' };
      }

      // Create detailed feedback based on conflict report
      const feedback: Omit<
        SupplierFeedback,
        'id' | 'submitted_at' | 'status' | 'submitted_by_supplier'
      > = {
        supplier_id: conflictReport.supplier_id,
        organization_id: organizationId,
        schedule_event_id: conflictReport.schedule_event_id,
        feedback_type: 'conflict',
        priority:
          conflictReport.urgency_level === 'critical'
            ? 'critical'
            : conflictReport.urgency_level === 'high'
              ? 'high'
              : conflictReport.urgency_level === 'medium'
                ? 'medium'
                : 'low',

        subject: `Schedule Conflict: ${conflictReport.conflict_type.replace('_', ' ')}`,
        description: this.generateConflictDescription(
          conflictReport,
          scheduleEvent,
        ),
        conflict_reason: conflictReport.conflict_type,

        original_start_time: new Date(scheduleEvent.start_time),
        original_end_time: new Date(scheduleEvent.end_time),

        // Convert suggested solutions to alternative dates if applicable
        alternative_dates: this.extractAlternativeDatesFromSolutions(
          conflictReport.suggested_solutions,
        ),

        response_urgency:
          conflictReport.urgency_level === 'critical'
            ? 'immediate'
            : conflictReport.urgency_level === 'high'
              ? 'same_day'
              : conflictReport.urgency_level === 'medium'
                ? 'within_24h'
                : 'flexible',
        preferred_contact_method: 'email',

        affects_other_vendors: this.assessVendorImpact(conflictReport),
        requires_couple_approval: this.assessCoupleApprovalNeed(conflictReport),

        budget_implications: this.calculateBudgetImplications(conflictReport),
      };

      // Submit the feedback
      const result = await this.submitSupplierFeedback(feedback, submitterId);

      if (result.success) {
        // Also create a specific conflict record for tracking
        const { data: conflictRecord } = await supabase
          .from('supplier_schedule_conflicts')
          .insert({
            supplier_id: conflictReport.supplier_id,
            organization_id: organizationId,
            schedule_event_id: conflictReport.schedule_event_id,
            feedback_id: result.feedback_id,
            conflict_type: conflictReport.conflict_type,
            conflict_details: conflictReport.conflict_details,
            suggested_solutions: conflictReport.suggested_solutions,
            urgency_level: conflictReport.urgency_level,
            status: 'reported',
            reported_at: new Date().toISOString(),
          })
          .select()
          .single();

        return {
          success: true,
          feedback_id: result.feedback_id,
          conflict_id: conflictRecord?.id,
        };
      }

      return result;
    } catch (error) {
      console.error('Failed to submit conflict report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Respond to supplier feedback
   */
  static async respondToFeedback(
    feedbackId: string,
    response: Omit<FeedbackResponse, 'feedback_id' | 'created_at'>,
    organizationId: string,
  ): Promise<{
    success: boolean;
    response_id?: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Validate feedback exists and user has access
      const { data: feedback } = await supabase
        .from('supplier_schedule_feedback')
        .select(
          `
          *,
          supplier:suppliers(name, email),
          schedule_event:supplier_schedule_events(
            title, start_time, end_time,
            wedding:weddings(couple_names, planner_name, planner_email)
          )
        `,
        )
        .eq('id', feedbackId)
        .eq('organization_id', organizationId)
        .single();

      if (!feedback) {
        return { success: false, error: 'Feedback not found or access denied' };
      }

      // Create response record
      const responseData = {
        ...response,
        feedback_id: feedbackId,
        created_at: new Date().toISOString(),
      };

      const { data: createdResponse, error: createError } = await supabase
        .from('supplier_feedback_responses')
        .insert(responseData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Update feedback status based on response type
      const newStatus = this.determineNewFeedbackStatus(
        response.response_type,
        feedback.status,
      );
      const updateData: any = {
        status: newStatus,
        responded_at: new Date().toISOString(),
      };

      // If accepting or rejecting, mark as resolved
      if (
        response.response_type === 'accept' ||
        response.response_type === 'reject'
      ) {
        updateData.resolved_at = new Date().toISOString();
        updateData.acceptance_status =
          response.response_type === 'accept' ? 'accepted' : 'rejected';
        updateData.resolution_notes = response.response_message;
      }

      // If counter-proposing, update with new details
      if (
        response.response_type === 'counter_propose' &&
        response.counter_proposal
      ) {
        updateData.acceptance_status = 'counter_proposed';
        updateData.planner_response = response.response_message;
      }

      await supabase
        .from('supplier_schedule_feedback')
        .update(updateData)
        .eq('id', feedbackId);

      // Notify supplier of the response
      await this.notifySupplierOfResponse(feedback, createdResponse);

      // Log the activity
      await supabase.from('supplier_feedback_activity_log').insert({
        feedback_id: feedbackId,
        activity_type: `response_${response.response_type}`,
        actor_id: response.responder_id,
        actor_type: response.responder_role,
        details: {
          response_type: response.response_type,
          has_counter_proposal: !!response.counter_proposal,
          requires_followup: response.requires_followup,
        },
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        response_id: createdResponse.id,
      };
    } catch (error) {
      console.error('Failed to respond to feedback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get feedback for a specific supplier or organization
   */
  static async getFeedback(
    organizationId: string,
    filters: {
      supplier_id?: string;
      schedule_event_id?: string;
      status?: string;
      feedback_type?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    feedback: SupplierFeedback[];
    total: number;
    has_more: boolean;
  }> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('supplier_schedule_feedback')
        .select(
          `
          *,
          supplier:suppliers(name, email, company_name),
          schedule_event:supplier_schedule_events(
            title, start_time, end_time,
            wedding:weddings(couple_names, wedding_date)
          ),
          responses:supplier_feedback_responses(
            id, responder_id, responder_role, response_type,
            response_message, created_at
          )
        `,
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .order('submitted_at', { ascending: false });

      // Apply filters
      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }
      if (filters.schedule_event_id) {
        query = query.eq('schedule_event_id', filters.schedule_event_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.feedback_type) {
        query = query.eq('feedback_type', filters.feedback_type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        feedback:
          data?.map((item) => ({
            ...item,
            submitted_at: new Date(item.submitted_at),
            responded_at: item.responded_at
              ? new Date(item.responded_at)
              : undefined,
            resolved_at: item.resolved_at
              ? new Date(item.resolved_at)
              : undefined,
            original_start_time: new Date(item.original_start_time),
            original_end_time: new Date(item.original_end_time),
            suggested_start_time: item.suggested_start_time
              ? new Date(item.suggested_start_time)
              : undefined,
            suggested_end_time: item.suggested_end_time
              ? new Date(item.suggested_end_time)
              : undefined,
          })) || [],
        total: count || 0,
        has_more: (data?.length || 0) === limit,
      };
    } catch (error) {
      console.error('Failed to get feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback statistics for organization or supplier
   */
  static async getFeedbackStats(
    organizationId: string,
    supplierId?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<{
    total_feedback: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    response_times: {
      average_response_time_hours: number;
      average_resolution_time_hours: number;
    };
    satisfaction_scores: {
      average_rating: number;
      response_count: number;
    };
  }> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('supplier_schedule_feedback')
        .select('*')
        .eq('organization_id', organizationId);

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      if (dateRange) {
        query = query
          .gte('submitted_at', dateRange.from.toISOString())
          .lte('submitted_at', dateRange.to.toISOString());
      }

      const { data: feedbackData } = await query;

      if (!feedbackData) {
        return {
          total_feedback: 0,
          by_type: {},
          by_status: {},
          by_priority: {},
          response_times: {
            average_response_time_hours: 0,
            average_resolution_time_hours: 0,
          },
          satisfaction_scores: {
            average_rating: 0,
            response_count: 0,
          },
        };
      }

      // Calculate statistics
      const stats = {
        total_feedback: feedbackData.length,
        by_type: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
        response_times: {
          average_response_time_hours: 0,
          average_resolution_time_hours: 0,
        },
        satisfaction_scores: {
          average_rating: 0,
          response_count: 0,
        },
      };

      // Aggregate by type, status, priority
      feedbackData.forEach((feedback) => {
        stats.by_type[feedback.feedback_type] =
          (stats.by_type[feedback.feedback_type] || 0) + 1;
        stats.by_status[feedback.status] =
          (stats.by_status[feedback.status] || 0) + 1;
        stats.by_priority[feedback.priority] =
          (stats.by_priority[feedback.priority] || 0) + 1;
      });

      // Calculate response times
      const respondedFeedback = feedbackData.filter((f) => f.responded_at);
      const resolvedFeedback = feedbackData.filter((f) => f.resolved_at);

      if (respondedFeedback.length > 0) {
        const totalResponseTime = respondedFeedback.reduce((sum, feedback) => {
          const submitTime = new Date(feedback.submitted_at).getTime();
          const responseTime = new Date(feedback.responded_at).getTime();
          return sum + (responseTime - submitTime);
        }, 0);
        stats.response_times.average_response_time_hours =
          totalResponseTime / respondedFeedback.length / (1000 * 60 * 60);
      }

      if (resolvedFeedback.length > 0) {
        const totalResolutionTime = resolvedFeedback.reduce((sum, feedback) => {
          const submitTime = new Date(feedback.submitted_at).getTime();
          const resolveTime = new Date(feedback.resolved_at!).getTime();
          return sum + (resolveTime - submitTime);
        }, 0);
        stats.response_times.average_resolution_time_hours =
          totalResolutionTime / resolvedFeedback.length / (1000 * 60 * 60);
      }

      return stats;
    } catch (error) {
      console.error('Failed to get feedback stats:', error);
      throw error;
    }
  }

  /**
   * Update feedback status
   */
  static async updateFeedbackStatus(
    feedbackId: string,
    status: SupplierFeedback['status'],
    notes?: string,
    updatedBy?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        if (notes) {
          updateData.resolution_notes = notes;
        }
      }

      const { error } = await supabase
        .from('supplier_schedule_feedback')
        .update(updateData)
        .eq('id', feedbackId);

      if (error) throw error;

      // Log the status change
      if (updatedBy) {
        await supabase.from('supplier_feedback_activity_log').insert({
          feedback_id: feedbackId,
          activity_type: 'status_changed',
          actor_id: updatedBy,
          actor_type: 'staff',
          details: {
            new_status: status,
            notes,
          },
          created_at: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update feedback status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Private helper methods

  private static generateConflictDescription(
    conflictReport: ConflictReport,
    scheduleEvent: any,
  ): string {
    const parts = [
      `Conflict Type: ${conflictReport.conflict_type.replace('_', ' ')}`,
      `Event: ${scheduleEvent.title}`,
      `Scheduled: ${new Date(scheduleEvent.start_time).toLocaleString()} - ${new Date(scheduleEvent.end_time).toLocaleString()}`,
    ];

    if (conflictReport.conflict_details.conflicting_event) {
      const ce = conflictReport.conflict_details.conflicting_event;
      parts.push(
        `Conflicting Event: ${ce.title} (${ce.start_time} - ${ce.end_time})`,
      );
    }

    if (conflictReport.conflict_details.travel_time_needed) {
      parts.push(
        `Travel Time Needed: ${conflictReport.conflict_details.travel_time_needed} minutes`,
      );
    }

    if (conflictReport.conflict_details.equipment_required?.length) {
      parts.push(
        `Equipment Required: ${conflictReport.conflict_details.equipment_required.join(', ')}`,
      );
    }

    if (conflictReport.conflict_details.other_details) {
      parts.push(
        `Additional Details: ${conflictReport.conflict_details.other_details}`,
      );
    }

    parts.push('Suggested Solutions:');
    conflictReport.suggested_solutions.forEach((solution, index) => {
      parts.push(
        `${index + 1}. ${solution.solution_type}: ${solution.description}`,
      );
    });

    return parts.join('\n');
  }

  private static extractAlternativeDatesFromSolutions(
    solutions: ConflictReport['suggested_solutions'],
  ): SupplierFeedback['alternative_dates'] {
    // Extract date-based solutions and convert to alternative dates format
    return solutions
      .filter((solution) => solution.solution_type === 'reschedule')
      .map((solution, index) => ({
        date: new Date().toISOString().split('T')[0], // Today as placeholder
        start_time: '09:00',
        end_time: '17:00',
        notes: solution.description,
        preference_score: 0.8 - index * 0.1,
      }));
  }

  private static assessVendorImpact(conflictReport: ConflictReport): boolean {
    return (
      conflictReport.conflict_type === 'equipment_conflict' ||
      conflictReport.suggested_solutions.some(
        (s) => s.solution_type === 'subcontractor',
      )
    );
  }

  private static assessCoupleApprovalNeed(
    conflictReport: ConflictReport,
  ): boolean {
    return (
      conflictReport.suggested_solutions.some(
        (s) => s.additional_cost && s.additional_cost > 0,
      ) || conflictReport.urgency_level === 'critical'
    );
  }

  private static calculateBudgetImplications(
    conflictReport: ConflictReport,
  ): SupplierFeedback['budget_implications'] {
    const costsToAdd = conflictReport.suggested_solutions
      .filter((s) => s.additional_cost && s.additional_cost > 0)
      .reduce((sum, s) => sum + (s.additional_cost || 0), 0);

    if (costsToAdd > 0) {
      return {
        additional_cost: costsToAdd,
        cost_reason: conflictReport.suggested_solutions
          .filter((s) => s.additional_cost && s.additional_cost > 0)
          .map((s) => s.description)
          .join('; '),
      };
    }

    return undefined;
  }

  private static determineNewFeedbackStatus(
    responseType: FeedbackResponse['response_type'],
    currentStatus: SupplierFeedback['status'],
  ): SupplierFeedback['status'] {
    switch (responseType) {
      case 'acknowledge':
        return 'reviewing';
      case 'accept':
      case 'reject':
        return 'resolved';
      case 'counter_propose':
        return 'reviewing';
      case 'request_more_info':
        return 'pending';
      default:
        return currentStatus;
    }
  }

  private static async notifyPlannersOfFeedback(
    feedback: SupplierFeedback,
    supplier: any,
    scheduleEvent: any,
  ): Promise<void> {
    try {
      const supabase = await createClient();

      // Get organization planners
      const { data: planners } = await supabase
        .from('organization_members')
        .select('user:users(id, email, name)')
        .eq('organization_id', feedback.organization_id)
        .in('role', ['admin', 'planner', 'coordinator']);

      if (!planners?.length) return;

      // Send notifications (implementation would depend on your notification system)
      const notificationPromises = planners.map(async (planner) => {
        // Email notification
        // await NotificationService.sendEmail(...)

        // You could also use the existing email service
        console.log(
          `Notify planner ${planner.user.email} about feedback from ${supplier.name}`,
        );
      });

      await Promise.allSettled(notificationPromises);
    } catch (error) {
      console.error('Failed to notify planners of feedback:', error);
    }
  }

  private static async notifySupplierOfResponse(
    feedback: any,
    response: FeedbackResponse,
  ): Promise<void> {
    try {
      // Implementation would send notification to supplier about the response
      console.log(
        `Notify supplier ${feedback.supplier.email} of response to feedback ${feedback.id}`,
      );
    } catch (error) {
      console.error('Failed to notify supplier of response:', error);
    }
  }
}
