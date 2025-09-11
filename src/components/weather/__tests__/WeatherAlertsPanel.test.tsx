import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeatherAlertsPanel } from '../WeatherAlertsPanel';
import { WeatherNotification } from '@/types/weather';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Untitled UI components
jest.mock('@/components/untitled-ui', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  Badge: ({
    children,
    className,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" className={className} data-variant={variant}>
      {children}
    </span>
  ),
  Button: ({ children, onClick, variant, size, disabled }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

const mockAlerts: WeatherNotification[] = [
  {
    id: 'alert-1',
    weddingId: 'test-wedding-123',
    type: 'alert',
    severity: 'critical',
    title: 'Severe Storm Warning',
    message:
      'Thunderstorm with heavy rain and strong winds expected during ceremony time',
    weatherData: {
      temp: 15,
      pop: 0.9,
      wind_speed: 45,
    },
    timestamp: '2025-01-30T08:00:00Z',
    recipient: 'bride@example.com',
    channel: 'email',
    acknowledged: false,
  },
  {
    id: 'alert-2',
    weddingId: 'test-wedding-123',
    type: 'forecast',
    severity: 'warning',
    title: 'High Wind Advisory',
    message: 'Strong winds may affect outdoor decorations',
    weatherData: {
      wind_speed: 30,
      wind_gust: 40,
    },
    timestamp: '2025-01-30T09:00:00Z',
    recipient: 'groom@example.com',
    channel: 'sms',
    acknowledged: false,
  },
  {
    id: 'alert-3',
    weddingId: 'test-wedding-123',
    type: 'reminder',
    severity: 'info',
    title: 'Weather Update',
    message: 'Clear skies expected for your wedding day',
    weatherData: {
      temp: 22,
      pop: 0.1,
    },
    timestamp: '2025-01-30T10:00:00Z',
    recipient: 'planner@example.com',
    channel: 'web',
    acknowledged: true,
    acknowledgedAt: '2025-01-30T10:30:00Z',
    acknowledgedBy: 'wedding-planner',
  },
  {
    id: 'alert-4',
    weddingId: 'test-wedding-123',
    type: 'escalation',
    severity: 'error',
    title: 'Temperature Alert',
    message: 'Unusually hot weather expected',
    weatherData: {
      temp: 38,
      feels_like: 42,
    },
    timestamp: '2025-01-30T11:00:00Z',
    recipient: 'coordinator@example.com',
    channel: 'push',
    acknowledged: false,
  },
];

const mockProps = {
  alerts: mockAlerts,
  weddingId: 'test-wedding-123',
  onAlertsUpdated: jest.fn(),
};

describe('WeatherAlertsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('renders alerts panel with correct header stats', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    expect(screen.getByText('Weather Alerts')).toBeInTheDocument();
    expect(screen.getByText('3 unread')).toBeInTheDocument();
    expect(screen.getByText('1 critical')).toBeInTheDocument();
  });

  it('displays filter tabs with correct counts', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    expect(screen.getByText('All (4)')).toBeInTheDocument();
    expect(screen.getByText('Unread (3)')).toBeInTheDocument();
    expect(screen.getByText('Critical (1)')).toBeInTheDocument();
  });

  it('shows Mark All Read button when there are unread alerts', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    expect(screen.getByText('Mark All Read')).toBeInTheDocument();
  });

  it('hides Mark All Read button when no unread alerts', () => {
    const allReadAlerts = mockAlerts.map((alert) => ({
      ...alert,
      acknowledged: true,
    }));

    render(<WeatherAlertsPanel {...mockProps} alerts={allReadAlerts} />);

    expect(screen.queryByText('Mark All Read')).not.toBeInTheDocument();
  });

  it('displays all alert information correctly', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    // Check alert titles
    expect(screen.getByText('Severe Storm Warning')).toBeInTheDocument();
    expect(screen.getByText('High Wind Advisory')).toBeInTheDocument();
    expect(screen.getByText('Weather Update')).toBeInTheDocument();
    expect(screen.getByText('Temperature Alert')).toBeInTheDocument();

    // Check alert messages
    expect(
      screen.getByText(
        'Thunderstorm with heavy rain and strong winds expected during ceremony time',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Strong winds may affect outdoor decorations'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Clear skies expected for your wedding day'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Unusually hot weather expected'),
    ).toBeInTheDocument();
  });

  it('displays severity badges with correct colors', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    const criticalBadge = screen.getByText('critical');
    expect(criticalBadge).toHaveClass('bg-red-50 border-red-200 text-red-800');

    const warningBadge = screen.getByText('warning');
    expect(warningBadge).toHaveClass(
      'bg-yellow-50 border-yellow-200 text-yellow-800',
    );

    const infoBadge = screen.getByText('info');
    expect(infoBadge).toHaveClass('bg-blue-50 border-blue-200 text-blue-800');

    const errorBadge = screen.getByText('error');
    expect(errorBadge).toHaveClass(
      'bg-orange-50 border-orange-200 text-orange-800',
    );
  });

  it('displays channel badges correctly', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('sms')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('push')).toBeInTheDocument();
  });

  it('shows weather data when available', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    expect(screen.getByText('Temp: 15°C')).toBeInTheDocument();
    expect(screen.getByText('Rain: 90%')).toBeInTheDocument();
    expect(screen.getByText('Wind: 45 km/h')).toBeInTheDocument();

    expect(screen.getByText('Temp: 22°C')).toBeInTheDocument();
    expect(screen.getByText('Rain: 10%')).toBeInTheDocument();

    expect(screen.getByText('Temp: 38°C')).toBeInTheDocument();
  });

  it('shows acknowledged status for read alerts', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    expect(
      screen.getByText(/Acknowledged.*10:30.*by wedding-planner/),
    ).toBeInTheDocument();
  });

  it('filters alerts by unread status', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    // Click unread filter
    fireEvent.click(screen.getByText('Unread (3)'));

    // Should show 3 unread alerts
    expect(screen.getByText('Severe Storm Warning')).toBeInTheDocument();
    expect(screen.getByText('High Wind Advisory')).toBeInTheDocument();
    expect(screen.getByText('Temperature Alert')).toBeInTheDocument();

    // Should not show acknowledged alert
    expect(screen.queryByText('Weather Update')).not.toBeInTheDocument();
  });

  it('filters alerts by critical severity', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    // Click critical filter
    fireEvent.click(screen.getByText('Critical (1)'));

    // Should show only critical alert
    expect(screen.getByText('Severe Storm Warning')).toBeInTheDocument();

    // Should not show other alerts
    expect(screen.queryByText('High Wind Advisory')).not.toBeInTheDocument();
    expect(screen.queryByText('Weather Update')).not.toBeInTheDocument();
    expect(screen.queryByText('Temperature Alert')).not.toBeInTheDocument();
  });

  it('acknowledges individual alert successfully', async () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/weather/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'acknowledge',
          notificationId: 'alert-1',
          userId: 'current-user',
        }),
      });
    });

    await waitFor(() => {
      expect(mockProps.onAlertsUpdated).toHaveBeenCalled();
    });
  });

  it('marks all alerts as read successfully', async () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    fireEvent.click(screen.getByText('Mark All Read'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/weather/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllRead',
          weddingId: 'test-wedding-123',
        }),
      });
    });

    await waitFor(() => {
      expect(mockProps.onAlertsUpdated).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully when acknowledging alerts', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(<WeatherAlertsPanel {...mockProps} />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error acknowledging alert:',
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it('shows loading state when acknowledging alerts', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<WeatherAlertsPanel {...mockProps} />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    expect(screen.getByText('Acknowledging...')).toBeInTheDocument();
  });

  it('shows loading state when marking all as read', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<WeatherAlertsPanel {...mockProps} />);

    fireEvent.click(screen.getByText('Mark All Read'));

    expect(screen.getByText('Marking...')).toBeInTheDocument();
  });

  it('displays empty state when no alerts match filter', () => {
    render(<WeatherAlertsPanel {...mockProps} alerts={[]} />);

    expect(screen.getByText('No alerts')).toBeInTheDocument();
    expect(
      screen.getByText('No weather alerts for this wedding yet.'),
    ).toBeInTheDocument();
  });

  it('displays empty state for unread filter when all are acknowledged', () => {
    const allReadAlerts = mockAlerts.map((alert) => ({
      ...alert,
      acknowledged: true,
    }));

    render(<WeatherAlertsPanel {...mockProps} alerts={allReadAlerts} />);

    fireEvent.click(screen.getByText('Unread (0)'));

    expect(screen.getByText('No unread alerts')).toBeInTheDocument();
    expect(
      screen.getByText('All alerts have been acknowledged.'),
    ).toBeInTheDocument();
  });

  it('displays empty state for critical filter when no critical alerts', () => {
    const nonCriticalAlerts = mockAlerts.filter(
      (alert) => alert.severity !== 'critical',
    );

    render(<WeatherAlertsPanel {...mockProps} alerts={nonCriticalAlerts} />);

    fireEvent.click(screen.getByText('Critical (0)'));

    expect(screen.getByText('No critical alerts')).toBeInTheDocument();
    expect(
      screen.getByText('No critical weather alerts at this time.'),
    ).toBeInTheDocument();
  });

  it('provides view all alerts button in empty state', () => {
    const allReadAlerts = mockAlerts.map((alert) => ({
      ...alert,
      acknowledged: true,
    }));

    render(<WeatherAlertsPanel {...mockProps} alerts={allReadAlerts} />);

    fireEvent.click(screen.getByText('Unread (0)'));

    const viewAllButton = screen.getByText('View All Alerts');
    expect(viewAllButton).toBeInTheDocument();

    fireEvent.click(viewAllButton);

    // Should show all alerts again
    expect(screen.getByText('Weather Update')).toBeInTheDocument();
  });

  it('highlights unread alerts with special styling', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    const cards = screen.getAllByTestId('card');

    // First 3 cards should be unread (have ring styling)
    expect(cards[0]).toHaveClass('ring-1 ring-blue-200 bg-blue-50/30');
    expect(cards[1]).toHaveClass('ring-1 ring-blue-200 bg-blue-50/30');
    expect(cards[2]).not.toHaveClass('ring-1 ring-blue-200 bg-blue-50/30'); // This is acknowledged
    expect(cards[3]).toHaveClass('ring-1 ring-blue-200 bg-blue-50/30');
  });

  it('formats timestamps correctly', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    // Check if timestamps are displayed (exact format may vary by locale)
    expect(screen.getByText(/1\/30\/2025.*8:00/)).toBeInTheDocument();
    expect(screen.getByText(/1\/30\/2025.*9:00/)).toBeInTheDocument();
    expect(screen.getByText(/1\/30\/2025.*10:00/)).toBeInTheDocument();
    expect(screen.getByText(/1\/30\/2025.*11:00/)).toBeInTheDocument();
  });

  it('disables acknowledge button for already acknowledged alerts', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    // The acknowledged alert shouldn't have an acknowledge button
    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    expect(acknowledgeButtons).toHaveLength(3); // Only 3 unacknowledged alerts
  });

  it('displays severity icons correctly', () => {
    render(<WeatherAlertsPanel {...mockProps} />);

    // Should render appropriate icons for different severities
    const severityIcons = screen.container.querySelectorAll('svg');
    expect(severityIcons.length).toBeGreaterThan(0);
  });

  it('handles missing weather data gracefully', () => {
    const alertsWithoutWeatherData = mockAlerts.map((alert) => ({
      ...alert,
      weatherData: {},
    }));

    render(
      <WeatherAlertsPanel {...mockProps} alerts={alertsWithoutWeatherData} />,
    );

    // Should still render alerts without weather data
    expect(screen.getByText('Severe Storm Warning')).toBeInTheDocument();
    expect(screen.getByText('High Wind Advisory')).toBeInTheDocument();
  });

  it('updates filter counts when alerts are acknowledged', async () => {
    const { rerender } = render(<WeatherAlertsPanel {...mockProps} />);

    // Initial counts
    expect(screen.getByText('3 unread')).toBeInTheDocument();
    expect(screen.getByText('1 critical')).toBeInTheDocument();

    // Acknowledge the critical alert
    const updatedAlerts = mockAlerts.map((alert) =>
      alert.id === 'alert-1'
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedAt: '2025-01-30T12:00:00Z',
          }
        : alert,
    );

    rerender(<WeatherAlertsPanel {...mockProps} alerts={updatedAlerts} />);

    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.queryByText('1 critical')).not.toBeInTheDocument(); // No critical badge when no unread critical alerts
  });
});
