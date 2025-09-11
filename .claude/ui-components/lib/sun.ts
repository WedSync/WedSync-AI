export function sunTimes(date: Date, lat: number, lon: number) {
  const rad = Math.PI / 180, J1970 = 2440588, J2000 = 2451545;
  const toJulian = (d: Date) => d.valueOf() / 86400000 - 0.5 + J1970;
  const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * 86400000);
  const e = rad * 23.4397;
  const d = toJulian(date) - J2000;
  const n = Math.round(d - lon / 360);
  const Jnoon = J2000 + n + lon / 360;
  const M = rad * (357.5291 + 0.98560028 * (Jnoon - J2000));
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const Jtransit = Jnoon + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const dec = Math.asin(Math.sin(L) * Math.sin(e));
  const w0 = Math.acos((Math.sin(rad * -0.83) - Math.sin(rad * lat) * Math.sin(dec)) / (Math.cos(rad * lat) * Math.cos(dec)));
  const Jrise = Jtransit - w0 / (2 * Math.PI);
  const Jset = Jtransit + w0 / (2 * Math.PI);
  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
}
