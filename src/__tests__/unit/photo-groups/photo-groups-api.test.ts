/**
 * Unit Tests for Photo Groups API Routes
 * WS-153: Photo Groups Management - API Testing
 * 
 * Tests all API endpoints: GET, POST, PUT, DELETE, PATCH
 * Validates authentication, authorization, data validation, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST, PUT, DELETE, PATCH } from '@/app/api/guests/photo-groups/route'
import { createClient } from '@/lib/supabase/server'
// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('next/server')
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  single: vi.fn(),
  limit: vi.fn()
}
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
const mockClient = {
  id: 'couple-1',
  user_profiles: {
    user_id: 'user-123'
  }
const mockPhotoGroups = [
  {
    id: 'group-1',
    couple_id: 'couple-1',
    name: 'Family Photos',
    description: 'Immediate family group photos',
    photo_type: 'family',
    priority: 1,
    estimated_time_minutes: 10,
    location: 'Garden',
    timeline_slot: 'After ceremony',
    photographer_notes: 'Use natural lighting',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    assignments: []
]
describe('Photo Groups API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default Supabase client mock
    ;(createClient as unknown).mockResolvedValue(mockSupabaseClient)
    // Setup default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('GET /api/guests/photo-groups', () => {
    it('returns photo groups for authenticated user', async () => {
      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams('couple_id=couple-1')
        }
      } as NextRequest
      // Mock client access verification
      const mockClientQuery = vi.fn().mockReturnThis()
      mockClientQuery.select = vi.fn().mockReturnThis()
      mockClientQuery.eq = vi.fn().mockReturnThis()
      mockClientQuery.single = vi.fn().mockResolvedValue({
        data: mockClient,
        error: null
      })
      
      // Mock photo groups query
      const mockGroupsQuery = vi.fn().mockReturnThis()
      mockGroupsQuery.select = vi.fn().mockReturnThis()
      mockGroupsQuery.eq = vi.fn().mockReturnThis()
      mockGroupsQuery.order = vi.fn().mockResolvedValue({
        data: mockPhotoGroups,
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce(mockClientQuery)  // First call for client verification
        .mockReturnValueOnce(mockGroupsQuery)  // Second call for photo groups
      const result = await GET(mockRequest)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('clients')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('photo_groups')
      expect(result).toBeInstanceOf(Response)
    it('returns 400 when couple_id is missing', async () => {
          searchParams: new URLSearchParams()
      const mockResponse = { json: vi.fn(), status: 400 }
      ;(NextResponse.json as unknown).mockReturnValue(mockResponse)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'couple_id is required' },
        { status: 400 }
      )
    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      const mockResponse = { json: vi.fn(), status: 401 }
        { error: 'Unauthorized' },
        { status: 401 }
    it('returns 403 when user has no access to couple', async () => {
        data: null,
      mockSupabaseClient.from.mockReturnValue(mockClientQuery)
      const mockResponse = { json: vi.fn(), status: 403 }
        { error: 'Access denied' },
        { status: 403 }
    it('handles database errors gracefully', async () => {
        error: new Error('Database error')
        .mockReturnValueOnce(mockClientQuery)
        .mockReturnValueOnce(mockGroupsQuery)
      const mockResponse = { json: vi.fn(), status: 500 }
        { error: 'Failed to fetch photo groups' },
        { status: 500 }
  describe('POST /api/guests/photo-groups', () => {
    const validPhotoGroupData = {
      couple_id: 'couple-1',
      name: 'Test Group',
      description: 'Test description',
      photo_type: 'family',
      estimated_time_minutes: 10,
      location: 'Garden',
      timeline_slot: 'After ceremony',
      photographer_notes: 'Test notes',
      guest_ids: ['guest-1', 'guest-2']
    }
    it('creates a new photo group successfully', async () => {
        json: vi.fn().mockResolvedValue(validPhotoGroupData)
      } as unknown as NextRequest
      // Mock priority query
      const mockPriorityQuery = vi.fn().mockReturnThis()
      mockPriorityQuery.select = vi.fn().mockReturnThis()
      mockPriorityQuery.eq = vi.fn().mockReturnThis()
      mockPriorityQuery.order = vi.fn().mockReturnThis()
      mockPriorityQuery.limit = vi.fn().mockReturnThis()
      mockPriorityQuery.single = vi.fn().mockResolvedValue({
        data: { priority: 2 },
      // Mock group creation
      const mockCreateQuery = vi.fn().mockReturnThis()
      mockCreateQuery.insert = vi.fn().mockReturnThis()
      mockCreateQuery.select = vi.fn().mockReturnThis()
      mockCreateQuery.single = vi.fn().mockResolvedValue({
        data: { id: 'group-new', ...validPhotoGroupData, priority: 3 },
      // Mock assignment creation
      const mockAssignmentQuery = vi.fn().mockReturnThis()
      mockAssignmentQuery.insert = vi.fn().mockResolvedValue({
        data: [],
      // Mock final group fetch
      const mockFinalQuery = vi.fn().mockReturnThis()
      mockFinalQuery.select = vi.fn().mockReturnThis()
      mockFinalQuery.eq = vi.fn().mockReturnThis()
      mockFinalQuery.single = vi.fn().mockResolvedValue({
        data: mockPhotoGroups[0],
        .mockReturnValueOnce(mockClientQuery)      // Client verification
        .mockReturnValueOnce(mockPriorityQuery)    // Priority check
        .mockReturnValueOnce(mockCreateQuery)      // Group creation
        .mockReturnValueOnce(mockAssignmentQuery)  // Assignment creation
        .mockReturnValueOnce(mockFinalQuery)       // Final fetch
      const mockResponse = { json: vi.fn(), status: 201 }
      const result = await POST(mockRequest)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('photo_group_assignments')
      expect(NextResponse.json).toHaveBeenCalledWith(mockPhotoGroups[0], { status: 201 })
    it('validates input data with Zod schema', async () => {
      const invalidData = {
        couple_id: 'invalid-uuid',  // Invalid UUID
        name: '',                   // Empty name
        estimated_time_minutes: -1  // Negative time
      }
        json: vi.fn().mockResolvedValue(invalidData)
        expect.objectContaining({
          error: 'Invalid data',
          details: expect.any(Array)
        }),
    it('handles creation errors gracefully', async () => {
        error: new Error('Creation failed')
        .mockReturnValueOnce(mockPriorityQuery)
        .mockReturnValueOnce(mockCreateQuery)
        { error: 'Failed to create photo group' },
  describe('PUT /api/guests/photo-groups', () => {
    const updateData = {
      name: 'Updated Group Name',
      description: 'Updated description',
      estimated_time_minutes: 15,
      guest_ids: ['guest-3', 'guest-4']
    it('updates photo group successfully', async () => {
          searchParams: new URLSearchParams('id=group-1')
        },
        json: vi.fn().mockResolvedValue(updateData)
      // Mock access verification
      const mockAccessQuery = vi.fn().mockReturnThis()
      mockAccessQuery.select = vi.fn().mockReturnThis()
      mockAccessQuery.eq = vi.fn().mockReturnThis()
      mockAccessQuery.single = vi.fn().mockResolvedValue({
      // Mock update query
      const mockUpdateQuery = vi.fn().mockReturnThis()
      mockUpdateQuery.update = vi.fn().mockReturnThis()
      mockUpdateQuery.eq = vi.fn().mockReturnThis()
      mockUpdateQuery.select = vi.fn().mockReturnThis()
      mockUpdateQuery.single = vi.fn().mockResolvedValue({
        data: { ...mockPhotoGroups[0], ...updateData },
      // Mock assignment deletion
      const mockDeleteQuery = vi.fn().mockReturnThis()
      mockDeleteQuery.delete = vi.fn().mockReturnThis()
      mockDeleteQuery.eq = vi.fn().mockResolvedValue({
      // Mock final fetch
        .mockReturnValueOnce(mockAccessQuery)      // Access verification
        .mockReturnValueOnce(mockUpdateQuery)      // Group update
        .mockReturnValueOnce(mockDeleteQuery)      // Delete assignments
        .mockReturnValueOnce(mockAssignmentQuery)  // Create assignments
      const mockResponse = { json: vi.fn() }
      const result = await PUT(mockRequest)
    it('returns 400 when ID is missing', async () => {
        { error: 'Photo group ID is required' },
    it('returns 403 when photo group not found or access denied', async () => {
      mockSupabaseClient.from.mockReturnValue(mockAccessQuery)
        { error: 'Photo group not found or access denied' },
  describe('DELETE /api/guests/photo-groups', () => {
    it('deletes photo group successfully', async () => {
      // Mock deletion
        .mockReturnValueOnce(mockAccessQuery)
        .mockReturnValueOnce(mockDeleteQuery)
      const result = await DELETE(mockRequest)
      expect(NextResponse.json).toHaveBeenCalledWith({ success: true })
    it('handles deletion errors', async () => {
        error: new Error('Deletion failed')
        { error: 'Failed to delete photo group' },
  describe('PATCH /api/guests/photo-groups', () => {
    it('handles reorder action successfully', async () => {
      const reorderData = {
        group_orders: [
          { id: 'group-1', priority: 2 },
          { id: 'group-2', priority: 1 }
        ]
          searchParams: new URLSearchParams('action=reorder')
        json: vi.fn().mockResolvedValue(reorderData)
      mockUpdateQuery.eq = vi.fn().mockResolvedValue({
      mockSupabaseClient.from.mockReturnValue(mockUpdateQuery)
      const result = await PATCH(mockRequest)
    it('returns 400 for invalid action', async () => {
          searchParams: new URLSearchParams('action=invalid')
        { error: 'Invalid action' },
    it('validates reorder data with Zod', async () => {
      const invalidReorderData = {
          { id: 'invalid-uuid', priority: 'not-number' }
        json: vi.fn().mockResolvedValue(invalidReorderData)
  describe('Authentication and Authorization', () => {
    it('handles authentication errors consistently across all endpoints', async () => {
      // Test GET
      const getRequest = {
        nextUrl: { searchParams: new URLSearchParams('couple_id=couple-1') }
      await GET(getRequest)
      expect(NextResponse.json).toHaveBeenLastCalledWith(
      // Test POST
      const postRequest = {
        json: vi.fn().mockResolvedValue({ couple_id: 'couple-1', name: 'Test' })
      await POST(postRequest)
      // Test PUT
      const putRequest = {
        nextUrl: { searchParams: new URLSearchParams('id=group-1') },
        json: vi.fn().mockResolvedValue({ name: 'Updated' })
      await PUT(putRequest)
      // Test DELETE
      const deleteRequest = {
        nextUrl: { searchParams: new URLSearchParams('id=group-1') }
      await DELETE(deleteRequest)
  describe('Data Validation', () => {
    it('validates photo_type enum values', async () => {
        couple_id: 'couple-1',
        name: 'Test Group',
        photo_type: 'invalid_type',
        estimated_time_minutes: 10
          details: expect.arrayContaining([
            expect.objectContaining({
              path: ['photo_type']
            })
          ])
    it('validates estimated_time_minutes range', async () => {
        estimated_time_minutes: 150  // Over max of 120
              path: ['estimated_time_minutes']
    it('validates string length limits', async () => {
        name: 'A'.repeat(250),  // Over 200 character limit
              path: ['name']
  describe('Error Handling', () => {
    it('catches and handles unexpected errors', async () => {
      // Force an unexpected error
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))
        { error: 'Internal server error' },
})
