/**
 * GDPR Testing Utilities - WS-176
 * Shared utilities for comprehensive GDPR compliance testing
 * Team E - Round 1 Implementation
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../src/types/database';

// Test configuration for GDPR compliance testing
export const GDPR_TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  testTimeouts: {
    standard: 10000,
    longRunning: 30000,
    deletion: 60000,
    export: 45000
  },
  testUser: {
    email: 'gdpr-compliance-test@wedding.com',
    password: 'SecureTest123!',
    id: 'test-user-gdpr-compliance'
  },
  testData: {
    weddingId: 'test-wedding-gdpr',
    guestId: 'test-guest-gdpr',
    vendorId: 'test-vendor-gdpr'
  }
};

// GDPR-specific data categories for comprehensive testing
export const GDPR_DATA_CATEGORIES = {
  PERSONAL_DATA: [
    'name',
    'email',
    'phone',
    'address',
    'date_of_birth',
    'photos',
    'preferences'
  ],
  SENSITIVE_DATA: [
    'dietary_requirements',
    'accessibility_needs',
    'medical_information',
    'religious_preferences'
  ],
  FINANCIAL_DATA: [
    'payment_information',
    'billing_address',
    'payment_history',
    'subscription_data'
  ],
  BEHAVIORAL_DATA: [
    'login_history',
    'page_views',
    'feature_usage',
    'communication_history'
  ]
};

// Legal bases for GDPR compliance
export const GDPR_LEGAL_BASES = {
  CONSENT: 'consent',
  CONTRACT: 'contract',
  LEGAL_OBLIGATION: 'legal_obligation',
  VITAL_INTERESTS: 'vital_interests',
  PUBLIC_TASK: 'public_task',
  LEGITIMATE_INTERESTS: 'legitimate_interests'
} as const;

// GDPR consent types for wedding business
export const GDPR_CONSENT_TYPES = {
  ESSENTIAL_COOKIES: {
    id: 'essential_cookies',
    name: 'Essential Cookies',
    required: true,
    legal_basis: GDPR_LEGAL_BASES.LEGITIMATE_INTERESTS,
    purpose: 'Website functionality and security',
    can_withdraw: false
  },
  MARKETING_EMAILS: {
    id: 'marketing_emails',
    name: 'Marketing Communications',
    required: false,
    legal_basis: GDPR_LEGAL_BASES.CONSENT,
    purpose: 'Wedding planning tips and promotional content',
    can_withdraw: true
  },
  ANALYTICS_COOKIES: {
    id: 'analytics_cookies',
    name: 'Analytics and Performance',
    required: false,
    legal_basis: GDPR_LEGAL_BASES.CONSENT,
    purpose: 'Website optimization and user experience improvement',
    can_withdraw: true
  },
  VENDOR_DATA_SHARING: {
    id: 'vendor_data_sharing',
    name: 'Vendor Data Sharing',
    required: false,
    legal_basis: GDPR_LEGAL_BASES.CONSENT,
    purpose: 'Sharing contact information with wedding vendors for quotes',
    can_withdraw: true
  },
  PHOTO_SHARING: {
    id: 'photo_sharing',
    name: 'Photo Gallery Sharing',
    required: false,
    legal_basis: GDPR_LEGAL_BASES.CONSENT,
    purpose: 'Sharing wedding photos in public gallery or marketing',
    can_withdraw: true
  }
} as const;

// Initialize Supabase client for testing
export function createGDPRTestClient() {
  return createClient<Database>(
    GDPR_TEST_CONFIG.supabaseUrl,
    GDPR_TEST_CONFIG.supabaseKey,
    {
      auth: { persistSession: false },
      global: {
        headers: {
          'x-test-mode': 'true',
          'x-gdpr-test': 'compliance-suite'
        }
      }
    }
  );
}

// Test data generators for GDPR scenarios
export const createTestUserData = () => ({
  id: `test-user-${Date.now()}`,
  email: `gdpr-test-${Date.now()}@wedding.com`,
  full_name: 'GDPR Test User',
  phone: '+1-555-0123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // Add EU-specific data to trigger GDPR requirements
  country: 'Germany',
  postal_code: '10115',
  gdpr_consent_version: '2024.1',
  data_processing_consent: true
});

export const createTestWeddingData = (userId: string) => ({
  id: `test-wedding-${Date.now()}`,
  user_id: userId,
  wedding_date: '2025-06-15',
  venue_name: 'Test Venue GDPR',
  guest_count: 150,
  budget: 50000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // EU location triggers GDPR
  venue_country: 'France',
  venue_city: 'Paris'
});

export const createTestGuestData = (weddingId: string) => ({
  id: `test-guest-${Date.now()}`,
  wedding_id: weddingId,
  first_name: 'Test',
  last_name: 'Guest',
  email: `guest-${Date.now()}@example.eu`,
  dietary_requirements: 'Vegetarian',
  accessibility_needs: 'None',
  created_at: new Date().toISOString(),
  // GDPR-relevant fields
  gdpr_consent_photos: false,
  gdpr_consent_communications: true,
  gdpr_consent_date: new Date().toISOString()
});

// Privacy request utilities
export async function createPrivacyRequest(
  client: ReturnType<typeof createGDPRTestClient>,
  requestData: {
    userId: string;
    requestType: 'access' | 'deletion' | 'portability' | 'rectification' | 'restriction';
    purpose: string;
    metadata?: Record<string, any>;
  }
) {
  const { data, error } = await client
    .from('privacy_requests')
    .insert({
      user_id: requestData.userId,
      request_type: requestData.requestType,
      purpose: requestData.purpose,
      status: 'pending',
      created_at: new Date().toISOString(),
      metadata: requestData.metadata || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Consent management utilities
export async function updateConsent(
  client: ReturnType<typeof createGDPRTestClient>,
  consentData: {
    userId: string;
    consentType: keyof typeof GDPR_CONSENT_TYPES;
    isGranted: boolean;
    legalBasis: keyof typeof GDPR_LEGAL_BASES;
    purpose: string;
  }
) {
  const { data, error } = await client
    .from('consent_records')
    .upsert({
      user_id: consentData.userId,
      consent_type: consentData.consentType,
      is_granted: consentData.isGranted,
      legal_basis: consentData.legalBasis,
      purpose: consentData.purpose,
      updated_at: new Date().toISOString(),
      consent_given_at: consentData.isGranted ? new Date().toISOString() : null,
      consent_withdrawn_at: !consentData.isGranted ? new Date().toISOString() : null
    }, {
      onConflict: 'user_id,consent_type'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Data deletion utilities
export async function requestDataDeletion(
  client: ReturnType<typeof createGDPRTestClient>,
  userId: string,
  options: {
    cascadeDelete?: boolean;
    anonymizeInstead?: boolean;
    retainForLegal?: boolean;
    deletionReason: string;
  } = {
    cascadeDelete: true,
    anonymizeInstead: false,
    retainForLegal: false,
    deletionReason: 'User requested deletion'
  }
) {
  const { data, error } = await client.rpc('initiate_gdpr_deletion', {
    target_user_id: userId,
    cascade_delete: options.cascadeDelete,
    anonymize_instead: options.anonymizeInstead,
    retain_for_legal: options.retainForLegal,
    deletion_reason: options.deletionReason
  });

  if (error) throw error;
  return data;
}

// Data export utilities
export async function requestDataExport(
  client: ReturnType<typeof createGDPRTestClient>,
  userId: string,
  options: {
    format?: 'json' | 'csv' | 'xml';
    includeMetadata?: boolean;
    dataCategories?: string[];
  } = {
    format: 'json',
    includeMetadata: true,
    dataCategories: ['all']
  }
) {
  const { data, error } = await client.rpc('initiate_gdpr_export', {
    target_user_id: userId,
    export_format: options.format,
    include_metadata: options.includeMetadata,
    data_categories: options.dataCategories
  });

  if (error) throw error;
  return data;
}

// Legal compliance validation utilities
export async function validateGDPRCompliance(
  client: ReturnType<typeof createGDPRTestClient>
) {
  const { data, error } = await client.rpc('validate_gdpr_compliance');
  
  if (error) throw error;
  return data;
}

// Audit trail utilities
export async function verifyAuditTrail(
  client: ReturnType<typeof createGDPRTestClient>,
  userId: string,
  timeRange: {
    startDate: string;
    endDate: string;
  }
) {
  const { data, error } = await client
    .from('audit_trail')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', timeRange.startDate)
    .lte('created_at', timeRange.endDate)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Cross-border transfer validation
export async function validateCrossBorderTransfer(
  sourceRegion: string,
  targetRegion: string,
  dataType: string,
  transferMechanism: 'adequacy_decision' | 'standard_clauses' | 'binding_rules' | 'consent'
) {
  const client = createGDPRTestClient();
  
  const { data, error } = await client.rpc('validate_cross_border_transfer', {
    source_region: sourceRegion,
    target_region: targetRegion,
    data_type: dataType,
    transfer_mechanism: transferMechanism
  });

  if (error) throw error;
  return data;
}

// Test cleanup utilities
export async function cleanupGDPRTestData(
  client: ReturnType<typeof createGDPRTestClient>,
  testIdentifiers: {
    userIds?: string[];
    weddingIds?: string[];
    guestIds?: string[];
    vendorIds?: string[];
  }
) {
  const cleanupPromises: Promise<any>[] = [];

  if (testIdentifiers.userIds?.length) {
    cleanupPromises.push(
      client.from('user_profiles').delete().in('id', testIdentifiers.userIds).then(() => {})
    );
  }

  if (testIdentifiers.weddingIds?.length) {
    cleanupPromises.push(
      client.from('weddings').delete().in('id', testIdentifiers.weddingIds).then(() => {})
    );
  }

  if (testIdentifiers.guestIds?.length) {
    cleanupPromises.push(
      client.from('guests').delete().in('id', testIdentifiers.guestIds).then(() => {})
    );
  }

  // Clean up privacy requests, consent records, and audit trail
  if (testIdentifiers.userIds?.length) {
    cleanupPromises.push(
      client.from('privacy_requests').delete().in('user_id', testIdentifiers.userIds).then(() => {}),
      client.from('consent_records').delete().in('user_id', testIdentifiers.userIds).then(() => {}),
      client.from('audit_trail').delete().in('user_id', testIdentifiers.userIds).then(() => {})
    );
  }

  await Promise.all(cleanupPromises);
}

// Wedding industry specific GDPR scenarios
export const WEDDING_GDPR_SCENARIOS = {
  EU_COUPLE_US_VENDOR: {
    description: 'EU couple using US-based wedding vendor',
    challenges: ['Cross-border data transfer', 'Adequacy decisions', 'Consent mechanisms'],
    testCases: ['adequacy_check', 'vendor_dpa_required', 'consent_withdrawal']
  },
  GUEST_PHOTO_SHARING: {
    description: 'Wedding guest photo sharing and consent',
    challenges: ['Image consent', 'Facial recognition', 'Public gallery sharing'],
    testCases: ['photo_consent', 'facial_recognition_opt_out', 'gallery_removal']
  },
  VENDOR_DATA_ACCESS: {
    description: 'Multiple vendors accessing guest data',
    challenges: ['Purpose limitation', 'Data minimization', 'Vendor agreements'],
    testCases: ['vendor_access_restriction', 'purpose_validation', 'data_sharing_audit']
  },
  WEDDING_DAY_TRACKING: {
    description: 'Real-time tracking during wedding events',
    challenges: ['Location tracking', 'Behavioral data', 'Guest privacy'],
    testCases: ['location_consent', 'tracking_opt_out', 'real_time_deletion']
  }
};

// Performance benchmarks for GDPR operations
export const GDPR_PERFORMANCE_BENCHMARKS = {
  DATA_EXPORT: {
    maxTimeMs: 30000, // 30 seconds for data export
    maxSizeMB: 100 // Maximum export file size
  },
  DATA_DELETION: {
    maxTimeMs: 60000, // 1 minute for deletion completion
    cascadeDepth: 5 // Maximum relationship depth for cascade deletion
  },
  CONSENT_UPDATE: {
    maxTimeMs: 1000, // 1 second for consent changes
    propagationTimeMs: 5000 // 5 seconds for consent propagation
  },
  PRIVACY_REQUEST: {
    maxTimeMs: 2000, // 2 seconds to create privacy request
    responseTimeHours: 72 // Maximum response time per GDPR
  }
};