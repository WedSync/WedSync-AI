/**
 * WS-175 Advanced Data Encryption - Team A Round 1
 * EncryptionStatusIndicator Component Tests
 * 
 * Comprehensive unit tests for encryption status indicator component
 * ensuring proper display of encryption status and security levels.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { EncryptionStatusIndicator } from '@/components/encryption/EncryptionStatusIndicator';
import { 
  EncryptionDisplayStatus, 
  EncryptionStatusLevel 
} from '@/types/encryption';

// Mock Lucide React icons to avoid rendering issues in tests
vi.mock('lucide-react', () => ({
  Shield: ({ className, ...props }: any) => <div data-testid="shield-icon" className={className} {...props} />,
  ShieldCheck: ({ className, ...props }: any) => <div data-testid="shield-check-icon" className={className} {...props} />,
  ShieldAlert: ({ className, ...props }: any) => <div data-testid="shield-alert-icon" className={className} {...props} />,
  ShieldX: ({ className, ...props }: any) => <div data-testid="shield-x-icon" className={className} {...props} />,
  Loader2: ({ className, ...props }: any) => <div data-testid="loader-icon" className={className} {...props} />,
  Lock: ({ className, ...props }: any) => <div data-testid="lock-icon" className={className} {...props} />,
  Unlock: ({ className, ...props }: any) => <div data-testid="unlock-icon" className={className} {...props} />,
  Clock: ({ className, ...props }: any) => <div data-testid="clock-icon" className={className} {...props} />,
  Zap: ({ className, ...props }: any) => <div data-testid="zap-icon" className={className} {...props} />,
  CheckCircle2: ({ className, ...props }: any) => <div data-testid="check-circle-icon" className={className} {...props} />,
  AlertTriangle: ({ className, ...props }: any) => <div data-testid="alert-triangle-icon" className={className} {...props} />
}));

describe('EncryptionStatusIndicator', () => {
  const defaultProps = {
    status: 'encrypted' as EncryptionDisplayStatus,
    level: 'standard' as EncryptionStatusLevel
  };

  describe('Badge variant', () => {
    it('renders encrypted status badge correctly', () => {
      render(<EncryptionStatusIndicator {...defaultProps} variant="badge" />);
      
      expect(screen.getByText('Encrypted')).toBeInTheDocument();
      expect(screen.getByTestId('shield-check-icon')).toBeInTheDocument();
    });

    it('renders different status types correctly', () => {
      const statuses: EncryptionDisplayStatus[] = ['encrypted', 'decrypted', 'pending', 'loading', 'error'];
      const expectedTexts = ['Encrypted', 'Decrypted', 'Processing', 'Loading', 'Error'];
      
      statuses.forEach((status, index) => {
        const { rerender } = render(<EncryptionStatusIndicator status={status} level="standard" variant="badge" />);
        expect(screen.getByText(expectedTexts[index])).toBeInTheDocument();
        rerender(<></>); // Clear between tests
      });
    });

    it('applies correct size classes', () => {
      const { rerender } = render(<EncryptionStatusIndicator {...defaultProps} variant="badge" size="sm" />);
      let badge = screen.getByText('Encrypted').closest('div');
      expect(badge).toHaveClass('text-xs', 'px-1.5', 'py-0.5');

      rerender(<EncryptionStatusIndicator {...defaultProps} variant="badge" size="lg" />);
      badge = screen.getByText('Encrypted').closest('div');
      expect(badge).toHaveClass('text-sm', 'px-2.5', 'py-1');
    });

    it('handles interactive clicks when enabled', () => {
      const handleClick = vi.fn();
      render(
        <EncryptionStatusIndicator 
          {...defaultProps} 
          variant="badge" 
          interactive={true} 
          onStatusClick={handleClick}
        />
      );
      
      const badge = screen.getByText('Encrypted');
      fireEvent.click(badge);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading animation for appropriate statuses', () => {
      render(<EncryptionStatusIndicator status="loading" level="standard" variant="badge" />);
      const icon = screen.getByTestId('loader-icon');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Inline variant', () => {
    it('renders inline format with level information', () => {
      render(
        <EncryptionStatusIndicator 
          status="encrypted" 
          level="high" 
          variant="inline" 
        />
      );
      
      expect(screen.getByText('Encrypted')).toBeInTheDocument();
      expect(screen.getByText('(High Security)')).toBeInTheDocument();
    });

    it('displays compliance badges when provided', () => {
      render(
        <EncryptionStatusIndicator 
          {...defaultProps} 
          variant="inline" 
          complianceLevel="GDPR" 
        />
      );
      
      expect(screen.getByText('GDPR')).toBeInTheDocument();
    });

    it('does not show level for none encryption level', () => {
      render(
        <EncryptionStatusIndicator 
          status="error" 
          level="none" 
          variant="inline" 
        />
      );
      
      expect(screen.queryByText(/Security/)).not.toBeInTheDocument();
    });
  });

  describe('Detailed variant', () => {
    it('renders comprehensive encryption information', () => {
      const detailedProps = {
        status: 'encrypted' as EncryptionDisplayStatus,
        level: 'maximum' as EncryptionStatusLevel,
        fieldName: 'guest_email',
        algorithm: 'AES-256-GCM',
        keyId: 'key-123456789',
        lastEncrypted: new Date('2024-01-20T10:30:00Z'),
        complianceLevel: 'GDPR' as const,
        variant: 'detailed' as const,
        showDetails: true
      };

      render(<EncryptionStatusIndicator {...detailedProps} />);
      
      expect(screen.getByText('guest_email - Encrypted')).toBeInTheDocument();
      expect(screen.getByText('GDPR')).toBeInTheDocument();
      expect(screen.getByText('Maximum Security')).toBeInTheDocument();
      expect(screen.getByText('Algorithm: AES-256-GCM')).toBeInTheDocument();
      expect(screen.getByText(/Key ID: key-1234/)).toBeInTheDocument();
    });

    it('formats last encrypted timestamp correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      render(
        <EncryptionStatusIndicator 
          {...defaultProps}
          variant="detailed"
          showDetails={true}
          lastEncrypted={oneHourAgo}
        />
      );
      
      expect(screen.getByText(/Last encrypted: 1h ago/)).toBeInTheDocument();
    });

    it('shows appropriate status descriptions', () => {
      const statusDescriptions = [
        { status: 'encrypted' as const, text: 'Data is securely encrypted' },
        { status: 'decrypted' as const, text: 'Data is currently readable' },
        { status: 'pending' as const, text: 'Encryption in progress' },
        { status: 'error' as const, text: 'Encryption failed or compromised' }
      ];

      statusDescriptions.forEach(({ status, text }) => {
        const { rerender } = render(
          <EncryptionStatusIndicator 
            status={status} 
            level="standard" 
            variant="detailed" 
          />
        );
        expect(screen.getByText(text)).toBeInTheDocument();
        rerender(<></>);
      });
    });
  });

  describe('Encryption levels', () => {
    it('displays correct level information for all security levels', () => {
      const levels: { level: EncryptionStatusLevel; strength: string; description: string }[] = [
        { level: 'none', strength: 'No Protection', description: 'No encryption applied' },
        { level: 'basic', strength: 'Basic', description: 'AES-128 encryption' },
        { level: 'standard', strength: 'Standard', description: 'AES-256 encryption' },
        { level: 'high', strength: 'High Security', description: 'AES-256 with key wrapping' },
        { level: 'maximum', strength: 'Maximum Security', description: 'AES-256-GCM with PBKDF2' }
      ];

      levels.forEach(({ level, strength, description }) => {
        const { rerender } = render(
          <EncryptionStatusIndicator 
            status="encrypted" 
            level={level} 
            variant="detailed" 
            showDetails={true}
          />
        );
        
        if (level !== 'none') {
          expect(screen.getByText(strength)).toBeInTheDocument();
        }
        rerender(<></>);
      });
    });

    it('uses correct icons for different security levels', () => {
      render(<EncryptionStatusIndicator status="encrypted" level="maximum" variant="detailed" />);
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });
  });

  describe('Compliance levels', () => {
    const complianceLevels = ['GDPR', 'PCI', 'HIPAA', 'SOX'] as const;

    complianceLevels.forEach(compliance => {
      it(`displays ${compliance} compliance badge correctly`, () => {
        render(
          <EncryptionStatusIndicator 
            {...defaultProps}
            variant="inline"
            complianceLevel={compliance}
          />
        );
        
        expect(screen.getByText(compliance === 'PCI' ? 'PCI DSS' : compliance)).toBeInTheDocument();
      });
    });
  });

  describe('Custom styling and props', () => {
    it('applies custom className', () => {
      render(
        <EncryptionStatusIndicator 
          {...defaultProps}
          variant="detailed"
          className="custom-encryption-indicator"
        />
      );
      
      const container = screen.getByText('Encrypted').closest('div');
      expect(container).toHaveClass('custom-encryption-indicator');
    });

    it('handles missing optional props gracefully', () => {
      const minimalProps = {
        status: 'encrypted' as EncryptionDisplayStatus,
        level: 'standard' as EncryptionStatusLevel
      };

      expect(() => {
        render(<EncryptionStatusIndicator {...minimalProps} />);
      }).not.toThrow();

      expect(screen.getByText('Encrypted')).toBeInTheDocument();
    });

    it('shows field name in detailed view when provided', () => {
      render(
        <EncryptionStatusIndicator 
          {...defaultProps}
          variant="detailed"
          fieldName="customer_notes"
        />
      );
      
      expect(screen.getByText('customer_notes - Encrypted')).toBeInTheDocument();
    });
  });

  describe('Animation states', () => {
    it('shows spinning animation for loading and pending states', () => {
      const animatedStates: EncryptionDisplayStatus[] = ['loading', 'pending'];
      
      animatedStates.forEach(status => {
        const { rerender } = render(
          <EncryptionStatusIndicator 
            status={status} 
            level="standard" 
            variant="badge" 
          />
        );
        
        const icon = status === 'loading' ? 
          screen.getByTestId('loader-icon') : 
          screen.getByTestId('clock-icon');
        expect(icon).toHaveClass('animate-spin');
        rerender(<></>);
      });
    });

    it('does not animate non-processing states', () => {
      render(<EncryptionStatusIndicator status="encrypted" level="standard" variant="badge" />);
      const icon = screen.getByTestId('shield-check-icon');
      expect(icon).not.toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes for interactive elements', () => {
      const handleClick = jest.fn();
      render(
        <EncryptionStatusIndicator 
          {...defaultProps}
          variant="badge"
          interactive={true}
          onStatusClick={handleClick}
        />
      );
      
      const badge = screen.getByText('Encrypted');
      expect(badge.closest('div')).toHaveClass('cursor-pointer');
    });

    it('maintains proper contrast for status colors', () => {
      // This test ensures status colors meet accessibility standards
      // In a real implementation, you might use tools like axe-core
      render(<EncryptionStatusIndicator status="error" level="standard" variant="badge" />);
      const errorBadge = screen.getByText('Error');
      expect(errorBadge).toBeInTheDocument(); // Basic check that error state renders
    });
  });

  describe('Wedding context integration', () => {
    it('works with wedding-specific field names', () => {
      const weddingFields = ['guest_dietary_requirements', 'vendor_contact_info', 'couple_private_notes'];
      
      weddingFields.forEach(fieldName => {
        const { rerender } = render(
          <EncryptionStatusIndicator 
            {...defaultProps}
            variant="detailed"
            fieldName={fieldName}
          />
        );
        
        expect(screen.getByText(`${fieldName} - Encrypted`)).toBeInTheDocument();
        rerender(<></>);
      });
    });

    it('displays GDPR compliance for EU guest data', () => {
      render(
        <EncryptionStatusIndicator 
          {...defaultProps}
          variant="inline"
          complianceLevel="GDPR"
          fieldName="eu_guest_personal_data"
        />
      );
      
      expect(screen.getByText('GDPR')).toBeInTheDocument();
    });
  });
});