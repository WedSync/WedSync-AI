/**
 * Sync Status Monitor Tests
 * WS-343 - Team A - Round 1
 *
 * Comprehensive test suite for SyncStatusMonitor component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SyncStatusMonitor } from '@/components/integrations/SyncStatusMonitor';
import type { SyncJob, SyncJobStatus } from '@/types/crm';

// Mock API functions
jest.mock('@/lib/api/crm-sync', () => ({
  getSyncJobs: jest.fn(),
  cancelSyncJob: jest.fn(),
  retrySyncJob: jest.fn(),
  getSyncJobLogs: jest.fn(),
}));

// Mock components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress-bar" data-value={value} className={className}>
      {value}%
    </div>
  ),
}));

// Mock data
const mockRunningJob: SyncJob = {
  id: 'job-1',
  integration_id: 'integration-1',
  job_type: 'incremental_sync',
  status: 'running',
  started_at: '2024-01-15T10:00:00Z',
  progress: {
    total_records: 1000,
    processed_records: 650,
    failed_records: 5,
    current_operation: 'Importing client contacts',
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

const mockCompletedJob: SyncJob = {
  id: 'job-2',
  integration_id: 'integration-1',
  job_type: 'full_sync',
  status: 'completed',
  started_at: '2024-01-15T09:00:00Z',
  completed_at: '2024-01-15T09:45:00Z',
  duration_seconds: 2700,
  progress: {
    total_records: 500,
    processed_records: 500,
    failed_records: 0,
    current_operation: 'Sync completed',
  },
  stats: {
    clients_imported: 450,
    bookings_imported: 50,
    errors_count: 0,
  },
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T09:45:00Z',
};

const mockFailedJob: SyncJob = {
  id: 'job-3',
  integration_id: 'integration-2',
  job_type: 'incremental_sync',
  status: 'failed',
  started_at: '2024-01-15T08:00:00Z',
  completed_at: '2024-01-15T08:15:00Z',
  duration_seconds: 900,
  progress: {
    total_records: 200,
    processed_records: 120,
    failed_records: 80,
    current_operation: 'Failed during client import',
  },
  error_details: {
    message: 'Authentication failed',
    error_code: 'AUTH_ERROR',
    timestamp: '2024-01-15T08:15:00Z',
  },
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-01-15T08:15:00Z',
};

const mockJobs = [mockRunningJob, mockCompletedJob, mockFailedJob];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderMonitor = (props = {}) => {
  const queryClient = createQueryClient();
  const defaultProps = {
    organizationId: 'org-1',
    integrationId: undefined,
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <SyncStatusMonitor {...defaultProps} />
    </QueryClientProvider>,
  );
};

describe('SyncStatusMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    require('@/lib/api/crm-sync').getSyncJobs.mockResolvedValue(mockJobs);
  });

  describe('Initial Rendering', () => {
    it('renders monitor header correctly', async () => {
      renderMonitor();

      expect(screen.getByText('Sync Status Monitor')).toBeInTheDocument();
      expect(
        screen.getByText('Monitor your CRM synchronization jobs in real-time'),
      ).toBeInTheDocument();
    });

    it('renders filter controls', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('All Jobs')).toBeInTheDocument();
        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('renders refresh and clear buttons', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(screen.getByText('Clear Completed')).toBeInTheDocument();
      });
    });

    it('shows job count statistics', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('3 jobs')).toBeInTheDocument(); // Total jobs
        expect(screen.getByText('1 running')).toBeInTheDocument();
        expect(screen.getByText('1 completed')).toBeInTheDocument();
        expect(screen.getByText('1 failed')).toBeInTheDocument();
      });
    });
  });

  describe('Job List Display', () => {
    it('renders all jobs initially', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(
          screen.getByText('Importing client contacts'),
        ).toBeInTheDocument(); // Running job
        expect(screen.getByText('Sync completed')).toBeInTheDocument(); // Completed job
        expect(
          screen.getByText('Failed during client import'),
        ).toBeInTheDocument(); // Failed job
      });
    });

    it('displays job types correctly', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Incremental Sync')).toBeInTheDocument();
        expect(screen.getByText('Full Sync')).toBeInTheDocument();
      });
    });

    it('shows correct status badges', async () => {
      renderMonitor();

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        expect(badges).toHaveLength(3);

        const runningBadge = badges.find(
          (badge) => badge.textContent === 'Running',
        );
        expect(runningBadge).toHaveAttribute('data-variant', 'default');

        const completedBadge = badges.find(
          (badge) => badge.textContent === 'Completed',
        );
        expect(completedBadge).toHaveAttribute('data-variant', 'success');

        const failedBadge = badges.find(
          (badge) => badge.textContent === 'Failed',
        );
        expect(failedBadge).toHaveAttribute('data-variant', 'destructive');
      });
    });

    it('displays progress bars for running jobs', async () => {
      renderMonitor();

      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveAttribute('data-value', '65'); // 650/1000 = 65%
      });
    });

    it('shows job duration for completed jobs', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('45m 0s')).toBeInTheDocument(); // 2700 seconds = 45 minutes
      });
    });

    it('displays error details for failed jobs', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
        expect(screen.getByText('AUTH_ERROR')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('filters jobs by status', async () => {
      const user = userEvent.setup();
      renderMonitor();

      await waitFor(() => {
        expect(screen.getAllByTestId('badge')).toHaveLength(3); // All jobs initially
      });

      // Filter by Running
      await user.click(screen.getByText('Running'));

      await waitFor(() => {
        expect(screen.getAllByTestId('badge')).toHaveLength(1);
        expect(
          screen.getByText('Importing client contacts'),
        ).toBeInTheDocument();
      });
    });

    it('filters jobs by completed status', async () => {
      const user = userEvent.setup();
      renderMonitor();

      await user.click(screen.getByText('Completed'));

      await waitFor(() => {
        expect(screen.getAllByTestId('badge')).toHaveLength(1);
        expect(screen.getByText('Sync completed')).toBeInTheDocument();
      });
    });

    it('filters jobs by failed status', async () => {
      const user = userEvent.setup();
      renderMonitor();

      await user.click(screen.getByText('Failed'));

      await waitFor(() => {
        expect(screen.getAllByTestId('badge')).toHaveLength(1);
        expect(
          screen.getByText('Failed during client import'),
        ).toBeInTheDocument();
      });
    });

    it('returns to all jobs when All Jobs is clicked', async () => {
      const user = userEvent.setup();
      renderMonitor();

      // Filter first
      await user.click(screen.getByText('Running'));
      await waitFor(() => {
        expect(screen.getAllByTestId('badge')).toHaveLength(1);
      });

      // Return to all
      await user.click(screen.getByText('All Jobs'));
      await waitFor(() => {
        expect(screen.getAllByTestId('badge')).toHaveLength(3);
      });
    });
  });

  describe('Job Actions', () => {
    it('shows cancel button for running jobs', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('shows retry button for failed jobs', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('calls cancel job API when cancel is clicked', async () => {
      const user = userEvent.setup();
      require('@/lib/api/crm-sync').cancelSyncJob.mockResolvedValue({});

      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      expect(require('@/lib/api/crm-sync').cancelSyncJob).toHaveBeenCalledWith(
        'job-1',
      );
    });

    it('calls retry job API when retry is clicked', async () => {
      const user = userEvent.setup();
      require('@/lib/api/crm-sync').retrySyncJob.mockResolvedValue({});

      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Retry'));

      expect(require('@/lib/api/crm-sync').retrySyncJob).toHaveBeenCalledWith(
        'job-3',
      );
    });
  });

  describe('Real-time Updates', () => {
    it('auto-refreshes data every 5 seconds for running jobs', async () => {
      jest.useFakeTimers();

      renderMonitor();

      // Initial call
      await waitFor(() => {
        expect(require('@/lib/api/crm-sync').getSyncJobs).toHaveBeenCalledTimes(
          1,
        );
      });

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(require('@/lib/api/crm-sync').getSyncJobs).toHaveBeenCalledTimes(
          2,
        );
      });

      jest.useRealTimers();
    });

    it('stops auto-refresh when no running jobs', async () => {
      const completedJobs = [mockCompletedJob, mockFailedJob]; // No running jobs
      require('@/lib/api/crm-sync').getSyncJobs.mockResolvedValue(
        completedJobs,
      );

      jest.useFakeTimers();

      renderMonitor();

      // Initial call
      await waitFor(() => {
        expect(require('@/lib/api/crm-sync').getSyncJobs).toHaveBeenCalledTimes(
          1,
        );
      });

      // Fast forward 10 seconds
      jest.advanceTimersByTime(10000);

      // Should not have made additional calls
      expect(require('@/lib/api/crm-sync').getSyncJobs).toHaveBeenCalledTimes(
        1,
      );

      jest.useRealTimers();
    });
  });

  describe('Integration-specific View', () => {
    it('filters jobs for specific integration', async () => {
      renderMonitor({ integrationId: 'integration-1' });

      await waitFor(() => {
        expect(require('@/lib/api/crm-sync').getSyncJobs).toHaveBeenCalledWith({
          organizationId: 'org-1',
          integrationId: 'integration-1',
        });
      });
    });

    it('shows integration-specific header', async () => {
      renderMonitor({ integrationId: 'integration-1' });

      expect(screen.getByText('Integration Sync Status')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no jobs exist', async () => {
      require('@/lib/api/crm-sync').getSyncJobs.mockResolvedValue([]);

      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('No sync jobs yet')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Sync jobs will appear here once you start synchronizing data',
          ),
        ).toBeInTheDocument();
      });
    });

    it('shows filtered empty state', async () => {
      const user = userEvent.setup();
      renderMonitor();

      // Filter by a status that has no jobs (e.g., if we filter by a specific status)
      require('@/lib/api/crm-sync').getSyncJobs.mockResolvedValue([
        mockCompletedJob,
      ]); // Only completed jobs

      await user.click(screen.getByText('Refresh')); // Trigger refresh with new data
      await user.click(screen.getByText('Running')); // Filter by running (none exist)

      await waitFor(() => {
        expect(screen.getByText('No running jobs')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton while fetching data', () => {
      // Mock a pending promise
      require('@/lib/api/crm-sync').getSyncJobs.mockReturnValue(
        new Promise(() => {}),
      );

      renderMonitor();

      // Should show loading skeletons
      expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number));
    });

    it('shows loading state for actions', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      require('@/lib/api/crm-sync').cancelSyncJob.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      expect(screen.getByText('Canceling...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      require('@/lib/api/crm-sync').getSyncJobs.mockRejectedValue(
        new Error('API Error'),
      );

      renderMonitor();

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load sync jobs'),
        ).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('handles action errors', async () => {
      const user = userEvent.setup();
      require('@/lib/api/crm-sync').cancelSyncJob.mockRejectedValue(
        new Error('Cancel failed'),
      );

      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Failed to cancel job')).toBeInTheDocument();
      });
    });
  });

  describe('Job Details Expansion', () => {
    it('expands job details when clicked', async () => {
      const user = userEvent.setup();
      renderMonitor();

      await waitFor(() => {
        expect(
          screen.getByText('Importing client contacts'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('Importing client contacts'));

      await waitFor(() => {
        expect(screen.getByText('Job Details')).toBeInTheDocument();
        expect(screen.getByText('Started:')).toBeInTheDocument();
        expect(screen.getByText('Records:')).toBeInTheDocument();
      });
    });

    it('shows detailed statistics for completed jobs', async () => {
      const user = userEvent.setup();
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Sync completed')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Sync completed'));

      await waitFor(() => {
        expect(screen.getByText('450 clients imported')).toBeInTheDocument();
        expect(screen.getByText('50 bookings imported')).toBeInTheDocument();
        expect(screen.getByText('0 errors')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for status badges', async () => {
      renderMonitor();

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        badges.forEach((badge) => {
          expect(badge).toHaveAttribute(
            'aria-label',
            expect.stringContaining('status'),
          );
        });
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      // Tab through filter buttons
      await user.tab();
      expect(screen.getByText('All Jobs')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Running')).toHaveFocus();
    });

    it('has proper button labels for actions', async () => {
      renderMonitor();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /cancel/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /retry/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      renderMonitor();

      await waitFor(() => {
        // Should render mobile-friendly layout
        expect(screen.getByText('Sync Status Monitor')).toBeInTheDocument();
      });
    });

    it('handles long operation names', async () => {
      const longOperationJob = {
        ...mockRunningJob,
        progress: {
          ...mockRunningJob.progress,
          current_operation:
            'This is a very long operation name that should truncate properly on mobile devices',
        },
      };

      require('@/lib/api/crm-sync').getSyncJobs.mockResolvedValue([
        longOperationJob,
      ]);

      renderMonitor();

      await waitFor(() => {
        expect(
          screen.getByText(longOperationJob.progress.current_operation),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Clear Completed Jobs', () => {
    it('clears completed jobs when button is clicked', async () => {
      const user = userEvent.setup();
      require('@/lib/api/crm-sync').clearCompletedJobs = jest
        .fn()
        .mockResolvedValue({});

      renderMonitor();

      await waitFor(() => {
        expect(screen.getByText('Clear Completed')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Clear Completed'));

      expect(
        require('@/lib/api/crm-sync').clearCompletedJobs,
      ).toHaveBeenCalledWith('org-1');
    });

    it('disables clear button when no completed jobs', async () => {
      const runningJobs = [mockRunningJob, mockFailedJob]; // No completed jobs
      require('@/lib/api/crm-sync').getSyncJobs.mockResolvedValue(runningJobs);

      renderMonitor();

      await waitFor(() => {
        const clearButton = screen.getByText('Clear Completed');
        expect(clearButton).toBeDisabled();
      });
    });
  });
});
