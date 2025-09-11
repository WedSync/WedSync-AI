import { ScheduleApprovalWorkflowService } from '../schedule-approval-workflow-service'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { ScheduleChangeRequest, ApprovalRule, WorkflowStep } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/email/supplier-schedule-service')
// Mock data
const mockChangeRequest: Omit<ScheduleChangeRequest, 'id' | 'created_at' | 'expires_at' | 'approval_status' | 'couple_notification_sent' | 'reminder_count'> = {
  supplier_id: 'supplier-1',
  organization_id: 'org-1',
  client_id: 'client-1',
  event_id: 'event-1',
  change_type: 'time_update',
  original_values: {
    start_time: '2024-06-15T10:00:00Z',
    end_time: '2024-06-15T18:00:00Z'
  },
  requested_values: {
    start_time: '2024-06-15T11:00:00Z',
    end_time: '2024-06-15T19:00:00Z'
  change_reason: 'Traffic delay - need to start 1 hour later',
  urgency_level: 'medium',
  business_justification: 'Unavoidable traffic situation',
  supplier_notes: 'Will still deliver full 8-hour service',
  requested_by: 'supplier-1',
  approval_required: true
}
const mockApprovalRules: ApprovalRule[] = [
  {
    rule_id: 'auto-approve-minor',
    rule_name: 'Auto-approve minor time changes',
    rule_type: 'time_change',
    conditions: {
      max_time_change_hours: 2,
      min_notice_hours: 24,
      urgency_levels: ['low', 'medium']
    },
    action: 'auto_approve',
    requires_manual_review: false,
    organization_id: 'org-1'
    rule_id: 'require-approval-major',
    rule_name: 'Require approval for major changes',
      max_time_change_hours: 4,
      urgency_levels: ['high', 'urgent']
    action: 'require_approval',
    requires_manual_review: true,
  }
]
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
describe('ScheduleApprovalWorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })
  describe('createScheduleChangeRequest', () => {
    it('should create change request and auto-approve if rules allow', async () => {
      // Mock approval rules query
      mockSupabaseClient.data = mockApprovalRules
      mockSupabaseClient.error = null
      // Mock change request insertion
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { 
          id: 'request-123',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        error: null
      })
      const result = await ScheduleApprovalWorkflowService.createScheduleChangeRequest(
        mockChangeRequest,
        'org-1'
      )
      expect(result.success).toBe(true)
      expect(result.request_id).toBe('request-123')
      expect(result.auto_approved).toBe(true)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        ...mockChangeRequest,
        approval_status: 'auto_approved',
        created_at: expect.any(String),
        expires_at: expect.any(String),
        couple_notification_sent: false,
        reminder_count: 0
    })
    it('should require manual approval for major changes', async () => {
      const majorChangeRequest = {
        original_values: { start_time: '2024-06-15T10:00:00Z' },
        requested_values: { start_time: '2024-06-15T15:00:00Z' }, // 5-hour change
        urgency_level: 'high' as const
      }
          id: 'request-major',
        majorChangeRequest,
      expect(result.auto_approved).toBe(false)
      expect(result.requires_couple_approval).toBe(true)
        ...majorChangeRequest,
        approval_status: 'pending_approval',
    it('should handle urgent requests with immediate notification', async () => {
      const urgentRequest = {
        urgency_level: 'urgent' as const,
        change_reason: 'Emergency - photographer unavailable due to illness'
          id: 'request-urgent',
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2-hour expiry
        urgentRequest,
      expect(result.immediate_notification_sent).toBe(true)
      expect(result.expires_in_hours).toBe(2)
    it('should validate change request data', async () => {
      const invalidRequest = {
        change_type: undefined as any
        invalidRequest,
      expect(result.success).toBe(false)
      expect(result.error).toContain('Change type is required')
    it('should handle database errors', async () => {
        data: null,
        error: { message: 'Database constraint violation' }
      expect(result.error).toContain('Database constraint violation')
  describe('processCoupleResponse', () => {
    const mockRequestId = 'request-123'
    it('should approve change request successfully', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: mockRequestId,
            approval_status: 'pending_approval',
            supplier_id: 'supplier-1',
            event_id: 'event-1',
            requested_values: { start_time: '11:00' }
          },
          error: null
        })
          data: { id: mockRequestId, approval_status: 'approved' },
      const result = await ScheduleApprovalWorkflowService.processCoupleResponse(
        mockRequestId,
        'approved',
        'client-1',
        'org-1',
        'Sounds good, thanks for letting us know!'
      expect(result.new_status).toBe('approved')
      expect(result.schedule_updated).toBe(true)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        approval_status: 'approved',
        couple_response: 'Sounds good, thanks for letting us know!',
        couple_response_at: expect.any(String),
        responded_by: 'client-1'
    it('should decline change request successfully', async () => {
            supplier_id: 'supplier-1'
          data: { id: mockRequestId, approval_status: 'declined' },
        'declined',
        'Sorry, we cannot accommodate this change. Please keep original time.'
      expect(result.new_status).toBe('declined')
      expect(result.schedule_updated).toBe(false)
      expect(result.alternative_required).toBe(true)
    it('should handle already processed requests', async () => {
        data: {
          id: mockRequestId,
          approval_status: 'approved',
          couple_response_at: '2024-01-01T12:00:00Z'
      expect(result.error).toContain('Request has already been processed')
    it('should handle expired requests', async () => {
          approval_status: 'pending_approval',
          expires_at: new Date(Date.now() - 60000).toISOString() // Expired 1 minute ago
      expect(result.error).toContain('Request has expired')
  describe('getApprovalWorkflowStatus', () => {
    it('should return workflow status successfully', async () => {
      const mockWorkflowData = {
        id: 'request-123',
        created_at: '2024-01-01T10:00:00Z',
        expires_at: '2024-01-02T10:00:00Z',
        change_type: 'time_update',
        urgency_level: 'medium',
        supplier: { name: 'John Photography', email: 'john@photo.com' },
        workflow_steps: [
          { step_name: 'Created', completed_at: '2024-01-01T10:00:00Z', status: 'completed' },
          { step_name: 'Couple Notification', completed_at: '2024-01-01T10:05:00Z', status: 'completed' },
          { step_name: 'Awaiting Response', status: 'pending' }
        ]
      mockSupabaseClient.single.mockResolvedValue({
        data: mockWorkflowData,
      const result = await ScheduleApprovalWorkflowService.getApprovalWorkflowStatus(
        'request-123',
      expect(result.workflow_status).toBeDefined()
      expect(result.workflow_status!.approval_status).toBe('pending_approval')
      expect(result.workflow_status!.time_remaining_hours).toBeGreaterThan(0)
      expect(result.workflow_status!.workflow_steps).toHaveLength(3)
    it('should handle non-existent requests', async () => {
        'non-existent',
      expect(result.error).toContain('Approval request not found')
  describe('sendApprovalReminder', () => {
    it('should send reminder for pending requests', async () => {
            id: 'request-123',
            reminder_count: 0,
            expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
            client: { email: 'couple@wedding.com' },
            supplier: { name: 'John Photography' }
          data: { reminder_count: 1 },
      const result = await ScheduleApprovalWorkflowService.sendApprovalReminder(
      expect(result.reminder_sent).toBe(true)
        reminder_count: 1,
        last_reminder_sent_at: expect.any(String)
    it('should not send reminders for resolved requests', async () => {
          reminder_count: 0
      expect(result.reminder_sent).toBe(false)
      expect(result.reason).toContain('already resolved')
    it('should respect maximum reminder limit', async () => {
          reminder_count: 3, // At maximum
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      expect(result.reason).toContain('maximum reminders reached')
  describe('getOrganizationApprovalWorkflow', () => {
    const mockWorkflowData = [
      {
        id: 'request-1',
        supplier: { name: 'John Photography' }
      },
        id: 'request-2',
        created_at: '2024-01-01T09:00:00Z',
        urgency_level: 'low',
        supplier: { name: 'Elite Catering' }
    ]
    it('should retrieve organization workflow overview', async () => {
      mockSupabaseClient.data = mockWorkflowData
      const result = await ScheduleApprovalWorkflowService.getOrganizationApprovalWorkflow(
        { include_resolved: true }
      expect(result.workflow_overview).toBeDefined()
      expect(result.workflow_overview!.total_requests).toBe(2)
      expect(result.workflow_overview!.pending_requests).toBe(1)
      expect(result.workflow_overview!.approved_requests).toBe(1)
      expect(result.workflow_overview!.requests).toHaveLength(2)
    it('should filter by status', async () => {
      mockSupabaseClient.data = [mockWorkflowData[0]] // Only pending
        { 
          status_filter: 'pending_approval',
          include_resolved: false 
        }
      expect(result.workflow_overview!.requests).toHaveLength(1)
      expect(result.workflow_overview!.requests[0].approval_status).toBe('pending_approval')
    it('should filter by urgency level', async () => {
      mockSupabaseClient.data = [mockWorkflowData[0]] // Only medium urgency
        { urgency_filter: 'medium' }
      expect(result.workflow_overview!.requests[0].urgency_level).toBe('medium')
  describe('approval rule evaluation', () => {
    it('should correctly evaluate auto-approval rules', () => {
      const minorChange = {
        original_values: { start_time: '10:00' },
        requested_values: { start_time: '10:30' }, // 30-minute change
        urgency_level: 'low' as const
      const result = ScheduleApprovalWorkflowService.evaluateApprovalRules(
        minorChange,
        mockApprovalRules
      expect(result.should_auto_approve).toBe(true)
      expect(result.matching_rule).toBe('auto-approve-minor')
      expect(result.requires_manual_review).toBe(false)
    it('should require approval for rule violations', () => {
      const majorChange = {
        requested_values: { start_time: '15:00' }, // 5-hour change
        majorChange,
      expect(result.should_auto_approve).toBe(false)
      expect(result.matching_rule).toBe('require-approval-major')
      expect(result.requires_manual_review).toBe(true)
    it('should handle no matching rules', () => {
      const uniqueChange = {
        change_type: 'location_change' as any,
        urgency_level: 'medium' as const
        uniqueChange,
      expect(result.matching_rule).toBeNull()
      expect(result.reason).toContain('No matching approval rules')
  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Connection timeout'))
      expect(result.error).toContain('Connection timeout')
    it('should validate organization access', async () => {
        '' // Empty org ID
      expect(result.error).toContain('Organization ID is required')
    it('should handle invalid approval responses', async () => {
          approval_status: 'pending_approval'
        'invalid_response' as any,
      expect(result.error).toContain('Invalid approval response')
  describe('workflow step tracking', () => {
    it('should track workflow steps correctly', async () => {
      const steps = ScheduleApprovalWorkflowService.createWorkflowSteps(
        'time_update',
        'medium'
      expect(steps).toContainEqual(
        expect.objectContaining({
          step_name: 'Request Created',
          step_type: 'system',
          required: true
          step_name: 'Couple Notification',
          step_type: 'notification',
          step_name: 'Awaiting Approval',
          step_type: 'approval',
    it('should include urgent steps for high-priority requests', () => {
      const urgentSteps = ScheduleApprovalWorkflowService.createWorkflowSteps(
        'cancellation',
        'urgent'
      expect(urgentSteps).toContainEqual(
          step_name: 'Immediate Notification',
          step_type: 'urgent_notification',
})
