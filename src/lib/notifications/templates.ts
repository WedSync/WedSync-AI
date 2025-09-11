/**
 * WS-008: Wedding Notification Templates
 * Pre-built notification templates for wedding coordination scenarios
 */

import { NotificationTemplate } from './engine';

/**
 * Wedding-specific notification templates for common scenarios
 */
export const WEDDING_NOTIFICATION_TEMPLATES: Record<
  string,
  NotificationTemplate
> = {
  // TIMELINE MILESTONES
  'timeline-final-headcount-reminder': {
    id: 'timeline-final-headcount-reminder',
    name: 'Final Headcount Reminder',
    category: 'wedding_timeline',
    priority: 'high',
    channels: {
      email: {
        subject_template:
          '⏰ Final Headcount Due: {{days_remaining}} Days Until {{wedding_date}}',
        html_template: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Final Headcount Needed</h2>
            <p>Hi {{couple_names}},</p>
            <p>Your final headcount is due in <strong>{{days_remaining}} days</strong> for your wedding on {{wedding_date}}.</p>
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3>Current Status:</h3>
              <ul>
                <li>Confirmed guests: {{confirmed_count}}</li>
                <li>Pending responses: {{pending_count}}</li>
                <li>Total expected: {{total_expected}}</li>
              </ul>
            </div>
            <p><strong>Action needed:</strong> Please finalize your guest count with {{vendor_name}} by {{deadline_date}}.</p>
            <a href="{{rsvp_management_url}}" style="background: #7F56D9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Manage Guest List</a>
            <p>Best regards,<br>{{vendor_name}}</p>
          </div>
        `,
        text_template:
          'Hi {{couple_names}}, Your final headcount is due in {{days_remaining}} days for your wedding on {{wedding_date}}. Please finalize with {{vendor_name}} by {{deadline_date}}. Current status: {{confirmed_count}} confirmed, {{pending_count}} pending. Manage: {{rsvp_management_url}}',
      },
      sms: {
        message_template:
          '⏰ HEADCOUNT REMINDER: {{days_remaining}} days until {{wedding_date}}. {{confirmed_count}} confirmed, {{pending_count}} pending. Deadline: {{deadline_date}}. Manage: {{rsvp_management_url}}',
        max_length: 160,
      },
      push: {
        title_template: 'Final Headcount Due',
        body_template:
          '{{days_remaining}} days until {{wedding_date}}. {{pending_count}} guests still pending.',
        icon: '/icons/timeline.png',
        sound: 'default',
      },
      in_app: {
        title_template: 'Final Headcount Reminder',
        message_template:
          'Your final headcount is due in {{days_remaining}} days. {{pending_count}} guests still need to respond.',
        action_url: '{{rsvp_management_url}}',
        action_text: 'Manage Guest List',
      },
    },
    variables: [
      'couple_names',
      'days_remaining',
      'wedding_date',
      'confirmed_count',
      'pending_count',
      'total_expected',
      'vendor_name',
      'deadline_date',
      'rsvp_management_url',
    ],
    routing_rules: {
      fallback_channel_order: ['email', 'sms', 'push', 'in_app'],
      require_confirmation: true,
      retry_policy: {
        max_attempts: 3,
        backoff_multiplier: 2,
        initial_delay_ms: 3600000, // 1 hour
      },
      time_sensitive: {
        delivery_window_hours: 24,
        escalate_if_undelivered: true,
      },
    },
    wedding_context: {
      timeline_dependent: true,
      vendor_specific: true,
      couple_approval_required: false,
    },
  },

  // VENDOR COMMUNICATION
  'vendor-contract-deadline': {
    id: 'vendor-contract-deadline',
    name: 'Vendor Contract Deadline',
    category: 'vendor_communication',
    priority: 'urgent',
    channels: {
      email: {
        subject_template:
          '🚨 URGENT: Contract Due {{deadline_date}} - {{vendor_category}}',
        html_template: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #DC2626; margin: 0;">Urgent: Contract Deadline</h2>
            </div>
            <p>Hi {{couple_names}},</p>
            <p><strong>Your {{vendor_category}} contract with {{vendor_name}} is due {{deadline_date}}.</strong></p>
            <div style="background: #FEF2F2; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #FECACA;">
              <h3 style="color: #DC2626;">Contract Details:</h3>
              <ul>
                <li>Vendor: {{vendor_name}}</li>
                <li>Service: {{vendor_category}}</li>
                <li>Contract Value: {{contract_amount}}</li>
                <li>Due Date: {{deadline_date}}</li>
                <li>Days Remaining: {{days_remaining}}</li>
              </ul>
            </div>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Review the contract terms</li>
              <li>Sign and return by {{deadline_date}}</li>
              <li>Submit required deposit: {{deposit_amount}}</li>
            </ol>
            <a href="{{contract_url}}" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Review Contract</a>
            <p><em>Missing this deadline may result in losing your booking.</em></p>
            <p>Questions? Contact {{vendor_name}} directly at {{vendor_contact}}.</p>
          </div>
        `,
        text_template:
          'URGENT: {{vendor_category}} contract with {{vendor_name}} due {{deadline_date}} ({{days_remaining}} days). Contract value: {{contract_amount}}, deposit: {{deposit_amount}}. Review: {{contract_url}} Contact: {{vendor_contact}}',
      },
      sms: {
        message_template:
          '🚨 URGENT: {{vendor_category}} contract due {{deadline_date}} ({{days_remaining}} days). {{contract_amount}} value. Review: {{contract_url}}',
        max_length: 160,
      },
      push: {
        title_template: 'Contract Deadline Alert',
        body_template:
          '{{vendor_category}} contract due in {{days_remaining}} days',
        icon: '/icons/urgent.png',
        sound: 'urgent',
      },
      in_app: {
        title_template: 'Urgent: Contract Deadline',
        message_template:
          '{{vendor_category}} contract with {{vendor_name}} due {{deadline_date}}',
        action_url: '{{contract_url}}',
        action_text: 'Review Contract',
      },
    },
    variables: [
      'couple_names',
      'vendor_category',
      'vendor_name',
      'deadline_date',
      'days_remaining',
      'contract_amount',
      'deposit_amount',
      'contract_url',
      'vendor_contact',
    ],
    routing_rules: {
      fallback_channel_order: ['sms', 'email', 'push', 'in_app'],
      require_confirmation: true,
      retry_policy: {
        max_attempts: 5,
        backoff_multiplier: 1.5,
        initial_delay_ms: 1800000, // 30 minutes
      },
      time_sensitive: {
        delivery_window_hours: 4,
        escalate_if_undelivered: true,
      },
    },
    wedding_context: {
      timeline_dependent: true,
      vendor_specific: true,
      couple_approval_required: false,
    },
  },

  // EMERGENCY NOTIFICATIONS
  'emergency-venue-change': {
    id: 'emergency-venue-change',
    name: 'Emergency Venue Change',
    category: 'emergency',
    priority: 'emergency',
    channels: {
      email: {
        subject_template: '🚨 EMERGENCY: Venue Change for {{wedding_date}}',
        html_template: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7F1D1D; color: white; padding: 20px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY VENUE CHANGE</h1>
            </div>
            <p><strong>IMMEDIATE ACTION REQUIRED</strong></p>
            <p>Hi {{couple_names}},</p>
            <p>Due to {{emergency_reason}}, your wedding venue has changed:</p>
            <div style="display: flex; gap: 20px; margin: 20px 0;">
              <div style="flex: 1; background: #FEF2F2; padding: 15px; border-radius: 8px;">
                <h3 style="color: #DC2626; margin-top: 0;">Original Venue</h3>
                <p>{{original_venue_name}}<br>{{original_venue_address}}</p>
              </div>
              <div style="flex: 1; background: #F0FDF4; padding: 15px; border-radius: 8px;">
                <h3 style="color: #16A34A; margin-top: 0;">NEW VENUE</h3>
                <p><strong>{{new_venue_name}}</strong><br>{{new_venue_address}}</p>
              </div>
            </div>
            <div style="background: #FEF3C7; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #FCD34D;">
              <h3>Important Details:</h3>
              <ul>
                <li><strong>Date & Time:</strong> {{wedding_date}} at {{wedding_time}} (UNCHANGED)</li>
                <li><strong>New Address:</strong> {{new_venue_address}}</li>
                <li><strong>Parking:</strong> {{parking_info}}</li>
                <li><strong>Contact:</strong> {{venue_contact}}</li>
              </ul>
            </div>
            <div style="background: #DC2626; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">URGENT ACTIONS:</h3>
              <ol style="margin-bottom: 0;">
                <li>Notify your bridal party immediately</li>
                <li>Update your wedding website/invitations</li>
                <li>Contact transportation providers</li>
                <li>Inform out-of-town guests</li>
              </ol>
            </div>
            <a href="{{guest_notification_url}}" style="background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; font-weight: bold;">Notify All Guests</a>
            <p>We sincerely apologize for this last-minute change. Our team is working to ensure your day remains perfect.</p>
            <p><strong>Emergency Contact:</strong> {{emergency_contact}}</p>
          </div>
        `,
        text_template:
          '🚨 EMERGENCY VENUE CHANGE: {{wedding_date}} moved from {{original_venue_name}} to {{new_venue_name}} at {{new_venue_address}}. Time unchanged: {{wedding_time}}. Notify guests immediately. Emergency contact: {{emergency_contact}}',
      },
      sms: {
        message_template:
          '🚨 EMERGENCY: Wedding venue changed to {{new_venue_name}}, {{new_venue_address}}. Date/time unchanged: {{wedding_date}} {{wedding_time}}. Call {{emergency_contact}} ASAP.',
        max_length: 160,
      },
      push: {
        title_template: '🚨 EMERGENCY: Venue Changed',
        body_template: 'Wedding moved to {{new_venue_name}}. Tap for details.',
        icon: '/icons/emergency.png',
        sound: 'emergency',
      },
      in_app: {
        title_template: '🚨 Emergency Venue Change',
        message_template:
          'Your wedding venue has been changed to {{new_venue_name}} due to {{emergency_reason}}.',
        action_url: '{{guest_notification_url}}',
        action_text: 'Notify Guests',
      },
    },
    variables: [
      'couple_names',
      'emergency_reason',
      'original_venue_name',
      'original_venue_address',
      'new_venue_name',
      'new_venue_address',
      'wedding_date',
      'wedding_time',
      'parking_info',
      'venue_contact',
      'guest_notification_url',
      'emergency_contact',
    ],
    routing_rules: {
      fallback_channel_order: ['sms', 'push', 'email', 'in_app'],
      require_confirmation: true,
      retry_policy: {
        max_attempts: 10,
        backoff_multiplier: 1.2,
        initial_delay_ms: 300000, // 5 minutes
      },
      time_sensitive: {
        delivery_window_hours: 1,
        escalate_if_undelivered: true,
      },
    },
    wedding_context: {
      timeline_dependent: true,
      vendor_specific: true,
      couple_approval_required: false,
    },
  },

  // PAYMENT NOTIFICATIONS
  'payment-reminder-final': {
    id: 'payment-reminder-final',
    name: 'Final Payment Reminder',
    category: 'payment',
    priority: 'high',
    channels: {
      email: {
        subject_template:
          '💳 Final Payment Due: {{vendor_name}} - {{due_date}}',
        html_template: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Final Payment Due</h2>
            <p>Hi {{couple_names}},</p>
            <p>Your final payment for {{vendor_name}} is due {{due_date}}.</p>
            <div style="background: #F8F9FA; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #E9ECEF;">
              <h3>Payment Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;"><strong>Vendor:</strong></td><td>{{vendor_name}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>{{service_description}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Amount Due:</strong></td><td><strong>${{ amount_due }}</strong></td></tr>
                <tr><td style="padding: 8px 0;"><strong>Due Date:</strong></td><td>{{due_date}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Payment Method:</strong></td><td>{{payment_method}}</td></tr>
              </table>
            </div>
            <div style="background: #FEF3C7; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0;"><strong>Note:</strong> This is your final payment. Late payments may affect service delivery on your wedding day.</p>
            </div>
            <a href="{{payment_url}}" style="background: #16A34A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Pay Now</a>
            <p>Questions about your payment? Contact {{vendor_name}} at {{vendor_contact}}.</p>
            <p>Thank you for choosing {{vendor_name}}!</p>
          </div>
        `,
        text_template:
          'Final payment due for {{vendor_name}}: ${{amount_due}} by {{due_date}}. Service: {{service_description}}. Pay: {{payment_url}} Contact: {{vendor_contact}}',
      },
      sms: {
        message_template:
          '💳 Final payment due: ${{amount_due}} to {{vendor_name}} by {{due_date}}. Pay now: {{payment_url}}',
        max_length: 160,
      },
      push: {
        title_template: 'Payment Due',
        body_template: '${{amount_due}} due to {{vendor_name}} by {{due_date}}',
        icon: '/icons/payment.png',
      },
      in_app: {
        title_template: 'Final Payment Due',
        message_template:
          '${{amount_due}} due to {{vendor_name}} by {{due_date}}',
        action_url: '{{payment_url}}',
        action_text: 'Pay Now',
      },
    },
    variables: [
      'couple_names',
      'vendor_name',
      'due_date',
      'service_description',
      'amount_due',
      'payment_method',
      'payment_url',
      'vendor_contact',
    ],
    routing_rules: {
      fallback_channel_order: ['email', 'sms', 'push', 'in_app'],
      require_confirmation: false,
      retry_policy: {
        max_attempts: 3,
        backoff_multiplier: 2,
        initial_delay_ms: 86400000, // 24 hours
      },
      time_sensitive: {
        delivery_window_hours: 48,
        escalate_if_undelivered: false,
      },
    },
    wedding_context: {
      timeline_dependent: true,
      vendor_specific: true,
      couple_approval_required: false,
    },
  },

  // CONFIRMATION NOTIFICATIONS
  'booking-confirmation': {
    id: 'booking-confirmation',
    name: 'Booking Confirmation',
    category: 'confirmation',
    priority: 'normal',
    channels: {
      email: {
        subject_template:
          '✅ Booking Confirmed: {{vendor_name}} for {{wedding_date}}',
        html_template: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #16A34A; color: white; padding: 20px; text-align: center; margin-bottom: 20px; border-radius: 8px;">
              <h1 style="margin: 0;">✅ Booking Confirmed!</h1>
            </div>
            <p>Hi {{couple_names}},</p>
            <p>Great news! Your booking with {{vendor_name}} has been confirmed for your wedding on {{wedding_date}}.</p>
            <div style="background: #F0FDF4; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #DCFCE7;">
              <h3>Booking Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;"><strong>Vendor:</strong></td><td>{{vendor_name}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>{{service_description}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Date:</strong></td><td>{{wedding_date}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Time:</strong></td><td>{{service_time}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Location:</strong></td><td>{{service_location}}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Total Investment:</strong></td><td>${{ total_amount }}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Deposit Paid:</strong></td><td>${{ deposit_amount }}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Balance Due:</strong></td><td>${{ balance_due }}</td></tr>
              </table>
            </div>
            <h3>Next Steps:</h3>
            <ul>
              <li>Save your vendor's contact information: {{vendor_contact}}</li>
              <li>Review your contract details</li>
              <li>Schedule any required consultations</li>
              <li>Final payment due: {{final_payment_date}}</li>
            </ul>
            <a href="{{contract_url}}" style="background: #7F56D9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">View Contract</a>
            <p>We're excited to be part of your special day!</p>
            <p>Best regards,<br>{{vendor_name}}</p>
          </div>
        `,
        text_template:
          'Booking confirmed with {{vendor_name}} for {{wedding_date}}! Service: {{service_description}}. Total: ${{total_amount}}, Balance due: ${{balance_due}} by {{final_payment_date}}. Contact: {{vendor_contact}}',
      },
      sms: {
        message_template:
          '✅ Confirmed: {{vendor_name}} for {{wedding_date}}. {{service_description}}. Balance: ${{balance_due}} due {{final_payment_date}}.',
        max_length: 160,
      },
      push: {
        title_template: 'Booking Confirmed!',
        body_template: '{{vendor_name}} confirmed for {{wedding_date}}',
        icon: '/icons/confirmed.png',
      },
      in_app: {
        title_template: 'Booking Confirmed',
        message_template:
          '{{vendor_name}} confirmed for {{wedding_date}}. Balance due: ${{balance_due}}',
        action_url: '{{contract_url}}',
        action_text: 'View Details',
      },
    },
    variables: [
      'couple_names',
      'vendor_name',
      'wedding_date',
      'service_description',
      'service_time',
      'service_location',
      'total_amount',
      'deposit_amount',
      'balance_due',
      'vendor_contact',
      'final_payment_date',
      'contract_url',
    ],
    routing_rules: {
      fallback_channel_order: ['email', 'in_app', 'push', 'sms'],
      require_confirmation: false,
      retry_policy: {
        max_attempts: 2,
        backoff_multiplier: 2,
        initial_delay_ms: 3600000, // 1 hour
      },
    },
    wedding_context: {
      timeline_dependent: false,
      vendor_specific: true,
      couple_approval_required: false,
    },
  },

  // DAY-OF COORDINATION
  'day-of-vendor-arrival': {
    id: 'day-of-vendor-arrival',
    name: 'Day-of Vendor Arrival Notification',
    category: 'wedding_timeline',
    priority: 'high',
    channels: {
      email: {
        subject_template: '🚛 {{vendor_name}} Arriving Soon - {{arrival_time}}',
        html_template: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Vendor Arrival Update</h2>
            <p>Hi {{couple_names}},</p>
            <p><strong>{{vendor_name}} is arriving at {{arrival_time}} ({{time_until}} from now).</strong></p>
            <div style="background: #EBF8FF; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3>Arrival Details:</h3>
              <ul>
                <li><strong>Vendor:</strong> {{vendor_name}}</li>
                <li><strong>Arrival Time:</strong> {{arrival_time}}</li>
                <li><strong>Setup Duration:</strong> {{setup_duration}}</li>
                <li><strong>Contact:</strong> {{vendor_phone}}</li>
                <li><strong>Setup Location:</strong> {{setup_location}}</li>
              </ul>
            </div>
            <p><strong>Coordination Notes:</strong> {{coordination_notes}}</p>
            <p>Your day-of coordinator will manage the vendor arrival and setup.</p>
          </div>
        `,
        text_template:
          '{{vendor_name}} arriving {{arrival_time}} ({{time_until}}). Setup: {{setup_duration}} at {{setup_location}}. Contact: {{vendor_phone}}',
      },
      sms: {
        message_template:
          '🚛 {{vendor_name}} arriving {{arrival_time}} ({{time_until}}). Setup at {{setup_location}}. Contact: {{vendor_phone}}',
        max_length: 160,
      },
      push: {
        title_template: 'Vendor Arriving',
        body_template: '{{vendor_name}} arriving in {{time_until}}',
        icon: '/icons/truck.png',
      },
      in_app: {
        title_template: 'Vendor Arrival',
        message_template:
          '{{vendor_name}} arriving at {{arrival_time}} for setup at {{setup_location}}',
        action_url: '/wedding-day-timeline',
        action_text: 'View Timeline',
      },
    },
    variables: [
      'couple_names',
      'vendor_name',
      'arrival_time',
      'time_until',
      'setup_duration',
      'vendor_phone',
      'setup_location',
      'coordination_notes',
    ],
    routing_rules: {
      fallback_channel_order: ['push', 'sms', 'in_app', 'email'],
      require_confirmation: false,
      retry_policy: {
        max_attempts: 2,
        backoff_multiplier: 1.5,
        initial_delay_ms: 900000, // 15 minutes
      },
    },
    wedding_context: {
      timeline_dependent: true,
      vendor_specific: true,
      couple_approval_required: false,
    },
  },
};

/**
 * Template categories for organization
 */
export const TEMPLATE_CATEGORIES = {
  wedding_timeline: 'Wedding Timeline',
  vendor_communication: 'Vendor Communication',
  payment: 'Payment Notifications',
  emergency: 'Emergency Alerts',
  reminder: 'Reminders',
  confirmation: 'Confirmations',
} as const;

/**
 * Priority levels for notifications
 */
export const PRIORITY_LEVELS = {
  low: { name: 'Low Priority', color: '#6B7280', sound: 'default' },
  normal: { name: 'Normal', color: '#3B82F6', sound: 'default' },
  high: { name: 'High Priority', color: '#F59E0B', sound: 'alert' },
  urgent: { name: 'Urgent', color: '#EF4444', sound: 'urgent' },
  emergency: { name: 'Emergency', color: '#7F1D1D', sound: 'emergency' },
} as const;

/**
 * Get all templates for a specific category
 */
export function getTemplatesByCategory(
  category: keyof typeof TEMPLATE_CATEGORIES,
): NotificationTemplate[] {
  return Object.values(WEDDING_NOTIFICATION_TEMPLATES).filter(
    (template) => template.category === category,
  );
}

/**
 * Get all templates by priority
 */
export function getTemplatesByPriority(
  priority: keyof typeof PRIORITY_LEVELS,
): NotificationTemplate[] {
  return Object.values(WEDDING_NOTIFICATION_TEMPLATES).filter(
    (template) => template.priority === priority,
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(
  templateId: string,
): NotificationTemplate | null {
  return WEDDING_NOTIFICATION_TEMPLATES[templateId] || null;
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  template: NotificationTemplate,
  variables: Record<string, any>,
): { valid: boolean; missing: string[]; extra: string[] } {
  const provided = Object.keys(variables);
  const required = template.variables;

  const missing = required.filter((variable) => !provided.includes(variable));
  const extra = provided.filter((variable) => !required.includes(variable));

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}

/**
 * Get wedding timeline templates in chronological order
 */
export function getWeddingTimelineTemplates(): NotificationTemplate[] {
  const timelineTemplates = getTemplatesByCategory('wedding_timeline');

  // Sort by typical wedding timeline order
  const timelineOrder = [
    'booking-confirmation',
    'timeline-final-headcount-reminder',
    'day-of-vendor-arrival',
  ];

  return timelineOrder
    .map((id) => WEDDING_NOTIFICATION_TEMPLATES[id])
    .filter(Boolean)
    .concat(timelineTemplates.filter((t) => !timelineOrder.includes(t.id)));
}

/**
 * Get emergency templates for critical situations
 */
export function getEmergencyTemplates(): NotificationTemplate[] {
  return getTemplatesByCategory('emergency');
}

/**
 * Calculate estimated delivery cost for template across all channels
 */
export function estimateTemplateCost(
  template: NotificationTemplate,
  recipientCount: number,
): { total: number; breakdown: Record<string, number> } {
  const costs = {
    email: 0.001, // $0.001 per email
    sms: 0.0075, // $0.0075 per SMS
    push: 0.0001, // $0.0001 per push notification
    in_app: 0, // Free for in-app notifications
  };

  const breakdown: Record<string, number> = {};
  let total = 0;

  Object.keys(template.channels).forEach((channel) => {
    const channelCost = costs[channel as keyof typeof costs] || 0;
    const channelTotal = channelCost * recipientCount;
    breakdown[channel] = channelTotal;
    total += channelTotal;
  });

  return { total, breakdown };
}

export default WEDDING_NOTIFICATION_TEMPLATES;
