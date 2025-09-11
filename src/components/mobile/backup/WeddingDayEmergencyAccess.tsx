'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CameraIcon,
  HeartIcon,
  CalendarIcon,
  MegaphoneIcon,
  BellAlertIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface WeddingEmergency {
  weddingId: string;
  coupleName: string;
  weddingDate: string;
  venue: {
    name: string;
    address: string;
    phone: string;
    emergencyContact: string;
  };
  timeline: {
    currentEvent?: {
      time: string;
      title: string;
      location: string;
      critical: boolean;
    };
    nextEvent?: {
      time: string;
      title: string;
      location: string;
      critical: boolean;
    };
    upcomingEvents: Array<{
      time: string;
      title: string;
      location: string;
      critical: boolean;
    }>;
  };
  emergencyContacts: Array<{
    name: string;
    role: string;
    phone: string;
    critical: boolean;
  }>;
  criticalInfo: {
    photographer: string;
    coordinator: string;
    emergencyFund: number;
    backupPlans: string[];
    weatherAlert?: string;
  };
  status: 'normal' | 'warning' | 'emergency';
  alerts: Array<{
    id: string;
    type: 'delay' | 'issue' | 'weather' | 'emergency';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
}

export default function WeddingDayEmergencyAccess() {
  const [weddingData, setWeddingData] = useState<WeddingEmergency | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [showAllContacts, setShowAllContacts] = useState(false);

  useEffect(() => {
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Load today's wedding data
    loadTodaysWedding();

    // Auto-enable emergency mode if it's wedding day and within event hours
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 6 && hour <= 23) {
      setEmergencyMode(true);
    }

    return () => clearInterval(timeInterval);
  }, []);

  const loadTodaysWedding = async () => {
    try {
      // Mock today's wedding data
      const mockWedding: WeddingEmergency = {
        weddingId: 'wedding_20240915',
        coupleName: 'Sarah & Mike Johnson',
        weddingDate: '2024-09-15',
        venue: {
          name: 'Grand Ballroom',
          address: '123 Wedding Ave, Celebration City, CA 90210',
          phone: '+1 (555) 123-4567',
          emergencyContact: 'Alice Smith (Manager): +1 (555) 123-4568',
        },
        timeline: {
          currentEvent: {
            time: '16:00',
            title: 'Wedding Ceremony',
            location: 'Main Hall',
            critical: true,
          },
          nextEvent: {
            time: '17:00',
            title: 'Cocktail Hour',
            location: 'Garden Terrace',
            critical: false,
          },
          upcomingEvents: [
            {
              time: '18:30',
              title: 'Reception Dinner',
              location: 'Ballroom',
              critical: true,
            },
            {
              time: '20:00',
              title: 'First Dance',
              location: 'Ballroom',
              critical: true,
            },
            {
              time: '22:00',
              title: 'Cake Cutting',
              location: 'Ballroom',
              critical: true,
            },
          ],
        },
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            role: 'Bride',
            phone: '+1 (555) 111-1111',
            critical: true,
          },
          {
            name: 'Mike Johnson',
            role: 'Groom',
            phone: '+1 (555) 222-2222',
            critical: true,
          },
          {
            name: 'Jennifer Smith',
            role: 'Wedding Coordinator',
            phone: '+1 (555) 333-3333',
            critical: true,
          },
          {
            name: 'David Wilson',
            role: 'Lead Photographer',
            phone: '+1 (555) 444-4444',
            critical: true,
          },
          {
            name: 'Robert Johnson',
            role: 'Father of Bride',
            phone: '+1 (555) 666-6666',
            critical: false,
          },
        ],
        criticalInfo: {
          photographer: 'David Wilson - Lead, backup equipment available',
          coordinator: 'Jennifer Smith - Day-of coordination',
          emergencyFund: 2500,
          backupPlans: [
            'Rain Plan: Move ceremony to Ballroom',
            'Power Outage: Generator on site',
            'Vendor No-Show: Backup vendors on call',
          ],
          weatherAlert: 'Light rain expected 18:00-19:00',
        },
        status: 'warning',
        alerts: [
          {
            id: 'alert1',
            type: 'weather',
            message:
              'Light rain expected during cocktail hour. Rain plan activated.',
            timestamp: new Date(Date.now() - 1800000),
            resolved: false,
          },
          {
            id: 'alert2',
            type: 'delay',
            message: 'Bride running 10 minutes behind schedule.',
            timestamp: new Date(Date.now() - 3600000),
            resolved: true,
          },
        ],
      };

      setWeddingData(mockWedding);
    } catch (error) {
      console.error('Failed to load wedding data:', error);
    }
  };

  const makeEmergencyCall = (phone: string, contactName: string) => {
    if (confirm(`Call ${contactName} at ${phone}?`)) {
      window.location.href = `tel:${phone}`;
    }
  };

  const sendEmergencyText = (phone: string, contactName: string) => {
    const message = `URGENT: Wedding Day Emergency for ${weddingData?.coupleName}. Please respond immediately.`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  };

  const resolveAlert = (alertId: string) => {
    setWeddingData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        alerts: prev.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, resolved: true } : alert,
        ),
      };
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getTimeUntilEvent = (eventTime: string) => {
    const now = new Date();
    const [hours, minutes] = eventTime.split(':');
    const eventDate = new Date();
    eventDate.setHours(parseInt(hours), parseInt(minutes));

    const diff = eventDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diff / (1000 * 60));

    if (diffMinutes < 0) return 'In Progress';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: WeddingEmergency['status']) => {
    switch (status) {
      case 'normal':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'emergency':
        return 'bg-red-600';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-50 border-red-500 text-red-800';
      case 'weather':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800';
      case 'delay':
        return 'bg-blue-50 border-blue-500 text-blue-800';
      case 'issue':
        return 'bg-orange-50 border-orange-500 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-800';
    }
  };

  if (!weddingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Wedding Today
          </h2>
          <p className="text-gray-600">
            No wedding scheduled for emergency access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Emergency Header */}
      <div
        className={`${getStatusColor(weddingData.status)} text-white shadow-lg`}
      >
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <HeartIcon className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">{weddingData.coupleName}</h1>
                <p className="text-sm opacity-90">{weddingData.weddingDate}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                {currentTime.toLocaleTimeString()}
              </p>
              <p className="text-sm opacity-90 capitalize">
                {weddingData.status} Status
              </p>
            </div>
          </div>

          {/* Current Event */}
          {weddingData.timeline.currentEvent && (
            <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    NOW: {weddingData.timeline.currentEvent.title}
                  </h2>
                  <p className="opacity-90">
                    {weddingData.timeline.currentEvent.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {formatTime(weddingData.timeline.currentEvent.time)}
                  </p>
                  {weddingData.timeline.currentEvent.critical && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      CRITICAL
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next Event */}
          {weddingData.timeline.nextEvent && (
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    NEXT: {weddingData.timeline.nextEvent.title}
                  </h3>
                  <p className="text-sm opacity-75">
                    {weddingData.timeline.nextEvent.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatTime(weddingData.timeline.nextEvent.time)}
                  </p>
                  <p className="text-sm opacity-75">
                    {getTimeUntilEvent(weddingData.timeline.nextEvent.time)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {weddingData.alerts.filter((a) => !a.resolved).length > 0 && (
        <div className="bg-red-600 text-white px-4 py-3 border-b">
          <div className="flex items-center space-x-2">
            <BellAlertIcon className="h-5 w-5 animate-pulse" />
            <span className="font-semibold">
              {weddingData.alerts.filter((a) => !a.resolved).length} Active
              Alert(s)
            </span>
          </div>
        </div>
      )}

      {/* Emergency Action Buttons */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              const coordinator = weddingData.emergencyContacts.find(
                (c) => c.role === 'Wedding Coordinator',
              );
              if (coordinator)
                makeEmergencyCall(coordinator.phone, coordinator.name);
            }}
            className="bg-red-600 text-white px-4 py-4 rounded-lg font-bold text-center touch-manipulation"
            style={{ minHeight: '64px' }}
          >
            <PhoneIcon className="h-8 w-8 mx-auto mb-1" />
            CALL COORDINATOR
          </button>
          <button
            onClick={() => makeEmergencyCall(weddingData.venue.phone, 'Venue')}
            className="bg-blue-600 text-white px-4 py-4 rounded-lg font-bold text-center touch-manipulation"
            style={{ minHeight: '64px' }}
          >
            <MapPinIcon className="h-8 w-8 mx-auto mb-1" />
            CALL VENUE
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Active Alerts */}
        {weddingData.alerts.filter((a) => !a.resolved).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              🚨 Active Alerts
            </h2>
            <div className="space-y-3">
              {weddingData.alerts
                .filter((alert) => !alert.resolved)
                .map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`rounded-lg border-l-4 p-4 ${getAlertColor(alert.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-bold text-sm uppercase">
                            {alert.type}
                          </span>
                          <span className="text-xs">
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-medium">{alert.message}</p>
                      </div>
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-4 p-2 bg-green-600 text-white rounded-lg touch-manipulation"
                        style={{ minWidth: '48px', minHeight: '48px' }}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {/* Critical Contacts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">
              🔥 Emergency Contacts
            </h2>
            <button
              onClick={() => setShowAllContacts(!showAllContacts)}
              className="text-blue-600 font-medium touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              {showAllContacts ? 'Show Less' : 'Show All'}
            </button>
          </div>

          <div className="space-y-3">
            {weddingData.emergencyContacts
              .filter((contact) => showAllContacts || contact.critical)
              .map((contact, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg border-2 p-4 ${
                    contact.critical
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {contact.name}
                      </h3>
                      <p className="text-sm text-gray-600">{contact.role}</p>
                      <p className="font-mono text-gray-900 text-lg">
                        {contact.phone}
                      </p>
                    </div>
                    {contact.critical && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        CRITICAL
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        makeEmergencyCall(contact.phone, contact.name)
                      }
                      className="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                      style={{ minHeight: '48px' }}
                    >
                      <PhoneIcon className="h-5 w-5 mr-2" />
                      Call
                    </button>
                    <button
                      onClick={() =>
                        sendEmergencyText(contact.phone, contact.name)
                      }
                      className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                      style={{ minHeight: '48px' }}
                    >
                      TEXT
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            ⏰ Today's Timeline
          </h2>
          <div className="space-y-3">
            {weddingData.timeline.upcomingEvents.map((event, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg border p-4 ${
                  event.critical ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-600">📍 {event.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatTime(event.time)}
                    </p>
                    <p className="text-sm text-blue-600">
                      {getTimeUntilEvent(event.time)}
                    </p>
                    {event.critical && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold mt-1 inline-block">
                        CRITICAL
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Information */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            🛡️ Critical Information
          </h2>
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Emergency Fund Available
              </p>
              <p className="text-3xl font-bold text-green-600">
                ${weddingData.criticalInfo.emergencyFund}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Lead Photographer
              </p>
              <p className="text-gray-900">
                {weddingData.criticalInfo.photographer}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Coordinator</p>
              <p className="text-gray-900">
                {weddingData.criticalInfo.coordinator}
              </p>
            </div>

            {weddingData.criticalInfo.weatherAlert && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-900">
                  Weather Alert
                </p>
                <p className="text-yellow-800">
                  {weddingData.criticalInfo.weatherAlert}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Backup Plans
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                {weddingData.criticalInfo.backupPlans.map((plan, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{plan}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Venue Information */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            🏛️ Venue Information
          </h2>
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                {weddingData.venue.name}
              </h3>
              <p className="text-gray-600">{weddingData.venue.address}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Main Phone</p>
              <p className="font-mono text-lg text-gray-900">
                {weddingData.venue.phone}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Emergency Contact
              </p>
              <p className="text-gray-900">
                {weddingData.venue.emergencyContact}
              </p>
            </div>

            <button
              onClick={() => {
                const encodedAddress = encodeURIComponent(
                  weddingData.venue.address,
                );
                if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                  window.location.href = `maps://maps.google.com/maps?daddr=${encodedAddress}`;
                } else {
                  window.location.href = `https://maps.google.com/maps?daddr=${encodedAddress}`;
                }
              }}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              <MapPinIcon className="h-5 w-5 inline mr-2" />
              Get Directions
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Toggle */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setEmergencyMode(!emergencyMode)}
          className={`p-4 rounded-full shadow-lg touch-manipulation ${
            emergencyMode
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-white text-red-600 border-2 border-red-600'
          }`}
          style={{ minWidth: '64px', minHeight: '64px' }}
        >
          <ExclamationTriangleIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
