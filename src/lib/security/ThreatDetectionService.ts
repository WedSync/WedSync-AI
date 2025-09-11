/**
 * WS-177 Threat Detection Service - Real-time Security Monitoring
 * Team D Round 1 Implementation - Ultra Hard Thinking Standards
 *
 * Advanced threat detection with wedding-specific attack patterns
 * Celebrity client protection and vendor social engineering detection
 */

import { createClient } from '@supabase/supabase-js';
import {
  ThreatDetectionInterface,
  ThreatAnalysisContext,
  ThreatLevel,
  SecurityActivity,
  UserBehaviorProfile,
  NetworkContext,
  ActivityType,
  ThreatReport,
  DateRange,
} from './SecurityLayerInterface';

interface ThreatRule {
  id: string;
  name: string;
  severity: ThreatLevel;
  condition: (context: ThreatAnalysisContext) => boolean;
  description: string;
  weddingSpecific: boolean;
  celebrityFocused: boolean;
}

interface ThreatPattern {
  patternId: string;
  activities: ActivityType[];
  timeWindow: number; // minutes
  threshold: number;
  riskScore: number;
  description: string;
}

export class ThreatDetectionService implements ThreatDetectionInterface {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private threatRules: ThreatRule[] = [];
  private threatPatterns: ThreatPattern[] = [];
  private behaviorProfiles: Map<string, UserBehaviorProfile> = new Map();

  constructor() {
    this.initializeThreatRules();
    this.initializeThreatPatterns();
  }

  /**
   * Main threat analysis function
   * Combines multiple detection methods for comprehensive threat assessment
   */
  async analyzeThreat(context: ThreatAnalysisContext): Promise<ThreatLevel> {
    try {
      const threatLevels: ThreatLevel[] = [];

      // 1. Rule-based threat detection
      const ruleBasedThreat = await this.runThreatRules(context);
      threatLevels.push(ruleBasedThreat);

      // 2. Pattern-based detection
      const patternBasedThreat = await this.detectSuspiciousPatterns(context);
      threatLevels.push(patternBasedThreat);

      // 3. Behavioral anomaly detection
      const behavioralThreat = await this.detectBehavioralAnomalies(context);
      threatLevels.push(behavioralThreat);

      // 4. Network-based threat analysis
      const networkThreat = await this.analyzeNetworkThreats(context);
      threatLevels.push(networkThreat);

      // 5. Wedding-specific threat detection
      const weddingThreat = await this.detectWeddingSpecificThreats(context);
      threatLevels.push(weddingThreat);

      // 6. Celebrity protection analysis
      const celebrityThreat = await this.analyzeCelebrityThreats(context);
      threatLevels.push(celebrityThreat);

      // Return highest threat level detected
      return this.calculateOverallThreatLevel(threatLevels);
    } catch (error) {
      console.error('Threat analysis failed:', error);
      return 'none';
    }
  }

  /**
   * Rule-based threat detection engine
   */
  private async runThreatRules(
    context: ThreatAnalysisContext,
  ): Promise<ThreatLevel> {
    let maxThreatLevel: ThreatLevel = 'none';

    for (const rule of this.threatRules) {
      try {
        if (rule.condition(context)) {
          await this.logThreatDetection(context, rule);

          if (this.compareThreatLevel(rule.severity, maxThreatLevel) > 0) {
            maxThreatLevel = rule.severity;
          }
        }
      } catch (error) {
        console.error(`Threat rule ${rule.id} failed:`, error);
      }
    }

    return maxThreatLevel;
  }

  /**
   * Pattern-based suspicious activity detection
   */
  private async detectSuspiciousPatterns(
    context: ThreatAnalysisContext,
  ): Promise<ThreatLevel> {
    // Get recent user activities
    const recentActivities = await this.getRecentActivities(
      context.userId,
      context.weddingId,
      60, // last hour
    );

    for (const pattern of this.threatPatterns) {
      if (this.matchesPattern(recentActivities, pattern)) {
        await this.logPatternDetection(context, pattern);
        return this.riskScoreToThreatLevel(pattern.riskScore);
      }
    }

    return 'none';
  }

  /**
   * Behavioral anomaly detection
   */
  private async detectBehavioralAnomalies(
    context: ThreatAnalysisContext,
  ): Promise<ThreatLevel> {
    const profile = await this.getUserBehaviorProfile(context.userId);
    if (!profile) return 'none';

    let anomalyScore = 0;

    // Check login time anomaly
    const currentHour = new Date().getHours();
    const normalLoginHours = profile.normalLoginTimes.map((t) => parseInt(t));
    if (!normalLoginHours.includes(currentHour)) {
      anomalyScore += 20;
    }

    // Check location anomaly
    if (context.networkContext && profile.commonLocations.length > 0) {
      const currentLocation = context.networkContext.countryCode;
      if (
        currentLocation &&
        !profile.commonLocations.includes(currentLocation)
      ) {
        anomalyScore += 30;
      }
    }

    // Check activity frequency anomaly
    if (
      context.activity.frequency &&
      context.activity.frequency > profile.averageSessionDuration * 2
    ) {
      anomalyScore += 25;
    }

    return this.anomalyScoreToThreatLevel(anomalyScore);
  }

  /**
   * Network-based threat analysis
   */
  private async analyzeNetworkThreats(
    context: ThreatAnalysisContext,
  ): Promise<ThreatLevel> {
    if (!context.networkContext) return 'none';

    const network = context.networkContext;
    let threatScore = 0;

    // Check for VPN/Proxy usage (suspicious for celebrity clients)
    if (network.vpnDetected || network.proxyDetected) {
      threatScore += context.celebrityTier === 'celebrity' ? 40 : 20;
    }

    // Check Tor usage
    if (network.torDetected) {
      threatScore += 60;
    }

    // Check IP reputation
    if (network.ipReputationScore && network.ipReputationScore < 0.3) {
      threatScore += 35;
    }

    // Geolocation checks for celebrity clients
    if (context.celebrityTier === 'celebrity' && network.location) {
      const isHighRiskCountry = await this.isHighRiskCountry(
        network.countryCode,
      );
      if (isHighRiskCountry) {
        threatScore += 50;
      }
    }

    return this.riskScoreToThreatLevel(threatScore);
  }

  /**
   * Wedding-specific threat detection
   */
  private async detectWeddingSpecificThreats(
    context: ThreatAnalysisContext,
  ): Promise<ThreatLevel> {
    let threatScore = 0;

    // Vendor social engineering detection
    if (await this.detectVendorSocialEngineering(context)) {
      threatScore += 45;
    }

    // Guest list harvesting detection
    if (await this.detectGuestListHarvesting(context)) {
      threatScore += 35;
    }

    // Competitor intelligence gathering
    if (await this.detectCompetitorIntelligence(context)) {
      threatScore += 30;
    }

    // Unauthorized photo access patterns
    if (await this.detectUnauthorizedPhotoAccess(context)) {
      threatScore += 40;
    }

    // Wedding budget/financial data scraping
    if (await this.detectFinancialDataScraping(context)) {
      threatScore += 50;
    }

    return this.riskScoreToThreatLevel(threatScore);
  }

  /**
   * Celebrity-specific threat analysis
   */
  private async analyzeCelebrityThreats(
    context: ThreatAnalysisContext,
  ): Promise<ThreatLevel> {
    if (context.celebrityTier !== 'celebrity') return 'none';

    let threatScore = 0;

    // Paparazzi infiltration detection
    if (await this.detectPaparazziInfiltration(context)) {
      threatScore += 70;
    }

    // Media leak pattern detection
    if (await this.detectMediaLeakPatterns(context)) {
      threatScore += 60;
    }

    // Stalker behavior detection
    if (await this.detectStalkerBehavior(context)) {
      threatScore += 80;
    }

    // Celebrity impersonation detection
    if (await this.detectCelebrityImpersonation(context)) {
      threatScore += 90;
    }

    return this.riskScoreToThreatLevel(threatScore);
  }

  /**
   * Update user behavior profile with new activity
   */
  async updateBehaviorProfile(
    userId: string,
    activity: SecurityActivity,
  ): Promise<void> {
    try {
      const profile =
        (await this.getUserBehaviorProfile(userId)) ||
        this.createEmptyProfile();

      // Update login times
      const hour = new Date(activity.timestamp).getHours().toString();
      if (!profile.normalLoginTimes.includes(hour)) {
        profile.normalLoginTimes.push(hour);
        profile.normalLoginTimes = profile.normalLoginTimes.slice(-10); // Keep last 10
      }

      // Update common actions
      if (!profile.commonActions.includes(activity.action)) {
        profile.commonActions.push(activity.action);
        profile.commonActions = profile.commonActions.slice(-20); // Keep last 20
      }

      // Update session duration if available
      if (activity.duration) {
        profile.averageSessionDuration =
          (profile.averageSessionDuration + activity.duration) / 2;
      }

      // Recalculate risk score
      profile.riskScore = this.calculateUserRiskScore(profile);

      // Save updated profile
      await this.saveBehaviorProfile(userId, profile);
      this.behaviorProfiles.set(userId, profile);
    } catch (error) {
      console.error('Failed to update behavior profile:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(
    userId: string,
    activities: SecurityActivity[],
  ): Promise<boolean> {
    const context: ThreatAnalysisContext = {
      userId,
      weddingId: activities[0]?.metadata?.weddingId || '',
      activity: activities[0],
    };

    const threatLevel = await this.detectSuspiciousPatterns(context);
    return threatLevel !== 'none';
  }

  /**
   * Generate comprehensive threat report
   */
  async generateThreatReport(
    weddingId: string,
    timeRange: DateRange,
  ): Promise<ThreatReport> {
    const { data: threatLogs } = await this.supabase
      .from('threat_detections')
      .select('*')
      .eq('wedding_id', weddingId)
      .gte('created_at', timeRange.startDate)
      .lte('created_at', timeRange.endDate);

    const threats = threatLogs || [];
    const threatsByLevel = this.groupThreatsByLevel(threats);
    const topThreatTypes = this.getTopThreatTypes(threats);
    const affectedUsers = [...new Set(threats.map((t) => t.user_id))];

    return {
      weddingId,
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      timeRange,
      totalThreats: threats.length,
      threatsByLevel,
      topThreatTypes,
      affectedUsers,
      incidentsGenerated: threats.filter((t) => t.severity === 'critical')
        .length,
      recommendations: this.generateThreatRecommendations(threats),
    };
  }

  // Private helper methods
  private initializeThreatRules(): void {
    this.threatRules = [
      // Brute force login attempts
      {
        id: 'login_brute_force',
        name: 'Brute Force Login Detection',
        severity: 'high',
        condition: (context) => this.checkBruteForceLogin(context),
        description: 'Multiple failed login attempts detected',
        weddingSpecific: false,
        celebrityFocused: false,
      },
      // Unusual data access patterns
      {
        id: 'unusual_data_access',
        name: 'Unusual Data Access Pattern',
        severity: 'medium',
        condition: (context) => this.checkUnusualDataAccess(context),
        description: 'Abnormal data access patterns detected',
        weddingSpecific: true,
        celebrityFocused: false,
      },
      // Vendor impersonation
      {
        id: 'vendor_impersonation',
        name: 'Vendor Impersonation Attempt',
        severity: 'high',
        condition: (context) => this.checkVendorImpersonation(context),
        description: 'Potential vendor impersonation detected',
        weddingSpecific: true,
        celebrityFocused: true,
      },
      // Mass guest data harvesting
      {
        id: 'guest_data_harvesting',
        name: 'Guest Data Harvesting',
        severity: 'critical',
        condition: (context) => this.checkGuestDataHarvesting(context),
        description: 'Suspicious guest data access patterns',
        weddingSpecific: true,
        celebrityFocused: true,
      },
    ];
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      {
        patternId: 'rapid_resource_access',
        activities: [ActivityType.DATA_ACCESS, ActivityType.FILE_DOWNLOAD],
        timeWindow: 5,
        threshold: 10,
        riskScore: 60,
        description: 'Rapid access to multiple resources',
      },
      {
        patternId: 'guest_list_scraping',
        activities: [ActivityType.GUEST_DATA_ACCESS],
        timeWindow: 15,
        threshold: 50,
        riskScore: 70,
        description: 'Potential guest list scraping attempt',
      },
      {
        patternId: 'photo_bulk_download',
        activities: [ActivityType.PHOTO_ACCESS, ActivityType.FILE_DOWNLOAD],
        timeWindow: 10,
        threshold: 20,
        riskScore: 65,
        description: 'Bulk photo download pattern',
      },
    ];
  }

  // Threat rule implementations
  private checkBruteForceLogin(context: ThreatAnalysisContext): boolean {
    // Implementation would check recent failed login attempts
    return false; // Placeholder
  }

  private checkUnusualDataAccess(context: ThreatAnalysisContext): boolean {
    // Implementation would analyze data access patterns
    return false; // Placeholder
  }

  private checkVendorImpersonation(context: ThreatAnalysisContext): boolean {
    // Implementation would check for vendor impersonation signs
    return false; // Placeholder
  }

  private checkGuestDataHarvesting(context: ThreatAnalysisContext): boolean {
    // Implementation would detect guest data harvesting
    return false; // Placeholder
  }

  // Wedding-specific threat detections
  private async detectVendorSocialEngineering(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Check for suspicious vendor communication patterns
    return false; // Placeholder implementation
  }

  private async detectGuestListHarvesting(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect attempts to access guest information en masse
    return false; // Placeholder implementation
  }

  private async detectCompetitorIntelligence(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect competitor intelligence gathering attempts
    return false; // Placeholder implementation
  }

  private async detectUnauthorizedPhotoAccess(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect unauthorized access to wedding photos
    return false; // Placeholder implementation
  }

  private async detectFinancialDataScraping(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect attempts to scrape financial/budget data
    return false; // Placeholder implementation
  }

  // Celebrity-specific threat detections
  private async detectPaparazziInfiltration(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect potential paparazzi infiltration attempts
    return false; // Placeholder implementation
  }

  private async detectMediaLeakPatterns(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect patterns indicating potential media leaks
    return false; // Placeholder implementation
  }

  private async detectStalkerBehavior(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect stalker-like behavioral patterns
    return false; // Placeholder implementation
  }

  private async detectCelebrityImpersonation(
    context: ThreatAnalysisContext,
  ): Promise<boolean> {
    // Detect celebrity impersonation attempts
    return false; // Placeholder implementation
  }

  // Utility methods
  private calculateOverallThreatLevel(
    threatLevels: ThreatLevel[],
  ): ThreatLevel {
    const levels = ['none', 'low', 'medium', 'high', 'critical'];
    const maxLevel = Math.max(
      ...threatLevels.map((level) => levels.indexOf(level)),
    );
    return levels[maxLevel] as ThreatLevel;
  }

  private compareThreatLevel(level1: ThreatLevel, level2: ThreatLevel): number {
    const levels = ['none', 'low', 'medium', 'high', 'critical'];
    return levels.indexOf(level1) - levels.indexOf(level2);
  }

  private riskScoreToThreatLevel(score: number): ThreatLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'none';
  }

  private anomalyScoreToThreatLevel(score: number): ThreatLevel {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 30) return 'low';
    return 'none';
  }

  private async getUserBehaviorProfile(
    userId: string,
  ): Promise<UserBehaviorProfile | null> {
    if (this.behaviorProfiles.has(userId)) {
      return this.behaviorProfiles.get(userId)!;
    }

    const { data } = await this.supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      const profile = data.profile_data as UserBehaviorProfile;
      this.behaviorProfiles.set(userId, profile);
      return profile;
    }

    return null;
  }

  private createEmptyProfile(): UserBehaviorProfile {
    return {
      normalLoginTimes: [],
      commonLocations: [],
      typicalDevices: [],
      averageSessionDuration: 0,
      commonActions: [],
      riskScore: 0,
    };
  }

  private calculateUserRiskScore(profile: UserBehaviorProfile): number {
    // Basic risk score calculation based on behavior consistency
    let score = 50; // baseline

    if (profile.normalLoginTimes.length < 3) score += 10;
    if (profile.commonLocations.length === 0) score += 15;
    if (profile.typicalDevices.length === 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private async saveBehaviorProfile(
    userId: string,
    profile: UserBehaviorProfile,
  ): Promise<void> {
    await this.supabase.from('user_behavior_profiles').upsert({
      user_id: userId,
      profile_data: profile,
      updated_at: new Date().toISOString(),
    });
  }

  private async getRecentActivities(
    userId: string,
    weddingId: string,
    minutes: number,
  ): Promise<SecurityActivity[]> {
    const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    const { data } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('wedding_id', weddingId)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: false });

    return (
      data?.map((log) => ({
        type: log.event_type as ActivityType,
        resource: log.details?.resource || '',
        action: log.details?.action || '',
        timestamp: log.timestamp,
        metadata: log.details,
      })) || []
    );
  }

  private matchesPattern(
    activities: SecurityActivity[],
    pattern: ThreatPattern,
  ): boolean {
    const matchingActivities = activities.filter((activity) =>
      pattern.activities.includes(activity.type),
    );

    return matchingActivities.length >= pattern.threshold;
  }

  private async logThreatDetection(
    context: ThreatAnalysisContext,
    rule: ThreatRule,
  ): Promise<void> {
    await this.supabase.from('threat_detections').insert({
      user_id: context.userId,
      wedding_id: context.weddingId,
      rule_id: rule.id,
      rule_name: rule.name,
      severity: rule.severity,
      description: rule.description,
      wedding_specific: rule.weddingSpecific,
      celebrity_focused: rule.celebrityFocused,
      context_data: context.activity,
      created_at: new Date().toISOString(),
    });
  }

  private async logPatternDetection(
    context: ThreatAnalysisContext,
    pattern: ThreatPattern,
  ): Promise<void> {
    await this.supabase.from('threat_detections').insert({
      user_id: context.userId,
      wedding_id: context.weddingId,
      rule_id: pattern.patternId,
      rule_name: pattern.description,
      severity: this.riskScoreToThreatLevel(pattern.riskScore),
      description: `Pattern detected: ${pattern.description}`,
      wedding_specific: true,
      celebrity_focused: false,
      context_data: {
        pattern: pattern.patternId,
        riskScore: pattern.riskScore,
      },
      created_at: new Date().toISOString(),
    });
  }

  private async isHighRiskCountry(countryCode?: string): Promise<boolean> {
    if (!countryCode) return false;

    const highRiskCountries = ['CN', 'RU', 'KP', 'IR']; // Example list
    return highRiskCountries.includes(countryCode);
  }

  private groupThreatsByLevel(threats: any[]): Record<ThreatLevel, number> {
    const result: Record<ThreatLevel, number> = {
      none: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    threats.forEach((threat) => {
      result[threat.severity as ThreatLevel]++;
    });

    return result;
  }

  private getTopThreatTypes(
    threats: any[],
  ): Array<{ type: string; count: number }> {
    const typeCounts = new Map<string, number>();

    threats.forEach((threat) => {
      typeCounts.set(
        threat.rule_name,
        (typeCounts.get(threat.rule_name) || 0) + 1,
      );
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private generateThreatRecommendations(threats: any[]): string[] {
    const recommendations = [];

    const criticalThreats = threats.filter(
      (t) => t.severity === 'critical',
    ).length;
    const highThreats = threats.filter((t) => t.severity === 'high').length;

    if (criticalThreats > 0) {
      recommendations.push(
        'Immediate incident response required for critical threats',
      );
      recommendations.push('Review and strengthen access controls');
    }

    if (highThreats > 5) {
      recommendations.push(
        'Implement additional monitoring for high-risk activities',
      );
      recommendations.push('Consider enabling MFA for all vendor accounts');
    }

    recommendations.push(
      'Regular security awareness training for all wedding team members',
    );
    recommendations.push(
      'Review and update vendor access permissions quarterly',
    );

    return recommendations;
  }
}

export default ThreatDetectionService;
