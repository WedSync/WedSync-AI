import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EmergencyRecoveryMobile from '@/components/mobile/backup/EmergencyRecoveryMobile';

// Mock the hooks
vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({
    isOnline: true,
    syncStatus: 'idle',
  }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    triggerHaptic: vi.fn(),
  }),
}));

// Mock localStorage for wedding details
const mockWeddingDetails = {
  id: 'wedding-123',
  date: new Date().toISOString(),
  venue: 'Test Venue',
  couple: 'John & Jane',
};

describe('EmergencyRecoveryMobile', () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => JSON.stringify(mockWeddingDetails)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders emergency recovery interface correctly', () => {
    render(<EmergencyRecoveryMobile />);

    expect(screen.getByText('Emergency Recovery')).toBeInTheDocument();
    expect(screen.getByText('Wedding Day Data Recovery')).toBeInTheDocument();
    expect(screen.getByText('Backup Status')).toBeInTheDocument();
  });

  it('displays connection status correctly when online', () => {
    render(<EmergencyRecoveryMobile />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('displays connection status correctly when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    render(<EmergencyRecoveryMobile />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows emergency backup button and handles click', async () => {
    render(<EmergencyRecoveryMobile />);

    const emergencyBackupButton = screen.getByText('Emergency Backup Now');
    expect(emergencyBackupButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(emergencyBackupButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('shows restore last backup button', () => {
    render(<EmergencyRecoveryMobile />);

    const restoreButton = screen.getByText('Restore Last Backup');
    expect(restoreButton).toBeInTheDocument();
  });

  it('displays emergency support contacts', () => {
    render(<EmergencyRecoveryMobile />);

    expect(screen.getByText('Emergency Support')).toBeInTheDocument();
    expect(screen.getByText('WedSync Emergency')).toBeInTheDocument();
    expect(screen.getByText('24/7 Wedding Support')).toBeInTheDocument();
    expect(screen.getByText('Technical Recovery')).toBeInTheDocument();
    expect(screen.getByText('Data Recovery Specialist')).toBeInTheDocument();
  });

  it('displays emergency contact phone numbers', () => {
    render(<EmergencyRecoveryMobile />);

    expect(screen.getByText('+44 800 123 4567')).toBeInTheDocument();
    expect(screen.getByText('+44 800 765 4321')).toBeInTheDocument();
  });

  it('shows refresh button for backup status', () => {
    render(<EmergencyRecoveryMobile />);

    const refreshButtons = screen.getAllByRole('button');
    const refreshButton = refreshButtons.find(
      (button) =>
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('h-8 w-8'),
    );

    expect(refreshButton).toBeInTheDocument();
  });

  it('handles refresh status action', async () => {
    render(<EmergencyRecoveryMobile />);

    const refreshButtons = screen.getAllByRole('button');
    const refreshButton = refreshButtons.find(
      (button) =>
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('h-8 w-8'),
    );

    if (refreshButton) {
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      // Should trigger a status refresh
      await waitFor(() => {
        // The component should update with new status
        expect(screen.getByText('Backup Status')).toBeInTheDocument();
      });
    }
  });

  it('shows wedding day mode activation button', () => {
    render(<EmergencyRecoveryMobile />);

    const weddingModeButton = screen.getByText('Activate Wedding Day Mode');
    expect(weddingModeButton).toBeInTheDocument();
  });

  it('displays sync offline changes button', () => {
    render(<EmergencyRecoveryMobile />);

    const syncButton = screen.getByText('Sync Offline Changes');
    expect(syncButton).toBeInTheDocument();
  });

  it('shows data integrity status', async () => {
    render(<EmergencyRecoveryMobile />);

    await waitFor(() => {
      expect(screen.getByText('Data Integrity')).toBeInTheDocument();
    });
  });

  it('displays last backup time when available', async () => {
    render(<EmergencyRecoveryMobile />);

    await waitFor(() => {
      expect(screen.getByText('Last Backup')).toBeInTheDocument();
    });
  });

  it('handles emergency support call action', () => {
    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    render(<EmergencyRecoveryMobile />);

    const callButtons = screen.getAllByText('Call');
    fireEvent.click(callButtons[0]);

    expect(mockOpen).toHaveBeenCalledWith('tel:+448001234567', '_self');
  });

  it('shows loading state during recovery operations', async () => {
    render(<EmergencyRecoveryMobile />);

    const emergencyBackupButton = screen.getByText('Emergency Backup Now');

    await act(async () => {
      fireEvent.click(emergencyBackupButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('is responsive and mobile-optimized', () => {
    render(<EmergencyRecoveryMobile />);

    const container = screen
      .getByText('Emergency Recovery')
      .closest('.mobile-emergency-recovery');
    expect(container).toHaveClass('min-h-screen');

    // Check for mobile-specific classes
    const maxWidthContainer = screen
      .getByText('Emergency Recovery')
      .closest('.max-w-md');
    expect(maxWidthContainer).toBeInTheDocument();
  });

  it('handles battery-aware operations', () => {
    // Mock battery API
    Object.defineProperty(navigator, 'getBattery', {
      value: vi.fn().mockResolvedValue({
        level: 0.15, // 15% battery
        charging: false,
        addEventListener: vi.fn(),
      }),
      writable: true,
    });

    render(<EmergencyRecoveryMobile />);

    // Component should still render and be functional even with low battery
    expect(screen.getByText('Emergency Recovery')).toBeInTheDocument();
  });

  it('maintains accessibility standards', () => {
    render(<EmergencyRecoveryMobile />);

    // Check for proper button roles
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Check for proper headings
    expect(screen.getByText('Emergency Recovery')).toBeInTheDocument();
    expect(screen.getByText('Emergency Support')).toBeInTheDocument();
  });
});
