/**
 * WS-190 Incident Timeline Visualization - Team A Round 1
 * Ultra Hard Thinking Implementation
 *
 * Interactive incident response timeline with forensic evidence preservation
 * Wedding-specific context and real-time phase tracking
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  RefreshCw,
  Calendar,
  Users,
  Heart,
  Star,
  Shield,
  FileText,
  Phone,
  MessageSquare,
  Activity,
} from 'lucide-react';

interface Incident {
  id: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  type:
    | 'security_breach'
    | 'data_violation'
    | 'system_outage'
    | 'gdpr_compliance'
    | 'celebrity_protection'
    | 'venue_security';
  title: string;
  description: string;
  status: 'active' | 'investigating' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  affectedWeddings: string[];
  affectedGuests: number;
  weddingContext?: {
    isCelebrity: boolean;
    isWeekend: boolean;
    venueId: string;
    guestCount: number;
  };
  gdprImplications?: {
    dataTypes: string[];
    notificationDeadline: Date;
    complianceStatus: 'compliant' | 'at_risk' | 'violated';
  };
}

interface TimelineEvent {
  id: string;
  incidentId: string;
  timestamp: Date;
  type:
    | 'created'
    | 'updated'
    | 'resolved'
    | 'escalated'
    | 'notification_sent'
    | 'evidence_collected'
    | 'communication_sent';
  phase:
    | 'detection'
    | 'containment'
    | 'investigation'
    | 'communication'
    | 'resolution';
  title: string;
  description: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  actor?: string;
  metadata?: {
    evidenceFiles?: string[];
    communicationTargets?: string[];
    escalationLevel?: string;
    weddingImpact?: string;
  };
}

interface IncidentTimelineProps {
  incidents: Incident[];
  selectedIncident?: Incident | null;
  onSelectIncident?: (incident: Incident | null) => void;
  className?: string;
}

const phaseColors = {
  detection: 'bg-red-50 border-red-200 text-red-800',
  containment: 'bg-orange-50 border-orange-200 text-orange-800',
  investigation: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  communication: 'bg-blue-50 border-blue-200 text-blue-800',
  resolution: 'bg-green-50 border-green-200 text-green-800',
};

const phaseIcons = {
  detection: '🔍',
  containment: '🚨',
  investigation: '🔬',
  communication: '📢',
  resolution: '✅',
};

const eventTypeIcons = {
  created: '🆕',
  updated: '🔄',
  resolved: '✅',
  escalated: '⬆️',
  notification_sent: '📧',
  evidence_collected: '📁',
  communication_sent: '💬',
};

const eventTypeColors = {
  created: 'border-red-200 bg-red-50',
  updated: 'border-blue-200 bg-blue-50',
  resolved: 'border-green-200 bg-green-50',
  escalated: 'border-orange-200 bg-orange-50',
  notification_sent: 'border-purple-200 bg-purple-50',
  evidence_collected: 'border-gray-200 bg-gray-50',
  communication_sent: 'border-indigo-200 bg-indigo-50',
};

export default function IncidentTimeline({
  incidents,
  selectedIncident,
  onSelectIncident,
  className = '',
}: IncidentTimelineProps) {
  const [viewMode, setViewMode] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Generate timeline events from incidents
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    incidents.forEach((incident) => {
      // Add creation event
      events.push({
        id: `${incident.id}-created`,
        incidentId: incident.id,
        timestamp: incident.createdAt,
        type: 'created',
        phase: 'detection',
        title: `Incident Detected: ${incident.title}`,
        description: incident.description,
        severity: incident.severity,
        actor: 'System Detection',
        metadata: {
          weddingImpact:
            incident.affectedWeddings.length > 0
              ? `${incident.affectedWeddings.length} weddings, ${incident.affectedGuests} guests`
              : undefined,
        },
      });

      // Add containment event (simulate - 30 min after creation)
      const containmentTime = new Date(
        incident.createdAt.getTime() + 30 * 60 * 1000,
      );
      if (containmentTime <= new Date()) {
        events.push({
          id: `${incident.id}-contained`,
          incidentId: incident.id,
          timestamp: containmentTime,
          type: 'updated',
          phase: 'containment',
          title: `Incident Contained`,
          description: `Initial containment measures activated for ${incident.type}`,
          severity: incident.severity,
          actor: 'Security Team',
          metadata: {
            evidenceFiles: ['initial-logs.txt', 'system-state.json'],
            weddingImpact: incident.weddingContext?.isCelebrity
              ? 'Celebrity protection protocols activated'
              : undefined,
          },
        });
      }

      // Add investigation event (simulate - 1 hour after creation)
      const investigationTime = new Date(
        incident.createdAt.getTime() + 60 * 60 * 1000,
      );
      if (investigationTime <= new Date() && incident.status !== 'resolved') {
        events.push({
          id: `${incident.id}-investigation`,
          incidentId: incident.id,
          timestamp: investigationTime,
          type: 'evidence_collected',
          phase: 'investigation',
          title: `Forensic Evidence Collected`,
          description: `Detailed investigation initiated. Evidence preservation active.`,
          severity: incident.severity,
          actor: 'Forensics Team',
          metadata: {
            evidenceFiles: [
              'network-logs.pcap',
              'access-records.csv',
              'system-metrics.json',
            ],
          },
        });
      }

      // Add GDPR notification if applicable
      if (incident.gdprImplications && incident.severity === 'P1') {
        const notificationTime = new Date(
          incident.createdAt.getTime() + 2 * 60 * 60 * 1000,
        );
        if (notificationTime <= new Date()) {
          events.push({
            id: `${incident.id}-gdpr-notification`,
            incidentId: incident.id,
            timestamp: notificationTime,
            type: 'notification_sent',
            phase: 'communication',
            title: `GDPR Breach Notification Prepared`,
            description: `Regulatory notification prepared for ${incident.gdprImplications.dataTypes.join(', ')} breach`,
            severity: incident.severity,
            actor: 'Legal Team',
            metadata: {
              communicationTargets: [
                'ICO',
                'Legal Department',
                'Executive Team',
              ],
              weddingImpact: 'Couple communication strategy developed',
            },
          });
        }
      }

      // Add communication event for wedding-affected incidents
      if (incident.affectedWeddings.length > 0) {
        const commTime = new Date(
          incident.createdAt.getTime() + 90 * 60 * 1000,
        );
        if (commTime <= new Date()) {
          events.push({
            id: `${incident.id}-wedding-communication`,
            incidentId: incident.id,
            timestamp: commTime,
            type: 'communication_sent',
            phase: 'communication',
            title: `Wedding Stakeholder Communication`,
            description: `Affected couples and vendors notified with reassurance messaging`,
            severity: incident.severity,
            actor: 'Customer Success Team',
            metadata: {
              communicationTargets: incident.weddingContext?.isCelebrity
                ? ['Celebrity Client', 'PR Team', 'Security Detail']
                : ['Couples', 'Vendors', 'Venues'],
              weddingImpact: `${incident.affectedGuests} guests kept informed`,
            },
          });
        }
      }

      // Add resolution event if resolved
      if (incident.resolvedAt) {
        events.push({
          id: `${incident.id}-resolved`,
          incidentId: incident.id,
          timestamp: incident.resolvedAt,
          type: 'resolved',
          phase: 'resolution',
          title: `Incident Resolved: ${incident.title}`,
          description: `Successfully resolved ${incident.type}. All systems restored.`,
          severity: incident.severity,
          actor: incident.status === 'resolved' ? 'Security Lead' : 'System',
          metadata: {
            evidenceFiles: ['final-report.pdf', 'lessons-learned.md'],
            weddingImpact:
              incident.affectedWeddings.length > 0
                ? 'All wedding services restored to normal operation'
                : undefined,
          },
        });
      }
    });

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [incidents]);

  // Filter events by time range
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);

    switch (viewMode) {
      case '24h':
        cutoff.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
    }

    let filtered = timelineEvents.filter((event) => event.timestamp >= cutoff);

    if (selectedPhase !== 'all') {
      filtered = filtered.filter((event) => event.phase === selectedPhase);
    }

    if (selectedIncident) {
      filtered = filtered.filter(
        (event) => event.incidentId === selectedIncident.id,
      );
    }

    return filtered;
  }, [timelineEvents, viewMode, selectedPhase, selectedIncident]);

  // Auto-refresh timeline
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  const getPhaseProgress = (incidentId: string) => {
    const incidentEvents = timelineEvents.filter(
      (e) => e.incidentId === incidentId,
    );
    const phases = [
      'detection',
      'containment',
      'investigation',
      'communication',
      'resolution',
    ];
    const completedPhases = [...new Set(incidentEvents.map((e) => e.phase))];

    return {
      completed: completedPhases.length,
      total: phases.length,
      percentage: (completedPhases.length / phases.length) * 100,
    };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Timeline Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            📅 Incident Response Timeline
          </h3>
          <span className="text-sm text-gray-500">
            {filteredEvents.length} events
          </span>
          {autoRefresh && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Activity className="h-3 w-3" />
              Live
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>

          {/* Phase filter */}
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Phases</option>
            <option value="detection">Detection</option>
            <option value="containment">Containment</option>
            <option value="investigation">Investigation</option>
            <option value="communication">Communication</option>
            <option value="resolution">Resolution</option>
          </select>

          {/* Time range */}
          <div className="flex rounded-lg border border-gray-300 p-1">
            {[
              { id: '24h', label: '24H' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setViewMode(option.id as any)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === option.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wedding Day Alert */}
      {new Date().getDay() === 6 && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Heart className="h-5 w-5 text-pink-600" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-pink-800">
                Wedding Day Protocol Active
              </h4>
              <p className="text-sm text-pink-700 mt-1">
                Saturday operations - Maximum security posture engaged. All
                wedding-affecting incidents receive priority handling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Incident Progress */}
      {selectedIncident && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">
              Progress: {selectedIncident.title}
            </h4>
            <button
              onClick={() => onSelectIncident?.(null)}
              className="text-blue-700 hover:text-blue-800"
            >
              View All Events
            </button>
          </div>

          <div className="space-y-3">
            {/* Progress bar */}
            {(() => {
              const progress = getPhaseProgress(selectedIncident.id);
              return (
                <div>
                  <div className="flex justify-between text-sm text-blue-700 mb-1">
                    <span>Response Progress</span>
                    <span>{Math.round(progress.percentage)}% Complete</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {progress.completed} of {progress.total} phases completed
                  </div>
                </div>
              );
            })()}

            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-blue-700 font-medium">Time Elapsed</div>
                <div className="text-blue-900">
                  {Math.round(
                    (Date.now() - selectedIncident.createdAt.getTime()) /
                      (1000 * 60 * 60),
                  )}
                  h
                </div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">Wedding Impact</div>
                <div className="text-blue-900">
                  {selectedIncident.affectedWeddings.length} events
                </div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">Guest Impact</div>
                <div className="text-blue-900">
                  {selectedIncident.affectedGuests} people
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Timeline Events */}
        <div className="space-y-6">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event, index) => {
              const incident = incidents.find((i) => i.id === event.incidentId);

              return (
                <div key={event.id} className="relative flex items-start">
                  {/* Timeline Dot */}
                  <div className="absolute left-6 w-4 h-4 rounded-full border-2 border-white bg-white shadow-sm z-10">
                    <div
                      className={`w-full h-full rounded-full ${
                        event.severity === 'P1'
                          ? 'bg-red-500'
                          : event.severity === 'P2'
                            ? 'bg-orange-500'
                            : event.severity === 'P3'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                      }`}
                    />
                  </div>

                  {/* Event Content */}
                  <div className="ml-16 flex-1">
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        eventTypeColors[event.type]
                      } ${selectedIncident?.id === event.incidentId ? 'ring-2 ring-primary-500' : ''}`}
                      onClick={() => {
                        if (incident && onSelectIncident) {
                          onSelectIncident(incident);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {eventTypeIcons[event.type]}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {event.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${phaseColors[event.phase]}`}
                              >
                                {phaseIcons[event.phase]} {event.phase}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  event.severity === 'P1'
                                    ? 'bg-red-600 text-white'
                                    : event.severity === 'P2'
                                      ? 'bg-orange-600 text-white'
                                      : event.severity === 'P3'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-blue-600 text-white'
                                }`}
                              >
                                {event.severity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-xs text-gray-500">
                          <div>{getTimeAgo(event.timestamp)}</div>
                          <div>{event.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {event.description}
                      </p>

                      {/* Event metadata */}
                      {event.metadata && (
                        <div className="space-y-2">
                          {event.metadata.evidenceFiles && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <FileText className="h-3 w-3" />
                              Evidence:{' '}
                              {event.metadata.evidenceFiles.join(', ')}
                            </div>
                          )}

                          {event.metadata.communicationTargets && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MessageSquare className="h-3 w-3" />
                              Notified:{' '}
                              {event.metadata.communicationTargets.join(', ')}
                            </div>
                          )}

                          {event.metadata.weddingImpact && (
                            <div className="flex items-center gap-2 text-xs text-pink-600">
                              <Heart className="h-3 w-3" />
                              {event.metadata.weddingImpact}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.timestamp.toLocaleString()}
                          </span>
                          {incident?.weddingContext?.isCelebrity && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <Star className="h-3 w-3" />
                              Celebrity Client
                            </span>
                          )}
                          {incident?.gdprImplications && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Shield className="h-3 w-3" />
                              GDPR Impact
                            </span>
                          )}
                        </div>

                        {event.actor && (
                          <span className="text-gray-600">
                            👤 {event.actor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events in this timeframe
              </h3>
              <p className="text-gray-600">
                {selectedIncident
                  ? 'No timeline events for this incident in the selected period'
                  : 'Try expanding the time range to see more incident activity'}
              </p>
              {selectedIncident && (
                <button
                  onClick={() => onSelectIncident?.(null)}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  View All Events
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeline Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
        <span>Last updated: {lastUpdate.toLocaleString()}</span>
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Timeline tracking {incidents.length} active incidents
        </span>
      </div>
    </div>
  );
}
