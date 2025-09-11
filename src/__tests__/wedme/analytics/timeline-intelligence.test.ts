import { TimelineIntelligenceSystem } from '@/lib/wedme/analytics/timeline-intelligence';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        maybeSingle: jest.fn(),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(),
      })),
      in: jest.fn(),
      lt: jest.fn(),
      gt: jest.fn(),
    })),
  })),
  rpc: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('TimelineIntelligenceSystem', () => {
  let system: TimelineIntelligenceSystem;
  const mockCoupleId = 'couple-123';
  const mockWeddingId = 'wedding-456';

  beforeEach(() => {
    system = new TimelineIntelligenceSystem();
    jest.clearAllMocks();
  });

  describe('optimizeWeddingTimeline', () => {
    beforeEach(() => {
      // Mock wedding data
      const weddingDate = new Date();
      weddingDate.setMonth(weddingDate.getMonth() + 6); // 6 months from now

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            wedding_date: weddingDate.toISOString(),
            guest_count: 150,
            venue_type: 'Garden',
            style: 'Classic',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        });

      // Mock tasks with dependencies
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: [
            {
              id: 'task-1',
              title: 'Book venue',
              category: 'venue',
              priority: 'critical',
              estimated_duration: 7, // days
              due_date: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              dependencies: [],
              vendor_dependencies: ['venue'],
            },
            {
              id: 'task-2',
              title: 'Send save the dates',
              category: 'communications',
              priority: 'high',
              estimated_duration: 3,
              due_date: new Date(
                Date.now() + 45 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              dependencies: ['task-1'], // Depends on venue booking
              vendor_dependencies: [],
            },
            {
              id: 'task-3',
              title: 'Book photographer',
              category: 'photography',
              priority: 'high',
              estimated_duration: 5,
              due_date: new Date(
                Date.now() + 60 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              dependencies: [],
              vendor_dependencies: ['photographer'],
            },
            {
              id: 'task-4',
              title: 'Send invitations',
              category: 'communications',
              priority: 'critical',
              estimated_duration: 4,
              due_date: new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              dependencies: ['task-2'], // Depends on save the dates
              vendor_dependencies: [],
            },
            {
              id: 'task-5',
              title: 'Final menu tasting',
              category: 'catering',
              priority: 'medium',
              estimated_duration: 1,
              due_date: new Date(
                Date.now() + 150 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              status: 'pending',
              dependencies: ['task-1'], // Depends on venue
              vendor_dependencies: ['catering'],
            },
          ],
          error: null,
        });

      // Mock vendor data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              category: 'venue',
              availability_start: '2024-01-01',
              lead_time: 14,
            },
            {
              category: 'photographer',
              availability_start: '2024-01-01',
              lead_time: 7,
            },
            {
              category: 'catering',
              availability_start: '2024-01-01',
              lead_time: 10,
            },
          ],
          error: null,
        });
    });

    it('should optimize wedding timeline successfully', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('criticalPath');
      expect(result).toHaveProperty('milestones');
      expect(result).toHaveProperty('vendorSchedule');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('bufferTime');
      expect(result).toHaveProperty('riskAssessment');

      expect(result.criticalPath).toHaveProperty('totalDuration');
      expect(result.criticalPath).toHaveProperty('criticalTasks');
      expect(result.criticalPath).toHaveProperty('riskLevel');
      expect(result.criticalPath).toHaveProperty('efficiency');

      expect(result.criticalPath.totalDuration).toBeGreaterThan(0);
      expect(result.criticalPath.criticalTasks).toBeInstanceOf(Array);
      expect(result.criticalPath.riskLevel).toMatch(/low|medium|high/);
      expect(result.criticalPath.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.criticalPath.efficiency).toBeLessThanOrEqual(100);
    });

    it('should identify critical path correctly', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.criticalPath.criticalTasks).toBeInstanceOf(Array);
      expect(result.criticalPath.criticalTasks.length).toBeGreaterThan(0);

      // Critical path should include venue booking and invitations (highest priority)
      const criticalTaskIds = result.criticalPath.criticalTasks;
      expect(criticalTaskIds).toContain('task-1'); // Venue booking
      expect(criticalTaskIds).toContain('task-4'); // Invitations
    });

    it('should calculate milestone schedule', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.milestones).toBeInstanceOf(Array);
      expect(result.milestones.length).toBeGreaterThan(0);

      const milestone = result.milestones[0];
      expect(milestone).toHaveProperty('phase');
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('dueDate');
      expect(milestone).toHaveProperty('tasks');
      expect(milestone).toHaveProperty('completion');
      expect(milestone).toHaveProperty('riskLevel');

      expect(milestone.completion).toBeGreaterThanOrEqual(0);
      expect(milestone.completion).toBeLessThanOrEqual(100);
      expect(milestone.riskLevel).toMatch(/low|medium|high/);
    });

    it('should generate vendor schedule coordination', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.vendorSchedule).toBeInstanceOf(Array);

      if (result.vendorSchedule.length > 0) {
        const vendorEntry = result.vendorSchedule[0];
        expect(vendorEntry).toHaveProperty('vendor');
        expect(vendorEntry).toHaveProperty('category');
        expect(vendorEntry).toHaveProperty('tasks');
        expect(vendorEntry).toHaveProperty('earliestStart');
        expect(vendorEntry).toHaveProperty('latestFinish');
        expect(vendorEntry).toHaveProperty('bufferTime');
        expect(vendorEntry).toHaveProperty('dependencies');

        expect(vendorEntry.tasks).toBeInstanceOf(Array);
        expect(vendorEntry.dependencies).toBeInstanceOf(Array);
      }
    });

    it('should provide optimization recommendations', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      const recommendation = result.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('task');
      expect(recommendation).toHaveProperty('suggestion');
      expect(recommendation).toHaveProperty('impact');
      expect(recommendation).toHaveProperty('effort');
      expect(recommendation).toHaveProperty('timeSaved');

      expect(recommendation.type).toMatch(
        /schedule_optimization|dependency_reduction|parallel_execution|buffer_adjustment/,
      );
      expect(recommendation.impact).toMatch(/high|medium|low/);
      expect(recommendation.effort).toMatch(/low|medium|high/);
    });

    it('should assess timeline risks accurately', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.riskAssessment).toHaveProperty('overallRisk');
      expect(result.riskAssessment).toHaveProperty('riskFactors');
      expect(result.riskAssessment).toHaveProperty('bottlenecks');
      expect(result.riskAssessment).toHaveProperty('contingencyPlans');

      expect(result.riskAssessment.overallRisk).toMatch(/low|medium|high/);
      expect(result.riskAssessment.riskFactors).toBeInstanceOf(Array);
      expect(result.riskAssessment.bottlenecks).toBeInstanceOf(Array);
      expect(result.riskAssessment.contingencyPlans).toBeInstanceOf(Array);
    });
  });

  describe('calculateCriticalPath', () => {
    it('should calculate critical path using CPM algorithm', async () => {
      const mockTasks = [
        {
          id: 'A',
          duration: 3,
          dependencies: [],
          priority: 'critical',
        },
        {
          id: 'B',
          duration: 2,
          dependencies: ['A'],
          priority: 'high',
        },
        {
          id: 'C',
          duration: 4,
          dependencies: ['A'],
          priority: 'medium',
        },
        {
          id: 'D',
          duration: 1,
          dependencies: ['B', 'C'],
          priority: 'high',
        },
      ];

      const result = await system.calculateCriticalPath(mockTasks);

      expect(result).toHaveProperty('totalDuration');
      expect(result).toHaveProperty('criticalTasks');
      expect(result).toHaveProperty('taskDetails');

      // Expected critical path: A -> C -> D (3 + 4 + 1 = 8 days)
      expect(result.totalDuration).toBe(8);
      expect(result.criticalTasks).toEqual(['A', 'C', 'D']);
    });

    it('should handle parallel task execution', async () => {
      const mockTasks = [
        { id: 'A', duration: 5, dependencies: [], priority: 'critical' },
        { id: 'B', duration: 3, dependencies: [], priority: 'high' }, // Parallel to A
        { id: 'C', duration: 2, dependencies: ['A', 'B'], priority: 'medium' },
      ];

      const result = await system.calculateCriticalPath(mockTasks);

      // Total should be max(A, B) + C = max(5, 3) + 2 = 7
      expect(result.totalDuration).toBe(7);
      expect(result.criticalTasks).toContain('A'); // A is on critical path
      expect(result.criticalTasks).toContain('C'); // C is on critical path
    });

    it('should identify task slack time correctly', async () => {
      const mockTasks = [
        { id: 'A', duration: 4, dependencies: [], priority: 'critical' },
        { id: 'B', duration: 2, dependencies: [], priority: 'low' }, // Has slack
        { id: 'C', duration: 1, dependencies: ['A', 'B'], priority: 'high' },
      ];

      const result = await system.calculateCriticalPath(mockTasks);

      expect(result.taskDetails).toBeInstanceOf(Object);

      const taskB = result.taskDetails['B'];
      expect(taskB).toHaveProperty('slack');
      expect(taskB.slack).toBe(2); // Task B can be delayed by 2 days

      const taskA = result.taskDetails['A'];
      expect(taskA.slack).toBe(0); // Critical path task has no slack
    });
  });

  describe('generateMilestoneSchedule', () => {
    beforeEach(() => {
      // Mock timeline with various task phases
      const mockTasks = [
        {
          id: '1',
          category: 'planning',
          due_date: '2024-03-01',
          status: 'completed',
        },
        {
          id: '2',
          category: 'venue',
          due_date: '2024-04-01',
          status: 'pending',
        },
        {
          id: '3',
          category: 'vendors',
          due_date: '2024-05-01',
          status: 'pending',
        },
        {
          id: '4',
          category: 'details',
          due_date: '2024-07-01',
          status: 'pending',
        },
        {
          id: '5',
          category: 'final',
          due_date: '2024-07-15',
          status: 'pending',
        },
      ];
    });

    it('should generate milestone schedule correctly', async () => {
      const result = await system.generateMilestoneSchedule(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const milestone = result[0];
      expect(milestone).toHaveProperty('phase');
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('dueDate');
      expect(milestone).toHaveProperty('tasks');
      expect(milestone).toHaveProperty('completion');
      expect(milestone).toHaveProperty('riskLevel');
      expect(milestone).toHaveProperty('dependencies');

      // Phases should be in chronological order
      expect(
        [
          'early_planning',
          'venue_booking',
          'vendor_selection',
          'detail_planning',
          'final_preparations',
        ].includes(milestone.phase),
      ).toBe(true);
    });

    it('should calculate milestone completion correctly', async () => {
      const result = await system.generateMilestoneSchedule(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((milestone) => {
        expect(milestone.completion).toBeGreaterThanOrEqual(0);
        expect(milestone.completion).toBeLessThanOrEqual(100);

        // If milestone has tasks, completion should be based on task status
        if (milestone.tasks.length > 0) {
          const completedTasks = milestone.tasks.filter(
            (task: any) => task.status === 'completed',
          );
          const expectedCompletion =
            (completedTasks.length / milestone.tasks.length) * 100;
          expect(
            Math.abs(milestone.completion - expectedCompletion),
          ).toBeLessThan(1);
        }
      });
    });

    it('should identify milestone dependencies', async () => {
      const result = await system.generateMilestoneSchedule(
        mockCoupleId,
        mockWeddingId,
      );

      // Later milestones should depend on earlier ones
      const venueBookingMilestone = result.find(
        (m) => m.phase === 'venue_booking',
      );
      const vendorSelectionMilestone = result.find(
        (m) => m.phase === 'vendor_selection',
      );

      if (venueBookingMilestone && vendorSelectionMilestone) {
        expect(vendorSelectionMilestone.dependencies).toContain(
          venueBookingMilestone.phase,
        );
      }
    });

    it('should assess milestone risk levels', async () => {
      const result = await system.generateMilestoneSchedule(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((milestone) => {
        expect(milestone.riskLevel).toMatch(/low|medium|high/);

        // Milestones close to wedding date with low completion should be high risk
        const daysToWedding = Math.ceil(
          (new Date(milestone.dueDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysToWedding < 30 && milestone.completion < 50) {
          expect(['medium', 'high'].includes(milestone.riskLevel)).toBe(true);
        }
      });
    });
  });

  describe('optimizeVendorScheduleCoordination', () => {
    beforeEach(() => {
      // Mock vendor data with availability constraints
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'vendor-1',
              category: 'venue',
              name: 'Garden Venue',
              lead_time: 14,
              booking_window: 180,
              availability_constraints: ['weekends_only'],
            },
            {
              id: 'vendor-2',
              category: 'photographer',
              name: 'Art Photography',
              lead_time: 7,
              booking_window: 90,
              availability_constraints: [],
            },
            {
              id: 'vendor-3',
              category: 'catering',
              name: 'Gourmet Catering',
              lead_time: 21,
              booking_window: 120,
              availability_constraints: ['seasonal_menu'],
            },
          ],
          error: null,
        });
    });

    it('should coordinate vendor schedules effectively', async () => {
      const result = await system.optimizeVendorScheduleCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);

      if (result.length > 0) {
        const vendorSchedule = result[0];
        expect(vendorSchedule).toHaveProperty('vendor');
        expect(vendorSchedule).toHaveProperty('category');
        expect(vendorSchedule).toHaveProperty('tasks');
        expect(vendorSchedule).toHaveProperty('earliestStart');
        expect(vendorSchedule).toHaveProperty('latestFinish');
        expect(vendorSchedule).toHaveProperty('bufferTime');
        expect(vendorSchedule).toHaveProperty('conflicts');
        expect(vendorSchedule).toHaveProperty('dependencies');

        expect(vendorSchedule.tasks).toBeInstanceOf(Array);
        expect(vendorSchedule.conflicts).toBeInstanceOf(Array);
        expect(vendorSchedule.dependencies).toBeInstanceOf(Array);
      }
    });

    it('should respect vendor lead times', async () => {
      const result = await system.optimizeVendorScheduleCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((schedule) => {
        const leadTime = schedule.leadTime || 7; // Default 7 days
        const earliestStart = new Date(schedule.earliestStart);
        const now = new Date();

        const daysDifference = Math.ceil(
          (earliestStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        expect(daysDifference).toBeGreaterThanOrEqual(leadTime);
      });
    });

    it('should identify vendor conflicts', async () => {
      // Mock overlapping vendor requirements
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: [
            {
              id: 'task-1',
              title: 'Venue site visit',
              vendor_dependencies: ['venue'],
              due_date: '2024-06-15',
            },
            {
              id: 'task-2',
              title: 'Catering tasting at venue',
              vendor_dependencies: ['venue', 'catering'],
              due_date: '2024-06-15', // Same date - potential conflict
            },
          ],
          error: null,
        });

      const result = await system.optimizeVendorScheduleCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      const venueSchedule = result.find((s) => s.category === 'venue');
      if (venueSchedule && venueSchedule.conflicts.length > 0) {
        expect(venueSchedule.conflicts[0]).toHaveProperty('type');
        expect(venueSchedule.conflicts[0]).toHaveProperty('description');
        expect(venueSchedule.conflicts[0]).toHaveProperty('severity');
        expect(venueSchedule.conflicts[0].type).toMatch(
          /scheduling|resource|availability/,
        );
      }
    });

    it('should calculate appropriate buffer times', async () => {
      const result = await system.optimizeVendorScheduleCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((schedule) => {
        expect(schedule.bufferTime).toBeGreaterThanOrEqual(0);

        // High-priority vendors should have more buffer time
        if (schedule.category === 'venue') {
          expect(schedule.bufferTime).toBeGreaterThanOrEqual(7); // At least 1 week buffer
        }
      });
    });
  });

  describe('identifyTimelineRisks', () => {
    it('should identify comprehensive timeline risks', async () => {
      const result = await system.identifyTimelineRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('overallRisk');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('bottlenecks');
      expect(result).toHaveProperty('contingencyPlans');
      expect(result).toHaveProperty('mitigationStrategies');

      expect(result.overallRisk).toMatch(/low|medium|high/);
      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.bottlenecks).toBeInstanceOf(Array);
      expect(result.contingencyPlans).toBeInstanceOf(Array);
    });

    it('should identify critical bottlenecks', async () => {
      // Mock scenario with bottleneck (venue booking blocking everything)
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: [
            {
              id: 'venue-task',
              title: 'Book venue',
              status: 'pending',
              priority: 'critical',
              estimated_duration: 14,
            },
            {
              id: 'dependent-1',
              dependencies: ['venue-task'],
              title: 'Send save the dates',
              status: 'pending',
            },
            {
              id: 'dependent-2',
              dependencies: ['venue-task'],
              title: 'Book catering',
              status: 'pending',
            },
          ],
          error: null,
        });

      const result = await system.identifyTimelineRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.bottlenecks.length).toBeGreaterThan(0);

      const bottleneck = result.bottlenecks[0];
      expect(bottleneck).toHaveProperty('task');
      expect(bottleneck).toHaveProperty('impact');
      expect(bottleneck).toHaveProperty('dependentTasks');
      expect(bottleneck).toHaveProperty('severity');

      expect(bottleneck.task).toBe('venue-task');
      expect(bottleneck.dependentTasks.length).toBe(2);
      expect(bottleneck.severity).toMatch(/high|critical/);
    });

    it('should assess time pressure risks', async () => {
      // Mock scenario with tight timeline
      const soonWeddingDate = new Date();
      soonWeddingDate.setMonth(soonWeddingDate.getMonth() + 2); // Only 2 months away

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: soonWeddingDate.toISOString(),
          },
          error: null,
        });

      const result = await system.identifyTimelineRisks(
        mockCoupleId,
        mockWeddingId,
      );

      // Should identify high time pressure
      const timePressureRisk = result.riskFactors.find(
        (risk) => risk.type === 'time_pressure' || risk.category === 'Timeline',
      );

      if (timePressureRisk) {
        expect(timePressureRisk.severity).toMatch(/high|critical/);
      }
    });

    it('should provide relevant contingency plans', async () => {
      const result = await system.identifyTimelineRisks(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.contingencyPlans.length > 0) {
        const plan = result.contingencyPlans[0];
        expect(plan).toHaveProperty('scenario');
        expect(plan).toHaveProperty('trigger');
        expect(plan).toHaveProperty('actions');
        expect(plan).toHaveProperty('resources');
        expect(plan).toHaveProperty('timeline');

        expect(plan.actions).toBeInstanceOf(Array);
        expect(plan.actions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate relevant optimization recommendations', async () => {
      const result = await system.generateOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const recommendation = result[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('task');
      expect(recommendation).toHaveProperty('suggestion');
      expect(recommendation).toHaveProperty('impact');
      expect(recommendation).toHaveProperty('effort');
      expect(recommendation).toHaveProperty('timeSaved');
      expect(recommendation).toHaveProperty('riskReduction');

      expect(recommendation.type).toMatch(
        /schedule_optimization|dependency_reduction|parallel_execution|buffer_adjustment/,
      );
      expect(recommendation.impact).toMatch(/high|medium|low/);
      expect(recommendation.effort).toMatch(/low|medium|high/);
      expect(recommendation.timeSaved).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize recommendations by impact and effort', async () => {
      const result = await system.generateOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.length > 1) {
        const firstRec = result[0];
        const lastRec = result[result.length - 1];

        // Calculate priority score (high impact, low effort = high priority)
        const getPriorityScore = (rec: any) => {
          const impactScore =
            rec.impact === 'high' ? 3 : rec.impact === 'medium' ? 2 : 1;
          const effortScore =
            rec.effort === 'low' ? 3 : rec.effort === 'medium' ? 2 : 1;
          return impactScore * effortScore + rec.timeSaved;
        };

        expect(getPriorityScore(firstRec)).toBeGreaterThanOrEqual(
          getPriorityScore(lastRec),
        );
      }
    });

    it('should suggest parallel execution opportunities', async () => {
      const result = await system.generateOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      const parallelRec = result.find(
        (rec) => rec.type === 'parallel_execution',
      );
      if (parallelRec) {
        expect(parallelRec.suggestion).toContain('parallel');
        expect(parallelRec.timeSaved).toBeGreaterThan(0);
      }
    });

    it('should identify dependency reduction opportunities', async () => {
      const result = await system.generateOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      const dependencyRec = result.find(
        (rec) => rec.type === 'dependency_reduction',
      );
      if (dependencyRec) {
        expect(dependencyRec.suggestion).toMatch(
          /independent|separate|decouple/i,
        );
        expect(dependencyRec.riskReduction).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(
        system.optimizeWeddingTimeline(mockCoupleId, mockWeddingId),
      ).rejects.toThrow('Wedding not found');
    });

    it('should handle missing task data', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: mockWeddingId, wedding_date: '2024-08-15' },
          error: null,
        });

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeDefined();
      expect(result.criticalPath.totalDuration).toBe(0);
      expect(result.milestones).toEqual([]);
      expect(result.vendorSchedule).toEqual([]);
    });

    it('should validate input parameters', async () => {
      await expect(
        system.optimizeWeddingTimeline('', mockWeddingId),
      ).rejects.toThrow('Invalid couple ID');

      await expect(
        system.optimizeWeddingTimeline(mockCoupleId, ''),
      ).rejects.toThrow('Invalid wedding ID');
    });

    it('should handle circular dependencies', async () => {
      const circularTasks = [
        { id: 'A', duration: 1, dependencies: ['B'], priority: 'high' },
        { id: 'B', duration: 1, dependencies: ['C'], priority: 'high' },
        { id: 'C', duration: 1, dependencies: ['A'], priority: 'high' }, // Circular!
      ];

      await expect(system.calculateCriticalPath(circularTasks)).rejects.toThrow(
        'Circular dependency detected',
      );
    });
  });

  describe('Business Logic Validation', () => {
    it('should apply wedding industry best practices', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      // Should recommend booking venue early (critical path)
      const venueTasks = result.criticalPath.criticalTasks.filter(
        (taskId) => taskId.includes('venue') || taskId === 'task-1',
      );
      expect(venueTasks.length).toBeGreaterThan(0);

      // Should identify standard wedding planning phases
      const expectedPhases = [
        'early_planning',
        'venue_booking',
        'vendor_selection',
        'detail_planning',
        'final_preparations',
      ];
      const actualPhases = result.milestones.map((m) => m.phase);

      expectedPhases.forEach((phase) => {
        expect(actualPhases.includes(phase)).toBe(true);
      });
    });

    it('should account for seasonal wedding considerations', async () => {
      // Mock peak season wedding (June)
      const juneWedding = new Date('2024-06-15');

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: juneWedding.toISOString(),
            guest_count: 150,
          },
          error: null,
        });

      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      // Should recommend earlier booking for peak season
      const recommendations = result.recommendations.filter(
        (rec) =>
          rec.suggestion.toLowerCase().includes('early') ||
          rec.suggestion.toLowerCase().includes('advance'),
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should scale recommendations based on wedding size', async () => {
      // Mock large wedding
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: '2024-08-15',
            guest_count: 300, // Large wedding
          },
          error: null,
        });

      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      // Large weddings should have more buffer time
      expect(result.bufferTime.recommended).toBeGreaterThan(14); // More than 2 weeks

      // Should recommend more detailed planning
      const detailRecs = result.recommendations.filter(
        (rec) =>
          rec.suggestion.toLowerCase().includes('detail') ||
          rec.suggestion.toLowerCase().includes('coordination'),
      );

      expect(detailRecs.length).toBeGreaterThan(0);
    });

    it('should handle vendor interdependencies correctly', async () => {
      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      // Catering should depend on venue being booked first
      const cateringSchedule = result.vendorSchedule.find(
        (s) => s.category === 'catering',
      );
      const venueSchedule = result.vendorSchedule.find(
        (s) => s.category === 'venue',
      );

      if (cateringSchedule && venueSchedule) {
        const cateringStart = new Date(cateringSchedule.earliestStart);
        const venueFinish = new Date(venueSchedule.latestFinish);

        // Catering should start after venue is secured
        expect(cateringStart.getTime()).toBeGreaterThanOrEqual(
          venueFinish.getTime(),
        );
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete timeline optimization within reasonable time', async () => {
      const startTime = Date.now();

      await system.optimizeWeddingTimeline(mockCoupleId, mockWeddingId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle complex task networks efficiently', async () => {
      // Mock complex task network
      const complexTasks = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        duration: Math.floor(Math.random() * 14) + 1,
        dependencies: i > 0 ? [`task-${Math.floor(Math.random() * i)}`] : [],
        priority: ['low', 'medium', 'high', 'critical'][
          Math.floor(Math.random() * 4)
        ],
      }));

      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: complexTasks,
        error: null,
      });

      const startTime = Date.now();

      const result = await system.optimizeWeddingTimeline(
        mockCoupleId,
        mockWeddingId,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should handle complexity within 5 seconds
    });

    it('should efficiently calculate critical path for large networks', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        duration: Math.floor(Math.random() * 10) + 1,
        dependencies:
          i > 0
            ? [`task-${Math.max(0, i - Math.floor(Math.random() * 5))}`]
            : [],
        priority: 'medium',
      }));

      const startTime = Date.now();

      const result = await system.calculateCriticalPath(largeTasks);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.criticalTasks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should be efficient even with 100 tasks
    });
  });
});
