'use client';

import React from 'react';
import {
  Heart,
  Calendar,
  MapPin,
  Clock,
  Users,
  CreditCard,
  Camera,
  Music,
  Utensils,
  Flower2,
  Mail,
  Phone,
  Gift,
  Car,
  Star,
  CheckCircle,
  AlertCircle,
  Info,
  ImageIcon,
  FileText,
  Link2,
  Download,
  Share2,
} from 'lucide-react';

// Wedding-specific component templates
export interface WeddingComponent {
  id: string;
  type: string;
  name: string;
  category:
    | 'ceremony'
    | 'reception'
    | 'vendors'
    | 'communication'
    | 'logistics'
    | 'payments';
  icon: React.ComponentType<any>;
  description: string;
  previewImage?: string;
  defaultContent: any;
  customizableFields: string[];
  weddingThemes: string[];
  complexity: number; // 1-5 scale
  estimatedSetupTime: number; // minutes
}

export const WEDDING_COMPONENT_LIBRARY: WeddingComponent[] = [
  // CEREMONY COMPONENTS
  {
    id: 'rsvp-ceremony',
    type: 'rsvp',
    name: 'Ceremony RSVP',
    category: 'ceremony',
    icon: Heart,
    description:
      'Elegant RSVP form for ceremony attendance with plus-one options',
    defaultContent: {
      title: 'Please join us on our special day',
      subtitle: 'Kindly respond by {{rsvp_deadline}}',
      fields: [
        {
          name: 'attending',
          type: 'radio',
          label: 'Will you be attending?',
          required: true,
          options: ['Yes, with pleasure!', 'Regretfully, I cannot attend'],
        },
        {
          name: 'guest_count',
          type: 'select',
          label: 'Number of guests',
          required: true,
          options: ['1', '2'],
          conditional: 'attending_yes',
        },
        {
          name: 'guest_names',
          type: 'text',
          label: 'Guest names',
          required: false,
          conditional: 'guest_count_2',
        },
        {
          name: 'dietary_requirements',
          type: 'textarea',
          label: 'Dietary requirements or allergies',
          required: false,
        },
        {
          name: 'song_request',
          type: 'text',
          label: 'Song request for our celebration',
          required: false,
        },
      ],
      styling: {
        backgroundColor: '#fdf2f8',
        accentColor: '#ec4899',
        fontFamily: 'serif',
        flowerBorder: true,
      },
    },
    customizableFields: [
      'title',
      'subtitle',
      'rsvp_deadline',
      'fields',
      'styling',
    ],
    weddingThemes: ['romantic', 'classic', 'garden', 'elegant'],
    complexity: 3,
    estimatedSetupTime: 15,
  },
  {
    id: 'wedding-timeline',
    type: 'timeline',
    name: 'Wedding Day Timeline',
    category: 'ceremony',
    icon: Calendar,
    description: 'Beautiful timeline showing ceremony and reception schedule',
    defaultContent: {
      title: '{{wedding_date}} - Order of Events',
      events: [
        {
          time: '2:00 PM',
          event: 'Guest arrival & seating',
          icon: 'users',
          location: '{{ceremony_venue}}',
        },
        {
          time: '2:30 PM',
          event: 'Ceremony begins',
          icon: 'heart',
          location: '{{ceremony_venue}}',
        },
        {
          time: '3:00 PM',
          event: 'Cocktail hour & photos',
          icon: 'camera',
          location: '{{cocktail_location}}',
        },
        {
          time: '6:00 PM',
          event: 'Reception & dinner',
          icon: 'utensils',
          location: '{{reception_venue}}',
        },
        {
          time: '8:00 PM',
          event: 'First dance',
          icon: 'music',
          location: '{{reception_venue}}',
        },
        {
          time: '9:00 PM',
          event: 'Dancing & celebration',
          icon: 'music',
          location: '{{reception_venue}}',
        },
        {
          time: '11:00 PM',
          event: 'Last dance & farewell',
          icon: 'heart',
          location: '{{reception_venue}}',
        },
      ],
      styling: {
        backgroundColor: '#f0fdf4',
        accentColor: '#22c55e',
        timelineStyle: 'elegant',
        showIcons: true,
        showLocations: true,
      },
    },
    customizableFields: [
      'title',
      'events',
      'wedding_date',
      'venues',
      'styling',
    ],
    weddingThemes: ['modern', 'classic', 'rustic', 'garden'],
    complexity: 4,
    estimatedSetupTime: 25,
  },
  {
    id: 'ceremony-details',
    type: 'info-card',
    name: 'Ceremony Details',
    category: 'ceremony',
    icon: MapPin,
    description: 'Essential ceremony information with location and timing',
    defaultContent: {
      title: 'Ceremony Details',
      venue: {
        name: '{{ceremony_venue_name}}',
        address: '{{ceremony_venue_address}}',
        coordinates: '{{ceremony_coordinates}}',
        parkingInfo: 'Parking available on-site',
        accessibility: 'Wheelchair accessible',
      },
      timing: {
        date: '{{wedding_date}}',
        time: '{{ceremony_time}}',
        duration: '30 minutes',
        arrivalTime: '15 minutes before start',
      },
      dresscode: {
        theme: '{{dress_code}}',
        details: 'We kindly request no white or ivory attire',
        weatherNote: 'Ceremony will be outdoors, weather permitting',
      },
      contact: {
        name: '{{contact_name}}',
        phone: '{{contact_phone}}',
        email: '{{contact_email}}',
      },
    },
    customizableFields: ['venue', 'timing', 'dresscode', 'contact'],
    weddingThemes: ['all'],
    complexity: 2,
    estimatedSetupTime: 10,
  },

  // VENDOR COMPONENTS
  {
    id: 'vendor-directory',
    type: 'vendor-list',
    name: 'Wedding Vendor Directory',
    category: 'vendors',
    icon: FileText,
    description: 'Complete list of wedding vendors with contact information',
    defaultContent: {
      title: 'Our Wedding Team',
      subtitle: 'The amazing professionals helping make our day perfect',
      vendors: [
        {
          category: 'Photography',
          name: '{{photographer_name}}',
          contact: '{{photographer_phone}}',
          email: '{{photographer_email}}',
          website: '{{photographer_website}}',
          notes: 'Available for questions about timeline and group photos',
        },
        {
          category: 'Venue Coordinator',
          name: '{{venue_coordinator_name}}',
          contact: '{{venue_coordinator_phone}}',
          email: '{{venue_coordinator_email}}',
          notes: 'Contact for venue access and setup questions',
        },
        {
          category: 'Catering',
          name: '{{caterer_name}}',
          contact: '{{caterer_phone}}',
          email: '{{caterer_email}}',
          notes: 'Contact for dietary requirements and menu questions',
        },
        {
          category: 'Music/DJ',
          name: '{{dj_name}}',
          contact: '{{dj_phone}}',
          email: '{{dj_email}}',
          notes: 'Send song requests and special announcements',
        },
        {
          category: 'Florist',
          name: '{{florist_name}}',
          contact: '{{florist_phone}}',
          email: '{{florist_email}}',
          notes: 'Handling all ceremony and reception flowers',
        },
      ],
      styling: {
        layout: 'cards',
        showContactButtons: true,
        groupByCategory: true,
      },
    },
    customizableFields: ['vendors', 'styling', 'title', 'subtitle'],
    weddingThemes: ['all'],
    complexity: 3,
    estimatedSetupTime: 20,
  },
  {
    id: 'vendor-contact-card',
    type: 'contact-card',
    name: 'Individual Vendor Card',
    category: 'vendors',
    icon: Phone,
    description: 'Single vendor contact card with emergency contact options',
    defaultContent: {
      vendor: {
        name: '{{vendor_name}}',
        business: '{{vendor_business}}',
        category: '{{vendor_category}}',
        role: '{{vendor_role}}',
      },
      contact: {
        phone: '{{vendor_phone}}',
        email: '{{vendor_email}}',
        website: '{{vendor_website}}',
        emergencyPhone: '{{vendor_emergency}}',
      },
      availability: {
        hours: '{{vendor_hours}}',
        responseTime: '{{vendor_response_time}}',
        preferredContact: 'phone',
      },
      notes: '{{vendor_notes}}',
      styling: {
        showQRCode: true,
        showEmergencyContact: true,
        theme: 'professional',
      },
    },
    customizableFields: [
      'vendor',
      'contact',
      'availability',
      'notes',
      'styling',
    ],
    weddingThemes: ['all'],
    complexity: 2,
    estimatedSetupTime: 8,
  },

  // PAYMENT COMPONENTS
  {
    id: 'payment-schedule',
    type: 'payment-timeline',
    name: 'Payment Schedule',
    category: 'payments',
    icon: CreditCard,
    description: 'Clear payment timeline with amounts and due dates',
    defaultContent: {
      title: 'Wedding Payment Schedule',
      subtitle: 'Keep track of all payments and due dates',
      payments: [
        {
          description: 'Venue deposit',
          amount: '£{{venue_deposit}}',
          dueDate: '{{venue_deposit_date}}',
          status: 'paid',
          vendor: 'Venue',
          paymentMethod: 'Bank Transfer',
        },
        {
          description: 'Photography deposit',
          amount: '£{{photo_deposit}}',
          dueDate: '{{photo_deposit_date}}',
          status: 'pending',
          vendor: 'Photography',
          paymentMethod: 'Card Payment',
        },
        {
          description: 'Catering final payment',
          amount: '£{{catering_final}}',
          dueDate: '{{catering_final_date}}',
          status: 'upcoming',
          vendor: 'Catering',
          paymentMethod: 'Bank Transfer',
        },
      ],
      totalBudget: '£{{total_budget}}',
      paidAmount: '£{{paid_amount}}',
      remainingAmount: '£{{remaining_amount}}',
      styling: {
        showProgressBar: true,
        highlightOverdue: true,
        groupByVendor: false,
      },
    },
    customizableFields: ['payments', 'totalBudget', 'styling'],
    weddingThemes: ['all'],
    complexity: 4,
    estimatedSetupTime: 30,
  },
  {
    id: 'payment-reminder',
    type: 'payment-alert',
    name: 'Payment Reminder',
    category: 'payments',
    icon: AlertCircle,
    description: 'Urgent payment reminder with payment options',
    defaultContent: {
      title: 'Payment Reminder',
      urgencyLevel: 'high', // low, medium, high, critical
      payment: {
        description: '{{payment_description}}',
        amount: '£{{payment_amount}}',
        dueDate: '{{payment_due_date}}',
        vendor: '{{payment_vendor}}',
        daysUntilDue: '{{days_until_due}}',
      },
      paymentOptions: [
        {
          method: 'Bank Transfer',
          details: '{{bank_transfer_details}}',
          processingTime: '1-2 business days',
        },
        {
          method: 'Card Payment',
          details: 'Secure online payment',
          processingTime: 'Instant',
        },
      ],
      latePolicy: '{{late_payment_policy}}',
      contactInfo: {
        name: '{{vendor_contact_name}}',
        phone: '{{vendor_contact_phone}}',
        email: '{{vendor_contact_email}}',
      },
    },
    customizableFields: [
      'payment',
      'paymentOptions',
      'latePolicy',
      'contactInfo',
    ],
    weddingThemes: ['all'],
    complexity: 3,
    estimatedSetupTime: 15,
  },

  // COMMUNICATION COMPONENTS
  {
    id: 'save-the-date',
    type: 'announcement',
    name: 'Save the Date',
    category: 'communication',
    icon: Heart,
    description: 'Elegant save the date announcement with key details',
    defaultContent: {
      announcement: {
        type: 'save-the-date',
        coupleNames: '{{bride_name}} & {{groom_name}}',
        weddingDate: '{{wedding_date}}',
        location: '{{wedding_location}}',
        tagline: 'Save the date for our special day!',
      },
      design: {
        style: 'elegant',
        colorScheme: 'romantic',
        includePhoto: true,
        photoUrl: '{{couple_photo}}',
      },
      additionalInfo: {
        website: '{{wedding_website}}',
        invitationFollows: true,
        invitationDate: '{{invitation_send_date}}',
        accommodationInfo: '{{accommodation_info}}',
      },
    },
    customizableFields: ['announcement', 'design', 'additionalInfo'],
    weddingThemes: ['romantic', 'elegant', 'classic', 'modern'],
    complexity: 2,
    estimatedSetupTime: 12,
  },
  {
    id: 'thank-you-message',
    type: 'gratitude',
    name: 'Thank You Message',
    category: 'communication',
    icon: Gift,
    description: 'Heartfelt thank you message for guests and vendors',
    defaultContent: {
      message: {
        title: 'Thank You',
        personalMessage: '{{personal_thank_you_message}}',
        coupleNames: '{{bride_name}} & {{groom_name}}',
        weddingDate: '{{wedding_date}}',
      },
      specifics: {
        guestThanks:
          'Thank you for celebrating with us and making our day so special',
        giftThanks: 'Your thoughtful gifts and presence mean the world to us',
        vendorThanks:
          'To our amazing wedding team - thank you for your professionalism and care',
      },
      media: {
        includePhoto: true,
        photoCaption: 'A moment from our perfect day',
        photoUrl: '{{wedding_highlight_photo}}',
      },
      contact: {
        showContact: true,
        futureUpdates: "We'll be sharing more photos soon!",
        socialMedia: '{{social_media_handles}}',
      },
    },
    customizableFields: ['message', 'specifics', 'media', 'contact'],
    weddingThemes: ['all'],
    complexity: 2,
    estimatedSetupTime: 10,
  },

  // LOGISTICS COMPONENTS
  {
    id: 'accommodation-guide',
    type: 'info-guide',
    name: 'Guest Accommodation',
    category: 'logistics',
    icon: MapPin,
    description: 'Complete guide to hotels and accommodation options',
    defaultContent: {
      title: 'Where to Stay',
      subtitle: 'Recommended accommodation for our wedding guests',
      hotels: [
        {
          name: '{{hotel_1_name}}',
          category: 'Luxury',
          distance: '{{hotel_1_distance}} from venue',
          rate: '£{{hotel_1_rate}} per night',
          amenities: ['Free WiFi', 'Breakfast included', 'Parking available'],
          booking: {
            phone: '{{hotel_1_phone}}',
            website: '{{hotel_1_website}}',
            groupCode: '{{wedding_group_code}}',
            deadline: '{{booking_deadline}}',
          },
          notes: '{{hotel_1_notes}}',
        },
        {
          name: '{{hotel_2_name}}',
          category: 'Mid-range',
          distance: '{{hotel_2_distance}} from venue',
          rate: '£{{hotel_2_rate}} per night',
          amenities: ['Free WiFi', 'Fitness center', 'Restaurant'],
          booking: {
            phone: '{{hotel_2_phone}}',
            website: '{{hotel_2_website}}',
            groupCode: '{{wedding_group_code}}',
            deadline: '{{booking_deadline}}',
          },
          notes: '{{hotel_2_notes}}',
        },
      ],
      transportation: {
        shuttleService: '{{shuttle_service_info}}',
        parkingInfo: '{{parking_information}}',
        publicTransport: '{{public_transport_info}}',
      },
      localArea: {
        restaurants: '{{local_restaurants}}',
        attractions: '{{local_attractions}}',
        emergencyContacts: '{{local_emergency_contacts}}',
      },
    },
    customizableFields: ['hotels', 'transportation', 'localArea'],
    weddingThemes: ['all'],
    complexity: 4,
    estimatedSetupTime: 35,
  },
  {
    id: 'transportation-info',
    type: 'transport-guide',
    name: 'Transportation Guide',
    category: 'logistics',
    icon: Car,
    description: 'Detailed transportation and parking information',
    defaultContent: {
      title: 'Getting to Our Wedding',
      subtitle: 'Transportation and parking information',
      venue: {
        name: '{{venue_name}}',
        address: '{{venue_address}}',
        coordinates: '{{venue_coordinates}}',
        landmark: '{{venue_landmark}}',
      },
      drivingDirections: {
        fromNorth: '{{directions_from_north}}',
        fromSouth: '{{directions_from_south}}',
        fromEast: '{{directions_from_east}}',
        fromWest: '{{directions_from_west}}',
      },
      parking: {
        onSite: {
          available: true,
          spaces: '{{parking_spaces}}',
          cost: '{{parking_cost}}',
          notes: '{{parking_notes}}',
        },
        nearby: [
          {
            name: '{{nearby_parking_1}}',
            distance: '{{parking_1_distance}}',
            cost: '{{parking_1_cost}}',
          },
        ],
      },
      publicTransport: {
        train: '{{train_information}}',
        bus: '{{bus_information}}',
        taxi: '{{taxi_information}}',
      },
      shuttleService: {
        available: '{{shuttle_available}}',
        schedule: '{{shuttle_schedule}}',
        pickupLocations: '{{shuttle_pickup_locations}}',
        contact: '{{shuttle_contact}}',
      },
    },
    customizableFields: [
      'venue',
      'drivingDirections',
      'parking',
      'publicTransport',
      'shuttleService',
    ],
    weddingThemes: ['all'],
    complexity: 3,
    estimatedSetupTime: 25,
  },

  // RECEPTION COMPONENTS
  {
    id: 'reception-timeline',
    type: 'event-schedule',
    name: 'Reception Schedule',
    category: 'reception',
    icon: Music,
    description: 'Detailed reception timeline with entertainment schedule',
    defaultContent: {
      title: 'Reception Schedule',
      subtitle: '{{wedding_date}} - {{reception_venue}}',
      events: [
        {
          time: '6:00 PM',
          duration: '60 min',
          event: 'Cocktail hour',
          description: 'Drinks and canapés while we take photos',
          location: '{{cocktail_area}}',
          dressCode: 'Mingling attire',
        },
        {
          time: '7:00 PM',
          duration: '90 min',
          event: 'Dinner service',
          description: '3-course meal with wine pairing',
          location: '{{dining_area}}',
          specialNotes: 'Dietary requirements catered for',
        },
        {
          time: '8:30 PM',
          duration: '15 min',
          event: 'Speeches',
          description: 'Heartfelt words from family and friends',
          location: '{{dining_area}}',
          participants: ['Father of the bride', 'Best man', 'Maid of honor'],
        },
        {
          time: '9:00 PM',
          duration: '10 min',
          event: 'First dance',
          description: '{{first_dance_song}} - {{first_dance_artist}}',
          location: '{{dance_floor}}',
          specialNotes: 'Please form a circle around the couple',
        },
        {
          time: '9:15 PM',
          duration: '135 min',
          event: 'Dancing & celebration',
          description: 'Open bar and dance floor',
          location: '{{dance_floor}}',
          entertainment: '{{dj_name}} with special playlist',
        },
        {
          time: '11:30 PM',
          duration: '15 min',
          event: 'Last dance & farewell',
          description: 'Final song and goodbye',
          location: '{{dance_floor}}',
          specialNotes: 'Sparkler send-off for the couple',
        },
      ],
      specialActivities: [
        {
          activity: 'Guest book signing',
          timing: 'Throughout evening',
          location: '{{guestbook_location}}',
        },
        {
          activity: 'Photo booth',
          timing: '7:30 PM - 11:00 PM',
          location: '{{photobooth_location}}',
        },
      ],
    },
    customizableFields: [
      'events',
      'specialActivities',
      'venue',
      'entertainment',
    ],
    weddingThemes: ['all'],
    complexity: 4,
    estimatedSetupTime: 30,
  },
  {
    id: 'menu-display',
    type: 'menu-card',
    name: 'Wedding Menu',
    category: 'reception',
    icon: Utensils,
    description: 'Elegant menu display with dietary information',
    defaultContent: {
      title: 'Wedding Breakfast Menu',
      subtitle: '{{wedding_date}}',
      courses: [
        {
          course: 'Starter',
          options: [
            {
              name: '{{starter_1_name}}',
              description: '{{starter_1_description}}',
              dietary: ['V', 'GF available'],
              allergens: ['Contains nuts'],
            },
            {
              name: '{{starter_2_name}}',
              description: '{{starter_2_description}}',
              dietary: ['VG', 'GF'],
              allergens: [],
            },
          ],
        },
        {
          course: 'Main Course',
          options: [
            {
              name: '{{main_1_name}}',
              description: '{{main_1_description}}',
              dietary: [],
              allergens: ['Contains dairy'],
            },
            {
              name: '{{main_2_name}}',
              description: '{{main_2_description}}',
              dietary: ['V'],
              allergens: [],
            },
            {
              name: '{{main_3_name}}',
              description: '{{main_3_description}}',
              dietary: ['VG', 'GF'],
              allergens: [],
            },
          ],
        },
        {
          course: 'Dessert',
          options: [
            {
              name: '{{dessert_1_name}}',
              description: '{{dessert_1_description}}',
              dietary: ['V'],
              allergens: ['Contains gluten', 'Contains eggs'],
            },
          ],
        },
      ],
      beverages: {
        wine: '{{wine_selection}}',
        softDrinks: '{{soft_drink_selection}}',
        coffee: '{{coffee_service}}',
      },
      dietaryNotes: {
        V: 'Vegetarian',
        VG: 'Vegan',
        GF: 'Gluten Free',
        DF: 'Dairy Free',
      },
      chefNotes: '{{chef_special_notes}}',
      cateringBy: '{{caterer_name}}',
    },
    customizableFields: ['courses', 'beverages', 'dietaryNotes', 'chefNotes'],
    weddingThemes: ['elegant', 'classic', 'rustic', 'modern'],
    complexity: 3,
    estimatedSetupTime: 20,
  },
];

// Component categories for organization
export const COMPONENT_CATEGORIES = [
  {
    id: 'ceremony',
    name: 'Ceremony',
    description: 'Components for ceremony planning and communication',
    icon: Heart,
    color: '#ec4899',
  },
  {
    id: 'reception',
    name: 'Reception',
    description: 'Reception schedule, menu, and entertainment components',
    icon: Music,
    color: '#8b5cf6',
  },
  {
    id: 'vendors',
    name: 'Vendors',
    description: 'Vendor contact information and directory components',
    icon: FileText,
    color: '#06b6d4',
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Announcements, invitations, and thank you messages',
    icon: Mail,
    color: '#10b981',
  },
  {
    id: 'logistics',
    name: 'Logistics',
    description: 'Transportation, accommodation, and planning details',
    icon: MapPin,
    color: '#f59e0b',
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Payment schedules, reminders, and budget tracking',
    icon: CreditCard,
    color: '#ef4444',
  },
] as const;

// Wedding themes for styling
export const WEDDING_THEMES = [
  {
    id: 'romantic',
    name: 'Romantic',
    description: 'Soft colors, elegant fonts, floral elements',
    colors: {
      primary: '#ec4899',
      secondary: '#fce7f3',
      accent: '#be185d',
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional, timeless design with serif fonts',
    colors: {
      primary: '#374151',
      secondary: '#f9fafb',
      accent: '#6b7280',
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, minimal design, sans-serif fonts',
    colors: {
      primary: '#1f2937',
      secondary: '#f3f4f6',
      accent: '#3b82f6',
    },
  },
  {
    id: 'rustic',
    name: 'Rustic',
    description: 'Earthy tones, natural textures, handwritten fonts',
    colors: {
      primary: '#92400e',
      secondary: '#fef3c7',
      accent: '#d97706',
    },
  },
  {
    id: 'garden',
    name: 'Garden',
    description: 'Nature-inspired, green tones, botanical elements',
    colors: {
      primary: '#166534',
      secondary: '#f0fdf4',
      accent: '#22c55e',
    },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Sophisticated, muted colors, premium typography',
    colors: {
      primary: '#581c87',
      secondary: '#faf5ff',
      accent: '#8b5cf6',
    },
  },
] as const;

// Helper functions
export function getComponentsByCategory(category: string): WeddingComponent[] {
  return WEDDING_COMPONENT_LIBRARY.filter(
    (component) => component.category === category,
  );
}

export function getComponentById(id: string): WeddingComponent | undefined {
  return WEDDING_COMPONENT_LIBRARY.find((component) => component.id === id);
}

export function getComponentsByTheme(theme: string): WeddingComponent[] {
  return WEDDING_COMPONENT_LIBRARY.filter(
    (component) =>
      component.weddingThemes.includes(theme) ||
      component.weddingThemes.includes('all'),
  );
}

export function getComponentsByComplexity(
  maxComplexity: number,
): WeddingComponent[] {
  return WEDDING_COMPONENT_LIBRARY.filter(
    (component) => component.complexity <= maxComplexity,
  );
}

export function getTotalSetupTime(componentIds: string[]): number {
  return componentIds.reduce((total, id) => {
    const component = getComponentById(id);
    return total + (component?.estimatedSetupTime || 0);
  }, 0);
}

// Template validation helpers
export function validateTemplate(components: WeddingComponent[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (components.length === 0) {
    errors.push('Template must contain at least one component');
  }

  const totalSetupTime = getTotalSetupTime(components.map((c) => c.id));
  if (totalSetupTime > 120) {
    warnings.push(
      `Template setup time is ${totalSetupTime} minutes. Consider simplifying for better adoption.`,
    );
  }

  const complexComponents = components.filter((c) => c.complexity > 3);
  if (complexComponents.length > 2) {
    warnings.push(
      'Template contains many complex components. This may discourage beginner users.',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
