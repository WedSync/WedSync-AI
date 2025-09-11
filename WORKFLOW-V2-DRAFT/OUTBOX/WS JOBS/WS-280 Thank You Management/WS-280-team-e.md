# WS-280 Thank You Management - Team E Comprehensive Prompt
**Team E: QA/Testing Specialists**

## 🎯 Your Mission: Wedding Thank You System Never Fails Testing
You are the **QA/Testing specialists** responsible for ensuring the thank you management system never loses a gift record, handles bulk imports flawlessly, and works perfectly during the emotional post-wedding period. Your focus: **Comprehensive testing that covers gift photo capture, offline scenarios, multi-device sync, and the chaos of managing 200+ thank you notes while jet-lagged from honeymoon**.

## 💝 The Wedding Thank You Testing Reality
**Context**: Emma and James return from their two-week honeymoon to find 247 wedding gifts waiting, family members asking "have you sent my thank you yet?", and a mobile app that must work flawlessly while they're emotionally overwhelmed and physically exhausted. One lost gift record or failed delivery could damage family relationships forever. **Your testing must simulate every possible thank you management failure scenario**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/__tests__/thank-you/gift-management.test.tsx`** - Complete gift CRUD operations testing
2. **`/src/__tests__/thank-you/photo-capture-flow.test.ts`** - Mobile camera integration and photo processing
3. **`/src/__tests__/thank-you/offline-sync-scenarios.test.ts`** - Offline-first architecture testing
4. **`/src/__tests__/thank-you/bulk-operations.test.ts`** - Large dataset handling and performance testing
5. **`/src/__tests__/thank-you/delivery-integration.test.ts`** - Multi-channel delivery system testing

### 🔒 Testing Requirements:
- **99.9%+ Data Reliability**: No gift records lost during imports, syncs, or network interruptions
- **Mobile Camera Integration**: Photo capture works on all devices with automatic backup
- **Offline Resilience**: Complete functionality without network connection, perfect sync when reconnected
- **Bulk Processing Performance**: Handle 500+ gift imports without UI freezing or data corruption
- **Cross-Device Synchronization**: Real-time updates across couple's phones and family members
- **Delivery Verification**: 100% success rate for thank you note delivery across all channels

Your testing ensures wedding gratitude management is as reliable as the couple's vows.

## 🧪 Core Testing Scenarios

### Gift Management Testing (`/src/__tests__/thank-you/gift-management.test.tsx`)
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import userEvent from '@testing-library/user-event'
import { MobileThankYouManager } from '@/apps/wedme/components/thank-you/MobileThankYouManager'
import { createMockSupabaseClient } from '@/test-utils/supabase-mock'
import { setupTestDatabase } from '@/test-utils/database-setup'

describe('Gift Management System', () => {
  let mockSupabase: any
  let testData: any

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    testData = await setupTestDatabase({
      organization: {
        id: 'org-123',
        name: 'Test Wedding Business'
      },
      wedding: {
        id: 'wedding-123',
        couple_names: 'Emma & James',
        wedding_date: '2024-06-15'
      },
      gifts: [
        {
          id: 'gift-1',
          gift_description: 'Crystal wine glasses set',
          primary_giver_name: 'Sarah Johnson',
          giver_email: 'sarah@example.com',
          gift_value: 85.00,
          gift_category: 'household',
          thank_you_status: 'pending'
        },
        {
          id: 'gift-2',
          gift_description: 'Wedding photo frame',
          primary_giver_name: 'Mike & Lisa Brown',
          gift_value: 45.00,
          gift_category: 'decorative',
          thank_you_status: 'written'
        }
      ]
    })
  })

  afterEach(async () => {
    await testData.cleanup()
    jest.clearAllMocks()
  })

  describe('Gift CRUD Operations', () => {
    it('should create new gift with all required fields', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
      })

      // Open gift creation flow
      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      // Fill in gift details
      const descriptionInput = screen.getByPlaceholderText('e.g., Crystal wine glasses set')
      await user.type(descriptionInput, 'Hand-carved wooden cutting board')

      const giverNameInput = screen.getByPlaceholderText('e.g., Sarah & Mike Johnson')
      await user.type(giverNameInput, 'Aunt Martha')

      const valueInput = screen.getByPlaceholderText('50')
      await user.type(valueInput, '75')

      const categorySelect = screen.getByRole('combobox', { name: /category/i })
      await user.selectOptions(categorySelect, 'household')

      const emailInput = screen.getByPlaceholderText('sarah@example.com')
      await user.type(emailInput, 'martha@family.com')

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save gift/i })
      await user.click(saveButton)

      // Verify gift was created
      await waitFor(() => {
        expect(screen.getByText('Hand-carved wooden cutting board')).toBeInTheDocument()
        expect(screen.getByText('From Aunt Martha')).toBeInTheDocument()
      })

      // Verify database call was made
      expect(mockSupabase.from).toHaveBeenCalledWith('thank_you_gifts')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          gift_description: 'Hand-carved wooden cutting board',
          primary_giver_name: 'Aunt Martha',
          giver_email: 'martha@family.com',
          gift_value: 75,
          gift_category: 'household'
        })
      )
    })

    it('should validate required fields before submission', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Open gift creation
      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      // Try to submit without required fields
      const saveButton = screen.getByRole('button', { name: /save gift/i })
      expect(saveButton).toBeDisabled()

      // Fill only description
      const descriptionInput = screen.getByPlaceholderText('e.g., Crystal wine glasses set')
      await user.type(descriptionInput, 'Test gift')
      
      expect(saveButton).toBeDisabled()

      // Fill giver name - should enable save
      const giverNameInput = screen.getByPlaceholderText('e.g., Sarah & Mike Johnson')
      await user.type(giverNameInput, 'Test Giver')

      expect(saveButton).toBeEnabled()
    })

    it('should handle gift editing with optimistic updates', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Crystal wine glasses set')).toBeInTheDocument()
      })

      // Click on existing gift to edit
      const giftItem = screen.getByTestId('gift-item-gift-1')
      await user.click(giftItem)

      // Edit description
      const editButton = screen.getByTestId('edit-gift-button')
      await user.click(editButton)

      const descriptionInput = screen.getByDisplayValue('Crystal wine glasses set')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Crystal wine glasses set (6 pieces)')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Should show updated value immediately (optimistic update)
      await waitFor(() => {
        expect(screen.getByText('Crystal wine glasses set (6 pieces)')).toBeInTheDocument()
      })

      // Verify database update was called
      expect(mockSupabase.from).toHaveBeenCalledWith('thank_you_gifts')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          gift_description: 'Crystal wine glasses set (6 pieces)'
        })
      )
    })

    it('should handle gift deletion with confirmation', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Crystal wine glasses set')).toBeInTheDocument()
      })

      // Long press on gift item for context menu
      const giftItem = screen.getByTestId('gift-item-gift-1')
      fireEvent.contextMenu(giftItem)

      // Click delete
      const deleteButton = screen.getByTestId('delete-gift-button')
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /yes, delete/i })
      await user.click(confirmButton)

      // Gift should be removed from UI
      await waitFor(() => {
        expect(screen.queryByText('Crystal wine glasses set')).not.toBeInTheDocument()
      })

      // Verify database deletion
      expect(mockSupabase.from).toHaveBeenCalledWith('thank_you_gifts')
      expect(mockSupabase.delete).toHaveBeenCalled()
    })

    it('should recover gracefully from database errors', async () => {
      const user = userEvent.setup()
      
      // Mock database error
      mockSupabase.insert.mockRejectedValueOnce(new Error('Database connection failed'))
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Try to create gift
      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      const descriptionInput = screen.getByPlaceholderText('e.g., Crystal wine glasses set')
      await user.type(descriptionInput, 'Test gift')

      const giverNameInput = screen.getByPlaceholderText('e.g., Sarah & Mike Johnson')
      await user.type(giverNameInput, 'Test Giver')

      const saveButton = screen.getByRole('button', { name: /save gift/i })
      await user.click(saveButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/failed to save gift/i)).toBeInTheDocument()
      })

      // Should offer retry option
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toBeInTheDocument()

      // Mock successful retry
      mockSupabase.insert.mockResolvedValueOnce({ data: { id: 'gift-new' } })
      
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByText('Test gift')).toBeInTheDocument()
      })
    })
  })

  describe('Data Integrity and Consistency', () => {
    it('should prevent duplicate gift creation', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Create first gift
      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Duplicate Gift')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Same Giver')
      
      await user.click(screen.getByRole('button', { name: /save gift/i }))

      // Wait for first gift to be saved
      await waitFor(() => {
        expect(screen.getByText('Duplicate Gift')).toBeInTheDocument()
      })

      // Try to create identical gift
      await user.click(addGiftButton)
      
      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Duplicate Gift')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Same Giver')
      
      await user.click(screen.getByRole('button', { name: /save gift/i }))

      // Should show duplicate warning
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/similar gift already exists/i)).toBeInTheDocument()
      })

      // Should allow override or cancellation
      expect(screen.getByRole('button', { name: /add anyway/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should maintain referential integrity when deleting gifts with thank you notes', async () => {
      const user = userEvent.setup()

      // Set up test data with gift that has associated note
      testData.thankYouNotes = [
        {
          id: 'note-1',
          gift_id: 'gift-1',
          note_content: 'Thank you for the lovely glasses!',
          status: 'written'
        }
      ]
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Try to delete gift with associated note
      const giftItem = screen.getByTestId('gift-item-gift-1')
      fireEvent.contextMenu(giftItem)

      const deleteButton = screen.getByTestId('delete-gift-button')
      await user.click(deleteButton)

      // Should show warning about associated thank you note
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/this gift has a thank you note/i)).toBeInTheDocument()
      })

      // Should offer to delete both or cancel
      expect(screen.getByRole('button', { name: /delete both/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should handle concurrent edits gracefully', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Crystal wine glasses set')).toBeInTheDocument()
      })

      // Simulate external update while user is editing
      const giftItem = screen.getByTestId('gift-item-gift-1')
      await user.click(giftItem)

      const editButton = screen.getByTestId('edit-gift-button')
      await user.click(editButton)

      // While user is typing, simulate external update
      const descriptionInput = screen.getByDisplayValue('Crystal wine glasses set')
      await user.clear(descriptionInput)
      
      // Simulate realtime update from another device
      act(() => {
        // Trigger realtime update
        testData.triggerRealtimeUpdate('UPDATE', {
          id: 'gift-1',
          gift_description: 'Crystal wine glasses (updated by spouse)'
        })
      })

      await user.type(descriptionInput, 'Crystal wine glasses set (my edit)')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Should detect conflict and show resolution dialog
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/conflict detected/i)).toBeInTheDocument()
      })

      // Should show both versions for user to choose
      expect(screen.getByText('Crystal wine glasses (updated by spouse)')).toBeInTheDocument()
      expect(screen.getByText('Crystal wine glasses set (my edit)')).toBeInTheDocument()
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large gift lists without performance degradation', async () => {
      // Generate large test dataset
      const largeGiftList = Array.from({ length: 500 }, (_, i) => ({
        id: `gift-${i}`,
        gift_description: `Wedding Gift #${i}`,
        primary_giver_name: `Giver ${i}`,
        gift_value: Math.floor(Math.random() * 200) + 20,
        gift_category: ['household', 'decorative', 'experience', 'money'][i % 4],
        thank_you_status: ['pending', 'written', 'sent', 'delivered'][i % 4]
      }))

      testData.gifts = largeGiftList

      const startTime = Date.now()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Component should render within reasonable time
      await waitFor(() => {
        expect(screen.getByTestId('gifts-list')).toBeInTheDocument()
      }, { timeout: 5000 })

      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(2000) // Should render in under 2 seconds

      // Scrolling should be smooth
      const giftsList = screen.getByTestId('gifts-list')
      
      const scrollStart = Date.now()
      fireEvent.scroll(giftsList, { target: { scrollTop: 1000 } })
      
      // Should respond to scroll within 100ms
      await waitFor(() => {
        expect(giftsList.scrollTop).toBeGreaterThan(0)
      }, { timeout: 100 })
    })

    it('should implement virtual scrolling for large lists', async () => {
      const largeGiftList = Array.from({ length: 1000 }, (_, i) => ({
        id: `gift-${i}`,
        gift_description: `Wedding Gift #${i}`,
        primary_giver_name: `Giver ${i}`
      }))

      testData.gifts = largeGiftList

      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('gifts-list')).toBeInTheDocument()
      })

      // Only visible items should be in DOM (virtual scrolling)
      const visibleGifts = screen.getAllByTestId(/gift-item-/)
      expect(visibleGifts.length).toBeLessThan(100) // Should render only visible items

      // But total count should be accurate
      expect(screen.getByText('1000 gifts')).toBeInTheDocument()
    })

    it('should debounce search input to prevent excessive API calls', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      const searchInput = screen.getByPlaceholderText('Search gifts or givers...')

      // Type rapidly
      await user.type(searchInput, 'search term')

      // Should not make API call for each keystroke
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300))

      // Only one search API call should be made
      expect(mockSupabase.from).toHaveBeenCalledTimes(1) // Initial load only
      
      // Search should be handled client-side for better UX
      expect(screen.getByText('No gifts found')).toBeInTheDocument()
    })
  })

  describe('Error Scenarios and Recovery', () => {
    it('should handle network disconnection gracefully', async () => {
      const user = userEvent.setup()
      
      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('All caught up')).toBeInTheDocument()
      })

      // Simulate network disconnection
      act(() => {
        window.dispatchEvent(new Event('offline'))
      })

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText('Offline - changes saved locally')).toBeInTheDocument()
      })

      // Should still allow gift creation
      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Offline Gift')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Offline Giver')
      
      await user.click(screen.getByRole('button', { name: /save gift/i }))

      // Gift should appear in UI immediately
      await waitFor(() => {
        expect(screen.getByText('Offline Gift')).toBeInTheDocument()
      })

      // Should show pending sync indicator
      expect(screen.getByTestId('pending-sync-indicator')).toBeInTheDocument()

      // Simulate network reconnection
      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      // Should sync automatically
      await waitFor(() => {
        expect(screen.getByText('All caught up')).toBeInTheDocument()
        expect(screen.queryByTestId('pending-sync-indicator')).not.toBeInTheDocument()
      })
    })

    it('should handle photo upload failures with retry mechanism', async () => {
      const user = userEvent.setup()
      
      // Mock photo upload failure
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Upload failed'))

      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      // Simulate photo capture flow
      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      // Mock camera capture
      const captureButton = screen.getByTestId('camera-capture-button')
      await user.click(captureButton)

      // Fill form with photo
      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Gift with photo')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Photo Giver')
      
      const saveButton = screen.getByRole('button', { name: /save gift/i })
      await user.click(saveButton)

      // Should show upload error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/photo upload failed/i)).toBeInTheDocument()
      })

      // Should offer retry with different options
      expect(screen.getByRole('button', { name: /retry upload/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save without photo/i })).toBeInTheDocument()

      // Mock successful retry
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://example.com/photo.jpg' })
      })

      const retryButton = screen.getByRole('button', { name: /retry upload/i })
      await user.click(retryButton)

      // Should succeed and show gift with photo
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByText('Gift with photo')).toBeInTheDocument()
        expect(screen.getByTestId('gift-photo')).toBeInTheDocument()
      })
    })

    it('should handle database constraint violations gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock constraint violation (duplicate entry)
      mockSupabase.insert.mockRejectedValueOnce({
        code: '23505', // Unique constraint violation
        message: 'duplicate key value violates unique constraint'
      })

      render(
        <MobileThankYouManager
          weddingId="wedding-123"
          coupleId="couple-123"
          organizationId="org-123"
        />
      )

      const addGiftButton = screen.getByTestId('add-gift-button')
      await user.click(addGiftButton)

      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Duplicate Gift')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Duplicate Giver')
      
      await user.click(screen.getByRole('button', { name: /save gift/i }))

      // Should show user-friendly error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/similar gift may already exist/i)).toBeInTheDocument()
      })

      // Should offer helpful actions
      expect(screen.getByRole('button', { name: /view existing gifts/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try different name/i })).toBeInTheDocument()
    })
  })
})

// Mobile-specific testing utilities
export class MobileTouchSimulator {
  static async longPress(element: HTMLElement, duration: number = 500) {
    fireEvent.touchStart(element, {
      touches: [{ clientX: 0, clientY: 0 }]
    })
    
    await new Promise(resolve => setTimeout(resolve, duration))
    
    fireEvent.touchEnd(element, {
      touches: []
    })
  }

  static async swipeLeft(element: HTMLElement, distance: number = 100) {
    fireEvent.touchStart(element, {
      touches: [{ clientX: distance, clientY: 0 }]
    })
    
    fireEvent.touchMove(element, {
      touches: [{ clientX: 0, clientY: 0 }]
    })
    
    fireEvent.touchEnd(element, {
      touches: []
    })
  }

  static async swipeRight(element: HTMLElement, distance: number = 100) {
    fireEvent.touchStart(element, {
      touches: [{ clientX: 0, clientY: 0 }]
    })
    
    fireEvent.touchMove(element, {
      touches: [{ clientX: distance, clientY: 0 }]
    })
    
    fireEvent.touchEnd(element, {
      touches: []
    })
  }

  static async pinchToZoom(element: HTMLElement, scale: number = 2) {
    fireEvent.touchStart(element, {
      touches: [
        { clientX: 50, clientY: 50 },
        { clientX: 150, clientY: 150 }
      ]
    })
    
    fireEvent.touchMove(element, {
      touches: [
        { clientX: 50 / scale, clientY: 50 / scale },
        { clientX: 150 * scale, clientY: 150 * scale }
      ]
    })
    
    fireEvent.touchEnd(element, {
      touches: []
    })
  }
}
```

### Photo Capture and Processing Tests (`/src/__tests__/thank-you/photo-capture-flow.test.ts`)
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import { GiftPhotoCaptureFlow } from '@/apps/wedme/components/thank-you/GiftPhotoCaptureFlow'

// Mock browser APIs
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn()
}

const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
}

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices
})

Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: mockGeolocation
})

// Mock canvas and image processing
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn()
  })),
  toBlob: jest.fn(),
  width: 1920,
  height: 1080
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext
})

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: mockCanvas.toBlob
})

describe('Gift Photo Capture Flow', () => {
  let mockStream: MediaStream
  let mockTrack: MediaStreamTrack

  beforeEach(() => {
    // Mock media stream
    mockTrack = {
      kind: 'video',
      stop: jest.fn(),
      getSettings: jest.fn(() => ({
        width: 1920,
        height: 1080,
        facingMode: 'environment'
      }))
    } as any

    mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
      getAudioTracks: () => []
    } as MediaStream

    mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' }
    ])

    // Mock geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10
        }
      })
    })

    // Mock successful photo upload
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://example.com/photo.jpg' })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Camera Access and Initialization', () => {
    it('should request camera access on mount', async () => {
      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })
      })
    })

    it('should handle camera access denial gracefully', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      
      mockMediaDevices.getUserMedia.mockRejectedValue(permissionError)

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      // Should fall back to file upload
      await waitFor(() => {
        expect(screen.getByText(/camera access denied/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /choose from gallery/i })).toBeInTheDocument()
      })
    })

    it('should switch between front and back cameras', async () => {
      const user = userEvent.setup()
      
      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      })

      // Click camera flip button
      const flipButton = screen.getByTestId('flip-camera-button')
      await user.click(flipButton)

      // Should request new stream with different facing mode
      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'user', // Should switch to front camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })
      })

      // Should stop previous stream
      expect(mockTrack.stop).toHaveBeenCalled()
    })

    it('should handle no camera devices gracefully', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([])
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('No camera found'))

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/no camera available/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /upload from gallery/i })).toBeInTheDocument()
      })
    })
  })

  describe('Photo Capture Process', () => {
    it('should capture photo with metadata', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' })
      
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(mockBlob)
      })

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      })

      // Capture photo
      const captureButton = screen.getByTestId('capture-button')
      await user.click(captureButton)

      await waitFor(() => {
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          'image/jpeg',
          0.8
        )
      })

      // Should advance to preview step
      expect(screen.getByText('Review Photo')).toBeInTheDocument()
      
      // Should capture location metadata
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
    })

    it('should handle high-resolution capture correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      })

      // Simulate high-res video
      const mockVideo = screen.getByTestId('camera-video') as HTMLVideoElement
      Object.defineProperty(mockVideo, 'videoWidth', { value: 4032 })
      Object.defineProperty(mockVideo, 'videoHeight', { value: 3024 })

      const captureButton = screen.getByTestId('capture-button')
      await user.click(captureButton)

      await waitFor(() => {
        // Canvas should be sized to match video resolution
        expect(mockCanvas.width).toBe(4032)
        expect(mockCanvas.height).toBe(3024)
      })
    })

    it('should compress large images appropriately', async () => {
      const user = userEvent.setup()
      const largeMockBlob = new Blob([new ArrayBuffer(5 * 1024 * 1024)], { type: 'image/jpeg' }) // 5MB
      
      mockCanvas.toBlob.mockImplementation((callback, type, quality) => {
        // Simulate compression based on quality
        const compressedSize = quality ? largeMockBlob.size * quality : largeMockBlob.size
        const compressedBlob = new Blob([new ArrayBuffer(compressedSize)], { type: 'image/jpeg' })
        callback(compressedBlob)
      })

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      })

      const captureButton = screen.getByTestId('capture-button')
      await user.click(captureButton)

      await waitFor(() => {
        // Should use appropriate compression quality
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          'image/jpeg',
          0.8 // Quality setting for compression
        )
      })
    })
  })

  describe('Gallery Upload Integration', () => {
    it('should handle file selection from gallery', async () => {
      const user = userEvent.setup()
      
      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('upload-from-gallery-button')).toBeInTheDocument()
      })

      // Click gallery upload button
      const galleryButton = screen.getByTestId('upload-from-gallery-button')
      await user.click(galleryButton)

      // Should trigger file input
      const fileInput = screen.getByTestId('file-input')
      expect(fileInput).toBeInTheDocument()

      // Simulate file selection
      const file = new File(['fake-image'], 'wedding-gift.jpg', { type: 'image/jpeg' })
      
      await user.upload(fileInput, file)

      // Should advance to preview with uploaded image
      await waitFor(() => {
        expect(screen.getByText('Review Photo')).toBeInTheDocument()
        expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('blob:'))
      })
    })

    it('should validate file type and size', async () => {
      const user = userEvent.setup()
      
      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      const galleryButton = screen.getByTestId('upload-from-gallery-button')
      await user.click(galleryButton)

      const fileInput = screen.getByTestId('file-input')

      // Test invalid file type
      const invalidFile = new File(['fake-video'], 'video.mp4', { type: 'video/mp4' })
      await user.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/please select an image file/i)).toBeInTheDocument()
      })

      // Test oversized file
      const oversizedFile = new File([new ArrayBuffer(20 * 1024 * 1024)], 'huge-image.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, oversizedFile)

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument()
      })
    })

    it('should preserve EXIF data when available', async () => {
      const user = userEvent.setup()
      
      // Mock EXIF data extraction
      const mockEXIF = {
        DateTime: '2024:06:15 14:30:00',
        GPS: {
          GPSLatitude: [51, 30, 26.64],
          GPSLongitude: [0, 7, 39.96]
        }
      }

      // Mock EXIF.js
      global.EXIF = {
        getData: jest.fn((file, callback) => callback()),
        getTag: jest.fn((file, tag) => mockEXIF[tag]),
        getAllTags: jest.fn(() => mockEXIF)
      }

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      const galleryButton = screen.getByTestId('upload-from-gallery-button')
      await user.click(galleryButton)

      const fileInput = screen.getByTestId('file-input')
      const file = new File(['fake-image-with-exif'], 'photo.jpg', { type: 'image/jpeg' })
      
      await user.upload(fileInput, file)

      // Should extract and use EXIF data
      await waitFor(() => {
        expect(global.EXIF.getData).toHaveBeenCalled()
      })

      // Continue to details step to see if metadata is preserved
      const usePhotoButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(usePhotoButton)

      // Date should be auto-filled from EXIF
      const dateInput = screen.getByLabelText(/date received/i) as HTMLInputElement
      expect(dateInput.value).toBe('2024-06-15')
    })
  })

  describe('AI-Powered Text Extraction', () => {
    it('should extract text from gift cards and receipts', async () => {
      const user = userEvent.setup()
      
      // Mock OCR API response
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            text: 'Wedding Gift\n$75.00\nFrom: Sarah & Mike\nThank you for celebrating with us!'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://example.com/photo.jpg' })
        })

      const mockOnGiftAdded = jest.fn()

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={mockOnGiftAdded}
          organizationId="org-123"
        />
      )

      // Simulate photo capture
      const captureButton = screen.getByTestId('capture-button')
      await user.click(captureButton)

      const usePhotoButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(usePhotoButton)

      // Fill minimum required fields
      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Gift card holder')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Sarah & Mike')

      const saveButton = screen.getByRole('button', { name: /save gift/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/ai/extract-text', {
          method: 'POST',
          body: expect.any(FormData)
        })
      })

      // Should auto-fill extracted information
      await waitFor(() => {
        expect(mockOnGiftAdded).toHaveBeenCalledWith(
          expect.objectContaining({
            extractedText: 'Wedding Gift\n$75.00\nFrom: Sarah & Mike\nThank you for celebrating with us!'
          })
        )
      })
    })

    it('should handle OCR service failures gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock OCR API failure
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('OCR service unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://example.com/photo.jpg' })
        })

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      const captureButton = screen.getByTestId('capture-button')
      await user.click(captureButton)

      const usePhotoButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(usePhotoButton)

      await user.type(screen.getByPlaceholderText('e.g., Crystal wine glasses set'), 'Gift without OCR')
      await user.type(screen.getByPlaceholderText('e.g., Sarah & Mike Johnson'), 'Test Giver')

      const saveButton = screen.getByRole('button', { name: /save gift/i })
      await user.click(saveButton)

      // Should complete successfully without OCR
      await waitFor(() => {
        expect(screen.getByText('Processing Gift')).toBeInTheDocument()
      })

      // Should not prevent gift creation
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Mobile UX and Accessibility', () => {
    it('should handle device orientation changes', async () => {
      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      })

      // Simulate orientation change
      act(() => {
        Object.defineProperty(window.screen, 'orientation', {
          value: { angle: 90, type: 'landscape-primary' }
        })
        window.dispatchEvent(new Event('orientationchange'))
      })

      // Camera should adapt to new orientation
      await waitFor(() => {
        const cameraContainer = screen.getByTestId('camera-container')
        expect(cameraContainer).toHaveClass('landscape-mode')
      })
    })

    it('should provide proper focus management for accessibility', async () => {
      const user = userEvent.setup()

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      // Capture button should be focusable
      const captureButton = screen.getByTestId('capture-button')
      expect(captureButton).toHaveAttribute('tabindex', '0')

      await user.tab()
      expect(captureButton).toHaveFocus()

      // Should handle keyboard navigation
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Review Photo')).toBeInTheDocument()
      })

      // Focus should move to next step controls
      const usePhotoButton = screen.getByRole('button', { name: /use this photo/i })
      expect(usePhotoButton).toHaveFocus()
    })

    it('should support screen reader announcements', async () => {
      const user = userEvent.setup()

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /camera view/i })).toBeInTheDocument()
      })

      const captureButton = screen.getByTestId('capture-button')
      await user.click(captureButton)

      // Should announce step changes
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/photo captured successfully/i)
      })

      const usePhotoButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(usePhotoButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/now entering gift details/i)
      })
    })

    it('should handle low battery scenarios', async () => {
      // Mock battery API
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.15, // 15% battery
          charging: false
        })
      })

      render(
        <GiftPhotoCaptureFlow
          onClose={() => {}}
          onGiftAdded={() => {}}
          organizationId="org-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/low battery detected/i)).toBeInTheDocument()
      })

      // Should suggest battery-saving options
      expect(screen.getByText(/consider uploading from gallery to save battery/i)).toBeInTheDocument()
    })
  })
})
```

### Offline Sync and Data Integrity Tests (`/src/__tests__/thank-you/offline-sync-scenarios.test.ts`)
```typescript
import { renderHook, act } from '@testing-library/react'
import { useMobileThankYouSync } from '@/apps/wedme/hooks/useMobileThankYouSync'
import { createMockSupabaseClient } from '@/test-utils/supabase-mock'

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string) => { mockLocalStorage.store[key] = value }),
  removeItem: jest.fn((key: string) => { delete mockLocalStorage.store[key] }),
  clear: jest.fn(() => { mockLocalStorage.store = {} })
}

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock network state
const mockNetworkState = {
  isOnline: true,
  connectionType: 'wifi' as const
}

jest.mock('@/apps/wedme/hooks/useNetworkState', () => ({
  useNetworkState: () => mockNetworkState
}))

// Mock service worker
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: {
      register: jest.fn()
    }
  })
}

Object.defineProperty(navigator, 'serviceWorker', { value: mockServiceWorker })

describe('Offline Sync Scenarios', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockLocalStorage.clear()
    mockNetworkState.isOnline = true
    jest.clearAllMocks()
  })

  describe('Offline Data Persistence', () => {
    it('should save gifts to localStorage when offline', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        // Simulate going offline
        mockNetworkState.isOnline = false
        
        // Add gift while offline
        await result.current.addGift({
          description: 'Offline Gift',
          giverName: 'Offline Giver',
          value: 50,
          category: 'household'
        })
      })

      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'gifts_org-123_wedding-123',
        expect.stringContaining('Offline Gift')
      )

      // Should not call Supabase while offline
      expect(mockSupabase.from).not.toHaveBeenCalled()

      // Should show pending sync status
      expect(result.current.syncStatus).toBe('offline')
      expect(result.current.pendingChanges).toBe(1)
    })

    it('should load from localStorage on initialization when offline', async () => {
      // Pre-populate localStorage with offline data
      const offlineGifts = [
        {
          id: 'temp-1',
          description: 'Cached Gift 1',
          giverName: 'Cached Giver 1',
          thankYouStatus: 'pending'
        },
        {
          id: 'temp-2',
          description: 'Cached Gift 2',
          giverName: 'Cached Giver 2',
          thankYouStatus: 'written'
        }
      ]

      mockLocalStorage.store['gifts_org-123_wedding-123'] = JSON.stringify(offlineGifts)
      mockNetworkState.isOnline = false

      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should load cached data
      expect(result.current.gifts).toHaveLength(2)
      expect(result.current.gifts[0].description).toBe('Cached Gift 1')
      expect(result.current.progress.totalGifts).toBe(2)
    })

    it('should maintain data integrity during rapid offline changes', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false

        // Rapid succession of changes
        await Promise.all([
          result.current.addGift({ description: 'Gift 1', giverName: 'Giver 1' }),
          result.current.addGift({ description: 'Gift 2', giverName: 'Giver 2' }),
          result.current.addGift({ description: 'Gift 3', giverName: 'Giver 3' })
        ])
      })

      // All gifts should be saved locally
      expect(result.current.gifts).toHaveLength(3)
      expect(result.current.pendingChanges).toBe(3)

      // Verify localStorage contains all changes
      const storedGifts = JSON.parse(mockLocalStorage.store['gifts_org-123_wedding-123'] || '[]')
      expect(storedGifts).toHaveLength(3)
    })
  })

  describe('Online Sync Process', () => {
    it('should sync offline changes when coming back online', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        // Start offline
        mockNetworkState.isOnline = false
        
        // Make offline changes
        await result.current.addGift({
          description: 'Offline Gift 1',
          giverName: 'Offline Giver 1'
        })
        
        await result.current.addGift({
          description: 'Offline Gift 2',
          giverName: 'Offline Giver 2'
        })
      })

      expect(result.current.pendingChanges).toBe(2)

      // Mock successful server responses
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: [
            { id: 'server-1', gift_description: 'Offline Gift 1' },
            { id: 'server-2', gift_description: 'Offline Gift 2' }
          ]
        }),
        select: jest.fn().mockReturnThis()
      })

      await act(async () => {
        // Come back online
        mockNetworkState.isOnline = true
        
        // Trigger sync
        await result.current.syncOfflineChanges()
      })

      // Should sync all changes
      expect(result.current.pendingChanges).toBe(0)
      expect(result.current.syncStatus).toBe('online')

      // Should replace temp IDs with server IDs
      expect(result.current.gifts.some(g => g.id === 'server-1')).toBe(true)
      expect(result.current.gifts.some(g => g.id === 'server-2')).toBe(true)
    })

    it('should handle partial sync failures gracefully', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false
        
        await result.current.addGift({
          description: 'Success Gift',
          giverName: 'Success Giver'
        })
        
        await result.current.addGift({
          description: 'Fail Gift',
          giverName: 'Fail Giver'
        })
      })

      // Mock partial success
      let callCount = 0
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({ data: [{ id: 'success-1' }] })
          } else {
            return Promise.reject(new Error('Server error'))
          }
        }),
        select: jest.fn().mockReturnThis()
      })

      await act(async () => {
        mockNetworkState.isOnline = true
        await result.current.syncOfflineChanges()
      })

      // Should partially sync and retain failed items for retry
      expect(result.current.pendingChanges).toBe(1)
      expect(result.current.gifts.some(g => g.id === 'success-1')).toBe(true)
      expect(result.current.gifts.some(g => g.description === 'Fail Gift')).toBe(true)
    })

    it('should handle conflict resolution during sync', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      // Start with server data
      const serverGift = {
        id: 'gift-123',
        gift_description: 'Original server gift',
        primary_giver_name: 'Server Giver',
        updated_at: '2024-01-15T10:00:00Z'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [serverGift]
        })
      })

      await act(async () => {
        // Load initial data
        await result.current.refetch()
      })

      await act(async () => {
        // Go offline and make local changes
        mockNetworkState.isOnline = false
        
        await result.current.updateGift('gift-123', {
          description: 'Offline updated gift'
        })
      })

      // Mock server response with conflicting update
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{
            ...serverGift,
            gift_description: 'Server updated gift', // Different from local
            updated_at: '2024-01-15T11:00:00Z' // Newer than local
          }]
        }),
        update: jest.fn().mockRejectedValue({
          code: 'PGRST116', // Row version conflict
          message: 'Row was updated by another client'
        })
      })

      await act(async () => {
        mockNetworkState.isOnline = true
        await result.current.syncOfflineChanges()
      })

      // Should detect conflict and use server version (newer timestamp)
      expect(result.current.gifts.find(g => g.id === 'gift-123')?.description)
        .toBe('Server updated gift')
      
      // Should notify about conflict resolution
      expect(result.current.conflictCount).toBeGreaterThan(0)
    })
  })

  describe('Background Sync Integration', () => {
    it('should register for background sync when going offline', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false
        
        await result.current.addGift({
          description: 'Background sync gift',
          giverName: 'Background Giver'
        })
      })

      // Should register background sync
      const serviceWorker = await mockServiceWorker.ready
      expect(serviceWorker.sync.register).toHaveBeenCalledWith('thank-you-sync')
    })

    it('should handle background sync events', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false
        
        await result.current.addGift({
          description: 'Background gift',
          giverName: 'Background giver'
        })
      })

      // Simulate service worker sync event
      const syncEvent = new Event('sync')
      Object.defineProperty(syncEvent, 'tag', { value: 'thank-you-sync' })

      await act(async () => {
        mockNetworkState.isOnline = true
        
        // Simulate background sync trigger
        self.dispatchEvent(syncEvent)
        
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should complete sync
      expect(result.current.pendingChanges).toBe(0)
    })
  })

  describe('Data Recovery Scenarios', () => {
    it('should recover from corrupted localStorage', async () => {
      // Corrupt localStorage data
      mockLocalStorage.store['gifts_org-123_wedding-123'] = 'invalid-json-data'

      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should handle gracefully and start fresh
      expect(result.current.error).toBeNull()
      expect(result.current.gifts).toHaveLength(0)

      // Should clear corrupted data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('gifts_org-123_wedding-123')
    })

    it('should handle localStorage quota exceeded', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      // Mock localStorage quota exceeded
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError')
      })

      await act(async () => {
        mockNetworkState.isOnline = false
        
        await result.current.addGift({
          description: 'Large data gift',
          giverName: 'Storage Test'
        })
      })

      // Should show appropriate error
      expect(result.current.error).toContain('storage quota exceeded')

      // Should suggest cleanup options
      expect(result.current.error).toContain('clear old data')
    })

    it('should validate data integrity after sync', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false
        
        await result.current.addGift({
          description: 'Integrity test gift',
          giverName: 'Test Giver',
          value: 100
        })
      })

      // Mock server returning different data than expected
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: [{
            id: 'server-123',
            gift_description: 'Modified by server', // Different from local
            primary_giver_name: 'Test Giver',
            gift_value: 150 // Different value
          }]
        }),
        select: jest.fn().mockReturnThis()
      })

      await act(async () => {
        mockNetworkState.isOnline = true
        await result.current.syncOfflineChanges()
      })

      // Should detect data discrepancy
      const syncedGift = result.current.gifts.find(g => g.id === 'server-123')
      expect(syncedGift?.description).toBe('Modified by server')
      expect(syncedGift?.value).toBe(150)

      // Should log integrity warning
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Data integrity warning')
      )
    })
  })

  describe('Performance Under Load', () => {
    it('should handle large offline datasets efficiently', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false

        // Add 100 gifts rapidly
        const promises = Array.from({ length: 100 }, (_, i) =>
          result.current.addGift({
            description: `Bulk Gift ${i}`,
            giverName: `Bulk Giver ${i}`,
            value: i * 10
          })
        )

        const startTime = Date.now()
        await Promise.all(promises)
        const endTime = Date.now()

        // Should complete within reasonable time
        expect(endTime - startTime).toBeLessThan(5000)
      })

      expect(result.current.gifts).toHaveLength(100)
      expect(result.current.pendingChanges).toBe(100)

      // localStorage operations should be efficient
      expect(mockLocalStorage.setItem.mock.calls.length).toBeLessThanOrEqual(110) // Some overhead allowed
    })

    it('should batch sync operations for better performance', async () => {
      const { result } = renderHook(() => 
        useMobileThankYouSync('org-123', 'wedding-123')
      )

      await act(async () => {
        mockNetworkState.isOnline = false

        // Add multiple gifts
        for (let i = 0; i < 50; i++) {
          await result.current.addGift({
            description: `Batch Gift ${i}`,
            giverName: `Batch Giver ${i}`
          })
        }
      })

      // Mock batch insert
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: Array.from({ length: 50 }, (_, i) => ({ id: `batch-${i}` }))
        }),
        select: jest.fn().mockReturnThis()
      })

      const startTime = Date.now()

      await act(async () => {
        mockNetworkState.isOnline = true
        await result.current.syncOfflineChanges()
      })

      const endTime = Date.now()

      // Should complete batch sync quickly
      expect(endTime - startTime).toBeLessThan(3000)

      // Should make minimal API calls (batched)
      expect(mockSupabase.from().insert).toHaveBeenCalledTimes(1)
      expect(result.current.pendingChanges).toBe(0)
    })
  })
})
```

## ✅ Acceptance Criteria Checklist

- [ ] **99.9% Data Reliability** confirmed across all offline scenarios with zero gift record loss
- [ ] **Mobile Camera Integration** works flawlessly on all devices with automatic photo backup and metadata capture
- [ ] **Offline-First Architecture** provides complete functionality without network connection and perfect sync when reconnected
- [ ] **Bulk Processing Performance** handles 500+ gift imports without UI freezing or data corruption
- [ ] **Cross-Device Synchronization** ensures real-time updates across couple's phones and family members
- [ ] **AI-Powered Text Extraction** successfully extracts gift details from photos with 85%+ accuracy
- [ ] **Delivery Verification** achieves 100% success rate for thank you note delivery across all channels
- [ ] **Conflict Resolution** handles concurrent edits gracefully with user-friendly resolution options
- [ ] **Error Recovery** provides comprehensive fallback mechanisms and user-friendly error messages
- [ ] **Performance Optimization** maintains smooth 60fps scrolling with 1000+ gifts and sub-200ms response times
- [ ] **Battery Efficiency** optimizes camera usage and background sync to minimize mobile battery drain
- [ ] **Accessibility Compliance** supports screen readers, keyboard navigation, and mobile accessibility standards

Your testing ensures wedding thank you management is as reliable and trustworthy as the couple's lifelong commitment.

**Remember**: Every test prevents a potential wedding relationship disaster. Test like family harmony depends on it - because it does! 🧪💍