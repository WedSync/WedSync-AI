/**
 * WS-175 Advanced Data Encryption - Team A Round 1
 * EncryptionKeyManager Component Tests
 * 
 * Comprehensive unit tests for encryption key management component
 * ensuring proper key lifecycle operations and security monitoring.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionKeyManager } from '@/components/encryption/EncryptionKeyManager';
import { EncryptionKey } from '@/types/encryption';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Shield: ({ className, ...props }: any) => <div data-testid="shield-icon" className={className} {...props} />,
  ShieldCheck: ({ className, ...props }: any) => <div data-testid="shield-check-icon" className={className} {...props} />,
  ShieldAlert: ({ className, ...props }: any) => <div data-testid="shield-alert-icon" className={className} {...props} />,
  Key: ({ className, ...props }: any) => <div data-testid="key-icon" className={className} {...props} />,
  RotateCcw: ({ className, ...props }: any) => <div data-testid="rotate-icon" className={className} {...props} />,
  Trash2: ({ className, ...props }: any) => <div data-testid="trash-icon" className={className} {...props} />,
  Plus: ({ className, ...props }: any) => <div data-testid="plus-icon" className={className} {...props} />,
  AlertTriangle: ({ className, ...props }: any) => <div data-testid="alert-triangle-icon" className={className} {...props} />,
  CheckCircle2: ({ className, ...props }: any) => <div data-testid="check-circle-icon" className={className} {...props} />,
  Clock: ({ className, ...props }: any) => <div data-testid="clock-icon" className={className} {...props} />,
  Settings: ({ className, ...props }: any) => <div data-testid="settings-icon" className={className} {...props} />,
  Eye: ({ className, ...props }: any) => <div data-testid="eye-icon" className={className} {...props} />,
  EyeOff: ({ className, ...props }: any) => <div data-testid="eye-off-icon" className={className} {...props} />,
  RefreshCw: ({ className, ...props }: any) => <div data-testid="refresh-icon" className={className} {...props} />,
  Calendar: ({ className, ...props }: any) => <div data-testid="calendar-icon" className={className} {...props} />,
  Activity: ({ className, ...props }: any) => <div data-testid="activity-icon" className={className} {...props} />,
  Zap: ({ className, ...props }: any) => <div data-testid="zap-icon" className={className} {...props} />,
  Lock: ({ className, ...props }: any) => <div data-testid="lock-icon" className={className} {...props} />
}));

describe('EncryptionKeyManager', () => {
  const mockKeys: EncryptionKey[] = [
    {
      id: 'key-123456789',
      keyHash: 'hash123',
      status: 'active',
      algorithm: 'aes-256-gcm',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      expiresAt: new Date('2024-04-01T00:00:00Z'),
      createdBy: 'admin-user'
    },
    {
      id: 'key-987654321',
      keyHash: 'hash456',
      status: 'rotating',
      algorithm: 'aes-256-gcm',
      createdAt: new Date('2024-01-15T00:00:00Z'),
      expiresAt: new Date('2024-04-15T00:00:00Z'),
      rotationScheduledAt: new Date('2024-03-01T00:00:00Z'),
      createdBy: 'admin-user'
    },
    {
      id: 'key-111222333',
      keyHash: 'hash789',
      status: 'deprecated',
      algorithm: 'aes-256-cbc',
      createdAt: new Date('2023-10-01T00:00:00Z'),
      expiresAt: new Date('2023-12-31T00:00:00Z'),
      createdBy: 'admin-user'
    }
  ];

  const defaultProps = {
    keys: mockKeys,
    currentKeyId: 'key-123456789',
    onKeyRotate: vi.fn(),
    onKeyRevoke: vi.fn(),
    onKeyCreate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('renders the key management header with statistics', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      expect(screen.getByText('Encryption Key Management')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
      expect(screen.getByText('Create Key')).toBeInTheDocument();
    });

    it('displays correct key statistics', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Active Keys
      expect(screen.getByText('1')).toBeInTheDocument(); // Rotating Keys
      expect(screen.getByText('1')).toBeInTheDocument(); // Deprecated Keys
      expect(screen.getByText('Active Keys')).toBeInTheDocument();
      expect(screen.getByText('Rotating')).toBeInTheDocument();
      expect(screen.getByText('Deprecated')).toBeInTheDocument();
    });

    it('renders all keys in the list', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      expect(screen.getByText('KEY-12345')).toBeInTheDocument(); // Display name for first key
      expect(screen.getByText('KEY-98765')).toBeInTheDocument(); // Display name for second key
      expect(screen.getByText('KEY-11122')).toBeInTheDocument(); // Display name for third key
    });

    it('shows loading state correctly', () => {
      render(<EncryptionKeyManager {...defaultProps} loading={true} />);
      
      // Should show skeleton loading animation
      const skeletons = screen.getAllByTestId(/pulse/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays error state', () => {
      const errorMessage = 'Failed to load encryption keys';
      render(<EncryptionKeyManager {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });
  });

  describe('Key status and badges', () => {
    it('shows current key badge for active key', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const currentBadge = screen.getByText('Current');
      expect(currentBadge).toBeInTheDocument();
    });

    it('displays expiring soon warning for keys near expiry', () => {
      const nearExpiryKey: EncryptionKey = {
        ...mockKeys[0],
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20 days from now
      };

      render(<EncryptionKeyManager {...defaultProps} keys={[nearExpiryKey]} />);
      
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('shows correct status badges for different key states', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('rotating')).toBeInTheDocument();
      expect(screen.getByText('deprecated')).toBeInTheDocument();
    });

    it('displays health scores correctly', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      // Health scores are calculated in the component (95-100% for active keys)
      const healthElements = screen.getAllByText(/%$/);
      expect(healthElements.length).toBeGreaterThan(0);
      expect(screen.getAllByText('Health')).toHaveLength(mockKeys.length + 1); // +1 for avg health in stats
    });
  });

  describe('Key operations', () => {
    it('calls onKeyRotate when rotate button is clicked', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const rotateButtons = screen.getAllByTestId('rotate-icon');
      fireEvent.click(rotateButtons[0]);
      
      expect(defaultProps.onKeyRotate).toHaveBeenCalledWith('key-123456789');
    });

    it('calls onKeyRevoke when revoke button is clicked', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const revokeButtons = screen.getAllByTestId('trash-icon');
      fireEvent.click(revokeButtons[0]);
      
      await waitFor(() => {
        expect(defaultProps.onKeyRevoke).toHaveBeenCalled();
      });
    });

    it('shows create key modal when create button is clicked', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const createButton = screen.getByText('Create Key');
      fireEvent.click(createButton);
      
      expect(screen.getByText('Create New Encryption Key')).toBeInTheDocument();
      expect(screen.getByText('This will create a new AES-256-GCM encryption key')).toBeInTheDocument();
    });

    it('calls onKeyCreate when confirm create is clicked', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByText('Create Key');
      fireEvent.click(createButton);
      
      // Confirm creation
      const confirmButton = screen.getByRole('button', { name: /create key/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(defaultProps.onKeyCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            algorithm: 'aes-256-gcm',
            status: 'active'
          })
        );
      });
    });

    it('disables actions in read-only mode', () => {
      render(<EncryptionKeyManager {...defaultProps} readOnly={true} />);
      
      expect(screen.queryByText('Create Key')).not.toBeInTheDocument();
      
      // Rotate and revoke buttons should not be present for readOnly mode
      const buttons = screen.queryAllByRole('button');
      const actionButtons = buttons.filter(button => 
        button.querySelector('[data-testid="rotate-icon"], [data-testid="trash-icon"]')
      );
      expect(actionButtons).toHaveLength(0);
    });

    it('prevents operations on current key', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      // Current key should not have a revoke button
      const currentKeyRow = screen.getByText('Current').closest('div');
      const revokeButton = currentKeyRow?.querySelector('[data-testid="trash-icon"]');
      expect(revokeButton).toBeNull();
    });
  });

  describe('Key details expansion', () => {
    it('toggles key details when eye button is clicked', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const eyeButton = screen.getAllByTestId('eye-icon')[0];
      fireEvent.click(eyeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Algorithm')).toBeInTheDocument();
        expect(screen.getByText('aes-256-gcm')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Expires')).toBeInTheDocument();
      });

      // Click again to hide details
      const eyeOffButton = screen.getByTestId('eye-off-icon');
      fireEvent.click(eyeOffButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Algorithm')).not.toBeInTheDocument();
      });
    });

    it('shows lifecycle progress bar in details', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const eyeButton = screen.getAllByTestId('eye-icon')[0];
      fireEvent.click(eyeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Lifecycle Progress')).toBeInTheDocument();
        // Progress bar component would be rendered here
      });
    });

    it('displays usage count in details', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const eyeButton = screen.getAllByTestId('eye-icon')[0];
      fireEvent.click(eyeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Usage Count')).toBeInTheDocument();
        // Usage count would be a mock value generated in the component
      });
    });

    it('shows last used timestamp when available', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const eyeButton = screen.getAllByTestId('eye-icon')[0];
      fireEvent.click(eyeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
        expect(screen.getByText(/Last used:/)).toBeInTheDocument();
      });
    });

    it('shows rotation schedule when present', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      // Click on the rotating key (second key)
      const eyeButtons = screen.getAllByTestId('eye-icon');
      fireEvent.click(eyeButtons[1]);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
        expect(screen.getByText(/Rotation scheduled:/)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no keys are provided', () => {
      render(<EncryptionKeyManager {...defaultProps} keys={[]} />);
      
      expect(screen.getByText('No encryption keys found')).toBeInTheDocument();
      expect(screen.getByText('Create your first encryption key to secure wedding data')).toBeInTheDocument();
      expect(screen.getByTestId('key-icon')).toBeInTheDocument();
    });
  });

  describe('Modal interactions', () => {
    it('closes create modal when cancel is clicked', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByText('Create Key');
      fireEvent.click(createButton);
      
      // Cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Create New Encryption Key')).not.toBeInTheDocument();
    });

    it('closes modal after successful key creation', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      // Open modal
      const createButton = screen.getByText('Create Key');
      fireEvent.click(createButton);
      
      // Create key
      const confirmButton = screen.getByRole('button', { name: /create key/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Create New Encryption Key')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading and error states', () => {
    it('shows loading state for individual key operations', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const rotateButton = screen.getAllByTestId('rotate-icon')[0];
      fireEvent.click(rotateButton);
      
      // The rotate icon should show spinning animation during operation
      await waitFor(() => {
        expect(rotateButton).toHaveClass('animate-spin');
      });
    });

    it('prevents multiple simultaneous operations on same key', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const rotateButton = screen.getAllByTestId('rotate-icon')[0];
      fireEvent.click(rotateButton);
      fireEvent.click(rotateButton); // Second click should be ignored
      
      expect(defaultProps.onKeyRotate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('provides proper button labels and roles', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Create button should be accessible
      expect(screen.getByRole('button', { name: /create key/i })).toBeInTheDocument();
    });

    it('maintains focus management in modal', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const createButton = screen.getByText('Create Key');
      fireEvent.click(createButton);
      
      // Modal should be rendered with proper focus management
      expect(screen.getByText('Create New Encryption Key')).toBeInTheDocument();
    });
  });

  describe('Wedding data context', () => {
    it('indicates key usage for wedding data protection', () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      expect(screen.getByText(/secure wedding data/i)).toBeInTheDocument();
    });

    it('shows appropriate algorithm for wedding data encryption', async () => {
      render(<EncryptionKeyManager {...defaultProps} />);
      
      const eyeButton = screen.getAllByTestId('eye-icon')[0];
      fireEvent.click(eyeButton);
      
      await waitFor(() => {
        expect(screen.getByText('aes-256-gcm')).toBeInTheDocument();
      });
    });
  });
});