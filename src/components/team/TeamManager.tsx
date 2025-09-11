/**
 * Team Manager Component
 * WS-073: Team Management - Wedding Business Collaboration
 * Provides comprehensive team management with role-based access control
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RBACService, Team, TeamMember, TeamRole } from '@/lib/auth/rbac';
import {
  TeamService,
  TeamInvitation,
  TeamStats,
  CreateTeamData,
} from '@/lib/services/teamService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import {
  UsersIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  EditIcon,
  MailIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface TeamManagerProps {
  userId?: string;
  teamId?: string;
  onTeamCreated?: (team: Team) => void;
  onTeamUpdated?: (team: Team) => void;
  className?: string;
}

interface TeamFormData {
  name: string;
  description: string;
  businessType: string;
  subscriptionPlan: string;
  maxTeamMembers: number;
}

export default function TeamManager({
  userId,
  teamId,
  onTeamCreated,
  onTeamUpdated,
  className = '',
}: TeamManagerProps) {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);

  // Form states
  const [teamForm, setTeamForm] = useState<TeamFormData>({
    name: '',
    description: '',
    businessType: 'photography',
    subscriptionPlan: 'professional',
    maxTeamMembers: 10,
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as TeamRole,
    message: '',
  });

  // Services
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  const [rbac] = useState(() => new RBACService(supabase));
  const [teamService] = useState(() => new TeamService(supabase, rbac));

  // Initialize and load data
  useEffect(() => {
    if (userId) {
      initializeAndLoad();
    }
  }, [userId]);

  const initializeAndLoad = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize RBAC
      await rbac.initialize(userId!);

      // Load teams
      const userTeams = await teamService.getUserTeams(userId!);
      setTeams(userTeams);

      // If teamId provided, select that team
      if (teamId) {
        const team = userTeams.find((t) => t.id === teamId);
        if (team) {
          await selectTeam(team);
        }
      } else if (userTeams.length > 0) {
        // Select first team by default
        await selectTeam(userTeams[0]);
      }
    } catch (err) {
      console.error('Failed to initialize team manager:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (team: Team) => {
    try {
      setSelectedTeam(team);
      setLoading(true);

      // Load team details
      const [teamMembers, teamInvitations, teamStats] = await Promise.all([
        teamService.getTeamMembers(team.id),
        teamService.getTeamInvitations(team.id),
        teamService.getTeamStats(team.id),
      ]);

      setMembers(teamMembers);
      setInvitations(teamInvitations);
      setStats(teamStats);
    } catch (err) {
      console.error('Failed to load team details:', err);
      setError('Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      const createData: CreateTeamData = {
        name: teamForm.name,
        description: teamForm.description,
        businessType: teamForm.businessType,
        subscriptionPlan: teamForm.subscriptionPlan,
        maxTeamMembers: teamForm.maxTeamMembers,
      };

      const newTeam = await teamService.createTeam(userId!, createData);

      if (newTeam) {
        setTeams((prev) => [...prev, newTeam]);
        setSelectedTeam(newTeam);
        setShowCreateTeam(false);
        resetTeamForm();
        onTeamCreated?.(newTeam);
        await selectTeam(newTeam);
      }
    } catch (err) {
      console.error('Failed to create team:', err);
      setError('Failed to create team');
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam) return;

    try {
      const result = await teamService.inviteTeamMember(
        selectedTeam.id,
        userId!,
        inviteForm.email,
        inviteForm.role,
        inviteForm.message || undefined,
      );

      if (result.success) {
        setShowInviteMember(false);
        resetInviteForm();
        // Reload invitations
        const updatedInvitations = await teamService.getTeamInvitations(
          selectedTeam.id,
        );
        setInvitations(updatedInvitations);
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Failed to invite member:', err);
      setError('Failed to invite member');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!selectedTeam) return;

    try {
      const success = await teamService.revokeInvitation(invitationId, userId!);
      if (success) {
        const updatedInvitations = await teamService.getTeamInvitations(
          selectedTeam.id,
        );
        setInvitations(updatedInvitations);
      }
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
      setError('Failed to revoke invitation');
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    newRole: TeamRole,
  ) => {
    if (!selectedTeam) return;

    try {
      const success = await teamService.updateMemberRole(
        selectedTeam.id,
        memberId,
        newRole,
        userId!,
      );

      if (success) {
        const updatedMembers = await teamService.getTeamMembers(
          selectedTeam.id,
        );
        setMembers(updatedMembers);
      }
    } catch (err) {
      console.error('Failed to update member role:', err);
      setError('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;

    try {
      const success = await teamService.removeMember(
        selectedTeam.id,
        memberId,
        userId!,
      );

      if (success) {
        const updatedMembers = await teamService.getTeamMembers(
          selectedTeam.id,
        );
        setMembers(updatedMembers);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError('Failed to remove member');
    }
  };

  const resetTeamForm = () => {
    setTeamForm({
      name: '',
      description: '',
      businessType: 'photography',
      subscriptionPlan: 'professional',
      maxTeamMembers: 10,
    });
  };

  const resetInviteForm = () => {
    setInviteForm({
      email: '',
      role: 'viewer',
      message: '',
    });
  };

  const getRoleBadgeColor = (role: TeamRole) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      senior_photographer: 'bg-blue-100 text-blue-800',
      photographer: 'bg-green-100 text-green-800',
      coordinator: 'bg-yellow-100 text-yellow-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role];
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      invited: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && teams.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XMarkIcon className="h-4 w-4" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Team Selector and Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Team Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage your wedding business team with role-based access control
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateTeam(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create Team
            </Button>
            {selectedTeam && (
              <Button
                variant="secondary"
                onClick={() => setShowEditTeam(true)}
                className="flex items-center gap-2"
              >
                <SettingsIcon className="h-4 w-4" />
                Team Settings
              </Button>
            )}
          </div>
        </div>

        {/* Team Selection */}
        {teams.length > 0 && (
          <div className="mb-6">
            <Select
              value={selectedTeam?.id || ''}
              onValueChange={(teamId) => {
                const team = teams.find((t) => t.id === teamId);
                if (team) selectTeam(team);
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.businessType})
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Team Stats Overview */}
        {selectedTeam && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Members</p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {stats.totalMembers}
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Active Members</p>
                  <p className="text-2xl font-semibold text-green-900">
                    {stats.activeMembers}
                  </p>
                </div>
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Pending Invites</p>
                  <p className="text-2xl font-semibold text-yellow-900">
                    {stats.pendingInvitations}
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Recent Activity</p>
                  <p className="text-2xl font-semibold text-purple-900">
                    {stats.recentActivity}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Team Details */}
      {selectedTeam && (
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'members'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Members ({stats?.activeMembers || 0})
                </button>
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invitations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Invitations ({stats?.pendingInvitations || 0})
                </button>
              </nav>
            </div>

            <div className="mt-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Team Information
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">
                          Team Name:
                        </span>
                        <p className="font-medium">{selectedTeam.name}</p>
                      </div>
                      {selectedTeam.description && (
                        <div>
                          <span className="text-sm text-gray-500">
                            Description:
                          </span>
                          <p>{selectedTeam.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">
                            Business Type:
                          </span>
                          <p className="font-medium capitalize">
                            {selectedTeam.businessType}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">
                            Subscription Plan:
                          </span>
                          <p className="font-medium capitalize">
                            {selectedTeam.subscriptionPlan}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role Distribution */}
                  {stats && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Role Distribution
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(stats.roleDistribution).map(
                          ([role, count]) => (
                            <div
                              key={role}
                              className="flex items-center justify-between py-2"
                            >
                              <div className="flex items-center gap-3">
                                <Badge
                                  className={getRoleBadgeColor(
                                    role as TeamRole,
                                  )}
                                >
                                  {role.replace('_', ' ')}
                                </Badge>
                              </div>
                              <span className="font-medium">{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Team Members
                    </h3>
                    <Button
                      onClick={() => setShowInviteMember(true)}
                      className="flex items-center gap-2"
                    >
                      <MailIcon className="h-4 w-4" />
                      Invite Member
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {member.email.charAt(0).toUpperCase()}
                            </div>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getRoleBadgeColor(member.role)}>
                                {member.role.replace('_', ' ')}
                              </Badge>
                              <Badge
                                className={getStatusBadgeColor(member.status)}
                              >
                                {member.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(newRole) =>
                              handleUpdateMemberRole(
                                member.id,
                                newRole as TeamRole,
                              )
                            }
                          >
                            <option value="viewer">Viewer</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="photographer">Photographer</option>
                            <option value="senior_photographer">
                              Senior Photographer
                            </option>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invitations Tab */}
              {activeTab === 'invitations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Pending Invitations
                    </h3>
                    <Button
                      onClick={() => setShowInviteMember(true)}
                      className="flex items-center gap-2"
                    >
                      <MailIcon className="h-4 w-4" />
                      Send Invitation
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {invitations
                      .filter((inv) => inv.status === 'pending')
                      .map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {invitation.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                className={getRoleBadgeColor(invitation.role)}
                              >
                                {invitation.role.replace('_', ' ')}
                              </Badge>
                              <Badge
                                className={getStatusBadgeColor(
                                  invitation.status,
                                )}
                              >
                                {invitation.status}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Expires:{' '}
                                {invitation.expiresAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRevokeInvitation(invitation.id)
                              }
                              className="text-red-600 hover:text-red-800"
                            >
                              Revoke
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </Card>
      )}

      {/* Create Team Modal */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Team
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name
                </label>
                <Input
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={teamForm.description}
                  onChange={(e) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief team description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <Select
                  value={teamForm.businessType}
                  onValueChange={(value) =>
                    setTeamForm((prev) => ({ ...prev, businessType: value }))
                  }
                >
                  <option value="photography">Photography Studio</option>
                  <option value="planning">Wedding Planning</option>
                  <option value="venue">Venue Management</option>
                  <option value="catering">Catering Service</option>
                  <option value="flowers">Floral Design</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!teamForm.name.trim()}
              >
                Create Team
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Invite Member Modal */}
      <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Invite Team Member
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      role: value as TeamRole,
                    }))
                  }
                >
                  <option value="viewer">Viewer - Read-only access</option>
                  <option value="coordinator">
                    Coordinator - Analytics and reporting
                  </option>
                  <option value="photographer">
                    Photographer - Manage assigned clients
                  </option>
                  <option value="senior_photographer">
                    Senior Photographer - Full client management
                  </option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <Input
                  value={inviteForm.message}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  placeholder="Welcome message for the new team member"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowInviteMember(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={!inviteForm.email.trim()}
              >
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
