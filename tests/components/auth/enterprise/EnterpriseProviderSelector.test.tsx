import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/utils/supabase/client'
import EnterpriseProviderSelector from '@/components/auth/enterprise/EnterpriseProviderSelector'

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockProvider, error: null }))
        }))
      }))
    }))
  }))
}))

const mockProvider = {
  id: 'provider-1',
  name: 'Microsoft Azure AD',
  type: 'oidc',
  enabled: true,
  metadata: {},
  allowed_domains: ['company.com'],
  auto_provisioning: false,
  attribute_mapping: {
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    groups: 'groups'
  },
  default_role: 'member',
  allowed_groups: []
}

const mockSupabase = createClient() as any

describe('EnterpriseProviderSelector', () => {
  const defaultProps = {
    organizationId: 'org-123'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders provider selector interface', () => {
    render(<EnterpriseProviderSelector {...defaultProps} />)
    
    expect(screen.getByText('SSO Providers')).toBeInTheDocument()
    expect(screen.getByText('Manage enterprise authentication providers for your wedding business')).toBeInTheDocument()
    expect(screen.getByText('Add Provider')).toBeInTheDocument()
  })

  it('displays existing providers', async () => {
    const mockProviders = [
      {
        id: 'provider-1',
        name: 'Microsoft Azure AD',
        type: 'oidc',
        enabled: true,
        metadata: {},
        allowed_domains: ['company.com'],
        sso_provider_stats: [{ user_count: 25, last_sync: '2023-01-01' }],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockProviders, error: null }))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Microsoft Azure AD')).toBeInTheDocument()
      expect(screen.getByText('OIDC')).toBeInTheDocument()
      expect(screen.getByText('25 users authenticated')).toBeInTheDocument()
    })
  })

  it('handles provider selection', async () => {
    const onProviderSelect = vi.fn()
    const mockProviders = [
      {
        id: 'provider-1',
        name: 'Microsoft Azure AD',
        type: 'oidc',
        enabled: true,
        metadata: {},
        allowed_domains: ['company.com'],
        sso_provider_stats: [{ user_count: 25, last_sync: '2023-01-01' }],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockProviders, error: null }))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} onProviderSelect={onProviderSelect} />)

    await waitFor(() => {
      const providerCard = screen.getByText('Microsoft Azure AD').closest('[role="button"], .cursor-pointer, [data-testid="provider-card"]') || 
                           screen.getByText('Microsoft Azure AD').closest('div')
      if (providerCard) {
        fireEvent.click(providerCard)
      }
    })

    await waitFor(() => {
      expect(onProviderSelect).toHaveBeenCalled()
    })
  })

  it('creates new provider', async () => {
    render(<EnterpriseProviderSelector {...defaultProps} />)

    // Click Add Provider button
    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add New SSO Provider')).toBeInTheDocument()
    })

    // Select provider type
    const select = screen.getByRole('combobox')
    fireEvent.click(select)

    // Create provider
    const createButton = screen.getByText('Create Provider')
    fireEvent.click(createButton)

    expect(mockSupabase.from).toHaveBeenCalledWith('sso_providers')
  })

  it('shows configure button for existing providers', async () => {
    const onProviderConfigure = vi.fn()
    const mockProviders = [
      {
        id: 'provider-1',
        name: 'Microsoft Azure AD',
        type: 'oidc',
        enabled: true,
        metadata: {},
        allowed_domains: ['company.com'],
        sso_provider_stats: [{ user_count: 25, last_sync: '2023-01-01' }],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockProviders, error: null }))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} onProviderConfigure={onProviderConfigure} />)

    await waitFor(() => {
      const configureButton = screen.getByText('Configure')
      fireEvent.click(configureButton)

      expect(onProviderConfigure).toHaveBeenCalled()
    })
  })

  it('displays provider status badges correctly', async () => {
    const mockProviders = [
      {
        id: 'provider-1',
        name: 'Active Provider',
        type: 'oidc',
        enabled: true,
        metadata: {},
        allowed_domains: ['company.com'],
        sso_provider_stats: [{ user_count: 25, last_sync: '2023-01-01' }],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      {
        id: 'provider-2',
        name: 'Disabled Provider',
        type: 'saml',
        enabled: false,
        metadata: {},
        allowed_domains: ['other.com'],
        sso_provider_stats: [{ user_count: 0, last_sync: null }],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockProviders, error: null }))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  it('shows empty state when no providers exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No SSO Providers Configured')).toBeInTheDocument()
      expect(screen.getByText('Set up enterprise authentication for your wedding vendor team')).toBeInTheDocument()
    })
  })

  it('opens test login in new tab', async () => {
    // Mock window.open
    const mockOpen = vi.fn()
    global.window.open = mockOpen

    const mockProviders = [
      {
        id: 'provider-1',
        name: 'Microsoft Azure AD',
        type: 'oidc',
        enabled: true,
        metadata: {},
        allowed_domains: ['company.com'],
        sso_provider_stats: [{ user_count: 25, last_sync: '2023-01-01' }],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockProviders, error: null }))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} />)

    await waitFor(() => {
      const testButton = screen.getByText('Test')
      fireEvent.click(testButton)

      expect(mockOpen).toHaveBeenCalledWith('/auth/sso/test/provider-1', '_blank')
    })
  })

  it('displays wedding industry context', async () => {
    render(<EnterpriseProviderSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Wedding Business Tip/)).toBeInTheDocument()
      expect(screen.getByText(/Most wedding venues and suppliers use Microsoft or Google/)).toBeInTheDocument()
    })
  })

  it('handles readonly mode', () => {
    render(<EnterpriseProviderSelector {...defaultProps} readonly={true} />)
    
    expect(screen.queryByText('Add Provider')).not.toBeInTheDocument()
    expect(screen.queryByText('Configure')).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    // Mock a delayed response
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => new Promise(resolve => 
            setTimeout(() => resolve({ data: [], error: null }), 100)
          ))
        }))
      }))
    })

    render(<EnterpriseProviderSelector {...defaultProps} />)

    // Should show loading spinner
    expect(screen.getByRole('status') || screen.getByTestId('loading')).toBeInTheDocument()
  })
})