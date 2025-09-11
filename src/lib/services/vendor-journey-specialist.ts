/**
 * WS-208: Vendor Journey Specialist
 * Industry-specific journey patterns and wedding vendor workflow expertise
 * Team B - Vendor-specific logic engines for different service types
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment validation
const env = z
  .object({
    SUPABASE_URL: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
  })
  .parse({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Types
export interface VendorContext {
  vendorType: string;
  bestPractices: string[];
  criticalTouchpoints: TouchpointDefinition[];
  industryStandards: Record<string, any>;
  seasonalConsiderations: SeasonalAdjustments;
  complianceRequirements: string[];
  serviceSpecific: ServiceLevelConfig;
}

export interface TouchpointDefinition {
  name: string;
  timing: number; // days before wedding (negative) or after booking (positive)
  required: boolean;
  channel: 'email' | 'sms' | 'phone' | 'in_person' | 'mixed';
  category: 'communication' | 'planning' | 'execution' | 'follow_up';
  description: string;
  serviceLevel: 'basic' | 'premium' | 'luxury' | 'all';
}

export interface ServiceLevelConfig {
  basic: {
    nodes: string[];
    timeline_buffer: number;
    communication_frequency: number;
    personal_touch_level: number;
  };
  premium: {
    nodes: string[];
    timeline_buffer: number;
    communication_frequency: number;
    personal_touch_level: number;
  };
  luxury: {
    nodes: string[];
    timeline_buffer: number;
    communication_frequency: number;
    personal_touch_level: number;
  };
}

export interface SeasonalAdjustments {
  peak_season: {
    buffer_multiplier: number;
    additional_touchpoints: string[];
    communication_adjustments: Record<string, any>;
  };
  off_season: {
    buffer_multiplier: number;
    additional_touchpoints: string[];
    communication_adjustments: Record<string, any>;
  };
  shoulder_season: {
    buffer_multiplier: number;
    additional_touchpoints: string[];
    communication_adjustments: Record<string, any>;
  };
}

export interface JourneyEnhancement {
  optimizedNodes: any[];
  industryCompliance: string[];
  seasonalAdjustments: any[];
  qualityAssurance: QualityCheck[];
}

interface QualityCheck {
  check: string;
  status: 'passed' | 'warning' | 'failed';
  recommendation?: string;
}

/**
 * Wedding vendor journey specialist with deep industry knowledge
 * Provides vendor-specific patterns, timing optimization, and compliance guidance
 */
export class VendorJourneySpecialist {
  private vendorPatterns: Record<string, VendorContext>;
  private weddingSeasons: Record<string, { start: number; end: number }>;

  constructor() {
    this.initializeVendorPatterns();
    this.initializeSeasonalData();
  }

  /**
   * Get comprehensive vendor context for journey generation
   */
  async getVendorContext(vendorType: string): Promise<VendorContext> {
    const baseContext = this.vendorPatterns[vendorType];
    if (!baseContext) {
      throw new Error(`Unsupported vendor type: ${vendorType}`);
    }

    // Enhance with database patterns if available
    const databasePatterns = await this.loadDatabasePatterns(vendorType);
    if (databasePatterns.length > 0) {
      baseContext.bestPractices.push(
        ...databasePatterns.map((p) => p.best_practice_notes).flat(),
      );
    }

    return baseContext;
  }

  /**
   * Build vendor-specific journey with optimal timing
   */
  async buildVendorJourney(
    vendorType: string,
    serviceLevel: 'basic' | 'premium' | 'luxury',
    timelineMonths: number,
    clientPreferences?: any,
  ): Promise<any[]> {
    const vendorContext = await this.getVendorContext(vendorType);
    const serviceLevelConfig = vendorContext.serviceSpecific[serviceLevel];
    const timelineDays = timelineMonths * 30;

    console.log(
      `[VendorJourneySpecialist] Building ${serviceLevel} journey for ${vendorType} with ${timelineMonths} month timeline`,
    );

    const nodes: any[] = [];
    let nodeIdCounter = 1;

    // Add service-specific nodes with optimal timing
    for (const nodeType of serviceLevelConfig.nodes) {
      const touchpoint = vendorContext.criticalTouchpoints.find(
        (tp) =>
          tp.name.toLowerCase().includes(nodeType.toLowerCase()) &&
          (tp.serviceLevel === serviceLevel || tp.serviceLevel === 'all'),
      );

      if (touchpoint && Math.abs(touchpoint.timing) <= timelineDays) {
        const node = this.createJourneyNode(
          nodeType,
          touchpoint,
          serviceLevel,
          `${vendorType}_node_${nodeIdCounter++}`,
          timelineDays,
        );
        nodes.push(node);
      }
    }

    // Apply seasonal adjustments
    const season = this.determineSeason(timelineMonths);
    const adjustedNodes = this.applySeasonalAdjustments(
      nodes,
      vendorContext.seasonalConsiderations[season],
      vendorType,
    );

    // Optimize node sequence and timing
    const optimizedNodes = this.optimizeNodeSequence(
      adjustedNodes,
      serviceLevelConfig,
    );

    console.log(
      `[VendorJourneySpecialist] Generated ${optimizedNodes.length} nodes for ${vendorType}`,
    );
    return optimizedNodes;
  }

  /**
   * Enhance AI-generated journey with vendor expertise
   */
  async enhanceJourney(
    aiJourney: any,
    request: any,
  ): Promise<JourneyEnhancement> {
    const vendorContext = await this.getVendorContext(request.vendorType);

    console.log(
      `[VendorJourneySpecialist] Enhancing journey for ${request.vendorType}`,
    );

    // 1. Optimize nodes with industry knowledge
    const optimizedNodes = await this.optimizeNodesWithIndustryKnowledge(
      aiJourney.nodes,
      vendorContext,
      request.serviceLevel,
    );

    // 2. Add industry compliance checks
    const complianceChecks = this.validateIndustryCompliance(
      optimizedNodes,
      vendorContext.complianceRequirements,
    );

    // 3. Apply seasonal adjustments
    const season = this.determineSeason(request.weddingTimeline);
    const seasonalAdjustments = this.applySeasonalAdjustments(
      optimizedNodes,
      vendorContext.seasonalConsiderations[season],
      request.vendorType,
    );

    // 4. Quality assurance checks
    const qualityChecks = this.performQualityAssurance(
      seasonalAdjustments,
      request,
    );

    return {
      optimizedNodes: seasonalAdjustments,
      industryCompliance: complianceChecks,
      seasonalAdjustments: [],
      qualityAssurance: qualityChecks,
    };
  }

  /**
   * Initialize wedding vendor patterns with industry expertise
   */
  private initializeVendorPatterns(): void {
    this.vendorPatterns = {
      photographer: {
        vendorType: 'photographer',
        bestPractices: [
          'Send engagement session booking within 2 weeks of contract signing',
          'Confirm timeline and shot list 30 days before wedding',
          'Provide equipment backup plan for outdoor ceremonies',
          'Deliver sneak peek photos within 48 hours of wedding',
          'Complete gallery delivery within 6-8 weeks',
          'Include second shooter for weddings over 100 guests',
          'Scout venue lighting conditions before wedding day',
          'Coordinate with videographer for ceremony positioning',
        ],
        criticalTouchpoints: [
          {
            name: 'contract_signing_confirmation',
            timing: 0,
            required: true,
            channel: 'email',
            category: 'communication',
            description: 'Welcome email with contract details and next steps',
            serviceLevel: 'all',
          },
          {
            name: 'engagement_session_booking',
            timing: -90,
            required: false,
            channel: 'phone',
            category: 'planning',
            description:
              'Schedule engagement session for portfolio and client comfort',
            serviceLevel: 'premium',
          },
          {
            name: 'venue_scouting_coordination',
            timing: -60,
            required: false,
            channel: 'email',
            category: 'planning',
            description:
              'Coordinate venue visit for lighting and logistics assessment',
            serviceLevel: 'luxury',
          },
          {
            name: 'timeline_planning_meeting',
            timing: -30,
            required: true,
            channel: 'phone',
            category: 'planning',
            description: 'Detailed timeline review and shot list confirmation',
            serviceLevel: 'all',
          },
          {
            name: 'final_details_confirmation',
            timing: -7,
            required: true,
            channel: 'email',
            category: 'execution',
            description:
              'Final headcount, timeline, and special request confirmation',
            serviceLevel: 'all',
          },
          {
            name: 'day_before_check_in',
            timing: -1,
            required: true,
            channel: 'sms',
            category: 'execution',
            description: 'Weather check, final confirmations, and arrival time',
            serviceLevel: 'all',
          },
          {
            name: 'sneak_peek_delivery',
            timing: 2,
            required: true,
            channel: 'email',
            category: 'follow_up',
            description: 'Deliver 10-15 preview photos for social sharing',
            serviceLevel: 'all',
          },
          {
            name: 'gallery_completion_notification',
            timing: 42,
            required: true,
            channel: 'email',
            category: 'follow_up',
            description: 'Full gallery delivery with download instructions',
            serviceLevel: 'all',
          },
        ],
        industryStandards: {
          engagement_session_rate: 0.75,
          average_delivery_time_weeks: 6,
          sneak_peek_turnaround_hours: 48,
          typical_shot_count: { basic: 400, premium: 600, luxury: 800 },
        },
        seasonalConsiderations: {
          peak_season: {
            buffer_multiplier: 1.5,
            additional_touchpoints: [
              'weather_contingency_planning',
              'vendor_coordination_call',
            ],
            communication_adjustments: { frequency_increase: 0.3 },
          },
          off_season: {
            buffer_multiplier: 1.0,
            additional_touchpoints: [],
            communication_adjustments: { personalization_increase: 0.2 },
          },
          shoulder_season: {
            buffer_multiplier: 1.2,
            additional_touchpoints: ['seasonal_styling_suggestions'],
            communication_adjustments: {},
          },
        },
        complianceRequirements: [
          'GDPR compliance for photo storage and sharing',
          'Model release forms for commercial use',
          'Copyright protection and usage rights clarification',
          'Insurance coverage verification',
          'Equipment backup and failure protocols',
        ],
        serviceSpecific: {
          basic: {
            nodes: [
              'booking_confirmation',
              'timeline_review',
              'final_checklist',
              'delivery_notification',
            ],
            timeline_buffer: 7,
            communication_frequency: 3,
            personal_touch_level: 2,
          },
          premium: {
            nodes: [
              'booking_confirmation',
              'engagement_session',
              'timeline_review',
              'equipment_prep',
              'final_checklist',
              'sneak_peek',
              'delivery_notification',
            ],
            timeline_buffer: 14,
            communication_frequency: 5,
            personal_touch_level: 4,
          },
          luxury: {
            nodes: [
              'booking_confirmation',
              'consultation_call',
              'engagement_session',
              'venue_walkthrough',
              'timeline_review',
              'equipment_prep',
              'final_checklist',
              'day_of_coordination',
              'sneak_peek',
              'delivery_notification',
              'follow_up_review',
            ],
            timeline_buffer: 21,
            communication_frequency: 8,
            personal_touch_level: 5,
          },
        },
      },

      caterer: {
        vendorType: 'caterer',
        bestPractices: [
          'Schedule menu tasting within 90 days of wedding for optimal planning',
          'Confirm final headcount 14 days before wedding for accurate preparation',
          'Collect dietary restrictions and allergies 7 days before event',
          'Coordinate delivery and setup timing with venue 48 hours prior',
          'Provide detailed service timeline to couple 30 days before wedding',
          'Include service staff briefing on special requests and family dynamics',
        ],
        criticalTouchpoints: [
          {
            name: 'initial_consultation',
            timing: 0,
            required: true,
            channel: 'in_person',
            category: 'communication',
            description: 'Menu preferences and dietary requirements discussion',
            serviceLevel: 'all',
          },
          {
            name: 'menu_tasting_scheduling',
            timing: -90,
            required: true,
            channel: 'email',
            category: 'planning',
            description: 'Schedule tasting session with menu customization',
            serviceLevel: 'all',
          },
          {
            name: 'service_style_planning',
            timing: -60,
            required: true,
            channel: 'phone',
            category: 'planning',
            description: 'Finalize service style, staffing, and logistics',
            serviceLevel: 'premium',
          },
          {
            name: 'final_headcount_confirmation',
            timing: -14,
            required: true,
            channel: 'email',
            category: 'execution',
            description: 'Lock in guest count and finalize quantities',
            serviceLevel: 'all',
          },
          {
            name: 'dietary_restrictions_collection',
            timing: -7,
            required: true,
            channel: 'email',
            category: 'execution',
            description: 'Final dietary restrictions and allergy documentation',
            serviceLevel: 'all',
          },
          {
            name: 'delivery_coordination',
            timing: -1,
            required: true,
            channel: 'phone',
            category: 'execution',
            description:
              'Confirm delivery time, setup requirements, and venue access',
            serviceLevel: 'all',
          },
        ],
        industryStandards: {
          tasting_booking_rate: 0.95,
          average_planning_weeks: 12,
          headcount_buffer_percentage: 0.05,
          typical_service_ratios: { basic: 15, premium: 12, luxury: 8 },
        },
        seasonalConsiderations: {
          peak_season: {
            buffer_multiplier: 1.8,
            additional_touchpoints: [
              'alternative_menu_planning',
              'staff_availability_confirmation',
            ],
            communication_adjustments: { urgency_increase: 0.4 },
          },
          off_season: {
            buffer_multiplier: 1.0,
            additional_touchpoints: ['seasonal_menu_suggestions'],
            communication_adjustments: { creativity_increase: 0.3 },
          },
          shoulder_season: {
            buffer_multiplier: 1.3,
            additional_touchpoints: ['weather_contingency_menu'],
            communication_adjustments: {},
          },
        },
        complianceRequirements: [
          'Food safety and handling certifications',
          'Allergy management protocols',
          'Venue kitchen and service compliance',
          'Insurance and liability coverage',
          'Staff training and certification verification',
        ],
        serviceSpecific: {
          basic: {
            nodes: [
              'consultation',
              'menu_selection',
              'headcount_confirmation',
              'delivery_coordination',
            ],
            timeline_buffer: 14,
            communication_frequency: 4,
            personal_touch_level: 2,
          },
          premium: {
            nodes: [
              'consultation',
              'menu_tasting',
              'service_planning',
              'headcount_confirmation',
              'special_requirements',
              'delivery_coordination',
            ],
            timeline_buffer: 21,
            communication_frequency: 6,
            personal_touch_level: 4,
          },
          luxury: {
            nodes: [
              'consultation',
              'custom_menu_design',
              'multiple_tastings',
              'service_planning',
              'staff_briefing',
              'special_requirements',
              'final_coordination',
              'day_of_management',
            ],
            timeline_buffer: 30,
            communication_frequency: 9,
            personal_touch_level: 5,
          },
        },
      },

      // Add more vendor types following the same pattern
      venue: {
        vendorType: 'venue',
        bestPractices: [
          'Provide venue layout options within 2 weeks of booking',
          'Schedule walkthrough 60 days before wedding for final details',
          'Coordinate vendor load-in schedule 30 days prior',
          'Confirm setup and breakdown timeline 14 days before event',
        ],
        criticalTouchpoints: [
          {
            name: 'booking_confirmation',
            timing: 0,
            required: true,
            channel: 'email',
            category: 'communication',
            description: 'Venue booking confirmation with contract details',
            serviceLevel: 'all',
          },
          {
            name: 'layout_planning',
            timing: -60,
            required: true,
            channel: 'in_person',
            category: 'planning',
            description: 'Venue walkthrough and layout finalization',
            serviceLevel: 'all',
          },
        ],
        industryStandards: {},
        seasonalConsiderations: {
          peak_season: {
            buffer_multiplier: 1.6,
            additional_touchpoints: [],
            communication_adjustments: {},
          },
          off_season: {
            buffer_multiplier: 1.0,
            additional_touchpoints: [],
            communication_adjustments: {},
          },
          shoulder_season: {
            buffer_multiplier: 1.2,
            additional_touchpoints: [],
            communication_adjustments: {},
          },
        },
        complianceRequirements: [
          'Capacity limits',
          'Fire safety compliance',
          'Insurance requirements',
        ],
        serviceSpecific: {
          basic: {
            nodes: ['booking_confirmation', 'layout_planning'],
            timeline_buffer: 10,
            communication_frequency: 3,
            personal_touch_level: 2,
          },
          premium: {
            nodes: [
              'booking_confirmation',
              'layout_planning',
              'vendor_coordination',
            ],
            timeline_buffer: 15,
            communication_frequency: 4,
            personal_touch_level: 3,
          },
          luxury: {
            nodes: [
              'booking_confirmation',
              'consultation',
              'layout_planning',
              'vendor_coordination',
              'day_of_management',
            ],
            timeline_buffer: 20,
            communication_frequency: 6,
            personal_touch_level: 5,
          },
        },
      },
    };
  }

  /**
   * Initialize seasonal wedding data
   */
  private initializeSeasonalData(): void {
    this.weddingSeasons = {
      peak_season: { start: 5, end: 10 }, // May to October
      off_season: { start: 11, end: 2 }, // November to February
      shoulder_season: { start: 3, end: 4 }, // March to April
    };
  }

  /**
   * Create a journey node with vendor-specific details
   */
  private createJourneyNode(
    nodeType: string,
    touchpoint: TouchpointDefinition,
    serviceLevel: string,
    nodeId: string,
    timelineDays: number,
  ): any {
    return {
      id: nodeId,
      type: touchpoint.channel === 'mixed' ? 'email' : touchpoint.channel,
      name: touchpoint.description,
      timing: {
        days_from_booking: Math.max(0, timelineDays + touchpoint.timing),
        days_before_wedding: Math.max(0, -touchpoint.timing),
      },
      content: {
        subject: this.generateSubjectLine(nodeType, serviceLevel),
        template_key: `${touchpoint.name}_${serviceLevel}`,
        personalization_fields: ['client_name', 'wedding_date', 'venue_name'],
        description: touchpoint.description,
      },
      triggers: [touchpoint.category],
      next_nodes: [],
      vendor_specific_data: {
        touchpoint_category: touchpoint.category,
        industry_standard: true,
        compliance_required: touchpoint.required,
        service_level_specific: serviceLevel !== 'all',
      },
      required: touchpoint.required,
      category: touchpoint.category,
    };
  }

  /**
   * Generate appropriate subject lines for communications
   */
  private generateSubjectLine(nodeType: string, serviceLevel: string): string {
    const subjectTemplates: Record<string, Record<string, string>> = {
      booking_confirmation: {
        basic:
          'Welcome to [Business Name] - Your Wedding Photography is Confirmed!',
        premium:
          'Excited to Capture Your Special Day - Welcome to the [Business Name] Family!',
        luxury:
          'Your Luxury Wedding Photography Experience Begins - Personal Welcome from [Photographer Name]',
      },
      timeline_review: {
        basic: "Your Wedding Day Timeline - Let's Review the Details",
        premium:
          'Perfecting Your Wedding Day Timeline - Detailed Planning Ahead',
        luxury:
          'Curating Your Perfect Wedding Day - Comprehensive Timeline & Shot Planning',
      },
    };

    return (
      subjectTemplates[nodeType]?.[serviceLevel] ||
      `Important Update About Your Wedding ${nodeType}`
    );
  }

  /**
   * Optimize node sequence and timing
   */
  private optimizeNodeSequence(nodes: any[], serviceLevelConfig: any): any[] {
    // Sort by timing
    const sortedNodes = nodes.sort(
      (a, b) => a.timing.days_from_booking - b.timing.days_from_booking,
    );

    // Add next_node relationships
    for (let i = 0; i < sortedNodes.length - 1; i++) {
      sortedNodes[i].next_nodes = [sortedNodes[i + 1].id];
    }

    // Apply service-level specific optimizations
    return sortedNodes.map((node) => ({
      ...node,
      timing: {
        ...node.timing,
        // Add buffer time based on service level
        days_from_booking:
          node.timing.days_from_booking + serviceLevelConfig.timeline_buffer,
      },
    }));
  }

  /**
   * Apply seasonal adjustments to journey nodes
   */
  private applySeasonalAdjustments(
    nodes: any[],
    seasonalConfig: any,
    vendorType: string,
  ): any[] {
    if (!seasonalConfig) return nodes;

    return nodes.map((node) => {
      const adjustedNode = { ...node };

      // Apply buffer multiplier
      adjustedNode.timing.days_from_booking = Math.floor(
        adjustedNode.timing.days_from_booking *
          seasonalConfig.buffer_multiplier,
      );

      // Add seasonal-specific content adjustments
      if (seasonalConfig.communication_adjustments) {
        adjustedNode.vendor_specific_data = {
          ...adjustedNode.vendor_specific_data,
          seasonal_adjustments: seasonalConfig.communication_adjustments,
        };
      }

      return adjustedNode;
    });
  }

  /**
   * Determine wedding season based on timeline
   */
  private determineSeason(timelineMonths: number): keyof SeasonalAdjustments {
    // Assume wedding is typically planned for peak season if long timeline
    if (timelineMonths >= 12) return 'peak_season';
    if (timelineMonths >= 6) return 'shoulder_season';
    return 'off_season';
  }

  /**
   * Load database patterns for enhanced vendor context
   */
  private async loadDatabasePatterns(vendorType: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_journey_patterns')
        .select('*')
        .eq('vendor_type', vendorType)
        .order('success_rate', { ascending: false })
        .limit(5);

      if (error) {
        console.error(
          '[VendorJourneySpecialist] Failed to load database patterns:',
          error,
        );
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(
        '[VendorJourneySpecialist] Database patterns error:',
        error,
      );
      return [];
    }
  }

  /**
   * Optimize nodes with industry knowledge
   */
  private async optimizeNodesWithIndustryKnowledge(
    nodes: any[],
    vendorContext: VendorContext,
    serviceLevel: string,
  ): Promise<any[]> {
    return nodes.map((node) => {
      const relevantTouchpoint = vendorContext.criticalTouchpoints.find(
        (tp) =>
          tp.name.toLowerCase().includes(node.name?.toLowerCase() || '') ||
          tp.category === node.category,
      );

      if (relevantTouchpoint) {
        return {
          ...node,
          vendor_specific_data: {
            ...node.vendor_specific_data,
            industry_best_practice: true,
            recommended_channel: relevantTouchpoint.channel,
            compliance_level: relevantTouchpoint.required
              ? 'required'
              : 'optional',
          },
        };
      }

      return node;
    });
  }

  /**
   * Validate industry compliance
   */
  private validateIndustryCompliance(
    nodes: any[],
    requirements: string[],
  ): string[] {
    const compliance: string[] = [];

    for (const requirement of requirements) {
      const hasCompliantNode = nodes.some(
        (node) =>
          node.vendor_specific_data?.compliance_required ||
          node.content?.description
            ?.toLowerCase()
            .includes(requirement.toLowerCase()),
      );

      if (hasCompliantNode) {
        compliance.push(`✅ ${requirement} - Compliant`);
      } else {
        compliance.push(`⚠️ ${requirement} - Needs attention`);
      }
    }

    return compliance;
  }

  /**
   * Perform comprehensive quality assurance
   */
  private performQualityAssurance(nodes: any[], request: any): QualityCheck[] {
    const checks: QualityCheck[] = [];

    // Check timing sequence
    const sortedNodes = [...nodes].sort(
      (a, b) => a.timing.days_from_booking - b.timing.days_from_booking,
    );
    const hasLogicalSequence = sortedNodes.every(
      (node, index) =>
        index === 0 ||
        node.timing.days_from_booking >=
          sortedNodes[index - 1].timing.days_from_booking,
    );

    checks.push({
      check: 'Timing Sequence Logic',
      status: hasLogicalSequence ? 'passed' : 'failed',
      recommendation: hasLogicalSequence
        ? undefined
        : 'Reorder nodes by timing for logical progression',
    });

    // Check required touchpoints
    const vendorContext = this.vendorPatterns[request.vendorType];
    const requiredTouchpoints =
      vendorContext?.criticalTouchpoints.filter((tp) => tp.required) || [];
    const missingRequired = requiredTouchpoints.filter(
      (rtp) =>
        !nodes.some(
          (node) =>
            node.category === rtp.category ||
            node.name?.toLowerCase().includes(rtp.name.toLowerCase()),
        ),
    );

    checks.push({
      check: 'Required Touchpoints Coverage',
      status: missingRequired.length === 0 ? 'passed' : 'warning',
      recommendation:
        missingRequired.length > 0
          ? `Missing required touchpoints: ${missingRequired.map((t) => t.name).join(', ')}`
          : undefined,
    });

    // Check communication frequency
    const communicationNodes = nodes.filter((n) =>
      ['email', 'sms', 'phone'].includes(n.type),
    );
    const avgDaysBetweenComm =
      nodes.length > 1
        ? (sortedNodes[sortedNodes.length - 1].timing.days_from_booking -
            sortedNodes[0].timing.days_from_booking) /
          communicationNodes.length
        : 0;

    checks.push({
      check: 'Communication Frequency',
      status:
        avgDaysBetweenComm <= 14 && avgDaysBetweenComm >= 3
          ? 'passed'
          : 'warning',
      recommendation:
        avgDaysBetweenComm > 14
          ? 'Consider more frequent communication for better engagement'
          : avgDaysBetweenComm < 3
            ? 'Communication may be too frequent - consider spacing out touchpoints'
            : undefined,
    });

    return checks;
  }
}

// Export singleton instance
export const vendorJourneySpecialist = new VendorJourneySpecialist();
