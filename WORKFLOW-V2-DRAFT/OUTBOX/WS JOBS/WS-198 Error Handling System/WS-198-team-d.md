# WS-198: Error Handling System - Team D Mobile & PWA Architect

## ROLE: Mobile Error Experience Architect
You are Team D, the Mobile & PWA Architect for WedSync, responsible for creating seamless error handling experiences on mobile devices and Progressive Web Apps. Your focus is on building mobile-optimized error recovery, offline error management, touch-friendly error interfaces, and PWA-specific error handling patterns that work gracefully across different network conditions and device capabilities.

## FEATURE CONTEXT: Error Handling System
Building comprehensive mobile and PWA error handling for WedSync's wedding coordination platform that works seamlessly across iOS, Android, and web browsers. This system must handle offline scenarios, network interruptions, device-specific constraints, and provide intuitive error recovery experiences for couples and suppliers managing weddings on mobile devices.

## YOUR IMPLEMENTATION FOCUS
Your Team D implementation must include:

1. **Mobile-Optimized Error UI/UX**
   - Touch-friendly error interfaces and recovery actions
   - Device-specific error messaging and guidance
   - Accessibility-compliant error communication
   - Battery and performance-conscious error handling

2. **PWA Error Management**
   - Service Worker error handling and recovery
   - Offline error queuing and synchronization
   - Background sync error management
   - Push notification error handling

3. **Network-Aware Error Handling**
   - Connection quality-based error strategies
   - Progressive error disclosure based on bandwidth
   - Smart retry mechanisms for mobile networks
   - Graceful degradation for poor connectivity

4. **Mobile Wedding Workflow Continuity**
   - Critical path error recovery for mobile users
   - Photo upload error handling and queuing
   - Form submission error management
   - Real-time synchronization error recovery

## IMPLEMENTATION REQUIREMENTS

### 1. Mobile Error UI Component System
```typescript
// /wedsync/src/components/mobile/error/MobileErrorHandler.tsx
import React, { useState, useEffect } from 'react';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';
import { useMobileErrorRecovery } from '@/hooks/useMobileErrorRecovery';

interface MobileErrorContext {
  errorId: string;
  errorCode: string;
  errorType: 'network' | 'validation' | 'service' | 'offline' | 'device' | 'permission';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalMessage?: string;
  canRetry: boolean;
  autoRetryEnabled: boolean;
  retryAfterSeconds?: number;
  recoveryActions?: MobileRecoveryAction[];
  weddingContext?: {
    weddingId: string;
    weddingDate: string;
    isWeddingDay: boolean;
    criticalPath: boolean;
  };
}

interface MobileRecoveryAction {
  type: 'retry' | 'offline_queue' | 'alternative_method' | 'contact_support' | 'manual_sync';
  label: string;
  description: string;
  icon: string;
  primary: boolean;
  disabled?: boolean;
  estimatedTime?: string;
}

export const MobileErrorHandler: React.FC<{ error: MobileErrorContext }> = ({ error }) => {
  const networkState = useNetworkState();
  const deviceCapabilities = useDeviceCapabilities();
  const { attemptRecovery, isRecovering, recoveryHistory } = useMobileErrorRecovery();
  
  const [showDetails, setShowDetails] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(error.retryAfterSeconds || 0);

  useEffect(() => {
    // Auto-retry countdown for mobile users
    if (error.autoRetryEnabled && retryCountdown > 0) {
      const timer = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            handleAutoRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [retryCountdown, error.autoRetryEnabled]);

  const handleAutoRetry = async () => {
    if (networkState.isOnline) {
      await attemptRecovery(error.errorId, 'auto_retry');
    }
  };

  const handleManualRetry = async () => {
    await attemptRecovery(error.errorId, 'manual_retry');
  };

  const handleOfflineQueue = async () => {
    await attemptRecovery(error.errorId, 'offline_queue');
  };

  const handleContactSupport = () => {
    // Mobile-specific support contact (in-app chat, phone, etc.)
    if (deviceCapabilities.canMakePhoneCalls) {
      window.location.href = 'tel:+1-800-WEDSYNC';
    } else {
      // Open in-app chat or email
      window.location.href = 'mailto:support@wedsync.com?subject=Error ' + error.errorId;
    }
  };

  const getErrorIcon = (errorType: string, severity: string) => {
    if (severity === 'critical' || error.weddingContext?.isWeddingDay) {
      return '🚨';
    }
    
    const icons = {
      network: '📶',
      validation: '⚠️',
      service: '🔧',
      offline: '📱',
      device: '📲',
      permission: '🔒'
    };
    
    return icons[errorType as keyof typeof icons] || '❌';
  };

  const getMobileOptimizedMessage = () => {
    // Optimize message length and clarity for mobile
    if (!networkState.isOnline && error.errorType === 'network') {
      return "You're offline. We'll try again when your connection returns.";
    }
    
    if (deviceCapabilities.isLowMemory && error.errorType === 'device') {
      return "Low device memory detected. Try closing other apps and retry.";
    }
    
    if (error.weddingContext?.isWeddingDay) {
      return `Wedding Day Alert: ${error.userMessage} Our emergency team has been notified.`;
    }
    
    return error.userMessage;
  };

  const getRecoveryActions = (): MobileRecoveryAction[] => {
    const baseActions: MobileRecoveryAction[] = [];
    
    if (error.canRetry) {
      baseActions.push({
        type: 'retry',
        label: networkState.isOnline ? 'Try Again' : 'Retry When Online',
        description: networkState.isOnline ? 'Attempt the action again' : 'Will retry automatically when connected',
        icon: '🔄',
        primary: true,
        disabled: !networkState.isOnline && error.errorType === 'network'
      });
    }
    
    if (!networkState.isOnline || error.errorType === 'network') {
      baseActions.push({
        type: 'offline_queue',
        label: 'Save for Later',
        description: 'Queue this action to complete when you\'re back online',
        icon: '📝',
        primary: !error.canRetry,
        estimatedTime: 'When connection restored'
      });
    }
    
    if (error.errorType === 'validation' && error.severity === 'medium') {
      baseActions.push({
        type: 'alternative_method',
        label: 'Try Different Approach',
        description: 'We\'ll guide you through an alternative method',
        icon: '🔀',
        primary: false
      });
    }
    
    if (error.severity === 'high' || error.severity === 'critical') {
      baseActions.push({
        type: 'contact_support',
        label: deviceCapabilities.canMakePhoneCalls ? 'Call Support' : 'Get Help',
        description: error.weddingContext?.isWeddingDay 
          ? 'Emergency wedding day support' 
          : 'Contact our support team',
        icon: '📞',
        primary: error.severity === 'critical'
      });
    }
    
    return baseActions;
  };

  if (userDismissed && error.severity === 'low') {
    return null; // Allow users to dismiss low-severity errors
  }

  return (
    <div className={`mobile-error-container ${error.severity} ${error.weddingContext?.isWeddingDay ? 'wedding-day' : ''}`}>
      {/* Mobile-optimized error header */}
      <div className="error-header" role="alert" aria-live="assertive">
        <div className="error-icon" style={{ fontSize: '2rem' }}>
          {getErrorIcon(error.errorType, error.severity)}
        </div>
        <div className="error-content">
          <h3 className="error-title">
            {error.severity === 'critical' ? 'Critical Error' : 
             error.weddingContext?.isWeddingDay ? 'Wedding Day Alert' : 
             'Something went wrong'}
          </h3>
          <p className="error-message">
            {getMobileOptimizedMessage()}
          </p>
        </div>
      </div>

      {/* Network status indicator */}
      {!networkState.isOnline && (
        <div className="network-status offline">
          <span className="status-icon">📶</span>
          <span className="status-text">You're offline - we'll sync when you reconnect</span>
        </div>
      )}

      {/* Auto-retry countdown */}
      {error.autoRetryEnabled && retryCountdown > 0 && (
        <div className="auto-retry-countdown">
          <div className="countdown-progress" style={{
            width: `${100 - (retryCountdown / (error.retryAfterSeconds || 1)) * 100}%`
          }} />
          <span className="countdown-text">
            Auto-retry in {retryCountdown} seconds
          </span>
        </div>
      )}

      {/* Recovery actions */}
      <div className="recovery-actions">
        {getRecoveryActions().map((action, index) => (
          <button
            key={action.type}
            className={`recovery-action ${action.primary ? 'primary' : 'secondary'}`}
            disabled={action.disabled || isRecovering}
            onClick={() => {
              switch (action.type) {
                case 'retry':
                  handleManualRetry();
                  break;
                case 'offline_queue':
                  handleOfflineQueue();
                  break;
                case 'contact_support':
                  handleContactSupport();
                  break;
                default:
                  console.log('Action not implemented:', action.type);
              }
            }}
          >
            <span className="action-icon">{action.icon}</span>
            <div className="action-content">
              <span className="action-label">{action.label}</span>
              <span className="action-description">{action.description}</span>
              {action.estimatedTime && (
                <span className="action-time">{action.estimatedTime}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Technical details (expandable) */}
      {error.technicalMessage && (
        <div className="error-details">
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
          >
            {showDetails ? '▼' : '▶'} Technical Details
          </button>
          {showDetails && (
            <div className="details-content">
              <p><strong>Error ID:</strong> {error.errorId}</p>
              <p><strong>Error Code:</strong> {error.errorCode}</p>
              <p><strong>Technical Message:</strong> {error.technicalMessage}</p>
              <p><strong>Network:</strong> {networkState.isOnline ? 'Online' : 'Offline'} 
                 {networkState.connectionType && ` (${networkState.connectionType})`}</p>
              <p><strong>Device:</strong> {deviceCapabilities.platform} - 
                 {deviceCapabilities.isLowMemory ? 'Low Memory' : 'Normal Memory'}</p>
            </div>
          )}
        </div>
      )}

      {/* Dismiss option for low-severity errors */}
      {error.severity === 'low' && (
        <button
          className="dismiss-error"
          onClick={() => setUserDismissed(true)}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// Mobile error boundary with wedding context
export class MobileErrorBoundary extends React.Component<
  { children: React.ReactNode; weddingContext?: any },
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to mobile error tracking
    this.logMobileError(error, errorInfo);
  }

  private async logMobileError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenWidth: screen.width,
        screenHeight: screen.height,
        colorDepth: screen.colorDepth
      };

      const errorReport = {
        errorId: `mobile_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        deviceInfo,
        weddingContext: this.props.weddingContext,
        timestamp: new Date().toISOString(),
        errorBoundary: 'MobileErrorBoundary'
      };

      // Send to error logging endpoint
      await fetch('/api/errors/mobile/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      });

    } catch (loggingError) {
      console.error('Failed to log mobile error:', loggingError);
    }
  }

  render() {
    if (this.state.hasError) {
      const mobileError: MobileErrorContext = {
        errorId: `boundary_error_${Date.now()}`,
        errorCode: 'COMPONENT_ERROR',
        errorType: 'device',
        severity: 'high',
        userMessage: 'The app encountered an unexpected problem.',
        technicalMessage: this.state.error?.message,
        canRetry: true,
        autoRetryEnabled: false,
        recoveryActions: [
          {
            type: 'retry',
            label: 'Reload Page',
            description: 'Refresh the app to try again',
            icon: '🔄',
            primary: true
          }
        ],
        weddingContext: this.props.weddingContext
      };

      return <MobileErrorHandler error={mobileError} />;
    }

    return this.props.children;
  }
}
```

### 2. PWA Service Worker Error Management
```typescript
// /wedsync/public/sw-error-handler.js
// Enhanced service worker error handling for wedding workflows

const ERROR_QUEUE_NAME = 'error_queue_v1';
const RETRY_QUEUE_NAME = 'retry_queue_v1';
const WEDDING_CRITICAL_ENDPOINTS = [
  '/api/weddings/timeline/today',
  '/api/bookings/confirm',
  '/api/payments/process',
  '/api/emergency/contact'
];

// Error types specific to PWA and wedding workflows
const PWA_ERROR_TYPES = {
  NETWORK_FAILED: 'network_failed',
  SYNC_FAILED: 'sync_failed', 
  NOTIFICATION_FAILED: 'notification_failed',
  CACHE_FAILED: 'cache_failed',
  WEDDING_CRITICAL: 'wedding_critical'
};

class PWAErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.retryAttempts = new Map();
    this.initializeErrorHandling();
  }

  initializeErrorHandling() {
    // Handle fetch errors
    self.addEventListener('fetch', event => {
      if (event.request.method === 'POST' || event.request.method === 'PUT') {
        event.respondWith(this.handleMutationRequest(event.request));
      }
    });

    // Handle background sync failures
    self.addEventListener('sync', event => {
      if (event.tag === 'error-retry-sync') {
        event.waitUntil(this.processErrorRetryQueue());
      }
    });

    // Handle push notification errors
    self.addEventListener('push', event => {
      event.waitUntil(this.handlePushNotificationWithErrorHandling(event));
    });

    // Handle message errors from main thread
    self.addEventListener('message', event => {
      if (event.data && event.data.type === 'ERROR_REPORT') {
        this.handleClientSideError(event.data.error);
      }
    });
  }

  async handleMutationRequest(request) {
    try {
      // Attempt the request
      const response = await fetch(request.clone());
      
      if (response.ok) {
        // Success - clear any queued retries for this endpoint
        await this.clearQueuedRetries(request.url);
        return response;
      } else {
        // HTTP error - handle based on status
        return this.handleHTTPError(request, response);
      }
      
    } catch (networkError) {
      // Network failure - queue for retry if appropriate
      return this.handleNetworkError(request, networkError);
    }
  }

  async handleNetworkError(request, error) {
    const isWeddingCritical = this.isWeddingCriticalRequest(request);
    const requestBody = await this.getRequestBody(request);
    
    // Create error context
    const errorContext = {
      errorId: this.generateErrorId(),
      errorType: PWA_ERROR_TYPES.NETWORK_FAILED,
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestBody
      },
      error: {
        message: error.message,
        type: error.constructor.name
      },
      timestamp: Date.now(),
      isWeddingCritical,
      deviceInfo: await this.getDeviceInfo()
    };

    // Queue for background sync retry
    await this.queueForRetry(errorContext);

    // Return appropriate offline response
    return this.createOfflineResponse(request, errorContext);
  }

  async handleHTTPError(request, response) {
    const isWeddingCritical = this.isWeddingCriticalRequest(request);
    const responseText = await response.text();
    
    const errorContext = {
      errorId: this.generateErrorId(),
      errorType: 'http_error',
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries())
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      },
      timestamp: Date.now(),
      isWeddingCritical,
      deviceInfo: await this.getDeviceInfo()
    };

    // Log the error
    await this.logError(errorContext);

    // Determine retry strategy
    const shouldRetry = this.shouldRetryHTTPError(response.status, isWeddingCritical);
    
    if (shouldRetry) {
      await this.queueForRetry(errorContext);
    }

    // Return error response with recovery guidance
    return this.createErrorResponse(request, errorContext, response.status);
  }

  async queueForRetry(errorContext) {
    try {
      // Store in IndexedDB for persistence
      const db = await this.openErrorDatabase();
      const transaction = db.transaction(['retry_queue'], 'readwrite');
      const store = transaction.objectStore('retry_queue');
      
      await store.add({
        ...errorContext,
        retryCount: 0,
        nextRetryAt: Date.now() + this.calculateRetryDelay(0, errorContext.isWeddingCritical),
        maxRetries: errorContext.isWeddingCritical ? 10 : 5
      });

      // Register background sync
      if ('serviceWorker' in self && 'sync' in self.registration) {
        await self.registration.sync.register('error-retry-sync');
      }

    } catch (dbError) {
      console.error('Failed to queue error for retry:', dbError);
    }
  }

  async processErrorRetryQueue() {
    try {
      const db = await this.openErrorDatabase();
      const transaction = db.transaction(['retry_queue'], 'readwrite');
      const store = transaction.objectStore('retry_queue');
      const queuedErrors = await store.getAll();

      for (const queuedError of queuedErrors) {
        if (Date.now() >= queuedError.nextRetryAt) {
          const success = await this.retryQueuedRequest(queuedError);
          
          if (success) {
            // Remove from queue on success
            await store.delete(queuedError.errorId);
            
            // Notify client of successful retry
            await this.notifyClient({
              type: 'RETRY_SUCCESS',
              errorId: queuedError.errorId,
              originalRequest: queuedError.request
            });
            
          } else {
            // Update retry count and next retry time
            queuedError.retryCount++;
            
            if (queuedError.retryCount >= queuedError.maxRetries) {
              // Max retries reached - move to dead letter queue
              await this.moveToDeadLetterQueue(queuedError);
              await store.delete(queuedError.errorId);
            } else {
              // Schedule next retry
              queuedError.nextRetryAt = Date.now() + 
                this.calculateRetryDelay(queuedError.retryCount, queuedError.isWeddingCritical);
              await store.put(queuedError);
            }
          }
        }
      }

    } catch (retryError) {
      console.error('Error processing retry queue:', retryError);
    }
  }

  async retryQueuedRequest(queuedError) {
    try {
      // Reconstruct the request
      const request = new Request(queuedError.request.url, {
        method: queuedError.request.method,
        headers: queuedError.request.headers,
        body: queuedError.request.body
      });

      const response = await fetch(request);
      
      return response.ok;
    } catch (retryNetworkError) {
      return false;
    }
  }

  createOfflineResponse(request, errorContext) {
    const responseBody = {
      offline: true,
      errorId: errorContext.errorId,
      message: errorContext.isWeddingCritical
        ? 'Critical wedding action queued - will complete when connection is restored'
        : 'Action saved - will complete when you\'re back online',
      queuedForRetry: true,
      estimatedRetry: 'When connection restored',
      supportInfo: {
        errorId: errorContext.errorId,
        contactMethod: 'emergency_support',
        available: errorContext.isWeddingCritical
      }
    };

    return new Response(JSON.stringify(responseBody), {
      status: 202, // Accepted
      statusText: 'Queued for Retry',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Queued': 'true',
        'X-Error-ID': errorContext.errorId,
        'X-Wedding-Critical': errorContext.isWeddingCritical.toString()
      }
    });
  }

  createErrorResponse(request, errorContext, httpStatus) {
    const userFriendlyMessage = this.getUserFriendlyMessage(httpStatus, errorContext.isWeddingCritical);
    
    const responseBody = {
      error: {
        id: errorContext.errorId,
        message: userFriendlyMessage,
        code: `HTTP_${httpStatus}`,
        canRetry: this.shouldRetryHTTPError(httpStatus, errorContext.isWeddingCritical),
        isWeddingCritical: errorContext.isWeddingCritical,
        supportInfo: {
          errorId: errorContext.errorId,
          contactMethod: errorContext.isWeddingCritical ? 'emergency_support' : 'regular_support'
        }
      }
    };

    return new Response(JSON.stringify(responseBody), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-ID': errorContext.errorId,
        'X-Wedding-Critical': errorContext.isWeddingCritical.toString()
      }
    });
  }

  isWeddingCriticalRequest(request) {
    return WEDDING_CRITICAL_ENDPOINTS.some(endpoint => 
      request.url.includes(endpoint)
    ) || request.headers.get('X-Wedding-Critical') === 'true';
  }

  calculateRetryDelay(retryCount, isWeddingCritical) {
    const baseDelay = isWeddingCritical ? 10000 : 30000; // 10s vs 30s
    const maxDelay = isWeddingCritical ? 300000 : 1800000; // 5min vs 30min
    
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    return Math.min(exponentialDelay, maxDelay);
  }

  shouldRetryHTTPError(status, isWeddingCritical) {
    // Never retry client errors (4xx) except rate limiting
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
    
    // Always retry server errors (5xx) and rate limiting
    if (status >= 500 || status === 429) {
      return true;
    }
    
    return false;
  }

  getUserFriendlyMessage(httpStatus, isWeddingCritical) {
    const criticalPrefix = isWeddingCritical ? 'Wedding Day Alert: ' : '';
    
    const messages = {
      400: 'Please check your information and try again',
      401: 'Please log in again to continue',
      403: 'You don\'t have permission to perform this action',
      404: 'The requested information could not be found',
      408: 'Request timed out - please try again',
      429: 'Too many requests - please wait a moment and try again',
      500: 'Server error - our team has been notified',
      502: 'Service temporarily unavailable',
      503: 'Service temporarily unavailable - trying again automatically',
      504: 'Request timed out - please try again'
    };

    return criticalPrefix + (messages[httpStatus] || 'An unexpected error occurred');
  }

  async notifyClient(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
      client.postMessage(message);
    });
  }

  generateErrorId() {
    return `pwa_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDeviceInfo() {
    return {
      userAgent: self.navigator.userAgent,
      platform: self.navigator.platform || 'unknown',
      language: self.navigator.language,
      onLine: self.navigator.onLine,
      serviceWorkerSupported: true,
      timestamp: Date.now()
    };
  }
}

// Initialize PWA error handler
const pwaErrorHandler = new PWAErrorHandler();
```

### 3. Mobile Network-Aware Error Strategies
```typescript
// /wedsync/src/hooks/useMobileErrorRecovery.ts
import { useState, useCallback, useEffect } from 'react';
import { useNetworkState } from './useNetworkState';

export const useMobileErrorRecovery = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryAttempt[]>([]);
  const networkState = useNetworkState();

  const attemptRecovery = useCallback(async (errorId: string, recoveryType: string) => {
    setIsRecovering(true);
    
    const recoveryAttempt: RecoveryAttempt = {
      errorId,
      recoveryType,
      timestamp: Date.now(),
      networkState: { ...networkState },
      success: false
    };

    try {
      switch (recoveryType) {
        case 'auto_retry':
        case 'manual_retry':
          recoveryAttempt.success = await performRetry(errorId);
          break;
          
        case 'offline_queue':
          recoveryAttempt.success = await queueForOffline(errorId);
          break;
          
        case 'alternative_method':
          recoveryAttempt.success = await useAlternativeMethod(errorId);
          break;
          
        case 'manual_sync':
          recoveryAttempt.success = await performManualSync(errorId);
          break;
          
        default:
          recoveryAttempt.success = false;
          recoveryAttempt.error = 'Unknown recovery type';
      }
      
    } catch (error) {
      recoveryAttempt.success = false;
      recoveryAttempt.error = error.message;
    } finally {
      setRecoveryHistory(prev => [...prev, recoveryAttempt]);
      setIsRecovering(false);
    }
    
    return recoveryAttempt.success;
  }, [networkState]);

  return {
    attemptRecovery,
    isRecovering,
    recoveryHistory
  };
};
```

## IMPLEMENTATION EVIDENCE REQUIRED

### 1. Mobile Error UI/UX Validation
- [ ] Demonstrate touch-friendly error interfaces across iOS and Android devices
- [ ] Show accessibility compliance for error communication (screen readers, voice control)
- [ ] Verify device-specific error messaging and guidance adaptation
- [ ] Test battery and performance impact of error handling components
- [ ] Evidence of error UI responsiveness across different screen sizes
- [ ] Document user experience flows for different error scenarios

### 2. PWA Error Management Testing
- [ ] Verify Service Worker error handling and recovery mechanisms
- [ ] Test offline error queuing and synchronization functionality
- [ ] Show background sync error management and retry strategies
- [ ] Demonstrate push notification error handling and fallbacks
- [ ] Evidence of error persistence across PWA lifecycle events
- [ ] Test PWA installation and update error scenarios

### 3. Network-Aware Error Handling
- [ ] Verify connection quality-based error strategies (2G, 3G, 4G, 5G, WiFi)
- [ ] Test progressive error disclosure based on bandwidth limitations
- [ ] Show smart retry mechanisms optimized for mobile networks
- [ ] Demonstrate graceful degradation for poor connectivity scenarios
- [ ] Evidence of network state change handling and recovery
- [ ] Test error handling during network transitions (WiFi to cellular)

## SUCCESS METRICS

### Technical Metrics
- **Mobile Error Recovery**: >90% successful recovery rate for recoverable errors
- **PWA Offline Functionality**: 100% critical wedding workflows available offline
- **Network Resilience**: <5% error rate during network transitions
- **Error UI Performance**: <100ms error display response time
- **Battery Impact**: <2% additional battery drain from error handling

### Wedding Mobile Experience Metrics
- **Mobile Wedding Workflow Continuity**: 99.9% completion rate despite errors
- **Photo Upload Recovery**: >95% successful recovery for failed uploads
- **Form Submission Resilience**: 100% form data preservation during errors  
- **Real-time Sync Recovery**: <30 second recovery time for sync failures
- **Wedding Day Mobile Reliability**: Zero critical errors on mobile during ceremonies

## SEQUENTIAL THINKING REQUIRED

Use `mcp__sequential-thinking__sequential_thinking` to work through:

1. **Mobile Error UX Design Strategy**
   - Analyze mobile-specific error presentation and interaction patterns
   - Design touch-friendly recovery actions and user guidance
   - Plan accessibility considerations for error communication

2. **PWA Error Resilience Architecture**
   - Design Service Worker error handling and recovery patterns
   - Plan offline error queuing and background synchronization
   - Create PWA-specific error persistence and recovery mechanisms

3. **Network-Aware Error Management**
   - Analyze different network conditions and their error implications
   - Design adaptive error strategies based on connection quality
   - Plan progressive error handling for varying bandwidth scenarios

4. **Mobile Wedding Workflow Protection**
   - Map critical mobile wedding workflows and error points
   - Design error recovery specifically for mobile wedding coordination
   - Plan emergency error handling for wedding day mobile scenarios

Remember: Your mobile error handling is the safety net that ensures couples can manage their weddings seamlessly on their phones. Every error scenario, recovery action, and user interface must work flawlessly across different devices, network conditions, and wedding situations.