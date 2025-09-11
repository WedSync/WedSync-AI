import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { testSupabase, testCleanup, integrationHelpers } from '../../../tests/integration/setup'

// WS-092: Authentication Flow Integration Tests
// Critical for preventing unauthorized access to wedding data
const app = next({ dev: false })
const handle = app.getRequestHandler()
describe('Authentication Flow Integration', () => {
  let server: any
  beforeEach(async () => {
    await app.prepare()
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })
  })
  describe('User Registration Flow', () => {
    it('should complete full signup workflow with email verification', async () => {
      const userData = {
        email: 'newplanner@wedsync.com',
        password: 'SecurePassword123!',
        first_name: 'New',
        last_name: 'Planner',
        role: 'planner',
        business_name: 'Wedding Dreams LLC',
      }
      // Step 1: Submit signup request
      const signupResponse = await request(server)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201)
      expect(signupResponse.body).toMatchObject({
        success: true,
        message: expect.stringContaining('verification'),
        user: expect.objectContaining({
          email: userData.email,
          id: expect.any(String),
        })
      })
      // Step 2: Verify email confirmation was triggered
      await integrationHelpers.waitFor(async () => {
        const user = await testSupabase.auth.admin.getUserById(signupResponse.body.user.id)
        return user.data.user?.email_confirmed_at !== null
      }, 10000)
      // Step 3: Verify user profile was created
      const userProfile = await integrationHelpers.verifyDatabaseState('user_profiles', {
        email: userData.email
      expect(userProfile).toHaveLength(1)
      expect(userProfile[0]).toMatchObject({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
    it('should reject signup with invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        first_name: 'Test',
        last_name: 'User',
      const response = await request(server)
        .send(invalidData)
        .expect(400)
      expect(response.body).toMatchObject({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email'),
          })
        ])
    it('should enforce password security requirements', async () => {
      const weakPasswordData = {
        email: 'test@wedsync.com',
        password: '123456', // Too weak
        .send(weakPasswordData)
            field: 'password',
            message: expect.stringContaining('requirements'),
    it('should prevent duplicate email registration', async () => {
        email: 'duplicate@wedsync.com',
        first_name: 'First',
      // First registration
      await request(server)
      // Duplicate registration attempt
      const duplicateResponse = await request(server)
        .send({ ...userData, first_name: 'Second' })
      expect(duplicateResponse.body).toMatchObject({
        error: expect.stringContaining('already exists'),
  describe('User Login Flow', () => {
    let testUser: any
    beforeEach(async () => {
      testUser = await testCleanup.createTestUser('login-test@wedsync.com', 'planner')
    it('should authenticate user with valid credentials', async () => {
      const loginData = {
        email: 'login-test@wedsync.com',
        password: 'test-password-123',
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)
          id: testUser.id,
          email: testUser.email,
        }),
        session: expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String),
          expires_at: expect.any(Number),
      // Verify session is valid
      const { data: sessionUser, error } = await testSupabase.auth.getUser(
        response.body.session.access_token
      )
      expect(error).toBeNull()
      expect(sessionUser.user?.id).toBe(testUser.id)
    it('should reject invalid credentials', async () => {
      const invalidLoginData = {
        password: 'wrong-password',
        .send(invalidLoginData)
        .expect(401)
        error: expect.stringContaining('Invalid credentials'),
    it('should handle rate limiting for failed attempts', async () => {
      // Make multiple failed attempts
      const failedAttempts = Array(5).fill(null).map(() =>
        request(server)
          .post('/api/auth/login')
          .send(invalidLoginData)
          .expect(401)
      await Promise.all(failedAttempts)
      // Next attempt should be rate limited
      const rateLimitedResponse = await request(server)
        .expect(429)
      expect(rateLimitedResponse.body).toMatchObject({
        error: expect.stringContaining('rate limit'),
    it('should create user session and set secure cookies', async () => {
      // Check for secure session cookies
      const cookies = response.headers['set-cookie']
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('sb-access-token'),
          expect.stringContaining('sb-refresh-token'),
          expect.stringContaining('HttpOnly'),
          expect.stringContaining('Secure'),
          expect.stringContaining('SameSite'),
  describe('Password Reset Flow', () => {
      testUser = await testCleanup.createTestUser('reset-test@wedsync.com', 'planner')
    it('should initiate password reset flow', async () => {
      const resetData = {
        email: 'reset-test@wedsync.com',
        .post('/api/auth/forgot-password')
        .send(resetData)
        message: expect.stringContaining('reset link'),
      // Verify reset token was created (in real app, this would be sent via email)
        const { data: user } = await testSupabase.auth.admin.getUserById(testUser.id)
        return user.user?.last_sign_in_at !== user.user?.created_at
      }, 5000)
    it('should complete password reset with valid token', async () => {
      // First, initiate reset
        .send({ email: 'reset-test@wedsync.com' })
      // In real scenario, token would come from email
      // For testing, we'll simulate the reset completion
      const newPassword = 'NewSecurePassword123!'
      
      const resetResponse = await request(server)
        .post('/api/auth/reset-password')
        .send({
          token: 'test-reset-token', // Mock token
          password: newPassword,
      expect(resetResponse.body).toMatchObject({
        message: expect.stringContaining('password updated'),
      // Verify user can login with new password
      const loginResponse = await request(server)
          email: 'reset-test@wedsync.com',
      expect(loginResponse.body.success).toBe(true)
    it('should reject password reset for non-existent email', async () => {
        .send({ email: 'nonexistent@wedsync.com' })
        error: expect.stringContaining('not found'),
  describe('Session Management', () => {
    let authenticatedUser: any
    let userSession: any
      const authContext = await integrationHelpers.createAuthenticatedContext('session-test@wedsync.com')
      authenticatedUser = authContext.user
      userSession = authContext.session
    it('should validate active session', async () => {
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${userSession.access_token}`)
          id: authenticatedUser.id,
          email: authenticatedUser.email,
    it('should refresh expired tokens', async () => {
        .post('/api/auth/refresh')
        .send({ refresh_token: userSession.refresh_token })
      // New tokens should be different from original
      expect(response.body.session.access_token).not.toBe(userSession.access_token)
      expect(response.body.session.refresh_token).not.toBe(userSession.refresh_token)
    it('should logout and invalidate session', async () => {
      const logoutResponse = await request(server)
        .post('/api/auth/logout')
      expect(logoutResponse.body).toMatchObject({
        message: expect.stringContaining('logged out'),
      // Verify session is now invalid
      const sessionResponse = await request(server)
      expect(sessionResponse.body).toMatchObject({
        error: expect.stringContaining('Invalid session'),
    it('should handle concurrent sessions', async () => {
      // Create second session for same user
      const secondSession = await testCleanup.authenticateAs('session-test@wedsync.com')
      // Both sessions should be valid
      const firstSessionCheck = await request(server)
      const secondSessionCheck = await request(server)
        .set('Authorization', `Bearer ${secondSession.access_token}`)
      expect(firstSessionCheck.body.success).toBe(true)
      expect(secondSessionCheck.body.success).toBe(true)
  describe('Role-Based Access Control', () => {
    let plannerUser: any
    let clientUser: any
    let vendorUser: any
    let plannerSession: any
    let clientSession: any
    let vendorSession: any
      const plannerContext = await integrationHelpers.createAuthenticatedContext('planner@rbac.test')
      const clientContext = await integrationHelpers.createAuthenticatedContext('client@rbac.test')
      const vendorContext = await integrationHelpers.createAuthenticatedContext('vendor@rbac.test')
      plannerUser = plannerContext.user
      clientUser = clientContext.user
      vendorUser = vendorContext.user
      plannerSession = plannerContext.session
      clientSession = clientContext.session
      vendorSession = vendorContext.session
      // Update user roles in database
      await testSupabase.from('user_profiles').upsert([
        { user_id: plannerUser.id, role: 'planner', email: plannerUser.email },
        { user_id: clientUser.id, role: 'client', email: clientUser.email },
        { user_id: vendorUser.id, role: 'vendor', email: vendorUser.email },
      ])
    it('should restrict admin endpoints to planners only', async () => {
      const adminEndpoint = '/api/admin/rate-limits'
      // Planner should have access
      const plannerResponse = await request(server)
        .get(adminEndpoint)
        .set('Authorization', `Bearer ${plannerSession.access_token}`)
      expect(plannerResponse.body.success).toBe(true)
      // Client should be denied
      const clientResponse = await request(server)
        .set('Authorization', `Bearer ${clientSession.access_token}`)
        .expect(403)
      expect(clientResponse.body).toMatchObject({
        error: expect.stringContaining('insufficient privileges'),
      // Vendor should be denied
      const vendorResponse = await request(server)
        .set('Authorization', `Bearer ${vendorSession.access_token}`)
    it('should allow vendors access to vendor portal endpoints', async () => {
      const vendorEndpoint = '/api/vendor-portal/weddings'
      // Vendor should have access
        .get(vendorEndpoint)
      expect(vendorResponse.body.success).toBe(true)
    it('should validate role changes require elevated privileges', async () => {
      const roleChangeData = {
        user_id: clientUser.id,
        new_role: 'planner',
      // Client cannot change their own role
      const selfChangeResponse = await request(server)
        .put('/api/auth/change-role')
        .send(roleChangeData)
      // Planner can change user roles
      const plannerChangeResponse = await request(server)
      expect(plannerChangeResponse.body.success).toBe(true)
  describe('Multi-Factor Authentication (MFA)', () => {
    let mfaUser: any
    let mfaSession: any
      const authContext = await integrationHelpers.createAuthenticatedContext('mfa-test@wedsync.com')
      mfaUser = authContext.user
      mfaSession = authContext.session
    it('should enroll user in MFA', async () => {
      const enrollResponse = await request(server)
        .post('/api/auth/mfa/enroll')
        .set('Authorization', `Bearer ${mfaSession.access_token}`)
        .send({ type: 'totp' })
      expect(enrollResponse.body).toMatchObject({
        qr_code: expect.any(String),
        secret: expect.any(String),
        backup_codes: expect.any(Array),
      // Verify MFA enrollment in database
      const mfaRecord = await integrationHelpers.verifyDatabaseState('user_mfa', {
        user_id: mfaUser.id
      expect(mfaRecord).toHaveLength(1)
      expect(mfaRecord[0].status).toBe('pending_verification')
    it('should verify MFA enrollment', async () => {
      // First enroll
      // Then verify with TOTP code (mocked)
      const verifyResponse = await request(server)
        .post('/api/auth/mfa/verify')
        .send({ code: '123456' }) // Mock TOTP code
      expect(verifyResponse.body).toMatchObject({
        message: expect.stringContaining('MFA enabled'),
      // Verify MFA is now active
      expect(mfaRecord[0].status).toBe('active')
    it('should require MFA challenge for MFA-enabled users', async () => {
      // Enable MFA for user
      await testSupabase.from('user_mfa').insert({
        user_id: mfaUser.id,
        type: 'totp',
        status: 'active',
      // Login should trigger MFA challenge
          email: 'mfa-test@wedsync.com',
          password: 'test-password-123',
      expect(loginResponse.body).toMatchObject({
        mfa_required: true,
        challenge_id: expect.any(String),
      // Complete MFA challenge
      const mfaResponse = await request(server)
        .post('/api/auth/mfa/challenge')
          challenge_id: loginResponse.body.challenge_id,
          code: '123456', // Mock TOTP code
      expect(mfaResponse.body).toMatchObject({
})
