import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { testApiHandler } from 'next-test-api-route-handler'
import { createMocks } from 'node-mocks-http'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
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
    auth: { windowMs: 900000, max: 5 },
    api: { windowMs: 60000, max: 100 },
// Mock validation schemas
vi.mock('@/lib/validations/auth', () => ({
  signInSchema: {
    parse: vi.fn((data) => data),
  signUpSchema: {
describe('Authentication API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('POST /api/auth/signin', () => {
    it('successfully authenticates valid wedding photographer credentials', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'photographer@weddingstudio.com',
        user_metadata: {
          name: 'John Smith Photography',
          role: 'photographer',
        },
      }
      const mockProfile = {
        user_id: 'test-user-id',
        organization_id: 'wedding-studio-123',
        role: 'photographer',
        subscription_status: 'active',
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'photographer@weddingstudio.com',
          password: 'securepassword123',
      // Import the actual route handler
      const handler = await import('@/app/api/auth/signin/route')
      await handler.POST(req as NextRequest)
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        password: 'securepassword123',
      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.user).toEqual(mockUser)
      expect(responseData.profile).toEqual(mockProfile)
    })
    it('rejects invalid wedding professional credentials', async () => {
        data: { user: null },
        error: { message: 'Invalid login credentials' },
          email: 'invalid@example.com',
          password: 'wrongpassword',
      expect(res._getStatusCode()).toBe(401)
      expect(responseData.error).toBe('Invalid login credentials')
    it('enforces rate limiting for signin attempts', async () => {
      const { rateLimit } = await import('@/lib/rate-limit')
      const rateLimitResponse = new Response('Rate limit exceeded', { status: 429 })
      ;(rateLimit as unknown).mockResolvedValue(rateLimitResponse)
      const { req } = createMocks({
          email: 'photographer@example.com',
          password: 'password',
      const response = await handler.POST(req as NextRequest)
      expect(response.status).toBe(429)
      expect(rateLimit).toHaveBeenCalledWith(req, expect.any(Object))
    it('validates input data format for wedding accounts', async () => {
          email: 'invalid-email',
          password: '', // Empty password
      expect(res._getStatusCode()).toBe(400)
      expect(responseData.error).toContain('validation')
    it('handles wedding studio account activation', async () => {
        email: 'studio@weddings.com',
        email_confirmed_at: null,
        user_metadata: { role: 'photographer' },
          email: 'studio@weddings.com',
          password: 'password123',
      expect(res._getStatusCode()).toBe(403)
      expect(responseData.error).toBe('Please verify your email address')
    it('handles multi-factor authentication for wedding professionals', async () => {
        email: 'pro@weddingstudio.com',
        user_metadata: { mfa_enabled: true },
        error: { message: 'MFA required' },
          email: 'pro@weddingstudio.com',
      expect(responseData.mfa_required).toBe(true)
      expect(responseData.next_step).toBe('verify_mfa_token')
  describe('POST /api/auth/signup', () => {
    it('creates new wedding professional account successfully', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'newphotographer@studio.com',
          name: 'New Wedding Studio',
          business_type: 'photography',
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ user_id: 'new-user-id', role: 'photographer' }],
          email: 'newphotographer@studio.com',
          terms_accepted: true,
          privacy_accepted: true,
      const handler = await import('@/app/api/auth/signup/route')
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        options: {
          data: {
            name: 'New Wedding Studio',
            role: 'photographer',
            business_type: 'photography',
          },
      expect(res._getStatusCode()).toBe(201)
      expect(responseData.message).toBe('Account created successfully')
      expect(responseData.verification_required).toBe(true)
    it('prevents duplicate wedding professional accounts', async () => {
        error: { message: 'User already registered' },
          email: 'existing@studio.com',
          name: 'Existing Studio',
      expect(res._getStatusCode()).toBe(409)
      expect(responseData.error).toBe('Account already exists')
    it('validates required terms acceptance for wedding professionals', async () => {
          email: 'photographer@studio.com',
          name: 'Wedding Studio',
          terms_accepted: false, // Not accepted
      expect(responseData.error).toContain('terms')
    it('validates wedding business types', async () => {
          email: 'vendor@example.com',
          name: 'Wedding Vendor',
          role: 'vendor',
          business_type: 'invalid_type',
      expect(responseData.error).toContain('business_type')
    it('creates user profile after successful wedding account creation', async () => {
        email: 'planner@weddings.com',
        user_metadata: { name: 'Wedding Planner Co', role: 'planner' },
      const mockProfileData = {
        user_id: 'new-user-id',
        name: 'Wedding Planner Co',
        role: 'planner',
        business_type: 'planning',
        subscription_status: 'trial',
        trial_ends_at: expect.any(String),
        data: [mockProfileData],
          email: 'planner@weddings.com',
          name: 'Wedding Planner Co',
          role: 'planner',
          business_type: 'planning',
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
  describe('POST /api/auth/logout', () => {
    it('successfully logs out wedding professional', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        headers: {
          authorization: 'Bearer valid-session-token',
      const handler = await import('@/app/api/auth/logout/route')
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(responseData.message).toBe('Logged out successfully')
    it('handles logout with invalid session gracefully', async () => {
        error: { message: 'Invalid session' },
          authorization: 'Bearer invalid-token',
      expect(res._getStatusCode()).toBe(200) // Still success for security
  describe('GET /api/auth/session', () => {
    it('returns valid wedding professional session', async () => {
        email: 'photographer@studio.com',
          name: 'Wedding Photography Studio',
          subscription_status: 'active',
        organization_id: 'studio-org-123',
        permissions: ['read_clients', 'write_clients', 'manage_weddings'],
        subscription_plan: 'professional',
      mockSupabase.auth.getUser.mockResolvedValue({
        method: 'GET',
      const handler = await import('@/app/api/auth/session/route')
      await handler.GET(req as NextRequest)
      expect(responseData.permissions).toEqual(mockProfile.permissions)
    it('returns 401 for invalid wedding professional session', async () => {
      expect(responseData.error).toBe('Unauthorized')
    it('handles expired wedding professional subscriptions', async () => {
        subscription_status: 'expired',
        subscription_expires_at: '2023-01-01T00:00:00Z',
      expect(responseData.subscription_warning).toBe('Subscription expired')
      expect(responseData.limited_access).toBe(true)
  describe('Error Handling', () => {
    it('handles database connection errors during authentication', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Database connection failed')
      )
      expect(res._getStatusCode()).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    it('handles malformed request bodies gracefully', async () => {
        body: 'invalid-json',
          'content-type': 'application/json',
      expect(responseData.error).toContain('Invalid request format')
    it('sanitizes input data to prevent XSS in wedding forms', async () => {
      const maliciousInput = {
        password: 'password123',
        name: '<script>alert("xss")</script>Wedding Studio',
        business_type: 'photography',
        body: maliciousInput,
      // Verify that malicious script tags are sanitized
          data: expect.objectContaining({
            name: 'Wedding Studio', // Script tags removed
          }),
  describe('Security Features', () => {
    it('implements proper CSRF protection for wedding forms', async () => {
          origin: 'https://malicious-site.com',
      expect(responseData.error).toContain('CSRF')
    it('validates password strength for wedding professional accounts', async () => {
          password: '123', // Weak password
      expect(responseData.error).toContain('password strength')
    it('implements account lockout after failed login attempts', async () => {
      // Simulate multiple failed attempts
      const requests = Array.from({ length: 6 }, (_, i) => 
        createMocks({
          method: 'POST',
          body: {
            email: 'photographer@studio.com',
            password: 'wrongpassword',
        })
      // Make 6 failed attempts
      for (const { req, res } of requests) {
        await handler.POST(req as NextRequest)
      const lastResponse = requests[5].res
      expect(lastResponse._getStatusCode()).toBe(429)
      const responseData = JSON.parse(lastResponse._getData())
      expect(responseData.error).toContain('account locked')
})
