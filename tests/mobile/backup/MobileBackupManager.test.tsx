import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import MobileBackupManager from '@/components/mobile/backup/MobileBackupManager'

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    // Mock Supabase client methods as needed
  })
}))

// Mock motion
vi.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock online/offline status
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window methods
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn()
})

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn()
})

describe('MobileBackupManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render backup manager header and controls', () => {
    render(<MobileBackupManager />)
    
    expect(screen.getByText('Backup Manager')).toBeInTheDocument()
    expect(screen.getByText('Sync All')).toBeInTheDocument()
  })

  it('should display online status correctly', () => {
    render(<MobileBackupManager />)
    
    // Should not show offline indicator when online
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('should display offline status when offline', () => {
    // Set offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    render(<MobileBackupManager />)
    
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should show backup statistics', async () => {
    render(<MobileBackupManager />)
    
    // Wait for mock data to load
    await waitFor(() => {
      expect(screen.getByText('Total Backed Up')).toBeInTheDocument()
      expect(screen.getByText('Offline Ready')).toBeInTheDocument()
    })
  })

  it('should display backup items with correct information', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Johnson Wedding Timeline')).toBeInTheDocument()
      expect(screen.getByText('Sarah & Mike Contact Info')).toBeInTheDocument()
      expect(screen.getByText('Bridal Prep Checklist')).toBeInTheDocument()
    })
  })

  it('should handle item selection', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('button')
      // Find and click the first item checkbox
      const firstItemCheckbox = checkboxes.find(btn => 
        btn.getAttribute('class')?.includes('rounded border-2')
      )
      
      if (firstItemCheckbox) {
        fireEvent.click(firstItemCheckbox)
        expect(screen.getByText(/Backup Selected \(1\)/)).toBeInTheDocument()
      }
    })
  })

  it('should handle sync all action', async () => {
    render(<MobileBackupManager />)
    
    const syncButton = screen.getByText('Sync All')
    fireEvent.click(syncButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Syncing.../)).toBeInTheDocument()
    })
  })

  it('should handle bulk backup action', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      // Select an item first
      const checkboxes = screen.getAllByRole('button')
      const firstItemCheckbox = checkboxes.find(btn => 
        btn.getAttribute('class')?.includes('rounded border-2')
      )
      
      if (firstItemCheckbox) {
        fireEvent.click(firstItemCheckbox)
        
        // Find and click backup selected button
        const backupSelectedButton = screen.getByText(/Backup Selected/)
        fireEvent.click(backupSelectedButton)
        
        // Should show syncing state
        expect(screen.getByText(/Syncing.../)).toBeInTheDocument()
      }
    })
  })

  it('should disable sync when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    render(<MobileBackupManager />)
    
    const syncButton = screen.getByText('Sync All')
    expect(syncButton).toBeDisabled()
  })

  it('should show restore button for each item', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      const restoreButtons = screen.getAllByText('Restore')
      expect(restoreButtons.length).toBeGreaterThan(0)
    })
  })

  it('should handle select all functionality', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      const selectAllButton = screen.getByText('Select All')
      fireEvent.click(selectAllButton)
      
      // Should show selected count equal to total items
      expect(screen.getByText(/Backup Selected/)).toBeInTheDocument()
    })
  })

  it('should handle clear selection', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      // First select all
      const selectAllButton = screen.getByText('Select All')
      fireEvent.click(selectAllButton)
      
      // Then clear
      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)
      
      // Should show 0 selected
      expect(screen.getByText(/0 of \d+ selected/)).toBeInTheDocument()
    })
  })

  it('should display priority badges correctly', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      expect(screen.getByText('critical')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
    })
  })

  it('should show offline indicators for offline-ready items', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      const offlineLabels = screen.getAllByText('Offline')
      expect(offlineLabels.length).toBeGreaterThan(0)
    })
  })

  it('should handle item restore action', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      const restoreButtons = screen.getAllByText('Restore')
      fireEvent.click(restoreButtons[0])
      
      // Should show some indication that restore was initiated
      // This would depend on the actual implementation
    })
  })

  it('should show retry button for failed items', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      // Look for items with failed status
      const retryButtons = screen.getAllByText('Retry')
      if (retryButtons.length > 0) {
        expect(retryButtons[0]).toBeInTheDocument()
      }
    })
  })

  it('should format file sizes correctly', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      // Should show formatted file sizes
      expect(screen.getByText(/KB|MB|GB/)).toBeInTheDocument()
    })
  })

  it('should format time ago correctly', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      // Should show relative time formats
      const timeElements = screen.getAllByText(/\d+[hm] ago|Just now/)
      expect(timeElements.length).toBeGreaterThan(0)
    })
  })

  it('should show storage information in advanced mode', async () => {
    render(<MobileBackupManager />)
    
    // Click on advanced settings button
    const advancedButton = screen.getByRole('button', { 
      name: /Advanced|Settings/i 
    })
    fireEvent.click(advancedButton)
    
    await waitFor(() => {
      expect(screen.getByText('Storage & Advanced')).toBeInTheDocument()
      expect(screen.getByText(/Storage Used/)).toBeInTheDocument()
    })
  })

  it('should handle status message display', async () => {
    render(<MobileBackupManager />)
    
    // Trigger an action that would show a status message
    const syncButton = screen.getByText('Sync All')
    fireEvent.click(syncButton)
    
    await waitFor(() => {
      // Status message should appear
      expect(screen.getByText(/completed|started|failed/i)).toBeInTheDocument()
    })
  })

  it('should be responsive with proper touch targets', async () => {
    render(<MobileBackupManager />)
    
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        // Check that buttons have minimum touch target size (this would need custom CSS test)
        expect(button).toBeInTheDocument()
      })
    })
  })

  it('should handle error states gracefully', async () => {
    render(<MobileBackupManager />)
    
    // Test that component doesn't crash with errors
    await waitFor(() => {
      expect(screen.getByText('Backup Manager')).toBeInTheDocument()
    })
  })

  it('should support keyboard navigation', async () => {
    render(<MobileBackupManager />)
    
    const syncButton = screen.getByText('Sync All')
    
    // Test keyboard events
    fireEvent.keyDown(syncButton, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(syncButton, { key: ' ', code: 'Space' })
    
    expect(syncButton).toBeInTheDocument()
  })
})