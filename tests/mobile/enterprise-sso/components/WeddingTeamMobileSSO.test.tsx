/**
 * WS-251: Mobile Enterprise SSO - WeddingTeamMobileSSO Component Tests
 * Tests for wedding team-specific mobile authentication
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import WeddingTeamMobileSSO from '../../../../src/components/mobile/enterprise-auth/WeddingTeamMobileSSO';

// Mock dependencies
const mockBiometricAuth = {
  isAvailable: jest.fn().mockResolvedValue(true),
  authenticate: jest.fn().mockResolvedValue({ success: true, credentialId: 'team-cred-123' })
};

const mockOfflineManager = {
  getTeamCredentials: jest.fn().mockResolvedValue(null),
  storeTeamCredentials: jest.fn().mockResolvedValue(true),
  syncTeamData: jest.fn().mockResolvedValue({ success: true })
};

jest.mock('../../../../src/components/mobile/enterprise-auth/BiometricAuthenticationManager', () => ({
  BiometricAuthenticationManager: jest.fn().mockImplementation(() => mockBiometricAuth)
}));

jest.mock('../../../../src/components/mobile/enterprise-auth/OfflineCredentialManager', () => ({
  OfflineCredentialManager: jest.fn().mockImplementation(() => mockOfflineManager)
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'wedding-123',
            couple_names: 'Alice & Bob',
            wedding_date: '2024-06-15',
            venue: 'Grand Hotel'
          },
          error: null
        })
      }),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 'member-1', name: 'John Smith', role: 'photographer', status: 'active' },
          { id: 'member-2', name: 'Jane Doe', role: 'coordinator', status: 'active' }
        ],
        error: null
      })
    }),
    insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: {}, error: null })
    })
  }),
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null
    })
  }
};

jest.mock('../../../../src/utils/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn()
  })
}));

describe('WeddingTeamMobileSSO Component', () => {
  const mockProps = {
    weddingId: 'wedding-123',
    onAuthenticated: jest.fn(),
    onError: jest.fn(),
    isWeddingDay: false,
    emergencyMode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
    
    // Mock geolocation
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10
          }
        });
      })
    };
    
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render wedding team authentication interface', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Wedding Team Access')).toBeInTheDocument();
        expect(screen.getByText('Alice & Bob')).toBeInTheDocument();
        expect(screen.getByText('Grand Hotel')).toBeInTheDocument();
      });
    });

    it('should display wedding day countdown in wedding day mode', () => {
      render(<WeddingTeamMobileSSO {...mockProps} isWeddingDay={true} />);
      
      expect(screen.getByTestId('wedding-countdown')).toBeInTheDocument();
      expect(screen.getByText('🎉 Wedding Day!')).toBeInTheDocument();
    });

    it('should show emergency mode indicator', () => {
      render(<WeddingTeamMobileSSO {...mockProps} emergencyMode={true} />);
      
      expect(screen.getByText('🚨 Emergency Mode')).toBeInTheDocument();
      expect(screen.getByText('Priority access enabled')).toBeInTheDocument();
    });

    it('should display team member list', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('photographer')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('coordinator')).toBeInTheDocument();
      });
    });
  });

  describe('Team Member Authentication', () => {
    it('should handle team member selection', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      expect(screen.getByText('Sign in as John Smith')).toBeInTheDocument();
      expect(screen.getByText('Photographer')).toBeInTheDocument();
    });

    it('should authenticate selected team member', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      const authenticateButton = screen.getByText('Authenticate');
      fireEvent.click(authenticateButton);
      
      await waitFor(() => {
        expect(mockBiometricAuth.authenticate).toHaveBeenCalled();
        expect(mockProps.onAuthenticated).toHaveBeenCalledWith({
          teamMember: expect.objectContaining({
            id: 'member-1',
            name: 'John Smith',
            role: 'photographer'
          }),
          weddingId: 'wedding-123',
          authMethod: 'biometric'
        });
      });
    });

    it('should handle role-based access', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const photographerCard = screen.getByTestId('member-member-1');
        fireEvent.click(photographerCard);
      });
      
      const authenticateButton = screen.getByText('Authenticate');
      fireEvent.click(authenticateButton);
      
      await waitFor(() => {
        expect(mockProps.onAuthenticated).toHaveBeenCalledWith(
          expect.objectContaining({
            permissions: expect.arrayContaining(['photo_upload', 'gallery_access', 'timeline_view'])
          })
        );
      });
    });
  });

  describe('Wedding Day Features', () => {
    it('should show quick access buttons in wedding day mode', () => {
      render(<WeddingTeamMobileSSO {...mockProps} isWeddingDay={true} />);
      
      expect(screen.getByText('📸 Photo Upload')).toBeInTheDocument();
      expect(screen.getByText('📋 Timeline')).toBeInTheDocument();
      expect(screen.getByText('👥 Team Chat')).toBeInTheDocument();
    });

    it('should handle quick photo upload access', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} isWeddingDay={true} />);
      
      const photoButton = screen.getByText('📸 Photo Upload');
      fireEvent.click(photoButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/wedding/123/photos/upload');
      });
    });

    it('should show venue location verification', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} isWeddingDay={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('📍 Location Verified')).toBeInTheDocument();
        expect(screen.getByText('At wedding venue')).toBeInTheDocument();
      });
    });

    it('should handle emergency coordinator access', () => {
      render(<WeddingTeamMobileSSO {...mockProps} emergencyMode={true} isWeddingDay={true} />);
      
      const emergencyButton = screen.getByText('Emergency Coordinator');
      fireEvent.click(emergencyButton);
      
      expect(screen.getByText('Emergency Access Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter emergency code')).toBeInTheDocument();
    });
  });

  describe('Team Coordination', () => {
    it('should show team status indicators', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const activeIndicators = screen.getAllByTestId(/status-active/);
        expect(activeIndicators).toHaveLength(2);
      });
    });

    it('should handle team member check-in', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} isWeddingDay={true} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      const checkinButton = screen.getByText('Check In');
      fireEvent.click(checkinButton);
      
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('team_checkins');
      });
    });

    it('should show team communication panel', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      const teamChatButton = screen.getByText('👥 Team Chat');
      fireEvent.click(teamChatButton);
      
      await waitFor(() => {
        expect(screen.getByText('Wedding Team Chat')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Message the team...')).toBeInTheDocument();
      });
    });
  });

  describe('Offline Mode', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });

    it('should detect offline mode', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('📶 Offline Mode')).toBeInTheDocument();
        expect(screen.getByText('Using cached team data')).toBeInTheDocument();
      });
    });

    it('should use cached team credentials', async () => {
      mockOfflineManager.getTeamCredentials.mockResolvedValue({
        teamMembers: [
          { id: 'member-1', name: 'John Smith', role: 'photographer' }
        ],
        cachedAt: Date.now() - 300000 // 5 minutes ago
      });

      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(mockOfflineManager.getTeamCredentials).toHaveBeenCalledWith('wedding-123');
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
    });

    it('should queue actions for sync when back online', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      const checkinButton = screen.getByText('Check In');
      fireEvent.click(checkinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Queued for sync')).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('should validate team member permissions', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      // Mock insufficient permissions
      mockBiometricAuth.authenticate.mockResolvedValueOnce({
        success: false,
        error: 'insufficient_permissions'
      });
      
      const authenticateButton = screen.getByText('Authenticate');
      fireEvent.click(authenticateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText('Insufficient permissions for this role')).toBeInTheDocument();
      });
    });

    it('should log security events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_EVENT'),
        expect.objectContaining({
          event: 'team_member_selected',
          weddingId: 'wedding-123',
          memberId: 'member-1'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle suspicious activity', async () => {
      // Mock multiple failed attempts
      mockBiometricAuth.authenticate
        .mockRejectedValueOnce(new Error('Authentication failed'))
        .mockRejectedValueOnce(new Error('Authentication failed'))
        .mockRejectedValueOnce(new Error('Authentication failed'));

      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      const authenticateButton = screen.getByText('Authenticate');
      
      // Attempt authentication 3 times
      fireEvent.click(authenticateButton);
      await waitFor(() => {});
      fireEvent.click(authenticateButton);
      await waitFor(() => {});
      fireEvent.click(authenticateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Account Temporarily Locked')).toBeInTheDocument();
        expect(screen.getByText('Too many failed attempts')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for team members', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByLabelText('Team member: John Smith, photographer');
        expect(memberCard).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for team selection', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const firstMember = screen.getByTestId('member-member-1');
        firstMember.focus();
        
        fireEvent.keyDown(firstMember, { key: 'Enter' });
        
        expect(screen.getByText('Sign in as John Smith')).toBeInTheDocument();
      });
    });

    it('should announce status changes to screen readers', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const statusAnnouncement = screen.getByRole('status');
        expect(statusAnnouncement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle team data loading errors', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Wedding not found')
            })
          })
        })
      });

      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Wedding Data Error')).toBeInTheDocument();
        expect(screen.getByText('Unable to load wedding information')).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Switching to offline mode')).toBeInTheDocument();
      });
    });

    it('should provide error recovery options', async () => {
      mockBiometricAuth.authenticate.mockRejectedValueOnce(
        new Error('Biometric authentication failed')
      );

      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        const memberCard = screen.getByTestId('member-member-1');
        fireEvent.click(memberCard);
      });
      
      const authenticateButton = screen.getByText('Authenticate');
      fireEvent.click(authenticateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Try Alternative Method')).toBeInTheDocument();
        expect(screen.getByText('Use PIN Code')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load team member data', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      // Should show loading state initially
      expect(screen.getByTestId('team-loading')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByTestId('team-loading')).not.toBeInTheDocument();
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
    });

    it('should cache team data for performance', async () => {
      render(<WeddingTeamMobileSSO {...mockProps} />);
      
      await waitFor(() => {
        expect(mockOfflineManager.storeTeamCredentials).toHaveBeenCalledWith(
          'wedding-123',
          expect.objectContaining({
            teamMembers: expect.any(Array),
            cachedAt: expect.any(Number)
          })
        );
      });
    });
  });
});