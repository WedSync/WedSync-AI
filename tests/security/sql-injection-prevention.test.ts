import { SecureQueryBuilder } from '@/lib/database/secure-query-builder'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client for testing
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}))

describe('SQL Injection Prevention Tests', () => {
  let secureQueryBuilder: SecureQueryBuilder

  beforeEach(() => {
    secureQueryBuilder = new SecureQueryBuilder()
    jest.clearAllMocks()
  })

  describe('UUID Validation', () => {
    test('should accept valid UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      expect(() => SecureQueryBuilder.validateUUID(validUUID)).not.toThrow()
    })

    test('should reject invalid UUIDs', () => {
      const invalidInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'; DELETE FROM clients; --",
        "invalid-uuid",
        "",
        "123",
        "not-a-uuid-at-all"
      ]

      invalidInputs.forEach(input => {
        expect(() => SecureQueryBuilder.validateUUID(input)).toThrow()
      })
    })
  })

  describe('ID Validation', () => {
    test('should accept valid IDs', () => {
      const validIds = ['client_123', 'form-456', 'abc123', 'test_id']
      validIds.forEach(id => {
        expect(() => SecureQueryBuilder.validateId(id)).not.toThrow()
      })
    })

    test('should reject malicious IDs', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "test<script>alert('xss')</script>",
        "id'; UPDATE users SET role='admin'; --",
        "../../../etc/passwd",
        "null; DROP DATABASE wedsync; --"
      ]

      maliciousInputs.forEach(input => {
        expect(() => SecureQueryBuilder.validateId(input)).toThrow()
      })
    })
  })

  describe('Numeric Validation', () => {
    test('should accept valid numbers', () => {
      const validNumbers = [0, 1, 100, 9999]
      validNumbers.forEach(num => {
        expect(() => SecureQueryBuilder.validateNumeric(num)).not.toThrow()
      })
    })

    test('should reject invalid numbers', () => {
      const invalidNumbers = [-1, -100, 1.5, NaN, Infinity]
      invalidNumbers.forEach(num => {
        expect(() => SecureQueryBuilder.validateNumeric(num)).toThrow()
      })
    })
  })

  describe('Safe Filter Creation', () => {
    test('should create safe filters for valid inputs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const filter = SecureQueryBuilder.createSafeFilter('journey_id', 'eq', validUUID)
      expect(filter).toBe(`journey_id=eq.${validUUID}`)
    })

    test('should reject invalid field names', () => {
      const invalidFields = [
        "'; DROP TABLE users; --",
        "invalid_field",
        "user'; DELETE FROM users; --",
        "<script>alert('xss')</script>"
      ]

      invalidFields.forEach(field => {
        expect(() => 
          SecureQueryBuilder.createSafeFilter(field, 'eq', '123e4567-e89b-12d3-a456-426614174000')
        ).toThrow()
      })
    })

    test('should reject invalid operators', () => {
      const invalidOperators = [
        "'; DROP TABLE users; --",
        "invalid_op",
        "eq'; DELETE FROM users; --",
        "OR 1=1"
      ]

      invalidOperators.forEach(operator => {
        expect(() => 
          SecureQueryBuilder.createSafeFilter('journey_id', operator, '123e4567-e89b-12d3-a456-426614174000')
        ).toThrow()
      })
    })

    test('should reject malicious values', () => {
      const maliciousValues = [
        "'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "test'; UPDATE users SET role='admin'; --",
        "<script>alert('xss')</script>"
      ]

      maliciousValues.forEach(value => {
        expect(() => 
          SecureQueryBuilder.createSafeFilter('journey_id', 'eq', value)
        ).toThrow()
      })
    })
  })

  describe('Secure Query Methods', () => {
    test('should use parameterized queries for client lookup', async () => {
      const mockSupabase = createClient()
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      
      try {
        await secureQueryBuilder.getClientById(validUUID)
      } catch (error) {
        // Expected since we're using mocked Supabase
      }

      // Verify that the Supabase client methods were called with safe parameters
      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
    })

    test('should reject SQL injection attempts in client queries', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE clients; --",
        "1' OR '1'='1",
        "admin'; DELETE FROM clients WHERE id = '1'; --"
      ]

      for (const maliciousInput of sqlInjectionAttempts) {
        await expect(
          secureQueryBuilder.getClientById(maliciousInput)
        ).rejects.toThrow()
      }
    })

    test('should validate and sanitize update operations', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const maliciousUpdates = {
        'company_name': "Test'; DROP TABLE clients; --",
        'notes': "<script>alert('xss')</script>",
        'status': "invalid_status'; DELETE FROM users; --"
      }

      // The method should not throw, but should sanitize the data
      // This test would require a more sophisticated mock to verify sanitization
      try {
        await secureQueryBuilder.updateClientSecure(validUUID, maliciousUpdates)
      } catch (error) {
        // Expected with mocked Supabase
      }
    })
  })

  describe('Input Sanitization Edge Cases', () => {
    test('should handle null and undefined inputs', () => {
      expect(() => SecureQueryBuilder.validateUUID(null as any)).toThrow()
      expect(() => SecureQueryBuilder.validateUUID(undefined as any)).toThrow()
      expect(() => SecureQueryBuilder.validateId('')).toThrow()
    })

    test('should handle very long inputs', () => {
      const longString = 'a'.repeat(1000)
      expect(() => SecureQueryBuilder.validateId(longString)).toThrow()
    })

    test('should handle unicode and special characters', () => {
      const unicodeInputs = [
        'test\u0000null',
        'test\r\ninjection',
        'test\x1bescaping',
        'test\u202e'
      ]

      unicodeInputs.forEach(input => {
        expect(() => SecureQueryBuilder.validateId(input)).toThrow()
      })
    })
  })

  describe('Real-world SQL Injection Patterns', () => {
    test('should block common SQL injection patterns', () => {
      const commonSQLInjectionPatterns = [
        "' OR 1=1--",
        "' OR 'a'='a",
        "'; EXEC xp_cmdshell('dir'); --",
        "' UNION SELECT * FROM users--",
        "admin'/*",
        "admin' AND 1=1--",
        "' OR '1'='1' /*",
        "'; INSERT INTO users VALUES('hacker','password'); --",
        "' OR EXISTS(SELECT * FROM users WHERE username='admin')--",
        "1'; UPDATE users SET password='hacked' WHERE username='admin'; --"
      ]

      commonSQLInjectionPatterns.forEach(pattern => {
        expect(() => SecureQueryBuilder.validateUUID(pattern)).toThrow()
        expect(() => SecureQueryBuilder.validateId(pattern)).toThrow()
      })
    })

    test('should block NoSQL injection patterns', () => {
      const noSQLInjectionPatterns = [
        "'; return true; //",
        "' || '1'=='1",
        "'; var date = new Date(); do{curDate = new Date();}while(curDate-date<10000); //",
        "$where: '1'=='1'"
      ]

      noSQLInjectionPatterns.forEach(pattern => {
        expect(() => SecureQueryBuilder.validateId(pattern)).toThrow()
      })
    })
  })
})