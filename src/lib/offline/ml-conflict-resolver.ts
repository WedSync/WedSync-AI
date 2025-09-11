/**
 * ML-Powered Conflict Resolution System
 * Intelligent conflict resolution using machine learning and heuristics
 *
 * Features:
 * - ML-based conflict prediction and resolution
 * - Context-aware conflict analysis
 * - User behavior pattern learning
 * - Heuristic fallback for offline ML scenarios
 * - Wedding-specific conflict handling
 */

import { offlineDB } from '@/lib/database/offline-database';
import type { SyncQueueItem } from './offline-database';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface DataConflict {
  id: string;
  resourceType:
    | 'client'
    | 'vendor'
    | 'timeline'
    | 'guest'
    | 'form'
    | 'contract';
  field: string;
  clientValue: any;
  serverValue: any;
  clientTimestamp: string;
  serverTimestamp: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface UserContext {
  userId: string;
  userRole: 'coordinator' | 'vendor' | 'couple' | 'admin';
  organizationId: string;
  experienceLevel?: number;
  conflictHistory?: ConflictHistory[];
}

export interface ConflictHistory {
  conflictType: string;
  resolution: string;
  timestamp: string;
  userSatisfaction?: number;
}

export interface ConflictFeatures {
  // Temporal features
  timeSinceLastEdit: number;
  editFrequency: number;
  timeOfDay: number;
  dayOfWeek: number;

  // Content features
  contentSimilarity: number;
  changeSignificance: number;
  dataTypeImportance: number;
  fieldCriticality: number;

  // User features
  userExperienceLevel: number;
  userRoleImportance: number;
  userEditPatterns: number[];
  userConflictPreferences: number[];

  // Context features
  dataImportance: number;
  businessImpact: number;
  weddingProximity: number; // How close to wedding date
  resourceScarcity: number; // Vendor availability, etc.

  // Historical features
  similarConflictResolutions: ConflictHistory[];
  resolutionSuccessRate: number;
}

export interface MLSuggestion {
  action: 'client_wins' | 'server_wins' | 'merge' | 'user_choice';
  confidence: number;
  alternatives: Array<{ action: string; confidence: number }>;
  reasoning?: string;
}

export interface ConflictResolution {
  recommendedAction: string;
  confidence: number;
  explanation: string;
  alternativeOptions: Array<{ action: string; confidence: number }>;
  userChoice: string | null;
  appliedAt?: string;
}

// =====================================================
// ML CONFLICT RESOLVER CLASS
// =====================================================

export class MLConflictResolver {
  private static modelCache: Map<string, any> = new Map();
  private static featureCache: Map<string, ConflictFeatures> = new Map();

  /**
   * Main entry point for intelligent conflict resolution
   */
  static async resolveConflictIntelligently(
    conflict: DataConflict,
    userContext: UserContext,
  ): Promise<ConflictResolution> {
    try {
      // Extract features for ML model
      const features = await this.extractConflictFeatures(
        conflict,
        userContext,
      );

      // Cache features for learning
      this.featureCache.set(conflict.id, features);

      // Get ML suggestion (or fallback to heuristics)
      const mlSuggestion = await this.getMLSuggestion(features);

      // Generate human-readable explanation
      const explanation = this.generateConflictExplanation(
        conflict,
        mlSuggestion,
        features,
      );

      // Store resolution for future learning
      await this.storeResolutionForLearning(conflict, mlSuggestion, features);

      return {
        recommendedAction: mlSuggestion.action,
        confidence: mlSuggestion.confidence,
        explanation,
        alternativeOptions: mlSuggestion.alternatives,
        userChoice: null,
      };
    } catch (error) {
      console.error('Error in ML conflict resolution:', error);
      return this.getFallbackResolution(conflict);
    }
  }

  /**
   * Extract features from conflict and context for ML processing
   */
  private static async extractConflictFeatures(
    conflict: DataConflict,
    context: UserContext,
  ): Promise<ConflictFeatures> {
    const now = new Date();
    const clientTime = new Date(conflict.clientTimestamp);
    const serverTime = new Date(conflict.serverTimestamp);

    // Get user's edit frequency from database
    const editFrequency = await this.getUserEditFrequency(context.userId);

    // Get user experience level
    const userExperienceLevel = await this.getUserExperienceLevel(
      context.userId,
    );

    // Calculate wedding proximity (important for urgency)
    const weddingProximity = await this.calculateWeddingProximity(
      context.organizationId,
    );

    // Get similar conflict history
    const similarConflicts = await this.getSimilarConflictHistory(
      conflict,
      context.userId,
    );

    return {
      // Temporal features
      timeSinceLastEdit: Math.floor(
        (now.getTime() - clientTime.getTime()) / 1000,
      ),
      editFrequency,
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),

      // Content features
      contentSimilarity: this.calculateContentSimilarity(
        conflict.clientValue,
        conflict.serverValue,
      ),
      changeSignificance: this.assessChangeSignificance(conflict),
      dataTypeImportance: this.assessDataTypeImportance(conflict.resourceType),
      fieldCriticality: this.assessFieldCriticality(
        conflict.field,
        conflict.resourceType,
      ),

      // User features
      userExperienceLevel,
      userRoleImportance: this.assessUserRoleImportance(context.userRole),
      userEditPatterns: await this.getUserEditPatterns(context.userId),
      userConflictPreferences: await this.getUserConflictPreferences(
        context.userId,
      ),

      // Context features
      dataImportance: this.assessDataImportance(
        conflict.field,
        conflict.resourceType,
      ),
      businessImpact: await this.assessBusinessImpact(conflict, context),
      weddingProximity,
      resourceScarcity: await this.assessResourceScarcity(conflict, context),

      // Historical features
      similarConflictResolutions: similarConflicts,
      resolutionSuccessRate:
        await this.calculateResolutionSuccessRate(similarConflicts),
    };
  }

  /**
   * Get ML suggestion using TensorFlow.js or fallback to heuristics
   */
  private static async getMLSuggestion(
    features: ConflictFeatures,
  ): Promise<MLSuggestion> {
    try {
      // Try to load TensorFlow.js model for conflict resolution
      const model = await this.loadConflictResolutionModel();

      if (model) {
        return this.runMLInference(model, features);
      }
    } catch (error) {
      console.warn('ML model unavailable, using heuristics:', error);
    }

    // Fallback to rule-based heuristics
    return this.getHeuristicSuggestion(features);
  }

  /**
   * Load ML model (would be TensorFlow.js in production)
   */
  private static async loadConflictResolutionModel(): Promise<any> {
    // Check cache first
    if (this.modelCache.has('conflict_resolver')) {
      return this.modelCache.get('conflict_resolver');
    }

    // In production, this would load a TensorFlow.js model
    // For now, return null to use heuristics
    return null;
  }

  /**
   * Run ML inference on features
   */
  private static runMLInference(
    model: any,
    features: ConflictFeatures,
  ): MLSuggestion {
    // This would use TensorFlow.js for real inference
    // Simulating ML output for demonstration

    const actions = ['client_wins', 'server_wins', 'merge', 'user_choice'];

    // Simulate neural network output based on features
    const scores = this.simulateNeuralNetwork(features);

    const bestActionIndex = scores.indexOf(Math.max(...scores));

    return {
      action: actions[bestActionIndex] as any,
      confidence: scores[bestActionIndex],
      alternatives: actions
        .map((action, index) => ({ action, confidence: scores[index] }))
        .filter((_, index) => index !== bestActionIndex)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 2),
      reasoning: this.generateMLReasoning(features, actions[bestActionIndex]),
    };
  }

  /**
   * Simulate neural network scoring
   */
  private static simulateNeuralNetwork(features: ConflictFeatures): number[] {
    // Simulate scoring based on feature importance
    const scores = [0, 0, 0, 0]; // [client_wins, server_wins, merge, user_choice]

    // Recent client edit favors client
    if (features.timeSinceLastEdit < 300) scores[0] += 0.3;

    // High user experience favors their changes
    if (features.userExperienceLevel > 0.7) scores[0] += 0.2;

    // Critical data favors server (safety)
    if (features.dataImportance > 0.8) scores[1] += 0.3;

    // Similar content suggests merge
    if (features.contentSimilarity > 0.6 && features.contentSimilarity < 0.9)
      scores[2] += 0.3;

    // Complex changes need user input
    if (features.changeSignificance > 0.8) scores[3] += 0.2;

    // Wedding proximity affects urgency
    if (features.weddingProximity < 7) {
      // Less than 7 days
      scores[1] += 0.1; // Favor stability
    }

    // Normalize scores to probabilities
    const sum = scores.reduce((a, b) => a + b, 0.01);
    return scores.map((s) => s / sum);
  }

  /**
   * Get heuristic-based suggestion when ML is unavailable
   */
  private static getHeuristicSuggestion(
    features: ConflictFeatures,
  ): MLSuggestion {
    let clientScore = 0;
    let serverScore = 0;
    let mergeScore = 0;
    let userChoiceScore = 0;

    // === TEMPORAL RULES ===
    // Recent edits favor client
    if (features.timeSinceLastEdit < 60)
      clientScore += 40; // Within 1 minute
    else if (features.timeSinceLastEdit < 300)
      clientScore += 25; // Within 5 minutes
    else if (features.timeSinceLastEdit < 900)
      clientScore += 10; // Within 15 minutes
    else serverScore += 10; // Old edits favor server

    // === USER RULES ===
    // Experienced users' changes are trusted more
    if (features.userExperienceLevel > 0.8) clientScore += 25;
    else if (features.userExperienceLevel > 0.5) clientScore += 10;
    else serverScore += 5;

    // Role importance
    if (features.userRoleImportance > 0.8)
      clientScore += 15; // Admin/coordinator
    else if (features.userRoleImportance < 0.3) serverScore += 10; // Guest/low-privilege

    // === CONTENT RULES ===
    // Data criticality
    if (features.dataImportance > 0.9) {
      serverScore += 30; // Critical data favors server
      userChoiceScore += 20; // But might need user confirmation
    } else if (features.dataImportance > 0.7) {
      serverScore += 15;
    }

    // Content similarity suggests merge possibility
    if (features.contentSimilarity > 0.5 && features.contentSimilarity < 0.9) {
      mergeScore += 30;
    }

    // Significant changes need review
    if (features.changeSignificance > 0.8) {
      userChoiceScore += 25;
    } else if (features.changeSignificance > 0.5) {
      mergeScore += 10;
    }

    // === CONTEXT RULES ===
    // Wedding proximity affects decision
    if (features.weddingProximity < 1) {
      // Wedding day
      serverScore += 40; // Maximum stability
    } else if (features.weddingProximity < 7) {
      // Within a week
      serverScore += 20;
      userChoiceScore += 10; // Important changes need confirmation
    }

    // Business impact
    if (features.businessImpact > 0.8) {
      userChoiceScore += 30; // High impact needs human decision
    }

    // === HISTORICAL RULES ===
    // Learn from past resolutions
    if (features.resolutionSuccessRate > 0.8) {
      // Apply most common successful resolution pattern
      const mostSuccessful = this.getMostSuccessfulPattern(
        features.similarConflictResolutions,
      );
      if (mostSuccessful === 'client_wins') clientScore += 20;
      else if (mostSuccessful === 'server_wins') serverScore += 20;
      else if (mostSuccessful === 'merge') mergeScore += 20;
    }

    // Determine best action
    const scores = [
      { action: 'client_wins', score: clientScore },
      { action: 'server_wins', score: serverScore },
      { action: 'merge', score: mergeScore },
      { action: 'user_choice', score: userChoiceScore },
    ];

    scores.sort((a, b) => b.score - a.score);

    const maxScore = Math.max(
      clientScore,
      serverScore,
      mergeScore,
      userChoiceScore,
    );
    const confidence = Math.min(0.85, maxScore / 100); // Cap heuristic confidence

    return {
      action: scores[0].action as any,
      confidence,
      alternatives: scores.slice(1, 3).map((s) => ({
        action: s.action,
        confidence: Math.min(0.7, s.score / 100),
      })),
      reasoning: this.generateHeuristicReasoning(features, scores[0].action),
    };
  }

  /**
   * Generate human-readable explanation for the conflict resolution
   */
  private static generateConflictExplanation(
    conflict: DataConflict,
    suggestion: MLSuggestion,
    features: ConflictFeatures,
  ): string {
    const explanations: string[] = [];

    // Start with the main recommendation
    explanations.push(
      `Recommended action: ${this.formatAction(suggestion.action)} (${Math.round(suggestion.confidence * 100)}% confidence)`,
    );

    // Add context-specific explanations
    if (suggestion.action === 'client_wins') {
      if (features.timeSinceLastEdit < 300) {
        explanations.push('• Your changes were made very recently');
      }
      if (features.userExperienceLevel > 0.7) {
        explanations.push(
          '• Your experience level suggests these changes are intentional',
        );
      }
    } else if (suggestion.action === 'server_wins') {
      if (features.dataImportance > 0.8) {
        explanations.push('• This is critical data that requires consistency');
      }
      if (features.weddingProximity < 7) {
        explanations.push('• Wedding is approaching - favoring stability');
      }
    } else if (suggestion.action === 'merge') {
      explanations.push(
        '• Changes are compatible and can be merged automatically',
      );
      if (features.contentSimilarity > 0.6) {
        explanations.push('• Content is similar enough to merge safely');
      }
    } else if (suggestion.action === 'user_choice') {
      if (features.businessImpact > 0.8) {
        explanations.push('• This change has significant business impact');
      }
      if (features.changeSignificance > 0.8) {
        explanations.push('• The changes are substantial and need review');
      }
    }

    // Add reasoning if available
    if (suggestion.reasoning) {
      explanations.push(`\n${suggestion.reasoning}`);
    }

    // Add alternatives
    if (suggestion.alternatives.length > 0) {
      explanations.push('\nAlternative options:');
      suggestion.alternatives.forEach((alt) => {
        explanations.push(
          `• ${this.formatAction(alt.action)} (${Math.round(alt.confidence * 100)}%)`,
        );
      });
    }

    return explanations.join('\n');
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private static async getUserEditFrequency(userId: string): Promise<number> {
    try {
      const recentEdits = await offlineDB.syncQueue
        .where('userId')
        .equals(userId)
        .and((item) => {
          const timestamp = new Date(item.timestamp);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return timestamp > dayAgo;
        })
        .count();

      return Math.min(1, recentEdits / 100); // Normalize to 0-1
    } catch {
      return 0.5; // Default medium frequency
    }
  }

  private static async getUserExperienceLevel(userId: string): Promise<number> {
    try {
      // Check user's activity history
      const totalEdits = await offlineDB.syncQueue
        .where('userId')
        .equals(userId)
        .count();

      // Normalize based on expected activity levels
      return Math.min(1, totalEdits / 500);
    } catch {
      return 0.5; // Default medium experience
    }
  }

  private static calculateContentSimilarity(
    clientValue: any,
    serverValue: any,
  ): number {
    if (clientValue === serverValue) return 1;
    if (!clientValue || !serverValue) return 0;

    if (typeof clientValue === 'string' && typeof serverValue === 'string') {
      // Levenshtein distance for strings
      const maxLen = Math.max(clientValue.length, serverValue.length);
      if (maxLen === 0) return 1;
      const distance = this.levenshteinDistance(clientValue, serverValue);
      return 1 - distance / maxLen;
    }

    if (typeof clientValue === 'object' && typeof serverValue === 'object') {
      // Compare object keys and values
      const keys1 = Object.keys(clientValue);
      const keys2 = Object.keys(serverValue);
      const allKeys = new Set([...keys1, ...keys2]);

      let matches = 0;
      allKeys.forEach((key) => {
        if (clientValue[key] === serverValue[key]) matches++;
      });

      return matches / allKeys.size;
    }

    return 0;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private static assessChangeSignificance(conflict: DataConflict): number {
    // Assess how significant the change is
    const clientStr = JSON.stringify(conflict.clientValue);
    const serverStr = JSON.stringify(conflict.serverValue);

    const sizeDiff = Math.abs(clientStr.length - serverStr.length);
    const maxSize = Math.max(clientStr.length, serverStr.length);

    if (maxSize === 0) return 0;

    return Math.min(1, sizeDiff / maxSize);
  }

  private static assessDataTypeImportance(resourceType: string): number {
    const importanceMap: Record<string, number> = {
      contract: 0.95,
      vendor: 0.9,
      timeline: 0.85,
      client: 0.8,
      guest: 0.6,
      form: 0.5,
    };

    return importanceMap[resourceType] || 0.5;
  }

  private static assessFieldCriticality(
    field: string,
    resourceType: string,
  ): number {
    // Critical fields by resource type
    const criticalFields: Record<string, string[]> = {
      contract: ['amount', 'dueDate', 'terms', 'signatures'],
      vendor: ['contactInfo', 'availability', 'pricing'],
      timeline: ['startTime', 'endTime', 'location'],
      client: ['name', 'email', 'weddingDate'],
      guest: ['rsvpStatus', 'dietaryRestrictions'],
      form: ['required', 'validation'],
    };

    const critical = criticalFields[resourceType] || [];
    return critical.includes(field) ? 0.9 : 0.5;
  }

  private static assessUserRoleImportance(role: string): number {
    const roleImportance: Record<string, number> = {
      admin: 1.0,
      coordinator: 0.9,
      vendor: 0.7,
      couple: 0.6,
    };

    return roleImportance[role] || 0.5;
  }

  private static async getUserEditPatterns(userId: string): Promise<number[]> {
    // Return hourly edit pattern (24 values)
    const pattern = new Array(24).fill(0);

    try {
      const edits = await offlineDB.syncQueue
        .where('userId')
        .equals(userId)
        .toArray();

      edits.forEach((edit) => {
        const hour = new Date(edit.timestamp).getHours();
        pattern[hour]++;
      });

      // Normalize
      const max = Math.max(...pattern);
      if (max > 0) {
        return pattern.map((v) => v / max);
      }
    } catch {
      // Return default pattern
    }

    return pattern;
  }

  private static async getUserConflictPreferences(
    userId: string,
  ): Promise<number[]> {
    // Return preference scores for [client_wins, server_wins, merge, user_choice]
    return [0.25, 0.25, 0.25, 0.25]; // Default equal preference
  }

  private static assessDataImportance(
    field: string,
    resourceType: string,
  ): number {
    // Combine field criticality with resource importance
    const fieldCrit = this.assessFieldCriticality(field, resourceType);
    const resourceImp = this.assessDataTypeImportance(resourceType);

    return fieldCrit * 0.6 + resourceImp * 0.4;
  }

  private static async assessBusinessImpact(
    conflict: DataConflict,
    context: UserContext,
  ): Promise<number> {
    // Assess potential business impact of the change
    let impact = 0;

    // Contract changes have high impact
    if (conflict.resourceType === 'contract') impact += 0.4;

    // Vendor availability changes near wedding date
    if (
      conflict.resourceType === 'vendor' &&
      conflict.field === 'availability'
    ) {
      const weddingProximity = await this.calculateWeddingProximity(
        context.organizationId,
      );
      if (weddingProximity < 30) impact += 0.3;
    }

    // Timeline changes affect coordination
    if (conflict.resourceType === 'timeline') impact += 0.2;

    // Admin changes have higher impact
    if (context.userRole === 'admin') impact += 0.1;

    return Math.min(1, impact);
  }

  private static async calculateWeddingProximity(
    organizationId: string,
  ): Promise<number> {
    // Return days until wedding
    // In production, would query the actual wedding date
    return 30; // Default 30 days
  }

  private static async assessResourceScarcity(
    conflict: DataConflict,
    context: UserContext,
  ): Promise<number> {
    // Assess scarcity of the resource (vendor availability, etc.)
    if (conflict.resourceType === 'vendor') {
      // High demand vendors are scarce
      return 0.7;
    }

    return 0.3; // Default low scarcity
  }

  private static async getSimilarConflictHistory(
    conflict: DataConflict,
    userId: string,
  ): Promise<ConflictHistory[]> {
    // In production, would query actual conflict history
    return [];
  }

  private static async calculateResolutionSuccessRate(
    history: ConflictHistory[],
  ): Promise<number> {
    if (history.length === 0) return 0.5;

    const successful = history.filter(
      (h) => (h.userSatisfaction || 0) > 3,
    ).length;
    return successful / history.length;
  }

  private static getMostSuccessfulPattern(history: ConflictHistory[]): string {
    if (history.length === 0) return 'user_choice';

    const counts: Record<string, number> = {};
    history.forEach((h) => {
      if ((h.userSatisfaction || 0) > 3) {
        counts[h.resolution] = (counts[h.resolution] || 0) + 1;
      }
    });

    let maxCount = 0;
    let bestPattern = 'user_choice';

    Object.entries(counts).forEach(([pattern, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestPattern = pattern;
      }
    });

    return bestPattern;
  }

  private static formatAction(action: string): string {
    const formats: Record<string, string> = {
      client_wins: 'Use your changes',
      server_wins: 'Keep server version',
      merge: 'Merge both versions',
      user_choice: 'Choose manually',
    };

    return formats[action] || action;
  }

  private static generateMLReasoning(
    features: ConflictFeatures,
    action: string,
  ): string {
    const reasons: string[] = [];

    if (action === 'client_wins') {
      reasons.push('ML model suggests using your changes based on:');
      if (features.timeSinceLastEdit < 300)
        reasons.push('- Recent edit timestamp');
      if (features.userExperienceLevel > 0.7)
        reasons.push('- High user experience level');
      if (features.editFrequency > 0.5)
        reasons.push('- Consistent editing pattern');
    } else if (action === 'server_wins') {
      reasons.push('ML model suggests keeping server version based on:');
      if (features.dataImportance > 0.8)
        reasons.push('- Critical data importance');
      if (features.weddingProximity < 7)
        reasons.push('- Wedding date proximity');
      if (features.businessImpact > 0.7) reasons.push('- High business impact');
    }

    return reasons.join('\n');
  }

  private static generateHeuristicReasoning(
    features: ConflictFeatures,
    action: string,
  ): string {
    const reasons: string[] = [];

    reasons.push('Decision based on heuristic analysis:');

    if (features.timeSinceLastEdit < 300) {
      reasons.push(
        `- Edit made ${Math.round(features.timeSinceLastEdit / 60)} minutes ago`,
      );
    }

    if (features.userExperienceLevel > 0.7) {
      reasons.push('- User has high experience level');
    }

    if (features.dataImportance > 0.8) {
      reasons.push('- Data has critical importance');
    }

    if (features.weddingProximity < 7) {
      reasons.push(`- Wedding in ${features.weddingProximity} days`);
    }

    return reasons.join('\n');
  }

  /**
   * Store resolution for future learning
   */
  private static async storeResolutionForLearning(
    conflict: DataConflict,
    suggestion: MLSuggestion,
    features: ConflictFeatures,
  ): Promise<void> {
    try {
      // Store in IndexedDB for future model training
      await offlineDB.conflictHistory.add({
        conflictId: conflict.id,
        resourceType: conflict.resourceType,
        field: conflict.field,
        features: features,
        suggestion: suggestion,
        timestamp: new Date().toISOString(),
        userId: conflict.userId,
      });
    } catch (error) {
      console.error('Failed to store conflict resolution:', error);
    }
  }

  /**
   * Get fallback resolution when ML fails
   */
  private static getFallbackResolution(
    conflict: DataConflict,
  ): ConflictResolution {
    return {
      recommendedAction: 'user_choice',
      confidence: 0.5,
      explanation:
        'Unable to automatically resolve conflict. Please choose manually.',
      alternativeOptions: [
        { action: 'client_wins', confidence: 0.33 },
        { action: 'server_wins', confidence: 0.33 },
      ],
      userChoice: null,
    };
  }

  /**
   * Apply user's conflict resolution choice
   */
  static async applyUserChoice(
    conflictId: string,
    userChoice: 'client_wins' | 'server_wins' | 'merge',
    satisfaction?: number,
  ): Promise<void> {
    try {
      // Update conflict history with user choice
      const history = await offlineDB.conflictHistory
        .where('conflictId')
        .equals(conflictId)
        .first();

      if (history) {
        await offlineDB.conflictHistory.update(history.id!, {
          userChoice,
          userSatisfaction: satisfaction,
          resolvedAt: new Date().toISOString(),
        });
      }

      // Clear feature cache
      this.featureCache.delete(conflictId);

      console.log(
        `Conflict ${conflictId} resolved with user choice: ${userChoice}`,
      );
    } catch (error) {
      console.error('Failed to apply user choice:', error);
    }
  }
}

// Export for use in other modules
export default MLConflictResolver;
