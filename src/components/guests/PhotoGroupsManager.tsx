'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CameraIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@/lib/utils/toast';

interface PhotoGroup {
  id: string;
  couple_id: string;
  name: string;
  description?: string;
  photo_type?: string;
  priority: number;
  estimated_time_minutes: number;
  location?: string;
  timeline_slot?: string;
  photographer_notes?: string;
  created_at: string;
  updated_at: string;
  assignments?: PhotoGroupAssignment[];
  guest_count?: number;
}

interface PhotoGroupAssignment {
  id: string;
  photo_group_id: string;
  guest_id: string;
  is_primary: boolean;
  position_notes?: string;
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
    side?: string;
    category?: string;
  };
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  side?: string;
  category?: string;
}

interface PhotoGroupsManagerProps {
  coupleId: string;
  onUpdate?: () => void;
}

const PHOTO_TYPES = [
  { value: 'family', label: 'Family Photos', icon: '👨‍👩‍👧‍👦' },
  { value: 'friends', label: 'Friends Photos', icon: '👫' },
  { value: 'bridal_party', label: 'Bridal Party', icon: '👰' },
  { value: 'groomsmen', label: 'Groomsmen', icon: '🤵' },
  { value: 'bridesmaids', label: 'Bridesmaids', icon: '💐' },
  { value: 'children', label: 'Children', icon: '👶' },
  { value: 'special', label: 'Special Moments', icon: '✨' },
  { value: 'formal', label: 'Formal Portraits', icon: '🎩' },
  { value: 'candid', label: 'Candid Shots', icon: '📸' },
];

function SortablePhotoGroup({
  group,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  group: PhotoGroup;
  onEdit: (group: PhotoGroup) => void;
  onDelete: (id: string) => void;
  onDuplicate: (group: PhotoGroup) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const photoType = PHOTO_TYPES.find((t) => t.value === group.photo_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-white ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-move mt-1">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{photoType?.icon || '📸'}</span>
              <h4 className="font-semibold text-lg">{group.name}</h4>
              <Badge variant="outline" className="ml-auto">
                Priority {group.priority}
              </Badge>
            </div>

            {group.description && (
              <p className="text-sm text-gray-600 mb-2">{group.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <UserGroupIcon className="h-4 w-4" />
                {group.guest_count || 0} guests
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {group.estimated_time_minutes} min
              </div>
              {group.location && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  {group.location}
                </div>
              )}
              {group.timeline_slot && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  {group.timeline_slot}
                </div>
              )}
            </div>

            {group.photographer_notes && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                <span className="font-medium">Photographer Notes:</span>{' '}
                {group.photographer_notes}
              </div>
            )}

            {/* Guest List Preview */}
            {group.assignments && group.assignments.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm font-medium mb-1">Assigned Guests:</div>
                <div className="flex flex-wrap gap-1">
                  {group.assignments.slice(0, 5).map((assignment) => (
                    <Badge
                      key={assignment.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {assignment.guest?.first_name}{' '}
                      {assignment.guest?.last_name}
                      {assignment.is_primary && ' (Primary)'}
                    </Badge>
                  ))}
                  {group.assignments.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{group.assignments.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(group)}
            title="Duplicate group"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(group)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(group.id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PhotoGroupsManager({
  coupleId,
  onUpdate,
}: PhotoGroupsManagerProps) {
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PhotoGroup | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo_type: '',
    estimated_time_minutes: 5,
    location: '',
    timeline_slot: '',
    photographer_notes: '',
  });
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('photo-groups-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_groups',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load photo groups with assignments
      const { data: groupsData } = await supabase
        .from('photo_groups')
        .select(
          `
          *,
          assignments:photo_group_assignments(
            id,
            guest_id,
            is_primary,
            position_notes,
            guest:guests(
              id,
              first_name,
              last_name,
              side,
              category
            )
          )
        `,
        )
        .eq('couple_id', coupleId)
        .order('priority');

      // Load all guests for selection
      const { data: guestsData } = await supabase
        .from('guests')
        .select('id, first_name, last_name, side, category')
        .eq('couple_id', coupleId)
        .order('last_name');

      setPhotoGroups(
        groupsData?.map((g) => ({
          ...g,
          guest_count: g.assignments?.length || 0,
        })) || [],
      );
      setGuests(guestsData || []);
    } catch (error) {
      console.error('Error loading photo groups:', error);
      toast.error('Failed to load photo groups');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = photoGroups.findIndex((g) => g.id === active.id);
      const newIndex = photoGroups.findIndex((g) => g.id === over.id);

      const newGroups = arrayMove(photoGroups, oldIndex, newIndex);
      setPhotoGroups(newGroups);

      // Update priorities in database
      try {
        const updates = newGroups.map((group, index) => ({
          id: group.id,
          priority: index + 1,
        }));

        for (const update of updates) {
          await supabase
            .from('photo_groups')
            .update({ priority: update.priority })
            .eq('id', update.id);
        }

        toast.success('Photo group order updated');
      } catch (error) {
        console.error('Error updating priorities:', error);
        toast.error('Failed to update photo group order');
        loadData(); // Reload to restore original order
      }
    }
  };

  const handleCreateOrUpdate = async () => {
    setSaving(true);
    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('photo_groups')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGroup.id);

        if (error) throw error;

        // Update guest assignments
        await supabase
          .from('photo_group_assignments')
          .delete()
          .eq('photo_group_id', editingGroup.id);

        if (selectedGuests.length > 0) {
          const assignments = selectedGuests.map((guestId) => ({
            photo_group_id: editingGroup.id,
            guest_id: guestId,
            is_primary: false,
          }));

          await supabase.from('photo_group_assignments').insert(assignments);
        }

        toast.success('Photo group updated successfully');
      } else {
        // Create new group
        const priority = photoGroups.length + 1;
        const { data: newGroup, error } = await supabase
          .from('photo_groups')
          .insert({
            couple_id: coupleId,
            ...formData,
            priority,
          })
          .select()
          .single();

        if (error) throw error;

        // Add guest assignments
        if (selectedGuests.length > 0 && newGroup) {
          const assignments = selectedGuests.map((guestId) => ({
            photo_group_id: newGroup.id,
            guest_id: guestId,
            is_primary: false,
          }));

          await supabase.from('photo_group_assignments').insert(assignments);
        }

        toast.success('Photo group created successfully');
      }

      resetForm();
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Error saving photo group:', error);
      toast.error('Failed to save photo group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo group?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('photo_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Photo group deleted');
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting photo group:', error);
      toast.error('Failed to delete photo group');
    }
  };

  const handleDuplicate = async (group: PhotoGroup) => {
    try {
      const { data: newGroup, error } = await supabase
        .from('photo_groups')
        .insert({
          couple_id: coupleId,
          name: `${group.name} (Copy)`,
          description: group.description,
          photo_type: group.photo_type,
          priority: photoGroups.length + 1,
          estimated_time_minutes: group.estimated_time_minutes,
          location: group.location,
          timeline_slot: group.timeline_slot,
          photographer_notes: group.photographer_notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicate assignments
      if (group.assignments && group.assignments.length > 0 && newGroup) {
        const assignments = group.assignments.map((a) => ({
          photo_group_id: newGroup.id,
          guest_id: a.guest_id,
          is_primary: a.is_primary,
          position_notes: a.position_notes,
        }));

        await supabase.from('photo_group_assignments').insert(assignments);
      }

      toast.success('Photo group duplicated');
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Error duplicating photo group:', error);
      toast.error('Failed to duplicate photo group');
    }
  };

  const handleEdit = (group: PhotoGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      photo_type: group.photo_type || '',
      estimated_time_minutes: group.estimated_time_minutes,
      location: group.location || '',
      timeline_slot: group.timeline_slot || '',
      photographer_notes: group.photographer_notes || '',
    });
    setSelectedGuests(group.assignments?.map((a) => a.guest_id) || []);
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingGroup(null);
    setSelectedGuests([]);
    setFormData({
      name: '',
      description: '',
      photo_type: '',
      estimated_time_minutes: 5,
      location: '',
      timeline_slot: '',
      photographer_notes: '',
    });
  };

  const generatePhotographerList = () => {
    const list = photoGroups
      .map((group) => {
        const guestList =
          group.assignments
            ?.map(
              (a) =>
                `${a.guest?.first_name} ${a.guest?.last_name}${a.is_primary ? ' (Primary)' : ''}`,
            )
            .join(', ') || 'No guests assigned';

        return `
${group.priority}. ${group.name}
Time: ${group.estimated_time_minutes} minutes
Location: ${group.location || 'TBD'}
Timeline: ${group.timeline_slot || 'TBD'}
Guests: ${guestList}
Notes: ${group.photographer_notes || 'None'}
---`;
      })
      .join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(list);
    toast.success('Photographer list copied to clipboard');
  };

  const calculateTotalTime = () => {
    return photoGroups.reduce(
      (total, group) => total + group.estimated_time_minutes,
      0,
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg"></div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Photo Groups Manager</h2>
          <p className="text-gray-500">
            Organize family photos and group shots for your photographer
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generatePhotographerList}
            className="flex items-center gap-2"
          >
            <PrinterIcon className="h-4 w-4" />
            Export for Photographer
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Photo Group
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Groups</div>
          <div className="text-2xl font-bold">{photoGroups.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Time</div>
          <div className="text-2xl font-bold">{calculateTotalTime()} min</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Guests Assigned</div>
          <div className="text-2xl font-bold">
            {photoGroups.reduce((total, g) => total + (g.guest_count || 0), 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Avg Time/Group</div>
          <div className="text-2xl font-bold">
            {photoGroups.length > 0
              ? Math.round(calculateTotalTime() / photoGroups.length)
              : 0}{' '}
            min
          </div>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingGroup ? 'Edit Photo Group' : 'Create New Photo Group'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Group Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Bride's Family, College Friends"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Photo Type
              </label>
              <select
                value={formData.photo_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    photo_type: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Select type...</option>
                {PHOTO_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Estimated Time (minutes)
              </label>
              <Input
                type="number"
                min="1"
                max="60"
                value={formData.estimated_time_minutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estimated_time_minutes: parseInt(e.target.value) || 5,
                  }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g., Garden, Church steps"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Timeline Slot
              </label>
              <Input
                value={formData.timeline_slot}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timeline_slot: e.target.value,
                  }))
                }
                placeholder="e.g., After ceremony, Cocktail hour"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of this photo group"
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Photographer Notes
              </label>
              <Textarea
                value={formData.photographer_notes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    photographer_notes: e.target.value,
                  }))
                }
                placeholder="Special instructions for the photographer"
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Assign Guests
              </label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {guests.map((guest) => (
                    <label
                      key={guest.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGuests.includes(guest.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGuests([...selectedGuests, guest.id]);
                          } else {
                            setSelectedGuests(
                              selectedGuests.filter((id) => id !== guest.id),
                            );
                          }
                        }}
                      />
                      {guest.first_name} {guest.last_name}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedGuests.length} guests selected
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrUpdate}
              disabled={saving || !formData.name}
            >
              {saving
                ? 'Saving...'
                : editingGroup
                  ? 'Update Group'
                  : 'Create Group'}
            </Button>
          </div>
        </Card>
      )}

      {/* Photo Groups List */}
      <div className="space-y-4">
        {photoGroups.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={photoGroups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {photoGroups.map((group) => (
                <SortablePhotoGroup
                  key={group.id}
                  group={group}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <Card className="p-8 text-center">
            <CameraIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No photo groups created yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Create photo groups to organize family and group photos for your
              photographer
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
