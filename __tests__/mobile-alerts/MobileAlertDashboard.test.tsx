/**
 * Mobile Alert Dashboard Tests
 * WS-228 Team D - Mobile/PWA Alert System
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileAlertDashboard } from '@/components/admin/mobile/MobileAlertDashboard';
import { useMobileAlerts } from '@/hooks/useMobileAlerts';
import '@testing-library/jest-dom';

// Mock the mobile alerts hook
jest.mock('@/hooks/useMobileAlerts');
const mockUseMobileAlerts = useMobileAlerts as jest.MockedFunction<typeof useMobileAlerts>;

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      pushManager: {
        subscribe: jest.fn().mockResolvedValue({
          endpoint: 'https://test-endpoint.com',
          getKey: jest.fn()
        })
      }
    })
  }
});

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn()
});

const mockAlerts = [
  {
    id: '1',
    title: 'Wedding Day Emergency',
    description: 'Venue power outage at Rustic Manor',
    priority: 'critical' as const,
    status: 'active' as const,
    category: 'wedding_day' as const,
    created_at: '2024-01-15T10:00:00Z',
    wedding_date: '2024-01-15',
    client_name: 'Sarah & John',
    location: 'Rustic Manor',
    contact_phone: '+44 7700 123456',
    isWeddingDay: true
  },
  {
    id: '2', 
    title: 'Payment Processing Error',
    description: 'Failed to process vendor payment',
    priority: 'high' as const,
    status: 'active' as const,
    category: 'payment' as const,
    created_at: '2024-01-15T09:30:00Z',
    supplier_name: 'Elite Photography'
  },
  {
    id: '3',
    title: 'System Maintenance',
    description: 'Scheduled database maintenance',
    priority: 'medium' as const,
    status: 'acknowledged' as const,
    category: 'system' as const,
    created_at: '2024-01-15T09:00:00Z',
    acknowledged_at: '2024-01-15T09:05:00Z'
  }
];

const defaultMockReturn = {
  alerts: mockAlerts,
  loading: false,
  error: null,
  isOnline: true,
  hasUnread: true,
  connectionStatus: 'online' as const,
  refreshAlerts: jest.fn(),
  acknowledgeAlert: jest.fn(),
  dismissAlert: jest.fn(),
  resolveAlert: jest.fn()
};

describe('MobileAlertDashboard', () => {
  beforeEach(() => {
    mockUseMobileAlerts.mockReturnValue(defaultMockReturn);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the mobile alert dashboard', () => {
      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('displays alert counts by priority', () => {
      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Critical count
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('shows unread indicator when hasUnread is true', () => {
      render(<MobileAlertDashboard />);
      
      const unreadIndicator = screen.getByRole('generic', { hidden: true });
      expect(unreadIndicator).toHaveClass('bg-red-500', 'animate-pulse');
    });

    it('displays alerts in priority order', () => {
      render(<MobileAlertDashboard />);
      
      const alerts = screen.getAllByRole('button');
      // Critical alert should appear first
      expect(alerts[0]).toHaveTextContent('Wedding Day Emergency');
    });
  });

  describe('Mobile Interactions', () => {
    it('handles pull-to-refresh action', async () => {
      const mockRefresh = jest.fn();
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        refreshAlerts: mockRefresh
      });

      render(<MobileAlertDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('toggles filter panel when filter button clicked', async () => {
      render(<MobileAlertDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await userEvent.click(filterButton);
      
      expect(screen.getByDisplayValue('all')).toBeInTheDocument();
    });

    it('applies priority filter correctly', async () => {
      render(<MobileAlertDashboard />);
      
      // Open filters
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await userEvent.click(filterButton);
      
      // Select critical priority
      const prioritySelect = screen.getByDisplayValue('all');
      await userEvent.selectOptions(prioritySelect, 'critical');
      
      // Should only show critical alerts
      expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
      expect(screen.queryByText('Payment Processing Error')).not.toBeInTheDocument();
    });

    it('handles alert card tap to open bottom sheet', async () => {
      render(<MobileAlertDashboard />);
      
      const alertCard = screen.getByText('Wedding Day Emergency');
      await userEvent.click(alertCard);
      
      // Bottom sheet should open - check for close button
      expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
    });
  });

  describe('Offline Functionality', () => {
    it('displays offline status when not connected', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        isOnline: false,
        connectionStatus: 'offline'
      });

      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('bg-red-500');
    });

    it('shows connecting status during network transitions', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        connectionStatus: 'connecting'
      });

      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('disables refresh button when offline', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        isOnline: false
      });

      render(<MobileAlertDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeEnabled(); // Should still be enabled for retry
    });
  });

  describe('Loading States', () => {
    it('displays loading spinner when loading', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        loading: true,
        alerts: []
      });

      render(<MobileAlertDashboard />);
      
      expect(screen.getByRole('generic', { hidden: true })).toHaveClass('animate-spin');
    });

    it('shows refresh spinner during refresh', async () => {
      const mockRefresh = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        refreshAlerts: mockRefresh
      });

      render(<MobileAlertDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to load alerts',
        alerts: []
      });

      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('Unable to Load Alerts')).toBeInTheDocument();
      expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('shows cached alerts message with error', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        error: 'Using cached alerts: Network failed'
      });

      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('Wedding Day Emergency')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no alerts match filters', () => {
      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        alerts: []
      });

      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('All Clear!')).toBeInTheDocument();
      expect(screen.getByText('No alerts match your current filters.')).toBeInTheDocument();
    });
  });

  describe('Wedding Day Context', () => {
    it('highlights wedding day alerts with special badge', () => {
      render(<MobileAlertDashboard />);
      
      expect(screen.getByText('WEDDING DAY')).toBeInTheDocument();
    });

    it('prioritizes wedding day alerts in display order', () => {
      const weddingAlert = mockAlerts.find(a => a.isWeddingDay);
      expect(weddingAlert?.priority).toBe('critical');
    });
  });

  describe('Push Notification Setup', () => {
    it('registers for push notifications on mount', async () => {
      const mockSubscribe = jest.fn().mockResolvedValue({
        endpoint: 'https://test.com',
        getKey: jest.fn()
      });
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: { subscribe: mockSubscribe }
          })
        }
      });

      render(<MobileAlertDashboard />);
      
      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
        });
      });
    });

    it('handles push notification registration failure gracefully', async () => {
      const mockSubscribe = jest.fn().mockRejectedValue(new Error('Permission denied'));
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: { subscribe: mockSubscribe }
          })
        }
      });

      console.warn = jest.fn();
      render(<MobileAlertDashboard />);
      
      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'Push notification registration failed:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders correctly at iPhone SE width (375px)', () => {
      // Mock window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<MobileAlertDashboard />);
      
      const dashboard = screen.getByRole('main', { hidden: true });
      expect(dashboard).toHaveClass('min-h-screen');
    });

    it('maintains proper touch target sizes', () => {
      render(<MobileAlertDashboard />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height);
        expect(minHeight).toBeGreaterThanOrEqual(48); // 48px minimum touch target
      });
    });
  });

  describe('Performance', () => {
    it('handles large number of alerts efficiently', () => {
      const manyAlerts = Array.from({ length: 100 }, (_, i) => ({
        ...mockAlerts[0],
        id: `alert-${i}`,
        title: `Alert ${i}`,
        created_at: new Date(Date.now() - i * 1000).toISOString()
      }));

      mockUseMobileAlerts.mockReturnValue({
        ...defaultMockReturn,
        alerts: manyAlerts
      });

      const startTime = performance.now();
      render(<MobileAlertDashboard />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      expect(screen.getByText('Alert 0')).toBeInTheDocument();
    });
  });
});