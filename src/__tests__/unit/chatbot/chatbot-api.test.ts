// WS-126: AI-Powered Support Chatbot API Tests
// Unit tests for chatbot API routes and intent recognition

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from '@/app/api/chatbot/route'
import { NextRequest } from 'next/server'
// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn()
    }))
  })),
  rpc: vi.fn()
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))
describe('Chatbot API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('POST /api/chatbot', () => {
    it('should handle greeting intent', async () => {
      // Mock user authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      // Mock context creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: {
          session_id: 'session-123',
          user_id: 'user-123',
          conversation_turn: 0,
          context_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      // Mock FAQ search
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          session_id: 'session-123'
        }),
        headers: { 'Content-Type': 'application/json' }
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.intent).toBe('greeting')
      expect(data.message).toContain('Hello!')
      expect(data.confidence).toBeGreaterThan(0.5)
      expect(data.quick_replies).toBeDefined()
      expect(data.session_id).toBe('session-123')
    })
    it('should handle pricing inquiry intent', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
          conversation_turn: 1,
          context_data: {}
        data: [
          {
            id: 'faq-1',
            question: 'What are your pricing rates?',
            answer: 'Our pricing starts at $99/month for basic plans.',
            relevance_score: 0.9
          }
        ],
          message: 'How much does it cost?',
      expect(data.intent).toBe('pricing_inquiry')
      expect(data.message).toContain('pricing')
      expect(data.quick_replies).toContain('Get detailed quote')
    it('should handle low confidence with escalation option', async () => {
        data: { user: null },
          message: 'xyz nonsense query that makes no sense',
      expect(data.escalation_available).toBe(true)
      expect(data.confidence).toBeLessThan(0.6)
    it('should handle missing required fields', async () => {
          message: 'Hello'
          // missing session_id
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    it('should handle vendor search intent', async () => {
      // Mock vendor search results
      mockSupabaseClient.from().select().eq().limit.mockResolvedValue({
            business_name: 'Amazing Photography',
            primary_category: 'Photography',
            description: 'Professional wedding photography services'
          message: 'I need to find a photographer',
      expect(data.intent).toBe('vendor_search')
      expect(data.message).toContain('vendor')
      expect(data.quick_replies).toContain('Photographers')
    it('should handle database errors gracefully', async () => {
      // Mock database error
        data: null,
        error: new Error('Database connection failed')
      expect(response.status).toBe(500)
      expect(data.message).toContain('technical difficulties')
  describe('GET /api/chatbot', () => {
    it('should return chatbot capabilities', async () => {
      const request = new NextRequest('http://localhost:3000/api/chatbot?action=capabilities')
      const response = await GET(request)
      expect(data.intents).toContain('greeting')
      expect(data.intents).toContain('pricing_inquiry')
      expect(data.features).toContain('intent_recognition')
      expect(data.features).toContain('human_escalation')
      expect(data.knowledge_sources).toContain('faq_database')
    it('should return health status', async () => {
      const request = new NextRequest('http://localhost:3000/api/chatbot?action=health')
      expect(data.status).toBe('healthy')
      expect(data.version).toBe('1.0.0')
      expect(data.timestamp).toBeDefined()
    it('should return default message for root endpoint', async () => {
      const request = new NextRequest('http://localhost:3000/api/chatbot')
      expect(data.message).toContain('WedSync AI Assistant')
      expect(data.available_actions).toContain('capabilities')
      expect(data.available_actions).toContain('health')
  describe('Intent Recognition', () => {
    const testCases = [
      { message: 'hi there', expectedIntent: 'greeting', minConfidence: 0.7 },
      { message: 'how much does this cost', expectedIntent: 'pricing_inquiry', minConfidence: 0.7 },
      { message: 'I want to book', expectedIntent: 'booking_question', minConfidence: 0.7 },
      { message: 'find me a caterer', expectedIntent: 'vendor_search', minConfidence: 0.7 },
      { message: 'wedding planning help', expectedIntent: 'wedding_planning', minConfidence: 0.7 },
      { message: 'I have a problem', expectedIntent: 'technical_support', minConfidence: 0.7 },
      { message: 'goodbye', expectedIntent: 'goodbye', minConfidence: 0.7 }
    ]
    testCases.forEach(({ message, expectedIntent, minConfidence }) => {
      it(`should recognize "${message}" as ${expectedIntent}`, async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })
        mockSupabaseClient.from().insert().select().single.mockResolvedValue({
          data: {
            session_id: 'test-session',
            conversation_turn: 0,
            context_data: {}
          },
        mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null })
        const request = new NextRequest('http://localhost:3000/api/chatbot', {
          method: 'POST',
          body: JSON.stringify({
            message,
            session_id: 'test-session'
          }),
          headers: { 'Content-Type': 'application/json' }
        const response = await POST(request)
        const data = await response.json()
        expect(data.intent).toBe(expectedIntent)
        expect(data.confidence).toBeGreaterThanOrEqual(minConfidence)
})
