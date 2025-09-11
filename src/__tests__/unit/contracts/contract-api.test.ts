/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET, POST } from '@/app/api/contracts/route'
import { createClient } from '@/lib/supabase/server'
// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))
describe('/api/contracts', () => {
  let mockSupabase: any
  let mockUser: any
  let mockProfile: any
  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }
    
    mockProfile = {
      organization_id: 'org-123'
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser }
        })
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile }),
      insert: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
  })
  afterEach(() => {
    vi.clearAllMocks()
  describe('GET /api/contracts', () => {
    it('should return contracts for authenticated user', async () => {
      const mockContracts = [
        {
          id: 'contract-1',
          title: 'Wedding Photography',
          contract_number: 'CON-2025-001',
          total_amount: 2500.00,
          status: 'active'
        }
      ]
      // Mock the contracts query chain
      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValue({ data: mockContracts, error: null, count: 1 })
      const request = new NextRequest('http://localhost/api/contracts?page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.contracts).toEqual(mockContracts)
      expect(data.total).toBe(1)
      expect(data.page).toBe(1)
      expect(data.totalPages).toBe(1)
    })
    it('should filter contracts by status', async () => {
          status: 'active',
          title: 'Test Contract'
      const request = new NextRequest('http://localhost/api/contracts?status=active')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
    it('should handle search queries', async () => {
        .mockResolvedValue({ data: [], error: null, count: 0 })
      const request = new NextRequest('http://localhost/api/contracts?search=photography')
      expect(mockSupabase.or).toHaveBeenCalledWith('title.ilike.%photography%,contract_number.ilike.%photography%')
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      })
      const request = new NextRequest('http://localhost/api/contracts')
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    it('should return 404 when profile not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null })
      expect(response.status).toBe(404)
      expect(data.error).toBe('Profile not found')
    it('should handle database errors gracefully', async () => {
        .mockResolvedValue({ data: null, error: { message: 'Database error' }, count: null })
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch contracts')
  describe('POST /api/contracts', () => {
    const validContractData = {
      client_id: 'client-123',
      supplier_id: 'supplier-123',
      category_id: 'category-123',
      title: 'Wedding Photography Contract',
      description: 'Professional wedding photography services',
      contract_type: 'vendor_service',
      total_amount: 2500.00,
      currency: 'GBP',
      deposit_amount: 500.00,
      deposit_percentage: 20,
      contract_date: '2025-01-15T00:00:00.000Z',
      service_start_date: '2025-06-15T00:00:00.000Z',
      service_end_date: '2025-06-15T23:59:59.000Z',
      terms_conditions: 'Standard terms and conditions',
      privacy_policy_accepted: true,
      gdpr_consent: true
    beforeEach(() => {
      // Mock successful contract creation
        .mockResolvedValueOnce({ data: mockProfile }) // Profile lookup
        .mockResolvedValueOnce({ // Contract creation
          data: { 
            id: 'contract-123',
            ...validContractData,
            contract_number: 'CON-2025-001',
            organization_id: 'org-123'
          }
      mockSupabase.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              id: 'contract-123',
              ...validContractData,
              contract_number: 'CON-2025-001'
            }
          })
    it('should create a contract successfully', async () => {
      const request = new NextRequest('http://localhost/api/contracts', {
        method: 'POST',
        body: JSON.stringify(validContractData)
      const response = await POST(request)
      expect(response.status).toBe(201)
      expect(data.contract).toBeDefined()
      expect(data.contract.title).toBe(validContractData.title)
      expect(data.contract.total_amount).toBe(validContractData.total_amount)
    it('should create payment milestones when deposit amount provided', async () => {
      await POST(request)
      // Verify milestone creation calls
      expect(mockSupabase.from).toHaveBeenCalledWith('contract_payment_milestones')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          milestone_name: 'Deposit Payment',
          milestone_type: 'deposit',
          amount: validContractData.deposit_amount,
          sequence_order: 1
      )
          milestone_name: 'Final Payment',
          milestone_type: 'final_payment',
          sequence_order: 2
    it('should validate required fields', async () => {
      const invalidData = { ...validContractData }
      delete invalidData.client_id
      delete invalidData.title
        body: JSON.stringify(invalidData)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(data.details).toBeDefined()
    it('should validate contract type enum', async () => {
      const invalidData = { ...validContractData, contract_type: 'invalid_type' }
    it('should validate positive amounts', async () => {
      const invalidData = { ...validContractData, total_amount: -100 }
    it('should validate currency format', async () => {
      const invalidData = { ...validContractData, currency: 'GBPX' }
    it('should handle database insertion errors', async () => {
            error: { message: 'Database constraint violation' }
      expect(data.error).toBe('Failed to create contract')
    it('should calculate balance amount correctly', async () => {
          balance_amount: validContractData.total_amount - validContractData.deposit_amount!
    it('should handle missing deposit amount', async () => {
      const dataWithoutDeposit = { ...validContractData }
      delete dataWithoutDeposit.deposit_amount
      delete dataWithoutDeposit.deposit_percentage
        body: JSON.stringify(dataWithoutDeposit)
          balance_amount: validContractData.total_amount
})
