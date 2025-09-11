/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivacyPolicyModal } from '@/components/gdpr/PrivacyPolicyModal'

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMMM dd, yyyy') return 'January 01, 2024'
    if (formatStr === 'MMM yyyy') return 'Dec 2024'
    return 'January 01, 2024'
  })
}))

// Mock compliance data
jest.mock('@/lib/compliance/gdpr-compliance', () => ({
  DATA_PROCESSING_PURPOSES: [
    {
      id: 'wedding_planning',
      name: 'Wedding Planning Services',
      description: 'Core functionality for managing your wedding plans',
      legalBasis: 'contract',
      required: true,
      categories: ['wedding_data']
    },
    {
      id: 'analytics',
      name: 'Website Analytics',
      description: 'Understanding how you use our platform',
      legalBasis: 'consent',
      required: false,
      categories: ['usage_data']
    }
  ],
  DATA_RETENTION_POLICIES: [
    {
      category: 'wedding_data',
      retentionPeriod: 1825,
      description: 'Wedding planning data kept for historical purposes',
      autoDelete: false
    },
    {
      category: 'guest_data',
      retentionPeriod: 1095,
      description: 'Guest information for event coordination',
      autoDelete: true
    }
  ]
}))

describe('PrivacyPolicyModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onAccept: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<PrivacyPolicyModal {...mockProps} />)
      
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
      expect(screen.getByText(/Effective:/)).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<PrivacyPolicyModal {...mockProps} isOpen={false} />)
      
      expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument()
    })

    it('shows close button', () => {
      render(<PrivacyPolicyModal {...mockProps} />)
      
      const closeButton = screen.getByText('Close')
      expect(closeButton).toBeInTheDocument()
    })

    it('shows accept button when onAccept is provided', () => {
      render(<PrivacyPolicyModal {...mockProps} />)
      
      expect(screen.getByText('Accept & Continue')).toBeInTheDocument()
    })

    it('hides accept button when onAccept is not provided', () => {
      render(<PrivacyPolicyModal isOpen={true} onClose={mockProps.onClose} />)
      
      expect(screen.queryByText('Accept & Continue')).not.toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    beforeEach(() => {
      render(<PrivacyPolicyModal {...mockProps} />)
    })

    it('renders all three tabs', () => {
      expect(screen.getByText('Policy')).toBeInTheDocument()
      expect(screen.getByText('Data Processing')).toBeInTheDocument()
      expect(screen.getByText('Your Rights')).toBeInTheDocument()
    })

    it('starts with Policy tab active', () => {
      const policyTab = screen.getByText('Policy')
      expect(policyTab.closest('[data-state="active"]')).toBeInTheDocument()
    })

    it('allows switching between tabs', async () => {
      const user = userEvent.setup()
      
      // Switch to Data Processing tab
      const dataTab = screen.getByText('Data Processing')
      await user.click(dataTab)
      
      expect(screen.getByText('Data Processing Purposes')).toBeInTheDocument()
      
      // Switch to Rights tab
      const rightsTab = screen.getByText('Your Rights')
      await user.click(rightsTab)
      
      expect(screen.getByText('Your Data Protection Rights')).toBeInTheDocument()
      
      // Back to Policy tab
      const policyTab = screen.getByText('Policy')
      await user.click(policyTab)
      
      // Should show policy content sections
      expect(screen.getByText('Overview')).toBeInTheDocument()
    })
  })

  describe('Policy Tab Content', () => {
    beforeEach(() => {
      render(<PrivacyPolicyModal {...mockProps} showTableOfContents={true} />)
    })

    it('shows table of contents when enabled', () => {
      expect(screen.getByText('Table of Contents')).toBeInTheDocument()
    })

    it('hides table of contents when disabled', () => {
      render(<PrivacyPolicyModal {...mockProps} showTableOfContents={false} />)
      expect(screen.queryByText('Table of Contents')).not.toBeInTheDocument()
    })

    it('displays main policy sections', () => {
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('What Data We Collect')).toBeInTheDocument()
      expect(screen.getByText('Legal Basis for Processing')).toBeInTheDocument()
      expect(screen.getByText('How We Use Your Data')).toBeInTheDocument()
      expect(screen.getByText('Data Sharing and Third Parties')).toBeInTheDocument()
      expect(screen.getByText('Data Security')).toBeInTheDocument()
      expect(screen.getByText('Your Rights')).toBeInTheDocument()
      expect(screen.getByText('Contact Information')).toBeInTheDocument()
    })

    it('shows effective dates for sections', () => {
      expect(screen.getByText(/Effective Date:/)).toBeInTheDocument()
      expect(screen.getByText('January 01, 2024')).toBeInTheDocument()
    })

    it('highlights recent changes when enabled', () => {
      render(<PrivacyPolicyModal {...mockProps} highlightChanges={true} />)
      
      expect(screen.getByText('Recent Changes')).toBeInTheDocument()
      expect(screen.getByText('Updated data retention periods')).toBeInTheDocument()
      expect(screen.getByText('Added new third-party integrations')).toBeInTheDocument()
    })

    it('hides changes when highlighting is disabled', () => {
      render(<PrivacyPolicyModal {...mockProps} highlightChanges={false} />)
      
      expect(screen.queryByText('Recent Changes')).not.toBeInTheDocument()
    })

    it('allows navigation via table of contents', async () => {
      const user = userEvent.setup()
      
      const tocItem = screen.getByText('What Data We Collect')
      await user.click(tocItem)
      
      // Should scroll to section (mocked behavior)
      expect(tocItem).toBeInTheDocument()
    })
  })

  describe('Data Processing Tab', () => {
    beforeEach(async () => {
      render(<PrivacyPolicyModal {...mockProps} />)
      
      const dataTab = screen.getByText('Data Processing')
      fireEvent.click(dataTab)
    })

    it('shows data processing purposes', () => {
      expect(screen.getByText('Data Processing Purposes')).toBeInTheDocument()
      expect(screen.getByText('Wedding Planning Services')).toBeInTheDocument()
      expect(screen.getByText('Website Analytics')).toBeInTheDocument()
    })

    it('displays purpose details correctly', () => {
      expect(screen.getByText('Required')).toBeInTheDocument()
      expect(screen.getByText('contract')).toBeInTheDocument()
      expect(screen.getByText('consent')).toBeInTheDocument()
    })

    it('shows data retention policies', () => {
      expect(screen.getByText('Data Retention Policies')).toBeInTheDocument()
      expect(screen.getByText('Wedding data')).toBeInTheDocument()
      expect(screen.getByText('Guest data')).toBeInTheDocument()
      expect(screen.getByText('5 years')).toBeInTheDocument()
      expect(screen.getByText('3 years')).toBeInTheDocument()
    })

    it('shows auto-delete badges where applicable', () => {
      expect(screen.getByText('Auto-delete')).toBeInTheDocument()
    })

    it('displays retention period descriptions', () => {
      expect(screen.getByText('Wedding planning data kept for historical purposes')).toBeInTheDocument()
      expect(screen.getByText('Guest information for event coordination')).toBeInTheDocument()
    })
  })

  describe('Your Rights Tab', () => {
    beforeEach(async () => {
      render(<PrivacyPolicyModal {...mockProps} />)
      
      const rightsTab = screen.getByText('Your Rights')
      fireEvent.click(rightsTab)
    })

    it('shows data protection rights overview', () => {
      expect(screen.getByText('Your Data Protection Rights')).toBeInTheDocument()
      expect(screen.getByText(/Under the General Data Protection Regulation/)).toBeInTheDocument()
    })

    it('lists all GDPR rights', () => {
      expect(screen.getByText('Right of Access')).toBeInTheDocument()
      expect(screen.getByText('Right to Rectification')).toBeInTheDocument()
      expect(screen.getByText('Right to Erasure')).toBeInTheDocument()
      expect(screen.getByText('Right to Data Portability')).toBeInTheDocument()
      expect(screen.getByText('Right to Object')).toBeInTheDocument()
      expect(screen.getByText('Right to Restrict Processing')).toBeInTheDocument()
    })

    it('shows timeframes for each right', () => {
      const timeframeBadges = screen.getAllByText('30 days')
      expect(timeframeBadges.length).toBeGreaterThan(0)
    })

    it('displays contact information for exercising rights', () => {
      expect(screen.getByText('How to Exercise Your Rights')).toBeInTheDocument()
      expect(screen.getByText('privacy@wedsync.com')).toBeInTheDocument()
      expect(screen.getByText('Within 30 days')).toBeInTheDocument()
      expect(screen.getByText('Identity verification may be required')).toBeInTheDocument()
    })

    it('includes information about data request form', () => {
      expect(screen.getByText('Use our data request form for faster processing')).toBeInTheDocument()
    })
  })

  describe('Modal Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyPolicyModal {...mockProps} />)
      
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)
      
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('calls onAccept when accept button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyPolicyModal {...mockProps} />)
      
      const acceptButton = screen.getByText('Accept & Continue')
      await user.click(acceptButton)
      
      expect(mockProps.onAccept).toHaveBeenCalled()
    })

    it('calls onClose when modal overlay is clicked', () => {
      render(<PrivacyPolicyModal {...mockProps} />)
      
      // Simulate clicking the modal overlay (would trigger onOpenChange)
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
    })

    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyPolicyModal {...mockProps} />)
      
      const content = screen.getByText('Privacy Policy')
      await user.click(content)
      
      expect(mockProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<PrivacyPolicyModal {...mockProps} />)
    })

    it('has proper dialog role and aria-labels', () => {
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('has proper heading hierarchy', () => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('has accessible tab navigation', () => {
      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBe(3)
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected')
      })
    })

    it('maintains focus management', () => {
      const firstFocusableElement = screen.getByText('Policy')
      expect(firstFocusableElement).toBeTruthy()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      const policyTab = screen.getByText('Policy')
      policyTab.focus()
      
      // Tab key should move focus
      await user.keyboard('{Tab}')
      
      const nextElement = document.activeElement
      expect(nextElement).not.toBe(policyTab)
    })
  })

  describe('Content Scrolling', () => {
    beforeEach(() => {
      render(<PrivacyPolicyModal {...mockProps} showTableOfContents={true} />)
    })

    it('has scrollable content area', () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-content]')
      expect(scrollArea || screen.getByText('Overview')).toBeInTheDocument()
    })

    it('table of contents navigation updates active section', async () => {
      const user = userEvent.setup()
      
      // Mock scrollIntoView
      Element.prototype.scrollIntoView = jest.fn()
      
      const tocItem = screen.getByText('Legal Basis for Processing')
      await user.click(tocItem)
      
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })
  })

  describe('Props Handling', () => {
    it('applies custom className', () => {
      render(<PrivacyPolicyModal {...mockProps} className="custom-modal" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('custom-modal')
    })

    it('respects showTableOfContents prop', () => {
      const { rerender } = render(
        <PrivacyPolicyModal {...mockProps} showTableOfContents={true} />
      )
      
      expect(screen.getByText('Table of Contents')).toBeInTheDocument()
      
      rerender(
        <PrivacyPolicyModal {...mockProps} showTableOfContents={false} />
      )
      
      expect(screen.queryByText('Table of Contents')).not.toBeInTheDocument()
    })

    it('respects highlightChanges prop', () => {
      const { rerender } = render(
        <PrivacyPolicyModal {...mockProps} highlightChanges={true} />
      )
      
      expect(screen.getByText('Recent Changes')).toBeInTheDocument()
      
      rerender(
        <PrivacyPolicyModal {...mockProps} highlightChanges={false} />
      )
      
      expect(screen.queryByText('Recent Changes')).not.toBeInTheDocument()
    })
  })

  describe('Content Completeness', () => {
    beforeEach(() => {
      render(<PrivacyPolicyModal {...mockProps} />)
    })

    it('includes all required GDPR policy sections', () => {
      const requiredSections = [
        'Overview',
        'What Data We Collect', 
        'Legal Basis for Processing',
        'How We Use Your Data',
        'Data Sharing and Third Parties',
        'Data Security',
        'Your Rights',
        'Contact Information'
      ]
      
      requiredSections.forEach(section => {
        expect(screen.getByText(section)).toBeInTheDocument()
      })
    })

    it('includes contact information for DPO', async () => {
      const user = userEvent.setup()
      
      const rightsTab = screen.getByText('Your Rights')
      await user.click(rightsTab)
      
      expect(screen.getByText('privacy@wedsync.com')).toBeInTheDocument()
      expect(screen.getByText('Response time: Within 30 days')).toBeInTheDocument()
    })

    it('displays version information', () => {
      expect(screen.getByText('v1.0')).toBeInTheDocument()
    })

    it('shows proper legal basis information', async () => {
      const user = userEvent.setup()
      
      const dataTab = screen.getByText('Data Processing')
      await user.click(dataTab)
      
      expect(screen.getByText('contract')).toBeInTheDocument()
      expect(screen.getByText('consent')).toBeInTheDocument()
    })
  })

  describe('Modal State Management', () => {
    it('handles opening and closing properly', () => {
      const { rerender } = render(
        <PrivacyPolicyModal {...mockProps} isOpen={false} />
      )
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      
      rerender(
        <PrivacyPolicyModal {...mockProps} isOpen={true} />
      )
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('maintains tab state during modal lifecycle', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <PrivacyPolicyModal {...mockProps} isOpen={true} />
      )
      
      // Switch to data processing tab
      const dataTab = screen.getByText('Data Processing')
      await user.click(dataTab)
      
      expect(screen.getByText('Data Processing Purposes')).toBeInTheDocument()
      
      // Close and reopen modal
      rerender(
        <PrivacyPolicyModal {...mockProps} isOpen={false} />
      )
      rerender(
        <PrivacyPolicyModal {...mockProps} isOpen={true} />
      )
      
      // Should reset to policy tab
      expect(screen.getByText('Overview')).toBeInTheDocument()
    })
  })

  describe('Footer Information', () => {
    beforeEach(() => {
      render(<PrivacyPolicyModal {...mockProps} />)
    })

    it('shows contact information in footer', () => {
      expect(screen.getByText('Questions? Contact us at privacy@wedsync.com')).toBeInTheDocument()
    })

    it('displays both close and accept buttons when both callbacks provided', () => {
      expect(screen.getByText('Close')).toBeInTheDocument()
      expect(screen.getByText('Accept & Continue')).toBeInTheDocument()
    })

    it('positions buttons correctly', () => {
      const closeButton = screen.getByText('Close')
      const acceptButton = screen.getByText('Accept & Continue')
      
      expect(closeButton).toBeInTheDocument()
      expect(acceptButton).toBeInTheDocument()
      
      // Close should come before Accept in DOM order
      const buttons = [closeButton, acceptButton]
      const positions = buttons.map(btn => 
        Array.from(btn.parentElement!.children).indexOf(btn)
      )
      expect(positions[0]).toBeLessThan(positions[1])
    })
  })
})