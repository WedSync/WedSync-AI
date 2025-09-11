# 02-weather-api.md

## What to Build

Implement weather forecasting and historical weather data for wedding planning, including day-of predictions and seasonal insights for venues.

## Key Technical Requirements

### Weather Service Integration

```
// app/lib/weather/weather-service.ts
export class WeatherService {
  private apiKey: string;
  private baseUrl = '[https://api.openweathermap.org/data/3.0](https://api.openweathermap.org/data/3.0)';
  
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY!;
  }
  
  async getForecast(lat: number, lon: number, date: Date) {
    const daysFromNow = differenceInDays(date, new Date());
    
    if (daysFromNow <= 7) {
      // Use detailed forecast for near-term
      return this.getDetailedForecast(lat, lon);
    } else if (daysFromNow <= 30) {
      // Use extended forecast
      return this.getExtendedForecast(lat, lon);
    } else {
      // Use historical averages
      return this.getHistoricalWeather(lat, lon, date);
    }
  }
  
  private async getDetailedForecast(lat: number, lon: number) {
    const response = await fetch(
      `${this.baseUrl}/onecall?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
    );
    
    const data = await response.json();
    
    return {
      current: this.formatCurrentWeather(data.current),
      hourly: [data.hourly.map](http://data.hourly.map)(this.formatHourlyWeather),
      daily: [data.daily.map](http://data.daily.map)(this.formatDailyWeather),
      alerts: data.alerts || []
    };
  }
  
  async getHistoricalWeather(lat: number, lon: number, date: Date) {
    // Get historical data for same date in previous 5 years
    const historicalData = [];
    
    for (let year = 1; year <= 5; year++) {
      const historicalDate = subYears(date, year);
      const timestamp = Math.floor(historicalDate.getTime() / 1000);
      
      const response = await fetch(
        `${this.baseUrl}/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${this.apiKey}`
      );
      
      const data = await response.json();
      historicalData.push(data);
    }
    
    return this.calculateHistoricalAverages(historicalData);
  }
}
```

### Wedding Weather Dashboard

```
// app/components/weather/WeddingWeatherDashboard.tsx
export const WeddingWeatherDashboard = ({ 
  venue,
  weddingDate 
}) => {
  const [weather, setWeather] = useState<WeatherData>();
  const [historicalInsights, setHistoricalInsights] = useState<HistoricalInsights>();
  
  useEffect(() => {
    loadWeatherData();
  }, [venue, weddingDate]);
  
  const loadWeatherData = async () => {
    const forecast = await weatherService.getForecast(
      [venue.coordinates.lat](http://venue.coordinates.lat),
      venue.coordinates.lng,
      weddingDate
    );
    
    setWeather(forecast);
    
    // Load historical insights
    const insights = await weatherService.getSeasonalInsights(
      venue.coordinates,
      weddingDate
    );
    
    setHistoricalInsights(insights);
  };
  
  return (
    <div className="weather-dashboard">
      {/* Near-term forecast */}
      {weather?.daily && (
        <div className="forecast-section">
          <h3>Weather Forecast</h3>
          <div className="forecast-cards">
            {weather.daily.slice(0, 7).map(day => (
              <DayForecastCard key={[day.date](http://day.date)} day={day} />
            ))}
          </div>
        </div>
      )}
      
      {/* Historical insights */}
      {historicalInsights && (
        <div className="historical-section">
          <h3>Historical Weather Patterns</h3>
          <div className="insights-grid">
            <InsightCard
              title="Typical Temperature"
              value={`${historicalInsights.avgTemp}°C`}
              range={`${historicalInsights.minTemp}° - ${historicalInsights.maxTemp}°`}
            />
            <InsightCard
              title="Rain Probability"
              value={`${historicalInsights.rainProbability}%`}
              note={`Based on last 5 years`}
            />
            <InsightCard
              title="Sunset Time"
              value={historicalInsights.sunsetTime}
              note="Perfect for golden hour photos"
            />
          </div>
        </div>
      )}
      
      {/* Weather alerts */}
      <WeatherAlerts venue={venue} weddingDate={weddingDate} />
    </div>
  );
};
```

### Seasonal Insights Calculator

```
// app/lib/weather/seasonal-insights.ts
export class SeasonalInsightsService {
  async getVenueSeasonalData(venueId: string, month: number) {
    // Aggregate historical weather for venue location
    const venue = await getVenue(venueId);
    const historicalData = await this.fetchHistoricalData(
      venue.coordinates,
      month
    );
    
    return {
      averageTemp: this.calculateAverage(historicalData, 'temp'),
      averageRainfall: this.calculateAverage(historicalData, 'rainfall'),
      sunnyDays: this.countSunnyDays(historicalData),
      typicalConditions: this.determineTypicalConditions(historicalData),
      photographyConditions: this.assessPhotographyConditions(historicalData),
      recommendations: this.generateRecommendations(historicalData)
    };
  }
  
  private assessPhotographyConditions(data: HistoricalData) {
    const goldenHourQuality = this.calculateGoldenHourQuality(data);
    const cloudCover = this.averageCloudCover(data);
    
    return {
      goldenHour: {
        morning: data.avgSunrise,
        evening: data.avgSunset,
        quality: goldenHourQuality
      },
      lighting: {
        directSunProbability: 100 - cloudCover,
        diffusedLight: cloudCover > 50,
        recommendation: this.getLightingRecommendation(cloudCover)
      }
    };
  }
}
```

### Weather-Based Recommendations

```
// app/lib/weather/recommendations.ts
export class WeatherRecommendations {
  generateRecommendations(weather: WeatherData, weddingDetails: WeddingDetails) {
    const recommendations = [];
    
    // Temperature recommendations
    if (weather.temp > 30) {
      recommendations.push({
        category: 'guest_comfort',
        priority: 'high',
        suggestion: 'Consider providing parasols or fans for guests',
        suppliers: ['rental_company']
      });
    }
    
    if (weather.temp < 10) {
      recommendations.push({
        category: 'guest_comfort',
        priority: 'high',
        suggestion: 'Arrange for outdoor heaters or blankets',
        suppliers: ['rental_company']
      });
    }
    
    // Rain contingency
    if (weather.rainProbability > 30) {
      recommendations.push({
        category: 'contingency',
        priority: 'critical',
        suggestion: 'Confirm indoor backup plan with venue',
        suppliers: ['venue', 'planner']
      });
      
      recommendations.push({
        category: 'photography',
        priority: 'medium',
        suggestion: 'Discuss rainy day photo locations',
        suppliers: ['photographer']
      });
    }
    
    // Wind considerations
    if (weather.windSpeed > 20) {
      recommendations.push({
        category: 'decor',
        priority: 'high',
        suggestion: 'Secure all decorations and avoid lightweight items',
        suppliers: ['decorator', 'florist']
      });
    }
    
    return recommendations;
  }
}
```

### Database Schema

```
-- Cache weather data
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  date DATE,
  forecast_type TEXT, -- 'current', 'daily', 'historical'
  data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Store weather alerts
CREATE TABLE weather_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  wedding_date DATE,
  alert_type TEXT, -- 'storm', 'heat', 'cold', 'rain'
  severity TEXT, -- 'low', 'medium', 'high', 'critical'
  message TEXT,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false
);

-- Historical weather aggregates
CREATE TABLE weather_historical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  month INTEGER,
  day INTEGER,
  avg_temp_high DECIMAL(5, 2),
  avg_temp_low DECIMAL(5, 2),
  rain_probability DECIMAL(5, 2),
  avg_wind_speed DECIMAL(5, 2),
  sunrise TIME,
  sunset TIME,
  data_points INTEGER, -- Number of years averaged
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Automated Weather Monitoring

```
// app/lib/weather/monitoring.ts
export class WeatherMonitor {
  async checkUpcomingWeddings() {
    const upcomingWeddings = await getWeddingsInNext7Days();
    
    for (const wedding of upcomingWeddings) {
      const weather = await weatherService.getForecast(
        wedding.venue.coordinates,
        [wedding.date](http://wedding.date)
      );
      
      // Check for severe conditions
      if (this.hasSevereWeather(weather)) {
        await this.createWeatherAlert(wedding, weather);
        await this.notifySuppliers(wedding, weather);
      }
      
      // Update dashboard
      await this.updateWeatherCache(wedding, weather);
    }
  }
  
  private hasSevereWeather(weather: WeatherData): boolean {
    return (
      weather.alerts?.length > 0 ||
      weather.rainProbability > 70 ||
      weather.windSpeed > 30 ||
      weather.temp > 35 ||
      weather.temp < 0
    );
  }
}
```

## Critical Implementation Notes

1. **API Limits**: OpenWeather has rate limits - implement caching strategy
2. **Forecast Accuracy**: Only show confidence levels for long-range forecasts
3. **Historical Data**: Costs extra - consider caching extensively
4. **Location Precision**: Use exact venue coordinates, not city-level
5. **Time Zones**: Handle venue timezone for sunrise/sunset calculations
6. **Seasonal Patterns**: Build historical database over time
7. **Alert Thresholds**: Customizable per venue/supplier preferences
8. **Data Retention**: Keep historical data for pattern analysis

## Testing Checklist

- [ ]  Forecast accuracy for different date ranges
- [ ]  Historical data aggregation works
- [ ]  Weather alerts trigger correctly
- [ ]  Cache expiration and refresh
- [ ]  International location support
- [ ]  Timezone handling for sunset/sunrise
- [ ]  API rate limit handling
- [ ]  Graceful degradation when API unavailable