interface AuditEvent {
  id: string;
  timestamp: Date;
  event_type: string;
  user_id?: string;
  organization_id?: string;
  metadata: Record<string, any>;
  performance_metrics?: {
    duration: number;
    memory_usage: number;
    cpu_usage?: number;
  };
}

class PerformanceAuditLogger {
  private events: AuditEvent[] = [];

  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.events.push(auditEvent);

    // In production, this would persist to database
    console.log('[AUDIT]', auditEvent);
  }

  logPerformance(
    event_type: string,
    duration: number,
    metadata: Record<string, any> = {},
  ): void {
    this.log({
      event_type,
      metadata,
      performance_metrics: {
        duration,
        memory_usage: process.memoryUsage().heapUsed,
      },
    });
  }

  getEvents(filters?: Partial<AuditEvent>): AuditEvent[] {
    if (!filters) return this.events;

    return this.events.filter((event) => {
      return Object.entries(filters).every(
        ([key, value]) => event[key as keyof AuditEvent] === value,
      );
    });
  }
}

export const performanceAuditLogger = new PerformanceAuditLogger();
