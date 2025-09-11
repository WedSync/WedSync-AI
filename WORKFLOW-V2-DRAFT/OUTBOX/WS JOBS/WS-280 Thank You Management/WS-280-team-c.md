# WS-280 Thank You Management - Team C Comprehensive Prompt
**Team C: Integration Specialists**

## 🎯 Your Mission: Seamless Thank You Management Integration Ecosystem
You are the **Integration specialists** responsible for connecting the thank you management system with email services, postal mail APIs, gift registries, CRM platforms, and external wedding tools. Your focus: **Multi-channel thank you delivery that ensures every gratitude message reaches recipients through their preferred communication method with automated tracking and follow-up**.

## 💝 The Wedding Thank You Integration Challenge
**Context**: Emma needs to send 247 thank you notes, with some recipients preferring handwritten cards, others expecting email, and a few needing international shipping. Your integrations must automatically route thank you messages through the optimal delivery channel, track delivery status across multiple services, sync with gift registries to match gifts with notes, and integrate with postal services for address validation and tracking. **One integration failure could mean a missing thank you note and a damaged relationship**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/lib/integrations/thank-you/multi-channel-delivery.ts`** - Multi-channel message routing and delivery
2. **`/src/lib/integrations/thank-you/postal-mail-service.ts`** - Royal Mail API integration for physical cards
3. **`/src/lib/integrations/thank-you/email-thank-you-service.ts`** - Resend/email service integration
4. **`/src/lib/integrations/thank-you/gift-registry-sync.ts`** - Gift registry platform synchronization
5. **`/src/app/api/webhooks/thank-you-delivery/route.ts`** - Delivery status webhooks from external services

### 🔗 Integration Requirements:
- **Multi-Channel Routing**: Intelligently choose between email, postal mail, SMS, and hand delivery
- **Royal Mail Integration**: Physical card printing, posting, and tracking via Royal Mail API
- **Email Service**: Beautiful HTML thank you emails with personalization via Resend
- **Gift Registry Sync**: Connect with Amazon, John Lewis, M&S gift registries to match gifts
- **Address Validation**: UK postcode validation and international address verification
- **CRM Integration**: Sync thank you status with wedding planning CRM systems
- **Delivery Tracking**: Real-time status updates from all delivery channels

Your integrations ensure no thank you message is ever lost and every delivery is tracked across all channels.

## 🔄 Core Integration Architecture

### Multi-Channel Delivery Service (`/src/lib/integrations/thank-you/multi-channel-delivery.ts`)
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { EmailThankYouService } from './email-thank-you-service'
import { PostalMailService } from './postal-mail-service'
import { SMSThankYouService } from './sms-thank-you-service'
import { HandDeliveryService } from './hand-delivery-service'

export interface ThankYouDelivery {
  id: string
  giftId: string
  noteId: string
  organizationId: string
  recipientName: string
  recipientAddress?: string
  recipientEmail?: string
  recipientPhone?: string
  deliveryMethod: 'email' | 'postal' | 'sms' | 'hand_delivery'
  priority: 'standard' | 'urgent' | 'express'
  personalizedContent: string
  templateData: Record<string, any>
  scheduledDeliveryDate?: Date
  deliveryPreferences: {
    preferredMethod?: string
    backupMethods?: string[]
    addressValidated?: boolean
    internationalDelivery?: boolean
    signatureRequired?: boolean
    trackingEnabled?: boolean
  }
}

export interface DeliveryResult {
  success: boolean
  deliveryId: string
  trackingNumber?: string
  estimatedDelivery?: Date
  cost?: number
  error?: string
  retryable?: boolean
  deliveryMethod: string
  providerResponse?: any
}

export class MultiChannelDeliveryService {
  private supabase = createClientComponentClient()
  private emailService = new EmailThankYouService()
  private postalService = new PostalMailService()
  private smsService = new SMSThankYouService()
  private handDeliveryService = new HandDeliveryService()

  async deliverThankYou(delivery: ThankYouDelivery): Promise<DeliveryResult> {
    console.log(`Processing thank you delivery for gift ${delivery.giftId} via ${delivery.deliveryMethod}`)

    try {
      // Validate delivery data
      await this.validateDeliveryData(delivery)

      // Choose optimal delivery method if not specified
      const optimalMethod = delivery.deliveryMethod || await this.chooseOptimalDeliveryMethod(delivery)
      
      // Route to appropriate service
      const result = await this.routeDelivery(delivery, optimalMethod)

      // Track delivery in database
      await this.trackDelivery(delivery, result)

      // Set up delivery monitoring
      if (result.success && result.trackingNumber) {
        await this.setupDeliveryMonitoring(result.deliveryId, result.trackingNumber, optimalMethod)
      }

      return result

    } catch (error) {
      console.error('Delivery error:', error)
      
      // Attempt fallback delivery method
      const fallbackResult = await this.attemptFallbackDelivery(delivery, error)
      
      if (!fallbackResult.success) {
        // Log failed delivery for manual intervention
        await this.logFailedDelivery(delivery, error)
      }

      return fallbackResult
    }
  }

  private async validateDeliveryData(delivery: ThankYouDelivery): Promise<void> {
    if (!delivery.recipientName) {
      throw new Error('Recipient name is required')
    }

    if (!delivery.personalizedContent) {
      throw new Error('Thank you message content is required')
    }

    // Validate delivery method requirements
    switch (delivery.deliveryMethod) {
      case 'email':
        if (!delivery.recipientEmail) {
          throw new Error('Email address required for email delivery')
        }
        if (!this.isValidEmail(delivery.recipientEmail)) {
          throw new Error('Invalid email address format')
        }
        break

      case 'postal':
        if (!delivery.recipientAddress) {
          throw new Error('Postal address required for mail delivery')
        }
        // Validate UK postcode or international address
        const isValidAddress = await this.validatePostalAddress(delivery.recipientAddress)
        if (!isValidAddress) {
          throw new Error('Invalid or incomplete postal address')
        }
        break

      case 'sms':
        if (!delivery.recipientPhone) {
          throw new Error('Phone number required for SMS delivery')
        }
        if (!this.isValidPhoneNumber(delivery.recipientPhone)) {
          throw new Error('Invalid phone number format')
        }
        break

      case 'hand_delivery':
        if (!delivery.recipientAddress) {
          throw new Error('Address required for hand delivery coordination')
        }
        break
    }
  }

  private async chooseOptimalDeliveryMethod(delivery: ThankYouDelivery): Promise<string> {
    // Priority order based on recipient preferences and gift value
    const preferences = delivery.deliveryPreferences
    
    // If user has specified preference, use it
    if (preferences.preferredMethod) {
      return preferences.preferredMethod
    }

    // Get gift value to determine appropriate method
    const { data: gift } = await this.supabase
      .from('thank_you_gifts')
      .select('gift_value, gift_category')
      .eq('id', delivery.giftId)
      .single()

    const giftValue = gift?.gift_value || 0
    const giftCategory = gift?.gift_category

    // High-value gifts or special categories get premium treatment
    if (giftValue > 200 || giftCategory === 'experience' || delivery.priority === 'urgent') {
      // Prefer postal mail for high-value gifts
      if (delivery.recipientAddress) {
        return 'postal'
      }
    }

    // Standard gift value - choose based on availability
    if (delivery.recipientEmail && this.isValidEmail(delivery.recipientEmail)) {
      return 'email' // Fastest and most reliable
    }

    if (delivery.recipientAddress) {
      return 'postal'
    }

    if (delivery.recipientPhone && this.isValidPhoneNumber(delivery.recipientPhone)) {
      return 'sms'
    }

    // Fallback to hand delivery if local address available
    if (delivery.recipientAddress) {
      return 'hand_delivery'
    }

    throw new Error('No valid delivery method available for recipient')
  }

  private async routeDelivery(delivery: ThankYouDelivery, method: string): Promise<DeliveryResult> {
    switch (method) {
      case 'email':
        return await this.emailService.sendThankYouEmail({
          to: delivery.recipientEmail!,
          recipientName: delivery.recipientName,
          content: delivery.personalizedContent,
          templateData: delivery.templateData,
          priority: delivery.priority,
          organizationId: delivery.organizationId
        })

      case 'postal':
        return await this.postalService.sendThankYouCard({
          recipientName: delivery.recipientName,
          recipientAddress: delivery.recipientAddress!,
          content: delivery.personalizedContent,
          templateData: delivery.templateData,
          priority: delivery.priority,
          internationalDelivery: delivery.deliveryPreferences.internationalDelivery || false,
          signatureRequired: delivery.deliveryPreferences.signatureRequired || false,
          organizationId: delivery.organizationId
        })

      case 'sms':
        return await this.smsService.sendThankYouSMS({
          to: delivery.recipientPhone!,
          recipientName: delivery.recipientName,
          content: delivery.personalizedContent,
          priority: delivery.priority,
          organizationId: delivery.organizationId
        })

      case 'hand_delivery':
        return await this.handDeliveryService.scheduleHandDelivery({
          recipientName: delivery.recipientName,
          recipientAddress: delivery.recipientAddress!,
          content: delivery.personalizedContent,
          scheduledDate: delivery.scheduledDeliveryDate,
          organizationId: delivery.organizationId
        })

      default:
        throw new Error(`Unsupported delivery method: ${method}`)
    }
  }

  private async attemptFallbackDelivery(
    delivery: ThankYouDelivery, 
    originalError: any
  ): Promise<DeliveryResult> {
    console.log('Attempting fallback delivery methods')
    
    const fallbackMethods = delivery.deliveryPreferences.backupMethods || ['email', 'postal', 'sms']
    
    for (const method of fallbackMethods) {
      if (method === delivery.deliveryMethod) continue // Skip original method
      
      try {
        console.log(`Trying fallback method: ${method}`)
        const result = await this.routeDelivery(delivery, method)
        
        if (result.success) {
          // Log successful fallback
          await this.logFallbackSuccess(delivery, method, originalError)
          return result
        }
      } catch (fallbackError) {
        console.error(`Fallback method ${method} also failed:`, fallbackError)
        continue
      }
    }

    // All methods failed
    return {
      success: false,
      deliveryId: `failed-${Date.now()}`,
      error: `All delivery methods failed. Original error: ${originalError.message}`,
      retryable: true,
      deliveryMethod: 'failed'
    }
  }

  private async trackDelivery(delivery: ThankYouDelivery, result: DeliveryResult): Promise<void> {
    try {
      await this.supabase
        .from('thank_you_delivery_tracking')
        .insert({
          delivery_id: result.deliveryId,
          gift_id: delivery.giftId,
          note_id: delivery.noteId,
          organization_id: delivery.organizationId,
          delivery_method: result.deliveryMethod,
          tracking_number: result.trackingNumber,
          delivery_status: result.success ? 'sent' : 'failed',
          estimated_delivery: result.estimatedDelivery?.toISOString(),
          cost: result.cost,
          provider_response: result.providerResponse,
          error_message: result.error,
          is_retryable: result.retryable || false,
          created_at: new Date().toISOString()
        })

      // Update thank you note status
      const noteStatus = result.success ? 'sent' : 'failed'
      await this.supabase
        .from('thank_you_notes')
        .update({
          status: noteStatus,
          sent_date: result.success ? new Date().toISOString() : null,
          tracking_number: result.trackingNumber
        })
        .eq('id', delivery.noteId)

      // Update gift status
      const giftStatus = result.success ? 'sent' : 'written'
      await this.supabase
        .from('thank_you_gifts')
        .update({ thank_you_status: giftStatus })
        .eq('id', delivery.giftId)

    } catch (error) {
      console.error('Error tracking delivery:', error)
      // Don't throw - delivery was successful even if tracking failed
    }
  }

  private async setupDeliveryMonitoring(
    deliveryId: string, 
    trackingNumber: string, 
    method: string
  ): Promise<void> {
    // Schedule periodic tracking updates
    const monitoringData = {
      delivery_id: deliveryId,
      tracking_number: trackingNumber,
      delivery_method: method,
      next_check: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // Check in 4 hours
      check_frequency: 'every_4_hours',
      monitoring_status: 'active'
    }

    await this.supabase
      .from('delivery_monitoring')
      .insert(monitoringData)

    // Set up webhook endpoints for delivery confirmations
    if (method === 'postal') {
      await this.postalService.setupDeliveryWebhook(deliveryId, trackingNumber)
    } else if (method === 'email') {
      await this.emailService.setupDeliveryWebhook(deliveryId, trackingNumber)
    }
  }

  private async validatePostalAddress(address: string): Promise<boolean> {
    try {
      // UK postcode validation
      if (this.isUKAddress(address)) {
        return await this.validateUKPostcode(address)
      }
      
      // International address validation
      return await this.validateInternationalAddress(address)
      
    } catch (error) {
      console.error('Address validation error:', error)
      return false
    }
  }

  private isUKAddress(address: string): boolean {
    // Simple check for UK postcode pattern
    const ukPostcodeRegex = /[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i
    return ukPostcodeRegex.test(address)
  }

  private async validateUKPostcode(address: string): Promise<boolean> {
    try {
      // Use Royal Mail postcode API or similar service
      const response = await fetch('https://api.postcodes.io/postcodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: this.extractPostcode(address) })
      })

      const data = await response.json()
      return data.result === true

    } catch (error) {
      console.error('UK postcode validation error:', error)
      return false
    }
  }

  private async validateInternationalAddress(address: string): Promise<boolean> {
    // Implement international address validation
    // Could use Google Maps API, SmartyStreets, or similar service
    return address.length > 10 // Basic validation for now
  }

  private extractPostcode(address: string): string {
    const postcodeMatch = address.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i)
    return postcodeMatch ? postcodeMatch[0] : ''
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidPhoneNumber(phone: string): boolean {
    // UK mobile number validation
    const ukMobileRegex = /^(\+44|0)7\d{9}$/
    // International format
    const intlRegex = /^\+\d{10,15}$/
    
    return ukMobileRegex.test(phone) || intlRegex.test(phone)
  }

  private async logFailedDelivery(delivery: ThankYouDelivery, error: any): Promise<void> {
    await this.supabase
      .from('delivery_failures')
      .insert({
        gift_id: delivery.giftId,
        note_id: delivery.noteId,
        organization_id: delivery.organizationId,
        recipient_name: delivery.recipientName,
        attempted_methods: [delivery.deliveryMethod, ...(delivery.deliveryPreferences.backupMethods || [])],
        error_details: error.message,
        retry_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Retry in 24 hours
        manual_intervention_required: true,
        created_at: new Date().toISOString()
      })
  }

  private async logFallbackSuccess(
    delivery: ThankYouDelivery, 
    successfulMethod: string, 
    originalError: any
  ): Promise<void> {
    await this.supabase
      .from('delivery_fallbacks')
      .insert({
        gift_id: delivery.giftId,
        note_id: delivery.noteId,
        organization_id: delivery.organizationId,
        original_method: delivery.deliveryMethod,
        successful_method: successfulMethod,
        original_error: originalError.message,
        created_at: new Date().toISOString()
      })
  }

  // Bulk delivery method for multiple thank you notes
  async bulkDeliverThankYous(deliveries: ThankYouDelivery[]): Promise<DeliveryResult[]> {
    console.log(`Processing bulk delivery of ${deliveries.length} thank you messages`)
    
    const results: DeliveryResult[] = []
    const BATCH_SIZE = 10
    const MAX_CONCURRENT = 3

    // Process in controlled batches to avoid overwhelming external services
    for (let i = 0; i < deliveries.length; i += BATCH_SIZE) {
      const batch = deliveries.slice(i, i + BATCH_SIZE)
      
      // Process batch with concurrency control
      const batchPromises = []
      for (let j = 0; j < batch.length; j += MAX_CONCURRENT) {
        const concurrentBatch = batch.slice(j, j + MAX_CONCURRENT)
        
        const concurrentPromises = concurrentBatch.map(delivery => 
          this.deliverThankYou(delivery).catch(error => ({
            success: false,
            deliveryId: `error-${Date.now()}`,
            error: error.message,
            deliveryMethod: delivery.deliveryMethod
          } as DeliveryResult))
        )
        
        batchPromises.push(...concurrentPromises)
      }

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (i + BATCH_SIZE < deliveries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Log progress
      console.log(`Processed batch ${Math.floor(i/BATCH_SIZE) + 1}: ${results.length}/${deliveries.length} deliveries`)
    }

    // Generate summary report
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      byMethod: results.reduce((acc, result) => {
        acc[result.deliveryMethod] = (acc[result.deliveryMethod] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    console.log('Bulk delivery summary:', summary)
    
    // Store summary in database for reporting
    await this.supabase
      .from('bulk_delivery_reports')
      .insert({
        total_deliveries: summary.total,
        successful_deliveries: summary.successful,
        failed_deliveries: summary.failed,
        method_breakdown: summary.byMethod,
        created_at: new Date().toISOString()
      })

    return results
  }
}

// Export for use in API routes and components
export const multiChannelDelivery = new MultiChannelDeliveryService()
```

### Royal Mail Integration Service (`/src/lib/integrations/thank-you/postal-mail-service.ts`)
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ThankYouCardRequest {
  recipientName: string
  recipientAddress: string
  content: string
  templateData: Record<string, any>
  priority: 'standard' | 'urgent' | 'express'
  internationalDelivery: boolean
  signatureRequired: boolean
  organizationId: string
}

interface PostalDeliveryResult {
  success: boolean
  deliveryId: string
  trackingNumber?: string
  estimatedDelivery?: Date
  cost: number
  error?: string
  retryable?: boolean
  deliveryMethod: string
  providerResponse?: any
}

export class PostalMailService {
  private supabase = createClientComponentClient()
  private readonly ROYAL_MAIL_API_URL = process.env.ROYAL_MAIL_API_URL || 'https://api.royalmail.com'
  private readonly API_KEY = process.env.ROYAL_MAIL_API_KEY
  private readonly CLIENT_ID = process.env.ROYAL_MAIL_CLIENT_ID

  async sendThankYouCard(request: ThankYouCardRequest): Promise<PostalDeliveryResult> {
    try {
      console.log(`Sending postal thank you card to ${request.recipientName}`)

      // Validate Royal Mail API credentials
      if (!this.API_KEY || !this.CLIENT_ID) {
        throw new Error('Royal Mail API credentials not configured')
      }

      // Generate card design and content
      const cardDesign = await this.generateCardDesign(request)
      
      // Create Royal Mail shipping request
      const shippingRequest = await this.createShippingRequest(request, cardDesign)
      
      // Submit to Royal Mail API
      const royalMailResponse = await this.submitToRoyalMail(shippingRequest)
      
      // Process response and generate tracking
      const result = await this.processRoyalMailResponse(royalMailResponse, request)
      
      return result

    } catch (error) {
      console.error('Postal mail service error:', error)
      
      return {
        success: false,
        deliveryId: `postal-error-${Date.now()}`,
        error: error instanceof Error ? error.message : 'Unknown postal service error',
        retryable: this.isRetryableError(error),
        deliveryMethod: 'postal',
        cost: 0
      }
    }
  }

  private async generateCardDesign(request: ThankYouCardRequest): Promise<any> {
    // Get organization branding
    const { data: organization } = await this.supabase
      .from('organizations')
      .select('name, branding_colors, logo_url')
      .eq('id', request.organizationId)
      .single()

    const cardDesign = {
      template: 'wedding_thank_you',
      size: 'A6', // 148mm x 105mm
      orientation: 'portrait',
      frontDesign: {
        backgroundColor: organization?.branding_colors?.primary || '#ffffff',
        logoUrl: organization?.logo_url,
        organizationName: organization?.name,
        decorativeElements: ['floral_border', 'gold_accents']
      },
      innerContent: {
        greeting: `Dear ${request.recipientName},`,
        mainMessage: request.content,
        signature: request.templateData.coupleNames || 'The Happy Couple',
        font: 'elegant_script',
        textColor: '#2d3748'
      },
      envelope: {
        size: 'C6', // Fits A6 card
        color: 'cream',
        returnAddress: request.templateData.returnAddress,
        recipientAddress: request.recipientAddress
      }
    }

    return cardDesign
  }

  private async createShippingRequest(
    request: ThankYouCardRequest, 
    cardDesign: any
  ): Promise<any> {
    // Parse recipient address
    const addressLines = this.parseAddress(request.recipientAddress)
    
    // Determine service level based on priority
    const serviceLevel = this.determineServiceLevel(request.priority, request.internationalDelivery)
    
    const shippingRequest = {
      items: [{
        itemId: `thank-you-${Date.now()}`,
        templateId: 'wedding_thank_you_card',
        addAssets: [cardDesign],
        addresses: [{
          name: request.recipientName,
          addressLine1: addressLines.line1,
          addressLine2: addressLines.line2,
          city: addressLines.city,
          state: addressLines.state,
          postalCode: addressLines.postalCode,
          country: addressLines.country || 'GB'
        }]
      }],
      service: {
        level: serviceLevel,
        features: [
          ...(request.signatureRequired ? ['signature_required'] : []),
          'tracking_enabled',
          'delivery_confirmation'
        ]
      },
      billing: {
        currency: 'GBP',
        accountId: this.CLIENT_ID
      },
      webhooks: {
        delivery: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/royal-mail-delivery`,
        tracking: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/royal-mail-tracking`
      }
    }

    return shippingRequest
  }

  private parseAddress(address: string): any {
    // Basic address parsing - could be enhanced with address parsing service
    const lines = address.split('\n').map(line => line.trim()).filter(Boolean)
    
    return {
      line1: lines[0] || '',
      line2: lines[1] || '',
      city: lines[lines.length - 2] || '',
      postalCode: this.extractPostcode(address),
      country: this.extractCountry(address) || 'GB'
    }
  }

  private extractPostcode(address: string): string {
    // UK postcode extraction
    const postcodeMatch = address.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i)
    return postcodeMatch ? postcodeMatch[0].toUpperCase() : ''
  }

  private extractCountry(address: string): string | null {
    const commonCountries = {
      'united kingdom': 'GB',
      'uk': 'GB',
      'england': 'GB',
      'scotland': 'GB',
      'wales': 'GB',
      'northern ireland': 'GB',
      'ireland': 'IE',
      'france': 'FR',
      'germany': 'DE',
      'spain': 'ES',
      'italy': 'IT',
      'usa': 'US',
      'united states': 'US',
      'canada': 'CA',
      'australia': 'AU'
    }

    const addressLower = address.toLowerCase()
    
    for (const [country, code] of Object.entries(commonCountries)) {
      if (addressLower.includes(country)) {
        return code
      }
    }
    
    return null
  }

  private determineServiceLevel(
    priority: string, 
    internationalDelivery: boolean
  ): string {
    if (internationalDelivery) {
      return priority === 'express' ? 'international_express' : 'international_standard'
    }
    
    switch (priority) {
      case 'express':
        return 'next_day_delivery'
      case 'urgent':
        return 'first_class'
      default:
        return 'second_class'
    }
  }

  private async submitToRoyalMail(shippingRequest: any): Promise<any> {
    const response = await fetch(`${this.ROYAL_MAIL_API_URL}/mailpieces/v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
        'X-IBM-Client-Id': this.CLIENT_ID!
      },
      body: JSON.stringify(shippingRequest)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Royal Mail API error: ${response.status} - ${errorData.message || response.statusText}`)
    }

    return await response.json()
  }

  private async processRoyalMailResponse(
    response: any, 
    request: ThankYouCardRequest
  ): Promise<PostalDeliveryResult> {
    const mailpiece = response.mailPieces?.[0]
    
    if (!mailpiece) {
      throw new Error('No mailpiece returned from Royal Mail API')
    }

    // Calculate estimated delivery date
    const estimatedDelivery = this.calculateEstimatedDelivery(
      request.priority,
      request.internationalDelivery
    )

    return {
      success: true,
      deliveryId: mailpiece.mailpieceId,
      trackingNumber: mailpiece.trackingNumber,
      estimatedDelivery,
      cost: this.calculatePostageCost(request),
      deliveryMethod: 'postal',
      providerResponse: response
    }
  }

  private calculateEstimatedDelivery(
    priority: string, 
    internationalDelivery: boolean
  ): Date {
    const now = new Date()
    
    if (internationalDelivery) {
      // International delivery times
      const daysToAdd = priority === 'express' ? 3 : 7
      return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    }
    
    // UK domestic delivery times
    let daysToAdd = 2 // Second class default
    
    if (priority === 'express') {
      daysToAdd = 1 // Next day
    } else if (priority === 'urgent') {
      daysToAdd = 1 // First class
    }
    
    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
  }

  private calculatePostageCost(request: ThankYouCardRequest): number {
    // UK postage costs (in pence)
    const costs = {
      second_class: 85, // 85p
      first_class: 105, // £1.05
      next_day: 350, // £3.50
      international_standard: 200, // £2.00
      international_express: 500, // £5.00
    }

    let baseCost = costs.second_class
    
    if (request.internationalDelivery) {
      baseCost = request.priority === 'express' 
        ? costs.international_express 
        : costs.international_standard
    } else {
      switch (request.priority) {
        case 'express':
          baseCost = costs.next_day
          break
        case 'urgent':
          baseCost = costs.first_class
          break
      }
    }

    // Add signature required cost
    if (request.signatureRequired) {
      baseCost += 100 // £1.00 additional
    }

    return baseCost / 100 // Convert pence to pounds
  }

  async setupDeliveryWebhook(deliveryId: string, trackingNumber: string): Promise<void> {
    try {
      // Set up tracking webhook with Royal Mail
      const webhookRequest = {
        trackingNumber,
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/royal-mail-tracking`,
        events: ['delivered', 'attempted', 'returned', 'delayed']
      }

      await fetch(`${this.ROYAL_MAIL_API_URL}/tracking/v1/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'X-IBM-Client-Id': this.CLIENT_ID!
        },
        body: JSON.stringify(webhookRequest)
      })

    } catch (error) {
      console.error('Error setting up Royal Mail webhook:', error)
      // Don't throw - delivery was successful even if webhook setup failed
    }
  }

  async trackDelivery(trackingNumber: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.ROYAL_MAIL_API_URL}/tracking/v1/mailpieces/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'X-IBM-Client-Id': this.CLIENT_ID!
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Tracking API error: ${response.status}`)
      }

      return await response.json()

    } catch (error) {
      console.error('Error tracking delivery:', error)
      throw error
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors, rate limits, and server errors are retryable
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'rate_limit_exceeded',
      'server_error'
    ]

    const errorMessage = error?.message?.toLowerCase() || ''
    const errorCode = error?.code?.toLowerCase() || ''
    
    return retryableErrors.some(retryable => 
      errorMessage.includes(retryable) || errorCode.includes(retryable)
    ) || (error?.response?.status >= 500 && error?.response?.status < 600)
  }
}
```

### Email Thank You Service (`/src/lib/integrations/thank-you/email-thank-you-service.ts`)
```typescript
import { Resend } from 'resend'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface EmailThankYouRequest {
  to: string
  recipientName: string
  content: string
  templateData: Record<string, any>
  priority: 'standard' | 'urgent' | 'express'
  organizationId: string
}

interface EmailDeliveryResult {
  success: boolean
  deliveryId: string
  trackingNumber?: string
  estimatedDelivery?: Date
  cost: number
  error?: string
  retryable?: boolean
  deliveryMethod: string
  providerResponse?: any
}

export class EmailThankYouService {
  private resend: Resend
  private supabase = createClientComponentClient()

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    this.resend = new Resend(apiKey)
  }

  async sendThankYouEmail(request: EmailThankYouRequest): Promise<EmailDeliveryResult> {
    try {
      console.log(`Sending thank you email to ${request.to}`)

      // Get organization details for branding
      const { data: organization } = await this.supabase
        .from('organizations')
        .select('name, branding_colors, logo_url, contact_email')
        .eq('id', request.organizationId)
        .single()

      if (!organization) {
        throw new Error('Organization not found')
      }

      // Generate email content
      const emailContent = await this.generateEmailContent(request, organization)
      
      // Send email via Resend
      const result = await this.resend.emails.send({
        from: `${organization.name} <${organization.contact_email || 'noreply@wedsync.com'}>`,
        to: request.to,
        subject: `Thank you from ${request.templateData.coupleNames || organization.name}`,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          'X-Wedding-Thank-You': 'true',
          'X-Organization-ID': request.organizationId,
          'X-Priority': request.priority
        },
        tags: [
          { name: 'category', value: 'thank_you' },
          { name: 'priority', value: request.priority },
          { name: 'organization', value: request.organizationId }
        ]
      })

      if (!result.data) {
        throw new Error('No response data from Resend')
      }

      return {
        success: true,
        deliveryId: result.data.id,
        trackingNumber: result.data.id,
        estimatedDelivery: new Date(), // Email is instant
        cost: 0, // Resend is free for reasonable volumes
        deliveryMethod: 'email',
        providerResponse: result.data
      }

    } catch (error) {
      console.error('Email service error:', error)
      
      return {
        success: false,
        deliveryId: `email-error-${Date.now()}`,
        error: error instanceof Error ? error.message : 'Unknown email service error',
        retryable: this.isRetryableError(error),
        deliveryMethod: 'email',
        cost: 0
      }
    }
  }

  private async generateEmailContent(
    request: EmailThankYouRequest, 
    organization: any
  ): Promise<{ html: string; text: string }> {
    
    const brandColors = organization.branding_colors || {
      primary: '#d4af37', // Gold
      secondary: '#f7fafc', // Light gray
      text: '#2d3748' // Dark gray
    }

    // Generate HTML email template
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You</title>
      <style>
        body {
          font-family: Georgia, serif;
          line-height: 1.6;
          color: ${brandColors.text};
          background-color: ${brandColors.secondary};
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, ${brandColors.primary}, ${this.lightenColor(brandColors.primary, 20)});
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: normal;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }
        ${organization.logo_url ? `
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            display: block;
            border-radius: 50%;
            border: 3px solid white;
          }
        ` : ''}
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          color: ${brandColors.primary};
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 30px;
        }
        .signature {
          font-size: 18px;
          font-style: italic;
          color: ${brandColors.primary};
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid ${brandColors.secondary};
        }
        .footer {
          background: ${brandColors.secondary};
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #718096;
        }
        .decorative-element {
          text-align: center;
          font-size: 24px;
          color: ${brandColors.primary};
          margin: 20px 0;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content {
            padding: 20px;
          }
          .header h1 {
            font-size: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          ${organization.logo_url ? `<img src="${organization.logo_url}" alt="${organization.name}" class="logo">` : ''}
          <h1>Thank You</h1>
        </div>
        
        <div class="content">
          <div class="greeting">Dear ${request.recipientName},</div>
          
          <div class="decorative-element">❦</div>
          
          <div class="message">
            ${this.formatMessageForHTML(request.content)}
          </div>
          
          <div class="decorative-element">❦</div>
          
          <div class="signature">
            With heartfelt gratitude,<br>
            ${request.templateData.coupleNames || organization.name}
          </div>
        </div>
        
        <div class="footer">
          This thank you message was sent with love via ${organization.name}<br>
          ${new Date().toLocaleDateString('en-GB', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
    </body>
    </html>
    `

    // Generate plain text version
    const text = `
Dear ${request.recipientName},

${request.content}

With heartfelt gratitude,
${request.templateData.coupleNames || organization.name}

---
This thank you message was sent via ${organization.name}
${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
    `.trim()

    return { html, text }
  }

  private formatMessageForHTML(message: string): string {
    return message
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  private lightenColor(color: string, percent: number): string {
    // Simple color lightening function
    const hex = color.replace('#', '')
    const num = parseInt(hex, 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt  
    const B = (num & 0x0000FF) + amt

    return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`
  }

  async setupDeliveryWebhook(deliveryId: string, trackingNumber: string): Promise<void> {
    // Resend provides delivery tracking through their dashboard
    // We can poll their API or set up webhooks if available
    try {
      // Store tracking information for monitoring
      await this.supabase
        .from('email_delivery_tracking')
        .insert({
          delivery_id: deliveryId,
          tracking_number: trackingNumber,
          provider: 'resend',
          webhook_configured: true,
          created_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error setting up email webhook:', error)
    }
  }

  async checkDeliveryStatus(trackingId: string): Promise<any> {
    try {
      // Check email status via Resend API (if available)
      // For now, we'll assume successful delivery after sending
      return {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        bounced: false,
        opened: false // Would need email tracking pixels for this
      }

    } catch (error) {
      console.error('Error checking email delivery status:', error)
      throw error
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors and server errors are retryable
    // Authentication and validation errors are not
    const nonRetryableErrors = [
      'invalid_api_key',
      'invalid_email',
      'invalid_from_address',
      'validation_error',
      'quota_exceeded'
    ]

    const errorMessage = error?.message?.toLowerCase() || ''
    
    return !nonRetryableErrors.some(nonRetryable => 
      errorMessage.includes(nonRetryable)
    ) && (error?.response?.status >= 500 || !error?.response?.status)
  }
}
```

### Gift Registry Synchronization (`/src/lib/integrations/thank-you/gift-registry-sync.ts`)
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface GiftRegistryItem {
  registryId: string
  platform: 'amazon' | 'john_lewis' | 'marks_spencer' | 'argos' | 'next' | 'other'
  itemId: string
  itemName: string
  itemDescription?: string
  itemPrice: number
  itemUrl: string
  imageUrl?: string
  category: string
  purchased: boolean
  purchasedBy?: string[]
  purchaseDate?: Date
  quantity: {
    requested: number
    purchased: number
    remaining: number
  }
}

interface GiftMatchResult {
  confidence: number // 0-100
  matchedRegistryItem?: GiftRegistryItem
  matchReason: string
  suggestedActions: string[]
}

export class GiftRegistrySyncService {
  private supabase = createClientComponentClient()
  
  // API configurations for different registry platforms
  private readonly platformConfigs = {
    amazon: {
      baseUrl: 'https://advertising-api.amazon.co.uk',
      apiKey: process.env.AMAZON_API_KEY,
      searchEndpoint: '/v2/wishlists/search'
    },
    john_lewis: {
      baseUrl: 'https://api.johnlewis.com',
      apiKey: process.env.JOHN_LEWIS_API_KEY,
      searchEndpoint: '/v1/products'
    },
    marks_spencer: {
      baseUrl: 'https://api.marksandspencer.com',
      apiKey: process.env.MARKS_SPENCER_API_KEY,
      searchEndpoint: '/v1/giftlist'
    }
  }

  async syncRegistryWithGifts(organizationId: string, weddingId: string): Promise<any> {
    console.log(`Syncing gift registry for wedding ${weddingId}`)

    try {
      // Get all registry items for the wedding
      const registryItems = await this.fetchAllRegistryItems(weddingId)
      
      // Get all received gifts that aren't matched yet
      const unmatchedGifts = await this.getUnmatchedGifts(organizationId, weddingId)
      
      const matchResults = []
      
      // Attempt to match each unmatched gift with registry items
      for (const gift of unmatchedGifts) {
        const matchResult = await this.matchGiftToRegistry(gift, registryItems)
        
        if (matchResult.confidence > 70) {
          // High confidence match - auto-match
          await this.createGiftRegistryLink(gift.id, matchResult.matchedRegistryItem!.itemId)
          matchResults.push({
            giftId: gift.id,
            matched: true,
            confidence: matchResult.confidence,
            registryItemId: matchResult.matchedRegistryItem!.itemId
          })
        } else if (matchResult.confidence > 40) {
          // Medium confidence - suggest to user
          await this.createMatchSuggestion(gift.id, matchResult)
          matchResults.push({
            giftId: gift.id,
            matched: false,
            needsReview: true,
            confidence: matchResult.confidence,
            suggestion: matchResult
          })
        } else {
          // Low confidence - no match found
          matchResults.push({
            giftId: gift.id,
            matched: false,
            confidence: matchResult.confidence,
            reason: 'No suitable registry match found'
          })
        }
      }

      // Update registry item purchase status
      await this.updateRegistryPurchaseStatus(organizationId)

      return {
        totalGifts: unmatchedGifts.length,
        automaticMatches: matchResults.filter(r => r.matched).length,
        needsReview: matchResults.filter(r => r.needsReview).length,
        noMatch: matchResults.filter(r => !r.matched && !r.needsReview).length,
        results: matchResults
      }

    } catch (error) {
      console.error('Registry sync error:', error)
      throw error
    }
  }

  private async fetchAllRegistryItems(weddingId: string): Promise<GiftRegistryItem[]> {
    // Get registry links from the database
    const { data: registryLinks } = await this.supabase
      .from('wedding_registries')
      .select('*')
      .eq('wedding_id', weddingId)

    if (!registryLinks?.length) {
      return []
    }

    const allItems: GiftRegistryItem[] = []

    // Fetch items from each registry platform
    for (const registry of registryLinks) {
      try {
        const items = await this.fetchRegistryItems(registry)
        allItems.push(...items)
      } catch (error) {
        console.error(`Error fetching from ${registry.platform}:`, error)
        // Continue with other registries
      }
    }

    return allItems
  }

  private async fetchRegistryItems(registry: any): Promise<GiftRegistryItem[]> {
    const config = this.platformConfigs[registry.platform as keyof typeof this.platformConfigs]
    
    if (!config || !config.apiKey) {
      console.warn(`No API configuration for platform: ${registry.platform}`)
      return []
    }

    try {
      const response = await fetch(`${config.baseUrl}${config.searchEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Registry-ID': registry.registry_url // Extract ID from URL
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform platform-specific response to our format
      return this.transformPlatformResponse(data, registry.platform)

    } catch (error) {
      console.error(`Error fetching registry items from ${registry.platform}:`, error)
      return []
    }
  }

  private transformPlatformResponse(data: any, platform: string): GiftRegistryItem[] {
    // Transform different platform responses to our unified format
    switch (platform) {
      case 'amazon':
        return this.transformAmazonResponse(data)
      case 'john_lewis':
        return this.transformJohnLewisResponse(data)
      case 'marks_spencer':
        return this.transformMarksSpencerResponse(data)
      default:
        return []
    }
  }

  private transformAmazonResponse(data: any): GiftRegistryItem[] {
    // Transform Amazon wishlist API response
    return (data.items || []).map((item: any) => ({
      registryId: data.listId,
      platform: 'amazon',
      itemId: item.asin,
      itemName: item.title,
      itemDescription: item.description,
      itemPrice: item.price?.amount || 0,
      itemUrl: `https://amazon.co.uk/dp/${item.asin}`,
      imageUrl: item.image?.url,
      category: item.category,
      purchased: item.purchased || false,
      purchasedBy: item.purchasedBy || [],
      quantity: {
        requested: item.quantity || 1,
        purchased: item.purchasedQuantity || 0,
        remaining: (item.quantity || 1) - (item.purchasedQuantity || 0)
      }
    }))
  }

  private transformJohnLewisResponse(data: any): GiftRegistryItem[] {
    // Transform John Lewis API response
    return (data.products || []).map((product: any) => ({
      registryId: data.giftListId,
      platform: 'john_lewis',
      itemId: product.productId,
      itemName: product.title,
      itemDescription: product.details,
      itemPrice: product.price.now,
      itemUrl: `https://johnlewis.com${product.links.self}`,
      imageUrl: product.media?.images?.primary,
      category: product.department,
      purchased: product.purchased || false,
      quantity: {
        requested: product.quantity || 1,
        purchased: product.purchasedQuantity || 0,
        remaining: (product.quantity || 1) - (product.purchasedQuantity || 0)
      }
    }))
  }

  private transformMarksSpencerResponse(data: any): GiftRegistryItem[] {
    // Transform M&S API response
    return (data.giftListItems || []).map((item: any) => ({
      registryId: data.giftListId,
      platform: 'marks_spencer',
      itemId: item.productId,
      itemName: item.productName,
      itemDescription: item.productDescription,
      itemPrice: item.price,
      itemUrl: item.productUrl,
      imageUrl: item.imageUrl,
      category: item.category,
      purchased: item.status === 'purchased',
      quantity: {
        requested: item.requestedQuantity || 1,
        purchased: item.purchasedQuantity || 0,
        remaining: (item.requestedQuantity || 1) - (item.purchasedQuantity || 0)
      }
    }))
  }

  private async getUnmatchedGifts(organizationId: string, weddingId: string): Promise<any[]> {
    const { data: gifts } = await this.supabase
      .from('thank_you_gifts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('wedding_id', weddingId)
      .is('registry_item_id', null) // Not yet matched to registry
      .order('created_at', { ascending: true })

    return gifts || []
  }

  private async matchGiftToRegistry(
    gift: any, 
    registryItems: GiftRegistryItem[]
  ): Promise<GiftMatchResult> {
    
    const giftDescription = gift.gift_description.toLowerCase()
    const giftValue = gift.gift_value || 0
    
    let bestMatch: GiftRegistryItem | undefined
    let highestScore = 0
    let matchReasons: string[] = []

    for (const registryItem of registryItems) {
      let score = 0
      const reasons: string[] = []

      // Name similarity matching
      const nameScore = this.calculateNameSimilarity(giftDescription, registryItem.itemName.toLowerCase())
      score += nameScore * 40 // 40% weight for name similarity
      if (nameScore > 0.7) reasons.push(`Very similar name (${Math.round(nameScore * 100)}% match)`)
      else if (nameScore > 0.4) reasons.push(`Similar name (${Math.round(nameScore * 100)}% match)`)

      // Price similarity matching (within 20% tolerance)
      if (giftValue > 0 && registryItem.itemPrice > 0) {
        const priceDiff = Math.abs(giftValue - registryItem.itemPrice) / registryItem.itemPrice
        if (priceDiff < 0.2) {
          const priceScore = (0.2 - priceDiff) / 0.2
          score += priceScore * 30 // 30% weight for price similarity
          reasons.push(`Similar price (${Math.round(priceScore * 100)}% match)`)
        }
      }

      // Category matching
      if (gift.gift_category && registryItem.category) {
        const categoryMatch = this.matchCategories(gift.gift_category, registryItem.category)
        if (categoryMatch) {
          score += 20 // 20% weight for category match
          reasons.push('Category match')
        }
      }

      // Availability check (not already purchased)
      if (registryItem.quantity.remaining > 0) {
        score += 10 // 10% bonus for available items
        reasons.push('Item still available')
      }

      if (score > highestScore) {
        highestScore = score
        bestMatch = registryItem
        matchReasons = reasons
      }
    }

    const confidence = Math.min(Math.round(highestScore), 100)
    
    return {
      confidence,
      matchedRegistryItem: bestMatch,
      matchReason: matchReasons.join(', ') || 'No significant matches found',
      suggestedActions: this.generateSuggestedActions(confidence, bestMatch)
    }
  }

  private calculateNameSimilarity(text1: string, text2: string): number {
    // Implement text similarity algorithm (Levenshtein distance or similar)
    // For simplicity, using a basic word overlap approach
    
    const words1 = text1.split(/\s+/).filter(w => w.length > 2)
    const words2 = text2.split(/\s+/).filter(w => w.length > 2)
    
    let matches = 0
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++
          break
        }
      }
    }
    
    return Math.min(words1.length, words2.length) > 0 
      ? matches / Math.min(words1.length, words2.length) 
      : 0
  }

  private matchCategories(giftCategory: string, registryCategory: string): boolean {
    const categoryMap = {
      'household': ['home', 'kitchen', 'dining', 'household', 'homeware'],
      'decorative': ['decor', 'decoration', 'ornament', 'decorative', 'art'],
      'experience': ['experience', 'voucher', 'gift card', 'travel', 'activity'],
      'money': ['cash', 'money', 'voucher', 'gift card'],
      'personal': ['personal', 'clothing', 'jewelry', 'accessories']
    }

    const mappedCategories = categoryMap[giftCategory as keyof typeof categoryMap] || [giftCategory]
    const registryCategoryLower = registryCategory.toLowerCase()
    
    return mappedCategories.some(cat => 
      registryCategoryLower.includes(cat.toLowerCase()) || 
      cat.toLowerCase().includes(registryCategoryLower)
    )
  }

  private generateSuggestedActions(confidence: number, match?: GiftRegistryItem): string[] {
    const actions = []
    
    if (confidence > 70) {
      actions.push('Automatically link gift to registry item')
      actions.push('Mark registry item as purchased')
      actions.push('Update gift tracking status')
    } else if (confidence > 40) {
      actions.push('Review suggested match for accuracy')
      actions.push('Manually verify gift details')
      if (match) {
        actions.push(`Check if this matches: ${match.itemName}`)
      }
    } else {
      actions.push('Manually search registry for similar items')
      actions.push('Consider adding gift to registry for future reference')
      actions.push('Verify gift description accuracy')
    }
    
    return actions
  }

  private async createGiftRegistryLink(giftId: string, registryItemId: string): Promise<void> {
    await this.supabase
      .from('thank_you_gifts')
      .update({
        registry_item_id: registryItemId,
        registry_matched: true,
        registry_matched_at: new Date().toISOString()
      })
      .eq('id', giftId)
  }

  private async createMatchSuggestion(giftId: string, matchResult: GiftMatchResult): Promise<void> {
    await this.supabase
      .from('registry_match_suggestions')
      .insert({
        gift_id: giftId,
        registry_item_id: matchResult.matchedRegistryItem?.itemId,
        confidence_score: matchResult.confidence,
        match_reason: matchResult.matchReason,
        suggested_actions: matchResult.suggestedActions,
        status: 'pending_review',
        created_at: new Date().toISOString()
      })
  }

  private async updateRegistryPurchaseStatus(organizationId: string): Promise<void> {
    // Update registry items to reflect purchased status based on matched gifts
    const { data: matchedGifts } = await this.supabase
      .from('thank_you_gifts')
      .select('registry_item_id, gift_received_date')
      .eq('organization_id', organizationId)
      .not('registry_item_id', 'is', null)

    if (!matchedGifts?.length) return

    for (const gift of matchedGifts) {
      await this.supabase
        .from('gift_registry_items')
        .update({
          purchase_status: 'purchased',
          received_date: gift.gift_received_date,
          updated_at: new Date().toISOString()
        })
        .eq('registry_item_id', gift.registry_item_id)
    }
  }

  // Webhook handler for registry updates from external platforms
  async handleRegistryWebhook(platform: string, webhookData: any): Promise<void> {
    console.log(`Processing registry webhook from ${platform}`)
    
    try {
      switch (platform) {
        case 'amazon':
          await this.handleAmazonWebhook(webhookData)
          break
        case 'john_lewis':
          await this.handleJohnLewisWebhook(webhookData)
          break
        default:
          console.warn(`Unknown registry platform: ${platform}`)
      }
    } catch (error) {
      console.error(`Error processing ${platform} webhook:`, error)
    }
  }

  private async handleAmazonWebhook(data: any): Promise<void> {
    // Handle Amazon wishlist updates
    if (data.eventType === 'ITEM_PURCHASED') {
      await this.supabase
        .from('gift_registry_items')
        .update({
          purchase_status: 'purchased',
          quantity_purchased: data.quantityPurchased,
          purchased_by: data.purchasedBy,
          updated_at: new Date().toISOString()
        })
        .eq('registry_item_id', data.itemId)
    }
  }

  private async handleJohnLewisWebhook(data: any): Promise<void> {
    // Handle John Lewis gift list updates
    if (data.event === 'product_purchased') {
      await this.supabase
        .from('gift_registry_items')
        .update({
          purchase_status: 'purchased',
          quantity_purchased: data.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('registry_item_id', data.productId)
    }
  }
}

// Export singleton instance
export const giftRegistrySync = new GiftRegistrySyncService()
```

## ✅ Acceptance Criteria Checklist

- [ ] **Multi-Channel Routing** intelligently selects optimal delivery method based on recipient preferences and gift value
- [ ] **Royal Mail Integration** enables physical thank you card printing, posting, and tracking with full API integration
- [ ] **Email Service Integration** sends beautiful HTML thank you emails with organization branding via Resend
- [ ] **Gift Registry Synchronization** connects with major UK retailers (Amazon, John Lewis, M&S) to match gifts automatically
- [ ] **Address Validation** validates UK postcodes and international addresses before delivery attempts
- [ ] **Delivery Tracking** provides real-time status updates from all delivery channels with webhook integration
- [ ] **Fallback Mechanisms** automatically attempts alternative delivery methods when primary method fails
- [ ] **Cost Optimization** calculates accurate delivery costs and chooses cost-effective methods based on priority
- [ ] **Webhook System** handles delivery confirmations and status updates from external service providers
- [ ] **Bulk Operations** efficiently processes multiple deliveries with proper rate limiting and error handling
- [ ] **Error Recovery** implements comprehensive retry logic and manual intervention workflows
- [ ] **Wedding Context Integration** considers gift value, relationship importance, and delivery urgency in routing decisions

Your integrations create a bulletproof communication network that ensures every wedding thank you reaches its intended recipient through the perfect delivery channel.

**Remember**: A missed thank you note could mean a damaged relationship. Build delivery redundancy like a wedding photographer with backup cameras! 📧💍