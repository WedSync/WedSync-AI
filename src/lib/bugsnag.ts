import Bugsnag from '@bugsnag/js'

// Wedding-specific error severities
export const WeddingErrorSeverity = {
  // Wedding day errors - highest priority
  WEDDING_DAY_CRITICAL: 'error',
  WEDDING_DAY_WARNING: 'warning',
  
  // Vendor business impact
  VENDOR_CRITICAL: 'error',
  VENDOR_WARNING: 'warning',
  
  // Client experience
  CLIENT_CRITICAL: 'error',
  CLIENT_INFO: 'info',
  
  // General application
  GENERAL_ERROR: 'error',
  GENERAL_INFO: 'info'
} as const

// Wedding industry error types
export const WeddingErrorTypes = {
  // Wedding day specific
  WEDDING_DAY_FORM_FAILURE: 'wedding_day_form_failure',
  WEDDING_DAY_OFFLINE: 'wedding_day_offline',
  WEDDING_DAY_SYNC_FAILURE: 'wedding_day_sync_failure',
  
  // Vendor operations
  FORM_SUBMISSION_FAILED: 'form_submission_failed',
  CLIENT_IMPORT_FAILED: 'client_import_failed',
  JOURNEY_EXECUTION_FAILED: 'journey_execution_failed',
  
  // Business critical
  PAYMENT_PROCESSING_ERROR: 'payment_processing_error',
  SUBSCRIPTION_ERROR: 'subscription_error',
  
  // Integration failures
  CRM_SYNC_FAILURE: 'crm_sync_failure',
  EMAIL_DELIVERY_FAILED: 'email_delivery_failed',
  SMS_DELIVERY_FAILED: 'sms_delivery_failed',
  
  // Authentication & security
  AUTH_FAILURE: 'auth_failure',
  PERMISSION_DENIED: 'permission_denied',
  
  // Data integrity
  DATA_CORRUPTION: 'data_corruption',
  BACKUP_FAILURE: 'backup_failure'
} as const

// Client-side Bugsnag initialization
export const initBugsnag = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BUGSNAG_API_KEY) {
    Bugsnag.start({
      apiKey: process.env.NEXT_PUBLIC_BUGSNAG_API_KEY,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      releaseStage: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      enabledReleaseStages: ['development', 'staging', 'production'],
      
      // Wedding-specific metadata
      metadata: {
        platform: {
          name: 'WedSync',
          industry: 'wedding',
          userType: 'wedding_vendor'
        }
      },
      
      // Filter sensitive wedding data
      redactedKeys: [
        'password',
        'api_key',
        'stripe_key',
        'credit_card',
        'payment_method',
        'personal_phone',
        'personal_email'
      ],
      
      // Wedding day error handling
      onError: (event) => {
        const isWeddingDay = new Date().getDay() === 6 // Saturday
        const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
        
        // Automatically escalate wedding day errors
        if (isWeddingDay && isProduction) {
          event.severity = 'error'
          event.addMetadata('wedding_day', {
            is_saturday: true,
            timestamp: new Date().toISOString(),
            escalated: true
          })
        }
        
        // Add vendor context if available
        const vendorId = localStorage.getItem('vendor_id')
        const vendorType = localStorage.getItem('vendor_type')
        
        if (vendorId && vendorType) {
          event.setUser(vendorId)
          event.addMetadata('vendor', {
            type: vendorType,
            id: vendorId
          })
        }
        
        return true
      },
      
      // Collect user interactions for wedding workflows
      collectUserInteraction: true,
      
      // Track navigation for wedding journey analysis
      trackInlineScript: false,
      
      // Enhanced logging for wedding scenarios
      logger: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ? console : null
    })
  }
}

// Server-side Bugsnag initialization (disabled for browser compatibility)
export const initBugsnagNode = () => {
  // Disabled to prevent Node.js module resolution issues in browser
  console.log('Server-side Bugsnag disabled for browser compatibility')
}

// Wedding-specific error reporting utilities
export const reportWeddingError = (
  errorType: keyof typeof WeddingErrorTypes,
  error: Error | string,
  context?: {
    vendorId?: string
    vendorType?: string
    weddingDate?: string
    clientId?: string
    severity?: keyof typeof WeddingErrorSeverity
    metadata?: Record<string, any>
  }
) => {
  const errorMessage = typeof error === 'string' ? error : error.message
  const isWeddingDay = new Date().getDay() === 6
  
  // Determine severity
  let severity: 'error' | 'warning' | 'info' = 'error'
  if (context?.severity) {
    severity = WeddingErrorSeverity[context.severity] as any
  } else if (isWeddingDay) {
    severity = 'error' // All Saturday errors are critical
  }
  
  if (typeof window !== 'undefined' && Bugsnag.isStarted()) {
    // Client-side reporting
    Bugsnag.notify(typeof error === 'string' ? new Error(error) : error, (event) => {
      event.severity = severity
      event.groupingHash = WeddingErrorTypes[errorType]
      
      event.addMetadata('wedding_error', {
        type: WeddingErrorTypes[errorType],
        is_wedding_day: isWeddingDay,
        timestamp: new Date().toISOString(),
        ...context?.metadata
      })
      
      if (context?.vendorId) {
        event.setUser(context.vendorId, context.vendorType)
      }
      
      if (context?.weddingDate) {
        event.addMetadata('wedding_details', {
          wedding_date: context.weddingDate,
          days_until_wedding: Math.ceil(
            (new Date(context.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        })
      }
    })
  } else {
    // Server-side reporting disabled for browser compatibility
    console.error('Wedding Error:', {
      type: WeddingErrorTypes[errorType],
      error: errorMessage,
      severity,
      context
    })
  }
}

// Wedding day critical error - immediate escalation
export const reportWeddingDayCritical = (
  error: Error | string,
  context?: Record<string, any>
) => {
  reportWeddingError('WEDDING_DAY_FORM_FAILURE', error, {
    severity: 'WEDDING_DAY_CRITICAL',
    metadata: {
      escalated: true,
      requires_immediate_attention: true,
      ...context
    }
  })
}

// Vendor business impact error
export const reportVendorError = (
  errorType: keyof typeof WeddingErrorTypes,
  error: Error | string,
  vendorId: string,
  vendorType: string,
  context?: Record<string, any>
) => {
  reportWeddingError(errorType, error, {
    vendorId,
    vendorType,
    severity: 'VENDOR_CRITICAL',
    metadata: context
  })
}

// Client experience error
export const reportClientError = (
  error: Error | string,
  clientId: string,
  context?: Record<string, any>
) => {
  reportWeddingError('FORM_SUBMISSION_FAILED', error, {
    clientId,
    severity: 'CLIENT_CRITICAL',
    metadata: context
  })
}

export default Bugsnag