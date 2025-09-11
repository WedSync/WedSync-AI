'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IntelligentSharingGroup,
  SharingGroup,
  CoupleContact,
  ContactsIntegration,
  CoupleProfile,
  GroupPermissions,
  ContentPreferences,
  AccessLevel,
  RelationshipType,
  WeddingRole,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Crown,
  Heart,
  UserCheck,
  Shield,
  Eye,
  Download,
  Share2,
  MessageCircle,
  Settings,
  Sparkles,
  Brain,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Import,
  UserPlus,
  Filter,
  Search,
  Star,
} from 'lucide-react';

interface SharingGroupManagerProps {
  intelligentGroups: IntelligentSharingGroup[];
  customGroups: SharingGroup[];
  onGroupUpdate: (groups: SharingGroup[]) => void;
  contactsImport: ContactsIntegration;
  couple: CoupleProfile;
}

const SharingGroupManager: React.FC<SharingGroupManagerProps> = ({
  intelligentGroups,
  customGroups,
  onGroupUpdate,
  contactsImport,
  couple,
}) => {
  const [selectedTab, setSelectedTab] = useState('intelligent');
  const [editingGroup, setEditingGroup] = useState<SharingGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showImportContacts, setShowImportContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<WeddingRole | 'all'>('all');
  const [filterRelationship, setFilterRelationship] = useState<
    RelationshipType | 'all'
  >('all');

  // New group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<CoupleContact[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<GroupPermissions>({
    download: false,
    share: false,
    comment: true,
    fullAccess: false,
    albumCreation: false,
    tagOthers: false,
    inviteOthers: false,
  });
  const [contentPreferences, setContentPreferences] =
    useState<ContentPreferences>({
      includePrivateMemories: false,
      includeBehindScenes: true,
      includeVendorContent: false,
      includeCeremonyHighlights: true,
      includeReceptionFun: true,
      includeGroupPhotos: true,
      qualityThreshold: 0.7,
      contentTypes: ['photo', 'video'],
    });

  // All groups combined for display
  const allGroups = useMemo(() => {
    return [...intelligentGroups, ...customGroups];
  }, [intelligentGroups, customGroups]);

  // Filtered contacts for group creation
  const filteredContacts = useMemo(() => {
    let contacts = [...couple.contacts];

    // Apply search filter
    if (searchQuery) {
      contacts = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      contacts = contacts.filter(
        (contact) => contact.weddingRole === filterRole,
      );
    }

    // Apply relationship filter
    if (filterRelationship !== 'all') {
      contacts = contacts.filter(
        (contact) => contact.relationship === filterRelationship,
      );
    }

    return contacts;
  }, [couple.contacts, searchQuery, filterRole, filterRelationship]);

  // Handle creating a new group
  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim() || selectedContacts.length === 0) return;

    const newGroup: SharingGroup = {
      id: `custom_${Date.now()}`,
      name: newGroupName,
      contacts: selectedContacts,
      permissions: groupPermissions,
      contentPreferences,
      accessLevel: determineAccessLevel(groupPermissions),
      invitationStatus: {
        pending: selectedContacts.length,
        accepted: 0,
        declined: 0,
      },
      activityMetrics: {
        totalShares: 0,
        totalViews: 0,
        totalDownloads: 0,
        totalComments: 0,
        lastActivity: new Date(),
      },
      description: newGroupDescription,
    };

    const updatedGroups = [...customGroups, newGroup];
    onGroupUpdate(updatedGroups);

    // Reset form
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedContacts([]);
    setShowCreateGroup(false);
  }, [
    newGroupName,
    newGroupDescription,
    selectedContacts,
    groupPermissions,
    contentPreferences,
    customGroups,
    onGroupUpdate,
  ]);

  // Handle editing a group
  const handleEditGroup = useCallback((group: SharingGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
    setSelectedContacts(group.contacts);
    setGroupPermissions(group.permissions);
    setContentPreferences(group.contentPreferences);
    setShowCreateGroup(true);
  }, []);

  // Handle updating an existing group
  const handleUpdateGroup = useCallback(() => {
    if (!editingGroup || !newGroupName.trim()) return;

    const updatedGroup: SharingGroup = {
      ...editingGroup,
      name: newGroupName,
      description: newGroupDescription,
      contacts: selectedContacts,
      permissions: groupPermissions,
      contentPreferences,
      accessLevel: determineAccessLevel(groupPermissions),
    };

    const updatedGroups = customGroups.map((g) =>
      g.id === editingGroup.id ? updatedGroup : g,
    );

    onGroupUpdate(updatedGroups);
    setEditingGroup(null);
    setShowCreateGroup(false);
  }, [
    editingGroup,
    newGroupName,
    newGroupDescription,
    selectedContacts,
    groupPermissions,
    contentPreferences,
    customGroups,
    onGroupUpdate,
  ]);

  // Handle deleting a group
  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      const updatedGroups = customGroups.filter((g) => g.id !== groupId);
      onGroupUpdate(updatedGroups);
    },
    [customGroups, onGroupUpdate],
  );

  // Handle contact selection
  const handleContactSelection = useCallback(
    (contact: CoupleContact, selected: boolean) => {
      setSelectedContacts((prev) =>
        selected ? [...prev, contact] : prev.filter((c) => c.id !== contact.id),
      );
    },
    [],
  );

  // Get group type icon
  const getGroupIcon = (group: SharingGroup | IntelligentSharingGroup) => {
    if ('intelligenceScore' in group) {
      // Intelligent group
      if (group.id === 'immediate_family') return Crown;
      if (group.id === 'wedding_party') return Heart;
      if (group.id === 'extended_circle') return Users;
      return Sparkles;
    }
    return Users; // Custom group
  };

  // Get access level color
  const getAccessLevelColor = (level: AccessLevel) => {
    switch (level) {
      case 'view_only':
        return 'bg-gray-100 text-gray-700';
      case 'download':
        return 'bg-blue-100 text-blue-700';
      case 'share':
        return 'bg-green-100 text-green-700';
      case 'full_access':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="sharing-group-manager space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sharing Groups</h2>
          <p className="text-gray-600">
            Organize your contacts into smart sharing groups
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowImportContacts(true)}
            className="border-blue-200 hover:bg-blue-50"
          >
            <Import className="w-4 h-4 mr-2" />
            Import Contacts
          </Button>

          <Button
            onClick={() => setShowCreateGroup(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Group Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intelligent" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Groups ({intelligentGroups.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Custom Groups ({customGroups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligent" className="space-y-4">
          <div className="grid gap-4">
            {intelligentGroups.map((group) => (
              <IntelligentGroupCard
                key={group.id}
                group={group}
                onEdit={() => {
                  // Convert intelligent group to custom group for editing
                  const customGroup: SharingGroup = {
                    id: `custom_from_${group.id}_${Date.now()}`,
                    name: `${group.name} (Custom)`,
                    contacts: group.contacts,
                    permissions: group.permissions,
                    contentPreferences: group.contentPreferences,
                    accessLevel: group.accessLevel,
                    invitationStatus: group.invitationStatus,
                    activityMetrics: group.activityMetrics,
                    description: `Custom version of ${group.name}`,
                  };
                  handleEditGroup(customGroup);
                }}
              />
            ))}
          </div>

          {intelligentGroups.length === 0 && (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No AI Groups Yet
              </h3>
              <p className="text-gray-500">
                Import your contacts to create intelligent groups
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="grid gap-4">
            {customGroups.map((group) => (
              <CustomGroupCard
                key={group.id}
                group={group}
                onEdit={() => handleEditGroup(group)}
                onDelete={() => handleDeleteGroup(group.id)}
              />
            ))}
          </div>

          {customGroups.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No Custom Groups
              </h3>
              <p className="text-gray-500">
                Create your first custom sharing group
              </p>
              <Button
                onClick={() => setShowCreateGroup(true)}
                className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateGroup(false);
              setEditingGroup(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </h2>
                <p className="text-gray-600 mt-1">
                  Set up sharing permissions and select members
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Group Details */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="group-name">Group Name</Label>
                        <Input
                          id="group-name"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="Enter group name..."
                          className="border-blue-200 focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <Label htmlFor="group-description">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="group-description"
                          value={newGroupDescription}
                          onChange={(e) =>
                            setNewGroupDescription(e.target.value)
                          }
                          placeholder="Describe this group..."
                          rows={3}
                          className="border-blue-200 focus:border-blue-400"
                        />
                      </div>

                      {/* Permissions */}
                      <div className="space-y-3">
                        <Label>Group Permissions</Label>

                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(groupPermissions).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={key}
                                  checked={value}
                                  onCheckedChange={(checked) =>
                                    setGroupPermissions((prev) => ({
                                      ...prev,
                                      [key]: checked,
                                    }))
                                  }
                                />
                                <label
                                  htmlFor={key}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                >
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </label>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Content Preferences */}
                      <div className="space-y-3">
                        <Label>Content Preferences</Label>

                        <div className="space-y-2">
                          {Object.entries(contentPreferences)
                            .filter(
                              ([key]) =>
                                typeof contentPreferences[
                                  key as keyof ContentPreferences
                                ] === 'boolean',
                            )
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`content-${key}`}
                                  checked={value as boolean}
                                  onCheckedChange={(checked) =>
                                    setContentPreferences((prev) => ({
                                      ...prev,
                                      [key]: checked,
                                    }))
                                  }
                                />
                                <label
                                  htmlFor={`content-${key}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                >
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Contact Selection */}
                    <div className="space-y-4">
                      <div>
                        <Label>Select Members</Label>

                        {/* Filters */}
                        <div className="flex gap-2 mt-2 mb-4">
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              placeholder="Search contacts..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 text-sm"
                            />
                          </div>

                          <Select
                            value={filterRelationship}
                            onValueChange={(value: any) =>
                              setFilterRelationship(value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Relations</SelectItem>
                              <SelectItem value="immediate_family">
                                Family
                              </SelectItem>
                              <SelectItem value="wedding_party">
                                Wedding Party
                              </SelectItem>
                              <SelectItem value="friend">Friends</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Selected Count */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-600">
                            {selectedContacts.length} selected
                          </span>
                          {selectedContacts.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedContacts([])}
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Contact List */}
                      <ScrollArea className="h-64 border border-gray-200 rounded-lg">
                        <div className="p-4 space-y-2">
                          {filteredContacts.map((contact) => {
                            const isSelected = selectedContacts.some(
                              (c) => c.id === contact.id,
                            );
                            return (
                              <div
                                key={contact.id}
                                onClick={() =>
                                  handleContactSelection(contact, !isSelected)
                                }
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-100 border-blue-300'
                                    : 'hover:bg-gray-50 border-gray-200'
                                } border`}
                              >
                                <Checkbox checked={isSelected} readOnly />

                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {contact.name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {contact.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {contact.email}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {contact.relationship && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {contact.relationship.replace('_', ' ')}
                                    </Badge>
                                  )}
                                  {contact.weddingRole && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {contact.weddingRole.replace('_', ' ')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {filteredContacts.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No contacts found</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setEditingGroup(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                  disabled={
                    !newGroupName.trim() || selectedContacts.length === 0
                  }
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Intelligent Group Card Component
interface IntelligentGroupCardProps {
  group: IntelligentSharingGroup;
  onEdit: () => void;
}

const IntelligentGroupCard: React.FC<IntelligentGroupCardProps> = ({
  group,
  onEdit,
}) => {
  const GroupIcon =
    group.id === 'immediate_family'
      ? Crown
      : group.id === 'wedding_party'
        ? Heart
        : Users;

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <GroupIcon className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {group.contacts.length} members • {group.accessLevel} access
            </p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {group.activityMetrics.totalViews} views
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {group.activityMetrics.totalDownloads} downloads
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {group.activityMetrics.totalComments} comments
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-gray-500">Intelligence Score</div>
            <div className="font-bold text-blue-600">
              {Math.round(group.intelligenceScore * 100)}%
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="border-blue-200 hover:bg-blue-50"
          >
            <Edit className="w-3 h-3 mr-1" />
            Customize
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Custom Group Card Component
interface CustomGroupCardProps {
  group: SharingGroup;
  onEdit: () => void;
  onDelete: () => void;
}

const CustomGroupCard: React.FC<CustomGroupCardProps> = ({
  group,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-full">
            <Users className="w-4 h-4 text-gray-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-gray-600 mb-2">{group.description}</p>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Badge className={getAccessLevelColor(group.accessLevel)}>
                {group.accessLevel.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-500">
                {group.contacts.length} members
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {group.activityMetrics.totalViews} views
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {group.activityMetrics.totalDownloads} downloads
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {group.activityMetrics.totalComments} comments
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Helper functions
const determineAccessLevel = (permissions: GroupPermissions): AccessLevel => {
  if (permissions.fullAccess) return 'full_access';
  if (permissions.share) return 'share';
  if (permissions.download) return 'download';
  return 'view_only';
};

const getAccessLevelColor = (level: AccessLevel) => {
  switch (level) {
    case 'view_only':
      return 'bg-gray-100 text-gray-700';
    case 'download':
      return 'bg-blue-100 text-blue-700';
    case 'share':
      return 'bg-green-100 text-green-700';
    case 'full_access':
      return 'bg-purple-100 text-purple-700';
    case 'admin':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default SharingGroupManager;
