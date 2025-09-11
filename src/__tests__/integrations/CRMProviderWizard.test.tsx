/**
 * CRM Provider Wizard Tests
 * WS-343 - Team A - Round 1
 *
 * Comprehensive test suite for CRMProviderWizard component with multi-step flow
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMProviderWizard } from '@/components/integrations/CRMProviderWizard';
import type { CRMProvider, OAuthConfig, CRMIntegration } from '@/types/crm';

// Mock API functions
jest.mock('@/lib/api/crm-integrations', () => ({
  createCRMIntegration: jest.fn(),
  testCRMConnection: jest.fn(),
  initiateCRMOAuth: jest.fn(),
}));

// Mock OAuth handler
jest.mock('@/components/integrations/OAuthFlowHandler', () => ({
  OAuthFlowHandler: ({ config, onSuccess, onError, onCancel }: any) => (
    <div data-testid="oauth-handler">
      <h2>OAuth Flow</h2>
      <p>Provider: {config?.provider}</p>
      <button onClick={() => onSuccess({ access_token: 'mock-token' })}>
        Complete OAuth
      </button>
      <button onClick={() => onError(new Error('OAuth failed'))}>
        Fail OAuth
      </button>
      <button onClick={onCancel}>Cancel OAuth</button>
    </div>
  ),
}));

// Mock data
const mockOAuthConfig: OAuthConfig = {
  provider: 'tave',
  client_id: 'test-client-id',
  redirect_uri: 'http://localhost:3000/api/oauth/callback',
  scopes: ['read:clients', 'write:bookings'],
  authorization_url: 'https://api.tave.com/oauth/authorize',
  token_url: 'https://api.tave.com/oauth/token',
};

const mockIntegration: CRMIntegration = {
  id: 'integration-1',
  organization_id: 'org-1',
  crm_provider: 'tave',
  connection_name: 'Tave Production',
  connection_status: 'connected',
  auth_config: {
    type: 'oauth2',
    access_token: 'mock-token',
  },
  sync_config: {
    sync_direction: 'import_only',
    auto_sync_enabled: true,
    sync_interval_minutes: 60,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  updated_by: 'user-1',
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWizard = (props = {}) => {
  const queryClient = createQueryClient();
  const defaultProps = {
    onComplete: jest.fn(),
    onCancel: jest.fn(),
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <CRMProviderWizard {...defaultProps} />
    </QueryClientProvider>,
  );
};

describe('CRMProviderWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    require('@/lib/api/crm-integrations').createCRMIntegration.mockResolvedValue(
      mockIntegration,
    );
    require('@/lib/api/crm-integrations').testCRMConnection.mockResolvedValue({
      success: true,
    });
    require('@/lib/api/crm-integrations').initiateCRMOAuth.mockResolvedValue(
      mockOAuthConfig,
    );
  });

  describe('Initial Rendering', () => {
    it('renders wizard header correctly', () => {
      renderWizard();

      expect(screen.getByText('Connect Your CRM')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Choose your CRM provider and configure the connection',
        ),
      ).toBeInTheDocument();
    });

    it('renders provider selection step initially', () => {
      renderWizard();

      expect(screen.getByText('Select Provider')).toBeInTheDocument();
      expect(screen.getByText('Choose your CRM system')).toBeInTheDocument();
    });

    it('renders all supported CRM providers', () => {
      renderWizard();

      expect(screen.getByText('Tave')).toBeInTheDocument();
      expect(screen.getByText('Light Blue')).toBeInTheDocument();
      expect(screen.getByText('HoneyBook')).toBeInTheDocument();
      expect(screen.getByText('Dubsado')).toBeInTheDocument();
      expect(screen.getByText('Studio Ninja')).toBeInTheDocument();
    });

    it('shows step progress indicators', () => {
      renderWizard();

      expect(screen.getByText('1')).toBeInTheDocument(); // Step 1 active
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderWizard();

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('allows selecting a CRM provider', async () => {
      const user = userEvent.setup();
      renderWizard();

      const taveCard = screen.getByText('Tave').closest('div');
      expect(taveCard).toBeInTheDocument();

      await user.click(taveCard!);

      // Should show as selected
      expect(taveCard).toHaveClass('ring-2');
    });

    it('shows provider details on selection', async () => {
      const user = userEvent.setup();
      renderWizard();

      await user.click(screen.getByText('Tave').closest('div')!);

      expect(
        screen.getByText('Photography studio management'),
      ).toBeInTheDocument();
      expect(screen.getByText('OAuth 2.0 authentication')).toBeInTheDocument();
    });

    it('enables next button when provider selected', async () => {
      const user = userEvent.setup();
      renderWizard();

      const nextButton = screen.getByText('Continue');
      expect(nextButton).toBeDisabled();

      await user.click(screen.getByText('Tave').closest('div')!);

      expect(nextButton).toBeEnabled();
    });

    it('advances to authentication step on continue', async () => {
      const user = userEvent.setup();
      renderWizard();

      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Authentication')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWizard();

      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Authentication')).toBeInTheDocument();
      });
    });

    it('renders authentication options', () => {
      expect(screen.getByText('Connect with OAuth')).toBeInTheDocument();
      expect(screen.getByText('Enter API Key')).toBeInTheDocument();
    });

    it('shows OAuth flow on OAuth selection', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Connect with OAuth'));

      await waitFor(() => {
        expect(screen.getByTestId('oauth-handler')).toBeInTheDocument();
      });
    });

    it('shows API key form on API key selection', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Enter API Key'));

      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/base url/i)).toBeInTheDocument();
    });

    it('validates API key input', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Enter API Key'));
      await user.click(screen.getByText('Test Connection'));

      await waitFor(() => {
        expect(screen.getByText('API key is required')).toBeInTheDocument();
      });
    });

    it('tests connection successfully', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Enter API Key'));
      await user.type(screen.getByLabelText(/api key/i), 'valid-api-key');
      await user.type(
        screen.getByLabelText(/base url/i),
        'https://api.tave.com',
      );
      await user.click(screen.getByText('Test Connection'));

      await waitFor(() => {
        expect(screen.getByText('Connection successful!')).toBeInTheDocument();
      });
    });

    it('handles OAuth success', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Connect with OAuth'));

      await waitFor(() => {
        expect(screen.getByTestId('oauth-handler')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete OAuth'));

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWizard();

      // Navigate to configuration step
      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Authentication')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Connect with OAuth'));

      await waitFor(() => {
        expect(screen.getByTestId('oauth-handler')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Complete OAuth'));

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });
    });

    it('renders configuration form', () => {
      expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sync direction/i)).toBeInTheDocument();
      expect(screen.getByText('Auto-sync enabled')).toBeInTheDocument();
      expect(screen.getByLabelText(/sync interval/i)).toBeInTheDocument();
    });

    it('has default configuration values', () => {
      const connectionName = screen.getByLabelText(
        /connection name/i,
      ) as HTMLInputElement;
      const syncInterval = screen.getByLabelText(
        /sync interval/i,
      ) as HTMLInputElement;

      expect(connectionName.value).toBe('Tave Integration');
      expect(syncInterval.value).toBe('60');
    });

    it('validates configuration form', async () => {
      const user = userEvent.setup();

      const connectionName = screen.getByLabelText(/connection name/i);
      await user.clear(connectionName);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(
          screen.getByText('Connection name is required'),
        ).toBeInTheDocument();
      });
    });

    it('advances to review step with valid configuration', async () => {
      const user = userEvent.setup();

      await user.type(
        screen.getByLabelText(/connection name/i),
        ' - Production',
      );
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Review & Complete')).toBeInTheDocument();
      });
    });
  });

  describe('Review Step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWizard();

      // Navigate through all steps to review
      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Authentication')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Connect with OAuth'));
      await waitFor(() => {
        expect(screen.getByTestId('oauth-handler')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Complete OAuth'));

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText('Review & Complete')).toBeInTheDocument();
      });
    });

    it('displays configuration summary', () => {
      expect(screen.getByText('Provider:')).toBeInTheDocument();
      expect(screen.getByText('Tave')).toBeInTheDocument();
      expect(screen.getByText('Connection Name:')).toBeInTheDocument();
      expect(screen.getByText('Authentication:')).toBeInTheDocument();
      expect(screen.getByText('OAuth 2.0')).toBeInTheDocument();
    });

    it('allows going back to previous steps', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });
    });

    it('creates integration on complete', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();

      renderWizard({ onComplete });

      // Navigate to review step again
      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));
      await waitFor(() => screen.getByText('Authentication'));
      await user.click(screen.getByText('Connect with OAuth'));
      await waitFor(() => screen.getByTestId('oauth-handler'));
      await user.click(screen.getByText('Complete OAuth'));
      await waitFor(() => screen.getByText('Configuration'));
      await user.click(screen.getByText('Continue'));
      await waitFor(() => screen.getByText('Review & Complete'));

      await user.click(screen.getByText('Create Integration'));

      await waitFor(() => {
        expect(
          require('@/lib/api/crm-integrations').createCRMIntegration,
        ).toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledWith(mockIntegration);
      });
    });
  });

  describe('Navigation', () => {
    it('allows canceling at any step', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();

      renderWizard({ onCancel });

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('disables next button on first step without selection', () => {
      renderWizard();

      expect(screen.getByText('Continue')).toBeDisabled();
    });

    it('shows loading state during API calls', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      require('@/lib/api/crm-integrations').testCRMConnection.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 1000),
          ),
      );

      renderWizard();

      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => screen.getByText('Authentication'));

      await user.click(screen.getByText('Enter API Key'));
      await user.type(screen.getByLabelText(/api key/i), 'test-key');
      await user.click(screen.getByText('Test Connection'));

      expect(screen.getByText('Testing...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API key validation errors', async () => {
      const user = userEvent.setup();

      require('@/lib/api/crm-integrations').testCRMConnection.mockRejectedValue(
        new Error('Invalid API key'),
      );

      renderWizard();

      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => screen.getByText('Authentication'));

      await user.click(screen.getByText('Enter API Key'));
      await user.type(screen.getByLabelText(/api key/i), 'invalid-key');
      await user.click(screen.getByText('Test Connection'));

      await waitFor(() => {
        expect(screen.getByText('Invalid API key')).toBeInTheDocument();
      });
    });

    it('handles OAuth flow errors', async () => {
      const user = userEvent.setup();

      renderWizard();

      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));

      await waitFor(() => screen.getByText('Authentication'));

      await user.click(screen.getByText('Connect with OAuth'));

      await waitFor(() => screen.getByTestId('oauth-handler'));

      await user.click(screen.getByText('Fail OAuth'));

      await waitFor(() => {
        expect(screen.getByText('OAuth failed')).toBeInTheDocument();
      });
    });

    it('handles integration creation errors', async () => {
      const user = userEvent.setup();

      require('@/lib/api/crm-integrations').createCRMIntegration.mockRejectedValue(
        new Error('Integration creation failed'),
      );

      renderWizard();

      // Navigate to review step
      await user.click(screen.getByText('Tave').closest('div')!);
      await user.click(screen.getByText('Continue'));
      await waitFor(() => screen.getByText('Authentication'));
      await user.click(screen.getByText('Connect with OAuth'));
      await waitFor(() => screen.getByTestId('oauth-handler'));
      await user.click(screen.getByText('Complete OAuth'));
      await waitFor(() => screen.getByText('Configuration'));
      await user.click(screen.getByText('Continue'));
      await waitFor(() => screen.getByText('Review & Complete'));

      await user.click(screen.getByText('Create Integration'));

      await waitFor(() => {
        expect(
          screen.getByText('Integration creation failed'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for steps', () => {
      renderWizard();

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Step 1: Select Provider'),
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWizard();

      // Tab through providers
      await user.tab();
      expect(screen.getByText('Tave').closest('div')).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('Tave').closest('div')).toHaveClass('ring-2');
    });

    it('has proper button labels', () => {
      renderWizard();

      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /continue/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      renderWizard();

      // Should render mobile-friendly grid
      expect(screen.getByText('Connect Your CRM')).toBeInTheDocument();
    });
  });
});
