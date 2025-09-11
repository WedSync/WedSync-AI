/**
 * RLS (Row Level Security) FORM VALIDATION TESTS
 * 
 * Tests interaction between form validation and database RLS policies:
 * - Organization-based access control
 * - Multi-tenant data isolation
 * - Security boundary enforcement
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

describe('Form Validation with RLS Policies', () => {
  let supabase: SupabaseClient
  let org1UserId: string
  let org2UserId: string
  let org1Id: string
  let org2Id: string
  let cleanupFormIds: string[] = []
  let cleanupSubmissionIds: string[] = []
  
  beforeAll(async () => {
    const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
    const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create two organizations for multi-tenant testing
    const { data: org1 } = await supabase
      .from('organizations')
      .insert({
        name: 'Organization One',
        subscription_tier: 'PROFESSIONAL',
        is_active: true
      })
      .select()
      .single()
    
    const { data: org2 } = await supabase
      .from('organizations')
      .insert({
        name: 'Organization Two',
        subscription_tier: 'PROFESSIONAL',
        is_active: true
      })
      .select()
      .single()
    
    org1Id = org1?.id!
    org2Id = org2?.id!
    
    // Create users for each organization
    const { data: user1 } = await supabase.auth.signUp({
      email: 'org1-user@example.com',
      password: 'SecurePassword123!'
    })
    
    const { data: user2 } = await supabase.auth.signUp({
      email: 'org2-user@example.com',
      password: 'SecurePassword123!'
    })
    
    org1UserId = user1?.user?.id!
    org2UserId = user2?.user?.id!
    
    // Create user profiles with organization associations
    await supabase.from('user_profiles').insert([
      {
        user_id: org1UserId,
        organization_id: org1Id,
        role: 'ADMIN',
        display_name: 'Org 1 Admin'
      },
      {
        user_id: org2UserId,
        organization_id: org2Id,
        role: 'ADMIN',
        display_name: 'Org 2 Admin'
      }
    ])
  })
  
  afterAll(async () => {
    // Cleanup test data
    for (const submissionId of cleanupSubmissionIds) {
      await supabase.from('form_submissions').delete().eq('id', submissionId)
    }
    for (const formId of cleanupFormIds) {
      await supabase.from('forms').delete().eq('id', formId)
    }
    
    // Cleanup organizations and users
    await supabase.from('user_profiles').delete().in('user_id', [org1UserId, org2UserId])
    await supabase.from('organizations').delete().in('id', [org1Id, org2Id])
    
    if (org1UserId) await supabase.auth.admin.deleteUser(org1UserId)
    if (org2UserId) await supabase.auth.admin.deleteUser(org2UserId)
  })

  describe('Organization-Based Form Access Control', () => {
    it('should enforce organization isolation for form creation and access', async () => {
      // Create client for Organization 1
      const org1Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      // Sign in as Organization 1 user
      const { data: session1 } = await org1Client.auth.signInWithPassword({
        email: 'org1-user@example.com',
        password: 'SecurePassword123!'
      })
      
      expect(session1?.user?.id).toBe(org1UserId)
      
      // Create form in Organization 1
      const org1FormData = {
        title: 'Organization 1 Private Form',
        description: 'This form belongs to Organization 1',
        sections: [
          {
            id: 'section-1',
            fields: [
              {
                id: 'org1_field',
                type: 'text',
                label: 'Organization 1 Field',
                validation: { required: true }
              }
            ]
          }
        ],
        organization_id: org1Id,
        status: 'published',
        is_published: true,
        created_by: org1UserId
      }
      
      const { data: org1Form, error: org1FormError } = await org1Client
        .from('forms')
        .insert(org1FormData)
        .select()
        .single()
      
      expect(org1FormError).toBeNull()
      expect(org1Form?.title).toBe('Organization 1 Private Form')
      expect(org1Form?.organization_id).toBe(org1Id)
      
      cleanupFormIds.push(org1Form?.id!)
      
      // Verify Organization 1 user can see their form
      const { data: org1FormsVisible } = await org1Client
        .from('forms')
        .select()
        .eq('organization_id', org1Id)
      
      expect(org1FormsVisible).toHaveLength(1)
      expect(org1FormsVisible?.[0]?.id).toBe(org1Form?.id)
      
      // Create client for Organization 2
      const org2Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      // Sign in as Organization 2 user
      await org2Client.auth.signInWithPassword({
        email: 'org2-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Organization 2 user should NOT see Organization 1's forms
      const { data: org2FormsVisible } = await org2Client
        .from('forms')
        .select()
        .eq('organization_id', org1Id) // Trying to access Org 1 forms
      
      expect(org2FormsVisible).toHaveLength(0) // RLS should block access
      
      // Verify Organization 2 user cannot access Organization 1's form by ID
      const { data: unauthorizedForm, error: unauthorizedError } = await org2Client
        .from('forms')
        .select()
        .eq('id', org1Form?.id)
        .single()
      
      expect(unauthorizedForm).toBeNull() // RLS blocks access
      expect(unauthorizedError).not.toBeNull()
      
      // Organization 2 can create their own forms
      const org2FormData = {
        title: 'Organization 2 Private Form',
        description: 'This form belongs to Organization 2',
        sections: [
          {
            id: 'section-1',
            fields: [
              {
                id: 'org2_field',
                type: 'text',
                label: 'Organization 2 Field',
                validation: { required: true }
              }
            ]
          }
        ],
        organization_id: org2Id,
        status: 'published',
        is_published: true,
        created_by: org2UserId
      }
      
      const { data: org2Form, error: org2FormError } = await org2Client
        .from('forms')
        .insert(org2FormData)
        .select()
        .single()
      
      expect(org2FormError).toBeNull()
      expect(org2Form?.organization_id).toBe(org2Id)
      
      cleanupFormIds.push(org2Form?.id!)
      
      // Verify both organizations can only see their own forms
      const { data: org1OnlyForms } = await org1Client
        .from('forms')
        .select()
      
      const { data: org2OnlyForms } = await org2Client
        .from('forms')
        .select()
      
      expect(org1OnlyForms?.every(form => form.organization_id === org1Id)).toBe(true)
      expect(org2OnlyForms?.every(form => form.organization_id === org2Id)).toBe(true)
      
      // Cross-organization access should be completely blocked
      expect(org1OnlyForms?.some(form => form.organization_id === org2Id)).toBe(false)
      expect(org2OnlyForms?.some(form => form.organization_id === org1Id)).toBe(false)
    })
    
    it('should enforce RLS on form submissions across organizations', async () => {
      // Set up clients for both organizations
      const org1Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      const org2Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      await org1Client.auth.signInWithPassword({
        email: 'org1-user@example.com',
        password: 'SecurePassword123!'
      })
      
      await org2Client.auth.signInWithPassword({
        email: 'org2-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Create forms for both organizations
      const { data: org1Form } = await org1Client
        .from('forms')
        .insert({
          title: 'Org 1 Submission Test Form',
          sections: [
            {
              id: 'section-1',
              fields: [
                {
                  id: 'sensitive_data',
                  type: 'text',
                  label: 'Sensitive Organization Data',
                  validation: { required: true }
                }
              ]
            }
          ],
          organization_id: org1Id,
          status: 'published',
          created_by: org1UserId
        })
        .select()
        .single()
      
      const { data: org2Form } = await org2Client
        .from('forms')
        .insert({
          title: 'Org 2 Submission Test Form',
          sections: [
            {
              id: 'section-1',
              fields: [
                {
                  id: 'confidential_info',
                  type: 'text',
                  label: 'Confidential Information',
                  validation: { required: true }
                }
              ]
            }
          ],
          organization_id: org2Id,
          status: 'published',
          created_by: org2UserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(org1Form?.id!, org2Form?.id!)
      
      // Create submissions for each form
      const { data: org1Submission } = await org1Client
        .from('form_submissions')
        .insert({
          form_id: org1Form?.id,
          organization_id: org1Id,
          data: { sensitive_data: 'Organization 1 Confidential Data' },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      const { data: org2Submission } = await org2Client
        .from('form_submissions')
        .insert({
          form_id: org2Form?.id,
          organization_id: org2Id,
          data: { confidential_info: 'Organization 2 Secret Information' },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      cleanupSubmissionIds.push(org1Submission?.id!, org2Submission?.id!)
      
      // Verify RLS isolation for submissions
      
      // Organization 1 can only see their submissions
      const { data: org1VisibleSubmissions } = await org1Client
        .from('form_submissions')
        .select()
      
      expect(org1VisibleSubmissions?.every(sub => sub.organization_id === org1Id)).toBe(true)
      expect(org1VisibleSubmissions?.length).toBeGreaterThan(0)
      
      // Organization 2 can only see their submissions
      const { data: org2VisibleSubmissions } = await org2Client
        .from('form_submissions')
        .select()
      
      expect(org2VisibleSubmissions?.every(sub => sub.organization_id === org2Id)).toBe(true)
      expect(org2VisibleSubmissions?.length).toBeGreaterThan(0)
      
      // Cross-organization submission access should be blocked
      const { data: org1TryAccessOrg2 } = await org1Client
        .from('form_submissions')
        .select()
        .eq('id', org2Submission?.id)
      
      const { data: org2TryAccessOrg1 } = await org2Client
        .from('form_submissions')
        .select()
        .eq('id', org1Submission?.id)
      
      expect(org1TryAccessOrg2).toHaveLength(0) // RLS blocks access
      expect(org2TryAccessOrg1).toHaveLength(0) // RLS blocks access
    })
  })

  describe('Form Validation with Security Context', () => {
    it('should validate form data while respecting organizational boundaries', async () => {
      const org1Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      await org1Client.auth.signInWithPassword({
        email: 'org1-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Create a form with complex validation rules
      const { data: validationForm } = await org1Client
        .from('forms')
        .insert({
          title: 'RLS Validation Test Form',
          sections: [
            {
              id: 'validation-section',
              fields: [
                {
                  id: 'org_code',
                  type: 'text',
                  label: 'Organization Code',
                  validation: { 
                    required: true,
                    pattern: '^ORG[0-9]{3}$',
                    maxLength: 6
                  }
                },
                {
                  id: 'security_level',
                  type: 'select',
                  label: 'Security Level',
                  options: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
                  validation: { required: true }
                },
                {
                  id: 'access_count',
                  type: 'number',
                  label: 'Access Count',
                  validation: { 
                    required: true,
                    min: 1,
                    max: 1000
                  }
                }
              ]
            }
          ],
          organization_id: org1Id,
          status: 'published',
          created_by: org1UserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(validationForm?.id!)
      
      // Test form validation within correct organizational context
      const validateFormSubmission = (data: any, schema: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        for (const section of schema.sections) {
          for (const field of section.fields) {
            const value = data[field.id]
            
            // Required field validation
            if (field.validation?.required && (!value || value === '')) {
              errors.push(`${field.label} is required`)
            }
            
            if (value) {
              // Pattern validation
              if (field.validation?.pattern) {
                const regex = new RegExp(field.validation.pattern)
                if (!regex.test(value)) {
                  errors.push(`${field.label} format is invalid`)
                }
              }
              
              // Length validation
              if (field.validation?.maxLength && value.length > field.validation.maxLength) {
                errors.push(`${field.label} is too long`)
              }
              
              // Number validation
              if (field.type === 'number') {
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
              
              // Select validation
              if (field.type === 'select' && field.options && !field.options.includes(value)) {
                errors.push(`${field.label} has invalid selection`)
              }
            }
          }
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      // Test valid submission
      const validSubmissionData = {
        org_code: 'ORG123',
        security_level: 'CONFIDENTIAL',
        access_count: 50
      }
      
      const validationResult = validateFormSubmission(validSubmissionData, validationForm)
      expect(validationResult.isValid).toBe(true)
      expect(validationResult.errors).toHaveLength(0)
      
      // Store valid submission with RLS context
      const { data: validSubmission, error: validError } = await org1Client
        .from('form_submissions')
        .insert({
          form_id: validationForm?.id,
          organization_id: org1Id, // Matches user's organization
          data: validSubmissionData,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(validError).toBeNull()
      expect(validSubmission?.organization_id).toBe(org1Id)
      
      cleanupSubmissionIds.push(validSubmission?.id!)
      
      // Test invalid submissions
      const invalidSubmissions = [
        {
          data: { org_code: 'INVALID', security_level: 'CONFIDENTIAL', access_count: 50 },
          expectedErrors: ['Organization Code format is invalid']
        },
        {
          data: { org_code: 'ORG123', security_level: 'INVALID_LEVEL', access_count: 50 },
          expectedErrors: ['Security Level has invalid selection']
        },
        {
          data: { org_code: 'ORG123', security_level: 'CONFIDENTIAL', access_count: 2000 },
          expectedErrors: ['Access Count must be at most 1000']
        }
      ]
      
      invalidSubmissions.forEach(testCase => {
        const result = validateFormSubmission(testCase.data, validationForm)
        expect(result.isValid).toBe(false)
        testCase.expectedErrors.forEach(expectedError => {
          expect(result.errors).toContain(expectedError)
        })
      })
      
      // Verify that even with validation errors, RLS still enforces organization isolation
      const org2Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      await org2Client.auth.signInWithPassword({
        email: 'org2-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Organization 2 user should not be able to submit to Organization 1's form
      const { data: crossOrgSubmission, error: crossOrgError } = await org2Client
        .from('form_submissions')
        .insert({
          form_id: validationForm?.id, // Org 1's form
          organization_id: org2Id, // Org 2's ID
          data: validSubmissionData,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      // This should fail due to RLS policies
      expect(crossOrgError).not.toBeNull()
      expect(crossOrgSubmission).toBeNull()
    })
    
    it('should handle security-sensitive field validation with RLS', async () => {
      const org1Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      await org1Client.auth.signInWithPassword({
        email: 'org1-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Create form with security-sensitive fields
      const { data: securityForm } = await org1Client
        .from('forms')
        .insert({
          title: 'Security-Sensitive Form',
          sections: [
            {
              id: 'security-section',
              fields: [
                {
                  id: 'ssn',
                  type: 'text',
                  label: 'Social Security Number',
                  validation: { 
                    required: true,
                    pattern: '^\\d{3}-\\d{2}-\\d{4}$',
                    encrypted: true
                  }
                },
                {
                  id: 'credit_card',
                  type: 'text',
                  label: 'Credit Card Number',
                  validation: { 
                    required: false,
                    pattern: '^\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}$',
                    encrypted: true
                  }
                },
                {
                  id: 'clearance_level',
                  type: 'select',
                  label: 'Security Clearance Level',
                  options: ['NONE', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'],
                  validation: { required: true }
                }
              ]
            }
          ],
          organization_id: org1Id,
          status: 'published',
          created_by: org1UserId,
          metadata: {
            securityLevel: 'HIGH',
            requiresAuditLog: true,
            piiFields: ['ssn', 'credit_card']
          }
        })
        .select()
        .single()
      
      cleanupFormIds.push(securityForm?.id!)
      
      // Simulate security-aware validation
      const validateSecurityFields = (data: any, schema: any): { 
        isValid: boolean; 
        errors: string[]; 
        securityFlags: string[] 
      } => {
        const errors: string[] = []
        const securityFlags: string[] = []
        
        for (const section of schema.sections) {
          for (const field of section.fields) {
            const value = data[field.id]
            
            if (field.validation?.encrypted && value) {
              securityFlags.push(`PII_DETECTED:${field.id}`)
            }
            
            if (field.id === 'clearance_level' && value === 'TOP_SECRET') {
              securityFlags.push('HIGH_SECURITY_CLEARANCE_REQUIRED')
            }
            
            // Standard validation
            if (field.validation?.required && (!value || value === '')) {
              errors.push(`${field.label} is required`)
            }
            
            if (value && field.validation?.pattern) {
              const regex = new RegExp(field.validation.pattern)
              if (!regex.test(value)) {
                errors.push(`${field.label} format is invalid`)
              }
            }
          }
        }
        
        return { 
          isValid: errors.length === 0, 
          errors, 
          securityFlags 
        }
      }
      
      // Test security-sensitive data
      const sensitiveData = {
        ssn: '123-45-6789',
        credit_card: '1234 5678 9012 3456',
        clearance_level: 'TOP_SECRET'
      }
      
      const securityValidationResult = validateSecurityFields(sensitiveData, securityForm)
      expect(securityValidationResult.isValid).toBe(true)
      expect(securityValidationResult.securityFlags).toContain('PII_DETECTED:ssn')
      expect(securityValidationResult.securityFlags).toContain('PII_DETECTED:credit_card')
      expect(securityValidationResult.securityFlags).toContain('HIGH_SECURITY_CLEARANCE_REQUIRED')
      
      // Simulate data encryption before storage
      const encryptSensitiveData = (data: any, schema: any): any => {
        const processedData = { ...data }
        
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (field.validation?.encrypted && processedData[field.id]) {
              // Simulate encryption (in real implementation, use proper encryption)
              processedData[field.id] = `ENCRYPTED:${btoa(processedData[field.id])}`
            }
          }
        }
        
        return processedData
      }
      
      const encryptedData = encryptSensitiveData(sensitiveData, securityForm)
      expect(encryptedData.ssn).toStartWith('ENCRYPTED:')
      expect(encryptedData.credit_card).toStartWith('ENCRYPTED:')
      expect(encryptedData.clearance_level).toBe('TOP_SECRET') // Not encrypted
      
      // Store encrypted data with RLS protection
      const { data: securitySubmission, error: securityError } = await org1Client
        .from('form_submissions')
        .insert({
          form_id: securityForm?.id,
          organization_id: org1Id,
          data: encryptedData,
          metadata: {
            securityLevel: 'HIGH',
            piiEncrypted: true,
            auditRequired: true
          },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(securityError).toBeNull()
      expect(securitySubmission?.metadata?.piiEncrypted).toBe(true)
      
      cleanupSubmissionIds.push(securitySubmission?.id!)
      
      // Verify RLS protects sensitive data across organizations
      const org2Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      await org2Client.auth.signInWithPassword({
        email: 'org2-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Organization 2 should not access Organization 1's sensitive data
      const { data: unauthorizedAccess } = await org2Client
        .from('form_submissions')
        .select()
        .eq('id', securitySubmission?.id)
      
      expect(unauthorizedAccess).toHaveLength(0) // RLS blocks access to sensitive data
    })
  })

  describe('Performance and Scalability with RLS', () => {
    it('should maintain validation performance with RLS policies active', async () => {
      const org1Client = createClient(
        process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
        process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
      )
      
      await org1Client.auth.signInWithPassword({
        email: 'org1-user@example.com',
        password: 'SecurePassword123!'
      })
      
      // Create form for performance testing
      const { data: perfForm } = await org1Client
        .from('forms')
        .insert({
          title: 'Performance Test Form',
          sections: [
            {
              id: 'perf-section',
              fields: [
                {
                  id: 'batch_id',
                  type: 'text',
                  label: 'Batch ID',
                  validation: { required: true }
                },
                {
                  id: 'sequence_number',
                  type: 'number',
                  label: 'Sequence Number',
                  validation: { required: true, min: 1 }
                }
              ]
            }
          ],
          organization_id: org1Id,
          status: 'published',
          created_by: org1UserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(perfForm?.id!)
      
      // Batch create submissions to test RLS performance
      const batchSize = 20
      const submissions = []
      
      for (let i = 0; i < batchSize; i++) {
        submissions.push({
          form_id: perfForm?.id,
          organization_id: org1Id,
          data: {
            batch_id: `BATCH_${Math.floor(i / 5)}`,
            sequence_number: i + 1
          },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
      }
      
      const startTime = Date.now()
      
      // Insert submissions in batches (simulating concurrent validation)
      const { data: batchSubmissions, error: batchError } = await org1Client
        .from('form_submissions')
        .insert(submissions)
        .select()
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(batchError).toBeNull()
      expect(batchSubmissions).toHaveLength(batchSize)
      
      // Performance should be reasonable even with RLS
      expect(processingTime).toBeLessThan(5000) // Less than 5 seconds
      
      // Track submission IDs for cleanup
      batchSubmissions?.forEach(sub => cleanupSubmissionIds.push(sub.id))
      
      // Verify RLS didn't compromise data integrity
      const { data: verificationQuery, count } = await org1Client
        .from('form_submissions')
        .select('*', { count: 'exact' })
        .eq('form_id', perfForm?.id)
        .eq('organization_id', org1Id)
      
      expect(count).toBe(batchSize)
      expect(verificationQuery?.every(sub => sub.organization_id === org1Id)).toBe(true)
      
      // Test query performance with RLS filters
      const queryStartTime = Date.now()
      
      const { data: filteredResults } = await org1Client
        .from('form_submissions')
        .select(`
          id,
          data,
          forms!inner(title, organization_id)
        `)
        .eq('form_id', perfForm?.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      const queryEndTime = Date.now()
      const queryTime = queryEndTime - queryStartTime
      
      expect(filteredResults).toBeTruthy()
      expect(queryTime).toBeLessThan(1000) // Query should be fast with proper indexing
      
      // Verify all results respect RLS boundaries
      expect(filteredResults?.every(result => 
        result.forms?.organization_id === org1Id
      )).toBe(true)
    })
  })
})