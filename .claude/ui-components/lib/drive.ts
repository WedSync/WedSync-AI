export interface DriveInfo { durationText: string; distanceText: string; seconds: number; meters: number; }
export function formatSeconds(s: number) { const h = Math.floor(s/3600); const m = Math.round((s%3600)/60); return h ? `${h} hr ${m} min` : `${m} min`; }
export function formatMeters(m: number) { return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${m} m`; }
export function mapGoogleDirectionsToDriveInfo(api: any): DriveInfo {
  const leg = api?.routes?.[0]?.legs?.[0];
  const seconds = leg?.duration?.value ?? leg?.duration?.seconds ?? 0;
  const meters = leg?.distance?.value ?? leg?.distance?.meters ?? 0;
  return { seconds, meters, durationText: leg?.duration?.text ?? formatSeconds(seconds), distanceText: leg?.distance?.text ?? formatMeters(meters) };
}
export function mapOsrmToDriveInfo(api: any): DriveInfo {
  const route = api?.routes?.[0]; const seconds = Math.round(route?.duration ?? 0); const meters = Math.round(route?.distance ?? 0);
  return { seconds, meters, durationText: formatSeconds(seconds), distanceText: formatMeters(meters) };
}
