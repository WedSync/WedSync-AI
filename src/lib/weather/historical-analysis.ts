/**
 * Historical Weather Pattern Analysis
 * Analyzes historical weather data to provide insights for wedding planning
 */

import { WeatherHistoryPattern, WeatherApiResponse } from '@/types/weather';

interface HistoricalWeatherData {
  year: number;
  month: number;
  day: number;
  temp: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
}

export class HistoricalWeatherAnalysis {
  private cache = new Map<string, WeatherHistoryPattern>();
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // In a real implementation, this would connect to a historical weather database
    // For now, we'll use generated sample data
  }

  async analyzeHistoricalPattern(
    lat: number,
    lon: number,
    targetDate: Date,
  ): Promise<WeatherApiResponse<WeatherHistoryPattern>> {
    try {
      const cacheKey = `historical_${lat}_${lon}_${targetDate.getMonth()}_${targetDate.getDate()}`;
      const cached = this.getCachedPattern(cacheKey);

      if (cached) {
        return {
          success: true,
          data: cached,
          timestamp: new Date().toISOString(),
          cacheHit: true,
          source: 'cache',
        };
      }

      // Generate historical data (in a real implementation, this would query a weather database)
      const historicalData = await this.generateHistoricalData(
        lat,
        lon,
        targetDate,
      );
      const pattern = this.calculatePatterns(historicalData, targetDate);

      this.setCachedPattern(cacheKey, pattern);

      return {
        success: true,
        data: pattern,
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    } catch (error) {
      console.error('Error analyzing historical weather patterns:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    }
  }

  async compareWithHistorical(
    lat: number,
    lon: number,
    targetDate: Date,
    currentForecast: any,
  ): Promise<{
    comparison: 'typical' | 'above_average' | 'below_average' | 'extreme';
    insights: string[];
    recommendations: string[];
  }> {
    const historicalResponse = await this.analyzeHistoricalPattern(
      lat,
      lon,
      targetDate,
    );

    if (!historicalResponse.success || !historicalResponse.data) {
      return {
        comparison: 'typical',
        insights: ['Historical data not available'],
        recommendations: [],
      };
    }

    const historical = historicalResponse.data.historicalData;
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Temperature comparison
    const tempDiff = currentForecast.temp - historical.avgTemp;
    if (Math.abs(tempDiff) > 5) {
      if (tempDiff > 0) {
        insights.push(
          `Expected to be ${Math.round(tempDiff)}°C warmer than historical average`,
        );
        if (tempDiff > 10) {
          recommendations.push(
            'Consider additional cooling options for guests',
          );
        }
      } else {
        insights.push(
          `Expected to be ${Math.round(Math.abs(tempDiff))}°C cooler than historical average`,
        );
        if (tempDiff < -10) {
          recommendations.push(
            'Consider heating options or indoor alternatives',
          );
        }
      }
    }

    // Precipitation comparison
    const precipDiff = (currentForecast.pop || 0) - historical.avgPrecipitation;
    if (precipDiff > 0.3) {
      insights.push('Higher than average chance of precipitation');
      recommendations.push('Ensure backup indoor plans are ready');
    } else if (precipDiff < -0.2) {
      insights.push('Lower than average chance of precipitation');
    }

    // Wind comparison
    const windDiff =
      (currentForecast.wind_speed || 0) - historical.avgWindSpeed;
    if (windDiff > 10) {
      insights.push('Windier than typical for this date');
      recommendations.push(
        'Secure outdoor decorations and consider wind-resistant arrangements',
      );
    }

    // Historical extreme events
    const recentExtremes = historical.extremeEvents.filter(
      (event) => event.year >= new Date().getFullYear() - 5,
    );
    if (recentExtremes.length > 0) {
      insights.push(
        `${recentExtremes.length} extreme weather events recorded in the last 5 years`,
      );
      recommendations.push(
        'Review historical extreme weather patterns for contingency planning',
      );
    }

    // Determine overall comparison
    let comparison: 'typical' | 'above_average' | 'below_average' | 'extreme' =
      'typical';
    if (Math.abs(tempDiff) > 10 || precipDiff > 0.5 || windDiff > 15) {
      comparison = 'extreme';
    } else if (tempDiff > 5 || precipDiff > 0.3 || windDiff > 10) {
      comparison = 'above_average';
    } else if (tempDiff < -5 || precipDiff < -0.3 || windDiff < -10) {
      comparison = 'below_average';
    }

    return { comparison, insights, recommendations };
  }

  async getSeasonalTrends(
    lat: number,
    lon: number,
    month: number,
  ): Promise<{
    temperatureTrend: 'increasing' | 'decreasing' | 'stable';
    precipitationTrend: 'increasing' | 'decreasing' | 'stable';
    bestDaysOfMonth: number[];
    worstDaysOfMonth: number[];
  }> {
    // Generate seasonal trend analysis
    // In a real implementation, this would analyze multi-year data

    const daysInMonth = new Date(2024, month, 0).getDate();
    const dailyScores: { day: number; score: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(2024, month - 1, day);
      const historicalResponse = await this.analyzeHistoricalPattern(
        lat,
        lon,
        date,
      );

      let score = 100;
      if (historicalResponse.success && historicalResponse.data) {
        const data = historicalResponse.data.historicalData;
        // Lower score for bad conditions
        score -= data.avgPrecipitation * 30;
        score -= Math.abs(data.avgTemp - 20) * 2; // Penalty for temps far from 20°C
        score -= (data.avgWindSpeed / 50) * 20;
        score -= data.extremeEvents.length * 10;
      }

      dailyScores.push({ day, score });
    }

    dailyScores.sort((a, b) => b.score - a.score);

    return {
      temperatureTrend: 'stable', // Would be calculated from multi-year data
      precipitationTrend: 'stable', // Would be calculated from multi-year data
      bestDaysOfMonth: dailyScores.slice(0, 5).map((d) => d.day),
      worstDaysOfMonth: dailyScores.slice(-5).map((d) => d.day),
    };
  }

  private async generateHistoricalData(
    lat: number,
    lon: number,
    targetDate: Date,
  ): Promise<HistoricalWeatherData[]> {
    // This is a simplified implementation that generates realistic historical data
    // In production, this would query actual historical weather databases

    const currentYear = new Date().getFullYear();
    const data: HistoricalWeatherData[] = [];

    // Generate 10 years of historical data for the same date
    for (let year = currentYear - 10; year < currentYear; year++) {
      const baseTemp = this.getSeasonalBaseTemp(targetDate.getMonth(), lat);
      const yearVariation = (Math.random() - 0.5) * 8; // ±4°C variation
      const temp = baseTemp + yearVariation;

      const baseHumidity = this.getSeasonalBaseHumidity(targetDate.getMonth());
      const humidity = Math.max(
        20,
        Math.min(90, baseHumidity + (Math.random() - 0.5) * 20),
      );

      const basePrecip = this.getSeasonalBasePrecipitation(
        targetDate.getMonth(),
      );
      const precipitation = Math.max(
        0,
        Math.min(1, basePrecip + (Math.random() - 0.5) * 0.4),
      );

      const baseWind = this.getSeasonalBaseWind(targetDate.getMonth());
      const windSpeed = Math.max(0, baseWind + (Math.random() - 0.5) * 15);

      const condition = this.determineCondition(temp, precipitation, windSpeed);
      const severity = this.determineSeverity(temp, precipitation, windSpeed);

      data.push({
        year,
        month: targetDate.getMonth() + 1,
        day: targetDate.getDate(),
        temp,
        humidity,
        precipitation,
        windSpeed,
        condition,
        severity,
      });
    }

    return data;
  }

  private calculatePatterns(
    data: HistoricalWeatherData[],
    targetDate: Date,
  ): WeatherHistoryPattern {
    const avgTemp = data.reduce((sum, d) => sum + d.temp, 0) / data.length;
    const avgHumidity =
      data.reduce((sum, d) => sum + d.humidity, 0) / data.length;
    const avgPrecipitation =
      data.reduce((sum, d) => sum + d.precipitation, 0) / data.length;
    const avgWindSpeed =
      data.reduce((sum, d) => sum + d.windSpeed, 0) / data.length;

    // Find most common conditions
    const conditionCounts = data.reduce(
      (counts, d) => {
        counts[d.condition] = (counts[d.condition] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    const commonConditions = Object.entries(conditionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([condition]) => condition);

    // Find extreme events
    const extremeEvents = data
      .filter((d) => d.severity === 'severe' || d.severity === 'extreme')
      .map((d) => ({
        year: d.year,
        condition: d.condition,
        severity: d.severity,
      }));

    // Calculate confidence based on data consistency
    const tempStdDev = Math.sqrt(
      data.reduce((sum, d) => sum + Math.pow(d.temp - avgTemp, 2), 0) /
        data.length,
    );
    const confidence = Math.max(0.5, Math.min(0.95, 1 - tempStdDev / 20));

    return {
      month: targetDate.getMonth() + 1,
      day: targetDate.getDate(),
      historicalData: {
        avgTemp,
        avgHumidity,
        avgPrecipitation,
        avgWindSpeed,
        commonConditions,
        extremeEvents,
      },
      confidence,
      yearsOfData: data.length,
    };
  }

  private getSeasonalBaseTemp(month: number, lat: number): number {
    // Simplified seasonal temperature calculation
    const seasonalCurve = Math.cos(((month - 6) * Math.PI) / 6); // Peak in June, trough in December
    const latitudeEffect = Math.cos((lat * Math.PI) / 180); // Higher temperatures closer to equator
    return 15 + seasonalCurve * 15 * latitudeEffect;
  }

  private getSeasonalBaseHumidity(month: number): number {
    // Higher humidity in summer months
    return 50 + Math.sin(((month - 3) * Math.PI) / 6) * 20;
  }

  private getSeasonalBasePrecipitation(month: number): number {
    // Spring and fall tend to be wetter
    const springFall = Math.sin(((month - 1) * Math.PI) / 6) * 0.3;
    return 0.2 + Math.abs(springFall);
  }

  private getSeasonalBaseWind(month: number): number {
    // Higher winds in winter and spring
    return 10 + Math.cos(((month - 1) * Math.PI) / 6) * 8;
  }

  private determineCondition(
    temp: number,
    precipitation: number,
    windSpeed: number,
  ): string {
    if (precipitation > 0.7) return 'rainy';
    if (precipitation > 0.4) return 'cloudy';
    if (windSpeed > 30) return 'windy';
    if (temp > 25) return 'hot';
    if (temp < 5) return 'cold';
    return 'clear';
  }

  private determineSeverity(
    temp: number,
    precipitation: number,
    windSpeed: number,
  ): 'minor' | 'moderate' | 'severe' | 'extreme' {
    let severity = 0;

    if (temp < 0 || temp > 35) severity += 2;
    else if (temp < 5 || temp > 30) severity += 1;

    if (precipitation > 0.8) severity += 2;
    else if (precipitation > 0.6) severity += 1;

    if (windSpeed > 50) severity += 2;
    else if (windSpeed > 30) severity += 1;

    if (severity >= 4) return 'extreme';
    if (severity >= 3) return 'severe';
    if (severity >= 2) return 'moderate';
    return 'minor';
  }

  private getCachedPattern(key: string): WeatherHistoryPattern | null {
    // Implementation would use proper caching mechanism
    return null;
  }

  private setCachedPattern(key: string, pattern: WeatherHistoryPattern): void {
    // Implementation would use proper caching mechanism
  }

  clearCache(): void {
    this.cache.clear();
  }
}
