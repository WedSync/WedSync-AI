'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  RealtimeReportJob,
  WebSocketMessage,
  ReportProgressUpdate,
} from '../types';

export interface WebSocketHookOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  debug?: boolean;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  sendMessage: (message: any) => boolean;
  reconnect: () => void;
  disconnect: () => void;
  lastMessage: WebSocketMessage | null;
  reconnectAttempts: number;
}

export const useWebSocket = (
  options: WebSocketHookOptions,
): WebSocketHookReturn => {
  const {
    url,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
    heartbeatInterval = 30000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    debug = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [currentReconnectAttempts, setCurrentReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (debug) {
        console.log(`[WebSocket] ${message}`, ...args);
      }
    },
    [debug],
  );

  const clearTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: 'ping', timestamp: Date.now() }),
          );
          log('Heartbeat sent');
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval, log]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    log(`Connecting to ${url}...`);
    setConnectionState('connecting');
    setError(null);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        if (!mountedRef.current) return;

        log('Connected successfully');
        setIsConnected(true);
        setConnectionState('connected');
        setError(null);
        setCurrentReconnectAttempts(0);

        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          log('Message received:', message);

          // Handle pong messages for heartbeat
          if (message.type === 'pong') {
            return;
          }

          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          log('Error parsing message:', err);
          console.error('WebSocket message parsing error:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        if (!mountedRef.current) return;

        log('Connection closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        clearTimers();

        onDisconnect?.();

        // Attempt to reconnect if not a clean close and we haven't exceeded attempts
        if (
          event.code !== 1000 &&
          currentReconnectAttempts < reconnectAttempts
        ) {
          const delay =
            reconnectDelay * Math.pow(1.5, currentReconnectAttempts); // Exponential backoff
          log(
            `Attempting reconnect in ${delay}ms (attempt ${currentReconnectAttempts + 1}/${reconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setCurrentReconnectAttempts((prev) => prev + 1);
              connect();
            }
          }, delay);
        } else if (currentReconnectAttempts >= reconnectAttempts) {
          log('Max reconnection attempts reached');
          setError('Connection lost - max reconnection attempts reached');
          setConnectionState('error');
        }
      };

      wsRef.current.onerror = (event) => {
        if (!mountedRef.current) return;

        log('Connection error:', event);
        setError('WebSocket connection error');
        setConnectionState('error');
        onError?.(event);
      };
    } catch (err) {
      log('Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setConnectionState('error');
    }
  }, [
    url,
    reconnectAttempts,
    reconnectDelay,
    currentReconnectAttempts,
    startHeartbeat,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    log,
  ]);

  const sendMessage = useCallback(
    (message: any): boolean => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          const messageString =
            typeof message === 'string' ? message : JSON.stringify(message);
          wsRef.current.send(messageString);
          log('Message sent:', message);
          return true;
        } catch (err) {
          log('Error sending message:', err);
          console.error('WebSocket send error:', err);
          return false;
        }
      } else {
        log('Cannot send message - WebSocket not open');
        return false;
      }
    },
    [log],
  );

  const disconnect = useCallback(() => {
    log('Manually disconnecting...');
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }

    setCurrentReconnectAttempts(0);
  }, [clearTimers, log]);

  const reconnect = useCallback(() => {
    log('Manual reconnect triggered');
    disconnect();
    setCurrentReconnectAttempts(0);

    // Short delay to ensure clean disconnect
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);
  }, [disconnect, connect, log]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [url]); // Only reconnect when URL changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    isConnected,
    connectionState,
    error,
    sendMessage,
    reconnect,
    disconnect,
    lastMessage,
    reconnectAttempts: currentReconnectAttempts,
  };
};

// Specialized hook for report generation WebSocket
export interface ReportWebSocketOptions {
  url: string;
  onProgressUpdate?: (update: ReportProgressUpdate) => void;
  onJobComplete?: (jobId: string, data: any) => void;
  onJobError?: (jobId: string, error: string) => void;
  onJobStatusChange?: (jobId: string, status: string) => void;
  debug?: boolean;
}

export const useReportWebSocket = (options: ReportWebSocketOptions) => {
  const {
    onProgressUpdate,
    onJobComplete,
    onJobError,
    onJobStatusChange,
    ...wsOptions
  } = options;

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'progress':
          onProgressUpdate?.(message.data);
          break;

        case 'job_complete':
          onJobComplete?.(message.data.jobId, message.data.result);
          break;

        case 'job_error':
          onJobError?.(message.data.jobId, message.data.error);
          break;

        case 'job_status_change':
          onJobStatusChange?.(message.data.jobId, message.data.status);
          break;

        case 'notification':
          // Handle general notifications
          console.log('Report notification:', message.data.message);
          break;

        default:
          console.log('Unknown report message type:', message.type);
      }
    },
    [onProgressUpdate, onJobComplete, onJobError, onJobStatusChange],
  );

  const webSocket = useWebSocket({
    ...wsOptions,
    onMessage: handleMessage,
  });

  const startReportGeneration = useCallback(
    (jobId: string, template: any, options?: any) => {
      return webSocket.sendMessage({
        type: 'start_generation',
        data: {
          jobId,
          template,
          options: options || {},
          timestamp: new Date().toISOString(),
        },
      });
    },
    [webSocket],
  );

  const cancelReportGeneration = useCallback(
    (jobId: string) => {
      return webSocket.sendMessage({
        type: 'cancel_generation',
        data: { jobId },
      });
    },
    [webSocket],
  );

  const pauseReportGeneration = useCallback(
    (jobId: string) => {
      return webSocket.sendMessage({
        type: 'pause_generation',
        data: { jobId },
      });
    },
    [webSocket],
  );

  const resumeReportGeneration = useCallback(
    (jobId: string) => {
      return webSocket.sendMessage({
        type: 'resume_generation',
        data: { jobId },
      });
    },
    [webSocket],
  );

  const getJobStatus = useCallback(
    (jobId: string) => {
      return webSocket.sendMessage({
        type: 'get_job_status',
        data: { jobId },
      });
    },
    [webSocket],
  );

  const subscribeToJob = useCallback(
    (jobId: string) => {
      return webSocket.sendMessage({
        type: 'subscribe_job',
        data: { jobId },
      });
    },
    [webSocket],
  );

  const unsubscribeFromJob = useCallback(
    (jobId: string) => {
      return webSocket.sendMessage({
        type: 'unsubscribe_job',
        data: { jobId },
      });
    },
    [webSocket],
  );

  return {
    ...webSocket,
    startReportGeneration,
    cancelReportGeneration,
    pauseReportGeneration,
    resumeReportGeneration,
    getJobStatus,
    subscribeToJob,
    unsubscribeFromJob,
  };
};

export default useWebSocket;
