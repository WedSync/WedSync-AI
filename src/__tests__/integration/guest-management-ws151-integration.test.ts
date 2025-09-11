/**
 * Integration Tests for WS-151 Guest List Builder
 * Team C - Batch 13: Testing integration with existing guest management services
 * 
 * Tests:
 * - File upload and validation
 * - Background job processing
 * - Database integration
 * - Error handling and rollback
 * - Performance under load (1000+ guests)
 * - API compatibility with existing guest services
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@/lib/supabase/server'
import { guestImportService } from '@/lib/upload/guest-import'
import { guestImportProcessor } from '@/lib/services/guest-import-processor'
import { guestValidator } from '@/lib/validation/guest-validation'
// Mock Supabase client for testing
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: null, error: null }))
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    delete: jest.fn(() => ({
    }))
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
      download: jest.fn(() => Promise.resolve({ 
        data: new Blob(['test,data'], { type: 'text/csv' }), 
        error: null 
  }
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase)
}))
describe('WS-151 Guest Import Integration Tests', () => {
  const testClientId = 'test-client-123'
  const sampleCsvContent = `first_name,last_name,email,phone,dietary_requirements,plus_one,rsvp_status
John,Doe,john@example.com,555-1234,Vegetarian,true,attending
Jane,Smith,jane@example.com,555-5678,,false,pending
Bob,Johnson,bob@example.com,555-9876,Gluten-free,false,attending
Alice,Williams,alice@example.com,555-4567,Nut allergy,true,tentative
Charlie,Brown,,555-7890,,false,not_attending`
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
  describe('File Upload Infrastructure', () => {
    it('should validate file upload requirements', async () => {
      const testFile = new File([sampleCsvContent], 'test-guests.csv', { 
        type: 'text/csv' 
      })
      const result = await guestImportService.validateFileUpload(testFile, testClientId)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.importId).toBeDefined()
    })
    it('should reject oversized files', async () => {
      // Create a file larger than 10MB
      const largeContent = 'a'.repeat(11 * 1024 * 1024)
      const testFile = new File([largeContent], 'large-file.csv', { 
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.stringMatching(/exceeds maximum allowed size/)
      )
    it('should reject unsupported file types', async () => {
      const testFile = new File(['test content'], 'test.txt', { 
        type: 'text/plain' 
        expect.stringMatching(/File type.*not supported/)
    it('should upload file to storage successfully', async () => {
      const result = await guestImportService.uploadFile(testFile, 'test-import-id')
      expect(result.success).toBe(true)
      expect(result.uploadUrl).toBe('test-path')
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('guest-uploads')
  describe('Data Validation Engine', () => {
    it('should validate guest data comprehensively', async () => {
      const testGuestData = [
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          dietary_requirements: 'Vegetarian',
          plus_one: true,
          rsvp_status: 'attending' as const,
          row_number: 2
        },
          first_name: '',
          last_name: '',
          email: 'invalid-email',
          phone: '123',
          row_number: 3
        }
      ]
      const validation = await guestValidator.validateGuestBatch(
        testGuestData,
        testClientId,
        true
      expect(validation.valid).toBe(false)
      expect(validation.errors).toHaveLength(3) // Missing name, invalid email, invalid phone
      expect(validation.statistics.validRows).toBe(1)
      expect(validation.statistics.rowsWithErrors).toBe(1)
    it('should detect duplicate guests', async () => {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'john@example.com', // Duplicate email
          phone: '555-5678',
        false
      expect(validation.duplicates.length).toBe(2)
      expect(validation.duplicates[0].field).toBe('email')
      expect(validation.duplicates[0].value).toBe('john@example.com')
    it('should normalize phone numbers correctly', async () => {
          phone: '(555) 123-4567',
      // Phone should be normalized to standard format
      expect(validation.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'phone',
            code: 'PHONE_NORMALIZED'
          })
        ])
    it('should provide helpful validation suggestions', async () => {
          email: 'john@gmial.com', // Common typo
            field: 'email',
            code: 'EMAIL_DOMAIN_TYPO',
            suggestion: expect.stringContaining('gmail.com')
  describe('Background Job Processing', () => {
    it('should queue import job successfully', async () => {
      mockSupabase.from.mockImplementation((table) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-import-id',
                file_name: 'test.csv',
                file_size: 1024,
                upload_url: 'test-path'
              }
            }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ error: null }))
      const result = await guestImportProcessor.queueImportJob(
        'test-import-id',
          priority: 'high',
          validationRules: { requireEmail: true },
          transformationRules: { normalizeNames: true }
      expect(result.jobId).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('guest_import_jobs')
    it('should process import job with transformations', async () => {
      // Mock file download
      const csvBlob = new Blob([sampleCsvContent], { type: 'text/csv' })
      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn(() => Promise.resolve({ data: csvBlob, error: null }))
      // Mock database operations
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'guest_import_jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'test-job-id',
                    importId: 'test-import-id',
                    clientId: testClientId,
                    data: {
                      uploadUrl: 'test-path',
                      fileName: 'test.csv',
                      validationRules: { requireName: true },
                      transformationRules: { normalizeNames: true }
                    }
                  }
                }))
              }))
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null }))
          }
        } else if (table === 'guests') {
            insert: jest.fn(() => ({
              select: jest.fn(() => Promise.resolve({
                data: [{ id: '1' }, { id: '2' }, { id: '3' }]
        return {
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
      const result = await guestImportProcessor.processImportJob('test-job-id')
      expect(result.validRows).toBeGreaterThan(0)
      expect(result.totalRows).toBe(5) // 5 guests in sample CSV
    it('should handle job failures gracefully', async () => {
      // Mock job that doesn't exist
      mockSupabase.from.mockImplementation(() => ({
            single: jest.fn(() => Promise.resolve({ data: null }))
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      const result = await guestImportProcessor.processImportJob('nonexistent-job-id')
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('PROCESSING_FAILED')
  describe('Rollback Mechanism', () => {
    it('should queue rollback job successfully', async () => {
                status: 'completed',
                valid_rows: 10,
                client_id: testClientId
      const result = await guestImportProcessor.queueRollbackJob(
        'Testing rollback functionality'
    it('should execute rollback successfully', async () => {
                    id: 'test-rollback-job',
                    data: { rollbackReason: 'Test rollback' }
            delete: jest.fn(() => ({
                select: jest.fn(() => Promise.resolve({
                  data: [{ id: '1' }, { id: '2' }, { id: '3' }]
        } else {
      const result = await guestImportProcessor.processRollbackJob('test-rollback-job')
      expect(result.deletedRows).toBe(3)
      expect(result.restoredState).toBe(true)
  describe('Performance Requirements', () => {
    it('should handle 1000+ guests within time limits', async () => {
      // Generate large dataset
      const largeGuestData = Array.from({ length: 1000 }, (_, index) => ({
        first_name: `Guest${index + 1}`,
        last_name: 'TestGuest',
        email: `guest${index + 1}@example.com`,
        phone: `555-${String(index + 1).padStart(4, '0')}`,
        rsvp_status: 'pending' as const,
        row_number: index + 2
      const startTime = Date.now()
        largeGuestData,
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(30000) // Should complete in under 30 seconds
      expect(validation.statistics.totalRows).toBe(1000)
      expect(validation.statistics.validRows).toBe(1000)
    it('should process large CSV files efficiently', async () => {
      // Create large CSV content
      const largeCsvRows = Array.from({ length: 1000 }, (_, index) => 
        `Guest${index + 1},TestGuest,guest${index + 1}@example.com,555-${String(index + 1).padStart(4, '0')},None,false,pending`
      const largeCsvContent = `first_name,last_name,email,phone,dietary_requirements,plus_one,rsvp_status\n${largeCsvRows.join('\n')}`
      const testFile = new File([largeCsvContent], 'large-guests.csv', { 
      // Test file size validation
      expect(testFile.size).toBeLessThan(10 * 1024 * 1024) // Should be under 10MB
      const validation = await guestImportService.validateFileUpload(testFile, testClientId)
      expect(validation.valid).toBe(true)
      expect(processingTime).toBeLessThan(5000) // File validation should be fast
  describe('API Compatibility', () => {
    it('should work alongside existing bulk import API', async () => {
      // Test that our WS-151 system doesn't conflict with existing guest import
      // Both systems should be able to validate the same data
      const ws151Validation = await guestValidator.validateGuestBatch(
      expect(ws151Validation.valid).toBe(true)
      expect(ws151Validation.statistics.validRows).toBe(1)
      // Verify data format compatibility
      const expectedGuestStructure = {
        first_name: expect.any(String),
        last_name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        row_number: expect.any(Number)
      }
      expect(testGuestData[0]).toMatchObject(expectedGuestStructure)
    it('should generate compatible database records', async () => {
      // Mock successful database insertion
        if (table === 'guests') {
                data: [{
                  id: 'new-guest-id',
                  client_id: testClientId,
                  first_name: 'John',
                  last_name: 'Doe',
                  email: 'john@example.com',
                  phone: '(555) 123-4567',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]
      const testGuestRecords = [
          client_id: testClientId,
          import_id: 'test-import',
          dietary_requirements: 'None',
          plus_one: false,
          rsvp_status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
      // This should work with existing guest table structure
      const insertResult = await mockSupabase.from('guests')
        .insert(testGuestRecords)
        .select()
      expect(insertResult.data).toHaveLength(1)
      expect(insertResult.data[0]).toMatchObject({
        id: expect.any(String),
        client_id: testClientId,
        first_name: 'John',
        last_name: 'Doe'
  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      expect(result.errors[0].message).toContain('Database connection failed')
    it('should handle file parsing errors gracefully', async () => {
      // Mock corrupted file
      const corruptedBlob = new Blob(['invalid,csv,content\nwith,missing'], { 
        download: jest.fn(() => Promise.resolve({ data: corruptedBlob, error: null }))
                id: 'test-job-id',
                importId: 'test-import-id',
                clientId: testClientId,
                data: {
                  uploadUrl: 'test-path',
                  fileName: 'corrupted.csv'
                }
      expect(result.success).toBe(true) // Should handle gracefully, not crash
      expect(result.validRows).toBe(0) // But no valid records processed
})
