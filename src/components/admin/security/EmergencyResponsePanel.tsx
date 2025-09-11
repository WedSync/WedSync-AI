/**
 * WS-190 Emergency Response Panel - Team A Round 1
 * Ultra Hard Thinking Implementation
 *
 * P1 critical incident emergency response interface
 * Wedding day protocol activation and stakeholder notifications
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Phone,
  AlertTriangle,
  Shield,
  Users,
  MessageSquare,
  Clock,
  Heart,
  Star,
  CheckCircle,
  Bell,
  Megaphone,
  FileText,
  ExternalLink,
  RefreshCw,
  Activity,
  Calendar,
  ArrowUp,
  Settings,
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

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  isOnCall: boolean;
  specialization: string[];
  responseTime: number; // minutes
}

interface EmergencyAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  urgency: 'immediate' | 'high' | 'medium';
  requiredRole?: string;
  weddingSpecific: boolean;
}

interface EmergencyResponsePanelProps {
  incidents: Incident[];
  className?: string;
}

const alertLevelColors = {
  normal: 'bg-green-50 border-green-200 text-green-800',
  elevated: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
} as const;

const alertLevelIcons = {
  normal: '✅',
  elevated: '⚠️',
  critical: '🚨',
} as const;

const emergencyActions: EmergencyAction[] = [
  {
    id: 'emergency_broadcast',
    label: 'Emergency Broadcast',
    description: 'Send immediate alert to all security personnel',
    icon: '📢',
    urgency: 'immediate',
    weddingSpecific: false,
  },
  {
    id: 'executive_escalation',
    label: 'Executive Escalation',
    description: 'Notify C-level executives immediately',
    icon: '📈',
    urgency: 'immediate',
    requiredRole: 'security_lead',
    weddingSpecific: false,
  },
  {
    id: 'disaster_recovery',
    label: 'Disaster Recovery',
    description: 'Activate business continuity procedures',
    icon: '🔧',
    urgency: 'high',
    weddingSpecific: false,
  },
  {
    id: 'customer_notification',
    label: 'Customer Communication',
    description: 'Prepare and send customer notifications',
    icon: '💬',
    urgency: 'medium',
    weddingSpecific: true,
  },
  {
    id: 'wedding_protection',
    label: 'Wedding Day Protocol',
    description: 'Activate enhanced wedding day security measures',
    icon: '💒',
    urgency: 'immediate',
    weddingSpecific: true,
  },
  {
    id: 'media_response',
    label: 'Media Response',
    description: 'Prepare public relations and media statements',
    icon: '📰',
    urgency: 'high',
    requiredRole: 'incident_commander',
    weddingSpecific: true,
  },
  {
    id: 'legal_notification',
    label: 'Legal Team Alert',
    description: 'Notify legal department for compliance issues',
    icon: '⚖️',
    urgency: 'high',
    weddingSpecific: false,
  },
  {
    id: 'vendor_coordination',
    label: 'Vendor Coordination',
    description: 'Coordinate with affected wedding vendors',
    icon: '🤝',
    urgency: 'medium',
    weddingSpecific: true,
  },
];

const mockEmergencyContacts: EmergencyContact[] = [
  {
    id: 'sarah_security',
    name: 'Sarah Chen',
    role: 'Security Lead',
    phone: '+44 7700 900123',
    email: 'sarah.chen@wedsync.com',
    isOnCall: true,
    specialization: ['security', 'incidents', 'gdpr'],
    responseTime: 5,
  },
  {
    id: 'marcus_devops',
    name: 'Marcus Rodriguez',
    role: 'DevOps Manager',
    phone: '+44 7700 900124',
    email: 'marcus.rodriguez@wedsync.com',
    isOnCall: true,
    specialization: ['infrastructure', 'performance', 'recovery'],
    responseTime: 10,
  },
  {
    id: 'emily_dpo',
    name: 'Emily Watson',
    role: 'Data Protection Officer',
    phone: '+44 7700 900125',
    email: 'emily.watson@wedsync.com',
    isOnCall: false,
    specialization: ['gdpr', 'privacy', 'legal'],
    responseTime: 30,
  },
  {
    id: 'james_cto',
    name: 'James Morrison',
    role: 'Chief Technology Officer',
    phone: '+44 7700 900126',
    email: 'james.morrison@wedsync.com',
    isOnCall: false,
    specialization: ['executive', 'strategy', 'external_comms'],
    responseTime: 60,
  },
  {
    id: 'lisa_customer',
    name: 'Lisa Thompson',
    role: 'Customer Success Lead',
    phone: '+44 7700 900127',
    email: 'lisa.thompson@wedsync.com',
    isOnCall: true,
    specialization: ['customer_comms', 'weddings', 'vendors'],
    responseTime: 15,
  },
];

export default function EmergencyResponsePanel({
  incidents,
  className = '',
}: EmergencyResponsePanelProps) {
  const [alertLevel, setAlertLevel] = useState<
    'normal' | 'elevated' | 'critical'
  >('normal');
  const [isWeddingDay, setIsWeddingDay] = useState(false);
  const [escalationTimer, setEscalationTimer] = useState<number | null>(null);
  const [actionHistory, setActionHistory] = useState<
    Array<{
      action: string;
      timestamp: Date;
      actor: string;
    }>
  >([]);
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Check if today is Saturday (wedding day)
  useEffect(() => {
    const today = new Date();
    setIsWeddingDay(today.getDay() === 6);
  }, []);

  // Determine alert level based on incidents
  useEffect(() => {
    const criticalCount = incidents.filter(
      (i) => i.severity === 'P1' && i.status === 'active',
    ).length;
    const weddingImpacts = incidents.filter(
      (i) =>
        i.affectedWeddings.length > 0 &&
        ['P1', 'P2'].includes(i.severity) &&
        i.status !== 'resolved',
    ).length;
    const celebrityIncidents = incidents.filter(
      (i) => i.weddingContext?.isCelebrity && i.status === 'active',
    ).length;

    if (
      criticalCount >= 3 ||
      (isWeddingDay && criticalCount >= 1) ||
      celebrityIncidents >= 1
    ) {
      setAlertLevel('critical');
    } else if (criticalCount >= 1 || weddingImpacts >= 2) {
      setAlertLevel('elevated');
    } else {
      setAlertLevel('normal');
    }
  }, [incidents, isWeddingDay]);

  // Auto-escalate critical incidents after 15 minutes
  useEffect(() => {
    const criticalIncidents = incidents.filter(
      (i) => i.severity === 'P1' && i.status === 'active',
    );

    if (criticalIncidents.length > 0 && !escalationTimer) {
      const timer = window.setTimeout(
        () => {
          handleEmergencyAction(
            'executive_escalation',
            'Auto-escalation system',
          );
        },
        15 * 60 * 1000,
      ); // 15 minutes

      setEscalationTimer(timer);
    }

    return () => {
      if (escalationTimer) {
        clearTimeout(escalationTimer);
      }
    };
  }, [incidents, escalationTimer]);

  // Calculate emergency metrics
  const emergencyMetrics = useMemo(() => {
    const activeP1 = incidents.filter(
      (i) => i.severity === 'P1' && i.status === 'active',
    ).length;
    const weddingImpacts = incidents.filter(
      (i) => i.affectedWeddings.length > 0 && i.status !== 'closed',
    ).length;
    const totalGuestImpact = incidents.reduce(
      (sum, i) => sum + i.affectedGuests,
      0,
    );
    const celebrityIncidents = incidents.filter(
      (i) => i.weddingContext?.isCelebrity && i.status === 'active',
    ).length;
    const averageResponseTime = escalationTimer
      ? Math.round(
          (Date.now() - incidents[0]?.createdAt.getTime()) / (1000 * 60),
        )
      : 0;

    return {
      activeP1,
      weddingImpacts,
      totalGuestImpact,
      celebrityIncidents,
      averageResponseTime,
    };
  }, [incidents, escalationTimer]);

  const handleEmergencyAction = (
    actionId: string,
    actor: string = 'Security Operator',
  ) => {
    const action = emergencyActions.find((a) => a.id === actionId);
    if (!action) return;

    // Add to active actions
    setActiveActions((prev) => new Set(prev).add(actionId));

    // Add to history
    setActionHistory((prev) => [
      ...prev,
      {
        action: action.label,
        timestamp: new Date(),
        actor,
      },
    ]);

    // Simulate action execution
    setTimeout(() => {
      setActiveActions((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }, 3000); // Remove from active after 3 seconds

    // Log action (in real implementation, this would trigger actual emergency procedures)
    console.log(`Emergency Action Triggered: ${action.label} by ${actor}`);

    // Specific action handlers
    switch (actionId) {
      case 'emergency_broadcast':
        // Trigger emergency notification system
        alert('Emergency broadcast sent to all security personnel');
        break;
      case 'executive_escalation':
        // Notify executives
        alert('Executive team has been notified of critical incident');
        break;
      case 'wedding_protection':
        // Activate wedding day protocols
        alert('Wedding day protection protocols activated');
        break;
      case 'disaster_recovery':
        // Trigger disaster recovery
        alert('Disaster recovery procedures initiated');
        break;
      case 'customer_notification':
        // Prepare customer communications
        alert('Customer communication templates prepared');
        break;
      case 'media_response':
        // Prepare media response
        alert('Media response team has been alerted');
        break;
      case 'legal_notification':
        // Notify legal team
        alert('Legal team has been notified');
        break;
      case 'vendor_coordination':
        // Coordinate with vendors
        alert('Wedding vendor coordination initiated');
        break;
    }

    setLastUpdate(new Date());
  };

  // Don't show panel if no critical incidents
  if (alertLevel === 'normal') {
    return null;
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Emergency Alert Header */}
      <div
        className={`border-2 rounded-lg p-6 ${alertLevelColors[alertLevel]}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{alertLevelIcons[alertLevel]}</span>
            <div>
              <h2 className="text-xl font-bold">
                {alertLevel === 'critical'
                  ? 'CRITICAL INCIDENT RESPONSE'
                  : 'ELEVATED SECURITY ALERT'}
              </h2>
              <p className="text-sm opacity-90">
                {alertLevel === 'critical'
                  ? 'Immediate action required - All hands on deck'
                  : 'Enhanced monitoring active - Key personnel notified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isWeddingDay && (
              <div className="bg-pink-100 text-pink-800 px-3 py-2 rounded-lg text-sm font-medium">
                💒 WEDDING DAY PROTOCOL
              </div>
            )}

            <div className="text-right text-sm">
              <div>Last Update</div>
              <div className="font-medium">
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Critical Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {emergencyMetrics.activeP1}
            </div>
            <div className="text-sm opacity-75">P1 Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {emergencyMetrics.weddingImpacts}
            </div>
            <div className="text-sm opacity-75">Wedding Impacts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {emergencyMetrics.totalGuestImpact}
            </div>
            <div className="text-sm opacity-75">Guests Affected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {emergencyMetrics.celebrityIncidents}
            </div>
            <div className="text-sm opacity-75">Celebrity Incidents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {escalationTimer ? '15min' : '---'}
            </div>
            <div className="text-sm opacity-75">Auto-Escalation</div>
          </div>
        </div>

        {/* Quick Emergency Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {emergencyActions
            .filter((action) => action.urgency === 'immediate')
            .map((action) => (
              <button
                key={action.id}
                onClick={() => handleEmergencyAction(action.id)}
                disabled={activeActions.has(action.id)}
                className={`p-3 rounded-lg text-center transition-all font-medium ${
                  activeActions.has(action.id)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-white bg-opacity-80 hover:bg-opacity-100 border border-current hover:scale-105'
                } ${action.weddingSpecific && !isWeddingDay ? 'opacity-50' : ''}`}
              >
                <div className="text-xl mb-1">{action.icon}</div>
                <div className="text-sm font-medium">{action.label}</div>
                {activeActions.has(action.id) && (
                  <div className="text-xs mt-1 flex items-center justify-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Processing...
                  </div>
                )}
              </button>
            ))}
        </div>

        {/* Active Incidents Summary */}
        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active Critical Incidents
          </h3>
          <div className="space-y-2">
            {incidents
              .filter((i) => i.severity === 'P1' && i.status === 'active')
              .map((incident) => (
                <div
                  key={incident.id}
                  className="bg-white bg-opacity-60 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">{incident.title}</div>
                        {incident.weddingContext?.isCelebrity && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                            <Star className="h-3 w-3" />
                            Celebrity
                          </span>
                        )}
                      </div>
                      <div className="text-sm opacity-75 mb-2">
                        {incident.description}
                      </div>
                      <div className="flex items-center gap-4 text-xs opacity-60">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(
                            (Date.now() - incident.createdAt.getTime()) /
                              (1000 * 60),
                          )}
                          m ago
                        </span>
                        {incident.affectedWeddings.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {incident.affectedWeddings.length} weddings
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {incident.affectedGuests} guests
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs opacity-75">
                      ID: {incident.id.slice(-8)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Additional Emergency Actions
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {emergencyActions
            .filter((action) => action.urgency !== 'immediate')
            .map((action) => (
              <button
                key={action.id}
                onClick={() => handleEmergencyAction(action.id)}
                disabled={
                  activeActions.has(action.id) ||
                  (action.weddingSpecific &&
                    !isWeddingDay &&
                    emergencyMetrics.weddingImpacts === 0)
                }
                className={`p-4 rounded-lg border-2 text-center transition-all font-medium ${
                  action.urgency === 'high'
                    ? 'border-orange-300 hover:border-orange-400 bg-orange-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                } ${activeActions.has(action.id) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                  ${action.weddingSpecific && !isWeddingDay && emergencyMetrics.weddingImpacts === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="text-sm font-medium mb-1">{action.label}</div>
                <div className="text-xs text-gray-600">
                  {action.description}
                </div>
                {action.requiredRole && (
                  <div className="text-xs text-blue-600 mt-1">
                    Requires: {action.requiredRole.replace('_', ' ')}
                  </div>
                )}
                {activeActions.has(action.id) && (
                  <div className="text-xs text-blue-600 mt-1 flex items-center justify-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Active
                  </div>
                )}
              </button>
            ))}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Emergency Contacts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockEmergencyContacts
            .sort((a, b) => (b.isOnCall ? 1 : 0) - (a.isOnCall ? 1 : 0))
            .map((contact) => (
              <div
                key={contact.id}
                className={`p-4 rounded-lg border-2 ${
                  contact.isOnCall
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-gray-900">
                    {contact.name}
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      contact.isOnCall ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>

                <div className="text-sm text-gray-600 mb-2">{contact.role}</div>

                <div className="space-y-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </a>
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Email
                  </a>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">
                    Specializations:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {contact.specialization.map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {spec.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Response time: {contact.responseTime}min
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Action History */}
      {actionHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Emergency Action History
          </h3>

          <div className="space-y-2">
            {actionHistory
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .slice(0, 10)
              .map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-gray-900">
                      {entry.action}
                    </span>
                    <span className="text-sm text-gray-500">
                      by {entry.actor}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Wedding Day Special Notice */}
      {isWeddingDay && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Heart className="h-6 w-6 text-pink-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-pink-800 mb-2">
                Saturday Wedding Day Protocol Active
              </h4>
              <div className="text-sm text-pink-700 space-y-1">
                <p>
                  • Enhanced monitoring is active for all wedding-related
                  services
                </p>
                <p>
                  • All incidents affecting weddings receive immediate
                  escalation
                </p>
                <p>
                  • Customer success team on standby for proactive vendor
                  communication
                </p>
                <p>
                  • Media response team prepared for any high-visibility issues
                </p>
                <p>
                  • Disaster recovery plans prioritize wedding service
                  restoration
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Status */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
        <span>
          Emergency Response System - Protecting wedding memories since 2024
        </span>
        <span className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {alertLevel === 'critical'
            ? 'Critical alert active'
            : 'Elevated monitoring'}
        </span>
      </div>
    </div>
  );
}
