'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  Users,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'escalated' | 'resolved';
  location: string;
  timestamp: Date;
  description: string;
  assignedTo?: string;
  venueId: string;
  guestCount?: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  isPrimary: boolean;
}

interface MobileIncidentDashboardProps {
  venueId: string;
  userId: string;
  onIncidentCreate?: (incident: Partial<Incident>) => void;
  onEmergencyCall?: (contactId: string) => void;
}

export const MobileIncidentDashboard: React.FC<
  MobileIncidentDashboardProps
> = ({ venueId, userId, onIncidentCreate, onEmergencyCall }) => {
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] =
    useState<GeolocationCoordinates | null>(null);

  // Get current location for venue context
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentLocation(position.coords),
        (error) => console.warn('Location access denied:', error),
      );
    }
  }, []);

  // Load incident data (in real implementation, this would come from Supabase)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Mock data - replace with actual Supabase queries
      const mockIncidents: Incident[] = [
        {
          id: '1',
          title: 'Guest Medical Emergency',
          severity: 'high',
          status: 'active',
          location: 'Main Reception Hall',
          timestamp: new Date(),
          description: 'Guest requires immediate medical attention',
          venueId,
          guestCount: 150,
        },
        {
          id: '2',
          title: 'Weather Alert',
          severity: 'medium',
          status: 'active',
          location: 'Outdoor Ceremony Area',
          timestamp: new Date(Date.now() - 300000),
          description: 'Heavy rain approaching venue',
          venueId,
          guestCount: 200,
        },
      ];

      const mockContacts: EmergencyContact[] = [
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
          phone: '+1-555-0123',
          isPrimary: true,
        },
        {
          id: '3',
          name: 'Wedding Coordinator',
          role: 'Coordinator',
          phone: '+1-555-0124',
          isPrimary: false,
        },
      ];

      setActiveIncidents(mockIncidents);
      setEmergencyContacts(mockContacts);
      setIsLoading(false);
    };

    loadData();
  }, [venueId]);

  const getSeverityColor = (severity: Incident['severity']) => {
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

  const handleEmergencyCall = (contact: EmergencyContact) => {
    if (onEmergencyCall) {
      onEmergencyCall(contact.id);
    }

    // Initiate phone call
    window.location.href = `tel:${contact.phone}`;
  };

  const handleCreateIncident = () => {
    const newIncident: Partial<Incident> = {
      title: 'New Incident',
      severity: 'medium',
      status: 'active',
      location: currentLocation
        ? `${currentLocation.latitude}, ${currentLocation.longitude}`
        : 'Unknown',
      timestamp: new Date(),
      venueId,
      description: '',
    };

    if (onIncidentCreate) {
      onIncidentCreate(newIncident);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading incident dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Emergency Response
        </h1>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1" />
          <span>Venue Security Dashboard</span>
        </div>
      </div>

      {/* Emergency Contacts - Always visible */}
      <Card className="mb-6 border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-red-700">
            <Phone className="w-5 h-5 mr-2" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          {emergencyContacts.map((contact) => (
            <Button
              key={contact.id}
              onClick={() => handleEmergencyCall(contact)}
              variant={contact.isPrimary ? 'destructive' : 'outline'}
              size="lg"
              className="min-h-[56px] justify-between text-left"
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

      {/* Active Incidents */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Active Incidents
            </div>
            <Badge variant="destructive">{activeIncidents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeIncidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active incidents</p>
            </div>
          ) : (
            activeIncidents.map((incident) => (
              <Card
                key={incident.id}
                className="border-l-4 border-l-orange-500"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {incident.title}
                    </h3>
                    <Badge
                      className={`${getSeverityColor(incident.severity)} text-white ml-2`}
                    >
                      {incident.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    {incident.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {incident.location}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {incident.timestamp.toLocaleTimeString()}
                    </div>
                    {incident.guestCount && (
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {incident.guestCount} guests
                      </div>
                    )}
                    <div className="flex items-center">
                      <Badge
                        variant={
                          incident.status === 'active'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleCreateIncident}
            size="lg"
            variant="outline"
            className="min-h-[56px] justify-start"
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            Report New Incident
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="min-h-[56px] justify-start"
          >
            <Users className="w-5 h-5 mr-3" />
            Guest Safety Check
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="min-h-[56px] justify-start"
          >
            <MapPin className="w-5 h-5 mr-3" />
            Venue Status Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileIncidentDashboard;
