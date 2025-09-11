'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar,
  Users,
  Heart,
  Building2,
  Camera,
  Utensils,
  Flower,
  Music,
  Car,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  Settings,
  Crown,
} from 'lucide-react';

interface WeddingTeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role:
    | 'couple'
    | 'photographer'
    | 'videographer'
    | 'coordinator'
    | 'venue_staff'
    | 'florist'
    | 'caterer'
    | 'dj'
    | 'transport'
    | 'admin';
  avatar?: string;
  isAuthenticated: boolean;
  ssoProvider?: string;
  lastActive?: Date;
  permissions: string[];
  weddingAccessLevel: 'full' | 'limited' | 'view_only';
  specializations: string[];
}

interface Wedding {
  id: string;
  coupleName: string;
  weddingDate: Date;
  venueName: string;
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed';
  teamCount: number;
  lastActivity: Date;
}

interface WeddingTeamSSOProps {
  weddingId?: string;
  organizationId: string;
  onMemberAuthenticated?: (member: WeddingTeamMember) => void;
  onAccessRequested?: (email: string, role: string) => void;
  showGuestAccess?: boolean;
  allowSelfRegistration?: boolean;
}

// Wedding industry role configurations
const weddingRoles = {
  couple: {
    icon: Heart,
    label: '💕 Couple',
    color: 'bg-pink-500',
    description: 'The happy couple getting married',
    defaultPermissions: [
      'view_all',
      'approve_changes',
      'guest_management',
      'timeline_approval',
    ],
    accessLevel: 'full' as const,
  },
  coordinator: {
    icon: Users,
    label: '🎯 Wedding Coordinator',
    color: 'bg-blue-500',
    description: 'Primary wedding day coordinator',
    defaultPermissions: [
      'manage_timeline',
      'coordinate_vendors',
      'guest_communication',
      'day_of_execution',
    ],
    accessLevel: 'full' as const,
  },
  photographer: {
    icon: Camera,
    label: '📸 Photographer',
    color: 'bg-yellow-500',
    description: 'Wedding photographer and team',
    defaultPermissions: [
      'photo_management',
      'timeline_access',
      'vendor_coordination',
      'gallery_creation',
    ],
    accessLevel: 'limited' as const,
  },
  videographer: {
    icon: Camera,
    label: '🎥 Videographer',
    color: 'bg-red-500',
    description: 'Wedding videographer and crew',
    defaultPermissions: [
      'video_management',
      'timeline_access',
      'vendor_coordination',
    ],
    accessLevel: 'limited' as const,
  },
  venue_staff: {
    icon: Building2,
    label: '🏛️ Venue Staff',
    color: 'bg-green-500',
    description: 'Venue management and staff',
    defaultPermissions: [
      'venue_management',
      'setup_coordination',
      'timeline_access',
      'vendor_coordination',
    ],
    accessLevel: 'limited' as const,
  },
  florist: {
    icon: Flower,
    label: '🌺 Florist',
    color: 'bg-emerald-500',
    description: 'Floral designer and team',
    defaultPermissions: [
      'floral_design',
      'setup_timeline',
      'venue_coordination',
    ],
    accessLevel: 'limited' as const,
  },
  caterer: {
    icon: Utensils,
    label: '🍽️ Caterer',
    color: 'bg-orange-500',
    description: 'Catering team and kitchen staff',
    defaultPermissions: [
      'menu_management',
      'dietary_requirements',
      'service_timeline',
      'guest_count',
    ],
    accessLevel: 'limited' as const,
  },
  dj: {
    icon: Music,
    label: '🎵 DJ/Entertainment',
    color: 'bg-purple-500',
    description: 'DJ, band, or entertainment team',
    defaultPermissions: [
      'music_management',
      'timeline_coordination',
      'announcements',
    ],
    accessLevel: 'limited' as const,
  },
  transport: {
    icon: Car,
    label: '🚗 Transportation',
    color: 'bg-gray-500',
    description: 'Transportation and logistics',
    defaultPermissions: ['transport_coordination', 'timeline_access'],
    accessLevel: 'limited' as const,
  },
  admin: {
    icon: Crown,
    label: '👑 Admin',
    color: 'bg-indigo-500',
    description: 'System administrator',
    defaultPermissions: ['full_access', 'team_management', 'system_settings'],
    accessLevel: 'full' as const,
  },
};

export default function WeddingTeamSSO({
  weddingId,
  organizationId,
  onMemberAuthenticated,
  onAccessRequested,
  showGuestAccess = true,
  allowSelfRegistration = false,
}: WeddingTeamSSOProps) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [teamMembers, setTeamMembers] = useState<WeddingTeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<WeddingTeamMember | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedRole, setSelectedRole] =
    useState<keyof typeof weddingRoles>('coordinator');
  const [inviteEmail, setInviteEmail] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (weddingId) {
      loadWeddingData();
      loadTeamMembers();
      loadCurrentUser();
    }
  }, [weddingId, organizationId]);

  const loadWeddingData = async () => {
    if (!weddingId) return;

    try {
      const { data, error } = await supabase
        .from('weddings')
        .select(
          `
          id,
          couple_name,
          wedding_date,
          venue_name,
          status,
          wedding_team_members(count),
          updated_at
        `,
        )
        .eq('id', weddingId)
        .single();

      if (error) throw error;

      setWedding({
        id: data.id,
        coupleName: data.couple_name,
        weddingDate: new Date(data.wedding_date),
        venueName: data.venue_name,
        status: data.status,
        teamCount: data.wedding_team_members?.[0]?.count || 0,
        lastActivity: new Date(data.updated_at),
      });
    } catch (error) {
      console.error('Error loading wedding data:', error);
    }
  };

  const loadTeamMembers = async () => {
    if (!weddingId) return;

    try {
      const { data, error } = await supabase
        .from('wedding_team_members')
        .select(
          `
          *,
          user_profiles(first_name, last_name, avatar_url),
          sso_sessions(provider, last_active)
        `,
        )
        .eq('wedding_id', weddingId)
        .eq('is_active', true)
        .order('role');

      if (error) throw error;

      const members: WeddingTeamMember[] = data.map((member) => ({
        id: member.id,
        email: member.email,
        firstName: member.user_profiles?.first_name,
        lastName: member.user_profiles?.last_name,
        role: member.role,
        avatar: member.user_profiles?.avatar_url,
        isAuthenticated: !!member.sso_sessions?.length,
        ssoProvider: member.sso_sessions?.[0]?.provider,
        lastActive: member.sso_sessions?.[0]?.last_active
          ? new Date(member.sso_sessions[0].last_active)
          : undefined,
        permissions:
          member.permissions ||
          weddingRoles[member.role as keyof typeof weddingRoles]
            ?.defaultPermissions ||
          [],
        weddingAccessLevel:
          member.access_level ||
          weddingRoles[member.role as keyof typeof weddingRoles]?.accessLevel ||
          'view_only',
        specializations: member.specializations || [],
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user) return;

      const member = teamMembers.find((m) => m.email === user.email);
      if (member) {
        setCurrentUser(member);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const requestAccess = async (
    email: string,
    role: keyof typeof weddingRoles,
  ) => {
    try {
      const { error } = await supabase.from('wedding_access_requests').insert({
        wedding_id: weddingId,
        email,
        requested_role: role,
        organization_id: organizationId,
        status: 'pending',
        requested_at: new Date().toISOString(),
      });

      if (error) throw error;

      onAccessRequested?.(email, role);
    } catch (error) {
      console.error('Error requesting access:', error);
    }
  };

  const authenticateWithSSO = async (providerId: string) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerId as any,
        options: {
          redirectTo: `${window.location.origin}/wedding/${weddingId}/dashboard`,
          queryParams: {
            wedding_id: weddingId,
            organization_id: organizationId,
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error authenticating with SSO:', error);
    }
  };

  const getRoleIcon = (role: keyof typeof weddingRoles) => {
    const Icon = weddingRoles[role].icon;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (member: WeddingTeamMember) => {
    if (!member.isAuthenticated) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    }

    if (
      member.lastActive &&
      member.lastActive > new Date(Date.now() - 15 * 60 * 1000)
    ) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Online
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Authenticated
      </Badge>
    );
  };

  const getAccessLevelBadge = (level: string) => {
    const config = {
      full: { variant: 'success' as const, text: 'Full Access' },
      limited: { variant: 'warning' as const, text: 'Limited' },
      view_only: { variant: 'secondary' as const, text: 'View Only' },
    };

    const levelConfig =
      config[level as keyof typeof config] || config.view_only;

    return (
      <Badge variant={levelConfig.variant} className="text-xs">
        {levelConfig.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading wedding team...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wedding Header */}
      {wedding && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-6 w-6 text-pink-500" />
                  {wedding.coupleName}&apos;s Wedding
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {wedding.weddingDate.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {wedding.venueName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {wedding.teamCount} team members
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    wedding.status === 'confirmed' ? 'success' : 'secondary'
                  }
                  className="capitalize"
                >
                  {wedding.status.replace('_', ' ')}
                </Badge>
                {currentUser?.permissions.includes('team_management') && (
                  <Button
                    size="sm"
                    onClick={() => setShowInviteForm(!showInviteForm)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Team
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => {
          const roleConfig =
            weddingRoles[member.role as keyof typeof weddingRoles];

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback
                      className={`${roleConfig.color} text-white`}
                    >
                      {member.firstName && member.lastName
                        ? `${member.firstName[0]}${member.lastName[0]}`
                        : member.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email}
                      </h4>
                      {getStatusBadge(member)}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-xs"
                      >
                        {getRoleIcon(member.role as keyof typeof weddingRoles)}
                        {roleConfig.label}
                      </Badge>
                      {getAccessLevelBadge(member.weddingAccessLevel)}
                    </div>

                    {member.firstName && member.lastName && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {member.email}
                      </p>
                    )}

                    {member.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.specializations.slice(0, 2).map((spec) => (
                          <Badge
                            key={spec}
                            variant="secondary"
                            className="text-xs"
                          >
                            {spec}
                          </Badge>
                        ))}
                        {member.specializations.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{member.specializations.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {member.ssoProvider && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        via {member.ssoProvider}
                      </p>
                    )}

                    {member.lastActive && (
                      <p className="text-xs text-muted-foreground">
                        Last active: {member.lastActive.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                {!member.isAuthenticated &&
                  currentUser?.permissions.includes('team_management') && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          /* Resend invitation */
                        }}
                        className="w-full text-xs"
                      >
                        Resend Invitation
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>
          );
        })}

        {/* Add Team Member Card */}
        {currentUser?.permissions.includes('team_management') && (
          <Card
            className="border-dashed hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowInviteForm(true)}
          >
            <CardContent className="p-4 flex items-center justify-center h-full">
              <div className="text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Add Team Member</p>
                <p className="text-xs text-muted-foreground">
                  Invite wedding professionals
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Wedding Team Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="professional@company.com"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(e.target.value as keyof typeof weddingRoles)
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Object.entries(weddingRoles).map(([key, role]) => (
                    <option key={key} value={key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role Description</label>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {weddingRoles[selectedRole].description}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (inviteEmail) {
                    requestAccess(inviteEmail, selectedRole);
                    setInviteEmail('');
                    setShowInviteForm(false);
                  }
                }}
                disabled={!inviteEmail.includes('@')}
              >
                Send Invitation
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInviteForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Wedding Team Roles & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(weddingRoles).map(([key, role]) => {
              const Icon = role.icon;
              return (
                <div key={key} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center text-white`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{role.label}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {role.accessLevel.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {role.description}
                  </p>
                  <div className="space-y-1">
                    {role.defaultPermissions.slice(0, 3).map((permission) => (
                      <div key={permission} className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs">
                          {permission.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                    {role.defaultPermissions.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{role.defaultPermissions.length - 3} more permissions
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wedding Industry Context */}
      <Alert>
        <Heart className="h-4 w-4" />
        <AlertDescription>
          <strong>🎊 Wedding Team Authentication:</strong> Each wedding
          professional gets role-based access tailored to their
          responsibilities. SSO ensures secure access while maintaining the
          magical wedding day experience.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export type { WeddingTeamMember, Wedding, WeddingTeamSSOProps };
