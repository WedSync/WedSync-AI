import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MarkAsPaidModal } from '../MarkAsPaidModal';

// Mock file upload
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
});
const mockPayment = {
  id: 'payment-1',
  vendor_name: 'Test Vendor',
  amount: 150000, // £1500.00
  currency: 'GBP',
  due_date: '2024-06-15',
  description: 'Wedding photography package',
  status: 'due' as const,
  vendor_id: 'vendor-1',
  budget_category_id: 'cat-1'
};
const mockProps = {
  payment: mockPayment,
  open: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  loading: false
describe('MarkAsPaidModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Rendering', () => {
    it('renders when open', () => {
      render(<MarkAsPaidModal {...mockProps} />);
      expect(screen.getByText('Mark Payment as Paid')).toBeInTheDocument();
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('£1,500.00')).toBeInTheDocument();
    });
    it('does not render when closed', () => {
      render(<MarkAsPaidModal {...mockProps} open={false} />);
      expect(screen.queryByText('Mark Payment as Paid')).not.toBeInTheDocument();
    it('renders payment details correctly', () => {
      expect(screen.getByText('Wedding photography package')).toBeInTheDocument();
      expect(screen.getByText(/Due: 15 Jun 2024/)).toBeInTheDocument();
    it('shows urgency indicator for overdue payments', () => {
      const overduePayment = { ...mockPayment, status: 'overdue' as const };
      render(<MarkAsPaidModal {...mockProps} payment={overduePayment} />);
      expect(screen.getByText('⚠️ Overdue Payment')).toBeInTheDocument();
  describe('Form Interaction', () => {
    it('allows date selection', async () => {
      const user = userEvent.setup();
      
      const dateInput = screen.getByLabelText(/payment date/i);
      await user.clear(dateInput);
      await user.type(dateInput, '2024-06-10');
      expect(dateInput).toHaveValue('2024-06-10');
    it('allows payment method selection', async () => {
      const methodSelect = screen.getByLabelText(/payment method/i);
      await user.selectOptions(methodSelect, 'bank_transfer');
      expect(methodSelect).toHaveValue('bank_transfer');
    it('allows reference number entry', async () => {
      const referenceInput = screen.getByLabelText(/reference number/i);
      await user.type(referenceInput, 'TXN123456');
      expect(referenceInput).toHaveValue('TXN123456');
    it('allows notes entry', async () => {
      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Payment processed successfully');
      expect(notesInput).toHaveValue('Payment processed successfully');
  describe('File Upload', () => {
    it('allows file upload', async () => {
      const file = new File(['receipt content'], 'receipt.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload receipt/i);
      await user.upload(fileInput, file);
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
    it('shows file size and validation', async () => {
      const file = new File(['content'], 'receipt.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      expect(screen.getByText(/1.0 KB/)).toBeInTheDocument();
    it('allows file removal', async () => {
      const file = new File(['content'], 'receipt.pdf', { type: 'application/pdf' });
      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);
      expect(screen.queryByText('receipt.pdf')).not.toBeInTheDocument();
  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const confirmButton = screen.getByText('Confirm Payment');
      await user.click(confirmButton);
      expect(mockProps.onConfirm).not.toHaveBeenCalled();
    it('validates future payment dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      await user.type(dateInput, futureDate.toISOString().split('T')[0]);
      expect(screen.getByText(/Payment date cannot be in the future/)).toBeInTheDocument();
    it('validates file size limits', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
      await user.upload(fileInput, largeFile);
      expect(screen.getByText(/File size must be less than 10MB/)).toBeInTheDocument();
  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      // Fill form
      // Submit
      await waitFor(() => {
        expect(mockProps.onConfirm).toHaveBeenCalledWith({
          paymentId: 'payment-1',
          paidDate: '2024-06-10',
          paymentMethod: 'bank_transfer',
          referenceNumber: 'TXN123456',
          receiptFile: null,
          notes: ''
        });
    it('includes uploaded file in submission', async () => {
      await user.selectOptions(methodSelect, 'card');
      // Upload file
      const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
        expect(mockProps.onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            receiptFile: file
          })
        );
  describe('Loading State', () => {
    it('shows loading state during submission', () => {
      render(<MarkAsPaidModal {...mockProps} loading={true} />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Confirming Payment...')).toBeDisabled();
    it('disables form during loading', () => {
      expect(dateInput).toBeDisabled();
      expect(methodSelect).toBeDisabled();
      expect(referenceInput).toBeDisabled();
  describe('Modal Controls', () => {
    it('calls onClose when cancel is clicked', async () => {
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      expect(mockProps.onClose).toHaveBeenCalled();
    it('closes on escape key', async () => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByText('Mark Payment as Paid')).toHaveAttribute('id');
    it('focuses first input on open', () => {
      expect(dateInput).toHaveFocus();
    it('has descriptive form labels', () => {
      expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reference number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/upload receipt/i)).toBeInTheDocument();
  describe('Error Handling', () => {
    it('displays server errors', async () => {
      const onConfirmWithError = jest.fn().mockRejectedValue(new Error('Server error'));
      render(<MarkAsPaidModal {...mockProps} onConfirm={onConfirmWithError} />);
      // Fill and submit form
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
    it('handles network errors gracefully', async () => {
      const onConfirmWithError = jest.fn().mockRejectedValue(new Error('Network error'));
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
