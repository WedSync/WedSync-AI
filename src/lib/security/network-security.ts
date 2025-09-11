'use client';

interface NetworkSecurityCheck {
  isVenueNetworkSafe: boolean;
  hasVPN: boolean;
  isPublicWiFi: boolean;
  isSSLSupported: boolean;
  hasSecureConnection: boolean;
  networkType: 'cellular' | 'wifi' | 'ethernet' | 'unknown';
  securityRating: 'safe' | 'caution' | 'unsafe';
  warnings: string[];
  recommendations: string[];
}

interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

class NetworkSecurityManager {
  private securityChecks: Map<string, NetworkSecurityCheck> = new Map();
  private securityHeaders: SecurityHeaders;

  constructor() {
    this.securityHeaders = {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.spotify.com https://api.music.apple.com;",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }

  // Detect malicious or unsafe networks commonly found at venues
  public async detectMaliciousNetwork(): Promise<NetworkSecurityCheck> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let securityRating: 'safe' | 'caution' | 'unsafe' = 'safe';

    try {
      // Check if we're on HTTPS
      const hasSecureConnection = location.protocol === 'https:';
      if (!hasSecureConnection) {
        warnings.push('Insecure HTTP connection detected');
        securityRating = 'unsafe';
        recommendations.push('Switch to HTTPS connection immediately');
      }

      // Detect connection type
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      let networkType: NetworkSecurityCheck['networkType'] = 'unknown';

      if (connection) {
        networkType = connection.type || 'unknown';
      }

      // Check for public WiFi indicators
      const isPublicWiFi = await this.detectPublicWiFi();
      if (isPublicWiFi) {
        warnings.push('Public WiFi network detected');
        securityRating = securityRating === 'safe' ? 'caution' : securityRating;
        recommendations.push('Consider using cellular data or VPN');
      }

      // VPN detection (limited in browser)
      const hasVPN = await this.detectVPN();
      if (hasVPN) {
        recommendations.push('VPN connection detected - good for security');
      } else if (isPublicWiFi) {
        recommendations.push('VPN recommended for public WiFi');
      }

      // Check SSL certificate validity
      const isSSLSupported = await this.checkSSLSupport();
      if (!isSSLSupported) {
        warnings.push('SSL certificate issues detected');
        securityRating = 'unsafe';
        recommendations.push('Verify SSL certificates');
      }

      // Venue-specific network checks
      const isVenueNetworkSafe = await this.checkVenueNetworkSafety();
      if (!isVenueNetworkSafe) {
        warnings.push('Potentially unsafe venue network');
        securityRating = securityRating === 'safe' ? 'caution' : securityRating;
        recommendations.push('Verify network credentials with venue staff');
      }

      const securityCheck: NetworkSecurityCheck = {
        isVenueNetworkSafe,
        hasVPN,
        isPublicWiFi,
        isSSLSupported,
        hasSecureConnection,
        networkType,
        securityRating,
        warnings,
        recommendations,
      };

      // Cache the result
      const networkId = await this.getNetworkFingerprint();
      this.securityChecks.set(networkId, securityCheck);

      return securityCheck;
    } catch (error) {
      console.error('Network security check failed:', error);
      return {
        isVenueNetworkSafe: false,
        hasVPN: false,
        isPublicWiFi: true,
        isSSLSupported: false,
        hasSecureConnection: false,
        networkType: 'unknown',
        securityRating: 'unsafe',
        warnings: ['Network security check failed'],
        recommendations: ['Use cellular connection if possible'],
      };
    }
  }

  private async detectPublicWiFi(): Promise<boolean> {
    try {
      // Common public WiFi indicators
      const publicWiFiNames = [
        'free wifi',
        'guest',
        'public',
        'open',
        'venue wifi',
        'wedding wifi',
        'hotel',
        'restaurant',
        'cafe',
        'starbucks',
        'mcdonalds',
      ];

      // Try to get network name (very limited in browser)
      const connection = (navigator as any).connection;
      if (connection && connection.type === 'wifi') {
        // In real implementation, this would need native app capabilities
        // For web, we make educated guesses based on other factors
        return true; // Assume WiFi might be public
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async detectVPN(): Promise<boolean> {
    try {
      // VPN detection in browser is very limited
      // We can check for some indicators but not definitive

      // Check for timezone mismatch (VPN servers in different timezone)
      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Check for DNS over HTTPS indicators
      // This is a weak indicator as many browsers now support DoH by default
      const response = await fetch('https://1.1.1.1/cdn-cgi/trace', {
        method: 'GET',
        cache: 'no-cache',
      }).catch(() => null);

      if (response) {
        const data = await response.text();
        // Cloudflare's trace service can help identify some VPN indicators
        if (data.includes('warp=on') || data.includes('gateway=on')) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkSSLSupport(): Promise<boolean> {
    try {
      // Check if current connection is SSL
      if (location.protocol !== 'https:') {
        return false;
      }

      // Try to fetch a test SSL endpoint
      const response = await fetch('https://www.howsmyssl.com/a/check', {
        method: 'GET',
        cache: 'no-cache',
      }).catch(() => null);

      if (response && response.ok) {
        const sslInfo = await response.json();
        // Check for weak SSL configurations
        if (
          sslInfo.tls_version === 'TLS 1.0' ||
          sslInfo.tls_version === 'TLS 1.1'
        ) {
          return false; // Weak TLS versions
        }
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkVenueNetworkSafety(): Promise<boolean> {
    try {
      // Check for captive portal (common in venue WiFi)
      const captivePortalTest = await fetch(
        'http://detectportal.firefox.com/success.txt',
        {
          method: 'GET',
          cache: 'no-cache',
        },
      ).catch(() => null);

      if (captivePortalTest) {
        const text = await captivePortalTest.text();
        if (text !== 'success') {
          return false; // Captive portal detected
        }
      }

      // Check DNS hijacking
      const dnsTest = await this.checkDNSHijacking();
      if (!dnsTest) {
        return false;
      }

      // Check for common venue network vulnerabilities
      const hasSecureWiFi = await this.checkWiFiSecurity();
      if (!hasSecureWiFi) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkDNSHijacking(): Promise<boolean> {
    try {
      // Test known DNS responses
      const testDomains = ['google.com', 'cloudflare.com', 'github.com'];

      for (const domain of testDomains) {
        const response = await fetch(
          `https://dns.google/resolve?name=${domain}&type=A`,
          {
            method: 'GET',
            cache: 'no-cache',
          },
        ).catch(() => null);

        if (response) {
          const data = await response.json();
          // Check if we get expected responses
          if (!data.Answer || data.Answer.length === 0) {
            return false; // Possible DNS manipulation
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkWiFiSecurity(): Promise<boolean> {
    // In a real native app, this would check:
    // - WEP (insecure)
    // - WPA/WPA2 (acceptable)
    // - WPA3 (preferred)
    // - Open networks (insecure)

    // For web apps, we can't directly access WiFi security info
    // So we make educated guesses based on other factors
    return true; // Default to assuming it's secure
  }

  private async getNetworkFingerprint(): Promise<string> {
    // Create a unique fingerprint for the current network
    const connection = (navigator as any).connection;
    const fingerprint = [
      location.hostname,
      connection?.effectiveType || 'unknown',
      connection?.rtt || 0,
      connection?.downlink || 0,
      new Date().getTimezoneOffset(),
    ].join('|');

    // Hash the fingerprint
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex.substring(0, 16);
  }

  // Secure API request wrapper
  public async secureAPIRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response | null> {
    try {
      const securityCheck = await this.detectMaliciousNetwork();

      if (securityCheck.securityRating === 'unsafe') {
        console.warn(
          'Blocking API request due to unsafe network:',
          securityCheck.warnings,
        );
        throw new Error('Network security check failed');
      }

      // Add security headers
      const secureOptions: RequestInit = {
        ...options,
        headers: {
          ...this.securityHeaders,
          ...options.headers,
          'X-Requested-With': 'XMLHttpRequest',
          'X-Security-Check': securityCheck.securityRating,
        },
        credentials: 'same-origin',
        mode: 'cors',
      };

      // Ensure HTTPS
      const secureUrl = url.startsWith('http://')
        ? url.replace('http://', 'https://')
        : url;

      const response = await fetch(secureUrl, secureOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Secure API request failed:', error);
      return null;
    }
  }

  // Validate incoming data for security threats
  public validateIncomingData(data: any): boolean {
    try {
      // Check for common injection patterns
      const jsonString = JSON.stringify(data);

      // XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\(/gi,
        /document\.cookie/gi,
        /document\.write/gi,
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(jsonString)) {
          console.warn('Potential XSS attempt detected in data');
          return false;
        }
      }

      // SQL injection patterns (for API payloads)
      const sqlPatterns = [
        /('|(\\';)|(\-\-)|(\;)|(\|)|(\*)|(%)|(\+)|(union)|(select)|(insert)|(update)|(delete)|(drop)|(create)|(alter)|(exec)|(execute))/gi,
        /(script)|(iframe)|(object)|(embed)|(form)/gi,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(jsonString)) {
          console.warn('Potential SQL injection attempt detected in data');
          return false;
        }
      }

      // Path traversal patterns
      if (jsonString.includes('../') || jsonString.includes('..\\')) {
        console.warn('Potential path traversal attempt detected in data');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Data validation error:', error);
      return false;
    }
  }

  // Get security recommendations for current network
  public async getSecurityRecommendations(): Promise<string[]> {
    const securityCheck = await this.detectMaliciousNetwork();
    const recommendations = [...securityCheck.recommendations];

    // Add venue-specific recommendations
    if (securityCheck.isPublicWiFi) {
      recommendations.push('Avoid accessing sensitive data on public WiFi');
      recommendations.push('Use device hotspot instead if possible');
    }

    if (securityCheck.networkType === 'wifi' && !securityCheck.hasVPN) {
      recommendations.push('Consider enabling VPN for WiFi connections');
    }

    if (securityCheck.securityRating === 'caution') {
      recommendations.push('Monitor network activity for suspicious behavior');
      recommendations.push('Log out of accounts when finished');
    }

    if (securityCheck.securityRating === 'unsafe') {
      recommendations.push('Switch to cellular data immediately');
      recommendations.push('Contact venue IT support');
      recommendations.push(
        'Consider postponing non-essential network activity',
      );
    }

    // DJ-specific recommendations
    recommendations.push('Keep device locked when not in use');
    recommendations.push('Avoid downloading music from unknown sources');
    recommendations.push('Regularly clear cache and temporary files');

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  // Monitor network security in real-time
  public startSecurityMonitoring(): () => void {
    const interval = setInterval(async () => {
      const securityCheck = await this.detectMaliciousNetwork();

      if (securityCheck.securityRating === 'unsafe') {
        // Trigger security alert
        console.error(
          'SECURITY ALERT: Unsafe network detected',
          securityCheck.warnings,
        );

        // Show user notification if possible
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Security Alert', {
            body: 'Unsafe network detected. Please review security warnings.',
            icon: '/icons/security-warning.png',
            requireInteraction: true,
          });
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }
}

// Singleton instance
const networkSecurity = new NetworkSecurityManager();

export { networkSecurity as detectMaliciousNetwork, NetworkSecurityManager };
export default networkSecurity;
