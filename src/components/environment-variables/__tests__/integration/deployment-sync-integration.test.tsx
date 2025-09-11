/**
 * Integration Tests for Deployment Synchronization
 * Tests cross-environment variable synchronization, deployment pipelines, and conflict resolution
 */

import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeploymentSyncDashboard } from '../DeploymentSyncDashboard';

// Mock data for different environments
const mockEnvironmentData = {
  development: [
    {
      id: '1',
      name: 'API_URL',
      value: 'http://localhost:3000/api',
      security_level: 'public',
    },
    {
      id: '2',
      name: 'DATABASE_URL',
      value: 'postgres://localhost:5432/wedsync_dev',
      security_level: 'confidential',
    },
    {
      id: '3',
      name: 'STRIPE_KEY',
      value: 'pk_test_dev123',
      security_level: 'confidential',
    },
  ],
  staging: [
    {
      id: '1',
      name: 'API_URL',
      value: 'https://staging.wedsync.com/api',
      security_level: 'public',
    },
    {
      id: '2',
      name: 'DATABASE_URL',
      value: 'postgres://staging-db:5432/wedsync_staging',
      security_level: 'confidential',
    },
    {
      id: '4',
      name: 'REDIS_URL',
      value: 'redis://staging-redis:6379',
      security_level: 'internal',
    },
  ],
  production: [
    {
      id: '1',
      name: 'API_URL',
      value: 'https://api.wedsync.com',
      security_level: 'public',
    },
    {
      id: '2',
      name: 'DATABASE_URL',
      value: 'postgres://prod-db:5432/wedsync_prod',
      security_level: 'confidential',
    },
    {
      id: '4',
      name: 'REDIS_URL',
      value: 'redis://prod-redis:6379',
      security_level: 'internal',
    },
    {
      id: '5',
      name: 'MONITORING_KEY',
      value: 'mon_prod_key_123',
      security_level: 'confidential',
    },
  ],
};

const mockSupabaseClient = {
  from: jest.fn((table: string) => {
    if (table === 'environment_variables') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn((field: string, value: string) => ({
            order: jest.fn(() => {
              const data =
                mockEnvironmentData[
                  value as keyof typeof mockEnvironmentData
                ] || [];
              return Promise.resolve({ data, error: null });
            }),
          })),
        })),
        insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
        update: jest.fn(() => Promise.resolve({ data: [], error: null })),
        upsert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }

    if (table === 'deployment_jobs') {
      return {
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({
              data: [],
              error: null,
            }),
          ),
        })),
        insert: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                id: 'job-123',
                status: 'pending',
                created_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        ),
      };
    }

    return {
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    };
  }),

  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => Promise.resolve('ok')),
    unsubscribe: jest.fn(() => Promise.resolve('ok')),
  })),

  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'admin@wedsync.com',
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="deployment-sync-wrapper">{children}</div>
);

describe('Deployment Synchronization Integration Tests', () => {
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve('ok')),
      unsubscribe: jest.fn(() => Promise.resolve('ok')),
    };

    mockSupabaseClient.channel.mockReturnValue(mockChannel);
  });

  describe('Environment Comparison and Conflict Detection', () => {
    test('should detect configuration differences between environments', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      // Wait for initial data load
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variables',
        );
      });

      // Should detect that STRIPE_KEY exists in dev but not in staging
      await waitFor(() => {
        expect(screen.getByText(/STRIPE_KEY/)).toBeInTheDocument();
        expect(screen.getByText(/missing.*staging/i)).toBeInTheDocument();
      });

      // Should detect that MONITORING_KEY exists in prod but not in dev/staging
      await waitFor(() => {
        expect(screen.getByText(/MONITORING_KEY/)).toBeInTheDocument();
        expect(
          screen.getByText(/missing.*development|missing.*staging/i),
        ).toBeInTheDocument();
      });
    });

    test('should identify value conflicts between environments', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variables',
        );
      });

      // Should show different values for API_URL across environments
      await waitFor(() => {
        expect(screen.getByText('localhost:3000')).toBeInTheDocument();
        expect(screen.getByText('staging.wedsync.com')).toBeInTheDocument();
        expect(screen.getByText('api.wedsync.com')).toBeInTheDocument();
      });
    });

    test('should categorize conflicts by severity', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variables',
        );
      });

      // Critical: Missing confidential variables in production
      await waitFor(() => {
        expect(screen.getByText(/critical/i)).toBeInTheDocument();
        expect(screen.getByText(/confidential.*missing/i)).toBeInTheDocument();
      });

      // Warning: Value differences in public variables
      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeInTheDocument();
        expect(screen.getByText(/value.*difference/i)).toBeInTheDocument();
      });
    });
  });

  describe('Deployment Job Management', () => {
    test('should create deployment job when sync is initiated', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /sync.*development.*staging/i }),
        ).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', {
        name: /sync.*development.*staging/i,
      });
      await user.click(syncButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('deployment_jobs');
      });

      // Should create deployment job record
      const insertCall = mockSupabaseClient.from('deployment_jobs')
        .insert as jest.Mock;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          source_environment: 'development',
          target_environment: 'staging',
          status: 'pending',
          initiated_by: 'test-user-id',
        }),
      );
    });

    test('should track deployment progress through multiple stages', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const progressCallback = mockChannel.on.mock.calls[0][2];

      // Stage 1: Job started
      act(() => {
        progressCallback({
          eventType: 'INSERT',
          new: {
            id: 'job-123',
            status: 'running',
            stage: 'validation',
            progress: 10,
            source_environment: 'staging',
            target_environment: 'production',
            total_variables: 20,
            processed_variables: 2,
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/validation/i)).toBeInTheDocument();
        expect(screen.getByText(/10%/)).toBeInTheDocument();
      });

      // Stage 2: Sync in progress
      act(() => {
        progressCallback({
          eventType: 'UPDATE',
          new: {
            id: 'job-123',
            status: 'running',
            stage: 'synchronizing',
            progress: 50,
            source_environment: 'staging',
            target_environment: 'production',
            total_variables: 20,
            processed_variables: 10,
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/synchronizing/i)).toBeInTheDocument();
        expect(screen.getByText(/50%/)).toBeInTheDocument();
        expect(screen.getByText(/10.*20/)).toBeInTheDocument();
      });

      // Stage 3: Completion
      act(() => {
        progressCallback({
          eventType: 'UPDATE',
          new: {
            id: 'job-123',
            status: 'completed',
            stage: 'finished',
            progress: 100,
            source_environment: 'staging',
            target_environment: 'production',
            total_variables: 20,
            processed_variables: 20,
            success_count: 18,
            error_count: 2,
            completed_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText(/100%/)).toBeInTheDocument();
        expect(screen.getByText(/18.*success/i)).toBeInTheDocument();
        expect(screen.getByText(/2.*error/i)).toBeInTheDocument();
      });
    });

    test('should handle deployment failures with detailed error reporting', async () => {
      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      const errorCallback = mockChannel.on.mock.calls[0][2];

      act(() => {
        errorCallback({
          eventType: 'UPDATE',
          new: {
            id: 'job-failed',
            status: 'failed',
            stage: 'synchronizing',
            progress: 75,
            source_environment: 'development',
            target_environment: 'production',
            total_variables: 15,
            processed_variables: 11,
            success_count: 8,
            error_count: 3,
            error_details: [
              'Permission denied: Cannot update STRIPE_SECRET_KEY in production',
              'Validation failed: DATABASE_URL format invalid',
              'Timeout: Failed to connect to target environment',
            ],
            failed_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
        expect(screen.getByText(/permission.*denied/i)).toBeInTheDocument();
        expect(screen.getByText(/validation.*failed/i)).toBeInTheDocument();
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      });
    });
  });

  describe('Selective Synchronization', () => {
    test('should allow selection of specific variables for sync', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('API_URL')).toBeInTheDocument();
      });

      // Select specific variables
      const apiUrlCheckbox = screen.getByRole('checkbox', { name: /API_URL/i });
      const databaseCheckbox = screen.getByRole('checkbox', {
        name: /DATABASE_URL/i,
      });

      await user.click(apiUrlCheckbox);
      await user.click(databaseCheckbox);

      const syncSelectedButton = screen.getByRole('button', {
        name: /sync.*selected/i,
      });
      await user.click(syncSelectedButton);

      // Should only sync selected variables
      const insertCall = mockSupabaseClient.from('deployment_jobs')
        .insert as jest.Mock;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          selected_variables: ['API_URL', 'DATABASE_URL'],
          sync_type: 'selective',
        }),
      );
    });

    test('should exclude sensitive variables from automatic sync', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      // Attempt to sync all from dev to prod
      const syncAllButton = screen.getByRole('button', { name: /sync.*all/i });
      await user.click(syncAllButton);

      // Should show warning about sensitive variables
      await waitFor(() => {
        expect(screen.getByText(/warning.*sensitive/i)).toBeInTheDocument();
        expect(screen.getByText(/STRIPE_KEY.*excluded/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', {
        name: /confirm.*sync/i,
      });
      await user.click(confirmButton);

      // Should exclude confidential variables from automatic sync
      const insertCall = mockSupabaseClient.from('deployment_jobs')
        .insert as jest.Mock;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          excluded_variables: expect.arrayContaining(['STRIPE_KEY']),
          sync_type: 'auto_safe',
        }),
      );
    });
  });

  describe('Rollback and Version Control', () => {
    test('should create backup before deployment', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      const syncButton = screen.getByRole('button', {
        name: /sync.*development.*staging/i,
      });
      await user.click(syncButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'deployment_backups',
        );
      });

      const backupInsertCall = mockSupabaseClient.from('deployment_backups')
        .insert as jest.Mock;
      expect(backupInsertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'staging',
          variables_snapshot: expect.any(String),
          created_before_deployment: expect.any(String),
        }),
      );
    });

    test('should enable rollback to previous version', async () => {
      const user = userEvent.setup();

      // Mock deployment history
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: 'backup-1',
                    environment: 'staging',
                    created_at: '2024-01-15T10:30:00Z',
                    variables_count: 15,
                  },
                ],
                error: null,
              }),
            ),
          })),
        })),
      });

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      // Should show rollback options
      await waitFor(() => {
        expect(screen.getByText(/rollback.*available/i)).toBeInTheDocument();
      });

      const rollbackButton = screen.getByRole('button', {
        name: /rollback.*staging/i,
      });
      await user.click(rollbackButton);

      // Should confirm rollback
      const confirmRollback = screen.getByRole('button', {
        name: /confirm.*rollback/i,
      });
      await user.click(confirmRollback);

      // Should create rollback job
      const insertCall = mockSupabaseClient.from('deployment_jobs')
        .insert as jest.Mock;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          job_type: 'rollback',
          target_environment: 'staging',
          backup_id: 'backup-1',
        }),
      );
    });
  });

  describe('Wedding Day Protection Integration', () => {
    test('should prevent sync to production during wedding hours', async () => {
      // Mock Saturday evening (peak wedding time)
      const originalDate = Date;
      const mockDate = new Date('2024-06-15T20:00:00Z'); // Saturday 8 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.UTC = originalDate.UTC;
      global.Date.parse = originalDate.parse;
      global.Date.now = () => mockDate.getTime();

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      const syncToProdButton = screen.getByRole('button', {
        name: /sync.*production/i,
      });

      // Button should be disabled during wedding hours
      expect(syncToProdButton).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByText(/wedding.*day.*protection/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/read.*only.*mode/i)).toBeInTheDocument();
      });

      // Restore original Date
      global.Date = originalDate;
    });

    test('should allow emergency override with proper authentication', async () => {
      // Mock wedding hours
      const originalDate = Date;
      const mockDate = new Date('2024-06-15T19:30:00Z'); // Saturday 7:30 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.UTC = originalDate.UTC;
      global.Date.parse = originalDate.parse;
      global.Date.now = () => mockDate.getTime();

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      // Should show emergency override option
      const emergencyButton = screen.getByRole('button', {
        name: /emergency.*override/i,
      });
      await user.click(emergencyButton);

      // Should require additional authentication
      await waitFor(() => {
        expect(
          screen.getByText(/emergency.*authentication/i),
        ).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/emergency.*password/i);
      await user.type(passwordInput, 'emergency123');

      const confirmOverride = screen.getByRole('button', {
        name: /confirm.*override/i,
      });
      await user.click(confirmOverride);

      // Should log emergency action
      const auditInsertCall = mockSupabaseClient.from('audit_logs')
        .insert as jest.Mock;
      expect(auditInsertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'emergency_override',
          reason: 'Wedding day production deployment',
          user_id: 'test-user-id',
          severity: 'critical',
        }),
      );

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large-scale environment synchronization', async () => {
      // Mock large dataset
      const largeEnvironmentData = Array.from({ length: 500 }, (_, i) => ({
        id: `var-${i}`,
        name: `VARIABLE_${i}`,
        value: `value-${i}`,
        environment: 'development',
        security_level: i % 3 === 0 ? 'confidential' : 'internal',
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: largeEnvironmentData,
                error: null,
              }),
            ),
          })),
        })),
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('VARIABLE_0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle large datasets efficiently (< 2000ms)
      expect(renderTime).toBeLessThan(2000);

      // Should show pagination or virtualization for large lists
      expect(screen.getByText(/500.*variables/i)).toBeInTheDocument();
    });

    test('should batch sync operations for performance', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeploymentSyncDashboard />
        </TestWrapper>,
      );

      const syncButton = screen.getByRole('button', { name: /sync.*all/i });
      await user.click(syncButton);

      const confirmButton = screen.getByRole('button', {
        name: /confirm.*sync/i,
      });
      await user.click(confirmButton);

      // Should create batched sync job
      const insertCall = mockSupabaseClient.from('deployment_jobs')
        .insert as jest.Mock;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_size: expect.any(Number),
          sync_strategy: 'batched',
        }),
      );
    });
  });
});
