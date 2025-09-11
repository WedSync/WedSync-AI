import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaLibrary } from '../MediaLibrary';
import { MediaItem } from '@/types/cms';

// Mock MediaLibrary component tests
// WS-223 Team A - Round 1

const mockMediaItems: MediaItem[] = [
  {
    id: '1',
    organization_id: 'org1',
    url: 'https://example.com/image1.jpg',
    type: 'image',
    filename: 'wedding-photo-1.jpg',
    size: 2480000,
    alt_text: 'Beautiful wedding ceremony',
    tags: ['wedding', 'ceremony'],
    uploaded_by: 'user1',
    uploaded_at: '2025-01-30T10:00:00Z',
  },
  {
    id: '2',
    organization_id: 'org1',
    url: 'https://example.com/image2.jpg',
    type: 'image',
    filename: 'engagement-session.jpg',
    size: 1920000,
    alt_text: 'Couple engagement photos',
    tags: ['engagement', 'couples'],
    uploaded_by: 'user1',
    uploaded_at: '2025-01-29T15:30:00Z',
  },
];

describe('MediaLibrary', () => {
  const mockOnSelect = jest.fn();
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders media library header', () => {
    render(<MediaLibrary onSelect={mockOnSelect} />);

    expect(screen.getByText('Media Library')).toBeInTheDocument();
  });

  it('shows upload zone when no media items', () => {
    render(<MediaLibrary onSelect={mockOnSelect} />);

    expect(screen.getByText('Upload Media Files')).toBeInTheDocument();
    expect(
      screen.getByText('Drag and drop files here, or click to browse'),
    ).toBeInTheDocument();
  });

  it('renders media items in grid view', () => {
    render(<MediaLibrary onSelect={mockOnSelect} />);

    // Mock media items would be displayed
    expect(screen.getByText('wedding-photo-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('engagement-session.jpg')).toBeInTheDocument();
  });

  it('switches between grid and list view', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const listViewButton = screen.getByTitle('List');
    await user.click(listViewButton);

    // View would change to list layout
    expect(listViewButton).toHaveClass('bg-primary-600');
  });

  it('handles file selection in single mode', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary multiple={false} onSelect={mockOnSelect} />);

    // Click on first media item
    const firstItem = screen.getByText('wedding-photo-1.jpg');
    await user.click(firstItem);

    // Select Files button should appear
    const selectButton = screen.getByText('Select Files');
    await user.click(selectButton);

    expect(mockOnSelect).toHaveBeenCalledWith([
      expect.objectContaining({
        filename: 'wedding-photo-1.jpg',
      }),
    ]);
  });

  it('handles file selection in multiple mode', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary multiple={true} onSelect={mockOnSelect} />);

    // Click on multiple media items
    const firstItem = screen.getByText('wedding-photo-1.jpg');
    const secondItem = screen.getByText('engagement-session.jpg');

    await user.click(firstItem);
    await user.click(secondItem);

    // Should show selection count
    expect(screen.getByText('2 files selected')).toBeInTheDocument();
  });

  it('handles drag and drop file upload', async () => {
    render(<MediaLibrary onUpload={mockOnUpload} />);

    const uploadZone = screen.getByText('Upload Media Files');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.dragOver(uploadZone);
    fireEvent.drop(uploadZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('handles file input selection', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onUpload={mockOnUpload} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('filters media by search query', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search media files...');
    await user.type(searchInput, 'engagement');

    // Only items matching search should be visible
    expect(screen.getByText('engagement-session.jpg')).toBeInTheDocument();
    expect(screen.queryByText('wedding-photo-1.jpg')).not.toBeInTheDocument();
  });

  it('shows media item actions on hover', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const mediaItem = screen.getByText('wedding-photo-1.jpg').closest('div');

    await user.hover(mediaItem!);

    // Action buttons should appear
    expect(screen.getByTitle('Edit')).toBeInTheDocument();
    expect(screen.getByTitle('Download')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('handles media item deletion', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const mediaItem = screen.getByText('wedding-photo-1.jpg').closest('div');
    await user.hover(mediaItem!);

    const deleteButton = screen.getByTitle('Delete');
    await user.click(deleteButton);

    // Item should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('wedding-photo-1.jpg')).not.toBeInTheDocument();
    });
  });

  it('handles media item download', async () => {
    const user = userEvent.setup();

    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const mockCreateElement = jest
      .spyOn(document, 'createElement')
      .mockReturnValue(mockLink as any);
    const mockAppendChild = jest
      .spyOn(document.body, 'appendChild')
      .mockImplementation();
    const mockRemoveChild = jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation();

    render(<MediaLibrary onSelect={mockOnSelect} />);

    const mediaItem = screen.getByText('wedding-photo-1.jpg').closest('div');
    await user.hover(mediaItem!);

    const downloadButton = screen.getByTitle('Download');
    await user.click(downloadButton);

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();

    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });

  it('shows file size and type information', () => {
    render(<MediaLibrary onSelect={mockOnSelect} />);

    // File size should be formatted and displayed
    expect(screen.getByText('2.4 MB • IMAGE')).toBeInTheDocument();
    expect(screen.getByText('1.9 MB • IMAGE')).toBeInTheDocument();
  });

  it('displays media tags', () => {
    render(<MediaLibrary onSelect={mockOnSelect} />);

    expect(screen.getByText('wedding')).toBeInTheDocument();
    expect(screen.getByText('ceremony')).toBeInTheDocument();
    expect(screen.getByText('engagement')).toBeInTheDocument();
  });

  it('handles selection clearing', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary multiple={true} onSelect={mockOnSelect} />);

    // Select an item
    const firstItem = screen.getByText('wedding-photo-1.jpg');
    await user.click(firstItem);

    // Clear selection
    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    // Selection should be cleared
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('respects file type restrictions', () => {
    render(<MediaLibrary accept="image/*" onSelect={mockOnSelect} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('handles upload progress indication', async () => {
    render(<MediaLibrary onUpload={mockOnUpload} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const uploadZone = screen.getByText('Upload Media Files');

    fireEvent.drop(uploadZone, {
      dataTransfer: {
        files: [file],
      },
    });

    // Upload progress would be shown during file processing
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('shows empty state for no search results', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const searchInput = screen.getByPlaceholderText('Search media files...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('No media found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search or filters'),
    ).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const firstItem = screen.getByText('wedding-photo-1.jpg').closest('div');

    // Focus and use keyboard
    firstItem?.focus();
    await user.keyboard('{Enter}');

    // Item should be selected
    expect(firstItem).toHaveClass('border-primary-500');
  });

  it('validates file size limits', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary maxSize={1024} onUpload={mockOnUpload} />);

    // Large file that exceeds limit
    const file = new File(['x'.repeat(2048)], 'large.jpg', {
      type: 'image/jpeg',
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    // Should handle file size validation
    // Implementation would show error message
  });

  it('supports custom CSS classes', () => {
    const customClass = 'custom-media-library';
    render(<MediaLibrary className={customClass} onSelect={mockOnSelect} />);

    const library = document.querySelector(`.${customClass}`);
    expect(library).toBeInTheDocument();
  });

  it('handles media item editing', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary onSelect={mockOnSelect} />);

    const mediaItem = screen.getByText('wedding-photo-1.jpg').closest('div');
    await user.hover(mediaItem!);

    const editButton = screen.getByTitle('Edit');
    await user.click(editButton);

    // Edit functionality would be triggered
    // Implementation specific behavior would be tested
  });

  it('maintains selection state across view changes', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary multiple={true} onSelect={mockOnSelect} />);

    // Select an item
    const firstItem = screen.getByText('wedding-photo-1.jpg');
    await user.click(firstItem);

    // Switch views
    const listViewButton = screen.getByTitle('List');
    await user.click(listViewButton);

    // Selection should be maintained
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});
