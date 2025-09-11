/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, POST, PUT } from '@/app/api/contracts/[id]/milestones/route'
import { createClient } from '@/lib/supabase/server'
// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))
describe('/api/contracts/[id]/milestones', () => {
  let mockSupabase: any
  let mockUser: any
  let mockProfile: any
  let mockContract: any
  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }
    
    mockProfile = {
      organization_id: 'org-123'
    mockContract = {
      id: 'contract-123',
      title: 'Test Contract',
      contract_number: 'CON-2025-001',
      total_amount: 2500.00,
      currency: 'GBP'
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser }
        })
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })
  afterEach(() => {
    vi.clearAllMocks()
  describe('GET /api/contracts/[id]/milestones', () => {
    it('should return milestones for a contract', async () => {
      const mockMilestones = [
        {
          id: 'milestone-1',
          milestone_name: 'Deposit Payment',
          amount: 500.00,
          due_date: '2025-01-22',
          status: 'pending'
        }
      ]
      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockContract })
        .mockResolvedValue({ data: mockMilestones, error: null })
      const request = new NextRequest('http://localhost/api/contracts/contract-123/milestones')
      const response = await GET(request, { params: { id: 'contract-123' } })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.milestones).toEqual(mockMilestones)
      expect(mockSupabase.order).toHaveBeenCalledWith('sequence_order', { ascending: true })
    })
    it('should return 404 when contract not found', async () => {
        .mockResolvedValueOnce({ data: null })
      const request = new NextRequest('http://localhost/api/contracts/nonexistent/milestones')
      const response = await GET(request, { params: { id: 'nonexistent' } })
      expect(response.status).toBe(404)
      expect(data.error).toBe('Contract not found')
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      })
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
  describe('POST /api/contracts/[id]/milestones', () => {
    const validMilestoneData = {
      milestone_name: 'Progress Payment',
      description: 'Mid-project payment',
      milestone_type: 'progress_payment',
      sequence_order: 2,
      amount: 1000.00,
      percentage_of_total: 40,
      currency: 'GBP',
      due_date: '2025-03-15T00:00:00.000Z',
      grace_period_days: 5,
      reminder_days_before: 7,
      auto_reminder_enabled: true,
      notes: 'Payment due upon delivery of initial drafts'
    beforeEach(() => {
        .mockResolvedValueOnce({ data: null }) // No existing milestone with same sequence
        .mockResolvedValueOnce({ // Created milestone
          data: { 
            id: 'milestone-123',
            ...validMilestoneData,
            contract_id: 'contract-123',
            organization_id: 'org-123'
          }
      mockSupabase.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              id: 'milestone-123',
              ...validMilestoneData
            }
          })
    it('should create a milestone successfully', async () => {
      const request = new NextRequest('http://localhost/api/contracts/contract-123/milestones', {
        method: 'POST',
        body: JSON.stringify(validMilestoneData)
      const response = await POST(request, { params: { id: 'contract-123' } })
      expect(response.status).toBe(201)
      expect(data.milestone).toBeDefined()
      expect(data.milestone.milestone_name).toBe(validMilestoneData.milestone_name)
    it('should create an alert for the milestone', async () => {
      await POST(request, { params: { id: 'contract-123' } })
      expect(mockSupabase.from).toHaveBeenCalledWith('contract_alerts')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'payment_due',
          title: `Payment Due: ${validMilestoneData.milestone_name}`,
          priority: 'medium',
          status: 'scheduled'
      )
    it('should validate milestone amount against contract total', async () => {
      const invalidData = { ...validMilestoneData, amount: 5000.00 } // Exceeds contract total
        body: JSON.stringify(invalidData)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Milestone amount cannot exceed contract total amount')
    it('should validate unique sequence order', async () => {
        .mockResolvedValueOnce({ data: { id: 'existing-milestone' } }) // Existing milestone
      expect(data.error).toBe('Sequence order already exists. Please use a different order.')
    it('should validate required fields', async () => {
      const invalidData = { ...validMilestoneData }
      delete invalidData.milestone_name
      delete invalidData.amount
      expect(data.error).toBe('Invalid input')
    it('should validate milestone type enum', async () => {
      const invalidData = { ...validMilestoneData, milestone_type: 'invalid_type' }
    it('should validate positive sequence order', async () => {
      const invalidData = { ...validMilestoneData, sequence_order: 0 }
  describe('PUT /api/contracts/[id]/milestones', () => {
    const updateData = {
      milestone_id: 'milestone-123',
      status: 'paid',
      paid_amount: 500.00,
      paid_date: '2025-01-20T00:00:00.000Z',
      payment_reference: 'REF-123',
      payment_method: 'bank_transfer'
        .mockResolvedValueOnce({ 
            amount: 500.00,
            paid_amount: 0,
            milestone_name: 'Deposit Payment'
        .mockResolvedValueOnce({
            ...updateData,
      mockSupabase.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    id: 'milestone-123',
                    ...updateData
                  }
                })
              })
            })
    it('should update a milestone successfully', async () => {
        method: 'PUT',
        body: JSON.stringify(updateData)
      const response = await PUT(request, { params: { id: 'contract-123' } })
      expect(data.milestone.status).toBe(updateData.status)
    it('should create alert when milestone is marked as paid', async () => {
      await PUT(request, { params: { id: 'contract-123' } })
          alert_type: 'milestone_approaching',
          title: expect.stringContaining('Payment Received'),
          priority: 'low',
          status: 'sent'
    it('should validate paid amount does not exceed milestone amount', async () => {
      const invalidData = { ...updateData, paid_amount: 1000.00 } // Exceeds milestone amount
      expect(data.error).toBe('Paid amount cannot exceed milestone amount')
    it('should return 404 when milestone not found', async () => {
      expect(data.error).toBe('Milestone not found')
    it('should validate status enum values', async () => {
      const invalidData = { ...updateData, status: 'invalid_status' }
    it('should handle date formatting correctly', async () => {
      expect(mockSupabase.update).toHaveBeenCalledWith(
          paid_date: '2025-01-20'
})
