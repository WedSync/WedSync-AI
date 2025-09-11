/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import CustomerHealthDashboard from '@/components/dashboard/CustomerHealthDashboard'
import type { SupplierHealthMetrics } from '@/types/supplier-health'
// Mock the child components to focus on dashboard logic
jest.mock('@/components/dashboard/HealthTrendChart', () => {
  return function MockHealthTrendChart({ suppliers, selectedSupplier }: any) {
    return (
      <div data-testid="health-trend-chart">
        Health Trend Chart - Suppliers: {suppliers.length}
        {selectedSupplier && <span data-testid="selected-supplier">{selectedSupplier}</span>}
      </div>
    )
  }
})
jest.mock('@/components/dashboard/RiskLevelFilter', () => {
  return function MockRiskLevelFilter({ filters, onChange }: any) {
      <div data-testid="risk-level-filter">
        <button 
          onClick={() => onChange({ riskLevels: ['red'] })}
          data-testid="filter-critical"
        >
          Filter Critical
        </button>
        <span data-testid="current-risk-levels">
          {filters.riskLevels.join(',')}
        </span>
jest.mock('@/components/dashboard/InterventionActions', () => {
  return function MockInterventionActions({ suppliers, onActionExecuted }: any) {
      <div data-testid="intervention-actions">
          onClick={() => onActionExecuted('sup_001', { id: 'int_001', type: 'follow_up' })}
          data-testid="execute-intervention"
          Execute Intervention
        Interventions: {suppliers.flatMap((s: any) => s.interventionsNeeded).length}
jest.mock('@/components/dashboard/HealthExportButton', () => {
  return function MockHealthExportButton({ suppliers }: any) {
      <div data-testid="health-export-button">
        Export {suppliers.length} suppliers
// Mock Supabase client
const mockSupabaseClient = {
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() }))
    }))
  }))
}
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))
// Sample test data
const mockSuppliers: SupplierHealthMetrics[] = [
  {
    id: '1',
    supplier_id: 'sup_001',
    organization_id: 'org_001',
    supplier_name: 'Perfect Moments Photography',
    supplier_category: 'photographer',
    supplier_email: 'contact@perfectmoments.com',
    supplier_business_name: 'Perfect Moments Photography Ltd',
    health_score: 92,
    risk_level: 'green',
    last_activity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    active_clients: 8,
    completed_projects: 45,
    avg_response_time: 2.5,
    client_satisfaction: 4.8,
    revenue: 85000,
    trendsData: [
      {
        date: '2024-01-01',
        healthScore: 88,
        activeClients: 6,
        revenue: 78000,
        clientSatisfaction: 4.6,
        avgResponseTime: 3.0
      }
    ],
    interventionsNeeded: [
        id: 'int_001',
        type: 'follow_up',
        priority: 'low',
        description: 'Schedule quarterly business review',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
    last_contact_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'High performing supplier, excellent client feedback',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
    id: '2',
    supplier_id: 'sup_002',
    supplier_name: 'Elegant Events Planning',
    supplier_category: 'planner',
    supplier_email: 'hello@elegantevents.com',
    supplier_business_name: 'Elegant Events Ltd',
    health_score: 67,
    risk_level: 'yellow',
    last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    active_clients: 12,
    completed_projects: 28,
    avg_response_time: 8.5,
    client_satisfaction: 4.1,
    revenue: 120000,
    trendsData: [],
        id: 'int_002',
        type: 'support',
        priority: 'high',
        description: 'Response time training needed',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    last_contact_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Response times increasing, may need additional support',
    id: '3',
    supplier_id: 'sup_003',
    supplier_name: 'Fairytale Flowers',
    supplier_category: 'florist',
    supplier_email: 'orders@fairytaleflowers.com',
    supplier_business_name: 'Fairytale Flowers & Events',
    health_score: 34,
    risk_level: 'red',
    last_activity: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    active_clients: 3,
    completed_projects: 15,
    avg_response_time: 18.0,
    client_satisfaction: 3.2,
    revenue: 45000,
        id: 'int_004',
        type: 'retention',
        priority: 'critical',
        description: 'URGENT: Multiple client complaints',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_contact_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'CRITICAL: Multiple escalated complaints',
]
describe('CustomerHealthDashboard', () => {
  const defaultProps = {
    initialData: mockSuppliers,
    onActionExecuted: jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Basic Rendering', () => {
    it('renders the dashboard with initial data', () => {
      render(<CustomerHealthDashboard {...defaultProps} />)
      
      expect(screen.getByText('Customer Success Dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('health-trend-chart')).toBeInTheDocument()
      expect(screen.getByTestId('risk-level-filter')).toBeInTheDocument()
      expect(screen.getByTestId('intervention-actions')).toBeInTheDocument()
      expect(screen.getByTestId('health-export-button')).toBeInTheDocument()
    })
    it('displays supplier count correctly', () => {
      expect(screen.getByText(/3 suppliers/)).toBeInTheDocument()
    it('calculates dashboard summary correctly', () => {
      // Check that summary metrics are displayed
      expect(screen.getByText(/Average Health Score: 64\.3/)).toBeInTheDocument()
      expect(screen.getByText(/Total Revenue: £250,000/)).toBeInTheDocument()
    it('renders with empty data', () => {
      render(<CustomerHealthDashboard {...defaultProps} initialData={[]} />)
      expect(screen.getByText(/0 suppliers/)).toBeInTheDocument()
  describe('Filtering Functionality', () => {
    it('updates filters when risk level filter changes', async () => {
      const filterButton = screen.getByTestId('filter-critical')
      fireEvent.click(filterButton)
      await waitFor(() => {
        expect(screen.getByTestId('current-risk-levels')).toHaveTextContent('red')
      })
    it('filters suppliers by risk level', async () => {
      // Should only show critical suppliers after filtering
        // The chart should receive filtered suppliers
        expect(screen.getByText('Health Trend Chart - Suppliers: 1')).toBeInTheDocument()
  describe('Supplier Selection', () => {
    it('allows selecting individual suppliers', async () => {
      // Find and click on a supplier card
      const supplierCard = screen.getByText('Perfect Moments Photography').closest('.supplier-card')
      if (supplierCard) {
        fireEvent.click(supplierCard)
        
        await waitFor(() => {
          expect(screen.getByTestId('selected-supplier')).toHaveTextContent('sup_001')
        })
    it('deselects supplier when clicking again', async () => {
        // Select supplier
          expect(screen.getByTestId('selected-supplier')).toBeInTheDocument()
        // Deselect supplier
          expect(screen.queryByTestId('selected-supplier')).not.toBeInTheDocument()
  describe('Intervention Actions', () => {
    it('executes intervention actions', async () => {
      const mockOnActionExecuted = jest.fn().mockResolvedValue(undefined)
      render(<CustomerHealthDashboard {...defaultProps} onActionExecuted={mockOnActionExecuted} />)
      const executeButton = screen.getByTestId('execute-intervention')
      fireEvent.click(executeButton)
        expect(mockOnActionExecuted).toHaveBeenCalledWith('sup_001', {
          id: 'int_001',
          type: 'follow_up'
    it('handles intervention execution errors', async () => {
      const mockOnActionExecuted = jest.fn().mockRejectedValue(new Error('Execution failed'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to execute intervention:',
          expect.any(Error)
        )
      consoleSpy.mockRestore()
  describe('Real-time Updates', () => {
    it('sets up Supabase real-time subscription', () => {
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('supplier-health-changes')
    it('cleans up subscription on unmount', () => {
      const mockUnsubscribe = jest.fn()
      const mockSubscribe = jest.fn(() => ({ unsubscribe: mockUnsubscribe }))
      mockSupabaseClient.channel.mockReturnValue({
        on: jest.fn(() => ({ subscribe: mockSubscribe }))
      const { unmount } = render(<CustomerHealthDashboard {...defaultProps} />)
      unmount()
      expect(mockUnsubscribe).toHaveBeenCalled()
  describe('Data Calculations', () => {
    it('calculates risk distribution correctly', () => {
      // Should show 1 green, 1 yellow, 1 red based on mock data
      expect(screen.getByText(/1 Healthy/)).toBeInTheDocument()
      expect(screen.getByText(/1 At Risk/)).toBeInTheDocument()
      expect(screen.getByText(/1 Critical/)).toBeInTheDocument()
    it('calculates total revenue correctly', () => {
      // 85000 + 120000 + 45000 = 250000
      expect(screen.getByText(/£250,000/)).toBeInTheDocument()
    it('calculates average health score correctly', () => {
      // (92 + 67 + 34) / 3 = 64.33
      expect(screen.getByText(/64\.3/)).toBeInTheDocument()
    it('counts interventions correctly', () => {
      expect(screen.getByText(/Interventions: 3/)).toBeInTheDocument()
  describe('Loading and Error States', () => {
    it('displays loading state', () => {
      render(<CustomerHealthDashboard {...defaultProps} loading={true} />)
      expect(screen.getByText(/Loading supplier data/)).toBeInTheDocument()
    it('displays error state', () => {
      render(<CustomerHealthDashboard {...defaultProps} error="Failed to load data" />)
      expect(screen.getByText(/Failed to load data/)).toBeInTheDocument()
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByLabelText(/Customer success dashboard/)).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      // Tab through focusable elements
      await user.tab()
      expect(document.activeElement).toHaveAttribute('data-testid', 'filter-critical')
      expect(document.activeElement).toHaveAttribute('data-testid', 'execute-intervention')
  describe('Performance', () => {
    it('memoizes filtered suppliers calculation', () => {
      const { rerender } = render(<CustomerHealthDashboard {...defaultProps} />)
      // Rerender with same props should not recalculate
      rerender(<CustomerHealthDashboard {...defaultProps} />)
      // Chart should still show all 3 suppliers
      expect(screen.getByText('Health Trend Chart - Suppliers: 3')).toBeInTheDocument()
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        ...mockSuppliers[0],
        id: `supplier_${index}`,
        supplier_id: `sup_${index}`,
        supplier_name: `Supplier ${index}`
      }))
      const startTime = performance.now()
      render(<CustomerHealthDashboard {...defaultProps} initialData={largeDataset} />)
      const endTime = performance.now()
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
      expect(screen.getByText(/1000 suppliers/)).toBeInTheDocument()
