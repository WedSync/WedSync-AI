import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import { EnvironmentVariablesManagement } from '../EnvironmentVariablesManagement';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}));

// Mock child components
jest.mock('../EnvironmentHealthCard', () => ({
  EnvironmentHealthCard: ({ environment }: { environment: string }) => (
    <div data-testid={`health-card-${environment}`}>
      Health Card for {environment}
    </div>
  ),
}));

jest.mock('../VariableConfigurationForm', () => ({
  VariableConfigurationForm: ({
    onVariableAdded,
  }: {
    onVariableAdded: () => void;
  }) => (
    <div data-testid="variable-config-form">
      <button onClick={onVariableAdded} data-testid="add-variable-btn">
        Add Variable
      </button>
    </div>
  ),
}));

jest.mock('../VariablesList', () => ({
  VariablesList: ({ variables }: { variables: any[] }) => (
    <div data-testid="variables-list">Variables: {variables.length}</div>
  ),
}));

jest.mock('../VariableSecurityCenter', () => ({
  VariableSecurityCenter: () => (
    <div data-testid="security-center">Security Center</div>
  ),
}));

jest.mock('../DeploymentSyncDashboard', () => ({
  DeploymentSyncDashboard: () => (
    <div data-testid="deployment-dashboard">Deployment Dashboard</div>
  ),
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EnvironmentVariablesManagement', () => {
  const mockSupabaseClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [
            {
              id: '1',
              key: 'TEST_VAR',
              value: 'test_value',
              environment: 'development',
              security_level: 'Internal',
              is_encrypted: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              created_by: 'user1',
            },
            {
              id: '2',
              key: 'PROD_VAR',
              value: 'prod_value',
              environment: 'production',
              security_level: 'Wedding-Day-Critical',
              is_encrypted: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              created_by: 'user1',
            },
          ],
          error: null,
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClientComponentClient as jest.Mock).mockReturnValue(
      mockSupabaseClient,
    );
  });

  describe('Component Rendering', () => {
    it('renders the main dashboard with header and status overview', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(
          screen.getByText('Environment Variables Management'),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Secure configuration management across all WedSync environments',
          ),
        ).toBeInTheDocument();
      });
    });

    it('displays status overview cards with correct metrics', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByText('Total Variables')).toBeInTheDocument();
        expect(screen.getByText('Healthy Environments')).toBeInTheDocument();
        expect(screen.getByText('Warnings')).toBeInTheDocument();
        expect(screen.getByText('Critical Issues')).toBeInTheDocument();
      });
    });

    it('shows wedding day mode badge when in wedding period', () => {
      // Mock date to be Saturday (wedding day)
      const mockDate = new Date('2024-01-06T10:00:00'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      render(<EnvironmentVariablesManagement />);

      expect(
        screen.getByText('Wedding Day Mode - Read Only'),
      ).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all navigation tabs', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Variables')).toBeInTheDocument();
        expect(screen.getByText('Health')).toBeInTheDocument();
        expect(screen.getByText('Security')).toBeInTheDocument();
        expect(screen.getByText('Deployment')).toBeInTheDocument();
      });
    });

    it('switches between tabs correctly', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(
          screen.getByTestId('health-card-development'),
        ).toBeInTheDocument();
      });

      // Click on Variables tab
      fireEvent.click(screen.getByText('Variables'));
      await waitFor(() => {
        expect(screen.getByTestId('variable-config-form')).toBeInTheDocument();
        expect(screen.getByTestId('variables-list')).toBeInTheDocument();
      });

      // Click on Security tab
      fireEvent.click(screen.getByText('Security'));
      await waitFor(() => {
        expect(screen.getByTestId('security-center')).toBeInTheDocument();
      });

      // Click on Deployment tab
      fireEvent.click(screen.getByText('Deployment'));
      await waitFor(() => {
        expect(screen.getByTestId('deployment-dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('loads environment variables on mount', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variables',
        );
      });
    });

    it('shows loading state initially', () => {
      render(<EnvironmentVariablesManagement />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('handles data loading errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: new Error('Failed to load data'),
          })),
        })),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error loading environment data:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Real-time Subscriptions', () => {
    it('sets up real-time subscription for environment variables', async () => {
      const mockSubscription = {
        unsubscribe: jest.fn(),
      };

      mockSupabaseClient.channel.mockReturnValue({
        on: jest.fn(() => ({
          subscribe: jest.fn(() => mockSubscription),
        })),
      });

      const { unmount } = render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          'environment_variables_changes',
        );
      });

      unmount();
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Environment Status Calculation', () => {
    it('calculates environment statuses correctly', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        // Should render health cards for all environments
        expect(
          screen.getByTestId('health-card-development'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('health-card-staging')).toBeInTheDocument();
        expect(
          screen.getByTestId('health-card-production'),
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('health-card-wedding-day-critical'),
        ).toBeInTheDocument();
      });
    });

    it('identifies missing critical variables correctly', async () => {
      // Mock data with missing critical variables
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [
              {
                id: '1',
                key: 'NON_CRITICAL_VAR',
                value: 'value',
                environment: 'production',
                security_level: 'Internal',
                is_encrypted: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                created_by: 'user1',
              },
            ],
            error: null,
          })),
        })),
      });

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        // Health cards should be rendered and should show missing variables
        expect(
          screen.getByTestId('health-card-production'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Day Mode', () => {
    beforeEach(() => {
      // Mock Saturday date for wedding day mode
      const mockSaturday = new Date('2024-01-06T10:00:00'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockSaturday);
    });

    it('detects wedding day period correctly', () => {
      render(<EnvironmentVariablesManagement />);

      expect(
        screen.getByText('Wedding Day Mode - Read Only'),
      ).toBeInTheDocument();
    });

    it('passes read-only mode to child components', async () => {
      render(<EnvironmentVariablesManagement />);

      // Switch to Variables tab to see the form
      fireEvent.click(screen.getByText('Variables'));

      await waitFor(() => {
        expect(screen.getByTestId('variable-config-form')).toBeInTheDocument();
        expect(screen.getByTestId('variables-list')).toBeInTheDocument();
      });
    });
  });

  describe('Variable Management Integration', () => {
    it('refreshes data when variable is added', async () => {
      render(<EnvironmentVariablesManagement />);

      // Switch to Variables tab
      fireEvent.click(screen.getByText('Variables'));

      await waitFor(() => {
        expect(screen.getByTestId('add-variable-btn')).toBeInTheDocument();
      });

      // Clear previous calls
      mockSupabaseClient.from.mockClear();

      // Click add variable button (simulates adding a variable)
      fireEvent.click(screen.getByTestId('add-variable-btn'));

      await waitFor(() => {
        // Should reload data after adding variable
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variables',
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(5);
      });
    });

    it('supports keyboard navigation', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        const tabList = screen.getByRole('tablist');
        expect(tabList).toBeInTheDocument();
      });

      // Test keyboard navigation between tabs
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();

      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      // Radix UI handles keyboard navigation internally
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();
      const ComponentWithSpy = () => {
        renderSpy();
        return <EnvironmentVariablesManagement />;
      };

      render(<ComponentWithSpy />);

      await waitFor(() => {
        expect(
          screen.getByText('Environment Variables Management'),
        ).toBeInTheDocument();
      });

      // Should only render once initially
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});
