'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  UserIcon,
  HeartIcon,
  BriefcaseIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/utils/toast';
import { useDebounce } from '@/hooks/useDebounce';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  category: 'family' | 'friends' | 'work' | 'other';
  side: 'partner1' | 'partner2' | 'mutual';
  plus_one: boolean;
  plus_one_name?: string;
  dietary_restrictions?: string;
  table_number?: number;
  notes?: string;
  rsvp_status?: 'pending' | 'yes' | 'no' | 'maybe';
  household_id?: string;
  age_group?: 'adult' | 'child' | 'infant';
}

interface Household {
  id: string;
  name: string;
  address?: string;
  guests: Guest[];
}

interface GuestCounts {
  total: number;
  adults: number;
  children: number;
  infants: number;
  rsvp_yes: number;
  rsvp_no: number;
  rsvp_pending: number;
}

interface GuestListBuilderProps {
  coupleId: string;
  onGuestUpdate?: () => void;
}

const CATEGORIES = [
  {
    id: 'family',
    label: 'Family',
    icon: HomeIcon,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: HeartIcon,
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'work',
    label: 'Work',
    icon: BriefcaseIcon,
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'other',
    label: 'Other',
    icon: UserIcon,
    color: 'bg-gray-100 text-gray-800',
  },
];

export function GuestListBuilder({
  coupleId,
  onGuestUpdate,
}: GuestListBuilderProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterRsvp, setFilterRsvp] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'category' | 'household' | 'list'>(
    'category',
  );
  const [loading, setLoading] = useState(true);
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    total: 0,
    adults: 0,
    children: 0,
    infants: 0,
    rsvp_yes: 0,
    rsvp_no: 0,
    rsvp_pending: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 300);
  const supabase = createClient();

  // Load guests and households
  const loadGuests = useCallback(async () => {
    setLoading(true);
    try {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select(
          `
          *,
          households (
            id,
            name,
            address
          )
        `,
        )
        .eq('couple_id', coupleId)
        .order('last_name', { ascending: true });

      if (guestError) throw guestError;

      const guestsWithDefaults = (guestData || []).map((guest) => ({
        ...guest,
        category: guest.category || 'other',
        side: guest.side || 'mutual',
        age_group: guest.age_group || 'adult',
        rsvp_status: guest.rsvp_status || 'pending',
      }));

      setGuests(guestsWithDefaults);

      // Group guests by household
      const householdMap = new Map<string, Household>();
      guestsWithDefaults.forEach((guest) => {
        if (guest.household_id) {
          const householdId = guest.household_id;
          if (!householdMap.has(householdId)) {
            householdMap.set(householdId, {
              id: householdId,
              name: guest.households?.name || `${guest.last_name} Family`,
              address: guest.households?.address,
              guests: [],
            });
          }
          householdMap.get(householdId)!.guests.push(guest);
        }
      });

      setHouseholds(Array.from(householdMap.values()));
    } catch (error) {
      console.error('Error loading guests:', error);
      toast.error('Failed to load guests');
    } finally {
      setLoading(false);
    }
  }, [coupleId, supabase]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  // Filter and search guests
  useEffect(() => {
    let filtered = guests;

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.first_name.toLowerCase().includes(query) ||
          guest.last_name.toLowerCase().includes(query) ||
          guest.email?.toLowerCase().includes(query) ||
          guest.phone?.includes(query),
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter((guest) => guest.category === filterCategory);
    }

    // Side filter
    if (filterSide !== 'all') {
      filtered = filtered.filter((guest) => guest.side === filterSide);
    }

    // RSVP filter
    if (filterRsvp !== 'all') {
      filtered = filtered.filter((guest) => guest.rsvp_status === filterRsvp);
    }

    setFilteredGuests(filtered);
  }, [guests, debouncedSearch, filterCategory, filterSide, filterRsvp]);

  // Calculate guest counts
  useEffect(() => {
    const counts: GuestCounts = {
      total: guests.length,
      adults: guests.filter((g) => g.age_group === 'adult').length,
      children: guests.filter((g) => g.age_group === 'child').length,
      infants: guests.filter((g) => g.age_group === 'infant').length,
      rsvp_yes: guests.filter((g) => g.rsvp_status === 'yes').length,
      rsvp_no: guests.filter((g) => g.rsvp_status === 'no').length,
      rsvp_pending: guests.filter((g) => g.rsvp_status === 'pending').length,
    };
    setGuestCounts(counts);
  }, [guests]);

  // Handle drag and drop
  const handleDragEnd = useCallback(
    async (result: any) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const guestId = draggableId;
      const newCategory = destination.droppableId as Guest['category'];

      try {
        // Update guest category in database
        const { error } = await supabase
          .from('guests')
          .update({ category: newCategory })
          .eq('id', guestId);

        if (error) throw error;

        // Update local state
        setGuests((prev) =>
          prev.map((guest) =>
            guest.id === guestId ? { ...guest, category: newCategory } : guest,
          ),
        );

        toast.success(`Guest moved to ${newCategory}`);
        onGuestUpdate?.();
      } catch (error) {
        console.error('Error updating guest category:', error);
        toast.error('Failed to update guest category');
      }
    },
    [supabase, onGuestUpdate],
  );

  // Bulk operations
  const handleBulkCategoryUpdate = async (category: Guest['category']) => {
    if (selectedGuests.size === 0) return;

    try {
      const guestIds = Array.from(selectedGuests);
      const { error } = await supabase
        .from('guests')
        .update({ category })
        .in('id', guestIds);

      if (error) throw error;

      setGuests((prev) =>
        prev.map((guest) =>
          selectedGuests.has(guest.id) ? { ...guest, category } : guest,
        ),
      );

      setSelectedGuests(new Set());
      toast.success(`Updated ${selectedGuests.size} guests`);
      onGuestUpdate?.();
    } catch (error) {
      console.error('Error bulk updating guests:', error);
      toast.error('Failed to update guests');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGuests.size === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedGuests.size} guests?`)
    )
      return;

    try {
      const guestIds = Array.from(selectedGuests);
      const { error } = await supabase
        .from('guests')
        .delete()
        .in('id', guestIds);

      if (error) throw error;

      setGuests((prev) =>
        prev.filter((guest) => !selectedGuests.has(guest.id)),
      );
      setSelectedGuests(new Set());
      toast.success(`Deleted ${guestIds.length} guests`);
      onGuestUpdate?.();
    } catch (error) {
      console.error('Error deleting guests:', error);
      toast.error('Failed to delete guests');
    }
  };

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        newSet.add(guestId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map((g) => g.id)));
    }
  };

  // Group guests by category for drag and drop
  const guestsByCategory = useMemo(() => {
    const grouped: Record<string, Guest[]> = {
      family: [],
      friends: [],
      work: [],
      other: [],
    };

    filteredGuests.forEach((guest) => {
      grouped[guest.category].push(guest);
    });

    return grouped;
  }, [filteredGuests]);

  const renderGuestCard = (guest: Guest, index: number) => (
    <Draggable key={guest.id} draggableId={guest.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'shadow-lg rotate-2 z-50' : ''
          } ${selectedGuests.has(guest.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedGuests.has(guest.id)}
                onChange={() => toggleGuestSelection(guest.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {guest.first_name} {guest.last_name}
                </div>
                {guest.email && (
                  <div className="text-sm text-gray-500">{guest.email}</div>
                )}
                {guest.phone && (
                  <div className="text-sm text-gray-500">{guest.phone}</div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {guest.side}
                  </Badge>
                  <Badge
                    variant={
                      guest.rsvp_status === 'yes' ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {guest.rsvp_status}
                  </Badge>
                  {guest.plus_one && (
                    <Badge variant="secondary" className="text-xs">
                      +1
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with counts */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Guest List</h2>
          <div className="flex items-center gap-6 mt-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{guestCounts.total}</span> Total
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{guestCounts.adults}</span> Adults
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{guestCounts.children}</span>{' '}
              Children
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{guestCounts.infants}</span> Infants
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-600">
                {guestCounts.rsvp_yes}
              </span>{' '}
              Confirmed
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'category' ? 'default' : 'outline'}
            onClick={() => setViewMode('category')}
            size="sm"
          >
            Categories
          </Button>
          <Button
            variant={viewMode === 'household' ? 'default' : 'outline'}
            onClick={() => setViewMode('household')}
            size="sm"
          >
            Households
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            size="sm"
          >
            List
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={filterSide}
          onChange={(e) => setFilterSide(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Sides</option>
          <option value="partner1">Partner 1</option>
          <option value="partner2">Partner 2</option>
          <option value="mutual">Mutual</option>
        </select>
        <select
          value={filterRsvp}
          onChange={(e) => setFilterRsvp(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All RSVP</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Bulk operations */}
      {selectedGuests.size > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {selectedGuests.size} guest{selectedGuests.size > 1 ? 's' : ''}{' '}
                selected
              </span>
              <Button variant="outline" size="sm" onClick={toggleAllSelection}>
                {selectedGuests.size === filteredGuests.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkCategoryUpdate(
                      e.target.value as Guest['category'],
                    );
                    e.target.value = '';
                  }
                }}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="">Move to Category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Guest list by category with drag and drop */}
      {viewMode === 'category' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {CATEGORIES.map((category) => {
              const CategoryIcon = category.icon;
              const categoryGuests = guestsByCategory[category.id] || [];

              return (
                <Card key={category.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-5 w-5 text-gray-500" />
                      <h3 className="font-semibold">{category.label}</h3>
                      <Badge variant="secondary">{categoryGuests.length}</Badge>
                    </div>
                  </div>

                  <Droppable droppableId={category.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-64 ${
                          snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
                        }`}
                      >
                        {categoryGuests.map((guest, index) =>
                          renderGuestCard(guest, index),
                        )}
                        {provided.placeholder}
                        {categoryGuests.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <UserGroupIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              No guests in this category
                            </p>
                            <p className="text-xs">
                              Drag guests here to categorize
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </Card>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Household view */}
      {viewMode === 'household' && (
        <div className="space-y-4">
          {households.map((household) => (
            <Card key={household.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{household.name}</h3>
                  {household.address && (
                    <p className="text-sm text-gray-500">{household.address}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  {household.guests.length} guests
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {household.guests.map((guest, index) =>
                  renderGuestCard(guest, index),
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={
                        selectedGuests.size === filteredGuests.length &&
                        filteredGuests.length > 0
                      }
                      onChange={toggleAllSelection}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    RSVP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plus One
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedGuests.has(guest.id)}
                        onChange={() => toggleGuestSelection(guest.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {guest.first_name} {guest.last_name}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {guest.side}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div>{guest.email || '-'}</div>
                      <div>{guest.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          CATEGORIES.find((c) => c.id === guest.category)?.color
                        }
                      >
                        {guest.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          guest.rsvp_status === 'yes' ? 'default' : 'secondary'
                        }
                      >
                        {guest.rsvp_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {guest.plus_one ? (
                        <div>
                          <Badge variant="secondary">+1</Badge>
                          {guest.plus_one_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              {guest.plus_one_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
