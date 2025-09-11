'use client'

import { useCallback, useEffect } from 'react'
import { 
  reportWeddingError, 
  reportWeddingDayCritical,
  reportVendorError,
  reportClientError,
  WeddingErrorTypes 
} from '@/lib/bugsnag'
import Bugsnag from '@bugsnag/js'

export const useWeddingErrorMonitoring = () => {
  // Set up vendor context from localStorage or props
  useEffect(() => {
    if (typeof window !== 'undefined' && Bugsnag.isStarted()) {
      const vendorId = localStorage.getItem('vendor_id')
      const vendorType = localStorage.getItem('vendor_type')
      const businessName = localStorage.getItem('business_name')
      
      if (vendorId) {
        Bugsnag.setUser(vendorId, vendorType || undefined, businessName || undefined)
      }
    }
  }, [])

  // Track form submission errors
  const reportFormError = useCallback((
    formId: string,
    error: Error | string,
    context?: {
      formType?: string
      vendorId?: string
      clientId?: string
      isWeddingDay?: boolean
    }
  ) => {
    const isWeddingDay = context?.isWeddingDay || new Date().getDay() === 6
    
    if (isWeddingDay) {
      reportWeddingDayCritical(error, {
        form_id: formId,
        form_type: context?.formType,
        client_id: context?.clientId,
        vendor_id: context?.vendorId,
        error_location: 'form_submission'
      })
    } else {
      reportWeddingError('FORM_SUBMISSION_FAILED', error, {
        severity: 'VENDOR_CRITICAL',
        metadata: {
          form_id: formId,
          form_type: context?.formType,
          client_id: context?.clientId,
          vendor_id: context?.vendorId
        }
      })
    }
  }, [])

  // Track payment processing errors
  const reportPaymentError = useCallback((
    error: Error | string,
    context?: {
      amount?: number
      currency?: string
      vendorId?: string
      subscriptionTier?: string
      paymentMethod?: string
    }
  ) => {
    reportWeddingError('PAYMENT_PROCESSING_ERROR', error, {
      severity: 'VENDOR_CRITICAL',
      metadata: {
        amount: context?.amount,
        currency: context?.currency || 'GBP',
        vendor_id: context?.vendorId,
        subscription_tier: context?.subscriptionTier,
        payment_method: context?.paymentMethod,
        requires_immediate_attention: true
      }
    })
  }, [])

  // Track client import errors
  const reportClientImportError = useCallback((
    error: Error | string,
    context?: {
      vendorId?: string
      importSource?: string
      clientCount?: number
      failedCount?: number
    }
  ) => {
    if (context?.vendorId) {
      reportVendorError(
        'CLIENT_IMPORT_FAILED',
        error,
        context.vendorId,
        localStorage.getItem('vendor_type') || 'unknown',
        {
          import_source: context.importSource,
          total_clients: context.clientCount,
          failed_imports: context.failedCount
        }
      )
    } else {
      reportWeddingError('CLIENT_IMPORT_FAILED', error, {
        severity: 'VENDOR_WARNING',
        metadata: context
      })
    }
  }, [])

  // Track journey execution errors
  const reportJourneyError = useCallback((
    journeyId: string,
    error: Error | string,
    context?: {
      vendorId?: string
      clientId?: string
      stepIndex?: number
      stepType?: string
    }
  ) => {
    reportWeddingError('JOURNEY_EXECUTION_FAILED', error, {
      severity: 'VENDOR_CRITICAL',
      metadata: {
        journey_id: journeyId,
        vendor_id: context?.vendorId,
        client_id: context?.clientId,
        failed_step_index: context?.stepIndex,
        failed_step_type: context?.stepType
      }
    })
  }, [])

  // Track integration errors
  const reportIntegrationError = useCallback((
    integration: 'tave' | 'stripe' | 'email' | 'sms',
    error: Error | string,
    context?: {
      vendorId?: string
      operationType?: string
      recordCount?: number
    }
  ) => {
    const errorTypeMap = {
      tave: 'CRM_SYNC_FAILURE' as const,
      stripe: 'PAYMENT_PROCESSING_ERROR' as const,
      email: 'EMAIL_DELIVERY_FAILED' as const,
      sms: 'SMS_DELIVERY_FAILED' as const
    }
    
    reportWeddingError(errorTypeMap[integration], error, {
      severity: 'VENDOR_CRITICAL',
      metadata: {
        integration_name: integration,
        vendor_id: context?.vendorId,
        operation_type: context?.operationType,
        affected_records: context?.recordCount
      }
    })
  }, [])

  // Track authentication errors
  const reportAuthError = useCallback((
    error: Error | string,
    context?: {
      loginAttempt?: string
      vendorType?: string
      redirectPath?: string
    }
  ) => {
    reportWeddingError('AUTH_FAILURE', error, {
      severity: 'GENERAL_ERROR',
      metadata: {
        login_attempt: context?.loginAttempt,
        vendor_type: context?.vendorType,
        intended_redirect: context?.redirectPath,
        timestamp: new Date().toISOString()
      }
    })
  }, [])

  // Track data integrity issues
  const reportDataError = useCallback((
    error: Error | string,
    context?: {
      dataType?: string
      affectedRecords?: number
      vendorId?: string
      recoverable?: boolean
    }
  ) => {
    reportWeddingError('DATA_CORRUPTION', error, {
      severity: 'VENDOR_CRITICAL',
      metadata: {
        data_type: context?.dataType,
        affected_records: context?.affectedRecords,
        vendor_id: context?.vendorId,
        is_recoverable: context?.recoverable,
        requires_data_team: true
      }
    })
  }, [])

  // Wedding day emergency reporting
  const reportWeddingDayEmergency = useCallback((
    error: Error | string,
    context?: {
      vendorId?: string
      weddingDate?: string
      affectedForms?: string[]
      clientsAffected?: number
    }
  ) => {
    reportWeddingDayCritical(error, {
      vendor_id: context?.vendorId,
      wedding_date: context?.weddingDate,
      affected_forms: context?.affectedForms,
      clients_affected: context?.clientsAffected,
      emergency_escalation: true,
      saturday_critical: true
    })
  }, [])

  // Add contextual breadcrumbs for better debugging
  const addWeddingBreadcrumb = useCallback((
    message: string,
    metadata?: Record<string, any>
  ) => {
    if (Bugsnag.isStarted()) {
      Bugsnag.leaveBreadcrumb(message, {
        timestamp: new Date().toISOString(),
        is_wedding_day: new Date().getDay() === 6,
        ...metadata
      })
    }
  }, [])

  // Set vendor context dynamically
  const setVendorContext = useCallback((
    vendorId: string,
    vendorType: string,
    additionalData?: {
      businessName?: string
      subscriptionTier?: string
      onboardingStep?: string
    }
  ) => {
    if (Bugsnag.isStarted()) {
      Bugsnag.setUser(vendorId, vendorType, additionalData?.businessName)
      
      Bugsnag.addMetadata('vendor_context', {
        vendor_type: vendorType,
        subscription_tier: additionalData?.subscriptionTier,
        onboarding_step: additionalData?.onboardingStep,
        updated_at: new Date().toISOString()
      })
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('vendor_id', vendorId)
    localStorage.setItem('vendor_type', vendorType)
    if (additionalData?.businessName) {
      localStorage.setItem('business_name', additionalData.businessName)
    }
  }, [])

  return {
    reportFormError,
    reportPaymentError,
    reportClientImportError,
    reportJourneyError,
    reportIntegrationError,
    reportAuthError,
    reportDataError,
    reportWeddingDayEmergency,
    addWeddingBreadcrumb,
    setVendorContext,
  }
}

export default useWeddingErrorMonitoring