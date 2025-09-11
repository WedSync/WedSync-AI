import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract client information
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      request.headers.get('x-client-ip') ||
      'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const acceptLanguage = request.headers.get('accept-language') || 'unknown';
    const timezone = request.headers.get('x-timezone') || 'unknown';

    // Extract first IP if there are multiple (in case of proxy chains)
    const primaryIP = clientIP.includes(',')
      ? clientIP.split(',')[0].trim()
      : clientIP;

    // Basic geolocation detection (in production, you'd use a service like MaxMind)
    let country = 'unknown';
    let region = 'unknown';

    // For privacy compliance, we only need basic location info
    try {
      // This would be replaced with actual geolocation service
      const geoResponse = await fetch(
        `http://ip-api.com/json/${primaryIP}?fields=country,regionName,status`,
      );
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        if (geoData.status === 'success') {
          country = geoData.country || 'unknown';
          region = geoData.regionName || 'unknown';
        }
      }
    } catch (error) {
      // Geolocation is optional, continue without it
      console.warn('Geolocation lookup failed:', error);
    }

    const clientInfo = {
      ip: primaryIP,
      userAgent,
      acceptLanguage,
      timezone,
      country,
      region,
      timestamp: new Date().toISOString(),
      // Privacy-safe fingerprint for analytics
      browserFingerprint: await generatePrivacySafeFingerprint(
        userAgent,
        acceptLanguage,
      ),
      // Determine if this is likely a EU/GDPR jurisdiction
      gdprJurisdiction: isGDPRJurisdiction(country),
      // Determine if this is likely a CCPA jurisdiction
      ccpaJurisdiction: isCCPAJurisdiction(region, country),
    };

    return NextResponse.json(clientInfo);
  } catch (error) {
    console.error('Client info API error:', error);

    // Return minimal info on error
    return NextResponse.json({
      ip: 'unknown',
      userAgent: 'unknown',
      timestamp: new Date().toISOString(),
      country: 'unknown',
      region: 'unknown',
      gdprJurisdiction: true, // Default to stricter privacy rules
      ccpaJurisdiction: false,
      error: 'Failed to determine client information',
    });
  }
}

// Generate a privacy-safe browser fingerprint for analytics
async function generatePrivacySafeFingerprint(
  userAgent: string,
  language: string,
): Promise<string> {
  // Create a simple hash of non-identifying browser characteristics
  const data = `${userAgent.slice(0, 50)}|${language}|${new Date().getFullYear()}`;

  // Simple hash function (in production, use crypto.subtle)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
}

// Check if country is subject to GDPR
function isGDPRJurisdiction(country: string): boolean {
  const gdprCountries = [
    'Austria',
    'Belgium',
    'Bulgaria',
    'Croatia',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Estonia',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hungary',
    'Ireland',
    'Italy',
    'Latvia',
    'Lithuania',
    'Luxembourg',
    'Malta',
    'Netherlands',
    'Poland',
    'Portugal',
    'Romania',
    'Slovakia',
    'Slovenia',
    'Spain',
    'Sweden',
    'Iceland',
    'Liechtenstein',
    'Norway',
    'United Kingdom',
  ];

  return gdprCountries.includes(country) || country === 'unknown'; // Default to GDPR compliance
}

// Check if region/country is subject to CCPA
function isCCPAJurisdiction(region: string, country: string): boolean {
  return country === 'United States' && region === 'California';
}
