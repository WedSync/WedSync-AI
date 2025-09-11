import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { testSupabase, testCleanup, integrationHelpers, mockServer } from '../../../../tests/integration/setup'
import { http, HttpResponse } from 'msw'

// WS-092: Multi-Factor Authentication Integration Tests
// Critical for securing wedding planner accounts and protecting client data
const app = next({ dev: false })
const handle = app.getRequestHandler()
describe('Multi-Factor Authentication Integration', () => {
  let server: any
  let testUser: any
  let testSession: any
  beforeEach(async () => {
    await app.prepare()
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })
    // Create test user with MFA
    testUser = {
      email: 'mfa-test@wedsync.com',
      password: 'SecurePassword123!',
      role: 'planner',
      mfa_enabled: false,
    }
  })
  afterEach(async () => {
    await testCleanup.clearAuthentication()
    await testCleanup.clearTestData()
    if (server) {
      server.close()
  describe('MFA Setup Workflow', () => {
    it('should enable MFA with TOTP successfully', async () => {
      // First, create and authenticate user
      const authContext = await integrationHelpers.createAuthenticatedContext(testUser.email)
      
      // Request MFA setup
      const setupResponse = await request(server)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${authContext.session.access_token}`)
        .expect('Content-Type', /json/)
        .expect(200)
      expect(setupResponse.body).toMatchObject({
        success: true,
        qr_code: expect.stringContaining('data:image/png'),
        secret: expect.any(String),
        backup_codes: expect.arrayContaining([
          expect.stringMatching(/^[A-Z0-9]{8}$/),
        ])
      })
      expect(setupResponse.body.backup_codes).toHaveLength(10)
      // Verify MFA setup in database
      const userProfile = await integrationHelpers.verifyDatabaseState('user_profiles', {
        user_id: authContext.user.id,
      expect(userProfile[0].mfa_pending_setup).toBe(true)
      // Simulate TOTP verification (mock the verification for testing)
      const mockTOTP = '123456'
      mockServer.use(
        http.post('*/auth/mfa/verify-setup', () => {
          return HttpResponse.json({
            success: true,
            verified: true,
          })
        })
      )
      const verifyResponse = await request(server)
        .post('/api/auth/mfa/verify-setup')
        .send({
          totp_code: mockTOTP,
          secret: setupResponse.body.secret,
      expect(verifyResponse.body).toMatchObject({
        mfa_enabled: true,
      // Verify MFA is now enabled in database
      const updatedProfile = await integrationHelpers.verifyDatabaseState('user_profiles', {
      expect(updatedProfile[0].mfa_enabled).toBe(true)
      expect(updatedProfile[0].mfa_pending_setup).toBe(false)
    it('should enforce MFA for high-privilege operations', async () => {
      // Create user with MFA enabled
      // Enable MFA in database
      await testSupabase.from('user_profiles').update({
        mfa_secret: 'test-secret-key',
      }).eq('user_id', authContext.user.id)
      // Attempt sensitive operation without MFA verification
      const response = await request(server)
        .delete('/api/clients/bulk-delete')
        .send({ client_ids: ['client-1', 'client-2'] })
        .expect(403)
      expect(response.body).toMatchObject({
        success: false,
        error: 'MFA verification required',
        mfa_required: true,
    it('should handle backup codes correctly', async () => {
      // Setup MFA and get backup codes
      const backupCodes = setupResponse.body.backup_codes
      // Store backup codes in database (hashed)
      await testSupabase.from('mfa_backup_codes').insert(
        backupCodes.map(code => ({
          user_id: authContext.user.id,
          code_hash: Buffer.from(code).toString('base64'), // Simple hash for testing
          used: false,
        }))
      // Use backup code for authentication
      const loginResponse = await request(server)
        .post('/api/auth/login')
          email: testUser.email,
          password: 'test-password-123',
          backup_code: backupCodes[0],
      expect(loginResponse.body).toMatchObject({
        session: expect.any(Object),
      // Verify backup code is marked as used
      const usedCode = await integrationHelpers.verifyDatabaseState('mfa_backup_codes', {
        code_hash: Buffer.from(backupCodes[0]).toString('base64'),
      expect(usedCode[0].used).toBe(true)
      // Attempt to reuse the same backup code
      const reuseResponse = await request(server)
        .expect(401)
      expect(reuseResponse.body).toMatchObject({
        error: expect.stringContaining('Invalid or used backup code'),
  describe('Login Flow with MFA', () => {
    beforeEach(async () => {
        mfa_secret: 'JBSWY3DPEHPK3PXP', // Test secret
    it('should require MFA code after initial authentication', async () => {
      // First step: email and password
      const firstStepResponse = await request(server)
      expect(firstStepResponse.body).toMatchObject({
        session_token: expect.any(String), // Temporary token
      // Second step: MFA verification
        http.post('*/auth/mfa/verify', () => {
            valid: true,
      const secondStepResponse = await request(server)
        .post('/api/auth/mfa/verify')
          session_token: firstStepResponse.body.session_token,
          totp_code: '123456',
      expect(secondStepResponse.body).toMatchObject({
        session: expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String),
      // Verify session is fully authenticated
      const profileResponse = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${secondStepResponse.body.session.access_token}`)
      expect(profileResponse.body.user.email).toBe(testUser.email)
    it('should rate limit MFA attempts', async () => {
      // Get initial session token
      const sessionToken = loginResponse.body.session_token
      // Attempt multiple incorrect MFA codes
      const attempts = Array(6).fill(null).map((_, i) => 
        request(server)
          .post('/api/auth/mfa/verify')
          .send({
            session_token: sessionToken,
            totp_code: `00000${i}`,
      const results = await Promise.all(attempts)
      // First 5 attempts should fail with invalid code
      results.slice(0, 5).forEach(result => {
        expect(result.status).toBe(401)
        expect(result.body.error).toContain('Invalid')
      // 6th attempt should be rate limited
      expect(results[5].status).toBe(429)
      expect(results[5].body).toMatchObject({
        error: expect.stringContaining('Too many attempts'),
        retry_after: expect.any(Number),
    it('should handle MFA recovery flow', async () => {
      // Request MFA recovery
      const recoveryResponse = await request(server)
        .post('/api/auth/mfa/recovery')
      expect(recoveryResponse.body).toMatchObject({
        message: 'Recovery email sent',
      // Verify recovery token was created
      const recoveryTokens = await integrationHelpers.verifyDatabaseState('mfa_recovery_tokens', {
        email: testUser.email,
      expect(recoveryTokens).toHaveLength(1)
      expect(recoveryTokens[0].expires_at).toBeTruthy()
      // Simulate clicking recovery link
      const recoveryToken = recoveryTokens[0].token
      const resetResponse = await request(server)
        .post('/api/auth/mfa/reset')
          token: recoveryToken,
          password: 'NewSecurePassword456!',
      expect(resetResponse.body).toMatchObject({
        mfa_disabled: true,
      // Verify MFA is disabled
      expect(userProfile[0].mfa_enabled).toBe(false)
  describe('Session Management with MFA', () => {
    it('should require re-authentication for sensitive operations', async () => {
      // Enable MFA
        last_mfa_verification: new Date(Date.now() - 3700000).toISOString(), // 61 minutes ago
      // Attempt sensitive operation (should require re-authentication)
        .put('/api/settings/security')
          two_factor_required_for_team: true,
        error: 'Re-authentication required',
        mfa_challenge: true,
    it('should maintain MFA session with proper timeout', async () => {
      // Set recent MFA verification
        last_mfa_verification: new Date().toISOString(),
      // Should allow sensitive operation within timeout
        settings_updated: true,
    it('should handle device trust for MFA', async () => {
      // Register trusted device
      const deviceId = 'device-123-abc'
      const trustResponse = await request(server)
        .post('/api/auth/mfa/trust-device')
          device_id: deviceId,
          device_name: 'Test Browser',
          trust_duration_days: 30,
      expect(trustResponse.body).toMatchObject({
        device_trusted: true,
        expires_at: expect.any(String),
      // Verify device trust in database
      const trustedDevices = await integrationHelpers.verifyDatabaseState('trusted_devices', {
        device_id: deviceId,
      expect(trustedDevices).toHaveLength(1)
      expect(trustedDevices[0].trusted).toBe(true)
      // Login from trusted device should skip MFA
      const trustedLoginResponse = await request(server)
        .set('X-Device-ID', deviceId)
      expect(trustedLoginResponse.body).toMatchObject({
        mfa_required: false, // Skipped due to trusted device
  describe('MFA Audit and Compliance', () => {
    it('should log all MFA-related events', async () => {
      await request(server)
      // Verify audit log entry
      const auditLogs = await integrationHelpers.verifyDatabaseState('audit_logs', {
        event_type: 'mfa_setup_initiated',
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].metadata).toMatchObject({
        ip_address: expect.any(String),
        user_agent: expect.any(String),
      // Failed MFA attempt
          session_token: 'invalid-token',
          totp_code: '000000',
      // Verify failed attempt logged
      const failedLogs = await integrationHelpers.verifyDatabaseState('audit_logs', {
        event_type: 'mfa_verification_failed',
      expect(failedLogs.length).toBeGreaterThan(0)
    it('should enforce organization-wide MFA policies', async () => {
      // Create organization with MFA requirement
      const { data: org } = await testSupabase.from('organizations').insert({
        name: 'Secure Wedding Planners',
        settings: {
          require_mfa: true,
          mfa_grace_period_days: 7,
        }
      }).select().single()
      // Create user in organization
      const authContext = await integrationHelpers.createAuthenticatedContext('org-user@wedsync.com')
        organization_id: org.id,
        mfa_enabled: false,
      // User should be prompted to enable MFA
        user: expect.any(Object),
        mfa_required_by_org: true,
        grace_period_remaining_days: 7,
      // After grace period, should enforce MFA
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(), // 8 days ago
      const enforcedResponse = await request(server)
        .get('/api/clients')
      expect(enforcedResponse.body).toMatchObject({
        error: 'MFA setup required by organization policy',
        redirect: '/auth/mfa/setup',
})
