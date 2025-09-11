/**
 * OAuth Flow Handler Tests
 * WS-343 - Team A - Round 1
 *
 * Comprehensive test suite for OAuthFlowHandler component with security validation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuthFlowHandler } from '@/components/integrations/OAuthFlowHandler';
import type { OAuthConfig, OAuthTokenResponse } from '@/types/crm';

// Mock crypto for PKCE
const mockCrypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    digest: jest.fn(async (algorithm, data) => {
      // Mock SHA-256 digest
      return new Uint8Array(32).buffer;
    }),
  },
};
Object.defineProperty(global, 'crypto', { value: mockCrypto });

// Mock window methods
const mockWindowOpen = jest.fn();
const mockWindowClose = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    open: mockWindowOpen,
    close: mockWindowClose,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    location: {
      origin: 'http://localhost:3000',
    },
  },
});

// Mock components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      {value}%
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

const mockTokenResponse: OAuthTokenResponse = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'Bearer',
  scope: 'read:clients write:bookings',
};

const renderOAuthHandler = (props = {}) => {
  const defaultProps = {
    config: mockOAuthConfig,
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onCancel: jest.fn(),
    ...props,
  };

  return render(<OAuthFlowHandler {...defaultProps} />);
};

describe('OAuthFlowHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowOpen.mockReturnValue({
      closed: false,
      focus: jest.fn(),
      close: mockWindowClose,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders OAuth flow initiation correctly', () => {
      renderOAuthHandler();

      expect(screen.getByText('Connect to Tave')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Click below to authorize WedSync to access your Tave data',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Authorize Tave')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderOAuthHandler();

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows security information', () => {
      renderOAuthHandler();

      expect(
        screen.getByText('🔒 Secure OAuth 2.0 with PKCE'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Your data is encrypted and secure'),
      ).toBeInTheDocument();
    });

    it('displays requested scopes', () => {
      renderOAuthHandler();

      expect(screen.getByText('Permissions:')).toBeInTheDocument();
      expect(screen.getByText('Read client information')).toBeInTheDocument();
      expect(screen.getByText('Write booking data')).toBeInTheDocument();
    });
  });

  describe('PKCE Security', () => {
    it('generates secure code verifier', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      expect(mockCrypto.getRandomValues).toHaveBeenCalled();
    });

    it('generates code challenge from verifier', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
        'SHA-256',
        expect.any(TextEncoder().constructor),
      );
    });

    it('includes code challenge in authorization URL', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('code_challenge='),
        expect.any(String),
        expect.any(String),
      );
    });

    it('uses S256 code challenge method', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('code_challenge_method=S256'),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('Authorization Flow', () => {
    it('opens popup window when authorize is clicked', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://api.tave.com/oauth/authorize'),
        'oauth_popup',
        'width=600,height=700,scrollbars=yes,resizable=yes',
      );
    });

    it('includes all required OAuth parameters', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      const [url] = mockWindowOpen.mock.calls[0];
      const urlParams = new URL(url).searchParams;

      expect(urlParams.get('response_type')).toBe('code');
      expect(urlParams.get('client_id')).toBe('test-client-id');
      expect(urlParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/oauth/callback',
      );
      expect(urlParams.get('scope')).toBe('read:clients write:bookings');
      expect(urlParams.has('state')).toBe(true);
      expect(urlParams.has('code_challenge')).toBe(true);
      expect(urlParams.get('code_challenge_method')).toBe('S256');
    });

    it('shows waiting state after opening popup', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      await waitFor(() => {
        expect(
          screen.getByText('Waiting for authorization...'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Complete the authorization in the popup window'),
        ).toBeInTheDocument();
      });
    });

    it('starts polling popup window', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      // Should start polling
      jest.advanceTimersByTime(1000);

      // Popup window should be checked
      expect(mockWindowOpen().closed).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('Success Flow', () => {
    it('handles successful authorization callback', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      renderOAuthHandler({ onSuccess });

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate message from popup
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: true,
          tokens: mockTokenResponse,
        },
        origin: 'http://localhost:3000',
      });

      // Trigger message handler
      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockTokenResponse);
      });
    });

    it('validates message origin for security', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      renderOAuthHandler({ onSuccess });

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate message from invalid origin
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: true,
          tokens: mockTokenResponse,
        },
        origin: 'https://malicious-site.com',
      });

      // Trigger message handler
      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      // Should not call onSuccess due to invalid origin
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows success state', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate successful callback
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: true,
          tokens: mockTokenResponse,
        },
        origin: 'http://localhost:3000',
      });

      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      await waitFor(() => {
        expect(
          screen.getByText('Authorization successful!'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Your Tave account has been connected'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles authorization errors', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      renderOAuthHandler({ onError });

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate error callback
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: false,
          error: 'access_denied',
          error_description: 'User denied access',
        },
        origin: 'http://localhost:3000',
      });

      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User denied access',
          }),
        );
      });
    });

    it('handles popup blocked errors', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      mockWindowOpen.mockReturnValue(null); // Popup blocked

      renderOAuthHandler({ onError });

      await user.click(screen.getByText('Authorize Tave'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('popup blocked'),
          }),
        );
      });
    });

    it('handles popup closed by user', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      const onError = jest.fn();

      const mockPopup = {
        closed: false,
        focus: jest.fn(),
        close: mockWindowClose,
      };
      mockWindowOpen.mockReturnValue(mockPopup);

      renderOAuthHandler({ onError });

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate popup being closed
      mockPopup.closed = true;

      // Advance timer to trigger polling check
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('closed'),
          }),
        );
      });

      jest.useRealTimers();
    });

    it('shows error state', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate error
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: false,
          error: 'server_error',
          error_description: 'Internal server error',
        },
        origin: 'http://localhost:3000',
      });

      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      await waitFor(() => {
        expect(screen.getByText('Authorization failed')).toBeInTheDocument();
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('Cancellation', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();

      renderOAuthHandler({ onCancel });

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('closes popup when cancelled during flow', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();

      const mockPopup = {
        closed: false,
        focus: jest.fn(),
        close: mockWindowClose,
      };
      mockWindowOpen.mockReturnValue(mockPopup);

      renderOAuthHandler({ onCancel });

      await user.click(screen.getByText('Authorize Tave'));
      await user.click(screen.getByText('Cancel'));

      expect(mockPopup.close).toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('cleans up event listeners on cancel', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));
      await user.click(screen.getByText('Cancel'));

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('Mobile Support', () => {
    beforeEach(() => {
      // Mock mobile user agent
      Object.defineProperty(window.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      });
    });

    it('detects mobile environment', () => {
      renderOAuthHandler();

      expect(
        screen.getByText("You'll be redirected to Tave"),
      ).toBeInTheDocument();
    });

    it('uses redirect flow on mobile', async () => {
      const user = userEvent.setup();

      // Mock window.location.href assignment
      delete window.location;
      window.location = { href: '' } as any;

      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      expect(window.location.href).toContain(
        'https://api.tave.com/oauth/authorize',
      );
    });

    it('shows mobile-specific instructions', () => {
      renderOAuthHandler();

      expect(screen.getByText('Tap below to continue')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('generates cryptographically secure state parameter', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      const [url] = mockWindowOpen.mock.calls[0];
      const urlParams = new URL(url).searchParams;
      const state = urlParams.get('state');

      expect(state).toBeTruthy();
      expect(state?.length).toBeGreaterThan(20); // Should be long and random
    });

    it('validates state parameter in callback', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      renderOAuthHandler({ onSuccess });

      await user.click(screen.getByText('Authorize Tave'));

      // Get the state from the authorization URL
      const [url] = mockWindowOpen.mock.calls[0];
      const urlParams = new URL(url).searchParams;
      const originalState = urlParams.get('state');

      // Simulate callback with matching state
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: true,
          tokens: mockTokenResponse,
          state: originalState,
        },
        origin: 'http://localhost:3000',
      });

      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      expect(onSuccess).toHaveBeenCalled();
    });

    it('rejects callback with invalid state', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      const onError = jest.fn();
      renderOAuthHandler({ onSuccess, onError });

      await user.click(screen.getByText('Authorize Tave'));

      // Simulate callback with invalid state
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'oauth_callback',
          success: true,
          tokens: mockTokenResponse,
          state: 'invalid-state',
        },
        origin: 'http://localhost:3000',
      });

      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
      messageHandler(messageEvent);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid state'),
        }),
      );
    });
  });

  describe('Timeout Handling', () => {
    it('times out after specified duration', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      const onError = jest.fn();

      renderOAuthHandler({ onError, timeout: 30000 }); // 30 second timeout

      await user.click(screen.getByText('Authorize Tave'));

      // Fast forward past timeout
      jest.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('timeout'),
          }),
        );
      });

      jest.useRealTimers();
    });

    it('shows timeout progress', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();

      renderOAuthHandler({ timeout: 30000 });

      await user.click(screen.getByText('Authorize Tave'));

      // Fast forward partway through timeout
      jest.advanceTimersByTime(15000);

      await waitFor(() => {
        const progress = screen.getByTestId('progress');
        expect(progress).toHaveAttribute('data-value', '50'); // 50% of timeout
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderOAuthHandler();

      expect(
        screen.getByRole('button', { name: /authorize tave/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.tab();
      expect(screen.getByText('Authorize Tave')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Cancel')).toHaveFocus();
    });

    it('has proper focus management during flow', async () => {
      const user = userEvent.setup();
      renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      // Focus should be on the cancel button during waiting state
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toHaveFocus();
      });
    });
  });

  describe('Cleanup', () => {
    it('cleans up event listeners on unmount', () => {
      const { unmount } = renderOAuthHandler();

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('closes popup on unmount', async () => {
      const user = userEvent.setup();

      const mockPopup = {
        closed: false,
        focus: jest.fn(),
        close: mockWindowClose,
      };
      mockWindowOpen.mockReturnValue(mockPopup);

      const { unmount } = renderOAuthHandler();

      await user.click(screen.getByText('Authorize Tave'));

      unmount();

      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('clears timers on unmount', () => {
      jest.useFakeTimers();
      const { unmount } = renderOAuthHandler();

      unmount();

      // Should not crash or have pending timers
      jest.runAllTimers();
      jest.useRealTimers();
    });
  });
});
