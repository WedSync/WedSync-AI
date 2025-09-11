'use client';

/**
 * WS-342 Vendor Coordination Panel - Real-time Multi-vendor Coordination
 * Team A - Frontend/UI Development - Vendor Collaboration Interface
 *
 * Real-time vendor coordination with status tracking, communication logs,
 * and conflict resolution for wedding planning
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  WeddingVendor,
  VendorUpdate,
  VendorCategory,
  VendorStatus,
  Communication,
  Contract,
  Collaborator,
} from '@/types/collaboration';

// Icons
import {
  Building,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  FileText,
  Star,
  MapPin,
  Users,
  Settings,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface VendorCoordinationPanelProps {
  weddingId: string;
  vendors: WeddingVendor[];
  onVendorUpdate: (update: VendorUpdate) => void;
  collaborationMode: 'real_time' | 'batch';
  permissions?: {
    canEditVendors: boolean;
    canAddVendors: boolean;
    canViewContracts: boolean;
    canCommunicate: boolean;
  };
  className?: string;
}

interface VendorCardProps {
  vendor: WeddingVendor;
  onUpdate: (vendorId: string, changes: Partial<WeddingVendor>) => void;
  onCommunicate: (vendorId: string, message: string) => void;
  onViewDetails: (vendorId: string) => void;
  permissions: {
    canEdit: boolean;
    canCommunicate: boolean;
    canViewContracts: boolean;
  };
}

interface VendorDetailsModalProps {
  vendor: WeddingVendor | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (vendorId: string, changes: Partial<WeddingVendor>) => void;
  onCommunicate: (vendorId: string, message: string) => void;
}

/**
 * Vendor Coordination Panel Component
 */
export function VendorCoordinationPanel({
  weddingId,
  vendors,
  onVendorUpdate,
  collaborationMode,
  permissions = {
    canEditVendors: true,
    canAddVendors: true,
    canViewContracts: true,
    canCommunicate: true,
  },
  className,
}: VendorCoordinationPanelProps) {
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<VendorCategory | 'all'>(
    'all',
  );
  const [filterStatus, setFilterStatus] = useState<VendorStatus | 'all'>('all');
  const [selectedVendor, setSelectedVendor] = useState<WeddingVendor | null>(
    null,
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newCommunication, setNewCommunication] = useState('');

  // Filter vendors based on search and filters
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contactInfo.company
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesCategory =
        filterCategory === 'all' || vendor.category === filterCategory;
      const matchesStatus =
        filterStatus === 'all' || vendor.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [vendors, searchTerm, filterCategory, filterStatus]);

  // Group vendors by category
  const vendorsByCategory = useMemo(() => {
    const grouped: { [key in VendorCategory]?: WeddingVendor[] } = {};
    filteredVendors.forEach((vendor) => {
      if (!grouped[vendor.category]) {
        grouped[vendor.category] = [];
      }
      grouped[vendor.category]!.push(vendor);
    });
    return grouped;
  }, [filteredVendors]);

  // Calculate vendor statistics
  const vendorStats = useMemo(() => {
    const total = vendors.length;
    const confirmed = vendors.filter(
      (v) => v.status === VendorStatus.CONFIRMED,
    ).length;
    const contracted = vendors.filter(
      (v) => v.status === VendorStatus.CONTRACTED,
    ).length;
    const pending = vendors.filter((v) =>
      [VendorStatus.INQUIRED, VendorStatus.QUOTED].includes(v.status),
    ).length;

    const totalBudget = vendors.reduce((sum, v) => sum + v.budget.quoted, 0);
    const spentBudget = vendors.reduce(
      (sum, v) => sum + (v.budget.paid || 0),
      0,
    );

    return { total, confirmed, contracted, pending, totalBudget, spentBudget };
  }, [vendors]);

  // Handle vendor updates
  const handleVendorUpdate = useCallback(
    (vendorId: string, changes: Partial<WeddingVendor>) => {
      const update: VendorUpdate = {
        id: `vendor-update-${Date.now()}`,
        type: 'UPDATE',
        entityType: 'VENDOR',
        entityId: vendorId,
        userId: 'current-user-id', // Should come from auth context
        timestamp: new Date(),
        data: changes,
        weddingId,
        action: 'VENDOR_UPDATED',
        vendorId,
        changes,
      };

      onVendorUpdate(update);
    },
    [onVendorUpdate, weddingId],
  );

  // Handle vendor communication
  const handleVendorCommunication = useCallback(
    (vendorId: string, message: string) => {
      const communication: Communication = {
        id: `comm-${Date.now()}`,
        type: 'MESSAGE',
        content: message,
        senderId: 'current-user-id',
        recipientIds: [vendorId],
        timestamp: new Date(),
        status: 'SENT',
      };

      const update: VendorUpdate = {
        id: `vendor-comm-${Date.now()}`,
        type: 'UPDATE',
        entityType: 'VENDOR',
        entityId: vendorId,
        userId: 'current-user-id',
        timestamp: new Date(),
        data: { communication },
        weddingId,
        action: 'COMMUNICATION_ADDED',
        vendorId,
        changes: { communications: [communication] },
      };

      onVendorUpdate(update);
    },
    [onVendorUpdate, weddingId],
  );

  // View vendor details
  const handleViewVendorDetails = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find((v) => v.id === vendorId);
      if (vendor) {
        setSelectedVendor(vendor);
        setIsDetailsModalOpen(true);
      }
    },
    [vendors],
  );

  // Get status color
  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case VendorStatus.CONFIRMED:
        return 'text-green-600 bg-green-50 border-green-200';
      case VendorStatus.CONTRACTED:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case VendorStatus.QUOTED:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case VendorStatus.INQUIRED:
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case VendorStatus.REJECTED:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: VendorCategory) => {
    switch (category) {
      case VendorCategory.VENUE:
        return <Building className="w-4 h-4" />;
      case VendorCategory.PHOTOGRAPHER:
        return <Settings className="w-4 h-4" />;
      case VendorCategory.CATERING:
        return <Settings className="w-4 h-4" />;
      case VendorCategory.FLORIST:
        return <Settings className="w-4 h-4" />;
      case VendorCategory.MUSIC:
        return <Settings className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={cn('vendor-coordination-panel space-y-6', className)}
      data-testid="vendor-coordination-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Vendor Coordination
          </h2>
          <p className="text-gray-600">
            Manage and coordinate with all wedding vendors in real-time
          </p>
        </div>

        {permissions.canAddVendors && (
          <Button className="bg-purple-600 text-white hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        )}
      </div>

      {/* Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Vendors
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorStats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorStats.confirmed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contracted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorStats.contracted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Budget Progress
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorStats.totalBudget > 0
                    ? `${Math.round((vendorStats.spentBudget / vendorStats.totalBudget) * 100)}%`
                    : '0%'}
                </p>
                <Progress
                  value={
                    vendorStats.totalBudget > 0
                      ? (vendorStats.spentBudget / vendorStats.totalBudget) *
                        100
                      : 0
                  }
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select
          value={filterCategory}
          onValueChange={(value: VendorCategory | 'all') =>
            setFilterCategory(value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.values(VendorCategory).map((category) => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(value: VendorStatus | 'all') =>
            setFilterStatus(value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(VendorStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vendor List */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <Building className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                No vendors found matching your criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onUpdate={handleVendorUpdate}
                  onCommunicate={handleVendorCommunication}
                  onViewDetails={handleViewVendorDetails}
                  permissions={{
                    canEdit: permissions.canEditVendors,
                    canCommunicate: permissions.canCommunicate,
                    canViewContracts: permissions.canViewContracts,
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="category" className="space-y-6">
          {Object.entries(vendorsByCategory).map(
            ([category, categoryVendors]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  {getCategoryIcon(category as VendorCategory)}
                  <span className="ml-2">
                    {category.charAt(0).toUpperCase() + category.slice(1)} (
                    {categoryVendors?.length || 0})
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryVendors?.map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor}
                      onUpdate={handleVendorUpdate}
                      onCommunicate={handleVendorCommunication}
                      onViewDetails={handleViewVendorDetails}
                      permissions={{
                        canEdit: permissions.canEditVendors,
                        canCommunicate: permissions.canCommunicate,
                        canViewContracts: permissions.canViewContracts,
                      }}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Timeline view coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Vendor Details Modal */}
      <VendorDetailsModal
        vendor={selectedVendor}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onUpdate={handleVendorUpdate}
        onCommunicate={handleVendorCommunication}
      />
    </div>
  );
}

/**
 * Vendor Card Component
 */
function VendorCard({
  vendor,
  onUpdate,
  onCommunicate,
  onViewDetails,
  permissions,
}: VendorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case VendorStatus.CONFIRMED:
        return 'text-green-600 bg-green-50 border-green-200';
      case VendorStatus.CONTRACTED:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case VendorStatus.QUOTED:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{vendor.name}</CardTitle>
            <p className="text-sm text-gray-600">{vendor.category}</p>
            <Badge
              className={cn('mt-2 text-xs', getStatusColor(vendor.status))}
            >
              {vendor.status}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onViewDetails(vendor.id)}>
                View Details
              </DropdownMenuItem>
              {permissions.canCommunicate && (
                <DropdownMenuItem onClick={() => {}}>
                  Send Message
                </DropdownMenuItem>
              )}
              {permissions.canEdit && (
                <DropdownMenuItem onClick={() => {}}>
                  Edit Vendor
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Contact Info */}
          <div className="space-y-1 text-sm">
            {vendor.contactInfo.email && (
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {vendor.contactInfo.email}
              </div>
            )}
            {vendor.contactInfo.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {vendor.contactInfo.phone}
              </div>
            )}
          </div>

          {/* Budget Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Budget</span>
              <span className="text-sm font-bold">
                ${vendor.budget.quoted.toLocaleString()}
              </span>
            </div>
            {vendor.budget.paid && (
              <div className="mt-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Paid: ${vendor.budget.paid.toLocaleString()}</span>
                  <span>
                    {Math.round(
                      (vendor.budget.paid / vendor.budget.quoted) * 100,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={(vendor.budget.paid / vendor.budget.quoted) * 100}
                  className="mt-1 h-1"
                />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(vendor.id)}
              className="flex-1"
            >
              View Details
            </Button>
            {permissions.canCommunicate && (
              <Button variant="outline" size="sm" onClick={() => {}}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Recent Communication */}
          {vendor.communications.length > 0 && (
            <div className="text-xs text-gray-500">
              Last contact:{' '}
              {new Date(
                vendor.communications[0].timestamp,
              ).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Vendor Details Modal Component (Placeholder)
 */
function VendorDetailsModal({
  vendor,
  isOpen,
  onClose,
  onUpdate,
  onCommunicate,
}: VendorDetailsModalProps) {
  if (!isOpen || !vendor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{vendor.name}</h2>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Modal content would go here */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Contact Information</h3>
                <div className="space-y-1 text-sm">
                  <p>{vendor.contactInfo.email}</p>
                  <p>{vendor.contactInfo.phone}</p>
                  <p>{vendor.contactInfo.address}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Services & Budget</h3>
                <div className="space-y-2">
                  {vendor.services.map((service) => (
                    <div key={service.id} className="text-sm">
                      <span className="font-medium">{service.name}</span>
                      <span className="float-right">${service.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Communication History */}
            <div>
              <h3 className="font-semibold mb-2">Communication History</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {vendor.communications.map((comm) => (
                  <div
                    key={comm.id}
                    className="text-sm border-l-2 border-gray-200 pl-3"
                  >
                    <p className="font-medium">{comm.type}</p>
                    <p className="text-gray-600">{comm.content}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(comm.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Communication */}
            <div>
              <h3 className="font-semibold mb-2">Send Message</h3>
              <div className="flex space-x-2">
                <Textarea placeholder="Type your message..." rows={3} />
                <Button onClick={() => onCommunicate(vendor.id, '')}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorCoordinationPanel;
