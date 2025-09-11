/**
 * Edge-compatible Structured Logging System
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
  };
  metadata?: Record<string, any>;
}

export class EdgeLogger {
  private static instance: EdgeLogger;
  private defaultContext: LogContext = {};

  private constructor() {
    this.defaultContext = {
      environment: 'edge',
      service: 'wedsync-edge',
    };
  }

  static getInstance(): EdgeLogger {
    if (!EdgeLogger.instance) {
      EdgeLogger.instance = new EdgeLogger();
    }
    return EdgeLogger.instance;
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
  }

  // Log with performance metrics (Edge-compatible)
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

    logEntry.performance = {
      duration,
    };

    this.writeLog(logEntry);
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
    const correlationId =
      context?.correlationId ||
      this.defaultContext.correlationId ||
      randomUUID();

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.defaultContext,
        ...context,
        correlationId,
      },
      metadata,
    };
  }

  private writeLog(entry: LogEntry): void {
    const logMethod = this.getLogMethod(entry.level);

    // Format for readability in development
    if (this.defaultContext.environment === 'development') {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context.correlationId}]`;
      logMethod(`${prefix} ${entry.message}`, entry.metadata || {});

      if (entry.error) {
        console.error('Error details:', entry.error);
      }
    } else {
      // JSON format for production
      logMethod(JSON.stringify(entry));
    }
  }

  private getLogMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

export const logger = EdgeLogger.getInstance();
