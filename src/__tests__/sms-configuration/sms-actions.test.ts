import { describe, it, expect, jest, beforeEach } from 'vitest'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import {
  createSMSTemplate,
  updateSMSTemplate,
  validateSMSTemplate,
  getSMSTemplates,
  bulkUpdateSMSTemplates
} from '@/app/actions/sms-templates'
import type { SMSTemplate } from '@/types/sms'

// Mock Next.js server functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))
// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockResolvedValue({ error: null })
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
// Mock SMS Service
vi.mock('@/lib/services/sms-service', () => ({
  SMSService: vi.fn().mockImplementation(() => ({
    calculateSMSMetrics: vi.fn().mockReturnValue({
      character_count: 85,
      segment_count: 1,
      character_limit: 160,
      has_unicode: false,
      encoding: 'GSM 7-bit',
      estimated_cost: 0.0075
    }),
    validateSMSMessage: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      compliance_issues: []
  }))
describe('SMS Template Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  const mockTemplateData = {
    name: 'Test Payment Reminder',
    content: 'Hi {{client_first_name}}, your payment of {{amount}} is due on {{due_date}}. Reply STOP to opt out.',
    category: 'payment_reminder' as const,
    status: 'draft' as const,
    description: 'Payment reminder template for wedding vendors',
    opt_out_required: true,
    tcpa_compliant: true,
    consent_required: true
  }
  describe('createSMSTemplate', () => {
    it('should create SMS template successfully', async () => {
      const mockCreatedTemplate = {
        id: 'new-template-id',
        ...mockTemplateData,
        user_id: 'test-user-id',
        created_by: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        is_favorite: false,
        variables: ['client_first_name', 'amount', 'due_date'],
        character_count: 85,
        segment_count: 1,
        character_limit: 160,
        metadata: {
          description: mockTemplateData.description
        }
      }
      mockSupabaseClient.single.mockResolvedValue({
        data: mockCreatedTemplate,
        error: null
      })
      const result = await createSMSTemplate(mockTemplateData)
      expect(result).toEqual(mockCreatedTemplate)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sms_templates')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockTemplateData.name,
          content: mockTemplateData.content,
          category: mockTemplateData.category,
          tcpa_compliant: mockTemplateData.tcpa_compliant
        })
      )
    it('should validate template before creating', async () => {
      const invalidTemplate = {
        name: '', // Invalid: empty name
        content: 'A'.repeat(2000) // Invalid: too long
      await expect(createSMSTemplate(invalidTemplate)).rejects.toThrow()
    it('should extract variables from template content', async () => {
      const contentWithVariables = 'Hello {{name}}, your {{event_type}} on {{date}} costs {{price}}.'
      const templateData = {
        content: contentWithVariables
        data: { id: 'test-id', ...templateData },
      await createSMSTemplate(templateData)
          variables: expect.arrayContaining(['name', 'event_type', 'date', 'price'])
  describe('updateSMSTemplate', () => {
    it('should update SMS template successfully', async () => {
      const updates = {
        name: 'Updated Payment Reminder',
        content: 'Updated content with {{new_variable}}. Reply STOP to opt out.',
        tcpa_compliant: true
      const mockUpdatedTemplate = {
        id: 'template-id',
        ...updates,
        updated_at: new Date().toISOString()
        data: mockUpdatedTemplate,
      const result = await updateSMSTemplate('template-id', updates)
      expect(result).toEqual(mockUpdatedTemplate)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
          name: updates.name,
          content: updates.content,
          character_count: 85, // From mocked metrics
          segment_count: 1
    it('should recalculate metrics when content changes', async () => {
        content: 'New content here'
        data: { id: 'template-id', ...updates },
      await updateSMSTemplate('template-id', updates)
      // Verify metrics were calculated and included in update
          character_count: 85,
  describe('validateSMSTemplate', () => {
    it('should validate template content', async () => {
      const content = 'Test message with opt-out. Reply STOP to opt out.'
        opt_out_required: true,
      const result = await validateSMSTemplate(content, templateData)
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
        compliance_issues: []
  describe('getSMSTemplates', () => {
    it('should fetch SMS templates with filters', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Welcome Template',
          category: 'welcome',
          status: 'active',
          tcpa_compliant: true
        },
          id: 'template-2',
          name: 'Payment Reminder',
          category: 'payment_reminder',
          status: 'draft',
          tcpa_compliant: false
      ]
      mockSupabaseClient.single = vi.fn() // Reset single for this test
      const mockQuery = {
        data: mockTemplates,
        error: null,
        count: 2
      // Mock the query chain
      mockSupabaseClient.range.mockResolvedValue(mockQuery)
      const filters = {
        categories: ['welcome', 'payment_reminder'],
        statuses: ['active'],
        page: 1,
        limit: 10
      const result = await getSMSTemplates(filters)
      expect(result.templates).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.totalPages).toBe(1)
      
      // Verify filters were applied
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('category', filters.categories)
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', filters.statuses)
    it('should handle search filters', async () => {
        search: 'payment reminder'
      mockSupabaseClient.range.mockResolvedValue({
        data: [],
        count: 0
      await getSMSTemplates(filters)
      expect(mockSupabaseClient.or).toHaveBeenCalledWith(
        expect.stringContaining('payment reminder')
    it('should handle compliance filters', async () => {
        complianceFilter: 'tcpa_compliant' as const
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tcpa_compliant', true)
  describe('bulkUpdateSMSTemplates', () => {
    it('should handle bulk activation', async () => {
      const action = {
        type: 'activate' as const,
        templateIds: ['template-1', 'template-2']
      mockSupabaseClient.in.mockResolvedValue({ error: null })
      await bulkUpdateSMSTemplates(action)
          status: 'active'
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('id', action.templateIds)
    it('should handle bulk compliance marking', async () => {
        type: 'mark_compliant' as const,
        templateIds: ['template-1', 'template-2'],
          tcpa_compliant: true,
          opt_out_required: true
    it('should handle bulk deletion', async () => {
        type: 'delete' as const,
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    it('should throw error for unknown action type', async () => {
        type: 'unknown_action' as any,
        templateIds: ['template-1']
      await expect(bulkUpdateSMSTemplates(action)).rejects.toThrow(
        'Unknown bulk action: unknown_action'
  describe('Error Handling', () => {
    it('should handle Supabase errors', async () => {
        data: null,
        error: { message: 'Database error' }
      await expect(createSMSTemplate(mockTemplateData)).rejects.toThrow('Database error')
    it('should handle validation errors', async () => {
      const invalidData = {
        name: 'A'.repeat(300), // Too long
        content: '',  // Empty
        category: 'invalid_category' as any
      await expect(createSMSTemplate(invalidData)).rejects.toThrow()
  describe('Authentication', () => {
    it('should require authenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      await expect(createSMSTemplate(mockTemplateData)).rejects.toThrow('User not authenticated')
})
