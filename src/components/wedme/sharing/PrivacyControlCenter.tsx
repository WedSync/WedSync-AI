'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Users,
  User,
  Globe,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Clock,
  MapPin,
  Calendar,
  Smartphone,
  Monitor,
  Search,
  Filter,
} from 'lucide-react';
import {
  CoupleProfile,
  WeddingFile,
  SharingGroup,
  PrivacySettings,
  AccessPermission,
  PrivacyLevel,
  SharingRestriction,
  ContentVisibility,
  GeoRestriction,
  TimeRestriction,
} from '@/types/wedme/file-management';
import { cn } from '@/lib/utils';

interface PrivacyControlCenterProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  sharingGroups: SharingGroup[];
  privacySettings: PrivacySettings;
  onUpdatePrivacySettings: (settings: PrivacySettings) => void;
  onUpdateFilePermissions: (
    fileId: string,
    permissions: AccessPermission[],
  ) => void;
  className?: string;
}

export default function PrivacyControlCenter({
  couple,
  files,
  sharingGroups,
  privacySettings,
  onUpdatePrivacySettings,
  onUpdateFilePermissions,
  className,
}: PrivacyControlCenterProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'groups' | 'files' | 'restrictions' | 'audit'
  >('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general']),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrivacyLevel, setSelectedPrivacyLevel] =
    useState<PrivacyLevel>('friends');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const privacyStats = useMemo(() => {
    const publicFiles = files.filter((f) => f.privacyLevel === 'public').length;
    const privateFiles = files.filter(
      (f) => f.privacyLevel === 'private',
    ).length;
    const restrictedFiles = files.filter(
      (f) => f.restrictions && f.restrictions.length > 0,
    ).length;

    return {
      publicFiles,
      privateFiles,
      friendsFiles: files.filter((f) => f.privacyLevel === 'friends').length,
      familyFiles: files.filter((f) => f.privacyLevel === 'family').length,
      restrictedFiles,
      totalGroups: sharingGroups.length,
      activeRestrictions: countActiveRestrictions(privacySettings),
    };
  }, [files, sharingGroups, privacySettings]);

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200',
        className,
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Privacy Control Center
              </h3>
              <p className="text-sm text-gray-600">
                Manage who can see your wedding content
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                privacySettings.overallSecurityLevel === 'high'
                  ? 'bg-green-100 text-green-800'
                  : privacySettings.overallSecurityLevel === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800',
              )}
            >
              {privacySettings.overallSecurityLevel?.toUpperCase()} SECURITY
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-2 border-b border-gray-100">
        <div className="flex space-x-6">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Eye },
            { id: 'groups' as const, label: 'Group Access', icon: Users },
            { id: 'files' as const, label: 'File Permissions', icon: Lock },
            {
              id: 'restrictions' as const,
              label: 'Restrictions',
              icon: AlertTriangle,
            },
            { id: 'audit' as const, label: 'Access Log', icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Privacy Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PrivacyStatCard
                  title="Public Files"
                  value={privacyStats.publicFiles}
                  icon={Globe}
                  color="red"
                  description="Visible to everyone"
                />
                <PrivacyStatCard
                  title="Friends Only"
                  value={privacyStats.friendsFiles}
                  icon={Users}
                  color="blue"
                  description="Visible to friends"
                />
                <PrivacyStatCard
                  title="Family Only"
                  value={privacyStats.familyFiles}
                  icon={User}
                  color="green"
                  description="Family members only"
                />
                <PrivacyStatCard
                  title="Restricted"
                  value={privacyStats.restrictedFiles}
                  icon={Lock}
                  color="yellow"
                  description="Special restrictions"
                />
              </div>

              {/* Quick Settings */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">
                  Quick Privacy Settings
                </h4>
                <div className="space-y-4">
                  <QuickPrivacySetting
                    title="Default Privacy Level"
                    description="Default privacy level for new uploads"
                    value={privacySettings.defaultPrivacyLevel}
                    options={[
                      { value: 'public', label: 'Public', icon: Globe },
                      { value: 'friends', label: 'Friends', icon: Users },
                      { value: 'family', label: 'Family', icon: User },
                      { value: 'private', label: 'Private', icon: Lock },
                    ]}
                    onChange={(value) =>
                      onUpdatePrivacySettings({
                        ...privacySettings,
                        defaultPrivacyLevel: value as PrivacyLevel,
                      })
                    }
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        Auto-expire Links
                      </h5>
                      <p className="text-sm text-gray-600">
                        Automatically expire sharing links after 30 days
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdatePrivacySettings({
                          ...privacySettings,
                          autoExpireLinks: !privacySettings.autoExpireLinks,
                        })
                      }
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        privacySettings.autoExpireLinks
                          ? 'bg-blue-600'
                          : 'bg-gray-200',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          privacySettings.autoExpireLinks
                            ? 'translate-x-6'
                            : 'translate-x-1',
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Recommendations */}
              <SecurityRecommendations
                privacySettings={privacySettings}
                files={files}
                onUpdateSettings={onUpdatePrivacySettings}
              />
            </motion.div>
          )}

          {/* Group Access Tab */}
          {activeTab === 'groups' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <GroupAccessManager
                groups={sharingGroups}
                privacySettings={privacySettings}
                onUpdateSettings={onUpdatePrivacySettings}
              />
            </motion.div>
          )}

          {/* File Permissions Tab */}
          {activeTab === 'files' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <FilePermissionsManager
                files={files}
                sharingGroups={sharingGroups}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onUpdatePermissions={onUpdateFilePermissions}
              />
            </motion.div>
          )}

          {/* Restrictions Tab */}
          {activeTab === 'restrictions' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <RestrictionsManager
                privacySettings={privacySettings}
                onUpdateSettings={onUpdatePrivacySettings}
              />
            </motion.div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <AccessAuditLog couple={couple} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Privacy Stat Card Component
function PrivacyStatCard({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: number;
  icon: any;
  color: 'red' | 'blue' | 'green' | 'yellow';
  description: string;
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600 border-red-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  };

  return (
    <div className={cn('rounded-lg p-4 border', colorClasses[color])}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={20} />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-xs opacity-75">{description}</p>
    </div>
  );
}

// Quick Privacy Setting Component
function QuickPrivacySetting({
  title,
  description,
  value,
  options,
  onChange,
}: {
  title: string;
  description: string;
  value: string;
  options: Array<{ value: string; label: string; icon: any }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h5 className="font-medium text-gray-900">{title}</h5>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Security Recommendations Component
function SecurityRecommendations({
  privacySettings,
  files,
  onUpdateSettings,
}: {
  privacySettings: PrivacySettings;
  files: WeddingFile[];
  onUpdateSettings: (settings: PrivacySettings) => void;
}) {
  const recommendations = generateSecurityRecommendations(
    privacySettings,
    files,
  );

  if (recommendations.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center gap-3">
          <Check className="text-green-600" size={20} />
          <div>
            <h4 className="font-medium text-green-900">Excellent Security!</h4>
            <p className="text-sm text-green-700">
              Your privacy settings are well configured.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
        <div>
          <h4 className="font-medium text-yellow-900">
            Security Recommendations
          </h4>
          <p className="text-sm text-yellow-700">
            We found some areas to improve your privacy.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-white rounded-lg p-3"
          >
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">{rec.title}</h5>
              <p className="text-sm text-gray-600">{rec.description}</p>
            </div>
            {rec.action && (
              <button
                onClick={rec.action}
                className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Fix
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Group Access Manager Component
function GroupAccessManager({
  groups,
  privacySettings,
  onUpdateSettings,
}: {
  groups: SharingGroup[];
  privacySettings: PrivacySettings;
  onUpdateSettings: (settings: PrivacySettings) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Sharing Group Permissions</h4>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          Create New Group
        </button>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="text-blue-600" size={18} />
              </div>
              <div>
                <h5 className="font-medium text-gray-900">{group.name}</h5>
                <p className="text-sm text-gray-600">
                  {group.members.length} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                defaultValue="view"
                className="px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="view">View Only</option>
                <option value="comment">View & Comment</option>
                <option value="share">View, Comment & Share</option>
                <option value="none">No Access</option>
              </select>
              <Settings className="text-gray-400 cursor-pointer" size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// File Permissions Manager Component
function FilePermissionsManager({
  files,
  sharingGroups,
  searchQuery,
  onSearchChange,
  onUpdatePermissions,
}: {
  files: WeddingFile[];
  sharingGroups: SharingGroup[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpdatePermissions: (
    fileId: string,
    permissions: AccessPermission[],
  ) => void;
}) {
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter size={16} />
          Filter
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredFiles.map((file) => (
          <FilePermissionRow
            key={file.id}
            file={file}
            groups={sharingGroups}
            onUpdatePermissions={(permissions) =>
              onUpdatePermissions(file.id, permissions)
            }
          />
        ))}
      </div>
    </div>
  );
}

// File Permission Row Component
function FilePermissionRow({
  file,
  groups,
  onUpdatePermissions,
}: {
  file: WeddingFile;
  groups: SharingGroup[];
  onUpdatePermissions: (permissions: AccessPermission[]) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const getPrivacyIcon = (level: PrivacyLevel) => {
    switch (level) {
      case 'public':
        return Globe;
      case 'friends':
        return Users;
      case 'family':
        return User;
      case 'private':
        return Lock;
      default:
        return Eye;
    }
  };

  const PrivacyIcon = getPrivacyIcon(file.privacyLevel);

  return (
    <div className="border border-gray-200 rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-3">
          {showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
            <PrivacyIcon size={14} className="text-gray-600" />
          </div>
          <div>
            <h5 className="font-medium text-gray-900">{file.name}</h5>
            <p className="text-sm text-gray-600 capitalize">
              {file.privacyLevel} access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {file.restrictions?.length || 0} restrictions
          </span>
          <select
            value={file.privacyLevel}
            onChange={(e) => {
              // Update file privacy level logic
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="family">Family</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            <div>
              <h6 className="text-sm font-medium text-gray-900 mb-2">
                Group Access
              </h6>
              <div className="space-y-1">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{group.name}</span>
                    <select className="px-2 py-1 text-xs border border-gray-300 rounded">
                      <option>View Only</option>
                      <option>Download</option>
                      <option>No Access</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {file.restrictions && file.restrictions.length > 0 && (
              <div>
                <h6 className="text-sm font-medium text-gray-900 mb-2">
                  Active Restrictions
                </h6>
                <div className="space-y-1">
                  {file.restrictions.map((restriction, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 flex items-center gap-2"
                    >
                      <AlertTriangle size={12} />
                      {restriction.type}: {restriction.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Restrictions Manager Component
function RestrictionsManager({
  privacySettings,
  onUpdateSettings,
}: {
  privacySettings: PrivacySettings;
  onUpdateSettings: (settings: PrivacySettings) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-4">Sharing Restrictions</h4>
        <div className="space-y-4">
          <RestrictionToggle
            title="Geographic Restrictions"
            description="Limit access based on location"
            icon={MapPin}
            enabled={privacySettings.geoRestrictions?.enabled || false}
            onToggle={(enabled) =>
              onUpdateSettings({
                ...privacySettings,
                geoRestrictions: {
                  ...privacySettings.geoRestrictions,
                  enabled,
                },
              })
            }
          />

          <RestrictionToggle
            title="Time-based Access"
            description="Set time limits for content access"
            icon={Clock}
            enabled={privacySettings.timeRestrictions?.enabled || false}
            onToggle={(enabled) =>
              onUpdateSettings({
                ...privacySettings,
                timeRestrictions: {
                  ...privacySettings.timeRestrictions,
                  enabled,
                },
              })
            }
          />

          <RestrictionToggle
            title="Device Restrictions"
            description="Control access from specific device types"
            icon={Smartphone}
            enabled={privacySettings.deviceRestrictions?.enabled || false}
            onToggle={(enabled) =>
              onUpdateSettings({
                ...privacySettings,
                deviceRestrictions: {
                  ...privacySettings.deviceRestrictions,
                  enabled,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

// Restriction Toggle Component
function RestrictionToggle({
  title,
  description,
  icon: Icon,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="text-gray-600" size={20} />
        <div>
          <h5 className="font-medium text-gray-900">{title}</h5>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          enabled ? 'bg-blue-600' : 'bg-gray-200',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

// Access Audit Log Component
function AccessAuditLog({ couple }: { couple: CoupleProfile }) {
  // Mock audit log data
  const auditEntries = [
    {
      id: '1',
      action: 'File viewed',
      user: 'Sarah Johnson',
      resource: 'engagement-photos-1.jpg',
      timestamp: new Date().toISOString(),
      location: 'London, UK',
      device: 'Mobile',
    },
    {
      id: '2',
      action: 'File downloaded',
      user: 'Mom',
      resource: 'wedding-timeline.pdf',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      location: 'Manchester, UK',
      device: 'Desktop',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Recent Access Activity</h4>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          Export Log
        </button>
      </div>

      <div className="space-y-2">
        {auditEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{entry.user}</span>
                <span className="text-sm text-gray-600">{entry.action}</span>
                <span className="text-sm font-medium text-gray-900">
                  {entry.resource}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {entry.location}
                </span>
                <span className="flex items-center gap-1">
                  {entry.device === 'Mobile' ? (
                    <Smartphone size={12} />
                  ) : (
                    <Monitor size={12} />
                  )}
                  {entry.device}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper Functions
function countActiveRestrictions(settings: PrivacySettings): number {
  let count = 0;
  if (settings.geoRestrictions?.enabled) count++;
  if (settings.timeRestrictions?.enabled) count++;
  if (settings.deviceRestrictions?.enabled) count++;
  return count;
}

function generateSecurityRecommendations(
  settings: PrivacySettings,
  files: WeddingFile[],
): Array<{ title: string; description: string; action?: () => void }> {
  const recommendations = [];

  const publicFiles = files.filter((f) => f.privacyLevel === 'public').length;
  if (publicFiles > 10) {
    recommendations.push({
      title: 'Too many public files',
      description: `You have ${publicFiles} public files. Consider making some private.`,
      action: undefined,
    });
  }

  if (!settings.autoExpireLinks) {
    recommendations.push({
      title: 'Enable auto-expire links',
      description: 'Automatically expire sharing links for better security.',
      action: undefined,
    });
  }

  if (!settings.geoRestrictions?.enabled) {
    recommendations.push({
      title: 'Consider geographic restrictions',
      description: 'Limit access to your content based on location.',
      action: undefined,
    });
  }

  return recommendations;
}
