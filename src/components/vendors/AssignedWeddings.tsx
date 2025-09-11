'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@heroicons/react/20/solid';

interface WeddingAssignment {
  id: string;
  wedding_id: string;
  couple_names: string;
  wedding_date: string;
  venue_name: string;
  status: 'active' | 'completed' | 'upcoming';
  timeline_access: boolean;
  communication_enabled: boolean;
}

interface DetailedWedding extends WeddingAssignment {
  couple_email?: string;
  couple_phone?: string;
  guest_count?: number;
  venue_address?: string;
  budget_range?: string;
  timeline_milestones?: any[];
  other_vendors?: any[];
  notes?: string;
  next_milestone?: {
    title: string;
    date: string;
    description: string;
  };
}

interface Props {
  weddings: WeddingAssignment[];
}

export function AssignedWeddings({ weddings }: Props) {
  const [detailedWeddings, setDetailedWeddings] = useState<DetailedWedding[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWedding, setSelectedWedding] =
    useState<DetailedWedding | null>(null);
  const [showWeddingDetails, setShowWeddingDetails] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadDetailedWeddings();
  }, [weddings]);

  async function loadDetailedWeddings() {
    if (weddings.length === 0) return;

    const detailed = await Promise.all(
      weddings.map(async (wedding) => {
        try {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', wedding.wedding_id)
            .single();

          if (error) {
            console.error('Error loading client details:', error);
            return { ...wedding, couple_email: '', couple_phone: '' };
          }

          // Load other vendors for this wedding
          const { data: otherVendors } = await supabase
            .from('supplier_client_connections')
            .select(
              `
            suppliers (
              business_name,
              primary_category,
              phone,
              email
            )
          `,
            )
            .eq('client_id', wedding.wedding_id)
            .neq('id', wedding.id);

          return {
            ...wedding,
            couple_email: clientData.email,
            couple_phone: clientData.phone,
            guest_count: clientData.guest_count,
            venue_address: clientData.venue_address,
            budget_range: clientData.budget_range,
            notes: clientData.notes,
            other_vendors: otherVendors?.map((v) => v.suppliers) || [],
            next_milestone: {
              title: 'Initial Meeting',
              date: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              description: 'Schedule initial consultation with couple',
            },
          } as DetailedWedding;
        } catch (error) {
          console.error('Error processing wedding:', error);
          return { ...wedding, couple_email: '', couple_phone: '' };
        }
      }),
    );

    setDetailedWeddings(detailed);
  }

  const filteredWeddings = detailedWeddings.filter((wedding) => {
    const matchesSearch =
      wedding.couple_names.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wedding.venue_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || wedding.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-600">Upcoming</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-600">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-600">Completed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysUntilWedding = (dateString: string) => {
    const weddingDate = new Date(dateString);
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleViewWeddingDetails = (wedding: DetailedWedding) => {
    setSelectedWedding(wedding);
    setShowWeddingDetails(true);
  };

  const statusCounts = {
    all: detailedWeddings.length,
    upcoming: detailedWeddings.filter((w) => w.status === 'upcoming').length,
    active: detailedWeddings.filter((w) => w.status === 'active').length,
    completed: detailedWeddings.filter((w) => w.status === 'completed').length,
  };

  if (showWeddingDetails && selectedWedding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => setShowWeddingDetails(false)}
          >
            ← Back to Weddings
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedWedding.couple_names}
            </h2>
            <p className="text-gray-600">
              {formatDate(selectedWedding.wedding_date)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Wedding Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Couple
                  </label>
                  <p className="text-gray-900">
                    {selectedWedding.couple_names}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Wedding Date
                  </label>
                  <p className="text-gray-900">
                    {formatDate(selectedWedding.wedding_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Venue
                  </label>
                  <p className="text-gray-900">{selectedWedding.venue_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Guest Count
                  </label>
                  <p className="text-gray-900">
                    {selectedWedding.guest_count || 'TBD'}
                  </p>
                </div>
                {selectedWedding.venue_address && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">
                      Venue Address
                    </label>
                    <p className="text-gray-900">
                      {selectedWedding.venue_address}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Other Vendors</h3>
              {selectedWedding.other_vendors?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No other vendors assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedWedding.other_vendors?.map((vendor, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{vendor.business_name}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {vendor.primary_category}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {vendor.phone && (
                          <Button size="sm" variant="outline">
                            <PhoneIcon className="size-4" />
                          </Button>
                        )}
                        {vendor.email && (
                          <Button size="sm" variant="outline">
                            <EnvelopeIcon className="size-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <ChatBubbleBottomCenterTextIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Timeline Access</h3>
              {selectedWedding.timeline_access ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircleIcon className="size-5" />
                    <span className="font-medium">
                      Full Timeline Access Granted
                    </span>
                  </div>

                  {selectedWedding.next_milestone && (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ClockIcon className="size-5 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Next Milestone
                        </span>
                      </div>
                      <h4 className="font-semibold text-blue-900">
                        {selectedWedding.next_milestone.title}
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {formatDate(selectedWedding.next_milestone.date)}
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        {selectedWedding.next_milestone.description}
                      </p>
                    </div>
                  )}

                  <Button className="w-full">
                    <CalendarDaysIcon className="size-4 mr-2" />
                    View Full Timeline
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <ExclamationTriangleIcon className="size-8 mx-auto text-orange-400 mb-2" />
                  <p className="text-gray-600">Limited timeline access</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Contact the couple or planner for full access
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Contact Information
              </h3>
              <div className="space-y-3">
                {selectedWedding.couple_email && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="size-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">
                        {selectedWedding.couple_email}
                      </p>
                    </div>
                  </div>
                )}
                {selectedWedding.couple_phone && (
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="size-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">
                        {selectedWedding.couple_phone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="flex-1">
                  <EnvelopeIcon className="size-4 mr-1" />
                  Email
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <ChatBubbleBottomCenterTextIcon className="size-4 mr-1" />
                  Message
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Wedding Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  {getStatusBadge(selectedWedding.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Days Until Wedding</span>
                  <span className="font-medium">
                    {getDaysUntilWedding(selectedWedding.wedding_date)} days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Communication</span>
                  <Badge
                    className={
                      selectedWedding.communication_enabled
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }
                  >
                    {selectedWedding.communication_enabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <DocumentTextIcon className="size-4 mr-2" />
                  Update Delivery Status
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ChatBubbleBottomCenterTextIcon className="size-4 mr-2" />
                  Send Update to Couple
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDaysIcon className="size-4 mr-2" />
                  Schedule Meeting
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExclamationTriangleIcon className="size-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="size-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search couples or venues..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status ({statusCounts.all})</option>
          <option value="upcoming">Upcoming ({statusCounts.upcoming})</option>
          <option value="active">Active ({statusCounts.active})</option>
          <option value="completed">
            Completed ({statusCounts.completed})
          </option>
        </select>
      </div>

      {/* Weddings List */}
      {filteredWeddings.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDaysIcon className="size-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all'
              ? 'No matching weddings'
              : 'No weddings assigned'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Wedding assignments will appear here when clients book your services'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWeddings.map((wedding) => (
            <Card
              key={wedding.id}
              className="p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {wedding.couple_names}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <CalendarDaysIcon className="size-4" />
                      {formatDate(wedding.wedding_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="size-4" />
                      {wedding.venue_name}
                    </div>
                  </div>
                </div>
                {getStatusBadge(wedding.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-600">Days until wedding:</span>
                  <p className="font-medium">
                    {getDaysUntilWedding(wedding.wedding_date)} days
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Timeline access:</span>
                  <p
                    className={`font-medium ${wedding.timeline_access ? 'text-green-600' : 'text-orange-600'}`}
                  >
                    {wedding.timeline_access ? 'Full access' : 'Limited'}
                  </p>
                </div>
              </div>

              {wedding.other_vendors && wedding.other_vendors.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Other vendors:</p>
                  <div className="flex flex-wrap gap-2">
                    {wedding.other_vendors.slice(0, 3).map((vendor, index) => (
                      <Badge
                        key={index}
                        className="text-xs bg-gray-100 text-gray-700"
                      >
                        {vendor.business_name} ({vendor.primary_category})
                      </Badge>
                    ))}
                    {wedding.other_vendors.length > 3 && (
                      <Badge className="text-xs bg-gray-100 text-gray-700">
                        +{wedding.other_vendors.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleViewWeddingDetails(wedding)}
                >
                  <EyeIcon className="size-4 mr-1" />
                  View Details
                </Button>
                <Button size="sm" variant="outline">
                  <ChatBubbleBottomCenterTextIcon className="size-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <CalendarDaysIcon className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
