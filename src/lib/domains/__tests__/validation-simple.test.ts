/**
 * Simple Domain Validation Tests
 * WS-222: Custom Domains System - Core Validation Logic
 */

import { describe, it, expect } from 'vitest';
import {
  validateDomainName,
  validateDNSRecord,
  parseDNSRecord,
  estimatePropagationTime,
} from '../validation';

describe('Domain Validation - Core Logic', () => {
  describe('validateDomainName', () => {
    it('accepts valid domain names', () => {
      expect(validateDomainName('example.com')).toEqual({ isValid: true });
      expect(validateDomainName('subdomain.example.com')).toEqual({
        isValid: true,
      });
      expect(validateDomainName('my-wedding.co.uk')).toEqual({ isValid: true });
      expect(validateDomainName('photography.studio')).toEqual({
        isValid: true,
      });
    });

    it('rejects invalid domain names', () => {
      expect(validateDomainName('').isValid).toBe(false);
      expect(validateDomainName('invalid..domain.com').isValid).toBe(false);
      expect(validateDomainName('domain-.com').isValid).toBe(false);
      expect(validateDomainName('-domain.com').isValid).toBe(false);
      expect(validateDomainName('domain.').isValid).toBe(false);
    });

    it('rejects domains that are too long', () => {
      const longDomain = 'a'.repeat(250) + '.com';
      const result = validateDomainName(longDomain);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Domain name is too long (max 253 characters)',
      );
    });

    it('provides helpful error messages', () => {
      const result = validateDomainName('invalid..domain');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Domain contains consecutive dots');
      expect(result.errors).toContain('Domain must have a valid TLD');
    });
  });

  describe('validateDNSRecord', () => {
    it('validates A records', () => {
      const result = validateDNSRecord('A', 'example.com', '192.168.1.1');
      expect(result.isValid).toBe(true);
    });

    it('validates CNAME records', () => {
      const result = validateDNSRecord(
        'CNAME',
        'www.example.com',
        'example.com',
      );
      expect(result.isValid).toBe(true);
    });

    it('validates TXT records', () => {
      const result = validateDNSRecord(
        'TXT',
        'example.com',
        'wedsync-verification=abc123',
      );
      expect(result.isValid).toBe(true);
    });

    it('validates MX records', () => {
      const result = validateDNSRecord(
        'MX',
        'example.com',
        '10 mail.example.com',
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid A record values', () => {
      const result = validateDNSRecord('A', 'example.com', 'not-an-ip');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('rejects invalid CNAME record values', () => {
      const result = validateDNSRecord(
        'CNAME',
        'www.example.com',
        'invalid..domain',
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid CNAME target format');
    });

    it('handles unknown record types gracefully', () => {
      const result = validateDNSRecord('UNKNOWN', 'example.com', 'value');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported DNS record type: UNKNOWN');
    });
  });

  describe('parseDNSRecord', () => {
    it('parses simple A record', () => {
      const result = parseDNSRecord('example.com 300 IN A 192.168.1.1');
      expect(result).toEqual({
        name: 'example.com',
        ttl: 300,
        type: 'A',
        value: '192.168.1.1',
      });
    });

    it('parses MX record with priority', () => {
      const result = parseDNSRecord(
        'example.com 3600 IN MX 10 mail.example.com',
      );
      expect(result).toEqual({
        name: 'example.com',
        ttl: 3600,
        type: 'MX',
        value: '10 mail.example.com',
      });
    });

    it('parses TXT record with spaces', () => {
      const result = parseDNSRecord(
        'example.com 300 IN TXT "wedsync-verification=abc123 def456"',
      );
      expect(result).toEqual({
        name: 'example.com',
        ttl: 300,
        type: 'TXT',
        value: '"wedsync-verification=abc123 def456"',
      });
    });

    it('returns null for invalid records', () => {
      expect(parseDNSRecord('invalid record format')).toBeNull();
      expect(parseDNSRecord('')).toBeNull();
      expect(parseDNSRecord('incomplete')).toBeNull();
    });

    it('handles parsing errors gracefully', () => {
      expect(parseDNSRecord('malformed 300 IN')).toBeNull();
      expect(parseDNSRecord('example.com abc IN A 192.168.1.1')).toBeNull();
    });
  });

  describe('estimatePropagationTime', () => {
    it('provides faster estimates for low TTL records', () => {
      const records = [
        { type: 'A', ttl: 300, name: 'example.com', value: '192.168.1.1' },
      ];
      const result = estimatePropagationTime(records);
      expect(result.estimatedMinutes).toBeLessThan(30);
    });

    it('provides slower estimates for high TTL records', () => {
      const records = [
        { type: 'A', ttl: 86400, name: 'example.com', value: '192.168.1.1' },
      ];
      const result = estimatePropagationTime(records);
      expect(result.estimatedMinutes).toBeGreaterThan(60);
    });

    it('adjusts estimates based on record type', () => {
      const aRecord = [
        { type: 'A', ttl: 3600, name: 'example.com', value: '192.168.1.1' },
      ];
      const mxRecord = [
        {
          type: 'MX',
          ttl: 3600,
          name: 'example.com',
          value: '10 mail.example.com',
        },
      ];

      const aResult = estimatePropagationTime(aRecord);
      const mxResult = estimatePropagationTime(mxRecord);

      expect(mxResult.estimatedMinutes).toBeGreaterThan(
        aResult.estimatedMinutes,
      );
    });

    it('provides specific factors for different record types', () => {
      const records = [
        {
          type: 'MX',
          ttl: 3600,
          name: 'example.com',
          value: '10 mail.example.com',
        },
      ];
      const result = estimatePropagationTime(records);

      expect(result.factors).toContain(
        'MX records require additional validation',
      );
    });

    it('provides optimistic estimates for simple records', () => {
      const records = [
        { type: 'A', ttl: 300, name: 'example.com', value: '192.168.1.1' },
      ];
      const result = estimatePropagationTime(records);

      expect(result.confidence).toBe('high');
      expect(result.estimatedMinutes).toBeLessThan(15);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles null and undefined inputs gracefully', () => {
      expect(validateDomainName('')).toEqual({
        isValid: false,
        errors: expect.any(Array),
      });
      expect(parseDNSRecord('')).toBeNull();
    });

    it('handles Unicode and special characters', () => {
      const unicodeDomain = 'münchen.de';
      const result = validateDomainName(unicodeDomain);
      // Should handle internationalized domain names appropriately
      expect(result).toHaveProperty('isValid');
    });

    it('validates extremely long inputs', () => {
      const longInput = 'a'.repeat(1000) + '.com';
      const result = validateDomainName(longInput);
      expect(result.isValid).toBe(false);
    });

    it('handles malformed DNS records', () => {
      const malformedRecords = [
        'malformed',
        'incomplete record',
        'example.com IN A',
        'example.com 300 A 192.168.1.1',
      ];

      malformedRecords.forEach((record) => {
        expect(parseDNSRecord(record)).toBeNull();
      });
    });
  });

  describe('Performance and Validation Optimization', () => {
    it('validates large domain lists efficiently', () => {
      const domains = Array.from({ length: 1000 }, (_, i) => `domain${i}.com`);
      const start = Date.now();

      domains.forEach((domain) => validateDomainName(domain));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('handles concurrent validations', async () => {
      const domains = ['example.com', 'test.org', 'demo.net', 'sample.info'];

      const results = await Promise.all(
        domains.map((domain) => Promise.resolve(validateDomainName(domain))),
      );

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result.isValid).toBe(true);
      });
    });
  });
});

describe('Domain Validation - Integration Scenarios', () => {
  it('validates complete domain setup workflow', () => {
    const domain = 'weddings.example.com';

    // Step 1: Validate domain name
    const domainValidation = validateDomainName(domain);
    expect(domainValidation.isValid).toBe(true);

    // Step 2: Validate required DNS records
    const aRecord = validateDNSRecord('A', domain, '203.0.113.10');
    expect(aRecord.isValid).toBe(true);

    const txtRecord = validateDNSRecord(
      'TXT',
      `_wedsync-verification.${domain}`,
      'wedsync-verification=abc123',
    );
    expect(txtRecord.isValid).toBe(true);

    // Step 3: Estimate propagation time
    const records = [
      { type: 'A', ttl: 3600, name: domain, value: '203.0.113.10' },
      {
        type: 'TXT',
        ttl: 300,
        name: `_wedsync-verification.${domain}`,
        value: 'wedsync-verification=abc123',
      },
    ];
    const propagation = estimatePropagationTime(records);

    expect(propagation.estimatedMinutes).toBeGreaterThan(0);
    expect(propagation.confidence).toBeDefined();
  });

  it('validates subdomain setup for wedding venues', () => {
    const baseDomain = 'example.com';
    const subdomains = [
      'bookings.example.com',
      'photos.example.com',
      'guestlist.example.com',
    ];

    subdomains.forEach((subdomain) => {
      const validation = validateDomainName(subdomain);
      expect(validation.isValid).toBe(true);

      const cnameRecord = validateDNSRecord('CNAME', subdomain, baseDomain);
      expect(cnameRecord.isValid).toBe(true);
    });
  });

  it('validates enterprise multi-domain setup', () => {
    const domains = [
      'weddings.venue1.com',
      'bookings.venue2.co.uk',
      'events.venue3.org',
    ];

    domains.forEach((domain) => {
      expect(validateDomainName(domain).isValid).toBe(true);
    });
  });
});
