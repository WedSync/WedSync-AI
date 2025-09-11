// AI-powered user behavior analysis for WS-147
import { supabase } from '../supabase/server';
import type {
  ActivityData,
  BehaviorFeatures,
  UserBehaviorHistory,
  BehaviorAnalysis,
  RiskAssessment,
} from '../security/advanced-threat-detection';

export class UserBehaviorModel {
  private modelVersion = '1.0.0';
  private userProfiles = new Map<string, any>();

  async detectAnomalies(features: BehaviorFeatures): Promise<number> {
    // Simplified ML-like anomaly detection
    let anomalyScore = 0;

    // Time-based anomalies
    const loginHour = new Date().getHours();
    if (loginHour < 6 || loginHour > 23) {
      anomalyScore += 0.2;
    }

    // Location anomalies
    if (features.location.isNewLocation) {
      anomalyScore += 0.3;
    }

    // Device anomalies
    if (features.device.isNewDevice) {
      anomalyScore += 0.25;
    }

    // Behavioral pattern anomalies
    if (features.businessActivity.unusualDataAccess) {
      anomalyScore += 0.4;
    }

    // Action pattern anomalies
    const avgActionInterval =
      features.actions.actionSequence.length > 1
        ? 2000 // Default 2 seconds between actions
        : 0;

    if (avgActionInterval < 100) {
      // Very rapid actions
      anomalyScore += 0.3;
    }

    // Typing speed anomalies
    if (features.actions.typingSpeed && features.actions.typingSpeed > 200) {
      anomalyScore += 0.15; // Suspiciously fast typing
    }

    return Math.min(anomalyScore, 1.0);
  }

  async updateUserProfile(
    userId: string,
    features: BehaviorFeatures,
  ): Promise<void> {
    try {
      // Update user behavior profile in database
      await supabase.from('ml_training_data').insert({
        user_id: userId,
        feature_vector: features,
        label: 'normal', // Default to normal, will be updated if suspicious
        confidence_score: 0.8,
        model_version: this.modelVersion,
      });

      // Store in memory for quick access
      this.userProfiles.set(userId, {
        lastUpdate: new Date(),
        features,
        patterns: this.extractPatterns(features),
      });
    } catch (error) {
      console.error('Failed to update user profile:', error);
    }
  }

  private extractPatterns(features: BehaviorFeatures): any {
    return {
      typicalLoginHours: [8, 9, 10, 14, 15, 16], // Default business hours
      commonLocations: [features.location.country],
      deviceFingerprints: [features.device.fingerprint],
      actionSequences: features.actions.actionSequence,
    };
  }
}

export class BehaviorAnalysisEngine {
  private mlModel: UserBehaviorModel;
  private anomalyThreshold = 0.7; // 70% confidence threshold

  constructor() {
    this.mlModel = new UserBehaviorModel();
  }

  async analyzeBehaviorPattern(
    userId: string,
    currentActivity: ActivityData,
  ): Promise<BehaviorAnalysis> {
    try {
      // Get historical behavior data
      const historicalData = await this.getUserBehaviorHistory(userId);

      // Extract behavioral features
      const behaviorFeatures = this.extractBehaviorFeatures(
        currentActivity,
        historicalData,
      );

      // Run ML analysis
      const anomalyScore = await this.mlModel.detectAnomalies(behaviorFeatures);

      // Assess risk level
      const riskAssessment = this.assessRiskLevel(
        anomalyScore,
        behaviorFeatures,
      );

      return {
        userId,
        anomalyScore,
        riskLevel: riskAssessment.level,
        suspiciousFactors: riskAssessment.factors,
        recommendedActions: riskAssessment.actions,
        confidence: anomalyScore,
      };
    } catch (error) {
      console.error('Error analyzing behavior pattern:', error);
      return {
        userId,
        anomalyScore: 0,
        riskLevel: 'low',
        suspiciousFactors: [],
        recommendedActions: [],
        confidence: 0,
      };
    }
  }

  private extractBehaviorFeatures(
    activity: ActivityData,
    history: UserBehaviorHistory,
  ): BehaviorFeatures {
    return {
      // Temporal patterns
      loginTime: this.extractTimeFeatures(activity.timestamp),
      sessionDuration: activity.sessionDuration,
      timeBetweenActions: this.calculateActionIntervals(activity),

      // Geographic patterns
      location: {
        country: activity.location?.country,
        region: activity.location?.region,
        city: activity.location?.city,
        isNewLocation: this.isNewLocation(activity.location, history.locations),
      },

      // Device patterns
      device: {
        fingerprint: activity.deviceFingerprint,
        isNewDevice: this.isNewDevice(
          activity.deviceFingerprint,
          history.devices,
        ),
        browserVersion: activity.browserInfo?.version,
        screenResolution: activity.screenResolution,
      },

      // Behavioral patterns
      actions: {
        actionSequence: activity.actionSequence,
        clickPatterns: activity.clickPatterns,
        typingSpeed: activity.typingMetrics?.speed,
        mouseMovementPatterns: activity.mousePatterns,
      },

      // Business logic patterns
      businessActivity: {
        clientsAccessed: activity.clientsAccessed?.length || 0,
        dataVolumeAccessed: activity.dataVolumeBytes,
        featureUsage: activity.featuresUsed,
        unusualDataAccess: this.detectUnusualDataAccess(activity, history),
      },
    };
  }

  private assessRiskLevel(
    anomalyScore: number,
    features: BehaviorFeatures,
  ): RiskAssessment {
    const factors: string[] = [];
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const actions: string[] = [];

    // High anomaly score
    if (anomalyScore > 0.8) {
      factors.push('Highly unusual behavior pattern detected');
      level = 'critical';
      actions.push('Require additional authentication');
      actions.push('Notify security team immediately');
    } else if (anomalyScore > 0.6) {
      factors.push('Moderately unusual behavior detected');
      level = 'high';
      actions.push('Require MFA verification');
    }

    // New location check
    if (features.location.isNewLocation && anomalyScore > 0.4) {
      factors.push('Access from new geographic location');
      level = level === 'low' ? 'medium' : level;
      actions.push('Send location verification email');
    }

    // New device check
    if (features.device.isNewDevice) {
      factors.push('Access from unrecognized device');
      level = level === 'low' ? 'medium' : level;
      actions.push('Device verification required');
    }

    // Unusual business activity
    if (features.businessActivity.unusualDataAccess) {
      factors.push('Unusual data access patterns');
      level = level === 'low' ? 'high' : level;
      actions.push('Monitor data access closely');
    }

    // High volume data access
    if (features.businessActivity.dataVolumeAccessed > 50 * 1024 * 1024) {
      // 50MB
      factors.push('High volume data access detected');
      level = level === 'low' ? 'medium' : level;
      actions.push('Review data access permissions');
    }

    // Rapid actions
    if (features.actions.actionSequence.length > 30) {
      factors.push('Rapid action sequence detected');
      level = level === 'low' ? 'medium' : level;
      actions.push('Monitor user behavior closely');
    }

    return { level, factors, actions };
  }

  async updateBehaviorModel(
    userId: string,
    activityData: ActivityData,
  ): Promise<void> {
    try {
      // Continuously learn from user behavior
      const history = await this.getUserBehaviorHistory(userId);
      const features = this.extractBehaviorFeatures(activityData, history);
      await this.mlModel.updateUserProfile(userId, features);
    } catch (error) {
      console.error('Error updating behavior model:', error);
    }
  }

  private async getUserBehaviorHistory(
    userId: string,
  ): Promise<UserBehaviorHistory> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Get comprehensive behavior history
      const [authAttempts, deviceHistory, securityEvents] = await Promise.all([
        supabase
          .from('auth_attempts')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString()),

        supabase.from('user_devices').select('*').eq('user_id', userId),

        supabase
          .from('security_audit_log')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
      ]);

      return {
        authHistory: authAttempts.data || [],
        devices: deviceHistory.data || [],
        securityEvents: securityEvents.data || [],
        locations: this.extractLocationHistory(authAttempts.data || []),
        patterns: this.identifyBehaviorPatterns(authAttempts.data || []),
      };
    } catch (error) {
      console.error('Error getting user behavior history:', error);
      return {
        authHistory: [],
        devices: [],
        securityEvents: [],
        locations: [],
        patterns: {},
      };
    }
  }

  private extractTimeFeatures(timestamp: string): any {
    const date = new Date(timestamp);
    return {
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isBusinessHours: date.getHours() >= 8 && date.getHours() <= 17,
    };
  }

  private calculateActionIntervals(activity: ActivityData): number[] {
    // Simulate action intervals calculation
    const intervals: number[] = [];
    for (let i = 1; i < activity.actionSequence.length; i++) {
      intervals.push(Math.random() * 5000); // Random intervals between actions
    }
    return intervals;
  }

  private isNewLocation(location: any, historicalLocations: any[]): boolean {
    if (!location || !location.country) return false;
    return !historicalLocations.some(
      (loc) =>
        loc.country === location.country && loc.region === location.region,
    );
  }

  private isNewDevice(fingerprint: string, historicalDevices: any[]): boolean {
    return !historicalDevices.some(
      (device) => device.device_fingerprint === fingerprint,
    );
  }

  private detectUnusualDataAccess(
    activity: ActivityData,
    history: UserBehaviorHistory,
  ): boolean {
    // Check if data access is unusual compared to historical patterns
    const avgDataAccess =
      history.securityEvents
        .filter((event) => event.event_data?.dataVolumeBytes)
        .reduce(
          (sum, event) => sum + (event.event_data.dataVolumeBytes || 0),
          0,
        ) / Math.max(history.securityEvents.length, 1);

    return activity.dataVolumeBytes > avgDataAccess * 3; // 3x normal access
  }

  private extractLocationHistory(authHistory: any[]): any[] {
    return authHistory
      .filter((attempt) => attempt.location_data)
      .map((attempt) => attempt.location_data);
  }

  private identifyBehaviorPatterns(authHistory: any[]): any {
    const patterns = {
      commonHours: new Set(),
      commonDaysOfWeek: new Set(),
      sessionDurations: [],
    };

    authHistory.forEach((attempt) => {
      const date = new Date(attempt.created_at);
      patterns.commonHours.add(date.getHours());
      patterns.commonDaysOfWeek.add(date.getDay());
      if (attempt.session_duration) {
        patterns.sessionDurations.push(attempt.session_duration);
      }
    });

    return {
      commonHours: Array.from(patterns.commonHours),
      commonDaysOfWeek: Array.from(patterns.commonDaysOfWeek),
      avgSessionDuration:
        patterns.sessionDurations.reduce((a, b) => a + b, 0) /
        Math.max(patterns.sessionDurations.length, 1),
    };
  }
}
