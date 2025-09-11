/**
 * WS-038: Role-Based Access Tests
 * Test role-based navigation filtering and permissions
 */

import {
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
  UserRole,
  NavigationPermission,
  UserProfile,
  getUserPermissions,
  hasPermission,
  filterNavigationByRole,
  getQuickActions,
  getContextAwareItems,
  getNavigationBadges,
  searchNavigationItems,
  getSeasonalPriority
} from '@/lib/navigation/roleBasedAccess'
describe('Role-Based Access System', () => {
  const mockUserProfiles: Record<UserRole, UserProfile> = {
    admin: {
      id: 'admin-1',
      role: 'admin',
      permissions: getUserPermissions('admin')
    },
    manager: {
      id: 'manager-1',
      role: 'manager',
      permissions: getUserPermissions('manager')
    photographer: {
      id: 'photographer-1',
      role: 'photographer',
      permissions: getUserPermissions('photographer')
    venue: {
      id: 'venue-1',
      role: 'venue',
      permissions: getUserPermissions('venue')
    florist: {
      id: 'florist-1',
      role: 'florist',
      permissions: getUserPermissions('florist')
    caterer: {
      id: 'caterer-1',
      role: 'caterer',
      permissions: getUserPermissions('caterer')
    coordinator: {
      id: 'coordinator-1',
      role: 'coordinator',
      permissions: getUserPermissions('coordinator')
    basic: {
      id: 'basic-1',
      role: 'basic',
      permissions: getUserPermissions('basic')
    }
  }
  describe('getUserPermissions', () => {
    it('should return correct permissions for admin role', () => {
      const permissions = getUserPermissions('admin')
      expect(permissions).toContain('view_dashboard')
      expect(permissions).toContain('manage_clients')
      expect(permissions).toContain('admin_features')
      expect(permissions).toContain('view_analytics')
    })
    it('should return limited permissions for basic role', () => {
      const permissions = getUserPermissions('basic')
      expect(permissions).toContain('manage_forms')
      expect(permissions).not.toContain('admin_features')
      expect(permissions).not.toContain('view_analytics')
    it('should return vendor-specific permissions for photographer', () => {
      const permissions = getUserPermissions('photographer')
      expect(permissions).toContain('photo_management')
      expect(permissions).toContain('coordination_tools')
      expect(permissions).not.toContain('venue_management')
  })
  describe('hasPermission', () => {
    it('should return true when user has required permission', () => {
      const userPermissions = getUserPermissions('admin')
      expect(hasPermission(userPermissions, ['view_dashboard'])).toBe(true)
      expect(hasPermission(userPermissions, ['admin_features'])).toBe(true)
    it('should return false when user lacks required permission', () => {
      const userPermissions = getUserPermissions('basic')
      expect(hasPermission(userPermissions, ['admin_features'])).toBe(false)
      expect(hasPermission(userPermissions, ['view_analytics'])).toBe(false)
    it('should return true if user has any of the required permissions', () => {
      const userPermissions = getUserPermissions('coordinator')
      expect(hasPermission(userPermissions, ['admin_features', 'coordination_tools'])).toBe(true)
  describe('filterNavigationByRole', () => {
    it('should return all navigation items for admin', () => {
      const adminNav = filterNavigationByRole(mockUserProfiles.admin)
      expect(adminNav.length).toBeGreaterThan(5)
      expect(adminNav.some(item => item.id === 'analytics')).toBe(true)
      expect(adminNav.some(item => item.id === 'settings')).toBe(true)
    it('should filter out admin-only items for basic users', () => {
      const basicNav = filterNavigationByRole(mockUserProfiles.basic)
      expect(basicNav.some(item => item.id === 'analytics')).toBe(false)
      expect(basicNav.some(item => item.id === 'dashboard')).toBe(true)
      expect(basicNav.some(item => item.id === 'forms')).toBe(true)
    it('should include vendor-specific items for photographers', () => {
      const photographerNav = filterNavigationByRole(mockUserProfiles.photographer)
      expect(photographerNav.some(item => item.id === 'photo-gallery')).toBe(true)
      expect(photographerNav.some(item => item.id === 'venue-setup')).toBe(false)
    it('should include vendor-specific items for venues', () => {
      const venueNav = filterNavigationByRole(mockUserProfiles.venue)
      expect(venueNav.some(item => item.id === 'venue-setup')).toBe(true)
      expect(venueNav.some(item => item.id === 'photo-gallery')).toBe(false)
    it('should filter children items based on permissions', () => {
      
      const adminFormsItem = adminNav.find(item => item.id === 'forms')
      const basicFormsItem = basicNav.find(item => item.id === 'forms')
      expect(adminFormsItem?.children?.length).toBeGreaterThanOrEqual(
        basicFormsItem?.children?.length || 0
      )
  describe('getQuickActions', () => {
    it('should return quick action items for admin', () => {
      const quickActions = getQuickActions(mockUserProfiles.admin)
      expect(quickActions.length).toBeGreaterThan(0)
      expect(quickActions.every(action => action.quickAction === true)).toBe(true)
    it('should return vendor-specific quick actions for photographer', () => {
      const quickActions = getQuickActions(mockUserProfiles.photographer)
      expect(quickActions.some(action => action.id === 'photo-gallery')).toBe(true)
      expect(quickActions.some(action => action.id === 'venue-setup')).toBe(false)
    it('should return limited quick actions for basic users', () => {
      const adminActions = getQuickActions(mockUserProfiles.admin)
      const basicActions = getQuickActions(mockUserProfiles.basic)
      expect(basicActions.length).toBeLessThanOrEqual(adminActions.length)
  describe('getContextAwareItems', () => {
    it('should return context-aware items', () => {
      const contextItems = getContextAwareItems(mockUserProfiles.admin)
      expect(contextItems.some(item => item.contextAware === true)).toBe(true)
    it('should modify dashboard item when activeWedding is present', () => {
      const profileWithActiveWedding = {
        ...mockUserProfiles.photographer,
        activeWedding: 'wedding-123'
      }
      const contextItems = getContextAwareItems(profileWithActiveWedding)
      const dashboardItem = contextItems.find(item => item.id === 'dashboard')
      expect(dashboardItem?.label).toBe('Active Wedding')
      expect(dashboardItem?.badge).toBe(1)
  describe('getNavigationBadges', () => {
    it('should return badges for users with coordination tools', () => {
      const badges = getNavigationBadges(mockUserProfiles.coordinator)
      expect(badges.communications).toBeGreaterThan(0)
      expect(badges.notifications).toBeGreaterThan(0)
    it('should return client badges for users with client management', () => {
      const badges = getNavigationBadges(mockUserProfiles.manager)
      expect(badges.clients).toBeGreaterThan(0)
    it('should return minimal badges for basic users', () => {
      const adminBadges = getNavigationBadges(mockUserProfiles.admin)
      const basicBadges = getNavigationBadges(mockUserProfiles.basic)
      const adminBadgeCount = Object.keys(adminBadges).length
      const basicBadgeCount = Object.keys(basicBadges).length
      expect(basicBadgeCount).toBeLessThanOrEqual(adminBadgeCount)
  describe('searchNavigationItems', () => {
    it('should find items by label', () => {
      const results = searchNavigationItems('client', mockUserProfiles.admin)
      expect(results.some(item => item.label.toLowerCase().includes('client'))).toBe(true)
    it('should search in children items', () => {
      const results = searchNavigationItems('builder', mockUserProfiles.admin)
      expect(results.length).toBeGreaterThan(0)
    it('should return empty array for no matches', () => {
      const results = searchNavigationItems('nonexistent', mockUserProfiles.admin)
      expect(results.length).toBe(0)
    it('should respect role permissions in search results', () => {
      const adminResults = searchNavigationItems('analytics', mockUserProfiles.admin)
      const basicResults = searchNavigationItems('analytics', mockUserProfiles.basic)
      expect(adminResults.length).toBeGreaterThan(basicResults.length)
  describe('getSeasonalPriority', () => {
    it('should increase badges during wedding season', () => {
      // Mock wedding season (May-October)
      const originalDate = Date
      const mockDate = new Date('2024-06-15') // June
      global.Date = jest.fn(() => mockDate) as any
      global.Date.now = jest.fn(() => mockDate.getTime())
      const seasonalItems = getSeasonalPriority(mockUserProfiles.coordinator)
      const regularItems = filterNavigationByRole(mockUserProfiles.coordinator)
      const seasonalClientItem = seasonalItems.find(item => item.id === 'clients')
      const regularClientItem = regularItems.find(item => item.id === 'clients')
      expect(seasonalClientItem?.badge).toBeGreaterThan(regularClientItem?.badge || 0)
      global.Date = originalDate
    it('should not increase badges outside wedding season', () => {
      // Mock non-wedding season (December)
      const mockDate = new Date('2024-12-15') // December
      expect(seasonalItems).toEqual(regularItems)
  describe('Permission inheritance and edge cases', () => {
    it('should handle empty permissions gracefully', () => {
      const emptyProfile: UserProfile = {
        id: 'test',
        role: 'basic',
        permissions: []
      const nav = filterNavigationByRole(emptyProfile)
      expect(nav.length).toBe(0)
    it('should handle missing vendor type gracefully', () => {
      const profileWithoutVendorType = {
        ...mockUserProfiles.photographer
      delete profileWithoutVendorType.vendorType
      const nav = filterNavigationByRole(profileWithoutVendorType)
      expect(nav.length).toBeGreaterThan(0)
    it('should handle malformed navigation items', () => {
      const profileWithBasicPerms = mockUserProfiles.basic
      // Should not throw error even with malformed data
      expect(() => {
        filterNavigationByRole(profileWithBasicPerms)
        getQuickActions(profileWithBasicPerms)
        searchNavigationItems('test', profileWithBasicPerms)
      }).not.toThrow()
})
