// WS-161: Supplier Schedule Notifications API
import { NextRequest, NextResponse } from 'next/server';
import { SupplierScheduleEmailService } from '@/lib/email/supplier-schedule-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const NotificationRequestSchema = z.object({
  notification_type: z.enum([
    'update',
    'cancellation',
    'reminder',
    'invite',
    'conflict',
  ]),
  supplier_ids: z.array(z.string()),
  schedule_event_id: z.string(),
  organization_id: z.string(),
  change_details: z
    .object({
      change_type: z
        .enum([
          'time_update',
          'location_update',
          'details_update',
          'cancellation',
          'new_booking',
        ])
        .optional(),
      original_values: z.any().optional(),
      new_values: z.any().optional(),
      reason: z.string().optional(),
      requested_by: z.string(),
      urgent: z.boolean().default(false),
    })
    .optional(),
  reminder_type: z.enum(['week', 'day', 'hour', 'custom']).optional(),
  custom_hours: z.number().optional(),
  calendar_invite_data: z
    .object({
      icsContent: z.string(),
      googleCalendarUrl: z.string(),
      outlookCalendarUrl: z.string(),
      appleCalendarUrl: z.string(),
    })
    .optional(),
  cancellation_reason: z.string().optional(),
  compensation: z
    .object({
      amount: z.number(),
      currency: z.string(),
      method: z.string(),
    })
    .optional(),
  conflict_details: z
    .object({
      conflictingEvent: z.string(),
      conflictTime: z.string(),
      suggestionOptions: z.array(
        z.object({
          startTime: z.string(),
          endTime: z.string(),
          reason: z.string(),
        }),
      ),
    })
    .optional(),
});

const BulkNotificationSchema = z.object({
  notification_type: z.enum(['update', 'reminder', 'invite', 'cancellation']),
  supplier_ids: z.array(z.string()),
  schedule_event_id: z.string(),
  organization_id: z.string(),
  additional_data: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user from request headers or session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      notification_type,
      supplier_ids,
      schedule_event_id,
      organization_id,
    } = body;

    // Validate request based on notification type
    let validatedData;
    try {
      if (body.bulk_operation) {
        validatedData = BulkNotificationSchema.parse(body);
      } else {
        validatedData = NotificationRequestSchema.parse(body);
      }
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError },
        { status: 400 },
      );
    }

    // Verify user has access to the organization
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (
      !orgMembership ||
      !['admin', 'planner', 'coordinator'].includes(orgMembership.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Get schedule event details
    const { data: scheduleEvent, error: eventError } = await supabase
      .from('supplier_schedule_events')
      .select(
        `
        *,
        wedding:weddings!inner(
          id,
          couple_names,
          wedding_date,
          planner_name,
          planner_email
        )
      `,
      )
      .eq('id', schedule_event_id)
      .eq('organization_id', organization_id)
      .single();

    if (eventError || !scheduleEvent) {
      return NextResponse.json(
        { error: 'Schedule event not found' },
        { status: 404 },
      );
    }

    // Get supplier details
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select(
        `
        id,
        email,
        name,
        company_name,
        phone,
        role,
        notification_preferences
      `,
      )
      .in('id', supplier_ids)
      .eq('organization_id', organization_id);

    if (suppliersError || !suppliers || suppliers.length === 0) {
      return NextResponse.json(
        { error: 'No valid suppliers found' },
        { status: 404 },
      );
    }

    // Convert to supplier contact info format
    const supplierContacts = suppliers.map((supplier) => ({
      id: supplier.id,
      email: supplier.email,
      name: supplier.name,
      company_name: supplier.company_name,
      phone: supplier.phone,
      role: supplier.role,
      preferences: supplier.notification_preferences || {
        email_notifications: true,
        sms_notifications: false,
        whatsapp_notifications: false,
        reminder_hours: [24, 2],
        preferred_contact_method: 'email',
      },
    }));

    // Filter suppliers who have email notifications enabled
    const emailEnabledSuppliers = supplierContacts.filter(
      (supplier) => supplier.preferences.email_notifications,
    );

    if (emailEnabledSuppliers.length === 0) {
      return NextResponse.json(
        { message: 'No suppliers have email notifications enabled' },
        { status: 200 },
      );
    }

    // Convert schedule event to proper format
    const supplierScheduleEvent = {
      id: scheduleEvent.id,
      title: scheduleEvent.title,
      description: scheduleEvent.description,
      start_time: new Date(scheduleEvent.start_time),
      end_time: new Date(scheduleEvent.end_time),
      location: scheduleEvent.location,
      venue_name: scheduleEvent.venue_name,
      venue_address: scheduleEvent.venue_address,
      setup_time: scheduleEvent.setup_time
        ? new Date(scheduleEvent.setup_time)
        : undefined,
      breakdown_time: scheduleEvent.breakdown_time
        ? new Date(scheduleEvent.breakdown_time)
        : undefined,
      supplier_role: scheduleEvent.supplier_role,
      special_instructions: scheduleEvent.special_instructions,
      contact_person: scheduleEvent.contact_person,
      contact_phone: scheduleEvent.contact_phone,
      contact_email: scheduleEvent.contact_email,
      wedding_date: new Date(scheduleEvent.wedding.wedding_date),
      couple_names: scheduleEvent.wedding.couple_names,
      planner_name: scheduleEvent.wedding.planner_name,
      planner_email: scheduleEvent.wedding.planner_email,
      priority: scheduleEvent.priority as
        | 'low'
        | 'medium'
        | 'high'
        | 'critical',
      status: scheduleEvent.status as
        | 'draft'
        | 'confirmed'
        | 'updated'
        | 'cancelled',
      created_at: new Date(scheduleEvent.created_at),
      updated_at: new Date(scheduleEvent.updated_at),
    };

    let results;

    try {
      switch (notification_type) {
        case 'update':
          if (!validatedData.change_details) {
            return NextResponse.json(
              { error: 'Change details required for update notifications' },
              { status: 400 },
            );
          }

          results = { successful: 0, failed: 0, errors: [] };

          for (const supplier of emailEnabledSuppliers) {
            try {
              await SupplierScheduleEmailService.sendScheduleUpdateNotification(
                supplier,
                supplierScheduleEvent,
                validatedData.change_details,
                organization_id,
              );
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push(
                `${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
          break;

        case 'cancellation':
          const cancellationReason =
            validatedData.cancellation_reason || 'Schedule change';
          results = { successful: 0, failed: 0, errors: [] };

          for (const supplier of emailEnabledSuppliers) {
            try {
              await SupplierScheduleEmailService.sendScheduleCancellationNotification(
                supplier,
                supplierScheduleEvent,
                cancellationReason,
                organization_id,
                validatedData.compensation,
              );
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push(
                `${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
          break;

        case 'reminder':
          const reminderType = validatedData.reminder_type || 'day';
          results = { successful: 0, failed: 0, errors: [] };

          for (const supplier of emailEnabledSuppliers) {
            try {
              await SupplierScheduleEmailService.sendScheduleReminderNotification(
                supplier,
                supplierScheduleEvent,
                reminderType,
                organization_id,
                validatedData.custom_hours,
              );
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push(
                `${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
          break;

        case 'invite':
          if (!validatedData.calendar_invite_data) {
            return NextResponse.json(
              {
                error: 'Calendar invite data required for invite notifications',
              },
              { status: 400 },
            );
          }

          results = { successful: 0, failed: 0, errors: [] };

          for (const supplier of emailEnabledSuppliers) {
            try {
              await SupplierScheduleEmailService.sendScheduleInviteNotification(
                supplier,
                supplierScheduleEvent,
                organization_id,
                validatedData.calendar_invite_data,
              );
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push(
                `${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
          break;

        case 'conflict':
          if (!validatedData.conflict_details) {
            return NextResponse.json(
              { error: 'Conflict details required for conflict notifications' },
              { status: 400 },
            );
          }

          results = { successful: 0, failed: 0, errors: [] };

          for (const supplier of emailEnabledSuppliers) {
            try {
              await SupplierScheduleEmailService.sendConflictAlertNotification(
                supplier,
                supplierScheduleEvent,
                validatedData.conflict_details,
                organization_id,
              );
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push(
                `${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid notification type' },
            { status: 400 },
          );
      }

      // Log the bulk operation
      await supabase.from('supplier_notification_log').insert({
        organization_id,
        schedule_event_id,
        notification_type,
        supplier_count: emailEnabledSuppliers.length,
        successful_count: results.successful,
        failed_count: results.failed,
        errors: results.errors,
        requested_by: user.id,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Notifications sent successfully`,
        results: {
          total_suppliers: emailEnabledSuppliers.length,
          successful: results.successful,
          failed: results.failed,
          errors: results.errors,
        },
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
      return NextResponse.json(
        {
          error: 'Failed to send notifications',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organization_id');
    const eventId = url.searchParams.get('event_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 },
      );
    }

    // Verify user has access to the organization
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!orgMembership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Get notification history
    let query = supabase
      .from('supplier_notification_log')
      .select(
        `
        *,
        schedule_event:supplier_schedule_events(
          title,
          start_time,
          wedding:weddings(couple_names)
        )
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventId) {
      query = query.eq('schedule_event_id', eventId);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notification history' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        limit,
        offset,
        has_more: (notifications?.length || 0) === limit,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
