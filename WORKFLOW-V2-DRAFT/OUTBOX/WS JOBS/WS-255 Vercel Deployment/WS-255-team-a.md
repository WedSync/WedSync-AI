# WS-255 TEAM A PROMPT: Vercel Deployment - Frontend Components & Admin Dashboard

## 🎯 TEAM A OBJECTIVE
Build the frontend deployment management components and admin interfaces for Vercel deployment monitoring and control. Focus on deployment status visualization, performance metrics display, and emergency rollback controls.

## 📚 CONTEXT - ULTRA CRITICAL WEDDING DEPLOYMENT SCENARIO
**Wedding Day Reality:** A wedding photographer needs to upload 200+ photos during cocktail hour while guests move to reception. Any deployment that breaks the upload system would ruin the wedding coverage workflow. Your admin dashboard must provide instant visibility into deployment health and one-click rollback capability.

## 🔐 EVIDENCE OF REALITY REQUIREMENTS

### 1. FILE EXISTENCE PROOF
Before claiming completion, provide evidence these EXACT files exist:
```bash
# Paste the actual terminal output of these commands:
ls -la /src/components/admin/DeploymentStatus.tsx
ls -la /src/components/admin/DeploymentMetrics.tsx  
ls -la /src/components/admin/RollbackConfirmation.tsx
ls -la /src/hooks/useDeploymentHealth.ts
ls -la /src/types/deployment.ts
```

### 2. TYPESCRIPT COMPILATION PROOF
```bash
# Must show zero TypeScript errors:
npx tsc --noEmit --project tsconfig.json | grep -E "(error|Error)" || echo "✅ No TypeScript errors"
```

### 3. COMPONENT FUNCTIONALITY PROOF
```bash
# Must render without errors in development:
npm run dev
# Test in browser that deployment status component loads without console errors
```

## 🛡️ SECURITY PATTERNS - ADMIN ONLY ACCESS

### withSecureValidation Middleware Pattern
```typescript
// MANDATORY: Use this exact pattern for all admin deployment controls
import { withSecureValidation } from '@/lib/security/secure-validation';

const DeploymentControlAction = withSecureValidation(
  async (formData: FormData) => {
    'use server';
    
    // Verify admin role
    const { user, session } = await getServerSession();
    const userProfile = await getUserProfile(user.id);
    
    if (userProfile?.role !== 'admin') {
      throw new SecurityError('DEPLOYMENT_ADMIN_REQUIRED');
    }
    
    // Double verification for rollback actions
    if (formData.get('action') === 'rollback') {
      const confirmationCode = formData.get('confirmationCode');
      if (confirmationCode !== 'EMERGENCY_ROLLBACK_CONFIRMED') {
        throw new SecurityError('ROLLBACK_CONFIRMATION_REQUIRED');
      }
    }
    
    // Proceed with deployment action...
  },
  {
    rateLimits: { 
      admin_deployment: { requests: 5, windowMs: 60000 } // 5 actions per minute
    },
    auditLog: {
      action: 'DEPLOYMENT_CONTROL',
      riskLevel: 'HIGH'
    }
  }
);
```

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

### Required Navigation Updates
```typescript
// MANDATORY: Update these exact navigation files

// 1. /src/components/layout/AdminSidebar.tsx
const deploymentNavItem = {
  label: 'Deployment',
  icon: CloudArrowUpIcon,
  href: '/admin/deployment',
  badge: deploymentStatus === 'deploying' ? 'Live' : undefined,
  adminOnly: true
};

// 2. /src/components/navigation/AdminTabs.tsx  
<Tab 
  value="deployment" 
  label="Deployment Status"
  icon={<CloudArrowUpIcon className="h-4 w-4" />}
  notification={isDeploying}
/>

// 3. /src/app/(admin)/admin/layout.tsx
// Add deployment status in admin header for instant visibility
```

## 💻 UI TECHNOLOGY STACK REQUIREMENTS

### MANDATORY: Use ONLY These UI Libraries
```typescript
// ✅ ALLOWED - Untitled UI Components:
import { Button, Card, Badge, Progress, Dialog, AlertDialog } from '@untitledui/react';

// ✅ ALLOWED - Magic UI Components:
import { AnimatedNumber, GradientButton, SparkleText } from '@magic-ui/react';

// ❌ FORBIDDEN - NO other UI libraries allowed:
// ❌ No Chakra UI, Material-UI, Ant Design, etc.
// ❌ No custom UI component libraries
// ❌ No component libraries not listed above

// 🎨 STYLING: Tailwind CSS ONLY
className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
```

## 🎯 DETAILED IMPLEMENTATION REQUIREMENTS

### Core Component: DeploymentStatus Dashboard
```typescript
// /src/components/admin/DeploymentStatus.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Badge, Progress } from '@untitledui/react';
import { AnimatedNumber, SparkleText } from '@magic-ui/react';
import { CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useDeploymentHealth } from '@/hooks/useDeploymentHealth';
import { RollbackConfirmation } from './RollbackConfirmation';

interface DeploymentStatusProps {
  showDetails?: boolean;
  region?: string;
}

export function DeploymentStatus({ showDetails = true, region = 'global' }: DeploymentStatusProps) {
  const {
    currentDeployment,
    healthStatus,
    isLoading,
    performanceMetrics,
    rollbackDeployment
  } = useDeploymentHealth();

  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'building': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Live & Healthy';
      case 'building': return 'Deploying...';
      case 'error': return 'Deployment Failed';
      default: return 'Unknown Status';
    }
  };

  const handleEmergencyRollback = async () => {
    if (!currentDeployment?.previousDeploymentId) return;
    
    setIsRollingBack(true);
    try {
      await rollbackDeployment(currentDeployment.previousDeploymentId);
      // Success notification handled by hook
    } catch (error) {
      console.error('Rollback failed:', error);
    } finally {
      setIsRollingBack(false);
      setShowRollbackDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="p-6 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentDeployment?.state || 'unknown')}`} />
            <h3 className="text-lg font-semibold text-gray-900">
              <SparkleText text={getStatusText(currentDeployment?.state || 'unknown')} />
            </h3>
          </div>
          
          <div className="flex space-x-2">
            <Badge variant={healthStatus?.success ? 'success' : 'destructive'}>
              {healthStatus?.success ? 'Healthy' : 'Unhealthy'}
            </Badge>
            
            {currentDeployment?.state === 'error' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRollbackDialog(true)}
                className="animate-pulse"
              >
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Emergency Rollback
              </Button>
            )}
          </div>
        </div>

        {/* Deployment Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Deployment ID</p>
            <p className="font-mono text-sm truncate">{currentDeployment?.id || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-mono text-sm">{currentDeployment?.version || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Region</p>
            <p className="text-sm capitalize">{region}</p>
          </div>
        </div>

        {/* Build Progress (if building) */}
        {currentDeployment?.state === 'building' && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Build Progress</p>
              <p className="text-sm text-gray-500">Estimated: 3-5 minutes</p>
            </div>
            <Progress 
              value={75} // This would come from actual build API
              className="h-2"
            />
          </div>
        )}
      </Card>

      {/* Performance Metrics */}
      {showDetails && performanceMetrics && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-900">Performance Metrics</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                <AnimatedNumber value={performanceMetrics.buildTime} />s
              </div>
              <p className="text-sm text-gray-500">Build Time</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                <AnimatedNumber value={performanceMetrics.coldStartTime} />ms
              </div>
              <p className="text-sm text-gray-500">Cold Start</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                <AnimatedNumber value={performanceMetrics.memoryUsage} />MB
              </div>
              <p className="text-sm text-gray-500">Memory Usage</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 mb-1">
                <AnimatedNumber value={performanceMetrics.responseTime || 0} />ms
              </div>
              <p className="text-sm text-gray-500">Avg Response</p>
            </div>
          </div>
        </Card>
      )}

      {/* Service Status */}
      {healthStatus && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-900">Service Health</h4>
          
          <div className="space-y-3">
            {Object.entries(healthStatus.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium capitalize">{service.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-sm ${status === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
                    {status === 'connected' ? 'Connected' : 'Error'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rollback Confirmation Dialog */}
      <RollbackConfirmation
        isOpen={showRollbackDialog}
        onClose={() => setShowRollbackDialog(false)}
        onConfirm={handleEmergencyRollback}
        isLoading={isRollingBack}
        deploymentId={currentDeployment?.id}
      />
    </div>
  );
}
```

### Supporting Hook: useDeploymentHealth
```typescript
// /src/hooks/useDeploymentHealth.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeploymentInfo, DeploymentHealthResponse, PerformanceMetrics } from '@/types/deployment';

export function useDeploymentHealth(pollingInterval = 30000) {
  const [currentDeployment, setCurrentDeployment] = useState<DeploymentInfo | null>(null);
  const [healthStatus, setHealthStatus] = useState<DeploymentHealthResponse | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeploymentHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health/deployment', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const healthData: DeploymentHealthResponse = await response.json();
      setHealthStatus(healthData);
      
      if (healthData.success) {
        setCurrentDeployment({
          id: healthData.data.deploymentId,
          version: healthData.data.version,
          state: 'ready',
          timestamp: healthData.data.timestamp,
          region: healthData.region
        });
        
        setPerformanceMetrics(healthData.data.performance);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch deployment health:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rollbackDeployment = useCallback(async (deploymentId: string) => {
    try {
      const response = await fetch('/api/admin/deployment/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deploymentId,
          confirmationCode: 'EMERGENCY_ROLLBACK_CONFIRMED'
        }),
      });

      if (!response.ok) {
        throw new Error(`Rollback failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Immediately refresh deployment status
      setTimeout(fetchDeploymentHealth, 1000);
      
      return result;
    } catch (err) {
      console.error('Rollback failed:', err);
      throw err;
    }
  }, [fetchDeploymentHealth]);

  // Initial fetch
  useEffect(() => {
    fetchDeploymentHealth();
  }, [fetchDeploymentHealth]);

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(fetchDeploymentHealth, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchDeploymentHealth, pollingInterval]);

  return {
    currentDeployment,
    healthStatus,
    performanceMetrics,
    isLoading,
    error,
    rollbackDeployment,
    refetch: fetchDeploymentHealth
  };
}
```

### Rollback Confirmation Component
```typescript
// /src/components/admin/RollbackConfirmation.tsx
'use client';

import { useState } from 'react';
import { AlertDialog, Button } from '@untitledui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RollbackConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  deploymentId?: string;
}

export function RollbackConfirmation({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  deploymentId
}: RollbackConfirmationProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const requiredText = 'EMERGENCY ROLLBACK';

  const handleConfirm = async () => {
    if (confirmationText !== requiredText) return;
    
    try {
      await onConfirm();
      setConfirmationText(''); // Reset on success
    } catch (error) {
      // Error handling in parent component
      console.error('Rollback confirmation failed:', error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialog.Content className="sm:max-w-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <AlertDialog.Title className="text-lg font-medium text-gray-900">
              Emergency Deployment Rollback
            </AlertDialog.Title>
          </div>
        </div>

        <AlertDialog.Description className="text-sm text-gray-500 mb-4">
          <div className="space-y-3">
            <p>
              <strong>⚠️ CRITICAL WARNING:</strong> This will immediately rollback the live production 
              deployment. All users will be affected instantly.
            </p>
            
            <p>
              <strong>Wedding Day Impact:</strong> Any couples or vendors currently using the system 
              will experience a brief service interruption (10-30 seconds).
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 font-medium">
                Current Deployment: <code className="font-mono text-xs">{deploymentId?.substring(0, 12)}...</code>
              </p>
            </div>

            <p className="font-medium">
              Type "<strong>{requiredText}</strong>" to confirm this emergency action:
            </p>
          </div>
        </AlertDialog.Description>

        <div className="mb-6">
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={requiredText}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <AlertDialog.Footer className="flex space-x-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || confirmationText !== requiredText}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Rolling Back...
              </>
            ) : (
              'Execute Rollback'
            )}
          </Button>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
```

### TypeScript Types
```typescript
// /src/types/deployment.ts
export interface DeploymentInfo {
  id: string;
  version: string;
  state: 'ready' | 'building' | 'error' | 'canceled';
  timestamp: string;
  region: string;
  url?: string;
  creator?: string;
  previousDeploymentId?: string;
}

export interface PerformanceMetrics {
  buildTime: number; // seconds
  coldStartTime: number; // milliseconds
  memoryUsage: number; // MB
  responseTime?: number; // milliseconds
}

export interface ServiceHealth {
  database: 'connected' | 'error';
  redis: 'connected' | 'error';
  external_apis: 'connected' | 'error';
}

export interface DeploymentHealthResponse {
  success: boolean;
  data: {
    version: string;
    deploymentId: string;
    timestamp: string;
    services: ServiceHealth;
    performance: PerformanceMetrics;
  };
  region: string;
}

export interface RollbackRequest {
  deploymentId: string;
  confirmationCode: string;
  reason?: string;
}

export interface DeploymentEvent {
  type: 'deployment.created' | 'deployment.ready' | 'deployment.failed' | 'deployment.canceled';
  data: DeploymentInfo;
  timestamp: string;
}
```

## 🎨 MOBILE-FIRST RESPONSIVE DESIGN

### Touch-Optimized Emergency Controls
```typescript
// Mobile-specific optimizations for deployment controls
const MobileDeploymentControls = () => (
  <div className="fixed bottom-4 right-4 z-50 md:hidden">
    {/* Emergency FAB for mobile */}
    <Button
      size="lg"
      variant="destructive" 
      className="w-16 h-16 rounded-full shadow-2xl animate-pulse touch-manipulation"
      onClick={() => setShowRollbackDialog(true)}
    >
      <ExclamationTriangleIcon className="h-8 w-8" />
    </Button>
  </div>
);

// Touch-friendly status cards
const MobileStatusCard = ({ status, metrics }: MobileStatusCardProps) => (
  <div className="touch-manipulation select-none p-4 rounded-xl bg-white shadow-lg border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`} />
        <span className="font-semibold text-lg">{getStatusText(status)}</span>
      </div>
      <Badge variant={status === 'ready' ? 'success' : 'warning'} className="text-xs">
        {status}
      </Badge>
    </div>
    
    {/* Large touch targets for mobile */}
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="bg-gray-50 rounded-lg p-3 text-center touch-manipulation">
          <div className="text-xl font-bold text-blue-600 mb-1">
            <AnimatedNumber value={value} />
            {key.includes('Time') ? 'ms' : key.includes('Memory') ? 'MB' : ''}
          </div>
          <div className="text-xs text-gray-600 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

## 📱 PWA INTEGRATION
```typescript
// Service worker integration for deployment notifications
const DeploymentNotifications = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Register for deployment status push notifications
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
        });
        
        // Send subscription to server for deployment alerts
        await fetch('/api/admin/deployment/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      });
    }
  }, []);
  
  return null; // This is a side-effect only component
};
```

## ✅ TESTING REQUIREMENTS

### Component Testing
```typescript
// /src/components/admin/__tests__/DeploymentStatus.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeploymentStatus } from '../DeploymentStatus';

// Mock the custom hook
jest.mock('@/hooks/useDeploymentHealth', () => ({
  useDeploymentHealth: () => ({
    currentDeployment: {
      id: 'dep_12345',
      version: 'v1.2.3',
      state: 'ready',
      timestamp: '2025-01-25T10:00:00Z',
      region: 'us-east-1'
    },
    healthStatus: {
      success: true,
      data: {
        services: {
          database: 'connected',
          redis: 'connected',
          external_apis: 'connected'
        }
      }
    },
    performanceMetrics: {
      buildTime: 180,
      coldStartTime: 45,
      memoryUsage: 128
    },
    isLoading: false,
    rollbackDeployment: jest.fn()
  })
}));

describe('DeploymentStatus Component', () => {
  it('displays healthy deployment status', () => {
    render(<DeploymentStatus />);
    
    expect(screen.getByText('Live & Healthy')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('dep_12345')).toBeInTheDocument();
  });

  it('shows emergency rollback button when deployment fails', async () => {
    // Mock failed deployment
    const mockUseDeploymentHealth = require('@/hooks/useDeploymentHealth').useDeploymentHealth;
    mockUseDeploymentHealth.mockReturnValue({
      ...mockUseDeploymentHealth(),
      currentDeployment: { ...mockUseDeploymentHealth().currentDeployment, state: 'error' },
      healthStatus: { ...mockUseDeploymentHealth().healthStatus, success: false }
    });

    render(<DeploymentStatus />);
    
    const rollbackButton = screen.getByText('Emergency Rollback');
    expect(rollbackButton).toBeInTheDocument();
    expect(rollbackButton).toHaveClass('animate-pulse');
  });

  it('opens rollback confirmation dialog', async () => {
    render(<DeploymentStatus />);
    
    const rollbackButton = screen.getByText('Emergency Rollback');
    fireEvent.click(rollbackButton);
    
    await waitFor(() => {
      expect(screen.getByText('Emergency Deployment Rollback')).toBeInTheDocument();
      expect(screen.getByText('EMERGENCY ROLLBACK')).toBeInTheDocument();
    });
  });
});
```

## 🚀 PERFORMANCE REQUIREMENTS
- Component should load within 200ms
- Real-time updates every 30 seconds without blocking UI
- Rollback action must complete within 60 seconds
- Mobile touch targets minimum 48x48px
- Deployment status must be visible on all screen sizes
- Emergency controls always accessible within 2 taps on mobile

## 🔧 TEAM A DELIVERABLES CHECKLIST
- [x] DeploymentStatus main dashboard component
- [x] useDeploymentHealth custom hook with polling
- [x] RollbackConfirmation emergency dialog
- [x] Mobile-optimized emergency controls
- [x] Performance metrics visualization
- [x] Service health status display
- [x] TypeScript types and interfaces
- [x] Comprehensive component tests
- [x] PWA notification integration
- [x] Touch-friendly responsive design
- [x] Admin-only security validation
- [x] Navigation integration updates

**REMEMBER: Wedding Day = ZERO TOLERANCE FOR BUGS. Test everything twice, especially rollback functionality!**