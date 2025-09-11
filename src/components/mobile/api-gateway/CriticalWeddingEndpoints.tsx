/**
 * CriticalWeddingEndpoints.tsx - Priority API access for wedding operations
 *
 * Provides touch-optimized UI for managing critical wedding day API endpoints
 * with real-time monitoring, emergency contacts, and priority handling.
 *
 * @component
 * @author WedSync Development Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  Zap,
  Users,
  Camera,
  Heart,
  Signal,
  Battery,
  Wifi,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Types
interface CriticalEndpoint {
  id: string;
  name: string;
  url: string;
  priority: 'emergency' | 'critical' | 'high';
  category: 'timeline' | 'contact' | 'photo' | 'venue' | 'emergency';
  status: 'healthy' | 'warning' | 'error' | 'offline';
  responseTime: number;
  lastCheck: Date;
  uptime: number;
  errorCount: number;
  isWeddingDay: boolean;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  isAvailable: boolean;
  lastContact: Date;
  priority: number;
}

interface WeddingDayStatus {
  isWeddingDay: boolean;
  weddingId: string;
  startTime: Date;
  currentPhase: 'setup' | 'ceremony' | 'reception' | 'breakdown';
  criticalOperations: string[];
  emergencyMode: boolean;
}

interface CriticalWeddingEndpointsProps {
  weddingId: string;
  isWeddingDay?: boolean;
  emergencyMode?: boolean;
  onEndpointCall?: (endpoint: CriticalEndpoint) => void;
  onEmergencyContact?: (contact: EmergencyContact) => void;
  className?: string;
}

const CRITICAL_ENDPOINTS: CriticalEndpoint[] = [
  {
    id: 'timeline-sync',
    name: 'Timeline Sync',
    url: '/api/timeline/sync',
    priority: 'critical',
    category: 'timeline',
    status: 'healthy',
    responseTime: 120,
    lastCheck: new Date(),
    uptime: 99.8,
    errorCount: 0,
    isWeddingDay: true,
  },
  {
    id: 'emergency-contact',
    name: 'Emergency Contacts',
    url: '/api/emergency/contacts',
    priority: 'emergency',
    category: 'emergency',
    status: 'healthy',
    responseTime: 80,
    lastCheck: new Date(),
    uptime: 100,
    errorCount: 0,
    isWeddingDay: true,
  },
  {
    id: 'photo-upload',
    name: 'Photo Upload',
    url: '/api/photos/upload',
    priority: 'critical',
    category: 'photo',
    status: 'warning',
    responseTime: 2500,
    lastCheck: new Date(),
    uptime: 97.5,
    errorCount: 2,
    isWeddingDay: true,
  },
  {
    id: 'vendor-status',
    name: 'Vendor Status',
    url: '/api/vendors/status',
    priority: 'high',
    category: 'contact',
    status: 'healthy',
    responseTime: 200,
    lastCheck: new Date(),
    uptime: 98.9,
    errorCount: 1,
    isWeddingDay: false,
  },
  {
    id: 'venue-alerts',
    name: 'Venue Alerts',
    url: '/api/venue/alerts',
    priority: 'critical',
    category: 'venue',
    status: 'healthy',
    responseTime: 150,
    lastCheck: new Date(),
    uptime: 99.2,
    errorCount: 0,
    isWeddingDay: true,
  },
];

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'photographer',
    name: 'John Smith Photography',
    role: 'Lead Photographer',
    phone: '+44 7700 900123',
    isAvailable: true,
    lastContact: new Date(Date.now() - 300000), // 5 min ago
    priority: 1,
  },
  {
    id: 'venue-coordinator',
    name: 'Sarah Johnson',
    role: 'Venue Coordinator',
    phone: '+44 7700 900124',
    isAvailable: true,
    lastContact: new Date(Date.now() - 600000), // 10 min ago
    priority: 2,
  },
  {
    id: 'wedding-planner',
    name: 'Emma Wilson',
    role: 'Wedding Planner',
    phone: '+44 7700 900125',
    isAvailable: false,
    lastContact: new Date(Date.now() - 1800000), // 30 min ago
    priority: 1,
  },
];

export const CriticalWeddingEndpoints: React.FC<
  CriticalWeddingEndpointsProps
> = ({
  weddingId,
  isWeddingDay = false,
  emergencyMode = false,
  onEndpointCall,
  onEmergencyContact,
  className,
}) => {
  const [endpoints, setEndpoints] =
    useState<CriticalEndpoint[]>(CRITICAL_ENDPOINTS);
  const [contacts, setContacts] =
    useState<EmergencyContact[]>(EMERGENCY_CONTACTS);
  const [weddingStatus, setWeddingStatus] = useState<WeddingDayStatus>({
    isWeddingDay,
    weddingId,
    startTime: new Date(),
    currentPhase: 'setup',
    criticalOperations: ['timeline-sync', 'emergency-contact'],
    emergencyMode,
  });
  const [networkStatus, setNetworkStatus] = useState({
    quality: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    signal: 85,
    battery: 78,
    isCharging: false,
  });

  const { toast } = useToast();

  // Monitor endpoint health
  useEffect(() => {
    const interval = setInterval(() => {
      checkEndpointsHealth();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Wedding day phase detection
  useEffect(() => {
    if (isWeddingDay) {
      detectWeddingPhase();
    }
  }, [isWeddingDay]);

  const checkEndpointsHealth = useCallback(async () => {
    const updatedEndpoints = await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const startTime = Date.now();
          const response = await fetch(`${endpoint.url}/health`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          const endTime = Date.now();

          return {
            ...endpoint,
            status: response.ok ? 'healthy' : 'warning',
            responseTime: endTime - startTime,
            lastCheck: new Date(),
            errorCount: response.ok ? 0 : endpoint.errorCount + 1,
          } as CriticalEndpoint;
        } catch (error) {
          return {
            ...endpoint,
            status: 'error' as const,
            lastCheck: new Date(),
            errorCount: endpoint.errorCount + 1,
          };
        }
      }),
    );

    setEndpoints(updatedEndpoints);

    // Alert if critical endpoints are down
    const criticalDown = updatedEndpoints.filter(
      (ep) =>
        (ep.priority === 'emergency' || ep.priority === 'critical') &&
        ep.status === 'error',
    );

    if (criticalDown.length > 0) {
      toast({
        title: 'Critical Endpoints Down',
        description: `${criticalDown.length} critical endpoints are unavailable`,
        variant: 'destructive',
      });
    }
  }, [endpoints, toast]);

  const detectWeddingPhase = useCallback(() => {
    const now = new Date();
    const weddingStart = weddingStatus.startTime;
    const timeDiff = now.getTime() - weddingStart.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    let phase: WeddingDayStatus['currentPhase'] = 'setup';
    if (hoursDiff < 0) phase = 'setup';
    else if (hoursDiff < 1) phase = 'ceremony';
    else if (hoursDiff < 6) phase = 'reception';
    else phase = 'breakdown';

    setWeddingStatus((prev) => ({ ...prev, currentPhase: phase }));
  }, [weddingStatus.startTime]);

  const handleEndpointCall = async (endpoint: CriticalEndpoint) => {
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId, priority: endpoint.priority }),
        signal: AbortSignal.timeout(10000),
      });

      const endTime = Date.now();

      // Update endpoint metrics
      const updatedEndpoint = {
        ...endpoint,
        responseTime: endTime - startTime,
        lastCheck: new Date(),
        status: response.ok ? 'healthy' : 'error',
      } as CriticalEndpoint;

      setEndpoints((prev) =>
        prev.map((ep) => (ep.id === endpoint.id ? updatedEndpoint : ep)),
      );

      if (response.ok) {
        toast({
          title: `${endpoint.name} Success`,
          description: `Response time: ${endTime - startTime}ms`,
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

      onEndpointCall?.(updatedEndpoint);
    } catch (error) {
      toast({
        title: `${endpoint.name} Failed`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleEmergencyContact = (contact: EmergencyContact) => {
    // Update last contact time
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id ? { ...c, lastContact: new Date() } : c,
      ),
    );

    // Trigger phone call
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${contact.phone}`;
    }

    toast({
      title: 'Emergency Contact',
      description: `Calling ${contact.name} - ${contact.role}`,
    });

    onEmergencyContact?.(contact);
  };

  const filteredEndpoints = useMemo(() => {
    const sorted = endpoints.sort((a, b) => {
      // Emergency and critical first
      const priorityOrder = { emergency: 3, critical: 2, high: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Wedding day endpoints first
      if (a.isWeddingDay !== b.isWeddingDay) {
        return a.isWeddingDay ? -1 : 1;
      }

      // Then by status (errors first for attention)
      const statusOrder = { error: 3, warning: 2, offline: 1, healthy: 0 };
      return statusOrder[b.status] - statusOrder[a.status];
    });

    return emergencyMode
      ? sorted.filter(
          (ep) => ep.priority === 'emergency' || ep.priority === 'critical',
        )
      : sorted;
  }, [endpoints, emergencyMode]);

  const availableContacts = useMemo(() => {
    return contacts
      .filter((c) => c.isAvailable)
      .sort((a, b) => a.priority - b.priority);
  }, [contacts]);

  const getStatusColor = (status: CriticalEndpoint['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'warning':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'error':
        return 'text-red-600 border-red-200 bg-red-50';
      case 'offline':
        return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: CriticalEndpoint['priority']) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCategoryIcon = (category: CriticalEndpoint['category']) => {
    switch (category) {
      case 'timeline':
        return Clock;
      case 'contact':
        return Phone;
      case 'photo':
        return Camera;
      case 'venue':
        return MapPin;
      case 'emergency':
        return AlertTriangle;
      default:
        return Zap;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with wedding status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
            <Heart className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Critical Endpoints
            </h1>
            <p className="text-sm text-gray-500">
              {isWeddingDay
                ? `Wedding Day - ${weddingStatus.currentPhase}`
                : 'Standard Operation'}
            </p>
          </div>
        </div>

        {/* Emergency mode toggle */}
        {isWeddingDay && (
          <Button
            variant={emergencyMode ? 'destructive' : 'outline'}
            size="sm"
            onClick={() =>
              setWeddingStatus((prev) => ({
                ...prev,
                emergencyMode: !prev.emergencyMode,
              }))
            }
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {emergencyMode ? 'Emergency Mode' : 'Enable Emergency'}
          </Button>
        )}
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Signal
              className={cn(
                'h-4 w-4',
                networkStatus.quality === 'good'
                  ? 'text-green-500'
                  : 'text-yellow-500',
              )}
            />
            <span className="text-sm font-medium capitalize">
              {networkStatus.quality}
            </span>
          </div>
          <Progress value={networkStatus.signal} className="mt-2 h-2" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Battery
              className={cn(
                'h-4 w-4',
                networkStatus.battery > 20 ? 'text-green-500' : 'text-red-500',
              )}
            />
            <span className="text-sm font-medium">
              {networkStatus.battery}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {networkStatus.isCharging ? 'Charging' : 'Not charging'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {availableContacts.length}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Available contacts</div>
        </Card>
      </div>

      {/* Critical endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Critical Endpoints</span>
            <Badge variant="outline">{filteredEndpoints.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredEndpoints.map((endpoint) => {
            const IconComponent = getCategoryIcon(endpoint.category);
            return (
              <div
                key={endpoint.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    <IconComponent className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-sm text-gray-900">
                        {endpoint.name}
                      </h3>
                      <Badge
                        className={getPriorityColor(endpoint.priority)}
                        variant="outline"
                      >
                        {endpoint.priority}
                      </Badge>
                      {endpoint.isWeddingDay && (
                        <Badge
                          variant="outline"
                          className="text-pink-600 border-pink-200 bg-pink-50"
                        >
                          Wedding Day
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{endpoint.responseTime}ms</span>
                      <span>{endpoint.uptime}% uptime</span>
                      <span className={getStatusColor(endpoint.status)}>
                        {endpoint.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEndpointCall(endpoint)}
                    disabled={endpoint.status === 'offline'}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Emergency contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Emergency Contacts</span>
            <Badge variant="outline">{availableContacts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-gray-900">
                    {contact.name}
                  </h3>
                  <p className="text-xs text-gray-500">{contact.role}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge
                      variant="outline"
                      className={
                        contact.isAvailable
                          ? 'text-green-600 border-green-200 bg-green-50'
                          : 'text-red-600 border-red-200 bg-red-50'
                      }
                    >
                      {contact.isAvailable ? 'Available' : 'Busy'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Last:{' '}
                      {Math.round(
                        (Date.now() - contact.lastContact.getTime()) / 60000,
                      )}
                      m ago
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant={contact.priority === 1 ? 'default' : 'outline'}
                onClick={() => handleEmergencyContact(contact)}
                disabled={!contact.isAvailable}
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Wedding day phase indicator */}
      {isWeddingDay && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">
                Wedding Day Timeline
              </h3>
              <Badge
                variant="outline"
                className="text-pink-600 border-pink-200 bg-pink-50"
              >
                {weddingStatus.currentPhase}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Setup</span>
                <span>Ceremony</span>
                <span>Reception</span>
                <span>Breakdown</span>
              </div>
              <Progress
                value={
                  weddingStatus.currentPhase === 'setup'
                    ? 25
                    : weddingStatus.currentPhase === 'ceremony'
                      ? 50
                      : weddingStatus.currentPhase === 'reception'
                        ? 75
                        : 100
                }
                className="h-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Critical operations active:{' '}
                {weddingStatus.criticalOperations.length}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CriticalWeddingEndpoints;
