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
    upsert: vi.fn().mockReturnThis(),
  })),
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}))
// Mock validation schemas
vi.mock('@/lib/validations/guest', () => ({
  createGuestSchema: {
    parse: vi.fn((data) => data),
  updateGuestSchema: {
  bulkGuestSchema: {
describe('Guests API', () => {
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
  describe('GET /api/clients/[clientId]/guests', () => {
    it('returns wedding guest list for authenticated photographer', async () => {
      const mockGuests = [
        generateWeddingTestData.guest({
          id: 'guest-1',
          name: 'Alice Johnson',
          email: 'alice@email.com',
          phone: '+1234567890',
          rsvp_status: 'confirmed',
          dietary_restrictions: 'vegetarian',
          plus_one: true,
          plus_one_name: 'Bob Johnson',
          table_number: 5,
          side: 'bride',
          guest_type: 'family',
        }),
          id: 'guest-2',
          name: 'Charlie Wilson',
          email: 'charlie@email.com',
          phone: '+0987654321',
          rsvp_status: 'pending',
          dietary_restrictions: 'gluten-free',
          plus_one: false,
          side: 'groom',
          guest_type: 'friend',
      ]
      mockSupabase.from().select().eq().range.mockResolvedValue({
        data: mockGuests,
        error: null,
        count: mockGuests.length,
      })
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          page: '1',
          limit: '50',
        },
        headers: {
          authorization: 'Bearer valid-token',
      const handler = await import('@/app/api/clients/[clientId]/guests/route')
      await handler.GET(req as NextRequest, { params: { clientId: 'client-123' } })
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('client_id', 'client-123')
      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.data).toEqual(mockGuests)
      expect(responseData.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      expect(responseData.analytics).toEqual({
        total_guests: 3, // 2 primary + 1 plus-one
        confirmed: 1,
        pending: 1,
        declined: 0,
        dietary_restrictions: 2,
        plus_ones: 1,
        tables_assigned: 1,
    it('filters wedding guests by RSVP status', async () => {
      const confirmedGuests = [
      mockSupabase.from().select().eq().filter().range.mockResolvedValue({
        data: confirmedGuests,
        count: confirmedGuests.length,
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('rsvp_status', 'eq', 'confirmed')
    it('filters wedding guests by wedding side', async () => {
      expect(mockSupabase.from().filter).toHaveBeenCalledWith('side', 'eq', 'bride')
    it('searches wedding guests by name and contact info', async () => {
          search: 'Alice Johnson',
      expect(mockSupabase.from().filter).toHaveBeenCalledWith(
        'search_text',
        'ilike',
        '%Alice Johnson%'
      )
    it('filters guests with dietary restrictions', async () => {
          has_dietary_restrictions: 'true',
        'dietary_restrictions',
        'neq',
        ''
    it('groups guests by household/family', async () => {
          group_by: 'household',
      expect(responseData.households).toBeDefined()
    it('requires authentication and client access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
          authorization: 'Bearer invalid-token',
      expect(res._getStatusCode()).toBe(401)
  describe('POST /api/clients/[clientId]/guests', () => {
    it('adds new wedding guest successfully', async () => {
      const newGuestData = {
        name: 'Emily Davis',
        email: 'emily@email.com',
        phone: '+1555123456',
        address: '789 Guest Lane, City, ST 12345',
        rsvp_status: 'pending',
        dietary_restrictions: 'dairy-free',
        allergies: 'nuts',
        plus_one: true,
        plus_one_name: 'Michael Davis',
        guest_type: 'family',
        side: 'bride',
        transportation_needed: false,
        accommodation_needed: true,
        special_requests: 'Wheelchair accessible seating',
      }
      const createdGuest = {
        id: 'new-guest-id',
        client_id: 'client-123',
        ...newGuestData,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      mockSupabase.from().insert.mockResolvedValue({
        data: [createdGuest],
        method: 'POST',
        body: newGuestData,
          'content-type': 'application/json',
      await handler.POST(req as NextRequest, { params: { clientId: 'client-123' } })
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newGuestData,
          client_id: 'client-123',
          created_by: 'photographer-user-id',
        })
      expect(res._getStatusCode()).toBe(201)
      expect(responseData.data).toEqual(createdGuest)
      expect(responseData.message).toBe('Wedding guest added successfully')
    it('validates required wedding guest fields', async () => {
      const invalidGuestData = {
        name: '', // Required field missing
        email: 'invalid-email-format',
        phone: 'invalid-phone',
        body: invalidGuestData,
      expect(res._getStatusCode()).toBe(400)
      expect(responseData.error).toContain('validation')
    it('prevents duplicate wedding guest emails for same client', async () => {
      const duplicateGuestData = {
        name: 'Duplicate Guest',
        email: 'existing@email.com',
        data: null,
        error: { 
          code: '23505', 
          message: 'duplicate key value violates unique constraint "guests_client_id_email_key"',
        body: duplicateGuestData,
      expect(res._getStatusCode()).toBe(409)
      expect(responseData.error).toBe('Guest with this email already exists for this wedding')
    it('sanitizes wedding guest input data', async () => {
      const maliciousGuestData = {
        name: '<script>alert("xss")</script>John Smith',
        email: 'john@email.com',
        dietary_restrictions: 'vegetarian<img src="x" onerror="alert(1)">',
        special_requests: 'Seating near<iframe src="malicious.com"></iframe>family',
        address: '123 Main St<script>malicious()</script>, City, ST',
        body: maliciousGuestData,
      // Verify malicious content is sanitized
          name: 'John Smith', // Script tags removed
          dietary_restrictions: 'vegetarian', // Malicious HTML removed
          special_requests: 'Seating nearfamily', // Iframe removed
          address: '123 Main St, City, ST', // Script removed
    it('automatically generates RSVP token for guest', async () => {
        name: 'Alice Wonder',
        email: 'alice@email.com',
          rsvp_token: expect.any(String),
          rsvp_link: expect.stringContaining('/rsvp/'),
  describe('PUT /api/guests/[id]', () => {
    it('updates wedding guest information successfully', async () => {
      const updateData = {
        rsvp_status: 'confirmed',
        dietary_restrictions: 'vegan',
        plus_one_name: 'Partner Name',
        table_number: 8,
        meal_choice: 'vegetarian',
        special_requests: 'Window seat preferred',
        transportation_needed: true,
      const updatedGuest = {
        id: 'guest-1',
        ...updateData,
        updated_at: '2024-01-15T12:00:00Z',
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedGuest,
        method: 'PUT',
        body: updateData,
      const handler = await import('@/app/api/guests/[id]/route')
      await handler.PUT(req as NextRequest, { params: { id: 'guest-1' } })
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
          ...updateData,
          updated_at: expect.any(String),
      expect(responseData.data).toEqual(updatedGuest)
    it('tracks RSVP status changes for wedding analytics', async () => {
        rsvp_responded_at: '2024-01-15T12:00:00Z',
      // Verify RSVP tracking
      expect(mockSupabase.from).toHaveBeenCalledWith('rsvp_responses')
    it('validates table assignment capacity', async () => {
        table_number: 5,
      // Mock table capacity check
      mockSupabase.from().select().eq().mockResolvedValue({
        data: Array(10).fill({}), // Table already has 10 guests
        count: 10,
      expect(responseData.error).toContain('table capacity exceeded')
    it('handles dietary restriction changes for catering updates', async () => {
        dietary_restrictions: 'kosher',
        allergies: 'shellfish, tree nuts',
      // Verify catering notification is triggered
      expect(mockSupabase.from).toHaveBeenCalledWith('catering_notifications')
  describe('DELETE /api/guests/[id]', () => {
    it('removes wedding guest with confirmation', async () => {
      mockSupabase.from().delete().eq().mockResolvedValue({
        data: [{ id: 'guest-1', name: 'Deleted Guest' }],
        method: 'DELETE',
          confirm: 'true',
      await handler.DELETE(req as NextRequest, { params: { id: 'guest-1' } })
      expect(mockSupabase.from().delete).toHaveBeenCalled()
      expect(responseData.message).toBe('Wedding guest removed successfully')
    it('requires confirmation for guest deletion', async () => {
      expect(responseData.error).toBe('Confirmation required for guest deletion')
    it('updates table assignments when guest is removed', async () => {
      // Verify table rebalancing is triggered
      expect(mockSupabase.from).toHaveBeenCalledWith('table_assignments')
  describe('Bulk Operations', () => {
    it('handles bulk guest import from CSV', async () => {
      const guestCsvData = [
        {
          name: 'John Smith',
          email: 'john@email.com',
          name: 'Jane Doe',
          email: 'jane@email.com',
        data: guestCsvData.map((guest, index) => ({
          id: `imported-guest-${index}`,
          ...guest,
        })),
        body: {
          operation: 'bulk_import',
          guests: guestCsvData,
      const handler = await import('@/app/api/clients/[clientId]/guests/bulk/route')
      expect(responseData.imported_count).toBe(2)
      expect(responseData.message).toBe('2 wedding guests imported successfully')
    it('handles bulk RSVP reminders', async () => {
      const guestIds = ['guest-1', 'guest-2', 'guest-3']
          operation: 'send_rsvp_reminders',
          guest_ids: guestIds,
      const handler = await import('@/app/api/guests/bulk/route')
      await handler.POST(req as NextRequest)
      expect(responseData.reminders_sent).toBe(3)
      expect(responseData.message).toBe('RSVP reminders sent to 3 guests')
    it('handles bulk table assignments', async () => {
      const tableAssignments = [
        { guest_id: 'guest-1', table_number: 5 },
        { guest_id: 'guest-2', table_number: 5 },
        { guest_id: 'guest-3', table_number: 6 },
          operation: 'assign_tables',
          assignments: tableAssignments,
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        tableAssignments.map(assignment => ({
          ...assignment,
        }))
      expect(responseData.assigned_count).toBe(3)
    it('validates bulk operation permissions', async () => {
          operation: 'delete_all_guests',
          client_id: 'unauthorized-client',
      expect(res._getStatusCode()).toBe(403)
      expect(responseData.error).toContain('permission')
  describe('RSVP Management', () => {
    it('processes public RSVP submission', async () => {
      const rsvpData = {
        rsvp_token: 'valid-rsvp-token-123',
        plus_one_name: 'Guest Partner',
        dietary_restrictions: 'vegetarian',
        special_requests: 'Table near dance floor',
      const existingGuest = {
        name: 'John Smith',
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: existingGuest,
      mockSupabase.from().update().eq().mockResolvedValue({
        data: [{ ...existingGuest, ...rsvpData }],
        body: rsvpData,
      const handler = await import('@/app/api/rsvp/route')
          ...rsvpData,
          rsvp_responded_at: expect.any(String),
      expect(responseData.message).toBe('RSVP submitted successfully')
    it('validates RSVP token and prevents unauthorized responses', async () => {
        rsvp_token: 'invalid-token',
        error: { code: 'PGRST116', message: 'Row not found' },
      expect(res._getStatusCode()).toBe(404)
      expect(responseData.error).toBe('Invalid RSVP link')
    it('handles RSVP deadline enforcement', async () => {
      const expiredRsvpData = {
        rsvp_token: 'valid-token',
        rsvp_deadline: '2024-01-01T00:00:00Z', // Past deadline
        body: expiredRsvpData,
      expect(responseData.error).toContain('RSVP deadline has passed')
  describe('Analytics and Reports', () => {
    it('generates wedding guest analytics', async () => {
          analytics: 'true',
      const handler = await import('@/app/api/clients/[clientId]/guests/analytics/route')
      expect(responseData.analytics).toEqual(
          total_invites_sent: expect.any(Number),
          total_responses: expect.any(Number),
          response_rate: expect.any(Number),
          confirmed_attendance: expect.any(Number),
          declined_attendance: expect.any(Number),
          pending_responses: expect.any(Number),
          dietary_requirements: expect.any(Object),
          table_assignments_complete: expect.any(Boolean),
          transportation_needed: expect.any(Number),
          accommodation_needed: expect.any(Number),
    it('exports guest list in multiple formats', async () => {
          format: 'csv',
          export: 'true',
      const handler = await import('@/app/api/clients/[clientId]/guests/export/route')
      expect(res.getHeader('content-type')).toBe('text/csv')
      expect(res.getHeader('content-disposition')).toContain('attachment')
    it('generates seating chart data', async () => {
          seating_chart: 'true',
      const handler = await import('@/app/api/clients/[clientId]/guests/seating/route')
      expect(responseData.tables).toBeDefined()
      expect(responseData.unassigned_guests).toBeDefined()
      expect(responseData.seating_statistics).toBeDefined()
  describe('Error Handling and Edge Cases', () => {
    it('handles guest import with validation errors', async () => {
      const invalidGuestData = [
          name: 'Valid Guest',
          email: 'valid@email.com',
          name: '', // Invalid - empty name
          email: 'invalid-email',
          guests: invalidGuestData,
      expect(res._getStatusCode()).toBe(207) // Partial success
      expect(responseData.successful_imports).toBe(1)
      expect(responseData.failed_imports).toBe(1)
      expect(responseData.errors).toHaveLength(1)
    it('handles concurrent RSVP submissions gracefully', async () => {
      // Simulate concurrent update conflict
        error: { code: '409', message: 'Concurrent modification detected' },
      expect(responseData.error).toContain('please try again')
    it('validates guest count limits for wedding packages', async () => {
      // Mock reaching package guest limit
        name: 'Extra Guest',
        email: 'extra@email.com',
        data: Array(200).fill({}), // Already at limit
        count: 200,
      expect(responseData.error).toContain('guest limit exceeded')
})
