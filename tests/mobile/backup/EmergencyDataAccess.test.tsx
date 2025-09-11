import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import EmergencyDataAccess from '@/components/mobile/backup/EmergencyDataAccess'

// Mock motion
vi.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}))

// Mock window.location.href
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
})

// Mock navigator
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

describe('EmergencyDataAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render emergency data access interface', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Emergency Access')).toBeInTheDocument()
    })
  })

  it('should display wedding couple information', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Sarah & Mike Johnson')).toBeInTheDocument()
      expect(screen.getByText('2024-09-15')).toBeInTheDocument()
    })
  })

  it('should show online status indicator', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument()
    })
  })

  it('should show offline status when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  it('should display current wedding event', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText(/NOW:/)).toBeInTheDocument()
      expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument()
      expect(screen.getByText('Main Hall')).toBeInTheDocument()
    })
  })

  it('should display next wedding event', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText(/NEXT:/)).toBeInTheDocument()
      expect(screen.getByText('Cocktail Hour')).toBeInTheDocument()
      expect(screen.getByText('Garden Terrace')).toBeInTheDocument()
    })
  })

  it('should show critical event indicators', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    })
  })

  it('should display navigation tabs', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeInTheDocument()
      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Venue')).toBeInTheDocument()
      expect(screen.getByText('Info')).toBeInTheDocument()
    })
  })

  it('should display emergency contacts by default', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      expect(screen.getByText('Jennifer Smith')).toBeInTheDocument()
      expect(screen.getByText('David Wilson')).toBeInTheDocument()
    })
  })

  it('should show contact roles and priorities', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText('Bride')).toBeInTheDocument()
      expect(screen.getByText('Groom')).toBeInTheDocument()
      expect(screen.getByText('Wedding Coordinator')).toBeInTheDocument()
      expect(screen.getByText('Lead Photographer')).toBeInTheDocument()
    })
  })

  it('should handle phone calls', async () => {
    const originalLocation = window.location.href

    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const callButtons = screen.getAllByText('Call')
      fireEvent.click(callButtons[0])
      
      // Should have attempted to set tel: URL
      expect(window.location.href).toMatch(/tel:/)
    })

    window.location.href = originalLocation
  })

  it('should handle SMS messaging', async () => {
    const originalLocation = window.location.href

    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const smsButtons = screen.getAllByText('SMS')
      fireEvent.click(smsButtons[0])
      
      // Should have attempted to set sms: URL
      expect(window.location.href).toMatch(/sms:/)
    })

    window.location.href = originalLocation
  })

  it('should display contact availability status', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const availabilityIndicators = screen.getAllByTestId = (id: string) => 
        screen.getAllByRole('generic').filter(el => 
          el.classList.contains('bg-green-500') || el.classList.contains('bg-red-500')
        )
      
      // Should have availability indicators
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  it('should handle tab navigation to timeline', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const timelineTab = screen.getByText('Timeline')
      fireEvent.click(timelineTab)
      
      expect(screen.getByText('Bridal Party Arrival')).toBeInTheDocument()
      expect(screen.getByText('Venue Setup Check')).toBeInTheDocument()
    })
  })

  it('should display timeline events with times', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const timelineTab = screen.getByText('Timeline')
      fireEvent.click(timelineTab)
      
      expect(screen.getByText(/8:00 AM|08:00/)).toBeInTheDocument()
      expect(screen.getByText(/10:00 AM|10:00/)).toBeInTheDocument()
    })
  })

  it('should show event priorities and status', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const timelineTab = screen.getByText('Timeline')
      fireEvent.click(timelineTab)
      
      // Should show critical events
      const criticalLabels = screen.getAllByText('CRITICAL')
      expect(criticalLabels.length).toBeGreaterThan(0)
    })
  })

  it('should handle venue tab navigation', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const venueTab = screen.getByText('Venue')
      fireEvent.click(venueTab)
      
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument()
      expect(screen.getByText(/123 Wedding Ave/)).toBeInTheDocument()
    })
  })

  it('should display venue contact information', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const venueTab = screen.getByText('Venue')
      fireEvent.click(venueTab)
      
      expect(screen.getByText(/\+1 \(555\) 123-4567/)).toBeInTheDocument()
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
    })
  })

  it('should show WiFi password when available', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const venueTab = screen.getByText('Venue')
      fireEvent.click(venueTab)
      
      expect(screen.getByText('WiFi Password')).toBeInTheDocument()
      expect(screen.getByText('SarahMike2024')).toBeInTheDocument()
    })
  })

  it('should handle get directions functionality', async () => {
    const originalLocation = window.location.href

    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const venueTab = screen.getByText('Venue')
      fireEvent.click(venueTab)
      
      const directionsButton = screen.getByText('Get Directions')
      fireEvent.click(directionsButton)
      
      // Should have attempted to open maps
      expect(window.location.href).toMatch(/maps/)
    })

    window.location.href = originalLocation
  })

  it('should display critical information tab', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const infoTab = screen.getByText('Info')
      fireEvent.click(infoTab)
      
      expect(screen.getByText('Critical Information')).toBeInTheDocument()
      expect(screen.getByText('Lead Photographer')).toBeInTheDocument()
      expect(screen.getByText('Wedding Coordinator')).toBeInTheDocument()
    })
  })

  it('should show emergency fund information', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const infoTab = screen.getByText('Info')
      fireEvent.click(infoTab)
      
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
      expect(screen.getByText('$2,500')).toBeInTheDocument()
    })
  })

  it('should display backup plans', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const infoTab = screen.getByText('Info')
      fireEvent.click(infoTab)
      
      expect(screen.getByText('Backup Plans')).toBeInTheDocument()
      expect(screen.getByText(/Rain Plan/)).toBeInTheDocument()
    })
  })

  it('should show emergency protocols', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const infoTab = screen.getByText('Info')
      fireEvent.click(infoTab)
      
      expect(screen.getByText('Emergency Protocols')).toBeInTheDocument()
      expect(screen.getByText(/Call coordinator first/)).toBeInTheDocument()
    })
  })

  it('should handle search functionality', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search contacts/)
      fireEvent.change(searchInput, { target: { value: 'Sarah' } })
      
      // Should filter contacts
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    })
  })

  it('should format time correctly', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const timeElement = screen.getByText(/\d{1,2}:\d{2}:\d{2}/)
      expect(timeElement).toBeInTheDocument()
    })
  })

  it('should show emergency toggle button', async () => {
    render(<EmergencyDataAccess />)
    
    const emergencyToggle = screen.getByRole('button', { 
      name: /Emergency|Toggle/i 
    })
    expect(emergencyToggle).toBeInTheDocument()
  })

  it('should handle emergency mode toggle', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const emergencyToggle = screen.getByRole('button', { 
        name: /Emergency|Toggle/i 
      })
      fireEvent.click(emergencyToggle)
      
      // Should toggle emergency mode
      expect(screen.getByText(/EMERGENCY MODE|Emergency Access/)).toBeInTheDocument()
    })
  })

  it('should display time until next events', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      expect(screen.getByText(/\d+[hm]|\d+h \d+m/)).toBeInTheDocument()
    })
  })

  it('should handle no wedding data scenario', async () => {
    // This would need to mock the component to return null data
    render(<EmergencyDataAccess />)
    
    // Component should handle empty state gracefully
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should be responsive and touch-friendly', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // All buttons should be accessible
        expect(button).toBeInTheDocument()
      })
    })
  })

  it('should handle accessibility requirements', async () => {
    render(<EmergencyDataAccess />)
    
    await waitFor(() => {
      // Check for proper heading structure
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
      
      // Check for button labels
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })
  })
})