/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createClient } from '@supabase/supabase-js'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn()
  }
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HeartIcon: () => <div data-testid="heart-icon">Heart Icon</div>,
  CheckCircleIcon: () => <div data-testid="check-circle-icon">Check Circle Icon</div>,
  EyeIcon: () => <div data-testid="eye-icon">Eye Icon</div>,
  EyeSlashIcon: () => <div data-testid="eye-slash-icon">Eye Slash Icon</div>,
  ExclamationTriangleIcon: () => <div data-testid="exclamation-triangle-icon">Exclamation Triangle Icon</div>,
}))

describe('ForgotPasswordForm', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true
    })
  })

  it('renders forgot password form correctly', () => {
    render(<ForgotPasswordForm />)
    
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    expect(screen.getByText('Enter your email to reset your password')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument()
    expect(screen.getByText('Remember your password? Sign in')).toBeInTheDocument()
  })

  it('validates email field is required', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)
    
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('validates proper email format', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('submits form with valid email', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    
    render(<ForgotPasswordForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'http://localhost:3000/reset-password' }
      )
    })
  })

  it('shows success state after successful submission', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    
    render(<ForgotPasswordForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument()
      expect(screen.getByText("We've sent a password reset link to your email")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try another email' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeInTheDocument()
    })
  })

  it('handles Supabase errors correctly', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email not found'
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ 
      error: { message: errorMessage } 
    })
    
    render(<ForgotPasswordForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.resetPasswordForEmail.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    render(<ForgotPasswordForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: 'Sending reset link...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sending reset link...' })).toBeDisabled()
  })

  it('allows user to try another email from success state', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    
    render(<ForgotPasswordForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Send reset link' })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument()
    })
    
    const tryAnotherEmailButton = screen.getByRole('button', { name: 'Try another email' })
    await user.click(tryAnotherEmailButton)
    
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })
})

describe('ResetPasswordForm', () => {
  const mockPush = jest.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  it('renders reset password form correctly with valid token', () => {
    mockSearchParams.set('token', 'valid-token')
    
    render(<ResetPasswordForm />)
    
    expect(screen.getByText('Reset your password')).toBeInTheDocument()
    expect(screen.getByText('Enter your new password below')).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument()
  })

  it('shows invalid token message when no token provided', () => {
    mockSearchParams.delete('token')
    
    render(<ResetPasswordForm />)
    
    expect(screen.getByText('Invalid reset link')).toBeInTheDocument()
    expect(screen.getByText('This password reset link is invalid or has expired')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request new reset link' })).toBeInTheDocument()
  })

  it('validates password requirements', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    const submitButton = screen.getByRole('button', { name: 'Update password' })
    
    await user.type(passwordInput, 'weak')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    const confirmPasswordInput = screen.getByLabelText('Confirm new password')
    const submitButton = screen.getByRole('button', { name: 'Update password' })
    
    await user.type(passwordInput, 'StrongP@ssw0rd123')
    await user.type(confirmPasswordInput, 'DifferentP@ssw0rd123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    })
  })

  it('shows password strength indicator', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    
    // Test weak password
    await user.type(passwordInput, 'weak')
    await waitFor(() => {
      expect(screen.getByText('Weak password')).toBeInTheDocument()
    })
    
    // Clear and test strong password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'StrongP@ssw0rd123')
    await waitFor(() => {
      expect(screen.getByText('Strong password')).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    const eyeButton = screen.getAllByRole('button')[1] // Eye button for password field
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(eyeButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(eyeButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('submits form with valid passwords', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null })
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    const confirmPasswordInput = screen.getByLabelText('Confirm new password')
    const submitButton = screen.getByRole('button', { name: 'Update password' })
    
    const newPassword = 'StrongP@ssw0rd123'
    
    await user.type(passwordInput, newPassword)
    await user.type(confirmPasswordInput, newPassword)
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword
      })
      expect(mockPush).toHaveBeenCalledWith('/login?message=Password updated successfully')
    })
  })

  it('handles Supabase errors correctly', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    const errorMessage = 'Token has expired'
    mockSupabase.auth.updateUser.mockResolvedValue({ 
      error: { message: errorMessage } 
    })
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    const confirmPasswordInput = screen.getByLabelText('Confirm new password')
    const submitButton = screen.getByRole('button', { name: 'Update password' })
    
    const newPassword = 'StrongP@ssw0rd123'
    
    await user.type(passwordInput, newPassword)
    await user.type(confirmPasswordInput, newPassword)
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('token', 'valid-token')
    mockSupabase.auth.updateUser.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    render(<ResetPasswordForm />)
    
    const passwordInput = screen.getByLabelText('New password')
    const confirmPasswordInput = screen.getByLabelText('Confirm new password')
    const submitButton = screen.getByRole('button', { name: 'Update password' })
    
    const newPassword = 'StrongP@ssw0rd123'
    
    await user.type(passwordInput, newPassword)
    await user.type(confirmPasswordInput, newPassword)
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: 'Updating password...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Updating password...' })).toBeDisabled()
  })

  it('displays password requirements help text', () => {
    mockSearchParams.set('token', 'valid-token')
    
    render(<ResetPasswordForm />)
    
    expect(screen.getByText('Password requirements:')).toBeInTheDocument()
    expect(screen.getByText('At least 8 characters long')).toBeInTheDocument()
    expect(screen.getByText('Contains uppercase and lowercase letters')).toBeInTheDocument()
    expect(screen.getByText('Contains at least one number')).toBeInTheDocument()
    expect(screen.getByText('Contains at least one special character')).toBeInTheDocument()
  })
})

describe('Password Reset Integration', () => {
  it('navigates correctly between forgot password and reset password flows', () => {
    // This would be covered by E2E tests, but we can test navigation calls
    const mockPush = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    
    render(<ForgotPasswordForm />)
    
    const backToSignInLink = screen.getByText('Remember your password? Sign in')
    fireEvent.click(backToSignInLink)
    
    // Link should navigate to /login
    expect(backToSignInLink.closest('a')).toHaveAttribute('href', '/login')
  })
})

// Test password strength calculation utility
describe('Password Strength Calculation', () => {
  const testPasswords = [
    { password: 'weak', expectedStrength: 'weak' },
    { password: 'WeakPass', expectedStrength: 'fair' },
    { password: 'WeakPass1', expectedStrength: 'good' },
    { password: 'StrongP@ss1', expectedStrength: 'strong' },
    { password: 'VeryStr0ng!Pass', expectedStrength: 'strong' }
  ]

  testPasswords.forEach(({ password, expectedStrength }) => {
    it(`correctly calculates strength for "${password}" as ${expectedStrength}`, async () => {
      const user = userEvent.setup()
      const mockSearchParams = new URLSearchParams()
      mockSearchParams.set('token', 'valid-token')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
      
      render(<ResetPasswordForm />)
      
      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, password)
      
      if (password.length > 0) {
        await waitFor(() => {
          const strengthText = expectedStrength.charAt(0).toUpperCase() + expectedStrength.slice(1)
          expect(screen.getByText(`${strengthText} password`)).toBeInTheDocument()
        })
      }
    })
  })
})