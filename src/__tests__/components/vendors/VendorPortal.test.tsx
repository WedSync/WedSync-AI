import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import VendorPortalPage from '@/app/(dashboard)/vendor-portal/page'

// Mock dependencies
jest.mock('@/hooks/useUser')
jest.mock('@/lib/supabase/client')
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
      })),
    })),
  })),
}
describe('VendorPortalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockReturnValue(mockSupabaseClient as any)
  })
  it('shows loading state initially', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: true,
    })
    render(<VendorPortalPage />)
    expect(screen.getByText('Loading vendor portal...')).toBeInTheDocument()
  it('redirects to login if no user', () => {
    const mockRedirect = require('next/navigation').redirect
      loading: false,
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  it('shows vendor profile setup prompt if no profile found', async () => {
      user: { id: 'user1', organization_id: 'org1' },
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: null,
      error: new Error('Not found'),
    await waitFor(() => {
      expect(screen.getByText('Vendor Profile Not Found')).toBeInTheDocument()
      expect(screen.getByText('Create Vendor Profile')).toBeInTheDocument()
  it('renders vendor portal with valid profile', async () => {
    const mockVendorProfile = {
      id: 'vendor1',
      business_name: 'Test Photography',
      primary_category: 'photography',
      average_rating: 4.5,
      total_reviews: 25,
      is_verified: true,
      profile_completion_score: 85,
    }
    mockSupabaseClient.from().select().eq().single
      .mockResolvedValueOnce({ data: mockVendorProfile, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      expect(screen.getByText('Test Photography')).toBeInTheDocument()
      expect(screen.getByText('photography')).toBeInTheDocument()
      expect(screen.getByText('Verified')).toBeInTheDocument()
  it('displays performance stats correctly', async () => {
    const mockWeddings = [
      {
        id: 'w1',
        clients: { status: 'active', wedding_date: '2024-03-01' },
      },
        id: 'w2',
        clients: { status: 'completed', wedding_date: '2024-01-15' },
    ]
    mockSupabaseClient.from().select().eq()
      .mockResolvedValueOnce({ data: mockWeddings, error: null })
      expect(screen.getByText('4.5')).toBeInTheDocument()
      expect(screen.getByText('(25 reviews)')).toBeInTheDocument()
  it('handles tab navigation correctly', async () => {
      .mockResolvedValue({ data: mockVendorProfile, error: null })
      .mockResolvedValue({ data: [], error: null })
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    // Click on Performance tab
    const performanceTab = screen.getByRole('button', { name: /Performance/i })
    fireEvent.click(performanceTab)
    expect(performanceTab).toHaveClass('text-purple-600')
  it('shows notifications badge when notifications exist', async () => {
    const mockNotifications = [
      { id: '1', is_read: false },
      { id: '2', is_read: false },
      .mockResolvedValueOnce({ data: mockNotifications, error: null })
      const notificationButton = screen.getByRole('button', { name: /bell/i })
      expect(notificationButton).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // notification count badge
})
