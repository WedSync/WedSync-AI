'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudOff,
  Wifi,
  Upload,
  AlertTriangle,
  Clock,
  Database,
  Sync,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflineIncident {
  id: string;
  type: 'medical' | 'security' | 'fire' | 'weather' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  reportedBy: string;
  timestamp: Date;
  coordinates?: GeolocationCoordinates;
  voiceRecording?: Blob;
  photos?: File[];
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  retryCount: number;
}

interface CriticalContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

interface OfflineIncidentHandlerProps {
  venueId: string;
  userId: string;
  userName: string;
  onIncidentSync?: (incident: OfflineIncident) => Promise<boolean>;
  onOfflineReport?: (
    incident: Omit<OfflineIncident, 'id' | 'syncStatus' | 'retryCount'>,
  ) => void;
}

export const OfflineIncidentHandler: React.FC<OfflineIncidentHandlerProps> = ({
  venueId,
  userId,
  userName,
  onIncidentSync,
  onOfflineReport,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineIncident[]>([]);
  const [criticalContacts, setCriticalContacts] = useState<CriticalContact[]>(
    [],
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data from localStorage on mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      triggerSync();
    }
  }, [isOnline, offlineQueue.length]);

  const loadOfflineData = () => {
    try {
      // Load offline incidents
      const savedIncidents = localStorage.getItem(
        `offline_incidents_${venueId}`,
      );
      if (savedIncidents) {
        const incidents = JSON.parse(savedIncidents).map((incident: any) => ({
          ...incident,
          timestamp: new Date(incident.timestamp),
        }));
        setOfflineQueue(incidents);
      }

      // Load critical contacts
      const savedContacts = localStorage.getItem(
        `critical_contacts_${venueId}`,
      );
      if (savedContacts) {
        setCriticalContacts(JSON.parse(savedContacts));
      } else {
        // Default emergency contacts for offline use
        const defaultContacts: CriticalContact[] = [
          {
            id: '1',
            name: 'Emergency Services',
            role: 'Emergency',
            phone: '911',
            isPrimary: true,
          },
          {
            id: '2',
            name: 'Venue Security',
            role: 'Security',
            phone: '+1-555-VENUE',
            isPrimary: true,
          },
          {
            id: '3',
            name: 'Wedding Coordinator',
            role: 'Coordinator',
            phone: '+1-555-COORD',
            isPrimary: false,
          },
          {
            id: '4',
            name: 'Venue Manager',
            role: 'Management',
            phone: '+1-555-MGMT',
            isPrimary: false,
          },
        ];
        setCriticalContacts(defaultContacts);
        localStorage.setItem(
          `critical_contacts_${venueId}`,
          JSON.stringify(defaultContacts),
        );
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const saveOfflineIncident = (
    incident: Omit<OfflineIncident, 'id' | 'syncStatus' | 'retryCount'>,
  ) => {
    const newIncident: OfflineIncident = {
      ...incident,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'pending',
      retryCount: 0,
    };

    const updatedQueue = [...offlineQueue, newIncident];
    setOfflineQueue(updatedQueue);

    // Persist to localStorage
    try {
      localStorage.setItem(
        `offline_incidents_${venueId}`,
        JSON.stringify(updatedQueue),
      );
    } catch (error) {
      console.error('Failed to save offline incident:', error);
    }

    // Notify parent component
    if (onOfflineReport) {
      onOfflineReport(incident);
    }

    return newIncident;
  };

  const triggerSync = async () => {
    if (!isOnline || isSyncing || offlineQueue.length === 0) return;

    setIsSyncing(true);
    setLastSyncAttempt(new Date());

    for (const incident of offlineQueue.filter(
      (i) => i.syncStatus === 'pending' || i.syncStatus === 'error',
    )) {
      try {
        // Update status to syncing
        updateIncidentStatus(incident.id, 'syncing');

        if (onIncidentSync) {
          const success = await onIncidentSync(incident);

          if (success) {
            updateIncidentStatus(incident.id, 'synced');
          } else {
            updateIncidentStatus(incident.id, 'error');
            incrementRetryCount(incident.id);
          }
        }
      } catch (error) {
        console.error('Sync failed for incident:', incident.id, error);
        updateIncidentStatus(incident.id, 'error');
        incrementRetryCount(incident.id);
      }
    }

    setIsSyncing(false);

    // Clean up synced incidents older than 24 hours
    cleanupSyncedIncidents();
  };

  const updateIncidentStatus = (
    incidentId: string,
    status: OfflineIncident['syncStatus'],
  ) => {
    const updatedQueue = offlineQueue.map((incident) =>
      incident.id === incidentId
        ? { ...incident, syncStatus: status }
        : incident,
    );
    setOfflineQueue(updatedQueue);

    try {
      localStorage.setItem(
        `offline_incidents_${venueId}`,
        JSON.stringify(updatedQueue),
      );
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  const incrementRetryCount = (incidentId: string) => {
    const updatedQueue = offlineQueue.map((incident) =>
      incident.id === incidentId
        ? { ...incident, retryCount: incident.retryCount + 1 }
        : incident,
    );
    setOfflineQueue(updatedQueue);

    try {
      localStorage.setItem(
        `offline_incidents_${venueId}`,
        JSON.stringify(updatedQueue),
      );
    } catch (error) {
      console.error('Failed to update retry count:', error);
    }
  };

  const cleanupSyncedIncidents = () => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filteredQueue = offlineQueue.filter(
      (incident) =>
        incident.syncStatus !== 'synced' ||
        incident.timestamp.getTime() > oneDayAgo,
    );

    if (filteredQueue.length !== offlineQueue.length) {
      setOfflineQueue(filteredQueue);
      localStorage.setItem(
        `offline_incidents_${venueId}`,
        JSON.stringify(filteredQueue),
      );
    }
  };

  const handleEmergencyCall = (contact: CriticalContact) => {
    window.location.href = `tel:${contact.phone}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: OfflineIncident['syncStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'syncing':
        return <Sync className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const pendingCount = offlineQueue.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'error',
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Connection Status */}
      <Alert
        className={`mb-6 ${isOnline ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}
      >
        <div className="flex items-center">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500 mr-2" />
          ) : (
            <CloudOff className="w-5 h-5 text-red-500 mr-2" />
          )}
          <AlertDescription
            className={isOnline ? 'text-green-700' : 'text-red-700'}
          >
            {isOnline
              ? 'Online - Incidents will sync automatically'
              : 'Offline - Incidents saved locally'}
          </AlertDescription>
        </div>
      </Alert>

      {/* Sync Status */}
      {(pendingCount > 0 || isSyncing) && (
        <Card className="mb-6 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Sync Status
              </div>
              {isSyncing && <Badge variant="secondary">Syncing...</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-600">
                {pendingCount} incidents pending sync
              </span>
              {lastSyncAttempt && (
                <span className="text-xs text-gray-500">
                  Last attempt: {lastSyncAttempt.toLocaleTimeString()}
                </span>
              )}
            </div>

            {isOnline && (
              <Button
                onClick={triggerSync}
                disabled={isSyncing}
                size="sm"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Critical Contacts - Always Available Offline */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {criticalContacts.map((contact) => (
            <Button
              key={contact.id}
              onClick={() => handleEmergencyCall(contact)}
              variant={contact.isPrimary ? 'destructive' : 'outline'}
              size="lg"
              className="w-full min-h-[56px] justify-between text-left"
            >
              <div>
                <div className="font-medium">{contact.name}</div>
                <div className="text-sm opacity-90">{contact.role}</div>
              </div>
              <div className="text-sm font-mono">{contact.phone}</div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Offline Queue */}
      {offlineQueue.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Incident Queue
              </div>
              <Badge variant="outline">{offlineQueue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offlineQueue.slice(0, 5).map((incident) => (
              <Card key={incident.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">
                      {incident.type.toUpperCase()}
                    </h4>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(incident.syncStatus)}
                      <Badge
                        className={`${getSeverityColor(incident.severity)} text-white text-xs`}
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {incident.description}
                  </p>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{incident.location}</span>
                    <span>{incident.timestamp.toLocaleTimeString()}</span>
                  </div>

                  {incident.syncStatus === 'error' &&
                    incident.retryCount > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        Failed to sync ({incident.retryCount} attempts)
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}

            {offlineQueue.length > 5 && (
              <div className="text-center text-sm text-gray-500">
                ... and {offlineQueue.length - 5} more incidents
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Offline Instructions */}
      {!isOnline && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-700">
              Offline Mode Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-600 space-y-2">
            <p>
              • All incident reports are saved locally and will sync when
              connection is restored
            </p>
            <p>• Emergency contacts remain accessible for immediate response</p>
            <p>• Critical incidents should still trigger emergency calls</p>
            <p>• Photos and voice recordings are preserved for later upload</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Hook for using offline incident handling in other components
export const useOfflineIncidents = (venueId: string) => {
  const [handler, setHandler] = useState<OfflineIncidentHandler | null>(null);

  const saveOfflineIncident = useCallback(
    (incident: Omit<OfflineIncident, 'id' | 'syncStatus' | 'retryCount'>) => {
      // Implementation would be similar to the component's saveOfflineIncident method
      const newIncident: OfflineIncident = {
        ...incident,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        syncStatus: 'pending',
        retryCount: 0,
      };

      try {
        const existing = localStorage.getItem(`offline_incidents_${venueId}`);
        const incidents = existing ? JSON.parse(existing) : [];
        incidents.push(newIncident);
        localStorage.setItem(
          `offline_incidents_${venueId}`,
          JSON.stringify(incidents),
        );
        return newIncident;
      } catch (error) {
        console.error('Failed to save offline incident:', error);
        return null;
      }
    },
    [venueId],
  );

  return { saveOfflineIncident };
};

export default OfflineIncidentHandler;
