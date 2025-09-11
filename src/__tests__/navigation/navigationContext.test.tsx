/**
 * WS-038: Navigation Context Tests
 * Test navigation context provider and hooks
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { useRouter } from 'next/navigation'
import {
  NavigationProvider,
  useNavigation,
  useNavigationSearch,
  useBreadcrumbs,
  useQuickActions,
  useNavigationBadges,
  useActiveNavigation
} from '@/lib/navigation/navigationContext'
import { UserProfile } from '@/lib/navigation/roleBasedAccess'
// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }))
}))
const mockUserProfile: UserProfile = {
  id: 'test-user',
  role: 'admin',
  permissions: ['view_dashboard', 'manage_clients', 'view_analytics']
}
// Test component that uses navigation hooks
function TestComponent() {
  const { items, isLoading, userProfile, setUserProfile } = useNavigation()
  const { searchQuery, searchResults, search, clearSearch } = useNavigationSearch()
  const { breadcrumbs, addToBreadcrumbs, clearBreadcrumbs } = useBreadcrumbs()
  const quickActions = useQuickActions()
  const { badges, updateBadges } = useNavigationBadges()
  const { activeItem, contextAwareItems } = useActiveNavigation()
  return (
    <div>
      <div data-testid="user-role">{userProfile?.role || 'none'}</div>
      <div data-testid="items-count">{items.length}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="search-query">{searchQuery}</div>
      <div data-testid="search-results">{searchResults.length}</div>
      <div data-testid="breadcrumbs-count">{breadcrumbs.length}</div>
      <div data-testid="quick-actions-count">{quickActions.length}</div>
      <div data-testid="badges-count">{Object.keys(badges).length}</div>
      <div data-testid="active-item">{activeItem?.label || 'none'}</div>
      <div data-testid="context-items-count">{contextAwareItems.length}</div>
      
      <button 
        data-testid="set-user" 
        onClick={() => setUserProfile(mockUserProfile)}
      >
        Set User
      </button>
        data-testid="search" 
        onClick={() => search('client')}
        Search
        data-testid="clear-search" 
        onClick={clearSearch}
        Clear Search
        data-testid="add-breadcrumb" 
        onClick={() => addToBreadcrumbs({ label: 'Test', href: '/test', isActive: true })}
        Add Breadcrumb
        data-testid="clear-breadcrumbs" 
        onClick={clearBreadcrumbs}
        Clear Breadcrumbs
        data-testid="update-badges" 
        onClick={() => updateBadges({ test: 5 })}
        Update Badges
    </div>
  )
describe('NavigationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('should render without crashing', () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    )
    
    expect(screen.getByTestId('user-role')).toHaveTextContent('none')
    expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
  it('should initialize with user profile', () => {
      <NavigationProvider initialProfile={mockUserProfile}>
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
    expect(screen.getByTestId('items-count')).not.toHaveTextContent('0')
  it('should update navigation when user profile changes', async () => {
    expect(screen.getByTestId('items-count')).toHaveTextContent('0')
    fireEvent.click(screen.getByTestId('set-user'))
    await waitFor(() => {
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
      expect(screen.getByTestId('items-count')).not.toHaveTextContent('0')
    })
})
describe('useNavigationSearch', () => {
  it('should handle search functionality', async () => {
    expect(screen.getByTestId('search-query')).toHaveTextContent('')
    expect(screen.getByTestId('search-results')).toHaveTextContent('0')
    fireEvent.click(screen.getByTestId('search'))
      expect(screen.getByTestId('search-query')).toHaveTextContent('client')
      expect(screen.getByTestId('search-results')).not.toHaveTextContent('0')
    fireEvent.click(screen.getByTestId('clear-search'))
      expect(screen.getByTestId('search-query')).toHaveTextContent('')
      expect(screen.getByTestId('search-results')).toHaveTextContent('0')
describe('useBreadcrumbs', () => {
  it('should handle breadcrumb management', async () => {
    const initialCount = parseInt(screen.getByTestId('breadcrumbs-count').textContent || '0')
    fireEvent.click(screen.getByTestId('add-breadcrumb'))
      expect(screen.getByTestId('breadcrumbs-count')).toHaveTextContent((initialCount + 1).toString())
    fireEvent.click(screen.getByTestId('clear-breadcrumbs'))
      expect(screen.getByTestId('breadcrumbs-count')).toHaveTextContent('0')
  it('should auto-generate breadcrumbs from pathname', () => {
    const mockUsePathname = useRouter as jest.MockedFunction<typeof useRouter>
    mockUsePathname.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn()
    } as any)
    // Mock usePathname to return a specific path
    require('next/navigation').usePathname.mockReturnValue('/clients/123/edit')
    // Should have auto-generated breadcrumbs
    expect(parseInt(screen.getByTestId('breadcrumbs-count').textContent || '0')).toBeGreaterThan(1)
describe('useQuickActions', () => {
  it('should return quick actions based on user role', () => {
    expect(parseInt(screen.getByTestId('quick-actions-count').textContent || '0')).toBeGreaterThan(0)
  it('should return different quick actions for different roles', () => {
    const photographerProfile: UserProfile = {
      id: 'photographer',
      role: 'photographer',
      permissions: ['view_dashboard', 'photo_management']
    }
    const { rerender } = render(
    const adminQuickActionsCount = parseInt(screen.getByTestId('quick-actions-count').textContent || '0')
    rerender(
      <NavigationProvider initialProfile={photographerProfile}>
    const photographerQuickActionsCount = parseInt(screen.getByTestId('quick-actions-count').textContent || '0')
    // Different roles should have different quick actions
    expect(adminQuickActionsCount).not.toBe(photographerQuickActionsCount)
describe('useNavigationBadges', () => {
  it('should handle badge updates', async () => {
    const initialBadgeCount = parseInt(screen.getByTestId('badges-count').textContent || '0')
    fireEvent.click(screen.getByTestId('update-badges'))
      expect(parseInt(screen.getByTestId('badges-count').textContent || '0')).toBeGreaterThan(initialBadgeCount)
describe('useActiveNavigation', () => {
  it('should track active navigation item', () => {
    // Should have an active item (usually Dashboard for root path)
    expect(screen.getByTestId('active-item')).not.toHaveTextContent('none')
  it('should update active item based on pathname', () => {
    // Mock different pathname
    require('next/navigation').usePathname.mockReturnValue('/clients')
    const activeItem = screen.getByTestId('active-item').textContent
    expect(activeItem).toContain('Client') // Should match clients page
describe('Error handling', () => {
  it('should handle missing context gracefully', () => {
    // Component outside provider should throw
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useNavigation must be used within a NavigationProvider')
  it('should handle malformed user profile', () => {
    const malformedProfile = {
      id: 'test',
      role: 'invalid_role' as any,
      permissions: []
      render(
        <NavigationProvider initialProfile={malformedProfile}>
          <TestComponent />
        </NavigationProvider>
      )
    }).not.toThrow()
  it('should handle navigation errors gracefully', async () => {
    const mockRouter = {
      push: jest.fn().mockRejectedValue(new Error('Navigation failed')),
    require('next/navigation').useRouter.mockReturnValue(mockRouter)
    // Should not crash on navigation errors
    const { navigate } = useNavigation()
    expect(() => navigate('/test')).not.toThrow()
describe('Performance', () => {
  it('should not re-render unnecessarily', () => {
    const renderSpy = jest.fn()
    function SpyComponent() {
      renderSpy()
      const { items } = useNavigation()
      return <div>{items.length}</div>
        <SpyComponent />
    const initialRenderCount = renderSpy.mock.calls.length
    // Re-render with same props should not trigger child re-render
    expect(renderSpy.mock.calls.length).toBe(initialRenderCount)
  it('should debounce search updates', async () => {
    jest.useFakeTimers()
    // Rapid search calls
    // Should not execute all searches immediately
    expect(screen.getByTestId('search-query')).toHaveTextContent('client')
    jest.useRealTimers()
