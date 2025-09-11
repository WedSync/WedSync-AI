/**
 * Rate limiting hook for client-side request throttling
 * Implements rate limiting to prevent abuse and improve UX
 */

import { useState, useCallback, useRef } from 'react';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
}

export interface RateLimitResult {
  isAllowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitState {
  requests: number[];
  blocked: boolean;
  resetTime: number;
}

/**
 * Custom hook for client-side rate limiting
 */
export function useRateLimit(config: RateLimitConfig) {
  const [state, setState] = useState<RateLimitState>({
    requests: [],
    blocked: false,
    resetTime: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const checkRateLimit = useCallback((): RateLimitResult => {
    const now = Date.now();
    const { maxRequests, windowMs, retryAfterMs } = config;

    // Remove expired requests from the sliding window
    const validRequests = stateRef.current.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    // Check if we're currently blocked
    if (stateRef.current.blocked && now < stateRef.current.resetTime) {
      return {
        isAllowed: false,
        remainingRequests: 0,
        resetTime: stateRef.current.resetTime,
        retryAfter: stateRef.current.resetTime - now,
      };
    }

    // Check if we've exceeded the rate limit
    if (validRequests.length >= maxRequests) {
      const resetTime = validRequests[0] + windowMs;
      const newState = {
        requests: validRequests,
        blocked: true,
        resetTime,
      };

      setState(newState);

      return {
        isAllowed: false,
        remainingRequests: 0,
        resetTime,
        retryAfter: retryAfterMs || resetTime - now,
      };
    }

    // Request is allowed
    return {
      isAllowed: true,
      remainingRequests: maxRequests - validRequests.length - 1,
      resetTime: now + windowMs,
    };
  }, [config]);

  const recordRequest = useCallback(() => {
    const now = Date.now();
    const { windowMs } = config;

    // Remove expired requests and add new one
    const validRequests = stateRef.current.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    validRequests.push(now);

    setState((prevState) => ({
      ...prevState,
      requests: validRequests,
      blocked: false,
    }));
  }, [config]);

  const reset = useCallback(() => {
    setState({
      requests: [],
      blocked: false,
      resetTime: 0,
    });
  }, []);

  return {
    checkRateLimit,
    recordRequest,
    reset,
    isBlocked: state.blocked,
    remainingRequests: Math.max(0, config.maxRequests - state.requests.length),
    resetTime: state.resetTime,
  };
}

/**
 * Hook for API request rate limiting with automatic retry
 */
export function useApiRateLimit(endpoint: string, config: RateLimitConfig) {
  const rateLimit = useRateLimit(config);

  const makeRequest = useCallback(
    async <T>(requestFn: () => Promise<T>): Promise<T> => {
      const rateLimitResult = rateLimit.checkRateLimit();

      if (!rateLimitResult.isAllowed) {
        const error = new Error(`Rate limit exceeded for ${endpoint}`);
        (error as any).retryAfter = rateLimitResult.retryAfter;
        (error as any).resetTime = rateLimitResult.resetTime;
        throw error;
      }

      // Record the request attempt
      rateLimit.recordRequest();

      try {
        return await requestFn();
      } catch (error) {
        // If the request failed, we still count it against the rate limit
        // This prevents rapid failed requests from bypassing the limit
        throw error;
      }
    },
    [endpoint, rateLimit],
  );

  return {
    makeRequest,
    ...rateLimit,
  };
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMIT_PRESETS = {
  // Strict rate limiting for sensitive operations
  STRICT: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    retryAfterMs: 60 * 1000, // 1 minute
  },

  // Moderate rate limiting for general API calls
  MODERATE: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    retryAfterMs: 10 * 1000, // 10 seconds
  },

  // Lenient rate limiting for frequent operations
  LENIENT: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    retryAfterMs: 5 * 1000, // 5 seconds
  },

  // Chat/messaging rate limiting
  CHAT: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    retryAfterMs: 2 * 1000, // 2 seconds
  },

  // Search rate limiting
  SEARCH: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    retryAfterMs: 3 * 1000, // 3 seconds
  },

  // File upload rate limiting
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    retryAfterMs: 30 * 1000, // 30 seconds
  },
};
