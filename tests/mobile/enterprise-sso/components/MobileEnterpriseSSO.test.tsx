/**
 * WS-251: Mobile Enterprise SSO - MobileEnterpriseSSO Component Tests
 * Comprehensive tests for touch-optimized enterprise authentication
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import MobileEnterpriseSSO from '../../../../src/components/mobile/enterprise-auth/MobileEnterpriseSSO';

// Mock dependencies
jest.mock('../../../../src/components/mobile/enterprise-auth/BiometricAuthenticationManager', () => ({
  BiometricAuthenticationManager: jest.fn().mockImplementation(() => ({
    isAvailable: jest.fn().mockResolvedValue(true),
    register: jest.fn().mockResolvedValue({ success: true, credentialId: 'mock-cred-123' }),
    authenticate: jest.fn().mockResolvedValue({ success: true, credentialId: 'mock-cred-123' })
  }))
}));

jest.mock('../../../../src/components/mobile/enterprise-auth/OfflineCredentialManager', () => ({
  OfflineCredentialManager: jest.fn().mockImplementation(() => ({
    storeCredentials: jest.fn().mockResolvedValue(true),
    getStoredCredentials: jest.fn().mockResolvedValue(null),
    clearCredentials: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithOAuth: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  }
};

jest.mock('../../../../src/utils/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null)
  })
}));

// Mock hooks
const mockToast = jest.fn();
jest.mock('../../../../src/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('MobileEnterpriseSSO Component', () => {
  const mockProps = {
    onAuthenticated: jest.fn(),
    onError: jest.fn(),
    weddingId: 'wedding-123',
    vendorId: 'vendor-456',
    isWeddingDay: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock window.matchMedia for responsive design tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe('Component Rendering', () => {
    it('should render the mobile SSO interface', () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      expect(screen.getByText('Enterprise Authentication')).toBeInTheDocument();
      expect(screen.getByText('Sign in to access your wedding business account')).toBeInTheDocument();
    });

    it('should display wedding day mode when isWeddingDay is true', () => {
      render(<MobileEnterpriseSSO {...mockProps} isWeddingDay={true} />);
      
      expect(screen.getByText('🎉 Wedding Day Access')).toBeInTheDocument();
      expect(screen.getByText('Quick access for today\'s celebration')).toBeInTheDocument();
    });

    it('should show provider selection options', () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      expect(screen.getByText('Google Workspace')).toBeInTheDocument();
      expect(screen.getByText('Microsoft 365')).toBeInTheDocument();
      expect(screen.getByText('Okta')).toBeInTheDocument();
      expect(screen.getByText('Azure AD')).toBeInTheDocument();
    });

    it('should display biometric authentication option when available', async () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Use Biometric Authentication')).toBeInTheDocument();
      });
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events on provider buttons', async () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const googleButton = screen.getByText('Google Workspace').closest('button')!;
      
      // Test touch start
      fireEvent.touchStart(googleButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      // Button should have pressed state
      expect(googleButton).toHaveClass('transform', 'scale-95');
      
      // Test touch end
      fireEvent.touchEnd(googleButton);
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            queryParams: expect.objectContaining({
              access_type: 'offline',
              prompt: 'consent'
            })
          })
        });
      });
    });

    it('should handle biometric authentication touch', async () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      await waitFor(() => {
        const biometricButton = screen.getByText('Use Biometric Authentication').closest('button')!;
        fireEvent.click(biometricButton);
      });
      
      await waitFor(() => {
        expect(mockProps.onAuthenticated).toHaveBeenCalled();
      });
    });

    it('should handle swipe gestures for provider carousel', async () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const carousel = screen.getByTestId('provider-carousel');
      
      // Simulate swipe left
      fireEvent.touchStart(carousel, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      
      fireEvent.touchMove(carousel, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchEnd(carousel);
      
      // Should move to next provider set
      await waitFor(() => {
        expect(carousel.scrollLeft).toBeGreaterThan(0);
      });
    });
  });

  describe('Authentication Flows', () => {
    it('should handle OAuth provider authentication', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://oauth-provider.com/auth' },
        error: null
      });

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const microsoftButton = screen.getByText('Microsoft 365').closest('button')!;
      fireEvent.click(microsoftButton);
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'azure',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/callback'),
            queryParams: expect.objectContaining({
              wedding_id: 'wedding-123',
              vendor_id: 'vendor-456'
            })
          })
        });
      });
    });

    it('should handle SAML authentication', async () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const samlButton = screen.getByText('SAML SSO').closest('button')!;
      fireEvent.click(samlButton);
      
      // Should show domain input
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your company domain')).toBeInTheDocument();
      });
      
      const domainInput = screen.getByPlaceholderText('Enter your company domain');
      fireEvent.change(domainInput, { target: { value: 'company.com' } });
      
      const continueButton = screen.getByText('Continue with SAML');
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'saml',
          options: expect.objectContaining({
            queryParams: expect.objectContaining({
              domain: 'company.com'
            })
          })
        });
      });
    });

    it('should handle authentication success', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@company.com' },
        access_token: 'token-123'
      };
      
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      });

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      // Simulate authentication callback
      act(() => {
        const callback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
        callback('SIGNED_IN', mockSession);
      });
      
      await waitFor(() => {
        expect(mockProps.onAuthenticated).toHaveBeenCalledWith({
          session: mockSession,
          provider: 'oauth',
          weddingId: 'wedding-123',
          vendorId: 'vendor-456'
        });
      });
    });

    it('should handle authentication errors', async () => {
      const mockError = new Error('Authentication failed');
      mockSupabaseClient.auth.signInWithOAuth.mockRejectedValueOnce(mockError);

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const googleButton = screen.getByText('Google Workspace').closest('button')!;
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith({
          error: mockError,
          context: 'oauth_authentication',
          provider: 'google'
        });
      });
    });
  });

  describe('Wedding Day Features', () => {
    it('should show emergency access in wedding day mode', () => {
      render(<MobileEnterpriseSSO {...mockProps} isWeddingDay={true} />);
      
      expect(screen.getByText('Emergency Access')).toBeInTheDocument();
      expect(screen.getByText('For urgent wedding day issues')).toBeInTheDocument();
    });

    it('should handle emergency access authentication', async () => {
      render(<MobileEnterpriseSSO {...mockProps} isWeddingDay={true} />);
      
      const emergencyButton = screen.getByText('Emergency Access').closest('button')!;
      fireEvent.click(emergencyButton);
      
      // Should show emergency authentication form
      await waitFor(() => {
        expect(screen.getByText('Emergency Wedding Access')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Emergency access code')).toBeInTheDocument();
      });
    });

    it('should validate emergency access code', async () => {
      render(<MobileEnterpriseSSO {...mockProps} isWeddingDay={true} />);
      
      const emergencyButton = screen.getByText('Emergency Access').closest('button')!;
      fireEvent.click(emergencyButton);
      
      await waitFor(() => {
        const codeInput = screen.getByPlaceholderText('Emergency access code');
        fireEvent.change(codeInput, { target: { value: 'WEDDING123' } });
        
        const submitButton = screen.getByText('Access Wedding Dashboard');
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockProps.onAuthenticated).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'emergency',
            emergencyCode: 'WEDDING123'
          })
        );
      });
    });

    it('should show countdown to wedding in wedding day mode', () => {
      render(<MobileEnterpriseSSO {...mockProps} isWeddingDay={true} />);
      
      expect(screen.getByTestId('wedding-countdown')).toBeInTheDocument();
    });
  });

  describe('Offline Mode', () => {
    it('should detect offline state', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Offline Mode')).toBeInTheDocument();
        expect(screen.getByText('Use cached credentials to sign in')).toBeInTheDocument();
      });
    });

    it('should handle offline authentication', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const offlineButton = screen.getByText('Sign In Offline').closest('button')!;
      fireEvent.click(offlineButton);
      
      await waitFor(() => {
        expect(mockProps.onAuthenticated).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'offline',
            offline: true
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      expect(screen.getByLabelText('Enterprise authentication options')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Google Workspace/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const firstButton = screen.getByText('Google Workspace').closest('button')!;
      firstButton.focus();
      
      // Test Tab navigation
      fireEvent.keyDown(firstButton, { key: 'Tab' });
      
      const secondButton = screen.getByText('Microsoft 365').closest('button')!;
      expect(document.activeElement).toBe(secondButton);
    });

    it('should have sufficient color contrast', () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('text-white', 'bg-blue-600');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const container = screen.getByTestId('mobile-sso-container');
      expect(container).toHaveClass('px-4', 'py-6');
    });

    it('should adjust button sizes for touch targets', () => {
      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('min-h-12'); // 48px minimum touch target
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const googleButton = screen.getByText('Google Workspace').closest('button')!;
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Please check your internet connection')).toBeInTheDocument();
      });
    });

    it('should show retry option after failed authentication', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockRejectedValueOnce(
        new Error('Authentication failed')
      );

      render(<MobileEnterpriseSSO {...mockProps} />);
      
      const googleButton = screen.getByText('Google Workspace').closest('button')!;
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });
});