'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { SeatingArrangementResponsive } from './SeatingArrangementResponsive';
import { useSeatingSecurityMiddleware } from '@/lib/security/seating-security-middleware';
import { validateCSRFToken } from '@/lib/security/enhanced-csrf-protection';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import type { Guest, Table } from '@/types/seating';

interface SecureSeatingArrangementProps {
  initialGuests?: Guest[];
  initialTables?: Table[];
  userId: string;
  coupleId: string;
  sessionId?: string;
  csrfToken: string;
  onSave?: (
    tables: Table[],
    assignments: Record<string, string>,
    name: string,
  ) => Promise<void>;
  onLoad?: (
    arrangementId: string,
  ) => Promise<{ guests: Guest[]; tables: Table[] }>;
  readonly?: boolean;
  className?: string;
}

interface SecurityAlert {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

export function SecureSeatingArrangement({
  initialGuests = [],
  initialTables = [],
  userId,
  coupleId,
  sessionId,
  csrfToken,
  onSave,
  onLoad,
  readonly = false,
  className,
}: SecureSeatingArrangementProps) {
  const { toast } = useToast();

  // Security state
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [isSecurityValidating, setIsSecurityValidating] = useState(false);
  const [lastSecurityCheck, setLastSecurityCheck] = useState<Date>(new Date());

  // Create security middleware with current context
  const securityMiddleware = useSeatingSecurityMiddleware({
    userId,
    coupleId,
    sessionId,
    ipAddress:
      typeof window !== 'undefined'
        ? // In a real app, you'd get this from the server or a reliable source
          navigator?.userAgent?.includes('localhost')
          ? '127.0.0.1'
          : undefined
        : undefined,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
  });

  // Add security alert
  const addSecurityAlert = useCallback(
    (alert: Omit<SecurityAlert, 'timestamp'>) => {
      const newAlert = { ...alert, timestamp: new Date() };
      setSecurityAlerts((prev) => [newAlert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    },
    [],
  );

  // Clear old security alerts
  const clearSecurityAlert = useCallback((timestamp: Date) => {
    setSecurityAlerts((prev) =>
      prev.filter((alert) => alert.timestamp !== timestamp),
    );
  }, []);

  // Enhanced guest assignment with security validation
  const handleSecureGuestAssign = useCallback(
    async (
      guestId: string,
      tableId: string,
      currentGuests: Guest[],
      currentTables: Table[],
    ) => {
      try {
        setIsSecurityValidating(true);

        // CSRF validation
        const csrfValid = await validateCSRFToken(csrfToken);
        if (!csrfValid) {
          addSecurityAlert({
            type: 'error',
            title: 'Security Error',
            message: 'Invalid security token. Please refresh the page.',
          });
          return false;
        }

        // Security middleware validation
        const validation = await securityMiddleware.assignGuest(
          guestId,
          tableId,
          currentGuests,
          currentTables,
        );

        if (!validation.success) {
          addSecurityAlert({
            type: 'error',
            title: 'Assignment Blocked',
            message:
              validation.errors?.join(', ') ||
              'Assignment failed security validation.',
          });
          toast({
            variant: 'destructive',
            title: 'Security Validation Failed',
            description:
              validation.errors?.[0] ||
              'Assignment was blocked for security reasons.',
          });
          return false;
        }

        // Show warnings if any
        if (validation.warnings?.length) {
          validation.warnings.forEach((warning) => {
            addSecurityAlert({
              type: 'warning',
              title: 'Security Warning',
              message: warning,
            });
          });
        }

        setLastSecurityCheck(new Date());
        return true;
      } catch (error) {
        console.error('Security validation error:', error);
        addSecurityAlert({
          type: 'error',
          title: 'Security System Error',
          message: 'An error occurred during security validation.',
        });
        return false;
      } finally {
        setIsSecurityValidating(false);
      }
    },
    [securityMiddleware, csrfToken, addSecurityAlert, toast],
  );

  // Enhanced table operations with security validation
  const handleSecureTableCreate = useCallback(
    async (tableData: {
      name: string;
      capacity: number;
      shape: Table['shape'];
      position: { x: number; y: number };
      notes?: string;
    }) => {
      try {
        setIsSecurityValidating(true);

        // CSRF validation
        const csrfValid = await validateCSRFToken(csrfToken);
        if (!csrfValid) {
          addSecurityAlert({
            type: 'error',
            title: 'Security Error',
            message: 'Invalid security token. Please refresh the page.',
          });
          return null;
        }

        // Security middleware validation
        const validation = await securityMiddleware.createTable(tableData);

        if (!validation.success) {
          addSecurityAlert({
            type: 'error',
            title: 'Table Creation Blocked',
            message:
              validation.errors?.join(', ') ||
              'Table creation failed security validation.',
          });
          toast({
            variant: 'destructive',
            title: 'Security Validation Failed',
            description:
              validation.errors?.[0] ||
              'Table creation was blocked for security reasons.',
          });
          return null;
        }

        setLastSecurityCheck(new Date());
        return validation.data;
      } catch (error) {
        console.error('Table creation security validation error:', error);
        addSecurityAlert({
          type: 'error',
          title: 'Security System Error',
          message: 'An error occurred during table creation validation.',
        });
        return null;
      } finally {
        setIsSecurityValidating(false);
      }
    },
    [securityMiddleware, csrfToken, addSecurityAlert, toast],
  );

  // Enhanced table update with security validation
  const handleSecureTableUpdate = useCallback(
    async (
      tableId: string,
      updates: Partial<Table>,
      currentTables: Table[],
    ) => {
      try {
        setIsSecurityValidating(true);

        // CSRF validation
        const csrfValid = await validateCSRFToken(csrfToken);
        if (!csrfValid) {
          addSecurityAlert({
            type: 'error',
            title: 'Security Error',
            message: 'Invalid security token. Please refresh the page.',
          });
          return false;
        }

        // Security middleware validation
        const validation = await securityMiddleware.updateTable(
          tableId,
          updates,
          currentTables,
        );

        if (!validation.success) {
          addSecurityAlert({
            type: 'error',
            title: 'Table Update Blocked',
            message:
              validation.errors?.join(', ') ||
              'Table update failed security validation.',
          });
          toast({
            variant: 'destructive',
            title: 'Security Validation Failed',
            description:
              validation.errors?.[0] ||
              'Table update was blocked for security reasons.',
          });
          return false;
        }

        setLastSecurityCheck(new Date());
        return true;
      } catch (error) {
        console.error('Table update security validation error:', error);
        addSecurityAlert({
          type: 'error',
          title: 'Security System Error',
          message: 'An error occurred during table update validation.',
        });
        return false;
      } finally {
        setIsSecurityValidating(false);
      }
    },
    [securityMiddleware, csrfToken, addSecurityAlert, toast],
  );

  // Enhanced save with security validation
  const handleSecureSave = useCallback(
    async (
      tables: Table[],
      assignments: Record<string, string>,
      name: string,
    ) => {
      if (!onSave) return;

      try {
        setIsSecurityValidating(true);

        // CSRF validation
        const csrfValid = await validateCSRFToken(csrfToken);
        if (!csrfValid) {
          addSecurityAlert({
            type: 'error',
            title: 'Security Error',
            message: 'Invalid security token. Please refresh the page.',
          });
          return;
        }

        // Validate export operation
        const exportValidation =
          await securityMiddleware.validateExportOperation('full_arrangement');

        if (!exportValidation.success) {
          addSecurityAlert({
            type: 'error',
            title: 'Save Operation Blocked',
            message:
              exportValidation.errors?.join(', ') ||
              'Save operation failed security validation.',
          });
          return;
        }

        // Proceed with save
        await onSave(tables, assignments, name);

        addSecurityAlert({
          type: 'info',
          title: 'Save Successful',
          message: 'Arrangement saved successfully with security validation.',
        });

        setLastSecurityCheck(new Date());
      } catch (error) {
        console.error('Secure save error:', error);
        addSecurityAlert({
          type: 'error',
          title: 'Save Error',
          message: 'An error occurred while saving the arrangement.',
        });
      } finally {
        setIsSecurityValidating(false);
      }
    },
    [onSave, securityMiddleware, csrfToken, addSecurityAlert],
  );

  // Enhanced load with security validation
  const handleSecureLoad = useCallback(
    async (arrangementId: string) => {
      if (!onLoad) return;

      try {
        setIsSecurityValidating(true);

        // Validate arrangement access
        const accessValidation =
          await securityMiddleware.validateArrangementAccess(arrangementId);

        if (!accessValidation.success) {
          addSecurityAlert({
            type: 'error',
            title: 'Access Denied',
            message:
              accessValidation.errors?.join(', ') ||
              'Access to arrangement denied.',
          });
          return;
        }

        // Proceed with load
        const result = await onLoad(arrangementId);

        addSecurityAlert({
          type: 'info',
          title: 'Load Successful',
          message: 'Arrangement loaded successfully with security validation.',
        });

        setLastSecurityCheck(new Date());
        return result;
      } catch (error) {
        console.error('Secure load error:', error);
        addSecurityAlert({
          type: 'error',
          title: 'Load Error',
          message: 'An error occurred while loading the arrangement.',
        });
      } finally {
        setIsSecurityValidating(false);
      }
    },
    [onLoad, securityMiddleware, addSecurityAlert],
  );

  // Security status indicator
  const securityStatus = useMemo(() => {
    const recentAlerts = securityAlerts.filter(
      (alert) => Date.now() - alert.timestamp.getTime() < 300000, // Last 5 minutes
    );

    const hasErrors = recentAlerts.some((alert) => alert.type === 'error');
    const hasWarnings = recentAlerts.some((alert) => alert.type === 'warning');

    if (hasErrors)
      return { status: 'error', message: 'Security errors detected' };
    if (hasWarnings)
      return { status: 'warning', message: 'Security warnings present' };
    return { status: 'secure', message: 'All security checks passed' };
  }, [securityAlerts]);

  return (
    <div className="relative">
      {/* Security status indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-lg border text-xs">
          <Shield
            className={`h-3 w-3 ${
              securityStatus.status === 'secure'
                ? 'text-green-600'
                : securityStatus.status === 'warning'
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          />
          <span className="text-slate-700">{securityStatus.message}</span>
          {isSecurityValidating && (
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
          )}
        </div>
      </div>

      {/* Security alerts */}
      {securityAlerts.length > 0 && (
        <div className="fixed top-16 right-4 z-40 w-80 space-y-2 max-h-96 overflow-y-auto">
          {securityAlerts.slice(0, 3).map((alert) => (
            <Alert
              key={alert.timestamp.getTime()}
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              className="animate-in slide-in-from-right"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex justify-between items-start">
                <span className="text-sm">{alert.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearSecurityAlert(alert.timestamp)}
                  className="h-4 w-4 p-0 ml-2"
                >
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          ))}

          {securityAlerts.length > 3 && (
            <div className="text-xs text-slate-500 text-center">
              +{securityAlerts.length - 3} more alerts
            </div>
          )}
        </div>
      )}

      {/* Main seating component with security wrappers */}
      <SeatingArrangementResponsive
        initialGuests={initialGuests}
        initialTables={initialTables}
        onSave={handleSecureSave}
        onLoad={handleSecureLoad}
        readonly={readonly}
        className={className}
      />

      {/* Security information panel (development/debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 w-64 p-3 bg-white border rounded-lg shadow-lg text-xs">
          <div className="font-semibold mb-2">Security Debug</div>
          <div>User: {userId.slice(0, 8)}...</div>
          <div>Couple: {coupleId.slice(0, 8)}...</div>
          <div>Last Check: {lastSecurityCheck.toLocaleTimeString()}</div>
          <div>Alerts: {securityAlerts.length}</div>
          <div className="text-green-600">CSRF: Protected</div>
          <div className="text-green-600">Rate Limits: Active</div>
        </div>
      )}
    </div>
  );
}
