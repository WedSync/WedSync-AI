'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Zap,
  Phone,
  Mail,
  Clock,
  Shield,
  Heart,
  Camera,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Play,
  Square,
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * EmergencyRecoveryPanel Component
 *
 * Emergency wedding data recovery interface for critical
 * situations, especially wedding day disasters.
 */

interface EmergencyIncident {
  id: string;
  type:
    | 'wedding_day_failure'
    | 'data_corruption'
    | 'system_outage'
    | 'vendor_emergency';
  severity: 'critical' | 'high' | 'medium';
  weddingId: string;
  coupleName: string;
  weddingDate: string;
  hoursUntilWedding: number;
  status: 'active' | 'recovering' | 'resolved';
  affectedSystems: string[];
  estimatedRecoveryTime: string;
  assignedTechnician?: string;
  communicationSent: boolean;
  timeline: EmergencyAction[];
}

interface EmergencyAction {
  id: string;
  timestamp: string;
  action: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  technician: string;
  details?: string;
}

interface EmergencyContact {
  role: 'technical_lead' | 'account_manager' | 'customer_success' | 'executive';
  name: string;
  phone: string;
  email: string;
  available: boolean;
  responseTime: string;
}

const EmergencyRecoveryPanel: React.FC = () => {
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<string>('');
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([]);
  const [systemStatus, setSystemStatus] = useState<
    'operational' | 'degraded' | 'emergency'
  >('operational');
  const [activeRecoveries, setActiveRecoveries] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadEmergencyData();
    loadEmergencyContacts();

    // Real-time monitoring
    const interval = setInterval(() => {
      checkEmergencyStatus();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const loadEmergencyData = async () => {
    try {
      // Mock emergency incidents - in production, load from database
      const mockIncidents: EmergencyIncident[] = [
        {
          id: 'emergency_001',
          type: 'wedding_day_failure',
          severity: 'critical',
          weddingId: 'wedding_123',
          coupleName: 'Sarah & James Wilson',
          weddingDate: new Date().toISOString(),
          hoursUntilWedding: 2,
          status: 'active',
          affectedSystems: ['Photo Storage', 'Client Gallery', 'Backup System'],
          estimatedRecoveryTime: '45 minutes',
          assignedTechnician: 'Alex Thompson',
          communicationSent: false,
          timeline: [
            {
              id: 'action_001',
              timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
              action: 'Emergency incident detected',
              status: 'completed',
              technician: 'System',
              details:
                'Automated systems detected critical failure in photo storage',
            },
            {
              id: 'action_002',
              timestamp: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
              action: 'Technical team notified',
              status: 'completed',
              technician: 'System',
              details: 'Emergency alerts sent to on-call technicians',
            },
            {
              id: 'action_003',
              timestamp: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
              action: 'Recovery process initiated',
              status: 'in_progress',
              technician: 'Alex Thompson',
              details: 'Beginning emergency data recovery from backup systems',
            },
          ],
        },
      ];

      setIncidents(mockIncidents);
      setActiveRecoveries(
        mockIncidents.filter((i) => i.status === 'recovering').length,
      );

      if (mockIncidents.some((i) => i.severity === 'critical')) {
        setSystemStatus('emergency');
      }
    } catch (error) {
      console.error('Failed to load emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmergencyContacts = async () => {
    const contacts: EmergencyContact[] = [
      {
        role: 'technical_lead',
        name: 'Alex Thompson',
        phone: '+44 7700 900123',
        email: 'alex.thompson@wedsync.com',
        available: true,
        responseTime: '< 5 minutes',
      },
      {
        role: 'account_manager',
        name: 'Sarah Mitchell',
        phone: '+44 7700 900124',
        email: 'sarah.mitchell@wedsync.com',
        available: true,
        responseTime: '< 10 minutes',
      },
      {
        role: 'customer_success',
        name: 'David Chen',
        phone: '+44 7700 900125',
        email: 'david.chen@wedsync.com',
        available: false,
        responseTime: '< 15 minutes',
      },
      {
        role: 'executive',
        name: 'Emma Roberts',
        phone: '+44 7700 900126',
        email: 'emma.roberts@wedsync.com',
        available: true,
        responseTime: '< 30 minutes',
      },
    ];

    setEmergencyContacts(contacts);
  };

  const checkEmergencyStatus = async () => {
    // Monitor for new incidents or status changes
    try {
      // In production, check for new critical incidents
      const newIncidents = await supabase
        .from('emergency_incidents')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Update status and trigger alerts if needed
    } catch (error) {
      console.error('Failed to check emergency status:', error);
    }
  };

  const initiateEmergencyRecovery = async (incidentId: string) => {
    try {
      const incident = incidents.find((i) => i.id === incidentId);
      if (!incident) return;

      // Start emergency recovery process
      const newAction: EmergencyAction = {
        id: `action_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Manual emergency recovery initiated',
        status: 'in_progress',
        technician: 'Emergency Operator',
        details: 'One-click emergency recovery started from management panel',
      };

      setIncidents(
        incidents.map((i) =>
          i.id === incidentId
            ? {
                ...i,
                status: 'recovering',
                timeline: [...i.timeline, newAction],
              }
            : i,
        ),
      );

      // Call emergency recovery API
      await supabase.functions.invoke('emergency-recovery', {
        body: {
          incidentId,
          weddingId: incident.weddingId,
          recoveryType: 'full',
          priority: 'maximum',
        },
      });
    } catch (error) {
      console.error('Failed to initiate emergency recovery:', error);
    }
  };

  const sendEmergencyNotifications = async (incidentId: string) => {
    try {
      const incident = incidents.find((i) => i.id === incidentId);
      if (!incident) return;

      // Send notifications to couple and vendors
      await supabase.functions.invoke('send-emergency-notifications', {
        body: {
          incidentId,
          weddingId: incident.weddingId,
          coupleName: incident.coupleName,
          weddingDate: incident.weddingDate,
          hoursUntil: incident.hoursUntilWedding,
          affectedSystems: incident.affectedSystems,
        },
      });

      setIncidents(
        incidents.map((i) =>
          i.id === incidentId ? { ...i, communicationSent: true } : i,
        ),
      );
    } catch (error) {
      console.error('Failed to send emergency notifications:', error);
    }
  };

  const callEmergencyContact = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const emailEmergencyContact = (
    email: string,
    incident?: EmergencyIncident,
  ) => {
    const subject = incident
      ? `EMERGENCY: ${incident.coupleName} Wedding Day Incident`
      : 'Emergency Recovery Support Needed';
    const body = incident
      ? `Emergency incident for ${incident.coupleName} wedding (${incident.hoursUntilWedding} hours until ceremony). Affected systems: ${incident.affectedSystems.join(', ')}.`
      : 'Emergency recovery support needed.';

    window.open(
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_self',
    );
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'wedding_day_failure':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'data_corruption':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'system_outage':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'vendor_emergency':
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'recovering':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'in_progress':
        return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Zap className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading emergency recovery panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-600">
            🚨 EMERGENCY RECOVERY
          </h1>
          <p className="text-muted-foreground">
            Critical wedding day disaster recovery and emergency response
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            className={
              systemStatus === 'emergency'
                ? 'bg-red-100 text-red-800 border-red-200'
                : systemStatus === 'degraded'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-green-100 text-green-800 border-green-200'
            }
          >
            {systemStatus.toUpperCase()} STATUS
          </Badge>
          <Button variant="outline" onClick={loadEmergencyData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alert */}
      {incidents.some(
        (i) => i.severity === 'critical' && i.status === 'active',
      ) && (
        <Alert className="border-red-600 bg-red-50 animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-800">
            CRITICAL WEDDING DAY EMERGENCY
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="mt-2">
              <p className="font-bold">
                Active wedding day incidents requiring immediate attention
              </p>
              <ul className="list-disc list-inside text-sm mt-1">
                {incidents
                  .filter(
                    (i) => i.severity === 'critical' && i.status === 'active',
                  )
                  .map((incident) => (
                    <li key={incident.id}>
                      {incident.coupleName} - {incident.hoursUntilWedding} hours
                      until ceremony
                    </li>
                  ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Emergencies
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {incidents.filter((i) => i.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate action
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Recoveries
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activeRecoveries}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wedding Day Risks
            </CardTitle>
            <Heart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {incidents.filter((i) => i.hoursUntilWedding <= 24).length}
            </div>
            <p className="text-xs text-muted-foreground">Within 24 hours</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Team Available
            </CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {emergencyContacts.filter((c) => c.available).length}/
              {emergencyContacts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Emergency responders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            Active Emergency Incidents
          </CardTitle>
          <CardDescription>
            Critical incidents requiring immediate response
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No Active Emergencies
              </h3>
              <p className="text-gray-600">All systems operational</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border-2 border-red-200 rounded-lg p-4 bg-red-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getIncidentIcon(incident.type)}
                      {getStatusIcon(incident.status)}
                      <div>
                        <h4 className="font-bold text-red-900">
                          EMERGENCY: {incident.coupleName}
                        </h4>
                        <p className="text-sm text-red-700">
                          Wedding:{' '}
                          {format(
                            new Date(incident.weddingDate),
                            'EEEE, MMMM dd, yyyy',
                          )}
                        </p>
                        <p className="text-sm font-bold text-red-800">
                          {incident.hoursUntilWedding} HOURS UNTIL CEREMONY
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {incident.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-bold text-red-900">
                        Affected Systems:
                      </span>
                      <ul className="text-sm text-red-700 mt-1">
                        {incident.affectedSystems.map((system, index) => (
                          <li key={index}>• {system}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-sm font-bold text-red-900">
                        Estimated Recovery:
                      </span>
                      <p className="text-sm text-red-700">
                        {incident.estimatedRecoveryTime}
                      </p>

                      {incident.assignedTechnician && (
                        <>
                          <span className="text-sm font-bold text-red-900 mt-2 block">
                            Assigned:
                          </span>
                          <p className="text-sm text-red-700">
                            {incident.assignedTechnician}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={() => initiateEmergencyRecovery(incident.id)}
                        disabled={incident.status === 'recovering'}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {incident.status === 'recovering' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            RECOVERY IN PROGRESS
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            START EMERGENCY RECOVERY
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => sendEmergencyNotifications(incident.id)}
                        disabled={incident.communicationSent}
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {incident.communicationSent ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            NOTIFICATIONS SENT
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            NOTIFY COUPLE & VENDORS
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Recovery Timeline */}
                  <div>
                    <h5 className="font-bold text-red-900 mb-2">
                      Recovery Timeline:
                    </h5>
                    <div className="space-y-2">
                      {incident.timeline.slice(-5).map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center space-x-3 text-sm"
                        >
                          {getActionStatusIcon(action.status)}
                          <span className="text-red-700">
                            {format(new Date(action.timestamp), 'HH:mm:ss')}
                          </span>
                          <span className="flex-1 text-red-800 font-medium">
                            {action.action}
                          </span>
                          <span className="text-red-600">
                            {action.technician}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-500" />
            Emergency Response Team
          </CardTitle>
          <CardDescription>
            Immediate contact for critical wedding day emergencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900 capitalize">
                    {contact.role.replace('_', ' ')}
                  </h4>
                  <Badge variant={contact.available ? 'default' : 'secondary'}>
                    {contact.available ? 'AVAILABLE' : 'BUSY'}
                  </Badge>
                </div>

                <p className="font-medium text-gray-800">{contact.name}</p>
                <p className="text-sm text-gray-600 mb-3">
                  Response: {contact.responseTime}
                </p>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => callEmergencyContact(contact.phone)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    CALL NOW
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      emailEmergencyContact(contact.email, incidents[0])
                    }
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    EMAIL
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Protocols */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Emergency Protocols
          </CardTitle>
          <CardDescription>
            Quick action protocols for common emergency scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="h-5 w-5 text-red-500" />
                <h4 className="font-bold text-red-900">Wedding Day Failure</h4>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                <li>1. Assess impact on ceremony</li>
                <li>2. Contact couple immediately</li>
                <li>3. Initiate backup systems</li>
                <li>4. Coordinate with vendors</li>
                <li>5. Provide real-time updates</li>
              </ul>
            </div>

            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-center space-x-2 mb-2">
                <Camera className="h-5 w-5 text-orange-500" />
                <h4 className="font-bold text-orange-900">Data Corruption</h4>
              </div>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>1. Isolate affected systems</li>
                <li>2. Assess data integrity</li>
                <li>3. Begin recovery process</li>
                <li>4. Verify backup validity</li>
                <li>5. Restore from clean backup</li>
              </ul>
            </div>

            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h4 className="font-bold text-blue-900">Vendor Emergency</h4>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Contact primary vendor</li>
                <li>2. Alert backup vendors</li>
                <li>3. Coordinate replacements</li>
                <li>4. Update couple & planner</li>
                <li>5. Document changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyRecoveryPanel;
