/**
 * Logger utility for application-wide logging
 * Re-exports from the main logging system for convenience
 */

export { Logger, LogLevel, logger } from '../logging/Logger';

// Additional utility functions
export const createLogger = (name: string) => {
  return {
    info: (message: string, data?: any) =>
      console.log(`[${name}] ${message}`, data || ''),
    error: (message: string, error?: any) =>
      console.error(`[${name}] ${message}`, error || ''),
    warn: (message: string, data?: any) =>
      console.warn(`[${name}] ${message}`, data || ''),
    debug: (message: string, data?: any) =>
      console.debug(`[${name}] ${message}`, data || ''),
  };
};
