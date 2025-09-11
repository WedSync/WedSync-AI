/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/contracts/[id]/deliverables/route'
import { createClient } from '@/lib/supabase/server'
// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))
describe('/api/contracts/[id]/deliverables', () => {
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
      service_start_date: '2025-06-15'
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
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })
  afterEach(() => {
    vi.clearAllMocks()
  describe('GET /api/contracts/[id]/deliverables', () => {
    it('should return deliverables for a contract', async () => {
      const mockDeliverables = [
        {
          id: 'deliverable-1',
          deliverable_name: 'Photography Package',
          due_date: '2025-06-10',
          status: 'pending',
          assigned_user: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          }
        }
      ]
      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockContract })
        .mockResolvedValue({ data: mockDeliverables, error: null })
      const request = new NextRequest('http://localhost/api/contracts/contract-123/deliverables')
      const response = await GET(request, { params: { id: 'contract-123' } })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.deliverables).toEqual(mockDeliverables)
      expect(mockSupabase.order).toHaveBeenCalledWith('due_date', { ascending: true })
    })
    it('should filter deliverables by status', async () => {
        .mockResolvedValue({ data: [], error: null })
      const request = new NextRequest('http://localhost/api/contracts/contract-123/deliverables?status=completed')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'completed')
    it('should filter deliverables by assigned user', async () => {
      const request = new NextRequest('http://localhost/api/contracts/contract-123/deliverables?assigned_to=user-456')
      expect(mockSupabase.eq).toHaveBeenCalledWith('assigned_to', 'user-456')
  describe('POST /api/contracts/[id]/deliverables', () => {
    const validDeliverableData = {
      deliverable_name: 'Wedding Album Design',
      description: 'Create custom wedding photo album',
      deliverable_type: 'document',
      category: 'photography',
      due_date: '2025-06-01T00:00:00.000Z',
      estimated_hours: 8,
      dependency_ids: [],
      priority: 'high',
      requirements: 'High-resolution photos, custom layout',
      acceptance_criteria: 'Client approval required',
      assigned_to: 'user-456',
      assigned_team: 'Design Team',
      reminder_enabled: true,
      reminder_days_before: 5,
      escalation_enabled: false
    beforeEach(() => {
        .mockResolvedValueOnce({ data: { id: 'user-456' } }) // Assigned user exists
        .mockResolvedValueOnce({ // Created deliverable
          data: { 
            id: 'deliverable-123',
            ...validDeliverableData,
            contract_id: 'contract-123',
            organization_id: 'org-123'
      mockSupabase.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              id: 'deliverable-123',
              ...validDeliverableData
            }
          })
      })
    it('should create a deliverable successfully', async () => {
      const request = new NextRequest('http://localhost/api/contracts/contract-123/deliverables', {
        method: 'POST',
        body: JSON.stringify(validDeliverableData)
      const response = await POST(request, { params: { id: 'contract-123' } })
      expect(response.status).toBe(201)
      expect(data.deliverable).toBeDefined()
      expect(data.deliverable.deliverable_name).toBe(validDeliverableData.deliverable_name)
    it('should validate due date against service start date', async () => {
      const invalidData = { 
        ...validDeliverableData, 
        due_date: '2025-06-20T00:00:00.000Z' // After service start date
      }
        body: JSON.stringify(invalidData)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Deliverable due date cannot be after service start date')
    it('should validate dependency deliverable IDs exist', async () => {
      const dataWithDependencies = { 
        dependency_ids: ['non-existent-id']
        .mockResolvedValue({ data: [] }) // No dependencies found
        body: JSON.stringify(dataWithDependencies)
      expect(data.error).toBe('One or more dependency deliverables do not exist')
    it('should validate assigned user exists in organization', async () => {
        .mockResolvedValueOnce({ data: null }) // Assigned user not found
      expect(data.error).toBe('Assigned user not found in organization')
    it('should create alert when reminder enabled', async () => {
      await POST(request, { params: { id: 'contract-123' } })
      expect(mockSupabase.from).toHaveBeenCalledWith('contract_alerts')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_type: 'deliverable_due',
          title: `Deliverable Due: ${validDeliverableData.deliverable_name}`,
          priority: 'medium'
      )
    it('should validate deliverable type enum', async () => {
      const invalidData = { ...validDeliverableData, deliverable_type: 'invalid_type' }
      expect(data.error).toBe('Invalid input')
    it('should validate priority enum', async () => {
      const invalidData = { ...validDeliverableData, priority: 'invalid_priority' }
  describe('PUT /api/contracts/[id]/deliverables', () => {
    const updateData = {
      deliverable_id: 'deliverable-123',
      status: 'completed',
      progress_percentage: 100,
      completed_date: '2025-01-20T00:00:00.000Z',
      approved_by: 'user-789',
      quality_score: 5,
      review_notes: 'Excellent work, meets all requirements'
        .mockResolvedValueOnce({ 
            status: 'in_progress',
            progress_percentage: 80,
            assigned_to: 'user-456'
      mockSupabase.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    id: 'deliverable-123',
                    deliverable_name: 'Test Deliverable',
                    ...updateData
                  }
                })
              })
            })
    it('should update a deliverable successfully', async () => {
        method: 'PUT',
        body: JSON.stringify(updateData)
      const response = await PUT(request, { params: { id: 'contract-123' } })
      expect(data.deliverable.status).toBe(updateData.status)
    it('should auto-set completed status when progress is 100%', async () => {
      const progressUpdate = {
        deliverable_id: 'deliverable-123',
        progress_percentage: 100
        body: JSON.stringify(progressUpdate)
      await PUT(request, { params: { id: 'contract-123' } })
      expect(mockSupabase.update).toHaveBeenCalledWith(
          status: 'completed',
          progress_percentage: 100,
          completed_date: expect.any(String)
    it('should prevent user from approving their own deliverable', async () => {
      const selfApprovalData = {
        ...updateData,
        approved_by: 'user-456' // Same as assigned_to
        body: JSON.stringify(selfApprovalData)
      expect(data.error).toBe('User cannot approve their own deliverable')
    it('should create alert when status changes to completed', async () => {
          title: expect.stringContaining('Deliverable Completed'),
          priority: 'low'
    it('should create alert when review is required', async () => {
      const reviewData = {
        status: 'review_required'
        body: JSON.stringify(reviewData)
          title: expect.stringContaining('Review Required'),
    it('should validate progress percentage range', async () => {
      const invalidData = { ...updateData, progress_percentage: 150 }
    it('should validate quality score range', async () => {
      const invalidData = { ...updateData, quality_score: 6 }
  describe('DELETE /api/contracts/[id]/deliverables', () => {
    it('should delete a deliverable successfully', async () => {
        .mockResolvedValue({ data: [] }) // No dependent deliverables
      mockSupabase.delete = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
      const request = new NextRequest('http://localhost/api/contracts/contract-123/deliverables?deliverable_id=deliverable-123')
      const response = await DELETE(request, { params: { id: 'contract-123' } })
      expect(data.message).toBe('Deliverable deleted successfully')
    it('should prevent deletion when deliverable has dependencies', async () => {
      const dependentDeliverables = [
        { id: 'dep-1', deliverable_name: 'Dependent Task' }
        .mockResolvedValue({ data: dependentDeliverables })
      expect(data.error).toBe('Cannot delete deliverable that has dependencies')
      expect(data.dependencies).toEqual(dependentDeliverables)
    it('should return 400 when deliverable ID is missing', async () => {
      expect(data.error).toBe('Deliverable ID is required')
})
