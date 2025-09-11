/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataRequestForm } from '@/components/gdpr/DataRequestForm'
import { DataSubjectRights } from '@/types/gdpr'

// Mock file upload
const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

describe('DataRequestForm', () => {
  const mockProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png']
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders the main form with all required fields', () => {
      render(<DataRequestForm {...mockProps} />)
      
      expect(screen.getByText('Data Subject Request')).toBeInTheDocument()
      expect(screen.getByLabelText(/Request Type/)).toBeInTheDocument()
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Request Description/)).toBeInTheDocument()
    })

    it('sets initial request type when provided', () => {
      render(<DataRequestForm {...mockProps} initialType={DataSubjectRights.ERASURE} />)
      
      const requestTypeSelect = screen.getByDisplayValue(/Delete Your Data/)
      expect(requestTypeSelect).toBeInTheDocument()
    })

    it('shows cancel button when onCancel is provided', () => {
      render(<DataRequestForm {...mockProps} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('hides cancel button when onCancel is not provided', () => {
      render(<DataRequestForm onSubmit={mockProps.onSubmit} />)
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })
  })

  describe('Request Type Selection', () => {
    it('shows appropriate info for each request type', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      // Open select dropdown
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      // Select erasure request
      const erasureOption = screen.getByText('Delete Your Data')
      await user.click(erasureOption)
      
      // Check if erasure-specific info is displayed
      expect(screen.getByText(/permanently delete your data/)).toBeInTheDocument()
      expect(screen.getByText('Processing time: 30 days')).toBeInTheDocument()
    })

    it('updates request info when type changes', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      // Initially shows access request info
      expect(screen.getByText(/comprehensive export of all your personal data/)).toBeInTheDocument()
      
      // Change to portability request
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      const portabilityOption = screen.getByText('Port Your Data')
      await user.click(portabilityOption)
      
      // Should now show portability info
      expect(screen.getByText(/structured, machine-readable format for transfer/)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      // Should show validation errors
      expect(screen.getByText('First name is required')).toBeInTheDocument()
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const emailInput = screen.getByLabelText(/Email Address/)
      await user.type(emailInput, 'invalid-email')
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })

    it('validates description minimum length', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const descriptionInput = screen.getByLabelText(/Request Description/)
      await user.type(descriptionInput, 'too short')
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText(/minimum 20 characters/)).toBeInTheDocument()
    })

    it('validates phone number format', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const phoneInput = screen.getByLabelText(/Phone Number/)
      await user.type(phoneInput, 'abc123')
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument()
    })

    it('requires confirmation checkboxes', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      // Fill out valid form data
      await user.type(screen.getByLabelText(/First Name/), 'John')
      await user.type(screen.getByLabelText(/Last Name/), 'Doe')
      await user.type(screen.getByLabelText(/Email Address/), 'john@example.com')
      await user.type(screen.getByLabelText(/Request Description/), 'Please provide all my personal data for review')
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText('You must confirm your identity to proceed')).toBeInTheDocument()
      expect(screen.getByText(/You must consent to processing this request/)).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('allows file upload within size limits', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const fileInput = screen.getByLabelText(/Choose Files/)
      
      await user.upload(fileInput, mockFile)
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    it('rejects files exceeding size limit', async () => {
      const user = userEvent.setup()
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      })
      
      render(<DataRequestForm {...mockProps} />)
      
      const fileInput = screen.getByLabelText(/Choose Files/)
      await user.upload(fileInput, largeFile)
      
      expect(screen.getByText(/exceeds.*limit/)).toBeInTheDocument()
    })

    it('rejects files with disallowed types', async () => {
      const user = userEvent.setup()
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      render(<DataRequestForm {...mockProps} />)
      
      const fileInput = screen.getByLabelText(/Choose Files/)
      await user.upload(fileInput, textFile)
      
      expect(screen.getByText(/type not allowed/)).toBeInTheDocument()
    })

    it('allows removing uploaded files', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      // Upload file
      const fileInput = screen.getByLabelText(/Choose Files/)
      await user.upload(fileInput, mockFile)
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
      
      // Remove file
      const removeButton = screen.getByRole('button', { name: '' }) // X button
      await user.click(removeButton)
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
    })

    it('limits maximum number of files', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const files = Array.from({ length: 6 }, (_, i) => 
        new File(['test'], `test${i}.pdf`, { type: 'application/pdf' })
      )
      
      const fileInput = screen.getByLabelText(/Choose Files/)
      
      for (const file of files) {
        await user.upload(fileInput, file)
      }
      
      // Should only show first 5 files
      expect(screen.getByText('test0.pdf')).toBeInTheDocument()
      expect(screen.getByText('test4.pdf')).toBeInTheDocument()
      expect(screen.queryByText('test5.pdf')).not.toBeInTheDocument()
    })
  })

  describe('Confirmation Step', () => {
    const fillValidForm = async (user: any) => {
      await user.type(screen.getByLabelText(/First Name/), 'John')
      await user.type(screen.getByLabelText(/Last Name/), 'Doe')
      await user.type(screen.getByLabelText(/Email Address/), 'john@example.com')
      await user.type(screen.getByLabelText(/Phone Number/), '+1 555-123-4567')
      await user.type(screen.getByLabelText(/Request Description/), 'Please provide all my personal data for review and verification')
      
      // Check confirmation boxes
      const identityConfirm = screen.getByLabelText(/Identity Confirmation/)
      const consentConfirm = screen.getByLabelText(/Processing Consent/)
      await user.click(identityConfirm)
      await user.click(consentConfirm)
    }

    it('shows confirmation screen after valid form submission', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      await fillValidForm(user)
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText('Confirm Your Request')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1 555-123-4567')).toBeInTheDocument()
    })

    it('shows request details in confirmation', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      await fillValidForm(user)
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText('Access Your Data')).toBeInTheDocument()
      expect(screen.getByText('Processing time: 30 days')).toBeInTheDocument()
    })

    it('shows uploaded files in confirmation', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      // Upload file first
      const fileInput = screen.getByLabelText(/Choose Files/)
      await user.upload(fileInput, mockFile)
      
      await fillValidForm(user)
      
      const reviewButton = screen.getByText('Review Request')
      await user.click(reviewButton)
      
      expect(screen.getByText('Attached Documents')).toBeInTheDocument()
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    it('allows going back to form from confirmation', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      await fillValidForm(user)
      
      await user.click(screen.getByText('Review Request'))
      
      const backButton = screen.getByText('Back to Form')
      await user.click(backButton)
      
      expect(screen.getByText('Data Subject Request')).toBeInTheDocument()
      expect(screen.getByLabelText(/First Name/)).toHaveValue('John')
    })
  })

  describe('Final Submission', () => {
    const submitValidRequest = async (user: any) => {
      await user.type(screen.getByLabelText(/First Name/), 'John')
      await user.type(screen.getByLabelText(/Last Name/), 'Doe')  
      await user.type(screen.getByLabelText(/Email Address/), 'john@example.com')
      await user.type(screen.getByLabelText(/Request Description/), 'Please provide all my personal data for review and verification')
      
      const identityConfirm = screen.getByLabelText(/Identity Confirmation/)
      const consentConfirm = screen.getByLabelText(/Processing Consent/)
      await user.click(identityConfirm)
      await user.click(consentConfirm)
      
      await user.click(screen.getByText('Review Request'))
      await user.click(screen.getByText('Confirm & Submit'))
    }

    it('calls onSubmit with correct data structure', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      await submitValidRequest(user)
      
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: DataSubjectRights.ACCESS,
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            description: 'Please provide all my personal data for review and verification',
            status: 'pending'
          })
        )
      })
    })

    it('shows success screen after successful submission', async () => {
      const user = userEvent.setup()
      mockProps.onSubmit.mockResolvedValue(undefined)
      
      render(<DataRequestForm {...mockProps} />)
      
      await submitValidRequest(user)
      
      await waitFor(() => {
        expect(screen.getByText('Request Submitted')).toBeInTheDocument()
        expect(screen.getByText(/What happens next:/)).toBeInTheDocument()
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmission: () => void
      mockProps.onSubmit.mockImplementation(() => 
        new Promise(resolve => { resolveSubmission = resolve })
      )
      
      render(<DataRequestForm {...mockProps} />)
      
      await user.type(screen.getByLabelText(/First Name/), 'John')
      await user.type(screen.getByLabelText(/Last Name/), 'Doe')
      await user.type(screen.getByLabelText(/Email Address/), 'john@example.com')
      await user.type(screen.getByLabelText(/Request Description/), 'Please provide all my personal data')
      
      const identityConfirm = screen.getByLabelText(/Identity Confirmation/)
      const consentConfirm = screen.getByLabelText(/Processing Consent/)
      await user.click(identityConfirm)
      await user.click(consentConfirm)
      
      await user.click(screen.getByText('Review Request'))
      await user.click(screen.getByText('Confirm & Submit'))
      
      expect(screen.getByText('Submitting...')).toBeInTheDocument()
      
      // Resolve the submission
      resolveSubmission!()
    })

    it('handles submission errors', async () => {
      const user = userEvent.setup()
      mockProps.onSubmit.mockRejectedValue(new Error('Network error'))
      
      render(<DataRequestForm {...mockProps} />)
      
      await submitValidRequest(user)
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<DataRequestForm {...mockProps} />)
      
      const emailInput = screen.getByLabelText(/Email Address/)
      expect(emailInput).toHaveAttribute('aria-describedby')
      
      const description = screen.getByText(/We'll use this to verify your identity/)
      expect(description).toBeInTheDocument()
    })

    it('has proper form structure with fieldsets and legends', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const identityFieldset = screen.getByText(/Identity Confirmation/).closest('div[role="checkbox"]')
      expect(identityFieldset).toBeInTheDocument()
    })

    it('manages focus properly during navigation', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const firstNameInput = screen.getByLabelText(/First Name/)
      firstNameInput.focus()
      
      expect(document.activeElement).toBe(firstNameInput)
    })
  })

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} />)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(mockProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('Props Handling', () => {
    it('applies custom className', () => {
      render(<DataRequestForm {...mockProps} className="custom-class" />)
      
      const form = screen.getByText('Data Subject Request').closest('.custom-class')
      expect(form).toBeInTheDocument()
    })

    it('respects custom file size limits', async () => {
      const user = userEvent.setup()
      const smallLimit = 1024 // 1KB
      render(<DataRequestForm {...mockProps} maxFileSize={smallLimit} />)
      
      const fileInput = screen.getByLabelText(/Choose Files/)
      await user.upload(fileInput, mockFile)
      
      expect(screen.getByText(/exceeds.*1KB.*limit/)).toBeInTheDocument()
    })

    it('respects custom allowed file types', async () => {
      const user = userEvent.setup()
      render(<DataRequestForm {...mockProps} allowedFileTypes={['image/jpeg']} />)
      
      const fileInput = screen.getByLabelText(/Choose Files/)
      await user.upload(fileInput, mockFile) // PDF file
      
      expect(screen.getByText(/type not allowed/)).toBeInTheDocument()
    })
  })
})