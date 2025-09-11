'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  Shield,
  Settings,
  Crown,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Plus,
  Save,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Permission {
  id: string;
  name: string;
  description: string;
  category:
    | 'core'
    | 'wedding'
    | 'financial'
    | 'content'
    | 'integrations'
    | 'analytics';
  dangerous: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  isSystem: boolean;
  isDefault: boolean;
  permissions: string[];
  userCount: number;
  weddingSpecific: boolean;
  hierarchyLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  lastActiveAt?: Date;
  joinedAt: Date;
  permissions: string[];
}

const roleSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z_]+$/, 'Use lowercase letters and underscores only'),
  displayName: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
  color: z.string().min(3).max(20),
  icon: z.string().min(1).max(10),
  permissions: z.array(z.string()),
  weddingSpecific: z.boolean(),
  hierarchyLevel: z.number().min(1).max(10),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleManagementInterfaceProps {
  organizationId: string;
  currentUserRole?: string;
  onRoleUpdated?: (role: Role) => void;
  onMemberUpdated?: (member: TeamMember) => void;
}

// Default wedding industry permissions
const defaultPermissions: Permission[] = [
  // Core permissions
  {
    id: 'read_dashboard',
    name: 'View Dashboard',
    description: 'Access main dashboard',
    category: 'core',
    dangerous: false,
  },
  {
    id: 'manage_profile',
    name: 'Manage Profile',
    description: 'Edit own profile settings',
    category: 'core',
    dangerous: false,
  },
  {
    id: 'view_team',
    name: 'View Team',
    description: 'See team members list',
    category: 'core',
    dangerous: false,
  },
  {
    id: 'invite_members',
    name: 'Invite Members',
    description: 'Send team invitations',
    category: 'core',
    dangerous: false,
  },
  {
    id: 'manage_team',
    name: 'Manage Team',
    description: 'Edit team member roles',
    category: 'core',
    dangerous: true,
  },
  {
    id: 'delete_members',
    name: 'Remove Members',
    description: 'Remove team members',
    category: 'core',
    dangerous: true,
  },

  // Wedding-specific permissions
  {
    id: 'view_weddings',
    name: 'View Weddings',
    description: 'Access wedding information',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'create_weddings',
    name: 'Create Weddings',
    description: 'Add new wedding projects',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'edit_weddings',
    name: 'Edit Weddings',
    description: 'Modify wedding details',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'delete_weddings',
    name: 'Delete Weddings',
    description: 'Remove wedding projects',
    category: 'wedding',
    dangerous: true,
  },
  {
    id: 'manage_timeline',
    name: 'Manage Timeline',
    description: 'Edit wedding timeline',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'view_guests',
    name: 'View Guest Lists',
    description: 'Access guest information',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'edit_guests',
    name: 'Edit Guest Lists',
    description: 'Modify guest information',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'manage_vendors',
    name: 'Manage Vendors',
    description: 'Add/edit wedding vendors',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'access_photos',
    name: 'Access Photos',
    description: 'View wedding photo galleries',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'upload_photos',
    name: 'Upload Photos',
    description: 'Add photos to galleries',
    category: 'wedding',
    dangerous: false,
  },
  {
    id: 'share_galleries',
    name: 'Share Galleries',
    description: 'Share photo galleries with clients',
    category: 'wedding',
    dangerous: false,
  },

  // Financial permissions
  {
    id: 'view_payments',
    name: 'View Payments',
    description: 'See payment information',
    category: 'financial',
    dangerous: false,
  },
  {
    id: 'manage_invoices',
    name: 'Manage Invoices',
    description: 'Create and edit invoices',
    category: 'financial',
    dangerous: false,
  },
  {
    id: 'process_payments',
    name: 'Process Payments',
    description: 'Handle payment transactions',
    category: 'financial',
    dangerous: true,
  },
  {
    id: 'view_analytics',
    name: 'View Analytics',
    description: 'Access financial reports',
    category: 'financial',
    dangerous: false,
  },
  {
    id: 'export_financial',
    name: 'Export Financial Data',
    description: 'Download financial reports',
    category: 'financial',
    dangerous: false,
  },

  // Content permissions
  {
    id: 'manage_forms',
    name: 'Manage Forms',
    description: 'Create and edit forms',
    category: 'content',
    dangerous: false,
  },
  {
    id: 'manage_templates',
    name: 'Manage Templates',
    description: 'Edit email templates',
    category: 'content',
    dangerous: false,
  },
  {
    id: 'manage_branding',
    name: 'Manage Branding',
    description: 'Update company branding',
    category: 'content',
    dangerous: false,
  },
  {
    id: 'manage_website',
    name: 'Manage Website',
    description: 'Edit wedding websites',
    category: 'content',
    dangerous: false,
  },

  // Integration permissions
  {
    id: 'view_integrations',
    name: 'View Integrations',
    description: 'See connected services',
    category: 'integrations',
    dangerous: false,
  },
  {
    id: 'manage_integrations',
    name: 'Manage Integrations',
    description: 'Configure integrations',
    category: 'integrations',
    dangerous: true,
  },
  {
    id: 'access_api',
    name: 'API Access',
    description: 'Use API endpoints',
    category: 'integrations',
    dangerous: true,
  },

  // Analytics permissions
  {
    id: 'view_reports',
    name: 'View Reports',
    description: 'Access business reports',
    category: 'analytics',
    dangerous: false,
  },
  {
    id: 'export_data',
    name: 'Export Data',
    description: 'Download business data',
    category: 'analytics',
    dangerous: false,
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Access detailed analytics',
    category: 'analytics',
    dangerous: false,
  },
];

// Default wedding industry roles
const defaultRoles: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'owner',
    displayName: '👑 Owner',
    description: 'Full access to all features and settings',
    color: 'bg-purple-500',
    icon: '👑',
    isSystem: true,
    isDefault: false,
    permissions: defaultPermissions.map((p) => p.id),
    userCount: 0,
    weddingSpecific: false,
    hierarchyLevel: 10,
  },
  {
    name: 'admin',
    displayName: '⚡ Admin',
    description: 'Administrative access with team management',
    color: 'bg-red-500',
    icon: '⚡',
    isSystem: true,
    isDefault: false,
    permissions: defaultPermissions
      .filter((p) => !p.dangerous || p.id === 'manage_team')
      .map((p) => p.id),
    userCount: 0,
    weddingSpecific: false,
    hierarchyLevel: 9,
  },
  {
    name: 'manager',
    displayName: '📋 Wedding Manager',
    description: 'Manage weddings and coordinate teams',
    color: 'bg-blue-500',
    icon: '📋',
    isSystem: false,
    isDefault: true,
    permissions: defaultPermissions
      .filter(
        (p) =>
          p.category === 'wedding' ||
          (p.category === 'core' && !p.dangerous) ||
          (p.category === 'content' && !p.dangerous),
      )
      .map((p) => p.id),
    userCount: 0,
    weddingSpecific: true,
    hierarchyLevel: 7,
  },
  {
    name: 'coordinator',
    displayName: '🎯 Event Coordinator',
    description: 'Coordinate wedding day activities',
    color: 'bg-green-500',
    icon: '🎯',
    isSystem: false,
    isDefault: false,
    permissions: [
      'read_dashboard',
      'view_weddings',
      'manage_timeline',
      'view_guests',
      'edit_guests',
      'manage_vendors',
      'access_photos',
    ].filter((id) => defaultPermissions.some((p) => p.id === id)),
    userCount: 0,
    weddingSpecific: true,
    hierarchyLevel: 6,
  },
  {
    name: 'photographer',
    displayName: '📸 Photographer',
    description: 'Access to photo galleries and timeline',
    color: 'bg-yellow-500',
    icon: '📸',
    isSystem: false,
    isDefault: false,
    permissions: [
      'read_dashboard',
      'view_weddings',
      'access_photos',
      'upload_photos',
      'share_galleries',
      'view_timeline',
    ],
    userCount: 0,
    weddingSpecific: true,
    hierarchyLevel: 5,
  },
  {
    name: 'vendor',
    displayName: '🛍️ Vendor',
    description: 'Limited access for external vendors',
    color: 'bg-gray-500',
    icon: '🛍️',
    isSystem: false,
    isDefault: false,
    permissions: ['read_dashboard', 'view_weddings', 'manage_timeline'],
    userCount: 0,
    weddingSpecific: true,
    hierarchyLevel: 3,
  },
  {
    name: 'assistant',
    displayName: '🤝 Assistant',
    description: 'Basic access to support operations',
    color: 'bg-gray-400',
    icon: '🤝',
    isSystem: false,
    isDefault: false,
    permissions: ['read_dashboard', 'view_weddings', 'view_guests'],
    userCount: 0,
    weddingSpecific: false,
    hierarchyLevel: 2,
  },
];

export default function RoleManagementInterface({
  organizationId,
  currentUserRole = 'admin',
  onRoleUpdated,
  onMemberUpdated,
}: RoleManagementInterfaceProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [permissions, setPermissions] =
    useState<Permission[]>(defaultPermissions);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDangerous, setShowDangerous] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [activeTab, setActiveTab] = useState<
    'roles' | 'members' | 'permissions'
  >('roles');
  const supabase = createClient();

  const canEditRoles = ['owner', 'admin'].includes(currentUserRole);
  const canEditMembers = ['owner', 'admin', 'manager'].includes(
    currentUserRole,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  const watchedPermissions = watch('permissions') || [];

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadRoles(), loadMembers(), loadPermissions()]);
    } catch (error) {
      console.error('Error loading role management data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(
          `
          *,
          role_members:role_assignments(count)
        `,
        )
        .eq('organization_id', organizationId)
        .order('hierarchy_level', { ascending: false });

      if (error) throw error;

      const rolesData: Role[] = (data || []).map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        color: role.color,
        icon: role.icon,
        isSystem: role.is_system,
        isDefault: role.is_default,
        permissions: role.permissions || [],
        userCount: role.role_members?.[0]?.count || 0,
        weddingSpecific: role.wedding_specific,
        hierarchyLevel: role.hierarchy_level,
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at),
      }));

      // If no roles exist, create defaults
      if (rolesData.length === 0) {
        await createDefaultRoles();
        return;
      }

      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(
          `
          *,
          role:roles(name, display_name),
          user_profiles(first_name, last_name)
        `,
        )
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const membersData: TeamMember[] = (data || []).map((member) => ({
        id: member.id,
        email: member.email,
        firstName: member.user_profiles?.first_name,
        lastName: member.user_profiles?.last_name,
        roleId: member.role_id,
        roleName: member.role?.display_name || member.role?.name || 'Unknown',
        isActive: member.is_active,
        lastActiveAt: member.last_active_at
          ? new Date(member.last_active_at)
          : undefined,
        joinedAt: new Date(member.joined_at),
        permissions: member.permissions || [],
      }));

      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('organization_id', organizationId);

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.length > 0) {
        const customPermissions: Permission[] = data.map((perm) => ({
          id: perm.id,
          name: perm.name,
          description: perm.description,
          category: perm.category,
          dangerous: perm.dangerous,
        }));
        setPermissions([...defaultPermissions, ...customPermissions]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const createDefaultRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert(
          defaultRoles.map((role) => ({
            organization_id: organizationId,
            name: role.name,
            display_name: role.displayName,
            description: role.description,
            color: role.color,
            icon: role.icon,
            is_system: role.isSystem,
            is_default: role.isDefault,
            permissions: role.permissions,
            wedding_specific: role.weddingSpecific,
            hierarchy_level: role.hierarchyLevel,
          })),
        )
        .select();

      if (error) throw error;

      await loadRoles();
    } catch (error) {
      console.error('Error creating default roles:', error);
    }
  };

  const onSubmit = async (data: RoleFormData) => {
    try {
      if (selectedRole) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({
            display_name: data.displayName,
            description: data.description,
            color: data.color,
            icon: data.icon,
            permissions: data.permissions,
            wedding_specific: data.weddingSpecific,
            hierarchy_level: data.hierarchyLevel,
          })
          .eq('id', selectedRole.id);

        if (error) throw error;

        const updatedRole = { ...selectedRole, ...data };
        onRoleUpdated?.(updatedRole);
      } else {
        // Create new role
        const { data: newRole, error } = await supabase
          .from('roles')
          .insert({
            organization_id: organizationId,
            name: data.name,
            display_name: data.displayName,
            description: data.description,
            color: data.color,
            icon: data.icon,
            permissions: data.permissions,
            wedding_specific: data.weddingSpecific,
            hierarchy_level: data.hierarchyLevel,
            is_system: false,
            is_default: false,
          })
          .select()
          .single();

        if (error) throw error;

        onRoleUpdated?.(newRole);
      }

      await loadRoles();
      setIsEditing(false);
      setSelectedRole(null);
      reset();
    } catch (error: any) {
      console.error('Error saving role:', error);
    }
  };

  const editRole = (role: Role) => {
    if (!canEditRoles || role.isSystem) return;

    setSelectedRole(role);
    setIsEditing(true);
    reset({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      color: role.color,
      icon: role.icon,
      permissions: role.permissions,
      weddingSpecific: role.weddingSpecific,
      hierarchyLevel: role.hierarchyLevel,
    });
  };

  const deleteRole = async (roleId: string) => {
    if (!canEditRoles) return;

    try {
      const { error } = await supabase.from('roles').delete().eq('id', roleId);

      if (error) throw error;

      await loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const updateMemberRole = async (memberId: string, newRoleId: string) => {
    if (!canEditMembers) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role_id: newRoleId })
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers();

      const updatedMember = members.find((m) => m.id === memberId);
      if (updatedMember) {
        onMemberUpdated?.({ ...updatedMember, roleId: newRoleId });
      }
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const toggleMemberStatus = async (memberId: string, isActive: boolean) => {
    if (!canEditMembers) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: isActive })
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers();
    } catch (error) {
      console.error('Error updating member status:', error);
    }
  };

  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(
      (p) => p.category === category && (!p.dangerous || showDangerous),
    );
  };

  const categories = [...new Set(permissions.map((p) => p.category))];

  const filteredMembers = members.filter(
    (member) =>
      member.email.toLowerCase().includes(memberFilter.toLowerCase()) ||
      (member.firstName &&
        member.firstName.toLowerCase().includes(memberFilter.toLowerCase())) ||
      (member.lastName &&
        member.lastName.toLowerCase().includes(memberFilter.toLowerCase())) ||
      member.roleName.toLowerCase().includes(memberFilter.toLowerCase()),
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading role management...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Management
          </h2>
          <p className="text-muted-foreground">
            Manage roles and permissions for your wedding team
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted rounded-lg p-1">
        {(['roles', 'members', 'permissions'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab === 'roles' && <Shield className="h-4 w-4 mr-2" />}
            {tab === 'members' && <Users className="h-4 w-4 mr-2" />}
            {tab === 'permissions' && <Settings className="h-4 w-4 mr-2" />}
            {tab}
          </Button>
        ))}
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Roles List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Existing Roles</h3>
              {canEditRoles && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedRole(null);
                    setIsEditing(true);
                    reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Role
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {roles.map((role) => (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRole?.id === role.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center text-white text-lg`}
                        >
                          {role.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{role.displayName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {role.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {role.userCount} member
                              {role.userCount !== 1 ? 's' : ''}
                            </Badge>
                            {role.isSystem && (
                              <Badge variant="secondary" className="text-xs">
                                System
                              </Badge>
                            )}
                            {role.weddingSpecific && (
                              <Badge variant="outline" className="text-xs">
                                🎊 Wedding
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {canEditRoles && !role.isSystem && (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              editRole(role);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {role.userCount === 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    'Are you sure you want to delete this role?',
                                  )
                                ) {
                                  deleteRole(role.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Role Details / Edit Form */}
          <div>
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedRole ? 'Edit Role' : 'Create New Role'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name (System ID)</Label>
                        <Input
                          {...register('name')}
                          placeholder="coordinator_role"
                          disabled={!!selectedRole}
                        />
                        {errors.name && (
                          <p className="text-sm text-red-600">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          {...register('displayName')}
                          placeholder="Event Coordinator"
                        />
                        {errors.displayName && (
                          <p className="text-sm text-red-600">
                            {errors.displayName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        {...register('description')}
                        placeholder="Describe what this role can do..."
                        rows={2}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600">
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Select
                          value={watch('color')}
                          onValueChange={(value) => setValue('color', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { value: 'bg-blue-500', label: 'Blue' },
                              { value: 'bg-green-500', label: 'Green' },
                              { value: 'bg-yellow-500', label: 'Yellow' },
                              { value: 'bg-red-500', label: 'Red' },
                              { value: 'bg-purple-500', label: 'Purple' },
                              { value: 'bg-pink-500', label: 'Pink' },
                              { value: 'bg-indigo-500', label: 'Indigo' },
                              { value: 'bg-gray-500', label: 'Gray' },
                            ].map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded ${color.value}`}
                                  ></div>
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Icon (Emoji)</Label>
                        <Input
                          {...register('icon')}
                          placeholder="🎯"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hierarchy Level (1-10)</Label>
                        <Input
                          {...register('hierarchyLevel', {
                            valueAsNumber: true,
                          })}
                          type="number"
                          min={1}
                          max={10}
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          checked={watch('weddingSpecific')}
                          onCheckedChange={(checked) =>
                            setValue('weddingSpecific', checked as boolean)
                          }
                        />
                        <Label>Wedding-specific role</Label>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Permissions</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={showDangerous}
                            onCheckedChange={setShowDangerous}
                          />
                          <Label className="text-sm">Show dangerous</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                        {categories.map((category) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium capitalize">
                              {category} Permissions
                            </h4>
                            <div className="grid grid-cols-1 gap-1">
                              {getPermissionsByCategory(category).map(
                                (permission) => (
                                  <div
                                    key={permission.id}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      checked={watchedPermissions.includes(
                                        permission.id,
                                      )}
                                      onCheckedChange={(checked) => {
                                        const current = watchedPermissions;
                                        const updated = checked
                                          ? [...current, permission.id]
                                          : current.filter(
                                              (p) => p !== permission.id,
                                            );
                                        setValue('permissions', updated);
                                      }}
                                    />
                                    <div className="flex-1">
                                      <Label className="text-sm font-normal flex items-center gap-2">
                                        {permission.name}
                                        {permission.dangerous && (
                                          <AlertTriangle className="h-3 w-3 text-red-500" />
                                        )}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">
                                        {permission.description}
                                      </p>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Save Role
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedRole(null);
                          reset();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : selectedRole ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg ${selectedRole.color} flex items-center justify-center text-white text-xl`}
                    >
                      {selectedRole.icon}
                    </div>
                    <div>
                      <CardTitle>{selectedRole.displayName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedRole.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Members</Label>
                      <p className="font-medium">{selectedRole.userCount}</p>
                    </div>
                    <div>
                      <Label>Hierarchy Level</Label>
                      <p className="font-medium">
                        {selectedRole.hierarchyLevel}
                      </p>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <div className="flex gap-1">
                        {selectedRole.isSystem && (
                          <Badge variant="secondary">System</Badge>
                        )}
                        {selectedRole.weddingSpecific && (
                          <Badge variant="outline">🎊 Wedding</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <p className="font-medium">
                        {selectedRole.permissions.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Permissions Detail</Label>
                    <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                      {selectedRole.permissions.map((permId) => {
                        const perm = permissions.find((p) => p.id === permId);
                        if (!perm) return null;
                        return (
                          <div
                            key={permId}
                            className="flex items-center justify-between text-sm border-b pb-1"
                          >
                            <span>{perm.name}</span>
                            {perm.dangerous && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {canEditRoles && !selectedRole.isSystem && (
                    <Button
                      onClick={() => editRole(selectedRole)}
                      className="w-full"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Role
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a role to view details or create a new one
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Input
              placeholder="Search members..."
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="max-w-xs"
            />
            <div className="text-sm text-muted-foreground">
              {filteredMembers.length} member
              {filteredMembers.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email}
                          </span>
                          {!member.isActive && (
                            <Badge variant="secondary">
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.firstName && member.lastName && (
                            <p>{member.email}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{member.roleName}</Badge>
                            <span>•</span>
                            <span>
                              Joined {member.joinedAt.toLocaleDateString()}
                            </span>
                            {member.lastActiveAt && (
                              <>
                                <span>•</span>
                                <span>
                                  Last active{' '}
                                  {member.lastActiveAt.toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {canEditMembers && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={member.roleId}
                          onValueChange={(newRoleId) =>
                            updateMemberRole(member.id, newRoleId)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant={member.isActive ? 'ghost' : 'outline'}
                          onClick={() =>
                            toggleMemberStatus(member.id, !member.isActive)
                          }
                        >
                          {member.isActive ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No team members found matching your search
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Available Permissions</h3>
            <div className="flex items-center space-x-2">
              <Switch
                checked={showDangerous}
                onCheckedChange={setShowDangerous}
              />
              <Label>Show dangerous permissions</Label>
            </div>
          </div>

          {categories.map((category) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">
                  {category} Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getPermissionsByCategory(category).map((permission) => (
                    <div key={permission.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          {permission.name}
                          {permission.dangerous && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </h4>
                        {permission.dangerous && (
                          <Badge variant="destructive" className="text-xs">
                            Dangerous
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Wedding Industry Context */}
      <Alert>
        <AlertDescription>
          🎊 <strong>Wedding Industry Focus:</strong> Roles are designed
          specifically for wedding professionals. Coordinators handle day-of
          logistics, photographers manage galleries, and vendors have limited
          access to their specific services.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export type { Permission, Role, TeamMember, RoleManagementInterfaceProps };
