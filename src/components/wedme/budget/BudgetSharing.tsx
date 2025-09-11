'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Unlock,
  Eye,
  Edit3,
  DollarSign,
  Share2,
  Link,
  Copy,
  Mail,
  MessageSquare,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  User,
  Crown,
  UserCheck,
  UserX,
  RefreshCw,
  Download,
  Upload,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetSharingProps {
  clientId: string;
  budgetId: string;
  currentUserId: string;
  isOwner: boolean;
  className?: string;
}

interface SharedUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: BudgetPermissions;
  status: 'active' | 'pending' | 'suspended';
  invited_at: Date;
  last_accessed?: Date;
  avatar_url?: string;
  invitation_method?: 'email' | 'link' | 'sms';
  access_expires?: Date;
}

interface BudgetPermissions {
  // View permissions
  can_view_budget: boolean;
  can_view_transactions: boolean;
  can_view_analytics: boolean;
  can_view_payments: boolean;
  can_view_vendors: boolean;

  // Edit permissions
  can_edit_budget: boolean;
  can_add_transactions: boolean;
  can_edit_transactions: boolean;
  can_delete_transactions: boolean;
  can_manage_categories: boolean;

  // Advanced permissions
  can_manage_vendors: boolean;
  can_schedule_payments: boolean;
  can_export_data: boolean;
  can_manage_sharing: boolean;
  can_view_audit_log: boolean;
}

interface ShareInvitation {
  id: string;
  token: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: BudgetPermissions;
  expires_at: Date;
  created_by: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: Date;
  ip_address?: string;
  device?: string;
}

interface ShareLink {
  id: string;
  url: string;
  role: 'viewer' | 'editor';
  permissions: BudgetPermissions;
  expires_at?: Date;
  max_uses?: number;
  current_uses: number;
  password_protected: boolean;
  created_at: Date;
  created_by: string;
  is_active: boolean;
}

// Default permission presets
const PERMISSION_PRESETS = {
  owner: {
    can_view_budget: true,
    can_view_transactions: true,
    can_view_analytics: true,
    can_view_payments: true,
    can_view_vendors: true,
    can_edit_budget: true,
    can_add_transactions: true,
    can_edit_transactions: true,
    can_delete_transactions: true,
    can_manage_categories: true,
    can_manage_vendors: true,
    can_schedule_payments: true,
    can_export_data: true,
    can_manage_sharing: true,
    can_view_audit_log: true,
  },
  admin: {
    can_view_budget: true,
    can_view_transactions: true,
    can_view_analytics: true,
    can_view_payments: true,
    can_view_vendors: true,
    can_edit_budget: true,
    can_add_transactions: true,
    can_edit_transactions: true,
    can_delete_transactions: true,
    can_manage_categories: true,
    can_manage_vendors: true,
    can_schedule_payments: true,
    can_export_data: true,
    can_manage_sharing: false,
    can_view_audit_log: true,
  },
  editor: {
    can_view_budget: true,
    can_view_transactions: true,
    can_view_analytics: true,
    can_view_payments: true,
    can_view_vendors: true,
    can_edit_budget: false,
    can_add_transactions: true,
    can_edit_transactions: true,
    can_delete_transactions: false,
    can_manage_categories: false,
    can_manage_vendors: false,
    can_schedule_payments: false,
    can_export_data: true,
    can_manage_sharing: false,
    can_view_audit_log: false,
  },
  viewer: {
    can_view_budget: true,
    can_view_transactions: true,
    can_view_analytics: true,
    can_view_payments: true,
    can_view_vendors: true,
    can_edit_budget: false,
    can_add_transactions: false,
    can_edit_transactions: false,
    can_delete_transactions: false,
    can_manage_categories: false,
    can_manage_vendors: false,
    can_schedule_payments: false,
    can_export_data: true,
    can_manage_sharing: false,
    can_view_audit_log: false,
  },
};

export function BudgetSharing({
  clientId,
  budgetId,
  currentUserId,
  isOwner,
  className,
}: BudgetSharingProps) {
  // State
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [invitations, setInvitations] = useState<ShareInvitation[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<
    'users' | 'invitations' | 'links' | 'audit'
  >('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SharedUser | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>(
    'viewer',
  );
  const [inviteMessage, setInviteMessage] = useState('');
  const [customPermissions, setCustomPermissions] = useState<BudgetPermissions>(
    PERMISSION_PRESETS.viewer,
  );
  const [linkExpiry, setLinkExpiry] = useState<number>(7); // days
  const [linkMaxUses, setLinkMaxUses] = useState<number>(1);
  const [linkPassword, setLinkPassword] = useState('');

  // Load data
  useEffect(() => {
    loadSharingData();
  }, [budgetId]);

  const loadSharingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersRes, invitesRes, linksRes, auditRes] = await Promise.all([
        fetch(`/api/budget/${budgetId}/sharing/users`),
        fetch(`/api/budget/${budgetId}/sharing/invitations`),
        fetch(`/api/budget/${budgetId}/sharing/links`),
        fetch(`/api/budget/${budgetId}/sharing/audit`),
      ]);

      if (!usersRes.ok || !invitesRes.ok || !linksRes.ok || !auditRes.ok) {
        throw new Error('Failed to load sharing data');
      }

      const [usersData, invitesData, linksData, auditData] = await Promise.all([
        usersRes.json(),
        invitesRes.json(),
        linksRes.json(),
        auditRes.json(),
      ]);

      setSharedUsers(
        usersData.users.map((u: any) => ({
          ...u,
          invited_at: new Date(u.invited_at),
          last_accessed: u.last_accessed
            ? new Date(u.last_accessed)
            : undefined,
          access_expires: u.access_expires
            ? new Date(u.access_expires)
            : undefined,
        })),
      );

      setInvitations(
        invitesData.invitations.map((i: any) => ({
          ...i,
          expires_at: new Date(i.expires_at),
        })),
      );

      setShareLinks(
        linksData.links.map((l: any) => ({
          ...l,
          created_at: new Date(l.created_at),
          expires_at: l.expires_at ? new Date(l.expires_at) : undefined,
        })),
      );

      setAuditLog(
        auditData.entries.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load sharing data',
      );
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!inviteEmail) return;

    try {
      const response = await fetch(`/api/budget/${budgetId}/sharing/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          permissions: customPermissions,
          message: inviteMessage,
        }),
      });

      if (!response.ok) throw new Error('Failed to send invitation');

      const { invitation } = await response.json();
      setInvitations([
        ...invitations,
        {
          ...invitation,
          expires_at: new Date(invitation.expires_at),
        },
      ]);

      // Reset form
      setInviteEmail('');
      setInviteMessage('');
      setShowInviteModal(false);

      // Log action
      logAction('sent_invitation', `Invited ${inviteEmail} as ${inviteRole}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send invitation',
      );
    }
  };

  const createShareLink = async () => {
    try {
      const response = await fetch(
        `/api/budget/${budgetId}/sharing/create-link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: inviteRole,
            permissions: customPermissions,
            expires_in_days: linkExpiry,
            max_uses: linkMaxUses,
            password: linkPassword || undefined,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to create share link');

      const { link } = await response.json();
      setShareLinks([
        ...shareLinks,
        {
          ...link,
          created_at: new Date(link.created_at),
          expires_at: link.expires_at ? new Date(link.expires_at) : undefined,
        },
      ]);

      setShowLinkModal(false);
      logAction(
        'created_share_link',
        `Created share link with role ${inviteRole}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create share link',
      );
    }
  };

  const updateUserPermissions = async (
    userId: string,
    permissions: BudgetPermissions,
  ) => {
    try {
      const response = await fetch(
        `/api/budget/${budgetId}/sharing/users/${userId}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions }),
        },
      );

      if (!response.ok) throw new Error('Failed to update permissions');

      setSharedUsers(
        sharedUsers.map((u) => (u.id === userId ? { ...u, permissions } : u)),
      );

      setShowPermissionsModal(false);
      logAction(
        'updated_permissions',
        `Updated permissions for user ${userId}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update permissions',
      );
    }
  };

  const removeUser = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/budget/${budgetId}/sharing/users/${userId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) throw new Error('Failed to remove user');

      setSharedUsers(sharedUsers.filter((u) => u.id !== userId));
      logAction('removed_user', `Removed user ${userId} from budget`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const revokeLink = async (linkId: string) => {
    try {
      const response = await fetch(
        `/api/budget/${budgetId}/sharing/links/${linkId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) throw new Error('Failed to revoke link');

      setShareLinks(
        shareLinks.map((l) =>
          l.id === linkId ? { ...l, is_active: false } : l,
        ),
      );

      logAction('revoked_link', `Revoked share link ${linkId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link');
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(
        `/api/budget/${budgetId}/sharing/invitations/${invitationId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) throw new Error('Failed to cancel invitation');

      setInvitations(invitations.filter((i) => i.id !== invitationId));
      logAction('cancelled_invitation', `Cancelled invitation ${invitationId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to cancel invitation',
      );
    }
  };

  const logAction = async (action: string, details: string) => {
    const entry: AuditLogEntry = {
      id: Date.now().toString(),
      user_id: currentUserId,
      user_name: 'Current User', // Would be fetched from user context
      action,
      details,
      timestamp: new Date(),
    };

    setAuditLog([entry, ...auditLog]);

    // Send to server
    await fetch(`/api/budget/${budgetId}/sharing/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    // Show toast notification
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-gold-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-primary-600" />;
      case 'editor':
        return <Edit3 className="w-4 h-4 text-blue-600" />;
      default:
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-gold-100 text-gold-700 border-gold-200';
      case 'admin':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'editor':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              Budget Sharing & Permissions
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Collaborate with family, friends, and wedding planners
            </p>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Link className="w-4 h-4" />
                Create Link
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invite User
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error-600" />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            {
              key: 'users',
              label: 'Users',
              icon: Users,
              count: sharedUsers.length,
            },
            {
              key: 'invitations',
              label: 'Invitations',
              icon: Mail,
              count: invitations.filter((i) => i.status === 'pending').length,
            },
            {
              key: 'links',
              label: 'Share Links',
              icon: Link,
              count: shareLinks.filter((l) => l.is_active).length,
            },
            { key: 'audit', label: 'Activity Log', icon: History, count: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                activeTab === tab.key
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {sharedUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">
                  No users have access to this budget yet
                </p>
                <p className="text-sm text-gray-400">
                  Invite users to collaborate on wedding budget planning
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isOwner={isOwner}
                    onEditPermissions={() => {
                      setSelectedUser(user);
                      setCustomPermissions(user.permissions);
                      setShowPermissionsModal(true);
                    }}
                    onRemove={() => removeUser(user.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {invitations.filter((i) => i.status === 'pending').length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No pending invitations</p>
                <p className="text-sm text-gray-400">
                  All invitations have been accepted or expired
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations
                  .filter((i) => i.status === 'pending')
                  .map((invitation) => (
                    <InvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      onCancel={() => cancelInvitation(invitation.id)}
                      onResend={() => {
                        /* Implement resend */
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Share Links Tab */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {shareLinks.filter((l) => l.is_active).length === 0 ? (
              <div className="text-center py-8">
                <Link className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No active share links</p>
                <p className="text-sm text-gray-400">
                  Create shareable links for easy budget access
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks
                  .filter((l) => l.is_active)
                  .map((link) => (
                    <ShareLinkCard
                      key={link.id}
                      link={link}
                      onCopy={() => copyShareLink(link.url)}
                      onRevoke={() => revokeLink(link.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {auditLog.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No activity recorded yet</p>
                <p className="text-sm text-gray-400">
                  All sharing actions will be logged here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.slice(0, 20).map((entry) => (
                  <AuditLogCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={sendInvitation}
          email={inviteEmail}
          setEmail={setInviteEmail}
          role={inviteRole}
          setRole={setInviteRole}
          message={inviteMessage}
          setMessage={setInviteMessage}
          permissions={customPermissions}
          setPermissions={setCustomPermissions}
        />
      )}

      {/* Create Link Modal */}
      {showLinkModal && (
        <CreateLinkModal
          onClose={() => setShowLinkModal(false)}
          onCreate={createShareLink}
          role={inviteRole}
          setRole={setInviteRole}
          expiry={linkExpiry}
          setExpiry={setLinkExpiry}
          maxUses={linkMaxUses}
          setMaxUses={setLinkMaxUses}
          password={linkPassword}
          setPassword={setLinkPassword}
          permissions={customPermissions}
          setPermissions={setCustomPermissions}
        />
      )}

      {/* Edit Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <EditPermissionsModal
          user={selectedUser}
          permissions={customPermissions}
          setPermissions={setCustomPermissions}
          onSave={() =>
            updateUserPermissions(selectedUser.id, customPermissions)
          }
          onClose={() => setShowPermissionsModal(false)}
        />
      )}
    </div>
  );
}

// Component implementations would follow...
// UserCard, InvitationCard, ShareLinkCard, AuditLogCard
// InviteUserModal, CreateLinkModal, EditPermissionsModal

interface UserCardProps {
  user: SharedUser;
  isOwner: boolean;
  onEditPermissions: () => void;
  onRemove: () => void;
}

function UserCard({
  user,
  isOwner,
  onEditPermissions,
  onRemove,
}: UserCardProps) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{user.name}</h4>
              <span
                className={cn(
                  'px-2 py-1 text-xs rounded-full border',
                  getRoleBadgeColor(user.role),
                )}
              >
                {getRoleIcon(user.role)}
                {user.role}
              </span>
            </div>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && user.role !== 'owner' && (
            <>
              <button
                onClick={onEditPermissions}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onRemove}
                className="p-2 text-error-600 hover:bg-error-50 rounded-md transition-colors"
              >
                <UserX className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InvitationCard({ invitation, onCancel, onResend }: any) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{invitation.email}</h4>
          <p className="text-sm text-gray-600">
            Expires {invitation.expires_at.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResend}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Resend
          </button>
          <button
            onClick={onCancel}
            className="text-sm text-error-600 hover:text-error-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareLinkCard({ link, onCopy, onRevoke }: any) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">
            Share Link ({link.role})
          </h4>
          <p className="text-sm text-gray-600">
            {link.current_uses}/{link.max_uses || '∞'} uses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onRevoke}
            className="p-2 text-error-600 hover:bg-error-50 rounded-md"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditLogCard({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg text-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-900">{entry.user_name}</span>
          <span className="text-gray-600"> {entry.details}</span>
        </div>
        <span className="text-xs text-gray-500">
          {entry.timestamp.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// Modal components would be implemented similarly...
function InviteUserModal({
  onClose,
  onInvite,
  email,
  setEmail,
  role,
  setRole,
  message,
  setMessage,
  permissions,
  setPermissions,
}: any) {
  return null; // Implementation would go here
}

function CreateLinkModal({
  onClose,
  onCreate,
  role,
  setRole,
  expiry,
  setExpiry,
  maxUses,
  setMaxUses,
  password,
  setPassword,
  permissions,
  setPermissions,
}: any) {
  return null; // Implementation would go here
}

function EditPermissionsModal({
  user,
  permissions,
  setPermissions,
  onSave,
  onClose,
}: any) {
  return null; // Implementation would go here
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'owner':
      return 'bg-gold-100 text-gold-700 border-gold-200';
    case 'admin':
      return 'bg-primary-100 text-primary-700 border-primary-200';
    case 'editor':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
