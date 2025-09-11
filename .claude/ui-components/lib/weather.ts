export interface WeatherSummary { description: string; temperatureC: number; icon?: string; }
export function mapOpenMeteoToSummary(api: any): WeatherSummary {
  const current = api?.current_weather || api?.current || {};
  const temp = current.temperature ?? current.temperature_2m ?? 0;
  const code = current.weathercode ?? current.weather_code ?? null;
  const description = codeToDescription(code);
  return { description, temperatureC: Math.round(temp), icon: codeToIcon(code) };
}
function codeToDescription(code: number | null): string {
  if (code == null) return '—';
  if (code === 0) return 'Clear sky';
  if ([1,2].includes(code)) return 'Mostly clear';
  if (code === 3) return 'Cloudy';
  if ([45,48].includes(code)) return 'Foggy';
  if ([51,53,55].includes(code)) return 'Drizzle';
  if ([61,63,65].includes(code)) return 'Rain';
  if ([71,73,75].includes(code)) return 'Snow';
  if ([80,81,82].includes(code)) return 'Showers';
  if ([95,96,99].includes(code)) return 'Thunderstorm';
  return 'Weather';
}
function codeToIcon(code: number | null): string | undefined {
  if (code == null) return undefined;
  if (code === 0) return '☀️';
  if ([1,2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([61,63,65,80,81,82].includes(code)) return '🌧️';
  if ([71,73,75].includes(code)) return '🌨️';
  if ([95,96,99].includes(code)) return '⛈️';
  if ([45,48].includes(code)) return '🌫️';
  return undefined;
}
