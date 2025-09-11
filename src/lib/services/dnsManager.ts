/**
 * DNS Manager Service
 * Provides DNS record configuration and validation
 */

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

export interface RecommendedDNSConfiguration {
  records: DNSRecord[];
  description: string;
  priority: 'required' | 'recommended' | 'optional';
}

class DNSManager {
  /**
   * Get recommended DNS configuration for WedSync custom domains
   */
  getRecommendedDNSConfiguration(
    domain: string,
  ): RecommendedDNSConfiguration[] {
    return [
      {
        records: [
          {
            type: 'A',
            name: '@',
            value: '185.199.108.153', // GitHub Pages IP (example)
            ttl: 300,
          },
          {
            type: 'A',
            name: '@',
            value: '185.199.109.153',
            ttl: 300,
          },
          {
            type: 'A',
            name: '@',
            value: '185.199.110.153',
            ttl: 300,
          },
          {
            type: 'A',
            name: '@',
            value: '185.199.111.153',
            ttl: 300,
          },
        ],
        description: 'Point your domain to WedSync servers',
        priority: 'required',
      },
      {
        records: [
          {
            type: 'CNAME',
            name: 'www',
            value: `${domain}`,
            ttl: 300,
          },
        ],
        description: 'Redirect www subdomain to main domain',
        priority: 'recommended',
      },
      {
        records: [
          {
            type: 'TXT',
            name: '@',
            value: 'v=spf1 include:_spf.google.com ~all',
            ttl: 300,
          },
        ],
        description: 'SPF record for email delivery',
        priority: 'optional',
      },
      {
        records: [
          {
            type: 'MX',
            name: '@',
            value: 'smtp.google.com',
            ttl: 300,
            priority: 10,
          },
        ],
        description: 'Email server configuration',
        priority: 'optional',
      },
    ];
  }

  /**
   * Validate DNS record format
   */
  validateDNSRecord(record: DNSRecord): string[] {
    const errors: string[] = [];

    // Validate record type
    const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
    if (!validTypes.includes(record.type)) {
      errors.push(`Invalid DNS record type: ${record.type}`);
    }

    // Validate name
    if (!record.name || record.name.length > 253) {
      errors.push('Invalid record name');
    }

    // Validate TTL
    if (!record.ttl || record.ttl < 60 || record.ttl > 86400) {
      errors.push('TTL must be between 60 and 86400 seconds');
    }

    // Type-specific validation
    switch (record.type) {
      case 'A':
        if (!this.isValidIPv4(record.value)) {
          errors.push('Invalid IPv4 address for A record');
        }
        break;
      case 'AAAA':
        if (!this.isValidIPv6(record.value)) {
          errors.push('Invalid IPv6 address for AAAA record');
        }
        break;
      case 'CNAME':
        if (!this.isValidDomain(record.value)) {
          errors.push('Invalid domain for CNAME record');
        }
        break;
      case 'MX':
        if (!this.isValidDomain(record.value)) {
          errors.push('Invalid domain for MX record');
        }
        if (
          !record.priority ||
          record.priority < 0 ||
          record.priority > 65535
        ) {
          errors.push('MX record requires valid priority (0-65535)');
        }
        break;
      case 'TXT':
        if (!record.value || record.value.length > 65535) {
          errors.push('TXT record value too long or empty');
        }
        break;
      case 'NS':
        if (!this.isValidDomain(record.value)) {
          errors.push('Invalid domain for NS record');
        }
        break;
    }

    return errors;
  }

  /**
   * Generate DNS configuration instructions
   */
  generateDNSInstructions(domain: string, records: DNSRecord[]): string[] {
    const instructions = [
      'DNS Configuration Instructions',
      '================================',
      '',
      '1. Log in to your domain registrar or DNS provider',
      '2. Navigate to DNS management or DNS zone editor',
      '3. Add the following DNS records:',
      '',
    ];

    records.forEach((record, index) => {
      instructions.push(`Record ${index + 1}:`);
      instructions.push(`  Type: ${record.type}`);
      instructions.push(
        `  Name: ${record.name === '@' ? domain : record.name}`,
      );
      instructions.push(`  Value: ${record.value}`);
      instructions.push(`  TTL: ${record.ttl} seconds`);
      if (record.priority) {
        instructions.push(`  Priority: ${record.priority}`);
      }
      instructions.push('');
    });

    instructions.push(
      '4. Save all DNS records',
      '5. Wait 5-30 minutes for DNS propagation',
      '6. Verify domain configuration in WedSync dashboard',
      '',
      'Note: DNS changes can take up to 48 hours to fully propagate worldwide.',
    );

    return instructions;
  }

  /**
   * Check if domain has correct DNS configuration
   */
  async verifyDNSConfiguration(
    domain: string,
    expectedRecords: DNSRecord[],
  ): Promise<{
    verified: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // This would integrate with actual DNS checking service
      // For now, simulate DNS verification
      const mockVerification = this.simulateDNSCheck(domain, expectedRecords);

      if (!mockVerification.hasARecord) {
        issues.push('A record not found - domain will not resolve');
      }

      if (!mockVerification.hasCorrectValues) {
        issues.push('DNS records do not match WedSync requirements');
        suggestions.push(
          'Update DNS records according to configuration instructions',
        );
      }

      if (mockVerification.hasCNAME && mockVerification.hasARecord) {
        issues.push('CNAME and A records cannot coexist for the same name');
      }

      return {
        verified: issues.length === 0,
        issues,
        suggestions,
      };
    } catch (error) {
      return {
        verified: false,
        issues: [`DNS verification failed: ${error.message}`],
        suggestions: ['Check domain configuration and try again'],
      };
    }
  }

  /**
   * Private helper methods
   */
  private isValidIPv4(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  private isValidIPv6(ip: string): boolean {
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}\.)*[a-zA-Z]{2,}$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  private simulateDNSCheck(
    domain: string,
    expectedRecords: DNSRecord[],
  ): {
    hasARecord: boolean;
    hasCorrectValues: boolean;
    hasCNAME: boolean;
  } {
    // Simulate DNS checking logic
    const hasARecord = expectedRecords.some((r) => r.type === 'A');
    const hasCorrectValues = expectedRecords.every(
      (r) => r.value && r.value.length > 0,
    );
    const hasCNAME = expectedRecords.some((r) => r.type === 'CNAME');

    return {
      hasARecord,
      hasCorrectValues,
      hasCNAME,
    };
  }
}

export const dnsManager = new DNSManager();
