/**
 * Document Manager Component Tests
 * Tests for the main document management interface
 * WS-068: Wedding Business Compliance Hub
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { DocumentManager } from '@/components/documents/DocumentManager';
import { documentStorageService } from '@/lib/services/documentStorageService';
import '@testing-library/jest-dom';
// Mock the document storage service
jest.mock('@/lib/services/documentStorageService', () => ({
  documentStorageService: {
    getDocumentLibrary: jest.fn(),
    uploadDocument: jest.fn(),
    deleteDocument: jest.fn(),
    updateComplianceStatus: jest.fn()
  }
}));
// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn()
  })
describe('DocumentManager Component', () => {
  const mockUserId = 'test-user-123';
  const mockDocuments = [
    {
      id: 'doc-1',
      title: 'Insurance Certificate',
      original_filename: 'insurance.pdf',
      category_id: 'insurance',
      category_name: 'Insurance',
      category_icon: 'Shield',
      category_color: '#3B82F6',
      file_size: 1024000,
      mime_type: 'application/pdf',
      compliance_status: 'valid',
      security_level: 'high',
      expiry_date: '2025-12-31',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      tags: ['2024', 'liability']
    },
      id: 'doc-2',
      title: 'PAT Testing Certificate',
      original_filename: 'pat-test.pdf',
      category_id: 'safety',
      category_name: 'Safety Certificates',
      category_color: '#10B981',
      file_size: 512000,
      compliance_status: 'expiring',
      security_level: 'standard',
      expiry_date: '2024-02-15',
      tags: ['equipment', 'safety']
    }
  ];
  const mockLibraryResponse = {
    documents: mockDocuments,
    categories: [
      { id: 'insurance', display_name: 'Insurance', icon: 'Shield', color: '#3B82F6' },
      { id: 'safety', display_name: 'Safety Certificates', icon: 'Shield', color: '#10B981' }
    ],
    statistics: {
      total_documents: 2,
      expired_documents: 0,
      expiring_documents: 1,
      total_storage_used: 1536000
    total: 2,
    has_more: false
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (documentStorageService.getDocumentLibrary as jest.Mock).mockResolvedValue(mockLibraryResponse);
  });
  describe('Rendering', () => {
    it('should render the document manager with header', async () => {
      render(<DocumentManager userId={mockUserId} />);
      expect(screen.getByText('Document Manager')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/2 documents/)).toBeInTheDocument();
      });
    });
    it('should display document statistics', async () => {
        expect(screen.getByText(/1.46 MB used/)).toBeInTheDocument();
    it('should render view toggle buttons', () => {
      const gridButton = screen.getByRole('button', { name: /grid/i });
      const listButton = screen.getByRole('button', { name: /list/i });
      expect(gridButton).toBeInTheDocument();
      expect(listButton).toBeInTheDocument();
    it('should render upload button when allowed', () => {
      render(<DocumentManager userId={mockUserId} allowUpload={true} />);
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeInTheDocument();
    it('should not render upload button when not allowed', () => {
      render(<DocumentManager userId={mockUserId} allowUpload={false} />);
      expect(screen.queryByRole('button', { name: /Upload Document/i })).not.toBeInTheDocument();
  describe('Document Display', () => {
    it('should display documents in grid view by default', async () => {
        expect(screen.getByText('Insurance Certificate')).toBeInTheDocument();
        expect(screen.getByText('PAT Testing Certificate')).toBeInTheDocument();
    it('should switch to list view when clicked', async () => {
      fireEvent.click(listButton);
        // In list view, documents should still be visible
    it('should display compliance status badges', async () => {
        expect(screen.getByText('Valid')).toBeInTheDocument();
        expect(screen.getByText('Expiring')).toBeInTheDocument();
    it('should display security level badges', async () => {
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Standard')).toBeInTheDocument();
    it('should display document tags', async () => {
        expect(screen.getByText('2024')).toBeInTheDocument();
        expect(screen.getByText('liability')).toBeInTheDocument();
  describe('Search and Filtering', () => {
    it('should render search input', () => {
      const searchInput = screen.getByPlaceholderText('Search documents...');
      expect(searchInput).toBeInTheDocument();
    it('should trigger search on input', async () => {
      const user = userEvent.setup();
      await user.type(searchInput, 'insurance');
        expect(documentStorageService.getDocumentLibrary).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({
            search: 'insurance'
          })
        );
    it('should show filters when filter button clicked', async () => {
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      fireEvent.click(filterButton);
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Compliance Status')).toBeInTheDocument();
        expect(screen.getByText('Security Level')).toBeInTheDocument();
    it('should apply category filter', async () => {
        const categorySelect = screen.getByText('All categories');
        fireEvent.click(categorySelect);
      const insuranceOption = await screen.findByText('Insurance');
      fireEvent.click(insuranceOption);
            category_ids: ['insurance']
  describe('Document Actions', () => {
    it('should call onDocumentSelect when document clicked', async () => {
      const onDocumentSelect = jest.fn();
      render(
        <DocumentManager 
          userId={mockUserId} 
          onDocumentSelect={onDocumentSelect}
        />
      );
        const documentCard = screen.getByText('Insurance Certificate').closest('div[class*="Card"]');
        if (documentCard) {
          fireEvent.click(documentCard);
        }
      expect(onDocumentSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'doc-1',
          title: 'Insurance Certificate'
        })
    it('should show delete confirmation when delete clicked', async () => {
      window.confirm = jest.fn(() => true);
      
          userId={mockUserId}
          allowDelete={true}
        const deleteButtons = screen.getAllByRole('button').filter(
          btn => btn.querySelector('svg[class*="Trash"]')
        if (deleteButtons[0]) {
          fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this document?'
    it('should call deleteDocument service when confirmed', async () => {
      (documentStorageService.deleteDocument as jest.Mock).mockResolvedValue(undefined);
        expect(documentStorageService.deleteDocument).toHaveBeenCalledWith(
          'doc-1',
          mockUserId
  describe('Upload Dialog', () => {
    it('should open upload dialog when upload button clicked', async () => {
      const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
      fireEvent.click(uploadButton);
        expect(screen.getByText('Upload Business Document')).toBeInTheDocument();
        expect(screen.getByText('Document Details')).toBeInTheDocument();
    it('should show compliance tab in upload dialog', async () => {
        const complianceTab = screen.getByText('Compliance & Security');
        fireEvent.click(complianceTab);
      expect(screen.getByText('Issue Date')).toBeInTheDocument();
      expect(screen.getByText('Expiry Date')).toBeInTheDocument();
      expect(screen.getByText('Security Level')).toBeInTheDocument();
    it('should validate required fields in upload dialog', async () => {
        const chooseFileButton = screen.getByRole('button', { name: /Choose File/i });
        expect(chooseFileButton).toBeDisabled(); // Should be disabled without category
  describe('Empty State', () => {
    it('should show empty state when no documents', async () => {
      (documentStorageService.getDocumentLibrary as jest.Mock).mockResolvedValue({
        documents: [],
        categories: [],
        statistics: {
          total_documents: 0,
          expired_documents: 0,
          expiring_documents: 0,
          total_storage_used: 0
        },
        total: 0,
        has_more: false
        expect(screen.getByText('No documents yet')).toBeInTheDocument();
        expect(screen.getByText('Upload Your First Document')).toBeInTheDocument();
    it('should support drag and drop in empty state', async () => {
        expect(screen.getByText(/Drag & drop documents here/)).toBeInTheDocument();
  describe('Loading States', () => {
    it('should show loading state while fetching documents', async () => {
      (documentStorageService.getDocumentLibrary as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockLibraryResponse), 100))
      expect(screen.getByText('Loading documents...')).toBeInTheDocument();
        expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
  describe('Error Handling', () => {
    it('should handle document fetch errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (documentStorageService.getDocumentLibrary as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch')
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load documents:',
          expect.any(Error)
      consoleError.mockRestore();
    it('should handle upload errors gracefully', async () => {
      (documentStorageService.uploadDocument as jest.Mock).mockRejectedValue(
        new Error('Upload failed')
      // Trigger upload process
});
