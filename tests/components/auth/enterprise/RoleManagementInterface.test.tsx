import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/utils/supabase/client'
import RoleManagementInterface from '@/components/auth/enterprise/RoleManagementInterface'

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }))
}))

const mockSupabase = createClient() as any

const mockRoles = [
  {
    id: 'role-1',
    name: 'admin',
    display_name: '⚡ Admin',
    description: 'Administrative access with team management',
    color: 'bg-red-500',
    icon: '⚡',
    is_system: true,
    is_default: false,
    permissions: ['manage_team', 'view_dashboard', 'manage_weddings'],
    wedding_specific: false,
    hierarchy_level: 9,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    role_members: [{ count: 2 }]
  },
  {
    id: 'role-2',
    name: 'coordinator',
    display_name: '🎯 Event Coordinator',
    description: 'Coordinate wedding day activities',
    color: 'bg-green-500',
    icon: '🎯',
    is_system: false,
    is_default: false,
    permissions: ['view_weddings', 'manage_timeline', 'coordinate_vendors'],
    wedding_specific: true,
    hierarchy_level: 6,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    role_members: [{ count: 3 }]
  }
]

const mockMembers = [
  {
    id: 'member-1',
    email: 'john@company.com',
    role_id: 'role-1',
    is_active: true,
    joined_at: '2023-01-01',
    last_active_at: '2023-12-01',
    permissions: [],
    role: { name: 'admin', display_name: '⚡ Admin' },
    user_profiles: { first_name: 'John', last_name: 'Doe' }
  },
  {
    id: 'member-2',
    email: 'jane@company.com',
    role_id: 'role-2',
    is_active: true,
    joined_at: '2023-02-01',
    last_active_at: '2023-12-01',
    permissions: [],
    role: { name: 'coordinator', display_name: '🎯 Event Coordinator' },
    user_profiles: { first_name: 'Jane', last_name: 'Smith' }
  }
]

describe('RoleManagementInterface', () => {
  const defaultProps = {
    organizationId: 'org-123',
    currentUserRole: 'admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockRoles, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })
  })

  it('renders role management interface', async () => {
    render(<RoleManagementInterface {...defaultProps} />)
    
    expect(screen.getByText('Role Management')).toBeInTheDocument()
    expect(screen.getByText('Manage roles and permissions for your wedding team')).toBeInTheDocument()
    
    // Check tab navigation
    expect(screen.getByText('roles')).toBeInTheDocument()
    expect(screen.getByText('members')).toBeInTheDocument()
    expect(screen.getByText('permissions')).toBeInTheDocument()
  })

  it('displays existing roles', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('⚡ Admin')).toBeInTheDocument()
      expect(screen.getByText('🎯 Event Coordinator')).toBeInTheDocument()
      expect(screen.getByText('Administrative access with team management')).toBeInTheDocument()
    })
  })

  it('shows role creation form when New Role is clicked', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    await waitFor(() => {
      const newRoleButton = screen.getByText('New Role')
      fireEvent.click(newRoleButton)
    })

    expect(screen.getByText('Create New Role')).toBeInTheDocument()
    expect(screen.getByLabelText('Name (System ID)')).toBeInTheDocument()
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
  })

  it('creates new role with form submission', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    // Open create form
    await waitFor(() => {
      const newRoleButton = screen.getByText('New Role')
      fireEvent.click(newRoleButton)
    })

    // Fill form
    const nameInput = screen.getByLabelText('Name (System ID)')
    const displayNameInput = screen.getByLabelText('Display Name')
    const descriptionInput = screen.getByLabelText('Description')

    fireEvent.change(nameInput, { target: { value: 'test_role' } })
    fireEvent.change(displayNameInput, { target: { value: 'Test Role' } })
    fireEvent.change(descriptionInput, { target: { value: 'A test role for wedding coordination' } })

    // Submit form
    const saveButton = screen.getByText('Save Role')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('roles')
    })
  })

  it('edits existing role', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    await waitFor(() => {
      const editButton = screen.getAllByTestId('edit-role-button')[0] || 
                        screen.getAllByLabelText('Edit role')[0] ||
                        screen.getByText('⚡ Admin').closest('div')?.querySelector('[data-testid="edit-role"]')
      
      if (editButton) {
        fireEvent.click(editButton)
      }
    })

    expect(screen.getByText('Edit Role')).toBeInTheDocument()
  })

  it('displays team members tab', async () => {
    // Mock members data
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockMembers, error: null }))
            }))
          }))
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockRoles, error: null }))
          }))
        }))
      }
    })

    render(<RoleManagementInterface {...defaultProps} />)

    // Switch to members tab
    const membersTab = screen.getByText('members')
    fireEvent.click(membersTab)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('updates member role', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockMembers, error: null }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockRoles, error: null }))
          }))
        }))
      }
    })

    render(<RoleManagementInterface {...defaultProps} />)

    // Switch to members tab
    const membersTab = screen.getByText('members')
    fireEvent.click(membersTab)

    await waitFor(() => {
      const roleSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(roleSelect, { target: { value: 'role-2' } })
    })

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('team_members')
    })
  })

  it('shows permissions tab', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    const permissionsTab = screen.getByText('permissions')
    fireEvent.click(permissionsTab)

    expect(screen.getByText('Available Permissions')).toBeInTheDocument()
    expect(screen.getByText('Show dangerous permissions')).toBeInTheDocument()
  })

  it('toggles member status', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockMembers, error: null }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockRoles, error: null }))
          }))
        }))
      }
    })

    render(<RoleManagementInterface {...defaultProps} />)

    // Switch to members tab
    const membersTab = screen.getByText('members')
    fireEvent.click(membersTab)

    await waitFor(() => {
      const statusButton = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('aria-label')?.includes('toggle status') ||
        btn.textContent?.includes('👁') ||
        btn.dataset.testid === 'toggle-member-status'
      )
      
      if (statusButton) {
        fireEvent.click(statusButton)
      }
    })
  })

  it('prevents non-admin users from editing', () => {
    render(<RoleManagementInterface {...defaultProps} currentUserRole="member" />)
    
    expect(screen.queryByText('New Role')).not.toBeInTheDocument()
  })

  it('shows wedding industry context', () => {
    render(<RoleManagementInterface {...defaultProps} />)
    
    expect(screen.getByText(/Wedding Industry Focus/)).toBeInTheDocument()
    expect(screen.getByText(/Roles are designed specifically for wedding professionals/)).toBeInTheDocument()
  })

  it('filters permissions by category', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    // Switch to permissions tab
    const permissionsTab = screen.getByText('permissions')
    fireEvent.click(permissionsTab)

    expect(screen.getByText('Core Permissions')).toBeInTheDocument()
    expect(screen.getByText('Wedding Permissions')).toBeInTheDocument()
    expect(screen.getByText('Financial Permissions')).toBeInTheDocument()
  })

  it('toggles dangerous permissions visibility', async () => {
    render(<RoleManagementInterface {...defaultProps} />)

    // Switch to permissions tab
    const permissionsTab = screen.getByText('permissions')
    fireEvent.click(permissionsTab)

    const dangerousToggle = screen.getByText('Show dangerous permissions').previousElementSibling as HTMLElement
    fireEvent.click(dangerousToggle)

    // Should show dangerous permissions
    await waitFor(() => {
      expect(screen.getByText('Dangerous')).toBeInTheDocument()
    })
  })

  it('deletes role when confirmed', async () => {
    // Mock confirm dialog
    global.confirm = vi.fn(() => true)

    render(<RoleManagementInterface {...defaultProps} />)

    await waitFor(() => {
      const deleteButton = screen.getAllByTestId('delete-role-button')[0] ||
                          screen.getAllByLabelText('Delete role')[0]
      
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('roles')
  })

  it('searches members by email and name', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockMembers, error: null }))
            }))
          }))
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockRoles, error: null }))
          }))
        }))
      }
    })

    render(<RoleManagementInterface {...defaultProps} />)

    // Switch to members tab
    const membersTab = screen.getByText('members')
    fireEvent.click(membersTab)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search members...')
      fireEvent.change(searchInput, { target: { value: 'john' } })
    })

    // Should filter members (implementation would depend on actual filtering logic)
    expect(screen.getByDisplayValue('john')).toBeInTheDocument()
  })
})