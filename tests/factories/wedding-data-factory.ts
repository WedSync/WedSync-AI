/**
 * WS-192 Integration Tests Suite - Wedding Data Factory
 * Team C - Integration Testing Infrastructure
 * 
 * Generates realistic wedding industry test data for comprehensive integration testing
 */

import { faker } from '@faker-js/faker'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import crypto from 'crypto'

export interface WeddingSupplier {
  id: string
  name: string
  business_type: 'photographer' | 'venue' | 'florist' | 'caterer' | 'band' | 'planner'
  email: string
  phone: string
  subscription_tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise'
  website: string
  location: {
    city: string
    county: string
    postcode: string
    latitude: number
    longitude: number
  }
  services: string[]
  pricing: Record<string, number>
  availability: Record<string, any>
  portfolio: string[]
  reviews: WeddingReview[]
  created_at: string
}

export interface WeddingCouple {
  id: string
  partner1_name: string
  partner2_name: string
  email: string
  phone: string
  wedding_date: string
  venue_name: string
  guest_count: number
  budget_total: number
  budget_breakdown: Record<string, number>
  location: {
    city: string
    county: string
    postcode: string
  }
  preferences: {
    style: string
    colors: string[]
    season: string
  }
  timeline: WeddingTimelineItem[]
}

export interface WeddingForm {
  id: string
  organization_id: string
  name: string
  description: string
  fields: FormField[]
  settings: Record<string, any>
  styling: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface CustomerJourney {
  id: string
  organization_id: string
  customer_id: string
  name: string
  status: 'inquiry' | 'consultation' | 'proposal_sent' | 'booked' | 'completed'
  steps: JourneyStep[]
  automation_rules: AutomationRule[]
  touchpoints: Touchpoint[]
  metrics: Record<string, number>
  created_at: string
  updated_at: string
}

export interface WeddingEcosystem {
  supplier: WeddingSupplier
  couple: WeddingCouple
  forms: WeddingForm[]
  journeys: CustomerJourney[]
  submissions: FormSubmission[]
}

interface WeddingReview {
  rating: number
  comment: string
  client_name: string
  wedding_date: string
}

interface WeddingTimelineItem {
  time: string
  activity: string
  responsible: string
  notes: string
}

interface FormField {
  id: string
  type: string
  label: string
  placeholder: string
  required: boolean
  validation?: Record<string, any>
  options?: string[]
}

interface JourneyStep {
  id: string
  name: string
  description: string
  type: string
  order: number
  triggers: string[]
  actions: string[]
}

interface AutomationRule {
  trigger: string
  condition: string
  action: string
  delay?: number
}

interface Touchpoint {
  type: string
  timestamp: string
  content: string
  channel: string
}

interface FormSubmission {
  id: string
  form_id: string
  customer_id: string
  data: Record<string, any>
  status: string
  created_at: string
}

export class WeddingDataFactory {
  constructor(private supabase: SupabaseClient<Database>) {
    // Set up faker locale for UK wedding industry
    faker.setLocale('en_GB')
  }

  async createWeddingSupplier(overrides?: Partial<WeddingSupplier>): Promise<WeddingSupplier> {
    const businessType = overrides?.business_type || faker.helpers.arrayElement([
      'photographer', 'venue', 'florist', 'caterer', 'band', 'planner'
    ])

    const supplier: WeddingSupplier = {
      id: crypto.randomUUID(),
      name: this.generateBusinessName(businessType),
      business_type: businessType,
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number('07### ######'),
      subscription_tier: faker.helpers.arrayElement([
        'free', 'starter', 'professional', 'scale', 'enterprise'
      ]),
      website: faker.internet.url(),
      location: {
        city: faker.location.city(),
        county: faker.helpers.arrayElement([
          'Surrey', 'Kent', 'Hampshire', 'Berkshire', 'Essex', 'Hertfordshire'
        ]),
        postcode: faker.location.zipCode('?## #??'),
        latitude: parseFloat(faker.location.latitude({ min: 50.5, max: 52.0 })),
        longitude: parseFloat(faker.location.longitude({ min: -1.0, max: 1.0 }))
      },
      services: this.generateServicesForType(businessType),
      pricing: this.generatePricingForType(businessType),
      availability: this.generateAvailabilityCalendar(),
      portfolio: this.generatePortfolioUrls(businessType),
      reviews: this.generateReviews(),
      created_at: faker.date.past().toISOString(),
      ...overrides
    }

    // Insert into database
    const { data, error } = await this.supabase
      .from('organizations')
      .insert({
        id: supplier.id,
        name: supplier.name,
        slug: supplier.name.toLowerCase().replace(/\s+/g, '-'),
        business_type: supplier.business_type,
        email: supplier.email,
        phone: supplier.phone,
        website: supplier.website,
        subscription_tier: supplier.subscription_tier,
        location: supplier.location,
        services: supplier.services,
        pricing: supplier.pricing,
        created_at: supplier.created_at
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create wedding supplier: ${error.message}`)
    }

    return supplier
  }

  async createWeddingCouple(overrides?: Partial<WeddingCouple>): Promise<WeddingCouple> {
    const weddingDate = overrides?.wedding_date || faker.date.future({ years: 2 }).toISOString().split('T')[0]
    
    const couple: WeddingCouple = {
      id: crypto.randomUUID(),
      partner1_name: faker.person.fullName(),
      partner2_name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number('07### ######'),
      wedding_date: weddingDate,
      venue_name: this.generateVenueName(),
      guest_count: faker.number.int({ min: 50, max: 300 }),
      budget_total: faker.number.int({ min: 10000, max: 80000 }),
      budget_breakdown: this.generateBudgetBreakdown(),
      location: {
        city: faker.location.city(),
        county: faker.helpers.arrayElement([
          'Surrey', 'Kent', 'Hampshire', 'Berkshire', 'Essex', 'Hertfordshire'
        ]),
        postcode: faker.location.zipCode('?## #??')
      },
      preferences: {
        style: faker.helpers.arrayElement(['rustic', 'modern', 'classic', 'bohemian', 'vintage']),
        colors: faker.helpers.arrayElements(['ivory', 'blush', 'navy', 'sage', 'gold', 'burgundy'], 2),
        season: this.getSeasonFromDate(weddingDate)
      },
      timeline: this.generateWeddingTimeline(weddingDate),
      ...overrides
    }

    // Insert into database
    const { data, error } = await this.supabase
      .from('customers')
      .insert({
        id: couple.id,
        first_name: couple.partner1_name.split(' ')[0],
        last_name: couple.partner1_name.split(' ').pop(),
        partner_first_name: couple.partner2_name.split(' ')[0],
        partner_last_name: couple.partner2_name.split(' ').pop(),
        email: couple.email,
        phone: couple.phone,
        wedding_date: couple.wedding_date,
        venue_name: couple.venue_name,
        guest_count: couple.guest_count,
        budget: couple.budget_total,
        location: couple.location,
        preferences: couple.preferences,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create wedding couple: ${error.message}`)
    }

    return couple
  }

  async createWeddingForm(organizationId: string, overrides?: Partial<WeddingForm>): Promise<WeddingForm> {
    const form: WeddingForm = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      name: overrides?.name || faker.helpers.arrayElement([
        'Wedding Photography Inquiry',
        'Venue Booking Request',
        'Catering Requirements Form',
        'Floral Design Consultation',
        'Wedding Planning Questionnaire'
      ]),
      description: faker.lorem.paragraph(),
      fields: this.generateWeddingFormFields(),
      settings: {
        allow_multiple_submissions: faker.datatype.boolean(),
        require_authentication: false,
        email_notifications: true,
        auto_respond: faker.datatype.boolean(),
        embed_enabled: faker.datatype.boolean()
      },
      styling: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'wedding']),
        primary_color: faker.internet.color(),
        font_family: faker.helpers.arrayElement(['Inter', 'Poppins', 'Playfair Display'])
      },
      is_active: faker.datatype.boolean({ probability: 0.8 }),
      created_at: faker.date.past().toISOString(),
      ...overrides
    }

    // Insert into database
    const { data, error } = await this.supabase
      .from('forms')
      .insert({
        id: form.id,
        organization_id: form.organization_id,
        name: form.name,
        description: form.description,
        fields: form.fields,
        settings: form.settings,
        styling: form.styling,
        is_active: form.is_active,
        created_at: form.created_at
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create wedding form: ${error.message}`)
    }

    return form
  }

  async createCustomerJourney(
    organizationId: string,
    customerId: string,
    overrides?: Partial<CustomerJourney>
  ): Promise<CustomerJourney> {
    const journey: CustomerJourney = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      customer_id: customerId,
      name: overrides?.name || faker.helpers.arrayElement([
        'Wedding Photography Journey',
        'Venue Booking Process',
        'Complete Wedding Planning',
        'Catering Selection Journey'
      ]),
      status: faker.helpers.arrayElement([
        'inquiry', 'consultation', 'proposal_sent', 'booked', 'completed'
      ]),
      steps: this.generateJourneySteps(),
      automation_rules: this.generateAutomationRules(),
      touchpoints: this.generateTouchpoints(),
      metrics: {
        conversion_rate: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
        average_completion_time: faker.number.int({ min: 1, max: 30 }),
        customer_satisfaction: faker.number.float({ min: 1, max: 5, fractionDigits: 1 })
      },
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    }

    // Insert into database
    const { data, error } = await this.supabase
      .from('journeys')
      .insert({
        id: journey.id,
        organization_id: journey.organization_id,
        customer_id: journey.customer_id,
        name: journey.name,
        status: journey.status,
        steps: journey.steps,
        automation_rules: journey.automation_rules,
        metrics: journey.metrics,
        created_at: journey.created_at,
        updated_at: journey.updated_at
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create customer journey: ${error.message}`)
    }

    return journey
  }

  async createFormSubmission(formId: string, customerId: string): Promise<FormSubmission> {
    const submission: FormSubmission = {
      id: crypto.randomUUID(),
      form_id: formId,
      customer_id: customerId,
      data: this.generateFormSubmissionData(),
      status: 'completed',
      created_at: new Date().toISOString()
    }

    // Insert into database
    const { data, error } = await this.supabase
      .from('form_submissions')
      .insert({
        id: submission.id,
        form_id: submission.form_id,
        customer_id: submission.customer_id,
        data: submission.data,
        status: submission.status,
        created_at: submission.created_at
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create form submission: ${error.message}`)
    }

    return submission
  }

  async createFullWeddingEcosystem(): Promise<WeddingEcosystem> {
    // Create photographer supplier
    const supplier = await this.createWeddingSupplier({
      business_type: 'photographer',
      subscription_tier: 'professional'
    })

    // Create wedding couple
    const couple = await this.createWeddingCouple()

    // Create inquiry form
    const inquiryForm = await this.createWeddingForm(supplier.id, {
      name: 'Wedding Photography Inquiry'
    })

    // Create customer journey
    const journey = await this.createCustomerJourney(supplier.id, couple.id)

    // Create form submission
    const submission = await this.createFormSubmission(inquiryForm.id, couple.id)

    return {
      supplier,
      couple,
      forms: [inquiryForm],
      journeys: [journey],
      submissions: [submission]
    }
  }

  // Private helper methods for realistic data generation

  private generateBusinessName(type: string): string {
    const prefixes = {
      photographer: ['Eternal', 'Captured', 'Timeless', 'Beautiful', 'Perfect'],
      venue: ['The Grand', 'Elegant', 'Royal', 'Majestic', 'Enchanted'],
      florist: ['Blooming', 'Garden', 'Petals', 'Blossom', 'Floral'],
      caterer: ['Delicious', 'Gourmet', 'Exquisite', 'Fine', 'Artisan'],
      band: ['Harmony', 'Melody', 'Rhythm', 'Sound', 'Musical'],
      planner: ['Perfect', 'Dream', 'Elite', 'Bespoke', 'Luxury']
    }

    const suffixes = {
      photographer: ['Moments Photography', 'Wedding Photography', 'Studios'],
      venue: ['Manor', 'Hall', 'House', 'Gardens', 'Estate'],
      florist: ['Flowers', 'Florals', 'Garden', 'Blooms', 'Design'],
      caterer: ['Catering', 'Kitchen', 'Dining', 'Events', 'Cuisine'],
      band: ['Band', 'Music', 'Entertainment', 'Musicians', 'Orchestra'],
      planner: ['Wedding Planning', 'Events', 'Weddings', 'Celebrations', 'Design']
    }

    const prefix = faker.helpers.arrayElement(prefixes[type] || ['Beautiful'])
    const suffix = faker.helpers.arrayElement(suffixes[type] || ['Services'])
    
    return `${prefix} ${suffix}`
  }

  private generateServicesForType(type: string): string[] {
    const serviceMap = {
      photographer: [
        'Wedding Day Photography', 'Engagement Sessions', 'Bridal Portraits',
        'Reception Photography', 'Photo Albums', 'Digital Gallery'
      ],
      venue: [
        'Wedding Ceremonies', 'Reception Hosting', 'Bridal Suite',
        'Catering Kitchen', 'Parking', 'Garden Ceremonies'
      ],
      florist: [
        'Bridal Bouquets', 'Ceremony Arrangements', 'Reception Centerpieces',
        'Buttonholes', 'Arch Decorations', 'Aisle Petals'
      ],
      caterer: [
        'Wedding Breakfast', 'Evening Buffet', 'Canapés',
        'Wedding Cake', 'Bar Service', 'Dietary Requirements'
      ],
      band: [
        'Ceremony Music', 'Reception Entertainment', 'First Dance',
        'DJ Services', 'Sound System', 'Lighting'
      ],
      planner: [
        'Full Wedding Planning', 'Day Coordination', 'Vendor Management',
        'Timeline Creation', 'Styling', 'Budget Management'
      ]
    }

    return faker.helpers.arrayElements(
      serviceMap[type] || ['General Services'],
      { min: 3, max: 6 }
    )
  }

  private generatePricingForType(type: string): Record<string, number> {
    const pricingMap = {
      photographer: {
        'Wedding Day Photography': faker.number.int({ min: 800, max: 3000 }),
        'Engagement Session': faker.number.int({ min: 200, max: 500 }),
        'Additional Hour': faker.number.int({ min: 100, max: 300 })
      },
      venue: {
        'Ceremony': faker.number.int({ min: 500, max: 2000 }),
        'Reception': faker.number.int({ min: 1000, max: 5000 }),
        'Bridal Suite': faker.number.int({ min: 200, max: 800 })
      },
      florist: {
        'Bridal Bouquet': faker.number.int({ min: 80, max: 250 }),
        'Centerpieces': faker.number.int({ min: 30, max: 100 }),
        'Ceremony Arrangements': faker.number.int({ min: 200, max: 800 })
      }
    }

    return pricingMap[type] || {
      'Standard Package': faker.number.int({ min: 500, max: 2000 })
    }
  }

  private generateAvailabilityCalendar(): Record<string, any> {
    const availability = {}
    const today = new Date()
    
    // Generate availability for next 24 months
    for (let i = 0; i < 730; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Saturdays are more likely to be booked
      const isSaturday = date.getDay() === 6
      const isBooked = isSaturday ? faker.datatype.boolean({ probability: 0.7 }) : faker.datatype.boolean({ probability: 0.1 })
      
      availability[dateStr] = {
        available: !isBooked,
        price_multiplier: isSaturday ? 1.5 : 1.0,
        notes: isBooked ? 'Wedding booked' : 'Available'
      }
    }
    
    return availability
  }

  private generatePortfolioUrls(type: string): string[] {
    return Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, () =>
      `https://example.com/portfolio/${type}/${faker.string.uuid()}.jpg`
    )
  }

  private generateReviews(): WeddingReview[] {
    return Array.from({ length: faker.number.int({ min: 3, max: 15 }) }, () => ({
      rating: faker.number.int({ min: 3, max: 5 }),
      comment: faker.lorem.paragraph(),
      client_name: `${faker.person.firstName()} & ${faker.person.firstName()}`,
      wedding_date: faker.date.past({ years: 2 }).toISOString().split('T')[0]
    }))
  }

  private generateBudgetBreakdown(): Record<string, number> {
    const totalBudget = faker.number.int({ min: 10000, max: 80000 })
    
    return {
      venue: Math.round(totalBudget * 0.4),
      photography: Math.round(totalBudget * 0.15),
      catering: Math.round(totalBudget * 0.25),
      flowers: Math.round(totalBudget * 0.08),
      entertainment: Math.round(totalBudget * 0.07),
      other: Math.round(totalBudget * 0.05)
    }
  }

  private generateVenueName(): string {
    const types = ['Manor', 'Hall', 'House', 'Gardens', 'Estate', 'Castle', 'Barn', 'Hotel']
    const adjectives = ['Grand', 'Elegant', 'Beautiful', 'Historic', 'Charming', 'Rustic', 'Modern']
    
    return `${faker.helpers.arrayElement(adjectives)} ${faker.location.city()} ${faker.helpers.arrayElement(types)}`
  }

  private getSeasonFromDate(dateStr: string): string {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    
    if (month >= 3 && month <= 5) return 'Spring'
    if (month >= 6 && month <= 8) return 'Summer'
    if (month >= 9 && month <= 11) return 'Autumn'
    return 'Winter'
  }

  private generateWeddingTimeline(weddingDate: string): WeddingTimelineItem[] {
    return [
      { time: '09:00', activity: 'Bridal preparations begin', responsible: 'Bridal party', notes: 'Hair and makeup' },
      { time: '10:00', activity: 'Groom preparations', responsible: 'Groomsmen', notes: 'Getting ready at venue' },
      { time: '12:00', activity: 'Pre-ceremony photos', responsible: 'Photographer', notes: 'Bridal party and family' },
      { time: '14:00', activity: 'Ceremony', responsible: 'Celebrant', notes: 'Main wedding ceremony' },
      { time: '14:30', activity: 'Post-ceremony photos', responsible: 'Photographer', notes: 'Group photos and confetti' },
      { time: '15:30', activity: 'Reception drinks', responsible: 'Catering team', notes: 'Canapés and drinks' },
      { time: '18:00', activity: 'Wedding breakfast', responsible: 'Catering team', notes: 'Formal meal and speeches' },
      { time: '20:00', activity: 'First dance', responsible: 'Band/DJ', notes: 'First dance and party begins' },
      { time: '23:00', activity: 'Evening buffet', responsible: 'Catering team', notes: 'Late night food' },
      { time: '00:00', activity: 'Party continues', responsible: 'Band/DJ', notes: 'Dancing until late' }
    ]
  }

  private generateWeddingFormFields(): FormField[] {
    const weddingFields = [
      { type: 'text', label: 'Partner 1 Name', required: true },
      { type: 'text', label: 'Partner 2 Name', required: true },
      { type: 'email', label: 'Email Address', required: true },
      { type: 'phone', label: 'Phone Number', required: true },
      { type: 'date', label: 'Wedding Date', required: true },
      { type: 'text', label: 'Venue Name', required: false },
      { type: 'number', label: 'Guest Count', required: false },
      { type: 'select', label: 'Wedding Style', required: false, options: ['Rustic', 'Modern', 'Classic', 'Bohemian'] },
      { type: 'textarea', label: 'Additional Details', required: false },
      { type: 'checkbox', label: 'I agree to terms and conditions', required: true }
    ]

    return weddingFields.map(field => ({
      id: crypto.randomUUID(),
      type: field.type,
      label: field.label,
      placeholder: `Enter ${field.label.toLowerCase()}`,
      required: field.required,
      validation: field.type === 'email' ? { pattern: 'email' } : undefined,
      options: field.options
    }))
  }

  private generateJourneySteps(): JourneyStep[] {
    return [
      {
        id: crypto.randomUUID(),
        name: 'Initial Inquiry',
        description: 'Customer submits inquiry form',
        type: 'form_submission',
        order: 1,
        triggers: ['form_submit'],
        actions: ['send_auto_response', 'notify_team']
      },
      {
        id: crypto.randomUUID(),
        name: 'Consultation Booking',
        description: 'Schedule initial consultation',
        type: 'calendar_booking',
        order: 2,
        triggers: ['consultation_request'],
        actions: ['calendar_invite', 'confirmation_email']
      },
      {
        id: crypto.randomUUID(),
        name: 'Proposal Creation',
        description: 'Create custom wedding proposal',
        type: 'proposal',
        order: 3,
        triggers: ['consultation_complete'],
        actions: ['generate_proposal', 'send_proposal']
      },
      {
        id: crypto.randomUUID(),
        name: 'Contract Signing',
        description: 'Finalize booking with contract',
        type: 'contract',
        order: 4,
        triggers: ['proposal_accepted'],
        actions: ['generate_contract', 'request_signature']
      }
    ]
  }

  private generateAutomationRules(): AutomationRule[] {
    return [
      {
        trigger: 'form_submission',
        condition: 'new_inquiry',
        action: 'send_welcome_email',
        delay: 300 // 5 minutes
      },
      {
        trigger: 'consultation_booked',
        condition: 'confirmed',
        action: 'send_reminder_email',
        delay: 86400 // 24 hours before
      },
      {
        trigger: 'proposal_sent',
        condition: 'no_response',
        action: 'send_follow_up',
        delay: 604800 // 1 week
      }
    ]
  }

  private generateTouchpoints(): Touchpoint[] {
    return [
      {
        type: 'email',
        timestamp: faker.date.recent().toISOString(),
        content: 'Welcome email sent',
        channel: 'automated'
      },
      {
        type: 'phone_call',
        timestamp: faker.date.recent().toISOString(),
        content: 'Initial consultation call',
        channel: 'manual'
      },
      {
        type: 'email',
        timestamp: faker.date.recent().toISOString(),
        content: 'Proposal sent',
        channel: 'automated'
      }
    ]
  }

  private generateFormSubmissionData(): Record<string, any> {
    return {
      'Partner 1 Name': faker.person.fullName(),
      'Partner 2 Name': faker.person.fullName(),
      'Email Address': faker.internet.email(),
      'Phone Number': faker.phone.number('07### ######'),
      'Wedding Date': faker.date.future().toISOString().split('T')[0],
      'Venue Name': this.generateVenueName(),
      'Guest Count': faker.number.int({ min: 50, max: 300 }),
      'Wedding Style': faker.helpers.arrayElement(['Rustic', 'Modern', 'Classic', 'Bohemian']),
      'Additional Details': faker.lorem.paragraph(),
      'Terms Accepted': true
    }
  }
}