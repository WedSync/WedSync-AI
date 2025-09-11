/**
 * RSVP API Endpoints Integration Tests
 * Tests all RSVP API routes with authentication, validation, and performance
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, POST } from '@/app/api/rsvp/[token]/route'
import { POST as SendRSVP } from '@/app/api/rsvp/send/route'
// Mock dependencies
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: jest.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
}))
vi.mock('next/headers', () => ({
  cookies: jest.fn(() => ({})),
describe('RSVP API Endpoints', () => {
  let mockSupabase: any
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: jest.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
      rpc: vi.fn(),
    }
    const { createRouteHandlerClient } = require('@supabase/auth-helpers-nextjs')
    createRouteHandlerClient.mockReturnValue(mockSupabase)
  })
  describe('GET /api/rsvp/[token]', () => {
    it('should return RSVP data for valid token', async () => {
      const mockRSVPLink = {
        id: 'link-123',
        token: 'valid-token-123',
        secure_hash: 'hash-123',
        household_name: 'Smith Family',
        primary_email: 'smith@example.com',
        max_responses: 4,
        allows_plus_ones: true,
        events: ['ceremony', 'reception'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }
      mockSupabase.from().single.mockResolvedValue({
        data: mockRSVPLink,
        error: null,
      })
      const request = new NextRequest('http://localhost:3000/api/rsvp/valid-token-123')
      const params = { token: 'valid-token-123' }
      const response = await GET(request, { params })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.household_name).toBe('Smith Family')
    })
    it('should return 404 for invalid token', async () => {
        data: null,
        error: new Error('Not found'),
      const request = new NextRequest('http://localhost:3000/api/rsvp/invalid-token')
      const params = { token: 'invalid-token' }
      expect(response.status).toBe(404)
      expect(data.error).toBe('RSVP link not found or expired')
    it('should return 404 for expired token', async () => {
      const expiredRSVPLink = {
        token: 'expired-token-123',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        data: expiredRSVPLink,
      const request = new NextRequest('http://localhost:3000/api/rsvp/expired-token-123')
      const params = { token: 'expired-token-123' }
    it('should handle rate limiting', async () => {
      // Simulate multiple rapid requests
      const request = new NextRequest('http://localhost:3000/api/rsvp/test-token', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      const params = { token: 'test-token' }
      // Make multiple requests to trigger rate limiting
      const promises = Array(15).fill(null).map(() => GET(request, { params }))
      const responses = await Promise.all(promises)
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
  describe('POST /api/rsvp/[token]', () => {
    it('should create RSVP response successfully', async () => {
      const mockResponse = {
        id: 'response-123',
        guest_name: 'John Smith',
        status: 'attending',
        meal_preference: 'vegetarian',
      mockSupabase.from().insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockResponse,
            error: null,
          })
        })
      const requestBody = {
        guest_email: 'john@smith.com',
        dietary_restrictions: 'No nuts',
        plus_one: false,
      const request = new NextRequest('http://localhost:3000/api/rsvp/valid-token-123', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      const response = await POST(request, { params })
      expect(response.status).toBe(201)
      expect(data.data.guest_name).toBe('John Smith')
    it('should validate required fields', async () => {
        body: JSON.stringify({
          guest_email: 'test@example.com',
          // Missing guest_name and status
        }),
      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    it('should reject responses exceeding max_responses', async () => {
        max_responses: 2,
        response_count: 2, // Already at max
      expect(data.error).toContain('Maximum responses reached')
  describe('POST /api/rsvp/send', () => {
    it('should send bulk RSVP invitations', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'link-1', token: 'token-1' },
            { id: 'link-2', token: 'token-2' },
          ],
          error: null,
        client_id: 'client-123',
        guests: [
          { name: 'John Smith', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' },
        ],
        expires_in_days: 30,
      const request = new NextRequest('http://localhost:3000/api/rsvp/send', {
      const response = await SendRSVP(request)
      expect(data.data.sent_count).toBe(2)
    it('should require authentication for bulk sending', async () => {
        data: { user: null },
        error: new Error('Not authenticated'),
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    it('should validate guest limit (max 500)', async () => {
      const guests = Array(501).fill(null).map((_, i) => ({
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
      }))
        guests,
  describe('Performance Tests', () => {
    it('should respond within 500ms for token validation', async () => {
        data: {
          token: 'fast-token',
          household_name: 'Test Family',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      const request = new NextRequest('http://localhost:3000/api/rsvp/fast-token')
      const params = { token: 'fast-token' }
      const startTime = Date.now()
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(500)
    it('should handle concurrent RSVP submissions', async () => {
        token: 'concurrent-token',
        max_responses: 10,
        response_count: 0,
            data: { id: 'response-123', guest_name: 'Test Guest' },
      const createRequest = (guestName: string) => {
        return new NextRequest('http://localhost:3000/api/rsvp/concurrent-token', {
          method: 'POST',
          body: JSON.stringify({
            guest_name: guestName,
            guest_email: `${guestName.toLowerCase()}@example.com`,
            status: 'attending',
          }),
          headers: { 'Content-Type': 'application/json' },
      const promises = Array(5).fill(null).map((_, i) => 
        POST(createRequest(`Guest${i}`), { params: { token: 'concurrent-token' } })
      )
      // All should succeed (assuming database handles concurrency)
      responses.forEach(response => {
        expect([200, 201, 409]).toContain(response.status) // 409 for conflicts
})
