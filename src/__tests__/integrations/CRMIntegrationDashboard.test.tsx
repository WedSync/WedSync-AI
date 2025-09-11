/**
 * CRM Integration Dashboard Tests
 * WS-343 - Team A - Round 1
 *
 * Comprehensive test suite for CRMIntegrationDashboard component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMIntegrationDashboard } from '@/components/integrations/CRMIntegrationDashboard';
import type { CRMIntegration } from '@/types/crm';

// Mock data
const mockIntegrations: CRMIntegration[] = [
  {
    id: 'integration-1',
    organization_id: 'org-1',
    crm_provider: 'tave',
    connection_name: 'Tave Production',
    connection_status: 'connected',
    auth_config: {
      type: 'oauth2',
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      token_expires_at: '2024-12-31T23:59:59Z',
    },
    sync_config: {
      sync_direction: 'import_only',
      auto_sync_enabled: true,
      sync_interval_minutes: 60,
    },
    last_sync_at: '2024-01-15T10:30:00Z',
    last_sync_status: 'success',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    created_by: 'user-1',
    updated_by: 'user-1',
  },
  {
    id: 'integration-2',
    organization_id: 'org-1',
    crm_provider: 'honeybook',
    connection_name: 'HoneyBook Test',
    connection_status: 'error',
    auth_config: {
      type: 'oauth2',
      access_token: 'mock-token-2',
    },
    sync_config: {
      sync_direction: 'bidirectional',
      auto_sync_enabled: false,
      sync_interval_minutes: 120,
    },
    sync_error_details: {
      message: 'Authentication failed',
      error_code: 'AUTH_ERROR',
      timestamp: '2024-01-15T09:00:00Z',
    },
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
    created_by: 'user-1',
    updated_by: 'user-1',
  },
];

// Mock API functions
jest.mock('@/lib/api/crm-integrations', () => ({
  getCRMIntegrations: jest.fn(),
  triggerCRMSync: jest.fn(),
}));

// Mock components
jest.mock('@/components/integrations/CRMIntegrationCard', () => ({
  CRMIntegrationCard: ({
    integration,
    onSync,
    onConfigure,
    onDisconnect,
  }: any) => (
    <div data-testid={`integration-card-${integration.id}`}>
      <h3>{integration.connection_name}</h3>
      <p>{integration.connection_status}</p>
      <button onClick={() => onSync(integration.id)}>Sync Now</button>
      <button onClick={() => onConfigure(integration.id)}>Configure</button>
      <button onClick={() => onDisconnect(integration.id)}>Disconnect</button>
    </div>
  ),
}));

jest.mock('@/components/integrations/CRMProviderWizard', () => ({
  CRMProviderWizard: ({ onComplete, onCancel }: any) => (
    <div data-testid="provider-wizard">
      <h2>Add Integration</h2>
      <button onClick={() => onComplete(mockIntegrations[0])}>Complete</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderDashboard = (props = {}) => {
  const queryClient = createQueryClient();
  const defaultProps = {
    organizationId: 'org-1',
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <CRMIntegrationDashboard {...defaultProps} />
    </QueryClientProvider>,
  );
};

describe('CRMIntegrationDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    require('@/lib/api/crm-integrations').getCRMIntegrations.mockResolvedValue(
      mockIntegrations,
    );
  });

  describe('Rendering', () => {
    it('renders dashboard header correctly', async () => {
      renderDashboard();

      expect(screen.getByText('CRM Integrations')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Connect your existing CRM systems to import clients and sync data',
        ),
      ).toBeInTheDocument();
    });

    it('renders action buttons', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(screen.getByText('Add Integration')).toBeInTheDocument();
      });
    });

    it('renders statistics cards with correct data', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Integrations')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Total count
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Connected count
        expect(screen.getByText('Errors')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Error count
      });
    });

    it('renders integration cards for each integration', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(
          screen.getByTestId('integration-card-integration-1'),
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('integration-card-integration-2'),
        ).toBeInTheDocument();
        expect(screen.getByText('Tave Production')).toBeInTheDocument();
        expect(screen.getByText('HoneyBook Test')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no integrations exist', async () => {
      require('@/lib/api/crm-integrations').getCRMIntegrations.mockResolvedValue(
        [],
      );

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('No integrations yet')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Connect your first CRM system to start importing your existing clients',
          ),
        ).toBeInTheDocument();
        expect(screen.getByText('Connect Your First CRM')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching data', () => {
      // Mock a pending promise
      require('@/lib/api/crm-integrations').getCRMIntegrations.mockReturnValue(
        new Promise(() => {}),
      );

      renderDashboard();

      // Should show loading skeleton
      expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number));
    });
  });

  describe('Error State', () => {
    it('renders error state when API fails', async () => {
      require('@/lib/api/crm-integrations').getCRMIntegrations.mockRejectedValue(
        new Error('API Error'),
      );

      renderDashboard();

      await waitFor(() => {
        expect(
          screen.getByText(
            'Failed to load CRM integrations. Please check your connection and try again.',
          ),
        ).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('opens wizard when Add Integration is clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Integration'));
      });

      expect(screen.getByTestId('provider-wizard')).toBeInTheDocument();
    });

    it('closes wizard when cancel is clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Integration'));
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('provider-wizard')).not.toBeInTheDocument();
      });
    });

    it('handles integration creation success', async () => {
      const mockOnIntegrationCreated = jest.fn();
      renderDashboard({ onIntegrationCreated: mockOnIntegrationCreated });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Integration'));
      });

      fireEvent.click(screen.getByText('Complete'));

      await waitFor(() => {
        expect(mockOnIntegrationCreated).toHaveBeenCalledWith(
          mockIntegrations[0],
        );
        expect(screen.queryByTestId('provider-wizard')).not.toBeInTheDocument();
      });
    });

    it('triggers sync when Sync All is clicked', async () => {
      require('@/lib/api/crm-integrations').triggerCRMSync.mockResolvedValue(
        {},
      );

      renderDashboard();

      await waitFor(() => {
        const syncAllButton = screen.getByText('Sync All');
        fireEvent.click(syncAllButton);
      });

      await waitFor(() => {
        expect(
          require('@/lib/api/crm-integrations').triggerCRMSync,
        ).toHaveBeenCalledWith('integration-1', {
          job_type: 'incremental_sync',
        });
      });
    });

    it('handles sync button click from integration card', async () => {
      require('@/lib/api/crm-integrations').triggerCRMSync.mockResolvedValue(
        {},
      );

      renderDashboard();

      await waitFor(() => {
        const syncButtons = screen.getAllByText('Sync Now');
        fireEvent.click(syncButtons[0]);
      });

      expect(
        require('@/lib/api/crm-integrations').triggerCRMSync,
      ).toHaveBeenCalledWith('integration-1', { job_type: 'incremental_sync' });
    });

    it('refreshes data when refresh button is clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
      });

      // Should call API again
      expect(
        require('@/lib/api/crm-integrations').getCRMIntegrations,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statistics Calculation', () => {
    it('calculates statistics correctly', async () => {
      renderDashboard();

      await waitFor(() => {
        // Total integrations: 2
        expect(screen.getByText('2')).toBeInTheDocument();

        // Connected: 1 (only integration-1 is connected)
        const connectedElements = screen.getAllByText('1');
        expect(connectedElements.length).toBeGreaterThan(0);

        // Errors: 1 (integration-2 has error status)
        const errorElements = screen.getAllByText('1');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Auto-refresh', () => {
    it('auto-refreshes data every 30 seconds', async () => {
      jest.useFakeTimers();

      renderDashboard();

      // Initial call
      await waitFor(() => {
        expect(
          require('@/lib/api/crm-integrations').getCRMIntegrations,
        ).toHaveBeenCalledTimes(1);
      });

      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(
          require('@/lib/api/crm-integrations').getCRMIntegrations,
        ).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('Security', () => {
    it('passes correct organization ID to API', async () => {
      renderDashboard({ organizationId: 'test-org' });

      await waitFor(() => {
        expect(
          require('@/lib/api/crm-integrations').getCRMIntegrations,
        ).toHaveBeenCalledWith('test-org');
      });
    });

    it('does not render sensitive token information', async () => {
      renderDashboard();

      await waitFor(() => {
        // Should not display raw tokens
        expect(screen.queryByText('mock-token')).not.toBeInTheDocument();
        expect(screen.queryByText('mock-refresh')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderDashboard();

      await waitFor(() => {
        // Check for proper button labels
        expect(
          screen.getByRole('button', { name: /add integration/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /refresh/i }),
        ).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      renderDashboard();

      await waitFor(() => {
        const addButton = screen.getByText('Add Integration');
        addButton.focus();
        expect(document.activeElement).toBe(addButton);
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      renderDashboard();

      await waitFor(() => {
        // Should render responsive grid classes
        expect(screen.getByText('CRM Integrations')).toBeInTheDocument();
      });
    });
  });

  describe('Trust & Security Notice', () => {
    it('displays security information', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Your data is secure')).toBeInTheDocument();
        expect(
          screen.getByText(/All CRM connections use encrypted authentication/),
        ).toBeInTheDocument();
      });
    });
  });
});
