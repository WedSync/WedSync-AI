'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Guest, GuestSearchResult } from '@/types/guest-management';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/20/solid';

interface RSVPResponse {
  id: string;
  guest_id: string;
  response_status: 'attending' | 'not_attending' | 'maybe' | 'pending';
  party_size?: number;
  notes?: string;
  response_date?: string;
  invitation_sent?: boolean;
  invitation_sent_date?: string;
  dietary_restrictions?: string[];
  special_needs?: string;
}

interface RSVPIntegrationProps {
  selectedGuests: Guest[];
  onRSVPUpdate?: (guestId: string, rsvpData: Partial<RSVPResponse>) => void;
  coupleId: string;
  weddingId: string;
}

export function RSVPIntegration({
  selectedGuests,
  onRSVPUpdate,
  coupleId,
  weddingId,
}: RSVPIntegrationProps) {
  const [rsvpData, setRsvpData] = useState<Map<string, RSVPResponse>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<
    RSVPResponse['response_status'] | ''
  >('');

  // Fetch RSVP data for selected guests
  useEffect(() => {
    if (selectedGuests.length > 0) {
      fetchRSVPData();
    }
  }, [selectedGuests]);

  const fetchRSVPData = async () => {
    setLoading(true);
    try {
      const guestIds = selectedGuests.map((guest) => guest.id);
      const response = await fetch('/api/rsvp/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: guestIds,
          wedding_id: weddingId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rsvpMap = new Map<string, RSVPResponse>();

        data.responses?.forEach((rsvp: RSVPResponse) => {
          rsvpMap.set(rsvp.guest_id, rsvp);
        });

        // Add pending status for guests without RSVP
        selectedGuests.forEach((guest) => {
          if (!rsvpMap.has(guest.id)) {
            rsvpMap.set(guest.id, {
              id: `pending-${guest.id}`,
              guest_id: guest.id,
              response_status: 'pending',
              invitation_sent: false,
            });
          }
        });

        setRsvpData(rsvpMap);
      }
    } catch (error) {
      console.error('Failed to fetch RSVP data:', error);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (
    guestId: string,
    newStatus: RSVPResponse['response_status'],
  ) => {
    try {
      const currentRSVP = rsvpData.get(guestId);

      const response = await fetch('/api/rsvp/responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
          response_status: newStatus,
          wedding_id: weddingId,
        }),
      });

      if (response.ok) {
        const updatedRSVP = await response.json();
        setRsvpData((prev) => new Map(prev.set(guestId, updatedRSVP.rsvp)));
        onRSVPUpdate?.(guestId, updatedRSVP.rsvp);
      }
    } catch (error) {
      console.error('Failed to update RSVP status:', error);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedGuests.length === 0) return;

    setLoading(true);
    try {
      const guestIds = selectedGuests.map((guest) => guest.id);
      const response = await fetch('/api/rsvp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: guestIds,
          response_status: bulkStatus,
          wedding_id: weddingId,
        }),
      });

      if (response.ok) {
        await fetchRSVPData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to bulk update RSVP status:', error);
    }
    setLoading(false);
    setBulkStatus('');
  };

  const handleSendInvitations = async () => {
    setSendingInvites(true);
    try {
      const pendingGuests = selectedGuests.filter((guest) => {
        const rsvp = rsvpData.get(guest.id);
        return !rsvp?.invitation_sent;
      });

      const response = await fetch('/api/rsvp/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: pendingGuests.map((g) => g.id),
          wedding_id: weddingId,
        }),
      });

      if (response.ok) {
        await fetchRSVPData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to send invitations:', error);
    }
    setSendingInvites(false);
  };

  const getStatusIcon = (status: RSVPResponse['response_status']) => {
    switch (status) {
      case 'attending':
        return <CheckCircleIcon className="w-4 h-4 text-success-600" />;
      case 'not_attending':
        return <XCircleIcon className="w-4 h-4 text-error-600" />;
      case 'maybe':
        return <QuestionMarkCircleIcon className="w-4 h-4 text-warning-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: RSVPResponse['response_status']) => {
    const variants = {
      attending: 'bg-success-50 text-success-700 border-success-200',
      not_attending: 'bg-error-50 text-error-700 border-error-200',
      maybe: 'bg-warning-50 text-warning-700 border-warning-200',
      pending: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    return (
      <Badge
        variant="outline"
        className={`${variants[status]} inline-flex items-center gap-1`}
      >
        {getStatusIcon(status)}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const rsvpStats = {
    attending: Array.from(rsvpData.values()).filter(
      (r) => r.response_status === 'attending',
    ).length,
    not_attending: Array.from(rsvpData.values()).filter(
      (r) => r.response_status === 'not_attending',
    ).length,
    maybe: Array.from(rsvpData.values()).filter(
      (r) => r.response_status === 'maybe',
    ).length,
    pending: Array.from(rsvpData.values()).filter(
      (r) => r.response_status === 'pending',
    ).length,
    invited: Array.from(rsvpData.values()).filter((r) => r.invitation_sent)
      .length,
    not_invited: Array.from(rsvpData.values()).filter((r) => !r.invitation_sent)
      .length,
  };

  if (selectedGuests.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">
          Select guests to view and manage their RSVP status
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* RSVP Statistics */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-success-600">
              {rsvpStats.attending}
            </div>
            <div className="text-sm text-gray-600">Attending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-error-600">
              {rsvpStats.not_attending}
            </div>
            <div className="text-sm text-gray-600">Not Attending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning-600">
              {rsvpStats.maybe}
            </div>
            <div className="text-sm text-gray-600">Maybe</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {rsvpStats.pending}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bulk RSVP Actions
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={bulkStatus}
                onChange={(e) =>
                  setBulkStatus(
                    e.target.value as RSVPResponse['response_status'],
                  )
                }
                className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="">Change status to...</option>
                <option value="attending">Attending</option>
                <option value="not_attending">Not Attending</option>
                <option value="maybe">Maybe</option>
                <option value="pending">Pending</option>
              </select>

              <Button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || loading}
                variant="outline"
              >
                Update {selectedGuests.length} Guest
                {selectedGuests.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleSendInvitations}
              disabled={sendingInvites || rsvpStats.not_invited === 0}
              className="w-full sm:w-auto"
            >
              <EnvelopeIcon className="w-4 h-4 mr-2" />
              {sendingInvites
                ? 'Sending...'
                : `Send Invites (${rsvpStats.not_invited})`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Individual Guest RSVP Status */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Individual RSVP Status
        </h3>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: Math.min(selectedGuests.length, 5) }).map(
              (_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center space-x-4 p-3 border rounded-lg"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedGuests.map((guest) => {
              const rsvp = rsvpData.get(guest.id);

              return (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {guest.first_name} {guest.last_name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          {guest.email && (
                            <div className="flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              <span>{guest.email}</span>
                            </div>
                          )}
                          {guest.phone && (
                            <div className="flex items-center gap-1">
                              <PhoneIcon className="w-3 h-3" />
                              <span>{guest.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {rsvp?.invitation_sent ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        Invited
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-600 border-gray-200"
                      >
                        Not Invited
                      </Badge>
                    )}

                    {getStatusBadge(rsvp?.response_status || 'pending')}

                    {rsvp?.party_size && rsvp.party_size > 1 && (
                      <Badge
                        variant="outline"
                        className="bg-primary-50 text-primary-700 border-primary-200"
                      >
                        +{rsvp.party_size - 1}
                      </Badge>
                    )}

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={
                          rsvp?.response_status === 'attending'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          handleStatusUpdate(guest.id, 'attending')
                        }
                        className="px-2 py-1"
                      >
                        <CheckCircleIcon className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          rsvp?.response_status === 'maybe'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => handleStatusUpdate(guest.id, 'maybe')}
                        className="px-2 py-1"
                      >
                        <QuestionMarkCircleIcon className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          rsvp?.response_status === 'not_attending'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          handleStatusUpdate(guest.id, 'not_attending')
                        }
                        className="px-2 py-1"
                      >
                        <XCircleIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Real-time Updates Notice */}
      <div className="text-center text-sm text-gray-600">
        <p>RSVP status updates in real-time across all wedding systems</p>
      </div>
    </div>
  );
}
