import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentEditor } from '../ContentEditor';
import { ContentItem } from '@/types/cms';

// Mock ContentEditor component tests
// WS-223 Team A - Round 1

const mockContentItem: ContentItem = {
  id: '1',
  organization_id: 'org1',
  title: 'Test Content',
  body: { type: 'doc', content: [] },
  status: 'draft',
  type: 'welcome_message',
  media_urls: [],
  created_by: 'user1',
  created_at: '2025-01-30T10:00:00Z',
  updated_at: '2025-01-30T10:00:00Z',
  version: 1,
  is_template: false,
};

describe('ContentEditor', () => {
  const mockOnChange = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    render(<ContentEditor onChange={mockOnChange} />);

    expect(
      screen.getByText('Start writing your content...'),
    ).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Enter your wedding story...';
    render(
      <ContentEditor placeholder={customPlaceholder} onChange={mockOnChange} />,
    );

    expect(screen.getByText(customPlaceholder)).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    render(<ContentEditor onChange={mockOnChange} />);

    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Underline')).toBeInTheDocument();
    expect(screen.getByTitle('Insert Link')).toBeInTheDocument();
    expect(screen.getByTitle('Insert Image')).toBeInTheDocument();
  });

  it('shows word and character count', () => {
    render(<ContentEditor onChange={mockOnChange} />);

    expect(screen.getByText('0 words')).toBeInTheDocument();
    expect(screen.getByText('0 characters')).toBeInTheDocument();
  });

  it('calls onChange when content changes', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Hello world');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('opens link dialog when link button clicked', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const linkButton = screen.getByTitle('Insert Link');
    await user.click(linkButton);

    expect(screen.getByText('Insert Link')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('https://example.com'),
    ).toBeInTheDocument();
  });

  it('opens media library when image button clicked', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const imageButton = screen.getByTitle('Insert Image');
    await user.click(imageButton);

    expect(screen.getByText('Media Library')).toBeInTheDocument();
  });

  it('shows save button when content is dirty', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} onSave={mockOnSave} />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Some content');

    const saveButton = screen.getByText('Save Content');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onSave when save button clicked', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} onSave={mockOnSave} />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Some content');

    const saveButton = screen.getByText('Save Content');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('renders in read-only mode', () => {
    render(<ContentEditor readOnly onChange={mockOnChange} />);

    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('contentEditable', 'false');
  });

  it('loads initial content', () => {
    const initialContent = {
      type: 'doc',
      content: [{ type: 'text', text: 'Initial content' }],
    };
    render(
      <ContentEditor initialContent={initialContent} onChange={mockOnChange} />,
    );

    // Content would be rendered based on the initial content structure
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('disables toolbar in read-only mode', () => {
    render(<ContentEditor readOnly onChange={mockOnChange} />);

    const boldButton = screen.getByTitle('Bold');
    expect(boldButton).toBeDisabled();
  });

  it('supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const editor = screen.getByRole('textbox');
    await user.click(editor);

    // Test Ctrl+B for bold
    await user.keyboard('{Control>}b{/Control}');

    // Bold formatting would be applied (implementation dependent)
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('handles format selector changes', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const formatSelector = screen.getByDisplayValue('Paragraph');
    await user.selectOptions(formatSelector, 'heading1');

    expect(formatSelector).toHaveValue('heading1');
  });

  it('shows unsaved changes indicator', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Some changes');

    expect(screen.getByText('• Unsaved changes')).toBeInTheDocument();
  });

  it('inserts link with URL', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    // Open link dialog
    const linkButton = screen.getByTitle('Insert Link');
    await user.click(linkButton);

    // Enter URL
    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://test.com');

    // Insert link
    const insertButton = screen.getByText('Insert Link');
    await user.click(insertButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Insert Link')).not.toBeInTheDocument();
    });
  });

  it('validates required fields', () => {
    render(<ContentEditor onChange={mockOnChange} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Content');
    expect(saveButton).toBeDisabled();
  });

  it('applies custom CSS classes', () => {
    const customClass = 'custom-editor-class';
    render(<ContentEditor className={customClass} onChange={mockOnChange} />);

    const editor = document.querySelector(`.${customClass}`);
    expect(editor).toBeInTheDocument();
  });

  it('handles media insertion', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    // Open media library
    const mediaButton = screen.getByTitle('Insert Image');
    await user.click(mediaButton);

    // Media library modal should be open
    expect(screen.getByText('Media Library')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Media Library')).not.toBeInTheDocument();
    });
  });

  it('supports undo/redo functionality', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const undoButton = screen.getByTitle('Undo');
    const redoButton = screen.getByTitle('Redo');

    expect(undoButton).toBeInTheDocument();
    expect(redoButton).toBeInTheDocument();

    await user.click(undoButton);
    // Undo functionality would be implemented
  });

  it('handles alignment changes', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const alignCenterButton = screen.getByTitle('Align Center');
    await user.click(alignCenterButton);

    // Alignment would be applied to content
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('supports list formatting', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const bulletListButton = screen.getByTitle('Bullet List');
    const numberedListButton = screen.getByTitle('Numbered List');

    await user.click(bulletListButton);
    expect(mockOnChange).toHaveBeenCalled();

    await user.click(numberedListButton);
    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });

  it('handles quote and code blocks', async () => {
    const user = userEvent.setup();
    render(<ContentEditor onChange={mockOnChange} />);

    const quoteButton = screen.getByTitle('Quote');
    const codeButton = screen.getByTitle('Code');

    await user.click(quoteButton);
    expect(mockOnChange).toHaveBeenCalled();

    await user.click(codeButton);
    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });
});
