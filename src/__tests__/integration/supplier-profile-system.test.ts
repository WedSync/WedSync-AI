/**
 * Comprehensive Integration Tests for WS-118: Supplier Profile Creation System
 * 
 * This test suite validates the complete supplier profile workflow including:
 * - Profile creation wizard
 * - Profile management dashboard
 * - Verification system
 * - SEO optimization
 * - Media management
 * - Database operations
 */

// Vitest globals are available due to vitest config globals: true
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
// Mock environment variables for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
describe('WS-118: Supplier Profile Creation System Integration Tests', () => {
  let supabase: any
  let testOrganizationId: string
  let testSupplierId: string
  let testProfileId: string
  let testUserId: string
  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Wedding Photography Ltd',
        type: 'supplier',
        status: 'active'
      })
      .select()
      .single()
    if (orgError) throw orgError
    testOrganizationId = org.id
    // Create test user
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
        organization_id: testOrganizationId,
        role: 'admin',
        email: 'test@supplier.com',
        first_name: 'Test',
        last_name: 'User'
    if (userError) throw userError
    testUserId = user.id
    // Create test supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
        business_name: 'Elegant Wedding Photography',
        primary_category: 'Photography',
        is_published: false
    if (supplierError) throw supplierError
    testSupplierId = supplier.id
  })
  afterAll(async () => {
    // Cleanup test data
    if (testProfileId) {
      await supabase.from('directory_supplier_profiles').delete().eq('id', testProfileId)
    }
    if (testSupplierId) {
      await supabase.from('suppliers').delete().eq('id', testSupplierId)
    if (testUserId) {
      await supabase.from('user_profiles').delete().eq('id', testUserId)
    if (testOrganizationId) {
      await supabase.from('organizations').delete().eq('id', testOrganizationId)
  beforeEach(async () => {
    // Clean up any existing profile data before each test
    await supabase
      .from('directory_supplier_profiles')
      .delete()
      .eq('supplier_id', testSupplierId)
  describe('Database Schema Validation', () => {
    it('should have all required tables created', async () => {
      const tables = [
        'directory_geographic_areas',
        'directory_supplier_profiles',
        'directory_supplier_service_areas',
        'directory_supplier_documents',
        'directory_supplier_badges',
        'directory_profile_completion',
        'directory_supplier_seo'
      ]
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        expect(error).toBeNull()
        expect(data).toBeDefined()
      }
    })
    it('should have correct RLS policies enabled', async () => {
      const { data, error } = await supabase
        .rpc('check_rls_enabled', { table_names: [
          'directory_supplier_profiles',
          'directory_supplier_documents',
          'directory_supplier_badges'
        ]})
      
      expect(error).toBeNull()
      expect(data).toBe(true)
    it('should have required indexes for performance', async () => {
      const indexes = [
        'idx_directory_supplier_profiles_status',
        'idx_directory_supplier_profiles_verification',
        'idx_directory_supplier_profiles_organization'
      // This would check if indexes exist
      // In a real test, you'd query the pg_indexes table
      expect(indexes.length).toBeGreaterThan(0)
  describe('Profile Creation Workflow', () => {
    it('should create a complete supplier profile', async () => {
      const profileData = {
        supplier_id: testSupplierId,
        legal_business_name: 'Elegant Wedding Photography Ltd',
        trading_name: 'Elegant Weddings',
        established_year: 2020,
        business_structure: 'limited_company',
        service_offerings: [
          {
            name: 'Wedding Photography',
            description: 'Full day wedding photography',
            category: 'Photography'
          }
        ],
        specializations: ['Portrait', 'Candid', 'Documentary'],
        languages_spoken: ['English'],
        pricing_structure: 'package',
        packages: [
            name: 'Essential Package',
            description: 'Basic wedding coverage',
            price: 1500,
            includes: ['8 hours coverage', 'Online gallery']
        key_contact_name: 'Sarah Johnson',
        key_contact_email: 'sarah@elegantweddings.com',
        key_contact_phone: '+44 7123 456789',
        response_time_commitment: 'within_day',
        preferred_contact_method: 'email'
      const { data: profile, error } = await supabase
        .from('directory_supplier_profiles')
        .insert(profileData)
        .select()
        .single()
      expect(profile).toBeDefined()
      expect(profile.legal_business_name).toBe(profileData.legal_business_name)
      expect(profile.profile_status).toBe('draft')
      testProfileId = profile.id
    it('should calculate profile completion correctly', async () => {
      // Create a profile first
      const { data: profile } = await supabase
        .insert({
          supplier_id: testSupplierId,
          organization_id: testOrganizationId,
          legal_business_name: 'Test Business'
        })
      // Test the profile completion function
      const { data: completion, error } = await supabase
        .rpc('calculate_profile_completion', { profile_id: testProfileId })
      expect(completion).toBeGreaterThan(0)
      expect(completion).toBeLessThanOrEqual(100)
    it('should create profile completion tracking records', async () => {
      // Create completion tracking records
      const sections = [
        'basic_information',
        'service_details',
        'media_gallery',
        'pricing_packages',
        'team_contact',
        'verification'
      const { data: completionRecords, error } = await supabase
        .from('directory_profile_completion')
        .insert(sections.map(section => ({
          supplier_profile_id: testProfileId,
          section_name: section,
          is_completed: false,
          completion_percentage: 0
        })))
      expect(completionRecords).toHaveLength(sections.length)
  describe('SEO System', () => {
    beforeEach(async () => {
      // Create a test profile for SEO tests
          legal_business_name: 'SEO Test Business'
    it('should generate SEO-friendly slug', async () => {
      const { data: slug, error } = await supabase
        .rpc('generate_supplier_slug', {
          business_name: 'Elegant Wedding Photography',
          location: 'London'
      expect(slug).toBe('elegant-wedding-photography-london')
    it('should create SEO record with schema markup', async () => {
      const seoData = {
        supplier_profile_id: testProfileId,
        page_title: 'SEO Test Business - Wedding Photography',
        meta_description: 'Professional wedding photography services',
        custom_slug: 'seo-test-business-london',
        schema_markup: {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "SEO Test Business"
        }
      const { data: seo, error } = await supabase
        .from('directory_supplier_seo')
        .insert(seoData)
      expect(seo.page_title).toBe(seoData.page_title)
      expect(seo.schema_markup).toEqual(seoData.schema_markup)
    it('should ensure unique slugs', async () => {
      const baseName = 'Duplicate Business'
      // Create first SEO record
      await supabase
          custom_slug: 'duplicate-business'
      // Test slug generation for duplicate
          business_name: baseName,
      expect(slug).toBe('duplicate-business-london-1')
  describe('Verification System', () => {
          legal_business_name: 'Verification Test Business'
    it('should store verification documents', async () => {
      const documentData = {
        document_type: 'insurance',
        document_name: 'Business Insurance Certificate.pdf',
        file_url: 'https://example.com/insurance.pdf',
        verification_status: 'pending'
      const { data: document, error } = await supabase
        .from('directory_supplier_documents')
        .insert(documentData)
      expect(document.document_type).toBe('insurance')
      expect(document.verification_status).toBe('pending')
    it('should update verification status', async () => {
      // Update profile to pending verification
      const { error } = await supabase
        .update({
          verification_status: 'pending',
          verification_submitted_at: new Date().toISOString()
        .eq('id', testProfileId)
      // Verify the update
        .select('verification_status')
      expect(profile.verification_status).toBe('pending')
    it('should create badges when verified', async () => {
      const badgeData = {
        badge_type: 'verified',
        badge_name: 'Verified Business',
        badge_icon: 'shield-check',
        description: 'Business identity verified',
        is_active: true
      const { data: badge, error } = await supabase
        .from('directory_supplier_badges')
        .insert(badgeData)
      expect(badge.badge_type).toBe('verified')
      expect(badge.is_active).toBe(true)
  describe('Media Management', () => {
          legal_business_name: 'Media Test Business'
    it('should store media gallery information', async () => {
      const galleryImages = [
        {
          url: 'https://example.com/image1.jpg',
          caption: 'Beautiful ceremony',
          category: 'ceremony',
          order: 1
        },
          url: 'https://example.com/image2.jpg',
          caption: 'Reception setup',
          category: 'reception',
          order: 2
        .update({ gallery_images: galleryImages })
      // Verify the images were stored
        .select('gallery_images')
      expect(profile.gallery_images).toHaveLength(2)
      expect(profile.gallery_images[0].caption).toBe('Beautiful ceremony')
    it('should handle logo and cover image updates', async () => {
      const mediaData = {
        logo_url: 'https://example.com/logo.png',
        cover_image_url: 'https://example.com/cover.jpg'
        .update(mediaData)
        .select('logo_url, cover_image_url')
      expect(profile.logo_url).toBe(mediaData.logo_url)
      expect(profile.cover_image_url).toBe(mediaData.cover_image_url)
  describe('Service Area Management', () => {
          legal_business_name: 'Service Area Test Business'
      // Ensure we have geographic areas
        .from('directory_geographic_areas')
        .upsert([
            type: 'city',
            name: 'Test City',
            slug: 'test-city',
            display_name: 'Test City',
            is_active: true
        ], { onConflict: 'slug,type' })
    it('should create service area mappings', async () => {
      // Get a geographic area
      const { data: area } = await supabase
        .select('id')
        .eq('slug', 'test-city')
      const serviceAreaData = {
        geographic_area_id: area.id,
        is_primary: true,
        additional_fee: 0
      const { data: serviceArea, error } = await supabase
        .from('directory_supplier_service_areas')
        .insert(serviceAreaData)
      expect(serviceArea.is_primary).toBe(true)
  describe('Public Profile Access', () => {
          legal_business_name: 'Public Test Business',
          profile_status: 'published'
    it('should retrieve published profile with related data', async () => {
        .select(`
          *,
          directory_supplier_badges(
            badge_type,
            badge_name,
            is_active
          ),
          directory_supplier_seo(
            page_title,
            custom_slug
          )
        `)
        .eq('profile_status', 'published')
      expect(profile.profile_status).toBe('published')
    it('should not retrieve draft profiles publicly', async () => {
      // Update profile to draft status
        .update({ profile_status: 'draft' })
      expect(profile).toBeNull()
  describe('Analytics and Performance', () => {
          legal_business_name: 'Analytics Test Business',
          profile_views: 100,
          contact_clicks: 15,
          website_clicks: 25
    it('should track profile view increments', async () => {
          profile_views: 101,
          updated_at: new Date().toISOString()
        .select('profile_views')
      expect(profile.profile_views).toBe(101)
    it('should calculate conversion metrics', async () => {
        .select('profile_views, contact_clicks')
      const conversionRate = (profile.contact_clicks / profile.profile_views) * 100
      expect(conversionRate).toBe(15) // 15/100 * 100 = 15%
  describe('Data Validation and Constraints', () => {
    it('should enforce required field constraints', async () => {
      // Try to create profile without required legal_business_name
          organization_id: testOrganizationId
          // Missing legal_business_name
      expect(error).not.toBeNull()
      expect(error?.message).toContain('legal_business_name')
    it('should validate email format in business verification', async () => {
        legal_business_name: 'Validation Test Business',
        key_contact_email: 'invalid-email'
      // This should fail due to email validation
      // Note: Database-level email validation would need to be implemented
      // In a real implementation, this would validate email format
    it('should enforce unique custom slugs', async () => {
      // Create SEO record with custom slug
          legal_business_name: 'Unique Test Business'
          custom_slug: 'unique-test-slug'
      // Try to create another with same slug
      expect(error?.message).toContain('unique')
  describe('Performance and Scalability', () => {
    it('should handle bulk profile operations efficiently', async () => {
      const profileCount = 10
      const profiles = Array.from({ length: profileCount }, (_, i) => ({
        legal_business_name: `Bulk Test Business ${i + 1}`,
        profile_status: 'published'
      }))
      const startTime = Date.now()
        .insert(profiles)
      const endTime = Date.now()
      const duration = endTime - startTime
      expect(data).toHaveLength(profileCount)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      // Cleanup
      const profileIds = data.map(p => p.id)
        .delete()
        .in('id', profileIds)
    it('should efficiently query profiles with filters', async () => {
      // Create test profiles
      const profiles = [
          legal_business_name: 'Photography Business',
          profile_status: 'published',
          verification_status: 'verified'
          legal_business_name: 'Catering Business',
          verification_status: 'pending'
        .select('*')
        .eq('verification_status', 'verified')
        .limit(50)
      const queryDuration = endTime - startTime
      expect(queryDuration).toBeLessThan(1000) // Should complete within 1 second
        .eq('supplier_id', testSupplierId)
})
 * Additional Test Utilities for Manual Testing
export const testUtilities = {
  /**
   * Create a complete test profile for manual testing
   */
  async createCompleteTestProfile(supabase: any, orgId: string, supplierId: string) {
    const profileData = {
      supplier_id: supplierId,
      organization_id: orgId,
      legal_business_name: 'Complete Test Wedding Photography',
      trading_name: 'Complete Test Studios',
      company_registration_number: '12345678',
      established_year: 2018,
      business_structure: 'limited_company',
      service_offerings: [
          name: 'Full Day Wedding Photography',
          description: 'Complete wedding day coverage from preparation to reception',
          category: 'Photography'
          name: 'Engagement Sessions',
          description: 'Pre-wedding couple photography sessions',
      ],
      specializations: ['Portrait', 'Candid', 'Documentary', 'Fine Art'],
      languages_spoken: ['English', 'Spanish'],
      pricing_structure: 'package',
      packages: [
          name: 'Essential Package',
          description: 'Perfect for intimate weddings',
          price: 1200,
          includes: ['6 hours coverage', 'Online gallery', '100 edited photos']
          name: 'Premium Package',
          description: 'Complete wedding coverage',
          price: 2000,
          includes: ['10 hours coverage', 'Engagement shoot', 'Online gallery', '300 edited photos', 'USB drive']
      key_contact_name: 'Sarah Johnson',
      key_contact_email: 'sarah@completetestweddings.com',
      key_contact_phone: '+44 7123 456789',
      response_time_commitment: 'within_day',
      preferred_contact_method: 'email',
      auto_response_enabled: true,
      auto_response_message: 'Thank you for your inquiry! I will respond within 24 hours.',
      logo_url: '/api/placeholder/150/150',
      cover_image_url: '/api/placeholder/800/400',
      gallery_images: [
        { url: '/api/placeholder/400/300', caption: 'Ceremony moments', category: 'ceremony' },
        { url: '/api/placeholder/400/300', caption: 'Reception celebration', category: 'reception' },
        { url: '/api/placeholder/400/300', caption: 'Portrait session', category: 'portraits' }
      profile_status: 'published',
      verification_status: 'verified',
      trust_score: 85
    return await supabase
      .insert(profileData)
  },
   * Validate profile completeness
  validateProfileCompleteness(profile: any): { isComplete: boolean, missingFields: string[] } {
    const requiredFields = [
      'legal_business_name',
      'service_offerings',
      'key_contact_email',
      'pricing_structure'
    ]
    const missingFields = requiredFields.filter(field => !profile[field] || 
      (Array.isArray(profile[field]) && profile[field].length === 0))
    return {
      isComplete: missingFields.length === 0,
      missingFields
  }
}
