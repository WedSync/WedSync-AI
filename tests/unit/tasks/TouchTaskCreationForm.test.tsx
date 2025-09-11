/**
 * Unit Tests for TouchTaskCreationForm
 * >80% coverage requirement
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TouchTaskCreationForm } from '@/components/tasks/mobile/TouchTaskCreationForm'
import '@testing-library/jest-dom'

// Mock touch components
jest.mock('@/components/touch', () => ({
  TouchInput: ({ children, ...props }: any) => <input {...props}>{children}</input>,
  TouchTextarea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
  TouchSelect: ({ children, ...props }: any) => <select {...props}>{children}</select>
}))

// Mock haptic feedback
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  configurable: true
})

describe('TouchTaskCreationForm', () => {
  const mockOnTaskCreate = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields correctly', () => {
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('handles form input changes correctly', async () => {
    const user = userEvent.setup()
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    const titleInput = screen.getByLabelText(/task title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(titleInput, 'Test Wedding Task')
    await user.type(descriptionInput, 'This is a test task description')
    
    expect(titleInput).toHaveValue('Test Wedding Task')
    expect(descriptionInput).toHaveValue('This is a test task description')
  })

  it('handles priority selection with haptic feedback', async () => {
    const user = userEvent.setup()
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    const highPriorityButton = screen.getByRole('button', { name: /high/i })
    await user.click(highPriorityButton)
    
    expect(highPriorityButton).toHaveClass('border-primary-600')
    expect(navigator.vibrate).toHaveBeenCalledWith(30)
  })

  it('validates required fields on submit', async () => {
    const user = userEvent.setup()
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    const submitButton = screen.getByRole('button', { name: /create task/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
    
    expect(mockOnTaskCreate).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockOnTaskCreate.mockResolvedValue({ success: true })
    
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    // Fill form
    await user.type(screen.getByLabelText(/task title/i), 'Wedding Photography')
    await user.type(screen.getByLabelText(/description/i), 'Book wedding photographer')
    await user.click(screen.getByRole('button', { name: /high/i }))
    await user.selectOptions(screen.getByLabelText(/category/i), 'planning')
    
    const submitButton = screen.getByRole('button', { name: /create task/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnTaskCreate).toHaveBeenCalledWith({
        title: 'Wedding Photography',
        description: 'Book wedding photographer',
        priority: 'high',
        category: 'planning',
        attachments: []
      })
    })
    
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]) // Success haptic
  })

  it('handles form submission errors', async () => {
    const user = userEvent.setup()
    mockOnTaskCreate.mockRejectedValue(new Error('Network error'))
    
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    await user.type(screen.getByLabelText(/task title/i), 'Test Task')
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create task/i)).toBeInTheDocument()
    })
    
    expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200]) // Error haptic
  })

  it('displays offline indicator when offline', () => {
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} isOffline={true} />)
    
    expect(screen.getByText(/working offline/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save offline/i })).toBeInTheDocument()
  })

  it('handles cancel button correctly', async () => {
    const user = userEvent.setup()
    render(
      <TouchTaskCreationForm 
        onTaskCreate={mockOnTaskCreate} 
        onCancel={mockOnCancel} 
      />
    )
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockOnTaskCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    await user.type(screen.getByLabelText(/task title/i), 'Test Task')
    const submitButton = screen.getByRole('button', { name: /create task/i })
    
    await user.click(submitButton)
    
    expect(screen.getByText(/creating/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    mockOnTaskCreate.mockResolvedValue({ success: true })
    
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    const titleInput = screen.getByLabelText(/task title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(titleInput, 'Test Task')
    await user.type(descriptionInput, 'Test Description')
    await user.click(screen.getByRole('button', { name: /create task/i }))
    
    await waitFor(() => {
      expect(titleInput).toHaveValue('')
      expect(descriptionInput).toHaveValue('')
    })
  })

  it('handles due date input correctly', async () => {
    const user = userEvent.setup()
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    const dueDateInput = screen.getByLabelText(/due date/i)
    await user.type(dueDateInput, '2024-12-25')
    
    expect(dueDateInput).toHaveValue('2024-12-25')
  })

  it('maintains touch-friendly button sizes', () => {
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button)
      const minHeight = parseInt(styles.minHeight)
      expect(minHeight).toBeGreaterThanOrEqual(44) // WCAG requirement
    })
  })

  it('applies correct ARIA labels for accessibility', () => {
    render(<TouchTaskCreationForm onTaskCreate={mockOnTaskCreate} />)
    
    expect(screen.getByLabelText(/task title/i)).toHaveAttribute('required')
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })
})