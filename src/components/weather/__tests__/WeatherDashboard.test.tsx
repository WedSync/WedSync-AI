import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeatherDashboard } from '../WeatherDashboard';
import {
  WeddingWeatherData,
  WeatherAnalytics,
  WeatherNotification,
} from '@/types/weather';

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
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
  Button: ({ children, onClick, variant, size, className, disabled }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

// Mock child components
jest.mock('../WeatherForecastWidget', () => ({
  WeatherForecastWidget: ({
    dailyForecast,
    hourlyForecast,
    weddingDate,
  }: any) => (
    <div data-testid="weather-forecast-widget">
      Mock WeatherForecastWidget - {dailyForecast?.length || 0} days,{' '}
      {hourlyForecast?.length || 0} hours
    </div>
  ),
}));

jest.mock('../WeatherAlertsPanel', () => ({
  WeatherAlertsPanel: ({ alerts, weddingId, onAlertsUpdated }: any) => (
    <div data-testid="weather-alerts-panel">
      Mock WeatherAlertsPanel - {alerts?.length || 0} alerts for {weddingId}
    </div>
  ),
}));

const mockProps = {
  weddingId: 'test-wedding-123',
  venue: {
    name: 'Test Venue',
    lat: 51.5074,
    lon: -0.1278,
    address: '123 Test St, London',
  },
  weddingDate: '2025-06-15T14:00:00Z',
  isOutdoor: true,
};

const mockWeatherData: WeddingWeatherData = {
  id: 'weather-test-123',
  weddingId: 'test-wedding-123',
  venue: mockProps.venue,
  current: {
    dt: 1718384000,
    sunrise: 1718341200,
    sunset: 1718394000,
    temp: 22.5,
    feels_like: 24.0,
    pressure: 1013,
    humidity: 65,
    dew_point: 15.8,
    uvi: 6.2,
    clouds: 30,
    visibility: 10000,
    wind_speed: 12.5,
    wind_deg: 180,
    wind_gust: 18.0,
    weather: [
      {
        id: 801,
        main: 'Clouds',
        description: 'few clouds',
        icon: '02d',
      },
    ],
  },
  hourlyForecast: [
    {
      dt: 1718384000,
      temp: 22.5,
      feels_like: 24.0,
      pressure: 1013,
      humidity: 65,
      dew_point: 15.8,
      uvi: 6.2,
      clouds: 30,
      visibility: 10000,
      wind_speed: 12.5,
      wind_deg: 180,
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
      pop: 0.1,
    },
  ],
  dailyForecast: [
    {
      dt: 1718320800,
      sunrise: 1718341200,
      sunset: 1718394000,
      moonrise: 1718350000,
      moonset: 1718400000,
      moon_phase: 0.5,
      summary: 'Pleasant day with few clouds',
      temp: {
        day: 22.5,
        min: 15.0,
        max: 25.0,
        night: 18.0,
        eve: 21.0,
        morn: 16.0,
      },
      feels_like: {
        day: 24.0,
        night: 19.0,
        eve: 22.0,
        morn: 17.0,
      },
      pressure: 1013,
      humidity: 65,
      dew_point: 15.8,
      wind_speed: 12.5,
      wind_deg: 180,
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
      clouds: 30,
      pop: 0.1,
      uvi: 6.2,
    },
  ],
  alerts: [],
  weddingDate: '2025-06-15T14:00:00Z',
  isOutdoor: true,
  weatherDependentEvents: ['ceremony', 'photography'],
  backupPlans: [],
  settings: {
    alertThresholds: {
      precipitation: 0.7,
      windSpeed: 25,
      temperature: { min: 10, max: 35 },
      visibility: 1000,
      uvIndex: 8,
    },
    notifications: {
      email: true,
      sms: true,
      push: true,
      webNotifications: true,
    },
    checkFrequency: 'every6h',
    leadTime: { minHours: 24, maxDays: 14 },
    autoTriggerBackups: false,
  },
  lastUpdated: '2025-01-30T10:00:00Z',
  cacheExpiry: '2025-01-30T11:00:00Z',
};

const mockAnalytics: WeatherAnalytics = {
  weddingId: 'test-wedding-123',
  venue: {
    name: 'Test Venue',
    coordinates: { lat: 51.5074, lon: -0.1278 },
  },
  weddingDate: '2025-06-15T14:00:00Z',
  risk: {
    overall: 'low',
    precipitation: 20,
    temperature: 15,
    wind: 25,
    visibility: 10,
  },
  recommendations: [
    {
      type: 'equipment',
      title: 'Consider backup tent',
      description: 'Weather looks good but have a backup plan',
      priority: 'low',
      estimatedCost: 200,
      implementationTime: 120,
      affectedEvents: ['ceremony'],
    },
  ],
  optimalScheduling: {
    ceremony: '14:00',
    photography: ['10:00', '16:00'],
    reception: '18:00',
  },
  historicalContext: {
    month: 6,
    day: 15,
    historicalData: {
      avgTemp: 20,
      avgHumidity: 65,
      avgPrecipitation: 0.2,
      avgWindSpeed: 15,
      commonConditions: ['clear', 'partly cloudy'],
      extremeEvents: [],
    },
    confidence: 0.8,
    yearsOfData: 10,
  },
  confidence: 0.85,
};

const mockAlerts: WeatherNotification[] = [
  {
    id: 'alert-1',
    weddingId: 'test-wedding-123',
    type: 'alert',
    severity: 'warning',
    title: 'Wind Warning',
    message: 'Strong winds expected',
    weatherData: { wind_speed: 30 },
    timestamp: '2025-01-30T09:00:00Z',
    recipient: 'bride@example.com',
    channel: 'email',
    acknowledged: false,
  },
];

describe('WeatherDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockAnalytics }),
    });
  });

  const setupSuccessfulFetch = () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeatherData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnalytics }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAlerts }),
      });
  };

  it('renders loading state initially', () => {
    render(<WeatherDashboard {...mockProps} />);

    expect(screen.getAllByTestId('card')).toHaveLength(3);
    expect(screen.getByText('Weather Dashboard')).toBeInTheDocument();
  });

  it('renders weather data successfully', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Weather Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test Venue')).toBeInTheDocument();
      expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    });

    // Check current weather display
    expect(screen.getByText('23°C')).toBeInTheDocument();
    expect(screen.getByText('Feels like 24°C')).toBeInTheDocument();
    expect(screen.getByText('13 km/h')).toBeInTheDocument();
    expect(screen.getByText('10.0 km')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load weather data/),
      ).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('displays critical alerts notification', async () => {
    const criticalAlert = {
      ...mockAlerts[0],
      severity: 'critical' as const,
      acknowledged: false,
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeatherData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnalytics }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [criticalAlert] }),
      });

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Critical weather alert! Check the alerts tab for details.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click on Forecast tab
    fireEvent.click(screen.getByText('Forecast'));
    await waitFor(() => {
      expect(screen.getByTestId('weather-forecast-widget')).toBeInTheDocument();
    });

    // Click on Alerts tab
    fireEvent.click(screen.getByText(/Alerts/));
    await waitFor(() => {
      expect(screen.getByTestId('weather-alerts-panel')).toBeInTheDocument();
    });

    // Click on Recommendations tab
    fireEvent.click(screen.getByText('Recommendations'));
    await waitFor(() => {
      expect(screen.getByText('Consider backup tent')).toBeInTheDocument();
      expect(
        screen.getByText('Weather looks good but have a backup plan'),
      ).toBeInTheDocument();
    });
  });

  it('displays risk assessment correctly', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Weather Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument(); // precipitation risk
      expect(screen.getByText('15%')).toBeInTheDocument(); // temperature risk
      expect(screen.getByText('25%')).toBeInTheDocument(); // wind risk
      expect(screen.getByText('10%')).toBeInTheDocument(); // visibility risk
    });
  });

  it('shows optimal scheduling for outdoor weddings', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('Optimal Schedule Recommendations'),
      ).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument(); // ceremony time
      expect(screen.getByText('10:00 & 16:00')).toBeInTheDocument(); // photography times
      expect(screen.getByText('18:00')).toBeInTheDocument(); // reception time
    });
  });

  it('hides optimal scheduling for indoor weddings', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} isOutdoor={false} />);

    await waitFor(() => {
      expect(
        screen.queryByText('Optimal Schedule Recommendations'),
      ).not.toBeInTheDocument();
    });
  });

  it('retries loading data when retry button is clicked', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network Error'),
    );

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Setup successful response for retry
    setupSuccessfulFetch();

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Test Venue')).toBeInTheDocument();
      expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    });
  });

  it('displays weather icons correctly', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      // Should render weather icons based on conditions
      const weatherIcons = screen.container.querySelectorAll('svg');
      expect(weatherIcons.length).toBeGreaterThan(0);
    });
  });

  it('formats dates and locations properly', async () => {
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Venue')).toBeInTheDocument();
      expect(screen.getByText('6/15/2025')).toBeInTheDocument();
    });
  });

  it('handles empty recommendations gracefully', async () => {
    const analyticsWithoutRecommendations = {
      ...mockAnalytics,
      recommendations: [],
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeatherData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: analyticsWithoutRecommendations,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Recommendations'));
    });

    await waitFor(() => {
      expect(
        screen.getByText('No specific recommendations at this time.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Weather conditions appear favorable for your wedding.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('updates weather data every hour', async () => {
    jest.useFakeTimers();
    setupSuccessfulFetch();

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    // Fast-forward 1 hour
    jest.advanceTimersByTime(60 * 60 * 1000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });

    jest.useRealTimers();
  });

  it('calculates precipitation percentage correctly', async () => {
    const weatherDataWithRain = {
      ...mockWeatherData,
      dailyForecast: [
        {
          ...mockWeatherData.dailyForecast[0],
          pop: 0.75, // 75% chance of rain
        },
      ],
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: weatherDataWithRain }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnalytics }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument(); // precipitation percentage
    });
  });

  it('handles missing weather data gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'No data available' }),
    });

    render(<WeatherDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No weather data available')).toBeInTheDocument();
    });
  });
});
