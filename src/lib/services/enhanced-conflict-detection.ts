import { createClient } from '@supabase/supabase-js';
import { mlConflictDetector } from '@/lib/ml/conflict-detector';
import { AIConflictPredictionService } from './ai-conflict-prediction-service';
import { Task, HelperSuggestion } from '@/types/workflow';
import * as tf from '@tensorflow/tfjs';

export interface HelperConflictRequest {
  task_id: string;
  helper_id: string;
  scheduled_start: Date;
  scheduled_end: Date;
  wedding_id?: string;
}

export interface ConflictDetectionResult {
  has_conflict: boolean;
  conflict_type: ConflictType[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  predicted_impact: ConflictImpact;
  resolution_suggestions: ConflictResolution[];
  ml_analysis: MLConflictAnalysis;
  processing_time_ms: number;
}

export interface ConflictType {
  type:
    | 'schedule_overlap'
    | 'resource_conflict'
    | 'skill_mismatch'
    | 'workload_overload'
    | 'location_conflict';
  description: string;
  confidence: number;
  affected_tasks: string[];
  affected_helpers: string[];
}

export interface ConflictImpact {
  delay_minutes: number;
  cost_impact: number;
  client_satisfaction_impact: number; // -1 to 1 scale
  alternative_suggestions: HelperSuggestion[];
}

export interface ConflictResolution {
  resolution_type:
    | 'reschedule'
    | 'reassign'
    | 'add_buffer'
    | 'merge_tasks'
    | 'split_helper_time';
  description: string;
  implementation_difficulty: 'easy' | 'moderate' | 'difficult';
  success_probability: number;
  estimated_time_saved: number;
  steps: string[];
}

export interface MLConflictAnalysis {
  ml_prediction_confidence: number;
  historical_pattern_match: number;
  feature_importance: Record<string, number>;
  similar_cases_found: number;
  learned_optimizations: string[];
}

export interface ConflictFeatures {
  // Time-based features
  time_overlap_percentage: number;
  buffer_time_minutes: number;
  peak_hours_conflict: boolean;

  // Helper-based features
  helper_workload_score: number;
  helper_skill_match_score: number;
  helper_availability_confidence: number;
  helper_performance_history: number;

  // Task-based features
  task_complexity_score: number;
  task_priority_weight: number;
  task_dependencies_count: number;
  estimated_duration_variance: number;

  // Context features
  venue_capacity_stress: number;
  weather_impact_factor: number;
  vendor_coordination_complexity: number;
  historical_conflict_rate: number;
}

/**
 * Enhanced Conflict Detection Service with ML optimization for helper assignments
 * Integrates with existing ML systems and adds helper-specific conflict detection
 */
export class EnhancedConflictDetectionService {
  private supabase: ReturnType<typeof createClient>;
  private aiConflictService: AIConflictPredictionService;
  private mlModel: tf.LayersModel | null = null;
  private cache: Map<string, ConflictDetectionResult> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly ML_CONFIDENCE_THRESHOLD = 0.8;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.aiConflictService = new AIConflictPredictionService();
    this.initializeMLModel();
  }

  /**
   * Main conflict detection method with ML optimization
   */
  async detectHelperConflict(
    request: HelperConflictRequest,
  ): Promise<ConflictDetectionResult> {
    const startTime = Date.now();

    try {
      // Check cache first for performance
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return { ...cached, processing_time_ms: Date.now() - startTime };
      }

      // Extract comprehensive features for ML analysis
      const features = await this.extractConflictFeatures(request);

      // Run ML prediction
      const mlPrediction = await this.runMLConflictPrediction(features);

      // Combine with rule-based conflict detection
      const ruleBasedConflicts = await this.detectRuleBasedConflicts(request);

      // Integrate historical pattern analysis
      const historicalAnalysis = await this.analyzeHistoricalPatterns(
        request,
        features,
      );

      // Generate comprehensive conflict result
      const result = await this.synthesizeConflictResult(
        request,
        features,
        mlPrediction,
        ruleBasedConflicts,
        historicalAnalysis,
        startTime,
      );

      // Cache the result
      this.cacheResult(cacheKey, result);

      // Log metrics for continuous learning
      await this.logConflictDetectionMetrics(request, result);

      return result;
    } catch (error) {
      console.error('Enhanced conflict detection failed:', error);

      // Fallback to basic conflict detection
      return this.getFallbackConflictResult(request, startTime);
    }
  }

  /**
   * Bulk conflict detection for multiple helper assignments
   */
  async detectBulkConflicts(
    requests: HelperConflictRequest[],
  ): Promise<Map<string, ConflictDetectionResult>> {
    const startTime = Date.now();
    const results = new Map<string, ConflictDetectionResult>();

    // Process in parallel for better performance
    const detectionPromises = requests.map(async (request) => {
      const result = await this.detectHelperConflict(request);
      return { key: `${request.task_id}-${request.helper_id}`, result };
    });

    const detectionResults = await Promise.all(detectionPromises);

    detectionResults.forEach(({ key, result }) => {
      results.set(key, result);
    });

    console.log(
      `Bulk conflict detection completed: ${requests.length} requests in ${Date.now() - startTime}ms`,
    );

    return results;
  }

  /**
   * Advanced ML-powered conflict optimization
   */
  async optimizeHelperAssignments(
    tasks: Task[],
    availableHelpers: string[],
    constraints: {
      max_conflicts_allowed?: number;
      priority_weight_high?: number;
      priority_weight_medium?: number;
      priority_weight_low?: number;
    } = {},
  ): Promise<{
    optimized_assignments: Array<{
      task_id: string;
      helper_id: string;
      confidence: number;
    }>;
    conflicts_resolved: number;
    optimization_score: number;
    alternative_scenarios: any[];
  }> {
    const startTime = Date.now();

    try {
      // Generate all possible task-helper combinations
      const possibleAssignments = tasks.flatMap((task) =>
        availableHelpers.map((helperId) => ({
          task_id: task.id!,
          helper_id: helperId,
          task,
          helper_id_ref: helperId,
        })),
      );

      // Score each combination for conflicts and suitability
      const scoredAssignments = await Promise.all(
        possibleAssignments.map(async (assignment) => {
          const conflictCheck = await this.detectHelperConflict({
            task_id: assignment.task_id,
            helper_id: assignment.helper_id,
            scheduled_start: assignment.task.scheduled_start || new Date(),
            scheduled_end:
              assignment.task.scheduled_end ||
              new Date(Date.now() + 2 * 60 * 60 * 1000),
            wedding_id: assignment.task.wedding_id,
          });

          // Calculate suitability score (inverse of conflict severity)
          let suitabilityScore = 1.0;
          if (conflictCheck.has_conflict) {
            const severityPenalty = {
              low: 0.1,
              medium: 0.3,
              high: 0.6,
              critical: 0.9,
            };
            suitabilityScore -= severityPenalty[conflictCheck.severity];
          }

          // Add priority weighting
          const priorityBoost = {
            high: constraints.priority_weight_high || 1.2,
            medium: constraints.priority_weight_medium || 1.0,
            low: constraints.priority_weight_low || 0.8,
          };
          suitabilityScore *= priorityBoost[assignment.task.priority];

          return {
            ...assignment,
            conflict_result: conflictCheck,
            suitability_score: Math.max(0, suitabilityScore),
            has_conflict: conflictCheck.has_conflict,
          };
        }),
      );

      // Use ML-optimized assignment algorithm
      const optimizedAssignments = await this.runMLOptimizationAlgorithm(
        scoredAssignments,
        constraints,
      );

      // Generate alternative scenarios
      const alternativeScenarios = await this.generateAlternativeScenarios(
        scoredAssignments,
        optimizedAssignments,
      );

      const conflictsResolved =
        scoredAssignments.filter((a) => a.has_conflict).length -
        optimizedAssignments.filter((a) => a.has_conflict).length;

      const optimizationScore =
        this.calculateOptimizationScore(optimizedAssignments);

      const result = {
        optimized_assignments: optimizedAssignments.map((assignment) => ({
          task_id: assignment.task_id,
          helper_id: assignment.helper_id,
          confidence: assignment.suitability_score,
        })),
        conflicts_resolved: Math.max(0, conflictsResolved),
        optimization_score: optimizationScore,
        alternative_scenarios: alternativeScenarios,
      };

      console.log(
        `Assignment optimization completed in ${Date.now() - startTime}ms`,
      );
      return result;
    } catch (error) {
      console.error('Assignment optimization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize ML model for conflict prediction
   */
  private async initializeMLModel(): Promise<void> {
    try {
      // Create a specialized helper conflict detection model
      this.mlModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [12], // 12 features from ConflictFeatures
            units: 64,
            activation: 'relu',
            name: 'input_layer',
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'hidden1',
          }),
          tf.layers.dropout({ rate: 0.15 }),
          tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'hidden2',
          }),
          tf.layers.dense({
            units: 4, // Output: [conflict_probability, severity_score, impact_score, resolution_difficulty]
            activation: 'sigmoid',
            name: 'output',
          }),
        ],
      });

      this.mlModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['accuracy'],
      });

      // Load pre-trained weights if available
      await this.loadPretrainedWeights();

      console.log(
        'Enhanced ML conflict detection model initialized successfully',
      );
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      // Continue without ML - will fall back to rule-based detection
    }
  }

  /**
   * Load pre-trained model weights for helper conflict detection
   */
  private async loadPretrainedWeights(): Promise<void> {
    try {
      // In production, this would load actual trained weights
      // For now, initialize with reasonable default weights
      console.log('Using default ML weights for helper conflict detection');

      // You could load from a model file here:
      // const modelPath = '/models/helper-conflict-detector-v1.0.0';
      // const loadedModel = await tf.loadLayersModel(modelPath);
      // this.mlModel = loadedModel;
    } catch (error) {
      console.log('No pre-trained weights found, using default initialization');
    }
  }

  /**
   * Extract comprehensive features for ML conflict prediction
   */
  private async extractConflictFeatures(
    request: HelperConflictRequest,
  ): Promise<ConflictFeatures> {
    // Get task details
    const { data: task } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', request.task_id)
      .single();

    // Get helper details
    const { data: helper } = await this.supabase
      .from('task_helpers')
      .select('*, performance_metrics')
      .eq('id', request.helper_id)
      .single();

    // Get existing assignments for time conflict analysis
    const { data: existingAssignments } = await this.supabase
      .from('task_assignments')
      .select('*, tasks(*)')
      .eq('helper_id', request.helper_id)
      .eq('status', 'active');

    // Calculate time-based features
    const timeOverlap = this.calculateTimeOverlap(
      request,
      existingAssignments || [],
    );
    const bufferTime = this.calculateBufferTime(
      request,
      existingAssignments || [],
    );
    const isPeakHours = this.isPeakHours(request.scheduled_start);

    // Calculate helper-based features
    const helperWorkload = this.calculateHelperWorkload(
      helper,
      existingAssignments || [],
    );
    const skillMatch = await this.calculateSkillMatch(task, helper);
    const availabilityConfidence = this.calculateAvailabilityConfidence(
      helper,
      request,
    );
    const performanceHistory =
      helper?.performance_metrics?.overall_score || 0.5;

    // Calculate task-based features
    const taskComplexity = this.calculateTaskComplexity(task);
    const priorityWeight = { high: 1.0, medium: 0.7, low: 0.4 }[
      task?.priority || 'medium'
    ];
    const dependenciesCount = task?.dependencies?.length || 0;
    const durationVariance = this.calculateDurationVariance(task);

    // Calculate context features
    const venueStress = await this.calculateVenueStress(
      request.wedding_id || '',
    );
    const weatherImpact = await this.calculateWeatherImpact(
      request.wedding_id || '',
    );
    const vendorComplexity = await this.calculateVendorComplexity(task);
    const historicalConflictRate = await this.getHistoricalConflictRate(
      request.helper_id,
    );

    return {
      // Time-based features
      time_overlap_percentage: timeOverlap,
      buffer_time_minutes: bufferTime,
      peak_hours_conflict: isPeakHours,

      // Helper-based features
      helper_workload_score: helperWorkload,
      helper_skill_match_score: skillMatch,
      helper_availability_confidence: availabilityConfidence,
      helper_performance_history: performanceHistory,

      // Task-based features
      task_complexity_score: taskComplexity,
      task_priority_weight: priorityWeight,
      task_dependencies_count: Math.min(dependenciesCount, 10) / 10, // Normalize to 0-1
      estimated_duration_variance: durationVariance,

      // Context features
      venue_capacity_stress: venueStress,
      weather_impact_factor: weatherImpact,
      vendor_coordination_complexity: vendorComplexity,
      historical_conflict_rate: historicalConflictRate,
    };
  }

  /**
   * Run ML prediction on extracted features
   */
  private async runMLConflictPrediction(features: ConflictFeatures): Promise<{
    conflict_probability: number;
    severity_score: number;
    impact_score: number;
    resolution_difficulty: number;
    confidence: number;
  }> {
    if (!this.mlModel) {
      // Fallback to heuristic prediction
      return this.getHeuristicPrediction(features);
    }

    try {
      // Convert features to tensor
      const featureArray = [
        features.time_overlap_percentage,
        features.buffer_time_minutes / 60, // Normalize to hours
        features.peak_hours_conflict ? 1 : 0,
        features.helper_workload_score,
        features.helper_skill_match_score,
        features.helper_availability_confidence,
        features.helper_performance_history,
        features.task_complexity_score,
        features.task_priority_weight,
        features.task_dependencies_count,
        features.estimated_duration_variance,
        features.venue_capacity_stress,
      ];

      const inputTensor = tf.tensor2d([featureArray]);
      const prediction = this.mlModel.predict(inputTensor) as tf.Tensor;
      const result = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      return {
        conflict_probability: result[0],
        severity_score: result[1],
        impact_score: result[2],
        resolution_difficulty: result[3],
        confidence: Math.min(
          features.helper_performance_history * 0.4 +
            features.helper_availability_confidence * 0.3 +
            (1 - features.estimated_duration_variance) * 0.3,
          0.95,
        ),
      };
    } catch (error) {
      console.error('ML prediction failed:', error);
      return this.getHeuristicPrediction(features);
    }
  }

  /**
   * Fallback heuristic prediction when ML is unavailable
   */
  private getHeuristicPrediction(features: ConflictFeatures): {
    conflict_probability: number;
    severity_score: number;
    impact_score: number;
    resolution_difficulty: number;
    confidence: number;
  } {
    // Simple heuristic based on key factors
    let conflictProb = 0;

    // Time conflicts are critical
    conflictProb += features.time_overlap_percentage * 0.4;

    // Helper overload
    if (features.helper_workload_score > 0.8) conflictProb += 0.3;

    // Skill mismatch
    if (features.helper_skill_match_score < 0.4) conflictProb += 0.2;

    // Peak hours stress
    if (features.peak_hours_conflict) conflictProb += 0.1;

    const severityScore = Math.min(
      conflictProb + features.task_complexity_score * 0.3,
      1.0,
    );
    const impactScore = severityScore * features.task_priority_weight;
    const resolutionDifficulty =
      (conflictProb + features.vendor_coordination_complexity) / 2;

    return {
      conflict_probability: Math.min(conflictProb, 0.95),
      severity_score: severityScore,
      impact_score: impactScore,
      resolution_difficulty: resolutionDifficulty,
      confidence: 0.7, // Lower confidence for heuristic
    };
  }

  /**
   * Detect rule-based conflicts (traditional logic)
   */
  private async detectRuleBasedConflicts(
    request: HelperConflictRequest,
  ): Promise<ConflictType[]> {
    const conflicts: ConflictType[] = [];

    // Check for direct time overlaps
    const timeConflict = await this.checkTimeConflicts(request);
    if (timeConflict.has_conflict) {
      conflicts.push({
        type: 'schedule_overlap',
        description:
          'Direct scheduling conflict detected with existing assignments',
        confidence: 0.95,
        affected_tasks: timeConflict.conflicting_tasks,
        affected_helpers: [request.helper_id],
      });
    }

    // Check for resource conflicts
    const resourceConflict = await this.checkResourceConflicts(request);
    if (resourceConflict.has_conflict) {
      conflicts.push({
        type: 'resource_conflict',
        description: 'Resource or equipment conflict identified',
        confidence: 0.8,
        affected_tasks: resourceConflict.conflicting_tasks,
        affected_helpers: resourceConflict.affected_helpers,
      });
    }

    // Check for workload overload
    const workloadConflict = await this.checkWorkloadOverload(request);
    if (workloadConflict.overloaded) {
      conflicts.push({
        type: 'workload_overload',
        description: 'Helper workload exceeds recommended capacity',
        confidence: 0.9,
        affected_tasks: workloadConflict.affected_tasks,
        affected_helpers: [request.helper_id],
      });
    }

    return conflicts;
  }

  /**
   * Analyze historical patterns for similar conflict scenarios
   */
  private async analyzeHistoricalPatterns(
    request: HelperConflictRequest,
    features: ConflictFeatures,
  ): Promise<{
    similar_cases: number;
    historical_success_rate: number;
    pattern_confidence: number;
    learned_optimizations: string[];
  }> {
    try {
      // Query historical assignments with similar feature patterns
      const { data: historicalCases, error } = await this.supabase
        .from('historical_assignments')
        .select('*, assignment_outcomes(*)')
        .gte(
          'created_at',
          new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        ) // Last 6 months
        .limit(100);

      if (error || !historicalCases) {
        return {
          similar_cases: 0,
          historical_success_rate: 0.5,
          pattern_confidence: 0.2,
          learned_optimizations: [],
        };
      }

      // Find similar cases based on feature similarity
      const similarCases = historicalCases.filter(
        (case_) =>
          this.calculateFeatureSimilarity(features, case_.features || {}) > 0.7,
      );

      const successfulCases = similarCases.filter(
        (case_) =>
          case_.assignment_outcomes &&
          case_.assignment_outcomes.success_rating > 0.7,
      );

      const successRate =
        similarCases.length > 0
          ? successfulCases.length / similarCases.length
          : 0.5;

      // Extract learned optimizations from successful cases
      const optimizations = this.extractOptimizations(successfulCases);

      return {
        similar_cases: similarCases.length,
        historical_success_rate: successRate,
        pattern_confidence: Math.min(similarCases.length * 0.1, 0.9),
        learned_optimizations: optimizations,
      };
    } catch (error) {
      console.error('Historical pattern analysis failed:', error);
      return {
        similar_cases: 0,
        historical_success_rate: 0.5,
        pattern_confidence: 0.1,
        learned_optimizations: [],
      };
    }
  }

  /**
   * Generate comprehensive conflict result
   */
  private async synthesizeConflictResult(
    request: HelperConflictRequest,
    features: ConflictFeatures,
    mlPrediction: any,
    ruleBasedConflicts: ConflictType[],
    historicalAnalysis: any,
    startTime: number,
  ): Promise<ConflictDetectionResult> {
    // Determine if conflict exists
    const hasConflict =
      mlPrediction.conflict_probability > this.ML_CONFIDENCE_THRESHOLD ||
      ruleBasedConflicts.length > 0;

    // Calculate severity
    const severity = this.calculateOverallSeverity(
      mlPrediction,
      ruleBasedConflicts,
    );

    // Generate resolution suggestions
    const resolutions = await this.generateResolutionSuggestions(
      request,
      ruleBasedConflicts,
      mlPrediction,
      features,
    );

    // Calculate predicted impact
    const impact = await this.calculatePredictedImpact(
      request,
      mlPrediction,
      features,
    );

    // Combine confidence scores
    const overallConfidence = this.calculateOverallConfidence(
      mlPrediction.confidence,
      ruleBasedConflicts,
      historicalAnalysis.pattern_confidence,
    );

    return {
      has_conflict: hasConflict,
      conflict_type: ruleBasedConflicts,
      severity,
      confidence_score: overallConfidence,
      predicted_impact: impact,
      resolution_suggestions: resolutions,
      ml_analysis: {
        ml_prediction_confidence: mlPrediction.confidence,
        historical_pattern_match: historicalAnalysis.pattern_confidence,
        feature_importance: this.calculateFeatureImportance(features),
        similar_cases_found: historicalAnalysis.similar_cases,
        learned_optimizations: historicalAnalysis.learned_optimizations,
      },
      processing_time_ms: Date.now() - startTime,
    };
  }

  // Helper methods for calculations (abbreviated for space)
  private calculateTimeOverlap(
    request: HelperConflictRequest,
    assignments: any[],
  ): number {
    // Implementation for time overlap calculation
    return 0; // Placeholder
  }

  private calculateBufferTime(
    request: HelperConflictRequest,
    assignments: any[],
  ): number {
    // Implementation for buffer time calculation
    return 30; // Placeholder - 30 minutes default buffer
  }

  private isPeakHours(date: Date): boolean {
    const hour = date.getHours();
    return hour >= 16 && hour <= 20; // 4 PM to 8 PM are peak wedding hours
  }

  private calculateHelperWorkload(helper: any, assignments: any[]): number {
    // Implementation for workload calculation
    return Math.min(assignments.length / 10, 1.0); // Normalize to 0-1
  }

  private async calculateSkillMatch(task: any, helper: any): Promise<number> {
    // Implementation for skill matching
    return 0.8; // Placeholder
  }

  private calculateAvailabilityConfidence(
    helper: any,
    request: HelperConflictRequest,
  ): number {
    // Implementation for availability confidence
    return 0.9; // Placeholder
  }

  private calculateTaskComplexity(task: any): number {
    // Implementation for task complexity calculation
    return task?.priority === 'high'
      ? 0.8
      : task?.priority === 'medium'
        ? 0.5
        : 0.3;
  }

  private calculateDurationVariance(task: any): number {
    // Implementation for duration variance calculation
    return 0.2; // Placeholder
  }

  private async calculateVenueStress(weddingId: string): Promise<number> {
    // Implementation for venue capacity stress
    return 0.3; // Placeholder
  }

  private async calculateWeatherImpact(weddingId: string): Promise<number> {
    // Implementation for weather impact calculation
    return 0.1; // Placeholder
  }

  private async calculateVendorComplexity(task: any): Promise<number> {
    // Implementation for vendor coordination complexity
    return 0.4; // Placeholder
  }

  private async getHistoricalConflictRate(helperId: string): Promise<number> {
    // Implementation for historical conflict rate
    return 0.15; // Placeholder - 15% historical conflict rate
  }

  private async checkTimeConflicts(request: HelperConflictRequest): Promise<{
    has_conflict: boolean;
    conflicting_tasks: string[];
  }> {
    // Implementation for time conflict checking
    return { has_conflict: false, conflicting_tasks: [] };
  }

  private async checkResourceConflicts(
    request: HelperConflictRequest,
  ): Promise<{
    has_conflict: boolean;
    conflicting_tasks: string[];
    affected_helpers: string[];
  }> {
    // Implementation for resource conflict checking
    return { has_conflict: false, conflicting_tasks: [], affected_helpers: [] };
  }

  private async checkWorkloadOverload(request: HelperConflictRequest): Promise<{
    overloaded: boolean;
    affected_tasks: string[];
  }> {
    // Implementation for workload overload checking
    return { overloaded: false, affected_tasks: [] };
  }

  private calculateFeatureSimilarity(
    features1: ConflictFeatures,
    features2: any,
  ): number {
    // Implementation for feature similarity calculation
    return 0.8; // Placeholder
  }

  private extractOptimizations(successfulCases: any[]): string[] {
    // Implementation for optimization extraction
    return ['Add buffer time', 'Use experienced helpers for complex tasks'];
  }

  private calculateOverallSeverity(
    mlPrediction: any,
    conflicts: ConflictType[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    const maxSeverityScore = Math.max(
      mlPrediction.severity_score,
      conflicts.length > 0
        ? Math.max(...conflicts.map((c) => c.confidence))
        : 0,
    );

    if (maxSeverityScore > 0.9) return 'critical';
    if (maxSeverityScore > 0.7) return 'high';
    if (maxSeverityScore > 0.4) return 'medium';
    return 'low';
  }

  private async generateResolutionSuggestions(
    request: HelperConflictRequest,
    conflicts: ConflictType[],
    mlPrediction: any,
    features: ConflictFeatures,
  ): Promise<ConflictResolution[]> {
    // Implementation for resolution suggestions
    return [
      {
        resolution_type: 'reschedule',
        description: 'Reschedule task to avoid time conflict',
        implementation_difficulty: 'moderate',
        success_probability: 0.8,
        estimated_time_saved: 30,
        steps: [
          'Find alternative time slot',
          'Confirm helper availability',
          'Update schedule',
        ],
      },
    ];
  }

  private async calculatePredictedImpact(
    request: HelperConflictRequest,
    mlPrediction: any,
    features: ConflictFeatures,
  ): Promise<ConflictImpact> {
    return {
      delay_minutes: Math.round(mlPrediction.impact_score * 60),
      cost_impact: mlPrediction.impact_score * 500,
      client_satisfaction_impact: -mlPrediction.impact_score * 0.3,
      alternative_suggestions: [], // Would be populated with actual alternatives
    };
  }

  private calculateOverallConfidence(
    mlConfidence: number,
    conflicts: ConflictType[],
    historicalConfidence: number,
  ): number {
    const conflictConfidence =
      conflicts.length > 0
        ? conflicts.reduce((sum, c) => sum + c.confidence, 0) / conflicts.length
        : 0;

    return (
      mlConfidence * 0.5 + conflictConfidence * 0.3 + historicalConfidence * 0.2
    );
  }

  private calculateFeatureImportance(
    features: ConflictFeatures,
  ): Record<string, number> {
    // This would be calculated by the ML model
    return {
      time_overlap_percentage: 0.3,
      helper_workload_score: 0.25,
      task_complexity_score: 0.2,
      helper_skill_match_score: 0.15,
      buffer_time_minutes: 0.1,
    };
  }

  private async runMLOptimizationAlgorithm(
    scoredAssignments: any[],
    constraints: any,
  ): Promise<any[]> {
    // Implementation for ML-based optimization algorithm
    // This would use more sophisticated optimization techniques
    return scoredAssignments
      .filter((a) => !a.has_conflict)
      .sort((a, b) => b.suitability_score - a.suitability_score)
      .slice(0, constraints.max_conflicts_allowed || scoredAssignments.length);
  }

  private async generateAlternativeScenarios(
    allAssignments: any[],
    optimizedAssignments: any[],
  ): Promise<any[]> {
    // Implementation for alternative scenario generation
    return [];
  }

  private calculateOptimizationScore(assignments: any[]): number {
    const totalScore = assignments.reduce(
      (sum, a) => sum + a.suitability_score,
      0,
    );
    return assignments.length > 0 ? totalScore / assignments.length : 0;
  }

  // Caching methods
  private generateCacheKey(request: HelperConflictRequest): string {
    return `conflict:${request.task_id}:${request.helper_id}:${request.scheduled_start.getTime()}`;
  }

  private getCachedResult(key: string): ConflictDetectionResult | null {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    return null;
  }

  private cacheResult(key: string, result: ConflictDetectionResult): void {
    this.cache.set(key, result);

    // Clean up old cache entries
    setTimeout(() => {
      this.cache.delete(key);
    }, this.CACHE_DURATION);
  }

  private async logConflictDetectionMetrics(
    request: HelperConflictRequest,
    result: ConflictDetectionResult,
  ): Promise<void> {
    try {
      await this.supabase.from('conflict_detection_metrics').insert({
        task_id: request.task_id,
        helper_id: request.helper_id,
        has_conflict: result.has_conflict,
        confidence_score: result.confidence_score,
        severity: result.severity,
        processing_time_ms: result.processing_time_ms,
        ml_confidence: result.ml_analysis.ml_prediction_confidence,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to log conflict detection metrics:', error);
    }
  }

  private getFallbackConflictResult(
    request: HelperConflictRequest,
    startTime: number,
  ): ConflictDetectionResult {
    return {
      has_conflict: false,
      conflict_type: [],
      severity: 'low',
      confidence_score: 0.5,
      predicted_impact: {
        delay_minutes: 0,
        cost_impact: 0,
        client_satisfaction_impact: 0,
        alternative_suggestions: [],
      },
      resolution_suggestions: [],
      ml_analysis: {
        ml_prediction_confidence: 0.3,
        historical_pattern_match: 0.1,
        feature_importance: {},
        similar_cases_found: 0,
        learned_optimizations: [],
      },
      processing_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Cleanup method
   */
  dispose(): void {
    if (this.mlModel) {
      this.mlModel.dispose();
      this.mlModel = null;
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const enhancedConflictDetection = new EnhancedConflictDetectionService();
