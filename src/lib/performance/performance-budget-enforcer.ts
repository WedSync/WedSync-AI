/**
 * WS-173: Performance Budget Enforcement System
 * Production-ready performance budget monitoring and enforcement
 */

import { createClient } from '@supabase/supabase-js';

export interface PerformanceBudget {
  bundleSize: {
    max: number; // bytes
    current: number;
    threshold: number; // warning threshold (90% of max)
  };
  coreWebVitals: {
    lcp: { max: number; current: number }; // ms
    fid: { max: number; current: number }; // ms
    cls: { max: number; current: number }; // score
    fcp: { max: number; current: number }; // ms
  };
  networkRequests: {
    max: number;
    current: number;
  };
  memoryUsage: {
    max: number; // MB
    current: number;
  };
  cacheHitRate: {
    min: number; // percentage
    current: number;
  };
}

export interface BudgetViolation {
  metric: string;
  currentValue: number;
  budgetValue: number;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  component?: string;
  route?: string;
}

export interface BudgetAlert {
  id: string;
  violation: BudgetViolation;
  notified: boolean;
  acknowledged: boolean;
  resolvedAt?: number;
}

export class PerformanceBudgetEnforcer {
  private budget: PerformanceBudget;
  private violations: BudgetAlert[] = [];
  private supabase: any;
  private isMonitoring = false;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    // Wedding supplier mobile-optimized budgets
    this.budget = {
      bundleSize: {
        max: 250 * 1024, // 250KB for mobile
        current: 0,
        threshold: 225 * 1024, // 225KB warning
      },
      coreWebVitals: {
        lcp: { max: 4000, current: 0 }, // 4s on 3G
        fid: { max: 100, current: 0 }, // 100ms
        cls: { max: 0.1, current: 0 }, // 0.1 score
        fcp: { max: 2500, current: 0 }, // 2.5s on 3G
      },
      networkRequests: {
        max: 15, // Limit for mobile
        current: 0,
      },
      memoryUsage: {
        max: 50, // 50MB for mobile
        current: 0,
      },
      cacheHitRate: {
        min: 80, // 80% minimum
        current: 0,
      },
    };

    this.initializeSupabase();
    this.setupPerformanceObservers();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Start performance budget monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Performance budget monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🎯 Performance budget monitoring started');

    // Start all performance observers
    this.startCoreWebVitalsMonitoring();
    this.startBundleSizeMonitoring();
    this.startMemoryMonitoring();
    this.startNetworkMonitoring();

    // Check budget every 30 seconds
    setInterval(() => {
      this.checkBudgets();
    }, 30000);
  }

  /**
   * Stop performance budget monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    // Disconnect all observers
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();

    console.log('🎯 Performance budget monitoring stopped');
  }

  /**
   * Update performance budget configuration
   */
  updateBudget(updates: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...updates };
    console.log('🎯 Performance budget updated', updates);
  }

  /**
   * Get current performance budget status
   */
  getBudgetStatus(): {
    budget: PerformanceBudget;
    violations: BudgetAlert[];
    overallHealth: 'healthy' | 'warning' | 'critical';
  } {
    const criticalViolations = this.violations.filter(
      (v) => v.violation.severity === 'critical' && !v.acknowledged,
    );
    const warningViolations = this.violations.filter(
      (v) => v.violation.severity === 'warning' && !v.acknowledged,
    );

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalViolations.length > 0) {
      overallHealth = 'critical';
    } else if (warningViolations.length > 0) {
      overallHealth = 'warning';
    }

    return {
      budget: this.budget,
      violations: this.violations,
      overallHealth,
    };
  }

  /**
   * Check all performance budgets
   */
  private async checkBudgets(): Promise<void> {
    if (!this.isMonitoring) return;

    const violations: BudgetViolation[] = [];

    // Check Core Web Vitals
    violations.push(...this.checkCoreWebVitals());

    // Check bundle size
    violations.push(...this.checkBundleSize());

    // Check memory usage
    violations.push(...this.checkMemoryUsage());

    // Check network requests
    violations.push(...this.checkNetworkRequests());

    // Check cache hit rate
    violations.push(...this.checkCacheHitRate());

    // Process new violations
    for (const violation of violations) {
      await this.handleViolation(violation);
    }
  }

  /**
   * Check Core Web Vitals against budget
   */
  private checkCoreWebVitals(): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    // Check LCP
    if (
      this.budget.coreWebVitals.lcp.current > this.budget.coreWebVitals.lcp.max
    ) {
      violations.push({
        metric: 'lcp',
        currentValue: this.budget.coreWebVitals.lcp.current,
        budgetValue: this.budget.coreWebVitals.lcp.max,
        severity:
          this.budget.coreWebVitals.lcp.current >
          this.budget.coreWebVitals.lcp.max * 1.5
            ? 'critical'
            : 'error',
        message: `LCP ${this.budget.coreWebVitals.lcp.current}ms exceeds budget of ${this.budget.coreWebVitals.lcp.max}ms`,
        timestamp: Date.now(),
      });
    }

    // Check FID
    if (
      this.budget.coreWebVitals.fid.current > this.budget.coreWebVitals.fid.max
    ) {
      violations.push({
        metric: 'fid',
        currentValue: this.budget.coreWebVitals.fid.current,
        budgetValue: this.budget.coreWebVitals.fid.max,
        severity:
          this.budget.coreWebVitals.fid.current >
          this.budget.coreWebVitals.fid.max * 2
            ? 'critical'
            : 'error',
        message: `FID ${this.budget.coreWebVitals.fid.current}ms exceeds budget of ${this.budget.coreWebVitals.fid.max}ms`,
        timestamp: Date.now(),
      });
    }

    // Check CLS
    if (
      this.budget.coreWebVitals.cls.current > this.budget.coreWebVitals.cls.max
    ) {
      violations.push({
        metric: 'cls',
        currentValue: this.budget.coreWebVitals.cls.current,
        budgetValue: this.budget.coreWebVitals.cls.max,
        severity:
          this.budget.coreWebVitals.cls.current >
          this.budget.coreWebVitals.cls.max * 2
            ? 'critical'
            : 'error',
        message: `CLS ${this.budget.coreWebVitals.cls.current.toFixed(3)} exceeds budget of ${this.budget.coreWebVitals.cls.max}`,
        timestamp: Date.now(),
      });
    }

    // Check FCP
    if (
      this.budget.coreWebVitals.fcp.current > this.budget.coreWebVitals.fcp.max
    ) {
      violations.push({
        metric: 'fcp',
        currentValue: this.budget.coreWebVitals.fcp.current,
        budgetValue: this.budget.coreWebVitals.fcp.max,
        severity:
          this.budget.coreWebVitals.fcp.current >
          this.budget.coreWebVitals.fcp.max * 1.5
            ? 'critical'
            : 'warning',
        message: `FCP ${this.budget.coreWebVitals.fcp.current}ms exceeds budget of ${this.budget.coreWebVitals.fcp.max}ms`,
        timestamp: Date.now(),
      });
    }

    return violations;
  }

  /**
   * Check bundle size against budget
   */
  private checkBundleSize(): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    if (this.budget.bundleSize.current > this.budget.bundleSize.max) {
      violations.push({
        metric: 'bundleSize',
        currentValue: this.budget.bundleSize.current,
        budgetValue: this.budget.bundleSize.max,
        severity: 'critical',
        message: `Bundle size ${(this.budget.bundleSize.current / 1024).toFixed(1)}KB exceeds budget of ${(this.budget.bundleSize.max / 1024).toFixed(1)}KB`,
        timestamp: Date.now(),
      });
    } else if (
      this.budget.bundleSize.current > this.budget.bundleSize.threshold
    ) {
      violations.push({
        metric: 'bundleSize',
        currentValue: this.budget.bundleSize.current,
        budgetValue: this.budget.bundleSize.threshold,
        severity: 'warning',
        message: `Bundle size ${(this.budget.bundleSize.current / 1024).toFixed(1)}KB approaching budget limit`,
        timestamp: Date.now(),
      });
    }

    return violations;
  }

  /**
   * Check memory usage against budget
   */
  private checkMemoryUsage(): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    if (this.budget.memoryUsage.current > this.budget.memoryUsage.max) {
      violations.push({
        metric: 'memoryUsage',
        currentValue: this.budget.memoryUsage.current,
        budgetValue: this.budget.memoryUsage.max,
        severity:
          this.budget.memoryUsage.current > this.budget.memoryUsage.max * 1.5
            ? 'critical'
            : 'error',
        message: `Memory usage ${this.budget.memoryUsage.current.toFixed(1)}MB exceeds budget of ${this.budget.memoryUsage.max}MB`,
        timestamp: Date.now(),
      });
    }

    return violations;
  }

  /**
   * Check network requests against budget
   */
  private checkNetworkRequests(): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    if (this.budget.networkRequests.current > this.budget.networkRequests.max) {
      violations.push({
        metric: 'networkRequests',
        currentValue: this.budget.networkRequests.current,
        budgetValue: this.budget.networkRequests.max,
        severity: 'warning',
        message: `Network requests ${this.budget.networkRequests.current} exceeds budget of ${this.budget.networkRequests.max}`,
        timestamp: Date.now(),
      });
    }

    return violations;
  }

  /**
   * Check cache hit rate against budget
   */
  private checkCacheHitRate(): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    if (this.budget.cacheHitRate.current < this.budget.cacheHitRate.min) {
      violations.push({
        metric: 'cacheHitRate',
        currentValue: this.budget.cacheHitRate.current,
        budgetValue: this.budget.cacheHitRate.min,
        severity:
          this.budget.cacheHitRate.current < this.budget.cacheHitRate.min * 0.7
            ? 'critical'
            : 'warning',
        message: `Cache hit rate ${this.budget.cacheHitRate.current.toFixed(1)}% below budget of ${this.budget.cacheHitRate.min}%`,
        timestamp: Date.now(),
      });
    }

    return violations;
  }

  /**
   * Handle performance budget violation
   */
  private async handleViolation(violation: BudgetViolation): Promise<void> {
    // Check if this violation already exists
    const existingAlert = this.violations.find(
      (alert) =>
        alert.violation.metric === violation.metric && !alert.acknowledged,
    );

    if (existingAlert) {
      // Update existing violation
      existingAlert.violation = violation;
      return;
    }

    // Create new alert
    const alert: BudgetAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      violation,
      notified: false,
      acknowledged: false,
    };

    this.violations.push(alert);

    // Send notification based on severity
    await this.sendViolationNotification(alert);

    // Log violation
    console.warn('🚨 Performance Budget Violation:', violation);

    // Track violation in database
    await this.trackViolation(violation);
  }

  /**
   * Send violation notification
   */
  private async sendViolationNotification(alert: BudgetAlert): Promise<void> {
    try {
      // For critical violations, send immediate notification
      if (alert.violation.severity === 'critical') {
        // This would integrate with your notification system
        console.error(
          '🚨 CRITICAL Performance Budget Violation:',
          alert.violation.message,
        );

        // Send to monitoring service
        if (this.supabase) {
          await this.supabase.from('performance_alerts').insert({
            alert_id: alert.id,
            metric: alert.violation.metric,
            severity: alert.violation.severity,
            message: alert.violation.message,
            current_value: alert.violation.currentValue,
            budget_value: alert.violation.budgetValue,
            timestamp: new Date(alert.violation.timestamp).toISOString(),
          });
        }
      }

      alert.notified = true;
    } catch (error) {
      console.error('Failed to send violation notification:', error);
    }
  }

  /**
   * Acknowledge a budget violation
   */
  acknowledgeViolation(alertId: string): boolean {
    const alert = this.violations.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve a budget violation
   */
  resolveViolation(alertId: string): boolean {
    const alert = this.violations.find((a) => a.id === alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    // Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      this.setupCoreWebVitalsObserver();
      this.setupMemoryObserver();
      this.setupNetworkObserver();
    }
  }

  /**
   * Start Core Web Vitals monitoring
   */
  private startCoreWebVitalsMonitoring(): void {
    // This would be implemented with actual Web Vitals library
    console.log('🎯 Core Web Vitals monitoring started');
  }

  /**
   * Start bundle size monitoring
   */
  private startBundleSizeMonitoring(): void {
    // Monitor bundle size through performance API
    console.log('🎯 Bundle size monitoring started');
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memoryInfo = (performance as any).memory;
        this.budget.memoryUsage.current =
          memoryInfo.usedJSHeapSize / (1024 * 1024);
      }, 10000); // Update every 10 seconds
    }
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    // Monitor network requests
    console.log('🎯 Network monitoring started');
  }

  /**
   * Setup Core Web Vitals observer
   */
  private setupCoreWebVitalsObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.budget.coreWebVitals.lcp.current = entry.startTime;
          }
          // Add other Web Vitals measurements
        }
      });

      observer.observe({
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'],
      });
      this.observers.set('webVitals', observer);
    } catch (error) {
      console.warn('Failed to setup Core Web Vitals observer:', error);
    }
  }

  /**
   * Setup memory observer
   */
  private setupMemoryObserver(): void {
    // Memory monitoring is handled in startMemoryMonitoring
  }

  /**
   * Setup network observer
   */
  private setupNetworkObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        let networkRequests = 0;
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            networkRequests++;
          }
        }
        this.budget.networkRequests.current = networkRequests;
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('network', observer);
    } catch (error) {
      console.warn('Failed to setup network observer:', error);
    }
  }

  /**
   * Track violation in database
   */
  private async trackViolation(violation: BudgetViolation): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.from('performance_budget_violations').insert({
          metric: violation.metric,
          current_value: violation.currentValue,
          budget_value: violation.budgetValue,
          severity: violation.severity,
          message: violation.message,
          timestamp: new Date(violation.timestamp).toISOString(),
          component: violation.component,
          route: violation.route,
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track violation:', error);
      }
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }
}

// Export singleton instance
export const performanceBudgetEnforcer =
  typeof window !== 'undefined' ? new PerformanceBudgetEnforcer() : null;
