/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import HealthTrendChart from '@/components/dashboard/HealthTrendChart'
import type { SupplierHealthMetrics, ChartConfiguration } from '@/types/supplier-health'
// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  AreaChart: ({ children, data }: any) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  Area: ({ dataKey, stroke }: any) => (
    <div data-testid={`area-${dataKey}`} data-stroke={stroke} />
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container" style={{ width: '100%', height: '100%' }}>
  )
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
    last_activity: new Date().toISOString(),
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
      },
        date: '2024-02-01',
        healthScore: 92,
        activeClients: 8,
        revenue: 85000,
        clientSatisfaction: 4.8,
        avgResponseTime: 2.5
        date: '2024-03-01',
        healthScore: 95,
        activeClients: 10,
        revenue: 90000,
        clientSatisfaction: 4.9,
        avgResponseTime: 2.0
      }
    ],
    interventionsNeeded: [],
    last_contact_date: new Date().toISOString(),
    notes: 'High performing supplier',
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
    active_clients: 12,
    completed_projects: 28,
    avg_response_time: 8.5,
    client_satisfaction: 4.1,
    revenue: 120000,
        healthScore: 75,
        revenue: 110000,
        clientSatisfaction: 4.3,
        avgResponseTime: 6.0
        healthScore: 71,
        activeClients: 11,
        revenue: 115000,
        clientSatisfaction: 4.2,
        avgResponseTime: 7.0
        healthScore: 67,
        activeClients: 12,
        revenue: 120000,
        clientSatisfaction: 4.1,
        avgResponseTime: 8.5
    notes: 'Response times increasing',
  }
]
const defaultProps = {
  suppliers: mockSuppliers,
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-03-31')
  selectedSupplier: null,
  onSupplierSelect: jest.fn()
}
describe('HealthTrendChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Basic Rendering', () => {
    it('renders the chart with default configuration', () => {
      render(<HealthTrendChart {...defaultProps} />)
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    })
    it('displays metric selector', () => {
      expect(screen.getByDisplayValue('Health Score')).toBeInTheDocument()
      expect(screen.getByText('Metric:')).toBeInTheDocument()
    it('displays chart type selector', () => {
      expect(screen.getByDisplayValue('Line')).toBeInTheDocument()
      expect(screen.getByText('Chart:')).toBeInTheDocument()
    it('displays supplier selection buttons', () => {
      expect(screen.getByText('All Suppliers')).toBeInTheDocument()
      expect(screen.getByText('Perfect Moments Photography')).toBeInTheDocument()
      expect(screen.getByText('Elegant Events Planning')).toBeInTheDocument()
  describe('Chart Type Switching', () => {
    it('switches from line chart to area chart', async () => {
      // Initially shows line chart
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()
      // Switch to area chart
      const chartTypeSelect = screen.getByDisplayValue('Line')
      fireEvent.change(chartTypeSelect, { target: { value: 'area' } })
      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument()
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
      })
    it('renders correct chart elements for line chart', () => {
      expect(screen.getByTestId('line-healthScore')).toBeInTheDocument()
      expect(screen.getByTestId('line-healthScore')).toHaveAttribute('data-stroke', '#8b5cf6')
    it('renders correct chart elements for area chart', async () => {
        expect(screen.getByTestId('area-healthScore')).toBeInTheDocument()
  describe('Metric Selection', () => {
    it('switches between different metrics', async () => {
      const metricSelect = screen.getByDisplayValue('Health Score')
      // Switch to revenue metric
      fireEvent.change(metricSelect, { target: { value: 'revenue' } })
        expect(screen.getByTestId('line-revenue')).toBeInTheDocument()
        expect(screen.getByTestId('line-revenue')).toHaveAttribute('data-stroke', '#10b981')
    it('displays different colors for different metrics', async () => {
      // Test each metric color
      const metrics = [
        { value: 'healthScore', color: '#8b5cf6' },
        { value: 'activeClients', color: '#3b82f6' },
        { value: 'revenue', color: '#10b981' },
        { value: 'clientSatisfaction', color: '#f59e0b' }
      ]
      for (const metric of metrics) {
        fireEvent.change(metricSelect, { target: { value: metric.value } })
        
        await waitFor(() => {
          expect(screen.getByTestId(`line-${metric.value}`)).toHaveAttribute(
            'data-stroke',
            metric.color
          )
        })
  describe('Supplier Selection', () => {
    it('filters data for selected supplier', async () => {
      const supplierButton = screen.getByText('Perfect Moments Photography')
      fireEvent.click(supplierButton)
        expect(defaultProps.onSupplierSelect).toHaveBeenCalledWith('sup_001')
    it('shows all suppliers when "All Suppliers" is selected', async () => {
      render(<HealthTrendChart {...defaultProps} selectedSupplier="sup_001" />)
      const allSuppliersButton = screen.getByText('All Suppliers')
      fireEvent.click(allSuppliersButton)
        expect(defaultProps.onSupplierSelect).toHaveBeenCalledWith(null)
    it('highlights selected supplier button', () => {
      const selectedButton = screen.getByText('Perfect Moments Photography')
      expect(selectedButton).toHaveClass('bg-blue-600', 'text-white')
    it('shows "More..." dropdown for additional suppliers', () => {
      const manySuppliers = Array.from({ length: 10 }, (_, index) => ({
        ...mockSuppliers[0],
        id: `supplier_${index}`,
        supplier_id: `sup_${index}`,
        supplier_name: `Supplier ${index}`
      }))
      render(<HealthTrendChart {...defaultProps} suppliers={manySuppliers} />)
      expect(screen.getByText('More...')).toBeInTheDocument()
  describe('Data Processing', () => {
    it('aggregates data correctly for all suppliers', () => {
      const lineChart = screen.getByTestId('line-chart')
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]')
      // Should aggregate data from both suppliers
      expect(chartData).toHaveLength(3) // 3 date points
      expect(chartData[0].healthScore).toBe(81.5) // (88 + 75) / 2
    it('shows individual supplier data when selected', () => {
      // Should only show data for selected supplier
      expect(chartData[0].healthScore).toBe(88) // Only supplier 1 data
    it('filters data by date range', () => {
      const restrictedDateRange = {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-28')
      render(<HealthTrendChart {...defaultProps} dateRange={restrictedDateRange} />)
      // Should only include February data
      expect(chartData).toHaveLength(1)
      expect(chartData[0].date).toBe('2024-02-01')
    it('sorts data chronologically', () => {
      // Should be sorted by date
      expect(chartData[0].date).toBe('2024-01-01')
      expect(chartData[1].date).toBe('2024-02-01')
      expect(chartData[2].date).toBe('2024-03-01')
  describe('Trend Analysis', () => {
    it('calculates positive trend correctly', () => {
      // Health score increases from 81.5 to 81, so trend should be calculated
      expect(screen.getByText(/\+.*%/)).toBeInTheDocument()
    it('calculates negative trend correctly', () => {
      const decliningSupplier = [{
        trendsData: [
          {
            date: '2024-01-01',
            healthScore: 90,
            activeClients: 8,
            revenue: 85000,
            clientSatisfaction: 4.8,
            avgResponseTime: 2.5
          },
            date: '2024-02-01',
            healthScore: 80,
            activeClients: 6,
            revenue: 75000,
            clientSatisfaction: 4.5,
            avgResponseTime: 3.0
          }
        ]
      }]
      render(<HealthTrendChart {...defaultProps} suppliers={decliningSupplier} />)
      expect(screen.getByText(/-.*%/)).toBeInTheDocument()
    it('shows trend direction with appropriate icons', () => {
      // Should show trending up icon for positive trend
      expect(screen.getByTestId('trending-up')).toBeInTheDocument()
  describe('Empty States', () => {
    it('shows empty state when no data available', () => {
      render(<HealthTrendChart {...defaultProps} suppliers={[]} />)
      expect(screen.getByText('No trend data available')).toBeInTheDocument()
      expect(screen.getByText(/Data will appear as suppliers engage/)).toBeInTheDocument()
    it('shows empty state for supplier with no trend data', () => {
      const supplierWithoutTrends = [{
        trendsData: []
      render(<HealthTrendChart {...defaultProps} suppliers={supplierWithoutTrends} />)
  describe('Value Formatting', () => {
    it('formats revenue values correctly', async () => {
      // Revenue should be formatted as currency with compact notation
        const tooltip = screen.getByTestId('tooltip')
        expect(tooltip).toBeInTheDocument()
    it('formats satisfaction values with decimal places', async () => {
      fireEvent.change(metricSelect, { target: { value: 'clientSatisfaction' } })
        expect(screen.getByTestId('line-clientSatisfaction')).toBeInTheDocument()
    it('formats date labels correctly', () => {
      const xAxis = screen.getByTestId('x-axis')
      expect(xAxis).toHaveAttribute('data-key', 'date')
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      expect(screen.getByRole('img')).toHaveAttribute(
        'aria-label',
        'Health Score trend chart'
      )
    it('supports keyboard navigation for controls', async () => {
      const user = userEvent.setup()
      // Tab through interactive elements
      await user.tab()
      expect(document.activeElement).toHaveAttribute('role', 'button')
  describe('Performance', () => {
    it('memoizes chart data calculation', () => {
      const { rerender } = render(<HealthTrendChart {...defaultProps} />)
      // Rerender with same props
      rerender(<HealthTrendChart {...defaultProps} />)
      // Chart should maintain same data
      expect(chartData).toHaveLength(3)
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, index) => ({
        trendsData: Array.from({ length: 365 }, (_, dayIndex) => ({
          date: new Date(2024, 0, dayIndex + 1).toISOString(),
          healthScore: 80 + Math.random() * 20,
          activeClients: 5 + Math.floor(Math.random() * 10),
          revenue: 50000 + Math.random() * 50000,
          clientSatisfaction: 3.5 + Math.random() * 1.5,
          avgResponseTime: 1 + Math.random() * 10
        }))
      const startTime = performance.now()
      render(<HealthTrendChart {...defaultProps} suppliers={largeDataset} />)
      const endTime = performance.now()
      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(200)
})
