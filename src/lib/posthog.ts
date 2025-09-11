import posthog from 'posthog-js'

// Client-side PostHog instance for browser analytics
export const initPostHog = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      // Disable automatic pageview capture - we'll handle this manually
      capture_pageview: false,
      capture_pageleave: true,
      // Enable session recordings for better debugging
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: false,
        },
      },
      // Respect user privacy settings
      opt_out_capturing_by_default: false,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('PostHog loaded for development')
        }
      }
    })
  }
}

// Server-side PostHog - disabled for browser compatibility
// Use API routes for server-side analytics instead
export const serverPostHog = null

// Wedding industry specific tracking events
export const WeddingEvents = {
  // Vendor onboarding journey
  VENDOR_SIGNUP_STARTED: 'vendor_signup_started',
  VENDOR_SIGNUP_COMPLETED: 'vendor_signup_completed',
  VENDOR_PROFILE_COMPLETED: 'vendor_profile_completed',
  VENDOR_FIRST_FORM_CREATED: 'vendor_first_form_created',
  
  // Client import and onboarding
  CLIENT_IMPORT_STARTED: 'client_import_started',
  CLIENT_IMPORT_COMPLETED: 'client_import_completed',
  CLIENT_BULK_IMPORT: 'client_bulk_import',
  
  // Form builder usage
  FORM_CREATED: 'form_created',
  FORM_PUBLISHED: 'form_published',
  FORM_SUBMITTED: 'form_submitted',
  FORM_ABANDONED: 'form_abandoned',
  
  // Journey builder usage
  JOURNEY_CREATED: 'journey_created',
  JOURNEY_PUBLISHED: 'journey_published',
  JOURNEY_TRIGGERED: 'journey_triggered',
  JOURNEY_COMPLETED: 'journey_completed',
  
  // Wedding day critical events
  WEDDING_DAY_FORM_ACCESSED: 'wedding_day_form_accessed',
  WEDDING_DAY_ERROR: 'wedding_day_error',
  WEDDING_DAY_OFFLINE_MODE: 'wedding_day_offline_mode',
  
  // Business metrics
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
  CHURN_RISK_DETECTED: 'churn_risk_detected',
  
  // Integration usage
  CRM_INTEGRATION_CONNECTED: 'crm_integration_connected',
  TAVE_SYNC_COMPLETED: 'tave_sync_completed',
  STRIPE_PAYMENT_COMPLETED: 'stripe_payment_completed',
} as const

// Wedding vendor personas for better segmentation
export const WeddingPersonas = {
  PHOTOGRAPHER: 'photographer',
  VENUE: 'venue',
  PLANNER: 'planner',
  CATERER: 'caterer',
  FLORIST: 'florist',
  DJ: 'dj',
  VIDEOGRAPHER: 'videographer',
  OTHER: 'other',
} as const

// Utility functions for wedding-specific tracking
export const trackWeddingEvent = (
  eventName: keyof typeof WeddingEvents,
  properties?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(WeddingEvents[eventName], {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    })
  }
}

export const identifyWeddingVendor = (
  userId: string,
  properties: {
    email: string
    vendorType: keyof typeof WeddingPersonas
    businessName: string
    subscription_tier?: string
    onboarding_step?: string
    trial_end_date?: string
  }
) => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.identify(userId, {
      ...properties,
      vendor_type: WeddingPersonas[properties.vendorType],
      industry: 'wedding',
      identified_at: new Date().toISOString(),
    })
  }
}

// Feature flag helpers for A/B testing
export const getFeatureFlag = (flagKey: string) => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    return posthog.getFeatureFlag(flagKey)
  }
  return false
}

export const isFeatureEnabled = (flagKey: string) => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    return posthog.isFeatureEnabled(flagKey)
  }
  return false
}

export default posthog