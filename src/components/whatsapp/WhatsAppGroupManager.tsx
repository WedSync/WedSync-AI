'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Send,
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'wedding_party' | 'family' | 'vendors' | 'custom';
  memberCount?: number;
  isActive: boolean;
  created_at?: string;
}

interface GroupMember {
  id: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  optInStatus: 'opted_in' | 'opted_out' | 'pending';
  isActive: boolean;
}

interface WhatsAppGroupManagerProps {
  onSendToGroup: (groupId: string, message: any) => Promise<void>;
  className?: string;
}

export function WhatsAppGroupManager({
  onSendToGroup,
  className = '',
}: WhatsAppGroupManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'custom' as Group['type'],
  });

  const [memberForm, setMemberForm] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      // This would call your API to get groups
      const response = await fetch('/api/whatsapp/groups');
      const data = await response.json();

      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Load groups error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/groups/${groupId}/members`);
      const data = await response.json();

      if (data.success) {
        setGroupMembers(data.members || []);
      }
    } catch (error) {
      console.error('Load group members error:', error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/whatsapp/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          createdBy: 'current_user_id', // Replace with actual user ID
        }),
      });

      if (response.ok) {
        setCreateForm({ name: '', description: '', type: 'custom' });
        setShowCreateForm(false);
        await loadGroups();
      }
    } catch (error) {
      console.error('Create group error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/whatsapp/groups/${selectedGroup.id}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members: [
              {
                phoneNumber: memberForm.phoneNumber,
                firstName: memberForm.firstName,
                lastName: memberForm.lastName,
                optInStatus: 'pending',
                isActive: true,
                addedBy: 'current_user_id', // Replace with actual user ID
              },
            ],
          }),
        },
      );

      if (response.ok) {
        setMemberForm({ phoneNumber: '', firstName: '', lastName: '' });
        setShowAddMember(false);
        await loadGroupMembers(selectedGroup.id);
      }
    } catch (error) {
      console.error('Add member error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (phoneNumber: string) => {
    if (!selectedGroup || !confirm('Remove this member from the group?'))
      return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/whatsapp/groups/${selectedGroup.id}/members/${phoneNumber}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        await loadGroupMembers(selectedGroup.id);
      }
    } catch (error) {
      console.error('Remove member error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: Group['type']) => {
    switch (type) {
      case 'wedding_party':
        return 'bg-primary-50 text-primary-700 border-primary-200';
      case 'family':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'vendors':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'custom':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getOptInColor = (status: GroupMember['optInStatus']) => {
    switch (status) {
      case 'opted_in':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'opted_out':
        return 'bg-error-50 text-error-700 border-error-200';
      case 'pending':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Group Messaging
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage WhatsApp messaging groups for efficient communication
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="
            flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700
            text-white font-medium text-sm rounded-lg shadow-xs hover:shadow-sm
            transition-all duration-200
            focus:outline-none focus:ring-4 focus:ring-primary-100
          "
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups List */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Groups</h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No groups found</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Create your first group
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`
                    p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200
                    ${selectedGroup?.id === group.id ? 'bg-primary-50 border-r-2 border-primary-600' : ''}
                  `}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {group.name}
                      </h4>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {group.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                          ${getTypeColor(group.type)}
                        `}
                        >
                          {group.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.memberCount || 0} members
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Details */}
        <div className="bg-white border border-gray-200 rounded-xl">
          {selectedGroup ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedGroup.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {groupMembers.length} members
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="
                        p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50
                        rounded-lg transition-all duration-200
                      "
                      title="Add Member"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        onSendToGroup(selectedGroup.id, {
                          type: 'text',
                          text: 'Test message',
                        })
                      }
                      className="
                        p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50
                        rounded-lg transition-all duration-200
                      "
                      title="Send Message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                {groupMembers.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.firstName || member.lastName
                            ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                            : 'Unknown Name'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {member.phoneNumber}
                        </p>
                        <span
                          className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1
                          ${getOptInColor(member.optInStatus)}
                        `}
                        >
                          {member.optInStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.phoneNumber)}
                        className="
                          p-2 text-error-500 hover:text-error-700 hover:bg-error-50
                          rounded-lg transition-all duration-200
                        "
                        title="Remove Member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {groupMembers.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-gray-600">No members in this group</p>
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm mt-2"
                    >
                      Add the first member
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a group to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Group
              </h3>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Wedding Party"
                    required
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 shadow-xs
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        type: e.target.value as Group['type'],
                      }))
                    }
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 shadow-xs
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  >
                    <option value="custom">Custom</option>
                    <option value="wedding_party">Wedding Party</option>
                    <option value="family">Family</option>
                    <option value="vendors">Vendors</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Group description..."
                    rows={3}
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 shadow-xs resize-none
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="
                      px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200
                      font-medium text-sm rounded-lg transition-all duration-200
                    "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700
                      text-white font-medium text-sm rounded-lg shadow-xs hover:shadow-sm
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Member to {selectedGroup.name}
              </h3>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={memberForm.phoneNumber}
                    onChange={(e) =>
                      setMemberForm((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="+1234567890"
                    required
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 shadow-xs
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={memberForm.firstName}
                      onChange={(e) =>
                        setMemberForm((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      placeholder="John"
                      className="
                        w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                        text-gray-900 placeholder-gray-500 shadow-xs
                        focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                        transition-all duration-200
                      "
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={memberForm.lastName}
                      onChange={(e) =>
                        setMemberForm((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      placeholder="Doe"
                      className="
                        w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                        text-gray-900 placeholder-gray-500 shadow-xs
                        focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                        transition-all duration-200
                      "
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="
                      px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200
                      font-medium text-sm rounded-lg transition-all duration-200
                    "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700
                      text-white font-medium text-sm rounded-lg shadow-xs hover:shadow-sm
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Member'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
