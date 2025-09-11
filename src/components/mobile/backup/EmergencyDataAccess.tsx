'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  CameraIcon,
  HeartIcon,
  InformationCircleIcon,
  SignalSlashIcon,
  WifiIcon,
  MagnifyingGlassIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface EmergencyContact {
  id: string;
  name: string;
  role:
    | 'bride'
    | 'groom'
    | 'venue'
    | 'photographer'
    | 'coordinator'
    | 'family'
    | 'vendor';
  phone: string;
  email: string;
  priority: 'critical' | 'high' | 'medium';
  notes?: string;
  available: boolean;
}

interface WeddingEvent {
  id: string;
  time: string;
  title: string;
  location: string;
  description: string;
  attendees: string[];
  duration: number;
  priority: 'critical' | 'high' | 'medium';
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
}

interface VenueInfo {
  name: string;
  address: string;
  phone: string;
  emergencyContact: string;
  wifiPassword?: string;
  parkingInfo: string;
  accessInstructions: string;
  mapCoordinates?: { lat: number; lng: number };
}

interface EmergencyData {
  weddingDate: string;
  couple: {
    bride: string;
    groom: string;
  };
  venue: VenueInfo;
  contacts: EmergencyContact[];
  timeline: WeddingEvent[];
  criticalInfo: {
    photographer: string;
    coordinator: string;
    emergencyFund: number;
    backupVenue?: string;
    weatherPlan?: string;
  };
  lastSync: Date;
}

export default function EmergencyDataAccess() {
  const [isOnline, setIsOnline] = useState(true);
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<
    'contacts' | 'timeline' | 'venue' | 'info'
  >('contacts');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] =
    useState<EmergencyContact | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        setIsEmergencyMode(true);
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Load emergency data from cache
    loadEmergencyData();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(timeInterval);
    };
  }, []);

  const loadEmergencyData = async () => {
    try {
      // In real app, load from localStorage or IndexedDB
      const mockData: EmergencyData = {
        weddingDate: '2024-09-15',
        couple: {
          bride: 'Sarah Johnson',
          groom: 'Mike Johnson',
        },
        venue: {
          name: 'Grand Ballroom',
          address: '123 Wedding Ave, Celebration City, CA 90210',
          phone: '+1 (555) 123-4567',
          emergencyContact: 'Event Manager: Alice Smith +1 (555) 123-4568',
          wifiPassword: 'SarahMike2024',
          parkingInfo:
            'Valet available at main entrance. Guest parking in Lot B',
          accessInstructions: 'Vendor entrance on north side. Code: 1234',
          mapCoordinates: { lat: 34.0522, lng: -118.2437 },
        },
        contacts: [
          {
            id: '1',
            name: 'Sarah Johnson',
            role: 'bride',
            phone: '+1 (555) 111-1111',
            email: 'sarah.johnson@email.com',
            priority: 'critical',
            available: true,
          },
          {
            id: '2',
            name: 'Mike Johnson',
            role: 'groom',
            phone: '+1 (555) 222-2222',
            email: 'mike.johnson@email.com',
            priority: 'critical',
            available: true,
          },
          {
            id: '3',
            name: 'Jennifer Smith',
            role: 'coordinator',
            phone: '+1 (555) 333-3333',
            email: 'jennifer@weddingplanner.com',
            priority: 'critical',
            notes: 'Primary day-of coordinator',
            available: true,
          },
          {
            id: '4',
            name: 'David Wilson',
            role: 'photographer',
            phone: '+1 (555) 444-4444',
            email: 'david@photography.com',
            priority: 'high',
            notes: 'Lead photographer - has backup equipment',
            available: true,
          },
          {
            id: '5',
            name: 'Alice Smith',
            role: 'venue',
            phone: '+1 (555) 123-4568',
            email: 'alice@grandballroom.com',
            priority: 'high',
            notes: 'Event manager - has master keys',
            available: true,
          },
          {
            id: '6',
            name: 'Robert Johnson',
            role: 'family',
            phone: '+1 (555) 666-6666',
            email: 'robert.johnson@email.com',
            priority: 'medium',
            notes: 'Father of bride - emergency contact',
            available: true,
          },
        ],
        timeline: [
          {
            id: '1',
            time: '08:00',
            title: 'Bridal Party Arrival',
            location: 'Bridal Suite',
            description: 'Hair and makeup preparation',
            attendees: [
              'Sarah',
              'Bridesmaids',
              'Hair Stylist',
              'Makeup Artist',
            ],
            duration: 180,
            priority: 'high',
            status: 'pending',
          },
          {
            id: '2',
            time: '10:00',
            title: 'Venue Setup Check',
            location: 'Main Hall',
            description: 'Final venue walkthrough with coordinator',
            attendees: ['Jennifer', 'Venue Staff'],
            duration: 60,
            priority: 'critical',
            status: 'pending',
          },
          {
            id: '3',
            time: '14:00',
            title: 'First Look Photos',
            location: 'Garden Pavilion',
            description: 'Private moment and photos before ceremony',
            attendees: ['Sarah', 'Mike', 'David'],
            duration: 45,
            priority: 'high',
            status: 'pending',
          },
          {
            id: '4',
            time: '16:00',
            title: 'Wedding Ceremony',
            location: 'Main Hall',
            description: 'The big moment!',
            attendees: ['All guests'],
            duration: 45,
            priority: 'critical',
            status: 'pending',
          },
          {
            id: '5',
            time: '18:00',
            title: 'Reception Begins',
            location: 'Ballroom',
            description: 'Cocktail hour and dinner service',
            attendees: ['All guests'],
            duration: 300,
            priority: 'critical',
            status: 'pending',
          },
        ],
        criticalInfo: {
          photographer: 'David Wilson - Lead, backup equipment available',
          coordinator: 'Jennifer Smith - Day-of coordination',
          emergencyFund: 2500,
          backupVenue: 'Garden Pavilion (outdoor ceremony backup)',
          weatherPlan: 'Move ceremony indoors to Ballroom if rain',
        },
        lastSync: new Date(Date.now() - 3600000), // 1 hour ago
      };

      setEmergencyData(mockData);
    } catch (error) {
      console.error('Failed to load emergency data:', error);
    }
  };

  const makePhoneCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const sendSMS = (phoneNumber: string, message?: string) => {
    const smsMessage =
      message ||
      `Emergency: This is regarding ${emergencyData?.couple.bride} & ${emergencyData?.couple.groom}'s wedding on ${emergencyData?.weddingDate}. Please respond ASAP.`;
    window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(smsMessage)}`;
  };

  const openMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      window.location.href = `maps://maps.google.com/maps?daddr=${encodedAddress}`;
    } else {
      window.location.href = `https://maps.google.com/maps?daddr=${encodedAddress}`;
    }
  };

  const filteredContacts =
    emergencyData?.contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm),
    ) || [];

  const currentEvent = emergencyData?.timeline.find((event) => {
    const eventTime = new Date(`${emergencyData.weddingDate} ${event.time}`);
    const now = new Date();
    const eventEnd = new Date(eventTime.getTime() + event.duration * 60000);
    return now >= eventTime && now <= eventEnd;
  });

  const nextEvent = emergencyData?.timeline.find((event) => {
    const eventTime = new Date(`${emergencyData.weddingDate} ${event.time}`);
    return eventTime > new Date();
  });

  const getRoleColor = (role: EmergencyContact['role']) => {
    switch (role) {
      case 'bride':
      case 'groom':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'coordinator':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'photographer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'venue':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'family':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'high':
        return <StarIcon className="h-4 w-4 text-orange-600" />;
      default:
        return <InformationCircleIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  if (!emergencyData) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Emergency Data Not Available
          </h2>
          <p className="text-red-700">
            Unable to load cached wedding data for offline access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Emergency Header */}
      <div
        className={`${isEmergencyMode ? 'bg-red-600' : 'bg-white'} shadow-sm border-b`}
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {isEmergencyMode && (
                <ExclamationTriangleIcon className="h-6 w-6 text-white animate-pulse" />
              )}
              <h1
                className={`text-xl font-bold ${isEmergencyMode ? 'text-white' : 'text-gray-900'}`}
              >
                {isEmergencyMode ? 'EMERGENCY MODE' : 'Emergency Access'}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {!isOnline ? (
                <div className="flex items-center text-red-300">
                  <SignalSlashIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              ) : (
                <div className="flex items-center text-green-300">
                  <WifiIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Online</span>
                </div>
              )}
            </div>
          </div>

          <div
            className={`text-center ${isEmergencyMode ? 'text-white' : 'text-gray-900'}`}
          >
            <h2 className="font-semibold text-lg">
              {emergencyData.couple.bride} & {emergencyData.couple.groom}
            </h2>
            <p className="text-sm opacity-90">{emergencyData.weddingDate}</p>
            <p className="text-xs opacity-75 mt-1">
              Last sync: {emergencyData.lastSync.toLocaleString()}
            </p>
          </div>

          {(currentEvent || nextEvent) && (
            <div
              className={`mt-4 p-3 rounded-lg ${isEmergencyMode ? 'bg-red-500' : 'bg-blue-50'}`}
            >
              {currentEvent && (
                <div
                  className={`${isEmergencyMode ? 'text-white' : 'text-blue-900'}`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <ClockIcon className="h-4 w-4" />
                    <span className="font-medium">
                      NOW: {currentEvent.title}
                    </span>
                  </div>
                  <p className="text-sm opacity-90">{currentEvent.location}</p>
                </div>
              )}
              {nextEvent && (
                <div
                  className={`${currentEvent ? 'mt-2 pt-2 border-t border-opacity-30' : ''} ${isEmergencyMode ? 'text-white border-white' : 'text-blue-800 border-blue-200'}`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <ClockIcon className="h-4 w-4" />
                    <span className="font-medium">
                      NEXT: {formatTime(nextEvent.time)} - {nextEvent.title}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Actions */}
      {isEmergencyMode && (
        <div className="bg-red-500 px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                makePhoneCall(
                  emergencyData.contacts.find((c) => c.role === 'coordinator')
                    ?.phone || '',
                )
              }
              className="bg-white text-red-600 px-4 py-3 rounded-lg font-semibold text-center touch-manipulation"
              style={{ minHeight: '56px' }}
            >
              <PhoneIcon className="h-6 w-6 mx-auto mb-1" />
              Call Coordinator
            </button>
            <button
              onClick={() => makePhoneCall(emergencyData.venue.phone)}
              className="bg-white text-red-600 px-4 py-3 rounded-lg font-semibold text-center touch-manipulation"
              style={{ minHeight: '56px' }}
            >
              <MapPinIcon className="h-6 w-6 mx-auto mb-1" />
              Call Venue
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="flex">
          {[
            { key: 'contacts', label: 'Contacts', icon: PhoneIcon },
            { key: 'timeline', label: 'Timeline', icon: ClockIcon },
            { key: 'venue', label: 'Venue', icon: MapPinIcon },
            { key: 'info', label: 'Info', icon: InformationCircleIcon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-3 px-2 text-center border-b-2 touch-manipulation ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600'
              }`}
              style={{ minHeight: '56px' }}
            >
              <Icon className="h-5 w-5 mx-auto mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg"
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </div>

              {/* Contacts List */}
              <div className="space-y-3">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg border shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {contact.name}
                            </h3>
                            {getPriorityIcon(contact.priority)}
                          </div>
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full border ${getRoleColor(contact.role)}`}
                          >
                            {contact.role}
                          </span>
                          {contact.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              {contact.notes}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${contact.available ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                      </div>

                      {/* Contact Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => makePhoneCall(contact.phone)}
                          className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '48px' }}
                        >
                          <PhoneIcon className="h-5 w-5 mr-2" />
                          Call
                        </button>
                        <button
                          onClick={() => sendSMS(contact.phone)}
                          className="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '48px' }}
                        >
                          SMS
                        </button>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 font-mono">
                          {contact.phone}
                        </p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-3">
                {emergencyData.timeline.map((event, index) => {
                  const isCurrentEvent = event.id === currentEvent?.id;
                  const isPastEvent =
                    new Date(`${emergencyData.weddingDate} ${event.time}`) <
                    new Date();

                  return (
                    <div
                      key={event.id}
                      className={`rounded-lg border-2 p-4 ${
                        isCurrentEvent
                          ? 'border-blue-500 bg-blue-50'
                          : isPastEvent
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-lg font-bold ${isCurrentEvent ? 'text-blue-600' : 'text-gray-900'}`}
                          >
                            {formatTime(event.time)}
                          </span>
                          {isCurrentEvent && (
                            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                              NOW
                            </span>
                          )}
                          {event.priority === 'critical' && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            event.status === 'completed'
                              ? 'bg-green-500'
                              : event.status === 'in-progress'
                                ? 'bg-blue-500'
                                : event.status === 'delayed'
                                  ? 'bg-red-500'
                                  : 'bg-gray-300'
                          }`}
                        />
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        📍 {event.location}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {event.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Duration: {event.duration} minutes
                      </p>

                      {event.attendees.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            Key people:
                          </p>
                          <p className="text-sm text-gray-700">
                            {event.attendees.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Venue Tab */}
          {activeTab === 'venue' && (
            <motion.div
              key="venue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {emergencyData.venue.name}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Address
                      </p>
                      <p className="text-gray-900 mb-2">
                        {emergencyData.venue.address}
                      </p>
                      <button
                        onClick={() => openMaps(emergencyData.venue.address)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center touch-manipulation"
                        style={{ minHeight: '44px' }}
                      >
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        Get Directions
                      </button>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Phone
                      </p>
                      <p className="text-gray-900 font-mono mb-2">
                        {emergencyData.venue.phone}
                      </p>
                      <button
                        onClick={() => makePhoneCall(emergencyData.venue.phone)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center touch-manipulation"
                        style={{ minHeight: '44px' }}
                      >
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        Call Venue
                      </button>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Emergency Contact
                      </p>
                      <p className="text-gray-900">
                        {emergencyData.venue.emergencyContact}
                      </p>
                    </div>

                    {emergencyData.venue.wifiPassword && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          WiFi Password
                        </p>
                        <p className="font-mono text-blue-900 text-lg">
                          {emergencyData.venue.wifiPassword}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Parking Information
                      </p>
                      <p className="text-gray-700">
                        {emergencyData.venue.parkingInfo}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Access Instructions
                      </p>
                      <p className="text-gray-700">
                        {emergencyData.venue.accessInstructions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <InformationCircleIcon className="h-5 w-5 mr-2" />
                    Critical Information
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Lead Photographer
                      </p>
                      <p className="text-gray-900">
                        {emergencyData.criticalInfo.photographer}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Wedding Coordinator
                      </p>
                      <p className="text-gray-900">
                        {emergencyData.criticalInfo.coordinator}
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-1">
                        Emergency Fund
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        ${emergencyData.criticalInfo.emergencyFund}
                      </p>
                      <p className="text-sm text-green-700">
                        Available for unexpected expenses
                      </p>
                    </div>

                    {emergencyData.criticalInfo.backupVenue && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-yellow-900 mb-1">
                          Backup Venue
                        </p>
                        <p className="text-yellow-900">
                          {emergencyData.criticalInfo.backupVenue}
                        </p>
                      </div>
                    )}

                    {emergencyData.criticalInfo.weatherPlan && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Weather Backup Plan
                        </p>
                        <p className="text-blue-900">
                          {emergencyData.criticalInfo.weatherPlan}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-red-900 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Emergency Protocols
                  </h3>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Call coordinator first for any issues</li>
                    <li>• Contact venue manager for facility problems</li>
                    <li>• Emergency fund covers unexpected vendor costs</li>
                    <li>• Backup plans are pre-approved by couple</li>
                    <li>• All vendors have emergency contact information</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emergency Toggle */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setIsEmergencyMode(!isEmergencyMode)}
          className={`p-4 rounded-full shadow-lg touch-manipulation ${
            isEmergencyMode ? 'bg-white text-red-600' : 'bg-red-600 text-white'
          }`}
          style={{ minWidth: '64px', minHeight: '64px' }}
        >
          <ExclamationTriangleIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
