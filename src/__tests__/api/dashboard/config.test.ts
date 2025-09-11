/**
 * Dashboard Config API Tests - WS-037 Configuration Test Suite
 * Team B - Round 2 Implementation
 * Comprehensive testing for dashboard configuration endpoints
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, POST, PATCH, PUT } from '@/app/api/dashboard/config/route'
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
  },
  from: jest.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  }))
}
// Mock rate limiter
const mockRateLimit = {
  check: vi.fn().mockResolvedValue({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000
  })
// Mock user data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com'
// Mock dashboard data
const mockWidgets = [
  {
    id: 'widget-1',
    supplier_id: mockUser.id,
    widget_type: 'summary',
    widget_config: { title: 'Summary' },
    position_x: 0,
    position_y: 0,
    width: 2,
    height: 1,
    is_enabled: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
    id: 'widget-2',
    widget_type: 'upcoming_weddings',
    widget_config: { title: 'Upcoming Weddings', limit: 5 },
    position_x: 2,
    height: 2,
  }
]
const mockSettings = {
  settings: {
    auto_refresh: true,
    refresh_interval: 300,
    default_date_range: '30d',
    enabled_widgets: ['summary', 'upcoming_weddings'],
    notifications: {
      email: true,
      browser: true,
      sound: false
    },
    theme: 'light'
  layout: {
    grid_columns: 12,
    compact_mode: false
  updated_at: '2023-01-01T00:00:00Z'
describe('Dashboard Config API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockReturnValue(mockSupabaseClient as unknown)
    
    // Mock rate limiter
    require('@/lib/rate-limit').default = jest.fn(() => mockRateLimit)
  describe('GET /api/dashboard/config', () => {
    it('should return complete dashboard configuration', async () => {
      // Setup mocks
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      const mockServiceInstance = {
        getDashboardWidgets: vi.fn().mockResolvedValue(mockWidgets),
        validateLayout: vi.fn().mockResolvedValue({
          valid: true,
          conflicts: []
        })
      }
      mockWidgetService.mockImplementation(() => mockServiceInstance as unknown)
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSettings,
      // Create test request
      const request = new NextRequest('http://localhost:3000/api/dashboard/config', {
        method: 'GET'
      // Execute
      const response = await GET(request)
      const data = await response.json()
      // Assertions
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.widgets).toEqual(mockWidgets)
      expect(data.data.settings).toEqual(mockSettings.settings)
      expect(data.data.layout).toEqual(mockSettings.layout)
      expect(data.data.validation.valid).toBe(true)
      expect(data.data.meta.total_widgets).toBe(2)
      expect(data.data.meta.enabled_widgets).toBe(2)
    })
    it('should return default settings when none exist', async () => {
      // Return null for settings (doesn't exist)
        data: null,
        error: { code: 'PGRST116' }
      expect(data.data.settings.auto_refresh).toBe(true)
      expect(data.data.settings.refresh_interval).toBe(300)
      expect(data.data.settings.default_date_range).toBe('30d')
      expect(data.data.layout.grid_columns).toBe(12)
      expect(data.data.layout.compact_mode).toBe(false)
    it('should include layout validation results', async () => {
          valid: false,
          conflicts: ['Widget widget-1 overlaps with widget-2 at position 1,0']
      expect(data.data.validation.valid).toBe(false)
      expect(data.data.validation.conflicts).toHaveLength(1)
      expect(data.data.validation.conflicts[0]).toContain('overlaps')
    it('should return 401 for unauthenticated user', async () => {
        data: { user: null },
        error: new Error('Authentication required')
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
  describe('POST /api/dashboard/config', () => {
    it('should initialize default dashboard successfully', async () => {
        getDashboardWidgets: vi.fn().mockResolvedValue([]), // No existing widgets
        setupDefaultDashboard: vi.fn().mockResolvedValue(mockWidgets)
      mockSupabaseClient.from().upsert.mockResolvedValue({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token'
        },
        body: JSON.stringify({
          action: 'initialize'
      // Mock CSRF validation
      Object.defineProperty(request, 'cookies', {
        value: {
          get: vi.fn().mockReturnValue({ value: 'test-token' })
        }
      const response = await POST(request)
      expect(response.status).toBe(201)
      expect(data.data.message).toContain('initialized')
      expect(mockServiceInstance.setupDefaultDashboard).toHaveBeenCalled()
    it('should prevent initialization when widgets exist without force flag', async () => {
        getDashboardWidgets: vi.fn().mockResolvedValue(mockWidgets) // Existing widgets
      expect(response.status).toBe(409)
      expect(data.error).toContain('already initialized')
    it('should force initialize when flag is provided', async () => {
        removeWidget: vi.fn().mockResolvedValue(true),
          action: 'initialize',
          force: true
      expect(mockServiceInstance.removeWidget).toHaveBeenCalledTimes(2)
    it('should reset dashboard to defaults', async () => {
          action: 'reset_to_defaults'
      expect(data.data.message).toContain('reset')
    it('should return 403 for invalid CSRF token', async () => {
      // Create test request with invalid CSRF token
          'x-csrf-token': 'wrong-token'
          get: vi.fn().mockReturnValue({ value: 'different-token' })
      expect(response.status).toBe(403)
      expect(data.error).toContain('Invalid CSRF token')
  describe('PATCH /api/dashboard/config', () => {
    it('should update widget positions successfully', async () => {
        updateWidgetPositions: vi.fn().mockResolvedValue(true),
        method: 'PATCH',
          layout: {
            positions: [
              {
                id: 'widget-1',
                position_x: 2,
                position_y: 0,
                width: 2,
                height: 1
              }
            ],
            grid_columns: 24,
            compact_mode: true
          }
      const response = await PATCH(request)
      expect(data.data.message).toContain('updated successfully')
      expect(mockServiceInstance.updateWidgetPositions).toHaveBeenCalledWith([
        {
          id: 'widget-1',
          position_x: 2,
          position_y: 0,
          width: 2,
          height: 1
      ])
    it('should update settings successfully', async () => {
          settings: {
            auto_refresh: false,
            refresh_interval: 600,
            theme: 'dark'
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith({
        supplier_id: mockUser.id,
        settings: expect.objectContaining({
          auto_refresh: false,
          refresh_interval: 600,
          theme: 'dark'
        }),
        layout: expect.any(Object),
        updated_at: expect.any(String)
    it('should handle database errors when updating settings', async () => {
        error: new Error('Database connection failed')
            auto_refresh: false
      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to update dashboard settings')
  describe('PUT /api/dashboard/config', () => {
    it('should export dashboard configuration', async () => {
      const exportConfig = {
        widgets: mockWidgets,
        layout_version: '1.0'
        exportDashboardConfig: vi.fn().mockResolvedValue(exportConfig)
      const request = new NextRequest('http://localhost:3000/api/dashboard/config?action=export', {
        method: 'PUT',
      const response = await PUT(request)
      expect(data.data.layout_version).toBe('1.0')
      expect(data.data.exported_at).toBeDefined()
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
    it('should import dashboard configuration', async () => {
        importDashboardConfig: vi.fn().mockResolvedValue(true)
      const request = new NextRequest('http://localhost:3000/api/dashboard/config?action=import', {
          widgets: mockWidgets,
            auto_refresh: true,
            refresh_interval: 300
          },
          layout_version: '1.0'
      expect(data.data.message).toContain('imported successfully')
      expect(data.data.imported_widgets).toBe(2)
      expect(mockServiceInstance.importDashboardConfig).toHaveBeenCalledWith({
        widgets: mockWidgets
    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/config?action=invalid', {
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid action')
  describe('Rate Limiting and Performance', () => {
    it('should handle rate limiting correctly', async () => {
      // Setup rate limit mock
      mockRateLimit.check.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000
      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
    it('should include performance metrics', async () => {
        validateLayout: vi.fn().mockResolvedValue({ valid: true, conflicts: [] })
      expect(data.meta.response_time_ms).toBeDefined()
      expect(typeof data.meta.response_time_ms).toBe('number')
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=600')
})
