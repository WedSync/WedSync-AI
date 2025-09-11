import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import '@testing-library/jest-dom';
import { PaymentStatusIndicator, PaymentStatusUtils } from '../PaymentStatusIndicator';

describe('PaymentStatusIndicator', () => {
  describe('Status Rendering', () => {
    it('renders upcoming status correctly', () => {
      render(<PaymentStatusIndicator status="upcoming" showText />);
      expect(screen.getByText('upcoming')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-upcoming')).toHaveClass('bg-blue-50');
    });
    it('renders due status with urgency', () => {
      render(<PaymentStatusIndicator status="due" showText />);
      expect(screen.getByText('due')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-due')).toHaveClass('bg-yellow-50');
    it('renders overdue status with animation', () => {
      render(<PaymentStatusIndicator status="overdue" showText />);
      expect(screen.getByText('overdue')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-overdue')).toHaveClass('animate-pulse');
    it('renders paid status', () => {
      render(<PaymentStatusIndicator status="paid" showText />);
      expect(screen.getByText('paid')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-paid')).toHaveClass('bg-green-50');
  });
  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      render(<PaymentStatusIndicator status="upcoming" size="sm" />);
      const indicator = screen.getByTestId('status-indicator-upcoming');
      expect(indicator).toHaveClass('w-2', 'h-2');
    it('renders medium size correctly', () => {
      render(<PaymentStatusIndicator status="upcoming" size="md" />);
      expect(indicator).toHaveClass('w-3', 'h-3');
    it('renders large size correctly', () => {
      render(<PaymentStatusIndicator status="upcoming" size="lg" />);
      expect(indicator).toHaveClass('w-4', 'h-4');
  describe('Display Modes', () => {
    it('renders dot-only mode by default', () => {
      render(<PaymentStatusIndicator status="upcoming" />);
      expect(screen.getByTestId('status-indicator-upcoming')).toBeInTheDocument();
      expect(screen.queryByText('upcoming')).not.toBeInTheDocument();
    it('renders with icon when showIcon is true', () => {
      render(<PaymentStatusIndicator status="upcoming" showIcon />);
      expect(screen.getByTestId('status-icon-upcoming')).toBeInTheDocument();
    it('renders with text when showText is true', () => {
    it('renders with both icon and text', () => {
      render(<PaymentStatusIndicator status="upcoming" showIcon showText />);
      const badge = screen.getByTestId('status-badge-upcoming');
      expect(badge.querySelector('svg')).toBeInTheDocument();
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<PaymentStatusIndicator status="overdue" />);
      const indicator = screen.getByTestId('status-indicator-overdue');
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-label', 'Payment is overdue');
    it('has descriptive title attributes', () => {
      render(<PaymentStatusIndicator status="due" />);
      const indicator = screen.getByTestId('status-indicator-due');
      expect(indicator).toHaveAttribute('title', 'Payment due within next 7 days');
    it('has proper screen reader text', () => {
      const badge = screen.getByTestId('status-badge-paid');
      expect(badge).toHaveAttribute('aria-label', 'Payment completed');
  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<PaymentStatusIndicator status="upcoming" className="custom-class" />);
      expect(indicator).toHaveClass('custom-class');
    it('maintains base classes with custom className', () => {
      render(<PaymentStatusIndicator status="overdue" className="custom-class" />);
      expect(indicator).toHaveClass('custom-class', 'rounded-full', 'animate-pulse');
});
describe('PaymentStatusUtils', () => {
  const mockWeddingDate = '2024-06-15';
  
  describe('getUrgencyLevel', () => {
    it('returns low for paid status', () => {
      const level = PaymentStatusUtils.getUrgencyLevel(
        'paid', 
        '2024-06-10', 
        mockWeddingDate
      );
      expect(level).toBe('low');
    it('returns critical for overdue status', () => {
        'overdue', 
        '2024-06-05', 
      expect(level).toBe('critical');
    it('returns critical for payments due close to wedding', () => {
      const today = new Date();
      const weddingDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      
        'due',
        dueDate.toISOString(),
        weddingDate.toISOString()
    it('returns high for payments due within 7 days', () => {
      const dueDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
        'upcoming',
      expect(level).toBe('high');
  describe('getWeddingContextMessage', () => {
    it('generates appropriate message for upcoming payments', () => {
      const message = PaymentStatusUtils.getWeddingContextMessage(
        'Test Vendor',
        45
      expect(message).toContain('Test Vendor');
      expect(message).toContain('scheduled');
    it('includes wedding countdown for urgent payments', () => {
        15
      expect(message).toContain('Wedding in 15 days');
    it('shows urgency for overdue payments', () => {
        'overdue',
        30
      expect(message).toContain('⚠️ URGENT');
      expect(message).toContain('overdue');
  describe('getPriorityScore', () => {
    it('gives highest priority to overdue payments', () => {
      const overdueScore = PaymentStatusUtils.getPriorityScore({
        status: 'overdue',
        due_date: '2024-06-01',
        amount: 100000
      });
      const upcomingScore = PaymentStatusUtils.getPriorityScore({
        status: 'upcoming',
      expect(overdueScore).toBeGreaterThan(upcomingScore);
    it('considers amount in priority calculation', () => {
      const highAmount = PaymentStatusUtils.getPriorityScore({
        status: 'due',
        due_date: '2024-06-15',
        amount: 500000
      const lowAmount = PaymentStatusUtils.getPriorityScore({
        amount: 50000
      expect(highAmount).toBeGreaterThan(lowAmount);
