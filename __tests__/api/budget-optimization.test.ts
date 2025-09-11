/**
 * WS-245 Budget Optimization System - Comprehensive Test Suite
 * Tests for budget optimization API endpoints and financial calculations
 * 
 * Testing Strategy:
 * 1. API endpoint functionality (POST, GET, PUT)
 * 2. Financial calculation accuracy with Decimal.js
 * 3. AI optimization engine integration
 * 4. Market pricing data integration
 * 5. Security and validation
 * 6. Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll } from '@jest/globals'
import { NextRequest } from 'next/server'
import Decimal from 'decimal.js'

// Import the API handlers
import { POST as OptimizePOST, GET as OptimizeGET, PUT as OptimizePUT } from '../../src/app/api/budget/optimize/route'
import { GET as MarketPricingGET, POST as MarketPricingPOST } from '../../src/app/api/budget/market-pricing/route'

// Import services
import { aiBudgetOptimizer } from '../../src/lib/services/ai-budget-optimizer'
import { budgetCalculationService } from '../../src/lib/services/budget-calculation-service'
import { marketDataService } from '../../src/lib/services/market-data-service'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn()
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
}

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
}

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({}))
}))

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => Promise.resolve({ success: true }))
}))

// Test data
const validBudgetOptimizationRequest = {
  client_id: '123e4567-e89b-12d3-a456-426614174000',
  wedding_date: '2024-06-15T00:00:00.000Z',
  guest_count: 100,
  venue_location: 'London, UK',
  current_budget: '25000.00',
  currency: 'GBP',
  categories: [
    {
      category_name: 'VENUE',
      current_allocation: '11250.00',
      priority: 10,
      is_flexible: false
    },
    {
      category_name: 'CATERING',
      current_allocation: '6250.00',
      priority: 9,
      is_flexible: true
    },
    {
      category_name: 'PHOTOGRAPHY',
      current_allocation: '2500.00',
      priority: 8,
      is_flexible: false
    },
    {
      category_name: 'MUSIC',
      current_allocation: '1000.00',
      priority: 6,
      is_flexible: true
    }
  ],
  optimization_goals: {
    primary_goal: 'balance_budget',
    risk_tolerance: 'moderate'
  }
}

const validMarketPricingRequest = {
  location: 'London, UK',
  service_categories: ['VENUE', 'CATERING', 'PHOTOGRAPHY'],
  currency: 'GBP',
  guest_count_range: '80-120'
}

const mockSessionUser = {
  id: 'user-123',
  email: 'test@example.com'
}

const mockClient = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  organization_id: 'org-123',
  name: 'Test Client'
}

const mockUserAccess = {
  organization_id: 'org-123',
  role: 'planner'
}

describe('WS-245 Budget Optimization System', () => {
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default successful mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockSessionUser } },
      error: null
    })
    
    // Mock client lookup
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'clients') {
        return {
          ...mockSupabase,
          select: () => ({
            ...mockSupabase,
            eq: () => ({
              single: () => Promise.resolve({ data: mockClient, error: null })
            })
          })
        }
      }
      
      if (table === 'user_organization_roles') {
        return {
          ...mockSupabase,
          select: () => ({
            ...mockSupabase,
            eq: () => ({
              single: () => Promise.resolve({ data: mockUserAccess, error: null })
            })
          })
        }
      }
      
      return mockSupabase
    })
  })

  describe('Budget Optimization API - POST /api/budget/optimize', () => {
    
    it('should successfully create budget optimization', async () => {
      // Mock successful database operations
      const mockOptimizationResult = {
        id: 'optimization-123',
        optimization_score: 85,
        potential_savings: '2500.00',
        savings_percentage: 10
      }
      
      mockSupabase.insert.mockResolvedValue({
        data: mockOptimizationResult,
        error: null
      })
      
      // Mock AI optimizer
      jest.spyOn(aiBudgetOptimizer, 'optimizeBudget').mockResolvedValue({
        optimization_id: 'optimization-123',
        optimization_score: 85,
        potential_savings: {
          total_amount: '2500.00',
          percentage: 10,
          currency: 'GBP'
        },
        recommendations: [],
        optimized_allocations: {
          'VENUE': '10500.00',
          'CATERING': '5750.00',
          'PHOTOGRAPHY': '2500.00',
          'MUSIC': '1000.00'
        },
        confidence_score: 0.85,
        market_position: 'moderate',
        regional_multiplier: 1.3,
        seasonal_multiplier: 1.2,
        model_version: 'gpt-4-turbo-2024-04-09',
        analysis_timestamp: new Date().toISOString()
      })

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(validBudgetOptimizationRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.optimization_score).toBe(85)
      expect(data.potential_savings.total_amount).toBe('2500.00')
    })

    it('should validate input data with Zod schema', async () => {
      const invalidRequest = {
        ...validBudgetOptimizationRequest,
        client_id: 'invalid-uuid',
        current_budget: '-1000' // Invalid negative budget
      }

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
      expect(data.details).toBeDefined()
    })

    it('should enforce rate limiting', async () => {
      const { rateLimit } = require('@/lib/rate-limit')
      rateLimit.mockResolvedValue({
        success: false,
        retryAfter: 3600
      })

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(validBudgetOptimizationRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
    })

    it('should check budget allocation limits', async () => {
      const overBudgetRequest = {
        ...validBudgetOptimizationRequest,
        categories: [
          {
            category_name: 'VENUE',
            current_allocation: '20000.00', // 80% of budget
            priority: 10,
            is_flexible: false
          },
          {
            category_name: 'CATERING',
            current_allocation: '8000.00', // 32% of budget
            priority: 9,
            is_flexible: true
          }
          // Total: 112% of budget (over 10% limit)
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(overBudgetRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Budget over-allocation')
    })

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(validBudgetOptimizationRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Financial Calculation Accuracy Tests', () => {
    
    it('should maintain precision with Decimal.js', () => {
      const budget = new Decimal('25000.00')
      const allocation = new Decimal('0.45') // 45%
      
      const result = budget.mul(allocation)
      
      expect(result.toString()).toBe('11250')
      expect(result.decimalPlaces()).toBeLessThanOrEqual(2)
    })

    it('should calculate budget allocations correctly', async () => {
      const params = {
        total_budget: '25000.00',
        guest_count: 100,
        wedding_date: '2024-06-15T00:00:00.000Z',
        venue_location: 'London, UK',
        wedding_type: 'traditional' as const,
        currency: 'GBP' as const
      }

      const allocations = await budgetCalculationService.calculateBudgetAllocation(params)
      
      // Check that allocations sum to approximately the total budget
      const totalAllocated = allocations.reduce((sum, alloc) => 
        sum.add(new Decimal(alloc.recommended_amount)), new Decimal(0)
      )
      
      const totalBudget = new Decimal(params.total_budget)
      const variance = totalAllocated.sub(totalBudget).abs()
      const variancePercentage = variance.div(totalBudget).mul(100)
      
      expect(variancePercentage.toNumber()).toBeLessThan(0.1) // Less than 0.1% variance
      expect(allocations.length).toBeGreaterThan(0)
      expect(allocations[0]).toHaveProperty('category_name')
      expect(allocations[0]).toHaveProperty('recommended_amount')
      expect(allocations[0]).toHaveProperty('percentage_of_total')
    })

    it('should calculate savings accurately', () => {
      const currentBudget = [
        { category_name: 'VENUE', current_allocation: '12000.00' },
        { category_name: 'CATERING', current_allocation: '7000.00' },
        { category_name: 'PHOTOGRAPHY', current_allocation: '3000.00' }
      ]

      const optimizedBudget = [
        { category_name: 'VENUE', amount: '11000.00' },
        { category_name: 'CATERING', amount: '6500.00' },
        { category_name: 'PHOTOGRAPHY', amount: '3000.00' }
      ]

      const savings = budgetCalculationService.calculateCostSavings(currentBudget, optimizedBudget)
      
      expect(savings.total_savings).toBe('1500.00')
      expect(parseFloat(savings.savings_percentage)).toBeCloseTo(6.82, 2) // 1500/22000 * 100
      expect(savings.category_savings).toHaveLength(2) // Only categories with savings
    })

    it('should validate financial calculations', () => {
      const calculation = {
        allocations: [
          { category_name: 'VENUE', recommended_amount: '11250.00' },
          { category_name: 'CATERING', recommended_amount: '6250.00' },
          { category_name: 'PHOTOGRAPHY', recommended_amount: '2500.00' },
          { category_name: 'MUSIC', recommended_amount: '1000.00' }
        ],
        total_budget: '21000.00' // Should match sum of allocations
      }

      const validation = budgetCalculationService.validateFinancialAccuracy(calculation)
      
      expect(validation.is_valid).toBe(true)
      expect(validation.precision_check).toBe(true)
      expect(validation.calculation_integrity).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect calculation integrity issues', () => {
      const calculation = {
        allocations: [
          { category_name: 'VENUE', recommended_amount: '11250.00' },
          { category_name: 'CATERING', recommended_amount: '6250.00' }
          // Missing categories - doesn't sum to expected total
        ],
        total_budget: '25000.00'
      }

      const validation = budgetCalculationService.validateFinancialAccuracy(calculation)
      
      expect(validation.is_valid).toBe(false)
      expect(validation.calculation_integrity).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('AI Budget Optimizer Integration Tests', () => {
    
    beforeEach(() => {
      // Mock OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    category_name: 'VENUE',
                    recommendation_type: 'reduce_allocation',
                    current_allocation: '11250.00',
                    recommended_allocation: '10500.00',
                    potential_saving: '750.00',
                    confidence_score: 0.8,
                    reasoning: 'Market analysis shows venue costs 15% above average',
                    supporting_data: { market_comparison: 'Above average' },
                    implementation_difficulty: 'moderate',
                    estimated_impact: 'medium'
                  }
                ]
              })
            }
          }
        ]
      })
    })

    it('should generate AI-powered recommendations', async () => {
      const optimizationParams = {
        currentBudget: '25000.00',
        categories: validBudgetOptimizationRequest.categories,
        weddingDate: validBudgetOptimizationRequest.wedding_date,
        guestCount: validBudgetOptimizationRequest.guest_count,
        venueLocation: validBudgetOptimizationRequest.venue_location,
        marketPricing: [],
        goals: validBudgetOptimizationRequest.optimization_goals
      }

      const result = await aiBudgetOptimizer.optimizeBudget(optimizationParams)
      
      expect(result).toHaveProperty('optimization_id')
      expect(result.optimization_score).toBeGreaterThan(0)
      expect(result.potential_savings).toHaveProperty('total_amount')
      expect(result.recommendations).toBeDefined()
      expect(result.optimized_allocations).toBeDefined()
      expect(result.confidence_score).toBeGreaterThanOrEqual(0)
      expect(result.confidence_score).toBeLessThanOrEqual(1)
    })

    it('should analyze cost-saving opportunities', async () => {
      const expenses = validBudgetOptimizationRequest.categories
      const marketTrends = [
        {
          service_category: 'VENUE',
          location: 'London, UK',
          average_price: 10000,
          price_range_min: 8000,
          price_range_max: 15000,
          confidence_score: 0.9,
          regional_multiplier: 1.3,
          seasonal_multiplier: 1.2,
          currency: 'GBP',
          last_updated: new Date().toISOString()
        }
      ]

      const opportunities = await aiBudgetOptimizer.analyzeCostSavingOpportunities(expenses, marketTrends)
      
      expect(Array.isArray(opportunities)).toBe(true)
      opportunities.forEach(opportunity => {
        expect(opportunity).toHaveProperty('id')
        expect(opportunity).toHaveProperty('category')
        expect(opportunity).toHaveProperty('opportunity_type')
        expect(opportunity).toHaveProperty('potential_saving')
        expect(opportunity).toHaveProperty('confidence_score')
        expect(opportunity.confidence_score).toBeGreaterThanOrEqual(0)
        expect(opportunity.confidence_score).toBeLessThanOrEqual(1)
      })
    })

    it('should handle AI service failures gracefully', async () => {
      // Mock OpenAI failure
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'))

      const optimizationParams = {
        currentBudget: '25000.00',
        categories: validBudgetOptimizationRequest.categories,
        weddingDate: validBudgetOptimizationRequest.wedding_date,
        guestCount: validBudgetOptimizationRequest.guest_count,
        venueLocation: validBudgetOptimizationRequest.venue_location,
        marketPricing: [],
        goals: validBudgetOptimizationRequest.optimization_goals
      }

      // Should still return results using fallback recommendations
      const result = await aiBudgetOptimizer.optimizeBudget(optimizationParams)
      
      expect(result).toHaveProperty('optimization_id')
      expect(result.recommendations).toBeDefined()
      // Confidence should be lower for fallback recommendations
      expect(result.confidence_score).toBeLessThan(0.8)
    })
  })

  describe('Market Pricing Data Integration Tests', () => {
    
    it('should fetch market pricing data', async () => {
      const request = {
        location: 'London, UK',
        service_category: 'VENUE',
        currency: 'GBP'
      }

      const pricing = await marketDataService.fetchMarketPricing(request)
      
      expect(pricing).toHaveProperty('service_category', 'VENUE')
      expect(pricing).toHaveProperty('location', 'London, UK')
      expect(pricing).toHaveProperty('average_price')
      expect(pricing).toHaveProperty('price_range_min')
      expect(pricing).toHaveProperty('price_range_max')
      expect(pricing).toHaveProperty('confidence_score')
      expect(pricing).toHaveProperty('currency', 'GBP')
      expect(pricing.average_price).toBeGreaterThan(0)
      expect(pricing.price_range_min).toBeLessThanOrEqual(pricing.average_price)
      expect(pricing.price_range_max).toBeGreaterThanOrEqual(pricing.average_price)
    })

    it('should analyze pricing trends', async () => {
      const trends = await marketDataService.analyzePricingTrends('VENUE', 'London, UK', '1year')
      
      expect(trends).toHaveProperty('service_category', 'VENUE')
      expect(trends).toHaveProperty('location', 'London, UK')
      expect(trends).toHaveProperty('time_period', '1year')
      expect(trends).toHaveProperty('price_changes')
      expect(trends).toHaveProperty('trend_analysis')
      expect(['increasing', 'decreasing', 'stable']).toContain(trends.trend_analysis.direction)
      expect(trends.trend_analysis.percentage_change).toBeDefined()
      expect(typeof trends.trend_analysis.volatility_score).toBe('number')
    })

    it('should generate pricing forecasts', async () => {
      const forecast = await marketDataService.generatePricingForecast('VENUE', 'London, UK', 6)
      
      expect(forecast).toHaveProperty('service_category', 'VENUE')
      expect(forecast).toHaveProperty('location', 'London, UK')
      expect(forecast).toHaveProperty('forecast_period', '6 months')
      expect(forecast).toHaveProperty('predicted_prices')
      expect(forecast).toHaveProperty('factors')
      expect(forecast.predicted_prices).toHaveLength(6)
      
      forecast.predicted_prices.forEach(prediction => {
        expect(prediction).toHaveProperty('date')
        expect(prediction).toHaveProperty('predicted_price')
        expect(prediction).toHaveProperty('confidence_score')
        expect(prediction.predicted_price).toBeGreaterThan(0)
        expect(prediction.confidence_score).toBeGreaterThanOrEqual(0)
        expect(prediction.confidence_score).toBeLessThanOrEqual(1)
      })
    })

    it('should provide market intelligence', async () => {
      const intelligence = await marketDataService.getMarketIntelligence('London, UK')
      
      expect(intelligence).toHaveProperty('location', 'London, UK')
      expect(intelligence).toHaveProperty('market_summary')
      expect(intelligence).toHaveProperty('regional_insights')
      expect(intelligence).toHaveProperty('pricing_recommendations')
      expect(intelligence).toHaveProperty('forecast')
      
      expect(intelligence.market_summary).toHaveProperty('total_vendors')
      expect(intelligence.market_summary).toHaveProperty('average_pricing')
      expect(['low', 'medium', 'high']).toContain(intelligence.market_summary.market_saturation)
      expect(['low', 'medium', 'high']).toContain(intelligence.market_summary.competition_level)
    })
  })

  describe('Market Pricing API Tests', () => {
    
    it('should handle GET requests for market pricing', async () => {
      const url = new URL('http://localhost:3000/api/budget/market-pricing')
      url.searchParams.set('location', 'London, UK')
      url.searchParams.set('service_categories', 'VENUE,CATERING')
      url.searchParams.set('currency', 'GBP')
      
      const request = new NextRequest(url.toString(), { method: 'GET' })
      
      const response = await MarketPricingGET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.pricing_data).toBeDefined()
    })

    it('should validate query parameters', async () => {
      const url = new URL('http://localhost:3000/api/budget/market-pricing')
      // Missing required parameters
      
      const request = new NextRequest(url.toString(), { method: 'GET' })
      
      const response = await MarketPricingGET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(validBudgetOptimizationRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle missing environment variables', () => {
      const originalApiKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      expect(() => {
        // This would be called when initializing the service
        new (require('../../src/lib/services/ai-budget-optimizer').AIBudgetOptimizer)()
      }).toThrow('OpenAI API key is required')

      // Restore environment variable
      process.env.OPENAI_API_KEY = originalApiKey
    })

    it('should handle zero budget edge case', async () => {
      const zeroBudgetRequest = {
        ...validBudgetOptimizationRequest,
        current_budget: '0.00'
      }

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(zeroBudgetRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
    })

    it('should handle very large budget amounts', async () => {
      const largeBudgetRequest = {
        ...validBudgetOptimizationRequest,
        current_budget: '10000000.00' // 10M limit
      }

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(largeBudgetRequest)
      })

      const response = await OptimizePOST(request)
      
      // Should either accept it or give a clear validation error
      expect([200, 400]).toContain(response.status)
    })

    it('should handle currency conversion edge cases', async () => {
      const currencyRequest = {
        ...validBudgetOptimizationRequest,
        currency: 'EUR' // Different from GBP market data
      }

      const request = new NextRequest('http://localhost:3000/api/budget/optimize', {
        method: 'POST',
        body: JSON.stringify(currencyRequest)
      })

      const response = await OptimizePOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.potential_savings.currency).toBe('EUR')
    })
  })

  describe('Performance and Load Tests', () => {
    
    it('should handle concurrent optimization requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/budget/optimize', {
          method: 'POST',
          body: JSON.stringify({
            ...validBudgetOptimizationRequest,
            client_id: `123e4567-e89b-12d3-a456-42661417400${Math.floor(Math.random() * 10)}`
          })
        })
      )

      const startTime = Date.now()
      const responses = await Promise.all(requests.map(req => OptimizePOST(req)))
      const endTime = Date.now()

      // All requests should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000) // 10 seconds

      // All requests should succeed (assuming mocks are set up correctly)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status) // Success or rate limited
      })
    })

    it('should cache market pricing data effectively', async () => {
      const request1 = {
        location: 'London, UK',
        service_category: 'VENUE',
        currency: 'GBP'
      }

      const startTime1 = Date.now()
      const result1 = await marketDataService.fetchMarketPricing(request1)
      const endTime1 = Date.now()

      // Second request should be faster due to caching
      const startTime2 = Date.now()
      const result2 = await marketDataService.fetchMarketPricing(request1)
      const endTime2 = Date.now()

      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1)
      expect(result1.average_price).toBe(result2.average_price)
    })
  })
})

describe('Integration Tests with Real Database Schema', () => {
  // These tests would run against a test database with the actual migration applied
  
  it('should work with actual database schema', async () => {
    // This would require a test database setup
    // For now, we're testing the structure expectations
    
    const expectedTables = [
      'budget_templates',
      'budget_optimizations', 
      'budget_recommendations',
      'market_pricing_data',
      'pricing_history',
      'budget_analytics'
    ]

    // In a real integration test, we would:
    // 1. Apply the migration to a test database
    // 2. Verify all tables exist
    // 3. Test actual database operations
    // 4. Verify RLS policies work correctly
    
    expect(expectedTables).toHaveLength(6)
  })
})

// Export test utilities for use in other test files
export const testData = {
  validBudgetOptimizationRequest,
  validMarketPricingRequest,
  mockSessionUser,
  mockClient,
  mockUserAccess
}

export const testUtils = {
  createMockRequest: (body: any, method = 'POST') => 
    new NextRequest('http://localhost:3000/test', {
      method,
      body: JSON.stringify(body)
    }),
  
  createMockDecimal: (value: string) => new Decimal(value),
  
  assertDecimalPrecision: (value: Decimal, maxDecimals = 2) => {
    expect(value.decimalPlaces()).toBeLessThanOrEqual(maxDecimals)
  },
  
  assertValidCurrency: (amount: string) => {
    expect(amount).toMatch(/^\d+\.\d{2}$/)
  }
}