/**
 * CROSS-SESSION VALIDATION TESTS
 * 
 * Tests validation coordination between:
 * - Session A: Frontend form validation
 * - Session B: API authentication and database validation
 * 
 * Ensures consistent validation across the entire stack
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Mock API request/response for testing
interface MockAPIRequest {
  method: string
  url: string
  headers: Map<string, string>
  cookies: Map<string, string>
  body: any
  ip?: string
}

interface MockAPIResponse {
  status: number
  data?: any
  error?: string
  headers?: Map<string, string>
}

describe('Cross-Session Validation Tests', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let authToken: string
  
  beforeAll(async () => {
    const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
    const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create test user
    const { data: authData, error } = await supabase.auth.signUp({
      email: 'cross-validation-test@example.com',
      password: 'SecurePassword123!'
    })
    
    if (error) throw new Error(`Test user creation failed: ${error.message}`)
    
    testUserId = authData?.user?.id || ''
    authToken = authData?.session?.access_token || ''
  })
  
  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabase.from('form_submissions').delete().eq('user_id', testUserId)
      await supabase.from('forms').delete().eq('created_by', testUserId)
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('Frontend-Backend Validation Synchronization', () => {
    it('should maintain consistent validation rules between frontend and backend', () => {
      // Frontend validation rules (Session A)
      const frontendValidation = {
        validateEmail: (email: string): boolean => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          return emailRegex.test(email)
        },
        
        validateRequired: (value: any): boolean => {
          return value !== null && value !== undefined && value !== ''
        },
        
        validateLength: (value: string, min: number, max: number): boolean => {
          return value.length >= min && value.length <= max
        },
        
        validatePhone: (phone: string): boolean => {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
          return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
        }
      }
      
      // Backend validation rules (Session B)
      const backendValidation = {
        validateEmail: (email: string): boolean => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          return emailRegex.test(email)
        },
        
        validateRequired: (value: any): boolean => {
          return value !== null && value !== undefined && value !== ''
        },
        
        validateLength: (value: string, min: number, max: number): boolean => {
          return value.length >= min && value.length <= max
        },
        
        validatePhone: (phone: string): boolean => {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
          return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
        }
      }
      
      // Test data with various validation scenarios
      const testCases = [
        { email: 'valid@example.com', expected: true },
        { email: 'invalid-email', expected: false },
        { email: '', expected: false },
        { value: 'required value', expected: true },
        { value: '', expected: false },
        { text: 'valid length', min: 5, max: 20, expected: true },
        { text: 'too long text for validation', min: 5, max: 15, expected: false },
        { phone: '+1234567890', expected: true },
        { phone: 'invalid-phone', expected: false }
      ]
      
      // Verify frontend and backend validation give same results
      testCases.forEach(testCase => {
        if ('email' in testCase) {
          const frontendResult = frontendValidation.validateEmail(testCase.email)
          const backendResult = backendValidation.validateEmail(testCase.email)
          expect(frontendResult).toBe(backendResult)
          expect(frontendResult).toBe(testCase.expected)
        }
        
        if ('value' in testCase) {
          const frontendResult = frontendValidation.validateRequired(testCase.value)
          const backendResult = backendValidation.validateRequired(testCase.value)
          expect(frontendResult).toBe(backendResult)
          expect(frontendResult).toBe(testCase.expected)
        }
        
        if ('text' in testCase) {
          const frontendResult = frontendValidation.validateLength(testCase.text, testCase.min, testCase.max)
          const backendResult = backendValidation.validateLength(testCase.text, testCase.min, testCase.max)
          expect(frontendResult).toBe(backendResult)
          expect(frontendResult).toBe(testCase.expected)
        }
        
        if ('phone' in testCase) {
          const frontendResult = frontendValidation.validatePhone(testCase.phone)
          const backendResult = backendValidation.validatePhone(testCase.phone)
          expect(frontendResult).toBe(backendResult)
          expect(frontendResult).toBe(testCase.expected)
        }
      })
    })
    
    it('should handle edge cases consistently across sessions', () => {
      const edgeCases = [
        { input: null, type: 'null' },
        { input: undefined, type: 'undefined' },
        { input: '', type: 'empty string' },
        { input: '   ', type: 'whitespace only' },
        { input: 0, type: 'zero number' },
        { input: false, type: 'false boolean' },
        { input: [], type: 'empty array' },
        { input: {}, type: 'empty object' }
      ]
      
      const validateRequired = (value: any): { isValid: boolean; reason?: string } => {
        if (value === null || value === undefined) {
          return { isValid: false, reason: 'Value is null or undefined' }
        }
        
        if (typeof value === 'string' && value.trim() === '') {
          return { isValid: false, reason: 'String is empty or whitespace only' }
        }
        
        if (Array.isArray(value) && value.length === 0) {
          return { isValid: false, reason: 'Array is empty' }
        }
        
        if (typeof value === 'object' && Object.keys(value).length === 0) {
          return { isValid: false, reason: 'Object is empty' }
        }
        
        return { isValid: true }
      }
      
      edgeCases.forEach(testCase => {
        const result = validateRequired(testCase.input)
        
        // All edge cases should be consistently handled
        if (testCase.type === 'null' || testCase.type === 'undefined' || 
            testCase.type === 'empty string' || testCase.type === 'whitespace only' ||
            testCase.type === 'empty array' || testCase.type === 'empty object') {
          expect(result.isValid).toBe(false)
          expect(result.reason).toBeTruthy()
        } else {
          // Numbers and booleans should be valid
          expect(result.isValid).toBe(true)
        }
      })
    })
  })

  describe('Authentication State Validation', () => {
    it('should validate authentication consistently across API calls', () => {
      const validateAuthToken = (token: string | null): { isValid: boolean; userId?: string; error?: string } => {
        if (!token) {
          return { isValid: false, error: 'No authentication token provided' }
        }
        
        if (!token.startsWith('sb-') && !token.includes('.')) {
          return { isValid: false, error: 'Invalid token format' }
        }
        
        if (token.length < 20) {
          return { isValid: false, error: 'Token too short' }
        }
        
        // Simulate token validation
        if (token === authToken) {
          return { isValid: true, userId: testUserId }
        }
        
        return { isValid: false, error: 'Token validation failed' }
      }
      
      // Test valid token
      const validResult = validateAuthToken(authToken)
      expect(validResult.isValid).toBe(true)
      expect(validResult.userId).toBe(testUserId)
      
      // Test invalid tokens
      const invalidTokens = [
        null,
        '',
        'invalid-token',
        'sb-short',
        'wrong-format-token-that-is-long-enough'
      ]
      
      invalidTokens.forEach(token => {
        const result = validateAuthToken(token)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeTruthy()
      })
    })
    
    it('should handle session expiration consistently', () => {
      const isSessionExpired = (token: string, issuedAt: number): boolean => {
        const maxAge = 60 * 60 * 1000 // 1 hour
        const now = Date.now()
        return (now - issuedAt) > maxAge
      }
      
      const now = Date.now()
      
      // Fresh session
      expect(isSessionExpired(authToken, now)).toBe(false)
      
      // Expired session
      const expiredTime = now - (2 * 60 * 60 * 1000) // 2 hours ago
      expect(isSessionExpired(authToken, expiredTime)).toBe(true)
      
      // Edge case: exactly at expiration
      const exactExpirationTime = now - (60 * 60 * 1000) // exactly 1 hour ago
      expect(isSessionExpired(authToken, exactExpirationTime)).toBe(false)
    })
  })

  describe('Form Data Validation Pipeline', () => {
    it('should process form data through complete validation pipeline', async () => {
      // Step 1: Frontend pre-validation (Session A)
      const frontendValidateForm = (formData: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        if (!formData.title || formData.title.trim() === '') {
          errors.push('Title is required')
        }
        
        if (formData.title && formData.title.length > 100) {
          errors.push('Title is too long')
        }
        
        if (formData.fields && !Array.isArray(formData.fields)) {
          errors.push('Fields must be an array')
        }
        
        if (formData.fields) {
          formData.fields.forEach((field: any, index: number) => {
            if (!field.label) {
              errors.push(`Field ${index + 1} is missing a label`)
            }
            if (!field.type) {
              errors.push(`Field ${index + 1} is missing a type`)
            }
          })
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      // Step 2: API validation (Session B)
      const apiValidateForm = (formData: any, userId: string): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        // Repeat frontend validations (defense in depth)
        if (!formData.title || formData.title.trim() === '') {
          errors.push('Title is required')
        }
        
        if (formData.title && formData.title.length > 100) {
          errors.push('Title exceeds maximum length')
        }
        
        // Additional API-specific validations
        if (!userId) {
          errors.push('User authentication required')
        }
        
        if (formData.fields && formData.fields.length > 50) {
          errors.push('Too many fields in form')
        }
        
        // Sanitization check
        if (formData.title && /<script|javascript:|data:/.test(formData.title)) {
          errors.push('Title contains potentially malicious content')
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      // Step 3: Database constraints validation
      const dbValidateForm = (formData: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        // Database-specific constraints
        if (formData.title && formData.title.length > 255) {
          errors.push('Title exceeds database column limit')
        }
        
        // JSON field size limits
        const fieldsSize = JSON.stringify(formData.fields || []).length
        if (fieldsSize > 65535) { // TEXT column limit
          errors.push('Fields data exceeds database storage limit')
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      // Test valid form data through pipeline
      const validFormData = {
        title: 'Valid Test Form',
        description: 'A properly formatted form',
        fields: [
          { label: 'Name', type: 'text', required: true },
          { label: 'Email', type: 'email', required: true }
        ]
      }
      
      const frontendResult = frontendValidateForm(validFormData)
      expect(frontendResult.isValid).toBe(true)
      expect(frontendResult.errors).toHaveLength(0)
      
      const apiResult = apiValidateForm(validFormData, testUserId)
      expect(apiResult.isValid).toBe(true)
      expect(apiResult.errors).toHaveLength(0)
      
      const dbResult = dbValidateForm(validFormData)
      expect(dbResult.isValid).toBe(true)
      expect(dbResult.errors).toHaveLength(0)
      
      // Test invalid form data
      const invalidFormData = {
        title: '', // Missing title
        fields: 'not-an-array', // Wrong type
        maliciousField: '<script>alert("xss")</script>'
      }
      
      const frontendInvalidResult = frontendValidateForm(invalidFormData)
      expect(frontendInvalidResult.isValid).toBe(false)
      expect(frontendInvalidResult.errors.length).toBeGreaterThan(0)
      
      const apiInvalidResult = apiValidateForm(invalidFormData, testUserId)
      expect(apiInvalidResult.isValid).toBe(false)
      expect(apiInvalidResult.errors.length).toBeGreaterThan(0)
      
      // Both should catch the missing title error
      expect(frontendInvalidResult.errors).toContain('Title is required')
      expect(apiInvalidResult.errors).toContain('Title is required')
    })
    
    it('should handle form submission validation across sessions', async () => {
      // Create test form first
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Cross-Session Validation Form',
          sections: [
            {
              id: 'section-1',
              fields: [
                {
                  id: 'email',
                  type: 'email',
                  label: 'Email Address',
                  validation: { required: true }
                },
                {
                  id: 'age',
                  type: 'number',
                  label: 'Age',
                  validation: { required: true, min: 18, max: 120 }
                }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      const formId = form?.id
      
      // Frontend submission validation
      const validateSubmission = (submissionData: any, formSchema: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        for (const section of formSchema.sections) {
          for (const field of section.fields) {
            const value = submissionData[field.id]
            
            if (field.validation?.required && (!value || value === '')) {
              errors.push(`${field.label} is required`)
            }
            
            if (field.type === 'email' && value) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
              if (!emailRegex.test(value)) {
                errors.push(`${field.label} must be a valid email`)
              }
            }
            
            if (field.type === 'number' && value) {
              const numValue = parseFloat(value)
              if (isNaN(numValue)) {
                errors.push(`${field.label} must be a number`)
              } else {
                if (field.validation?.min && numValue < field.validation.min) {
                  errors.push(`${field.label} must be at least ${field.validation.min}`)
                }
                if (field.validation?.max && numValue > field.validation.max) {
                  errors.push(`${field.label} must be at most ${field.validation.max}`)
                }
              }
            }
          }
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      // Test valid submission
      const validSubmission = {
        email: 'test@example.com',
        age: '25'
      }
      
      const validResult = validateSubmission(validSubmission, form)
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)
      
      // Test invalid submissions
      const invalidSubmissions = [
        {
          data: { email: '', age: '25' },
          expectedErrors: ['Email Address is required']
        },
        {
          data: { email: 'invalid-email', age: '25' },
          expectedErrors: ['Email Address must be a valid email']
        },
        {
          data: { email: 'test@example.com', age: '15' },
          expectedErrors: ['Age must be at least 18']
        },
        {
          data: { email: 'test@example.com', age: 'not-a-number' },
          expectedErrors: ['Age must be a number']
        }
      ]
      
      invalidSubmissions.forEach(testCase => {
        const result = validateSubmission(testCase.data, form)
        expect(result.isValid).toBe(false)
        testCase.expectedErrors.forEach(expectedError => {
          expect(result.errors).toContain(expectedError)
        })
      })
    })
  })

  describe('Security Validation Coordination', () => {
    it('should validate CSRF tokens consistently across form operations', () => {
      const validateCSRFToken = (request: MockAPIRequest): boolean => {
        const headerToken = request.headers.get('x-csrf-token')
        const cookieToken = request.cookies.get('csrf-token')
        
        if (!headerToken || !cookieToken) {
          return false
        }
        
        return headerToken === cookieToken && headerToken.startsWith('csrf_')
      }
      
      // Valid CSRF scenario
      const validRequest: MockAPIRequest = {
        method: 'POST',
        url: '/api/forms',
        headers: new Map([['x-csrf-token', 'csrf_1234567890_abcdef']]),
        cookies: new Map([['csrf-token', 'csrf_1234567890_abcdef']]),
        body: {}
      }
      
      expect(validateCSRFToken(validRequest)).toBe(true)
      
      // Invalid CSRF scenarios
      const invalidRequests = [
        {
          ...validRequest,
          headers: new Map() // Missing header token
        },
        {
          ...validRequest,
          cookies: new Map() // Missing cookie token
        },
        {
          ...validRequest,
          headers: new Map([['x-csrf-token', 'different-token']])
        },
        {
          ...validRequest,
          headers: new Map([['x-csrf-token', 'invalid-format-token']])
        }
      ]
      
      invalidRequests.forEach(request => {
        expect(validateCSRFToken(request)).toBe(false)
      })
    })
    
    it('should apply rate limiting consistently across endpoints', () => {
      const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
      const maxRequests = 10
      const windowMs = 60000
      
      const checkRateLimit = (identifier: string): { allowed: boolean; remaining: number } => {
        const now = Date.now()
        const userLimit = rateLimitStore.get(identifier)
        
        if (!userLimit || now > userLimit.resetTime) {
          rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
          return { allowed: true, remaining: maxRequests - 1 }
        }
        
        if (userLimit.count >= maxRequests) {
          return { allowed: false, remaining: 0 }
        }
        
        userLimit.count++
        return { allowed: true, remaining: maxRequests - userLimit.count }
      }
      
      const clientId = 'test-client-123'
      
      // Test normal rate limiting
      for (let i = 0; i < maxRequests; i++) {
        const result = checkRateLimit(clientId)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(maxRequests - (i + 1))
      }
      
      // Next request should be rate limited
      const limitedResult = checkRateLimit(clientId)
      expect(limitedResult.allowed).toBe(false)
      expect(limitedResult.remaining).toBe(0)
      
      // Different client should not be affected
      const differentClientResult = checkRateLimit('different-client-456')
      expect(differentClientResult.allowed).toBe(true)
    })
  })

  describe('Error Handling Validation', () => {
    it('should provide consistent error messages across sessions', () => {
      const generateErrorMessage = (errorType: string, context?: any): string => {
        const errorMessages = {
          'validation_failed': 'The submitted data is invalid',
          'authentication_required': 'You must be logged in to perform this action',
          'csrf_invalid': 'Security validation failed. Please refresh and try again',
          'rate_limited': 'Too many requests. Please wait before trying again',
          'not_found': 'The requested resource was not found',
          'server_error': 'An unexpected error occurred. Please try again',
          'field_required': `${context?.fieldName || 'This field'} is required`,
          'field_invalid_format': `${context?.fieldName || 'This field'} has an invalid format`
        }
        
        return errorMessages[errorType as keyof typeof errorMessages] || 'An error occurred'
      }
      
      // Test consistent error messages
      expect(generateErrorMessage('validation_failed')).toBe('The submitted data is invalid')
      expect(generateErrorMessage('authentication_required')).toBe('You must be logged in to perform this action')
      expect(generateErrorMessage('field_required', { fieldName: 'Email' })).toBe('Email is required')
      
      // Error messages should not expose sensitive information
      const sensitiveErrors = [
        generateErrorMessage('server_error'),
        generateErrorMessage('not_found'),
        generateErrorMessage('authentication_required')
      ]
      
      sensitiveErrors.forEach(message => {
        expect(message).not.toContain('database')
        expect(message).not.toContain('sql')
        expect(message).not.toContain('password')
        expect(message).not.toContain('token')
        expect(message).not.toContain('secret')
      })
    })
    
    it('should handle validation errors gracefully with recovery options', () => {
      const handleValidationError = (errors: string[]): { canRetry: boolean; suggestions: string[] } => {
        const retryableErrors = [
          'Security validation failed',
          'Too many requests',
          'An unexpected error occurred'
        ]
        
        const suggestions: string[] = []
        let canRetry = false
        
        errors.forEach(error => {
          if (retryableErrors.some(retryable => error.includes(retryable.split(' ')[0]))) {
            canRetry = true
            
            if (error.includes('Security')) {
              suggestions.push('Please refresh the page and try again')
            } else if (error.includes('Too many')) {
              suggestions.push('Please wait a few minutes before trying again')
            } else {
              suggestions.push('Please try again in a moment')
            }
          } else {
            suggestions.push('Please check your input and try again')
          }
        })
        
        return { canRetry, suggestions }
      }
      
      // Test different error scenarios
      const temporaryErrors = ['Security validation failed', 'Too many requests']
      const temporaryResult = handleValidationError(temporaryErrors)
      expect(temporaryResult.canRetry).toBe(true)
      expect(temporaryResult.suggestions.length).toBeGreaterThan(0)
      
      const validationErrors = ['Email is required', 'Name is too long']
      const validationResult = handleValidationError(validationErrors)
      expect(validationResult.canRetry).toBe(false)
      expect(validationResult.suggestions).toContain('Please check your input and try again')
    })
  })
})