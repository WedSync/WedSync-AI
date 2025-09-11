import { integrationDataManager } from '../database/IntegrationDataManager';
import { ExternalWebhookClient } from './external-webhook-client';
import { WebhookNotificationService } from './webhook-notification-service';
import { IntegrationError, ErrorCategory } from '@/types/integrations';

interface WeddingData {
  id: string;
  coupleNames: {
    partner1: string;
    partner2: string;
  };
  weddingDate: Date;
  venue: {
    name: string;
    address: string;
    capacity: number;
    contactEmail?: string;
    contactPhone?: string;
  };
  suppliers: WeddingSupplier[];
  timeline: WeddingTimelineEvent[];
  budget: WeddingBudget;
  guestCount: number;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  organizationId: string;
}

interface WeddingSupplier {
  id: string;
  type:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'caterer'
    | 'dj'
    | 'videographer'
    | 'planner';
  name: string;
  contactEmail: string;
  contactPhone?: string;
  webhookEndpoint?: string;
  services: string[];
  status: 'booked' | 'pending' | 'confirmed' | 'cancelled';
  payment: {
    totalAmount: number;
    paidAmount: number;
    nextPaymentDue?: Date;
    nextPaymentAmount?: number;
  };
}

interface WeddingTimelineEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  supplierId?: string;
  description?: string;
  requirements?: string[];
  isConfirmed: boolean;
}

interface WeddingBudget {
  totalBudget: number;
  allocated: number;
  spent: number;
  remaining: number;
  categories: BudgetCategory[];
}

interface BudgetCategory {
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
}

interface PhotoPreferences {
  style: string[];
  mustHaveShots: string[];
  familyGroupings: FamilyGroup[];
  specialRequests: string[];
  deliveryPreferences: {
    format: 'digital' | 'print' | 'both';
    timeline: string;
    galleryAccess: string[];
  };
}

interface FamilyGroup {
  name: string;
  members: string[];
  priority: 'high' | 'medium' | 'low';
}

interface BookingChange {
  type:
    | 'date_change'
    | 'venue_change'
    | 'guest_count_change'
    | 'service_change'
    | 'cancellation';
  previousValue: any;
  newValue: any;
  effectiveDate: Date;
  reason?: string;
  approvedBy: string;
  impactAssessment: {
    affectedSuppliers: string[];
    costImplications: number;
    timelineChanges: string[];
  };
}

interface VenueData {
  venueId: string;
  name: string;
  capacity: number;
  availableDates: Date[];
  pricing: VenuePricing;
  amenities: string[];
  restrictions: string[];
  contactInfo: {
    email: string;
    phone: string;
    coordinator: string;
  };
  setupRequirements: SetupRequirement[];
}

interface VenuePricing {
  baseRate: number;
  additionalGuestRate: number;
  setupFee: number;
  cleanupFee: number;
  overtimeFee: number;
  cancellationPolicy: string;
}

interface SetupRequirement {
  item: string;
  quantity: number;
  notes?: string;
  supplierId?: string;
}

interface DateChange {
  originalDate: Date;
  newDate: Date;
  reason: string;
  confirmedBy: string;
  impactAnalysis: {
    supplierAvailability: SupplierAvailability[];
    venueAvailability: boolean;
    additionalCosts: number;
    riskFactors: string[];
  };
}

interface SupplierAvailability {
  supplierId: string;
  supplierName: string;
  available: boolean;
  alternativeDate?: Date;
  additionalFee?: number;
  notes?: string;
}

interface EmailData {
  templateId: string;
  recipientSegments: string[];
  personalizedContent: Record<string, any>;
  triggerConditions: string[];
  automationRules: AutomationRule[];
}

interface AutomationRule {
  trigger: string;
  condition: string;
  action: string;
  delay?: number;
  priority: 'high' | 'medium' | 'low';
}

interface JourneyData {
  journeyId: string;
  journeyName: string;
  clientId: string;
  completedSteps: JourneyStep[];
  currentStep: string;
  nextStep?: string;
  completionRate: number;
  engagementMetrics: {
    emailsOpened: number;
    linksClicked: number;
    formsCompleted: number;
    meetingsBooked: number;
  };
}

interface JourneyStep {
  stepId: string;
  stepName: string;
  completedAt: Date;
  data: Record<string, any>;
}

interface ClientPreferences {
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    preferredTime: string;
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  };
  contentPreferences: {
    topics: string[];
    format: 'text' | 'video' | 'infographic' | 'mixed';
    language: string;
  };
  weddingPreferences: {
    style: string[];
    budget: string;
    priorities: string[];
    concerns: string[];
  };
}

/**
 * WeddingIndustryWorkflows - Specialized workflow automation for wedding industry
 *
 * This service handles complex wedding industry workflows including vendor coordination,
 * client communication, and integration with photography CRMs, venue systems, and
 * email marketing platforms. Designed specifically for wedding suppliers and couples.
 *
 * Key Features:
 * - Photography CRM integration and workflow automation
 * - Venue booking system coordination
 * - Email marketing campaign triggers
 * - Wedding timeline synchronization across vendors
 * - Real-time wedding data distribution
 * - Emergency wedding day protocols
 */
export class WeddingIndustryWorkflows {
  private readonly webhookClient: ExternalWebhookClient;
  private readonly notificationService: WebhookNotificationService;

  constructor(
    private readonly userId: string,
    private readonly organizationId: string,
  ) {
    this.webhookClient = new ExternalWebhookClient(userId, organizationId);
    this.notificationService = new WebhookNotificationService(
      userId,
      organizationId,
    );
  }

  /**
   * Photography CRM Integration Workflows
   */

  /**
   * Integrates with photography CRM systems when new bookings are made
   * Critical for photographers managing 200+ weddings annually
   */
  async integratePhotographyCRM(
    crmEndpoint: string,
    weddingData: WeddingData,
  ): Promise<void> {
    try {
      const isWeddingWeekend = this.isWeddingWeekend(weddingData.weddingDate);

      // Prepare photography-specific data
      const photographyData = this.transformToPhotographyFormat(weddingData);

      // Create webhook payload optimized for photography CRMs
      const webhookPayload = {
        id: `photo_crm_${weddingData.id}_${Date.now()}`,
        eventType: 'wedding.photography_booking',
        payload: {
          job_number: this.generateJobNumber(weddingData),
          client_info: {
            primary_contact: weddingData.coupleNames.partner1,
            partner_name: weddingData.coupleNames.partner2,
            wedding_date: weddingData.weddingDate.toISOString(),
            venue_name: weddingData.venue.name,
            venue_address: weddingData.venue.address,
            guest_count: weddingData.guestCount,
          },
          photography_details: photographyData,
          timeline_events: this.extractPhotographyEvents(weddingData.timeline),
          budget_info: this.getPhotographyBudget(weddingData.budget),
          special_requirements: this.getPhotographyRequirements(weddingData),
        },
        timestamp: new Date(),
        organizationId: weddingData.organizationId,
        retryCount: 0,
        maxRetries: isWeddingWeekend ? 10 : 5, // More retries on wedding weekends
      };

      const endpoint = {
        id: `crm_${Date.now()}`,
        url: crmEndpoint,
        secretKey: process.env.PHOTOGRAPHY_CRM_SECRET || 'default-secret',
        organizationId: weddingData.organizationId,
        isActive: true,
        eventTypes: ['wedding.photography_booking'],
        consecutiveFailures: 0,
        timeout: 30000,
      };

      // Deliver to photography CRM
      const deliveryResult =
        await this.webhookClient.deliverWebhookToExternalSystem(
          webhookPayload,
          endpoint,
        );

      if (deliveryResult.success) {
        await this.logPhotographyIntegration(
          weddingData,
          'success',
          deliveryResult,
        );
      } else {
        await this.handlePhotographyIntegrationFailure(
          weddingData,
          deliveryResult,
        );
      }

      // Log integration attempt
      await integrationDataManager.logAudit(
        this.userId,
        weddingData.organizationId,
        'PHOTOGRAPHY_CRM_INTEGRATION',
        weddingData.id,
        'crm_integration',
        {
          success: deliveryResult.success,
          responseTime: deliveryResult.responseTime,
          retryCount: deliveryResult.retryCount,
          weddingDate: weddingData.weddingDate,
          isWeddingWeekend,
        },
      );
    } catch (error) {
      throw new IntegrationError(
        'Failed to integrate with photography CRM',
        ErrorCategory.CRM_INTEGRATION_ERROR,
        error,
      );
    }
  }

  /**
   * Syncs client photography preferences with CRM systems
   */
  async syncClientPhotographyPreferences(
    clientId: string,
    preferences: PhotoPreferences,
  ): Promise<void> {
    try {
      // Get client's photography suppliers
      const photographySuppliers = await this.getPhotographySuppliers(clientId);

      for (const supplier of photographySuppliers) {
        if (supplier.webhookEndpoint) {
          const syncPayload = {
            id: `pref_sync_${clientId}_${Date.now()}`,
            eventType: 'client.preferences_updated',
            payload: {
              client_id: clientId,
              preferences: {
                photography_style: preferences.style,
                must_have_shots: preferences.mustHaveShots,
                family_groups: preferences.familyGroupings.map((group) => ({
                  group_name: group.name,
                  members: group.members,
                  priority: group.priority,
                })),
                special_requests: preferences.specialRequests,
                delivery_preferences: preferences.deliveryPreferences,
              },
              updated_at: new Date().toISOString(),
            },
            timestamp: new Date(),
            organizationId: supplier.id,
            retryCount: 0,
            maxRetries: 3,
          };

          const endpoint = {
            id: `pref_sync_${supplier.id}`,
            url: supplier.webhookEndpoint,
            secretKey: process.env.SUPPLIER_WEBHOOK_SECRET || 'default-secret',
            organizationId: supplier.id,
            isActive: true,
            eventTypes: ['client.preferences_updated'],
            consecutiveFailures: 0,
            timeout: 15000,
          };

          await this.webhookClient.deliverWebhookToExternalSystem(
            syncPayload,
            endpoint,
          );
        }
      }
    } catch (error) {
      console.error('Failed to sync photography preferences:', error);
    }
  }

  /**
   * Notifies photographers of booking changes that affect their services
   */
  async notifyPhotographerOfBookingChange(
    photographerId: string,
    bookingChange: BookingChange,
  ): Promise<void> {
    try {
      const photographer = await this.getSupplierById(photographerId);

      if (!photographer || !photographer.webhookEndpoint) {
        throw new Error('Photographer webhook endpoint not configured');
      }

      // Determine notification urgency based on change type
      const urgency = this.assessBookingChangeUrgency(bookingChange);

      const changeNotification = {
        id: `booking_change_${photographerId}_${Date.now()}`,
        eventType: 'booking.change_notification',
        payload: {
          change_type: bookingChange.type,
          change_details: {
            previous_value: bookingChange.previousValue,
            new_value: bookingChange.newValue,
            effective_date: bookingChange.effectiveDate.toISOString(),
            reason: bookingChange.reason,
          },
          impact_assessment: bookingChange.impactAssessment,
          urgency_level: urgency,
          action_required: this.determinePhotographerAction(bookingChange),
          response_deadline: this.calculateResponseDeadline(
            bookingChange,
            urgency,
          ),
          contact_information: {
            primary_contact: 'Wedding Coordinator',
            phone: process.env.COORDINATOR_PHONE,
            email: process.env.COORDINATOR_EMAIL,
          },
        },
        timestamp: new Date(),
        organizationId: photographer.id,
        retryCount: 0,
        maxRetries: urgency === 'critical' ? 10 : 5,
      };

      const endpoint = {
        id: `booking_change_${photographer.id}`,
        url: photographer.webhookEndpoint,
        secretKey: process.env.SUPPLIER_WEBHOOK_SECRET || 'default-secret',
        organizationId: photographer.id,
        isActive: true,
        eventTypes: ['booking.change_notification'],
        consecutiveFailures: 0,
        timeout: urgency === 'critical' ? 60000 : 30000,
      };

      const deliveryResult =
        await this.webhookClient.deliverWebhookToExternalSystem(
          changeNotification,
          endpoint,
        );

      // Send backup notification if critical and webhook fails
      if (!deliveryResult.success && urgency === 'critical') {
        await this.sendEmergencyPhotographerNotification(
          photographerId,
          bookingChange,
        );
      }
    } catch (error) {
      throw new IntegrationError(
        'Failed to notify photographer of booking change',
        ErrorCategory.NOTIFICATION_ERROR,
        error,
      );
    }
  }

  /**
   * Venue Booking System Integration Workflows
   */

  /**
   * Integrates with venue booking systems for availability and guest management
   */
  async integrateVenueBookingSystem(
    venueEndpoint: string,
    venueData: VenueData,
  ): Promise<void> {
    try {
      const venueIntegrationPayload = {
        id: `venue_booking_${venueData.venueId}_${Date.now()}`,
        eventType: 'venue.booking_integration',
        payload: {
          venue_details: {
            venue_id: venueData.venueId,
            name: venueData.name,
            capacity: venueData.capacity,
            amenities: venueData.amenities,
            restrictions: venueData.restrictions,
          },
          pricing_structure: venueData.pricing,
          availability_windows: venueData.availableDates.map((date) => ({
            date: date.toISOString(),
            available: true,
            restrictions: [],
          })),
          setup_requirements: venueData.setupRequirements,
          contact_information: venueData.contactInfo,
          integration_preferences: {
            real_time_updates: true,
            availability_sync: true,
            guest_count_tracking: true,
            setup_coordination: true,
          },
        },
        timestamp: new Date(),
        organizationId: this.organizationId,
        retryCount: 0,
        maxRetries: 5,
      };

      const endpoint = {
        id: `venue_${venueData.venueId}`,
        url: venueEndpoint,
        secretKey: process.env.VENUE_WEBHOOK_SECRET || 'default-secret',
        organizationId: this.organizationId,
        isActive: true,
        eventTypes: ['venue.booking_integration'],
        consecutiveFailures: 0,
        timeout: 30000,
      };

      const deliveryResult =
        await this.webhookClient.deliverWebhookToExternalSystem(
          venueIntegrationPayload,
          endpoint,
        );

      await integrationDataManager.logAudit(
        this.userId,
        this.organizationId,
        'VENUE_BOOKING_INTEGRATION',
        venueData.venueId,
        'venue_integration',
        {
          success: deliveryResult.success,
          responseTime: deliveryResult.responseTime,
          venue_name: venueData.name,
          capacity: venueData.capacity,
        },
      );
    } catch (error) {
      throw new IntegrationError(
        'Failed to integrate with venue booking system',
        ErrorCategory.VENUE_INTEGRATION_ERROR,
        error,
      );
    }
  }

  /**
   * Syncs guest count updates with venue systems
   */
  async syncGuestCountUpdates(
    venueId: string,
    guestCount: number,
  ): Promise<void> {
    try {
      const venue = await this.getVenueById(venueId);

      if (!venue || !venue.webhookEndpoint) {
        throw new Error('Venue webhook endpoint not configured');
      }

      const guestCountUpdate = {
        id: `guest_count_${venueId}_${Date.now()}`,
        eventType: 'venue.guest_count_update',
        payload: {
          venue_id: venueId,
          new_guest_count: guestCount,
          previous_count: venue.lastKnownGuestCount || 0,
          update_timestamp: new Date().toISOString(),
          capacity_utilization: (guestCount / venue.capacity) * 100,
          capacity_warnings:
            guestCount > venue.capacity * 0.95
              ? [
                  'Guest count approaching venue capacity',
                  'Consider reviewing seating arrangements',
                  'Additional setup may be required',
                ]
              : [],
          catering_impact: this.calculateCateringImpact(
            guestCount,
            venue.lastKnownGuestCount,
          ),
          setup_adjustments: this.determineSetupAdjustments(guestCount, venue),
        },
        timestamp: new Date(),
        organizationId: venue.organizationId,
        retryCount: 0,
        maxRetries: 3,
      };

      const endpoint = {
        id: `guest_sync_${venueId}`,
        url: venue.webhookEndpoint,
        secretKey: process.env.VENUE_WEBHOOK_SECRET || 'default-secret',
        organizationId: venue.organizationId,
        isActive: true,
        eventTypes: ['venue.guest_count_update'],
        consecutiveFailures: 0,
        timeout: 15000,
      };

      await this.webhookClient.deliverWebhookToExternalSystem(
        guestCountUpdate,
        endpoint,
      );
    } catch (error) {
      console.error('Failed to sync guest count update:', error);
    }
  }

  /**
   * Notifies venues of date changes with impact assessment
   */
  async notifyVenueOfDateChange(
    venueId: string,
    dateChange: DateChange,
  ): Promise<void> {
    try {
      const venue = await this.getVenueById(venueId);

      if (!venue || !venue.webhookEndpoint) {
        throw new Error('Venue webhook endpoint not configured');
      }

      const dateChangeNotification = {
        id: `date_change_${venueId}_${Date.now()}`,
        eventType: 'venue.date_change_request',
        payload: {
          venue_id: venueId,
          date_change_details: {
            original_date: dateChange.originalDate.toISOString(),
            requested_date: dateChange.newDate.toISOString(),
            reason: dateChange.reason,
            confirmed_by: dateChange.confirmedBy,
            request_timestamp: new Date().toISOString(),
          },
          impact_analysis: dateChange.impactAnalysis,
          availability_check_required: true,
          pricing_impact: this.calculateDateChangePricingImpact(dateChange),
          coordination_requirements: [
            'Confirm new date availability',
            'Update setup schedule',
            'Coordinate with catering timeline',
            'Adjust staffing schedule',
          ],
          response_required_by: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          emergency_contact: {
            name: 'Wedding Coordinator',
            phone: process.env.COORDINATOR_PHONE,
            email: process.env.COORDINATOR_EMAIL,
          },
        },
        timestamp: new Date(),
        organizationId: venue.organizationId,
        retryCount: 0,
        maxRetries: 8, // High retry count for critical date changes
      };

      const endpoint = {
        id: `date_change_${venueId}`,
        url: venue.webhookEndpoint,
        secretKey: process.env.VENUE_WEBHOOK_SECRET || 'default-secret',
        organizationId: venue.organizationId,
        isActive: true,
        eventTypes: ['venue.date_change_request'],
        consecutiveFailures: 0,
        timeout: 45000, // Extended timeout for critical operations
      };

      const deliveryResult =
        await this.webhookClient.deliverWebhookToExternalSystem(
          dateChangeNotification,
          endpoint,
        );

      // Critical alert if date change notification fails
      if (!deliveryResult.success) {
        await this.notificationService.sendCriticalWebhookAlert({
          severity: 'critical',
          title: 'URGENT: Venue Date Change Notification Failed',
          message: `Failed to notify ${venue.name} of critical wedding date change from ${dateChange.originalDate.toLocaleDateString()} to ${dateChange.newDate.toLocaleDateString()}`,
          endpointUrl: venue.webhookEndpoint,
          actionRequired: true,
          escalationLevel: 3,
        });
      }
    } catch (error) {
      throw new IntegrationError(
        'Failed to notify venue of date change',
        ErrorCategory.CRITICAL_NOTIFICATION_ERROR,
        error,
      );
    }
  }

  /**
   * Email Marketing Platform Integration Workflows
   */

  /**
   * Integrates with email marketing platforms for campaign automation
   */
  async integrateEmailPlatform(
    platformEndpoint: string,
    emailData: EmailData,
  ): Promise<void> {
    try {
      const emailIntegrationPayload = {
        id: `email_integration_${Date.now()}`,
        eventType: 'email.platform_integration',
        payload: {
          integration_config: {
            template_id: emailData.templateId,
            recipient_segments: emailData.recipientSegments,
            personalization_data: emailData.personalizedContent,
            automation_rules: emailData.automationRules.map((rule) => ({
              trigger_event: rule.trigger,
              condition_logic: rule.condition,
              action_to_take: rule.action,
              delay_minutes: rule.delay || 0,
              priority_level: rule.priority,
            })),
          },
          trigger_conditions: emailData.triggerConditions,
          wedding_context: {
            industry: 'wedding_planning',
            seasonal_considerations: this.getSeasonalConsiderations(),
            peak_periods: this.getPeakWeddingPeriods(),
            compliance_requirements: ['CAN_SPAM', 'GDPR', 'CCPA'],
          },
          performance_tracking: {
            track_opens: true,
            track_clicks: true,
            track_conversions: true,
            track_unsubscribes: true,
            custom_events: [
              'booking_inquiry',
              'consultation_scheduled',
              'contract_signed',
            ],
          },
        },
        timestamp: new Date(),
        organizationId: this.organizationId,
        retryCount: 0,
        maxRetries: 3,
      };

      const endpoint = {
        id: `email_platform_${Date.now()}`,
        url: platformEndpoint,
        secretKey: process.env.EMAIL_PLATFORM_SECRET || 'default-secret',
        organizationId: this.organizationId,
        isActive: true,
        eventTypes: ['email.platform_integration'],
        consecutiveFailures: 0,
        timeout: 30000,
      };

      const deliveryResult =
        await this.webhookClient.deliverWebhookToExternalSystem(
          emailIntegrationPayload,
          endpoint,
        );

      await integrationDataManager.logAudit(
        this.userId,
        this.organizationId,
        'EMAIL_PLATFORM_INTEGRATION',
        emailData.templateId,
        'email_integration',
        {
          success: deliveryResult.success,
          recipient_segments: emailData.recipientSegments.length,
          automation_rules: emailData.automationRules.length,
        },
      );
    } catch (error) {
      throw new IntegrationError(
        'Failed to integrate with email platform',
        ErrorCategory.EMAIL_INTEGRATION_ERROR,
        error,
      );
    }
  }

  /**
   * Triggers journey completion sequences in email marketing platforms
   */
  async triggerJourneyCompletionSequence(
    clientId: string,
    journeyData: JourneyData,
  ): Promise<void> {
    try {
      // Get email platforms connected to this organization
      const emailPlatforms = await this.getConnectedEmailPlatforms();

      for (const platform of emailPlatforms) {
        const completionTrigger = {
          id: `journey_complete_${clientId}_${Date.now()}`,
          eventType: 'journey.completion_trigger',
          payload: {
            client_id: clientId,
            journey_details: {
              journey_id: journeyData.journeyId,
              journey_name: journeyData.journeyName,
              completion_rate: journeyData.completionRate,
              completed_steps: journeyData.completedSteps.length,
              total_steps:
                journeyData.completedSteps.length +
                (journeyData.nextStep ? 1 : 0),
            },
            engagement_metrics: journeyData.engagementMetrics,
            next_steps: this.determinePostJourneyActions(journeyData),
            segmentation_data: {
              engagement_level: this.calculateEngagementLevel(
                journeyData.engagementMetrics,
              ),
              journey_performance:
                journeyData.completionRate >= 80 ? 'high' : 'low',
              recommended_campaigns: this.getRecommendedCampaigns(journeyData),
            },
            automation_triggers: [
              'send_completion_congratulations',
              'schedule_followup_sequence',
              'update_lead_score',
              'trigger_upsell_campaign',
            ],
          },
          timestamp: new Date(),
          organizationId: platform.organizationId,
          retryCount: 0,
          maxRetries: 3,
        };

        const endpoint = {
          id: `journey_trigger_${platform.id}`,
          url: platform.webhookEndpoint,
          secretKey: platform.apiKey,
          organizationId: platform.organizationId,
          isActive: true,
          eventTypes: ['journey.completion_trigger'],
          consecutiveFailures: 0,
          timeout: 20000,
        };

        await this.webhookClient.deliverWebhookToExternalSystem(
          completionTrigger,
          endpoint,
        );
      }
    } catch (error) {
      console.error('Failed to trigger journey completion sequence:', error);
    }
  }

  /**
   * Syncs client preferences with email marketing platforms
   */
  async syncClientPreferencesToEmailPlatform(
    clientId: string,
    preferences: ClientPreferences,
  ): Promise<void> {
    try {
      const emailPlatforms = await this.getConnectedEmailPlatforms();

      for (const platform of emailPlatforms) {
        const preferenceSync = {
          id: `pref_sync_${clientId}_${Date.now()}`,
          eventType: 'client.preferences_sync',
          payload: {
            client_id: clientId,
            communication_preferences: preferences.communicationPreferences,
            content_preferences: preferences.contentPreferences,
            wedding_preferences: preferences.weddingPreferences,
            segmentation_updates: {
              communication_frequency:
                preferences.communicationPreferences.frequency,
              content_format: preferences.contentPreferences.format,
              wedding_style: preferences.weddingPreferences.style,
              budget_segment: preferences.weddingPreferences.budget,
              priority_topics: preferences.weddingPreferences.priorities,
            },
            automation_adjustments: [
              'update_send_frequency',
              'adjust_content_format',
              'modify_topic_selection',
              'update_send_times',
            ],
            sync_timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
          organizationId: platform.organizationId,
          retryCount: 0,
          maxRetries: 2,
        };

        const endpoint = {
          id: `pref_sync_${platform.id}`,
          url: platform.webhookEndpoint,
          secretKey: platform.apiKey,
          organizationId: platform.organizationId,
          isActive: true,
          eventTypes: ['client.preferences_sync'],
          consecutiveFailures: 0,
          timeout: 15000,
        };

        await this.webhookClient.deliverWebhookToExternalSystem(
          preferenceSync,
          endpoint,
        );
      }
    } catch (error) {
      console.error(
        'Failed to sync client preferences to email platform:',
        error,
      );
    }
  }

  // Private utility methods

  private isWeddingWeekend(weddingDate: Date): boolean {
    const dayOfWeek = weddingDate.getDay();
    return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Friday, Saturday, Sunday
  }

  private transformToPhotographyFormat(weddingData: WeddingData): any {
    return {
      photography_package: 'full_wedding',
      estimated_hours: 10,
      locations: [weddingData.venue.name],
      style_preferences: ['natural', 'candid'],
      equipment_requirements: ['drone', 'multiple_cameras', 'lighting'],
      delivery_timeline: '4-6_weeks',
      additional_services: ['engagement_session', 'bridal_session'],
    };
  }

  private generateJobNumber(weddingData: WeddingData): string {
    const dateStr = weddingData.weddingDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const initials =
      weddingData.coupleNames.partner1.charAt(0) +
      weddingData.coupleNames.partner2.charAt(0);
    return `WS-${dateStr}-${initials}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  private extractPhotographyEvents(timeline: WeddingTimelineEvent[]): any[] {
    return timeline
      .filter((event) => event.title.toLowerCase().includes('photo'))
      .map((event) => ({
        event_name: event.title,
        start_time: event.startTime.toISOString(),
        end_time: event.endTime.toISOString(),
        location: 'TBD',
        requirements: event.requirements || [],
      }));
  }

  private getPhotographyBudget(budget: WeddingBudget): any {
    const photographyCategory = budget.categories.find(
      (c) =>
        c.name.toLowerCase().includes('photography') ||
        c.name.toLowerCase().includes('photo'),
    );

    return {
      allocated: photographyCategory?.budgeted || 0,
      spent: photographyCategory?.spent || 0,
      remaining: photographyCategory?.remaining || 0,
      percentage_of_total: photographyCategory
        ? (photographyCategory.budgeted / budget.totalBudget) * 100
        : 0,
    };
  }

  private getPhotographyRequirements(weddingData: WeddingData): string[] {
    return [
      'Professional wedding photography',
      'High-resolution digital delivery',
      'Online gallery access',
      'Print release included',
      '8-10 hour coverage',
      'Second photographer recommended',
    ];
  }

  private async logPhotographyIntegration(
    weddingData: WeddingData,
    status: 'success' | 'failed',
    result: any,
  ): Promise<void> {
    await integrationDataManager.logAudit(
      this.userId,
      weddingData.organizationId,
      'PHOTOGRAPHY_CRM_INTEGRATION_RESULT',
      weddingData.id,
      'crm_integration_result',
      {
        status,
        responseTime: result.responseTime,
        retryCount: result.retryCount,
        weddingDate: weddingData.weddingDate,
        coupleNames: weddingData.coupleNames,
        venue: weddingData.venue.name,
      },
    );
  }

  private async handlePhotographyIntegrationFailure(
    weddingData: WeddingData,
    result: any,
  ): Promise<void> {
    await this.notificationService.sendWebhookFailureNotification(
      weddingData.organizationId,
      {
        endpointUrl: 'Photography CRM Endpoint',
        errorCode: result.statusCode || 0,
        errorMessage: result.error || 'Unknown error',
        attemptCount: result.retryCount,
        lastAttemptAt: new Date(),
        webhookId: `photo_crm_${weddingData.id}`,
        eventType: 'wedding.photography_booking',
      },
    );
  }

  private async getPhotographySuppliers(
    clientId: string,
  ): Promise<WeddingSupplier[]> {
    // This would query the database for photography suppliers
    return [];
  }

  private async getSupplierById(
    supplierId: string,
  ): Promise<WeddingSupplier | null> {
    // This would query the database for the specific supplier
    return null;
  }

  private assessBookingChangeUrgency(
    change: BookingChange,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (change.type === 'cancellation') return 'critical';
    if (change.type === 'date_change') return 'critical';
    if (change.type === 'venue_change') return 'high';
    if (
      change.type === 'guest_count_change' &&
      Math.abs(change.newValue - change.previousValue) > 50
    )
      return 'high';
    return 'medium';
  }

  private determinePhotographerAction(change: BookingChange): string {
    switch (change.type) {
      case 'date_change':
        return 'Confirm availability for new date and update contract';
      case 'venue_change':
        return 'Scout new venue and adjust photography timeline';
      case 'guest_count_change':
        return 'Review coverage requirements and equipment needs';
      case 'cancellation':
        return 'Process cancellation according to contract terms';
      default:
        return 'Review change details and confirm impact';
    }
  }

  private calculateResponseDeadline(
    change: BookingChange,
    urgency: string,
  ): Date {
    const baseDelay = urgency === 'critical' ? 2 : urgency === 'high' ? 24 : 72; // hours
    return new Date(Date.now() + baseDelay * 60 * 60 * 1000);
  }

  private async sendEmergencyPhotographerNotification(
    photographerId: string,
    change: BookingChange,
  ): Promise<void> {
    // This would send emergency notification via email/SMS
    console.log(
      `Emergency notification sent to photographer ${photographerId} for ${change.type}`,
    );
  }

  private async getVenueById(venueId: string): Promise<any> {
    // This would query the venue from database
    return {
      id: venueId,
      webhookEndpoint: 'https://venue.example.com/webhook',
      capacity: 150,
      organizationId: this.organizationId,
      lastKnownGuestCount: 120,
    };
  }

  private calculateCateringImpact(
    newCount: number,
    previousCount?: number,
  ): any {
    if (!previousCount) return null;

    const difference = newCount - previousCount;
    return {
      guest_difference: difference,
      catering_adjustment:
        difference > 0 ? 'increase_required' : 'decrease_possible',
      estimated_cost_impact: Math.abs(difference) * 75, // $75 per guest
      lead_time_required: Math.abs(difference) > 10 ? '72_hours' : '24_hours',
    };
  }

  private determineSetupAdjustments(guestCount: number, venue: any): string[] {
    const adjustments = [];

    if (guestCount > venue.capacity * 0.9) {
      adjustments.push('Maximize seating efficiency');
      adjustments.push('Consider cocktail-style reception');
    }

    if (guestCount < venue.capacity * 0.5) {
      adjustments.push('Create intimate seating arrangement');
      adjustments.push('Consider reducing venue space usage');
    }

    return adjustments;
  }

  private calculateDateChangePricingImpact(dateChange: DateChange): any {
    const daysDifference =
      Math.abs(
        dateChange.newDate.getTime() - dateChange.originalDate.getTime(),
      ) /
      (1000 * 60 * 60 * 24);

    return {
      change_fee: daysDifference < 30 ? 500 : daysDifference < 90 ? 250 : 0,
      availability_premium: this.isWeddingWeekend(dateChange.newDate) ? 300 : 0,
      staff_adjustment_fee: 150,
      total_estimated_impact:
        daysDifference < 30 ? 950 : daysDifference < 90 ? 700 : 450,
    };
  }

  private getSeasonalConsiderations(): string[] {
    return [
      'Peak wedding season (May-October) requires advance planning',
      'Holiday weekends have higher demand',
      'Weather considerations for outdoor venues',
      'Vendor availability varies by season',
    ];
  }

  private getPeakWeddingPeriods(): Array<{
    start: string;
    end: string;
    factor: number;
  }> {
    return [
      { start: '2024-05-01', end: '2024-10-31', factor: 1.5 },
      { start: '2024-12-15', end: '2024-12-31', factor: 1.3 },
    ];
  }

  private async getConnectedEmailPlatforms(): Promise<any[]> {
    // This would query connected email platforms from database
    return [
      {
        id: 'platform1',
        type: 'mailchimp',
        webhookEndpoint: 'https://platform1.example.com/webhook',
        apiKey: 'key1',
        organizationId: this.organizationId,
      },
    ];
  }

  private determinePostJourneyActions(journeyData: JourneyData): string[] {
    const actions = [];

    if (journeyData.completionRate >= 80) {
      actions.push('send_completion_certificate');
      actions.push('offer_premium_services');
    }

    if (journeyData.engagementMetrics.meetingsBooked > 0) {
      actions.push('schedule_followup_consultation');
    }

    actions.push('add_to_newsletter_segment');
    actions.push('trigger_referral_program');

    return actions;
  }

  private calculateEngagementLevel(metrics: any): 'high' | 'medium' | 'low' {
    const score =
      metrics.emailsOpened * 1 +
      metrics.linksClicked * 2 +
      metrics.formsCompleted * 3 +
      metrics.meetingsBooked * 5;

    if (score >= 15) return 'high';
    if (score >= 8) return 'medium';
    return 'low';
  }

  private getRecommendedCampaigns(journeyData: JourneyData): string[] {
    const campaigns = [];

    if (journeyData.completionRate >= 80) {
      campaigns.push('advanced_wedding_planning_tips');
      campaigns.push('vendor_spotlight_series');
    }

    if (journeyData.engagementMetrics.linksClicked > 5) {
      campaigns.push('interactive_planning_tools');
    }

    campaigns.push('seasonal_wedding_trends');

    return campaigns;
  }
}
