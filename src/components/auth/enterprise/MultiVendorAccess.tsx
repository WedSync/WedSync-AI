'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Users,
  Shield,
  Link,
  Unlink,
  CheckCircle,
  AlertTriangle,
  Crown,
  UserCheck,
  Eye,
  EyeOff,
  Settings,
  Clock,
  Star,
  Share2,
  Search,
  Filter,
} from 'lucide-react';

interface VendorOrganization {
  id: string;
  name: string;
  type:
    | 'photography'
    | 'venue'
    | 'catering'
    | 'florist'
    | 'music'
    | 'planning'
    | 'transport'
    | 'other';
  logo?: string;
  website?: string;
  ssoEnabled: boolean;
  memberCount: number;
  activeMembers: number;
  lastActivity: Date;
  trustLevel: 'verified' | 'trusted' | 'standard' | 'pending';
  permissions: string[];
  connectedSince: Date;
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
  };
  weddingsShared: number;
  averageRating: number;
  certifications: string[];
}

interface CrossVendorPermission {
  id: string;
  name: string;
  description: string;
  category:
    | 'communication'
    | 'scheduling'
    | 'data_sharing'
    | 'collaboration'
    | 'financial';
  riskLevel: 'low' | 'medium' | 'high';
  requiredTrustLevel: 'standard' | 'trusted' | 'verified';
}

interface AccessRequest {
  id: string;
  fromOrganizationId: string;
  fromOrganizationName: string;
  toOrganizationId: string;
  toOrganizationName: string;
  requestedPermissions: string[];
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date;
  };
}

interface MultiVendorAccessProps {
  organizationId: string;
  currentUserRole?: string;
  onAccessGranted?: (request: AccessRequest) => void;
  onAccessRevoked?: (organizationId: string) => void;
  showPendingRequests?: boolean;
}

// Default cross-vendor permissions
const crossVendorPermissions: CrossVendorPermission[] = [
  // Communication
  {
    id: 'send_messages',
    name: 'Send Messages',
    description: 'Send direct messages to team members',
    category: 'communication',
    riskLevel: 'low',
    requiredTrustLevel: 'standard',
  },
  {
    id: 'view_contacts',
    name: 'View Contacts',
    description: 'Access contact information for coordination',
    category: 'communication',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },

  // Scheduling
  {
    id: 'view_timeline',
    name: 'View Wedding Timeline',
    description: 'See wedding day schedule and timing',
    category: 'scheduling',
    riskLevel: 'low',
    requiredTrustLevel: 'standard',
  },
  {
    id: 'suggest_timeline',
    name: 'Suggest Timeline Changes',
    description: 'Propose changes to wedding schedule',
    category: 'scheduling',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },
  {
    id: 'block_calendar',
    name: 'Block Calendar Time',
    description: 'Reserve time slots in shared calendar',
    category: 'scheduling',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },

  // Data Sharing
  {
    id: 'view_guest_count',
    name: 'View Guest Count',
    description: 'Access guest numbers for planning',
    category: 'data_sharing',
    riskLevel: 'low',
    requiredTrustLevel: 'standard',
  },
  {
    id: 'view_dietary_requirements',
    name: 'View Dietary Requirements',
    description: 'Access guest dietary needs and restrictions',
    category: 'data_sharing',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },
  {
    id: 'view_venue_details',
    name: 'View Venue Details',
    description: 'Access venue specifications and layout',
    category: 'data_sharing',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },

  // Collaboration
  {
    id: 'share_documents',
    name: 'Share Documents',
    description: 'Share files and documents with team',
    category: 'collaboration',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },
  {
    id: 'collaborative_editing',
    name: 'Collaborative Editing',
    description: 'Edit shared documents and plans',
    category: 'collaboration',
    riskLevel: 'high',
    requiredTrustLevel: 'verified',
  },
  {
    id: 'task_assignment',
    name: 'Assign Tasks',
    description: 'Create and assign tasks to team members',
    category: 'collaboration',
    riskLevel: 'medium',
    requiredTrustLevel: 'trusted',
  },

  // Financial
  {
    id: 'view_budget_allocation',
    name: 'View Budget Allocation',
    description: 'See budget allocated for services',
    category: 'financial',
    riskLevel: 'high',
    requiredTrustLevel: 'verified',
  },
  {
    id: 'submit_invoices',
    name: 'Submit Invoices',
    description: 'Submit invoices directly through platform',
    category: 'financial',
    riskLevel: 'high',
    requiredTrustLevel: 'verified',
  },
];

// Vendor type configurations
const vendorTypes = {
  photography: { icon: '📸', label: 'Photography', color: 'bg-yellow-500' },
  venue: { icon: '🏛️', label: 'Venue', color: 'bg-green-500' },
  catering: { icon: '🍽️', label: 'Catering', color: 'bg-orange-500' },
  florist: { icon: '🌺', label: 'Florist', color: 'bg-pink-500' },
  music: { icon: '🎵', label: 'Music/DJ', color: 'bg-purple-500' },
  planning: { icon: '📋', label: 'Planning', color: 'bg-blue-500' },
  transport: { icon: '🚗', label: 'Transport', color: 'bg-gray-500' },
  other: { icon: '🛍️', label: 'Other', color: 'bg-slate-500' },
};

export default function MultiVendorAccess({
  organizationId,
  currentUserRole = 'admin',
  onAccessGranted,
  onAccessRevoked,
  showPendingRequests = true,
}: MultiVendorAccessProps) {
  const [connectedVendors, setConnectedVendors] = useState<
    VendorOrganization[]
  >([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] =
    useState<VendorOrganization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTrust, setFilterTrust] = useState<string>('all');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const supabase = createClient();

  const canManageAccess = ['admin', 'owner', 'manager'].includes(
    currentUserRole,
  );

  useEffect(() => {
    loadConnectedVendors();
    loadAccessRequests();
  }, [organizationId]);

  const loadConnectedVendors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_connections')
        .select(
          `
          *,
          connected_organization:organizations!connected_organization_id(
            id, name, organization_type, logo_url, website,
            organization_stats(member_count, active_members, last_activity),
            organization_ratings(average_rating, total_reviews)
          )
        `,
        )
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('connected_since', { ascending: false });

      if (error) throw error;

      const vendors: VendorOrganization[] = (data || []).map((connection) => {
        const org = connection.connected_organization;
        return {
          id: org.id,
          name: org.name,
          type: org.organization_type || 'other',
          logo: org.logo_url,
          website: org.website,
          ssoEnabled: connection.sso_enabled || false,
          memberCount: org.organization_stats?.member_count || 0,
          activeMembers: org.organization_stats?.active_members || 0,
          lastActivity: new Date(
            org.organization_stats?.last_activity || connection.connected_since,
          ),
          trustLevel: connection.trust_level || 'standard',
          permissions: connection.granted_permissions || [],
          connectedSince: new Date(connection.connected_since),
          primaryContact: {
            name: connection.primary_contact_name,
            email: connection.primary_contact_email,
            phone: connection.primary_contact_phone,
          },
          weddingsShared: connection.weddings_shared || 0,
          averageRating: org.organization_ratings?.average_rating || 0,
          certifications: connection.certifications || [],
        };
      });

      setConnectedVendors(vendors);
    } catch (error) {
      console.error('Error loading connected vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccessRequests = async () => {
    if (!showPendingRequests) return;

    try {
      const { data, error } = await supabase
        .from('vendor_access_requests')
        .select(
          `
          *,
          from_organization:organizations!from_organization_id(name),
          to_organization:organizations!to_organization_id(name),
          wedding:weddings(id, couple_name, wedding_date)
        `,
        )
        .or(
          `from_organization_id.eq.${organizationId},to_organization_id.eq.${organizationId}`,
        )
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const requests: AccessRequest[] = (data || []).map((request) => ({
        id: request.id,
        fromOrganizationId: request.from_organization_id,
        fromOrganizationName: request.from_organization.name,
        toOrganizationId: request.to_organization_id,
        toOrganizationName: request.to_organization.name,
        requestedPermissions: request.requested_permissions || [],
        reason: request.reason || '',
        status: request.status,
        requestedAt: new Date(request.requested_at),
        respondedAt: request.responded_at
          ? new Date(request.responded_at)
          : undefined,
        expiresAt: new Date(request.expires_at),
        weddingContext: request.wedding
          ? {
              weddingId: request.wedding.id,
              coupleName: request.wedding.couple_name,
              weddingDate: new Date(request.wedding.wedding_date),
            }
          : undefined,
      }));

      setAccessRequests(requests);
    } catch (error) {
      console.error('Error loading access requests:', error);
    }
  };

  const approveAccessRequest = async (requestId: string) => {
    if (!canManageAccess) return;

    try {
      const { error } = await supabase
        .from('vendor_access_requests')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      const request = accessRequests.find((r) => r.id === requestId);
      if (request) {
        onAccessGranted?.(request);
      }

      await loadAccessRequests();
    } catch (error) {
      console.error('Error approving access request:', error);
    }
  };

  const denyAccessRequest = async (requestId: string) => {
    if (!canManageAccess) return;

    try {
      const { error } = await supabase
        .from('vendor_access_requests')
        .update({
          status: 'denied',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadAccessRequests();
    } catch (error) {
      console.error('Error denying access request:', error);
    }
  };

  const updateVendorPermissions = async (
    vendorId: string,
    permissions: string[],
  ) => {
    if (!canManageAccess) return;

    try {
      const { error } = await supabase
        .from('vendor_connections')
        .update({ granted_permissions: permissions })
        .eq('organization_id', organizationId)
        .eq('connected_organization_id', vendorId);

      if (error) throw error;

      await loadConnectedVendors();
    } catch (error) {
      console.error('Error updating vendor permissions:', error);
    }
  };

  const revokeVendorAccess = async (vendorId: string) => {
    if (!canManageAccess) return;

    try {
      const { error } = await supabase
        .from('vendor_connections')
        .update({ status: 'revoked' })
        .eq('organization_id', organizationId)
        .eq('connected_organization_id', vendorId);

      if (error) throw error;

      onAccessRevoked?.(vendorId);
      await loadConnectedVendors();
    } catch (error) {
      console.error('Error revoking vendor access:', error);
    }
  };

  const getTrustBadge = (trustLevel: string) => {
    const config = {
      verified: {
        variant: 'success' as const,
        text: '✓ Verified',
        icon: CheckCircle,
      },
      trusted: { variant: 'default' as const, text: '⭐ Trusted', icon: Star },
      standard: {
        variant: 'secondary' as const,
        text: 'Standard',
        icon: UserCheck,
      },
      pending: { variant: 'outline' as const, text: 'Pending', icon: Clock },
    };

    const trustConfig =
      config[trustLevel as keyof typeof config] || config.standard;
    const Icon = trustConfig.icon;

    return (
      <Badge variant={trustConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {trustConfig.text}
      </Badge>
    );
  };

  const getPermissionRiskBadge = (riskLevel: string) => {
    const config = {
      low: { variant: 'success' as const, text: 'Low Risk' },
      medium: { variant: 'warning' as const, text: 'Medium Risk' },
      high: { variant: 'destructive' as const, text: 'High Risk' },
    };

    return (
      <Badge
        variant={config[riskLevel as keyof typeof config].variant}
        className="text-xs"
      >
        {config[riskLevel as keyof typeof config].text}
      </Badge>
    );
  };

  const filteredVendors = connectedVendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.primaryContact.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || vendor.type === filterType;
    const matchesTrust =
      filterTrust === 'all' || vendor.trustLevel === filterTrust;

    return matchesSearch && matchesType && matchesTrust;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading vendor connections...
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
            <Link className="h-6 w-6" />
            Multi-Vendor Access
          </h2>
          <p className="text-muted-foreground">
            Manage cross-vendor team access and collaboration permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {connectedVendors.length} Connected
          </Badge>
          {accessRequests.length > 0 && (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {accessRequests.length} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Types</option>
                {Object.entries(vendorTypes).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={filterTrust}
                onChange={(e) => setFilterTrust(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Trust Levels</option>
                <option value="verified">Verified</option>
                <option value="trusted">Trusted</option>
                <option value="standard">Standard</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Access Requests */}
      {accessRequests.length > 0 && showPendingRequests && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pending Access Requests ({accessRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accessRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {request.fromOrganizationId === organizationId
                          ? `Request to ${request.toOrganizationName}`
                          : `Request from ${request.fromOrganizationName}`}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {request.requestedPermissions.length} permissions
                      </Badge>
                    </div>
                    {request.weddingContext && (
                      <p className="text-sm text-muted-foreground">
                        For: {request.weddingContext.coupleName} -{' '}
                        {request.weddingContext.weddingDate.toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.reason || 'No reason provided'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested: {request.requestedAt.toLocaleDateString()} •
                      Expires: {request.expiresAt.toLocaleDateString()}
                    </p>
                  </div>

                  {canManageAccess &&
                    request.toOrganizationId === organizationId && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveAccessRequest(request.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => denyAccessRequest(request.id)}
                        >
                          Deny
                        </Button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => {
          const vendorConfig = vendorTypes[vendor.type] || vendorTypes.other;

          return (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={vendor.logo} />
                    <AvatarFallback
                      className={`${vendorConfig.color} text-white`}
                    >
                      {vendorConfig.icon}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">{vendor.name}</h4>
                      {getTrustBadge(vendor.trustLevel)}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {vendorConfig.label}
                      </Badge>
                      {vendor.ssoEnabled && (
                        <Badge
                          variant="success"
                          className="text-xs flex items-center gap-1"
                        >
                          <Shield className="h-2 w-2" />
                          SSO
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {vendor.primaryContact.name} •{' '}
                      {vendor.primaryContact.email}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {vendor.activeMembers}/{vendor.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {vendor.averageRating.toFixed(1)}
                      </span>
                      <span>{vendor.weddingsShared} weddings</span>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>
                        {vendor.permissions.length} permissions granted
                      </span>
                      <span className="mx-1">•</span>
                      <span>
                        Connected {vendor.connectedSince.toLocaleDateString()}
                      </span>
                    </div>

                    {vendor.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {vendor.certifications.slice(0, 2).map((cert) => (
                          <Badge
                            key={cert}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cert}
                          </Badge>
                        ))}
                        {vendor.certifications.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{vendor.certifications.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canManageAccess && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedVendor(vendor)}
                      className="flex-1"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Permissions
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Revoke access for ${vendor.name}?`)) {
                          revokeVendorAccess(vendor.id);
                        }
                      }}
                    >
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredVendors.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Link className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Connected Vendors</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterType !== 'all' || filterTrust !== 'all'
                ? 'No vendors match your current filters'
                : 'Start connecting with other wedding professionals to enable seamless collaboration'}
            </p>
            {!searchTerm && filterType === 'all' && filterTrust === 'all' && (
              <Button>
                <Link className="h-4 w-4 mr-2" />
                Connect Vendors
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permissions Modal */}
      {selectedVendor && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manage Permissions: {selectedVendor.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto max-h-96">
              {Object.entries(
                crossVendorPermissions.reduce(
                  (acc, permission) => {
                    if (!acc[permission.category])
                      acc[permission.category] = [];
                    acc[permission.category].push(permission);
                    return acc;
                  },
                  {} as Record<string, CrossVendorPermission[]>,
                ),
              ).map(([category, permissions]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium capitalize">
                    {category.replace('_', ' ')} Permissions
                  </h4>
                  <div className="space-y-2">
                    {permissions
                      .filter(
                        (p) =>
                          selectedVendor.trustLevel >= p.requiredTrustLevel,
                      )
                      .map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-sm">
                                {permission.name}
                              </h5>
                              {getPermissionRiskBadge(permission.riskLevel)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {permission.description}
                            </p>
                          </div>
                          <Switch
                            checked={selectedVendor.permissions.includes(
                              permission.id,
                            )}
                            onCheckedChange={(checked) => {
                              const updatedPermissions = checked
                                ? [...selectedVendor.permissions, permission.id]
                                : selectedVendor.permissions.filter(
                                    (p) => p !== permission.id,
                                  );
                              updateVendorPermissions(
                                selectedVendor.id,
                                updatedPermissions,
                              );
                            }}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t">
              <Button
                onClick={() => setSelectedVendor(null)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Wedding Industry Context */}
      <Alert>
        <Share2 className="h-4 w-4" />
        <AlertDescription>
          <strong>🎊 Wedding Vendor Network:</strong> Multi-vendor access
          enables seamless collaboration between photographers, venues,
          caterers, and coordinators while maintaining security and trust
          boundaries.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export type {
  VendorOrganization,
  CrossVendorPermission,
  AccessRequest,
  MultiVendorAccessProps,
};
