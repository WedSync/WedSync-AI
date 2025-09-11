import { describe, it, expect, beforeEach, afterEach } from 'jest';
import { AICrisisManager } from '@/lib/ai/ai-crisis-manager';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import { CrisisScenarioGenerator } from '@/test-utils/crisis-scenario-generator';
import { CrisisResponseValidator } from '@/test-utils/crisis-response-validator';
import { EmergencyNotificationService } from '@/lib/notifications/emergency-notification-service';

describe('AI Crisis Management Testing', () => {
  let crisisManager: AICrisisManager;
  let optimizationEngine: WeddingOptimizationEngine;
  let scenarioGenerator: CrisisScenarioGenerator;
  let responseValidator: CrisisResponseValidator;
  let notificationService: EmergencyNotificationService;

  // Helper function to validate vendor dietary capabilities (reduces nesting)
  const validateVendorDietaryCapabilities = (vendor: any): void => {
    expect(vendor.dietaryCapabilities).toEqual(
      expect.arrayContaining(['vegetarian', 'gluten_free']),
    );
    expect(vendor.serviceStyles).toContain('buffet');
  };

  // Helper function to validate optimization strategies (reduces nesting)
  const validateOptimizationStrategy = (strategy: any): void => {
    expect(strategy.savings).toBeGreaterThan(0);
    expect(strategy.feasibilityScore).toBeGreaterThan(0.8);
    expect(strategy.implementationTime).toBeLessThan(14); // <2 weeks implementation
  };

  // Helper function to validate creative budget options (reduces nesting)
  const validateCreativeBudgetOption = (option: any): void => {
    expect(option.estimatedCost).toBeLessThanOrEqual(15000);
    expect(option.qualityScore).toBeGreaterThan(0.6); // Still decent quality
    expect(option.feasibilityScore).toBeGreaterThan(0.8);
  };

  // Helper function to validate monthly payments (reduces nesting)
  const validateMonthlyPayment = (payment: any): void => {
    expect(payment.amount).toBeLessThanOrEqual(2000);
  };

  // Helper function to validate vendor coordination (reduces nesting)
  const validateVendorCoordination = (vendor: any): void => {
    expect(vendor.alignmentConfirmed).toBe(true);
    expect(vendor.scheduleCompatible).toBe(true);
    expect(vendor.communicationEstablished).toBe(true);
  };

  beforeEach(async () => {
    crisisManager = new AICrisisManager({ testMode: true });
    optimizationEngine = new WeddingOptimizationEngine({ testMode: true });
    scenarioGenerator = new CrisisScenarioGenerator();
    responseValidator = new CrisisResponseValidator();
    notificationService = new EmergencyNotificationService({ testMode: true });

    await crisisManager.initialize();
    await optimizationEngine.initialize();
    await notificationService.initialize();
  });

  afterEach(async () => {
    await crisisManager.cleanup();
    await optimizationEngine.cleanup();
    await notificationService.cleanup();
  });

  describe('Vendor Cancellation Crisis Management', () => {
    it('should respond to photographer cancellation within 10 seconds', async () => {
      // Arrange
      const photographerCrisis = scenarioGenerator.createVendorCancellation({
        vendorType: 'photography',
        vendorId: 'photographer-elite-123',
        cancellationDate: new Date('2024-05-01'),
        weddingDate: new Date('2024-05-15'), // 14 days notice
        reason: 'medical_emergency',
        severity: 'high',
        weddingDetails: {
          budget: 25000,
          guestCount: 120,
          location: 'London',
          style: 'modern',
        },
      });

      const startTime = Date.now();

      // Act
      const crisisResponse =
        await crisisManager.handleVendorCancellation(photographerCrisis);
      const responseTime = Date.now() - startTime;

      // Assert - Performance requirements
      expect(responseTime).toBeLessThan(10000); // <10 seconds
      expect(crisisResponse.responseTime).toBeLessThan(10000);
      expect(crisisResponse.status).toBe('resolved');

      // Assert - Solution quality
      expect(crisisResponse.alternativeVendors).toHaveLength.greaterThanOrEqual(
        5,
      );
      expect(crisisResponse.solutions).toHaveLength.greaterThanOrEqual(3);
      expect(crisisResponse.emergencyActionPlan).toBeDefined();

      // Validate solution feasibility
      const qualityValidation = await responseValidator.validateCrisisResponse(
        crisisResponse,
        photographerCrisis,
      );
      expect(qualityValidation.feasibilityScore).toBeGreaterThan(0.85);
      expect(qualityValidation.qualityMaintenance).toBeGreaterThan(0.8);
      expect(qualityValidation.timeConstraintsMet).toBe(true);
    });

    it('should handle venue cancellation catastrophe', async () => {
      // This is the worst-case scenario - venue cancellation close to wedding
      const venueCrisis = scenarioGenerator.createVendorCancellation({
        vendorType: 'venue',
        vendorId: 'venue-castle-456',
        cancellationDate: new Date('2024-06-01'),
        weddingDate: new Date('2024-06-08'), // 7 days notice - CATASTROPHIC
        reason: 'building_closure',
        severity: 'critical',
        weddingDetails: {
          budget: 45000,
          guestCount: 180,
          location: 'Cotswolds',
          style: 'luxury',
          nonNegotiableFeatures: ['outdoor_ceremony', 'accommodation_onsite'],
        },
      });

      // Act
      const crisisResponse =
        await crisisManager.handleVendorCancellation(venueCrisis);

      // Assert - Even in catastrophic scenario, should provide solutions
      expect(crisisResponse.status).toBe('critical_response_activated');
      expect(crisisResponse.alternativeVendors).toHaveLength.greaterThanOrEqual(
        3,
      );
      expect(
        crisisResponse.emergencyActionPlan.immediateActions,
      ).toHaveLength.greaterThan(5);
      expect(crisisResponse.specialHandling).toBe(true);

      // Validate human escalation was triggered
      expect(crisisResponse.humanEscalation.triggered).toBe(true);
      expect(crisisResponse.humanEscalation.urgency).toBe('immediate');
      expect(crisisResponse.humanEscalation.weddingPlannerAssigned).toBe(true);

      // Check emergency notifications were sent
      const notifications =
        await notificationService.getEmergencyNotifications();
      expect(
        notifications.some((n) => n.type === 'venue_cancellation_emergency'),
      ).toBe(true);
    });

    it('should prioritize vendors based on crisis urgency and compatibility', async () => {
      const cateringCrisis = scenarioGenerator.createVendorCancellation({
        vendorType: 'catering',
        vendorId: 'catering-deluxe-789',
        cancellationDate: new Date('2024-07-01'),
        weddingDate: new Date('2024-07-20'), // 19 days notice
        reason: 'staff_shortage',
        severity: 'medium',
        weddingDetails: {
          budget: 30000,
          guestCount: 150,
          location: 'Manchester',
          style: 'rustic',
          dietaryRequirements: ['vegetarian', 'gluten_free'],
          serviceStyle: 'buffet',
        },
      });

      const crisisResponse =
        await crisisManager.handleVendorCancellation(cateringCrisis);

      // Assert - Alternative vendors should be perfectly matched
      const alternativeVendors = crisisResponse.alternativeVendors;
      expect(alternativeVendors).toHaveLength.greaterThanOrEqual(5);

      // Check prioritization
      expect(alternativeVendors[0].priorityScore).toBeGreaterThan(0.9);
      expect(alternativeVendors[0].availabilityConfirmed).toBe(true);
      expect(alternativeVendors[0].styleMatch).toBeGreaterThan(0.8);
      expect(alternativeVendors[0].budgetCompatible).toBe(true);

      // Validate dietary requirements are met (refactored to reduce nesting)
      alternativeVendors.forEach(validateVendorDietaryCapabilities);

      // Check rapid response capabilities
      const rapidResponseVendors = alternativeVendors.filter(
        (v) => v.rapidResponse === true,
      );
      expect(rapidResponseVendors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Budget Crisis Management', () => {
    it('should resolve budget shortfall while maintaining wedding quality', async () => {
      const budgetCrisis = scenarioGenerator.createBudgetShortfall({
        originalBudget: 28000,
        availableBudget: 20000, // £8000 shortfall
        shortfallReason: 'unexpected_expenses',
        weddingDate: new Date('2024-08-15'),
        timeRemaining: 90, // days
        nonNegotiableItems: ['venue', 'photography', 'wedding_dress'],
        weddingDetails: {
          guestCount: 120,
          location: 'Edinburgh',
          style: 'classic',
          priorities: ['photography', 'catering', 'music'],
        },
      });

      const startTime = Date.now();
      const budgetResponse =
        await crisisManager.handleBudgetCrisis(budgetCrisis);
      const responseTime = Date.now() - startTime;

      // Assert - Performance
      expect(responseTime).toBeLessThan(8000); // <8 seconds for budget crisis
      expect(budgetResponse.status).toBe('optimized');

      // Assert - Budget optimization
      expect(budgetResponse.totalSavings).toBeGreaterThanOrEqual(8000); // Cover shortfall
      expect(budgetResponse.qualityImpact).toBeLessThan(0.25); // <25% quality reduction
      expect(budgetResponse.nonNegotiableItemsPreserved).toBe(true);

      // Validate optimization strategies (refactored to reduce nesting)
      const strategies = budgetResponse.optimizationStrategies;
      expect(strategies.length).toBeGreaterThan(0);
      strategies.forEach(validateOptimizationStrategy);

      // Check alternative vendor suggestions
      expect(budgetResponse.alternativeVendors.budgetFriendly).toBeDefined();
      expect(
        budgetResponse.alternativeVendors.budgetFriendly.length,
      ).toBeGreaterThan(0);
    });

    it('should handle extreme budget constraints creatively', async () => {
      const extremeBudgetCrisis = scenarioGenerator.createBudgetShortfall({
        originalBudget: 35000,
        availableBudget: 15000, // £20000 shortfall - extreme
        shortfallReason: 'job_loss',
        weddingDate: new Date('2024-09-21'),
        timeRemaining: 120, // days
        flexibilityLevel: 'high', // Couple willing to make significant changes
        weddingDetails: {
          guestCount: 180,
          location: 'Birmingham',
          style: 'modern',
          mustHaveItems: ['venue', 'catering'], // Absolute minimums
        },
      });

      const budgetResponse =
        await crisisManager.handleBudgetCrisis(extremeBudgetCrisis);

      // Assert - Creative solutions for extreme constraints
      expect(budgetResponse.status).toBe('restructured');
      expect(budgetResponse.creativeAlternatives).toBeDefined();
      expect(budgetResponse.creativeAlternatives.length).toBeGreaterThan(3);

      // Check creative solutions
      const creativeOptions = budgetResponse.creativeAlternatives;
      expect(
        creativeOptions.some((opt) => opt.type === 'date_flexibility'),
      ).toBe(true);
      expect(
        creativeOptions.some((opt) => opt.type === 'guest_count_reduction'),
      ).toBe(true);
      expect(
        creativeOptions.some((opt) => opt.type === 'venue_type_change'),
      ).toBe(true);

      // Validate all solutions fit within budget (refactored to reduce nesting)
      creativeOptions.forEach(validateCreativeBudgetOption);
    });

    it('should provide payment plan optimization for budget crises', async () => {
      const paymentCrisis = scenarioGenerator.createBudgetShortfall({
        originalBudget: 25000,
        availableBudget: 25000, // Same total budget
        cashFlowIssue: true, // Can't pay all at once
        immediatelyAvailable: 8000,
        monthlyAvailable: 2000,
        weddingDate: new Date('2024-10-12'),
        timeRemaining: 180, // 6 months
        weddingDetails: {
          guestCount: 100,
          location: 'Bristol',
          style: 'bohemian',
        },
      });

      const paymentResponse =
        await crisisManager.handleBudgetCrisis(paymentCrisis);

      // Assert - Payment plan solutions
      expect(paymentResponse.paymentPlan).toBeDefined();
      expect(paymentResponse.paymentPlan.feasible).toBe(true);
      expect(paymentResponse.paymentPlan.totalCost).toBeLessThanOrEqual(25000);

      // Validate payment schedule
      const schedule = paymentResponse.paymentPlan.schedule;
      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0].amount).toBeLessThanOrEqual(8000); // Initial payment within means

      const monthlyPayments = schedule.filter((p) => p.type === 'monthly');
      monthlyPayments.forEach(validateMonthlyPayment);

      // Check vendor payment flexibility
      expect(paymentResponse.flexibleVendors).toBeDefined();
      expect(paymentResponse.flexibleVendors.length).toBeGreaterThan(3);
    });
  });

  describe('Timeline Crisis Management', () => {
    // Helper function to validate critical wedding tasks (reduces nesting from 5 to 3 levels)
    const validateCriticalWeddingTask = (
      plannedTasks: any[], 
      taskName: string
    ): void => {
      const task = plannedTasks.find((t) => t.name.includes(taskName));
      expect(task).toBeDefined();
      expect(task.priority).toBe('urgent');
      expect(task.feasible).toBe(true);
    };

    // Helper function to validate alternative date properties (reduces nesting)
    const validateAlternativeDate = (alt: any): void => {
      expect(alt.vendorAvailability).toBeGreaterThan(0.8);
      expect(alt.venueAvailability).toBe(true);
      expect(alt.seasonalSuitability).toBeGreaterThan(0.7);
      expect(alt.costImpact).toBeLessThan(0.15); // <15% cost difference
    };

    // Helper function to validate off-peak options (reduces nesting)
    const validateOffPeakOption = (option: any): void => {
      expect(option.potentialSavings).toBeGreaterThan(0);
      expect(option.vendorAvailability).toBeGreaterThan(0.9);
    };

    // Helper function to validate off-peak advantages (reduces nesting from 5 to 4 levels)
    const validateOffPeakAdvantages = (alternatives: any[]): void => {
      const offPeakOptions = alternatives.filter(
        (alt) => alt.peakSeason === false,
      );
      expect(offPeakOptions.length).toBeGreaterThan(0);
      offPeakOptions.forEach(validateOffPeakOption);
    };

    it('should handle last-minute wedding acceleration', async () => {
      const timelineCrisis = scenarioGenerator.createTimelineCrisis({
        originalWeddingDate: new Date('2024-12-15'),
        newWeddingDate: new Date('2024-08-30'), // Moved up 3.5 months
        reason: 'family_medical_emergency',
        currentProgress: 0.3, // Only 30% planned
        severity: 'high',
        weddingDetails: {
          budget: 22000,
          guestCount: 90,
          location: 'Cardiff',
          style: 'intimate',
          criticalTasks: ['venue', 'catering', 'invitations', 'photography'],
        },
      });

      const timelineResponse =
        await crisisManager.handleTimelineCrisis(timelineCrisis);

      // Assert - Fast timeline feasibility
      expect(timelineResponse.status).toBe('accelerated');
      expect(timelineResponse.feasible).toBe(true);
      expect(timelineResponse.acceleratedTimeline).toBeDefined();

      // Check critical path optimization
      const criticalPath = timelineResponse.acceleratedTimeline.criticalPath;
      expect(criticalPath.duration).toBeLessThan(60); // <60 days total
      expect(criticalPath.parallelTasks).toBeGreaterThan(5); // Many tasks in parallel

      // Validate all critical tasks are covered (refactored to reduce nesting)
      const plannedTasks = timelineResponse.acceleratedTimeline.tasks;
      const criticalTaskNames = [
        'venue',
        'catering',
        'invitations',
        'photography',
      ];
      
      // Reduced from 5 to 3 levels: describe → it → helper validation
      criticalTaskNames.forEach((taskName) => 
        validateCriticalWeddingTask(plannedTasks, taskName)
      );

      // Check emergency vendor pool
      expect(timelineResponse.emergencyVendors).toBeDefined();
      expect(timelineResponse.emergencyVendors.rapidResponse).toBe(true);
    });

    it('should manage seasonal availability crises', async () => {
      const seasonalCrisis = scenarioGenerator.createTimelineCrisis({
        originalWeddingDate: new Date('2024-06-15'), // Peak wedding season
        flexibility: 'limited',
        availabilityIssues: {
          venues: 'extremely_limited',
          photographers: 'limited',
          florists: 'limited',
        },
        reason: 'seasonal_booking_conflict',
        weddingDetails: {
          budget: 35000,
          guestCount: 150,
          location: 'Lake_District',
          style: 'outdoor',
          seasonalRequirements: ['outdoor_ceremony', 'garden_reception'],
        },
      });

      const seasonalResponse =
        await crisisManager.handleTimelineCrisis(seasonalCrisis);

      // Assert - Seasonal optimization
      expect(seasonalResponse.status).toBe('seasonally_optimized');
      expect(seasonalResponse.alternativeDates).toBeDefined();
      expect(seasonalResponse.alternativeDates.length).toBeGreaterThan(3);

      // Validate alternative dates (refactored to reduce nesting)
      const alternatives = seasonalResponse.alternativeDates;
      alternatives.forEach(validateAlternativeDate);

      // Check off-peak advantages (refactored to reduce nesting from 5 to 4 levels)
      validateOffPeakAdvantages(alternatives);
    });
  });

  describe('Multi-Crisis Scenarios', () => {
    it('should handle compound crisis: vendor cancellation + budget shortfall', async () => {
      const compoundCrisis = scenarioGenerator.createCompoundCrisis({
        primaryCrisis: {
          type: 'vendor_cancellation',
          vendorType: 'catering',
          cancellationDate: new Date('2024-05-10'),
          weddingDate: new Date('2024-05-25'), // 15 days
        },
        secondaryCrisis: {
          type: 'budget_shortfall',
          shortfall: 5000,
          reason: 'vendor_cancellation_penalty',
        },
        weddingDetails: {
          budget: 28000,
          guestCount: 130,
          location: 'Newcastle',
          style: 'traditional',
        },
      });

      const compoundResponse =
        await crisisManager.handleCompoundCrisis(compoundCrisis);

      // Assert - Compound crisis handling
      expect(compoundResponse.status).toBe('compound_resolved');
      expect(compoundResponse.primarySolution).toBeDefined();
      expect(compoundResponse.secondarySolution).toBeDefined();
      expect(compoundResponse.integratedSolution).toBeDefined();

      // Validate integrated approach
      const integrated = compoundResponse.integratedSolution;
      expect(integrated.totalCostImpact).toBeLessThan(5000); // Minimize financial impact
      expect(integrated.qualityMaintained).toBeGreaterThan(0.8);
      expect(integrated.feasibilityScore).toBeGreaterThan(0.85);

      // Check crisis precedence handling
      expect(compoundResponse.criticalPath.prioritizedActions).toBeDefined();
      expect(compoundResponse.criticalPath.parallelActions).toBeDefined();
    });

    it('should manage triple crisis: vendor + budget + timeline', async () => {
      const tripleCrisis = scenarioGenerator.createTripleCrisis({
        vendorCrisis: {
          type: 'venue_cancellation',
          cancellationDate: new Date('2024-04-15'),
        },
        budgetCrisis: {
          shortfall: 8000,
          reason: 'venue_penalty_fees',
        },
        timelineCrisis: {
          weddingDate: new Date('2024-04-30'), // 15 days
          accelerated: true,
        },
        weddingDetails: {
          budget: 32000,
          guestCount: 160,
          location: 'Oxford',
          style: 'luxury',
        },
      });

      const tripleResponse =
        await crisisManager.handleTripleCrisis(tripleCrisis);

      // Assert - Ultimate crisis management
      expect(tripleResponse.status).toBe('emergency_optimization');
      expect(tripleResponse.emergencyProtocol.activated).toBe(true);
      expect(tripleResponse.humanBackupActivated).toBe(true);

      // Validate emergency response
      const emergency = tripleResponse.emergencyProtocol;
      expect(emergency.responseTime).toBeLessThan(5000); // <5 seconds for emergency
      expect(emergency.solutionQuality).toBeGreaterThan(0.7); // Still good quality
      expect(emergency.implementationFeasible).toBe(true);

      // Check escalation procedures
      expect(tripleResponse.escalation.level).toBe('critical');
      expect(tripleResponse.escalation.teamAssigned).toBe(true);
      expect(tripleResponse.escalation.priorityOverride).toBe(true);
    });
  });

  describe('Crisis Prevention and Early Warning', () => {
    it('should detect potential crises before they occur', async () => {
      const weddingData = {
        weddingDate: new Date('2024-07-15'),
        currentDate: new Date('2024-06-01'), // 6 weeks out
        vendors: [
          {
            id: 'photo-1',
            type: 'photography',
            reliability: 0.7,
            risk_factors: ['overbooked'],
          },
          { id: 'venue-1', type: 'venue', reliability: 0.9, risk_factors: [] },
          {
            id: 'catering-1',
            type: 'catering',
            reliability: 0.8,
            risk_factors: ['staff_issues'],
          },
        ],
        budget: {
          allocated: 25000,
          spent: 18000,
          remaining: 7000,
          pendingPayments: 8000, // More pending than remaining!
        },
      };

      const earlyWarning =
        await crisisManager.detectPotentialCrises(weddingData);

      // Assert - Early detection
      expect(earlyWarning.risksDetected).toBe(true);
      expect(earlyWarning.riskLevel).toBeGreaterThan(0.6);
      expect(earlyWarning.potentialCrises).toHaveLength.greaterThan(0);

      // Check specific risk detection
      const budgetRisk = earlyWarning.potentialCrises.find(
        (crisis) => crisis.type === 'budget_shortfall',
      );
      expect(budgetRisk).toBeDefined();
      expect(budgetRisk.probability).toBeGreaterThan(0.8);
      expect(budgetRisk.preventionActions).toHaveLength.greaterThan(0);

      // Check vendor risk detection
      const vendorRisk = earlyWarning.potentialCrises.find(
        (crisis) => crisis.type === 'vendor_reliability',
      );
      expect(vendorRisk).toBeDefined();
      expect(vendorRisk.vendorId).toBe('photo-1'); // Lowest reliability
    });

    it('should provide preventive action recommendations', async () => {
      const riskAssessment = {
        weddingId: 'preventive-test-123',
        risksIdentified: [
          {
            type: 'vendor_overcommitment',
            vendor: 'photography',
            probability: 0.7,
            impact: 0.9,
          },
          {
            type: 'budget_overrun',
            category: 'catering',
            probability: 0.6,
            impact: 0.7,
          },
        ],
      };

      const preventiveActions =
        await crisisManager.generatePreventiveActions(riskAssessment);

      // Assert - Preventive measures
      expect(preventiveActions.actionPlan).toBeDefined();
      expect(preventiveActions.actionPlan.length).toBeGreaterThan(0);

      const photographyPreventive = preventiveActions.actionPlan.find(
        (action) => action.riskType === 'vendor_overcommitment',
      );
      expect(photographyPreventive).toBeDefined();
      expect(photographyPreventive.actions).toContain(
        'backup_vendor_identification',
      );
      expect(photographyPreventive.actions).toContain('contract_confirmation');
      expect(photographyPreventive.timeline).toBeLessThan(14); // Implement within 2 weeks

      const budgetPreventive = preventiveActions.actionPlan.find(
        (action) => action.riskType === 'budget_overrun',
      );
      expect(budgetPreventive).toBeDefined();
      expect(budgetPreventive.actions).toContain('budget_review');
      expect(budgetPreventive.urgency).toBeGreaterThan(0.5);
    });
  });

  describe('Crisis Communication and Coordination', () => {
    it('should coordinate emergency communications during crisis', async () => {
      const communicationCrisis = scenarioGenerator.createVendorCancellation({
        vendorType: 'photography',
        severity: 'high',
        stakeholders: {
          couple: {
            email: 'couple@test.com',
            phone: '+44123456789',
            anxiety_level: 'high',
          },
          parents: [{ email: 'mother@test.com', role: 'decision_maker' }],
          weddingParty: { count: 8, notify: true },
        },
      });

      const crisisResponse = await crisisManager.handleVendorCancellation(
        communicationCrisis,
        { enableCommunications: true },
      );

      // Assert - Communication coordination
      expect(crisisResponse.communicationPlan).toBeDefined();
      expect(crisisResponse.communicationPlan.executed).toBe(true);
      expect(
        crisisResponse.communicationPlan.stakeholdersNotified,
      ).toBeGreaterThan(0);

      // Check notification hierarchy
      const notifications = crisisResponse.communicationPlan.notifications;
      const coupleNotification = notifications.find(
        (n) => n.recipient === 'couple',
      );
      const parentNotification = notifications.find(
        (n) => n.recipient === 'parents',
      );

      expect(coupleNotification.priority).toBe('immediate');
      expect(coupleNotification.channel).toEqual(['phone', 'email']);
      expect(coupleNotification.tone).toBe('reassuring');

      expect(parentNotification.priority).toBe('high');
      expect(parentNotification.timing).toBe('after_couple');

      // Validate message content
      expect(coupleNotification.message).toMatch(/solution/i);
      expect(coupleNotification.message).toMatch(/alternative/i);
      expect(coupleNotification.message).toNotMatch(/problem|issue|crisis/i); // Avoid panic words
    });

    it('should maintain vendor coordination during crisis resolution', async () => {
      const vendorCoordinationCrisis =
        scenarioGenerator.createVendorCancellation({
          vendorType: 'catering',
          cascadingEffects: {
            affects: ['venue', 'florals', 'rentals'],
            coordinationRequired: true,
          },
        });

      const coordinationResponse = await crisisManager.handleVendorCancellation(
        vendorCoordinationCrisis,
        { enableVendorCoordination: true },
      );

      // Assert - Vendor coordination
      expect(coordinationResponse.vendorCoordination).toBeDefined();
      expect(
        coordinationResponse.vendorCoordination.coordinatedVendors,
      ).toHaveLength.greaterThan(2);

      // Check coordination timeline
      const coordination = coordinationResponse.vendorCoordination;
      expect(coordination.coordinationPlan.feasible).toBe(true);
      expect(coordination.coordinationPlan.timeline).toBeDefined();
      expect(coordination.communicationFlow.established).toBe(true);

      // Validate vendor alignment (refactored to reduce nesting)
      coordination.coordinatedVendors.forEach(validateVendorCoordination);
    });
  });
});
