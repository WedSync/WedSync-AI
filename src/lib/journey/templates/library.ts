import { JourneyTemplate } from './types';

export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  // Photography Booking Journey
  {
    id: 'photography-booking-flow',
    name: 'Photography Booking Flow',
    category: 'photography',
    description:
      'Complete photography booking journey from initial inquiry to post-wedding delivery',
    tier: 'starter',
    estimatedDuration: '2-3 months',
    tags: ['booking', 'consultation', 'timeline', 'delivery'],
    popularity: 95,
    features: [
      'Automated follow-ups',
      'Contract management',
      'Timeline coordination',
      'Gallery delivery',
    ],
    variables: [
      {
        key: 'vendor_name',
        label: 'Your Business Name',
        type: 'text',
        required: true,
        defaultValue: 'Your Photography Studio',
      },
      {
        key: 'consultation_duration',
        label: 'Consultation Duration (minutes)',
        type: 'number',
        defaultValue: '60',
      },
      {
        key: 'booking_fee',
        label: 'Booking Fee',
        type: 'number',
        required: true,
      },
      {
        key: 'gallery_delivery_days',
        label: 'Gallery Delivery (days after wedding)',
        type: 'number',
        defaultValue: '30',
      },
    ],
    successMetrics: [
      {
        name: 'Booking Conversion',
        target: 80,
        unit: '%',
        description: 'Percentage of inquiries that become bookings',
      },
      {
        name: 'Response Time',
        target: 2,
        unit: 'hours',
        description: 'Average time to respond to inquiries',
      },
    ],
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Inquiry Form Submitted',
          trigger_type: 'form_submission',
          description: 'Journey starts when couple submits inquiry form',
        },
      },
      {
        id: '2',
        type: 'email',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Welcome Email',
          template: 'welcome_vendor_onboarding',
          subject: 'Thank you for your inquiry!',
          delay: '5 minutes',
        },
      },
      {
        id: '3',
        type: 'sms',
        position: { x: 500, y: 100 },
        data: {
          label: 'SMS Confirmation',
          template: 'welcome',
          message:
            'Hi {{client_first_name}}, we received your inquiry and will be in touch soon!',
        },
      },
      {
        id: '4',
        type: 'delay',
        position: { x: 700, y: 100 },
        data: {
          label: 'Wait 1 Day',
          duration: '1 day',
          description: 'Give couple time to review initial information',
        },
      },
      {
        id: '5',
        type: 'condition',
        position: { x: 900, y: 100 },
        data: {
          label: 'Check Response',
          condition_type: 'form_field',
          field: 'consultation_requested',
          operator: 'equals',
          value: 'yes',
        },
      },
      {
        id: '6',
        type: 'email',
        position: { x: 1100, y: 50 },
        data: {
          label: 'Send Consultation Link',
          template: 'timeline_planning',
          subject: 'Schedule your consultation',
        },
      },
      {
        id: '7',
        type: 'email',
        position: { x: 1100, y: 150 },
        data: {
          label: 'Send Portfolio',
          template: 'custom',
          subject: 'Our Wedding Portfolio',
        },
      },
      {
        id: '8',
        type: 'form',
        position: { x: 1300, y: 100 },
        data: {
          label: 'Send Contract',
          form_type: 'contract',
          description: 'Photography service agreement',
        },
      },
      {
        id: '9',
        type: 'email',
        position: { x: 1500, y: 100 },
        data: {
          label: 'Payment Request',
          template: 'payment_due',
          subject: 'Booking fee due',
        },
      },
      {
        id: '10',
        type: 'sms',
        position: { x: 1700, y: 100 },
        data: {
          label: 'Confirmation SMS',
          template: 'event_confirmation',
          message: "You're officially booked! We can't wait for your big day!",
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6', sourceHandle: 'yes' },
      { id: 'e5-7', source: '5', target: '7', sourceHandle: 'no' },
      { id: 'e6-8', source: '6', target: '8' },
      { id: 'e7-8', source: '7', target: '8' },
      { id: 'e8-9', source: '8', target: '9' },
      { id: 'e9-10', source: '9', target: '10' },
    ],
  },

  // Venue Tour Scheduling
  {
    id: 'venue-tour-scheduling',
    name: 'Venue Tour Scheduling',
    category: 'venue',
    description: 'Automated venue tour scheduling and follow-up process',
    tier: 'professional',
    estimatedDuration: '1-2 weeks',
    tags: ['tour', 'scheduling', 'follow-up', 'booking'],
    popularity: 88,
    features: [
      'Calendar integration',
      'Automated reminders',
      'Tour feedback collection',
      'Booking conversion',
    ],
    variables: [
      {
        key: 'venue_name',
        label: 'Venue Name',
        type: 'text',
        required: true,
      },
      {
        key: 'tour_duration',
        label: 'Tour Duration (minutes)',
        type: 'number',
        defaultValue: '45',
      },
      {
        key: 'follow_up_days',
        label: 'Follow-up After (days)',
        type: 'number',
        defaultValue: '2',
      },
    ],
    successMetrics: [
      {
        name: 'Tour Show Rate',
        target: 90,
        unit: '%',
      },
      {
        name: 'Tour to Booking',
        target: 60,
        unit: '%',
      },
    ],
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Tour Request Received',
          trigger_type: 'form_submission',
        },
      },
      {
        id: '2',
        type: 'email',
        position: { x: 300, y: 100 },
        data: {
          label: 'Confirm Tour Request',
          template: 'event_confirmation',
          delay: '5 minutes',
        },
      },
      {
        id: '3',
        type: 'form',
        position: { x: 500, y: 100 },
        data: {
          label: 'Send Availability Calendar',
          form_type: 'calendar_booking',
        },
      },
      {
        id: '4',
        type: 'delay',
        position: { x: 700, y: 100 },
        data: {
          label: 'Wait for Booking',
          duration: '2 days',
        },
      },
      {
        id: '5',
        type: 'condition',
        position: { x: 900, y: 100 },
        data: {
          label: 'Tour Booked?',
          condition_type: 'calendar_status',
        },
      },
      {
        id: '6',
        type: 'sms',
        position: { x: 1100, y: 50 },
        data: {
          label: 'Tour Reminder (Day Before)',
          template: 'appointment_reminder',
        },
      },
      {
        id: '7',
        type: 'email',
        position: { x: 1100, y: 150 },
        data: {
          label: 'Send Virtual Tour',
          template: 'custom',
        },
      },
      {
        id: '8',
        type: 'email',
        position: { x: 1300, y: 50 },
        data: {
          label: 'Post-Tour Follow-up',
          template: 'follow_up',
        },
      },
      {
        id: '9',
        type: 'form',
        position: { x: 1500, y: 50 },
        data: {
          label: 'Send Booking Package',
          form_type: 'venue_package',
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6', sourceHandle: 'yes' },
      { id: 'e5-7', source: '5', target: '7', sourceHandle: 'no' },
      { id: 'e6-8', source: '6', target: '8' },
      { id: 'e8-9', source: '8', target: '9' },
    ],
  },

  // Catering Tasting Process
  {
    id: 'catering-tasting-process',
    name: 'Catering Tasting Process',
    category: 'catering',
    description:
      'Complete catering journey from tasting to final menu confirmation',
    tier: 'professional',
    estimatedDuration: '2-3 months',
    tags: ['tasting', 'menu', 'dietary', 'confirmation'],
    popularity: 92,
    features: [
      'Tasting scheduling',
      'Menu customization',
      'Dietary management',
      'Final headcount tracking',
    ],
    variables: [
      {
        key: 'caterer_name',
        label: 'Catering Company Name',
        type: 'text',
        required: true,
      },
      {
        key: 'tasting_fee',
        label: 'Tasting Fee',
        type: 'number',
        defaultValue: '150',
      },
      {
        key: 'menu_deadline_weeks',
        label: 'Menu Deadline (weeks before)',
        type: 'number',
        defaultValue: '4',
      },
    ],
    successMetrics: [
      {
        name: 'Tasting Conversion',
        target: 75,
        unit: '%',
      },
      {
        name: 'Menu Satisfaction',
        target: 95,
        unit: '%',
      },
    ],
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Catering Inquiry',
          trigger_type: 'form_submission',
        },
      },
      {
        id: '2',
        type: 'email',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Menu Options',
          template: 'custom',
          subject: 'Our Wedding Menu Collection',
        },
      },
      {
        id: '3',
        type: 'form',
        position: { x: 500, y: 100 },
        data: {
          label: 'Dietary Requirements Form',
          form_type: 'dietary_requirements',
        },
      },
      {
        id: '4',
        type: 'email',
        position: { x: 700, y: 100 },
        data: {
          label: 'Schedule Tasting',
          template: 'timeline_planning',
        },
      },
      {
        id: '5',
        type: 'sms',
        position: { x: 900, y: 100 },
        data: {
          label: 'Tasting Reminder',
          template: 'appointment_reminder',
        },
      },
      {
        id: '6',
        type: 'delay',
        position: { x: 1100, y: 100 },
        data: {
          label: 'Post-Tasting Wait',
          duration: '2 days',
        },
      },
      {
        id: '7',
        type: 'form',
        position: { x: 1300, y: 100 },
        data: {
          label: 'Menu Selection Form',
          form_type: 'menu_selection',
        },
      },
      {
        id: '8',
        type: 'email',
        position: { x: 1500, y: 100 },
        data: {
          label: 'Confirm Final Menu',
          template: 'event_confirmation',
        },
      },
      {
        id: '9',
        type: 'form',
        position: { x: 1700, y: 100 },
        data: {
          label: 'Final Headcount',
          form_type: 'guest_count',
        },
      },
      {
        id: '10',
        type: 'email',
        position: { x: 1900, y: 100 },
        data: {
          label: 'Service Timeline',
          template: 'timeline_planning',
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
      { id: 'e7-8', source: '7', target: '8' },
      { id: 'e8-9', source: '8', target: '9' },
      { id: 'e9-10', source: '9', target: '10' },
    ],
  },

  // DJ/Band Booking Flow
  {
    id: 'dj-band-booking-flow',
    name: 'DJ/Band Booking Flow',
    category: 'dj',
    description: 'Music entertainment booking and coordination journey',
    tier: 'starter',
    estimatedDuration: '3-6 months',
    tags: ['music', 'playlist', 'timeline', 'setup'],
    popularity: 85,
    features: [
      'Music preferences collection',
      'Do-not-play list',
      'Timeline coordination',
      'Equipment requirements',
    ],
    variables: [
      {
        key: 'dj_name',
        label: 'DJ/Band Name',
        type: 'text',
        required: true,
      },
      {
        key: 'booking_deposit',
        label: 'Booking Deposit',
        type: 'number',
        required: true,
      },
      {
        key: 'playlist_deadline',
        label: 'Playlist Deadline (weeks before)',
        type: 'number',
        defaultValue: '2',
      },
    ],
    successMetrics: [
      {
        name: 'Playlist Completion',
        target: 100,
        unit: '%',
      },
      {
        name: 'Setup Efficiency',
        target: 30,
        unit: 'minutes',
      },
    ],
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Booking Request',
          trigger_type: 'form_submission',
        },
      },
      {
        id: '2',
        type: 'email',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Service Options',
          template: 'welcome_vendor_onboarding',
        },
      },
      {
        id: '3',
        type: 'form',
        position: { x: 500, y: 100 },
        data: {
          label: 'Music Preferences Form',
          form_type: 'music_preferences',
        },
      },
      {
        id: '4',
        type: 'email',
        position: { x: 700, y: 100 },
        data: {
          label: 'Send Contract',
          template: 'contract_reminder',
        },
      },
      {
        id: '5',
        type: 'email',
        position: { x: 900, y: 100 },
        data: {
          label: 'Request Deposit',
          template: 'payment_due',
        },
      },
      {
        id: '6',
        type: 'delay',
        position: { x: 1100, y: 100 },
        data: {
          label: 'Wait 1 Month Before',
          duration: '30 days before event',
        },
      },
      {
        id: '7',
        type: 'form',
        position: { x: 1300, y: 100 },
        data: {
          label: 'Final Playlist & Timeline',
          form_type: 'final_playlist',
        },
      },
      {
        id: '8',
        type: 'sms',
        position: { x: 1500, y: 100 },
        data: {
          label: 'Week Before Check-in',
          template: 'day_before_reminder',
        },
      },
      {
        id: '9',
        type: 'email',
        position: { x: 1700, y: 100 },
        data: {
          label: 'Setup Instructions',
          template: 'timeline_planning',
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
      { id: 'e7-8', source: '7', target: '8' },
      { id: 'e8-9', source: '8', target: '9' },
    ],
  },

  // Florist Consultation Journey
  {
    id: 'florist-consultation-journey',
    name: 'Florist Consultation Journey',
    category: 'florist',
    description: 'Floral design consultation and delivery coordination',
    tier: 'professional',
    estimatedDuration: '2-4 months',
    tags: ['flowers', 'design', 'consultation', 'delivery'],
    popularity: 78,
    features: [
      'Design consultation',
      'Color palette matching',
      'Venue coordination',
      'Delivery scheduling',
    ],
    variables: [
      {
        key: 'florist_name',
        label: 'Florist Business Name',
        type: 'text',
        required: true,
      },
      {
        key: 'consultation_fee',
        label: 'Consultation Fee',
        type: 'number',
        defaultValue: '0',
      },
      {
        key: 'final_order_deadline',
        label: 'Final Order Deadline (weeks)',
        type: 'number',
        defaultValue: '3',
      },
    ],
    successMetrics: [
      {
        name: 'Design Approval',
        target: 95,
        unit: '%',
      },
      {
        name: 'On-time Delivery',
        target: 100,
        unit: '%',
      },
    ],
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Floral Inquiry',
          trigger_type: 'form_submission',
        },
      },
      {
        id: '2',
        type: 'email',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Portfolio',
          template: 'welcome_vendor_onboarding',
        },
      },
      {
        id: '3',
        type: 'form',
        position: { x: 500, y: 100 },
        data: {
          label: 'Style Preferences',
          form_type: 'floral_preferences',
        },
      },
      {
        id: '4',
        type: 'email',
        position: { x: 700, y: 100 },
        data: {
          label: 'Schedule Consultation',
          template: 'timeline_planning',
        },
      },
      {
        id: '5',
        type: 'sms',
        position: { x: 900, y: 100 },
        data: {
          label: 'Consultation Reminder',
          template: 'appointment_reminder',
        },
      },
      {
        id: '6',
        type: 'delay',
        position: { x: 1100, y: 100 },
        data: {
          label: 'Design Creation',
          duration: '3 days',
        },
      },
      {
        id: '7',
        type: 'email',
        position: { x: 1300, y: 100 },
        data: {
          label: 'Send Design Proposal',
          template: 'custom',
        },
      },
      {
        id: '8',
        type: 'form',
        position: { x: 1500, y: 100 },
        data: {
          label: 'Final Order Form',
          form_type: 'floral_order',
        },
      },
      {
        id: '9',
        type: 'email',
        position: { x: 1700, y: 100 },
        data: {
          label: 'Delivery Schedule',
          template: 'event_confirmation',
        },
      },
      {
        id: '10',
        type: 'sms',
        position: { x: 1900, y: 100 },
        data: {
          label: 'Day Before Confirmation',
          template: 'day_before_reminder',
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
      { id: 'e7-8', source: '7', target: '8' },
      { id: 'e8-9', source: '8', target: '9' },
      { id: 'e9-10', source: '9', target: '10' },
    ],
  },
];

// Helper function to get templates by tier
export function getTemplatesByTier(
  tier: string,
  userTier: string,
): JourneyTemplate[] {
  const tierHierarchy = {
    free: 0,
    starter: 1,
    professional: 2,
    scale: 3,
    enterprise: 4,
  };

  const userTierLevel =
    tierHierarchy[userTier.toLowerCase() as keyof typeof tierHierarchy] || 0;

  return JOURNEY_TEMPLATES.filter((template) => {
    const templateTierLevel = tierHierarchy[template.tier] || 0;
    return templateTierLevel <= userTierLevel;
  });
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: string): JourneyTemplate[] {
  return JOURNEY_TEMPLATES.filter((template) => template.category === category);
}

// Helper function to search templates
export function searchTemplates(searchTerm: string): JourneyTemplate[] {
  const term = searchTerm.toLowerCase();
  return JOURNEY_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.tags.some((tag) => tag.toLowerCase().includes(term)),
  );
}

// Helper function to get most popular templates
export function getPopularTemplates(limit: number = 5): JourneyTemplate[] {
  return [...JOURNEY_TEMPLATES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}
