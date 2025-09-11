/**
 * WS-173 Team D Round 2: Progressive Component Loader
 *
 * Implements progressive enhancement for mobile wedding supplier workflows
 * Loads components based on connection speed and wedding context priority
 */

'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  mobileFirstLoader,
  type WeddingWorkflowContext,
} from '@/lib/loading/mobile-first-loader';
import { DeviceDetector } from '@/lib/utils/mobile-performance';

interface ProgressiveLoaderProps {
  context: WeddingWorkflowContext;
  fallbackComponent?: React.ComponentType<any>;
  loadingComponent?: React.ComponentType<any>;
  errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  children?: React.ReactNode;
}

interface ComponentLoadingState {
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
  loadedComponents: Set<string>;
  connectionSpeed: '2g' | '3g' | '4g' | 'wifi';
}

// Progressive loading configuration for different connection speeds
const PROGRESSIVE_LOADING_CONFIG = {
  '2g': {
    maxConcurrentComponents: 1,
    componentTimeout: 5000,
    enableAnimations: false,
    enableImageOptimization: true,
    enableLazyLoading: true,
  },
  '3g': {
    maxConcurrentComponents: 2,
    componentTimeout: 3000,
    enableAnimations: false,
    enableImageOptimization: true,
    enableLazyLoading: true,
  },
  '4g': {
    maxConcurrentComponents: 4,
    componentTimeout: 2000,
    enableAnimations: true,
    enableImageOptimization: false,
    enableLazyLoading: false,
  },
  wifi: {
    maxConcurrentComponents: 6,
    componentTimeout: 1000,
    enableAnimations: true,
    enableImageOptimization: false,
    enableLazyLoading: false,
  },
} as const;

// Lazy-loaded components with different priorities
const ComponentRegistry = {
  // Critical components - always load first
  critical: {
    WeddingBasicInfo: lazy(() => import('@/components/wedding/BasicInfo')),
    EmergencyContacts: lazy(
      () => import('@/components/contacts/EmergencyContacts'),
    ),
    SupplierDashboard: lazy(() => import('@/components/supplier/Dashboard')),
  },

  // Important components - load after critical
  important: {
    PhotoGroupManager: lazy(
      () => import('@/components/mobile/PhotoGroupManager'),
    ),
    GuestAssignments: lazy(() => import('@/components/guests/Assignments')),
    VenueLayout: lazy(() => import('@/components/venue/Layout')),
  },

  // Normal components - load when resources allow
  normal: {
    SeatingArrangements: lazy(
      () => import('@/components/seating/Arrangements'),
    ),
    TaskManagement: lazy(() => import('@/components/tasks/Management')),
    SupplierCommunication: lazy(
      () => import('@/components/communication/Supplier'),
    ),
  },

  // Low priority components - load in background
  low: {
    Analytics: lazy(() => import('@/components/analytics/Dashboard')),
    Reports: lazy(() => import('@/components/reports/Generator')),
    Settings: lazy(() => import('@/components/settings/Panel')),
  },
} as const;

// Fallback components for when main components fail to load
const FallbackComponents = {
  WeddingBasicInfo: () => (
    <div className="wedding-info-fallback">
      <h2>Wedding Information</h2>
      <p>Loading basic wedding details...</p>
    </div>
  ),

  EmergencyContacts: () => (
    <div className="emergency-contacts-fallback">
      <h3>Emergency Contacts</h3>
      <p>📞 Call venue directly if needed</p>
      <button onClick={() => (window.location.href = 'tel:911')}>
        🚨 Emergency: 911
      </button>
    </div>
  ),

  PhotoGroupManager: () => (
    <div className="photo-manager-fallback">
      <h3>Photo Management</h3>
      <p>Photo management temporarily unavailable</p>
      <p>Check your internet connection</p>
    </div>
  ),

  GuestAssignments: () => (
    <div className="guest-assignments-fallback">
      <h3>Guest Assignments</h3>
      <p>Basic guest information loading...</p>
    </div>
  ),

  Default: () => (
    <div className="component-fallback">
      <h3>Loading...</h3>
      <p>Component temporarily unavailable</p>
    </div>
  ),
} as const;

export default function ProgressiveLoader({
  context,
  fallbackComponent: CustomFallback,
  loadingComponent: CustomLoading,
  errorComponent: CustomError,
  children,
}: ProgressiveLoaderProps) {
  const [loadingState, setLoadingState] = useState<ComponentLoadingState>({
    isLoading: true,
    hasError: false,
    loadedComponents: new Set(),
    connectionSpeed: '4g',
  });

  const [componentsToRender, setComponentsToRender] = useState<
    React.ComponentType[]
  >([]);

  useEffect(() => {
    initializeProgressiveLoading();
  }, [context.eventPhase, context.urgencyLevel]);

  const initializeProgressiveLoading = async () => {
    try {
      // Detect connection speed
      const connectionSpeed = detectConnectionSpeed();
      const config = PROGRESSIVE_LOADING_CONFIG[connectionSpeed];

      setLoadingState((prev) => ({
        ...prev,
        connectionSpeed,
        isLoading: true,
        hasError: false,
      }));

      // Load wedding context data first
      const contextResult =
        await mobileFirstLoader.loadForWeddingContext(context);

      if (
        contextResult.errors &&
        Object.keys(contextResult.errors).length > 0
      ) {
        console.warn('Some resources failed to load:', contextResult.errors);
      }

      // Load components progressively based on priority and connection
      await loadComponentsProgressively(config);

      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Progressive loading failed:', error);
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: true,
        error: error as Error,
      }));
    }
  };

  const detectConnectionSpeed = (): '2g' | '3g' | '4g' | 'wifi' => {
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;

      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return '2g';
        case '3g':
          return '3g';
        case '4g':
          return '4g';
        default:
          return 'wifi';
      }
    }

    // Fallback based on device detection
    return DeviceDetector.isSlowDevice() ? '3g' : '4g';
  };

  const loadComponentsProgressively = async (
    config: (typeof PROGRESSIVE_LOADING_CONFIG)['4g'],
  ) => {
    const componentPriorities = getComponentPrioritiesForContext(context);

    // Load components in priority order with concurrency limits
    for (const [priority, componentNames] of componentPriorities) {
      await loadComponentBatch(componentNames, priority, config);

      // Add delay between priority levels for slower connections
      if (
        loadingState.connectionSpeed === '2g' ||
        loadingState.connectionSpeed === '3g'
      ) {
        await delay(200);
      }
    }
  };

  const getComponentPrioritiesForContext = (
    context: WeddingWorkflowContext,
  ): Array<[string, string[]]> => {
    const basePriorities = [
      ['critical', ['WeddingBasicInfo']],
      ['important', ['PhotoGroupManager']],
      ['normal', ['SeatingArrangements']],
      ['low', ['Analytics']],
    ];

    // Adjust based on wedding phase
    switch (context.eventPhase) {
      case 'ceremony':
        basePriorities[0][1] = ['WeddingBasicInfo', 'EmergencyContacts'];
        basePriorities[1][1] = ['PhotoGroupManager', 'GuestAssignments'];
        break;

      case 'reception':
        basePriorities[1][1] = ['SeatingArrangements', 'PhotoGroupManager'];
        basePriorities[2][1] = ['SupplierCommunication', 'TaskManagement'];
        break;

      case 'pre-event':
        basePriorities[0][1] = ['WeddingBasicInfo', 'SupplierDashboard'];
        basePriorities[1][1] = ['VenueLayout', 'GuestAssignments'];
        break;
    }

    // Adjust for urgency level
    if (context.urgencyLevel === 'emergency') {
      return [
        ['critical', ['WeddingBasicInfo', 'EmergencyContacts']],
        ['important', ['SupplierDashboard']],
      ];
    }

    return basePriorities as Array<[string, string[]]>;
  };

  const loadComponentBatch = async (
    componentNames: string[],
    priority: string,
    config: (typeof PROGRESSIVE_LOADING_CONFIG)['4g'],
  ) => {
    const batchSize = Math.min(
      componentNames.length,
      config.maxConcurrentComponents,
    );
    const batches = chunk(componentNames, batchSize);

    for (const batch of batches) {
      const loadPromises = batch.map(async (componentName) => {
        try {
          await loadComponent(componentName, config.componentTimeout);

          setLoadingState((prev) => ({
            ...prev,
            loadedComponents: new Set([
              ...prev.loadedComponents,
              componentName,
            ]),
          }));

          return componentName;
        } catch (error) {
          console.warn(`Failed to load component: ${componentName}`, error);
          return null;
        }
      });

      await Promise.allSettled(loadPromises);
    }
  };

  const loadComponent = async (
    componentName: string,
    timeout: number,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Component loading timeout: ${componentName}`));
      }, timeout);

      // Simulate component loading (in real implementation, this would be dynamic imports)
      setTimeout(
        () => {
          clearTimeout(timeoutId);
          resolve();
        },
        Math.random() * 500 + 100,
      ); // Simulate 100-600ms load time
    });
  };

  const retry = () => {
    setLoadingState((prev) => ({
      ...prev,
      hasError: false,
      error: undefined,
    }));
    initializeProgressiveLoading();
  };

  const renderProgressiveComponents = () => {
    const { connectionSpeed, loadedComponents } = loadingState;
    const config = PROGRESSIVE_LOADING_CONFIG[connectionSpeed];

    return (
      <div
        className={`progressive-loader ${connectionSpeed}-connection`}
        style={
          {
            '--animation-enabled': config.enableAnimations ? '1' : '0',
            '--lazy-loading': config.enableLazyLoading ? 'lazy' : 'eager',
          } as React.CSSProperties
        }
      >
        {/* Always render critical fallbacks immediately */}
        <Suspense fallback={<FallbackComponents.WeddingBasicInfo />}>
          {loadedComponents.has('WeddingBasicInfo') && (
            <div className="component-container critical">
              <ComponentRegistry.critical.WeddingBasicInfo />
            </div>
          )}
        </Suspense>

        <Suspense fallback={<FallbackComponents.EmergencyContacts />}>
          {loadedComponents.has('EmergencyContacts') && (
            <div className="component-container critical">
              <ComponentRegistry.critical.EmergencyContacts />
            </div>
          )}
        </Suspense>

        {/* Render important components as they load */}
        <Suspense fallback={<FallbackComponents.PhotoGroupManager />}>
          {loadedComponents.has('PhotoGroupManager') && (
            <div className="component-container important">
              <ComponentRegistry.important.PhotoGroupManager />
            </div>
          )}
        </Suspense>

        <Suspense fallback={<FallbackComponents.GuestAssignments />}>
          {loadedComponents.has('GuestAssignments') && (
            <div className="component-container important">
              <ComponentRegistry.important.GuestAssignments />
            </div>
          )}
        </Suspense>

        {/* Normal and low priority components load progressively */}
        {connectionSpeed !== '2g' && (
          <>
            <Suspense fallback={<FallbackComponents.Default />}>
              {loadedComponents.has('SeatingArrangements') && (
                <div className="component-container normal">
                  <ComponentRegistry.normal.SeatingArrangements />
                </div>
              )}
            </Suspense>

            {connectionSpeed === '4g' || connectionSpeed === 'wifi' ? (
              <Suspense fallback={<FallbackComponents.Default />}>
                {loadedComponents.has('Analytics') && (
                  <div className="component-container low">
                    <ComponentRegistry.low.Analytics />
                  </div>
                )}
              </Suspense>
            ) : null}
          </>
        )}

        {/* Render custom children */}
        {children}
      </div>
    );
  };

  // Error boundary for component loading failures
  if (loadingState.hasError && CustomError) {
    return <CustomError error={loadingState.error!} retry={retry} />;
  }

  if (loadingState.hasError) {
    return (
      <div className="progressive-loader-error">
        <h3>Loading Failed</h3>
        <p>Unable to load wedding coordination interface</p>
        <button onClick={retry} className="retry-button">
          Try Again
        </button>

        {/* Emergency fallback for critical functions */}
        <div className="emergency-fallback">
          <FallbackComponents.EmergencyContacts />
        </div>
      </div>
    );
  }

  // Show loading state
  if (loadingState.isLoading && CustomLoading) {
    return <CustomLoading />;
  }

  if (loadingState.isLoading) {
    return (
      <div className="progressive-loader-loading">
        <div className="loading-header">
          <h3>Loading Wedding Coordination</h3>
          <p>Connection: {loadingState.connectionSpeed.toUpperCase()}</p>
        </div>

        <div className="loading-progress">
          <div className="progress-item critical">✓ Wedding Information</div>
          <div className="progress-item important">⏳ Photo Management</div>
          <div className="progress-item normal">⏳ Guest Assignments</div>
        </div>

        {/* Show critical components even while loading */}
        <div className="loading-fallbacks">
          <FallbackComponents.WeddingBasicInfo />
        </div>
      </div>
    );
  }

  // Render progressively loaded components
  return renderProgressiveComponents();
}

// Utility functions
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CSS classes for different connection speeds
const connectionStyles = `
.progressive-loader.2g-connection {
  --component-spacing: 8px;
  --image-quality: low;
  --animation-duration: 0s;
}

.progressive-loader.3g-connection {
  --component-spacing: 12px;
  --image-quality: medium;
  --animation-duration: 0.1s;
}

.progressive-loader.4g-connection {
  --component-spacing: 16px;
  --image-quality: high;
  --animation-duration: 0.3s;
}

.component-container {
  margin-bottom: var(--component-spacing, 16px);
  transition: opacity var(--animation-duration, 0.3s) ease-in-out;
}

.component-container.critical {
  border-left: 4px solid #dc2626;
  padding-left: 12px;
}

.component-container.important {
  border-left: 4px solid #f59e0b;
  padding-left: 12px;
}

.component-container.normal {
  border-left: 4px solid #10b981;
  padding-left: 12px;
}

.component-container.low {
  border-left: 4px solid #6b7280;
  padding-left: 12px;
}
`;
