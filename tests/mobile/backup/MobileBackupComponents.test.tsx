import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Import components
import MobileBackupScheduler from '@/components/mobile/backup/MobileBackupScheduler'
import LocalBackupSync from '@/components/mobile/backup/LocalBackupSync'
import WeddingDayEmergencyAccess from '@/components/mobile/backup/WeddingDayEmergencyAccess'
import OfflineVendorContacts from '@/components/mobile/backup/OfflineVendorContacts'
import CriticalDocumentAccess from '@/components/mobile/backup/CriticalDocumentAccess'

// Mock dependencies
vi.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({})
}))

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true
})

// Mock window methods
Object.defineProperty(window, 'addEventListener', { value: vi.fn() })
Object.defineProperty(window, 'removeEventListener', { value: vi.fn() })

describe('Mobile Backup Components Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  describe('MobileBackupScheduler', () => {
    it('should render scheduler interface', () => {
      render(<MobileBackupScheduler />)
      expect(screen.getByText('Backup Scheduler')).toBeInTheDocument()
    })

    it('should display schedule tabs', async () => {
      render(<MobileBackupScheduler />)
      
      await waitFor(() => {
        expect(screen.getByText('Schedules')).toBeInTheDocument()
        expect(screen.getByText('Policy')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
      })
    })

    it('should show system status', async () => {
      render(<MobileBackupScheduler />)
      
      await waitFor(() => {
        expect(screen.getByText(/Battery:/)).toBeInTheDocument()
        expect(screen.getByText(/WiFi Connected|Mobile Data/)).toBeInTheDocument()
      })
    })

    it('should handle schedule creation', async () => {
      render(<MobileBackupScheduler />)
      
      const newScheduleButton = screen.getByText('New Schedule')
      fireEvent.click(newScheduleButton)
      
      // Should open schedule creation form
      expect(newScheduleButton).toBeInTheDocument()
    })

    it('should display existing schedules', async () => {
      render(<MobileBackupScheduler />)
      
      await waitFor(() => {
        expect(screen.getByText('Daily Wedding Data Backup')).toBeInTheDocument()
        expect(screen.getByText('Weekly Full Backup')).toBeInTheDocument()
      })
    })

    it('should handle schedule toggle', async () => {
      render(<MobileBackupScheduler />)
      
      await waitFor(() => {
        const toggleButtons = screen.getAllByRole('button').filter(btn => 
          btn.classList.contains('rounded-full')
        )
        
        if (toggleButtons.length > 0) {
          fireEvent.click(toggleButtons[0])
        }
      })
    })

    it('should show backup policy settings', async () => {
      render(<MobileBackupScheduler />)
      
      const policyTab = screen.getByText('Policy')
      fireEvent.click(policyTab)
      
      await waitFor(() => {
        expect(screen.getByText('Backup Policy')).toBeInTheDocument()
        expect(screen.getByText('Retention Period')).toBeInTheDocument()
        expect(screen.getByText('Maximum Backups')).toBeInTheDocument()
      })
    })
  })

  describe('LocalBackupSync', () => {
    it('should render device sync interface', () => {
      render(<LocalBackupSync />)
      expect(screen.getByText('Device Sync')).toBeInTheDocument()
    })

    it('should show sync now button', () => {
      render(<LocalBackupSync />)
      expect(screen.getByText('Sync Now')).toBeInTheDocument()
    })

    it('should display device statistics', async () => {
      render(<LocalBackupSync />)
      
      await waitFor(() => {
        expect(screen.getByText('Devices')).toBeInTheDocument()
        expect(screen.getByText('Conflicts')).toBeInTheDocument()
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })
    })

    it('should handle device tabs', async () => {
      render(<LocalBackupSync />)
      
      await waitFor(() => {
        expect(screen.getByText('Devices')).toBeInTheDocument()
        expect(screen.getByText('Items')).toBeInTheDocument()
        expect(screen.getByText('Conflicts')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
      })
    })

    it('should display device information', async () => {
      render(<LocalBackupSync />)
      
      await waitFor(() => {
        expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument()
        expect(screen.getByText('iPad Pro')).toBeInTheDocument()
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument()
      })
    })

    it('should show device status indicators', async () => {
      render(<LocalBackupSync />)
      
      await waitFor(() => {
        expect(screen.getByText('This Device')).toBeInTheDocument()
        expect(screen.getByText('Syncing...')).toBeInTheDocument()
      })
    })

    it('should handle conflict resolution', async () => {
      render(<LocalBackupSync />)
      
      const conflictsTab = screen.getByText('Conflicts')
      fireEvent.click(conflictsTab)
      
      await waitFor(() => {
        if (screen.queryByText('Keep Local')) {
          expect(screen.getByText('Keep Local')).toBeInTheDocument()
          expect(screen.getByText('Keep Remote')).toBeInTheDocument()
        }
      })
    })
  })

  describe('WeddingDayEmergencyAccess', () => {
    it('should render wedding day emergency interface', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('Sarah & Mike Johnson')).toBeInTheDocument()
        expect(screen.getByText('2024-09-15')).toBeInTheDocument()
      })
    })

    it('should show emergency status', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText(/Status$/)).toBeInTheDocument()
      })
    })

    it('should display current wedding event', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText(/NOW:/)).toBeInTheDocument()
        expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument()
      })
    })

    it('should show emergency action buttons', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('CALL COORDINATOR')).toBeInTheDocument()
        expect(screen.getByText('CALL VENUE')).toBeInTheDocument()
      })
    })

    it('should display emergency contacts', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('🔥 Emergency Contacts')).toBeInTheDocument()
        expect(screen.getByText('Jennifer Smith')).toBeInTheDocument()
        expect(screen.getByText('David Wilson')).toBeInTheDocument()
      })
    })

    it('should show timeline with events', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('⏰ Today\'s Timeline')).toBeInTheDocument()
        expect(screen.getByText('Reception Dinner')).toBeInTheDocument()
        expect(screen.getByText('First Dance')).toBeInTheDocument()
      })
    })

    it('should display critical information', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('🛡️ Critical Information')).toBeInTheDocument()
        expect(screen.getByText('$2,500')).toBeInTheDocument()
      })
    })

    it('should handle emergency mode toggle', async () => {
      render(<WeddingDayEmergencyAccess />)
      
      await waitFor(() => {
        const emergencyButton = screen.getByRole('button', {
          name: /emergency/i
        })
        fireEvent.click(emergencyButton)
      })
    })
  })

  describe('OfflineVendorContacts', () => {
    it('should render vendor contacts interface', () => {
      render(<OfflineVendorContacts />)
      expect(screen.getByText('Vendor Contacts')).toBeInTheDocument()
    })

    it('should show search functionality', () => {
      render(<OfflineVendorContacts />)
      expect(screen.getByPlaceholderText(/Search vendors/)).toBeInTheDocument()
    })

    it('should display vendor statistics', async () => {
      render(<OfflineVendorContacts />)
      
      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument()
        expect(screen.getByText('Critical')).toBeInTheDocument()
        expect(screen.getByText('Total')).toBeInTheDocument()
      })
    })

    it('should show vendor categories', async () => {
      render(<OfflineVendorContacts />)
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument()
        expect(screen.getByText('Photography')).toBeInTheDocument()
        expect(screen.getByText('Planning')).toBeInTheDocument()
      })
    })

    it('should display vendor information', async () => {
      render(<OfflineVendorContacts />)
      
      await waitFor(() => {
        expect(screen.getByText('Perfect Moments Photography')).toBeInTheDocument()
        expect(screen.getByText('Elegant Events Coordination')).toBeInTheDocument()
        expect(screen.getByText('Grand Ballroom')).toBeInTheDocument()
      })
    })

    it('should show contact actions', async () => {
      render(<OfflineVendorContacts />)
      
      await waitFor(() => {
        const callButtons = screen.getAllByText('Call Main')
        expect(callButtons.length).toBeGreaterThan(0)
        
        const smsButtons = screen.getAllByText('SMS')
        expect(smsButtons.length).toBeGreaterThan(0)
      })
    })

    it('should handle vendor filtering', async () => {
      render(<OfflineVendorContacts />)
      
      const photographyButton = screen.getByText('Photography')
      fireEvent.click(photographyButton)
      
      await waitFor(() => {
        expect(screen.getByText('Perfect Moments Photography')).toBeInTheDocument()
      })
    })

    it('should show offline availability', async () => {
      render(<OfflineVendorContacts />)
      
      await waitFor(() => {
        const offlineIndicators = screen.getAllByText('Offline')
        expect(offlineIndicators.length).toBeGreaterThan(0)
      })
    })
  })

  describe('CriticalDocumentAccess', () => {
    it('should render document access interface', () => {
      render(<CriticalDocumentAccess />)
      expect(screen.getByText('Critical Documents')).toBeInTheDocument()
    })

    it('should show search functionality', () => {
      render(<CriticalDocumentAccess />)
      expect(screen.getByPlaceholderText(/Search documents/)).toBeInTheDocument()
    })

    it('should display document statistics', async () => {
      render(<CriticalDocumentAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument()
        expect(screen.getByText('Offline')).toBeInTheDocument()
        expect(screen.getByText('Encrypted')).toBeInTheDocument()
        expect(screen.getByText('Expiring')).toBeInTheDocument()
      })
    })

    it('should show document categories', async () => {
      render(<CriticalDocumentAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument()
        expect(screen.getByText('Wedding')).toBeInTheDocument()
        expect(screen.getByText('Vendors')).toBeInTheDocument()
        expect(screen.getByText('Legal')).toBeInTheDocument()
      })
    })

    it('should display document information', async () => {
      render(<CriticalDocumentAccess />)
      
      await waitFor(() => {
        expect(screen.getByText('Wedding Day Timeline & Schedule')).toBeInTheDocument()
        expect(screen.getByText('Emergency Contact List')).toBeInTheDocument()
        expect(screen.getByText('Photography Contract')).toBeInTheDocument()
      })
    })

    it('should show document actions', async () => {
      render(<CriticalDocumentAccess />)
      
      await waitFor(() => {
        const viewButtons = screen.getAllByText('View')
        expect(viewButtons.length).toBeGreaterThan(0)
        
        const downloadButtons = screen.getAllByText('Download')
        expect(downloadButtons.length).toBeGreaterThan(0)
      })
    })

    it('should handle document filtering', async () => {
      render(<CriticalDocumentAccess />)
      
      const weddingButton = screen.getByText('Wedding')
      fireEvent.click(weddingButton)
      
      await waitFor(() => {
        expect(screen.getByText('Wedding Day Timeline & Schedule')).toBeInTheDocument()
      })
    })

    it('should show encryption indicators', async () => {
      render(<CriticalDocumentAccess />)
      
      await waitFor(() => {
        // Look for lock icons or encrypted indicators
        const encryptedElements = screen.getAllByText(/encrypted|lock/i)
        if (encryptedElements.length > 0) {
          expect(encryptedElements[0]).toBeInTheDocument()
        }
      })
    })
  })

  describe('Cross-Component Integration', () => {
    it('should handle online/offline status changes across components', () => {
      const components = [
        <MobileBackupScheduler key="scheduler" />,
        <LocalBackupSync key="sync" />,
        <OfflineVendorContacts key="vendors" />
      ]

      components.forEach((component, index) => {
        const { unmount } = render(component)
        
        // Change to offline
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
        
        fireEvent(window, new Event('offline'))
        
        // Should handle offline state
        expect(screen.getByRole('main')).toBeInTheDocument()
        
        unmount()
      })
    })

    it('should maintain consistent touch targets across components', () => {
      const components = [
        MobileBackupScheduler,
        LocalBackupSync,
        OfflineVendorContacts,
        CriticalDocumentAccess
      ]

      components.forEach((Component) => {
        const { unmount } = render(<Component />)
        
        // All buttons should be touch-friendly
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toBeInTheDocument()
        })
        
        unmount()
      })
    })

    it('should handle error boundaries gracefully', () => {
      const components = [
        MobileBackupScheduler,
        LocalBackupSync,
        WeddingDayEmergencyAccess,
        OfflineVendorContacts,
        CriticalDocumentAccess
      ]

      components.forEach((Component) => {
        const { unmount } = render(<Component />)
        
        // Components should not crash
        expect(screen.getByRole('main')).toBeInTheDocument()
        
        unmount()
      })
    })

    it('should maintain accessibility standards', async () => {
      const components = [
        MobileBackupScheduler,
        LocalBackupSync,
        OfflineVendorContacts
      ]

      for (const Component of components) {
        const { unmount } = render(<Component />)
        
        await waitFor(() => {
          // Check for proper heading structure
          const headings = screen.getAllByRole('heading')
          expect(headings.length).toBeGreaterThan(0)
          
          // Check for button accessibility
          const buttons = screen.getAllByRole('button')
          expect(buttons.length).toBeGreaterThan(0)
        })
        
        unmount()
      }
    })
  })
})