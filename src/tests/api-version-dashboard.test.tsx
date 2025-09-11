// src/tests/api-version-dashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals';
import APIVersionDashboard from '@/components/admin/APIVersionDashboard';
import MigrationAssistant from '@/components/api/MigrationAssistant';

// Mock fetch for API calls
global.fetch = jest.fn();
const mockVersionData = {
  success: true,
  data: {
    versions: [
      {
        version: 'v1',
        status: 'deprecated',
        release_date: '2023-01-01',
        deprecation_date: '2024-01-01',
        active_clients: 1200,
        monthly_requests: 15000000,
        wedding_features: ['Booking', 'Payments', 'Gallery'],
        breaking_changes: ['Auth changed']
      },
        version: 'v2',
        status: 'stable',
        release_date: '2024-01-01',
        active_clients: 3400,
        monthly_requests: 42000000,
        wedding_features: ['Advanced Booking', 'AI Features', 'Timeline'],
        breaking_changes: []
      }
    ],
    usage_analytics: [
        unique_clients: 1200,
        total_requests: 15000000,
        wedding_bookings_affected: 8000
        unique_clients: 3400,
        total_requests: 42000000,
        wedding_bookings_affected: 23000
    migration_progress: {
      total_migrations: 2000,
      completed_migrations: 1800,
      in_progress_migrations: 150,
      failed_migrations: 50,
      wedding_critical_migrations: 120
    },
    deprecation_schedule: [
        description: 'Legacy booking system',
        sunset_date: '2024-12-31',
        affected_clients: 1200
    client_breakdown: [],
    wedding_season_impact: {
      peak_wedding_months: ['May', 'June', 'July'],
      migration_window_recommendations: [],
      business_impact_projections: []
    }
  }
};
const mockMigrationPlan = {
    from_version: 'v1',
    to_version: 'v2',
    total_estimated_hours: 12,
    steps: [
        step_number: 1,
        title: 'Update Authentication',
        description: 'Migrate auth system',
        estimated_time: '3 hours',
        difficulty: 'moderate',
        dependencies: [],
        testing_requirements: ['Test auth flow'],
        wedding_specific_notes: ['Test with booking system']
    benefits: ['Better security', 'New features'],
    breaking_changes: [
        endpoint: '/api/auth',
        change_type: 'modified',
        description: 'Auth method changed',
        migration_instructions: 'Update to OAuth2',
        wedding_feature_impact: ['All endpoints']
    rollback_plan: [],
    wedding_testing_requirements: [
        feature: 'Booking System',
        test_scenarios: ['Test booking creation'],
        seasonal_considerations: ['Peak season testing'],
        client_notification_needed: true
    ]
describe('API Version Dashboard', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });
  test('displays all API versions with correct status indicators', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockVersionData,
    });
    render(<APIVersionDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    // Check status badges are displayed
    expect(screen.getByText('deprecated')).toBeInTheDocument();
    expect(screen.getByText('stable')).toBeInTheDocument();
  test('displays version metrics correctly', async () => {
      // Check that client counts are displayed with proper formatting
      expect(screen.getByText('1,200')).toBeInTheDocument();
      expect(screen.getByText('3,400')).toBeInTheDocument();
      
      // Check monthly requests are displayed in millions
      expect(screen.getByText('15.0M')).toBeInTheDocument();
      expect(screen.getByText('42.0M')).toBeInTheDocument();
  test('displays critical alerts for deprecated versions with high usage', async () => {
      expect(screen.getByText(/Critical:/)).toBeInTheDocument();
      expect(screen.getByText(/Deprecated API versions still have significant usage/)).toBeInTheDocument();
  test('refreshes data when refresh button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersionData,
      })
      });
    const refreshButton = screen.getByText('Refresh Data');
    fireEvent.click(refreshButton);
    expect(fetch).toHaveBeenCalledTimes(2);
  test('displays usage analytics in tabs', async () => {
      expect(screen.getByText('Usage Analytics')).toBeInTheDocument();
    // Check that usage analytics tab is displayed by default
    expect(screen.getByText('Wedding supplier API usage patterns')).toBeInTheDocument();
  test('displays migration progress correctly', async () => {
      const migrationsTab = screen.getByText('Migration Progress');
      fireEvent.click(migrationsTab);
      expect(screen.getByText('2000')).toBeInTheDocument(); // Total migrations
      expect(screen.getByText('1800')).toBeInTheDocument(); // Completed
      expect(screen.getByText('150')).toBeInTheDocument(); // In progress
      expect(screen.getByText('50')).toBeInTheDocument(); // Failed
  test('displays compatibility matrix', async () => {
      const compatibilityTab = screen.getByText('Compatibility Matrix');
      fireEvent.click(compatibilityTab);
      expect(screen.getByText('Version Compatibility Matrix')).toBeInTheDocument();
      expect(screen.getByText('From/To')).toBeInTheDocument();
  test('displays deprecation schedule', async () => {
      const deprecationTab = screen.getByText('Deprecation Notices');
      fireEvent.click(deprecationTab);
      expect(screen.getByText('Deprecation Schedule')).toBeInTheDocument();
      expect(screen.getByText('Legacy booking system')).toBeInTheDocument();
});
describe('Migration Assistant', () => {
  test('generates migration plans for wedding vendors', async () => {
      json: async () => mockMigrationPlan,
    render(<MigrationAssistant />);
    expect(screen.getByText('API Migration Assistant')).toBeInTheDocument();
    expect(screen.getByText('Step-by-step guidance for migrating your wedding business integration')).toBeInTheDocument();
    const generateButton = screen.getByText('Generate Migration Plan');
    fireEvent.click(generateButton);
      expect(screen.getByText('Migration Plan: v1 → v2')).toBeInTheDocument();
  test('displays migration metrics correctly', async () => {
      expect(screen.getByText('12h')).toBeInTheDocument(); // Estimated time
      expect(screen.getByText('2')).toBeInTheDocument(); // Benefits count
      expect(screen.getByText('1')).toBeInTheDocument(); // Steps count
  test('displays migration steps with wedding-specific notes', async () => {
      expect(screen.getByText('Migration Steps')).toBeInTheDocument();
      expect(screen.getByText('Update Authentication')).toBeInTheDocument();
      expect(screen.getByText('Wedding Industry Notes:')).toBeInTheDocument();
      expect(screen.getByText('Test with booking system')).toBeInTheDocument();
  test('displays breaking changes with wedding impact', async () => {
      expect(screen.getByText('Breaking Changes')).toBeInTheDocument();
      expect(screen.getByText('/api/auth')).toBeInTheDocument();
      expect(screen.getByText('Affected Wedding Features:')).toBeInTheDocument();
      expect(screen.getByText('All endpoints')).toBeInTheDocument();
  test('displays wedding testing requirements', async () => {
      expect(screen.getByText('Wedding Industry Testing Requirements')).toBeInTheDocument();
      expect(screen.getByText('Booking System')).toBeInTheDocument();
      expect(screen.getByText('Test Scenarios:')).toBeInTheDocument();
      expect(screen.getByText('Test booking creation')).toBeInTheDocument();
      expect(screen.getByText('Peak season testing')).toBeInTheDocument();
  test('shows client notification requirements', async () => {
      expect(screen.getByText('Client notification required before testing this feature')).toBeInTheDocument();
  test('allows version selection for migration path', async () => {
    const fromSelect = screen.getByDisplayValue('v1');
    const toSelect = screen.getByDisplayValue('v2');
    expect(fromSelect).toBeInTheDocument();
    expect(toSelect).toBeInTheDocument();
    // Test changing versions
    fireEvent.change(fromSelect, { target: { value: 'v1.1' } });
    fireEvent.change(toSelect, { target: { value: 'v2.1' } });
    expect(fromSelect).toHaveValue('v1.1');
    expect(toSelect).toHaveValue('v2.1');
  test('handles loading state during migration plan generation', async () => {
    // Simulate slow API response
    (fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        json: async () => mockMigrationPlan
      }), 100))
    );
    // Check loading state
    expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByText('Generate Migration Plan')).toBeInTheDocument();
describe('Wedding Industry Specific Features', () => {
  test('displays wedding season impact analysis', async () => {
      // Verify wedding-specific metrics are tracked
      expect(screen.getByText('Wedding Features')).toBeInTheDocument();
  test('prioritizes migration during off-peak wedding periods', async () => {
      expect(screen.getByText('Seasonal Considerations:')).toBeInTheDocument();
  test('displays wedding business impact for breaking changes', async () => {
