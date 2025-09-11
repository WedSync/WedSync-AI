import {
  WeddingTimeline,
  WeddingTask,
  TaskDependency,
  TimelineConstraint,
  TimelineOptimization,
  OptimizedTask,
  TimelineConflict,
  ConflictResolution,
  BufferRecommendation,
  EfficiencyGain,
  TimelineAIConfig,
  OptimizationError,
} from './types';

interface TimelineOptimizationRequest {
  weddingDate: Date;
  currentTasks: WeddingTask[];
  dependencies: TaskDependency[];
  constraints: TimelineConstraint[];
  coupleAvailability: any[];
  vendorRequirements: any[];
  priorities: string[];
  riskTolerance: 'low' | 'medium' | 'high';
}

interface TaskNode {
  task: WeddingTask;
  dependencies: string[];
  dependents: string[];
  earliestStart: Date;
  latestStart: Date;
  slack: number;
  criticalPath: boolean;
}

export class TimelineOptimizationAI {
  private config: TimelineAIConfig;
  private industryBenchmarks: Map<string, any> = new Map();
  private seasonalFactors: Map<string, any> = new Map();

  constructor(config: TimelineAIConfig) {
    this.config = config;
    this.initializeIndustryBenchmarks();
    this.initializeSeasonalFactors();
  }

  async optimizeTimeline(
    request: TimelineOptimizationRequest,
  ): Promise<TimelineOptimization> {
    try {
      // Validate the request
      this.validateTimelineRequest(request);

      // Build task dependency graph
      const taskNodes = this.buildTaskGraph(request);

      // Calculate critical path
      const criticalPath = this.calculateCriticalPath(
        taskNodes,
        request.weddingDate,
      );

      // Identify conflicts
      const conflicts = await this.identifyConflicts(taskNodes, request);

      // Generate optimized schedule
      const optimizedSchedule = await this.generateOptimizedSchedule(
        taskNodes,
        request,
        conflicts,
      );

      // Calculate buffer recommendations
      const bufferRecommendations = this.calculateBufferRecommendations(
        optimizedSchedule,
        request,
      );

      // Identify efficiency gains
      const efficiencyGains = this.calculateEfficiencyGains(
        request.currentTasks,
        optimizedSchedule,
      );

      // Calculate risk reduction
      const riskReduction = this.calculateRiskReduction(
        conflicts,
        optimizedSchedule,
      );

      return {
        optimizedSchedule,
        conflicts,
        criticalPath: criticalPath.map((node) => node.task.id),
        bufferRecommendations,
        efficiencyGains,
        riskReduction,
      };
    } catch (error) {
      console.error('Timeline optimization failed:', error);
      throw new OptimizationError(
        `Timeline optimization failed: ${error.message}`,
      );
    }
  }

  private initializeIndustryBenchmarks(): void {
    // Industry standard timelines for wedding tasks (weeks before wedding)
    this.industryBenchmarks.set('venue_booking', {
      ideal: 52,
      minimum: 26,
      maximum: 104,
      difficulty: 'high',
      importance: 'critical',
      seasonalAdjustment: { summer: 8, winter: -4 },
    });

    this.industryBenchmarks.set('photographer_booking', {
      ideal: 40,
      minimum: 20,
      maximum: 78,
      difficulty: 'medium',
      importance: 'high',
      seasonalAdjustment: { summer: 4, winter: -2 },
    });

    this.industryBenchmarks.set('catering_booking', {
      ideal: 30,
      minimum: 12,
      maximum: 60,
      difficulty: 'medium',
      importance: 'critical',
      seasonalAdjustment: { summer: 2, winter: -1 },
    });

    this.industryBenchmarks.set('dress_shopping', {
      ideal: 36,
      minimum: 16,
      maximum: 52,
      difficulty: 'medium',
      importance: 'high',
      seasonalAdjustment: { summer: 0, winter: 0 },
    });

    this.industryBenchmarks.set('invitations', {
      ideal: 10,
      minimum: 6,
      maximum: 16,
      difficulty: 'low',
      importance: 'medium',
      seasonalAdjustment: { summer: 1, winter: 0 },
    });

    this.industryBenchmarks.set('final_headcount', {
      ideal: 2,
      minimum: 1,
      maximum: 4,
      difficulty: 'low',
      importance: 'critical',
      seasonalAdjustment: { summer: 0, winter: 0 },
    });

    this.industryBenchmarks.set('rehearsal', {
      ideal: 0.14,
      minimum: 0.07,
      maximum: 0.28, // 1-2 days before
      difficulty: 'low',
      importance: 'high',
      seasonalAdjustment: { summer: 0, winter: 0 },
    });
  }

  private initializeSeasonalFactors(): void {
    this.seasonalFactors.set('spring', {
      vendorAvailability: 0.8,
      weatherRisk: 0.6,
      popularityMultiplier: 1.1,
      bookingPressure: 'medium',
    });

    this.seasonalFactors.set('summer', {
      vendorAvailability: 0.4,
      weatherRisk: 0.2,
      popularityMultiplier: 1.5,
      bookingPressure: 'high',
    });

    this.seasonalFactors.set('autumn', {
      vendorAvailability: 0.7,
      weatherRisk: 0.4,
      popularityMultiplier: 1.2,
      bookingPressure: 'medium',
    });

    this.seasonalFactors.set('winter', {
      vendorAvailability: 0.9,
      weatherRisk: 0.8,
      popularityMultiplier: 0.7,
      bookingPressure: 'low',
    });
  }

  private validateTimelineRequest(request: TimelineOptimizationRequest): void {
    if (!request.weddingDate || request.weddingDate <= new Date()) {
      throw new OptimizationError('Valid future wedding date required');
    }

    if (!request.currentTasks || request.currentTasks.length === 0) {
      throw new OptimizationError('Current tasks list cannot be empty');
    }

    const duplicateTaskIds = this.findDuplicateTaskIds(request.currentTasks);
    if (duplicateTaskIds.length > 0) {
      throw new OptimizationError(
        `Duplicate task IDs found: ${duplicateTaskIds.join(', ')}`,
      );
    }
  }

  private buildTaskGraph(request: TimelineOptimizationRequest): TaskNode[] {
    const taskNodes: TaskNode[] = request.currentTasks.map((task) => ({
      task,
      dependencies: task.dependencies,
      dependents: [],
      earliestStart: new Date(),
      latestStart: new Date(),
      slack: 0,
      criticalPath: false,
    }));

    // Build dependent relationships
    taskNodes.forEach((node) => {
      node.dependencies.forEach((depId) => {
        const depNode = taskNodes.find((n) => n.task.id === depId);
        if (depNode) {
          depNode.dependents.push(node.task.id);
        }
      });
    });

    return taskNodes;
  }

  private calculateCriticalPath(
    taskNodes: TaskNode[],
    weddingDate: Date,
  ): TaskNode[] {
    // Forward pass - calculate earliest start dates
    const sortedNodes = this.topologicalSort(taskNodes);

    sortedNodes.forEach((node) => {
      if (node.dependencies.length === 0) {
        node.earliestStart = new Date();
      } else {
        let maxFinishDate = new Date();
        node.dependencies.forEach((depId) => {
          const depNode = taskNodes.find((n) => n.task.id === depId);
          if (depNode) {
            const depFinish = new Date(
              depNode.earliestStart.getTime() +
                depNode.task.estimatedDuration * 24 * 60 * 60 * 1000,
            );
            if (depFinish > maxFinishDate) {
              maxFinishDate = depFinish;
            }
          }
        });
        node.earliestStart = maxFinishDate;
      }
    });

    // Backward pass - calculate latest start dates and slack
    const reverseSortedNodes = [...sortedNodes].reverse();

    reverseSortedNodes.forEach((node) => {
      if (node.dependents.length === 0) {
        // Tasks with no dependents should finish by wedding date
        node.latestStart = new Date(
          weddingDate.getTime() -
            node.task.estimatedDuration * 24 * 60 * 60 * 1000,
        );
      } else {
        let minStartDate = weddingDate;
        node.dependents.forEach((depId) => {
          const depNode = taskNodes.find((n) => n.task.id === depId);
          if (depNode && depNode.latestStart < minStartDate) {
            minStartDate = depNode.latestStart;
          }
        });
        node.latestStart = minStartDate;
      }

      // Calculate slack
      node.slack = node.latestStart.getTime() - node.earliestStart.getTime();
      node.criticalPath = node.slack <= 0;
    });

    return taskNodes.filter((node) => node.criticalPath);
  }

  private async identifyConflicts(
    taskNodes: TaskNode[],
    request: TimelineOptimizationRequest,
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];

    // Check for scheduling conflicts
    taskNodes.forEach((node) => {
      // Check if task duration is unrealistic
      const benchmark = this.industryBenchmarks.get(
        node.task.category.toLowerCase(),
      );
      if (benchmark) {
        const weeksUntilWedding = this.getWeeksUntilWedding(
          node.earliestStart,
          request.weddingDate,
        );

        if (weeksUntilWedding < benchmark.minimum) {
          conflicts.push({
            type: 'date_constraint',
            description: `${node.task.title} scheduled too close to wedding date`,
            affectedTasks: [node.task.id],
            severity: benchmark.importance === 'critical' ? 'high' : 'medium',
            resolution: {
              strategy: 'reschedule_earlier',
              steps: [
                `Move ${node.task.title} to at least ${benchmark.minimum} weeks before wedding`,
              ],
              impact: 'Improved vendor availability and reduced stress',
              alternatives: [
                'Find last-minute vendors',
                'Simplify requirements',
              ],
            },
          });
        }
      }

      // Check for dependency conflicts
      node.dependencies.forEach((depId) => {
        const depNode = taskNodes.find((n) => n.task.id === depId);
        if (depNode) {
          const depFinish = new Date(
            depNode.earliestStart.getTime() +
              depNode.task.estimatedDuration * 24 * 60 * 60 * 1000,
          );

          if (depFinish >= node.earliestStart) {
            conflicts.push({
              type: 'task_dependency',
              description: `${node.task.title} cannot start before ${depNode.task.title} finishes`,
              affectedTasks: [node.task.id, depId],
              severity: 'medium',
              resolution: {
                strategy: 'adjust_timeline',
                steps: [
                  'Extend timeline for dependent task',
                  'Parallel execution where possible',
                ],
                impact: 'Resolved scheduling conflict',
                alternatives: ['Remove dependency', 'Simplify tasks'],
              },
            });
          }
        }
      });
    });

    // Check for resource conflicts (vendor availability)
    await this.checkVendorAvailabilityConflicts(taskNodes, request, conflicts);

    // Check for seasonal conflicts
    this.checkSeasonalConflicts(taskNodes, request, conflicts);

    return conflicts;
  }

  private async generateOptimizedSchedule(
    taskNodes: TaskNode[],
    request: TimelineOptimizationRequest,
    conflicts: TimelineConflict[],
  ): Promise<OptimizedTask[]> {
    const optimizedSchedule: OptimizedTask[] = [];

    // Apply industry benchmarks to optimize timing
    taskNodes.forEach((node) => {
      let optimizedDate = node.earliestStart;
      let reasoning = 'Current schedule maintained';
      let bufferDays = this.config.bufferDays;

      const benchmark = this.industryBenchmarks.get(
        node.task.category.toLowerCase(),
      );
      if (benchmark) {
        // Calculate optimal date based on industry benchmark
        const optimalWeeksBefore = benchmark.ideal;
        const optimalDate = new Date(
          request.weddingDate.getTime() -
            optimalWeeksBefore * 7 * 24 * 60 * 60 * 1000,
        );

        if (optimalDate > node.earliestStart) {
          optimizedDate = optimalDate;
          reasoning = `Moved to industry-recommended timing (${optimalWeeksBefore} weeks before wedding)`;
          bufferDays = Math.max(
            bufferDays,
            Math.floor(optimalWeeksBefore * 0.1 * 7),
          ); // 10% of time as buffer
        }
      }

      // Apply conflict resolutions
      const taskConflicts = conflicts.filter((c) =>
        c.affectedTasks.includes(node.task.id),
      );
      taskConflicts.forEach((conflict) => {
        if (conflict.resolution.strategy === 'reschedule_earlier') {
          const adjustedDate = new Date(
            optimizedDate.getTime() - 7 * 24 * 60 * 60 * 1000,
          ); // 1 week earlier
          if (adjustedDate > new Date()) {
            optimizedDate = adjustedDate;
            reasoning = `Rescheduled earlier to resolve ${conflict.type}`;
            bufferDays += 7;
          }
        }
      });

      // Apply seasonal adjustments
      const season = this.getSeason(request.weddingDate);
      const seasonalFactor = this.seasonalFactors.get(season);
      if (seasonalFactor && seasonalFactor.bookingPressure === 'high') {
        const adjustedDate = new Date(
          optimizedDate.getTime() - 14 * 24 * 60 * 60 * 1000,
        ); // 2 weeks earlier
        if (adjustedDate > new Date()) {
          optimizedDate = adjustedDate;
          reasoning += ' (adjusted for peak season booking pressure)';
          bufferDays += 14;
        }
      }

      optimizedSchedule.push({
        taskId: node.task.id,
        originalDate: node.task.dueDate,
        optimizedDate,
        reasoning,
        dependencies: node.task.dependencies,
        bufferDays,
        priority: this.calculateTaskPriority(node.task, benchmark),
      });
    });

    // Sort by optimized date
    optimizedSchedule.sort(
      (a, b) => a.optimizedDate.getTime() - b.optimizedDate.getTime(),
    );

    return optimizedSchedule;
  }

  private calculateBufferRecommendations(
    schedule: OptimizedTask[],
    request: TimelineOptimizationRequest,
  ): BufferRecommendation[] {
    return schedule.map((task) => {
      const originalTask = request.currentTasks.find(
        (t) => t.id === task.taskId,
      );
      if (!originalTask) {
        return {
          taskId: task.taskId,
          currentBuffer: 0,
          recommendedBuffer: task.bufferDays,
          reasoning: 'Task not found in original schedule',
          impact: 'Unknown',
          priority: 5,
        };
      }

      const currentBuffer = Math.max(
        0,
        Math.floor(
          (originalTask.dueDate.getTime() - new Date().getTime()) /
            (24 * 60 * 60 * 1000),
        ) - originalTask.estimatedDuration,
      );

      const impact = this.calculateBufferImpact(task.bufferDays, originalTask);
      const priority =
        originalTask.priority === 'critical'
          ? 10
          : originalTask.priority === 'high'
            ? 8
            : originalTask.priority === 'medium'
              ? 5
              : 3;

      return {
        taskId: task.taskId,
        currentBuffer,
        recommendedBuffer: task.bufferDays,
        reasoning: task.reasoning,
        impact,
        priority,
      };
    });
  }

  private calculateEfficiencyGains(
    originalTasks: WeddingTask[],
    optimizedSchedule: OptimizedTask[],
  ): EfficiencyGain[] {
    const gains: EfficiencyGain[] = [];

    // Calculate time savings from better scheduling
    const originalTimeline = this.calculateTimelineLength(originalTasks);
    const optimizedTimeline =
      this.calculateOptimizedTimelineLength(optimizedSchedule);

    if (originalTimeline > optimizedTimeline) {
      gains.push({
        area: 'Overall Timeline',
        currentDuration: originalTimeline,
        optimizedDuration: optimizedTimeline,
        timeSaved: originalTimeline - optimizedTimeline,
        method: 'Parallel task execution and optimal scheduling',
        confidence: 0.8,
      });
    }

    // Calculate gains from parallel execution
    const parallelOpportunities = this.identifyParallelExecutionOpportunities(
      originalTasks,
      optimizedSchedule,
    );
    parallelOpportunities.forEach((opportunity) => {
      gains.push({
        area: opportunity.area,
        currentDuration: opportunity.sequentialDuration,
        optimizedDuration: opportunity.parallelDuration,
        timeSaved:
          opportunity.sequentialDuration - opportunity.parallelDuration,
        method: 'Parallel task execution',
        confidence: 0.7,
      });
    });

    return gains;
  }

  private calculateRiskReduction(
    conflicts: TimelineConflict[],
    optimizedSchedule: OptimizedTask[],
  ): number {
    const originalRiskScore = conflicts.length * 0.2; // Each conflict adds 20% risk
    const severityMultiplier = conflicts.reduce((mult, conflict) => {
      switch (conflict.severity) {
        case 'critical':
          return mult * 1.5;
        case 'high':
          return mult * 1.3;
        case 'medium':
          return mult * 1.1;
        default:
          return mult;
      }
    }, 1);

    const totalOriginalRisk = Math.min(
      originalRiskScore * severityMultiplier,
      1,
    );

    // Calculate risk reduction from optimization
    const bufferBenefit = optimizedSchedule.reduce((benefit, task) => {
      return benefit + Math.min(task.bufferDays * 0.01, 0.1); // Each buffer day reduces risk by 1%, max 10%
    }, 0);

    const riskReduction = Math.min(bufferBenefit + 0.2, totalOriginalRisk); // Base 20% reduction + buffer benefits

    return riskReduction;
  }

  // Helper methods

  private findDuplicateTaskIds(tasks: WeddingTask[]): string[] {
    const ids = tasks.map((t) => t.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  }

  private topologicalSort(taskNodes: TaskNode[]): TaskNode[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: TaskNode[] = [];

    const visit = (node: TaskNode): void => {
      if (temp.has(node.task.id)) {
        throw new OptimizationError(
          `Circular dependency detected involving task: ${node.task.id}`,
        );
      }

      if (!visited.has(node.task.id)) {
        temp.add(node.task.id);

        node.dependencies.forEach((depId) => {
          const depNode = taskNodes.find((n) => n.task.id === depId);
          if (depNode) visit(depNode);
        });

        temp.delete(node.task.id);
        visited.add(node.task.id);
        result.unshift(node);
      }
    };

    taskNodes.forEach((node) => {
      if (!visited.has(node.task.id)) {
        visit(node);
      }
    });

    return result;
  }

  private getWeeksUntilWedding(taskDate: Date, weddingDate: Date): number {
    return Math.ceil(
      (weddingDate.getTime() - taskDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  }

  private async checkVendorAvailabilityConflicts(
    taskNodes: TaskNode[],
    request: TimelineOptimizationRequest,
    conflicts: TimelineConflict[],
  ): Promise<void> {
    // Mock vendor availability checking
    const season = this.getSeason(request.weddingDate);
    const seasonalFactor = this.seasonalFactors.get(season);

    if (seasonalFactor && seasonalFactor.vendorAvailability < 0.6) {
      const criticalTasks = taskNodes.filter((node) =>
        ['venue_booking', 'photographer_booking', 'catering_booking'].includes(
          node.task.category.toLowerCase(),
        ),
      );

      criticalTasks.forEach((node) => {
        const weeksUntil = this.getWeeksUntilWedding(
          node.earliestStart,
          request.weddingDate,
        );
        if (weeksUntil < 20) {
          // Less than 20 weeks before wedding in peak season
          conflicts.push({
            type: 'vendor_availability',
            description: `${node.task.title} may face limited vendor availability in ${season}`,
            affectedTasks: [node.task.id],
            severity: 'high',
            resolution: {
              strategy: 'book_earlier_or_alternatives',
              steps: [
                'Book immediately to secure preferred vendors',
                'Prepare list of alternative vendors',
                'Consider off-peak alternatives',
              ],
              impact: 'Improved vendor selection and pricing',
              alternatives: [
                'Flexible date options',
                'Different vendor categories',
              ],
            },
          });
        }
      });
    }
  }

  private checkSeasonalConflicts(
    taskNodes: TaskNode[],
    request: TimelineOptimizationRequest,
    conflicts: TimelineConflict[],
  ): void {
    const season = this.getSeason(request.weddingDate);
    const seasonalFactor = this.seasonalFactors.get(season);

    if (seasonalFactor && seasonalFactor.weatherRisk > 0.6) {
      // Add weather-related conflicts for outdoor elements
      const outdoorTasks = taskNodes.filter(
        (node) =>
          node.task.category.toLowerCase().includes('outdoor') ||
          node.task.description.toLowerCase().includes('outdoor'),
      );

      outdoorTasks.forEach((node) => {
        conflicts.push({
          type: 'weather_emergency',
          description: `${node.task.title} has weather risk in ${season}`,
          affectedTasks: [node.task.id],
          severity: 'medium',
          resolution: {
            strategy: 'backup_planning',
            steps: [
              'Arrange indoor backup options',
              'Include weather clauses in vendor contracts',
              'Plan equipment for weather contingencies',
            ],
            impact: 'Weather protection and peace of mind',
            alternatives: ['Indoor alternatives', 'Different season'],
          },
        });
      });
    }
  }

  private calculateTaskPriority(task: WeddingTask, benchmark: any): number {
    let priority = 5; // Base priority

    // Adjust based on task priority
    switch (task.priority) {
      case 'critical':
        priority = 10;
        break;
      case 'high':
        priority = 8;
        break;
      case 'medium':
        priority = 5;
        break;
      case 'low':
        priority = 3;
        break;
    }

    // Adjust based on industry benchmark importance
    if (benchmark) {
      switch (benchmark.importance) {
        case 'critical':
          priority = Math.max(priority, 9);
          break;
        case 'high':
          priority = Math.max(priority, 7);
          break;
        case 'medium':
          priority = Math.max(priority, 5);
          break;
      }
    }

    return priority;
  }

  private calculateBufferImpact(bufferDays: number, task: WeddingTask): string {
    if (bufferDays >= 14) {
      return 'Significant stress reduction and flexibility for changes';
    } else if (bufferDays >= 7) {
      return 'Moderate buffer for handling delays';
    } else if (bufferDays >= 3) {
      return 'Minimal buffer for minor adjustments';
    } else {
      return 'Tight timeline with limited flexibility';
    }
  }

  private calculateTimelineLength(tasks: WeddingTask[]): number {
    if (tasks.length === 0) return 0;

    const earliestStart = Math.min(...tasks.map((t) => t.dueDate.getTime()));
    const latestEnd = Math.max(
      ...tasks.map(
        (t) => t.dueDate.getTime() + t.estimatedDuration * 24 * 60 * 60 * 1000,
      ),
    );

    return Math.ceil((latestEnd - earliestStart) / (24 * 60 * 60 * 1000)); // Days
  }

  private calculateOptimizedTimelineLength(schedule: OptimizedTask[]): number {
    if (schedule.length === 0) return 0;

    const earliestStart = Math.min(
      ...schedule.map((s) => s.optimizedDate.getTime()),
    );
    const latestEnd = Math.max(
      ...schedule.map(
        (s) => s.optimizedDate.getTime() + 7 * 24 * 60 * 60 * 1000,
      ),
    ); // Assume 7 days duration

    return Math.ceil((latestEnd - earliestStart) / (24 * 60 * 60 * 1000)); // Days
  }

  private identifyParallelExecutionOpportunities(
    originalTasks: WeddingTask[],
    optimizedSchedule: OptimizedTask[],
  ): any[] {
    // Mock parallel execution opportunity identification
    return [
      {
        area: 'Vendor Research',
        sequentialDuration: 21, // 3 weeks sequentially
        parallelDuration: 10, // 10 days in parallel
      },
      {
        area: 'Dress & Accessories Shopping',
        sequentialDuration: 14, // 2 weeks sequentially
        parallelDuration: 7, // 1 week in parallel
      },
    ];
  }

  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }
}

export { TimelineOptimizationAI };
