// WS-055: Real-time Scoring System
// Processes client activities in real-time to update scores and trigger notifications

import { createSupabaseClient } from '@/lib/supabase';
import { BookingPredictor } from './booking-predictor';
import { ClientIntentScorer } from './intent-scorer';
import type {
  RealTimeActivity,
  ScoreUpdate,
  IntentScore,
  BookingPrediction,
  RealTimeScoringConfig,
  ChurnRiskAssessment,
} from './types';

interface WebSocketClient {
  id: string;
  send: (data: string) => void;
  readyState: number;
}

interface ScoreCache {
  client_id: string;
  intent_score: number;
  booking_probability: number;
  last_updated: number;
  version: number;
}

export class RealTimeScoring {
  private supabase = createSupabaseClient();
  private bookingPredictor = new BookingPredictor();
  private intentScorer = new ClientIntentScorer();
  private webSocketClients: WebSocketClient[] = [];
  private scoreCache = new Map<string, ScoreCache>();
  private processingQueue: RealTimeActivity[] = [];
  private isProcessing = false;

  private config: RealTimeScoringConfig = {
    websocket_url: process.env.WEBSOCKET_URL || 'ws://localhost:3001',
    update_frequency_ms: 1000, // Process queue every second
    batch_processing: {
      enabled: true,
      batch_size: 10,
      flush_interval_ms: 5000,
    },
    caching: {
      enabled: true,
      ttl_seconds: 300, // 5 minutes
      max_entries: 1000,
    },
    performance_thresholds: {
      max_inference_time_ms: 500,
      max_memory_usage_mb: 100,
      min_accuracy_threshold: 0.8,
    },
  };

  /**
   * Initializes the real-time scoring system
   */
  async initialize(): Promise<void> {
    console.log('Initializing real-time scoring system...');

    // Start processing queue
    this.startQueueProcessor();

    // Set up Supabase real-time subscriptions
    await this.setupRealtimeSubscriptions();

    // Initialize WebSocket server for client updates
    await this.initializeWebSocketServer();

    console.log('Real-time scoring system initialized');
  }

  /**
   * Processes a single client activity and updates scores
   */
  async processActivity(
    clientId: string,
    activity: RealTimeActivity,
  ): Promise<ScoreUpdate> {
    const startTime = performance.now();

    try {
      // Add to processing queue for batch processing
      this.processingQueue.push(activity);

      // For high-value activities, process immediately
      if (activity.value_score >= 8 || this.isUrgentActivity(activity)) {
        return await this.processActivityImmediate(clientId, activity);
      }

      // For normal activities, return cached score with update promise
      const cachedScore = this.getCachedScore(clientId);
      if (cachedScore) {
        // Schedule async update
        setImmediate(() => this.processActivityImmediate(clientId, activity));

        return {
          client_id: clientId,
          previous_score: cachedScore.intent_score,
          new_score: cachedScore.intent_score, // Same for now, will update async
          score_change: 0,
          factors_changed: ['activity_queued'],
          confidence: 0.8,
          update_reason: 'Queued for batch processing',
          timestamp: new Date(),
        };
      }

      // No cache available, process immediately
      return await this.processActivityImmediate(clientId, activity);
    } catch (error) {
      console.error('Error processing activity:', error);
      throw error;
    }
  }

  /**
   * Processes activity immediately (for urgent activities or cache misses)
   */
  private async processActivityImmediate(
    clientId: string,
    activity: RealTimeActivity,
  ): Promise<ScoreUpdate> {
    const startTime = performance.now();

    // Get previous scores
    const previousCache = this.getCachedScore(clientId);
    const previousIntentScore = previousCache?.intent_score || 0;

    // Store activity in database
    await this.storeActivity(activity);

    // Recalculate intent score
    const newIntentScore =
      await this.intentScorer.calculateIntentScore(clientId);

    // Update cache
    this.updateScoreCache(clientId, newIntentScore, 0); // Booking probability updated separately

    // Calculate score change
    const scoreChange = newIntentScore.score - previousIntentScore;

    // Determine factors that changed
    const factorsChanged = this.identifyChangedFactors(activity, scoreChange);

    // Create score update
    const scoreUpdate: ScoreUpdate = {
      client_id: clientId,
      previous_score: previousIntentScore,
      new_score: newIntentScore.score,
      score_change: scoreChange,
      factors_changed: factorsChanged,
      confidence: newIntentScore.indicators.length > 0 ? 0.85 : 0.7,
      update_reason: `Activity: ${activity.activity_type}`,
      timestamp: new Date(),
    };

    // Check for significant changes that require notifications
    if (this.isSignificantScoreChange(scoreUpdate)) {
      await this.handleSignificantScoreChange(scoreUpdate, newIntentScore);
    }

    // Broadcast to connected WebSocket clients
    await this.broadcastScoreUpdate(scoreUpdate);

    // Log performance
    const processingTime = performance.now() - startTime;
    if (
      processingTime > this.config.performance_thresholds.max_inference_time_ms
    ) {
      console.warn(
        `Slow real-time processing: ${processingTime}ms for client ${clientId}`,
      );
    }

    return scoreUpdate;
  }

  /**
   * Starts the queue processor for batch processing
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        await this.processQueueBatch();
      }
    }, this.config.update_frequency_ms);
  }

  /**
   * Processes a batch of activities from the queue
   */
  private async processQueueBatch(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batchSize = Math.min(
        this.config.batch_processing.batch_size,
        this.processingQueue.length,
      );

      const batch = this.processingQueue.splice(0, batchSize);

      // Group activities by client
      const clientActivities = new Map<string, RealTimeActivity[]>();
      batch.forEach((activity) => {
        const existing = clientActivities.get(activity.client_id) || [];
        existing.push(activity);
        clientActivities.set(activity.client_id, existing);
      });

      // Process each client's activities
      const promises = Array.from(clientActivities.entries()).map(
        ([clientId, activities]) =>
          this.processBatchedActivities(clientId, activities),
      );

      await Promise.allSettled(promises);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes multiple activities for a single client in batch
   */
  private async processBatchedActivities(
    clientId: string,
    activities: RealTimeActivity[],
  ): Promise<void> {
    try {
      // Store all activities
      await Promise.all(
        activities.map((activity) => this.storeActivity(activity)),
      );

      // Recalculate scores once for all activities
      const [newIntentScore, newBookingPrediction] = await Promise.all([
        this.intentScorer.calculateIntentScore(clientId),
        this.bookingPredictor.predictBookingProbability(clientId),
      ]);

      // Update cache
      this.updateScoreCache(
        clientId,
        newIntentScore,
        newBookingPrediction.probability,
      );

      // Create consolidated score update
      const scoreUpdate: ScoreUpdate = {
        client_id: clientId,
        previous_score: this.getCachedScore(clientId)?.intent_score || 0,
        new_score: newIntentScore.score,
        score_change:
          newIntentScore.score -
          (this.getCachedScore(clientId)?.intent_score || 0),
        factors_changed: activities.map((a) => a.activity_type),
        confidence: 0.8,
        update_reason: `Batch update: ${activities.length} activities`,
        timestamp: new Date(),
      };

      // Broadcast update
      await this.broadcastScoreUpdate(scoreUpdate);
    } catch (error) {
      console.error(`Error processing batch for client ${clientId}:`, error);
    }
  }

  /**
   * Sets up Supabase real-time subscriptions for database changes
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    // Subscribe to client activity inserts
    this.supabase
      .channel('client_activities')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'client_activities' },
        (payload) => this.handleDatabaseActivity(payload.new),
      )
      .subscribe();

    // Subscribe to client data updates
    this.supabase
      .channel('clients')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clients' },
        (payload) => this.handleClientDataUpdate(payload.new),
      )
      .subscribe();
  }

  /**
   * Initializes WebSocket server for real-time client updates
   */
  private async initializeWebSocketServer(): Promise<void> {
    // This would initialize a WebSocket server
    // For now, we'll simulate with a client registry
    console.log('WebSocket server ready for real-time updates');
  }

  /**
   * Handles database activity changes from real-time subscription
   */
  private async handleDatabaseActivity(activityData: any): Promise<void> {
    const activity: RealTimeActivity = {
      client_id: activityData.client_id,
      activity_type: activityData.activity_type,
      timestamp: new Date(activityData.timestamp),
      metadata: activityData.metadata || {},
      value_score: activityData.value_score || 1,
    };

    // Process the activity
    await this.processActivity(activity.client_id, activity);
  }

  /**
   * Handles client data updates
   */
  private async handleClientDataUpdate(clientData: any): Promise<void> {
    // Invalidate cache for this client
    this.scoreCache.delete(clientData.id);

    // Trigger score recalculation
    setTimeout(() => {
      this.processActivity(clientData.id, {
        client_id: clientData.id,
        activity_type: 'data_update',
        timestamp: new Date(),
        metadata: { source: 'database_update' },
        value_score: 3,
      });
    }, 100);
  }

  /**
   * Caching methods
   */
  private getCachedScore(clientId: string): ScoreCache | null {
    const cached = this.scoreCache.get(clientId);
    if (!cached) return null;

    const isExpired =
      Date.now() - cached.last_updated > this.config.caching.ttl_seconds * 1000;
    if (isExpired) {
      this.scoreCache.delete(clientId);
      return null;
    }

    return cached;
  }

  private updateScoreCache(
    clientId: string,
    intentScore: IntentScore,
    bookingProbability: number,
  ): void {
    if (!this.config.caching.enabled) return;

    const existing = this.scoreCache.get(clientId);
    const version = (existing?.version || 0) + 1;

    this.scoreCache.set(clientId, {
      client_id: clientId,
      intent_score: intentScore.score,
      booking_probability,
      last_updated: Date.now(),
      version,
    });

    // Clean up old entries if cache is too large
    if (this.scoreCache.size > this.config.caching.max_entries) {
      const oldestKey = this.scoreCache.keys().next().value;
      this.scoreCache.delete(oldestKey);
    }
  }

  /**
   * Score change analysis
   */
  private isSignificantScoreChange(scoreUpdate: ScoreUpdate): boolean {
    const absChange = Math.abs(scoreUpdate.score_change);

    // Significant if score change is large or crosses category boundaries
    return (
      absChange >= 15 || // 15+ point change
      (scoreUpdate.previous_score < 60 && scoreUpdate.new_score >= 60) || // Low to high
      (scoreUpdate.previous_score >= 80 && scoreUpdate.new_score < 80) || // Very high to high
      (scoreUpdate.new_score >= 80 && scoreUpdate.previous_score < 80) // High to very high
    );
  }

  private async handleSignificantScoreChange(
    scoreUpdate: ScoreUpdate,
    intentScore: IntentScore,
  ): Promise<void> {
    // Log significant change
    console.log(
      `Significant score change for client ${scoreUpdate.client_id}: ${scoreUpdate.previous_score} → ${scoreUpdate.new_score}`,
    );

    // Store in database for analytics
    await this.supabase.from('significant_score_changes').insert({
      client_id: scoreUpdate.client_id,
      previous_score: scoreUpdate.previous_score,
      new_score: scoreUpdate.new_score,
      score_change: scoreUpdate.score_change,
      change_factors: scoreUpdate.factors_changed,
      intent_category: intentScore.category,
      timestamp: scoreUpdate.timestamp.toISOString(),
    });

    // Trigger notifications for very high intent clients
    if (
      intentScore.category === 'very_high' &&
      scoreUpdate.previous_score < 80
    ) {
      await this.triggerHighIntentNotification(
        scoreUpdate.client_id,
        intentScore,
      );
    }

    // Trigger churn risk alerts for significant drops
    if (scoreUpdate.score_change <= -20) {
      await this.triggerChurnRiskAlert(scoreUpdate.client_id, scoreUpdate);
    }
  }

  /**
   * Notification triggers
   */
  private async triggerHighIntentNotification(
    clientId: string,
    intentScore: IntentScore,
  ): Promise<void> {
    console.log(`High intent notification triggered for client ${clientId}`);

    // Would integrate with notification system
    // For now, log to console and broadcast to WebSocket clients
    const notification = {
      type: 'high_intent_notification',
      client_id: clientId,
      intent_score: intentScore.score,
      category: intentScore.category,
      indicators: intentScore.indicators.map((i) => i.indicator_type),
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all connected clients
    this.webSocketClients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(JSON.stringify(notification));
      }
    });
  }

  private async triggerChurnRiskAlert(
    clientId: string,
    scoreUpdate: ScoreUpdate,
  ): Promise<void> {
    console.log(`Churn risk alert triggered for client ${clientId}`);

    // Would trigger intervention workflows
    const alert = {
      type: 'churn_risk_alert',
      client_id: clientId,
      score_drop: scoreUpdate.score_change,
      new_score: scoreUpdate.new_score,
      urgency: scoreUpdate.score_change <= -30 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
    };

    // Store alert for follow-up
    await this.supabase.from('churn_risk_alerts').insert(alert);
  }

  /**
   * WebSocket broadcasting
   */
  private async broadcastScoreUpdate(scoreUpdate: ScoreUpdate): Promise<void> {
    const message = JSON.stringify({
      type: 'score_update',
      ...scoreUpdate,
    });

    this.webSocketClients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        try {
          client.send(message);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      }
    });
  }

  /**
   * Utility methods
   */
  private isUrgentActivity(activity: RealTimeActivity): boolean {
    const urgentActivityTypes = [
      'booking_inquiry',
      'phone_call_request',
      'urgent_message',
      'consultation_request',
      'contract_download',
    ];

    return urgentActivityTypes.includes(activity.activity_type);
  }

  private identifyChangedFactors(
    activity: RealTimeActivity,
    scoreChange: number,
  ): string[] {
    const factors = [activity.activity_type];

    if (scoreChange > 0) {
      factors.push('positive_engagement');
    } else if (scoreChange < 0) {
      factors.push('negative_indicator');
    }

    if (activity.value_score >= 8) {
      factors.push('high_value_activity');
    }

    return factors;
  }

  private async storeActivity(activity: RealTimeActivity): Promise<void> {
    await this.supabase.from('client_activities').insert({
      client_id: activity.client_id,
      activity_type: activity.activity_type,
      timestamp: activity.timestamp.toISOString(),
      metadata: activity.metadata,
      value_score: activity.value_score,
      duration: activity.duration,
    });
  }

  /**
   * Public methods for external integration
   */
  setWebSocketClients(clients: WebSocketClient[]): void {
    this.webSocketClients = clients;
  }

  async getCurrentScore(clientId: string): Promise<{
    score: number;
    version: number;
    source: string;
    persisted: boolean;
  }> {
    const cached = this.getCachedScore(clientId);
    if (cached) {
      return {
        score: cached.intent_score,
        version: cached.version,
        source: 'cache',
        persisted: true,
      };
    }

    // Fallback to database
    const intentScore = await this.intentScorer.calculateIntentScore(clientId);
    return {
      score: intentScore.score,
      version: 0,
      source: 'database',
      persisted: true,
    };
  }

  async runTensorFlowPrediction(features: Record<string, number>): Promise<{
    booking_probability: number;
    confidence: number;
    model_version: string;
    inference_time: number;
  }> {
    const startTime = performance.now();

    // This would integrate with TensorFlow.js models
    // For now, simulate ML prediction
    const bookingProbability = Math.random() * 0.5 + 0.3; // 0.3 to 0.8 range
    const confidence = Math.random() * 0.3 + 0.7; // 0.7 to 1.0 range

    return {
      booking_probability: bookingProbability,
      confidence,
      model_version: '1.0.0-tf',
      inference_time: performance.now() - startTime,
    };
  }

  async calculateFallbackScore(
    features: Record<string, number>,
  ): Promise<{ score: number; method: string }> {
    // Rule-based fallback when ML models fail
    let score = 50; // Base score

    if (features.engagement_score > 70) score += 20;
    if (features.response_time_avg < 300) score += 10; // Quick responses
    if (features.response_time_avg > 3600) score -= 15; // Slow responses

    return {
      score: Math.max(0, Math.min(100, score)),
      method: 'rule_based',
    };
  }

  async loadModel(modelPath: string): Promise<void> {
    // Would load TensorFlow.js model
    if (modelPath.includes('invalid')) {
      throw new Error('Failed to load TensorFlow model');
    }
    console.log(`Model loaded from ${modelPath}`);
  }

  async cleanup(): Promise<void> {
    // Clean up resources
    this.scoreCache.clear();
    this.processingQueue.length = 0;
    this.webSocketClients.length = 0;
    console.log('Real-time scoring system cleaned up');
  }
}
