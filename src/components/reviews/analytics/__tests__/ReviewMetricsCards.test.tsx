/**
 * @fileoverview Unit Tests for ReviewMetricsCards
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 * 
 * Test Coverage: Component rendering, metric display, trend indicators, accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ReviewMetricsCards } from '../ReviewMetricsCards';
import { Star, MessageCircle, TrendingUp, Heart } from 'lucide-react';
// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Star: () => <div data-testid="star-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
}));
// Test data
const mockMetrics = {
  totalReviews: {
    value: 156,
    label: 'Total Reviews',
    icon: MessageCircle,
    trend: 'up' as const,
    trendValue: '+12%',
  },
  averageRating: {
    value: '4.7',
    label: 'Average Rating',
    icon: Star,
    trendValue: '+0.2',
    suffix: '★',
  responseRate: {
    value: '89',
    label: 'Response Rate',
    icon: TrendingUp,
    trend: 'down' as const,
    trendValue: '-3%',
    suffix: '%',
  sentimentScore: {
    value: '82',
    label: 'Sentiment Score',
    icon: Heart,
    trend: 'neutral' as const,
    trendValue: '0%',
};
describe('ReviewMetricsCards', () => {
  describe('Component Rendering', () => {
    it('renders all metric cards', () => {
      render(<ReviewMetricsCards metrics={mockMetrics} />);
      
      expect(screen.getByTestId('metric-total-reviews')).toBeInTheDocument();
      expect(screen.getByTestId('metric-average-rating')).toBeInTheDocument();
      expect(screen.getByTestId('metric-response-rate')).toBeInTheDocument();
      expect(screen.getByTestId('metric-sentiment-score')).toBeInTheDocument();
    });
    it('displays correct metric values', () => {
      expect(screen.getByText('156')).toBeInTheDocument();
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument();
      expect(screen.getByText('82')).toBeInTheDocument();
    it('displays correct metric labels', () => {
      expect(screen.getByText('Total Reviews')).toBeInTheDocument();
      expect(screen.getByText('Average Rating')).toBeInTheDocument();
      expect(screen.getByText('Response Rate')).toBeInTheDocument();
      expect(screen.getByText('Sentiment Score')).toBeInTheDocument();
    it('displays suffixes when provided', () => {
      expect(screen.getByText('★')).toBeInTheDocument();
      expect(screen.getAllByText('%')).toHaveLength(2);
    it('applies custom className', () => {
      render(<ReviewMetricsCards metrics={mockMetrics} className="custom-class" />);
      const container = screen.getByTestId('metric-total-reviews').closest('.grid');
      expect(container).toHaveClass('custom-class');
  });
  describe('Loading State', () => {
    it('renders skeleton when loading', () => {
      render(<ReviewMetricsCards metrics={mockMetrics} loading={true} />);
      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('metric-total-reviews')).not.toBeInTheDocument();
    it('renders 4 skeleton cards', () => {
      const skeletonContainer = screen.getByTestId('metrics-skeleton');
      const cards = skeletonContainer.querySelectorAll('.border');
      expect(cards).toHaveLength(4);
  describe('Trend Indicators', () => {
    it('displays upward trend correctly', () => {
      const totalReviewsCard = screen.getByTestId('metric-total-reviews');
      expect(totalReviewsCard).toHaveTextContent('+12%');
    it('displays downward trend correctly', () => {
      const responseRateCard = screen.getByTestId('metric-response-rate');
      expect(responseRateCard).toHaveTextContent('-3%');
    it('displays neutral trend correctly', () => {
      const sentimentCard = screen.getByTestId('metric-sentiment-score');
      expect(sentimentCard).toHaveTextContent('0%');
    it('shows "vs last month" text for trends', () => {
      const trendTexts = screen.getAllByText('vs last month');
      expect(trendTexts).toHaveLength(4);
  describe('Trend Colors and Styling', () => {
    it('applies success styling for upward trends', () => {
      const badge = totalReviewsCard.querySelector('[class*="bg-green"]');
      expect(badge).toBeInTheDocument();
    it('applies destructive styling for downward trends', () => {
      const badge = responseRateCard.querySelector('[class*="bg-red"]');
    it('applies secondary styling for neutral trends', () => {
      const badge = sentimentCard.querySelector('[class*="bg-gray"]');
  describe('Accessibility', () => {
    it('provides screen reader content for metrics', () => {
      // Check for screen reader content
      expect(screen.getByText('Total Reviews: 156, trending up by +12%')).toHaveClass('sr-only');
      expect(screen.getByText('Average Rating: 4.7★, trending up by +0.2')).toHaveClass('sr-only');
      expect(screen.getByText('Response Rate: 89%, trending down by -3%')).toHaveClass('sr-only');
      expect(screen.getByText('Sentiment Score: 82%, trending neutral by 0%')).toHaveClass('sr-only');
    it('handles metrics without trend values', () => {
      const metricsWithoutTrend = {
        ...mockMetrics,
        totalReviews: {
          ...mockMetrics.totalReviews,
          trendValue: undefined,
        },
      };
      render(<ReviewMetricsCards metrics={metricsWithoutTrend} />);
      expect(totalReviewsCard).not.toHaveTextContent('vs last month');
    it('has proper card structure for screen readers', () => {
      const cards = screen.getAllByRole('generic').filter(el => 
        el.getAttribute('data-testid')?.startsWith('metric-')
      );
  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const zeroMetrics = {
          value: 0,
      render(<ReviewMetricsCards metrics={zeroMetrics} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    it('handles string values', () => {
      const stringMetrics = {
        averageRating: {
          ...mockMetrics.averageRating,
          value: 'N/A',
      render(<ReviewMetricsCards metrics={stringMetrics} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    it('handles missing icons gracefully', () => {
      const metricsWithoutIcon = {
          // @ts-ignore - Testing edge case
          icon: undefined,
      expect(() => {
        render(<ReviewMetricsCards metrics={metricsWithoutIcon} />);
      }).not.toThrow();
    it('handles long metric labels', () => {
      const longLabelMetrics = {
          label: 'This is a very long metric label that might overflow',
      render(<ReviewMetricsCards metrics={longLabelMetrics} />);
      expect(screen.getByText('This is a very long metric label that might overflow')).toBeInTheDocument();
    it('handles large numbers', () => {
      const largeNumberMetrics = {
          value: 999999,
      render(<ReviewMetricsCards metrics={largeNumberMetrics} />);
      expect(screen.getByText('999999')).toBeInTheDocument();
  describe('Component Structure', () => {
    it('uses proper grid layout classes', () => {
      expect(container).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    it('has proper card hover effects', () => {
      const card = screen.getByTestId('metric-total-reviews');
      expect(card).toHaveClass('transition-all', 'duration-200', 'hover:shadow-md');
    it('maintains consistent card structure', () => {
      cards.forEach(card => {
        expect(card.querySelector('.p-6')).toBeInTheDocument();
        expect(card.querySelector('.flex.items-center.justify-between')).toBeInTheDocument();
      });
});
