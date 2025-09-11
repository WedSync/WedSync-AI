/**
 * Domain Validation Tests (WS-222)
 * Comprehensive tests for domain validation, DNS parsing, and related utilities
 */

import {
  validateDomainName,
  validateSubdomain,
  validateDNSRecord,
  validateDomainForm,
  isDevelopmentDomain,
  suggestDomainAlternatives,
  parseDNSRecord,
  validateDNSPropagation,
  estimatePropagationTime,
} from '../validation';
import { DNSRecord, DNSRecordFormData, DomainFormData } from '@/types/domains';

describe('Domain Validation', () => {
  describe('validateDomainName', () => {
    it('validates correct domain names', () => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'test-site.org',
        'a.b.c.d.example.com',
        'xn--fsq.xn--xhq521b', // punycode
        '123domains.com',
        'domain123.net',
      ];

      validDomains.forEach((domain) => {
        const result = validateDomainName(domain);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('rejects empty or invalid domains', () => {
      const invalidDomains = [
        '',
        ' ',
        'domain',
        'domain.',
        '.domain.com',
        'domain..com',
        '-domain.com',
        'domain-.com',
        'domain.123',
        'domain.c',
        'toolongdomainlabelthatexceedssixtythreecharacterslimitandshouldfail.com',
      ];

      invalidDomains.forEach((domain) => {
        const result = validateDomainName(domain);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('provides helpful suggestions for common issues', () => {
      const testCases = [
        {
          domain: 'domain_with_underscores.com',
          expectedSuggestion: 'Replace underscores with hyphens',
        },
        {
          domain: '-domain.com',
          expectedSuggestion: 'Remove hyphens from the beginning or end',
        },
        {
          domain: 'domain with spaces.com',
          expectedSuggestion: 'Remove spaces from domain name',
        },
        {
          domain: 'DOMAIN.COM',
          expectedSuggestion: 'Convert to lowercase',
        },
      ];

      testCases.forEach(({ domain, expectedSuggestion }) => {
        const result = validateDomainName(domain);
        expect(result.isValid).toBe(false);
        expect(result.suggestions).toContain(expectedSuggestion);
      });
    });

    it('warns about reserved domains', () => {
      const reservedDomains = ['localhost', 'test', 'example.com'];

      reservedDomains.forEach((domain) => {
        const result = validateDomainName(domain);
        expect(result.warnings).toContain(
          `"${domain}" is a reserved domain name`,
        );
      });
    });

    it('warns about international domains', () => {
      const internationalDomain = 'münchen.de';
      const result = validateDomainName(internationalDomain);

      expect(result.warnings).toContain(
        'International domains should be punycode encoded for DNS',
      );
      expect(result.suggestions).toContain(
        'Consider using punycode encoding for international characters',
      );
    });

    it('validates domain length limits', () => {
      // Test max domain length (253 chars)
      const longDomain = 'a'.repeat(250) + '.co';
      const tooLongDomain = 'a'.repeat(252) + '.com';

      expect(validateDomainName(longDomain).isValid).toBe(true);
      expect(validateDomainName(tooLongDomain).isValid).toBe(false);
      expect(validateDomainName(tooLongDomain).errors).toContain(
        'Domain name cannot exceed 253 characters',
      );
    });

    it('validates individual label limits', () => {
      const longLabel = 'a'.repeat(64);
      const domain = `${longLabel}.com`;

      const result = validateDomainName(domain);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Domain label "${longLabel}" exceeds 63 characters`,
      );
    });
  });

  describe('validateSubdomain', () => {
    it('validates correct subdomains', () => {
      const validSubdomains = [
        'www',
        'api',
        'blog',
        'test-site',
        'sub123',
        '123sub',
        'a',
      ];

      validSubdomains.forEach((subdomain) => {
        const result = validateSubdomain(subdomain);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('allows empty subdomain (optional)', () => {
      const result = validateSubdomain('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid subdomains', () => {
      const invalidSubdomains = [
        '-subdomain',
        'subdomain-',
        'sub_domain',
        'sub domain',
        'a'.repeat(64), // too long
      ];

      invalidSubdomains.forEach((subdomain) => {
        const result = validateSubdomain(subdomain);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('warns about reserved subdomains', () => {
      const reservedSubdomains = ['www', 'mail', 'admin', 'api'];

      reservedSubdomains.forEach((subdomain) => {
        const result = validateSubdomain(subdomain);
        expect(result.warnings).toContain(
          `"${subdomain}" is a commonly reserved subdomain`,
        );
      });
    });
  });

  describe('validateDNSRecord', () => {
    const baseRecord: DNSRecordFormData = {
      record_type: 'A',
      name: '@',
      value: '192.168.1.1',
      ttl: 3600,
      notes: '',
    };

    it('validates A records correctly', () => {
      const aRecord = {
        ...baseRecord,
        record_type: 'A' as const,
        value: '192.168.1.1',
      };
      const result = validateDNSRecord(aRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates AAAA records correctly', () => {
      const aaaaRecord = {
        ...baseRecord,
        record_type: 'AAAA' as const,
        value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      const result = validateDNSRecord(aaaaRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates CNAME records correctly', () => {
      const cnameRecord = {
        ...baseRecord,
        record_type: 'CNAME' as const,
        name: 'www',
        value: 'example.com',
      };
      const result = validateDNSRecord(cnameRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects CNAME for root domain', () => {
      const rootCnameRecord = {
        ...baseRecord,
        record_type: 'CNAME' as const,
        name: '@',
        value: 'example.com',
      };
      const result = validateDNSRecord(rootCnameRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CNAME records cannot be set for the root domain (@)',
      );
    });

    it('validates MX records with priority', () => {
      const mxRecord = {
        ...baseRecord,
        record_type: 'MX' as const,
        value: 'mail.example.com',
        priority: 10,
      };
      const result = validateDNSRecord(mxRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires priority for MX records', () => {
      const mxRecord = {
        ...baseRecord,
        record_type: 'MX' as const,
        value: 'mail.example.com',
      };
      const result = validateDNSRecord(mxRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'MX record must have a priority between 0 and 65535',
      );
    });

    it('validates TXT records', () => {
      const txtRecord = {
        ...baseRecord,
        record_type: 'TXT' as const,
        value: 'v=spf1 include:_spf.google.com ~all',
      };
      const result = validateDNSRecord(txtRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain(
        'SPF records should be carefully configured to avoid email delivery issues',
      );
    });

    it('validates SRV records with complex format', () => {
      const srvRecord = {
        ...baseRecord,
        record_type: 'SRV' as const,
        name: '_http._tcp',
        value: '10 80 example.com',
        priority: 10,
      };
      const result = validateDNSRecord(srvRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid IP addresses', () => {
      const invalidARecord = {
        ...baseRecord,
        record_type: 'A' as const,
        value: '999.999.999.999',
      };
      const result = validateDNSRecord(invalidARecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'A record must contain a valid IPv4 address',
      );
    });

    it('warns about unusual TTL values', () => {
      const lowTtlRecord = { ...baseRecord, ttl: 30 };
      const result = validateDNSRecord(lowTtlRecord);

      expect(result.warnings).toContain(
        'TTL below 60 seconds may cause performance issues',
      );

      const highTtlRecord = { ...baseRecord, ttl: 100000 };
      const result2 = validateDNSRecord(highTtlRecord);

      expect(result2.warnings).toContain(
        'TTL above 24 hours may cause slow propagation of changes',
      );
    });

    it('validates required fields', () => {
      const incompleteRecord = {
        ...baseRecord,
        name: '',
        value: '',
        record_type: '' as any,
      };
      const result = validateDNSRecord(incompleteRecord);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Record name is required');
      expect(result.errors).toContain('Record value is required');
      expect(result.errors).toContain('Record type is required');
    });
  });

  describe('validateDomainForm', () => {
    const baseDomainForm: DomainFormData = {
      domain_name: 'example.com',
      subdomain: 'www',
      is_primary: false,
      is_wildcard: false,
      target_cname: 'wedsync.com',
      custom_ip_address: '',
      notes: '',
    };

    it('validates complete domain form', () => {
      const result = validateDomainForm(baseDomainForm);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires either CNAME or IP address', () => {
      const formWithoutTarget = {
        ...baseDomainForm,
        target_cname: '',
        custom_ip_address: '',
      };
      const result = validateDomainForm(formWithoutTarget);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Either a target CNAME or custom IP address must be specified',
      );
    });

    it('warns when both CNAME and IP are specified', () => {
      const formWithBoth = {
        ...baseDomainForm,
        target_cname: 'wedsync.com',
        custom_ip_address: '192.168.1.1',
      };
      const result = validateDomainForm(formWithBoth);

      expect(result.warnings).toContain(
        'Both CNAME and IP address are specified - CNAME will take precedence',
      );
    });

    it('validates IP address format', () => {
      const formWithInvalidIp = {
        ...baseDomainForm,
        target_cname: '',
        custom_ip_address: '999.999.999.999',
      };
      const result = validateDomainForm(formWithInvalidIp);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Custom IP address must be a valid IPv4 or IPv6 address',
      );
    });

    it('validates target CNAME format', () => {
      const formWithInvalidCname = {
        ...baseDomainForm,
        target_cname: 'invalid..cname.com',
      };
      const result = validateDomainForm(formWithInvalidCname);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Target CNAME must be a valid domain name',
      );
    });
  });

  describe('isDevelopmentDomain', () => {
    it('identifies development domains', () => {
      const devDomains = [
        'app.local',
        'test.localhost',
        'example.test',
        'myapp.dev',
        'test.example.com',
        'staging.example.com',
        'dev.example.com',
        'demo.example.com',
        'abc123.ngrok.io',
        'myapp.herokuapp.com',
        'site.netlify.app',
        'project.vercel.app',
      ];

      devDomains.forEach((domain) => {
        expect(isDevelopmentDomain(domain)).toBe(true);
      });
    });

    it('identifies production domains', () => {
      const prodDomains = [
        'example.com',
        'www.example.com',
        'api.example.com',
        'blog.example.com',
        'shop.example.org',
      ];

      prodDomains.forEach((domain) => {
        expect(isDevelopmentDomain(domain)).toBe(false);
      });
    });
  });

  describe('suggestDomainAlternatives', () => {
    it('suggests lowercase version', () => {
      const suggestions = suggestDomainAlternatives('EXAMPLE.COM');
      expect(suggestions).toContain('example.com');
    });

    it('removes invalid characters', () => {
      const suggestions = suggestDomainAlternatives('exam_ple!.com');
      expect(suggestions).toContain('example.com');
    });

    it('suggests TLD additions', () => {
      const suggestions = suggestDomainAlternatives('example');
      expect(suggestions).toContain('example.com');
      expect(suggestions).toContain('example.org');
      expect(suggestions).toContain('example.net');
    });

    it('returns empty array for empty input', () => {
      const suggestions = suggestDomainAlternatives('');
      expect(suggestions).toHaveLength(0);
    });

    it('removes duplicates from suggestions', () => {
      const suggestions = suggestDomainAlternatives('EXAMPLE.COM');
      const uniqueSuggestions = new Set(suggestions);
      expect(suggestions.length).toBe(uniqueSuggestions.size);
    });
  });

  describe('parseDNSRecord', () => {
    it('parses simple A record', () => {
      const record = 'www 3600 IN A 192.168.1.1';
      const parsed = parseDNSRecord(record);

      expect(parsed).toEqual({
        name: 'www',
        ttl: 3600,
        recordClass: 'IN',
        type: 'A',
        value: '192.168.1.1',
      });
    });

    it('parses MX record with priority', () => {
      const record = 'mail 3600 IN MX 10 mail.example.com';
      const parsed = parseDNSRecord(record);

      expect(parsed).toEqual({
        name: 'mail',
        ttl: 3600,
        recordClass: 'IN',
        type: 'MX',
        value: 'mail.example.com',
        priority: 10,
      });
    });

    it('parses record without TTL', () => {
      const record = 'www A 192.168.1.1';
      const parsed = parseDNSRecord(record);

      expect(parsed).toEqual({
        name: 'www',
        type: 'A',
        value: '192.168.1.1',
        recordClass: 'IN',
      });
    });

    it('parses TXT record with spaces in value', () => {
      const record = 'test TXT "v=spf1 include:_spf.google.com ~all"';
      const parsed = parseDNSRecord(record);

      expect(parsed).toEqual({
        name: 'test',
        type: 'TXT',
        value: '"v=spf1 include:_spf.google.com ~all"',
        recordClass: 'IN',
      });
    });

    it('returns null for invalid records', () => {
      const invalidRecords = ['', ' ', 'invalid', 'too few'];

      invalidRecords.forEach((record) => {
        expect(parseDNSRecord(record)).toBeNull();
      });
    });

    it('handles parsing errors gracefully', () => {
      const problematicRecord = 'www 3600 IN';
      const parsed = parseDNSRecord(problematicRecord);

      expect(parsed).toBeNull();
    });
  });

  describe('validateDNSPropagation', () => {
    const createMockRecord = (overrides: Partial<DNSRecord>): DNSRecord => ({
      id: 'test-id',
      domain_id: 'domain-1',
      record_type: 'A',
      name: '@',
      value: '192.168.1.1',
      ttl: 3600,
      is_verified: true,
      managed_by_wedsync: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    it('passes validation for non-conflicting records', () => {
      const records = [
        createMockRecord({ id: '1', name: 'www', record_type: 'A' }),
        createMockRecord({ id: '2', name: 'mail', record_type: 'MX' }),
        createMockRecord({ id: '3', name: '@', record_type: 'TXT' }),
      ];

      const result = validateDNSPropagation(records);
      expect(result.isValid).toBe(true);
    });

    it('detects CNAME conflicts', () => {
      const records = [
        createMockRecord({
          id: '1',
          name: 'www',
          record_type: 'CNAME',
          value: 'example.com',
        }),
        createMockRecord({
          id: '2',
          name: 'www',
          record_type: 'A',
          value: '192.168.1.1',
        }),
      ];

      const result = validateDNSPropagation(records);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CNAME record for www conflicts with other record types',
      );
    });

    it('detects multiple CNAME records for same name', () => {
      const records = [
        createMockRecord({
          id: '1',
          name: 'www',
          record_type: 'CNAME',
          value: 'example1.com',
        }),
        createMockRecord({
          id: '2',
          name: 'www',
          record_type: 'CNAME',
          value: 'example2.com',
        }),
      ];

      const result = validateDNSPropagation(records);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Multiple CNAME records for www - only one CNAME is allowed per name',
      );
    });

    it('warns about too many A records', () => {
      const records = Array.from({ length: 6 }, (_, i) =>
        createMockRecord({
          id: `record-${i}`,
          name: 'www',
          record_type: 'A',
          value: `192.168.1.${i + 1}`,
        }),
      );

      const result = validateDNSPropagation(records);
      expect(result.warnings).toContain(
        'www has many A records (6) - consider load balancing',
      );
    });
  });

  describe('estimatePropagationTime', () => {
    const baseRecord: DNSRecord = {
      id: 'test-id',
      domain_id: 'domain-1',
      record_type: 'A',
      name: '@',
      value: '192.168.1.1',
      ttl: 3600,
      is_verified: true,
      managed_by_wedsync: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    it('provides faster estimates for low TTL records', () => {
      const lowTtlRecord = { ...baseRecord, ttl: 300 };
      const estimate = estimatePropagationTime(lowTtlRecord);

      expect(estimate.min_minutes).toBe(1);
      expect(estimate.max_hours).toBe(4);
      expect(estimate.factors).toContain('Low TTL allows faster propagation');
    });

    it('provides slower estimates for high TTL records', () => {
      const highTtlRecord = { ...baseRecord, ttl: 7200 };
      const estimate = estimatePropagationTime(highTtlRecord);

      expect(estimate.min_minutes).toBe(60);
      expect(estimate.max_hours).toBe(48);
      expect(estimate.factors).toContain('High TTL may slow propagation');
    });

    it('adjusts estimates based on record type', () => {
      const cnameRecord = { ...baseRecord, record_type: 'CNAME' as const };
      const estimate = estimatePropagationTime(cnameRecord);

      expect(estimate.factors).toContain(
        'CNAME requires additional DNS lookups',
      );
      expect(estimate.max_hours).toBeGreaterThan(24);
    });

    it('provides specific factors for MX records', () => {
      const mxRecord = { ...baseRecord, record_type: 'MX' as const };
      const estimate = estimatePropagationTime(mxRecord);

      expect(estimate.factors).toContain(
        'MX records may need email server validation',
      );
      expect(estimate.max_hours).toBeGreaterThan(24);
    });

    it('provides optimistic estimates for simple records', () => {
      const aRecord = { ...baseRecord, record_type: 'A' as const };
      const estimate = estimatePropagationTime(aRecord);

      expect(estimate.factors).toContain(
        'Simple record type propagates quickly',
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles null and undefined inputs gracefully', () => {
      expect(validateDomainName('')).toHaveProperty('isValid', false);
      expect(validateSubdomain('')).toHaveProperty('isValid', true);
      expect(suggestDomainAlternatives('')).toEqual([]);
      expect(parseDNSRecord('')).toBeNull();
      expect(parseDNSRecord(null as any)).toBeNull();
    });

    it('handles Unicode and special characters', () => {
      const unicodeDomain = 'münchen.de';
      const result = validateDomainName(unicodeDomain);

      expect(result.warnings).toContain(
        'International domains should be punycode encoded for DNS',
      );
    });

    it('validates extremely long inputs', () => {
      const veryLongDomain = 'a'.repeat(300) + '.com';
      const result = validateDomainName(veryLongDomain);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Domain name cannot exceed 253 characters',
      );
    });

    it('handles malformed DNS records', () => {
      const malformedRecords = [
        'incomplete record',
        'www',
        '',
        'www 3600',
        'www INVALID 192.168.1.1',
      ];

      malformedRecords.forEach((record) => {
        const parsed = parseDNSRecord(record);
        expect(parsed).toBeNull();
      });
    });
  });

  describe('Performance and Validation Optimization', () => {
    it('validates large domain lists efficiently', () => {
      const startTime = Date.now();

      // Test with 1000 domains
      for (let i = 0; i < 1000; i++) {
        validateDomainName(`test${i}.example.com`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('handles concurrent validations', async () => {
      const domains = Array.from(
        { length: 100 },
        (_, i) => `test${i}.example.com`,
      );

      const startTime = Date.now();
      const results = await Promise.all(
        domains.map((domain) => Promise.resolve(validateDomainName(domain))),
      );
      const endTime = Date.now();

      // All should be valid
      expect(results.every((r) => r.isValid)).toBe(true);

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
