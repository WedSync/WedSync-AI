import { validateCoreFieldValue, validateCoreFields, sanitizeInput } from '@/lib/validations/core-fields';

describe('Core Fields Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "1 UNION SELECT * FROM users",
      "'; DELETE FROM wedding_core_data WHERE '1'='1",
      "Robert'); DROP TABLE Students;--",
      "1' AND (SELECT COUNT(*) FROM sysobjects) > 1 --",
      "'; EXEC xp_cmdshell('net user'); --"
    ];

    test.each(sqlInjectionPayloads)('should reject SQL injection payload: %s', (payload) => {
      const result = validateCoreFieldValue('bride_first_name', payload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious content');
    });

    test('should sanitize SQL-like patterns in input', () => {
      const inputs = {
        bride_first_name: "SELECT * FROM users",
        bride_email: "test@example.com",
        notes: "DROP TABLE wedding_data"
      };
      
      const result = validateCoreFields(inputs);
      expect(result.valid).toBe(false);
      expect(result.errors.bride_first_name).toBeDefined();
      expect(result.errors.notes).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "<svg onload=alert('XSS')>",
      "javascript:alert('XSS')",
      "<body onload=alert('XSS')>",
      "<iframe src='javascript:alert(\"XSS\")'></iframe>",
      "';alert(String.fromCharCode(88,83,83))//",
      "<script>document.cookie</script>",
      "<a href='javascript:void(0)' onclick='alert(1)'>Click</a>"
    ];

    test.each(xssPayloads)('should sanitize XSS payload: %s', (payload) => {
      const sanitized = sanitizeInput(payload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).not.toContain('onload=');
    });

    test('should remove HTML tags but keep content', () => {
      const input = "<h1>John & Jane's Wedding</h1>";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("John & Jane's Wedding");
    });

    test('should handle nested script tags', () => {
      const input = "<script><script>alert('XSS')</script></script>";
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('script');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('Input Size Validation', () => {
    test('should reject oversized string inputs', () => {
      const oversizedInput = 'a'.repeat(10001);
      const result = validateCoreFieldValue('notes', oversizedInput);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    test('should accept maximum allowed size', () => {
      const maxSizeInput = 'a'.repeat(5000);
      const result = validateCoreFieldValue('notes', maxSizeInput);
      expect(result.valid).toBe(true);
    });

    test('should reject very long field names', () => {
      const longFieldName = 'field_' + 'a'.repeat(200);
      const result = validateCoreFieldValue(longFieldName, 'value');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('field name');
    });
  });

  describe('Field Name Validation', () => {
    test('should reject invalid field names', () => {
      const invalidNames = [
        'field with spaces',
        'field;drop-table',
        'field<script>',
        '../../../etc/passwd',
        'field&name',
        'field|name'
      ];

      invalidNames.forEach(name => {
        const result = validateCoreFieldValue(name, 'value');
        expect(result.valid).toBe(false);
      });
    });

    test('should accept valid field names', () => {
      const validNames = [
        'bride_first_name',
        'groom-last-name',
        'wedding_date_2024',
        'venue123',
        'GUEST_COUNT'
      ];

      validNames.forEach(name => {
        const result = validateCoreFieldValue(name, 'test');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Email Validation', () => {
    test('should validate email fields correctly', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'name.surname@company.org'
      ];

      validEmails.forEach(email => {
        const result = validateCoreFieldValue('bride_email', email);
        expect(result.valid).toBe(true);
      });

      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        '<script>@example.com'
      ];

      invalidEmails.forEach(email => {
        const result = validateCoreFieldValue('bride_email', email);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    test('should validate phone numbers correctly', () => {
      const validPhones = [
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '123.456.7890',
        '+1 (123) 456-7890'
      ];

      validPhones.forEach(phone => {
        const result = validateCoreFieldValue('bride_phone', phone);
        expect(result.valid).toBe(true);
      });

      const invalidPhones = [
        'not-a-phone',
        '123',
        'phone: 123-456-7890',
        '<script>123</script>'
      ];

      invalidPhones.forEach(phone => {
        const result = validateCoreFieldValue('bride_phone', phone);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Date Validation', () => {
    test('should validate date fields correctly', () => {
      const validDates = [
        '2024-12-25T00:00:00Z',
        new Date('2024-12-25'),
        '2024-06-15T14:30:00Z'
      ];

      validDates.forEach(date => {
        const result = validateCoreFieldValue('wedding_date', date);
        expect(result.valid).toBe(true);
      });

      const invalidDates = [
        'not-a-date',
        '2024-13-45',
        'tomorrow'
      ];

      invalidDates.forEach(date => {
        const result = validateCoreFieldValue('wedding_date', date);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Number Validation', () => {
    test('should validate guest count correctly', () => {
      const validCounts = [0, 50, 100, 500, 10000];
      
      validCounts.forEach(count => {
        const result = validateCoreFieldValue('guest_count', count);
        expect(result.valid).toBe(true);
      });

      const invalidCounts = [-1, 10001, NaN, Infinity];
      
      invalidCounts.forEach(count => {
        const result = validateCoreFieldValue('guest_count', count);
        expect(result.valid).toBe(false);
      });
    });

    test('should validate budget correctly', () => {
      const validBudgets = [0, 1000, 50000.50, 10000000];
      
      validBudgets.forEach(budget => {
        const result = validateCoreFieldValue('budget', budget);
        expect(result.valid).toBe(true);
      });

      const invalidBudgets = [-100, 10000001, NaN];
      
      invalidBudgets.forEach(budget => {
        const result = validateCoreFieldValue('budget', budget);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Batch Field Validation', () => {
    test('should validate multiple fields and return sanitized values', () => {
      const fields = {
        bride_first_name: '<b>Jane</b>',
        bride_email: 'jane@example.com',
        groom_first_name: 'John<script>alert(1)</script>',
        wedding_date: '2024-12-25T00:00:00Z',
        guest_count: 150,
        notes: 'Special requests: vegetarian menu'
      };

      const result = validateCoreFields(fields);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized.bride_first_name).toBe('Jane');
      expect(result.sanitized.bride_email).toBe('jane@example.com');
      expect(result.sanitized.groom_first_name).toBe('John');
      expect(result.sanitized.guest_count).toBe(150);
    });

    test('should collect all validation errors', () => {
      const fields = {
        bride_email: 'not-an-email',
        guest_count: -50,
        wedding_date: 'invalid-date',
        malicious_field: "'; DROP TABLE users; --"
      };

      const result = validateCoreFields(fields);
      
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      expect(result.errors.bride_email).toBeDefined();
      expect(result.errors.guest_count).toBeDefined();
      expect(result.errors.wedding_date).toBeDefined();
    });
  });

  describe('Unknown Field Handling', () => {
    test('should sanitize unknown string fields', () => {
      const result = validateCoreFieldValue('custom_field', '<script>test</script>');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('test');
    });

    test('should pass through unknown non-string fields', () => {
      const result = validateCoreFieldValue('custom_number', 42);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(42);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings', () => {
      const result = validateCoreFieldValue('bride_first_name', '');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('');
    });

    test('should handle null values for optional fields', () => {
      const result = validateCoreFieldValue('notes', null);
      expect(result.valid).toBe(true);
    });

    test('should handle undefined values for optional fields', () => {
      const result = validateCoreFieldValue('notes', undefined);
      expect(result.valid).toBe(true);
    });

    test('should handle special characters in valid input', () => {
      const input = "O'Brien & Associates, LLC";
      const result = validateCoreFieldValue('venue_name', input);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(input);
    });

    test('should handle international characters', () => {
      const input = "Château de Versailles";
      const result = validateCoreFieldValue('venue_name', input);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(input);
    });

    test('should handle emoji in text fields', () => {
      const input = "Wedding Day! 🎉💒";
      const result = validateCoreFieldValue('notes', input);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(input);
    });
  });
});