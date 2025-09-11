/**
 * FORM DATA FLOW TESTS
 * 
 * Tests complete data lifecycle:
 * Form Submission → Database Storage → Data Retrieval
 * 
 * Validates data integrity and security across the entire pipeline
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import DOMPurify from 'isomorphic-dompurify'

describe('Form Submission → Storage → Retrieval Workflow', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let cleanupFormIds: string[] = []
  let cleanupSubmissionIds: string[] = []
  
  beforeAll(async () => {
    const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
    const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create test user
    const { data: authData, error } = await supabase.auth.signUp({
      email: 'form-flow-test@example.com',
      password: 'SecurePassword123!'
    })
    
    if (error) throw new Error(`Test user creation failed: ${error.message}`)
    testUserId = authData?.user?.id || ''
  })
  
  afterAll(async () => {
    // Cleanup test data
    for (const submissionId of cleanupSubmissionIds) {
      await supabase.from('form_submissions').delete().eq('id', submissionId)
    }
    for (const formId of cleanupFormIds) {
      await supabase.from('forms').delete().eq('id', formId)
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('Basic Form Data Lifecycle', () => {
    it('should complete full form data lifecycle: create → submit → store → retrieve', async () => {
      // STEP 1: Create Form Schema
      const formSchema = {
        title: 'Wedding Details Form',
        description: 'Collect essential wedding information',
        sections: [
          {
            id: 'basic-info',
            title: 'Basic Information',
            fields: [
              {
                id: 'bride_name',
                type: 'text',
                label: 'Bride Name',
                validation: { required: true, maxLength: 100 }
              },
              {
                id: 'groom_name',
                type: 'text',
                label: 'Groom Name',
                validation: { required: true, maxLength: 100 }
              },
              {
                id: 'wedding_date',
                type: 'date',
                label: 'Wedding Date',
                validation: { required: true }
              },
              {
                id: 'guest_count',
                type: 'number',
                label: 'Expected Guest Count',
                validation: { required: true, min: 1, max: 1000 }
              }
            ]
          },
          {
            id: 'contact-info',
            title: 'Contact Information',
            fields: [
              {
                id: 'contact_email',
                type: 'email',
                label: 'Contact Email',
                validation: { required: true }
              },
              {
                id: 'contact_phone',
                type: 'tel',
                label: 'Contact Phone',
                validation: { required: false }
              }
            ]
          }
        ],
        settings: {
          requireLogin: false,
          allowMultiple: true,
          successMessage: 'Thank you for submitting your wedding details!'
        },
        status: 'published',
        is_published: true,
        created_by: testUserId
      }
      
      // Store form in database
      const { data: createdForm, error: formError } = await supabase
        .from('forms')
        .insert(formSchema)
        .select()
        .single()
      
      expect(formError).toBeNull()
      expect(createdForm?.title).toBe('Wedding Details Form')
      expect(createdForm?.sections).toHaveLength(2)
      
      cleanupFormIds.push(createdForm?.id!)
      
      // STEP 2: Simulate Form Submission Data
      const submissionData = {
        bride_name: 'Emily Johnson',
        groom_name: 'Michael Smith',
        wedding_date: '2024-09-15',
        guest_count: 150,
        contact_email: 'emily.michael@example.com',
        contact_phone: '+1-555-123-4567'
      }
      
      // STEP 3: Validate Submission Data
      const validateSubmissionData = (data: any, schema: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        for (const section of schema.sections) {
          for (const field of section.fields) {
            const value = data[field.id]
            
            // Required field validation
            if (field.validation?.required && (!value || value === '')) {
              errors.push(`${field.label} is required`)
            }
            
            // Type-specific validation
            if (value) {
              switch (field.type) {
                case 'email':
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  if (!emailRegex.test(value)) {
                    errors.push(`${field.label} must be a valid email`)
                  }
                  break
                  
                case 'number':
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
                  break
                  
                case 'text':
                  if (field.validation?.maxLength && value.length > field.validation.maxLength) {
                    errors.push(`${field.label} is too long`)
                  }
                  break
              }
            }
          }
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      const validationResult = validateSubmissionData(submissionData, createdForm)
      expect(validationResult.isValid).toBe(true)
      expect(validationResult.errors).toHaveLength(0)
      
      // STEP 4: Sanitize Submission Data
      const sanitizeSubmissionData = (data: any): any => {
        const sanitized: any = {}
        
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            sanitized[key] = DOMPurify.sanitize(value, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
              KEEP_CONTENT: true
            })
          } else {
            sanitized[key] = value
          }
        }
        
        return sanitized
      }
      
      const sanitizedData = sanitizeSubmissionData(submissionData)
      expect(sanitizedData).toEqual(submissionData) // Should be unchanged for clean data
      
      // STEP 5: Store Submission in Database
      const { data: submission, error: submissionError } = await supabase
        .from('form_submissions')
        .insert({
          form_id: createdForm?.id,
          data: sanitizedData,
          metadata: {
            submittedAt: new Date().toISOString(),
            userAgent: 'Test-Agent/1.0',
            ipAddress: '127.0.0.1'
          },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(submissionError).toBeNull()
      expect(submission?.form_id).toBe(createdForm?.id)
      expect(submission?.data).toEqual(sanitizedData)
      expect(submission?.status).toBe('completed')
      
      cleanupSubmissionIds.push(submission?.id!)
      
      // STEP 6: Retrieve and Verify Stored Data
      const { data: retrievedSubmission, error: retrievalError } = await supabase
        .from('form_submissions')
        .select(`
          id,
          form_id,
          data,
          metadata,
          status,
          submitted_at,
          forms!inner(title, sections)
        `)
        .eq('id', submission?.id)
        .single()
      
      expect(retrievalError).toBeNull()
      expect(retrievedSubmission?.data.bride_name).toBe('Emily Johnson')
      expect(retrievedSubmission?.data.groom_name).toBe('Michael Smith')
      expect(retrievedSubmission?.data.wedding_date).toBe('2024-09-15')
      expect(retrievedSubmission?.data.guest_count).toBe(150)
      expect(retrievedSubmission?.data.contact_email).toBe('emily.michael@example.com')
      expect(retrievedSubmission?.data.contact_phone).toBe('+1-555-123-4567')
      
      // STEP 7: Verify Data Integrity
      expect(retrievedSubmission?.forms?.title).toBe('Wedding Details Form')
      expect(retrievedSubmission?.metadata?.submittedAt).toBeTruthy()
      expect(retrievedSubmission?.status).toBe('completed')
      
      // STEP 8: Test Data Aggregation
      const { data: formWithStats } = await supabase
        .from('forms')
        .select(`
          id,
          title,
          form_submissions!inner(id)
        `)
        .eq('id', createdForm?.id)
        .single()
      
      expect(formWithStats?.form_submissions).toHaveLength(1)
    })
    
    it('should handle malicious data sanitization in the complete flow', async () => {
      // Create form for testing sanitization
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Sanitization Test Form',
          sections: [
            {
              id: 'test-section',
              fields: [
                {
                  id: 'user_input',
                  type: 'text',
                  label: 'User Input',
                  validation: { required: true }
                },
                {
                  id: 'description',
                  type: 'textarea',
                  label: 'Description',
                  validation: { required: false }
                }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(form?.id!)
      
      // Malicious input data
      const maliciousData = {
        user_input: '<script>alert("XSS")</script>Legitimate Name',
        description: 'Normal text with <img src="x" onerror="alert(1)"> malicious content'
      }
      
      // Sanitize the data
      const sanitizeData = (data: any): any => {
        const sanitized: any = {}
        
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            sanitized[key] = DOMPurify.sanitize(value, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
              KEEP_CONTENT: true
            })
          } else {
            sanitized[key] = value
          }
        }
        
        return sanitized
      }
      
      const sanitizedData = sanitizeData(maliciousData)
      
      // Verify sanitization
      expect(sanitizedData.user_input).toBe('Legitimate Name')
      expect(sanitizedData.user_input).not.toContain('<script>')
      expect(sanitizedData.description).not.toContain('<img')
      expect(sanitizedData.description).toContain('Normal text with')
      expect(sanitizedData.description).toContain('malicious content')
      
      // Store sanitized data
      const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form?.id,
          data: sanitizedData,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      cleanupSubmissionIds.push(submission?.id!)
      
      // Verify stored data is clean
      const { data: retrievedData } = await supabase
        .from('form_submissions')
        .select('data')
        .eq('id', submission?.id)
        .single()
      
      expect(retrievedData?.data.user_input).not.toContain('<script>')
      expect(retrievedData?.data.description).not.toContain('<img')
    })
  })

  describe('Complex Data Types and Validation', () => {
    it('should handle file upload metadata through the complete flow', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'File Upload Test Form',
          sections: [
            {
              id: 'uploads',
              fields: [
                {
                  id: 'profile_photo',
                  type: 'file',
                  label: 'Profile Photo',
                  validation: { 
                    required: true,
                    allowedTypes: ['image/jpeg', 'image/png'],
                    maxSize: 5242880 // 5MB
                  }
                },
                {
                  id: 'documents',
                  type: 'file',
                  label: 'Documents',
                  validation: {
                    required: false,
                    allowedTypes: ['application/pdf', 'application/msword'],
                    maxSize: 10485760, // 10MB
                    multiple: true
                  }
                }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(form?.id!)
      
      // Simulate file upload metadata
      const fileSubmissionData = {
        profile_photo: {
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
          size: 1048576, // 1MB
          url: 'https://storage.example.com/uploads/profile_123.jpg',
          uploadedAt: new Date().toISOString()
        },
        documents: [
          {
            filename: 'contract.pdf',
            contentType: 'application/pdf',
            size: 524288, // 512KB
            url: 'https://storage.example.com/uploads/contract_456.pdf',
            uploadedAt: new Date().toISOString()
          }
        ]
      }
      
      // Validate file upload data
      const validateFileData = (data: any, schema: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (field.type === 'file') {
              const fileData = data[field.id]
              
              if (field.validation?.required && !fileData) {
                errors.push(`${field.label} is required`)
                continue
              }
              
              if (fileData) {
                const files = Array.isArray(fileData) ? fileData : [fileData]
                
                files.forEach((file: any, index: number) => {
                  const fileLabel = `${field.label}${files.length > 1 ? ` (file ${index + 1})` : ''}`
                  
                  if (field.validation?.allowedTypes && !field.validation.allowedTypes.includes(file.contentType)) {
                    errors.push(`${fileLabel} has unsupported file type`)
                  }
                  
                  if (field.validation?.maxSize && file.size > field.validation.maxSize) {
                    errors.push(`${fileLabel} exceeds maximum file size`)
                  }
                  
                  if (!file.url || !file.filename) {
                    errors.push(`${fileLabel} upload incomplete`)
                  }
                })
              }
            }
          }
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      const fileValidationResult = validateFileData(fileSubmissionData, form)
      expect(fileValidationResult.isValid).toBe(true)
      expect(fileValidationResult.errors).toHaveLength(0)
      
      // Store file metadata
      const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form?.id,
          data: fileSubmissionData,
          metadata: {
            uploadCount: 2,
            totalUploadSize: fileSubmissionData.profile_photo.size + fileSubmissionData.documents[0].size
          },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      cleanupSubmissionIds.push(submission?.id!)
      
      // Retrieve and verify file metadata
      const { data: retrievedSubmission } = await supabase
        .from('form_submissions')
        .select('data, metadata')
        .eq('id', submission?.id)
        .single()
      
      expect(retrievedSubmission?.data.profile_photo.filename).toBe('profile.jpg')
      expect(retrievedSubmission?.data.profile_photo.contentType).toBe('image/jpeg')
      expect(retrievedSubmission?.data.documents).toHaveLength(1)
      expect(retrievedSubmission?.data.documents[0].filename).toBe('contract.pdf')
      expect(retrievedSubmission?.metadata?.uploadCount).toBe(2)
    })
    
    it('should handle conditional field logic in data flow', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Conditional Logic Form',
          sections: [
            {
              id: 'conditional-section',
              fields: [
                {
                  id: 'has_dietary_restrictions',
                  type: 'radio',
                  label: 'Do you have dietary restrictions?',
                  options: ['Yes', 'No'],
                  validation: { required: true }
                },
                {
                  id: 'dietary_details',
                  type: 'textarea',
                  label: 'Please specify your dietary restrictions',
                  validation: { 
                    required: true 
                  },
                  conditionalLogic: {
                    showIf: {
                      field: 'has_dietary_restrictions',
                      value: 'Yes'
                    }
                  }
                },
                {
                  id: 'contact_method',
                  type: 'select',
                  label: 'Preferred contact method',
                  options: ['Email', 'Phone', 'Text'],
                  validation: { required: true }
                },
                {
                  id: 'phone_number',
                  type: 'tel',
                  label: 'Phone Number',
                  validation: { required: true },
                  conditionalLogic: {
                    showIf: {
                      field: 'contact_method',
                      value: ['Phone', 'Text']
                    }
                  }
                }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(form?.id!)
      
      // Test conditional validation
      const validateConditionalFields = (data: any, schema: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        for (const section of schema.sections) {
          for (const field of section.fields) {
            const value = data[field.id]
            
            // Check if field should be shown based on conditional logic
            let shouldShow = true
            if (field.conditionalLogic?.showIf) {
              const conditionField = field.conditionalLogic.showIf.field
              const conditionValue = field.conditionalLogic.showIf.value
              const triggerValue = data[conditionField]
              
              if (Array.isArray(conditionValue)) {
                shouldShow = conditionValue.includes(triggerValue)
              } else {
                shouldShow = triggerValue === conditionValue
              }
            }
            
            // Only validate if field should be shown
            if (shouldShow && field.validation?.required && (!value || value === '')) {
              errors.push(`${field.label} is required`)
            }
          }
        }
        
        return { isValid: errors.length === 0, errors }
      }
      
      // Test case 1: User has dietary restrictions
      const submissionWithRestrictions = {
        has_dietary_restrictions: 'Yes',
        dietary_details: 'Vegetarian, no nuts',
        contact_method: 'Phone',
        phone_number: '+1-555-987-6543'
      }
      
      const result1 = validateConditionalFields(submissionWithRestrictions, form)
      expect(result1.isValid).toBe(true)
      
      // Test case 2: User has no dietary restrictions (dietary_details not required)
      const submissionWithoutRestrictions = {
        has_dietary_restrictions: 'No',
        contact_method: 'Email'
        // dietary_details and phone_number not provided
      }
      
      const result2 = validateConditionalFields(submissionWithoutRestrictions, form)
      expect(result2.isValid).toBe(true)
      
      // Test case 3: Invalid - missing required conditional field
      const invalidSubmission = {
        has_dietary_restrictions: 'Yes',
        // dietary_details missing but required when has_dietary_restrictions = 'Yes'
        contact_method: 'Phone'
        // phone_number missing but required when contact_method = 'Phone'
      }
      
      const result3 = validateConditionalFields(invalidSubmission, form)
      expect(result3.isValid).toBe(false)
      expect(result3.errors).toContain('Please specify your dietary restrictions is required')
      expect(result3.errors).toContain('Phone Number is required')
      
      // Store valid conditional submission
      const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form?.id,
          data: submissionWithRestrictions,
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      cleanupSubmissionIds.push(submission?.id!)
      
      // Verify conditional data storage
      const { data: retrievedData } = await supabase
        .from('form_submissions')
        .select('data')
        .eq('id', submission?.id)
        .single()
      
      expect(retrievedData?.data.has_dietary_restrictions).toBe('Yes')
      expect(retrievedData?.data.dietary_details).toBe('Vegetarian, no nuts')
      expect(retrievedData?.data.contact_method).toBe('Phone')
      expect(retrievedData?.data.phone_number).toBe('+1-555-987-6543')
    })
  })

  describe('Data Retrieval and Aggregation', () => {
    let testFormId: string
    
    beforeEach(async () => {
      // Create a form for aggregation testing
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Aggregation Test Form',
          sections: [
            {
              id: 'section-1',
              fields: [
                {
                  id: 'rating',
                  type: 'number',
                  label: 'Rating',
                  validation: { required: true, min: 1, max: 5 }
                },
                {
                  id: 'category',
                  type: 'select',
                  label: 'Category',
                  options: ['A', 'B', 'C'],
                  validation: { required: true }
                }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      testFormId = form?.id!
      cleanupFormIds.push(testFormId)
      
      // Create multiple submissions for aggregation
      const submissions = [
        { rating: 5, category: 'A' },
        { rating: 4, category: 'A' },
        { rating: 3, category: 'B' },
        { rating: 5, category: 'B' },
        { rating: 2, category: 'C' }
      ]
      
      for (const data of submissions) {
        const { data: submission } = await supabase
          .from('form_submissions')
          .insert({
            form_id: testFormId,
            data,
            status: 'completed',
            submitted_at: new Date().toISOString()
          })
          .select()
          .single()
        
        cleanupSubmissionIds.push(submission?.id!)
      }
    })
    
    it('should aggregate form submission data correctly', async () => {
      // Retrieve all submissions for the form
      const { data: submissions } = await supabase
        .from('form_submissions')
        .select('data, submitted_at')
        .eq('form_id', testFormId)
        .eq('status', 'completed')
        .order('submitted_at', { ascending: true })
      
      expect(submissions).toHaveLength(5)
      
      // Calculate aggregations
      const ratings = submissions?.map(s => s.data.rating) || []
      const categories = submissions?.map(s => s.data.category) || []
      
      // Average rating
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      expect(averageRating).toBe(3.8) // (5+4+3+5+2)/5 = 3.8
      
      // Category distribution
      const categoryCount = categories.reduce((acc: any, category) => {
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})
      
      expect(categoryCount.A).toBe(2)
      expect(categoryCount.B).toBe(2)
      expect(categoryCount.C).toBe(1)
      
      // Min/Max ratings
      expect(Math.min(...ratings)).toBe(2)
      expect(Math.max(...ratings)).toBe(5)
    })
    
    it('should handle complex data filtering and searching', async () => {
      // Create form with searchable text fields
      const { data: searchForm } = await supabase
        .from('forms')
        .insert({
          title: 'Search Test Form',
          sections: [
            {
              id: 'search-section',
              fields: [
                {
                  id: 'name',
                  type: 'text',
                  label: 'Name',
                  validation: { required: true }
                },
                {
                  id: 'city',
                  type: 'text',
                  label: 'City',
                  validation: { required: true }
                },
                {
                  id: 'age',
                  type: 'number',
                  label: 'Age',
                  validation: { required: true }
                }
              ]
            }
          ],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(searchForm?.id!)
      
      // Create test submissions
      const testData = [
        { name: 'John Smith', city: 'New York', age: 25 },
        { name: 'Jane Doe', city: 'Los Angeles', age: 30 },
        { name: 'Bob Johnson', city: 'New York', age: 35 },
        { name: 'Alice Brown', city: 'Chicago', age: 28 }
      ]
      
      for (const data of testData) {
        const { data: submission } = await supabase
          .from('form_submissions')
          .insert({
            form_id: searchForm?.id,
            data,
            status: 'completed',
            submitted_at: new Date().toISOString()
          })
          .select()
          .single()
        
        cleanupSubmissionIds.push(submission?.id!)
      }
      
      // Simulate text search functionality
      const searchSubmissions = async (formId: string, searchTerm: string) => {
        const { data: submissions } = await supabase
          .from('form_submissions')
          .select('data')
          .eq('form_id', formId)
          .eq('status', 'completed')
        
        // Filter submissions containing search term
        return submissions?.filter(submission => {
          const dataString = JSON.stringify(submission.data).toLowerCase()
          return dataString.includes(searchTerm.toLowerCase())
        }) || []
      }
      
      // Test various search scenarios
      const newYorkResults = await searchSubmissions(searchForm?.id!, 'new york')
      expect(newYorkResults).toHaveLength(2)
      
      const johnResults = await searchSubmissions(searchForm?.id!, 'john')
      expect(johnResults).toHaveLength(2) // John Smith and Bob Johnson
      
      const ageResults = await searchSubmissions(searchForm?.id!, '25')
      expect(ageResults).toHaveLength(1) // John Smith, age 25
      
      // Test filtering by data fields
      const filterByAge = async (formId: string, minAge: number, maxAge: number) => {
        const { data: submissions } = await supabase
          .from('form_submissions')
          .select('data')
          .eq('form_id', formId)
          .eq('status', 'completed')
        
        return submissions?.filter(submission => {
          const age = submission.data.age
          return age >= minAge && age <= maxAge
        }) || []
      }
      
      const youngAdults = await filterByAge(searchForm?.id!, 25, 30)
      expect(youngAdults).toHaveLength(3) // Ages 25, 30, 28
      
      const thirties = await filterByAge(searchForm?.id!, 30, 39)
      expect(thirties).toHaveLength(2) // Ages 30, 35
    })
  })

  describe('Data Integrity and Error Handling', () => {
    it('should maintain referential integrity between forms and submissions', async () => {
      // Create form
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Integrity Test Form',
          sections: [{ id: 'section-1', fields: [{ id: 'test_field', type: 'text', label: 'Test' }] }],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(form?.id!)
      
      // Create submission
      const { data: submission } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form?.id,
          data: { test_field: 'test value' },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      cleanupSubmissionIds.push(submission?.id!)
      
      // Verify relationship
      const { data: submissionWithForm } = await supabase
        .from('form_submissions')
        .select(`
          id,
          data,
          forms!inner(id, title)
        `)
        .eq('id', submission?.id)
        .single()
      
      expect(submissionWithForm?.forms?.id).toBe(form?.id)
      expect(submissionWithForm?.forms?.title).toBe('Integrity Test Form')
      
      // Test cascade behavior (submissions should reference existing forms)
      const { data: invalidSubmission, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: 'non-existent-form-id',
          data: { test: 'data' },
          status: 'completed',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()
      
      // Should fail due to foreign key constraint
      expect(error).not.toBeNull()
      expect(invalidSubmission).toBeNull()
    })
    
    it('should handle concurrent submissions gracefully', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          title: 'Concurrency Test Form',
          sections: [{ id: 'section-1', fields: [{ id: 'counter', type: 'number', label: 'Counter' }] }],
          status: 'published',
          created_by: testUserId
        })
        .select()
        .single()
      
      cleanupFormIds.push(form?.id!)
      
      // Submit multiple submissions concurrently
      const concurrentSubmissions = Array.from({ length: 10 }, (_, i) =>
        supabase
          .from('form_submissions')
          .insert({
            form_id: form?.id,
            data: { counter: i },
            status: 'completed',
            submitted_at: new Date().toISOString()
          })
          .select()
          .single()
      )
      
      const results = await Promise.allSettled(concurrentSubmissions)
      
      // All submissions should succeed
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful).toHaveLength(10)
      
      // Add successful submission IDs to cleanup
      successful.forEach(result => {
        if (result.status === 'fulfilled') {
          cleanupSubmissionIds.push(result.value.data?.id!)
        }
      })
      
      // Verify all submissions were stored
      const { count } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', form?.id)
      
      expect(count).toBe(10)
    })
  })
})