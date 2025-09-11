// WS-232: Resource Planning Predictor
// Team E - Platform Operations Focus
// AI-powered resource planning and capacity optimization for wedding suppliers

import { createSupabaseClient } from '@/lib/supabase';

interface ResourceFeatures {
  // Current resource state
  current_staff_count: number;
  equipment_inventory_count: number;
  venue_capacity: number;
  service_hours_per_wedding: number;

  // Historical demand patterns
  bookings_trend_3month: number;
  seasonal_booking_multiplier: number;
  peak_season_overlap_factor: number;
  weekend_concentration_ratio: number;

  // Service complexity metrics
  average_wedding_size: number;
  service_complexity_score: number;
  travel_time_avg_minutes: number;
  setup_teardown_time_hours: number;

  // Operational efficiency
  staff_productivity_score: number;
  equipment_utilization_rate: number;
  overtime_frequency: number;
  subcontractor_dependency: number;

  // Growth and market factors
  inquiry_volume_growth: number;
  market_expansion_planned: boolean;
  new_service_additions_planned: number;
  competitive_pressure_score: number;
}

export interface ResourcePlan {
  supplier_id: string;
  planning_horizon_months: number;
  resource_recommendations: ResourceRecommendation[];
  capacity_forecast: CapacityForecast;
  optimization_opportunities: OptimizationOpportunity[];
  investment_requirements: InvestmentRequirement[];
  risk_mitigation_strategies: ResourceRisk[];
  seasonal_adjustments: SeasonalAdjustment[];
  performance_metrics: ResourceMetrics;
  plan_date: Date;
  model_version: string;
  inference_time_ms: number;
}

export interface ResourceRecommendation {
  resource_type:
    | 'staff'
    | 'equipment'
    | 'vehicle'
    | 'venue_space'
    | 'technology'
    | 'inventory';
  current_quantity: number;
  recommended_quantity: number;
  change_required: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  implementation_timeline_months: number;
  cost_estimate: number;
  roi_projection: {
    payback_months: number;
    revenue_impact: number;
    efficiency_gain_percentage: number;
  };
  justification: string;
  alternative_solutions: string[];
}

export interface CapacityForecast {
  current_monthly_capacity: number;
  forecasted_demand_by_month: MonthlyCapacity[];
  capacity_utilization_trend: number[];
  bottleneck_periods: BottleneckPeriod[];
  overflow_management_strategy: string[];
}

export interface MonthlyCapacity {
  month: number;
  year: number;
  expected_bookings: number;
  capacity_requirement: number;
  utilization_percentage: number;
  resource_gaps: ResourceGap[];
  seasonal_notes: string;
}

export interface ResourceGap {
  resource_type: string;
  shortage_amount: number;
  impact_severity: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  temporary_solutions: string[];
}

export interface BottleneckPeriod {
  start_date: Date;
  end_date: Date;
  constraint_type: 'staff' | 'equipment' | 'venue' | 'logistics';
  severity_score: number;
  booking_capacity_loss: number;
  mitigation_options: string[];
}

export interface OptimizationOpportunity {
  opportunity_type:
    | 'cross_training'
    | 'equipment_sharing'
    | 'process_automation'
    | 'workflow_optimization'
    | 'technology_upgrade'
    | 'partnership';
  potential_savings: number;
  efficiency_improvement: number;
  implementation_effort: 'low' | 'medium' | 'high';
  success_probability: number;
  description: string;
  implementation_steps: string[];
}

export interface InvestmentRequirement {
  investment_type:
    | 'staff_hiring'
    | 'equipment_purchase'
    | 'technology_upgrade'
    | 'facility_expansion'
    | 'training_program'
    | 'system_integration';
  total_investment: number;
  timeline_months: number;
  financing_options: string[];
  break_even_months: number;
  risk_factors: string[];
  alternatives: Alternative[];
}

export interface Alternative {
  description: string;
  cost_difference: number;
  pros: string[];
  cons: string[];
  implementation_complexity: 'low' | 'medium' | 'high';
}

export interface ResourceRisk {
  risk_type:
    | 'staff_turnover'
    | 'equipment_failure'
    | 'demand_volatility'
    | 'supplier_disruption'
    | 'seasonal_imbalance'
    | 'skill_shortage';
  probability: number;
  potential_impact: number;
  early_warning_indicators: string[];
  contingency_plans: string[];
  monitoring_frequency: 'daily' | 'weekly' | 'monthly';
}

export interface SeasonalAdjustment {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  capacity_multiplier: number;
  staff_adjustments: StaffAdjustment[];
  equipment_needs: EquipmentAdjustment[];
  cost_impact: number;
}

export interface StaffAdjustment {
  role: 'photographer' | 'assistant' | 'coordinator' | 'editor' | 'admin';
  current_count: number;
  seasonal_need: number;
  adjustment_type:
    | 'hire_temp'
    | 'increase_hours'
    | 'contractor'
    | 'cross_train';
  cost_per_month: number;
}

export interface EquipmentAdjustment {
  equipment_type:
    | 'camera_gear'
    | 'lighting'
    | 'audio'
    | 'transportation'
    | 'backup_equipment';
  utilization_increase: number;
  additional_units_needed: number;
  rental_vs_purchase_recommendation: 'rent' | 'purchase' | 'lease';
  cost_estimate: number;
}

export interface ResourceMetrics {
  capacity_utilization_target: number;
  staff_productivity_benchmark: number;
  equipment_roi_target: number;
  customer_satisfaction_threshold: number;
  profit_margin_target: number;
  growth_sustainability_score: number;
}

export class ResourcePlanner {
  private supabase = createSupabaseClient();
  private modelVersion = '1.0.0';
  private cache = new Map<string, { plan: ResourcePlan; timestamp: number }>();
  private cacheTTL = 2 * 60 * 60 * 1000; // 2 hours

  /**
   * Generate comprehensive resource plan for a supplier
   */
  async planResources(
    supplierId: string,
    planningHorizonMonths: number = 12,
  ): Promise<ResourcePlan> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = `${supplierId}_${planningHorizonMonths}`;
      const cached = this.getCachedPlan(cacheKey);
      if (cached) return cached;

      // Extract resource planning features
      const features = await this.extractResourceFeatures(supplierId);

      // Forecast capacity needs
      const capacityForecast = await this.forecastCapacity(
        features,
        planningHorizonMonths,
      );

      // Generate resource recommendations
      const recommendations = await this.generateResourceRecommendations(
        features,
        capacityForecast,
      );

      // Identify optimization opportunities
      const optimizations = this.identifyOptimizationOpportunities(features);

      // Calculate investment requirements
      const investments = this.calculateInvestmentRequirements(recommendations);

      // Assess resource risks
      const risks = this.assessResourceRisks(features, capacityForecast);

      // Generate seasonal adjustments
      const seasonalAdjustments = this.generateSeasonalAdjustments(features);

      // Define performance metrics
      const metrics = this.definePerformanceMetrics(features);

      const plan: ResourcePlan = {
        supplier_id: supplierId,
        planning_horizon_months: planningHorizonMonths,
        resource_recommendations: recommendations,
        capacity_forecast: capacityForecast,
        optimization_opportunities: optimizations,
        investment_requirements: investments,
        risk_mitigation_strategies: risks,
        seasonal_adjustments: seasonalAdjustments,
        performance_metrics: metrics,
        plan_date: new Date(),
        model_version: this.modelVersion,
        inference_time_ms: performance.now() - startTime,
      };

      // Cache the result
      this.setCachedPlan(cacheKey, plan);

      return plan;
    } catch (error) {
      console.error('Resource planning failed:', error);
      throw error;
    }
  }

  /**
   * Batch resource planning for multiple suppliers
   */
  async batchPlanResources(
    supplierIds: string[],
    planningHorizonMonths: number = 12,
  ): Promise<ResourcePlan[]> {
    const batchSize = 15;
    const results: ResourcePlan[] = [];

    for (let i = 0; i < supplierIds.length; i += batchSize) {
      const batch = supplierIds.slice(i, i + batchSize);
      const batchPromises = batch.map((id) =>
        this.planResources(id, planningHorizonMonths),
      );
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(
            `Resource planning failed for supplier ${batch[index]}:`,
            result.reason,
          );
        }
      });
    }

    return results;
  }

  /**
   * Extract resource planning features from supplier data
   */
  private async extractResourceFeatures(
    supplierId: string,
  ): Promise<ResourceFeatures> {
    // Fetch supplier operational data
    const { data: supplier, error: supplierError } = await this.supabase
      .from('organizations')
      .select(
        `
        id, subscription_tier, team_size, total_bookings, 
        average_booking_value, capacity_utilization
      `,
      )
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Supplier data not found: ${supplierError?.message}`);
    }

    // Fetch recent booking patterns
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('created_at, wedding_date, guest_count, total_amount, status')
      .eq('organization_id', supplierId)
      .gte(
        'created_at',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: true });

    const bookingsData = bookings || [];
    const currentMonth = new Date().getMonth();

    return {
      // Current resource state
      current_staff_count: supplier.team_size || 3,
      equipment_inventory_count: 25, // Placeholder - would track actual equipment
      venue_capacity: 150, // Placeholder - if applicable
      service_hours_per_wedding: 8,

      // Historical demand patterns
      bookings_trend_3month: this.calculateBookingsTrend(bookingsData, 3),
      seasonal_booking_multiplier:
        this.calculateSeasonalMultiplier(currentMonth),
      peak_season_overlap_factor: this.calculatePeakOverlap(bookingsData),
      weekend_concentration_ratio: this.calculateWeekendRatio(bookingsData),

      // Service complexity metrics
      average_wedding_size: this.calculateAverageWeddingSize(bookingsData),
      service_complexity_score: this.calculateComplexityScore(bookingsData),
      travel_time_avg_minutes: 45, // Placeholder - would track actual travel data
      setup_teardown_time_hours: 3,

      // Operational efficiency
      staff_productivity_score: this.calculateProductivityScore(
        supplier,
        bookingsData,
      ),
      equipment_utilization_rate: 0.75, // Placeholder
      overtime_frequency: 0.15, // Placeholder
      subcontractor_dependency: 0.25, // Placeholder

      // Growth and market factors
      inquiry_volume_growth: this.calculateInquiryGrowth(bookingsData),
      market_expansion_planned: false, // Would come from business settings
      new_service_additions_planned: 0, // Would come from business settings
      competitive_pressure_score: 0.6, // Placeholder - market analysis
    };
  }

  /**
   * Forecast capacity needs over planning horizon
   */
  private async forecastCapacity(
    features: ResourceFeatures,
    horizonMonths: number,
  ): Promise<CapacityForecast> {
    const currentDate = new Date();
    const monthlyCapacity: MonthlyCapacity[] = [];
    const utilizationTrend: number[] = [];
    const bottlenecks: BottleneckPeriod[] = [];

    // Generate monthly forecasts
    for (let month = 0; month < horizonMonths; month++) {
      const forecastDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + month,
        1,
      );
      const seasonalFactor = this.calculateSeasonalMultiplier(
        forecastDate.getMonth(),
      );
      const trendFactor = Math.pow(
        1 + features.bookings_trend_3month / 12,
        month,
      );

      const expectedBookings = Math.round(
        features.current_staff_count *
          4 * // Base capacity: 4 weddings per staff per month
          seasonalFactor *
          trendFactor *
          features.weekend_concentration_ratio,
      );

      const capacityRequirement =
        expectedBookings * features.service_hours_per_wedding;
      const baseCapacity = features.current_staff_count * 160; // 160 hours per month per staff
      const utilizationPercentage = (capacityRequirement / baseCapacity) * 100;

      utilizationTrend.push(utilizationPercentage);

      // Identify resource gaps
      const gaps: ResourceGap[] = [];
      if (utilizationPercentage > 85) {
        gaps.push({
          resource_type: 'staff',
          shortage_amount: Math.ceil((utilizationPercentage - 85) / 20), // Additional staff needed
          impact_severity: utilizationPercentage > 110 ? 'critical' : 'high',
          recommended_action: 'Hire additional staff or contractors',
          temporary_solutions: [
            'Outsource editing',
            'Partner with other photographers',
            'Extend working hours',
          ],
        });
      }

      // Identify bottleneck periods
      if (utilizationPercentage > 95) {
        bottlenecks.push({
          start_date: forecastDate,
          end_date: new Date(
            forecastDate.getFullYear(),
            forecastDate.getMonth() + 1,
            0,
          ),
          constraint_type: 'staff',
          severity_score: Math.min(10, utilizationPercentage / 10),
          booking_capacity_loss: Math.max(
            0,
            expectedBookings -
              Math.floor(baseCapacity / features.service_hours_per_wedding),
          ),
          mitigation_options: [
            'Hire temporary staff',
            'Increase staff hours',
            'Implement efficiency improvements',
            'Partner with other suppliers',
          ],
        });
      }

      monthlyCapacity.push({
        month: forecastDate.getMonth(),
        year: forecastDate.getFullYear(),
        expected_bookings: expectedBookings,
        capacity_requirement: capacityRequirement,
        utilization_percentage: Math.round(utilizationPercentage),
        resource_gaps: gaps,
        seasonal_notes:
          seasonalFactor > 1.2
            ? 'Peak wedding season'
            : seasonalFactor < 0.8
              ? 'Off-season period'
              : 'Regular season',
      });
    }

    return {
      current_monthly_capacity: features.current_staff_count * 4, // Weddings per month
      forecasted_demand_by_month: monthlyCapacity,
      capacity_utilization_trend: utilizationTrend,
      bottleneck_periods: bottlenecks,
      overflow_management_strategy: [
        'Establish network of trusted contractor photographers',
        'Implement advanced booking system with capacity alerts',
        'Develop premium rush service pricing',
        'Create partnership agreements for capacity sharing',
      ],
    };
  }

  /**
   * Generate specific resource recommendations
   */
  private async generateResourceRecommendations(
    features: ResourceFeatures,
    capacityForecast: CapacityForecast,
  ): Promise<ResourceRecommendation[]> {
    const recommendations: ResourceRecommendation[] = [];

    // Staff recommendations
    const avgUtilization =
      capacityForecast.capacity_utilization_trend.reduce((a, b) => a + b, 0) /
      capacityForecast.capacity_utilization_trend.length;

    if (avgUtilization > 80) {
      const additionalStaffNeeded = Math.ceil((avgUtilization - 80) / 20);
      recommendations.push({
        resource_type: 'staff',
        current_quantity: features.current_staff_count,
        recommended_quantity:
          features.current_staff_count + additionalStaffNeeded,
        change_required: additionalStaffNeeded,
        priority: avgUtilization > 95 ? 'critical' : 'high',
        implementation_timeline_months: 2,
        cost_estimate: additionalStaffNeeded * 50000, // Annual salary estimate
        roi_projection: {
          payback_months: 6,
          revenue_impact: additionalStaffNeeded * 80000, // Revenue per photographer
          efficiency_gain_percentage: 25,
        },
        justification: `Current capacity utilization of ${avgUtilization.toFixed(0)}% requires additional staff to maintain service quality`,
        alternative_solutions: [
          'Hire contract photographers for peak periods',
          'Implement photography assistant program',
          'Partner with other photography businesses',
        ],
      });
    }

    // Equipment recommendations
    if (features.equipment_utilization_rate > 0.85) {
      recommendations.push({
        resource_type: 'equipment',
        current_quantity: features.equipment_inventory_count,
        recommended_quantity: Math.ceil(
          features.equipment_inventory_count * 1.2,
        ),
        change_required: Math.ceil(features.equipment_inventory_count * 0.2),
        priority: 'medium',
        implementation_timeline_months: 1,
        cost_estimate: 15000, // Camera equipment estimate
        roi_projection: {
          payback_months: 8,
          revenue_impact: 30000,
          efficiency_gain_percentage: 15,
        },
        justification:
          'High equipment utilization requires backup gear and expansion for growth',
        alternative_solutions: [
          'Equipment rental for peak periods',
          'Equipment sharing partnerships',
          'Leasing programs for expensive gear',
        ],
      });
    }

    // Technology recommendations
    if (features.staff_productivity_score < 0.7) {
      recommendations.push({
        resource_type: 'technology',
        current_quantity: 1,
        recommended_quantity: 1,
        change_required: 0,
        priority: 'medium',
        implementation_timeline_months: 3,
        cost_estimate: 8000, // Software and workflow tools
        roi_projection: {
          payback_months: 10,
          revenue_impact: 20000,
          efficiency_gain_percentage: 30,
        },
        justification:
          'Low productivity score indicates need for workflow automation and management tools',
        alternative_solutions: [
          'Staff training programs',
          'Process optimization consulting',
          'Gradual tool implementation',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Identify operational optimization opportunities
   */
  private identifyOptimizationOpportunities(
    features: ResourceFeatures,
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Cross-training opportunity
    if (
      features.staff_productivity_score < 0.8 &&
      features.current_staff_count > 2
    ) {
      opportunities.push({
        opportunity_type: 'cross_training',
        potential_savings: 12000,
        efficiency_improvement: 25,
        implementation_effort: 'medium',
        success_probability: 0.85,
        description:
          'Cross-train staff in multiple roles to improve flexibility and reduce bottlenecks',
        implementation_steps: [
          'Assess current skill gaps',
          'Develop training curriculum',
          'Implement mentorship program',
          'Create skill-based scheduling system',
        ],
      });
    }

    // Workflow optimization
    if (features.service_hours_per_wedding > 10) {
      opportunities.push({
        opportunity_type: 'workflow_optimization',
        potential_savings: 15000,
        efficiency_improvement: 20,
        implementation_effort: 'high',
        success_probability: 0.75,
        description:
          'Streamline wedding day processes to reduce time per event',
        implementation_steps: [
          'Time-motion study of current processes',
          'Implement standardized workflows',
          'Invest in efficiency tools',
          'Train team on optimized procedures',
        ],
      });
    }

    // Technology automation
    opportunities.push({
      opportunity_type: 'process_automation',
      potential_savings: 18000,
      efficiency_improvement: 35,
      implementation_effort: 'medium',
      success_probability: 0.9,
      description: 'Automate administrative tasks and photo editing workflows',
      implementation_steps: [
        'Implement CRM automation',
        'Deploy photo editing software with AI assistance',
        'Automate client communication workflows',
        'Create automated backup and delivery systems',
      ],
    });

    return opportunities;
  }

  /**
   * Calculate investment requirements for recommendations
   */
  private calculateInvestmentRequirements(
    recommendations: ResourceRecommendation[],
  ): InvestmentRequirement[] {
    const investments: InvestmentRequirement[] = [];

    recommendations.forEach((rec) => {
      if (rec.cost_estimate > 5000) {
        // Only track significant investments
        investments.push({
          investment_type:
            rec.resource_type === 'staff'
              ? 'staff_hiring'
              : rec.resource_type === 'equipment'
                ? 'equipment_purchase'
                : 'technology_upgrade',
          total_investment: rec.cost_estimate,
          timeline_months: rec.implementation_timeline_months,
          financing_options: [
            'Business loan',
            'Equipment financing',
            'Lease-to-own programs',
            'Revenue-based financing',
          ],
          break_even_months: rec.roi_projection.payback_months,
          risk_factors: [
            'Market demand fluctuation',
            'Competition response',
            'Economic conditions',
            'Technology obsolescence',
          ],
          alternatives: [
            {
              description: 'Gradual implementation over longer timeline',
              cost_difference: -rec.cost_estimate * 0.2,
              pros: [
                'Lower upfront cost',
                'Reduced financial risk',
                'Learning opportunity',
              ],
              cons: [
                'Delayed benefits',
                'Potential opportunity cost',
                'Longer ROI timeline',
              ],
              implementation_complexity: 'low',
            },
            {
              description: 'Partnership or outsourcing approach',
              cost_difference: -rec.cost_estimate * 0.4,
              pros: ['Much lower cost', 'Flexibility', 'Shared risk'],
              cons: [
                'Less control',
                'Dependency on partners',
                'Potential quality issues',
              ],
              implementation_complexity: 'medium',
            },
          ],
        });
      }
    });

    return investments;
  }

  /**
   * Assess resource-related risks
   */
  private assessResourceRisks(
    features: ResourceFeatures,
    forecast: CapacityForecast,
  ): ResourceRisk[] {
    const risks: ResourceRisk[] = [];

    // Staff turnover risk
    if (features.current_staff_count < 5) {
      // Small teams more vulnerable
      risks.push({
        risk_type: 'staff_turnover',
        probability: 0.3,
        potential_impact: 50000, // Lost revenue and replacement costs
        early_warning_indicators: [
          'Decreased staff satisfaction scores',
          'Increased overtime frequency',
          'Staff expressing interest in other opportunities',
        ],
        contingency_plans: [
          'Maintain updated contractor database',
          'Implement knowledge sharing systems',
          'Cross-train multiple staff in critical roles',
          'Competitive compensation review',
        ],
        monitoring_frequency: 'monthly',
      });
    }

    // Demand volatility risk
    const utilizationVariance = this.calculateVariance(
      forecast.capacity_utilization_trend,
    );
    if (utilizationVariance > 400) {
      // High variance in utilization
      risks.push({
        risk_type: 'demand_volatility',
        probability: 0.6,
        potential_impact: 25000,
        early_warning_indicators: [
          'Booking inquiry patterns changing',
          'Seasonal variations increasing',
          'Market economic indicators shifting',
        ],
        contingency_plans: [
          'Flexible staffing arrangements',
          'Diversified service offerings',
          'Financial reserves for slow periods',
          'Alternative revenue streams',
        ],
        monitoring_frequency: 'weekly',
      });
    }

    // Equipment failure risk
    risks.push({
      risk_type: 'equipment_failure',
      probability: 0.2,
      potential_impact: 15000,
      early_warning_indicators: [
        'Equipment age exceeding recommended lifecycle',
        'Increased maintenance frequency',
        'Technology updates required',
      ],
      contingency_plans: [
        'Maintain redundant backup equipment',
        'Equipment rental partnerships',
        'Rapid replacement procedures',
        'Insurance coverage for equipment',
      ],
      monitoring_frequency: 'monthly',
    });

    return risks;
  }

  /**
   * Generate seasonal resource adjustments
   */
  private generateSeasonalAdjustments(
    features: ResourceFeatures,
  ): SeasonalAdjustment[] {
    const adjustments: SeasonalAdjustment[] = [
      {
        season: 'spring',
        capacity_multiplier: 1.2,
        staff_adjustments: [
          {
            role: 'photographer',
            current_count: Math.floor(features.current_staff_count * 0.6),
            seasonal_need: Math.ceil(features.current_staff_count * 0.7),
            adjustment_type: 'hire_temp',
            cost_per_month: 4000,
          },
        ],
        equipment_needs: [
          {
            equipment_type: 'camera_gear',
            utilization_increase: 20,
            additional_units_needed: 2,
            rental_vs_purchase_recommendation: 'rent',
            cost_estimate: 800,
          },
        ],
        cost_impact: 4800,
      },
      {
        season: 'summer',
        capacity_multiplier: 1.5,
        staff_adjustments: [
          {
            role: 'photographer',
            current_count: Math.floor(features.current_staff_count * 0.6),
            seasonal_need: Math.ceil(features.current_staff_count * 0.9),
            adjustment_type: 'contractor',
            cost_per_month: 6000,
          },
        ],
        equipment_needs: [
          {
            equipment_type: 'camera_gear',
            utilization_increase: 35,
            additional_units_needed: 3,
            rental_vs_purchase_recommendation: 'rent',
            cost_estimate: 1200,
          },
        ],
        cost_impact: 7200,
      },
      {
        season: 'fall',
        capacity_multiplier: 1.1,
        staff_adjustments: [
          {
            role: 'photographer',
            current_count: Math.floor(features.current_staff_count * 0.6),
            seasonal_need: features.current_staff_count,
            adjustment_type: 'increase_hours',
            cost_per_month: 2000,
          },
        ],
        equipment_needs: [
          {
            equipment_type: 'lighting',
            utilization_increase: 15,
            additional_units_needed: 1,
            rental_vs_purchase_recommendation: 'rent',
            cost_estimate: 400,
          },
        ],
        cost_impact: 2400,
      },
      {
        season: 'winter',
        capacity_multiplier: 0.7,
        staff_adjustments: [
          {
            role: 'photographer',
            current_count: Math.floor(features.current_staff_count * 0.6),
            seasonal_need: Math.floor(features.current_staff_count * 0.5),
            adjustment_type: 'cross_train',
            cost_per_month: 500,
          },
        ],
        equipment_needs: [
          {
            equipment_type: 'camera_gear',
            utilization_increase: -20,
            additional_units_needed: 0,
            rental_vs_purchase_recommendation: 'rent',
            cost_estimate: 0,
          },
        ],
        cost_impact: 500,
      },
    ];

    return adjustments;
  }

  /**
   * Define performance metrics for resource management
   */
  private definePerformanceMetrics(
    features: ResourceFeatures,
  ): ResourceMetrics {
    return {
      capacity_utilization_target: 75, // Optimal utilization percentage
      staff_productivity_benchmark: Math.max(
        0.8,
        features.staff_productivity_score * 1.1,
      ),
      equipment_roi_target: 25, // Percentage annual return
      customer_satisfaction_threshold: 4.5, // Out of 5.0
      profit_margin_target: Math.max(
        30,
        features.current_staff_count > 3 ? 35 : 25,
      ),
      growth_sustainability_score: 8.0, // Out of 10.0
    };
  }

  /**
   * Helper calculation methods
   */
  private calculateBookingsTrend(bookings: any[], months: number): number {
    if (!bookings || bookings.length < 10) return 0.05; // Default growth

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const recentBookings = bookings.filter(
      (b) => new Date(b.created_at) >= cutoffDate,
    ).length;

    const previousPeriodStart = new Date(cutoffDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - months);

    const previousBookings = bookings.filter((b) => {
      const date = new Date(b.created_at);
      return date >= previousPeriodStart && date < cutoffDate;
    }).length;

    if (previousBookings === 0) return 0.1;
    return (recentBookings - previousBookings) / previousBookings;
  }

  private calculateSeasonalMultiplier(month: number): number {
    const seasonalMap: Record<number, number> = {
      0: 0.7,
      1: 0.8,
      2: 0.9,
      3: 1.1,
      4: 1.3,
      5: 1.4,
      6: 1.5,
      7: 1.4,
      8: 1.3,
      9: 1.2,
      10: 1.0,
      11: 0.8,
    };
    return seasonalMap[month] || 1.0;
  }

  private calculatePeakOverlap(bookings: any[]): number {
    // Calculate how many bookings overlap in peak periods
    // Simplified implementation
    return 1.2; // Placeholder
  }

  private calculateWeekendRatio(bookings: any[]): number {
    if (!bookings || bookings.length === 0) return 0.85; // Default weekend concentration

    const weekendBookings = bookings.filter((b) => {
      const weddingDate = new Date(b.wedding_date);
      const dayOfWeek = weddingDate.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }).length;

    return Math.max(0.7, weekendBookings / bookings.length);
  }

  private calculateAverageWeddingSize(bookings: any[]): number {
    if (!bookings || bookings.length === 0) return 120; // Default size

    const totalGuests = bookings.reduce(
      (sum, b) => sum + (b.guest_count || 120),
      0,
    );
    return totalGuests / bookings.length;
  }

  private calculateComplexityScore(bookings: any[]): number {
    // Score based on booking value, guest count, etc.
    if (!bookings || bookings.length === 0) return 0.7;

    const avgValue =
      bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) /
      bookings.length;
    const avgGuests = this.calculateAverageWeddingSize(bookings);

    let complexity = 0.5;
    if (avgValue > 5000) complexity += 0.2;
    if (avgGuests > 150) complexity += 0.2;

    return Math.min(1.0, complexity);
  }

  private calculateProductivityScore(supplier: any, bookings: any[]): number {
    if (!bookings || bookings.length === 0) return 0.7;

    const bookingsPerStaff = bookings.length / (supplier.team_size || 1) / 12; // Per month
    const revenuePerStaff =
      (supplier.total_revenue || 0) / (supplier.team_size || 1);

    let score = 0.5;
    if (bookingsPerStaff > 3) score += 0.2;
    if (revenuePerStaff > 60000) score += 0.2;

    return Math.min(1.0, score);
  }

  private calculateInquiryGrowth(bookings: any[]): number {
    return this.calculateBookingsTrend(bookings, 6); // 6-month growth
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length < 2) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Cache management
   */
  private getCachedPlan(key: string): ResourcePlan | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.plan;
    }
    return null;
  }

  private setCachedPlan(key: string, plan: ResourcePlan): void {
    this.cache.set(key, {
      plan,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.cache.size > 200) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 20);
      oldestKeys.forEach((k) => this.cache.delete(k));
    }
  }
}
