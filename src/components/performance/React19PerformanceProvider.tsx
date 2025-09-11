'use client';

import React, {
  createContext,
  useContext,
  Suspense,
  startTransition,
  useDeferredValue,
  useTransition,
  memo,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { GuestSearchResult } from '@/types/guest-management';
import {
  useConcurrentState,
  usePerformanceTracking,
  useAdvancedBatching,
} from '@/hooks/useConcurrentPerformance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2Icon,
  RocketLaunchIcon,
  CpuChipIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

// React 19 Performance Context
interface React19PerformanceContextType {
  // Concurrent state management
  concurrentData: GuestSearchResult[];
  updateData: (
    data:
      | GuestSearchResult[]
      | ((prev: GuestSearchResult[]) => GuestSearchResult[]),
  ) => void;
  isPending: boolean;
  optimisticData: GuestSearchResult[];

  // Batching
  queueUpdate: (updateFn: () => void) => void;
  flushUpdates: () => void;
  pendingBatchCount: number;

  // Performance metrics
  metrics: {
    renderTime: number;
    transitionTime: number;
    optimisticUpdateCount: number;
    batchedUpdateCount: number;
  };

  // Error handling
  error: Error | null;
  clearError: () => void;
}

const React19PerformanceContext =
  createContext<React19PerformanceContextType | null>(null);

// Custom hook to use the performance context
export function useReact19Performance() {
  const context = useContext(React19PerformanceContext);
  if (!context) {
    throw new Error(
      'useReact19Performance must be used within React19PerformanceProvider',
    );
  }
  return context;
}

// Performance monitoring component
const PerformanceMonitor = memo(() => {
  const { metrics, isPending } = useReact19Performance();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className={cn(
          'bg-white shadow-lg border-2',
          isPending ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
        )}
      >
        <CpuChipIcon className="w-4 h-4 mr-2" />
        Performance
        {isPending && <Loader2Icon className="w-3 h-3 ml-2 animate-spin" />}
      </Button>

      {isVisible && (
        <div className="absolute bottom-12 left-0 p-4 bg-white border border-gray-200 rounded-lg shadow-xl min-w-64">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <RocketLaunchIcon className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">React 19 Features</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-3 h-3 text-green-600" />
                <span>Render: {metrics.renderTime.toFixed(1)}ms</span>
              </div>

              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-3 h-3 text-blue-600" />
                <span>Transition: {metrics.transitionTime.toFixed(1)}ms</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                <span>Optimistic: {metrics.optimisticUpdateCount}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-600 rounded-full"></span>
                <span>Batched: {metrics.batchedUpdateCount}</span>
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-gray-500">
              <div>✅ useTransition: {isPending ? 'Active' : 'Idle'}</div>
              <div>✅ useDeferredValue: Enabled</div>
              <div>✅ Suspense: Concurrent</div>
              <div>✅ Automatic Batching: On</div>
              <div>✅ React Compiler: Ready</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Suspense fallback for different loading states
const ConcurrentFallback = memo(
  ({ message = 'Loading...' }: { message?: string }) => (
    <div className="flex items-center justify-center p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animate-reverse"></div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">{message}</div>
          <div className="text-xs text-gray-500">
            Using React 19 concurrent rendering
          </div>
        </div>
      </div>
    </div>
  ),
);

// Optimistic update demonstration component
const OptimisticUpdateDemo = memo(() => {
  const { updateData, optimisticData, isPending, queueUpdate } =
    useReact19Performance();
  const [counter, setCounter] = useState(0);

  const handleOptimisticUpdate = useCallback(() => {
    // Optimistic update for immediate UI feedback
    updateData((prev) => [
      ...prev,
      {
        id: `optimistic-${Date.now()}`,
        first_name: 'New',
        last_name: `Guest ${counter + 1}`,
        email: `guest${counter + 1}@example.com`,
        category: 'friends',
        side: 'mutual',
        rsvp_status: 'pending',
        age_group: 'adult',
        plus_one: false,
        table_number: null,
        dietary_restrictions: null,
        household_name: null,
        plus_one_name: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as GuestSearchResult,
    ]);

    setCounter((prev) => prev + 1);
  }, [updateData, counter]);

  const handleBatchedUpdates = useCallback(() => {
    // Demonstrate automatic batching
    queueUpdate(() => setCounter((prev) => prev + 1));
    queueUpdate(() => updateData((prev) => prev.slice(0, -1))); // Remove last item
    queueUpdate(() => console.log('Batched update complete'));
  }, [queueUpdate, updateData]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium mb-3">
        React 19 Concurrent Features Demo
      </h3>

      <div className="flex gap-2 mb-3">
        <Button
          size="sm"
          onClick={handleOptimisticUpdate}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          {isPending && <Loader2Icon className="w-3 h-3 animate-spin" />}
          Optimistic Update
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleBatchedUpdates}
          className="flex items-center gap-2"
        >
          Batched Updates
        </Button>
      </div>

      <div className="text-xs text-gray-600">
        <div>
          Optimistic Items:{' '}
          {optimisticData.filter((g) => g.id.startsWith('optimistic')).length}
        </div>
        <div>Counter: {counter}</div>
        <div>Status: {isPending ? 'Updating...' : 'Ready'}</div>
      </div>
    </div>
  );
});

// Main provider component
interface React19PerformanceProviderProps {
  children: React.ReactNode;
  initialData?: GuestSearchResult[];
  enableMonitoring?: boolean;
  enableDemo?: boolean;
}

export const React19PerformanceProvider: React.FC<
  React19PerformanceProviderProps
> = ({
  children,
  initialData = [],
  enableMonitoring = true,
  enableDemo = false,
}) => {
  // Concurrent state management with React 19 features
  const {
    data: concurrentData,
    optimisticData,
    isPending,
    error,
    updateConcurrently,
    reset,
  } = useConcurrentState(initialData, (current, update) => {
    if (typeof update === 'function') {
      return update(current);
    }
    return update;
  });

  // Performance tracking
  const { metrics, recordOptimisticUpdate, recordBatchedUpdate } =
    usePerformanceTracking();

  // Advanced batching
  const {
    queueUpdate,
    flushUpdates,
    isPending: isBatchPending,
    pendingCount,
  } = useAdvancedBatching();

  // Enhanced update function with metrics
  const updateData = useCallback(
    (
      data:
        | GuestSearchResult[]
        | ((prev: GuestSearchResult[]) => GuestSearchResult[]),
    ) => {
      recordOptimisticUpdate();
      updateConcurrently(data, { optimistic: true });
    },
    [updateConcurrently, recordOptimisticUpdate],
  );

  // Enhanced queue function with metrics
  const enhancedQueueUpdate = useCallback(
    (updateFn: () => void) => {
      recordBatchedUpdate();
      queueUpdate(updateFn);
    },
    [queueUpdate, recordBatchedUpdate],
  );

  // Clear error function
  const clearError = useCallback(() => {
    reset();
  }, [reset]);

  // Context value with memoization
  const contextValue = useMemo(
    () => ({
      concurrentData,
      updateData,
      isPending: isPending || isBatchPending,
      optimisticData,
      queueUpdate: enhancedQueueUpdate,
      flushUpdates,
      pendingBatchCount: pendingCount,
      metrics,
      error,
      clearError,
    }),
    [
      concurrentData,
      updateData,
      isPending,
      isBatchPending,
      optimisticData,
      enhancedQueueUpdate,
      flushUpdates,
      pendingCount,
      metrics,
      error,
      clearError,
    ],
  );

  return (
    <React19PerformanceContext.Provider value={contextValue}>
      <div className="relative">
        {/* Main content with Suspense boundary */}
        <Suspense
          fallback={
            <ConcurrentFallback message="Initializing React 19 performance features..." />
          }
        >
          {children}
        </Suspense>

        {/* Error boundary fallback */}
        {error && (
          <div className="fixed top-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-md z-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              <span className="font-medium text-red-900 text-sm">
                Performance Error
              </span>
            </div>
            <p className="text-sm text-red-700 mb-3">{error.message}</p>
            <Button size="sm" variant="outline" onClick={clearError}>
              Clear Error
            </Button>
          </div>
        )}

        {/* Performance monitor */}
        {enableMonitoring && <PerformanceMonitor />}

        {/* Demo component */}
        {enableDemo && (
          <div className="fixed top-4 left-4 z-50">
            <OptimisticUpdateDemo />
          </div>
        )}

        {/* React 19 feature indicator */}
        <div className="fixed top-4 right-4 z-40">
          <Badge
            variant="secondary"
            className={cn(
              'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
              isPending && 'animate-pulse',
            )}
          >
            React 19 ⚡
          </Badge>
        </div>
      </div>
    </React19PerformanceContext.Provider>
  );
};

// Higher-order component for concurrent rendering
export function withConcurrentPerformance<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    suspense?: boolean;
    deferProps?: boolean;
    enableMetrics?: boolean;
  } = {},
) {
  const {
    suspense = true,
    deferProps = false,
    enableMetrics = process.env.NODE_ENV === 'development',
  } = options;

  const WrappedComponent: React.FC<P> = (props) => {
    // Defer props to reduce re-renders if enabled
    const finalProps = deferProps ? useDeferredValue(props) : props;

    // Performance metrics
    const startTime = useMemo(() => performance.now(), []);

    useEffect(() => {
      if (enableMetrics && process.env.NODE_ENV === 'development') {
        const endTime = performance.now();
        console.debug(
          `Component ${Component.displayName || Component.name} render time:`,
          endTime - startTime,
          'ms',
        );
      }
    }, [enableMetrics, startTime]); // Add dependency array to prevent infinite re-renders

    const ComponentWithPerformance = <Component {...finalProps} />;

    return suspense ? (
      <Suspense
        fallback={
          <ConcurrentFallback
            message={`Loading ${Component.displayName || 'component'}...`}
          />
        }
      >
        {ComponentWithPerformance}
      </Suspense>
    ) : (
      ComponentWithPerformance
    );
  };

  WrappedComponent.displayName = `withConcurrentPerformance(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

React19PerformanceProvider.displayName = 'React19PerformanceProvider';
