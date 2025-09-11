'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  LinkIcon,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Activity,
} from 'lucide-react';
import { useRBAC } from '@/lib/security/rbac-system';
import { PERMISSIONS } from '@/lib/security/rbac-system';

interface ClientData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  phone: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  status: 'lead' | 'booked' | 'completed' | 'archived';
  package_name: string | null;
  package_price: number | null;
  is_wedme_connected: boolean;
  lead_score?: number | null;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  last_activity_at?: string | null;
  created_at: string;
}

interface ProfileHeaderProps {
  client: ClientData;
  onProfileUpdate?: () => void;
  currentUserId?: string;
}

const statusConfig = {
  lead: { color: 'amber', icon: Clock, label: 'Lead' },
  booked: { color: 'green', icon: CheckCircle, label: 'Booked' },
  completed: { color: 'blue', icon: CheckCircle, label: 'Completed' },
  archived: { color: 'gray', icon: XCircle, label: 'Archived' },
} as const;

const priorityConfig = {
  low: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-200' },
  medium: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  high: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  urgent: { color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
} as const;

export default function ProfileHeader({
  client,
  onProfileUpdate,
  currentUserId,
}: ProfileHeaderProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { hasPermission } = useRBAC();
  const [canEdit, setCanEdit] = useState(false);

  // Check permissions on mount
  useState(() => {
    const checkPermissions = async () => {
      if (currentUserId) {
        const hasEditPermission = await hasPermission(
          currentUserId,
          PERMISSIONS.WEDDING_EDIT,
        );
        setCanEdit(hasEditPermission);
      }
    };
    checkPermissions();
  });

  const getClientName = () => {
    const names = [client.first_name, client.last_name]
      .filter(Boolean)
      .join(' ');
    const partnerNames = [client.partner_first_name, client.partner_last_name]
      .filter(Boolean)
      .join(' ');

    if (names && partnerNames) {
      return `${names} & ${partnerNames}`;
    }
    return names || partnerNames || 'Unnamed Client';
  };

  const getDaysUntilWedding = () => {
    if (!client.wedding_date) return null;
    const days = Math.ceil(
      (new Date(client.wedding_date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days < 0) return { text: 'Past', color: 'text-gray-400' };
    if (days === 0) return { text: 'Today!', color: 'text-red-600 font-bold' };
    if (days === 1)
      return { text: 'Tomorrow!', color: 'text-amber-600 font-bold' };
    if (days <= 7) return { text: `${days} days`, color: 'text-amber-600' };
    if (days <= 30) return { text: `${days} days`, color: 'text-blue-600' };
    return { text: `${days} days`, color: 'text-gray-500' };
  };

  const handleQuickStatusUpdate = async (newStatus: ClientData['status']) => {
    if (!canEdit) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token':
            document.cookie
              .split('; ')
              .find((row) => row.startsWith('csrf-token='))
              ?.split('=')[1] || '',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      onProfileUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const StatusIcon = statusConfig[client.status].icon;
  const daysInfo = getDaysUntilWedding();

  return (
    <div
      className="bg-white border-b border-gray-200"
      data-testid="profile-header"
    >
      <div className="px-6 py-6">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/dashboard/clients">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </Button>
          </Link>
        </div>

        {/* Client Header Info */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              {/* Avatar/Initial */}
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold text-primary-700">
                  {getClientName().charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1">
                <h1
                  className="text-3xl font-bold text-gray-900 mb-2"
                  data-testid="client-name"
                >
                  {getClientName()}
                </h1>

                {/* Contact Info & Status Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </span>
                  )}

                  <Badge
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      statusConfig[client.status].color === 'amber'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : statusConfig[client.status].color === 'green'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : statusConfig[client.status].color === 'blue'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig[client.status].label}
                  </Badge>

                  {client.priority_level && (
                    <Badge
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                        priorityConfig[client.priority_level].bg
                      } ${priorityConfig[client.priority_level].color}`}
                    >
                      <Star className="w-3 h-3" />
                      {client.priority_level.toUpperCase()}
                    </Badge>
                  )}

                  {client.lead_score && (
                    <span className="flex items-center gap-1 text-xs">
                      <Activity className="w-3 h-3" />
                      Score: {client.lead_score}
                    </span>
                  )}
                </div>

                {/* Wedding Date Banner */}
                {client.wedding_date && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">
                            Wedding Date
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(
                              new Date(client.wedding_date),
                              'EEEE, MMMM d, yyyy',
                            )}
                          </p>
                          {client.venue_name && (
                            <p className="text-sm text-gray-500">
                              at {client.venue_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {daysInfo && (
                        <div
                          className={`text-lg font-semibold ${daysInfo.color}`}
                        >
                          {daysInfo.text}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* WedMe Connection Status */}
            {client.is_wedme_connected ? (
              <Badge className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                <LinkIcon className="w-4 h-4" />
                WedMe Connected
              </Badge>
            ) : (
              <Link href={`/dashboard/clients/${client.id}/invite`}>
                <Button variant="outline" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Invite to WedMe
                </Button>
              </Link>
            )}

            {/* Quick Status Actions */}
            {canEdit && client.status === 'lead' && (
              <Button
                variant="outline"
                onClick={() => handleQuickStatusUpdate('booked')}
                disabled={isUpdating}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                Mark as Booked
              </Button>
            )}

            {/* Edit Button */}
            {canEdit && (
              <Link href={`/dashboard/clients/${client.id}/edit`}>
                <Button className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Package Info */}
        {client.package_name && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  {client.package_name}
                </p>
                {client.package_price && (
                  <p className="text-sm text-blue-700">
                    £{client.package_price.toLocaleString()}
                  </p>
                )}
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Package Selected
              </Badge>
            </div>
          </div>
        )}

        {/* Last Activity */}
        {client.last_activity_at && (
          <div className="mt-3 text-xs text-gray-500">
            Last activity:{' '}
            {format(new Date(client.last_activity_at), 'MMM d, yyyy h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
}
