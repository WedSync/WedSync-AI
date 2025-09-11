import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GuestCommunications from '@/components/communications/GuestCommunications';
import { Guest } from '@/types/communications';

// Mock all external dependencies
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/navigation');
const mockUseUser = jest.fn();
const mockUseGuests = jest.fn();
jest.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser()
}));
jest.mock('@/hooks/useGuests', () => ({
  useGuests: () => mockUseGuests()
// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;
// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  log: jest.spyOn(console, 'log').mockImplementation(() => {})
};
// Mock rich text editor
const mockEditor = {
  getHTML: jest.fn().mockReturnValue('<p>Hello {{guest_name}}! Looking forward to seeing you at our wedding on {{wedding_date}}!</p>'),
  getText: jest.fn().mockReturnValue('Hello {{guest_name}}! Looking forward to seeing you at our wedding on {{wedding_date}}!'),
  commands: {
    setContent: jest.fn(),
    focus: jest.fn()
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn()
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor }: any) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="editor-content"
        onChange={() => editor?.commands.setContent('Updated content')}
      />
    </div>
  )
jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: jest.fn()
describe('Guest Communications - Full Workflow Integration', () => {
  const mockUser = {
    id: 'user-123',
    couple_id: 'couple-123',
    email: 'user@example.com',
    name: 'Test User'
  };
  const mockGuests: Guest[] = [
    {
      id: 'guest-1',
      couple_id: 'couple-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      rsvp_status: 'pending',
      guest_category: 'family',
      wedding_side: 'partner1',
      has_plus_one: false,
      dietary_restrictions: [],
      age_group: 'adult',
      table_number: 1,
      tags: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
      id: 'guest-2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '+1234567891',
      rsvp_status: 'attending',
      guest_category: 'friends',
      wedding_side: 'partner2',
      has_plus_one: true,
      dietary_restrictions: ['vegetarian'],
      table_number: 2,
      tags: ['vip'],
      id: 'guest-3',
      first_name: 'Bob',
      last_name: 'Wilson',
      email: 'bob@example.com',
      phone: '+1234567892',
      rsvp_status: 'declined',
      guest_category: 'work',
      wedding_side: 'mutual',
      table_number: null,
    }
  ];
  const mockTemplates = [
      id: 'template-1',
      name: 'Wedding Invitation',
      category: 'invitation',
      subject: 'You\'re Invited! {{couple_name}} Wedding on {{wedding_date}}',
      html_content: '<p>Dear {{guest_name}},</p><p>We are excited to invite you to our wedding!</p><p>Date: {{wedding_date}}</p><p>Location: {{venue_name}}</p><p>We can\'t wait to celebrate with you!</p><p>Love,<br>{{couple_name}}</p>',
      text_content: 'Dear {{guest_name}}, We are excited to invite you to our wedding! Date: {{wedding_date}} Location: {{venue_name}} We can\'t wait to celebrate with you! Love, {{couple_name}}',
      preview_text: 'Wedding invitation template...',
      is_default: false,
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null
    });
    mockUseGuests.mockReturnValue({
      guests: mockGuests,
      error: null,
      refetch: jest.fn()
    // Setup default API responses
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/communications/templates') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates })
        });
      }
      
      if (url === '/api/guests/validate-ownership') {
          json: () => Promise.resolve({ 
            isValid: true, 
            invalidGuestIds: [] 
          })
      if (url === '/api/communications/send-bulk') {
            success: true,
            message_id: 'msg-123',
            delivery_stats: {
              total_recipients: 2,
              emails_sent: 2,
              sms_sent: 0,
              whatsapp_sent: 0,
              failed: 0
            }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
  });
  afterEach(() => {
    jest.resetAllMocks();
  it('should complete full messaging workflow successfully', async () => {
    const user = userEvent.setup();
    render(<GuestCommunications />);
    // Step 1: Guest Segmentation
    expect(screen.getByText('Step 1 of 5: Select Recipients')).toBeInTheDocument();
    expect(screen.getByText('3 total guests')).toBeInTheDocument();
    // Filter to attending guests only
    const rsvpFilter = screen.getByText('RSVP Status');
    await user.click(rsvpFilter);
    
    const attendingCheckbox = screen.getByLabelText('Attending');
    await user.click(attendingCheckbox);
    await waitFor(() => {
      expect(screen.getByText('1 total guests')).toBeInTheDocument();
    // Select the attending guest
    const guestCheckbox = screen.getByTestId('guest-checkbox-guest-2');
    await user.click(guestCheckbox);
    // Proceed to next step
    const nextBtn = screen.getByText('Next: Compose Message');
    await user.click(nextBtn);
    // Step 2: Message Composition
      expect(screen.getByText('Step 2 of 5: Compose Message')).toBeInTheDocument();
    // Select a template
      expect(screen.getByText('Wedding Invitation')).toBeInTheDocument();
    const templateCard = screen.getByText('Wedding Invitation');
    await user.click(templateCard);
    // Verify template loaded
    const subjectInput = screen.getByLabelText('Subject') as HTMLInputElement;
    expect(subjectInput.value).toContain('You\'re Invited!');
    // Customize the message
    await user.clear(subjectInput);
    await user.type(subjectInput, 'Custom Wedding Invitation - Save the Date!');
    // Proceed to delivery config
    const nextBtn2 = screen.getByText('Next: Configure Delivery');
    await user.click(nextBtn2);
    // Step 3: Bulk Send Configuration
      expect(screen.getByText('Step 3 of 5: Configure Delivery')).toBeInTheDocument();
    // Select delivery channels
    const emailChannel = screen.getByLabelText('Email');
    expect(emailChannel).toBeChecked(); // Should be default
    const smsChannel = screen.getByLabelText('SMS');
    await user.click(smsChannel);
    // Set to test mode
    const testModeToggle = screen.getByLabelText('Test mode');
    await user.click(testModeToggle);
    // Proceed to preview
    const nextBtn3 = screen.getByText('Next: Review & Send');
    await user.click(nextBtn3);
    // Step 4: Message Preview & Review
      expect(screen.getByText('Step 4 of 5: Review & Send')).toBeInTheDocument();
    // Verify preview shows correct information
    expect(screen.getByText('1 recipient selected')).toBeInTheDocument();
    expect(screen.getByText('Email, SMS')).toBeInTheDocument();
    expect(screen.getByText('Test mode enabled')).toBeInTheDocument();
    expect(screen.getByText('Custom Wedding Invitation - Save the Date!')).toBeInTheDocument();
    // Send the message
    const sendBtn = screen.getByText('Send Message');
    await user.click(sendBtn);
    // Step 5: Delivery Status
      expect(screen.getByText('Step 5 of 5: Delivery Status')).toBeInTheDocument();
    }, { timeout: 5000 });
    // Verify delivery success
    expect(screen.getByText('Message sent successfully!')).toBeInTheDocument();
    expect(screen.getByText('2 emails sent')).toBeInTheDocument();
    expect(screen.getByText('0 SMS sent')).toBeInTheDocument();
    // Verify API calls were made correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/guests/validate-ownership', 
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ 
          couple_id: 'couple-123', 
          guest_ids: ['guest-2'] 
        })
      })
    );
    expect(mockFetch).toHaveBeenCalledWith('/api/communications/send-bulk',
        body: expect.stringContaining('"couple_id":"couple-123"')
  it('should handle validation errors during workflow', async () => {
    // Mock validation failure
            isValid: false, 
            invalidGuestIds: ['guest-2'] 
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    // Navigate through workflow
    await user.type(screen.getByLabelText('Subject'), 'Test Subject');
    await user.click(screen.getByText('Next: Configure Delivery'));
    await user.click(screen.getByText('Next: Review & Send'));
    // Try to send - should fail validation
      expect(screen.getByText(/invalid guest ids/i)).toBeInTheDocument();
  it('should handle rate limiting during send', async () => {
    // Mock rate limit exceeded
          ok: false,
          status: 429,
            error: 'Rate limit exceeded. Please try again later.' 
          json: () => Promise.resolve({ isValid: true, invalidGuestIds: [] })
    // Complete workflow
    await user.click(screen.getByTestId('guest-checkbox-guest-1'));
    await user.click(screen.getByText('Next: Compose Message'));
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
  it('should handle personalization token replacement preview', async () => {
    // Navigate to message composition
    // Use template with tokens
    await user.click(screen.getByText('Wedding Invitation'));
    // Navigate to preview
    // Check that tokens are replaced in preview
      expect(screen.getByText('Dear John Doe,')).toBeInTheDocument();
  it('should handle scheduling messages for future delivery', async () => {
    // Navigate through steps
    await user.type(screen.getByLabelText('Subject'), 'Scheduled Message');
    // Schedule for later
    const scheduleToggle = screen.getByLabelText('Schedule for later');
    await user.click(scheduleToggle);
    // Set future date
    const futureDatetime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const datetimeInput = screen.getByLabelText('Schedule for');
    await user.clear(datetimeInput);
    await user.type(datetimeInput, futureDatetime);
    // Verify scheduling info in preview
    expect(screen.getByText(/scheduled for/i)).toBeInTheDocument();
    // Send scheduled message
    const sendBtn = screen.getByText('Schedule Message');
      expect(screen.getByText('Message scheduled successfully!')).toBeInTheDocument();
  it('should handle network errors gracefully', async () => {
    // Mock network error
    mockFetch.mockRejectedValue(new Error('Network connection failed'));
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
  it('should preserve state when navigating backwards', async () => {
    // Make selections in step 1
    await user.click(screen.getByTestId('guest-checkbox-guest-2'));
    // Make changes in step 2
    await user.type(screen.getByLabelText('Subject'), 'My Custom Subject');
    // Go back to step 1
    await user.click(screen.getByText('Previous'));
    // Verify selections preserved
    expect(screen.getByTestId('guest-checkbox-guest-1')).toBeChecked();
    expect(screen.getByTestId('guest-checkbox-guest-2')).toBeChecked();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    // Go forward and verify message preserved
    expect(subjectInput.value).toBe('My Custom Subject');
});
