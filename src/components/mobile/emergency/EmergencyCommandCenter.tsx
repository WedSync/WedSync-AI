'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Phone,
  Clock,
  Users,
  Shield,
  Zap,
  Radio,
  MapPin,
  Activity,
  MessageSquare,
  Settings,
  History,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useMobileInfrastructure } from '@/hooks/useMobileInfrastructure';

/**
 * WS-257 Team D: Emergency Command Center
 * Central hub for emergency coordination, escalation, and communication
 */

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  priority: 'primary' | 'secondary' | 'escalation';
  availability: 'available' | 'busy' | 'offline';
  location?: string;
  specializations?: string[];
}

interface ActiveEmergency {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  category: 'infrastructure' | 'wedding-day' | 'security' | 'technical';
  status: 'active' | 'escalated' | 'resolving' | 'resolved';
  startTime: number;
  assignedTo?: string[];
  description: string;
  location?: string;
  affectedSystems?: string[];
  communicationLog: CommunicationEntry[];
}

interface CommunicationEntry {
  id: string;
  timestamp: number;
  type: 'call' | 'message' | 'alert' | 'status-update';
  from: string;
  to: string[];
  content: string;
  priority: 'urgent' | 'normal' | 'low';
}

interface EscalationRule {
  id: string;
  condition: string;
  timeThreshold: number; // minutes
  action: 'notify' | 'auto-escalate' | 'trigger-workflow';
  contacts: string[];
  automated: boolean;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'tech-lead',
    name: 'Sarah Chen',
    role: 'Technical Lead',
    phone: '+1-555-0101',
    email: 'sarah.chen@wedsync.com',
    priority: 'primary',
    availability: 'available',
    location: 'Seattle, WA',
    specializations: ['Infrastructure', 'Performance'],
  },
  {
    id: 'infra-engineer',
    name: 'Marcus Rodriguez',
    role: 'Infrastructure Engineer',
    phone: '+1-555-0102',
    email: 'marcus.r@wedsync.com',
    priority: 'primary',
    availability: 'available',
    location: 'Austin, TX',
    specializations: ['AWS', 'Database', 'Monitoring'],
  },
  {
    id: 'wedding-coordinator',
    name: 'Emily Watson',
    role: 'Wedding Day Coordinator',
    phone: '+1-555-0103',
    email: 'emily.watson@wedsync.com',
    priority: 'primary',
    availability: 'available',
    location: 'Mobile Team',
    specializations: ['Event Management', 'Vendor Coordination'],
  },
  {
    id: 'security-officer',
    name: 'David Park',
    role: 'Security Officer',
    phone: '+1-555-0104',
    email: 'david.park@wedsync.com',
    priority: 'secondary',
    availability: 'busy',
    location: 'San Francisco, CA',
    specializations: ['Security', 'Compliance', 'Incident Response'],
  },
  {
    id: 'cto',
    name: 'Rachel Kim',
    role: 'Chief Technology Officer',
    phone: '+1-555-0100',
    email: 'rachel.kim@wedsync.com',
    priority: 'escalation',
    availability: 'available',
    location: 'San Francisco, CA',
    specializations: ['Strategy', 'Architecture', 'Crisis Management'],
  },
];

const ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'critical-infrastructure',
    condition: 'Infrastructure failure affecting multiple services',
    timeThreshold: 5,
    action: 'auto-escalate',
    contacts: ['tech-lead', 'cto'],
    automated: true,
  },
  {
    id: 'wedding-day-crisis',
    condition: 'Wedding day emergency during active event',
    timeThreshold: 2,
    action: 'notify',
    contacts: ['wedding-coordinator', 'tech-lead'],
    automated: true,
  },
  {
    id: 'security-breach',
    condition: 'Potential security breach detected',
    timeThreshold: 1,
    action: 'trigger-workflow',
    contacts: ['security-officer', 'cto'],
    automated: true,
  },
];

export default function EmergencyCommandCenter() {
  const [activeEmergencies, setActiveEmergencies] = useState<ActiveEmergency[]>(
    [],
  );
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(
    null,
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [autoEscalationEnabled, setAutoEscalationEnabled] = useState(true);
  const [communicationLog, setCommunicationLog] = useState<
    CommunicationEntry[]
  >([]);

  const {
    vibrate,
    showNotification,
    triggerHapticFeedback,
    isEmergencyMode,
    activateEmergencyMode,
  } = useMobileInfrastructure();

  // Simulate active emergencies for demo
  useEffect(() => {
    const demoEmergencies: ActiveEmergency[] = [
      {
        id: 'infra-001',
        title: 'Database Connection Pool Exhausted',
        severity: 'critical',
        category: 'infrastructure',
        status: 'active',
        startTime: Date.now() - 180000, // 3 minutes ago
        assignedTo: ['tech-lead', 'infra-engineer'],
        description:
          'Primary database connection pool has reached maximum capacity, affecting wedding data access',
        location: 'AWS US-East-1',
        affectedSystems: [
          'Wedding Database',
          'Vendor Portal',
          'Client Dashboard',
        ],
        communicationLog: [
          {
            id: 'comm-001',
            timestamp: Date.now() - 120000,
            type: 'alert',
            from: 'system',
            to: ['tech-lead'],
            content: 'Critical alert: Database connection pool exhausted',
            priority: 'urgent',
          },
          {
            id: 'comm-002',
            timestamp: Date.now() - 90000,
            type: 'call',
            from: 'tech-lead',
            to: ['infra-engineer'],
            content: 'Conference call initiated to assess database issue',
            priority: 'urgent',
          },
        ],
      },
    ];

    setActiveEmergencies(demoEmergencies);
  }, []);

  // Auto-escalation monitoring
  useEffect(() => {
    if (!autoEscalationEnabled) return;

    const checkEscalation = () => {
      activeEmergencies.forEach((emergency) => {
        const timeElapsed = (Date.now() - emergency.startTime) / 1000 / 60; // minutes

        ESCALATION_RULES.forEach((rule) => {
          if (
            timeElapsed > rule.timeThreshold &&
            emergency.status === 'active'
          ) {
            handleAutoEscalation(emergency, rule);
          }
        });
      });
    };

    const interval = setInterval(checkEscalation, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeEmergencies, autoEscalationEnabled]);

  const handleAutoEscalation = useCallback(
    (emergency: ActiveEmergency, rule: EscalationRule) => {
      console.log(
        'Auto-escalating emergency:',
        emergency.id,
        'with rule:',
        rule.id,
      );

      // Update emergency status
      setActiveEmergencies((prev) =>
        prev.map((e) =>
          e.id === emergency.id ? { ...e, status: 'escalated' } : e,
        ),
      );

      // Add communication log entry
      const escalationEntry: CommunicationEntry = {
        id: `escalation-${Date.now()}`,
        timestamp: Date.now(),
        type: 'alert',
        from: 'auto-escalation',
        to: rule.contacts,
        content: `Auto-escalated: ${emergency.title} (${rule.condition})`,
        priority: 'urgent',
      };

      setCommunicationLog((prev) => [escalationEntry, ...prev]);

      // Notifications and alerts
      if (alertsEnabled) {
        vibrate([200, 100, 200, 100, 200]);
        showNotification('🚨 Emergency Escalated', {
          body: `${emergency.title} has been auto-escalated`,
          tag: 'escalation',
          requireInteraction: true,
        });
      }
    },
    [alertsEnabled, vibrate, showNotification],
  );

  const handleEmergencySelect = useCallback(
    (emergencyId: string) => {
      setSelectedEmergency(emergencyId);
      triggerHapticFeedback('light');
    },
    [triggerHapticFeedback],
  );

  const handleContactCall = useCallback(
    (contact: EmergencyContact) => {
      window.open(`tel:${contact.phone}`);
      vibrate(50);

      // Log communication
      const callEntry: CommunicationEntry = {
        id: `call-${Date.now()}`,
        timestamp: Date.now(),
        type: 'call',
        from: 'command-center',
        to: [contact.id],
        content: `Called ${contact.name} (${contact.role})`,
        priority: 'normal',
      };

      setCommunicationLog((prev) => [callEntry, ...prev]);
    },
    [vibrate],
  );

  const handleBroadcastAlert = useCallback(() => {
    const alertEntry: CommunicationEntry = {
      id: `broadcast-${Date.now()}`,
      timestamp: Date.now(),
      type: 'alert',
      from: 'command-center',
      to: EMERGENCY_CONTACTS.filter((c) => c.priority === 'primary').map(
        (c) => c.id,
      ),
      content: 'Emergency broadcast: All hands emergency response activated',
      priority: 'urgent',
    };

    setCommunicationLog((prev) => [alertEntry, ...prev]);

    vibrate([100, 50, 100, 50, 100]);
    showNotification('📢 Emergency Broadcast Sent', {
      body: 'Alert sent to all primary emergency contacts',
      tag: 'broadcast',
    });
  }, [vibrate, showNotification]);

  const getSeverityColor = (severity: 'critical' | 'high' | 'medium') => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-red-600 bg-red-100';
      case 'escalated':
        return 'text-purple-600 bg-purple-100';
      case 'resolving':
        return 'text-blue-600 bg-blue-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-red-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Emergency Command Center</h1>
              <p className="text-red-100 text-sm">
                {activeEmergencies.length} active emergency
                {activeEmergencies.length !== 1 ? 'ies' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isAudioEnabled ? 'secondary' : 'outline'}
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            >
              {isAudioEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleBroadcastAlert}
              className="bg-red-800 hover:bg-red-900"
            >
              <Radio className="w-4 h-4 mr-2" />
              Broadcast
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active" className="p-4">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="active" className="text-xs">
            Active
            {activeEmergencies.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {activeEmergencies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="comms">Comms</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Active Emergencies */}
        <TabsContent value="active" className="space-y-4">
          {activeEmergencies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  All Systems Operational
                </h3>
                <p className="text-gray-600">No active emergencies detected</p>
              </CardContent>
            </Card>
          ) : (
            activeEmergencies.map((emergency) => (
              <Card
                key={emergency.id}
                className={`border-2 cursor-pointer transition-all ${
                  selectedEmergency === emergency.id
                    ? 'border-red-400 bg-red-50'
                    : getSeverityColor(emergency.severity)
                }`}
                onClick={() => handleEmergencySelect(emergency.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {emergency.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getStatusColor(emergency.status)}>
                          {emergency.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {emergency.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">{emergency.category}</Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {Math.floor((Date.now() - emergency.startTime) / 60000)}m
                      ago
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-gray-700 mb-3">{emergency.description}</p>

                  {emergency.affectedSystems && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Affected Systems:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {emergency.affectedSystems.map((system) => (
                          <Badge
                            key={system}
                            variant="destructive"
                            className="text-xs"
                          >
                            {system}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {emergency.assignedTo && emergency.assignedTo.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Assigned Team:
                      </p>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {emergency.assignedTo
                            .map(
                              (id) =>
                                EMERGENCY_CONTACTS.find((c) => c.id === id)
                                  ?.name,
                            )
                            .join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      {emergency.location && (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>{emergency.location}</span>
                        </>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Launch emergency workflow
                          console.log('Launch workflow for:', emergency.id);
                        }}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Workflow
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Escalate emergency
                          console.log('Escalate:', emergency.id);
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Escalate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Emergency Contacts */}
        <TabsContent value="contacts" className="space-y-3">
          {EMERGENCY_CONTACTS.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {contact.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getAvailabilityColor(contact.availability)} rounded-full border-2 border-white`}
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold">{contact.name}</h3>
                      <p className="text-gray-600 text-sm">{contact.role}</p>
                      {contact.location && (
                        <p className="text-gray-500 text-xs mt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {contact.location}
                        </p>
                      )}

                      {contact.specializations && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {contact.specializations.map((spec) => (
                            <Badge
                              key={spec}
                              variant="secondary"
                              className="text-xs"
                            >
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-3">
                    <Button
                      size="sm"
                      onClick={() => handleContactCall(contact)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`mailto:${contact.email}`)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Communications Log */}
        <TabsContent value="comms" className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Communication Log</h3>
            <Badge variant="secondary">{communicationLog.length} entries</Badge>
          </div>

          {communicationLog.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Communications
                </h3>
                <p className="text-gray-600">Communication log is empty</p>
              </CardContent>
            </Card>
          ) : (
            communicationLog.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          entry.priority === 'urgent'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {entry.type}
                      </Badge>
                      <span className="text-sm font-medium">{entry.from}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm text-gray-600">
                        {entry.to.join(', ')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{entry.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Audio Alerts</h4>
                  <p className="text-sm text-gray-600">
                    Play sound notifications for emergencies
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isAudioEnabled ? 'default' : 'outline'}
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                >
                  {isAudioEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Push Notifications</h4>
                  <p className="text-sm text-gray-600">
                    Receive emergency alerts via push notifications
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={alertsEnabled ? 'default' : 'outline'}
                  onClick={() => setAlertsEnabled(!alertsEnabled)}
                >
                  {alertsEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Escalation</h4>
                  <p className="text-sm text-gray-600">
                    Automatically escalate emergencies based on rules
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={autoEscalationEnabled ? 'default' : 'outline'}
                  onClick={() =>
                    setAutoEscalationEnabled(!autoEscalationEnabled)
                  }
                >
                  {autoEscalationEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escalation Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ESCALATION_RULES.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{rule.condition}</h4>
                    <Badge variant={rule.automated ? 'default' : 'secondary'}>
                      {rule.automated ? 'Auto' : 'Manual'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Threshold: {rule.timeThreshold} minutes</p>
                    <p>Action: {rule.action}</p>
                    <p>Contacts: {rule.contacts.join(', ')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
