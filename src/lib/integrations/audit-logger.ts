// Integration audit logging system for presence tracking
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AuditLogEntry {
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log integration activity for audit trail
 */
export async function logIntegrationActivity(
  userId: string,
  action: string,
  details: Record<string, any>,
): Promise<void> {
  try {
    const supabase = createClientComponentClient();

    const logEntry: AuditLogEntry = {
      userId,
      action,
      details,
      timestamp: new Date(),
    };

    await supabase.from('integration_audit_logs').insert(logEntry);

    console.log(`Integration activity logged: ${action} for user ${userId}`);
  } catch (error) {
    console.error('Failed to log integration activity:', error);
  }
}

/**
 * Log integration errors for monitoring
 */
export async function logIntegrationError(
  userId: string,
  errorType: string,
  error: any,
): Promise<void> {
  try {
    const supabase = createClientComponentClient();

    const logEntry = {
      userId,
      action: `error_${errorType}`,
      details: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    };

    await supabase.from('integration_audit_logs').insert(logEntry);

    console.error(
      `Integration error logged: ${errorType} for user ${userId}`,
      error,
    );
  } catch (logError) {
    console.error('Failed to log integration error:', logError);
  }
}
