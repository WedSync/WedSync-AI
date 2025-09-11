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
// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => null),
  rateLimitConfigs: {
    api: { windowMs: 60000, max: 100 },
// Mock validation schemas
vi.mock('@/lib/validations/client', () => ({
  createClientSchema: {
    parse: vi.fn((data) => data),
  updateClientSchema: {
  clientFilterSchema: {
describe('Clients API', () => {
  const mockAuthUser = {
    id: 'test-user-id',
    email: 'photographer@studio.com',
    role: 'photographer',
  }
  const mockProfile = {
    user_id: 'test-user-id',
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
  describe('GET /api/clients', () => {
    it('returns wedding clients for authenticated photographer', async () => {
      const mockClients = [
        generateWeddingTestData.client({
          id: 'client-1',
          first_name: 'John',
          last_name: 'Smith',
          partner_first_name: 'Jane',
          partner_last_name: 'Smith',
          wedding_date: '2024-06-15',
          venue_name: 'Beautiful Wedding Venue',
          status: 'booked',
        }),
          id: 'client-2',
          first_name: 'Mike',
          last_name: 'Johnson',
          partner_first_name: 'Sarah',
          partner_last_name: 'Johnson',
          wedding_date: '2024-08-22',
          venue_name: 'Garden Wedding Venue',
          status: 'lead',
      ]
      mockSupabase.from().select().eq().range.mockResolvedValue({
        data: mockClients,
        error: null,
        count: mockClients.length,
      })
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          page: '1',
          limit: '10',
        },
        headers: {
          authorization: 'Bearer valid-token',
      const handler = await import('@/app/api/clients/route')
      await handler.GET(req as NextRequest)
      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.data).toEqual(mockClients)
      expect(responseData.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
    it('filters wedding clients by status', async () => {
      const bookedClients = [
      mockSupabase.from().select().eq().filter().range.mockResolvedValue({
        data: bookedClients,
        count: bookedClients.length,
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('status', 'eq', 'booked')
      expect(responseData.data).toEqual(bookedClients)
    it('filters wedding clients by date range', async () => {
          wedding_date_from: '2024-01-01',
          wedding_date_to: '2024-12-31',
      expect(mockSupabase.from().filter).toHaveBeenCalledWith(
        'wedding_date',
        'gte',
        '2024-01-01'
      )
        'lte',
        '2024-12-31'
    it('searches wedding clients by name and venue', async () => {
          search: 'Smith Wedding Venue',
        'search_text',
        'ilike',
        '%Smith Wedding Venue%'
    it('sorts wedding clients by wedding date', async () => {
          sort_by: 'wedding_date',
          sort_order: 'asc',
      expect(mockSupabase.from().order).toHaveBeenCalledWith('wedding_date', { ascending: true })
    it('requires authentication for wedding client access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
          authorization: 'Bearer invalid-token',
      expect(res._getStatusCode()).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    it('enforces organization isolation for wedding clients', async () => {
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('organization_id', 'studio-org-123')
  describe('POST /api/clients', () => {
    it('creates new wedding client successfully', async () => {
      const newClientData = {
        first_name: 'Emma',
        last_name: 'Wilson',
        partner_first_name: 'David',
        partner_last_name: 'Wilson',
        email: 'emma.david@email.com',
        phone: '+1234567890',
        wedding_date: '2024-09-15',
        venue_name: 'Sunset Wedding Garden',
        venue_address: '123 Garden St, Love City, LC 12345',
        guest_count: 120,
        budget: 45000,
        package_name: 'Deluxe Photography Package',
        package_price: 3500,
        status: 'lead',
        notes: 'Outdoor ceremony, reception indoors',
      }
      const createdClient = {
        id: 'new-client-id',
        organization_id: 'studio-org-123',
        ...newClientData,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      mockSupabase.from().insert.mockResolvedValue({
        data: [createdClient],
        method: 'POST',
        body: newClientData,
          'content-type': 'application/json',
      await handler.POST(req as NextRequest)
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newClientData,
          organization_id: 'studio-org-123',
          created_by: 'test-user-id',
        })
      expect(res._getStatusCode()).toBe(201)
      expect(responseData.data).toEqual(createdClient)
      expect(responseData.message).toBe('Wedding client created successfully')
    it('validates required wedding client fields', async () => {
      const invalidClientData = {
        first_name: '',
        email: 'invalid-email',
        wedding_date: 'invalid-date',
        body: invalidClientData,
      expect(res._getStatusCode()).toBe(400)
      expect(responseData.error).toContain('validation')
    it('prevents duplicate wedding client emails', async () => {
      const duplicateClientData = {
        first_name: 'John',
        last_name: 'Smith',
        email: 'existing@email.com',
        wedding_date: '2024-06-15',
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        body: duplicateClientData,
      expect(res._getStatusCode()).toBe(409)
      expect(responseData.error).toBe('Client with this email already exists')
    it('sanitizes wedding client input data', async () => {
      const maliciousClientData = {
        first_name: '<script>alert("xss")</script>John',
        last_name: 'Smith<img src="x" onerror="alert(1)">',
        email: 'john@email.com',
        venue_name: 'Beautiful Venue</script><script>malicious()</script>',
        notes: 'Notes with <iframe src="malicious.com"></iframe> content',
        body: maliciousClientData,
      // Verify that malicious content is sanitized
          first_name: 'John', // Script tags removed
          last_name: 'Smith', // Malicious HTML removed
          venue_name: 'Beautiful Venue', // Script tags removed
          notes: 'Notes with  content', // Iframe removed
    it('creates wedding timeline when client is created', async () => {
        first_name: 'Alice',
        last_name: 'Brown',
        wedding_date: '2024-07-20',
        venue_name: 'Mountain View Venue',
      // Verify wedding timeline creation
      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_timelines')
  describe('PUT /api/clients/[id]', () => {
    it('updates existing wedding client successfully', async () => {
      const updateData = {
        venue_name: 'Updated Wedding Venue',
        guest_count: 150,
        budget: 55000,
        status: 'booked',
        package_name: 'Premium Package',
        package_price: 4500,
      const updatedClient = {
        id: 'client-1',
        ...updateData,
        updated_at: '2024-01-15T12:00:00Z',
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedClient,
        method: 'PUT',
        body: updateData,
      const handler = await import('@/app/api/clients/[id]/route')
      await handler.PUT(req as NextRequest, { params: { id: 'client-1' } })
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
          ...updateData,
          updated_at: expect.any(String),
      expect(responseData.data).toEqual(updatedClient)
    it('validates wedding client ownership for updates', async () => {
        venue_name: 'Unauthorized Update',
        error: { code: 'PGRST116', message: 'Row not found' },
      await handler.PUT(req as NextRequest, { params: { id: 'unauthorized-client-id' } })
      expect(res._getStatusCode()).toBe(404)
      expect(responseData.error).toBe('Wedding client not found')
    it('prevents updating critical wedding dates too close to event', async () => {
        wedding_date: '2024-01-20', // Very close date
        venue_name: 'Last Minute Venue Change',
      expect(responseData.error).toContain('wedding date cannot be changed')
    it('tracks wedding client status changes', async () => {
        status_changed_reason: 'Contract signed and deposit received',
      // Verify status change is tracked
      expect(mockSupabase.from).toHaveBeenCalledWith('client_status_history')
  describe('DELETE /api/clients/[id]', () => {
    it('soft deletes wedding client with confirmation', async () => {
      mockSupabase.from().update().eq().mockResolvedValue({
        data: [{ id: 'client-1', deleted_at: '2024-01-15T14:00:00Z' }],
        method: 'DELETE',
          confirm: 'true',
      await handler.DELETE(req as NextRequest, { params: { id: 'client-1' } })
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
        deleted_by: 'test-user-id',
        status: 'archived',
      expect(responseData.message).toBe('Wedding client archived successfully')
    it('requires confirmation for wedding client deletion', async () => {
      expect(responseData.error).toBe('Confirmation required for client deletion')
    it('prevents deletion of wedding client with upcoming wedding', async () => {
      const upcomingWeddingClient = {
        wedding_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: upcomingWeddingClient,
      expect(responseData.error).toContain('upcoming wedding')
  describe('Wedding-specific Features', () => {
    it('calculates wedding countdown for clients', async () => {
          include_countdown: 'true',
      expect(responseData.data[0]).toHaveProperty('days_until_wedding')
      expect(responseData.data[0]).toHaveProperty('wedding_countdown')
    it('includes wedding progress tracking', async () => {
          include_progress: 'true',
      expect(mockSupabase.from().select).toHaveBeenCalledWith(
        expect.stringContaining('wedding_progress')
    it('tracks wedding payment status', async () => {
          include_payments: 'true',
        expect.stringContaining('payment_status')
    it('generates wedding client analytics', async () => {
          analytics: 'true',
      expect(responseData.analytics).toEqual(
          total_clients: expect.any(Number),
          booked_weddings: expect.any(Number),
          leads: expect.any(Number),
          upcoming_weddings: expect.any(Number),
          total_revenue: expect.any(Number),
  describe('Performance and Optimization', () => {
    it('implements pagination for large wedding client lists', async () => {
          page: '2',
          limit: '50',
      expect(mockSupabase.from().range).toHaveBeenCalledWith(50, 99) // Page 2, 50 per page
    it('caches frequently accessed wedding client data', async () => {
          'cache-control': 'max-age=300',
      expect(res.getHeader('cache-control')).toContain('max-age')
    it('implements database query optimization for wedding searches', async () => {
          search: 'Smith',
      // Verify efficient query structure
        expect.stringContaining('created_at')
  describe('Error Handling and Validation', () => {
    it('handles database connection failures gracefully', async () => {
      mockSupabase.from().select.mockRejectedValue(
        new Error('Connection to database failed')
      expect(res._getStatusCode()).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    it('validates wedding date formats and constraints', async () => {
      const invalidDateData = {
        wedding_date: '2020-01-01', // Past date
        body: invalidDateData,
      expect(responseData.error).toContain('wedding date cannot be in the past')
    it('handles concurrent wedding client updates', async () => {
      // Simulate optimistic concurrency conflict
        error: { code: '409', message: 'Resource was modified by another user' },
        venue_name: 'Updated Venue',
        version: 1, // Stale version
      expect(responseData.error).toContain('modified by another user')
})
