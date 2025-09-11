export const StagingValidationConfig = {
  environment: {
    baseUrl: process.env.STAGING_URL || 'https://staging.wedsync.app',
    apiUrl: process.env.STAGING_API_URL || 'https://staging.wedsync.app/api',
    supabaseUrl: process.env.STAGING_SUPABASE_URL,
    stripeKey: process.env.STAGING_STRIPE_PUBLISHABLE_KEY,
  },
  
  thresholds: {
    performance: {
      pageLoad: 3000, // 3 seconds
      apiResponse: 1000, // 1 second
      pdfProcessing: 30000, // 30 seconds for large files
      lightScore: 85, // Lighthouse performance score
    },
    load: {
      maxConcurrentUsers: 100,
      rampUpDuration: '30s',
      testDuration: '5m',
      errorRate: 0.01, // 1%
      p95ResponseTime: 2000, // 2 seconds
    },
    files: {
      maxPdfSize: 10 * 1024 * 1024, // 10MB
      maxImageSize: 5 * 1024 * 1024, // 5MB
      supportedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    }
  },

  testData: {
    users: {
      admin: {
        email: 'staging-admin@wedsync.test',
        password: process.env.STAGING_ADMIN_PASSWORD,
      },
      client: {
        email: 'staging-client@wedsync.test', 
        password: process.env.STAGING_CLIENT_PASSWORD,
      },
      vendor: {
        email: 'staging-vendor@wedsync.test',
        password: process.env.STAGING_VENDOR_PASSWORD,
      }
    },
    payments: {
      testCards: {
        visa: '4242424242424242',
        visaDeclined: '4000000000000002',
        mastercard: '5555555555554444',
        amex: '378282246310005',
      }
    }
  }
};