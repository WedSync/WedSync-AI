import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import TagInput from '@/components/tags/TagInput'
import { Tag, TagColor, TagCategory } from '@/components/tags/TagManager'

// Mock fetch globally
global.fetch = jest.fn()
const mockTags: Tag[] = [
  {
    id: '1',
    name: 'luxury',
    description: 'High-end luxury wedding',
    color: 'purple' as TagColor,
    category: 'style' as TagCategory,
    usage_count: 15,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
    id: '2',
    name: 'destination',
    description: 'Destination wedding requiring travel',
    color: 'cyan' as TagColor,
    category: 'venue' as TagCategory,
    usage_count: 8,
    id: '3',
    name: 'outdoor',
    description: 'Wedding at outdoor venue',
    color: 'green' as TagColor,
    usage_count: 12,
  }
]
describe('TagInput', () => {
  const mockOnTagsChange = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tags: mockTags })
    })
  })
  it('renders with placeholder text', async () => {
    render(
      <TagInput
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
        placeholder="Search tags..."
      />
    )
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument()
  it('displays selected tags', async () => {
    const selectedTags = [mockTags[0]]
    
        selectedTags={selectedTags}
      expect(screen.getByTestId('selected-tag-luxury')).toBeInTheDocument()
      expect(screen.getByText('luxury')).toBeInTheDocument()
  it('opens dropdown when input is focused', async () => {
    const user = userEvent.setup()
    const input = await screen.findByTestId('tag-search-input')
    await user.click(input)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
  it('filters tags with fuzzy search', async () => {
    await user.type(input, 'lux') // Partial match for 'luxury'
      expect(screen.getByTestId('tag-option-luxury')).toBeInTheDocument()
      expect(screen.queryByTestId('tag-option-destination')).not.toBeInTheDocument()
  it('handles fuzzy search with typos', async () => {
    await user.type(input, 'luxry') // Typo in 'luxury'
  it('selects tag on click', async () => {
    await user.click(screen.getByTestId('tag-option-luxury'))
    expect(mockOnTagsChange).toHaveBeenCalledWith([mockTags[0]])
  it('navigates options with arrow keys', async () => {
    // First option should be highlighted by default
    expect(screen.getByTestId('tag-option-luxury')).toHaveAttribute('aria-selected', 'true')
    // Navigate down
    await user.keyboard('{ArrowDown}')
    expect(screen.getByTestId('tag-option-destination')).toHaveAttribute('aria-selected', 'true')
    // Navigate up
    await user.keyboard('{ArrowUp}')
  it('selects highlighted tag with Enter key', async () => {
    await user.keyboard('{Enter}')
  it('removes tag on click X button', async () => {
    const removeButton = screen.getByLabelText('Remove luxury tag')
    await user.click(removeButton)
    expect(mockOnTagsChange).toHaveBeenCalledWith([])
  it('removes last tag with Backspace when input is empty', async () => {
    const selectedTags = [mockTags[0], mockTags[1]]
    const input = screen.getByTestId('tag-search-input')
    await user.keyboard('{Backspace}')
  it('closes dropdown with Escape key', async () => {
    await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  it('respects max tags limit', async () => {
        maxTags={1}
    // Input should be disabled when max reached
    expect(input).toBeDisabled()
    // Should show max limit indicator
    expect(screen.getByText('1/1 tags selected')).toBeInTheDocument()
    expect(screen.getByText('Maximum reached')).toBeInTheDocument()
  it('filters out already selected tags', async () => {
      // Selected tag should not appear in dropdown
      expect(screen.queryByTestId('tag-option-luxury')).not.toBeInTheDocument()
      // Other tags should still appear
      expect(screen.getByTestId('tag-option-destination')).toBeInTheDocument()
      expect(screen.getByTestId('tag-option-outdoor')).toBeInTheDocument()
  it('handles API error gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
    await userEvent.click(input)
    // Should handle error without crashing
  it('shows loading state', async () => {
    // Mock a delayed response
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ tags: mockTags })
      }), 100))
    expect(screen.getByText('Loading tags...')).toBeInTheDocument()
      expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
  it('shows accessibility information correctly', async () => {
    // Check ARIA attributes
    expect(input).toHaveAttribute('role', 'combobox')
    expect(input).toHaveAttribute('aria-label', 'Search and select tags')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Tag suggestions')
  it('shows fuzzy search indicator when searching', async () => {
    await user.type(input, 'lux')
      expect(screen.getByText('Fuzzy search results for "lux"')).toBeInTheDocument()
})
