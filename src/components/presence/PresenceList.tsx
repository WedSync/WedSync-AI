'use client';

import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConnectedPresenceIndicator } from './PresenceIndicator';
import { usePresence } from '@/hooks/usePresence';
import type {
  PresenceListProps,
  PresenceState,
  PresenceStatus,
} from '@/types/presence';
import { Search, Users, Filter, Eye, EyeOff } from 'lucide-react';

// Mock user data interface (in real app, this would come from your user management system)
interface TeamMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  initials?: string;
  role?: string;
  weddingRole?:
    | 'photographer'
    | 'venue_coordinator'
    | 'vendor'
    | 'supplier'
    | 'couple';
  organization?: string;
  isContact?: boolean;
}

// Status grouping configuration
const statusGroups = [
  {
    status: 'online',
    label: 'Online',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    status: 'busy',
    label: 'Busy',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    status: 'idle',
    label: 'Idle',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    status: 'away',
    label: 'Away',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  {
    status: 'offline',
    label: 'Offline',
    color: 'text-gray-500',
    bgColor: 'bg-gray-25',
  },
] as const;

// Wedding context templates
const weddingRoleLabels = {
  photographer: '📸 Photography',
  venue_coordinator: '🏛️ Venue',
  vendor: '🏪 Vendor',
  supplier: '📦 Supplier',
  couple: '💑 Couple',
};

interface PresenceListComponentProps extends PresenceListProps {
  // Enhanced props for real-world usage
  teamMembers?: TeamMember[];
  channelName?: string;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  loadingMessage?: string;
  showSearch?: boolean;
  showStatusFilter?: boolean;
  showRoleFilter?: boolean;
  virtualizeThreshold?: number;
}

function PresenceListComponent({
  context,
  contextId,
  showOfflineUsers = true,
  groupByStatus = true,
  maxUsers,
  allowCustomStatus = true,
  onUserClick,
  className,
  teamMembers = [],
  channelName,
  searchPlaceholder = 'Search team members...',
  emptyStateMessage = 'No team members found',
  loadingMessage = 'Loading team presence...',
  showSearch = true,
  showStatusFilter = true,
  showRoleFilter = false,
  virtualizeThreshold = 50,
  ...props
}: PresenceListComponentProps) {
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PresenceStatus | 'all'>(
    'all',
  );
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showOfflineToggle, setShowOfflineToggle] = useState(showOfflineUsers);

  // Presence hook integration
  const { presenceState, isLoading, error } = usePresence({
    channelName: channelName || `${context}:${contextId || 'default'}:presence`,
    userId: '', // Will be set by auth context in hook
    context,
    contextId,
  });

  // Combine team members with their presence states
  const teamWithPresence = useMemo(() => {
    return teamMembers.map((member) => {
      const userPresence = Object.values(presenceState)
        .flat()
        .find((presence) => presence.userId === member.id);

      return {
        ...member,
        presence: userPresence || {
          userId: member.id,
          status: 'offline' as PresenceStatus,
          lastActivity: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, [teamMembers, presenceState]);

  // Filter and search logic
  const filteredMembers = useMemo(() => {
    let filtered = teamWithPresence;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(term) ||
          member.email?.toLowerCase().includes(term) ||
          member.role?.toLowerCase().includes(term) ||
          member.presence.customStatus?.toLowerCase().includes(term),
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (member) => member.presence.status === statusFilter,
      );
    }

    // Apply role filter for wedding context
    if (roleFilter !== 'all' && context === 'wedding') {
      filtered = filtered.filter((member) => member.weddingRole === roleFilter);
    }

    // Apply offline users toggle
    if (!showOfflineToggle) {
      filtered = filtered.filter(
        (member) => member.presence.status !== 'offline',
      );
    }

    // Apply max users limit
    if (maxUsers && filtered.length > maxUsers) {
      filtered = filtered.slice(0, maxUsers);
    }

    return filtered;
  }, [
    teamWithPresence,
    searchTerm,
    statusFilter,
    roleFilter,
    showOfflineToggle,
    maxUsers,
    context,
  ]);

  // Group members by status
  const groupedMembers = useMemo(() => {
    if (!groupByStatus) {
      return [
        {
          status: 'all',
          label: 'All Members',
          members: filteredMembers,
          color: 'text-gray-700',
          bgColor: 'bg-white',
        },
      ];
    }

    const groups = statusGroups
      .map((group) => ({
        ...group,
        members: filteredMembers.filter(
          (member) => member.presence.status === group.status,
        ),
      }))
      .filter((group) => group.members.length > 0);

    return groups;
  }, [filteredMembers, groupByStatus]);

  // Status counts for badges
  const statusCounts = useMemo(() => {
    return statusGroups.reduce(
      (counts, group) => {
        counts[group.status] = filteredMembers.filter(
          (member) => member.presence.status === group.status,
        ).length;
        return counts;
      },
      {} as Record<PresenceStatus, number>,
    );
  }, [filteredMembers]);

  // Event handlers
  const handleMemberClick = useCallback(
    (member: TeamMember) => {
      if (onUserClick) {
        onUserClick(member.id);
      }
    },
    [onUserClick],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
    setShowOfflineToggle(showOfflineUsers);
  }, [showOfflineUsers]);

  // Keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, member: TeamMember) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleMemberClick(member);
      }
    },
    [handleMemberClick],
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            {loadingMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-destructive">
            <p className="font-semibold">Failed to load presence</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)} {...props}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Presence
            <Badge variant="secondary" className="ml-2">
              {filteredMembers.length}
            </Badge>
          </CardTitle>

          {/* Toggle offline users visibility */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOfflineToggle(!showOfflineToggle)}
            className="flex items-center gap-1"
          >
            {showOfflineToggle ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            {showOfflineToggle ? 'Hide Offline' : 'Show Offline'}
          </Button>
        </div>

        {/* Search and filters */}
        <div className="space-y-3">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
                aria-label="Search team members"
              />
            </div>
          )}

          {(showStatusFilter || showRoleFilter) && (
            <div className="flex flex-wrap gap-2">
              {showStatusFilter && (
                <div className="flex items-center gap-1">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {statusGroups.map((group) => (
                    <Button
                      key={group.status}
                      variant={
                        statusFilter === group.status ? 'default' : 'ghost'
                      }
                      size="sm"
                      onClick={() =>
                        setStatusFilter(
                          statusFilter === group.status ? 'all' : group.status,
                        )
                      }
                      className="h-7 px-2 text-xs"
                    >
                      {group.label} ({statusCounts[group.status] || 0})
                    </Button>
                  ))}
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className="h-7 px-2 text-xs"
                  >
                    All
                  </Button>
                </div>
              )}

              {showRoleFilter && context === 'wedding' && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  {Object.entries(weddingRoleLabels).map(([role, label]) => (
                    <Button
                      key={role}
                      variant={roleFilter === role ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() =>
                        setRoleFilter(roleFilter === role ? 'all' : role)
                      }
                      className="h-7 px-2 text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {groupedMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{emptyStateMessage}</p>
          </div>
        ) : (
          groupedMembers.map((group) => (
            <div key={group.status} className="space-y-2">
              {groupByStatus && (
                <div
                  className="flex items-center gap-2 px-2 py-1 rounded-md"
                  style={{ backgroundColor: group.bgColor }}
                >
                  <h3 className={cn('font-semibold text-sm', group.color)}>
                    {group.label}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {group.members.length}
                  </Badge>
                </div>
              )}

              <div className="grid gap-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors',
                      onUserClick &&
                        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                    onClick={() => handleMemberClick(member)}
                    onKeyDown={(e) => handleKeyDown(e, member)}
                    tabIndex={onUserClick ? 0 : -1}
                    role={onUserClick ? 'button' : 'listitem'}
                    aria-label={`${member.name}, ${member.presence.status}`}
                  >
                    {/* Presence indicator with avatar */}
                    <ConnectedPresenceIndicator
                      userId={member.id}
                      userName={member.name}
                      userAvatar={member.avatar}
                      userInitials={member.initials}
                      context={context}
                      contextId={contextId}
                      showActivity={allowCustomStatus}
                      showCustomStatus={allowCustomStatus}
                      weddingRole={member.weddingRole}
                      size="sm"
                    />

                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {member.name}
                        </p>
                        {member.weddingRole && context === 'wedding' && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            {weddingRoleLabels[member.weddingRole]}
                          </Badge>
                        )}
                      </div>
                      {member.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      )}
                      {member.presence.customStatus && allowCustomStatus && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.presence.customEmoji}{' '}
                          {member.presence.customStatus}
                        </p>
                      )}
                    </div>

                    {/* Typing indicator */}
                    {member.presence.isTyping && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-1 animate-pulse"
                      >
                        typing...
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Memoized component for performance
export const PresenceList = memo(PresenceListComponent);

// Specialized variants for common use cases

interface WeddingPresenceListProps
  extends Omit<PresenceListComponentProps, 'context' | 'weddingRole'> {
  weddingId: string;
}

export function WeddingPresenceList({
  weddingId,
  ...props
}: WeddingPresenceListProps) {
  return (
    <PresenceList
      context="wedding"
      contextId={weddingId}
      showRoleFilter={true}
      {...props}
    />
  );
}

interface OrganizationPresenceListProps
  extends Omit<PresenceListComponentProps, 'context'> {
  organizationId: string;
}

export function OrganizationPresenceList({
  organizationId,
  ...props
}: OrganizationPresenceListProps) {
  return (
    <PresenceList
      context="organization"
      contextId={organizationId}
      showRoleFilter={false}
      {...props}
    />
  );
}

export default PresenceList;
