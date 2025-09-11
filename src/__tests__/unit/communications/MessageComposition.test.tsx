import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MessageComposition from '@/components/communications/MessageComposition';
import { MessageContent, PersonalizationToken } from '@/types/communications';

// Mock PersonalizationTokens component
jest.mock('@/components/communications/PersonalizationTokens', () => {
  return function MockPersonalizationTokens({ onTokenInsert }: any) {
    return (
      <div data-testid="personalization-tokens">
        <button onClick={() => onTokenInsert('{{guest_name}}')}>
          Insert Guest Name
        </button>
        <button onClick={() => onTokenInsert('{{wedding_date}}')}>
          Insert Wedding Date
      </div>
    );
  };
});
// Mock fetch for template loading
const mockFetch = jest.fn();
global.fetch = mockFetch;
// Mock rich text editor
const mockEditor = {
  getHTML: jest.fn().mockReturnValue('<p>Test HTML content</p>'),
  getText: jest.fn().mockReturnValue('Test HTML content'),
  commands: {
    setContent: jest.fn(),
    focus: jest.fn()
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn()
};
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor }: any) => (
    <div data-testid="rich-text-editor">
      {editor ? 'Rich Text Editor Active' : 'Editor Loading'}
    </div>
  )
}));
jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: jest.fn()
describe('MessageComposition', () => {
  const mockOnMessageChange = jest.fn();
  const mockOnTemplateSelect = jest.fn();
  const mockPersonalizationTokens: PersonalizationToken[] = [
    {
      token: '{{guest_name}}',
      display_name: 'Guest Name',
      description: 'The guest\'s full name',
      example_value: 'John Doe',
      required: true,
      type: 'text'
    },
      token: '{{wedding_date}}',
      display_name: 'Wedding Date',
      description: 'The couple\'s wedding date',
      example_value: 'June 15, 2024',
      required: false,
      type: 'date'
    }
  ];
  const defaultProps = {
    messageContent: {
      subject: '',
      html_content: '',
      text_content: ''
    personalizationTokens: mockPersonalizationTokens,
    selectedTemplateId: undefined,
    onMessageChange: mockOnMessageChange,
    onTemplateSelect: mockOnTemplateSelect
  const mockTemplates = [
      id: 'template-1',
      name: 'Wedding Reminder',
      category: 'reminder',
      subject: 'Reminder: {{couple_name}} Wedding on {{wedding_date}}',
      html_content: '<p>Dear {{guest_name}},</p><p>This is a reminder about our wedding!</p>',
      text_content: 'Dear {{guest_name}}, This is a reminder about our wedding!',
      preview_text: 'Wedding reminder template...',
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
      id: 'template-2',
      name: 'Thank You',
      category: 'thank-you',
      subject: 'Thank you from {{couple_name}}',
      html_content: '<p>Dear {{guest_name}},</p><p>Thank you for being part of our special day!</p>',
      text_content: 'Dear {{guest_name}}, Thank you for being part of our special day!',
      preview_text: 'Thank you template...',
      is_default: true,
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful template fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ templates: mockTemplates })
    });
  });
  afterEach(() => {
    jest.resetAllMocks();
  it('should render message composition form', () => {
    render(<MessageComposition {...defaultProps} />);
    expect(screen.getByText('Message Composition')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('personalization-tokens')).toBeInTheDocument();
  it('should handle subject input changes', async () => {
    const user = userEvent.setup();
    const subjectInput = screen.getByLabelText('Subject');
    await user.type(subjectInput, 'Test Subject');
    expect(mockOnMessageChange).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Test Subject'
      })
  it('should load templates on mount', async () => {
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/communications/templates');
  it('should display template options', async () => {
      expect(screen.getByText('Wedding Reminder')).toBeInTheDocument();
      expect(screen.getByText('Thank You')).toBeInTheDocument();
  it('should handle template selection', async () => {
    const templateOption = screen.getByText('Wedding Reminder');
    await user.click(templateOption);
    expect(mockOnTemplateSelect).toHaveBeenCalledWith('template-1');
  it('should populate form when template is selected', () => {
    const propsWithTemplate = {
      ...defaultProps,
      selectedTemplateId: 'template-1'
    };
    render(<MessageComposition {...propsWithTemplate} />);
    // Should populate subject from template
    const subjectInput = screen.getByLabelText('Subject') as HTMLInputElement;
    expect(subjectInput.value).toBe('Reminder: {{couple_name}} Wedding on {{wedding_date}}');
  it('should handle rich text editor content changes', async () => {
    // Mock editor content update
    mockEditor.getHTML.mockReturnValue('<p>New HTML content</p>');
    mockEditor.getText.mockReturnValue('New HTML content');
    // Simulate editor update by triggering the update callback
    const updateCallback = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1];
    if (updateCallback) {
      updateCallback();
        html_content: '<p>New HTML content</p>',
        text_content: 'New HTML content'
  it('should handle personalization token insertion', async () => {
    const insertTokenBtn = screen.getByText('Insert Guest Name');
    await user.click(insertTokenBtn);
    expect(mockEditor.commands.setContent).toHaveBeenCalledWith(
      expect.stringContaining('{{guest_name}}')
  it('should show template preview', async () => {
    const previewBtn = screen.getByText('Preview');
    await user.click(previewBtn);
    expect(screen.getByText('Template Preview')).toBeInTheDocument();
    expect(screen.getByText('Wedding reminder template...')).toBeInTheDocument();
  it('should handle template search', async () => {
    const searchInput = screen.getByPlaceholderText('Search templates...');
    await user.type(searchInput, 'reminder');
      expect(screen.queryByText('Thank You')).not.toBeInTheDocument();
  it('should filter templates by category', async () => {
    const categoryFilter = screen.getByDisplayValue('all');
    await user.selectOptions(categoryFilter, 'reminder');
  it('should validate required fields', async () => {
    // Try to submit without content
    const saveBtn = screen.getByText('Save Draft');
    await user.click(saveBtn);
    expect(screen.getByText('Subject is required')).toBeInTheDocument();
    expect(screen.getByText('Message content is required')).toBeInTheDocument();
  it('should save template as draft', async () => {
    const propsWithContent = {
      messageContent: {
        subject: 'Test Subject',
        html_content: '<p>Test content</p>',
        text_content: 'Test content'
      }
    mockFetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true, draft_id: 'draft-1' })
    render(<MessageComposition {...propsWithContent} />);
    expect(mockFetch).toHaveBeenCalledWith('/api/communications/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  it('should load saved drafts', async () => {
    const mockDrafts = [
      {
        id: 'draft-1',
        subject: 'Draft Subject',
        html_content: '<p>Draft content</p>',
        text_content: 'Draft content',
        created_at: '2024-01-01T00:00:00Z'
    ];
      json: jest.fn().mockResolvedValue({ drafts: mockDrafts })
    const draftsTab = screen.getByText('Drafts');
    await userEvent.click(draftsTab);
      expect(screen.getByText('Draft Subject')).toBeInTheDocument();
  it('should handle template loading errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
  it('should show character count for subject', async () => {
    await user.type(subjectInput, 'Test subject');
    expect(screen.getByText('12/200')).toBeInTheDocument();
  it('should warn about subject length limit', async () => {
    const longSubject = 'A'.repeat(190);
    await user.type(subjectInput, longSubject);
    expect(screen.getByText('190/200')).toBeInTheDocument();
    expect(screen.getByText('Subject is getting long')).toBeInTheDocument();
  it('should handle text-only mode toggle', async () => {
    const textOnlyToggle = screen.getByLabelText('Text-only mode');
    await user.click(textOnlyToggle);
    expect(screen.getByTestId('plain-text-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('rich-text-editor')).not.toBeInTheDocument();
  it('should validate HTML content length', () => {
    const propsWithLongContent = {
        subject: 'Test',
        html_content: 'A'.repeat(60000),
        text_content: 'Test'
    render(<MessageComposition {...propsWithLongContent} />);
    expect(screen.getByText('Message content is too long')).toBeInTheDocument();
  it('should handle personalization token validation', () => {
    const propsWithInvalidTokens = {
        subject: 'Test {{invalid_token}}',
        html_content: '<p>Hello {{guest_name}}!</p>',
        text_content: 'Hello {{guest_name}}!'
    render(<MessageComposition {...propsWithInvalidTokens} />);
    expect(screen.getByText('Unknown token: {{invalid_token}}')).toBeInTheDocument();
  it('should clear template selection', async () => {
    const clearBtn = screen.getByText('Clear Template');
    await user.click(clearBtn);
    expect(mockOnTemplateSelect).toHaveBeenCalledWith(undefined);
