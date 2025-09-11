import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeatherForecastWidget } from '../WeatherForecastWidget';
import { DailyWeather, HourlyWeather } from '@/types/weather';

// Mock Untitled UI components
jest.mock('@/components/untitled-ui', () => ({
  Card: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="card" className={className} onClick={onClick}>
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
}));

const mockDailyForecast: DailyWeather[] = [
  {
    dt: 1718320800, // 2024-06-14
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
    pop: 0.15,
    uvi: 6.2,
  },
  {
    dt: 1718407200, // 2024-06-15 (Wedding Day)
    sunrise: 1718427600,
    sunset: 1718480400,
    moonrise: 1718436400,
    moonset: 1718486400,
    moon_phase: 0.6,
    summary: 'Sunny and warm wedding day',
    temp: {
      day: 26.0,
      min: 18.0,
      max: 28.0,
      night: 20.0,
      eve: 24.0,
      morn: 19.0,
    },
    feels_like: {
      day: 27.0,
      night: 21.0,
      eve: 25.0,
      morn: 20.0,
    },
    pressure: 1018,
    humidity: 55,
    dew_point: 16.5,
    wind_speed: 8.0,
    wind_deg: 90,
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
    clouds: 10,
    pop: 0.05,
    uvi: 8.5,
  },
  {
    dt: 1718493600, // 2024-06-16
    sunrise: 1718514000,
    sunset: 1718566800,
    moonrise: 1718522800,
    moonset: 1718572800,
    moon_phase: 0.7,
    summary: 'Rainy day',
    temp: {
      day: 19.0,
      min: 14.0,
      max: 21.0,
      night: 16.0,
      eve: 18.0,
      morn: 15.0,
    },
    feels_like: {
      day: 20.0,
      night: 17.0,
      eve: 19.0,
      morn: 16.0,
    },
    pressure: 1008,
    humidity: 85,
    dew_point: 16.8,
    wind_speed: 18.0,
    wind_deg: 270,
    weather: [
      {
        id: 501,
        main: 'Rain',
        description: 'moderate rain',
        icon: '10d',
      },
    ],
    clouds: 90,
    pop: 0.85,
    rain: 5.2,
    uvi: 3.0,
  },
];

const mockHourlyForecast: HourlyWeather[] = [
  {
    dt: 1718407200, // Wedding day hour 1
    temp: 24.0,
    feels_like: 25.0,
    pressure: 1018,
    humidity: 60,
    dew_point: 16.0,
    uvi: 7.0,
    clouds: 15,
    visibility: 10000,
    wind_speed: 8.0,
    wind_deg: 90,
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
    pop: 0.05,
  },
  {
    dt: 1718410800, // Wedding day hour 2
    temp: 26.0,
    feels_like: 27.0,
    pressure: 1018,
    humidity: 55,
    dew_point: 16.2,
    uvi: 8.5,
    clouds: 10,
    visibility: 10000,
    wind_speed: 9.0,
    wind_deg: 95,
    wind_gust: 12.0,
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
    pop: 0.02,
    rain: { '1h': 0.1 },
  },
];

const mockProps = {
  dailyForecast: mockDailyForecast,
  hourlyForecast: mockHourlyForecast,
  weddingDate: '2024-06-15T14:00:00Z',
};

describe('WeatherForecastWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with daily forecast tab active by default', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    expect(screen.getByText('14-Day Forecast')).toBeInTheDocument();
    expect(screen.getByText('Wedding Day Hourly')).toBeInTheDocument();
    expect(screen.getAllByTestId('card')).toHaveLength(3); // One card per day
  });

  it('displays daily forecast information correctly', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Check weather descriptions
    expect(screen.getByText('few clouds')).toBeInTheDocument();
    expect(screen.getByText('clear sky')).toBeInTheDocument();
    expect(screen.getByText('moderate rain')).toBeInTheDocument();

    // Check temperature ranges
    expect(screen.getByText('25° / 15°')).toBeInTheDocument(); // Day 1 high/low
    expect(screen.getByText('28° / 18°')).toBeInTheDocument(); // Wedding day high/low
    expect(screen.getByText('21° / 14°')).toBeInTheDocument(); // Day 3 high/low

    // Check precipitation percentages
    expect(screen.getByText('15%')).toBeInTheDocument(); // Day 1 rain chance
    expect(screen.getByText('5%')).toBeInTheDocument(); // Wedding day rain chance
    expect(screen.getByText('85%')).toBeInTheDocument(); // Day 3 rain chance
  });

  it('highlights wedding day with special styling', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    const weddingDayCard = screen
      .getByText('Wedding Day')
      .closest('[data-testid="card"]');
    expect(weddingDayCard).toHaveClass('ring-2 ring-blue-500 bg-blue-50');

    expect(screen.getByText('Wedding Day')).toBeInTheDocument();
  });

  it('expands selected day to show detailed information', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Click on the first day card
    const firstCard = screen.getAllByTestId('card')[0];
    fireEvent.click(firstCard);

    // Check for expanded details
    expect(screen.getByText('Sunrise')).toBeInTheDocument();
    expect(screen.getByText('Sunset')).toBeInTheDocument();
    expect(screen.getByText('Humidity')).toBeInTheDocument();
    expect(screen.getByText('Moon Phase')).toBeInTheDocument();

    // Check temperature breakdown
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    expect(screen.getByText('Night')).toBeInTheDocument();
  });

  it('switches to hourly forecast tab correctly', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Click on hourly tab
    fireEvent.click(screen.getByText('Wedding Day Hourly'));

    expect(
      screen.getByText('Wedding Day Hourly Forecast - 6/15/2024'),
    ).toBeInTheDocument();
    expect(screen.getByText('12:00 AM')).toBeInTheDocument(); // First hour
    expect(screen.getByText('1:00 AM')).toBeInTheDocument(); // Second hour
  });

  it('displays hourly forecast data correctly', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Switch to hourly tab
    fireEvent.click(screen.getByText('Wedding Day Hourly'));

    // Check hourly temperature and conditions
    expect(screen.getByText('24°')).toBeInTheDocument();
    expect(screen.getByText('26°')).toBeInTheDocument();
    expect(screen.getByText('Feels 25°')).toBeInTheDocument();
    expect(screen.getByText('Feels 27°')).toBeInTheDocument();

    // Check precipitation and wind
    expect(screen.getByText('5%')).toBeInTheDocument(); // Precipitation chance
    expect(screen.getByText('2%')).toBeInTheDocument(); // Second hour precipitation
    expect(screen.getByText('8 km/h')).toBeInTheDocument(); // Wind speed
    expect(screen.getByText('9 km/h')).toBeInTheDocument(); // Second hour wind

    // Check visibility and humidity
    expect(screen.getByText('10.0 km')).toBeInTheDocument(); // Visibility
    expect(screen.getByText('60% humidity')).toBeInTheDocument();
  });

  it('handles wind gusts correctly in hourly view', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    fireEvent.click(screen.getByText('Wedding Day Hourly'));

    expect(screen.getByText('Gusts 12 km/h')).toBeInTheDocument();
  });

  it('displays rain amount when available in hourly view', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    fireEvent.click(screen.getByText('Wedding Day Hourly'));

    expect(screen.getByText('0.1mm')).toBeInTheDocument();
  });

  it('shows appropriate precipitation color coding', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Low risk (5%) should be green
    const lowRiskElement = screen.getByText('5%');
    expect(lowRiskElement).toHaveClass('text-green-600');

    // High risk (85%) should be red
    const highRiskElement = screen.getByText('85%');
    expect(highRiskElement).toHaveClass('text-red-600');
  });

  it('displays UV index with appropriate color coding', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Low UV (3) should be green
    const lowUvElement = screen.getByText('3');
    expect(lowUvElement).toHaveClass('text-green-600');

    // High UV (9) should be red - but we need UV 9 in our mock data
    // Let's check UV 6 (wedding day) which should be orange
    const mediumUvElement = screen.getByText('6');
    expect(mediumUvElement).toHaveClass('text-orange-600');
  });

  it('formats time correctly in hourly view', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    fireEvent.click(screen.getByText('Wedding Day Hourly'));

    // Check 12-hour format with AM/PM
    expect(screen.getByText('12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('1:00 AM')).toBeInTheDocument();
  });

  it('formats date correctly in daily view', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Check short date format (Fri, Jun 14)
    expect(screen.getByText('Fri, Jun 14')).toBeInTheDocument();
    expect(screen.getByText('Sat, Jun 15')).toBeInTheDocument();
    expect(screen.getByText('Sun, Jun 16')).toBeInTheDocument();
  });

  it('displays weather icons based on conditions', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Should render various weather icons
    const weatherIcons = screen.container.querySelectorAll('svg');
    expect(weatherIcons.length).toBeGreaterThan(0);
  });

  it('handles empty hourly forecast gracefully', () => {
    render(<WeatherForecastWidget {...mockProps} hourlyForecast={[]} />);

    fireEvent.click(screen.getByText('Wedding Day Hourly'));

    expect(
      screen.getByText(
        'Hourly forecast not available for the selected wedding date.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Hourly forecasts are available up to 48 hours in advance.',
      ),
    ).toBeInTheDocument();
  });

  it('shows wind direction information', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Wind speed should be displayed
    expect(screen.getByText('13 km/h')).toBeInTheDocument(); // Rounded from 12.5
    expect(screen.getByText('8 km/h')).toBeInTheDocument(); // Wedding day
    expect(screen.getByText('18 km/h')).toBeInTheDocument(); // Rainy day
  });

  it('calculates moon phase percentage correctly', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Click on first day to expand details
    const firstCard = screen.getAllByTestId('card')[0];
    fireEvent.click(firstCard);

    expect(screen.getByText('50%')).toBeInTheDocument(); // 0.5 * 100
  });

  it('displays humidity levels correctly', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Click on first day to expand details
    const firstCard = screen.getAllByTestId('card')[0];
    fireEvent.click(firstCard);

    expect(screen.getByText('65%')).toBeInTheDocument(); // Humidity percentage
  });

  it('shows all temperature phases correctly when expanded', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    // Click on first day to expand details
    const firstCard = screen.getAllByTestId('card')[0];
    fireEvent.click(firstCard);

    expect(screen.getByText('16°')).toBeInTheDocument(); // Morning temp
    expect(screen.getByText('23°')).toBeInTheDocument(); // Day temp (rounded from 22.5)
    expect(screen.getByText('21°')).toBeInTheDocument(); // Evening temp
    expect(screen.getByText('18°')).toBeInTheDocument(); // Night temp
  });

  it('handles missing weather description gracefully', () => {
    const forecastWithMissingData = mockDailyForecast.map((day) => ({
      ...day,
      weather: [],
    }));

    render(
      <WeatherForecastWidget
        {...mockProps}
        dailyForecast={forecastWithMissingData}
      />,
    );

    expect(screen.getAllByText('No description')).toHaveLength(3);
  });

  it('identifies wedding day correctly across different timezones', () => {
    // Test with different wedding date format
    const propsWithDifferentDate = {
      ...mockProps,
      weddingDate: '2024-06-15', // Date only format
    };

    render(<WeatherForecastWidget {...propsWithDifferentDate} />);

    expect(screen.getByText('Wedding Day')).toBeInTheDocument();
  });

  it('handles forecast summary display', () => {
    render(<WeatherForecastWidget {...mockProps} />);

    expect(
      screen.getByText('Pleasant day with few clouds'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sunny and warm wedding day')).toBeInTheDocument();
    expect(screen.getByText('Rainy day')).toBeInTheDocument();
  });
});
