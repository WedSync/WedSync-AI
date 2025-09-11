import * as React from 'react';
import { Card, CardBody, CardHeader } from './Card';
export interface DriveSummary { durationText: string; distanceText: string; }
export interface WeatherSummary { description: string; temperatureC: number; icon?: string; }
export interface AgendaItem { time: string; label: string; }
export function WeddingTodayCard({ coupleName, venueName, location, ceremonyTime, drive, weather, sunsetTime, agenda = [] }: {
  coupleName: string; venueName: string; location: string; ceremonyTime: string; drive?: DriveSummary; weather?: WeatherSummary; sunsetTime?: string; agenda?: AgendaItem[];
}) {
  return (<Card>
    <CardHeader title="Wedding today" subtitle={`${coupleName} • ${venueName} • ${location}`} />
    <CardBody>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Ceremony time</div>
          <div className="text-xl font-semibold">{ceremonyTime}</div>
          {drive && <div className="mt-3 text-sm"><span className="font-medium">Drive: </span>{drive.durationText} • {drive.distanceText}</div>}
          <div className="mt-3 text-sm">
            {weather && <span className="mr-4">{weather.icon ? <span className="mr-1">{weather.icon}</span> : null}{weather.description} • {weather.temperatureC}°C</span>}
            {sunsetTime && <span className="text-sm">Sunset {sunsetTime}</span>}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-2">Agenda</div>
          <ul className="space-y-2 text-sm">
            {agenda.slice(0,6).map((a,i)=>(<li key={i} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 shadow-sm">
              <span className="font-medium">{a.time}</span><span className="ml-3">{a.label}</span>
            </li>))}
          </ul>
        </div>
      </div>
    </CardBody>
  </Card>);
}
