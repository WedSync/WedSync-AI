/**
 * Form Factory
 * WS-192 Team B - Backend/API Focus
 * 
 * Factory for generating realistic wedding form test data
 */

import { FormTestData, FormFieldData, VendorType } from './types';
import { FactoryConfig } from './index';

export class FormFactory {
  /**
   * Create a booking form based on vendor type
   */
  static async createBookingForm(config: FactoryConfig, vendorType: VendorType = 'photographer'): Promise<FormTestData> {
    const formTemplates = {
      photographer: {
        name: 'Photography Booking Form',
        description: 'Book our wedding photography services for your special day',
        fields: [
          { id: 'first_name', type: 'text', name: 'first_name', label: 'First Name', required: true },
          { id: 'last_name', type: 'text', name: 'last_name', label: 'Last Name', required: true },
          { id: 'email', type: 'email', name: 'email', label: 'Email Address', required: true },
          { id: 'phone', type: 'phone', name: 'phone', label: 'Phone Number', required: false },
          { id: 'wedding_date', type: 'date', name: 'wedding_date', label: 'Wedding Date', required: true },
          { id: 'venue', type: 'text', name: 'venue', label: 'Wedding Venue', required: false },
          { id: 'guest_count', type: 'number', name: 'guest_count', label: 'Guest Count', required: true },
          { id: 'budget', type: 'number', name: 'budget', label: 'Photography Budget', required: false },
          { id: 'style', type: 'select', name: 'photography_style', label: 'Photography Style', required: false,
            options: ['Candid', 'Posed', 'Artistic', 'Photojournalistic'] },
          { id: 'message', type: 'textarea', name: 'message', label: 'Tell us about your vision', required: false }
        ] as FormFieldData[]
      },
      venue: {
        name: 'Venue Booking Inquiry',
        description: 'Inquire about our venue for your wedding celebration',
        fields: [
          { id: 'first_name', type: 'text', name: 'first_name', label: 'First Name', required: true },
          { id: 'last_name', type: 'text', name: 'last_name', label: 'Last Name', required: true },
          { id: 'email', type: 'email', name: 'email', label: 'Email Address', required: true },
          { id: 'phone', type: 'phone', name: 'phone', label: 'Phone Number', required: true },
          { id: 'wedding_date', type: 'date', name: 'wedding_date', label: 'Preferred Wedding Date', required: true },
          { id: 'guest_count', type: 'number', name: 'guest_count', label: 'Expected Guest Count', required: true },
          { id: 'ceremony', type: 'checkbox', name: 'ceremony_needed', label: 'Ceremony Space Needed', required: false },
          { id: 'reception', type: 'checkbox', name: 'reception_needed', label: 'Reception Space Needed', required: false },
          { id: 'budget', type: 'number', name: 'venue_budget', label: 'Venue Budget', required: false },
          { id: 'message', type: 'textarea', name: 'special_requests', label: 'Special Requests', required: false }
        ] as FormFieldData[]
      },
      florist: {
        name: 'Floral Design Consultation',
        description: 'Create beautiful floral arrangements for your wedding day',
        fields: [
          { id: 'first_name', type: 'text', name: 'first_name', label: 'First Name', required: true },
          { id: 'last_name', type: 'text', name: 'last_name', label: 'Last Name', required: true },
          { id: 'email', type: 'email', name: 'email', label: 'Email Address', required: true },
          { id: 'wedding_date', type: 'date', name: 'wedding_date', label: 'Wedding Date', required: true },
          { id: 'venue', type: 'text', name: 'venue_name', label: 'Venue Name', required: false },
          { id: 'style', type: 'select', name: 'floral_style', label: 'Preferred Style', required: false,
            options: ['Romantic', 'Modern', 'Rustic', 'Classic', 'Bohemian'] },
          { id: 'colors', type: 'text', name: 'color_palette', label: 'Color Palette', required: false },
          { id: 'budget', type: 'number', name: 'floral_budget', label: 'Floral Budget', required: false },
          { id: 'services', type: 'checkbox', name: 'services_needed', label: 'Services Needed', required: false,
            options: ['Bridal Bouquet', 'Bridesmaids Bouquets', 'Ceremony Arrangements', 'Reception Centerpieces'] },
          { id: 'message', type: 'textarea', name: 'vision', label: 'Describe Your Floral Vision', required: false }
        ] as FormFieldData[]
      }
    };

    const template = formTemplates[vendorType] || formTemplates.photographer;

    return {
      id: config.generateIds ? `form_${vendorType}_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      name: template.name,
      description: template.description,
      vendor_type: vendorType,
      configuration: {
        fields: template.fields,
        styling: {
          theme: 'elegant',
          colors: {
            primary: '#8B5A3C',
            secondary: '#F5F5DC'
          }
        },
        notifications: {
          email_on_submit: true,
          sms_on_submit: false,
          auto_response: true
        }
      },
      status: 'active',
      submission_count: config.realisticData ? Math.floor(Math.random() * 50) : 0,
      conversion_rate: config.realisticData ? (0.15 + Math.random() * 0.25) : 0.2, // 15-40%
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a form submission with realistic data
   */
  static async createSubmission(
    config: FactoryConfig, 
    formId: string, 
    coupleData?: any
  ): Promise<any> {
    const baseSubmissionData = coupleData || {
      first_name: 'John',
      last_name: 'Smith',
      email: `couple-${config.testId}@test.com`,
      phone: '(555) 123-4567',
      wedding_date: '2025-06-15',
      guest_count: 150,
      message: 'We are so excited to potentially work with you for our special day!'
    };

    return {
      id: config.generateIds ? `submission_${config.testId}_${Date.now()}` : undefined,
      form_id: formId,
      data: baseSubmissionData,
      status: 'submitted',
      ip_address: config.realisticData ? '192.168.1.100' : undefined,
      user_agent: config.realisticData ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' : undefined,
      referrer: config.realisticData ? 'https://google.com' : undefined,
      utm_source: config.realisticData ? 'google' : undefined,
      utm_campaign: config.realisticData ? 'wedding_2025' : undefined,
      submitted_at: config.realisticData ? new Date().toISOString() : undefined,
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a contact form for general inquiries
   */
  static async createContactForm(config: FactoryConfig): Promise<FormTestData> {
    return {
      id: config.generateIds ? `contact_form_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      name: 'Contact Us',
      description: 'Get in touch with us about your wedding needs',
      vendor_type: 'photographer', // Default
      configuration: {
        fields: [
          { id: 'name', type: 'text', name: 'full_name', label: 'Full Name', required: true },
          { id: 'email', type: 'email', name: 'email', label: 'Email Address', required: true },
          { id: 'subject', type: 'select', name: 'inquiry_type', label: 'Inquiry Type', required: true,
            options: ['Wedding Photography', 'Engagement Session', 'Portrait Session', 'Other'] },
          { id: 'message', type: 'textarea', name: 'message', label: 'Message', required: true }
        ],
        styling: {
          theme: 'clean',
          colors: {
            primary: '#333333',
            secondary: '#F8F9FA'
          }
        },
        notifications: {
          email_on_submit: true,
          sms_on_submit: false,
          auto_response: true
        }
      },
      status: 'active',
      submission_count: config.realisticData ? Math.floor(Math.random() * 25) : 0,
      conversion_rate: config.realisticData ? (0.05 + Math.random() * 0.15) : 0.1, // 5-20%
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a consultation booking form
   */
  static async createConsultationForm(config: FactoryConfig, vendorType: VendorType = 'photographer'): Promise<FormTestData> {
    return {
      id: config.generateIds ? `consultation_form_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      name: 'Schedule a Consultation',
      description: `Book a consultation to discuss your ${vendorType} needs`,
      vendor_type: vendorType,
      configuration: {
        fields: [
          { id: 'first_name', type: 'text', name: 'first_name', label: 'First Name', required: true },
          { id: 'last_name', type: 'text', name: 'last_name', label: 'Last Name', required: true },
          { id: 'email', type: 'email', name: 'email', label: 'Email Address', required: true },
          { id: 'phone', type: 'phone', name: 'phone', label: 'Phone Number', required: true },
          { id: 'wedding_date', type: 'date', name: 'wedding_date', label: 'Wedding Date', required: true },
          { id: 'preferred_date', type: 'date', name: 'consultation_date', label: 'Preferred Consultation Date', required: true },
          { id: 'preferred_time', type: 'select', name: 'consultation_time', label: 'Preferred Time', required: true,
            options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'] },
          { id: 'location', type: 'select', name: 'meeting_type', label: 'Meeting Preference', required: true,
            options: ['In-person', 'Video call', 'Phone call'] },
          { id: 'questions', type: 'textarea', name: 'questions', label: 'Questions or Topics to Discuss', required: false }
        ],
        styling: {
          theme: 'professional',
          colors: {
            primary: '#2C3E50',
            secondary: '#ECF0F1'
          }
        },
        notifications: {
          email_on_submit: true,
          sms_on_submit: true,
          auto_response: true
        }
      },
      status: 'active',
      submission_count: config.realisticData ? Math.floor(Math.random() * 30) : 0,
      conversion_rate: config.realisticData ? (0.25 + Math.random() * 0.35) : 0.4, // 25-60%
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }
}