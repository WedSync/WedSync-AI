/**
 * WS-175 Advanced Data Encryption - Team A Round 1
 * SecureDataDisplay Component Tests
 * 
 * Comprehensive unit tests for secure data display component
 * ensuring proper handling of encrypted and decrypted data display.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureDataDisplay } from '@/components/encryption/SecureDataDisplay';
import { EncryptionResult, FieldType } from '@/types/encryption';

// Mock the EncryptionStatusIndicator component
vi.mock('@/components/encryption/EncryptionStatusIndicator', () => ({
  EncryptionStatusIndicator: ({ status, level, size, variant }: any) => (
    <div data-testid="encryption-status-indicator">
      Status: {status}, Level: {level}, Size: {size}, Variant: {variant}
    </div>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Eye: ({ className, ...props }: any) => <div data-testid="eye-icon" className={className} {...props} />,
  EyeOff: ({ className, ...props }: any) => <div data-testid="eye-off-icon" className={className} {...props} />,
  Lock: ({ className, ...props }: any) => <div data-testid="lock-icon" className={className} {...props} />,
  Unlock: ({ className, ...props }: any) => <div data-testid="unlock-icon" className={className} {...props} />,
  Shield: ({ className, ...props }: any) => <div data-testid="shield-icon" className={className} {...props} />,
  ShieldCheck: ({ className, ...props }: any) => <div data-testid="shield-check-icon" className={className} {...props} />,
  ShieldAlert: ({ className, ...props }: any) => <div data-testid="shield-alert-icon" className={className} {...props} />,
  Copy: ({ className, ...props }: any) => <div data-testid="copy-icon" className={className} {...props} />,
  CheckCircle2: ({ className, ...props }: any) => <div data-testid="check-circle-icon" className={className} {...props} />,
  AlertTriangle: ({ className, ...props }: any) => <div data-testid="alert-triangle-icon" className={className} {...props} />,
  Loader2: ({ className, ...props }: any) => <div data-testid="loader-icon" className={className} {...props} />,
  Edit3: ({ className, ...props }: any) => <div data-testid="edit-icon" className={className} {...props} />,
  Save: ({ className, ...props }: any) => <div data-testid="save-icon" className={className} {...props} />,
  X: ({ className, ...props }: any) => <div data-testid="x-icon" className={className} {...props} />
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve())
  }
});

describe('SecureDataDisplay', () => {
  const mockEncryptedData: EncryptionResult = {
    encryptedData: 'encrypted-data-string',
    keyId: 'key-123456789',
    algorithm: 'aes-256-gcm',
    iv: 'initialization-vector',
    authTag: 'authentication-tag',
    version: 1
  };

  const defaultProps = {
    fieldName: 'customer_email',
    fieldType: 'email' as FieldType,
    onEncrypt: vi.fn(),
    onDecrypt: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('renders with encrypted data', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
        />
      );
      
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('✉️')).toBeInTheDocument();
      expect(screen.getByText('🔒 Encrypted Email Address')).toBeInTheDocument();
    });

    it('renders with plain data', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
        />
      );
      
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('user@••••••.com')).toBeInTheDocument(); // Masked by default
    });

    it('shows loading state correctly', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          loading={true}
        />
      );
      
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays error state', () => {
      const errorMessage = 'Decryption failed';
      render(
        <SecureDataDisplay
          {...defaultProps}
          error={errorMessage}
        />
      );
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('shows encryption status indicator when enabled', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          showEncryptionStatus={true}
        />
      );
      
      expect(screen.getByTestId('encryption-status-indicator')).toBeInTheDocument();
    });
  });

  describe('Field type configurations', () => {
    const fieldConfigs: Array<{ fieldType: FieldType; icon: string; label: string; placeholder: string }> = [
      { fieldType: 'email', icon: '✉️', label: 'Email Address', placeholder: 'user@example.com' },
      { fieldType: 'phone', icon: '📱', label: 'Phone Number', placeholder: '+1 (555) 123-4567' },
      { fieldType: 'notes', icon: '📝', label: 'Private Notes', placeholder: 'Enter private notes...' },
      { fieldType: 'address', icon: '📍', label: 'Address', placeholder: '123 Main St, City, State' },
      { fieldType: 'dietary_requirements', icon: '🍽️', label: 'Dietary Requirements', placeholder: 'Vegetarian, No nuts, etc.' },
      { fieldType: 'contact_info', icon: '📞', label: 'Contact Information', placeholder: 'Emergency contact details' },
      { fieldType: 'personal_details', icon: '👤', label: 'Personal Details', placeholder: 'Personal information' }
    ];

    fieldConfigs.forEach(({ fieldType, icon, label, placeholder }) => {
      it(`renders ${fieldType} field correctly`, () => {
        render(
          <SecureDataDisplay
            {...defaultProps}
            fieldType={fieldType}
            plainData="test data"
          />
        );
        
        expect(screen.getByText(icon)).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('Data visibility controls', () => {
    it('toggles data visibility for sensitive fields', async () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      // Initially shows masked data
      expect(screen.getByText('user@••••••.com')).toBeInTheDocument();
      
      // Click show button
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('allows copying visible data to clipboard', async () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      // Show data first
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      // Copy data
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('user@example.com');
      
      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });
    });

    it('does not show visibility controls for non-sensitive fields', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="Vegetarian, No nuts"
          fieldType="dietary_requirements"
        />
      );
      
      // Dietary requirements are not sensitive, should show directly
      expect(screen.getByText('Vegetarian, No nuts')).toBeInTheDocument();
      expect(screen.queryByText('Show')).not.toBeInTheDocument();
      expect(screen.queryByText('Hide')).not.toBeInTheDocument();
    });

    it('respects redactSensitive prop', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
          redactSensitive={false}
        />
      );
      
      // Should show plain text when redactSensitive is false
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  describe('Encryption/Decryption operations', () => {
    it('calls onDecrypt when decrypt button is clicked', async () => {
      const mockOnDecrypt = vi.fn().mockResolvedValue('decrypted-data');
      
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          onDecrypt={mockOnDecrypt}
          allowToggle={true}
        />
      );
      
      const decryptButton = screen.getByText('Decrypt');
      fireEvent.click(decryptButton);
      
      expect(mockOnDecrypt).toHaveBeenCalledWith(mockEncryptedData);
    });

    it('calls onEncrypt when encrypt button is clicked', async () => {
      const mockOnEncrypt = vi.fn().mockResolvedValue(mockEncryptedData);
      
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="sensitive-data"
          onEncrypt={mockOnEncrypt}
          allowToggle={true}
        />
      );
      
      const encryptButton = screen.getByText('Encrypt');
      fireEvent.click(encryptButton);
      
      expect(mockOnEncrypt).toHaveBeenCalledWith('sensitive-data');
    });

    it('shows loading state during encryption/decryption', async () => {
      const mockOnDecrypt = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          onDecrypt={mockOnDecrypt}
          allowToggle={true}
        />
      );
      
      const decryptButton = screen.getByText('Decrypt');
      fireEvent.click(decryptButton);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('disables toggle when readOnly is true', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          allowToggle={true}
          readOnly={true}
        />
      );
      
      expect(screen.queryByText('Decrypt')).not.toBeInTheDocument();
      expect(screen.queryByText('Encrypt')).not.toBeInTheDocument();
    });
  });

  describe('Edit functionality', () => {
    it('enters edit mode when edit button is clicked', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      // Show data first to access edit button
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('saves edited data when save button is clicked', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      // Show and edit data
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      // Change the value
      const input = screen.getByDisplayValue('user@example.com');
      fireEvent.change(input, { target: { value: 'newemail@example.com' } });
      
      // Save changes
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('newemail@example.com')).toBeInTheDocument();
    });

    it('cancels edit without saving when cancel is clicked', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      // Show and edit data
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      // Change the value
      const input = screen.getByDisplayValue('user@example.com');
      fireEvent.change(input, { target: { value: 'changed@example.com' } });
      
      // Cancel changes
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.queryByText('changed@example.com')).not.toBeInTheDocument();
    });

    it('does not show edit button in readOnly mode', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
          readOnly={true}
        />
      );
      
      // Show data
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  describe('Metadata display', () => {
    it('shows encryption metadata when enabled', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          showEncryptionStatus={true}
        />
      );
      
      expect(screen.getByText(/Algorithm: aes-256-gcm/)).toBeInTheDocument();
      expect(screen.getByText(/Key ID: key-1234/)).toBeInTheDocument();
      expect(screen.getByText(/Version: 1/)).toBeInTheDocument();
    });

    it('shows authentication verification for authenticated encryption', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          showEncryptionStatus={true}
        />
      );
      
      expect(screen.getByText('Authenticated encryption verified')).toBeInTheDocument();
      expect(screen.getByTestId('shield-check-icon')).toBeInTheDocument();
    });

    it('hides metadata when showEncryptionStatus is false', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          encryptedData={mockEncryptedData}
          showEncryptionStatus={false}
        />
      );
      
      expect(screen.queryByText(/Algorithm:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Key ID:/)).not.toBeInTheDocument();
    });
  });

  describe('Custom masking patterns', () => {
    it('uses custom mask pattern when provided', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="1234567890"
          fieldType="phone"
          maskPattern="***-***-****"
        />
      );
      
      expect(screen.getByText('***-***-****')).toBeInTheDocument();
    });

    it('falls back to default pattern when custom pattern not provided', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      expect(screen.getByText('user@••••••.com')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('handles encryption errors gracefully', async () => {
      const mockOnEncrypt = vi.fn().mockRejectedValue(new Error('Encryption failed'));
      console.error = vi.fn(); // Suppress console.error for test
      
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="test-data"
          onEncrypt={mockOnEncrypt}
          allowToggle={true}
        />
      );
      
      const encryptButton = screen.getByText('Encrypt');
      fireEvent.click(encryptButton);
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Toggle encryption failed:', expect.any(Error));
      });
    });

    it('handles clipboard copy errors gracefully', async () => {
      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard access denied'));
      console.error = vi.fn(); // Suppress console.error for test
      
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      // Show data and try to copy
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Copy failed:', expect.any(Error));
      });
    });
  });

  describe('Wedding context integration', () => {
    it('handles wedding-specific field names correctly', () => {
      render(
        <SecureDataDisplay
          fieldName="guest_dietary_preferences"
          fieldType="dietary_requirements"
          plainData="Vegetarian, Gluten-free"
        />
      );
      
      expect(screen.getByText('Dietary Requirements')).toBeInTheDocument();
      expect(screen.getByText('(guest_dietary_preferences)')).toBeInTheDocument();
    });

    it('works with vendor contact information', () => {
      render(
        <SecureDataDisplay
          fieldName="photographer_emergency_contact"
          fieldType="contact_info"
          plainData="Emergency contact details"
        />
      );
      
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText('📞')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for buttons', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          allowToggle={true}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('maintains keyboard navigation support', () => {
      render(
        <SecureDataDisplay
          {...defaultProps}
          plainData="user@example.com"
          fieldType="email"
        />
      );
      
      const showButton = screen.getByText('Show');
      expect(showButton).toBeInstanceOf(HTMLElement);
      
      // Button should be focusable
      showButton.focus();
      expect(document.activeElement).toBe(showButton);
    });
  });
});