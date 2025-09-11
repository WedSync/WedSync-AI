'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Settings,
  Filter,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type {
  TimelineEvent,
  TimelineEventVendor,
  WeddingTimeline,
} from '@/types/timeline';

interface TimelineVendorPanelProps {
  timeline: WeddingTimeline;
  vendorId: string;
  vendorName: string;
  vendorType: string;
  events: TimelineEvent[];
  vendorAssignments: TimelineEventVendor[];
  onUpdateAssignment: (
    eventId: string,
    updates: Partial<TimelineEventVendor>,
  ) => Promise<void>;
  onAddNote: (eventId: string, note: string) => Promise<void>;
  className?: string;
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  'needs-discussion': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  declined: 'bg-red-100 text-red-800 border-red-200',
  'setup-complete': 'bg-blue-100 text-blue-800 border-blue-200',
};

const priorityIcons = {
  low: null,
  medium: <AlertCircle className="w-4 h-4 text-blue-500" />,
  high: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  critical: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export function TimelineVendorPanel({
  timeline,
  vendorId,
  vendorName,
  vendorType,
  events,
  vendorAssignments,
  onUpdateAssignment,
  onAddNote,
  className,
}: TimelineVendorPanelProps) {
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'today'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [newNote, setNewNote] = useState<Record<string, string>>({});

  // Filter vendor's events
  const vendorEvents = useMemo(() => {
    const assignedEventIds = new Set(
      vendorAssignments.map((va) => va.event_id),
    );
    const assignedEvents = events.filter((event) =>
      assignedEventIds.has(event.id),
    );

    return assignedEvents
      .filter((event) => {
        // Search filter
        if (
          searchQuery &&
          !event.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        const assignment = vendorAssignments.find(
          (va) => va.event_id === event.id,
        );
        switch (selectedFilter) {
          case 'pending':
            return assignment?.status === 'pending';
          case 'confirmed':
            return assignment?.status === 'confirmed';
          case 'today':
            const eventDate = parseISO(event.start_time);
            const today = new Date();
            return eventDate.toDateString() === today.toDateString();
          default:
            return true;
        }
      })
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
  }, [events, vendorAssignments, searchQuery, selectedFilter]);

  // Get assignment for event
  const getAssignment = (eventId: string) => {
    return vendorAssignments.find((va) => va.event_id === eventId);
  };

  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Handle status update
  const handleStatusUpdate = async (
    eventId: string,
    status: TimelineEventVendor['status'],
  ) => {
    const assignment = getAssignment(eventId);
    if (!assignment) return;

    await onUpdateAssignment(eventId, { status });
  };

  // Handle note addition
  const handleAddNote = async (eventId: string) => {
    const note = newNote[eventId]?.trim();
    if (!note) return;

    await onAddNote(eventId, note);
    setNewNote((prev) => ({ ...prev, [eventId]: '' }));
  };

  // Stats summary
  const stats = useMemo(() => {
    const total = vendorEvents.length;
    const confirmed = vendorEvents.filter(
      (e) => getAssignment(e.id)?.status === 'confirmed',
    ).length;
    const pending = vendorEvents.filter(
      (e) => getAssignment(e.id)?.status === 'pending',
    ).length;
    const today = vendorEvents.filter((e) => {
      const eventDate = parseISO(e.start_time);
      return eventDate.toDateString() === new Date().toDateString();
    }).length;

    return { total, confirmed, pending, today };
  }, [vendorEvents, vendorAssignments]);

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm', className)}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {vendorName}
            </h2>
            <p className="text-sm text-gray-600">
              {vendorType} • {timeline.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600">Total Events</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.confirmed}
            </div>
            <div className="text-xs text-gray-600">Confirmed</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.today}
            </div>
            <div className="text-xs text-gray-600">Today</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'confirmed', 'today'] as const).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                    selectedFilter === filter
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {filter}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="p-6">
        {vendorEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Events Found
            </h3>
            <p className="text-gray-600">
              {searchQuery || selectedFilter !== 'all'
                ? 'No events match your current filters.'
                : "You haven't been assigned to any events yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendorEvents.map((event) => {
              const assignment = getAssignment(event.id);
              const isExpanded = expandedEvents.has(event.id);

              return (
                <div
                  key={event.id}
                  className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
                >
                  {/* Event Header */}
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleEventExpansion(event.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <h3 className="font-medium text-gray-900">
                            {event.title}
                          </h3>
                          {priorityIcons[event.priority]}

                          {assignment && (
                            <span
                              className={cn(
                                'px-2 py-1 text-xs rounded-full border',
                                statusColors[assignment.status],
                              )}
                            >
                              {assignment.status.replace('-', ' ')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(
                                parseISO(event.start_time),
                                'MMM d, HH:mm',
                              )}
                            </span>
                            {event.duration && (
                              <span>({event.duration}min)</span>
                            )}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {assignment?.status === 'pending' && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusUpdate(event.id, 'confirmed')
                              }
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(event.id, 'needs-discussion')
                              }
                              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm"
                            >
                              Discuss
                            </button>
                          </>
                        )}

                        {assignment?.status === 'confirmed' && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(event.id, 'setup-complete')
                            }
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                          >
                            Mark Setup Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 border-t bg-white space-y-4">
                      {/* Event Details */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Event Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {event.description && (
                            <div>
                              <span className="text-gray-600">
                                Description:
                              </span>
                              <p className="text-gray-900 mt-1">
                                {event.description}
                              </p>
                            </div>
                          )}

                          {assignment?.requirements && (
                            <div>
                              <span className="text-gray-600">
                                Requirements:
                              </span>
                              <p className="text-gray-900 mt-1">
                                {assignment.requirements}
                              </p>
                            </div>
                          )}

                          {assignment?.setup_time && (
                            <div>
                              <span className="text-gray-600">
                                Setup Time Needed:
                              </span>
                              <p className="text-gray-900 mt-1">
                                {assignment.setup_time} minutes
                              </p>
                            </div>
                          )}

                          {assignment?.breakdown_time && (
                            <div>
                              <span className="text-gray-600">
                                Breakdown Time:
                              </span>
                              <p className="text-gray-900 mt-1">
                                {assignment.breakdown_time} minutes
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vendor Notes */}
                      {assignment?.notes && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Your Notes
                          </h4>
                          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                            {assignment.notes}
                          </div>
                        </div>
                      )}

                      {/* Add Note */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Add Note
                        </h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a note or question..."
                            value={newNote[event.id] || ''}
                            onChange={(e) =>
                              setNewNote((prev) => ({
                                ...prev,
                                [event.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNote(event.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddNote(event.id)}
                            disabled={!newNote[event.id]?.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
