import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/utils/supabase/client'
import SSOLoginInterface from '@/components/auth/enterprise/SSOLoginInterface'

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    functions: {
      invoke: vi.fn()
    }
  }))
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn()
  }))
}))

const mockSupabase = createClient() as any

describe('SSOLoginInterface', () => {
  const defaultProps = {
    redirectTo: '/dashboard',
    organizationId: 'org-123'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders enterprise login interface', () => {
    render(<SSOLoginInterface {...defaultProps} />)
    
    expect(screen.getByText('Enterprise Login')).toBeInTheDocument()
    expect(screen.getByText('Sign in with your organization\'s SSO provider')).toBeInTheDocument()
    expect(screen.getByLabelText('Work Email Address')).toBeInTheDocument()
  })

  it('detects provider from email domain', async () => {
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@outlook.com' } })
    
    await waitFor(() => {
      expect(screen.getByText('Detected Provider')).toBeInTheDocument()
      expect(screen.getByText('Microsoft Azure AD')).toBeInTheDocument()
    })
  })

  it('handles SSO authentication with OAuth provider', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null })
    
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@gmail.com' } })
    
    await waitFor(() => {
      const ssoButton = screen.getByText(/Sign in with Google Workspace/)
      fireEvent.click(ssoButton)
    })
    
    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/dashboard',
        queryParams: {
          email: 'user@gmail.com',
          organization_id: 'org-123'
        }
      }
    })
  })

  it('handles SAML/OIDC provider redirect', async () => {
    // Mock window.location.href setter
    delete (window as any).location
    window.location = { href: '' } as any
    
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@company.com' } })
    
    // Mock a SAML provider detection
    const mockProviders = [
      {
        id: 'okta',
        name: 'Okta',
        type: 'saml',
        domains: ['company.com'],
        enabled: true
      }
    ]
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockProviders, error: null }))
        }))
      }))
    })
    
    // Re-render to trigger provider loading
    render(<SSOLoginInterface {...defaultProps} />)
    
    fireEvent.change(emailInput, { target: { value: 'user@company.com' } })
    
    await waitFor(() => {
      const ssoButton = screen.getByText(/Sign in with Okta/)
      fireEvent.click(ssoButton)
    })
    
    expect(window.location.href).toContain('/api/auth/sso/okta')
  })

  it('handles email magic link fallback', async () => {
    mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null })
    
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    
    await waitFor(() => {
      const magicLinkButton = screen.getByText('Send Magic Link')
      fireEvent.click(magicLinkButton)
    })
    
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/dashboard',
        data: {
          organization_id: 'org-123'
        }
      }
    })
  })

  it('shows manual provider selection', async () => {
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@unknown-domain.com' } })
    
    await waitFor(() => {
      const manualButton = screen.getByText('Choose SSO Provider Manually')
      fireEvent.click(manualButton)
      
      expect(screen.getByText('Choose your SSO provider:')).toBeInTheDocument()
    })
  })

  it('displays wedding industry context', () => {
    render(<SSOLoginInterface {...defaultProps} />)
    
    expect(screen.getByText('🎊 Secure access for wedding vendor teams')).toBeInTheDocument()
    expect(screen.getByText('Enterprise-grade authentication for your wedding business')).toBeInTheDocument()
  })

  it('handles authentication errors', async () => {
    const error = new Error('Authentication failed')
    mockSupabase.auth.signInWithOAuth.mockRejectedValue(error)
    
    const onError = vi.fn()
    render(<SSOLoginInterface {...defaultProps} onError={onError} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@gmail.com' } })
    
    await waitFor(() => {
      const ssoButton = screen.getByText(/Sign in with Google Workspace/)
      fireEvent.click(ssoButton)
    })
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Authentication failed')
    })
  })

  it('calls success callback on successful authentication', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null })
    
    const onSuccess = vi.fn()
    render(<SSOLoginInterface {...defaultProps} onSuccess={onSuccess} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@gmail.com' } })
    
    await waitFor(() => {
      const ssoButton = screen.getByText(/Sign in with Google Workspace/)
      fireEvent.click(ssoButton)
    })
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('disables form during loading state', async () => {
    mockSupabase.auth.signInWithOAuth.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'user@gmail.com' } })
    
    await waitFor(() => {
      const ssoButton = screen.getByText(/Sign in with Google Workspace/)
      fireEvent.click(ssoButton)
    })
    
    // Check that input is disabled during loading
    expect(emailInput).toBeDisabled()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    }, { timeout: 200 })
  })

  it('validates email format', () => {
    render(<SSOLoginInterface {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Work Email Address')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    // Magic link button should be disabled for invalid email
    const magicLinkButton = screen.queryByText('Send Magic Link')
    if (magicLinkButton) {
      expect(magicLinkButton).toBeDisabled()
    }
  })
})