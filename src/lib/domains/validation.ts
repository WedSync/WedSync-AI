/**
 * Domain Validation Utilities (WS-222)
 * Comprehensive domain name, subdomain, and DNS validation
 */

import {
  DNSRecord,
  DNSRecordType,
  DomainFormData,
  DNSRecordFormData,
} from '@/types/domains';

// Domain name validation regex (RFC 1035/1123 compliant)
const DOMAIN_NAME_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;

// Subdomain validation regex
const SUBDOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;

// IP address validation regexes
const IPV4_REGEX =
  /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

// Email validation regex (for MX records)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex (for CNAME targets)
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DomainValidationResult extends ValidationResult {
  suggestions?: string[];
}

/**
 * Validates a domain name according to RFC standards
 */
export function validateDomainName(domain: string): DomainValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Basic validation
  if (!domain) {
    errors.push('Domain name is required');
    return { isValid: false, errors, warnings, suggestions };
  }

  // Length validation
  if (domain.length > 253) {
    errors.push('Domain name cannot exceed 253 characters');
  }

  if (domain.length < 1) {
    errors.push('Domain name cannot be empty');
  }

  // Format validation
  if (!DOMAIN_NAME_REGEX.test(domain)) {
    errors.push('Invalid domain name format');

    // Provide specific suggestions
    if (domain.includes('_')) {
      suggestions.push('Replace underscores with hyphens');
    }
    if (domain.startsWith('-') || domain.endsWith('-')) {
      suggestions.push('Remove hyphens from the beginning or end');
    }
    if (domain.includes(' ')) {
      suggestions.push('Remove spaces from domain name');
    }
    if (/[A-Z]/.test(domain)) {
      suggestions.push('Convert to lowercase');
    }
  }

  // TLD validation
  const parts = domain.split('.');
  if (parts.length < 2) {
    errors.push('Domain must include a top-level domain (e.g., .com, .org)');
  } else {
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || tld.length > 6) {
      warnings.push('Unusual TLD length - verify this is correct');
    }
    if (/^\d+$/.test(tld)) {
      errors.push('TLD cannot be purely numeric');
    }
  }

  // Label validation (each part between dots)
  for (const label of parts) {
    if (label.length > 63) {
      errors.push(`Domain label "${label}" exceeds 63 characters`);
    }
    if (label.length === 0) {
      errors.push('Domain cannot have empty labels (consecutive dots)');
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      errors.push(`Domain label "${label}" cannot start or end with hyphen`);
    }
  }

  // International domain warnings
  if (/[^\x00-\x7F]/.test(domain)) {
    warnings.push('International domains should be punycode encoded for DNS');
    suggestions.push(
      'Consider using punycode encoding for international characters',
    );
  }

  // Common typos and suggestions
  if (domain.includes('..')) {
    errors.push('Domain cannot contain consecutive dots');
  }

  // Reserved domains
  const reservedDomains = [
    'localhost',
    'test',
    'invalid',
    'example.com',
    'example.org',
  ];
  if (reservedDomains.includes(domain.toLowerCase())) {
    warnings.push(`"${domain}" is a reserved domain name`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validates a subdomain
 */
export function validateSubdomain(subdomain: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!subdomain) {
    return { isValid: true, errors, warnings }; // Subdomain is optional
  }

  if (subdomain.length > 63) {
    errors.push('Subdomain cannot exceed 63 characters');
  }

  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    errors.push('Invalid subdomain format');
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    errors.push('Subdomain cannot start or end with hyphen');
  }

  // Reserved subdomains
  const reservedSubdomains = [
    'www',
    'mail',
    'ftp',
    'localhost',
    'admin',
    'root',
    'api',
  ];
  if (reservedSubdomains.includes(subdomain.toLowerCase())) {
    warnings.push(`"${subdomain}" is a commonly reserved subdomain`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates DNS record based on type
 */
export function validateDNSRecord(record: DNSRecordFormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!record.name) {
    errors.push('Record name is required');
  }

  if (!record.value) {
    errors.push('Record value is required');
  }

  if (!record.record_type) {
    errors.push('Record type is required');
  }

  // TTL validation
  if (record.ttl < 60) {
    warnings.push('TTL below 60 seconds may cause performance issues');
  }
  if (record.ttl > 86400) {
    warnings.push('TTL above 24 hours may cause slow propagation of changes');
  }

  // Type-specific validation
  switch (record.record_type) {
    case 'A':
      if (!IPV4_REGEX.test(record.value)) {
        errors.push('A record must contain a valid IPv4 address');
      }
      if (record.priority !== undefined) {
        warnings.push('A records do not use priority fields');
      }
      break;

    case 'AAAA':
      if (!IPV6_REGEX.test(record.value)) {
        errors.push('AAAA record must contain a valid IPv6 address');
      }
      if (record.priority !== undefined) {
        warnings.push('AAAA records do not use priority fields');
      }
      break;

    case 'CNAME':
      const cnameValidation = validateDomainName(record.value);
      if (!cnameValidation.isValid) {
        errors.push('CNAME record must point to a valid domain name');
      }
      if (record.name === '@') {
        errors.push('CNAME records cannot be set for the root domain (@)');
      }
      if (record.priority !== undefined) {
        warnings.push('CNAME records do not use priority fields');
      }
      break;

    case 'MX':
      if (
        record.priority === undefined ||
        record.priority < 0 ||
        record.priority > 65535
      ) {
        errors.push('MX record must have a priority between 0 and 65535');
      }
      const mxValidation = validateDomainName(record.value);
      if (!mxValidation.isValid) {
        errors.push('MX record must point to a valid mail server domain');
      }
      break;

    case 'TXT':
      if (record.value.length > 255) {
        errors.push('TXT record cannot exceed 255 characters per string');
      }
      if (record.priority !== undefined) {
        warnings.push('TXT records do not use priority fields');
      }
      // Check for common TXT record formats
      if (record.value.startsWith('v=spf1')) {
        warnings.push(
          'SPF records should be carefully configured to avoid email delivery issues',
        );
      }
      if (record.value.startsWith('v=DMARC1')) {
        warnings.push(
          'DMARC records affect email authentication - verify configuration',
        );
      }
      break;

    case 'NS':
      const nsValidation = validateDomainName(record.value);
      if (!nsValidation.isValid) {
        errors.push('NS record must point to a valid nameserver domain');
      }
      if (record.priority !== undefined) {
        warnings.push('NS records do not use priority fields');
      }
      break;

    case 'SRV':
      // SRV format: _service._protocol.name. TTL class SRV priority weight port target
      if (
        record.priority === undefined ||
        record.priority < 0 ||
        record.priority > 65535
      ) {
        errors.push('SRV record must have a priority between 0 and 65535');
      }
      if (!record.name.startsWith('_')) {
        errors.push(
          'SRV record name must start with underscore (e.g., _http._tcp)',
        );
      }
      // SRV value format: "weight port target"
      const srvParts = record.value.split(' ');
      if (srvParts.length !== 3) {
        errors.push('SRV record value must be in format "weight port target"');
      } else {
        const [weight, port, target] = srvParts;
        if (!/^\d+$/.test(weight) || parseInt(weight) > 65535) {
          errors.push('SRV weight must be a number between 0 and 65535');
        }
        if (!/^\d+$/.test(port) || parseInt(port) > 65535) {
          errors.push('SRV port must be a number between 0 and 65535');
        }
        if (target !== '.' && !validateDomainName(target).isValid) {
          errors.push('SRV target must be a valid domain or "." for no target');
        }
      }
      break;

    case 'PTR':
      const ptrValidation = validateDomainName(record.value);
      if (!ptrValidation.isValid) {
        errors.push('PTR record must point to a valid domain name');
      }
      if (record.priority !== undefined) {
        warnings.push('PTR records do not use priority fields');
      }
      break;

    default:
      errors.push(`Unsupported record type: ${record.record_type}`);
  }

  // Name validation based on record type
  if (record.record_type !== 'SRV' && record.name.includes('_')) {
    warnings.push('Underscores in record names are only valid for SRV records');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a complete domain form
 */
export function validateDomainForm(data: DomainFormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Domain name validation
  const domainValidation = validateDomainName(data.domain_name);
  errors.push(...domainValidation.errors);
  warnings.push(...domainValidation.warnings);

  // Subdomain validation
  if (data.subdomain) {
    const subdomainValidation = validateSubdomain(data.subdomain);
    errors.push(...subdomainValidation.errors);
    warnings.push(...subdomainValidation.warnings);
  }

  // Target CNAME validation
  if (data.target_cname) {
    const cnameValidation = validateDomainName(data.target_cname);
    if (!cnameValidation.isValid) {
      errors.push('Target CNAME must be a valid domain name');
    }
  }

  // IP address validation
  if (data.custom_ip_address) {
    if (
      !IPV4_REGEX.test(data.custom_ip_address) &&
      !IPV6_REGEX.test(data.custom_ip_address)
    ) {
      errors.push('Custom IP address must be a valid IPv4 or IPv6 address');
    }
  }

  // Business logic validation
  if (data.target_cname && data.custom_ip_address) {
    warnings.push(
      'Both CNAME and IP address are specified - CNAME will take precedence',
    );
  }

  if (!data.target_cname && !data.custom_ip_address) {
    errors.push('Either a target CNAME or custom IP address must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks if a domain is likely to be a test or development domain
 */
export function isDevelopmentDomain(domain: string): boolean {
  const devPatterns = [
    /\.local$/,
    /\.localhost$/,
    /\.test$/,
    /\.dev$/,
    /^test\./,
    /^staging\./,
    /^dev\./,
    /^demo\./,
    /\.ngrok\.io$/,
    /\.herokuapp\.com$/,
    /\.netlify\.app$/,
    /\.vercel\.app$/,
  ];

  return devPatterns.some((pattern) => pattern.test(domain.toLowerCase()));
}

/**
 * Suggests alternative domain names if the current one has issues
 */
export function suggestDomainAlternatives(domain: string): string[] {
  const suggestions: string[] = [];

  if (!domain) return suggestions;

  // Common fixes
  const lowercaseDomain = domain.toLowerCase();
  if (lowercaseDomain !== domain) {
    suggestions.push(lowercaseDomain);
  }

  // Remove invalid characters
  const cleaned = domain
    .toLowerCase()
    .replace(/[^a-z0-9\-\.]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/\.+/g, '.');

  if (cleaned !== domain && cleaned) {
    suggestions.push(cleaned);
  }

  // Add common TLDs if missing
  if (!domain.includes('.')) {
    suggestions.push(`${domain}.com`, `${domain}.org`, `${domain}.net`);
  }

  // Remove duplicates
  return [...new Set(suggestions)];
}

/**
 * Parses a DNS record string into components
 */
export function parseDNSRecord(recordString: string): {
  name?: string;
  ttl?: number;
  recordClass?: string;
  type?: DNSRecordType;
  value?: string;
  priority?: number;
} | null {
  if (!recordString) return null;

  try {
    const parts = recordString.trim().split(/\s+/);
    if (parts.length < 3) return null;

    let name: string | undefined;
    let ttl: number | undefined;
    let recordClass = 'IN';
    let type: DNSRecordType | undefined;
    let value: string | undefined;
    let priority: number | undefined;

    // Basic parsing - this is a simplified version
    // Real DNS zone file parsing would be more complex
    if (parts.length >= 4) {
      name = parts[0];

      // Check if second part is TTL (numeric)
      if (/^\d+$/.test(parts[1])) {
        ttl = parseInt(parts[1]);
        if (parts[2].toUpperCase() === 'IN') {
          type = parts[3] as DNSRecordType;
          value = parts.slice(4).join(' ');
        } else {
          type = parts[2] as DNSRecordType;
          value = parts.slice(3).join(' ');
        }
      } else {
        type = parts[1] as DNSRecordType;
        value = parts.slice(2).join(' ');
      }

      // Handle MX records with priority
      if (type === 'MX' && value) {
        const valueParts = value.split(/\s+/);
        if (valueParts.length >= 2 && /^\d+$/.test(valueParts[0])) {
          priority = parseInt(valueParts[0]);
          value = valueParts.slice(1).join(' ');
        }
      }
    }

    return {
      name,
      ttl,
      recordClass,
      type,
      value,
      priority,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validates DNS propagation requirements
 */
export function validateDNSPropagation(records: DNSRecord[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for conflicting records
  const recordsByName = records.reduce(
    (acc, record) => {
      const key = `${record.name}.${record.record_type}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    },
    {} as Record<string, DNSRecord[]>,
  );

  // Validate conflicts
  Object.entries(recordsByName).forEach(([key, records]) => {
    if (records.length > 1) {
      const [name, type] = key.split('.');

      if (type === 'CNAME') {
        errors.push(
          `Multiple CNAME records for ${name} - only one CNAME is allowed per name`,
        );
      }

      if (type === 'A' && records.length > 5) {
        warnings.push(
          `${name} has many A records (${records.length}) - consider load balancing`,
        );
      }
    }
  });

  // Check for CNAME conflicts with other record types
  records.forEach((record) => {
    if (record.record_type === 'CNAME') {
      const conflictingRecords = records.filter(
        (r) =>
          r.name === record.name &&
          r.record_type !== 'CNAME' &&
          r.id !== record.id,
      );

      if (conflictingRecords.length > 0) {
        errors.push(
          `CNAME record for ${record.name} conflicts with other record types`,
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Estimates DNS propagation time
 */
export function estimatePropagationTime(record: DNSRecord): {
  min_minutes: number;
  max_hours: number;
  factors: string[];
} {
  const factors: string[] = [];
  let minMinutes = 1;
  let maxHours = 24;

  // TTL affects propagation
  if (record.ttl < 300) {
    minMinutes = 1;
    maxHours = 4;
    factors.push('Low TTL allows faster propagation');
  } else if (record.ttl > 3600) {
    minMinutes = 60;
    maxHours = 48;
    factors.push('High TTL may slow propagation');
  }

  // Record type affects complexity
  switch (record.record_type) {
    case 'A':
    case 'AAAA':
      factors.push('Simple record type propagates quickly');
      break;
    case 'CNAME':
      maxHours += 2;
      factors.push('CNAME requires additional DNS lookups');
      break;
    case 'MX':
      maxHours += 4;
      factors.push('MX records may need email server validation');
      break;
    case 'TXT':
      factors.push('TXT records usually propagate quickly');
      break;
  }

  return {
    min_minutes: minMinutes,
    max_hours: maxHours,
    factors,
  };
}
