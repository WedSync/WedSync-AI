/**
 * Test Suite for CalDAV Security Module (WS-218)
 * Tests for credential validation, rate limiting, and security features
 */

import {
  validateAppleId,
  validateAppSpecificPassword,
  validateCalDAVServerUrl,
  validateCalDAVCredentials,
  SecureCredentialStorage,
  SecureCalDAVRequest,
  auditLog,
  sanitizeCalDAVError,
  validateSession,
  SECURITY_CONFIG,
} from '@/lib/security/caldav-security';

import { CalDAVCredentials, CalDAVError } from '@/types/apple-calendar';

// Mock fetch for secure requests
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('validateAppleId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('validates correct Apple ID format', () => {
    const result = validateAppleId('test@icloud.com');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects invalid Apple ID formats', () => {
    const invalidIds = [
      'invalid-email',
      'test@',
      '@icloud.com',
      'test..test@icloud.com',
      'test@icloud',
      '',
    ];

    invalidIds.forEach((id) => {
      const result = validateAppleId(id);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  test('rejects Apple IDs that are too long', () => {
    const longId = 'a'.repeat(300) + '@icloud.com';
    const result = validateAppleId(longId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Apple ID is too long');
  });

  test('rejects Apple IDs with dangerous characters', () => {
    const dangerousIds = [
      'test<script>@icloud.com',
      'test"@icloud.com',
      'test>alert@icloud.com',
    ];

    dangerousIds.forEach((id) => {
      const result = validateAppleId(id);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Apple ID contains invalid characters');
    });
  });

  test('handles null and undefined inputs', () => {
    expect(validateAppleId(null as any).isValid).toBe(false);
    expect(validateAppleId(undefined as any).isValid).toBe(false);
    expect(validateAppleId(123 as any).isValid).toBe(false);
  });
});

describe('validateAppSpecificPassword', () => {
  test('validates correct app-specific password format', () => {
    const validPassword = 'abcd-efgh-ijkl-mnop'.replace(/-/g, ''); // 16 chars
    const result = validateAppSpecificPassword('abcdefghijklmnop');

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects passwords with incorrect length', () => {
    const shortPassword = 'short';
    const longPassword = 'verylongpasswordthatistoolong';

    expect(validateAppSpecificPassword(shortPassword).isValid).toBe(false);
    expect(validateAppSpecificPassword(longPassword).isValid).toBe(false);
  });

  test('rejects passwords with invalid characters', () => {
    const invalidPasswords = [
      'abcd-efgh-ijkl-m', // contains hyphens
      'abcd efgh ijkl mn', // contains spaces
      'abcd@efgh#ijklmn', // contains special chars
      'abcdefghijklmn12!', // contains exclamation
    ];

    invalidPasswords.forEach((password) => {
      const result = validateAppSpecificPassword(password);
      expect(result.isValid).toBe(false);
    });
  });

  test('rejects obviously fake passwords', () => {
    const fakePasswords = [
      'aaaaaaaaaaaaaaaa', // all lowercase
      'AAAAAAAAAAAAAAAA', // all uppercase
      '1111111111111111', // all numbers
    ];

    fakePasswords.forEach((password) => {
      const result = validateAppSpecificPassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid app-specific password format');
    });
  });

  test('handles null and undefined inputs', () => {
    expect(validateAppSpecificPassword(null as any).isValid).toBe(false);
    expect(validateAppSpecificPassword(undefined as any).isValid).toBe(false);
  });
});

describe('validateCalDAVServerUrl', () => {
  test('validates correct HTTPS URLs', () => {
    const validUrls = [
      'https://caldav.icloud.com/',
      'https://p01-caldav.icloud.com/',
      'https://custom-server.example.com/caldav/',
    ];

    validUrls.forEach((url) => {
      const result = validateCalDAVServerUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe(url);
    });
  });

  test('rejects HTTP URLs', () => {
    const result = validateCalDAVServerUrl('http://caldav.icloud.com/');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Only HTTPS URLs are allowed for security');
  });

  test('rejects dangerous protocols', () => {
    const dangerousUrls = [
      'ftp://caldav.icloud.com/',
      'file:///etc/passwd',
      'javascript:alert(1)',
    ];

    dangerousUrls.forEach((url) => {
      const result = validateCalDAVServerUrl(url);
      expect(result.isValid).toBe(false);
    });
  });

  test('validates Apple iCloud URLs specifically', () => {
    const validAppleUrls = [
      'https://caldav.icloud.com/',
      'https://p01-caldav.icloud.com/',
      'https://p70-caldav.icloud.com/',
    ];

    const invalidAppleUrls = [
      'https://fake-caldav.icloud.com/',
      'https://caldav-icloud.com/',
      'https://icloud.com/caldav/',
    ];

    validAppleUrls.forEach((url) => {
      const result = validateCalDAVServerUrl(url);
      expect(result.isValid).toBe(true);
    });

    invalidAppleUrls.forEach((url) => {
      const result = validateCalDAVServerUrl(url);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Apple iCloud CalDAV server URL');
    });
  });

  test('blocks localhost URLs in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const localhostUrls = [
      'https://localhost:8080/',
      'https://127.0.0.1:8080/',
      'https://192.168.1.1/',
      'https://10.0.0.1/',
    ];

    localhostUrls.forEach((url) => {
      const result = validateCalDAVServerUrl(url);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Private and localhost URLs are not allowed in production',
      );
    });

    process.env.NODE_ENV = originalEnv;
  });
});

describe('validateCalDAVCredentials', () => {
  const validCredentials: CalDAVCredentials = {
    appleId: 'test@icloud.com',
    appPassword: 'abcdefghijklmnop',
    serverUrl: 'https://caldav.icloud.com/',
    isCustomServer: false,
  };

  test('validates correct credentials', () => {
    const result = validateCalDAVCredentials(validCredentials);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedCredentials).toBeDefined();
  });

  test('rejects credentials with invalid components', () => {
    const invalidCredentials: CalDAVCredentials = {
      appleId: 'invalid-email',
      appPassword: 'short',
      serverUrl: 'http://insecure.com/',
      isCustomServer: false,
    };

    const result = validateCalDAVCredentials(invalidCredentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
  });

  test('validates custom server flag consistency', () => {
    const inconsistentCredentials: CalDAVCredentials = {
      appleId: 'test@icloud.com',
      appPassword: 'abcdefghijklmnop',
      serverUrl: 'https://caldav.icloud.com/',
      isCustomServer: true, // Should be false for iCloud
    };

    const result = validateCalDAVCredentials(inconsistentCredentials);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Apple iCloud URL should not be marked as custom server',
    );
  });

  test('sanitizes credentials correctly', () => {
    const credentials: CalDAVCredentials = {
      appleId: '  TEST@ICLOUD.COM  ', // Has spaces and caps
      appPassword: 'abcdefghijklmnop',
      serverUrl: 'https://caldav.icloud.com/',
      isCustomServer: false,
    };

    const result = validateCalDAVCredentials(credentials);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedCredentials?.appleId).toBe('test@icloud.com'); // Trimmed and lowercased
  });
});

describe('SecureCredentialStorage', () => {
  beforeEach(() => {
    mockSessionStorage.getItem.mockReturnValue(null);
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
  });

  test('stores credentials securely', () => {
    const credentials: CalDAVCredentials = {
      appleId: 'test@icloud.com',
      appPassword: 'abcdefghijklmnop',
      serverUrl: 'https://caldav.icloud.com/',
      isCustomServer: false,
    };

    const result = SecureCredentialStorage.storeCredentials(
      credentials,
      'session-123',
    );
    expect(result).toBe(true);
    expect(mockSessionStorage.setItem).toHaveBeenCalled();
  });

  test('does not store actual password', () => {
    const credentials: CalDAVCredentials = {
      appleId: 'test@icloud.com',
      appPassword: 'abcdefghijklmnop',
      serverUrl: 'https://caldav.icloud.com/',
      isCustomServer: false,
    };

    SecureCredentialStorage.storeCredentials(credentials, 'session-123');

    const storedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
    expect(storedData.passwordHash).toBeDefined();
    expect(storedData.passwordHash).not.toBe(credentials.appPassword);
    expect(storedData.appPassword).toBeUndefined(); // Password should not be stored
  });

  test('retrieves valid session', () => {
    const sessionData = {
      sessionId: 'session-123',
      appleId: 'test@icloud.com',
      serverUrl: 'https://caldav.icloud.com/',
      isCustomServer: false,
      timestamp: Date.now(),
      passwordHash: 'abc123',
    };

    mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

    const result = SecureCredentialStorage.retrieveSession();
    expect(result).toEqual(
      expect.objectContaining({
        sessionId: 'session-123',
        appleId: 'test@icloud.com',
      }),
    );
  });

  test('rejects expired sessions', () => {
    const expiredSessionData = {
      sessionId: 'session-123',
      appleId: 'test@icloud.com',
      timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    };

    mockSessionStorage.getItem.mockReturnValue(
      JSON.stringify(expiredSessionData),
    );

    const result = SecureCredentialStorage.retrieveSession();
    expect(result).toBeNull();
    expect(mockSessionStorage.removeItem).toHaveBeenCalled(); // Should clear expired session
  });

  test('clears session correctly', () => {
    SecureCredentialStorage.clearSession();
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
      'caldav_session',
    );
  });
});

describe('SecureCalDAVRequest', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('makes secure HTTPS requests', async () => {
    mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const response = await SecureCalDAVRequest.makeRequest(
      'https://caldav.icloud.com/test',
      { method: 'PROPFIND' },
      'client-123',
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://caldav.icloud.com/test',
      expect.objectContaining({
        method: 'PROPFIND',
        mode: 'cors',
        credentials: 'omit',
        headers: expect.objectContaining({
          'User-Agent': 'WedSync-CalDAV/1.0',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }),
      }),
    );
  });

  test('rejects insecure URLs', async () => {
    await expect(
      SecureCalDAVRequest.makeRequest('http://insecure.com/caldav', {
        method: 'GET',
      }),
    ).rejects.toThrow('Invalid server URL');
  });

  test('handles authentication errors', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(
      SecureCalDAVRequest.makeRequest('https://caldav.icloud.com/test', {
        method: 'PROPFIND',
      }),
    ).rejects.toThrow('Authentication failed');
  });

  test('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      SecureCalDAVRequest.makeRequest('https://caldav.icloud.com/test', {
        method: 'PROPFIND',
      }),
    ).rejects.toThrow('Connection failed');
  });

  test('enforces rate limiting', async () => {
    // Make requests up to the limit
    const promises = [];
    for (let i = 0; i < SECURITY_CONFIG.REQUESTS_PER_MINUTE; i++) {
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      promises.push(
        SecureCalDAVRequest.makeRequest(
          'https://caldav.icloud.com/test',
          { method: 'GET' },
          'same-client',
        ),
      );
    }

    await Promise.all(promises);

    // Next request should be rate limited
    await expect(
      SecureCalDAVRequest.makeRequest(
        'https://caldav.icloud.com/test',
        { method: 'GET' },
        'same-client',
      ),
    ).rejects.toThrow('Rate limit exceeded');
  });
});

describe('auditLog', () => {
  test('logs security events', () => {
    auditLog('SECURITY', 'AUTHENTICATION_FAILED', {
      clientId: 'test-client',
      appleId: 'test@icloud.com',
    });

    expect(console.log).toHaveBeenCalledWith(
      '[CALDAV_AUDIT] SECURITY: AUTHENTICATION_FAILED',
      expect.objectContaining({
        level: 'SECURITY',
        event: 'AUTHENTICATION_FAILED',
        service: 'caldav-integration',
        clientId: 'test-client',
      }),
    );
  });

  test('includes timestamp and context', () => {
    auditLog('INFO', 'TEST_EVENT', { test: 'data' });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('INFO: TEST_EVENT'),
      expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        service: 'caldav-integration',
      }),
    );
  });
});

describe('sanitizeCalDAVError', () => {
  test('sanitizes CalDAVError instances', () => {
    const error = new CalDAVError(
      'Detailed error message',
      'AUTHENTICATION_FAILED',
      401,
      'Server response details',
      false,
      'User-friendly message',
    );

    const result = sanitizeCalDAVError(error);
    expect(result.userMessage).toBe('User-friendly message');
    expect(result.logData.code).toBe('AUTHENTICATION_FAILED');
    expect(result.logData.status).toBe(401);
  });

  test('sanitizes network errors', () => {
    const error = new Error('ENOTFOUND caldav.icloud.com');
    const result = sanitizeCalDAVError(error);

    expect(result.userMessage).toBe('Unable to connect to the calendar server');
    expect(result.logData.name).toBe('Error');
    expect(result.logData.message).toContain('ENOTFOUND');
  });

  test('sanitizes timeout errors', () => {
    const error = new Error('Request timeout ETIMEDOUT');
    const result = sanitizeCalDAVError(error);

    expect(result.userMessage).toBe('The request timed out. Please try again');
  });

  test('handles unknown errors', () => {
    const result = sanitizeCalDAVError('Unknown error string');
    expect(result.userMessage).toBe('An unknown error occurred');
    expect(result.logData.error).toBe('Unknown error string');
  });
});

describe('validateSession', () => {
  test('validates server-side session with userId', () => {
    const result = validateSession('user-123');
    expect(result.isValid).toBe(true);
  });

  test('invalidates server-side session without userId', () => {
    const result = validateSession();
    expect(result.isValid).toBe(false);
  });

  test('validates client-side session when valid', () => {
    const validSessionData = {
      sessionId: 'session-123',
      appleId: 'test@icloud.com',
      timestamp: Date.now(),
    };

    mockSessionStorage.getItem.mockReturnValue(
      JSON.stringify(validSessionData),
    );

    const result = validateSession();
    expect(result.isValid).toBe(true);
  });

  test('invalidates client-side session when missing', () => {
    mockSessionStorage.getItem.mockReturnValue(null);

    const result = validateSession();
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('No valid session found');
  });
});

describe('SECURITY_CONFIG', () => {
  test('has reasonable rate limits', () => {
    expect(SECURITY_CONFIG.REQUESTS_PER_MINUTE).toBe(30);
    expect(SECURITY_CONFIG.REQUESTS_PER_HOUR).toBe(1200);
    expect(SECURITY_CONFIG.DAILY_QUOTA).toBe(10000);
  });

  test('enforces HTTPS only', () => {
    expect(SECURITY_CONFIG.ALLOWED_PROTOCOLS).toEqual(['https:']);
    expect(SECURITY_CONFIG.BLOCKED_PROTOCOLS).toContain('http:');
    expect(SECURITY_CONFIG.BLOCKED_PROTOCOLS).toContain('ftp:');
    expect(SECURITY_CONFIG.BLOCKED_PROTOCOLS).toContain('file:');
  });

  test('has appropriate timeout settings', () => {
    expect(SECURITY_CONFIG.CONNECT_TIMEOUT).toBe(10000); // 10 seconds
    expect(SECURITY_CONFIG.REQUEST_TIMEOUT).toBe(30000); // 30 seconds
  });
});
