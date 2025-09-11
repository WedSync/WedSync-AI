'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  DocumentIcon,
  PhotoIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CreditCardIcon,
  BanknotesIcon,
  IdentificationIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  ClockIcon,
  LockClosedIcon,
  SignalSlashIcon,
  WifiIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface CriticalDocument {
  id: string;
  name: string;
  type:
    | 'contract'
    | 'timeline'
    | 'contact_list'
    | 'payment'
    | 'legal'
    | 'insurance'
    | 'photo'
    | 'checklist'
    | 'other';
  category: 'wedding' | 'vendor' | 'legal' | 'financial' | 'personal';
  size: number;
  format: 'pdf' | 'image' | 'text' | 'spreadsheet';
  priority: 'critical' | 'high' | 'medium' | 'low';
  lastModified: Date;
  lastAccessed: Date;
  isEncrypted: boolean;
  requiresPassword: boolean;
  offlineAvailable: boolean;
  expiryDate?: Date;
  weddingDate?: string;
  vendor?: string;
  description: string;
  tags: string[];
  preview?: {
    thumbnail: string;
    text: string;
  };
  fileSize: string;
  downloadUrl?: string;
  shareUrl?: string;
  backupLocations: string[];
}

interface DocumentCategory {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const documentCategories: DocumentCategory[] = [
  {
    key: 'wedding',
    label: 'Wedding',
    icon: HeartIcon,
    color: 'text-pink-600 bg-pink-50',
    description: 'Wedding-specific documents and planning materials',
  },
  {
    key: 'vendor',
    label: 'Vendors',
    icon: UserGroupIcon,
    color: 'text-blue-600 bg-blue-50',
    description: 'Contracts and communications with vendors',
  },
  {
    key: 'legal',
    label: 'Legal',
    icon: IdentificationIcon,
    color: 'text-gray-600 bg-gray-50',
    description: 'Legal documents, licenses, and permits',
  },
  {
    key: 'financial',
    label: 'Financial',
    icon: BanknotesIcon,
    color: 'text-green-600 bg-green-50',
    description: 'Payment records, invoices, and financial documents',
  },
  {
    key: 'personal',
    label: 'Personal',
    icon: DocumentTextIcon,
    color: 'text-purple-600 bg-purple-50',
    description: 'Personal documents and important information',
  },
];

export default function CriticalDocumentAccess() {
  const [documents, setDocuments] = useState<CriticalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<
    CriticalDocument[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedDocument, setSelectedDocument] =
    useState<CriticalDocument | null>(null);
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'priority'>(
    'priority',
  );

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Load critical documents
    loadCriticalDocuments();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Filter and sort documents
    let filtered = documents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter((doc) => doc.priority === selectedPriority);
    }

    if (showOfflineOnly) {
      filtered = filtered.filter((doc) => doc.offlineAvailable);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(term) ||
          doc.description.toLowerCase().includes(term) ||
          doc.vendor?.toLowerCase().includes(term) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
    }

    // Sort documents
    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'date') {
        return b.lastModified.getTime() - a.lastModified.getTime();
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    setFilteredDocuments(filtered);
  }, [
    documents,
    selectedCategory,
    selectedPriority,
    searchTerm,
    showOfflineOnly,
    sortBy,
  ]);

  const loadCriticalDocuments = async () => {
    try {
      // Mock critical documents
      const mockDocuments: CriticalDocument[] = [
        {
          id: '1',
          name: 'Wedding Day Timeline & Schedule',
          type: 'timeline',
          category: 'wedding',
          size: 524288,
          format: 'pdf',
          priority: 'critical',
          lastModified: new Date(Date.now() - 3600000),
          lastAccessed: new Date(Date.now() - 1800000),
          isEncrypted: false,
          requiresPassword: false,
          offlineAvailable: true,
          weddingDate: '2024-09-15',
          description:
            'Complete wedding day timeline with vendor arrival times, ceremony schedule, and reception flow',
          tags: ['timeline', 'schedule', 'vendors', 'ceremony'],
          preview: {
            thumbnail: '/docs/timeline-preview.jpg',
            text: '08:00 - Vendor Arrivals\n14:00 - First Look\n16:00 - Ceremony\n18:00 - Reception...',
          },
          fileSize: '512 KB',
          backupLocations: ['Cloud', 'Local Device', 'Coordinator Phone'],
        },
        {
          id: '2',
          name: 'Emergency Contact List',
          type: 'contact_list',
          category: 'wedding',
          size: 32768,
          format: 'pdf',
          priority: 'critical',
          lastModified: new Date(Date.now() - 1800000),
          lastAccessed: new Date(Date.now() - 900000),
          isEncrypted: false,
          requiresPassword: false,
          offlineAvailable: true,
          weddingDate: '2024-09-15',
          description:
            'Complete list of all vendor contacts, family contacts, and emergency numbers',
          tags: ['contacts', 'emergency', 'vendors', 'family'],
          preview: {
            thumbnail: '/docs/contacts-preview.jpg',
            text: 'Wedding Coordinator: Jennifer Smith +1 (555) 333-3333\nPhotographer: David Wilson +1 (555) 444-4444...',
          },
          fileSize: '32 KB',
          backupLocations: ['Cloud', 'Local Device', 'Printed Copy'],
        },
        {
          id: '3',
          name: 'Photography Contract - Perfect Moments',
          type: 'contract',
          category: 'vendor',
          size: 2097152,
          format: 'pdf',
          priority: 'high',
          lastModified: new Date(Date.now() - 86400000),
          lastAccessed: new Date(Date.now() - 172800000),
          isEncrypted: true,
          requiresPassword: true,
          offlineAvailable: true,
          vendor: 'Perfect Moments Photography',
          description:
            'Signed photography contract with David Wilson, including payment terms and deliverables',
          tags: ['contract', 'photography', 'signed', 'payment'],
          preview: {
            thumbnail: '/docs/contract-preview.jpg',
            text: 'PHOTOGRAPHY SERVICES AGREEMENT\nDate: 2024-09-15\nPhotographer: David Wilson...',
          },
          fileSize: '2.1 MB',
          backupLocations: ['Cloud', 'Local Device', 'Email'],
        },
        {
          id: '4',
          name: 'Wedding Insurance Policy',
          type: 'insurance',
          category: 'legal',
          size: 1048576,
          format: 'pdf',
          priority: 'high',
          lastModified: new Date(Date.now() - 604800000),
          lastAccessed: new Date(Date.now() - 259200000),
          isEncrypted: false,
          requiresPassword: false,
          offlineAvailable: true,
          expiryDate: new Date(Date.now() + 86400000),
          description:
            'Comprehensive wedding insurance policy covering venue, vendors, and weather',
          tags: ['insurance', 'legal', 'protection', 'weather'],
          fileSize: '1 MB',
          backupLocations: ['Cloud', 'Insurance Company', 'Local Device'],
        },
        {
          id: '5',
          name: 'Final Payment Receipts',
          type: 'payment',
          category: 'financial',
          size: 786432,
          format: 'pdf',
          priority: 'high',
          lastModified: new Date(Date.now() - 259200000),
          lastAccessed: new Date(Date.now() - 86400000),
          isEncrypted: true,
          requiresPassword: true,
          offlineAvailable: false,
          description:
            'All final payment receipts and invoices for wedding vendors',
          tags: ['payments', 'receipts', 'invoices', 'financial'],
          fileSize: '768 KB',
          backupLocations: ['Cloud', 'Bank Records'],
        },
        {
          id: '6',
          name: 'Venue Layout & Floor Plan',
          type: 'photo',
          category: 'wedding',
          size: 3145728,
          format: 'image',
          priority: 'medium',
          lastModified: new Date(Date.now() - 432000000),
          lastAccessed: new Date(Date.now() - 86400000),
          isEncrypted: false,
          requiresPassword: false,
          offlineAvailable: true,
          vendor: 'Grand Ballroom',
          description:
            'Detailed floor plan showing table arrangements, dance floor, and vendor setup areas',
          tags: ['venue', 'layout', 'floorplan', 'seating'],
          preview: {
            thumbnail: '/docs/floorplan-preview.jpg',
            text: 'Grand Ballroom Layout - Table arrangements for 150 guests',
          },
          fileSize: '3.1 MB',
          backupLocations: ['Cloud', 'Local Device', 'Venue Office'],
        },
        {
          id: '7',
          name: 'Wedding Day Checklist',
          type: 'checklist',
          category: 'wedding',
          size: 65536,
          format: 'pdf',
          priority: 'medium',
          lastModified: new Date(Date.now() - 172800000),
          lastAccessed: new Date(Date.now() - 3600000),
          isEncrypted: false,
          requiresPassword: false,
          offlineAvailable: true,
          weddingDate: '2024-09-15',
          description:
            'Comprehensive checklist for wedding day preparations and tasks',
          tags: ['checklist', 'preparation', 'tasks', 'reminders'],
          preview: {
            thumbnail: '/docs/checklist-preview.jpg',
            text: '☐ Confirm vendor arrivals\n☐ Check weather forecast\n☐ Prepare emergency kit...',
          },
          fileSize: '64 KB',
          backupLocations: ['Cloud', 'Local Device', 'Printed Copy'],
        },
        {
          id: '8',
          name: 'Marriage License',
          type: 'legal',
          category: 'legal',
          size: 262144,
          format: 'pdf',
          priority: 'critical',
          lastModified: new Date(Date.now() - 1209600000),
          lastAccessed: new Date(Date.now() - 604800000),
          isEncrypted: true,
          requiresPassword: true,
          offlineAvailable: true,
          expiryDate: new Date(Date.now() + 2592000000),
          description:
            'Official marriage license - MUST be signed during ceremony',
          tags: ['legal', 'license', 'marriage', 'official'],
          fileSize: '256 KB',
          backupLocations: ['Cloud', 'Local Device', 'County Office'],
        },
      ];

      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Failed to load critical documents:', error);
    }
  };

  const viewDocument = (document: CriticalDocument) => {
    if (!document.offlineAvailable && !isOnline) {
      alert('Document not available offline. Please connect to internet.');
      return;
    }

    if (document.requiresPassword) {
      const password = prompt(`Enter password for ${document.name}:`);
      if (!password) return;
      // In real app, validate password
    }

    // Update last accessed time
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === document.id ? { ...doc, lastAccessed: new Date() } : doc,
      ),
    );

    // In real app, open document viewer
    alert(`Opening ${document.name}...`);
  };

  const downloadDocument = (document: CriticalDocument) => {
    if (!document.offlineAvailable && !isOnline) {
      alert('Document not available for download offline.');
      return;
    }

    // In real app, initiate download
    alert(`Downloading ${document.name}...`);
  };

  const shareDocument = (document: CriticalDocument) => {
    if (!isOnline) {
      alert('Sharing requires internet connection.');
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: document.name,
        text: document.description,
        url: document.shareUrl || '#',
      });
    } else {
      // Fallback for non-supporting browsers
      navigator.clipboard.writeText(
        document.shareUrl || 'Document link not available',
      );
      alert('Document link copied to clipboard!');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return DocumentTextIcon;
      case 'timeline':
        return ClockIcon;
      case 'contact_list':
        return UserGroupIcon;
      case 'payment':
        return CreditCardIcon;
      case 'legal':
        return IdentificationIcon;
      case 'insurance':
        return IdentificationIcon;
      case 'photo':
        return PhotoIcon;
      case 'checklist':
        return ClipboardDocumentListIcon;
      default:
        return DocumentIcon;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'bg-red-100 text-red-700';
      case 'image':
        return 'bg-blue-100 text-blue-700';
      case 'text':
        return 'bg-gray-100 text-gray-700';
      case 'spreadsheet':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const isExpiringSoon = (date?: Date) => {
    if (!date) return false;
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Critical Documents
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
              placeholder="Search documents, tags, or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base"
              style={{ minHeight: '48px' }}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-900">
                {documents.filter((d) => d.priority === 'critical').length}
              </p>
              <p className="text-xs text-red-700">Critical</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-900">
                {documents.filter((d) => d.offlineAvailable).length}
              </p>
              <p className="text-xs text-green-700">Offline</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-900">
                {documents.filter((d) => d.isEncrypted).length}
              </p>
              <p className="text-xs text-blue-700">Encrypted</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-yellow-900">
                {documents.filter((d) => isExpiringSoon(d.expiryDate)).length}
              </p>
              <p className="text-xs text-yellow-700">Expiring</p>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap touch-manipulation ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                style={{ minHeight: '40px' }}
              >
                All Categories
              </button>
              {documentCategories.map((category) => {
                const Icon = category.icon;
                const count = documents.filter(
                  (d) => d.category === category.key,
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
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                <option value="priority">Sort by Priority</option>
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showOfflineOnly}
                onChange={(e) => setShowOfflineOnly(e.target.checked)}
                className="w-5 h-5 touch-manipulation"
              />
              <span className="text-sm font-medium">
                Show offline documents only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="p-4">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Documents Found
            </h3>
            <p className="text-gray-500">
              {searchTerm ||
              selectedCategory !== 'all' ||
              selectedPriority !== 'all' ||
              showOfflineOnly
                ? 'Try adjusting your filters'
                : 'No critical documents available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((document) => {
              const TypeIcon = getTypeIcon(document.type);
              return (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg border shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <TypeIcon className="h-6 w-6 text-gray-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {document.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(document.priority)}`}
                            >
                              {document.priority}
                            </span>
                            {document.isEncrypted && (
                              <LockClosedIcon className="h-4 w-4 text-gray-500" />
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {document.description}
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                            <span
                              className={`px-2 py-1 rounded-full ${getFormatColor(document.format)}`}
                            >
                              {document.format.toUpperCase()}
                            </span>
                            <span>{document.fileSize}</span>
                            <span>
                              Modified {formatTimeAgo(document.lastModified)}
                            </span>
                            {document.vendor && (
                              <span>📋 {document.vendor}</span>
                            )}
                          </div>

                          {document.expiryDate && (
                            <div
                              className={`text-xs px-2 py-1 rounded-full inline-flex items-center space-x-1 ${
                                isExpiringSoon(document.expiryDate)
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              <ClockIcon className="h-3 w-3" />
                              <span>
                                Expires:{' '}
                                {document.expiryDate.toLocaleDateString()}
                                {isExpiringSoon(document.expiryDate) &&
                                  ' - SOON!'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-500 ml-4">
                        <div
                          className={`w-3 h-3 rounded-full mb-1 ${
                            document.offlineAvailable
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <p>
                          {document.offlineAvailable
                            ? 'Offline'
                            : 'Online Only'}
                        </p>
                        {!isOnline && !document.offlineAvailable && (
                          <p className="text-red-600 font-medium">
                            Unavailable
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {document.tags.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {document.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {document.preview && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {document.preview.text}
                        </p>
                      </div>
                    )}

                    {/* Backup Locations */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Backup locations:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {document.backupLocations.map((location, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center space-x-1"
                          >
                            <CheckCircleIcon className="h-3 w-3" />
                            <span>{location}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => viewDocument(document)}
                        disabled={!document.offlineAvailable && !isOnline}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ minHeight: '40px' }}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>

                      <button
                        onClick={() => downloadDocument(document)}
                        disabled={!document.offlineAvailable && !isOnline}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ minHeight: '40px' }}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>

                      <button
                        onClick={() => shareDocument(document)}
                        disabled={!isOnline}
                        className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ minHeight: '40px' }}
                      >
                        <ShareIcon className="h-4 w-4 mr-1" />
                        Share
                      </button>
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
        <div className="fixed bottom-4 left-4 right-4 bg-orange-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center">
            <SignalSlashIcon className="h-5 w-5 mr-2" />
            <div className="flex-1">
              <p className="font-medium">Offline Mode</p>
              <p className="text-sm text-orange-100">
                Only {documents.filter((d) => d.offlineAvailable).length} of{' '}
                {documents.length} documents available offline
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
