import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { generateWeddingTestData } from '../../../../tests/utils/test-utils'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))
// Mock journey engine
const mockJourneyEngine = {
  executeJourney: vi.fn(),
  pauseJourney: vi.fn(),
  resumeJourney: vi.fn(),
  validateJourney: vi.fn(),
  getJourneyStatus: vi.fn(),
vi.mock('@/lib/journey-engine/executor', () => ({
  JourneyEngine: vi.fn(() => mockJourneyEngine),
// Mock validation schemas
vi.mock('@/lib/validations/journey', () => ({
  createJourneySchema: {
    parse: vi.fn((data) => data),
  updateJourneySchema: {
  executeJourneySchema: {
describe('Journeys API', () => {
  const mockAuthUser = {
    id: 'photographer-user-id',
    email: 'photographer@studio.com',
    role: 'photographer',
  }
  const mockProfile = {
    user_id: 'photographer-user-id',
    organization_id: 'studio-org-123',
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    })
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockProfile,
  })
  describe('GET /api/journeys', () => {
    it('returns wedding journey templates for photographer', async () => {
      const mockJourneys = [
        {
          id: 'journey-1',
          name: 'Complete Wedding Planning Workflow',
          description: 'End-to-end wedding planning journey for couples',
          type: 'template',
          category: 'wedding_planning',
          status: 'published',
          steps: [
            {
              id: 'step-1',
              name: 'Initial Consultation',
              type: 'meeting',
              order: 1,
              required: true,
              estimated_duration: 60,
            },
              id: 'step-2',
              name: 'Venue Selection',
              type: 'task',
              order: 2,
              dependencies: ['step-1'],
              id: 'step-3',
              name: 'Vendor Coordination',
              type: 'automation',
              order: 3,
              dependencies: ['step-2'],
          ],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
          id: 'journey-2',
          name: 'Photography Package Journey',
          description: 'Streamlined workflow for photography clients',
          category: 'photography',
              id: 'photo-step-1',
              name: 'Package Selection',
              type: 'form',
              id: 'photo-step-2',
              name: 'Engagement Session',
              type: 'event',
              required: false,
      ]
      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: mockJourneys,
        error: null,
        count: mockJourneys.length,
      })
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          category: 'all',
        headers: {
          authorization: 'Bearer valid-token',
      const handler = await import('@/app/api/journeys/route')
      await handler.GET(req as NextRequest)
      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.data).toEqual(mockJourneys)
      expect(responseData.total).toBe(2)
    it('filters journeys by wedding category', async () => {
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('category', 'eq', 'wedding_planning')
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('status', 'eq', 'published')
    it('returns active journey instances for clients', async () => {
          type: 'instance',
          client_id: 'client-123',
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('type', 'eq', 'instance')
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('client_id', 'eq', 'client-123')
    it('requires authentication for journey access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
          authorization: 'Bearer invalid-token',
      expect(res._getStatusCode()).toBe(401)
  describe('POST /api/journeys', () => {
    it('creates new wedding journey template successfully', async () => {
      const newJourneyData = {
        name: 'Custom Wedding Timeline',
        description: 'Personalized wedding planning journey',
        category: 'custom_wedding',
        type: 'template',
        steps: [
          {
            name: 'Budget Planning',
            type: 'form',
            order: 1,
            required: true,
            form_fields: [
              { name: 'total_budget', type: 'number', required: true },
              { name: 'priorities', type: 'multiselect', required: true },
            ],
          },
            name: 'Vendor Research',
            type: 'automation',
            order: 2,
            automation_config: {
              trigger: 'budget_submitted',
              action: 'send_vendor_recommendations',
            name: 'Final Planning Meeting',
            type: 'meeting',
            order: 3,
            meeting_config: {
              duration: 120,
              location: 'client_venue',
              agenda_items: ['timeline_review', 'vendor_confirmation', 'day_of_details'],
        ],
        triggers: [
            event: 'step_completed',
            condition: 'step_id === "budget_planning"',
            action: 'start_vendor_research',
        settings: {
          allow_step_skipping: false,
          require_approval: true,
          notification_frequency: 'daily',
          deadline_enforcement: 'strict',
      }
      const createdJourney = {
        id: 'new-journey-id',
        organization_id: 'studio-org-123',
        created_by: 'photographer-user-id',
        ...newJourneyData,
        status: 'draft',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      mockSupabase.from().insert.mockResolvedValue({
        data: [createdJourney],
        method: 'POST',
        body: newJourneyData,
          'content-type': 'application/json',
      await handler.POST(req as NextRequest)
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newJourneyData,
          organization_id: 'studio-org-123',
          created_by: 'photographer-user-id',
          status: 'draft',
        })
      )
      expect(res._getStatusCode()).toBe(201)
      expect(responseData.data).toEqual(createdJourney)
      expect(responseData.message).toBe('Wedding journey created successfully')
    it('validates journey step dependencies', async () => {
      const invalidJourneyData = {
        name: 'Invalid Journey',
            name: 'Step 1',
            dependencies: ['nonexistent_step'], // Invalid dependency
        body: invalidJourneyData,
      expect(res._getStatusCode()).toBe(400)
      expect(responseData.error).toContain('invalid step dependency')
    it('creates journey instance from template for wedding client', async () => {
      const instanceData = {
        template_id: 'journey-template-1',
        client_id: 'client-123',
        name: 'John & Jane Wedding Journey',
        custom_variables: {
          wedding_date: '2024-06-15',
          venue_name: 'Beautiful Gardens',
          guest_count: 150,
        auto_start: true,
      const createdInstance = {
        id: 'journey-instance-1',
        ...instanceData,
        type: 'instance',
        status: 'running',
        current_step: 'step-1',
        progress: 0,
        data: [createdInstance],
      mockJourneyEngine.executeJourney.mockResolvedValue({
        success: true,
        execution_id: 'exec-123',
        body: instanceData,
      expect(mockJourneyEngine.executeJourney).toHaveBeenCalledWith(
        'journey-instance-1',
          auto_start: true,
          variables: instanceData.custom_variables,
      expect(responseData.execution_id).toBe('exec-123')
    it('validates required wedding journey fields', async () => {
        name: '', // Required field missing
        steps: [], // No steps defined
      expect(responseData.error).toContain('validation')
  describe('GET /api/journeys/[id]', () => {
    it('returns specific wedding journey with execution details', async () => {
      const mockJourney = {
        id: 'journey-1',
        name: 'Wedding Planning Journey',
        current_step: 'venue_selection',
        progress: 35,
            id: 'initial_consultation',
            name: 'Initial Consultation',
            status: 'completed',
            completed_at: '2024-01-10T10:00:00Z',
            id: 'venue_selection',
            name: 'Venue Selection',
            status: 'in_progress',
            started_at: '2024-01-12T09:00:00Z',
            due_date: '2024-01-20T00:00:00Z',
            id: 'vendor_coordination',
            name: 'Vendor Coordination',
            status: 'pending',
            dependencies: ['venue_selection'],
        execution_history: [
            timestamp: '2024-01-10T10:00:00Z',
            step_id: 'initial_consultation',
            action: 'completed',
            notes: 'Client preferences documented',
            timestamp: '2024-01-12T09:00:00Z',
            step_id: 'venue_selection',
            action: 'started',
            notes: 'Venue research phase initiated',
        next_actions: [
            action: 'schedule_venue_visits',
            due_date: '2024-01-18T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-12T09:00:00Z',
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockJourney,
      const handler = await import('@/app/api/journeys/[id]/route')
      await handler.GET(req as NextRequest, { params: { id: 'journey-1' } })
      expect(responseData.data).toEqual(mockJourney)
      expect(responseData.data.progress).toBe(35)
      expect(responseData.data.current_step).toBe('venue_selection')
    it('validates journey ownership for photographers', async () => {
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      await handler.GET(req as NextRequest, { params: { id: 'unauthorized-journey' } })
      expect(res._getStatusCode()).toBe(404)
      expect(responseData.error).toBe('Journey not found')
    it('includes real-time execution status for active journeys', async () => {
      mockJourneyEngine.getJourneyStatus.mockResolvedValue({
        current_step: 'vendor_coordination',
        progress: 67,
        estimated_completion: '2024-02-15T00:00:00Z',
        blocked_reasons: [],
        pending_approvals: ['vendor_contract_review'],
          include_realtime_status: 'true',
      expect(mockJourneyEngine.getJourneyStatus).toHaveBeenCalledWith('journey-1')
      
      expect(responseData.realtime_status).toBeDefined()
      expect(responseData.realtime_status.pending_approvals).toContain('vendor_contract_review')
  describe('PUT /api/journeys/[id]', () => {
    it('updates wedding journey configuration successfully', async () => {
      const updateData = {
        name: 'Updated Wedding Journey',
          notification_frequency: 'weekly',
          deadline_enforcement: 'flexible',
            id: 'step-1',
            name: 'Updated Initial Consultation',
            estimated_duration: 90, // Changed from 60
      const updatedJourney = {
        ...updateData,
        updated_at: '2024-01-15T12:00:00Z',
        version: 2,
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedJourney,
        method: 'PUT',
        body: updateData,
      await handler.PUT(req as NextRequest, { params: { id: 'journey-1' } })
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
          ...updateData,
          updated_at: expect.any(String),
          version: expect.any(Number),
      expect(responseData.data).toEqual(updatedJourney)
    it('prevents modifying running journey critical steps', async () => {
            id: 'running-step',
            name: 'Modified Running Step',
            // Trying to modify a currently running step
      const currentJourney = {
        current_step: 'running-step',
        data: currentJourney,
      expect(responseData.error).toContain('cannot modify running step')
    it('validates step dependency changes', async () => {
            dependencies: ['step-2'], // Circular dependency
            id: 'step-2',
            dependencies: ['step-1'], // Circular dependency
      expect(responseData.error).toContain('circular dependency')
  describe('POST /api/journeys/[id]/execute', () => {
    it('starts wedding journey execution successfully', async () => {
      const executionConfig = {
        auto_progress: true,
        notification_settings: {
          client_notifications: true,
          photographer_notifications: true,
          email_frequency: 'important_only',
          venue: 'Garden Paradise',
          photographer_name: 'John Photography',
        deadline_overrides: [
            new_deadline: '2024-02-01T00:00:00Z',
      const executionResult = {
        execution_id: 'exec-456',
        journey_id: 'journey-1',
        current_step: 'initial_consultation',
        started_at: '2024-01-15T14:00:00Z',
        estimated_completion: '2024-05-15T00:00:00Z',
            step: 'initial_consultation',
            action: 'schedule_meeting',
        ...executionResult,
        body: executionConfig,
      const handler = await import('@/app/api/journeys/[id]/execute/route')
      await handler.POST(req as NextRequest, { params: { id: 'journey-1' } })
        'journey-1',
        expect.objectContaining(executionConfig)
      expect(responseData).toEqual(executionResult)
      expect(responseData.execution_id).toBe('exec-456')
    it('validates journey readiness before execution', async () => {
      mockJourneyEngine.validateJourney.mockResolvedValue({
        valid: false,
        errors: [
          'Missing required client information',
          'Incomplete step configuration for venue_selection',
        body: {
          validate_only: true,
      expect(responseData.error).toBe('Journey validation failed')
      expect(responseData.validation_errors).toEqual([
        'Missing required client information',
        'Incomplete step configuration for venue_selection',
      ])
    it('handles journey execution conflicts', async () => {
        success: false,
        error: 'Journey already running',
        current_execution: 'exec-123',
          force_restart: false,
      expect(res._getStatusCode()).toBe(409)
      expect(responseData.error).toBe('Journey already running')
      expect(responseData.current_execution).toBe('exec-123')
    it('allows forced restart of stuck wedding journeys', async () => {
        execution_id: 'exec-789',
        restarted: true,
        previous_execution: 'exec-123',
          force_restart: true,
          restart_reason: 'Journey stuck on vendor approval step',
      expect(responseData.restarted).toBe(true)
      expect(responseData.execution_id).toBe('exec-789')
  describe('POST /api/journeys/[id]/pause', () => {
    it('pauses wedding journey execution with reason', async () => {
      const pauseData = {
        reason: 'Client requested to pause for budget review',
        pause_until: '2024-02-01T00:00:00Z',
        notify_client: true,
      mockJourneyEngine.pauseJourney.mockResolvedValue({
        paused_at: '2024-01-15T15:00:00Z',
        resume_scheduled: '2024-02-01T00:00:00Z',
        body: pauseData,
      const handler = await import('@/app/api/journeys/[id]/pause/route')
      expect(mockJourneyEngine.pauseJourney).toHaveBeenCalledWith(
        expect.objectContaining(pauseData)
      expect(responseData.message).toBe('Journey paused successfully')
      expect(responseData.resume_scheduled).toBe('2024-02-01T00:00:00Z')
    it('prevents pausing completed wedding journeys', async () => {
        status: 'completed',
        completed_at: '2024-01-10T00:00:00Z',
          reason: 'Cannot pause completed journey',
      expect(responseData.error).toContain('completed journey cannot be paused')
  describe('POST /api/journeys/[id]/resume', () => {
    it('resumes paused wedding journey execution', async () => {
      const resumeData = {
        resume_immediately: true,
        update_deadlines: true,
        notify_stakeholders: true,
        notes: 'Budget approved, resuming planning',
      mockJourneyEngine.resumeJourney.mockResolvedValue({
        resumed_at: '2024-01-20T09:00:00Z',
        updated_deadlines: [
            new_deadline: '2024-02-10T00:00:00Z',
        body: resumeData,
      const handler = await import('@/app/api/journeys/[id]/resume/route')
      expect(mockJourneyEngine.resumeJourney).toHaveBeenCalledWith(
        expect.objectContaining(resumeData)
      expect(responseData.message).toBe('Journey resumed successfully')
      expect(responseData.updated_deadlines).toHaveLength(1)
    it('validates journey is in paused state before resume', async () => {
        body: {},
      expect(responseData.error).toContain('journey is not paused')
  describe('Wedding Journey Analytics', () => {
    it('generates journey performance analytics', async () => {
          analytics: 'true',
          date_range: '30',
      const handler = await import('@/app/api/journeys/analytics/route')
      expect(responseData.analytics).toEqual(
          total_journeys: expect.any(Number),
          completed_journeys: expect.any(Number),
          active_journeys: expect.any(Number),
          paused_journeys: expect.any(Number),
          average_completion_time: expect.any(Number),
          success_rate: expect.any(Number),
          most_common_pause_reasons: expect.any(Array),
          step_completion_rates: expect.any(Object),
          client_satisfaction_scores: expect.any(Object),
    it('tracks journey step performance metrics', async () => {
          step_analytics: 'true',
          journey_id: 'journey-1',
      const handler = await import('@/app/api/journeys/[id]/analytics/route')
      expect(responseData.step_analytics).toBeDefined()
      expect(responseData.bottlenecks).toBeDefined()
      expect(responseData.optimization_suggestions).toBeDefined()
  describe('Error Handling and Edge Cases', () => {
    it('handles journey engine service unavailability', async () => {
      mockJourneyEngine.executeJourney.mockRejectedValue(
        new Error('Journey execution service unavailable')
          auto_progress: true,
      expect(res._getStatusCode()).toBe(503)
      expect(responseData.error).toBe('Journey execution service temporarily unavailable')
    it('handles concurrent journey modifications gracefully', async () => {
      mockSupabase.from().update().eq().mockResolvedValue({
        error: { code: '409', message: 'Journey modified by another user' },
        name: 'Concurrent Update',
        version: 1, // Stale version
      expect(responseData.error).toContain('modified by another user')
    it('validates journey template compatibility with client requirements', async () => {
      const incompatibleInstance = {
        template_id: 'premium-template',
        client_id: 'basic-client',
      // Mock client subscription check
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          subscription_plan: 'basic',
          feature_limits: {
            max_journey_steps: 5,
            automation_allowed: false,
        body: incompatibleInstance,
      expect(res._getStatusCode()).toBe(403)
      expect(responseData.error).toContain('subscription plan does not support')
})
