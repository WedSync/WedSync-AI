// WS-198 Team E QA & Documentation - Test Wedding Data Generator
// Generates realistic wedding data for comprehensive error testing scenarios

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

interface TestWeddingData {
  wedding: TestWedding;
  couples: TestCouple[];
  vendors: TestVendor[];
  guests: TestGuest[];
  timeline: TestTimelineEvent[];
  payments: TestPayment[];
  communications: TestCommunication[];
}

interface TestWedding {
  id: string;
  name: string;
  date: string;
  venue: string;
  guestCount: number;
  budget: number;
  phase:
    | 'planning'
    | 'booking'
    | 'final_preparations'
    | 'wedding_day'
    | 'post_wedding';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  location: {
    city: string;
    state: string;
    country: string;
    timezone: string;
  };
  preferences: {
    style: string;
    season: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    formality: 'casual' | 'semi_formal' | 'formal' | 'black_tie';
  };
}

interface TestCouple {
  id: string;
  weddingId: string;
  role: 'partner_1' | 'partner_2';
  name: string;
  email: string;
  phone: string;
  preferences: {
    communicationMethod: 'email' | 'sms' | 'phone' | 'app';
    notificationFrequency: 'immediate' | 'daily' | 'weekly';
    language: string;
  };
}

interface TestVendor {
  id: string;
  weddingId: string;
  type:
    | 'venue'
    | 'photographer'
    | 'caterer'
    | 'florist'
    | 'dj'
    | 'band'
    | 'videographer'
    | 'planner';
  name: string;
  businessName: string;
  email: string;
  phone: string;
  status: 'inquired' | 'quoted' | 'booked' | 'confirmed' | 'completed';
  contractValue: number;
  paymentSchedule: {
    deposit: number;
    interimPayments: Array<{ amount: number; dueDate: string }>;
    finalPayment: number;
    finalDueDate: string;
  };
  integrations: {
    apiEndpoint?: string;
    webhookUrl?: string;
    authMethod?: 'api_key' | 'oauth' | 'basic_auth';
    lastSyncAt?: string;
    syncStatus: 'healthy' | 'failing' | 'disabled';
  };
}

interface TestGuest {
  id: string;
  weddingId: string;
  name: string;
  email?: string;
  phone?: string;
  rsvpStatus: 'pending' | 'attending' | 'not_attending' | 'maybe';
  dietaryRestrictions: string[];
  plusOne: boolean;
  seatingAssignment?: string;
  specialRequirements?: string;
}

interface TestTimelineEvent {
  id: string;
  weddingId: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  vendorIds: string[];
  location: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed';
}

interface TestPayment {
  id: string;
  weddingId: string;
  vendorId: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'credit_card' | 'bank_transfer' | 'check' | 'cash' | 'paypal';
  processorData: {
    transactionId?: string;
    processorName: string;
    processorStatus?: string;
    failureReason?: string;
    retriesAttempted?: number;
  };
}

interface TestCommunication {
  id: string;
  weddingId: string;
  recipientType: 'couple' | 'vendor' | 'guest' | 'coordinator';
  recipientIds: string[];
  type: 'email' | 'sms' | 'push_notification' | 'in_app';
  subject: string;
  content: string;
  status: 'draft' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  errorDetails?: {
    code: string;
    message: string;
    retryCount: number;
  };
}

interface WeddingErrorTestContext {
  userType: 'couple' | 'supplier' | 'coordinator' | 'admin';
  weddingPhase:
    | 'planning'
    | 'booking'
    | 'final_preparations'
    | 'wedding_day'
    | 'post_wedding';
  weddingDate: string;
  vendorType?: string;
  guestCount?: number;
  revenueImpact?: number;
  criticalPath: boolean;
  locationQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  connectionType?: 'fiber' | '4g' | '3g' | '2g' | 'offline';
}

export class TestWeddingDataGenerator {
  private supabase: any;
  private generatedData: Map<string, TestWeddingData> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async generate(context: WeddingErrorTestContext): Promise<TestWeddingData> {
    const cacheKey = this.generateCacheKey(context);

    // Return cached data if available
    if (this.generatedData.has(cacheKey)) {
      return this.generatedData.get(cacheKey)!;
    }

    const weddingData = await this.generateWeddingData(context);
    this.generatedData.set(cacheKey, weddingData);

    return weddingData;
  }

  private async generateWeddingData(
    context: WeddingErrorTestContext,
  ): Promise<TestWeddingData> {
    const wedding = this.generateWedding(context);
    const couples = this.generateCouples(wedding, context);
    const vendors = this.generateVendors(wedding, context);
    const guests = this.generateGuests(wedding, context);
    const timeline = this.generateTimeline(wedding, vendors, context);
    const payments = this.generatePayments(wedding, vendors, context);
    const communications = this.generateCommunications(
      wedding,
      couples,
      vendors,
      guests,
      context,
    );

    return {
      wedding,
      couples,
      vendors,
      guests,
      timeline,
      payments,
      communications,
    };
  }

  private generateWedding(context: WeddingErrorTestContext): TestWedding {
    const weddingDate = new Date(context.weddingDate);
    const today = new Date();

    // Calculate urgency based on wedding date proximity
    const daysUntil = Math.ceil(
      (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    let urgency: 'low' | 'medium' | 'high' | 'critical';

    if (daysUntil <= 0) urgency = 'critical';
    else if (daysUntil <= 1) urgency = 'critical';
    else if (daysUntil <= 7) urgency = 'high';
    else if (daysUntil <= 30) urgency = 'medium';
    else urgency = 'low';

    return {
      id: faker.string.uuid(),
      name: `${faker.person.firstName()} & ${faker.person.firstName()} Wedding`,
      date: context.weddingDate,
      venue: faker.company.name() + ' Venue',
      guestCount: context.guestCount || faker.number.int({ min: 50, max: 300 }),
      budget:
        context.revenueImpact || faker.number.int({ min: 15000, max: 100000 }),
      phase: context.weddingPhase,
      urgency,
      location: {
        city: faker.location.city(),
        state: faker.location.state(),
        country: 'United States',
        timezone: faker.location.timeZone(),
      },
      preferences: {
        style: faker.helpers.arrayElement([
          'rustic',
          'modern',
          'classic',
          'bohemian',
          'vintage',
        ]),
        season: this.getSeasonFromDate(weddingDate),
        timeOfDay: faker.helpers.arrayElement([
          'morning',
          'afternoon',
          'evening',
          'night',
        ]),
        formality: faker.helpers.arrayElement([
          'casual',
          'semi_formal',
          'formal',
          'black_tie',
        ]),
      },
    };
  }

  private generateCouples(
    wedding: TestWedding,
    context: WeddingErrorTestContext,
  ): TestCouple[] {
    const couples: TestCouple[] = [];

    for (let i = 0; i < 2; i++) {
      couples.push({
        id: faker.string.uuid(),
        weddingId: wedding.id,
        role: i === 0 ? 'partner_1' : 'partner_2',
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        preferences: {
          communicationMethod: faker.helpers.arrayElement([
            'email',
            'sms',
            'phone',
            'app',
          ]),
          notificationFrequency: faker.helpers.arrayElement([
            'immediate',
            'daily',
            'weekly',
          ]),
          language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'it']),
        },
      });
    }

    return couples;
  }

  private generateVendors(
    wedding: TestWedding,
    context: WeddingErrorTestContext,
  ): TestVendor[] {
    const vendorTypes: Array<typeof context.vendorType> = [
      'venue',
      'photographer',
      'caterer',
      'florist',
      'dj',
      'band',
      'videographer',
      'planner',
    ];

    const vendors: TestVendor[] = [];

    vendorTypes.forEach((type) => {
      if (type && (context.vendorType === type || !context.vendorType)) {
        const contractValue = this.getVendorContractValue(type, wedding.budget);

        vendors.push({
          id: faker.string.uuid(),
          weddingId: wedding.id,
          type: type as any,
          name: faker.person.fullName(),
          businessName:
            faker.company.name() +
            ` ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          email: faker.internet.email(),
          phone: faker.phone.number(),
          status: faker.helpers.arrayElement([
            'inquired',
            'quoted',
            'booked',
            'confirmed',
            'completed',
          ]),
          contractValue,
          paymentSchedule: this.generatePaymentSchedule(
            contractValue,
            wedding.date,
          ),
          integrations: {
            apiEndpoint: faker.internet.url(),
            webhookUrl: faker.internet.url(),
            authMethod: faker.helpers.arrayElement([
              'api_key',
              'oauth',
              'basic_auth',
            ]),
            lastSyncAt: faker.date.recent().toISOString(),
            syncStatus: faker.helpers.arrayElement([
              'healthy',
              'failing',
              'disabled',
            ]),
          },
        });
      }
    });

    return vendors;
  }

  private generateGuests(
    wedding: TestWedding,
    context: WeddingErrorTestContext,
  ): TestGuest[] {
    const guests: TestGuest[] = [];
    const guestCount = context.guestCount || wedding.guestCount;

    for (let i = 0; i < guestCount; i++) {
      guests.push({
        id: faker.string.uuid(),
        weddingId: wedding.id,
        name: faker.person.fullName(),
        email: faker.helpers.maybe(() => faker.internet.email(), {
          probability: 0.8,
        }),
        phone: faker.helpers.maybe(() => faker.phone.number(), {
          probability: 0.6,
        }),
        rsvpStatus: faker.helpers.arrayElement([
          'pending',
          'attending',
          'not_attending',
          'maybe',
        ]),
        dietaryRestrictions: faker.helpers.arrayElements(
          ['vegetarian', 'vegan', 'gluten-free', 'nut-allergy', 'dairy-free'],
          { min: 0, max: 2 },
        ),
        plusOne: faker.datatype.boolean(),
        seatingAssignment: faker.helpers.maybe(
          () => `Table ${faker.number.int({ min: 1, max: 20 })}`,
          { probability: 0.7 },
        ),
        specialRequirements: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.3,
        }),
      });
    }

    return guests;
  }

  private generateTimeline(
    wedding: TestWedding,
    vendors: TestVendor[],
    context: WeddingErrorTestContext,
  ): TestTimelineEvent[] {
    const events: TestTimelineEvent[] = [];
    const weddingDate = new Date(wedding.date);

    // Generate typical wedding day timeline events
    const timelineEvents = [
      {
        name: 'Hair & Makeup',
        duration: 3,
        priority: 'high' as const,
        vendorTypes: ['planner'],
      },
      {
        name: 'Photography Prep',
        duration: 2,
        priority: 'high' as const,
        vendorTypes: ['photographer'],
      },
      {
        name: 'Ceremony',
        duration: 1,
        priority: 'critical' as const,
        vendorTypes: ['venue', 'photographer', 'videographer'],
      },
      {
        name: 'Cocktail Hour',
        duration: 1.5,
        priority: 'medium' as const,
        vendorTypes: ['venue', 'caterer', 'dj'],
      },
      {
        name: 'Reception',
        duration: 4,
        priority: 'high' as const,
        vendorTypes: ['venue', 'caterer', 'dj', 'band'],
      },
      {
        name: 'Send Off',
        duration: 0.5,
        priority: 'medium' as const,
        vendorTypes: ['photographer', 'videographer'],
      },
    ];

    let currentTime = new Date(weddingDate);
    currentTime.setHours(
      context.weddingPhase === 'wedding_day' ? 9 : 14,
      0,
      0,
      0,
    ); // Start at 9 AM for wedding day, 2 PM otherwise

    timelineEvents.forEach((eventTemplate, index) => {
      const startTime = new Date(currentTime);
      const endTime = new Date(
        currentTime.getTime() + eventTemplate.duration * 60 * 60 * 1000,
      );

      const involvedVendors = vendors.filter((vendor) =>
        eventTemplate.vendorTypes.includes(vendor.type),
      );

      events.push({
        id: faker.string.uuid(),
        weddingId: wedding.id,
        name: eventTemplate.name,
        description: faker.lorem.sentence(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        vendorIds: involvedVendors.map((v) => v.id),
        location: wedding.venue,
        priority: eventTemplate.priority,
        dependencies: index > 0 ? [events[index - 1].id] : [],
        status:
          context.weddingPhase === 'wedding_day'
            ? faker.helpers.arrayElement(['in_progress', 'completed'])
            : faker.helpers.arrayElement(['planned', 'confirmed']),
      });

      currentTime = endTime;
    });

    return events;
  }

  private generatePayments(
    wedding: TestWedding,
    vendors: TestVendor[],
    context: WeddingErrorTestContext,
  ): TestPayment[] {
    const payments: TestPayment[] = [];

    vendors.forEach((vendor) => {
      // Generate payments based on vendor payment schedule
      const schedule = vendor.paymentSchedule;

      // Deposit payment
      payments.push({
        id: faker.string.uuid(),
        weddingId: wedding.id,
        vendorId: vendor.id,
        amount: schedule.deposit,
        currency: 'USD',
        dueDate: faker.date.past().toISOString(),
        status: 'completed',
        paymentMethod: faker.helpers.arrayElement([
          'credit_card',
          'bank_transfer',
          'paypal',
        ]),
        processorData: {
          transactionId: faker.string.uuid(),
          processorName: 'stripe',
          processorStatus: 'succeeded',
        },
      });

      // Interim payments
      schedule.interimPayments.forEach((interim) => {
        payments.push({
          id: faker.string.uuid(),
          weddingId: wedding.id,
          vendorId: vendor.id,
          amount: interim.amount,
          currency: 'USD',
          dueDate: interim.dueDate,
          status: this.getPaymentStatusForDate(interim.dueDate, context),
          paymentMethod: faker.helpers.arrayElement([
            'credit_card',
            'bank_transfer',
            'check',
          ]),
          processorData: {
            processorName: faker.helpers.arrayElement([
              'stripe',
              'paypal',
              'square',
            ]),
            retriesAttempted: context.criticalPath
              ? faker.number.int({ min: 0, max: 3 })
              : 0,
          },
        });
      });

      // Final payment
      payments.push({
        id: faker.string.uuid(),
        weddingId: wedding.id,
        vendorId: vendor.id,
        amount: schedule.finalPayment,
        currency: 'USD',
        dueDate: schedule.finalDueDate,
        status: this.getPaymentStatusForDate(schedule.finalDueDate, context),
        paymentMethod: 'credit_card',
        processorData: {
          processorName: 'stripe',
          retriesAttempted: 0,
        },
      });
    });

    return payments;
  }

  private generateCommunications(
    wedding: TestWedding,
    couples: TestCouple[],
    vendors: TestVendor[],
    guests: TestGuest[],
    context: WeddingErrorTestContext,
  ): TestCommunication[] {
    const communications: TestCommunication[] = [];

    // Generate various communication scenarios
    const communicationScenarios = [
      {
        type: 'email' as const,
        recipientType: 'couple' as const,
        subject: 'Wedding Timeline Update',
        content: 'Your wedding timeline has been updated.',
        priority: 'high',
      },
      {
        type: 'sms' as const,
        recipientType: 'couple' as const,
        subject: 'Payment Reminder',
        content: 'Your final payment is due in 7 days.',
        priority: 'high',
      },
      {
        type: 'email' as const,
        recipientType: 'vendor' as const,
        subject: 'Wedding Day Details',
        content:
          'Please find attached the wedding day timeline and contact information.',
        priority: 'critical',
      },
      {
        type: 'push_notification' as const,
        recipientType: 'guest' as const,
        subject: 'RSVP Reminder',
        content: 'Please confirm your attendance by next Friday.',
        priority: 'medium',
      },
    ];

    communicationScenarios.forEach((scenario) => {
      const recipientIds = this.getRecipientIds(
        scenario.recipientType,
        couples,
        vendors,
        guests,
      );

      communications.push({
        id: faker.string.uuid(),
        weddingId: wedding.id,
        recipientType: scenario.recipientType,
        recipientIds,
        type: scenario.type,
        subject: scenario.subject,
        content: scenario.content,
        status: this.getCommunicationStatus(context, scenario.priority),
        scheduledAt: faker.date.recent().toISOString(),
        sentAt: faker.helpers.maybe(() => faker.date.recent().toISOString(), {
          probability: 0.8,
        }),
        deliveredAt: faker.helpers.maybe(
          () => faker.date.recent().toISOString(),
          { probability: 0.7 },
        ),
        errorDetails: this.getCommunicationErrors(context),
      });
    });

    return communications;
  }

  // Helper methods

  private generateCacheKey(context: WeddingErrorTestContext): string {
    return `${context.userType}-${context.weddingPhase}-${context.weddingDate}-${context.vendorType || 'all'}-${context.guestCount || 'default'}`;
  }

  private getSeasonFromDate(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getVendorContractValue(
    vendorType: string,
    totalBudget: number,
  ): number {
    const percentages: Record<string, number> = {
      venue: 0.45,
      caterer: 0.3,
      photographer: 0.1,
      videographer: 0.08,
      florist: 0.05,
      dj: 0.03,
      band: 0.08,
      planner: 0.12,
    };

    const percentage = percentages[vendorType] || 0.05;
    const baseAmount = totalBudget * percentage;

    // Add some realistic variance
    return faker.number.int({
      min: Math.round(baseAmount * 0.8),
      max: Math.round(baseAmount * 1.2),
    });
  }

  private generatePaymentSchedule(
    contractValue: number,
    weddingDate: string,
  ): TestVendor['paymentSchedule'] {
    const weddingDay = new Date(weddingDate);
    const today = new Date();

    const deposit = Math.round(contractValue * 0.25);
    const finalPayment = Math.round(contractValue * 0.35);
    const interimAmount = contractValue - deposit - finalPayment;

    // Final payment due 7 days before wedding
    const finalDueDate = new Date(
      weddingDay.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    // Interim payment due halfway between now and final payment
    const interimDueDate = new Date(
      today.getTime() + (finalDueDate.getTime() - today.getTime()) / 2,
    );

    return {
      deposit,
      interimPayments:
        interimAmount > 0
          ? [
              {
                amount: interimAmount,
                dueDate: interimDueDate.toISOString(),
              },
            ]
          : [],
      finalPayment,
      finalDueDate: finalDueDate.toISOString(),
    };
  }

  private getPaymentStatusForDate(
    dueDate: string,
    context: WeddingErrorTestContext,
  ): TestPayment['status'] {
    const due = new Date(dueDate);
    const now = new Date();

    if (due > now) {
      return 'pending';
    } else if (
      context.criticalPath &&
      faker.datatype.boolean({ probability: 0.3 })
    ) {
      return faker.helpers.arrayElement(['failed', 'processing']);
    } else {
      return faker.helpers.arrayElement(['completed', 'processing']);
    }
  }

  private getRecipientIds(
    recipientType: string,
    couples: TestCouple[],
    vendors: TestVendor[],
    guests: TestGuest[],
  ): string[] {
    switch (recipientType) {
      case 'couple':
        return couples.map((c) => c.id);
      case 'vendor':
        return vendors
          .slice(0, faker.number.int({ min: 1, max: 3 }))
          .map((v) => v.id);
      case 'guest':
        return guests
          .slice(0, faker.number.int({ min: 5, max: 20 }))
          .map((g) => g.id);
      default:
        return [];
    }
  }

  private getCommunicationStatus(
    context: WeddingErrorTestContext,
    priority: string,
  ): TestCommunication['status'] {
    if (context.criticalPath && priority === 'critical') {
      // Higher chance of communication failures for critical path testing
      return faker.helpers.arrayElement(
        ['sent', 'delivered', 'failed', 'bounced'],
        { probability: [0.3, 0.4, 0.2, 0.1] },
      );
    }

    return faker.helpers.arrayElement(['sent', 'delivered'], {
      probability: [0.3, 0.7],
    });
  }

  private getCommunicationErrors(
    context: WeddingErrorTestContext,
  ): TestCommunication['errorDetails'] | undefined {
    if (context.criticalPath && faker.datatype.boolean({ probability: 0.4 })) {
      return {
        code: faker.helpers.arrayElement([
          'SMTP_ERROR',
          'RATE_LIMIT',
          'INVALID_RECIPIENT',
          'BOUNCE',
        ]),
        message: faker.lorem.sentence(),
        retryCount: faker.number.int({ min: 0, max: 3 }),
      };
    }

    return undefined;
  }

  // Cleanup methods
  async cleanup(): Promise<void> {
    // Clean up any generated test data
    this.generatedData.clear();

    // In a real implementation, this would clean up any database records created during testing
    console.log('Test wedding data cleanup completed');
  }

  // Utility methods for specific test scenarios
  generateWeddingDayData(context: WeddingErrorTestContext): TestWeddingData {
    // Generate data specific to wedding day scenarios
    const baseData = this.generateWeddingData({
      ...context,
      weddingPhase: 'wedding_day',
      criticalPath: true,
    });

    return baseData;
  }

  generateHighVolumeGuestData(guestCount: number): TestGuest[] {
    const guests: TestGuest[] = [];

    for (let i = 0; i < guestCount; i++) {
      guests.push({
        id: faker.string.uuid(),
        weddingId: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        rsvpStatus: faker.helpers.arrayElement([
          'pending',
          'attending',
          'not_attending',
          'maybe',
        ]),
        dietaryRestrictions: [],
        plusOne: faker.datatype.boolean(),
      });
    }

    return guests;
  }

  generateFailingIntegrationVendor(vendorType: string): TestVendor {
    return {
      id: faker.string.uuid(),
      weddingId: faker.string.uuid(),
      type: vendorType as any,
      name: faker.person.fullName(),
      businessName: faker.company.name(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      status: 'booked',
      contractValue: faker.number.int({ min: 1000, max: 10000 }),
      paymentSchedule: {
        deposit: 500,
        interimPayments: [],
        finalPayment: 500,
        finalDueDate: faker.date.future().toISOString(),
      },
      integrations: {
        apiEndpoint: 'https://failing-api.example.com',
        webhookUrl: 'https://failing-webhook.example.com',
        authMethod: 'api_key',
        lastSyncAt: faker.date.past().toISOString(),
        syncStatus: 'failing',
      },
    };
  }
}

export { TestWeddingDataGenerator };
export type {
  TestWeddingData,
  TestWedding,
  TestCouple,
  TestVendor,
  TestGuest,
  TestTimelineEvent,
  TestPayment,
  TestCommunication,
};
