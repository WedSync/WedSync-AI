// WS-126: useChatbot Hook Tests  
// Unit tests for the custom chatbot React hook

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatbot } from '@/hooks/useChatbot'
// Mock fetch globally
global.fetch = vi.fn()
describe('useChatbot Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as unknown).mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useChatbot())
      expect(result.current.state).toEqual({
        isOpen: false,
        isConnected: true,
        isTyping: false,
        conversation: [],
        quick_replies: [],
        escalation_available: false,
        loading: false
      })
    })
    it('should generate a unique session ID', () => {
      const { result: result1 } = renderHook(() => useChatbot())
      const { result: result2 } = renderHook(() => useChatbot())
      expect(result1.current.sessionId).toBeDefined()
      expect(result2.current.sessionId).toBeDefined()
      expect(result1.current.sessionId).not.toBe(result2.current.sessionId)
    it('should use provided session ID', () => {
      const customSessionId = 'custom-session-123'
      const { result } = renderHook(() => 
        useChatbot({ sessionId: customSessionId })
      )
      expect(result.current.sessionId).toBe(customSessionId)
  describe('Chat State Management', () => {
    it('should toggle chat open/close', () => {
      expect(result.current.state.isOpen).toBe(false)
      act(() => {
        result.current.toggleChat()
      expect(result.current.state.isOpen).toBe(true)
    it('should open and close chat', () => {
        result.current.openChat()
        result.current.closeChat()
    it('should clear conversation', () => {
      // Add some test data
        result.current.addMessage({
          id: 'test-1',
          type: 'user',
          content: 'Test message',
          timestamp: new Date().toISOString()
        })
      expect(result.current.state.conversation).toHaveLength(1)
        result.current.clearConversation()
      expect(result.current.state.conversation).toHaveLength(0)
      expect(result.current.state.quick_replies).toHaveLength(0)
      expect(result.current.state.escalation_available).toBe(false)
  describe('Message Handling', () => {
    it('should add message to conversation', () => {
      const testMessage = {
        id: 'test-1',
        type: 'user' as const,
        content: 'Hello there',
        timestamp: new Date().toISOString()
      }
        result.current.addMessage(testMessage)
      expect(result.current.state.conversation[0]).toEqual(testMessage)
    it('should send message and handle response', async () => {
      const mockResponse = {
        message: 'Hello! How can I help you?',
        type: 'text',
        intent: 'greeting',
        confidence: 0.95,
        session_id: 'session-123',
        timestamp: new Date().toISOString(),
        quick_replies: ['Find vendors', 'Check pricing']
      ;(global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      await act(async () => {
        await result.current.sendMessage('Hello')
      // Should have user message and bot response
      expect(result.current.state.conversation).toHaveLength(2)
      expect(result.current.state.conversation[0].type).toBe('user')
      expect(result.current.state.conversation[0].content).toBe('Hello')
      expect(result.current.state.conversation[1].type).toBe('bot')
      expect(result.current.state.conversation[1].content).toBe(mockResponse.message)
      expect(result.current.state.quick_replies).toHaveLength(2)
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.isTyping).toBe(false)
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as unknown).mockRejectedValueOnce(new Error('Network error'))
      expect(result.current.state.conversation[1].content).toContain('technical difficulties')
      expect(result.current.state.escalation_available).toBe(true)
    it('should handle HTTP error responses', async () => {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
    it('should not send empty messages', async () => {
        await result.current.sendMessage('')
      expect(global.fetch).not.toHaveBeenCalled()
    it('should not send messages when loading', async () => {
      // Set loading state
        result.current.setLoading(true)
  describe('Quick Replies', () => {
    it('should handle quick reply selection', async () => {
        message: 'Here are our pricing options...',
        intent: 'pricing_inquiry',
        confidence: 0.9,
        quick_replies: []
        await result.current.handleQuickReply({
          text: 'Check pricing',
          payload: 'pricing_inquiry'
      expect(result.current.state.conversation[0].content).toBe('Check pricing')
    it('should handle escalation quick reply', async () => {
      const mockEscalationResponse = {
        escalation_id: 'esc-123',
        status: 'assigned',
        message: 'Connecting you with support...',
        json: async () => mockEscalationResponse
          text: 'Contact Support',
          payload: 'escalate'
      expect(result.current.state.conversation[0].content).toBe(mockEscalationResponse.message)
    it('should handle retry quick reply', async () => {
      // First add a user message
          id: 'user-1',
          content: 'Original message',
        message: 'Retry successful',
        intent: 'general_question',
        confidence: 0.8,
          text: 'Try Again',
          payload: 'retry'
      // Should have original message, then retry user message, then bot response
      expect(result.current.state.conversation).toHaveLength(3)
      expect(result.current.state.conversation[1].content).toBe('Original message')
  describe('Escalation', () => {
    it('should escalate to human support', async () => {
        agent: {
          id: 'agent-1',
          name: 'John Doe',
          specialties: ['support'],
          average_response_time: 300
        },
        message: 'Connecting you with John Doe...',
      const onEscalation = vi.fn()
        useChatbot({ onEscalation })
        await result.current.escalateToHuman('user_request', 'normal')
      expect(result.current.state.agent_info).toEqual(mockEscalationResponse.agent)
      expect(onEscalation).toHaveBeenCalledWith('esc-123')
    it('should handle escalation failure', async () => {
      ;(global.fetch as unknown).mockRejectedValueOnce(new Error('Escalation failed'))
      const onError = vi.fn()
        useChatbot({ onError })
        await result.current.escalateToHuman('technical_issue')
      expect(result.current.state.conversation[0].content).toContain('support@wedsync.com')
      expect(onError).toHaveBeenCalled()
  describe('Conversation History', () => {
    it('should return conversation history', () => {
      const messages = [
        {
          type: 'user' as const,
          content: 'Hello',
          id: 'bot-1',
          type: 'bot' as const,
          content: 'Hi there!',
          timestamp: new Date().toISOString(),
          intent: 'greeting',
          confidence: 0.95
        }
      ]
      messages.forEach(msg => {
        act(() => {
          result.current.addMessage(msg)
      const history = result.current.getConversationHistory()
      expect(history).toHaveLength(2)
      expect(history[0]).toMatchObject({
        type: 'user',
        content: 'Hello',
        intent: undefined,
        confidence: undefined
      expect(history[1]).toMatchObject({
        type: 'bot',
        content: 'Hi there!',
        confidence: 0.95
  describe('Health and Capabilities', () => {
    it('should get chatbot capabilities', async () => {
      const mockCapabilities = {
        intents: ['greeting', 'pricing_inquiry'],
        features: ['intent_recognition', 'knowledge_retrieval'],
        knowledge_sources: ['faq_database'],
        supported_languages: ['en'],
        version: '1.0.0'
        json: async () => mockCapabilities
      const capabilities = await act(async () => {
        return await result.current.getCapabilities()
      expect(capabilities).toEqual(mockCapabilities)
    it('should check chatbot health', async () => {
      const mockHealth = {
        status: 'healthy',
        json: async () => mockHealth
      const health = await act(async () => {
        return await result.current.checkHealth()
      expect(health).toEqual(mockHealth)
      expect(result.current.state.isConnected).toBe(true)
    it('should handle health check failure', async () => {
      ;(global.fetch as unknown).mockRejectedValueOnce(new Error('Health check failed'))
      expect(health).toBeNull()
      expect(result.current.state.isConnected).toBe(false)
  describe('Error Handling', () => {
    it('should call onError callback when provided', async () => {
      ;(global.fetch as unknown).mockRejectedValueOnce(new Error('API Error'))
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    it('should call onEscalation callback when escalation succeeds', async () => {
        json: async () => ({
          escalation_id: 'esc-123',
          message: 'Escalated successfully'
        await result.current.escalateToHuman('user_request')
})
