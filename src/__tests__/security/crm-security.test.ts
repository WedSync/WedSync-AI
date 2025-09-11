/**
 * CRM Security Tests
 * WS-343 - Team A - Round 1
 *
 * Comprehensive test suite for CRM security utilities
 */

import {
  CRMInputSanitizer,
  CRMTokenSecurity,
  CSRFProtection,
  CRMValidationSchemas,
  SecurityAuditLogger,
  CRMDataEncryption,
  secureCRMIntegrationData,
} from '@/lib/security/crm-security';

describe('CRMInputSanitizer', () => {
  describe('sanitizeString', () => {
    it('removes HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = CRMInputSanitizer.sanitizeString(input);
      expect(result).toBe('alert("xss")Hello World');
    });

    it('escapes dangerous characters', () => {
      const input = 'Test & "quotes" <tags>';
      const result = CRMInputSanitizer.sanitizeString(input);
      expect(result).toBe('Test &amp; &quot;quotes&quot; &lt;tags&gt;');
    });

    it('trims whitespace', () => {
      const input = '   Hello World   ';
      const result = CRMInputSanitizer.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('throws error for non-string input', () => {
      expect(() => CRMInputSanitizer.sanitizeString(123 as any)).toThrow(
        'Input must be a string',
      );
    });

    it('throws error for overly long strings', () => {
      const longString = 'a'.repeat(10001);
      expect(() => CRMInputSanitizer.sanitizeString(longString)).toThrow(
        'Input string too long',
      );
    });
  });

  describe('sanitizeUrl', () => {
    it('accepts valid HTTPS URLs', () => {
      const url = 'https://example.com/api/webhook';
      const result = CRMInputSanitizer.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('accepts valid HTTP URLs', () => {
      const url = 'http://example.com/api/webhook';
      const result = CRMInputSanitizer.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('throws error for invalid protocols', () => {
      expect(() => CRMInputSanitizer.sanitizeUrl('ftp://example.com')).toThrow(
        'Invalid URL protocol',
      );
      expect(() =>
        CRMInputSanitizer.sanitizeUrl('javascript:alert(1)'),
      ).toThrow('Invalid URL protocol');
    });

    it('throws error for localhost URLs', () => {
      expect(() =>
        CRMInputSanitizer.sanitizeUrl('http://localhost:3000'),
      ).toThrow('Invalid URL hostname');
      expect(() =>
        CRMInputSanitizer.sanitizeUrl('http://127.0.0.1:3000'),
      ).toThrow('Invalid URL hostname');
    });

    it('throws error for private IP ranges', () => {
      expect(() => CRMInputSanitizer.sanitizeUrl('http://192.168.1.1')).toThrow(
        'Invalid URL hostname',
      );
      expect(() => CRMInputSanitizer.sanitizeUrl('http://10.0.0.1')).toThrow(
        'Invalid URL hostname',
      );
    });

    it('throws error for overly long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      expect(() => CRMInputSanitizer.sanitizeUrl(longUrl)).toThrow(
        'URL too long',
      );
    });

    it('throws error for malformed URLs', () => {
      expect(() => CRMInputSanitizer.sanitizeUrl('not-a-url')).toThrow(
        'Invalid URL format',
      );
      expect(() => CRMInputSanitizer.sanitizeUrl('http://')).toThrow(
        'Invalid URL format',
      );
    });
  });

  describe('sanitizeEmail', () => {
    it('accepts valid email addresses', () => {
      const email = 'test@example.com';
      const result = CRMInputSanitizer.sanitizeEmail(email);
      expect(result).toBe(email);
    });

    it('converts email to lowercase', () => {
      const email = 'Test@EXAMPLE.COM';
      const result = CRMInputSanitizer.sanitizeEmail(email);
      expect(result).toBe('test@example.com');
    });

    it('throws error for invalid email format', () => {
      expect(() => CRMInputSanitizer.sanitizeEmail('invalid-email')).toThrow(
        'Invalid email format',
      );
      expect(() => CRMInputSanitizer.sanitizeEmail('@example.com')).toThrow(
        'Invalid email format',
      );
      expect(() => CRMInputSanitizer.sanitizeEmail('test@')).toThrow(
        'Invalid email format',
      );
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('accepts valid phone numbers', () => {
      const phone = '+1 (555) 123-4567';
      const result = CRMInputSanitizer.sanitizePhoneNumber(phone);
      expect(result).toBe('+1 (555) 123-4567');
    });

    it('removes invalid characters', () => {
      const phone = '+1-555-123-4567@#$';
      const result = CRMInputSanitizer.sanitizePhoneNumber(phone);
      expect(result).toBe('+1-555-123-4567');
    });

    it('throws error for too short numbers', () => {
      expect(() => CRMInputSanitizer.sanitizePhoneNumber('123')).toThrow(
        'Invalid phone number length',
      );
    });

    it('throws error for too long numbers', () => {
      const longPhone = '1234567890123456';
      expect(() => CRMInputSanitizer.sanitizePhoneNumber(longPhone)).toThrow(
        'Invalid phone number length',
      );
    });
  });
});

describe('CRMTokenSecurity', () => {
  describe('maskToken', () => {
    it('masks long tokens correctly', () => {
      const token = 'abcdefghijklmnopqrstuvwxyz1234567890';
      const result = CRMTokenSecurity.maskToken(token);
      expect(result).toMatch(/^abcd.*7890$/);
      expect(result.includes('*')).toBe(true);
    });

    it('masks short tokens completely', () => {
      const token = 'abc';
      const result = CRMTokenSecurity.maskToken(token);
      expect(result).toBe('***');
    });

    it('handles invalid tokens', () => {
      expect(CRMTokenSecurity.maskToken('')).toBe('[INVALID_TOKEN]');
      expect(CRMTokenSecurity.maskToken(null as any)).toBe('[INVALID_TOKEN]');
      expect(CRMTokenSecurity.maskToken(undefined as any)).toBe(
        '[INVALID_TOKEN]',
      );
    });
  });

  describe('validateApiKey', () => {
    it('accepts valid API keys', () => {
      const validKey = 'sk_live_1234567890abcdef';
      expect(CRMTokenSecurity.validateApiKey(validKey)).toBe(true);
    });

    it('rejects short API keys', () => {
      const shortKey = 'short';
      expect(CRMTokenSecurity.validateApiKey(shortKey)).toBe(false);
    });

    it('rejects weak patterns', () => {
      expect(CRMTokenSecurity.validateApiKey('test1234567890')).toBe(false);
      expect(CRMTokenSecurity.validateApiKey('demo1234567890')).toBe(false);
      expect(CRMTokenSecurity.validateApiKey('password123456')).toBe(false);
      expect(CRMTokenSecurity.validateApiKey('aaaaaaaaaaaaaaaa')).toBe(false); // Repeated characters
    });

    it('rejects non-string inputs', () => {
      expect(CRMTokenSecurity.validateApiKey(123 as any)).toBe(false);
      expect(CRMTokenSecurity.validateApiKey(null as any)).toBe(false);
      expect(CRMTokenSecurity.validateApiKey(undefined as any)).toBe(false);
    });
  });

  describe('generateSecureState', () => {
    it('generates valid state parameters', () => {
      const state = CRMTokenSecurity.generateSecureState();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(20);
      expect(/^[A-Za-z0-9_-]+$/.test(state)).toBe(true);
    });

    it('generates unique states', () => {
      const state1 = CRMTokenSecurity.generateSecureState();
      const state2 = CRMTokenSecurity.generateSecureState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('PKCE generation', () => {
    it('generates valid code verifier', () => {
      const verifier = CRMTokenSecurity.generateCodeVerifier();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(20);
      expect(/^[A-Za-z0-9_-]+$/.test(verifier)).toBe(true);
    });

    it('generates valid code challenge from verifier', () => {
      const verifier = CRMTokenSecurity.generateCodeVerifier();
      const challenge = CRMTokenSecurity.generateCodeChallenge(verifier);
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(20);
      expect(/^[A-Za-z0-9_-]+$/.test(challenge)).toBe(true);
    });

    it('generates consistent challenge for same verifier', () => {
      const verifier = 'test-verifier-1234567890';
      const challenge1 = CRMTokenSecurity.generateCodeChallenge(verifier);
      const challenge2 = CRMTokenSecurity.generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });
  });

  describe('validateOAuthState', () => {
    it('validates matching states', () => {
      const state = 'valid-state-123';
      expect(CRMTokenSecurity.validateOAuthState(state, state)).toBe(true);
    });

    it('rejects mismatched states', () => {
      expect(CRMTokenSecurity.validateOAuthState('state1', 'state2')).toBe(
        false,
      );
    });

    it('rejects invalid state formats', () => {
      expect(
        CRMTokenSecurity.validateOAuthState('invalid state!', 'invalid state!'),
      ).toBe(false);
    });

    it('rejects empty states', () => {
      expect(CRMTokenSecurity.validateOAuthState('', '')).toBe(false);
      expect(
        CRMTokenSecurity.validateOAuthState(null as any, null as any),
      ).toBe(false);
    });
  });
});

describe('CSRFProtection', () => {
  describe('generateToken', () => {
    it('generates valid CSRF tokens', () => {
      const token = CSRFProtection.generateToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('generates unique tokens', () => {
      const token1 = CSRFProtection.generateToken();
      const token2 = CSRFProtection.generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateToken', () => {
    it('validates matching tokens', () => {
      const token = CSRFProtection.generateToken();
      expect(CSRFProtection.validateToken(token, token)).toBe(true);
    });

    it('rejects mismatched tokens', () => {
      const token1 = CSRFProtection.generateToken();
      const token2 = CSRFProtection.generateToken();
      expect(CSRFProtection.validateToken(token1, token2)).toBe(false);
    });

    it('rejects empty tokens', () => {
      expect(CSRFProtection.validateToken('', '')).toBe(false);
      expect(CSRFProtection.validateToken(null as any, null as any)).toBe(
        false,
      );
    });
  });
});

describe('CRMValidationSchemas', () => {
  describe('crmProvider', () => {
    it('accepts valid CRM providers', () => {
      expect(CRMValidationSchemas.crmProvider.parse('tave')).toBe('tave');
      expect(CRMValidationSchemas.crmProvider.parse('honeybook')).toBe(
        'honeybook',
      );
      expect(CRMValidationSchemas.crmProvider.parse('light_blue')).toBe(
        'light_blue',
      );
    });

    it('rejects invalid providers', () => {
      expect(() => CRMValidationSchemas.crmProvider.parse('invalid')).toThrow();
      expect(() => CRMValidationSchemas.crmProvider.parse('')).toThrow();
    });
  });

  describe('connectionName', () => {
    it('accepts valid connection names', () => {
      expect(
        CRMValidationSchemas.connectionName.parse('My Tave Connection'),
      ).toBe('My Tave Connection');
      expect(
        CRMValidationSchemas.connectionName.parse('Test-Connection_123'),
      ).toBe('Test-Connection_123');
    });

    it('rejects invalid connection names', () => {
      expect(() => CRMValidationSchemas.connectionName.parse('')).toThrow();
      expect(() =>
        CRMValidationSchemas.connectionName.parse('a'.repeat(101)),
      ).toThrow();
      expect(() =>
        CRMValidationSchemas.connectionName.parse('Invalid@Name'),
      ).toThrow();
    });
  });

  describe('email', () => {
    it('accepts valid email addresses', () => {
      expect(CRMValidationSchemas.email.parse('test@example.com')).toBe(
        'test@example.com',
      );
    });

    it('rejects invalid email addresses', () => {
      expect(() => CRMValidationSchemas.email.parse('invalid-email')).toThrow();
      expect(() => CRMValidationSchemas.email.parse('@example.com')).toThrow();
    });
  });

  describe('url', () => {
    it('accepts valid URLs', () => {
      expect(CRMValidationSchemas.url.parse('https://example.com')).toBe(
        'https://example.com',
      );
    });

    it('rejects invalid URLs', () => {
      expect(() => CRMValidationSchemas.url.parse('not-a-url')).toThrow();
      expect(() =>
        CRMValidationSchemas.url.parse('ftp://example.com'),
      ).toThrow();
    });
  });

  describe('oauthConfig', () => {
    it('accepts valid OAuth config', () => {
      const config = {
        client_id: 'client123',
        client_secret: 'secret456',
        redirect_uri: 'https://example.com/callback',
        scopes: ['read', 'write'],
      };
      expect(CRMValidationSchemas.oauthConfig.parse(config)).toEqual(config);
    });

    it('rejects invalid OAuth config', () => {
      expect(() =>
        CRMValidationSchemas.oauthConfig.parse({
          client_id: '',
          redirect_uri: 'invalid-url',
          scopes: [],
        }),
      ).toThrow();
    });
  });
});

describe('SecurityAuditLogger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs security events', async () => {
    await SecurityAuditLogger.logSecurityEvent({
      type: 'auth_success',
      userId: 'user123',
      details: { action: 'login' },
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[SECURITY_AUDIT]',
      expect.objectContaining({
        type: 'auth_success',
        userId: 'user123',
        timestamp: expect.any(String),
        details: { action: 'login' },
      }),
    );
  });

  it('sanitizes sensitive data in audit logs', async () => {
    await SecurityAuditLogger.logSecurityEvent({
      type: 'auth_failure',
      details: {
        password: 'secret123',
        token: 'abc123def456',
        username: 'testuser',
      },
    });

    const logCall = consoleSpy.mock.calls[0][1];
    expect(logCall.details.password).toMatch(/\*+/);
    expect(logCall.details.token).toMatch(/\*+/);
    expect(logCall.details.username).toBe('testuser'); // Username should not be masked
  });
});

describe('CRMDataEncryption', () => {
  const testKey = Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex',
  );

  describe('encrypt and decrypt', () => {
    it('encrypts and decrypts data correctly', () => {
      const originalData = 'sensitive API key data';
      const encrypted = CRMDataEncryption.encrypt(originalData, testKey);
      const decrypted = CRMDataEncryption.decrypt(encrypted, testKey);

      expect(decrypted).toBe(originalData);
      expect(encrypted).not.toBe(originalData);
      expect(encrypted.length).toBeGreaterThan(originalData.length);
    });

    it('produces different ciphertexts for same plaintext', () => {
      const data = 'test data';
      const encrypted1 = CRMDataEncryption.encrypt(data, testKey);
      const encrypted2 = CRMDataEncryption.encrypt(data, testKey);

      expect(encrypted1).not.toBe(encrypted2); // Different due to random IV
      expect(CRMDataEncryption.decrypt(encrypted1, testKey)).toBe(data);
      expect(CRMDataEncryption.decrypt(encrypted2, testKey)).toBe(data);
    });
  });

  describe('deriveKey', () => {
    it('derives consistent keys from same password and salt', () => {
      const password = 'test-password';
      const salt = 'test-salt';

      const key1 = CRMDataEncryption.deriveKey(password, salt);
      const key2 = CRMDataEncryption.deriveKey(password, salt);

      expect(key1.equals(key2)).toBe(true);
      expect(key1.length).toBe(32); // 256 bits
    });

    it('derives different keys for different inputs', () => {
      const key1 = CRMDataEncryption.deriveKey('password1', 'salt1');
      const key2 = CRMDataEncryption.deriveKey('password2', 'salt1');
      const key3 = CRMDataEncryption.deriveKey('password1', 'salt2');

      expect(key1.equals(key2)).toBe(false);
      expect(key1.equals(key3)).toBe(false);
      expect(key2.equals(key3)).toBe(false);
    });
  });
});

describe('secureCRMIntegrationData', () => {
  it('sanitizes string fields', () => {
    const data = {
      connection_name: '<script>alert("xss")</script>Test Connection',
      description: 'A test & "description"',
    };

    const secured = secureCRMIntegrationData(data);

    expect(secured.connection_name).toBe('alert("xss")Test Connection');
    expect(secured.description).toBe('A test &amp; &quot;description&quot;');
  });

  it('sanitizes URL fields', () => {
    const data = {
      webhook_url: 'https://example.com/webhook',
      callback_url: 'https://example.com/callback',
    };

    const secured = secureCRMIntegrationData(data);

    expect(secured.webhook_url).toBe('https://example.com/webhook');
    expect(secured.callback_url).toBe('https://example.com/callback');
  });

  it('validates API keys', () => {
    const data = {
      auth_config: {
        api_key: 'valid-api-key-1234567890',
      },
    };

    const secured = secureCRMIntegrationData(data);

    expect(secured.auth_config.api_key).toBe('valid-api-key-1234567890');
  });

  it('throws error for invalid API keys', () => {
    const data = {
      auth_config: {
        api_key: 'short', // Too short
      },
    };

    expect(() => secureCRMIntegrationData(data)).toThrow(
      'Invalid API key format',
    );
  });

  it('throws error for invalid URLs', () => {
    const data = {
      webhook_url: 'http://localhost:3000/webhook', // Localhost not allowed
    };

    expect(() => secureCRMIntegrationData(data)).toThrow(
      'Invalid URL hostname',
    );
  });
});
