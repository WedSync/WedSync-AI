'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  MapPinIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SignalSlashIcon,
  WifiIcon,
  CameraIcon,
  MusicalNoteIcon,
  TruckIcon,
  GiftIcon,
  CakeIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

interface VendorContact {
  id: string;
  name: string;
  category:
    | 'photography'
    | 'videography'
    | 'catering'
    | 'florist'
    | 'music'
    | 'venue'
    | 'transport'
    | 'cake'
    | 'planning'
    | 'other';
  phone: string;
  email: string;
  emergencyPhone?: string;
  address: string;
  contactPerson: string;
  role: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  availability: {
    available: boolean;
    notes?: string;
    lastChecked: Date;
  };
  services: string[];
  notes: string;
  weddingDate?: string;
  arrivalTime?: string;
  setupTime?: string;
  backupContact?: {
    name: string;
    phone: string;
  };
  cached: boolean;
  lastSync: Date;
}

interface VendorCategory {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
}

const vendorCategories: VendorCategory[] = [
  {
    key: 'photography',
    label: 'Photography',
    icon: CameraIcon,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    key: 'videography',
    label: 'Video',
    icon: CameraIcon,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    key: 'catering',
    label: 'Catering',
    icon: GiftIcon,
    color: 'text-green-600 bg-green-50',
  },
  {
    key: 'florist',
    label: 'Flowers',
    icon: HeartIcon,
    color: 'text-pink-600 bg-pink-50',
  },
  {
    key: 'music',
    label: 'Music/DJ',
    icon: MusicalNoteIcon,
    color: 'text-red-600 bg-red-50',
  },
  {
    key: 'venue',
    label: 'Venue',
    icon: MapPinIcon,
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    key: 'transport',
    label: 'Transport',
    icon: TruckIcon,
    color: 'text-gray-600 bg-gray-50',
  },
  {
    key: 'cake',
    label: 'Cake',
    icon: CakeIcon,
    color: 'text-yellow-600 bg-yellow-50',
  },
  {
    key: 'planning',
    label: 'Planning',
    icon: UserGroupIcon,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    key: 'other',
    label: 'Other',
    icon: UserGroupIcon,
    color: 'text-gray-600 bg-gray-50',
  },
];

export default function OfflineVendorContacts() {
  const [vendors, setVendors] = useState<VendorContact[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorContact[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<VendorContact | null>(
    null,
  );
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Load cached vendor contacts
    loadVendorContacts();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Filter vendors based on search, category, and priority
    let filtered = vendors;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (vendor) => vendor.category === selectedCategory,
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(
        (vendor) => vendor.priority === priorityFilter,
      );
    }

    if (showAvailableOnly) {
      filtered = filtered.filter((vendor) => vendor.availability.available);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(term) ||
          vendor.contactPerson.toLowerCase().includes(term) ||
          vendor.phone.includes(term) ||
          vendor.services.some((service) =>
            service.toLowerCase().includes(term),
          ),
      );
    }

    setFilteredVendors(filtered);
  }, [
    vendors,
    selectedCategory,
    searchTerm,
    priorityFilter,
    showAvailableOnly,
  ]);

  const loadVendorContacts = async () => {
    try {
      // Mock cached vendor data
      const mockVendors: VendorContact[] = [
        {
          id: '1',
          name: 'Perfect Moments Photography',
          category: 'photography',
          phone: '+1 (555) 444-4444',
          email: 'david@perfectmoments.com',
          emergencyPhone: '+1 (555) 444-4445',
          address: '456 Photography Lane, Studio City, CA 90210',
          contactPerson: 'David Wilson',
          role: 'Lead Photographer',
          priority: 'critical',
          availability: {
            available: true,
            notes: 'On-site and ready',
            lastChecked: new Date(Date.now() - 1800000),
          },
          services: [
            'Wedding Photography',
            'Engagement Sessions',
            'Photo Editing',
          ],
          notes: 'Has backup equipment and assistant photographer available',
          weddingDate: '2024-09-15',
          arrivalTime: '13:00',
          setupTime: '13:30',
          backupContact: {
            name: 'Sarah Miller',
            phone: '+1 (555) 444-4446',
          },
          cached: true,
          lastSync: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          name: 'Elegant Events Coordination',
          category: 'planning',
          phone: '+1 (555) 333-3333',
          email: 'jennifer@elegantevents.com',
          emergencyPhone: '+1 (555) 333-3334',
          address: '789 Event Plaza, Wedding City, CA 90211',
          contactPerson: 'Jennifer Smith',
          role: 'Senior Wedding Coordinator',
          priority: 'critical',
          availability: {
            available: true,
            notes: 'Managing timeline - available 24/7',
            lastChecked: new Date(Date.now() - 900000),
          },
          services: [
            'Day-of Coordination',
            'Full Planning',
            'Vendor Management',
          ],
          notes:
            'Primary contact for all day-of issues. Has master timeline and vendor contacts.',
          weddingDate: '2024-09-15',
          arrivalTime: '08:00',
          setupTime: '08:00',
          cached: true,
          lastSync: new Date(Date.now() - 1800000),
        },
        {
          id: '3',
          name: 'Grand Ballroom',
          category: 'venue',
          phone: '+1 (555) 123-4567',
          email: 'events@grandballroom.com',
          emergencyPhone: '+1 (555) 123-4568',
          address: '123 Wedding Ave, Celebration City, CA 90210',
          contactPerson: 'Alice Smith',
          role: 'Event Manager',
          priority: 'critical',
          availability: {
            available: true,
            notes: 'On-site team available',
            lastChecked: new Date(Date.now() - 600000),
          },
          services: ['Ceremony Space', 'Reception Hall', 'Catering Kitchen'],
          notes:
            'Has backup generator and emergency protocols. Master keys with Alice.',
          weddingDate: '2024-09-15',
          setupTime: '06:00',
          cached: true,
          lastSync: new Date(Date.now() - 2700000),
        },
        {
          id: '4',
          name: 'Bella Flora Designs',
          category: 'florist',
          phone: '+1 (555) 777-7777',
          email: 'maria@bellaflora.com',
          address: '321 Garden Way, Flower Town, CA 90212',
          contactPerson: 'Maria Rodriguez',
          role: 'Lead Florist',
          priority: 'high',
          availability: {
            available: true,
            notes: 'Delivering arrangements at 14:00',
            lastChecked: new Date(Date.now() - 1200000),
          },
          services: ['Bridal Bouquet', 'Centerpieces', 'Ceremony Arch'],
          notes: 'Has extra flowers for touch-ups. Delivery truck on standby.',
          weddingDate: '2024-09-15',
          arrivalTime: '14:00',
          setupTime: '14:30',
          cached: true,
          lastSync: new Date(Date.now() - 3600000),
        },
        {
          id: '5',
          name: 'Gourmet Delights Catering',
          category: 'catering',
          phone: '+1 (555) 888-8888',
          email: 'chef@gourmetdelights.com',
          emergencyPhone: '+1 (555) 888-8889',
          address: '654 Culinary Blvd, Food City, CA 90213',
          contactPerson: 'Chef Michael Brown',
          role: 'Executive Chef',
          priority: 'high',
          availability: {
            available: false,
            notes: 'Currently in kitchen prep - call emergency line',
            lastChecked: new Date(Date.now() - 3600000),
          },
          services: ['Wedding Dinner', 'Cocktail Hour', 'Cake Service'],
          notes:
            'Has dietary restriction alternatives prepared. Emergency contact for kitchen issues.',
          weddingDate: '2024-09-15',
          arrivalTime: '15:00',
          setupTime: '15:30',
          backupContact: {
            name: 'Sous Chef Lisa',
            phone: '+1 (555) 888-8890',
          },
          cached: true,
          lastSync: new Date(Date.now() - 7200000),
        },
        {
          id: '6',
          name: 'Beats & Rhythm DJ Services',
          category: 'music',
          phone: '+1 (555) 999-9999',
          email: 'dj@beatsrhythm.com',
          address: '987 Music Row, Sound City, CA 90214',
          contactPerson: 'DJ Alex Johnson',
          role: 'Lead DJ',
          priority: 'medium',
          availability: {
            available: true,
            notes: 'Setting up sound system',
            lastChecked: new Date(Date.now() - 2400000),
          },
          services: ['Reception Music', 'Ceremony Sound', 'Microphones'],
          notes: 'Backup sound system available. Has wedding playlist ready.',
          weddingDate: '2024-09-15',
          arrivalTime: '16:30',
          setupTime: '17:00',
          cached: true,
          lastSync: new Date(Date.now() - 5400000),
        },
      ];

      setVendors(
        mockVendors.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
      );
    } catch (error) {
      console.error('Failed to load vendor contacts:', error);
    }
  };

  const makeCall = (phone: string, name: string) => {
    window.location.href = `tel:${phone}`;
  };

  const sendSMS = (phone: string, name: string) => {
    const message = `Hi ${name}, this is regarding the ${vendors.find((v) => v.contactPerson === name)?.weddingDate} wedding. Please respond ASAP.`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  };

  const sendEmail = (email: string, name: string) => {
    const subject = `Urgent: Wedding Day Communication - ${new Date().toDateString()}`;
    const body = `Hi ${name},\n\nThis is regarding today's wedding. Please respond at your earliest convenience.\n\nThank you!`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      window.location.href = `maps://maps.google.com/maps?daddr=${encodedAddress}`;
    } else {
      window.location.href = `https://maps.google.com/maps?daddr=${encodedAddress}`;
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = vendorCategories.find((c) => c.key === category);
    return categoryData ? categoryData.icon : UserGroupIcon;
  };

  const getCategoryColor = (category: string) => {
    const categoryData = vendorCategories.find((c) => c.key === category);
    return categoryData ? categoryData.color : 'text-gray-600 bg-gray-50';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Vendor Contacts
            </h1>
            <div className="flex items-center space-x-2">
              {!isOnline ? (
                <div className="flex items-center text-red-600">
                  <SignalSlashIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <WifiIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Online</span>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search vendors, contacts, or services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base"
              style={{ minHeight: '48px' }}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-900">
                {vendors.filter((v) => v.availability.available).length}
              </p>
              <p className="text-sm text-green-700">Available</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-900">
                {vendors.filter((v) => v.priority === 'critical').length}
              </p>
              <p className="text-sm text-red-700">Critical</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-900">
                {vendors.length}
              </p>
              <p className="text-sm text-blue-700">Total</p>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap touch-manipulation ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                style={{ minHeight: '40px' }}
              >
                All Categories
              </button>
              {vendorCategories.map((category) => {
                const Icon = category.icon;
                const count = vendors.filter(
                  (v) => v.category === category.key,
                ).length;
                return (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap flex items-center space-x-2 touch-manipulation ${
                      selectedCategory === category.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.label}</span>
                    {count > 0 && (
                      <span className="bg-white bg-opacity-20 rounded-full px-2 py-0.5 text-xs">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-3">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  className="w-5 h-5 touch-manipulation"
                />
                <span className="text-sm font-medium">Available Only</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor List */}
      <div className="p-4">
        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Vendors Found
            </h3>
            <p className="text-gray-500">
              {searchTerm ||
              selectedCategory !== 'all' ||
              priorityFilter !== 'all' ||
              showAvailableOnly
                ? 'Try adjusting your filters'
                : 'No vendor contacts cached for offline access'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVendors.map((vendor) => {
              const CategoryIcon = getCategoryIcon(vendor.category);
              return (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg border shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className={`p-2 rounded-lg ${getCategoryColor(vendor.category)}`}
                        >
                          <CategoryIcon className="h-6 w-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {vendor.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(vendor.priority)}`}
                            >
                              {vendor.priority}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-1">
                            {vendor.contactPerson} • {vendor.role}
                          </p>

                          <div className="flex items-center space-x-2 mb-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                vendor.availability.available
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                              }`}
                            />
                            <span className="text-sm text-gray-600">
                              {vendor.availability.available
                                ? 'Available'
                                : 'Unavailable'}
                              {vendor.availability.notes &&
                                ` - ${vendor.availability.notes}`}
                            </span>
                          </div>

                          {vendor.arrivalTime && (
                            <p className="text-xs text-blue-600 mb-2">
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              Arrives: {vendor.arrivalTime}
                              {vendor.setupTime &&
                                ` | Setup: ${vendor.setupTime}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-sm text-gray-500">
                        <p>Cached {formatTimeAgo(vendor.lastSync)}</p>
                        {!isOnline && (
                          <span className="inline-flex items-center text-xs text-red-600 mt-1">
                            <SignalSlashIcon className="h-3 w-3 mr-1" />
                            Offline
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="font-medium text-gray-700">
                            Phone:{' '}
                          </span>
                          <span className="font-mono text-gray-900">
                            {vendor.phone}
                          </span>
                        </div>
                        {vendor.emergencyPhone && (
                          <div>
                            <span className="font-medium text-red-700">
                              Emergency:{' '}
                            </span>
                            <span className="font-mono text-red-900">
                              {vendor.emergencyPhone}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-700">
                            Email:{' '}
                          </span>
                          <span className="text-gray-900">{vendor.email}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Address:{' '}
                          </span>
                          <span className="text-gray-900">
                            {vendor.address}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Services */}
                    {vendor.services.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Services:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {vendor.services.map((service, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {vendor.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                        <p className="text-sm text-yellow-800">
                          <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                          {vendor.notes}
                        </p>
                      </div>
                    )}

                    {/* Backup Contact */}
                    {vendor.backupContact && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                        <p className="text-sm font-medium text-blue-900">
                          Backup Contact:
                        </p>
                        <p className="text-sm text-blue-800">
                          {vendor.backupContact.name}:{' '}
                          {vendor.backupContact.phone}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            makeCall(vendor.phone, vendor.contactPerson)
                          }
                          className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '48px' }}
                        >
                          <PhoneIcon className="h-5 w-5 mr-2" />
                          Call Main
                        </button>

                        {vendor.emergencyPhone && (
                          <button
                            onClick={() =>
                              makeCall(
                                vendor.emergencyPhone!,
                                vendor.contactPerson,
                              )
                            }
                            className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                            style={{ minHeight: '48px' }}
                          >
                            <PhoneIcon className="h-5 w-5 mr-2" />
                            Emergency
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            sendSMS(vendor.phone, vendor.contactPerson)
                          }
                          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '48px' }}
                        >
                          SMS
                        </button>

                        <button
                          onClick={() => getDirections(vendor.address)}
                          className="w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold flex items-center justify-center touch-manipulation"
                          style={{ minHeight: '48px' }}
                        >
                          <MapPinIcon className="h-5 w-5 mr-2" />
                          Directions
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center">
            <SignalSlashIcon className="h-5 w-5 mr-2" />
            <div className="flex-1">
              <p className="font-medium">Offline Mode</p>
              <p className="text-sm text-yellow-100">
                Showing cached vendor contacts only
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
