# WS-020: Weather Integration - Technical Specification

## User Story

**As a wedding photographer**, I need real-time weather forecasts and golden hour calculations so I can plan shoots and advise couples on optimal timing for outdoor photos.

**Real Wedding Scenario**: Sarah, a photographer, has an outdoor wedding shoot on Saturday. She uses WedSync's weather integration to see that rain is forecasted for 4 PM, but golden hour starts at 6:30 PM with clear skies. She proactively messages the couple to adjust the timeline, moving outdoor photos to after the ceremony during golden hour, resulting in stunning photos and a happy couple.

## Database Schema

```sql
-- Weather data storage
CREATE TABLE weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  venue_latitude DECIMAL(10, 8) NOT NULL,
  venue_longitude DECIMAL(11, 8) NOT NULL,
  forecast_date DATE NOT NULL,
  temperature DECIMAL(5, 2),
  conditions VARCHAR(100),
  precipitation_chance INTEGER,
  wind_speed DECIMAL(5, 2),
  humidity INTEGER,
  sunset_time TIMESTAMPTZ,
  sunrise_time TIMESTAMPTZ,
  golden_hour_start TIMESTAMPTZ,
  golden_hour_end TIMESTAMPTZ,
  blue_hour_start TIMESTAMPTZ,
  blue_hour_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, venue_latitude, venue_longitude, forecast_date)
);

-- Weather alerts
CREATE TABLE weather_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  wedding_date DATE NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'severe_weather', 'temperature', 'precipitation'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  recommendations TEXT[],
  is_read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weather preferences by supplier type
CREATE TABLE weather_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_type VARCHAR(50) NOT NULL,
  temperature_units VARCHAR(10) DEFAULT 'fahrenheit', -- 'celsius', 'fahrenheit'
  wind_speed_units VARCHAR(10) DEFAULT 'mph', -- 'mph', 'kmh'
  alert_thresholds JSONB NOT NULL DEFAULT '{}',
  notification_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_weather_data_location_date ON weather_data(venue_latitude, venue_longitude, forecast_date);
CREATE INDEX idx_weather_alerts_supplier_date ON weather_alerts(supplier_id, wedding_date);
CREATE INDEX idx_weather_alerts_unread ON weather_alerts(supplier_id, is_read) WHERE is_read = FALSE;
```

## API Endpoints

```typescript
// Weather data types
interface WeatherData {
  id: string;
  supplierId: string;
  latitude: number;
  longitude: number;
  forecastDate: string;
  temperature: number;
  conditions: string;
  precipitationChance: number;
  windSpeed: number;
  humidity: number;
  sunsetTime: string;
  sunriseTime: string;
  goldenHourStart: string;
  goldenHourEnd: string;
  blueHourStart: string;
  blueHourEnd: string;
  updatedAt: string;
}

interface WeatherAlert {
  id: string;
  supplierId: string;
  clientId: string;
  weddingDate: string;
  alertType: 'severe_weather' | 'temperature' | 'precipitation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendations: string[];
  isRead: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface WeatherForecast {
  current: WeatherData;
  hourly: WeatherData[];
  daily: WeatherData[];
  alerts: WeatherAlert[];
  photographyInsights?: PhotographyInsights;
  venueInsights?: VenueInsights;
}

interface PhotographyInsights {
  goldenHourQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lightingConditions: string;
  recommendedTimes: string[];
  cloudCoverImpact: string;
}

interface VenueInsights {
  outdoorSuitability: 'excellent' | 'good' | 'fair' | 'poor';
  temperatureComfort: string;
  windImpact: string;
  contingencyNeeded: boolean;
}

// API Routes
// GET /api/weather/forecast
interface WeatherForecastRequest {
  latitude: number;
  longitude: number;
  weddingDate: string;
  supplierType: 'photographer' | 'venue' | 'caterer' | 'florist';
}

interface WeatherForecastResponse {
  success: boolean;
  data: WeatherForecast;
}

// POST /api/weather/alerts
interface CreateWeatherAlertRequest {
  clientId: string;
  weddingDate: string;
  alertType: string;
  customMessage?: string;
}

interface CreateWeatherAlertResponse {
  success: boolean;
  data: WeatherAlert;
}

// GET /api/weather/alerts
interface GetWeatherAlertsResponse {
  success: boolean;
  data: WeatherAlert[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// PATCH /api/weather/alerts/:id/read
interface MarkAlertReadResponse {
  success: boolean;
  data: WeatherAlert;
}
```

## Frontend Components

```typescript
// WeatherDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface WeatherDashboardProps {
  clientId: string;
  weddingDate: string;
  venueCoordinates: { lat: number; lng: number };
  supplierType: string;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({
  clientId,
  weddingDate,
  venueCoordinates,
  supplierType
}) => {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);

  useEffect(() => {
    loadWeatherForecast();
    loadWeatherAlerts();
  }, [weddingDate, venueCoordinates]);

  const loadWeatherForecast = async () => {
    try {
      const response = await fetch('/api/weather/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: venueCoordinates.lat,
          longitude: venueCoordinates.lng,
          weddingDate,
          supplierType
        })
      });
      const data = await response.json();
      setForecast(data.data);
    } catch (error) {
      console.error('Failed to load weather forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeatherAlerts = async () => {
    try {
      const response = await fetch('/api/weather/alerts');
      const data = await response.json();
      setAlerts(data.data);
    } catch (error) {
      console.error('Failed to load weather alerts:', error);
    }
  };

  if (loading) return <div>Loading weather data...</div>;

  return (
    <div className="space-y-6">
      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Alert key={alert.id} className={`border-${getSeverityColor(alert.severity)}`}>
              <AlertDescription>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant={getSeverityVariant(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <p className="mt-1">{alert.message}</p>
                    {alert.recommendations.length > 0 && (
                      <ul className="mt-2 text-sm">
                        {alert.recommendations.map((rec, idx) => (
                          <li key={idx}>• {rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => markAlertRead(alert.id)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Mark Read
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle>Current Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Temperature</p>
              <p className="text-2xl font-bold">{forecast?.current.temperature}°F</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Conditions</p>
              <p className="text-lg">{forecast?.current.conditions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Precipitation</p>
              <p className="text-lg">{forecast?.current.precipitationChance}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Wind</p>
              <p className="text-lg">{forecast?.current.windSpeed} mph</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photography Insights */}
      {supplierType === 'photographer' && forecast?.photographyInsights && (
        <Card>
          <CardHeader>
            <CardTitle>Photography Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Golden Hour Quality</p>
                <Badge variant={getQualityVariant(forecast.photographyInsights.goldenHourQuality)}>
                  {forecast.photographyInsights.goldenHourQuality}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lighting Conditions</p>
                <p>{forecast.photographyInsights.lightingConditions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Recommended Times</p>
                <div className="flex flex-wrap gap-2">
                  {forecast.photographyInsights.recommendedTimes.map((time, idx) => (
                    <Badge key={idx} variant="outline">{time}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Golden Hour Calculator */}
      {supplierType === 'photographer' && (
        <GoldenHourCalculator
          sunsetTime={forecast?.current.sunsetTime}
          goldenHourStart={forecast?.current.goldenHourStart}
          goldenHourEnd={forecast?.current.goldenHourEnd}
          blueHourStart={forecast?.current.blueHourStart}
          blueHourEnd={forecast?.current.blueHourEnd}
        />
      )}

      {/* 7-Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {forecast?.daily.map((day, idx) => (
              <div key={idx} className="text-center p-2 border rounded">
                <p className="text-sm font-medium">
                  {new Date(day.forecastDate).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="text-xs text-gray-500">{day.conditions}</p>
                <p className="text-sm">{day.temperature}°F</p>
                <p className="text-xs">{day.precipitationChance}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'red-500';
    case 'high': return 'orange-500';
    case 'medium': return 'yellow-500';
    default: return 'blue-500';
  }
};

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    default: return 'secondary';
  }
};

const getQualityVariant = (quality: string) => {
  switch (quality) {
    case 'excellent': return 'default';
    case 'good': return 'secondary';
    case 'fair': return 'outline';
    default: return 'destructive';
  }
};

const markAlertRead = async (alertId: string) => {
  try {
    await fetch(`/api/weather/alerts/${alertId}/read`, {
      method: 'PATCH'
    });
    // Refresh alerts
    window.location.reload();
  } catch (error) {
    console.error('Failed to mark alert as read:', error);
  }
};
```

## Code Examples

### Weather Service Integration

```typescript
// lib/services/weather-service.ts
import { WeatherAPI } from '@/lib/integrations/openweather';

export class WeatherService {
  private api: WeatherAPI;

  constructor() {
    this.api = new WeatherAPI(process.env.OPENWEATHER_API_KEY!);
  }

  async getForecast(
    latitude: number,
    longitude: number,
    supplierType: string
  ): Promise<WeatherForecast> {
    const forecast = await this.api.getForecast(latitude, longitude);
    
    // Add supplier-specific insights
    const insights = this.generateInsights(forecast, supplierType);
    
    return {
      ...forecast,
      photographyInsights: supplierType === 'photographer' ? insights.photography : undefined,
      venueInsights: supplierType === 'venue' ? insights.venue : undefined
    };
  }

  private generateInsights(forecast: any, supplierType: string) {
    switch (supplierType) {
      case 'photographer':
        return {
          photography: this.generatePhotographyInsights(forecast)
        };
      case 'venue':
        return {
          venue: this.generateVenueInsights(forecast)
        };
      default:
        return {};
    }
  }

  private generatePhotographyInsights(forecast: any): PhotographyInsights {
    const cloudCover = forecast.current.cloudCover;
    const goldenHourQuality = this.calculateGoldenHourQuality(cloudCover, forecast.current.conditions);
    
    return {
      goldenHourQuality,
      lightingConditions: this.describeLightingConditions(cloudCover, forecast.current.conditions),
      recommendedTimes: this.getRecommendedPhotoTimes(forecast),
      cloudCoverImpact: this.describeCloudCoverImpact(cloudCover)
    };
  }

  private calculateGoldenHourQuality(cloudCover: number, conditions: string): 'excellent' | 'good' | 'fair' | 'poor' {
    if (conditions.includes('storm') || conditions.includes('rain')) return 'poor';
    if (cloudCover < 20) return 'excellent';
    if (cloudCover < 50) return 'good';
    if (cloudCover < 80) return 'fair';
    return 'poor';
  }

  async createWeatherAlert(
    supplierId: string,
    clientId: string,
    weddingDate: string,
    alertType: string,
    customMessage?: string
  ): Promise<WeatherAlert> {
    const alertData = {
      supplier_id: supplierId,
      client_id: clientId,
      wedding_date: weddingDate,
      alert_type: alertType,
      severity: this.calculateSeverity(alertType),
      message: customMessage || this.generateAlertMessage(alertType),
      recommendations: this.generateRecommendations(alertType)
    };

    const { data, error } = await this.supabase
      .from('weather_alerts')
      .insert(alertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private generateRecommendations(alertType: string): string[] {
    switch (alertType) {
      case 'severe_weather':
        return [
          'Consider moving outdoor activities indoors',
          'Prepare backup timeline with covered locations',
          'Notify all vendors of potential changes',
          'Have umbrellas and protective gear ready'
        ];
      case 'temperature':
        return [
          'Adjust catering plans for food safety',
          'Consider guest comfort measures',
          'Review vendor equipment requirements',
          'Plan for appropriate attire recommendations'
        ];
      case 'precipitation':
        return [
          'Secure backup indoor locations',
          'Prepare weather-appropriate decorations',
          'Coordinate with photographer for covered shots',
          'Review timeline for weather delays'
        ];
      default:
        return [];
    }
  }
}
```

## Test Requirements

```typescript
// __tests__/weather-integration.test.ts
import { WeatherService } from '@/lib/services/weather-service';
import { createClient } from '@supabase/supabase-js';

describe('Weather Integration', () => {
  let weatherService: WeatherService;
  let supabase: any;

  beforeEach(() => {
    weatherService = new WeatherService();
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  });

  describe('Weather Forecast', () => {
    it('should fetch and store weather data', async () => {
      const forecast = await weatherService.getForecast(40.7128, -74.0060, 'photographer');
      
      expect(forecast).toHaveProperty('current');
      expect(forecast).toHaveProperty('photographyInsights');
      expect(forecast.photographyInsights).toHaveProperty('goldenHourQuality');
    });

    it('should calculate golden hour timing correctly', async () => {
      const forecast = await weatherService.getForecast(40.7128, -74.0060, 'photographer');
      
      expect(forecast.current.goldenHourStart).toBeDefined();
      expect(forecast.current.goldenHourEnd).toBeDefined();
      expect(new Date(forecast.current.goldenHourEnd) > new Date(forecast.current.goldenHourStart)).toBe(true);
    });
  });

  describe('Weather Alerts', () => {
    it('should create weather alert with recommendations', async () => {
      const alert = await weatherService.createWeatherAlert(
        'supplier-id',
        'client-id',
        '2024-06-15',
        'severe_weather'
      );

      expect(alert.alertType).toBe('severe_weather');
      expect(alert.recommendations.length).toBeGreaterThan(0);
      expect(alert.severity).toBeDefined();
    });

    it('should mark alerts as read', async () => {
      const { data: alert } = await supabase
        .from('weather_alerts')
        .insert({
          supplier_id: 'test-supplier',
          client_id: 'test-client',
          wedding_date: '2024-06-15',
          alert_type: 'precipitation',
          severity: 'medium',
          message: 'Test alert',
          recommendations: ['Test recommendation']
        })
        .select()
        .single();

      await supabase
        .from('weather_alerts')
        .update({ is_read: true })
        .eq('id', alert.id);

      const { data: updatedAlert } = await supabase
        .from('weather_alerts')
        .select()
        .eq('id', alert.id)
        .single();

      expect(updatedAlert.is_read).toBe(true);
    });
  });

  describe('Supplier-Specific Insights', () => {
    it('should provide photography-specific insights', async () => {
      const forecast = await weatherService.getForecast(40.7128, -74.0060, 'photographer');
      
      expect(forecast.photographyInsights).toBeDefined();
      expect(forecast.photographyInsights?.goldenHourQuality).toMatch(/excellent|good|fair|poor/);
      expect(forecast.photographyInsights?.recommendedTimes).toBeInstanceOf(Array);
    });

    it('should provide venue-specific insights', async () => {
      const forecast = await weatherService.getForecast(40.7128, -74.0060, 'venue');
      
      expect(forecast.venueInsights).toBeDefined();
      expect(forecast.venueInsights?.outdoorSuitability).toMatch(/excellent|good|fair|poor/);
      expect(forecast.venueInsights?.contingencyNeeded).toBeDefined();
    });
  });
});
```

## Dependencies

### External APIs
- **OpenWeatherMap API**: Weather data and forecasts
- **Sunrise-Sunset API**: Precise golden hour calculations
- **Google Places API**: Venue coordinate lookup

### Internal Dependencies
- **Supabase Database**: Weather data storage
- **React Query**: API state management
- **Shadcn/ui**: UI components
- **Chart.js**: Weather visualization

## Effort Estimate

- **Database Setup**: 4 hours
- **External API Integration**: 8 hours
- **Core Weather Service**: 12 hours
- **Photography Insights**: 6 hours
- **Frontend Components**: 16 hours
- **Alert System**: 8 hours
- **Testing**: 12 hours
- **Documentation**: 4 hours

**Total Estimated Effort**: 70 hours (9 days)

## Success Metrics

- Weather forecast accuracy within 5% of actual conditions
- Golden hour timing accurate within 5 minutes
- Alert delivery within 2 minutes of threshold breach
- 95% supplier satisfaction with insights relevance
- 50% reduction in weather-related day-of surprises