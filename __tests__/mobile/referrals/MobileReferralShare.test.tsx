/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import MobileReferralShare from '@/components/mobile/referrals/MobileReferralShare';

// Mock motion library
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, ...props }: any) => (
      <button className={className} {...props}>{children}</button>
    )
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock QR Code component
jest.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value, size, ...props }: any) => (
    <canvas data-testid="qr-code" data-value={value} width={size} height={size} {...props} />
  )
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('MobileReferralShare', () => {
  const mockProps = {
    referralLink: 'https://wedsync.com/join?ref=ABC12345',
    qrCodeUrl: 'data:image/png;base64,mockqrcode',
    supplierName: 'Amazing Wedding Photography',
    customMessage: 'Check out this amazing wedding photographer!',
    vendorId: 'vendor-123',
    referralCode: 'ABC12345'
  };

  const mockNavigator = {
    onLine: true,
    vibrate: jest.fn(),
    share: jest.fn(),
    clipboard: {
      writeText: jest.fn()
    },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: mockNavigator,
      writable: true
    });

    // Mock fetch
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Mock window.open
    Object.defineProperty(window, 'open', {
      value: jest.fn(),
      writable: true
    });
  });

  describe('Rendering', () => {
    it('renders the main share component', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      expect(screen.getByText('Share Your Wedding Portfolio')).toBeInTheDocument();
      expect(screen.getByText(`Help couples discover ${mockProps.supplierName}`)).toBeInTheDocument();
    });

    it('displays share options buttons', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('shows QR code section when expanded', async () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });
    });

    it('displays offline indicator when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      render(<MobileReferralShare {...mockProps} />);
      
      expect(screen.getByText('Limited Connection')).toBeInTheDocument();
      expect(screen.getByText(/You can still share via QR code/)).toBeInTheDocument();
    });
  });

  describe('Native Sharing', () => {
    it('uses native share API when available', async () => {
      mockNavigator.share.mockResolvedValue(undefined);
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockNavigator.share).toHaveBeenCalledWith({
          title: `${mockProps.supplierName} - Wedding Vendor Recommendation`,
          text: expect.stringContaining(mockProps.supplierName),
          url: mockProps.referralLink
        });
      });
    });

    it('falls back to clipboard when native share fails', async () => {
      mockNavigator.share.mockRejectedValue(new Error('Share failed'));
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockNavigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('uses clipboard when native share is not available', async () => {
      delete (mockNavigator as any).share;
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Copy Link');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockNavigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe('Platform-Specific Sharing', () => {
    it('opens WhatsApp with correct URL', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open');
      
      render(<MobileReferralShare {...mockProps} />);
      
      const whatsappButton = screen.getByText('WhatsApp');
      fireEvent.click(whatsappButton);
      
      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith(
          expect.stringContaining('https://wa.me/?text='),
          '_blank'
        );
      });
    });

    it('opens SMS with correct URL on iOS', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open');
      
      render(<MobileReferralShare {...mockProps} />);
      
      const smsButton = screen.getByText('SMS');
      fireEvent.click(smsButton);
      
      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith(
          expect.stringContaining('sms:?body='),
          '_blank'
        );
      });
    });

    it('opens email with correct subject and body', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open');
      
      render(<MobileReferralShare {...mockProps} />);
      
      const emailButton = screen.getByText('Email');
      fireEvent.click(emailButton);
      
      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith(
          expect.stringMatching(/^mailto:\?subject=.*&body=/),
          '_blank'
        );
      });
    });
  });

  describe('Touch Optimization', () => {
    it('applies touch-friendly button styling', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      expect(shareButton).toHaveStyle({ 
        minHeight: '48px',
        minWidth: '48px',
        touchAction: 'manipulation'
      });
    });

    it('triggers haptic feedback on iOS devices', async () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      expect(mockNavigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('handles large touch targets for venue use', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButtons = screen.getAllByRole('button');
      shareButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(48);
      });
    });
  });

  describe('QR Code Functionality', () => {
    it('generates QR code with correct referral link', async () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      await waitFor(() => {
        const qrCode = screen.getByTestId('qr-code');
        expect(qrCode).toHaveAttribute('data-value', mockProps.referralLink);
      });
    });

    it('allows saving QR code to photos', async () => {
      // Mock canvas and blob API
      const mockCanvas = {
        toBlob: jest.fn((callback) => {
          callback(new Blob(['mock-image-data'], { type: 'image/png' }));
        })
      };
      
      jest.spyOn(document, 'querySelector').mockReturnValue(mockCanvas as any);
      
      render(<MobileReferralShare {...mockProps} />);
      
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save to Photos');
        fireEvent.click(saveButton);
        
        expect(mockCanvas.toBlob).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks share attempts', async () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/referrals/track-share',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('native_share')
          })
        );
      });
    });

    it('tracks different sharing methods', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open');
      
      render(<MobileReferralShare {...mockProps} />);
      
      const whatsappButton = screen.getByText('WhatsApp');
      fireEvent.click(whatsappButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/referrals/track-share',
          expect.objectContaining({
            body: expect.stringContaining('whatsapp')
          })
        );
      });
    });

    it('includes network type in tracking', async () => {
      // Mock connection API
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g' },
        writable: true
      });
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/referrals/track-share',
          expect.objectContaining({
            body: expect.stringContaining('4g')
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles share API failures gracefully', async () => {
      mockNavigator.share.mockRejectedValue(new Error('Share failed'));
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      // Should not crash and should still show UI
      await waitFor(() => {
        expect(screen.getByText('Share Your Wedding Portfolio')).toBeInTheDocument();
      });
    });

    it('handles network failures during tracking', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      mockNavigator.share.mockResolvedValue(undefined);
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      // Should still work even if tracking fails
      await waitFor(() => {
        expect(mockNavigator.share).toHaveBeenCalled();
      });
    });

    it('displays appropriate error messages', async () => {
      const { toast } = require('sonner');
      mockNavigator.share.mockRejectedValue(new Error('Share failed'));
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      expect(shareButton).toBeInTheDocument();
      expect(shareButton.closest('button')).toHaveAttribute('type', 'button');
    });

    it('maintains focus management for keyboard navigation', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      shareButton.focus();
      expect(document.activeElement).toBe(shareButton);
    });

    it('provides sufficient color contrast for venue lighting', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      // Verify high contrast styling is applied
      const container = screen.getByText('Share Your Wedding Portfolio').closest('div');
      expect(container).toHaveClass('bg-gradient-to-r', 'from-rose-400', 'to-pink-600');
    });
  });

  describe('Performance', () => {
    it('debounces rapid button clicks', async () => {
      jest.useFakeTimers();
      
      render(<MobileReferralShare {...mockProps} />);
      
      const shareButton = screen.getByText('Share');
      
      // Rapid clicks
      fireEvent.click(shareButton);
      fireEvent.click(shareButton);
      fireEvent.click(shareButton);
      
      act(() => {
        jest.runAllTimers();
      });
      
      // Should only call share once despite multiple clicks
      expect(mockNavigator.share).toHaveBeenCalledTimes(1);
      
      jest.useRealTimers();
    });

    it('optimizes rendering for slow devices', () => {
      // Mock slow device conditions
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 });
      Object.defineProperty(navigator, 'deviceMemory', { value: 2 });
      
      render(<MobileReferralShare {...mockProps} />);
      
      // Component should still render without issues
      expect(screen.getByText('Share Your Wedding Portfolio')).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Specific Features', () => {
    it('includes wedding-themed emoji and messaging', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      expect(screen.getByText(/💍/)).toBeInTheDocument();
      expect(screen.getByText(/wedding/i)).toBeInTheDocument();
    });

    it('optimizes for venue WiFi conditions', () => {
      // Mock poor connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: 'slow-2g', downlink: 0.5 },
        writable: true
      });
      
      render(<MobileReferralShare {...mockProps} />);
      
      // Should show appropriate messaging for poor connection
      expect(screen.getByText(/Works perfectly at wedding venues/)).toBeInTheDocument();
    });

    it('handles outdoor venue lighting considerations', () => {
      render(<MobileReferralShare {...mockProps} />);
      
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      // QR code should have high contrast styling
      const qrContainer = screen.getByTestId('qr-code').closest('div');
      expect(qrContainer).toHaveClass('border-2', 'border-rose-200');
    });
  });
});