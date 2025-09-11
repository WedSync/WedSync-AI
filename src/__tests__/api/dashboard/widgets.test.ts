/**
 * Widget API Tests - WS-037 Widget Endpoint Test Suite
 * Team B - Round 2 Implementation
 * Comprehensive testing for widget API endpoints
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, PUT, POST, DELETE } from '@/app/api/dashboard/widgets/[type]/route'
import { createClient } from '@/lib/supabase/server'
import { WidgetService } from '@/lib/services/widgetService'
// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/services/widgetService')
vi.mock('@/lib/rate-limit')
const mockCreateClient = createClient as ReturnType<typeof vi.fn>edFunction<typeof createClient>
const mockWidgetService = WidgetService as ReturnType<typeof vi.fn>edClass<typeof WidgetService>
// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  }
}
// Mock rate limiter
const mockRateLimit = {
  check: vi.fn().mockResolvedValue({
    success: true,
    limit: 300,
    remaining: 299,
    reset: Date.now() + 60000
  })
// Mock user data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com'
// Mock widget data
const mockWidgetData = {
  widget_id: 'widget-123',
  widget_type: 'summary',
  data: {
    total_weddings: 10,
    active_weddings: 5,
    total_revenue: 50000,
    visible_metrics: ['total_weddings', 'active_weddings', 'total_revenue']
  },
  last_updated: new Date().toISOString(),
  cache_expires: new Date(Date.now() + 300000).toISOString()
const mockWidget = {
  id: 'widget-123',
  supplier_id: mockUser.id,
  widget_config: {
    title: 'Dashboard Summary',
    showMetrics: ['total_weddings', 'active_weddings', 'total_revenue']
  position_x: 0,
  position_y: 0,
  width: 2,
  height: 1,
  is_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
// Helper to create mock context with params
const createMockContext = (type: string) => ({
  params: Promise.resolve({ type })
})
describe('Widget API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockReturnValue(mockSupabaseClient as unknown)
    
    // Mock rate limiter
    require('@/lib/rate-limit').default = jest.fn(() => mockRateLimit)
  describe('GET /api/dashboard/widgets/[type]', () => {
    it('should return widget data for valid widget type', async () => {
      // Setup mocks
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      const mockServiceInstance = {
        getWidgetData: vi.fn().mockResolvedValue(mockWidgetData)
      }
      mockWidgetService.mockImplementation(() => mockServiceInstance as unknown)
      // Create test request
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/summary', {
        method: 'GET'
      const context = createMockContext('summary')
      // Execute
      const response = await GET(request, context as unknown)
      const data = await response.json()
      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.widget_type).toBe('summary')
      expect(data.data.widget_data).toEqual(mockWidgetData.data)
      expect(response.headers.get('X-Widget-Type')).toBe('summary')
      expect(mockServiceInstance.getWidgetData).toHaveBeenCalledWith('summary', {})
    })
    it('should handle widget configuration parameters', async () => {
      // Create test request with query parameters
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/upcoming_weddings?limit=10&daysAhead=30&showComparison=true', {
      const context = createMockContext('upcoming_weddings')
      expect(mockServiceInstance.getWidgetData).toHaveBeenCalledWith('upcoming_weddings', {
        limit: 10,
        daysAhead: 30,
        showComparison: true
    it('should return 400 for invalid widget type', async () => {
      // Create test request with invalid widget type
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/invalid_type', {
      const context = createMockContext('invalid_type')
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid widget type')
    it('should return 401 for unauthenticated user', async () => {
        data: { user: null },
        error: new Error('Authentication required')
      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication required')
    it('should handle rate limiting', async () => {
      // Setup rate limit mock
      mockRateLimit.check.mockResolvedValue({
        success: false,
        limit: 300,
        remaining: 0,
        reset: Date.now() + 60000,
        retryAfter: 60
      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
      expect(response.headers.get('Retry-After')).toBe('60')
    it('should handle array parameters correctly', async () => {
      // Create test request with array parameters
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/tasks?showTypes=overdue,due_today&showMetrics=total,pending', {
      const context = createMockContext('tasks')
      expect(mockServiceInstance.getWidgetData).toHaveBeenCalledWith('tasks', {
        showTypes: ['overdue', 'due_today'],
        showMetrics: ['total', 'pending']
  describe('PUT /api/dashboard/widgets/[type]', () => {
    it('should update widget configuration successfully', async () => {
      const updatedWidget = { ...mockWidget, widget_config: { title: 'Updated Summary' } }
        updateWidget: vi.fn().mockResolvedValue(updatedWidget)
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          widget_id: 'widget-123',
          config: {
            title: 'Updated Summary'
          },
          position: {
            position_x: 2,
            position_y: 1
          is_enabled: true
        })
      const response = await PUT(request, context as unknown)
      expect(data.data.widget).toEqual(updatedWidget)
      expect(mockServiceInstance.updateWidget).toHaveBeenCalledWith('widget-123', {
        widget_config: { title: 'Updated Summary' },
        position_x: 2,
        position_y: 1,
        is_enabled: true
    it('should return 400 for invalid widget configuration', async () => {
      // Create test request with invalid data
          widget_id: 'invalid-id', // Not a valid UUID
            title: '' // Empty title
          }
      expect(data.error).toContain('Invalid')
    it('should handle service errors gracefully', async () => {
        updateWidget: vi.fn().mockRejectedValue(new Error('Widget not found'))
      expect(response.status).toBe(500)
      expect(data.error).toContain('Widget not found')
  describe('POST /api/dashboard/widgets/[type]', () => {
    it('should add new widget successfully', async () => {
        addWidget: vi.fn().mockResolvedValue(mockWidget)
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/messages', {
        method: 'POST',
            title: 'Recent Messages',
            limit: 5,
            unreadOnly: true
            position_x: 4,
            position_y: 2,
            width: 2,
            height: 1
      const context = createMockContext('messages')
      const response = await POST(request, context as unknown)
      expect(response.status).toBe(201)
      expect(data.data.widget).toEqual(mockWidget)
      expect(mockServiceInstance.addWidget).toHaveBeenCalledWith(
        'messages',
        {
          title: 'Recent Messages',
          limit: 5,
          unreadOnly: true
          position_x: 4,
          position_y: 2,
          width: 2,
          height: 1
        }
      )
    it('should add widget with default configuration', async () => {
      // Create test request with minimal data
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/revenue', {
        body: JSON.stringify({})
      const context = createMockContext('revenue')
      expect(mockServiceInstance.addWidget).toHaveBeenCalledWith('revenue', undefined, undefined)
  describe('DELETE /api/dashboard/widgets/[type]', () => {
    it('should remove widget successfully', async () => {
        removeWidget: vi.fn().mockResolvedValue(true)
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/summary?widget_id=widget-123', {
        method: 'DELETE'
      const response = await DELETE(request, context as unknown)
      expect(data.data.widget_id).toBe('widget-123')
      expect(mockServiceInstance.removeWidget).toHaveBeenCalledWith('widget-123')
    it('should return 400 for missing widget_id', async () => {
      // Create test request without widget_id
      expect(data.error).toContain('Valid widget_id is required')
    it('should return 400 for invalid widget_id format', async () => {
      // Create test request with invalid UUID
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/summary?widget_id=invalid-id', {
    it('should return 404 when widget is not found', async () => {
        removeWidget: vi.fn().mockResolvedValue(false)
      const request = new NextRequest('http://localhost:3000/api/dashboard/widgets/summary?widget_id=123e4567-e89b-12d3-a456-426614174000', {
      expect(response.status).toBe(404)
  describe('Performance and Headers', () => {
    it('should include performance metrics in response headers', async () => {
      expect(response.headers.get('X-Response-Time')).toBeDefined()
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=300')
    it('should include rate limit headers', async () => {
      expect(response.headers.get('X-RateLimit-Limit')).toBe('300')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('299')
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
