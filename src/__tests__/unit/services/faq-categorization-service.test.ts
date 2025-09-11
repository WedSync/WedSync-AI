// FAQ Categorization Service Tests - Comprehensive test suite
// Feature ID: WS-125 - Automated FAQ Extraction from Documents  
// Team: C - Batch 9 Round 3
// Component: Unit Tests for FAQ Categorization Service

import { describe, it, expect, beforeEach, jest, afterEach } from 'vitest'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { faqCategorizationService, FaqCategorizationService } from '../../../lib/services/faq-categorization-service'
import type { CategorizationRequest, CategorizationResult } from '../../../lib/services/faq-categorization-service'
// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}))
// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: jest.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'test-supplier-id' }
      }),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: []
    }))
describe('FaqCategorizationService', () => {
  let service: FaqCategorizationService
  beforeEach(() => {
    service = new FaqCategorizationService()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('categorizeFaq', () => {
    it('should categorize pricing questions correctly with high confidence', async () => {
      const request: CategorizationRequest = {
        question: 'How much does your wedding photography package cost?',
        answer: 'Our wedding photography packages start at $2,500 for 6 hours of coverage and include a digital gallery with high-resolution images.',
        existing_tags: ['wedding', 'photography']
      const result = await service.categorizeFaq(request)
      expect(result.primary_category).toBe('booking-pricing')
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.suggested_tags).toContain('pricing')
    })
    it('should categorize timeline questions correctly', async () => {
        question: 'When will we receive our wedding photos?',
        answer: 'You can expect to receive your complete wedding gallery within 4-6 weeks after your wedding date. We prioritize editing and delivering your images as quickly as possible while maintaining high quality.',
        existing_tags: ['photos', 'delivery']
      expect(result.primary_category).toBe('timeline-delivery')
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.suggested_tags).toContain('timeline')
    it('should categorize weather backup questions correctly', async () => {
        question: 'What happens if it rains on our wedding day?',
        answer: 'We always have backup plans for outdoor ceremonies. Our team scouts indoor locations at your venue and works with you to create beautiful photos regardless of weather conditions.',
        existing_tags: ['wedding', 'outdoor']
      expect(result.primary_category).toBe('weather-backup')
      expect(result.suggested_tags).toContain('weather')
    it('should categorize photography process questions', async () => {
        question: 'What is your photography style and approach?',
        answer: 'We specialize in natural, candid photography that captures authentic emotions and moments. Our approach is unobtrusive, allowing you to enjoy your day while we document the story.',
        existing_tags: ['photography', 'style']
      expect(result.primary_category).toBe('photography-process')
      expect(result.suggested_tags).toContain('photography')
    it('should categorize package-related questions', async () => {
        question: 'What is included in your wedding package?',
        answer: 'Our comprehensive package includes 8 hours of wedding day coverage, engagement session, online gallery, USB drive with high-resolution images, and print release.',
        existing_tags: ['package', 'wedding']
      expect(result.primary_category).toBe('packages-addons')
      expect(result.suggested_tags).toContain('packages')
    it('should provide secondary categories when appropriate', async () => {
        question: 'How much does it cost to add an extra hour of coverage?',
        answer: 'Additional hours of coverage are $300 per hour. This includes continued photo coverage and all images from the extra time added to your digital gallery.',
        existing_tags: ['cost', 'additional']
      expect(result.secondary_categories.length).toBeGreaterThan(0)
      
      // Should also suggest packages-addons as secondary
      const secondaryCategories = result.secondary_categories.map(c => c.category)
      expect(secondaryCategories).toContain('packages-addons')
    it('should fall back to pattern matching when AI confidence is low', async () => {
      // Mock AI to return low confidence
      const mockOpenAI = require('openai').default
      const mockInstance = new mockOpenAI()
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              primary_category: 'booking-pricing',
              confidence: 0.4,
              secondary_categories: [],
              suggested_tags: [],
              reasoning: 'Low confidence AI result'
            })
          }
        }]
        question: 'How much do wedding photos cost typically?',
        answer: 'Wedding photography pricing varies based on coverage hours, package inclusions, and photographer experience. Our packages range from $2,000 to $5,000.',
        existing_tags: ['cost', 'pricing']
      // Should still categorize correctly using pattern matching
      expect(result.confidence).toBeGreaterThan(0.6) // Pattern matching should boost confidence
    it('should handle edge cases gracefully', async () => {
        question: '',
        answer: '',
        existing_tags: []
      expect(result.primary_category).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.suggested_tags).toBeDefined()
  describe('bulkCategorizeFaqs', () => {
    it('should categorize multiple FAQs efficiently', async () => {
      const bulkRequest = {
        items: [
          {
            id: 'faq-1',
            question: 'What are your wedding photography rates?',
            answer: 'Our rates start at $2,500 for basic wedding coverage.',
            current_category: 'general'
          },
            id: 'faq-2',
            question: 'How long until we get our photos?',
            answer: 'Photos are delivered within 6 weeks of your wedding.',
        ]
      const result = await service.bulkCategorizeFaqs(bulkRequest)
      expect(result.results).toHaveLength(2)
      expect(result.summary.total_processed).toBe(2)
      // First should be pricing-related
      const pricingResult = result.results.find(r => r.id === 'faq-1')
      expect(pricingResult?.categorization.primary_category).toBe('booking-pricing')
      // Second should be timeline-related
      const timelineResult = result.results.find(r => r.id === 'faq-2')
      expect(timelineResult?.categorization.primary_category).toBe('timeline-delivery')
    it('should handle errors in individual items gracefully', async () => {
      // Mock AI to fail on second item
      // First call succeeds
      mockInstance.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                primary_category: 'booking-pricing',
                confidence: 0.8,
                secondary_categories: [],
                suggested_tags: ['pricing'],
                reasoning: 'Clear pricing question'
              })
            }
          }]
        })
        // Second call fails
        .mockRejectedValueOnce(new Error('AI service error'))
            question: 'How much does wedding photography cost?',
            answer: 'Our packages start at $3,000.',
            question: 'Invalid question that will fail',
            answer: 'Invalid answer',
      // Should have one successful result
      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe('faq-1')
      expect(result.summary.total_processed).toBe(1)
  describe('pattern-based categorization accuracy', () => {
    const testCases = [
      {
        question: 'What does your wedding package cost?',
        answer: 'Our wedding packages are priced from $2,000 to $6,000 depending on coverage.',
        expected: 'booking-pricing'
      },
        question: 'When do we get our wedding pictures back?',
        answer: 'Wedding photos are typically delivered within 4-8 weeks.',
        expected: 'timeline-delivery'
        question: 'What is your photography style?',
        answer: 'We shoot in a natural, photojournalistic style with some posed portraits.',
        expected: 'photography-process'
        question: 'What happens if it rains during our outdoor ceremony?',
        answer: 'We have backup indoor options and covered areas for photos.',
        expected: 'weather-backup'
        question: 'Can we print our own wedding photos?',
        answer: 'Yes, you receive print release rights with your gallery.',
        expected: 'image-rights'
        question: 'What time should we start getting ready on wedding day?',
        answer: 'We recommend starting 4-5 hours before ceremony time.',
        expected: 'wedding-day-logistics'
        question: 'What is included in your basic package?',
        answer: 'Basic package includes 6 hours coverage and online gallery.',
        expected: 'packages-addons'
        question: 'What are your payment terms?',
        answer: 'We require 50% deposit to book and remainder 30 days before wedding.',
        expected: 'payment-contracts'
    ]
    it('should achieve >85% accuracy on wedding-specific categorization', async () => {
      let correctCategories = 0
      let totalTests = testCases.length
      for (const testCase of testCases) {
        const result = await service.categorizeFaq({
          question: testCase.question,
          answer: testCase.answer
        if (result.primary_category === testCase.expected) {
          correctCategories++
        }
        // Should have reasonable confidence
        expect(result.confidence).toBeGreaterThan(0.6)
      const accuracy = correctCategories / totalTests
      expect(accuracy).toBeGreaterThan(0.85) // >85% accuracy requirement
    it('should provide consistent categorization for similar questions', async () => {
      const similarQuestions = [
        'How much do your services cost?',
        'What are your rates for wedding photography?',
        'Can you tell me about your pricing?',
        'What does wedding photography cost?'
      ]
      const results = await Promise.all(
        similarQuestions.map(question =>
          service.categorizeFaq({
            question,
            answer: 'Our wedding photography starts at $2,500 for basic coverage.'
          })
        )
      )
      // All should be categorized as pricing
      results.forEach(result => {
        expect(result.primary_category).toBe('booking-pricing')
      // Confidence should be consistently high
        expect(result.confidence).toBeGreaterThan(0.7)
  describe('performance tests', () => {
    it('should categorize single FAQ quickly', async () => {
        question: 'How much does wedding photography cost?',
        answer: 'Our packages range from $2,000 to $5,000.',
        existing_tags: ['pricing']
      const startTime = Date.now()
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(result).toBeDefined()
    it('should handle bulk categorization efficiently', async () => {
        items: Array.from({ length: 20 }, (_, i) => ({
          id: `faq-${i}`,
          question: `Wedding question ${i}`,
          answer: `Answer about wedding services ${i}`,
          current_category: 'general'
        }))
      expect(processingTime).toBeLessThan(30000) // Should complete within 30 seconds
      expect(result.summary.total_processed).toBe(20)
  describe('integration with wedding categories', () => {
    it('should only return valid wedding category slugs', async () => {
      const validCategories = [
        'booking-pricing',
        'timeline-delivery', 
        'photography-process',
        'wedding-day-logistics',
        'packages-addons',
        'weather-backup',
        'image-rights',
        'payment-contracts'
      const testQuestions = [
        'Random question about services',
        'Another question about wedding planning',
        'Third question about coordination'
      for (const question of testQuestions) {
          question,
          answer: 'Generic wedding-related answer'
        expect(validCategories).toContain(result.primary_category)
        
        result.secondary_categories.forEach(secondary => {
          expect(validCategories).toContain(secondary.category)
    it('should generate appropriate tags for each category', async () => {
      const categoryTestCases = [
        {
          category: 'booking-pricing',
          question: 'How much do you charge?',
          expectedTags: ['pricing', 'cost', 'booking']
        },
          category: 'timeline-delivery',
          question: 'When will photos be ready?',
          expectedTags: ['timeline', 'delivery', 'ready']
          category: 'photography-process',
          question: 'What is your shooting style?',
          expectedTags: ['photography', 'style', 'process']
      for (const testCase of categoryTestCases) {
          answer: 'Relevant answer for the category'
        // Should contain at least one expected tag
        const hasExpectedTag = testCase.expectedTags.some(expectedTag =>
          result.suggested_tags.some(actualTag =>
            actualTag.includes(expectedTag) || expectedTag.includes(actualTag)
          )
        expect(hasExpectedTag).toBe(true)
})
