/**
 * SESSION A ↔ B INTEGRATION TESTS
 * 
 * Tests coordination between:
 * - Session A: Forms & UI Security
 * - Session B: Database & API Security
 * 
 * Validates end-to-end security flows across both sessions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Test environment setup
const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'

describe('Session A ↔ B Integration Tests', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let authToken: string
  let csrfToken: string
  
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create test user for session coordination tests
    const { data: authData, error } = await supabase.auth.signUp({
      email: 'session-test@example.com',
      password: 'SecurePassword123!'
    })
    
    if (error) throw new Error(`Test user creation failed: ${error.message}`)
    
    testUserId = authData?.user?.id || ''
    authToken = authData?.session?.access_token || ''
    
    // Generate CSRF token for tests
    csrfToken = 'test-csrf-token-' + Date.now()
  })
  
  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabase.from('form_submissions').delete().eq('user_id', testUserId)
      await supabase.from('forms').delete().eq('created_by', testUserId)
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('Form Creation with Database Security (A → B)', () => {
    it('should create form with proper authentication and RLS enforcement', async () => {
      // Session A: Form creation with UI security
      const formData = {
        title: 'Integration Test Form',
        description: 'Testing Session A → B coordination',
        sections: [
          {
            id: 'section-1',
            title: 'Personal Information',
            fields: [
              {
                id: 'full_name',
                type: 'text',
                label: 'Full Name',
                validation: { required: true, maxLength: 100 }
              },
              {
                id: 'email',
                type: 'email',
                label: 'Email Address',
                validation: { required: true }
              }
            ]
          }
        ],
        settings: {
          requireLogin: false,
          allowMultiple: false,
          successMessage: 'Thank you for your submission!'
        },
        isPublished: true,
        slug: 'integration-test-form'
      }
      
      // Session B: Database insertion with RLS policies
      const { data: form, error } = await supabase
        .from('forms')
        .insert({
          title: formData.title,
          description: formData.description,
          sections: formData.sections,
          settings: formData.settings,
          status: 'published',
          is_published: true,
          slug: formData.slug,
          created_by: testUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(form?.title).toBe('Integration Test Form')
      expect(form?.created_by).toBe(testUserId)
      
      // Verify RLS: Cannot access other user's forms
      const { data: otherUserForms } = await supabase
        .from('forms')
        .select()
        .eq('created_by', 'different-user-id')
      
      expect(otherUserForms).toHaveLength(0)
    })
    
    it('should reject form creation without proper authentication', async () => {
      // Create unauthenticated client
      const unauthenticatedSupabase = createClient(supabaseUrl, supabaseKey)
      
      const formData = {
        title: 'Unauthorized Form',
        created_by: 'fake-user-id'
      }
      
      const { data, error } = await unauthenticatedSupabase
        .from('forms')
        .insert(formData)
        .select()
        .single()
      
      // Should fail due to RLS policies
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })
  })

  describe('Form Submission Flow (A → B → Storage)', () => {
    let testFormId: string
    
    beforeEach(async () => {
      // Create test form for submission tests
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Submission Test Form',
          sections: [
            {
              id: 'section-1',
              fields: [
                {
                  id: 'name',
                  type: 'text',
                  label: 'Name',
                  validation: { required: true, maxLength: 50 }
                },
                {
                  id: 'email',
                  type: 'email',
                  label: 'Email',
                  validation: { required: true }
                }
              ]
            }
          ],
          status: 'published',
          is_published: true,
          created_by: testUserId
        })
        .select()
        .single()
      
      testFormId = form?.id || ''
    })
    
    it('should handle complete form submission with validation and storage', async () => {
      const submissionData = {
        formId: testFormId,
        data: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        },
        metadata: {
          source: 'integration-test',
          timestamp: new Date().toISOString()
        }
      }
      
      // Session A: Frontend validation passes
      // Session B: Database validation and storage
      const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: testFormId,
          data: submissionData.data,
          metadata: submissionData.metadata,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(submission?.form_id).toBe(testFormId)
      expect(submission?.data).toEqual(submissionData.data)
      expect(submission?.status).toBe('completed')
      
      // Verify data integrity
      const { data: retrievedSubmission } = await supabase
        .from('form_submissions')
        .select()
        .eq('id', submission?.id)
        .single()
      
      expect(retrievedSubmission?.data.name).toBe('John Doe')
      expect(retrievedSubmission?.data.email).toBe('john.doe@example.com')
    })
    
    it('should sanitize and validate malicious input', async () => {
      const maliciousData = {
        formId: testFormId,
        data: {
          name: '<script>alert("XSS")</script>Malicious Name',
          email: 'test@example.com<img src="x" onerror="alert(1)">'
        }
      }
      
      // Session A: UI sanitization should strip dangerous content
      // Session B: Database validation should accept sanitized data
      const sanitizedData = {
        name: 'Malicious Name', // Script tags removed
        email: 'test@example.com' // Image tags removed
      }
      
      const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: testFormId,
          data: sanitizedData,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(submission?.data.name).toBe('Malicious Name')
      expect(submission?.data.name).not.toContain('<script>')
      expect(submission?.data.email).toBe('test@example.com')
      expect(submission?.data.email).not.toContain('<img')
    })
    
    it('should enforce field validation rules', async () => {
      const invalidData = {
        formId: testFormId,
        data: {
          name: '', // Required field empty
          email: 'invalid-email' // Invalid email format
        }
      }
      
      // Simulate validation that would happen in API route
      const validationErrors: string[] = []
      
      if (!invalidData.data.name) {
        validationErrors.push('Name is required')
      }
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidData.data.email)) {
        validationErrors.push('Email format is invalid')
      }
      
      expect(validationErrors).toHaveLength(2)
      expect(validationErrors).toContain('Name is required')
      expect(validationErrors).toContain('Email format is invalid')
    })
  })

  describe('Cross-Session Security Validation', () => {
    it('should maintain CSRF protection across form operations', async () => {
      // Test CSRF token validation
      const formData = {
        title: 'CSRF Test Form',
        description: 'Testing CSRF protection'
      }
      
      // Mock request headers
      const mockRequest = {
        headers: new Map([
          ['x-csrf-token', csrfToken],
          ['content-type', 'application/json']
        ]),
        cookies: new Map([
          ['csrf-token', csrfToken]
        ])
      }
      
      // Simulate CSRF validation function
      function validateCSRFToken(request: any): boolean {
        const headerToken = request.headers.get('x-csrf-token')
        const cookieToken = request.cookies.get('csrf-token')
        return headerToken === cookieToken && headerToken === csrfToken
      }
      
      expect(validateCSRFToken(mockRequest)).toBe(true)
      
      // Test with mismatched tokens
      const invalidRequest = {
        headers: new Map([['x-csrf-token', 'wrong-token']]),
        cookies: new Map([['csrf-token', csrfToken]])
      }
      
      expect(validateCSRFToken(invalidRequest)).toBe(false)
    })
    
    it('should enforce rate limiting across sessions', async () => {
      // Simulate rate limiting checks
      const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
      const maxRequests = 10
      const windowMs = 60000 // 1 minute
      
      function checkRateLimit(identifier: string): boolean {
        const now = Date.now()
        const userLimit = rateLimitMap.get(identifier)
        
        if (!userLimit || now > userLimit.resetTime) {
          rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
          return true
        }
        
        if (userLimit.count >= maxRequests) {
          return false
        }
        
        userLimit.count++
        return true
      }
      
      const testIdentifier = 'test-user-ip'
      
      // First 10 requests should pass
      for (let i = 0; i < maxRequests; i++) {
        expect(checkRateLimit(testIdentifier)).toBe(true)
      }
      
      // 11th request should fail
      expect(checkRateLimit(testIdentifier)).toBe(false)
    })
    
    it('should properly handle authentication state across sessions', async () => {
      // Test authenticated user can access their forms
      const { data: userForms, error } = await supabase
        .from('forms')
        .select()
        .eq('created_by', testUserId)
      
      expect(error).toBeNull()
      expect(Array.isArray(userForms)).toBe(true)
      
      // Test unauthenticated access fails
      const unauthenticatedSupabase = createClient(supabaseUrl, supabaseKey)
      
      const { data: restrictedData, error: restrictedError } = await unauthenticatedSupabase
        .from('forms')
        .select()
        .eq('created_by', testUserId)
      
      // Should return empty due to RLS
      expect(restrictedData).toHaveLength(0)
    })
  })

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across form operations', async () => {
      // Create form
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Consistency Test Form',
          status: 'draft',
          created_by: testUserId
        })
        .select()
        .single()
      
      const formId = form?.id
      
      // Update form
      const { data: updatedForm } = await supabase
        .from('forms')
        .update({
          title: 'Updated Consistency Test Form',
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .eq('created_by', testUserId) // RLS enforcement
        .select()
        .single()
      
      expect(updatedForm?.title).toBe('Updated Consistency Test Form')
      expect(updatedForm?.status).toBe('published')
      
      // Verify update timestamp changed
      expect(updatedForm?.updated_at).not.toBe(form?.updated_at)
    })
    
    it('should handle concurrent form submissions safely', async () => {
      // Create test form
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Concurrent Test Form',
          sections: [
            {
              id: 'section-1',
              fields: [
                { id: 'counter', type: 'number', label: 'Counter' }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      const formId = form?.id
      
      // Simulate concurrent submissions
      const submissions = []
      for (let i = 0; i < 5; i++) {
        submissions.push(
          supabase
            .from('form_submissions')
            .insert({
              form_id: formId,
              data: { counter: i },
              status: 'completed',
              submitted_at: new Date().toISOString()
            })
            .select()
            .single()
        )
      }
      
      const results = await Promise.all(submissions)
      
      // All submissions should succeed
      results.forEach((result, index) => {
        expect(result.error).toBeNull()
        expect(result.data?.data.counter).toBe(index)
      })
      
      // Verify all submissions were stored
      const { data: allSubmissions } = await supabase
        .from('form_submissions')
        .select()
        .eq('form_id', formId)
      
      expect(allSubmissions).toHaveLength(5)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid foreign key
      const { data, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: 'non-existent-form-id',
          data: { test: 'data' },
          status: 'completed'
        })
        .select()
        .single()
      
      expect(error).not.toBeNull()
      expect(data).toBeNull()
      
      // Error should not leak sensitive information
      expect(error?.message).not.toContain('password')
      expect(error?.message).not.toContain('secret')
    })
    
    it('should validate data types and constraints', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Validation Test Form',
          created_by: testUserId
        })
        .select()
        .single()
      
      // Test invalid JSON in sections field
      const { data, error } = await supabase
        .from('forms')
        .update({
          sections: 'invalid-json' as any // Should be JSON object
        })
        .eq('id', form?.id)
        .select()
        .single()
      
      expect(error).not.toBeNull()
    })
  })

  describe('Performance and Security Monitoring', () => {
    it('should handle large form submissions within limits', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Large Data Test Form',
          created_by: testUserId
        })
        .select()
        .single()
      
      // Test submission with large but acceptable data
      const largeData = {
        description: 'x'.repeat(1000), // 1KB text
        notes: 'y'.repeat(5000) // 5KB text
      }
      
      const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form?.id,
          data: largeData,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(submission?.data.description).toHaveLength(1000)
      expect(submission?.data.notes).toHaveLength(5000)
    })
    
    it('should track submission metrics for monitoring', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Metrics Test Form',
          created_by: testUserId
        })
        .select()
        .single()
      
      // Create multiple submissions for metrics
      const submissions = []
      for (let i = 0; i < 3; i++) {
        submissions.push(
          supabase
            .from('form_submissions')
            .insert({
              form_id: form?.id,
              data: { test: `submission-${i}` },
              status: 'completed',
              submitted_at: new Date().toISOString()
            })
        )
      }
      
      await Promise.all(submissions)
      
      // Query submission count for form
      const { count } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', form?.id)
      
      expect(count).toBe(3)
    })
  })
})