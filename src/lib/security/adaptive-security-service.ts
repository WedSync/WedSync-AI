// Adaptive security that adjusts based on context for WS-147
import { supabase } from '../supabase/server';
import { SecurityMonitoringService } from './advanced-threat-detection';
import { BehaviorAnalysisEngine } from '../ml/behavior-analysis-engine';
import type {
  UserSecurityProfile,
  BehaviorAnalysis,
} from './advanced-threat-detection';

export interface SecurityContext {
  isWeddingDay: boolean;
  isPublicNetwork: boolean;
  isNewLocation: boolean;
  accessingSensitiveData: boolean;
  weddingId?: string;
  venueLocation?: string;
  networkType?: 'public' | 'private' | 'cellular';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
}

export interface AdaptiveSecurityConfig {
  requireMFA: boolean;
  requireDeviceVerification: boolean;
  enableStrictMode: boolean;
  sessionTimeout: number; // in seconds
  additionalVerificationSteps: string[];
  monitoringLevel: 'standard' | 'elevated' | 'enhanced' | 'maximum';
  extendedSession?: boolean;
  allowedActions: string[];
  restrictedActions: string[];
}

export class AdaptiveSecurityService {
  private securityContexts = new Map<string, SecurityContext>();
  private behaviorEngine = new BehaviorAnalysisEngine();

  async adjustSecurityLevel(
    userId: string,
    context: SecurityContext,
  ): Promise<AdaptiveSecurityConfig> {
    try {
      const userProfile = await this.getUserSecurityProfile(userId);
      const riskScore =
        await SecurityMonitoringService.generateRiskScore(userId);
      const behaviorAnalysis = await this.getBehaviorAnalysis(userId);

      // Determine appropriate security level
      const adaptiveConfig = this.calculateAdaptiveConfig(
        userProfile,
        riskScore,
        behaviorAnalysis,
        context,
      );

      // Store context for future decisions
      this.securityContexts.set(userId, context);

      // Log security adjustment
      await SecurityMonitoringService.logSecurityEvent(
        userId,
        'adaptive_security_adjustment',
        this.getEventSeverity(adaptiveConfig.monitoringLevel),
        {
          context,
          config: adaptiveConfig,
          riskScore,
          behaviorRisk: behaviorAnalysis?.riskLevel,
        },
      );

      return adaptiveConfig;
    } catch (error) {
      console.error('Error adjusting security level:', error);

      // Fallback to strict security if calculation fails
      return this.getStrictSecurityConfig();
    }
  }

  private calculateAdaptiveConfig(
    profile: UserSecurityProfile,
    riskScore: number,
    behavior: BehaviorAnalysis | null,
    context: SecurityContext,
  ): AdaptiveSecurityConfig {
    let config: AdaptiveSecurityConfig = {
      requireMFA: false,
      requireDeviceVerification: false,
      enableStrictMode: false,
      sessionTimeout: 3600, // 1 hour default
      additionalVerificationSteps: [],
      monitoringLevel: 'standard',
      allowedActions: ['read', 'update', 'create'],
      restrictedActions: [],
    };

    // Base security adjustments
    if (riskScore > 70) {
      config.requireMFA = true;
      config.enableStrictMode = true;
      config.sessionTimeout = 1800; // 30 minutes
      config.monitoringLevel = 'enhanced';
      config.restrictedActions.push('bulk_export', 'admin_actions');
    } else if (riskScore > 40) {
      config.requireMFA = profile.mfa_enabled;
      config.sessionTimeout = 2400; // 40 minutes
      config.monitoringLevel = 'elevated';
    }

    // Behavior-based adjustments
    if (
      behavior &&
      (behavior.riskLevel === 'high' || behavior.riskLevel === 'critical')
    ) {
      config.requireDeviceVerification = true;
      config.additionalVerificationSteps.push('email_verification');

      if (behavior.riskLevel === 'critical') {
        config.additionalVerificationSteps.push('admin_approval');
        config.monitoringLevel = 'maximum';
        config.enableStrictMode = true;
        config.restrictedActions.push(
          'data_export',
          'client_deletion',
          'financial_data',
        );
      }
    }

    // Context-based adjustments
    if (context.isWeddingDay) {
      // Relax some restrictions during active wedding events
      config.sessionTimeout = Math.max(config.sessionTimeout, 7200); // 2 hours minimum
      config.extendedSession = true;

      // But maintain high security for sensitive operations
      if (context.accessingSensitiveData) {
        config.additionalVerificationSteps.push('biometric_verification');
      }

      // Allow specific wedding day actions
      config.allowedActions.push(
        'wedding_day_updates',
        'real_time_coordination',
      );
    }

    if (context.isPublicNetwork) {
      // Stricter security on public networks
      config.requireMFA = true;
      config.enableStrictMode = true;
      config.sessionTimeout = Math.min(config.sessionTimeout, 1800); // Max 30 minutes
      config.restrictedActions.push('financial_operations', 'bulk_operations');
    }

    if (context.isNewLocation && !context.isWeddingDay) {
      config.requireDeviceVerification = true;
      config.additionalVerificationSteps.push('location_verification');
      config.sessionTimeout = Math.min(config.sessionTimeout, 2400); // Max 40 minutes
    }

    // Time-based adjustments
    if (context.timeOfDay === 'night') {
      config.monitoringLevel = 'enhanced';
      config.sessionTimeout = Math.min(config.sessionTimeout, 1800); // Shorter sessions at night
    }

    // Weekend adjustments
    if (context.dayOfWeek === 'weekend' && context.isWeddingDay) {
      // More permissive during wedding weekends
      config.allowedActions.push('emergency_updates', 'vendor_coordination');
    }

    return config;
  }

  async evaluateWeddingDayContext(
    userId: string,
    currentTime: Date,
  ): Promise<boolean> {
    try {
      // Check if user has weddings scheduled for today
      const todayWeddings = await supabase
        .from('wedding_events')
        .select('*')
        .or(
          `photographer_id.eq.${userId},planner_id.eq.${userId},vendor_id.eq.${userId}`,
        )
        .eq('event_date', currentTime.toISOString().split('T')[0])
        .gte(
          'start_time',
          new Date(currentTime.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        ) // 4 hours before
        .lte(
          'end_time',
          new Date(currentTime.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        ); // 4 hours after

      return (todayWeddings.data?.length || 0) > 0;
    } catch (error) {
      console.error('Error evaluating wedding day context:', error);
      return false;
    }
  }

  async buildSecurityContext(
    userId: string,
    request: Request,
  ): Promise<SecurityContext> {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    // Determine time of day
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Determine day type
    const dayType: 'weekday' | 'weekend' =
      dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';

    // Check if it's a wedding day
    const isWeddingDay = await this.evaluateWeddingDayContext(
      userId,
      currentTime,
    );

    // Detect network type (simplified)
    const userAgent = request.headers.get('user-agent') || '';
    const isPublicNetwork = this.detectPublicNetwork(request);

    // Check if accessing sensitive data (based on URL path)
    const url = new URL(request.url);
    const accessingSensitiveData = this.isSensitiveDataAccess(url.pathname);

    // Check if this is a new location (simplified)
    const isNewLocation = await this.isNewLocationAccess(userId, request);

    return {
      isWeddingDay,
      isPublicNetwork,
      isNewLocation,
      accessingSensitiveData,
      timeOfDay,
      dayOfWeek: dayType,
      networkType: isPublicNetwork ? 'public' : 'private',
    };
  }

  private async getUserSecurityProfile(
    userId: string,
  ): Promise<UserSecurityProfile> {
    try {
      const { data } = await supabase
        .from('user_security_profiles')
        .select('mfa_enabled, password_changed_at')
        .eq('user_id', userId)
        .single();

      return data || { mfa_enabled: false };
    } catch (error) {
      console.error('Error getting user security profile:', error);
      return { mfa_enabled: false };
    }
  }

  private async getBehaviorAnalysis(
    userId: string,
  ): Promise<BehaviorAnalysis | null> {
    try {
      // Get recent behavior analysis
      const { data } = await supabase
        .from('behavior_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) return null;

      return {
        userId,
        anomalyScore: data.behavior_score || 0,
        riskLevel: this.mapRiskLevel(data.behavior_score || 0),
        suspiciousFactors: data.anomaly_flags || [],
        recommendedActions: [],
        confidence: data.behavior_score || 0,
      };
    } catch (error) {
      console.error('Error getting behavior analysis:', error);
      return null;
    }
  }

  private detectPublicNetwork(request: Request): boolean {
    // Simplified public network detection
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0] || '';

    // Simple check for common public IP ranges
    return (
      !ip.startsWith('192.168.') &&
      !ip.startsWith('10.') &&
      !ip.startsWith('172.')
    );
  }

  private isSensitiveDataAccess(pathname: string): boolean {
    const sensitiveRoutes = [
      '/api/billing',
      '/api/payments',
      '/admin',
      '/api/user/export',
      '/api/financial',
    ];

    return sensitiveRoutes.some((route) => pathname.startsWith(route));
  }

  private async isNewLocationAccess(
    userId: string,
    request: Request,
  ): Promise<boolean> {
    try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '';

      // Check if this IP has been seen before
      const { data } = await supabase
        .from('auth_attempts')
        .select('ip_address')
        .eq('user_id', userId)
        .eq('ip_address', ip)
        .limit(1);

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking location access:', error);
      return false;
    }
  }

  private getStrictSecurityConfig(): AdaptiveSecurityConfig {
    return {
      requireMFA: true,
      requireDeviceVerification: true,
      enableStrictMode: true,
      sessionTimeout: 900, // 15 minutes
      additionalVerificationSteps: ['email_verification', 'admin_approval'],
      monitoringLevel: 'maximum',
      allowedActions: ['read'],
      restrictedActions: ['create', 'update', 'delete', 'export'],
    };
  }

  private getEventSeverity(
    monitoringLevel: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (monitoringLevel) {
      case 'maximum':
        return 'critical';
      case 'enhanced':
        return 'high';
      case 'elevated':
        return 'medium';
      default:
        return 'low';
    }
  }

  private mapRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  // Public method to get current security config for a user
  async getCurrentSecurityConfig(
    userId: string,
    request: Request,
  ): Promise<AdaptiveSecurityConfig> {
    const context = await this.buildSecurityContext(userId, request);
    return this.adjustSecurityLevel(userId, context);
  }

  // Method to update security context dynamically
  async updateSecurityContext(
    userId: string,
    context: Partial<SecurityContext>,
  ): Promise<void> {
    const existingContext =
      this.securityContexts.get(userId) || ({} as SecurityContext);
    const updatedContext = { ...existingContext, ...context };
    this.securityContexts.set(userId, updatedContext);

    // Re-evaluate security level with new context
    await this.adjustSecurityLevel(userId, updatedContext);
  }
}
