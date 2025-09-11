'use client'

import { useCallback } from 'react'
import { trackWeddingEvent, identifyWeddingVendor, WeddingEvents, WeddingPersonas } from '@/lib/posthog'
import posthog from 'posthog-js'

export const useWeddingAnalytics = () => {
  // Track vendor signup journey
  const trackVendorSignup = useCallback((step: 'started' | 'completed', properties?: Record<string, any>) => {
    if (step === 'started') {
      trackWeddingEvent('VENDOR_SIGNUP_STARTED', properties)
    } else {
      trackWeddingEvent('VENDOR_SIGNUP_COMPLETED', properties)
    }
  }, [])

  // Track form interactions
  const trackFormEvent = useCallback((
    event: 'created' | 'published' | 'submitted' | 'abandoned',
    formId: string,
    properties?: Record<string, any>
  ) => {
    const eventMap = {
      created: 'FORM_CREATED',
      published: 'FORM_PUBLISHED', 
      submitted: 'FORM_SUBMITTED',
      abandoned: 'FORM_ABANDONED'
    } as const

    trackWeddingEvent(eventMap[event], {
      form_id: formId,
      ...properties
    })
  }, [])

  // Track client management
  const trackClientImport = useCallback((
    type: 'started' | 'completed' | 'bulk',
    clientCount?: number,
    properties?: Record<string, any>
  ) => {
    const eventMap = {
      started: 'CLIENT_IMPORT_STARTED',
      completed: 'CLIENT_IMPORT_COMPLETED',
      bulk: 'CLIENT_BULK_IMPORT'
    } as const

    trackWeddingEvent(eventMap[type], {
      client_count: clientCount,
      ...properties
    })
  }, [])

  // Track journey builder usage
  const trackJourneyEvent = useCallback((
    event: 'created' | 'published' | 'triggered' | 'completed',
    journeyId: string,
    properties?: Record<string, any>
  ) => {
    const eventMap = {
      created: 'JOURNEY_CREATED',
      published: 'JOURNEY_PUBLISHED',
      triggered: 'JOURNEY_TRIGGERED', 
      completed: 'JOURNEY_COMPLETED'
    } as const

    trackWeddingEvent(eventMap[event], {
      journey_id: journeyId,
      ...properties
    })
  }, [])

  // Track subscription changes
  const trackSubscription = useCallback((
    event: 'upgraded' | 'downgraded' | 'trial_started' | 'trial_converted',
    tier?: string,
    properties?: Record<string, any>
  ) => {
    const eventMap = {
      upgraded: 'SUBSCRIPTION_UPGRADED',
      downgraded: 'SUBSCRIPTION_DOWNGRADED',
      trial_started: 'TRIAL_STARTED',
      trial_converted: 'TRIAL_CONVERTED'
    } as const

    trackWeddingEvent(eventMap[event], {
      subscription_tier: tier,
      ...properties
    })
  }, [])

  // Track wedding day critical events
  const trackWeddingDay = useCallback((
    event: 'form_accessed' | 'error' | 'offline_mode',
    properties?: Record<string, any>
  ) => {
    const eventMap = {
      form_accessed: 'WEDDING_DAY_FORM_ACCESSED',
      error: 'WEDDING_DAY_ERROR',
      offline_mode: 'WEDDING_DAY_OFFLINE_MODE'
    } as const

    trackWeddingEvent(eventMap[event], {
      is_saturday: new Date().getDay() === 6,
      wedding_date: properties?.weddingDate,
      vendor_type: properties?.vendorType,
      ...properties
    })
  }, [])

  // Track integrations
  const trackIntegration = useCallback((
    integration: 'crm' | 'tave' | 'stripe',
    event: 'connected' | 'sync_completed' | 'payment_completed',
    properties?: Record<string, any>
  ) => {
    const eventMap = {
      crm_connected: 'CRM_INTEGRATION_CONNECTED',
      tave_sync_completed: 'TAVE_SYNC_COMPLETED',
      stripe_payment_completed: 'STRIPE_PAYMENT_COMPLETED'
    } as const

    const eventKey = `${integration}_${event}` as keyof typeof eventMap
    if (eventMap[eventKey]) {
      trackWeddingEvent(eventMap[eventKey] as any, properties)
    }
  }, [])

  // Identify vendor with wedding-specific properties
  const identifyVendor = useCallback((
    userId: string,
    vendorData: {
      email: string
      vendorType: keyof typeof WeddingPersonas
      businessName: string
      subscription_tier?: string
      onboarding_step?: string
      trial_end_date?: string
    }
  ) => {
    identifyWeddingVendor(userId, vendorData)
  }, [])

  // Track conversion funnel
  const trackConversionStep = useCallback((
    step: 'landing' | 'signup' | 'onboarding' | 'first_form' | 'first_client' | 'subscription',
    properties?: Record<string, any>
  ) => {
    posthog.capture('conversion_funnel_step', {
      step,
      timestamp: new Date().toISOString(),
      ...properties
    })
  }, [])

  // Track feature usage
  const trackFeatureUsage = useCallback((
    feature: string,
    action: 'viewed' | 'used' | 'completed',
    properties?: Record<string, any>
  ) => {
    posthog.capture('feature_usage', {
      feature,
      action,
      timestamp: new Date().toISOString(),
      ...properties
    })
  }, [])

  // Track errors for better debugging
  const trackError = useCallback((
    errorType: string,
    errorMessage: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture('application_error', {
      error_type: errorType,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
      ...properties
    })
  }, [])

  return {
    trackVendorSignup,
    trackFormEvent,
    trackClientImport,
    trackJourneyEvent,
    trackSubscription,
    trackWeddingDay,
    trackIntegration,
    identifyVendor,
    trackConversionStep,
    trackFeatureUsage,
    trackError,
  }
}

export default useWeddingAnalytics