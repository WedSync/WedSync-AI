/**
 * CI/CD Performance Testing Integration for WedSync
 *
 * This module provides comprehensive CI/CD integration for performance testing,
 * ensuring that performance regressions are caught before they impact wedding
 * couples, photographers, and vendors using the WedSync platform.
 *
 * Key Features:
 * - Automated performance testing in CI/CD pipelines
 * - Deployment blocking on performance threshold violations
 * - GitHub Actions workflow integration
 * - Vercel deployment hook integration
 * - Real-time performance monitoring
 * - Wedding-context-aware performance thresholds
 * - Comprehensive audit logging and alerting
 */

// Import core CI/CD classes
import {
  PerformanceGate,
  type PerformanceTestConfig,
  type PerformanceThresholds,
  type PerformanceMetrics,
  type DeploymentValidationResult,
  type PerformanceViolation,
  type PerformanceBaseline,
  type DeploymentContext,
} from './performance-gate';

import {
  GitHubActionsIntegration,
  type WorkflowInputs,
  type WorkflowResult,
  type WorkflowArtifact,
  type GitHubStatusCheck,
} from './github-actions-integration';

import {
  VercelDeploymentHook,
  type VercelDeployment,
  type DeploymentHookResult,
  type VercelClient,
} from './vercel-deployment-hook';

// Re-export all types and classes
export {
  PerformanceGate,
  type PerformanceTestConfig,
  type PerformanceThresholds,
  type PerformanceMetrics,
  type DeploymentValidationResult,
  type PerformanceViolation,
  type PerformanceBaseline,
  type DeploymentContext,
  GitHubActionsIntegration,
  type WorkflowInputs,
  type WorkflowResult,
  type WorkflowArtifact,
  type GitHubStatusCheck,
  VercelDeploymentHook,
  type VercelDeployment,
  type DeploymentHookResult,
  type VercelClient,
};

/**
 * Default performance thresholds for different environments
 */
export const DEFAULT_PERFORMANCE_THRESHOLDS = {
  production: {
    responseTime: 2000, // 2 seconds
    errorRate: 0.01, // 1%
    throughput: 100, // 100 req/s minimum
    coreWebVitals: {
      LCP: 2500, // Largest Contentful Paint
      FID: 100, // First Input Delay
      CLS: 0.1, // Cumulative Layout Shift
      TTFB: 800, // Time to First Byte
    },
    weddingSpecific: {
      guestListLoad: 2000, // Guest list loading time
      photoGalleryRender: 1500, // Photo gallery render time
      timelineInteraction: 300, // Timeline interaction delay
      vendorSearchResponse: 750, // Vendor search response time
    },
  },

  staging: {
    responseTime: 3000, // 3 seconds (more lenient)
    errorRate: 0.02, // 2%
    throughput: 50, // 50 req/s minimum
    coreWebVitals: {
      LCP: 3500, // More lenient for staging
      FID: 150,
      CLS: 0.15,
      TTFB: 1200,
    },
    weddingSpecific: {
      guestListLoad: 3000,
      photoGalleryRender: 2500,
      timelineInteraction: 500,
      vendorSearchResponse: 1000,
    },
  },
} as const;

/**
 * Wedding-specific performance contexts
 */
export const WEDDING_PERFORMANCE_CONTEXTS = {
  PEAK_SEASON: {
    months: [5, 6, 7, 8, 9, 10], // May through October
    thresholdMultiplier: 0.8, // 20% stricter thresholds
    description: 'Peak wedding season with high user activity',
  },

  CRITICAL_PERIODS: {
    hours: [17, 18, 19, 20, 21, 22], // 5 PM - 10 PM
    weekends: [0, 6], // Sunday and Saturday
    thresholdMultiplier: 0.7, // 30% stricter thresholds
    description: 'Critical planning hours when couples are most active',
  },

  USER_SEGMENTS: {
    photographer: {
      criticalFeatures: [
        'photo_upload',
        'gallery_management',
        'portfolio_display',
      ],
      thresholds: {
        photoUpload: 5000, // 5 second timeout for uploads
        galleryRender: 1000, // 1 second for gallery display
        portfolioLoad: 2000, // 2 seconds for portfolio loading
      },
    },

    couple: {
      criticalFeatures: ['guest_list', 'timeline_planning', 'vendor_search'],
      thresholds: {
        guestListLoad: 1500, // Fast guest list loading
        timelineEdit: 200, // Immediate timeline interaction
        vendorSearch: 800, // Quick vendor search results
      },
    },

    vendor: {
      criticalFeatures: [
        'booking_management',
        'communication',
        'schedule_updates',
      ],
      thresholds: {
        bookingLoad: 1000, // Quick booking information
        messageLoad: 500, // Fast message loading
        scheduleUpdate: 300, // Immediate schedule updates
      },
    },
  },
} as const;

/**
 * CI/CD Integration factory function
 * Creates a complete CI/CD performance testing setup
 */
export function createCICDPerformanceIntegration(config: {
  githubToken?: string;
  vercelToken?: string;
  monitoringWebhookUrl?: string;
  githubOwner?: string;
  githubRepo?: string;
}) {
  // Initialize core performance gate
  const performanceGate = new PerformanceGate(
    config.githubToken,
    config.vercelToken,
    config.monitoringWebhookUrl,
  );

  // Initialize GitHub Actions integration if token provided
  const githubIntegration = config.githubToken
    ? new GitHubActionsIntegration(
        config.githubToken,
        config.githubOwner || 'WedSync',
        config.githubRepo || 'WedSync-2.0',
      )
    : undefined;

  // Initialize Vercel deployment hooks if token provided
  const vercelIntegration = config.vercelToken
    ? new VercelDeploymentHook(performanceGate, config.vercelToken)
    : undefined;

  return {
    performanceGate,
    githubIntegration,
    vercelIntegration,

    /**
     * Complete deployment validation workflow
     */
    async validateDeployment(
      buildId: string,
      environment: 'staging' | 'production',
      options: {
        gitHash?: string;
        testType?: 'load' | 'stress' | 'spike';
        duration?: number;
        userCount?: number;
        customThresholds?: any;
        weddingContext?: any;
      } = {},
    ) {
      console.log(`🚀 Starting complete deployment validation for ${buildId}`);

      // Create test configuration
      const testConfig = {
        testType: options.testType || 'load',
        duration:
          options.duration || (environment === 'production' ? 300 : 180),
        userCount:
          options.userCount || (environment === 'production' ? 100 : 50),
        targetUrl: `https://wedsync${environment === 'staging' ? '-staging' : ''}.com`,
        environment,
        thresholds:
          options.customThresholds ||
          DEFAULT_PERFORMANCE_THRESHOLDS[environment],
        weddingContext: options.weddingContext,
      };

      // Execute validation
      const result = await performanceGate.validateDeployment(
        buildId,
        environment,
        testConfig,
      );

      // Update GitHub status if available
      if (githubIntegration && options.gitHash) {
        const status = result.passed ? 'success' : 'failure';
        const description = result.passed
          ? 'Performance validation passed'
          : `Performance validation failed: ${result.violations.length} violations`;

        await githubIntegration.createStatusCheck(
          options.gitHash,
          status,
          description,
          result.violations,
        );
      }

      return result;
    },

    /**
     * Monitor deployment after going live
     */
    async monitorPostDeployment(
      deploymentId: string,
      deploymentUrl: string,
      environment: string = 'production',
    ) {
      if (vercelIntegration) {
        await vercelIntegration.handlePostDeployment(
          deploymentId,
          deploymentUrl,
          environment,
        );
      } else {
        console.log(
          '⚠️ Vercel integration not configured for post-deployment monitoring',
        );
      }
    },
  };
}

/**
 * Utility function to check if current time is in peak wedding period
 */
export function isWeddingPeakTime(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  // Peak wedding season
  const isPeakSeason = (
    WEDDING_PERFORMANCE_CONTEXTS.PEAK_SEASON.months as readonly number[]
  ).includes(month);

  // Critical hours
  const isCriticalHour = (
    WEDDING_PERFORMANCE_CONTEXTS.CRITICAL_PERIODS.hours as readonly number[]
  ).includes(hour);

  // Weekends
  const isWeekend = (
    WEDDING_PERFORMANCE_CONTEXTS.CRITICAL_PERIODS.weekends as readonly number[]
  ).includes(dayOfWeek);

  return isPeakSeason || isCriticalHour || isWeekend;
}

/**
 * Utility function to adjust performance thresholds for wedding context
 */
export function adjustThresholdsForWeddingContext(
  baseThresholds: any,
  context?: {
    peakSeason?: boolean;
    criticalPeriod?: boolean;
    userSegment?: 'photographer' | 'couple' | 'vendor';
  },
): any {
  if (!context) return baseThresholds;

  let adjustedThresholds = { ...baseThresholds };

  // Apply peak season adjustments
  if (context.peakSeason) {
    const multiplier =
      WEDDING_PERFORMANCE_CONTEXTS.PEAK_SEASON.thresholdMultiplier;
    adjustedThresholds.responseTime = Math.floor(
      adjustedThresholds.responseTime * multiplier,
    );
    adjustedThresholds.coreWebVitals.LCP = Math.floor(
      adjustedThresholds.coreWebVitals.LCP * multiplier,
    );
    adjustedThresholds.errorRate = adjustedThresholds.errorRate * 0.5; // 50% stricter
  }

  // Apply critical period adjustments
  if (context.criticalPeriod) {
    const multiplier =
      WEDDING_PERFORMANCE_CONTEXTS.CRITICAL_PERIODS.thresholdMultiplier;
    adjustedThresholds.responseTime = Math.floor(
      adjustedThresholds.responseTime * multiplier,
    );
    adjustedThresholds.coreWebVitals.LCP = Math.floor(
      adjustedThresholds.coreWebVitals.LCP * multiplier,
    );
  }

  // Apply user segment specific thresholds
  if (
    context.userSegment &&
    WEDDING_PERFORMANCE_CONTEXTS.USER_SEGMENTS[context.userSegment]
  ) {
    const segmentThresholds =
      WEDDING_PERFORMANCE_CONTEXTS.USER_SEGMENTS[context.userSegment]
        .thresholds;
    adjustedThresholds.weddingSpecific = {
      ...adjustedThresholds.weddingSpecific,
      ...segmentThresholds,
    };
  }

  return adjustedThresholds;
}

/**
 * Default export: Complete CI/CD performance integration
 */
const defaultExport = {
  PerformanceGate,
  GitHubActionsIntegration,
  VercelDeploymentHook,
  createCICDPerformanceIntegration,
  DEFAULT_PERFORMANCE_THRESHOLDS,
  WEDDING_PERFORMANCE_CONTEXTS,
  isWeddingPeakTime,
  adjustThresholdsForWeddingContext,
};

export default defaultExport;
