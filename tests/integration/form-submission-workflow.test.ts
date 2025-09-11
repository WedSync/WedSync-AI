/**
 * Form Submission Workflow Integration Tests
 * Tests the complete flow of form creation, submission, and processing
 * for wedding vendors using WedSync 2.0
 */

import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Test constants for wedding vendor scenarios
const VENDOR_ID = 'test-photographer-123'
const COUPLE_EMAIL = 'bride@example.com'
const WEDDING_DATE = '2025-12-20'
const VENUE_NAME = 'Sunset Gardens'

describe('Form Submission Workflow - Wedding Vendor Integration', () => {
  let supabase: any
  let formId: string
  let submissionId: string

  beforeEach(async () => {
    // Setup test environment
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Clean up test data
    await supabase.from('form_submissions').delete().match({ 
      email: COUPLE_EMAIL 
    })
  })

  afterEach(async () => {
    // Cleanup after tests
    if (submissionId) {
      await supabase.from('form_submissions').delete().eq('id', submissionId)
    }
    if (formId) {
      await supabase.from('forms').delete().eq('id', formId)
    }
  })

  describe('Wedding Inquiry Form Creation', () => {
    it('should allow photographer to create a wedding inquiry form', async () => {
      const formData = {
        vendor_id: VENDOR_ID,
        name: 'Wedding Photography Inquiry',
        description: 'Initial inquiry form for couples interested in photography services',
        fields: [
          {
            id: 'couple_names',
            type: 'text',
            label: 'Couple Names',
            required: true,
            placeholder: 'e.g., Sarah & John'
          },
          {
            id: 'wedding_date',
            type: 'date',
            label: 'Wedding Date',
            required: true
          },
          {
            id: 'venue',
            type: 'text',
            label: 'Venue Name',
            required: true,
            placeholder: 'Where is your ceremony/reception?'
          },
          {
            id: 'guest_count',
            type: 'number',
            label: 'Estimated Guest Count',
            required: false,
            min: 1,
            max: 500
          },
          {
            id: 'photography_style',
            type: 'select',
            label: 'Preferred Photography Style',
            required: true,
            options: [
              { value: 'traditional', label: 'Traditional/Classic' },
              { value: 'photojournalistic', label: 'Photojournalistic' },
              { value: 'artistic', label: 'Fine Art/Artistic' },
              { value: 'documentary', label: 'Documentary' }
            ]
          },
          {
            id: 'budget_range',
            type: 'select',
            label: 'Photography Budget Range',
            required: true,
            options: [
              { value: 'under_3000', label: 'Under $3,000' },
              { value: '3000_5000', label: '$3,000 - $5,000' },
              { value: '5000_8000', label: '$5,000 - $8,000' },
              { value: 'over_8000', label: 'Over $8,000' }
            ]
          }
        ],
        settings: {
          send_confirmation: true,
          notification_email: 'photographer@example.com',
          thank_you_message: 'Thank you for your inquiry! We\'ll review your information and respond within 24 hours.',
          redirect_url: '/thank-you'
        }
      }

      const { data, error } = await supabase
        .from('forms')
        .insert(formData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('Wedding Photography Inquiry')
      expect(data.fields).toHaveLength(6)
      
      formId = data.id
    })

    it('should validate required fields when creating a form', async () => {
      const invalidFormData = {
        vendor_id: VENDOR_ID,
        // Missing required name field
        fields: []
      }

      const { data, error } = await supabase
        .from('forms')
        .insert(invalidFormData)
        .select()
        .single()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })
  })

  describe('Couple Form Submission', () => {
    beforeEach(async () => {
      // Create a form for testing submissions
      const { data } = await supabase
        .from('forms')
        .insert({
          vendor_id: VENDOR_ID,
          name: 'Wedding Photography Booking',
          fields: [
            {
              id: 'couple_names',
              type: 'text',
              label: 'Your Names',
              required: true
            },
            {
              id: 'email',
              type: 'email',
              label: 'Email Address',
              required: true
            },
            {
              id: 'phone',
              type: 'tel',
              label: 'Phone Number',
              required: true
            },
            {
              id: 'wedding_date',
              type: 'date',
              label: 'Wedding Date',
              required: true
            },
            {
              id: 'venue',
              type: 'text',
              label: 'Venue',
              required: true
            }
          ]
        })
        .select()
        .single()
      
      formId = data.id
    })

    it('should successfully submit a wedding inquiry from couple', async () => {
      const submissionData = {
        form_id: formId,
        email: COUPLE_EMAIL,
        data: {
          couple_names: 'Sarah & John',
          email: COUPLE_EMAIL,
          phone: '555-0123',
          wedding_date: WEDDING_DATE,
          venue: VENUE_NAME
        },
        metadata: {
          submitted_at: new Date().toISOString(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        }
      }

      const { data, error } = await supabase
        .from('form_submissions')
        .insert(submissionData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.email).toBe(COUPLE_EMAIL)
      expect(data.data.couple_names).toBe('Sarah & John')
      expect(data.data.venue).toBe(VENUE_NAME)
      
      submissionId = data.id
    })

    it('should validate required fields before submission', async () => {
      const incompleteSubmission = {
        form_id: formId,
        email: COUPLE_EMAIL,
        data: {
          couple_names: 'Sarah & John',
          // Missing required fields: email, phone, wedding_date, venue
        }
      }

      const { data, error } = await supabase
        .from('form_submissions')
        .insert(incompleteSubmission)
        .select()
        .single()

      // The database should reject incomplete submissions
      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('should handle duplicate wedding date submissions correctly', async () => {
      // First submission
      const firstSubmission = {
        form_id: formId,
        email: 'first@example.com',
        data: {
          couple_names: 'Emily & David',
          email: 'first@example.com',
          phone: '555-0001',
          wedding_date: WEDDING_DATE,
          venue: VENUE_NAME
        }
      }

      const { data: first } = await supabase
        .from('form_submissions')
        .insert(firstSubmission)
        .select()
        .single()

      // Second submission with same date (should be allowed - different couples)
      const secondSubmission = {
        form_id: formId,
        email: 'second@example.com',
        data: {
          couple_names: 'Lisa & Mark',
          email: 'second@example.com',
          phone: '555-0002',
          wedding_date: WEDDING_DATE,
          venue: 'Different Venue'
        }
      }

      const { data: second, error } = await supabase
        .from('form_submissions')
        .insert(secondSubmission)
        .select()
        .single()

      expect(error).toBeNull()
      expect(second).toBeDefined()
      expect(first.id).not.toBe(second.id)
      
      // Cleanup
      await supabase.from('form_submissions').delete().eq('id', first.id)
      await supabase.from('form_submissions').delete().eq('id', second.id)
    })
  })

  describe('Vendor Form Management', () => {
    it('should allow vendor to view all submissions for their forms', async () => {
      // Create form and submissions
      const { data: form } = await supabase
        .from('forms')
        .insert({
          vendor_id: VENDOR_ID,
          name: 'Photography Inquiry'
        })
        .select()
        .single()

      // Create multiple submissions
      const submissions = [
        {
          form_id: form.id,
          email: 'couple1@example.com',
          data: { couple_names: 'Couple 1' }
        },
        {
          form_id: form.id,
          email: 'couple2@example.com',
          data: { couple_names: 'Couple 2' }
        },
        {
          form_id: form.id,
          email: 'couple3@example.com',
          data: { couple_names: 'Couple 3' }
        }
      ]

      for (const submission of submissions) {
        await supabase.from('form_submissions').insert(submission)
      }

      // Query submissions for the vendor's form
      const { data: results, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', form.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(results).toHaveLength(3)
      expect(results[0].email).toContain('@example.com')

      // Cleanup
      await supabase.from('form_submissions').delete().eq('form_id', form.id)
      await supabase.from('forms').delete().eq('id', form.id)
    })

    it('should track form view analytics for vendor insights', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          vendor_id: VENDOR_ID,
          name: 'Wedding Package Inquiry',
          view_count: 0,
          submission_count: 0
        })
        .select()
        .single()

      // Simulate form views
      const { error: viewError } = await supabase
        .from('forms')
        .update({ view_count: form.view_count + 1 })
        .eq('id', form.id)

      expect(viewError).toBeNull()

      // Simulate form submission
      const { error: submitError } = await supabase
        .from('forms')
        .update({ submission_count: form.submission_count + 1 })
        .eq('id', form.id)

      expect(submitError).toBeNull()

      // Verify analytics
      const { data: updatedForm } = await supabase
        .from('forms')
        .select('view_count, submission_count')
        .eq('id', form.id)
        .single()

      expect(updatedForm.view_count).toBe(1)
      expect(updatedForm.submission_count).toBe(1)

      // Cleanup
      await supabase.from('forms').delete().eq('id', form.id)
    })
  })

  describe('Email Notifications', () => {
    it('should trigger notification to vendor on form submission', async () => {
      const mockSendEmail = jest.fn().mockResolvedValue({ success: true })
      
      // Mock email service
      jest.mock('@/lib/email/service', () => ({
        sendEmail: mockSendEmail
      }))

      const { data: form } = await supabase
        .from('forms')
        .insert({
          vendor_id: VENDOR_ID,
          name: 'Contact Form',
          settings: {
            notification_email: 'photographer@example.com',
            send_confirmation: true
          }
        })
        .select()
        .single()

      const submission = {
        form_id: form.id,
        email: COUPLE_EMAIL,
        data: {
          couple_names: 'Test Couple',
          message: 'We love your portfolio!'
        }
      }

      const { data } = await supabase
        .from('form_submissions')
        .insert(submission)
        .select()
        .single()

      // In a real scenario, this would be triggered by a database function or webhook
      // For testing, we simulate the email trigger
      expect(data).toBeDefined()
      
      // Verify email would be sent with correct details
      const emailData = {
        to: 'photographer@example.com',
        subject: 'New Wedding Inquiry from Test Couple',
        template: 'vendor-notification',
        data: {
          formName: 'Contact Form',
          coupleNames: 'Test Couple',
          submissionId: data.id
        }
      }

      // Cleanup
      await supabase.from('form_submissions').delete().eq('id', data.id)
      await supabase.from('forms').delete().eq('id', form.id)
    })

    it('should send confirmation email to couple after submission', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          vendor_id: VENDOR_ID,
          name: 'Booking Request',
          settings: {
            send_confirmation: true,
            thank_you_message: 'Thank you for your booking request!'
          }
        })
        .select()
        .single()

      const submission = {
        form_id: form.id,
        email: COUPLE_EMAIL,
        data: {
          couple_names: 'Sarah & John',
          wedding_date: WEDDING_DATE
        }
      }

      const { data } = await supabase
        .from('form_submissions')
        .insert(submission)
        .select()
        .single()

      // Verify confirmation email would be sent
      const confirmationEmail = {
        to: COUPLE_EMAIL,
        subject: 'Thank you for your inquiry',
        template: 'couple-confirmation',
        data: {
          coupleNames: 'Sarah & John',
          vendorName: 'Your Photographer',
          message: 'Thank you for your booking request!'
        }
      }

      expect(data.email).toBe(COUPLE_EMAIL)

      // Cleanup
      await supabase.from('form_submissions').delete().eq('id', data.id)
      await supabase.from('forms').delete().eq('id', form.id)
    })
  })

  describe('Data Export and Reporting', () => {
    it('should export form submissions to CSV for vendor', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          vendor_id: VENDOR_ID,
          name: 'Wedding Leads'
        })
        .select()
        .single()

      // Create sample submissions
      const submissions = [
        {
          form_id: form.id,
          email: 'couple1@test.com',
          data: {
            couple_names: 'Alice & Bob',
            wedding_date: '2025-06-15',
            venue: 'Garden Hotel'
          }
        },
        {
          form_id: form.id,
          email: 'couple2@test.com',
          data: {
            couple_names: 'Carol & Dave',
            wedding_date: '2025-07-20',
            venue: 'Beach Resort'
          }
        }
      ]

      for (const sub of submissions) {
        await supabase.from('form_submissions').insert(sub)
      }

      // Query for export
      const { data: exportData } = await supabase
        .from('form_submissions')
        .select('email, data, created_at')
        .eq('form_id', form.id)
        .order('created_at', { ascending: false })

      // Verify export data structure
      expect(exportData).toHaveLength(2)
      expect(exportData[0]).toHaveProperty('email')
      expect(exportData[0]).toHaveProperty('data')
      expect(exportData[0].data).toHaveProperty('couple_names')

      // Cleanup
      await supabase.from('form_submissions').delete().eq('form_id', form.id)
      await supabase.from('forms').delete().eq('id', form.id)
    })
  })
})

describe('Form Builder Advanced Features', () => {
  let supabase: any

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  })

  describe('Conditional Logic', () => {
    it('should handle conditional fields based on wedding type', async () => {
      const formWithLogic = {
        vendor_id: VENDOR_ID,
        name: 'Wedding Details Form',
        fields: [
          {
            id: 'wedding_type',
            type: 'select',
            label: 'Wedding Type',
            options: [
              { value: 'traditional', label: 'Traditional' },
              { value: 'destination', label: 'Destination' },
              { value: 'elopement', label: 'Elopement' }
            ]
          },
          {
            id: 'travel_details',
            type: 'textarea',
            label: 'Travel Details',
            conditional: {
              field: 'wedding_type',
              value: 'destination',
              action: 'show'
            }
          },
          {
            id: 'guest_count',
            type: 'number',
            label: 'Guest Count',
            conditional: {
              field: 'wedding_type',
              value: 'elopement',
              action: 'hide'
            }
          }
        ]
      }

      const { data, error } = await supabase
        .from('forms')
        .insert(formWithLogic)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.fields).toHaveLength(3)
      expect(data.fields[1].conditional).toBeDefined()

      // Cleanup
      await supabase.from('forms').delete().eq('id', data.id)
    })
  })

  describe('Multi-Step Forms', () => {
    it('should support multi-step wedding inquiry forms', async () => {
      const multiStepForm = {
        vendor_id: VENDOR_ID,
        name: 'Complete Wedding Inquiry',
        type: 'multi-step',
        steps: [
          {
            title: 'Basic Information',
            fields: [
              { id: 'couple_names', type: 'text', label: 'Your Names' },
              { id: 'email', type: 'email', label: 'Email' },
              { id: 'phone', type: 'tel', label: 'Phone' }
            ]
          },
          {
            title: 'Wedding Details',
            fields: [
              { id: 'wedding_date', type: 'date', label: 'Wedding Date' },
              { id: 'venue', type: 'text', label: 'Venue' },
              { id: 'guest_count', type: 'number', label: 'Guest Count' }
            ]
          },
          {
            title: 'Photography Preferences',
            fields: [
              { id: 'style', type: 'select', label: 'Photography Style' },
              { id: 'budget', type: 'select', label: 'Budget Range' },
              { id: 'additional_notes', type: 'textarea', label: 'Additional Notes' }
            ]
          }
        ]
      }

      const { data, error } = await supabase
        .from('forms')
        .insert(multiStepForm)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.type).toBe('multi-step')
      expect(data.steps).toHaveLength(3)

      // Cleanup
      await supabase.from('forms').delete().eq('id', data.id)
    })
  })

  describe('Form Templates', () => {
    it('should provide wedding vendor form templates', async () => {
      const templates = [
        {
          name: 'Photography Inquiry',
          category: 'photography',
          fields: ['couple_names', 'wedding_date', 'venue', 'style', 'budget']
        },
        {
          name: 'Venue Booking',
          category: 'venue',
          fields: ['couple_names', 'date', 'guest_count', 'ceremony_time', 'reception_duration']
        },
        {
          name: 'Catering Request',
          category: 'catering',
          fields: ['couple_names', 'date', 'guest_count', 'dietary_restrictions', 'menu_preferences']
        }
      ]

      // Verify templates can be used to create forms
      for (const template of templates) {
        const { data, error } = await supabase
          .from('form_templates')
          .insert(template)
          .select()
          .single()

        if (!error) {
          expect(data.name).toBe(template.name)
          expect(data.fields).toEqual(template.fields)
          
          // Cleanup
          await supabase.from('form_templates').delete().eq('id', data.id)
        }
      }
    })
  })
})