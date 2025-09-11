/**
 * Integration Tests for Real-time Environment Variables Management
 * Tests WebSocket connections, live updates, and cross-environment synchronization
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createClient } from '@supabase/supabase-js';
import { EnvironmentVariablesManagement } from '../EnvironmentVariablesManagement';
import { DeploymentSyncDashboard } from '../DeploymentSyncDashboard';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          }),
        ),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => Promise.resolve('ok')),
  })),
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: { roles: ['admin'] },
          },
        },
        error: null,
      }),
    ),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock WebSocket for real-time testing
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: string) {
    // Echo back the message for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 50);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Simulate receiving a real-time update
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify(data),
        }),
      );
    }
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('Real-time Integration Tests', () => {
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock channel for Supabase real-time
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve('ok')),
      unsubscribe: jest.fn(() => Promise.resolve('ok')),
    };

    mockSupabaseClient.channel.mockReturnValue(mockChannel);
  });

  describe('Environment Variables Real-time Updates', () => {
    test('should establish real-time connection on mount', async () => {
      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          'environment-variables',
        );
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'environment_variables' },
        expect.any(Function),
      );

      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    test('should handle real-time variable updates', async () => {
      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      // Wait for initial setup
      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Get the callback function passed to the real-time listener
      const updateCallback = mockChannel.on.mock.calls[0][2];

      // Simulate a real-time update
      act(() => {
        updateCallback({
          eventType: 'UPDATE',
          new: {
            id: 'var-1',
            name: 'DATABASE_URL',
            value: 'updated-connection-string',
            environment: 'production',
            security_level: 'confidential',
            updated_at: new Date().toISOString(),
          },
          old: {
            id: 'var-1',
            name: 'DATABASE_URL',
            value: 'old-connection-string',
            environment: 'production',
            security_level: 'confidential',
          },
        });
      });

      // Verify the UI updates in real-time
      await waitFor(() => {
        expect(screen.getByText(/updated/i)).toBeInTheDocument();
      });
    });

    test('should handle real-time variable creation', async () => {
      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const insertCallback = mockChannel.on.mock.calls[0][2];

      act(() => {
        insertCallback({
          eventType: 'INSERT',
          new: {
            id: 'var-new',
            name: 'NEW_API_KEY',
            value: 'sk-new123456789',
            environment: 'staging',
            security_level: 'confidential',
            created_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('NEW_API_KEY')).toBeInTheDocument();
      });
    });

    test('should handle real-time variable deletion', async () => {
      // Mock initial data with a variable
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: 'var-to-delete',
                    name: 'OLD_CONFIG',
                    value: 'some-value',
                    environment: 'development',
                    security_level: 'internal',
                  },
                ],
                error: null,
              }),
            ),
          })),
        })),
        insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
        update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      });

      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('OLD_CONFIG')).toBeInTheDocument();
      });

      const deleteCallback = mockChannel.on.mock.calls[0][2];

      act(() => {
        deleteCallback({
          eventType: 'DELETE',
          old: {
            id: 'var-to-delete',
            name: 'OLD_CONFIG',
            value: 'some-value',
            environment: 'development',
            security_level: 'internal',
          },
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('OLD_CONFIG')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cross-Environment Synchronization', () => {
    test('should sync variable updates across environments', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          'deployment-sync',
        );
      });

      const syncCallback = mockChannel.on.mock.calls[0][2];

      // Simulate deployment sync event
      act(() => {
        syncCallback({
          eventType: 'INSERT',
          new: {
            id: 'sync-job-1',
            source_environment: 'staging',
            target_environment: 'production',
            status: 'syncing',
            variables_count: 15,
            started_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/syncing/i)).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    test('should handle sync completion events', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const syncCallback = mockChannel.on.mock.calls[0][2];

      // Simulate sync completion
      act(() => {
        syncCallback({
          eventType: 'UPDATE',
          new: {
            id: 'sync-job-1',
            source_environment: 'staging',
            target_environment: 'production',
            status: 'completed',
            variables_count: 15,
            completed_at: new Date().toISOString(),
            success_count: 15,
            error_count: 0,
          },
          old: {
            id: 'sync-job-1',
            status: 'syncing',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText(/15.*success/i)).toBeInTheDocument();
      });
    });

    test('should handle sync failures with error details', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const syncCallback = mockChannel.on.mock.calls[0][2];

      act(() => {
        syncCallback({
          eventType: 'UPDATE',
          new: {
            id: 'sync-job-2',
            source_environment: 'development',
            target_environment: 'staging',
            status: 'failed',
            variables_count: 10,
            completed_at: new Date().toISOString(),
            success_count: 7,
            error_count: 3,
            error_details: [
              'Permission denied for STRIPE_SECRET',
              'Invalid format for DATABASE_URL',
              'Missing required field for API_KEY',
            ],
          },
          old: {
            id: 'sync-job-2',
            status: 'syncing',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
        expect(screen.getByText(/3.*error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Security Events', () => {
    test('should display real-time security alerts', async () => {
      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      // Setup security events channel
      const securityChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve('ok')),
      };

      mockSupabaseClient.channel.mockReturnValue(securityChannel);

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          'security-events',
        );
      });

      const securityCallback = securityChannel.on.mock.calls[0][2];

      // Simulate security event
      act(() => {
        securityCallback({
          eventType: 'INSERT',
          new: {
            id: 'security-1',
            event_type: 'unauthorized_access_attempt',
            severity: 'high',
            message: 'Multiple failed attempts to access production variables',
            user_id: 'unknown-user',
            timestamp: new Date().toISOString(),
            metadata: {
              ip_address: '192.168.1.100',
              user_agent: 'curl/7.64.1',
              attempted_variables: ['STRIPE_SECRET_KEY', 'DATABASE_PASSWORD'],
            },
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/unauthorized.*access/i)).toBeInTheDocument();
        expect(screen.getByText(/high/i)).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Day Mode Real-time Protection', () => {
    test('should activate read-only mode via real-time updates', async () => {
      // Mock wedding day detection
      const originalDate = Date;
      const mockDate = new Date('2024-06-15T19:30:00Z'); // Saturday 7:30 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.UTC = originalDate.UTC;
      global.Date.parse = originalDate.parse;
      global.Date.now = () => mockDate.getTime();

      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      // Setup wedding day events channel
      const weddingChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve('ok')),
      };

      mockSupabaseClient.channel.mockReturnValue(weddingChannel);

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          'wedding-day-events',
        );
      });

      const weddingCallback = weddingChannel.on.mock.calls[0][2];

      // Simulate wedding day mode activation
      act(() => {
        weddingCallback({
          eventType: 'INSERT',
          new: {
            id: 'wedding-mode-1',
            mode: 'read_only',
            reason: 'Peak wedding hours detected',
            activated_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + 10 * 60 * 60 * 1000,
            ).toISOString(), // 10 hours
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/read.*only.*mode/i)).toBeInTheDocument();
        expect(screen.getByText(/wedding.*hours/i)).toBeInTheDocument();
      });

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Connection Management', () => {
    test('should handle connection interruptions gracefully', async () => {
      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Simulate connection loss
      act(() => {
        const errorCallback = mockChannel.on.mock.calls.find(
          (call) => call[0] === 'system',
        )?.[2];

        if (errorCallback) {
          errorCallback({ status: 'closed' });
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/connection.*lost/i)).toBeInTheDocument();
      });
    });

    test('should automatically reconnect after connection loss', async () => {
      const mockReconnect = jest.fn();
      mockSupabaseClient.channel.mockReturnValue({
        ...mockChannel,
        subscribe: mockReconnect,
      });

      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      // Initial connection
      await waitFor(() => {
        expect(mockReconnect).toHaveBeenCalledTimes(1);
      });

      // Simulate reconnection after 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should attempt to reconnect
      expect(mockReconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Optimization', () => {
    test('should throttle real-time updates during high frequency changes', async () => {
      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const updateCallback = mockChannel.on.mock.calls[0][2];

      // Simulate rapid fire updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          updateCallback({
            eventType: 'UPDATE',
            new: {
              id: 'var-rapid',
              name: 'RAPID_UPDATE',
              value: `value-${i}`,
              environment: 'development',
              updated_at: new Date().toISOString(),
            },
          });
        }
      });

      // Should only process the latest update
      await waitFor(() => {
        expect(screen.getByText('value-9')).toBeInTheDocument();
      });

      // Previous intermediate values should not appear
      expect(screen.queryByText('value-3')).not.toBeInTheDocument();
      expect(screen.queryByText('value-5')).not.toBeInTheDocument();
    });

    test('should maintain performance with large datasets', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `var-${i}`,
        name: `VARIABLE_${i}`,
        value: `value-${i}`,
        environment:
          i % 4 === 0
            ? 'production'
            : i % 4 === 1
              ? 'staging'
              : i % 4 === 2
                ? 'development'
                : 'wedding-critical',
        security_level:
          i % 3 === 0 ? 'confidential' : i % 3 === 1 ? 'internal' : 'public',
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: largeDataset,
                error: null,
              }),
            ),
          })),
        })),
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <EnvironmentVariablesManagement />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('VARIABLE_0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render large dataset within reasonable time (< 1000ms)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});
