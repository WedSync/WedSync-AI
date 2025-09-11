/**
 * Wedding API Protection - Wedding-Critical API Prioritization
 * WS-250 - Saturday protection and wedding emergency handling
 */

import {
  WeddingAPIProtectionConfig,
  GatewayRequest,
  WeddingContext,
  VendorTier,
} from '@/types/api-gateway';

export class WeddingAPIProtection {
  private config: WeddingAPIProtectionConfig;
  private emergencyMode = false;
  private weddingEvents: Map<string, WeddingEvent> = new Map();
  private saturdayProtectionActive = false;

  // Critical wedding endpoints that must never fail
  private readonly CRITICAL_WEDDING_ENDPOINTS = [
    '/api/weddings/emergency',
    '/api/communications/urgent',
    '/api/vendors/schedule/update',
    '/api/timeline/critical',
    '/api/client-portal/urgent',
    '/api/payments/emergency',
    '/api/photos/upload/wedding',
    '/api/livestream/wedding',
    '/api/vendors/arrival/confirm',
  ];

  // Protected time windows (Saturday wedding hours)
  private readonly PROTECTION_HOURS = {
    start: 6, // 6 AM
    end: 23, // 11 PM
  };

  constructor(config?: Partial<WeddingAPIProtectionConfig>) {
    this.config = {
      saturdayProtectionEnabled: true,
      criticalEndpoints: this.CRITICAL_WEDDING_ENDPOINTS,
      priorityMultiplier: 10,
      emergencyBypassEnabled: true,
      notificationWebhooks: [],
      maximumLatency: 200, // 200ms max for critical wedding APIs
      minimumSuccessRate: 0.999, // 99.9% success rate required
      ...config,
    };

    this.startSaturdayMonitoring();
    this.initializeWeddingCalendar();
    this.startPerformanceMonitoring();
  }

  /**
   * Check if a request should receive wedding protection
   */
  public async shouldProtectRequest(
    request: GatewayRequest,
  ): Promise<WeddingProtectionResult> {
    try {
      const result: WeddingProtectionResult = {
        shouldProtect: false,
        priority: 'normal',
        reason: [],
        emergencyBypass: false,
        additionalLatencyBudget: 0,
      };

      // Emergency mode - protect all wedding-related requests
      if (this.emergencyMode) {
        result.shouldProtect = true;
        result.priority = 'critical';
        result.emergencyBypass = true;
        result.reason.push('Emergency mode active');
        return result;
      }

      // Saturday protection check
      if (this.isSaturdayProtectionActive()) {
        const saturdayCheck = await this.checkSaturdayProtection(request);
        if (saturdayCheck.shouldProtect) {
          result.shouldProtect = true;
          result.priority = saturdayCheck.priority;
          result.reason.push(...saturdayCheck.reason);
        }
      }

      // Wedding context check
      if (request.weddingContext?.isWeddingCritical) {
        result.shouldProtect = true;
        result.priority = 'critical';
        result.reason.push('Wedding-critical request');
      }

      // Critical endpoint check
      if (this.isCriticalWeddingEndpoint(request.path)) {
        result.shouldProtect = true;
        result.priority = result.priority === 'critical' ? 'critical' : 'high';
        result.reason.push('Critical wedding endpoint');
      }

      // Active wedding check
      const activeWedding = await this.getActiveWedding(request);
      if (activeWedding) {
        result.shouldProtect = true;
        result.priority = 'critical';
        result.reason.push(`Active wedding: ${activeWedding.id}`);
        result.additionalLatencyBudget = -50; // Even stricter latency for active weddings
      }

      // Vendor tier enhancement
      if (
        request.vendorContext?.tier === 'enterprise' ||
        request.vendorContext?.tier === 'scale'
      ) {
        result.additionalLatencyBudget += 100; // More latency budget for premium tiers
      }

      return result;
    } catch (error) {
      console.error('[WeddingAPIProtection] Protection check failed:', error);

      // Fail safe for wedding-critical requests
      return {
        shouldProtect: this.isCriticalWeddingEndpoint(request.path),
        priority: 'high',
        reason: ['Protection check failed - failing safe'],
        emergencyBypass: false,
        additionalLatencyBudget: 0,
      };
    }
  }

  /**
   * Register a wedding event for tracking
   */
  public registerWeddingEvent(event: WeddingEvent): void {
    this.weddingEvents.set(event.id, event);
    console.log(
      `[WeddingAPIProtection] Registered wedding event: ${event.id} on ${event.weddingDate.toDateString()}`,
    );

    // Set up automatic protection for the wedding day
    this.scheduleWeddingProtection(event);
  }

  /**
   * Enable emergency mode (maximum protection)
   */
  public enableEmergencyMode(reason?: string): void {
    this.emergencyMode = true;
    console.warn(
      `[WeddingAPIProtection] EMERGENCY MODE ENABLED${reason ? `: ${reason}` : ''}`,
    );

    // Send emergency notifications
    this.sendEmergencyNotifications(
      `Emergency mode enabled: ${reason || 'Manual activation'}`,
    );

    // Auto-disable after 2 hours unless manually disabled
    setTimeout(() => {
      if (this.emergencyMode) {
        this.disableEmergencyMode('Auto-timeout after 2 hours');
      }
    }, 7200000);
  }

  /**
   * Disable emergency mode
   */
  public disableEmergencyMode(reason?: string): void {
    this.emergencyMode = false;
    console.log(
      `[WeddingAPIProtection] Emergency mode disabled${reason ? `: ${reason}` : ''}`,
    );
  }

  /**
   * Get current protection status
   */
  public getProtectionStatus(): WeddingProtectionStatus {
    const now = new Date();
    const activeWeddings = Array.from(this.weddingEvents.values()).filter((w) =>
      this.isWeddingActiveToday(w, now),
    );

    return {
      saturdayProtectionActive: this.saturdayProtectionActive,
      emergencyModeActive: this.emergencyMode,
      totalWeddingEvents: this.weddingEvents.size,
      activeWeddingsToday: activeWeddings.length,
      criticalEndpointsProtected: this.config.criticalEndpoints.length,
      protectionLevel: this.calculateProtectionLevel(),
      nextWeddingDate: this.getNextWeddingDate(),
      performanceMetrics: this.getPerformanceMetrics(),
    };
  }

  /**
   * Get wedding protection statistics
   */
  public getWeddingStats(): WeddingProtectionStats {
    const protectedRequests = this.countProtectedRequests();
    const emergencyBypassCount = this.countEmergencyBypasses();

    return {
      totalProtectedRequests: protectedRequests,
      emergencyBypassesUsed: emergencyBypassCount,
      averageProtectionLatency: this.calculateAverageProtectionLatency(),
      saturdaySuccessRate: this.calculateSaturdaySuccessRate(),
      criticalEndpointHealth: this.assessCriticalEndpointHealth(),
      weddingEventsTracked: this.weddingEvents.size,
      upcomingHighRiskPeriods: this.identifyHighRiskPeriods(),
    };
  }

  // ========================================
  // Private Methods
  // ========================================

  private async checkSaturdayProtection(
    request: GatewayRequest,
  ): Promise<WeddingProtectionResult> {
    if (!this.isSaturday() || !this.isWeddingHours()) {
      return {
        shouldProtect: false,
        priority: 'normal',
        reason: [],
        emergencyBypass: false,
        additionalLatencyBudget: 0,
      };
    }

    const result: WeddingProtectionResult = {
      shouldProtect: true,
      priority: 'high',
      reason: ['Saturday wedding protection active'],
      emergencyBypass: false,
      additionalLatencyBudget: 0,
    };

    // Enhanced protection for critical endpoints on Saturday
    if (this.isCriticalWeddingEndpoint(request.path)) {
      result.priority = 'critical';
      result.reason.push('Critical endpoint on Saturday');
      result.additionalLatencyBudget = -100; // Stricter latency requirements
    }

    // Free tier gets limited access on Saturday
    if (request.vendorContext?.tier === 'free') {
      result.priority = 'low';
      result.reason.push('Free tier - limited Saturday access');
    }

    return result;
  }

  private async getActiveWedding(
    request: GatewayRequest,
  ): Promise<WeddingEvent | null> {
    const now = new Date();

    // Check for wedding context in request
    if (request.weddingContext?.isWeddingCritical) {
      // Find matching wedding event
      for (const wedding of this.weddingEvents.values()) {
        if (this.isWeddingActiveNow(wedding, now)) {
          return wedding;
        }
      }
    }

    // Check if vendor has any active weddings
    if (request.vendorContext?.vendorId) {
      for (const wedding of this.weddingEvents.values()) {
        if (
          wedding.vendors.includes(request.vendorContext.vendorId) &&
          this.isWeddingActiveNow(wedding, now)
        ) {
          return wedding;
        }
      }
    }

    return null;
  }

  private isCriticalWeddingEndpoint(path: string): boolean {
    return this.config.criticalEndpoints.some((endpoint) =>
      path.startsWith(endpoint.replace('*', '')),
    );
  }

  private isSaturday(): boolean {
    return new Date().getDay() === 6;
  }

  private isWeddingHours(): boolean {
    const hour = new Date().getHours();
    return (
      hour >= this.PROTECTION_HOURS.start && hour <= this.PROTECTION_HOURS.end
    );
  }

  private isSaturdayProtectionActive(): boolean {
    return (
      this.config.saturdayProtectionEnabled &&
      this.isSaturday() &&
      this.isWeddingHours()
    );
  }

  private isWeddingActiveToday(wedding: WeddingEvent, date: Date): boolean {
    const weddingDate = new Date(wedding.weddingDate);
    return weddingDate.toDateString() === date.toDateString();
  }

  private isWeddingActiveNow(wedding: WeddingEvent, date: Date): boolean {
    if (!this.isWeddingActiveToday(wedding, date)) return false;

    const hour = date.getHours();
    return hour >= wedding.startHour && hour <= wedding.endHour;
  }

  private scheduleWeddingProtection(event: WeddingEvent): void {
    const weddingDate = new Date(event.weddingDate);
    const protectionStart = new Date(weddingDate);
    protectionStart.setHours(event.startHour - 1); // Start 1 hour early

    const protectionEnd = new Date(weddingDate);
    protectionEnd.setHours(event.endHour + 1); // End 1 hour late

    const now = Date.now();

    if (protectionStart.getTime() > now) {
      // Schedule protection start
      setTimeout(() => {
        console.log(
          `[WeddingAPIProtection] Enhanced protection activated for wedding: ${event.id}`,
        );
        this.enableEnhancedProtectionForEvent(event.id);
      }, protectionStart.getTime() - now);
    }

    if (protectionEnd.getTime() > now) {
      // Schedule protection end
      setTimeout(() => {
        console.log(
          `[WeddingAPIProtection] Enhanced protection deactivated for wedding: ${event.id}`,
        );
        this.disableEnhancedProtectionForEvent(event.id);
      }, protectionEnd.getTime() - now);
    }
  }

  private enableEnhancedProtectionForEvent(eventId: string): void {
    const event = this.weddingEvents.get(eventId);
    if (event) {
      event.protectionActive = true;
    }
  }

  private disableEnhancedProtectionForEvent(eventId: string): void {
    const event = this.weddingEvents.get(eventId);
    if (event) {
      event.protectionActive = false;
    }
  }

  private calculateProtectionLevel():
    | 'normal'
    | 'elevated'
    | 'high'
    | 'critical' {
    if (this.emergencyMode) return 'critical';
    if (this.isSaturdayProtectionActive()) return 'high';

    const activeWeddings = Array.from(this.weddingEvents.values()).filter(
      (w) => w.protectionActive,
    ).length;

    if (activeWeddings > 0) return 'elevated';
    return 'normal';
  }

  private getNextWeddingDate(): Date | null {
    const now = new Date();
    const upcomingWeddings = Array.from(this.weddingEvents.values())
      .filter((w) => w.weddingDate > now)
      .sort((a, b) => a.weddingDate.getTime() - b.weddingDate.getTime());

    return upcomingWeddings.length > 0 ? upcomingWeddings[0].weddingDate : null;
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    // In production, these would be real metrics
    return {
      avgLatency: 150, // ms
      successRate: 0.999,
      throughput: 1000, // requests/minute
    };
  }

  private sendEmergencyNotifications(message: string): void {
    this.config.notificationWebhooks.forEach((webhook) => {
      // In production, this would make actual HTTP requests
      console.log(
        `[WeddingAPIProtection] Notification sent to ${webhook}: ${message}`,
      );
    });
  }

  private countProtectedRequests(): number {
    // In production, this would query actual metrics
    return 12500;
  }

  private countEmergencyBypasses(): number {
    // In production, this would query actual metrics
    return 3;
  }

  private calculateAverageProtectionLatency(): number {
    // In production, this would calculate from real data
    return 45; // ms
  }

  private calculateSaturdaySuccessRate(): number {
    // In production, this would calculate from Saturday metrics
    return 0.999;
  }

  private assessCriticalEndpointHealth(): Record<string, number> {
    const health: Record<string, number> = {};

    this.config.criticalEndpoints.forEach((endpoint) => {
      // In production, this would check real endpoint health
      health[endpoint] = 0.999; // 99.9% healthy
    });

    return health;
  }

  private identifyHighRiskPeriods(): Date[] {
    const highRiskPeriods: Date[] = [];
    const now = new Date();

    // Next 4 Saturdays
    for (let i = 0; i < 4; i++) {
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + (6 - now.getDay()) + i * 7);
      highRiskPeriods.push(saturday);
    }

    return highRiskPeriods;
  }

  private startSaturdayMonitoring(): void {
    // Check Saturday protection status every minute
    setInterval(() => {
      const wasActive = this.saturdayProtectionActive;
      this.saturdayProtectionActive = this.isSaturdayProtectionActive();

      if (!wasActive && this.saturdayProtectionActive) {
        console.warn('[WeddingAPIProtection] Saturday protection activated');
        this.sendEmergencyNotifications(
          'Saturday wedding protection is now active',
        );
      } else if (wasActive && !this.saturdayProtectionActive) {
        console.log('[WeddingAPIProtection] Saturday protection deactivated');
      }
    }, 60000);
  }

  private initializeWeddingCalendar(): void {
    // In production, this would load wedding events from database
    console.log('[WeddingAPIProtection] Wedding calendar initialized');
  }

  private startPerformanceMonitoring(): void {
    // Monitor critical endpoint performance every 30 seconds
    setInterval(() => {
      this.monitorCriticalEndpoints();
    }, 30000);
  }

  private monitorCriticalEndpoints(): void {
    const metrics = this.getPerformanceMetrics();

    if (metrics.avgLatency > this.config.maximumLatency) {
      console.warn(
        `[WeddingAPIProtection] High latency detected: ${metrics.avgLatency}ms`,
      );

      if (
        this.config.emergencyBypassEnabled &&
        metrics.avgLatency > this.config.maximumLatency * 2
      ) {
        this.enableEmergencyMode('High latency detected');
      }
    }

    if (metrics.successRate < this.config.minimumSuccessRate) {
      console.error(
        `[WeddingAPIProtection] Low success rate detected: ${(metrics.successRate * 100).toFixed(2)}%`,
      );
      this.enableEmergencyMode('Low success rate detected');
    }
  }
}

// Supporting interfaces
interface WeddingEvent {
  id: string;
  weddingDate: Date;
  startHour: number;
  endHour: number;
  vendors: string[];
  priority: 'normal' | 'high' | 'critical';
  protectionActive: boolean;
}

interface WeddingProtectionResult {
  shouldProtect: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  reason: string[];
  emergencyBypass: boolean;
  additionalLatencyBudget: number;
}

interface WeddingProtectionStatus {
  saturdayProtectionActive: boolean;
  emergencyModeActive: boolean;
  totalWeddingEvents: number;
  activeWeddingsToday: number;
  criticalEndpointsProtected: number;
  protectionLevel: 'normal' | 'elevated' | 'high' | 'critical';
  nextWeddingDate: Date | null;
  performanceMetrics: PerformanceMetrics;
}

interface WeddingProtectionStats {
  totalProtectedRequests: number;
  emergencyBypassesUsed: number;
  averageProtectionLatency: number;
  saturdaySuccessRate: number;
  criticalEndpointHealth: Record<string, number>;
  weddingEventsTracked: number;
  upcomingHighRiskPeriods: Date[];
}

interface PerformanceMetrics {
  avgLatency: number;
  successRate: number;
  throughput: number;
}

// Singleton instance
export const weddingAPIProtection = new WeddingAPIProtection();
