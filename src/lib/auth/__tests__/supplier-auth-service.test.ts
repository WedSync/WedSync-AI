import { SupplierAuthService } from '../supplier-auth-service'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SupplierRegistrationData, SupplierLoginResult, SupplierUser } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-token')
  })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash')
  }))
}))
// Mock data
const mockRegistrationData: SupplierRegistrationData = {
  supplier_id: 'supplier-1',
  email: 'john@photography.com',
  password: 'SecurePassword123!',
  phone: '+1234567890',
  emergency_contact: {
    name: 'Jane Doe',
    phone: '+0987654321',
    relationship: 'spouse'
  },
  notification_preferences: {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    notification_frequency: 'immediate',
    notification_types: ['schedule_updates', 'messages']
  }
}
const mockSupplierUser: SupplierUser = {
  id: 'user-123',
  name: 'John Doe',
  company_name: 'John Photography',
  role: 'photographer',
  permissions: ['read_schedule', 'update_availability'],
  organization_id: 'org-1'
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt = jwt as jest.Mocked<typeof jwt>
describe('SupplierAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValue('jwt-token');
    mockJwt.verify.mockReturnValue({ user_id: 'user-123' } as any)
  })
  describe('registerSupplier', () => {
    it('should register supplier successfully', async () => {
      // Mock supplier exists check
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'supplier-1', organization_id: 'org-1' },
          error: null
        })
        // Mock email uniqueness check
          data: null,
        // Mock user creation
        .mkResolvedValueOnce({
          data: { id: 'user-123' },
      const result = await SupplierAuthService.registerSupplier(
        mockRegistrationData,
        'org-1'
      )
      expect(result.success).toBe(true)
      expect(result.user_id).toBe('user-123')
      expect(result.email_verification_required).toBe(true)
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 12)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        supplier_id: 'supplier-1',
        organization_id: 'org-1',
        email: 'john@photography.com',
        password_hash: 'hashed-password',
        phone: '+1234567890',
        emergency_contact: mockRegistrationData.emergency_contact,
        notification_preferences: mockRegistrationData.notification_preferences,
        email_verification_token: expect.any(String),
        email_verification_expires: expect.any(String),
        account_status: 'pending_verification',
        created_at: expect.any(String)
      })
    })
    it('should handle duplicate email registration', async () => {
          data: { id: 'supplier-1' },
          data: { email: 'john@photography.com' }, // Email already exists
      expect(result.success).toBe(false)
      expect(result.error).toContain('Email address is already registered')
    it('should handle non-existent supplier', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      expect(result.error).toContain('Supplier not found')
    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...mockRegistrationData,
        password: '123'
      }
        weakPasswordData,
      expect(result.error).toContain('Password must be at least 8 characters')
    it('should validate email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email'
        invalidEmailData,
      expect(result.error).toContain('Invalid email format')
  describe('authenticateSupplier', () => {
    const mockMetadata = {
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop' as const
    }
    it('should authenticate supplier successfully', async () => {
          data: {
            id: 'user-123',
            supplier_id: 'supplier-1',
            email: 'john@photography.com',
            password_hash: 'hashed-password',
            account_status: 'active',
            email_verified: true,
            failed_login_attempts: 0,
            two_fa_enabled: false
          },
          data: mockSupplierUser,
        // Mock session creation
            id: 'session-123',
            session_token: 'session-token',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const result = await SupplierAuthService.authenticateSupplier(
        'john@photography.com',
        'SecurePassword123!',
        mockMetadata
      expect(result.user).toEqual(mockSupplierUser)
      expect(result.access_token).toBe('jwt-token')
      expect(result.session).toBeDefined()
      expect(mockBcrypt.compare).toHaveBeenCalledWith('SecurePassword123!', 'hashed-password')
    it('should handle incorrect password', async () => {
        data: {
          id: 'user-123',
          password_hash: 'hashed-password',
          account_status: 'active',
          email_verified: true,
          failed_login_attempts: 0
        },
      mockBcrypt.compare.mockResolvedValueOnce(false)
        'WrongPassword',
      expect(result.error).toContain('Invalid email or password')
      // Should increment failed attempts
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        failed_login_attempts: 1,
        last_failed_login: expect.any(String)
    it('should handle account lockout after multiple failed attempts', async () => {
          failed_login_attempts: 4 // One more will trigger lockout
      expect(result.error).toContain('Account temporarily locked')
        failed_login_attempts: 5,
        account_locked_until: expect.any(String),
    it('should handle unverified email', async () => {
          account_status: 'pending_verification',
          email_verified: false
      expect(result.error).toContain('Email verification required')
    it('should handle 2FA requirement', async () => {
          failed_login_attempts: 0,
          two_fa_enabled: true
      expect(result.requires_2fa).toBe(true)
      expect(result.two_fa_token).toBeDefined()
    it('should handle non-existent user', async () => {
        'nonexistent@email.com',
        'password',
  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
            email_verification_token: 'mock-token',
            email_verification_expires: new Date(Date.now() + 60000).toISOString()
          data: { id: 'user-123', email_verified: true },
      const result = await SupplierAuthService.verifyEmail('mock-token')
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
        account_status: 'active',
        email_verified_at: expect.any(String)
    it('should handle expired verification token', async () => {
          email_verification_token: 'mock-token',
          email_verification_expires: new Date(Date.now() - 60000).toISOString() // Expired
      expect(result.error).toContain('Verification token has expired')
    it('should handle invalid verification token', async () => {
      const result = await SupplierAuthService.verifyEmail('invalid-token')
      expect(result.error).toContain('Invalid verification token')
  describe('validateSession', () => {
    it('should validate active session successfully', async () => {
          id: 'session-123',
          user_id: 'user-123',
          expires_at: new Date(Date.now() + 60000).toISOString(),
          is_active: true,
          user: mockSupplierUser
      const result = await SupplierAuthService.validateSession('session-token')
      expect(result.valid).toBe(true)
    it('should handle expired session', async () => {
          expires_at: new Date(Date.now() - 60000).toISOString(), // Expired
          is_active: true
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Session has expired')
        is_active: false,
        ended_at: expect.any(String)
    it('should handle invalid session', async () => {
      const result = await SupplierAuthService.validateSession('invalid-token')
      expect(result.error).toContain('Invalid session')
    it('should handle inactive session', async () => {
          is_active: false
      expect(result.error).toContain('Session is no longer active')
  describe('requestPasswordReset', () => {
    it('should send password reset email', async () => {
          email: 'john@photography.com',
          account_status: 'active'
      const result = await SupplierAuthService.requestPasswordReset('john@photography.com')
        password_reset_token: expect.any(String),
        password_reset_expires: expect.any(String)
    it('should handle non-existent email', async () => {
      const result = await SupplierAuthService.requestPasswordReset('nonexistent@email.com')
      // Should still return success for security (don't reveal if email exists)
      expect(result.message).toContain('If an account with that email exists')
    it('should handle inactive accounts', async () => {
          account_status: 'disabled'
      expect(result.error).toContain('Account is disabled')
  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
            password_reset_token: 'mock-token',
            password_reset_expires: new Date(Date.now() + 60000).toISOString()
      const result = await SupplierAuthService.resetPassword('mock-token', 'NewPassword123!')
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12)
        password_reset_token: null,
        password_reset_expires: null,
        failed_login_attempts: 0,
        account_locked_until: null,
        password_updated_at: expect.any(String)
    it('should handle expired reset token', async () => {
          password_reset_token: 'mock-token',
          password_reset_expires: new Date(Date.now() - 60000).toISOString() // Expired
      expect(result.error).toContain('Reset token has expired')
    it('should validate new password strength', async () => {
          password_reset_expires: new Date(Date.now() + 60000).toISOString()
      const result = await SupplierAuthService.resetPassword('mock-token', 'weak')
  describe('logoutSupplier', () => {
    it('should logout successfully', async () => {
        data: { id: 'session-123', is_active: true },
      const result = await SupplierAuthService.logoutSupplier('session-token')
    it('should handle invalid session token', async () => {
      const result = await SupplierAuthService.logoutSupplier('invalid-token')
  describe('security validations', () => {
    it('should validate password strength requirements', () => {
      const weakPasswords = [
        '123',
        '12345678',
        'PASSWORD',
        'Password',
        'password123'
      ]
      weakPasswords.forEach(password => {
        expect(SupplierAuthService.validatePasswordStrength(password)).toBe(false)
      const strongPasswords = [
        'My$ecur3P@ssw0rd',
        'C0mpl3x!Pass'
      strongPasswords.forEach(password => {
        expect(SupplierAuthService.validatePasswordStrength(password)).toBe(true)
    it('should validate email format', () => {
      const invalidEmails = [
        'invalid',
        '@domain.com',
        'test@',
        'test.domain.com',
        'test..test@domain.com'
      invalidEmails.forEach(email => {
        expect(SupplierAuthService.validateEmailFormat(email)).toBe(false)
      const validEmails = [
        'test@domain.com',
        'user.name+tag@example.co.uk',
        'supplier123@wedding-venue.org'
      validEmails.forEach(email => {
        expect(SupplierAuthService.validateEmailFormat(email)).toBe(true)
    it('should check for suspicious login patterns', () => {
      const suspiciousPatterns = [
        { ip_address: '1.2.3.4', failed_attempts_from_ip: 5 },
        { user_agent: 'Bot/1.0', automated_request: true },
        { login_frequency: 'too_high', requests_per_minute: 10 }
      suspiciousPatterns.forEach(pattern => {
        expect(SupplierAuthService.checkSuspiciousActivity(pattern)).toBe(true)
  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Database connection failed'))
        {
          ip_address: '127.0.0.1',
          user_agent: 'test',
          device_type: 'desktop'
        }
      expect(result.error).toContain('Database connection failed')
    it('should handle bcrypt hashing errors', async () => {
      mockBcrypt.hash.mockRejectedValueOnce(new Error('Hashing failed'))
      expect(result.error).toContain('Hashing failed')
    it('should handle JWT token generation errors', async () => {
      mockJwt.sign.mockImplementationOnce(() => {
        throw new Error('JWT signing failed')
      expect(result.error).toContain('JWT signing failed')
})
