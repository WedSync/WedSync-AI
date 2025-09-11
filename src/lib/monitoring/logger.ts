import pino from 'pino';
import { LogtailStream } from '@logtail/pino';

// Create Logtail stream for production logging
const logtailStream = process.env.LOGTAIL_SOURCE_TOKEN
  ? new LogtailStream(process.env.LOGTAIL_SOURCE_TOKEN)
  : null;

// Configure logger based on environment
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(process.env.NODE_ENV === 'production' &&
    logtailStream && {
      streams: [
        {
          level: 'info',
          stream: logtailStream,
        },
      ],
    }),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'wedsync',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  },
});

// Wedding business specific logging functions
export const logWeddingEvent = (
  message: string,
  data?: Record<string, any>,
) => {
  logger.info(
    {
      event_type: 'wedding_business',
      ...data,
    },
    message,
  );
};

export const logClientAction = (
  clientId: string,
  action: string,
  data?: Record<string, any>,
) => {
  logger.info(
    {
      event_type: 'client_action',
      client_id: clientId,
      action,
      ...data,
    },
    `Client ${clientId} performed action: ${action}`,
  );
};

export const logBookingEvent = (
  bookingId: string,
  event: string,
  data?: Record<string, any>,
) => {
  logger.info(
    {
      event_type: 'booking_event',
      booking_id: bookingId,
      booking_event: event,
      ...data,
    },
    `Booking ${bookingId}: ${event}`,
  );
};

export const logContractEvent = (
  contractId: string,
  event: string,
  data?: Record<string, any>,
) => {
  logger.info(
    {
      event_type: 'contract_event',
      contract_id: contractId,
      contract_event: event,
      ...data,
    },
    `Contract ${contractId}: ${event}`,
  );
};

export const logPaymentEvent = (
  amount: number,
  currency: string,
  status: string,
  data?: Record<string, any>,
) => {
  logger.info(
    {
      event_type: 'payment_event',
      amount,
      currency,
      payment_status: status,
      ...data,
    },
    `Payment processed: ${amount} ${currency} - ${status}`,
  );
};

export const logSecurityEvent = (
  event: string,
  userId?: string,
  data?: Record<string, any>,
) => {
  logger.warn(
    {
      event_type: 'security_event',
      security_event: event,
      user_id: userId,
      ...data,
    },
    `Security event: ${event}`,
  );
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(
    {
      event_type: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    },
    error.message,
  );
};

export default logger;
