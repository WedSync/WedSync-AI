/**
 * CRM Integration Card Tests
 * WS-343 - Team A - Round 1
 *
 * Comprehensive test suite for CRMIntegrationCard component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CRMIntegrationCard } from '@/components/integrations/CRMIntegrationCard';
import type { CRMIntegration } from '@/types/crm';

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

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick} data-testid="dropdown-item">
      {children}
    </div>
  ),
}));

// Mock data - Connected integration
const mockConnectedIntegration: CRMIntegration = {
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
};

// Mock data - Error integration
const mockErrorIntegration: CRMIntegration = {
  id: 'integration-2',
  organization_id: 'org-1',
  crm_provider: 'honeybook',
  connection_name: 'HoneyBook Test',
  connection_status: 'error',
  auth_config: {
    type: 'oauth2',
    access_token: 'expired-token',
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
};

// Mock data - Syncing integration
const mockSyncingIntegration: CRMIntegration = {
  ...mockConnectedIntegration,
  id: 'integration-3',
  connection_status: 'syncing',
  sync_progress: {
    total_records: 1000,
    processed_records: 650,
    current_operation: 'Importing client contacts',
  },
};

const renderCard = (props = {}) => {
  const defaultProps = {
    integration: mockConnectedIntegration,
    onSync: jest.fn(),
    onConfigure: jest.fn(),
    onDisconnect: jest.fn(),
    ...props,
  };

  return render(<CRMIntegrationCard {...defaultProps} />);
};

describe('CRMIntegrationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders integration details correctly', () => {
      renderCard();

      expect(screen.getByText('Tave Production')).toBeInTheDocument();
      expect(screen.getByText('Tave')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveTextContent('Connected');
    });

    it('displays provider icon', () => {
      renderCard();

      expect(screen.getByText('🎨')).toBeInTheDocument(); // Tave icon
    });

    it('shows last sync information for connected integration', () => {
      renderCard();

      expect(screen.getByText('Last synced:')).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('displays sync direction', () => {
      renderCard();

      expect(screen.getByText('Import only')).toBeInTheDocument();
    });

    it('shows auto-sync status', () => {
      renderCard();

      expect(screen.getByText('Auto-sync enabled')).toBeInTheDocument();
    });

    it('displays sync interval', () => {
      renderCard();

      expect(screen.getByText('Every 60 minutes')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows connected status with green badge', () => {
      renderCard({ integration: mockConnectedIntegration });

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Connected');
      expect(badge).toHaveAttribute('data-variant', 'success');
    });

    it('shows error status with red badge', () => {
      renderCard({ integration: mockErrorIntegration });

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Error');
      expect(badge).toHaveAttribute('data-variant', 'destructive');
    });

    it('shows syncing status with blue badge', () => {
      renderCard({ integration: mockSyncingIntegration });

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Syncing');
      expect(badge).toHaveAttribute('data-variant', 'default');
    });

    it('displays sync progress for syncing integration', () => {
      renderCard({ integration: mockSyncingIntegration });

      expect(screen.getByText('65%')).toBeInTheDocument(); // 650/1000 = 65%
      expect(screen.getByText('Importing client contacts')).toBeInTheDocument();
    });

    it('shows error details for failed integration', () => {
      renderCard({ integration: mockErrorIntegration });

      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      expect(screen.getByText('AUTH_ERROR')).toBeInTheDocument();
    });
  });

  describe('Provider Information', () => {
    it('displays correct provider icon for each provider', () => {
      const providers = [
        { provider: 'tave', icon: '🎨' },
        { provider: 'light_blue', icon: '💙' },
        { provider: 'honeybook', icon: '🍯' },
        { provider: 'dubsado', icon: '📋' },
        { provider: 'studio_ninja', icon: '🥷' },
      ];

      providers.forEach(({ provider, icon }) => {
        const integration = {
          ...mockConnectedIntegration,
          crm_provider: provider as any,
        };
        const { unmount } = renderCard({ integration });

        expect(screen.getByText(icon)).toBeInTheDocument();
        unmount();
      });
    });

    it('displays provider name correctly', () => {
      const providers = [
        { provider: 'tave', name: 'Tave' },
        { provider: 'light_blue', name: 'Light Blue' },
        { provider: 'honeybook', name: 'HoneyBook' },
        { provider: 'dubsado', name: 'Dubsado' },
        { provider: 'studio_ninja', name: 'Studio Ninja' },
      ];

      providers.forEach(({ provider, name }) => {
        const integration = {
          ...mockConnectedIntegration,
          crm_provider: provider as any,
        };
        const { unmount } = renderCard({ integration });

        expect(screen.getByText(name)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Action Buttons', () => {
    it('renders sync button for connected integration', () => {
      renderCard();

      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });

    it('disables sync button for syncing integration', () => {
      renderCard({ integration: mockSyncingIntegration });

      const syncButton = screen.getByText('Syncing...');
      expect(syncButton).toBeDisabled();
    });

    it('shows reconnect button for error integration', () => {
      renderCard({ integration: mockErrorIntegration });

      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('renders dropdown menu trigger', () => {
      renderCard();

      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });

    it('shows configure option in dropdown', () => {
      renderCard();

      expect(screen.getByText('Configure')).toBeInTheDocument();
    });

    it('shows disconnect option in dropdown', () => {
      renderCard();

      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onSync when sync button is clicked', async () => {
      const user = userEvent.setup();
      const onSync = jest.fn();

      renderCard({ onSync });

      await user.click(screen.getByText('Sync Now'));

      expect(onSync).toHaveBeenCalledWith('integration-1');
    });

    it('calls onSync when reconnect button is clicked', async () => {
      const user = userEvent.setup();
      const onSync = jest.fn();

      renderCard({ integration: mockErrorIntegration, onSync });

      await user.click(screen.getByText('Reconnect'));

      expect(onSync).toHaveBeenCalledWith('integration-2');
    });

    it('calls onConfigure when configure is clicked', async () => {
      const user = userEvent.setup();
      const onConfigure = jest.fn();

      renderCard({ onConfigure });

      await user.click(screen.getByText('Configure'));

      expect(onConfigure).toHaveBeenCalledWith('integration-1');
    });

    it('calls onDisconnect when disconnect is clicked', async () => {
      const user = userEvent.setup();
      const onDisconnect = jest.fn();

      renderCard({ onDisconnect });

      await user.click(screen.getByText('Disconnect'));

      expect(onDisconnect).toHaveBeenCalledWith('integration-1');
    });

    it('prevents sync when already syncing', async () => {
      const user = userEvent.setup();
      const onSync = jest.fn();

      renderCard({ integration: mockSyncingIntegration, onSync });

      const syncButton = screen.getByText('Syncing...');
      expect(syncButton).toBeDisabled();

      // Try to click disabled button
      await user.click(syncButton);

      expect(onSync).not.toHaveBeenCalled();
    });
  });

  describe('Sync Direction Display', () => {
    it('displays import only correctly', () => {
      const integration = {
        ...mockConnectedIntegration,
        sync_config: {
          ...mockConnectedIntegration.sync_config,
          sync_direction: 'import_only' as const,
        },
      };
      renderCard({ integration });

      expect(screen.getByText('Import only')).toBeInTheDocument();
      expect(screen.getByText('⬇️')).toBeInTheDocument();
    });

    it('displays export only correctly', () => {
      const integration = {
        ...mockConnectedIntegration,
        sync_config: {
          ...mockConnectedIntegration.sync_config,
          sync_direction: 'export_only' as const,
        },
      };
      renderCard({ integration });

      expect(screen.getByText('Export only')).toBeInTheDocument();
      expect(screen.getByText('⬆️')).toBeInTheDocument();
    });

    it('displays bidirectional correctly', () => {
      const integration = {
        ...mockConnectedIntegration,
        sync_config: {
          ...mockConnectedIntegration.sync_config,
          sync_direction: 'bidirectional' as const,
        },
      };
      renderCard({ integration });

      expect(screen.getByText('Bidirectional')).toBeInTheDocument();
      expect(screen.getByText('↕️')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats last sync time correctly', () => {
      const integration = {
        ...mockConnectedIntegration,
        last_sync_at: '2024-01-15T10:30:00Z',
      };

      renderCard({ integration });

      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/10:30 AM/)).toBeInTheDocument();
    });

    it('shows never synced for null last_sync_at', () => {
      const integration = {
        ...mockConnectedIntegration,
        last_sync_at: null,
      };

      renderCard({ integration });

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing sync_error_details gracefully', () => {
      const integration = {
        ...mockErrorIntegration,
        sync_error_details: undefined,
      };

      renderCard({ integration });

      expect(screen.getByText('Unknown error')).toBeInTheDocument();
    });

    it('handles missing sync progress gracefully', () => {
      const integration = {
        ...mockSyncingIntegration,
        sync_progress: undefined,
      };

      renderCard({ integration });

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('handles invalid sync interval', () => {
      const integration = {
        ...mockConnectedIntegration,
        sync_config: {
          ...mockConnectedIntegration.sync_config,
          sync_interval_minutes: 0,
        },
      };

      renderCard({ integration });

      expect(screen.getByText('Manual only')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button labels', () => {
      renderCard();

      expect(
        screen.getByRole('button', { name: /sync now/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /more options/i }),
      ).toBeInTheDocument();
    });

    it('has proper aria labels for status', () => {
      renderCard();

      const statusBadge = screen.getByTestId('badge');
      expect(statusBadge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('status'),
      );
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderCard();

      // Tab to sync button
      await user.tab();
      expect(screen.getByText('Sync Now')).toHaveFocus();

      // Tab to dropdown trigger
      await user.tab();
      expect(
        screen.getByRole('button', { name: /more options/i }),
      ).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      renderCard();

      // Should render with mobile-friendly layout
      expect(screen.getByText('Tave Production')).toBeInTheDocument();
    });

    it('handles long connection names', () => {
      const integration = {
        ...mockConnectedIntegration,
        connection_name:
          'This is a very long connection name that should truncate properly',
      };

      renderCard({ integration });

      expect(screen.getByText(integration.connection_name)).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('applies correct styling for connected state', () => {
      renderCard({ integration: mockConnectedIntegration });

      const card = screen.getByText('Tave Production').closest('.border');
      expect(card).toHaveClass('border-green-200');
    });

    it('applies correct styling for error state', () => {
      renderCard({ integration: mockErrorIntegration });

      const card = screen.getByText('HoneyBook Test').closest('.border');
      expect(card).toHaveClass('border-red-200');
    });

    it('applies correct styling for syncing state', () => {
      renderCard({ integration: mockSyncingIntegration });

      const card = screen.getByText('Tave Production').closest('.border');
      expect(card).toHaveClass('border-blue-200');
    });

    it('shows loading animation for syncing state', () => {
      renderCard({ integration: mockSyncingIntegration });

      expect(screen.getByTestId('sync-progress-bar')).toBeInTheDocument();
    });
  });

  describe('Tooltip Information', () => {
    it('shows provider capabilities in tooltip', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.hover(screen.getByText('Tave'));

      await waitFor(() => {
        expect(
          screen.getByText('Photography studio management'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('OAuth 2.0 authentication'),
        ).toBeInTheDocument();
      });
    });

    it('shows sync configuration in tooltip', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.hover(screen.getByText('Import only'));

      await waitFor(() => {
        expect(
          screen.getByText('Data flows from CRM to WedSync only'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null sync configuration', () => {
      const integration = {
        ...mockConnectedIntegration,
        sync_config: null,
      };

      renderCard({ integration });

      expect(screen.getByText('Not configured')).toBeInTheDocument();
    });

    it('handles empty connection name', () => {
      const integration = {
        ...mockConnectedIntegration,
        connection_name: '',
      };

      renderCard({ integration });

      expect(screen.getByText('Unnamed Connection')).toBeInTheDocument();
    });

    it('handles unknown provider', () => {
      const integration = {
        ...mockConnectedIntegration,
        crm_provider: 'unknown_provider' as any,
      };

      renderCard({ integration });

      expect(screen.getByText('❓')).toBeInTheDocument(); // Unknown provider icon
      expect(screen.getByText('Unknown Provider')).toBeInTheDocument();
    });
  });
});
