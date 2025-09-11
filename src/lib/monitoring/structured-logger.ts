/**
 * Structured Logging System
 * JSON-formatted logs with context and correlation IDs
 */

// Use Web Crypto API for Edge Runtime compatibility
const randomUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  service?: string;
  environment?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  private static instance: StructuredLogger;
  private defaultContext: LogContext = {};
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | undefined;

  private constructor() {
    this.defaultContext = {
      environment:
        (typeof process !== 'undefined' && process.env?.NODE_ENV) ||
        'development',
      service: 'wedsync-backend',
    };

    // Start buffer flush interval - only in Node.js environment
    if (typeof setInterval !== 'undefined') {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 5000); // Flush every 5 seconds
    }
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  setDefaultContext(context: Partial<LogContext>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  debug(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  info(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  warn(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  error(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const logEntry = this.createLogEntry(
      LogLevel.ERROR,
      message,
      context,
      metadata,
    );

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.writeLog(logEntry);
  }

  fatal(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const logEntry = this.createLogEntry(
      LogLevel.FATAL,
      message,
      context,
      metadata,
    );

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.writeLog(logEntry);

    // For fatal errors, flush immediately
    this.flush();
  }

  // Log with performance metrics
  performance(
    message: string,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const logEntry = this.createLogEntry(
      LogLevel.INFO,
      message,
      context,
      metadata,
    );

    // Only include performance metrics
    logEntry.performance = {
      duration,
    };

    // Add memory and CPU metrics only in Node.js runtime
    if (
      typeof process !== 'undefined' &&
      typeof process.memoryUsage === 'function'
    ) {
      try {
        logEntry.performance.memoryUsage =
          process.memoryUsage().heapUsed / 1024 / 1024; // MB
      } catch (e) {
        // Ignore in Edge Runtime
      }
    }

    if (
      typeof process !== 'undefined' &&
      typeof process.cpuUsage === 'function'
    ) {
      try {
        logEntry.performance.cpuUsage = process.cpuUsage().user / 1000; // ms
      } catch (e) {
        // Ignore in Edge Runtime
      }
    }

    this.writeLog(logEntry);
  }

  // Create a child logger with additional context
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }

  // Create correlation ID for request tracking
  createCorrelationId(): string {
    return randomUUID();
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const logEntry = this.createLogEntry(level, message, context, metadata);
    this.writeLog(logEntry);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.defaultContext,
        ...context,
        correlationId: context?.correlationId || this.createCorrelationId(),
      },
      metadata,
    };
  }

  private writeLog(entry: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(entry);

    // In development, also log to console
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }

    // Flush if buffer is getting large
    if (this.logBuffer.length >= 100) {
      this.flush();
    }
  }

  private logToConsole(entry: LogEntry): void {
    const color = this.getLogColor(entry.level);
    const resetColor = '\x1b[0m';

    const formattedLog = {
      ...entry,
      message: `${color}${entry.message}${resetColor}`,
    };

    console.log(JSON.stringify(formattedLog, null, 2));
  }

  private getLogColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.FATAL:
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m';
    }
  }

  private flush(): void {
    if (this.logBuffer.length === 0) return;

    // In production, send to log aggregation service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLogService(this.logBuffer);
    }

    // Clear buffer
    this.logBuffer = [];
  }

  private async sendToLogService(logs: LogEntry[]): Promise<void> {
    try {
      // Example: Send to CloudWatch, Elasticsearch, or other log service
      if (process.env.CLOUDWATCH_LOG_GROUP) {
        // AWS CloudWatch implementation
        // await cloudwatch.putLogEvents({ ... });
      }

      if (process.env.ELASTICSEARCH_URL) {
        // Elasticsearch implementation
        await fetch(`${process.env.ELASTICSEARCH_URL}/_bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-ndjson' },
          body: logs
            .map(
              (log) =>
                JSON.stringify({ index: { _index: 'wedsync-logs' } }) +
                '\n' +
                JSON.stringify(log) +
                '\n',
            )
            .join(''),
        });
      }
    } catch (error) {
      console.error('Failed to send logs to service:', error);
    }
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

// Child logger with additional context
export class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private additionalContext: LogContext,
  ) {}

  debug(message: string, metadata?: Record<string, any>): void {
    this.parent.debug(message, this.additionalContext, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.parent.info(message, this.additionalContext, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.parent.warn(message, this.additionalContext, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.parent.error(message, error, this.additionalContext, metadata);
  }

  performance(
    message: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    this.parent.performance(
      message,
      duration,
      this.additionalContext,
      metadata,
    );
  }
}

// Global logger instance
export const logger = StructuredLogger.getInstance();

// Express middleware for request logging
export function requestLoggingMiddleware(req: any, res: any, next: any): void {
  const start = Date.now();
  const correlationId = logger.createCorrelationId();

  // Add correlation ID to request
  req.correlationId = correlationId;

  // Log request
  logger.info(
    'Incoming request',
    {
      correlationId,
      requestId: randomUUID(),
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
    },
    {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  );

  // Log response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - start;

    logger.performance(
      'Request completed',
      duration,
      {
        correlationId,
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
      },
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        contentLength: res.get('content-length'),
      },
    );

    originalSend.call(this, data);
  };

  next();
}
