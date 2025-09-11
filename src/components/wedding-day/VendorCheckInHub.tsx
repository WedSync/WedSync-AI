'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Navigation,
  MessageCircle,
  MoreVertical,
  Filter,
  Search,
  UserCheck,
  UserX,
  Timer,
  Truck,
  Camera,
  Music,
  Flower,
  UtensilsCrossed,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import type { VendorCheckIn } from '@/types/wedding-day';

const vendorTypeIcons: Record<string, React.ComponentType<any>> = {
  photographer: Camera,
  florist: Flower,
  caterer: UtensilsCrossed,
  dj: Music,
  band: Music,
  officiant: Users,
  venue: MapPin,
  transportation: Truck,
  decorator: Palette,
  other: Users,
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'checked-in': 'bg-green-100 text-green-800 border-green-200',
  'on-site': 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  delayed: 'bg-red-100 text-red-800 border-red-200',
};

interface VendorCheckInHubProps {
  vendors: VendorCheckIn[];
  onVendorUpdate: (vendorId: string, update: Partial<VendorCheckIn>) => void;
  className?: string;
}

export function VendorCheckInHub({
  vendors,
  onVendorUpdate,
  className,
}: VendorCheckInHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorCheckIn | null>(
    null,
  );
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Filter vendors based on search and status
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.vendorType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || vendor.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get vendor counts by status
  const statusCounts = vendors.reduce(
    (acc, vendor) => {
      acc[vendor.status] = (acc[vendor.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleCheckIn = (vendor: VendorCheckIn) => {
    setSelectedVendor(vendor);
    setShowCheckInModal(true);
  };

  const handleStatusUpdate = (
    vendorId: string,
    status: VendorCheckIn['status'],
  ) => {
    onVendorUpdate(vendorId, {
      status,
      checkInTime:
        status === 'checked-in' ? new Date().toISOString() : undefined,
    });
  };

  const handleDelayReport = (
    vendorId: string,
    delayMinutes: number,
    reason: string,
  ) => {
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + delayMinutes);

    onVendorUpdate(vendorId, {
      status: 'delayed',
      delayMinutes,
      delayReason: reason,
      eta: eta.toISOString(),
    });
  };

  return (
    <div className={cn('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Vendor Check-In
            </h3>
            <span className="text-sm text-gray-500">
              (
              {
                vendors.filter(
                  (v) => v.status === 'checked-in' || v.status === 'on-site',
                ).length
              }
              /{vendors.length})
            </span>
          </div>
        </div>

        {/* Status Overview */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                statusColors[status as keyof typeof statusColors] ||
                  'bg-gray-100 text-gray-800 border-gray-200',
              )}
            >
              <span className="capitalize">{status.replace('-', ' ')}</span>
              <span className="ml-1">({count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors..."
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="checked-in">Checked In</option>
            <option value="on-site">On Site</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* Vendor List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Users className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">No vendors found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onCheckIn={() => handleCheckIn(vendor)}
                onStatusUpdate={(status) =>
                  handleStatusUpdate(vendor.id, status)
                }
                onDelayReport={(minutes, reason) =>
                  handleDelayReport(vendor.id, minutes, reason)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Check-In Modal */}
      {showCheckInModal && selectedVendor && (
        <CheckInModal
          vendor={selectedVendor}
          onClose={() => {
            setShowCheckInModal(false);
            setSelectedVendor(null);
          }}
          onCheckIn={(location, notes) => {
            onVendorUpdate(selectedVendor.id, {
              status: 'checked-in',
              checkInTime: new Date().toISOString(),
              location,
              notes,
            });
            setShowCheckInModal(false);
            setSelectedVendor(null);
          }}
        />
      )}
    </div>
  );
}

interface VendorCardProps {
  vendor: VendorCheckIn;
  onCheckIn: () => void;
  onStatusUpdate: (status: VendorCheckIn['status']) => void;
  onDelayReport: (minutes: number, reason: string) => void;
}

function VendorCard({
  vendor,
  onCheckIn,
  onStatusUpdate,
  onDelayReport,
}: VendorCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);

  const Icon = vendorTypeIcons[vendor.vendorType] || Users;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Vendor Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>

          {/* Vendor Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">{vendor.vendorName}</h4>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                  statusColors[vendor.status],
                )}
              >
                {vendor.status === 'checked-in' && (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                {vendor.status === 'delayed' && (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {vendor.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-gray-600 capitalize mb-2">
              {vendor.vendorType}
            </p>

            {/* Status Details */}
            <div className="space-y-1">
              {vendor.checkInTime && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    Checked in{' '}
                    {formatDistanceToNow(new Date(vendor.checkInTime), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}

              {vendor.eta && vendor.status === 'delayed' && (
                <div className="flex items-center gap-2 text-xs text-yellow-600">
                  <Timer className="w-3 h-3" />
                  <span>ETA: {format(new Date(vendor.eta), 'HH:mm')}</span>
                  {vendor.delayMinutes && (
                    <span>({vendor.delayMinutes}min delay)</span>
                  )}
                </div>
              )}

              {vendor.location && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{vendor.location.address}</span>
                </div>
              )}

              {vendor.delayReason && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>{vendor.delayReason}</span>
                </div>
              )}

              {vendor.notes && (
                <p className="text-xs text-gray-600 italic">{vendor.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Quick Actions */}
          {vendor.status === 'pending' && (
            <button
              onClick={onCheckIn}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Check In
            </button>
          )}

          {/* Contact Actions */}
          <div className="flex items-center gap-1">
            <a
              href={`tel:${vendor.contact.phone}`}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Call vendor"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href={`mailto:${vendor.contact.email}`}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Email vendor"
            >
              <Mail className="w-4 h-4" />
            </a>
            <button
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Send message"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-8 z-10 w-48 bg-white rounded-lg shadow-lg border py-1">
                {vendor.status !== 'checked-in' &&
                  vendor.status !== 'on-site' && (
                    <button
                      onClick={() => {
                        onStatusUpdate('checked-in');
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Mark as Checked In
                    </button>
                  )}

                {(vendor.status === 'checked-in' ||
                  vendor.status === 'on-site') && (
                  <button
                    onClick={() => {
                      onStatusUpdate('completed');
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    Mark as Completed
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowDelayModal(true);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Report Delay
                </button>

                <div className="border-t my-1"></div>

                <button className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50">
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delay Modal */}
      {showDelayModal && (
        <DelayReportModal
          vendor={vendor}
          onClose={() => setShowDelayModal(false)}
          onReport={onDelayReport}
        />
      )}
    </div>
  );
}

interface CheckInModalProps {
  vendor: VendorCheckIn;
  onClose: () => void;
  onCheckIn: (location: VendorCheckIn['location'], notes?: string) => void;
}

function CheckInModal({ vendor, onClose, onCheckIn }: CheckInModalProps) {
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<VendorCheckIn['location']>();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current Location',
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckIn(location, notes || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Check In: {vendor.vendorName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (Optional)
            </label>
            {location ? (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">
                  Location captured ({location.lat.toFixed(6)},{' '}
                  {location.lng.toFixed(6)})
                </span>
                <button
                  type="button"
                  onClick={() => setLocation(undefined)}
                  className="text-green-600 hover:text-green-800"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {isGettingLocation ? (
                  <div className="w-4 h-4 animate-spin border-2 border-primary-600 border-t-transparent rounded-full" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {isGettingLocation
                  ? 'Getting location...'
                  : 'Use current location'}
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Check In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DelayReportModalProps {
  vendor: VendorCheckIn;
  onClose: () => void;
  onReport: (minutes: number, reason: string) => void;
}

function DelayReportModal({
  vendor,
  onClose,
  onReport,
}: DelayReportModalProps) {
  const [minutes, setMinutes] = useState(15);
  const [reason, setReason] = useState('');

  const commonReasons = [
    'Traffic delay',
    'Setup taking longer',
    'Weather conditions',
    'Equipment issues',
    'Emergency',
    'Other vendor dependency',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes > 0 && reason.trim()) {
      onReport(minutes, reason);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Report Delay: {vendor.vendorName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Delay Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delay Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="480"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Delay
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {commonReasons.map((commonReason) => (
                <button
                  key={commonReason}
                  type="button"
                  onClick={() => setReason(commonReason)}
                  className={cn(
                    'px-2 py-1 text-xs rounded border transition-colors',
                    reason === commonReason
                      ? 'bg-primary-100 text-primary-800 border-primary-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-400',
                  )}
                >
                  {commonReason}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for delay..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* ETA Preview */}
          {minutes > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>New ETA:</strong>{' '}
                {format(new Date(Date.now() + minutes * 60000), 'HH:mm')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Report Delay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
