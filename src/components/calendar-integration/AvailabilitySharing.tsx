'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  Share2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Users,
  Clock,
  Globe,
  Shield,
  Link,
  Mail,
  MessageSquare,
  QrCode,
  Download,
  Settings,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for availability sharing
export interface AvailabilitySlot {
  id: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;
  isAvailable: boolean;
  title?: string;
  description?: string;
  location?: string;
  meetingType?: 'consultation' | 'venue_visit' | 'planning_session' | 'other';
  maxBookings?: number;
  currentBookings: number;
  bookings: BookingDetails[];
}

export interface BookingDetails {
  id: string;
  clientName: string;
  clientEmail: string;
  bookedAt: Date;
  notes?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface SharingSettings {
  isPublic: boolean;
  allowVendorAccess: boolean;
  allowCoupleAccess: boolean;
  requireApproval: boolean;
  showBookedSlots: boolean;
  customMessage?: string;
  timeZone: string;
  embedOptions: {
    showHeader: boolean;
    showDescription: boolean;
    customStyles?: string;
  };
}

interface AvailabilitySharingProps {
  weddingId: string;
  availableSlots: AvailabilitySlot[];
  sharingSettings: SharingSettings;
  onUpdateSlot: (
    slotId: string,
    updates: Partial<AvailabilitySlot>,
  ) => Promise<void>;
  onUpdateSharingSettings: (
    settings: Partial<SharingSettings>,
  ) => Promise<void>;
  onGenerateShareLink: () => Promise<string>;
  onSendInvitation: (emails: string[], message?: string) => Promise<void>;
  className?: string;
}

export function AvailabilitySharing({
  weddingId,
  availableSlots,
  sharingSettings,
  onUpdateSlot,
  onUpdateSharingSettings,
  onGenerateShareLink,
  onSendInvitation,
  className,
}: AvailabilitySharingProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);

    // Adjust to start from Monday
    const startWeekDay = firstDay.getDay();
    const daysFromMonday = startWeekDay === 0 ? 6 : startWeekDay - 1;
    startDate.setDate(firstDay.getDate() - daysFromMonday);

    // Adjust to end on Sunday
    const endWeekDay = lastDay.getDay();
    const daysToSunday = endWeekDay === 0 ? 0 : 7 - endWeekDay;
    endDate.setDate(lastDay.getDate() + daysToSunday);

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const daySlots = availableSlots.filter(
        (slot) => slot.date.toDateString() === current.toDateString(),
      );

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        slots: daySlots,
        hasAvailability: daySlots.some((slot) => slot.isAvailable),
        totalBookings: daySlots.reduce(
          (sum, slot) => sum + slot.currentBookings,
          0,
        ),
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentMonth, availableSlots]);

  const handleGenerateShareLink = useCallback(async () => {
    setIsGeneratingLink(true);
    try {
      const link = await onGenerateShareLink();
      setShareLink(link);
      setShowShareDialog(true);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [onGenerateShareLink]);

  const handleCopyLink = useCallback(async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareLink]);

  const handleSendInvitations = useCallback(async () => {
    const emails = inviteEmails
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email && email.includes('@'));

    if (emails.length === 0) return;

    try {
      await onSendInvitation(emails, inviteMessage || undefined);
      setInviteEmails('');
      setInviteMessage('');
      setShowShareDialog(false);
    } catch (error) {
      console.error('Failed to send invitations:', error);
    }
  }, [inviteEmails, inviteMessage, onSendInvitation]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  }, []);

  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  const getSlotStatusColor = (slot: AvailabilitySlot) => {
    if (!slot.isAvailable) return 'bg-gray-200 dark:bg-gray-700';
    if (slot.currentBookings >= (slot.maxBookings || 1))
      return 'bg-red-200 dark:bg-red-900/40';
    if (slot.currentBookings > 0) return 'bg-amber-200 dark:bg-amber-900/40';
    return 'bg-green-200 dark:bg-green-900/40';
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={cn('bg-background space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Availability Sharing
          </h3>
          <p className="text-muted-foreground mt-1">
            Share your availability with couples and vendors for easy booking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'border border-border hover:bg-muted',
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={handleGenerateShareLink}
            disabled={isGeneratingLink}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              'bg-accent text-accent-foreground hover:bg-accent/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isGeneratingLink ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            Share Calendar
          </button>
        </div>
      </div>

      {/* Privacy Status */}
      <div className="bg-elevated border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          {sharingSettings.isPublic ? (
            <Globe className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5 text-blue-600" />
          )}
          <div>
            <h4 className="font-medium text-foreground">
              {sharingSettings.isPublic
                ? 'Public Calendar'
                : 'Private Calendar'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {sharingSettings.isPublic
                ? 'Anyone with the link can view your availability'
                : 'Only invited couples and vendors can view your availability'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {sharingSettings.allowCoupleAccess && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                Couples
              </span>
            )}
            {sharingSettings.allowVendorAccess && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                Vendors
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-elevated border border-border rounded-lg overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h4 className="font-semibold text-foreground">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'min-h-[80px] p-2 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors',
                  !day.isCurrentMonth && 'opacity-40',
                  day.hasAvailability && 'bg-green-50 dark:bg-green-900/10',
                )}
                onClick={() => setSelectedSlot(day.slots[0] || null)}
              >
                <div className="text-sm font-medium text-foreground mb-1">
                  {day.date.getDate()}
                </div>

                {day.slots.length > 0 && (
                  <div className="space-y-1">
                    {day.slots.slice(0, 2).map((slot) => (
                      <div
                        key={slot.id}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium truncate',
                          getSlotStatusColor(slot),
                          slot.isAvailable
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-gray-600 dark:text-gray-300',
                        )}
                      >
                        {formatTimeRange(slot.startTime, slot.endTime)}
                      </div>
                    ))}
                    {day.slots.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{day.slots.length - 2} more
                      </div>
                    )}
                  </div>
                )}

                {day.totalBookings > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600">
                      {day.totalBookings}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-elevated border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {availableSlots.filter((s) => s.isAvailable).length}
              </p>
              <p className="text-sm text-muted-foreground">Available Slots</p>
            </div>
          </div>
        </div>

        <div className="bg-elevated border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {availableSlots.reduce(
                  (sum, slot) => sum + slot.currentBookings,
                  0,
                )}
              </p>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
            </div>
          </div>
        </div>

        <div className="bg-elevated border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {
                  availableSlots.filter(
                    (s) => s.currentBookings >= (s.maxBookings || 1),
                  ).length
                }
              </p>
              <p className="text-sm text-muted-foreground">Fully Booked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-elevated border border-border rounded-lg p-6 space-y-6">
          <h4 className="text-lg font-semibold text-foreground">
            Sharing Settings
          </h4>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-3">
                <h5 className="font-medium text-foreground">Access Control</h5>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Public calendar
                  </label>
                  <input
                    type="checkbox"
                    checked={sharingSettings.isPublic}
                    onChange={(e) =>
                      onUpdateSharingSettings({ isPublic: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Allow couple access
                  </label>
                  <input
                    type="checkbox"
                    checked={sharingSettings.allowCoupleAccess}
                    onChange={(e) =>
                      onUpdateSharingSettings({
                        allowCoupleAccess: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Allow vendor access
                  </label>
                  <input
                    type="checkbox"
                    checked={sharingSettings.allowVendorAccess}
                    onChange={(e) =>
                      onUpdateSharingSettings({
                        allowVendorAccess: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Require booking approval
                  </label>
                  <input
                    type="checkbox"
                    checked={sharingSettings.requireApproval}
                    onChange={(e) =>
                      onUpdateSharingSettings({
                        requireApproval: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <h5 className="font-medium text-foreground">Display Options</h5>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Show booked slots
                  </label>
                  <input
                    type="checkbox"
                    checked={sharingSettings.showBookedSlots}
                    onChange={(e) =>
                      onUpdateSharingSettings({
                        showBookedSlots: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Time zone
                  </label>
                  <select
                    value={sharingSettings.timeZone}
                    onChange={(e) =>
                      onUpdateSharingSettings({ timeZone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="America/Los_Angeles">
                      Los Angeles (PST)
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Custom message
                  </label>
                  <textarea
                    value={sharingSettings.customMessage || ''}
                    onChange={(e) =>
                      onUpdateSharingSettings({ customMessage: e.target.value })
                    }
                    placeholder="Add a personal message for clients..."
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Share Your Calendar
              </h3>
              <button
                onClick={() => setShowShareDialog(false)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Share Link */}
              {shareLink && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Share Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-muted text-foreground text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        copied
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600'
                          : 'hover:bg-muted',
                      )}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Email Invitations */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Invite by Email
                </label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="Enter email addresses (one per line or comma-separated)"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                  rows={3}
                />
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message (optional)"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSendInvitations}
                  disabled={!inviteEmails.trim()}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    'bg-accent text-accent-foreground hover:bg-accent/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Send Invites
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailabilitySharing;
