'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Users,
  AlertTriangle,
  Check,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  GuestAssignmentModalProps,
  Guest,
  GuestCategory,
} from '@/types/mobile-seating';

/**
 * GuestAssignmentModal - WS-154 Full-Screen Mobile Modal
 *
 * Mobile-optimized guest selection interface:
 * - Full-screen modal layout
 * - Real-time search with filtering
 * - Alphabetical guest sorting
 * - Category tabs (Family/Friends/Vendors)
 * - Batch assignment actions
 * - Conflict prevention
 */
export const GuestAssignmentModal: React.FC<GuestAssignmentModalProps> = ({
  isOpen,
  onClose,
  selectedTable,
  availableGuests,
  onAssignGuests,
  searchQuery = '',
  onSearchChange,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<GuestCategory | 'all'>(
    'all',
  );
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'rsvp'>('name');
  const [showConflicts, setShowConflicts] = useState(false);

  // Mock additional guest data - in real app, this would come from props or API
  const extendedGuests: Guest[] = [
    ...availableGuests,
    {
      id: 'guest-3',
      firstName: 'Michael',
      lastName: 'Brown',
      category: 'family',
      rsvpStatus: 'attending',
      dietaryRestrictions: [
        { id: '1', name: 'Vegetarian', severity: 'preference' },
      ],
    },
    {
      id: 'guest-4',
      firstName: 'Emma',
      lastName: 'Davis',
      category: 'friends',
      rsvpStatus: 'attending',
      dietaryRestrictions: [],
    },
    {
      id: 'guest-5',
      firstName: 'David',
      lastName: 'Wilson',
      category: 'wedding_party',
      rsvpStatus: 'attending',
      dietaryRestrictions: [
        { id: '2', name: 'Gluten-Free', severity: 'allergy' },
      ],
    },
    {
      id: 'guest-6',
      firstName: 'Lisa',
      lastName: 'Garcia',
      category: 'vendors',
      rsvpStatus: 'attending',
      dietaryRestrictions: [],
    },
  ];

  useEffect(() => {
    setInternalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Clear selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedGuestIds([]);
    }
  }, [isOpen]);

  // Filter and sort guests
  const filteredAndSortedGuests = useMemo(() => {
    let filtered = extendedGuests.filter((guest) => {
      // Only show unassigned guests (no tableId)
      if (guest.tableId) return false;

      // Text search
      const query = internalSearchQuery.toLowerCase();
      const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
      const matchesSearch = query === '' || fullName.includes(query);

      // Category filter
      const matchesCategory =
        activeCategory === 'all' || guest.category === activeCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort guests
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          );
        case 'category':
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          );
        case 'rsvp':
          if (a.rsvpStatus !== b.rsvpStatus) {
            const rsvpOrder = {
              attending: 0,
              tentative: 1,
              pending: 2,
              declined: 3,
            };
            return rsvpOrder[a.rsvpStatus] - rsvpOrder[b.rsvpStatus];
          }
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [extendedGuests, internalSearchQuery, activeCategory, sortBy]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: 0,
      family: 0,
      friends: 0,
      vendors: 0,
      wedding_party: 0,
    };
    extendedGuests.forEach((guest) => {
      if (!guest.tableId) {
        counts.all++;
        counts[guest.category]++;
      }
    });
    return counts;
  }, [extendedGuests]);

  // Check for potential conflicts
  const checkConflicts = (guestIds: string[]): string[] => {
    const conflicts: string[] = [];
    const selectedGuests = extendedGuests.filter((g) =>
      guestIds.includes(g.id),
    );

    // Check dietary conflicts
    const allergies = selectedGuests.flatMap(
      (g) =>
        g.dietaryRestrictions?.filter((d) => d.severity === 'allergy') || [],
    );

    if (allergies.length > 1) {
      const uniqueAllergies = [...new Set(allergies.map((a) => a.name))];
      if (uniqueAllergies.length > 1) {
        conflicts.push(
          'Multiple guests have different allergies at this table',
        );
      }
    }

    // Check capacity
    if (selectedTable) {
      const currentGuests = selectedTable.guests.length;
      const totalAfterAssignment = currentGuests + guestIds.length;

      if (totalAfterAssignment > selectedTable.capacity) {
        conflicts.push(
          `This will exceed table capacity (${totalAfterAssignment}/${selectedTable.capacity})`,
        );
      }
    }

    return conflicts;
  };

  const handleSearchChange = (value: string) => {
    setInternalSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleGuestToggle = (guestId: string) => {
    setSelectedGuestIds((prev) => {
      const newSelection = prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId];

      // Show conflicts if any
      const conflicts = checkConflicts(newSelection);
      setShowConflicts(conflicts.length > 0);

      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const visibleGuestIds = filteredAndSortedGuests.map((g) => g.id);
    setSelectedGuestIds(visibleGuestIds);

    const conflicts = checkConflicts(visibleGuestIds);
    setShowConflicts(conflicts.length > 0);
  };

  const handleDeselectAll = () => {
    setSelectedGuestIds([]);
    setShowConflicts(false);
  };

  const handleAssign = () => {
    if (selectedGuestIds.length > 0 && selectedTable) {
      onAssignGuests(selectedGuestIds, selectedTable.id);
    }
  };

  const getCategoryLabel = (category: GuestCategory | 'all'): string => {
    switch (category) {
      case 'all':
        return 'All';
      case 'family':
        return 'Family';
      case 'friends':
        return 'Friends';
      case 'vendors':
        return 'Vendors';
      case 'wedding_party':
        return 'Wedding Party';
      default:
        return category;
    }
  };

  const getRSVPStatusColor = (status: Guest['rsvpStatus']) => {
    switch (status) {
      case 'attending':
        return 'bg-green-100 text-green-800';
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const conflicts = checkConflicts(selectedGuestIds);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 rounded-none">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
              aria-label="Close modal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Assign Guests
              </DialogTitle>
              {selectedTable && (
                <p className="text-sm text-gray-600">
                  {selectedTable.name} ({selectedTable.guests.length}/
                  {selectedTable.capacity} seated)
                </p>
              )}
            </div>
          </div>

          {selectedGuestIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedGuestIds.length} selected
            </Badge>
          )}
        </DialogHeader>

        {/* Search Bar */}
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search guests by name..."
              value={internalSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 h-12 text-base touch-manipulation"
            />
            {internalSearchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-4 border-b bg-white space-y-3">
          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={(value) =>
              setActiveCategory(value as GuestCategory | 'all')
            }
          >
            <TabsList className="grid w-full grid-cols-5 h-10">
              <TabsTrigger value="all" className="text-xs">
                All ({categoryCounts.all})
              </TabsTrigger>
              <TabsTrigger value="family" className="text-xs">
                Family ({categoryCounts.family})
              </TabsTrigger>
              <TabsTrigger value="friends" className="text-xs">
                Friends ({categoryCounts.friends})
              </TabsTrigger>
              <TabsTrigger value="wedding_party" className="text-xs">
                Party ({categoryCounts.wedding_party})
              </TabsTrigger>
              <TabsTrigger value="vendors" className="text-xs">
                Vendors ({categoryCounts.vendors})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredAndSortedGuests.length === 0}
                className="touch-manipulation"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedGuestIds.length === 0}
                className="touch-manipulation"
              >
                Deselect All
              </Button>
            </div>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'name' | 'category' | 'rsvp')
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white touch-manipulation"
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="rsvp">Sort by RSVP</option>
            </select>
          </div>
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="px-4 py-2">
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <div className="ml-2">
                <div className="font-medium text-sm">Assignment Conflicts</div>
                <ul className="text-xs mt-1 space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>• {conflict}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          </div>
        )}

        {/* Guest List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredAndSortedGuests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No available guests found</p>
                  {internalSearchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleSearchChange('')}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                filteredAndSortedGuests.map((guest) => {
                  const isSelected = selectedGuestIds.includes(guest.id);
                  const hasDietaryRestrictions =
                    guest.dietaryRestrictions &&
                    guest.dietaryRestrictions.length > 0;

                  return (
                    <div
                      key={guest.id}
                      className={`
                        flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer touch-manipulation
                        ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}
                      `}
                      onClick={() => handleGuestToggle(guest.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${guest.firstName} ${guest.lastName}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleGuestToggle(guest.id)}
                        className="touch-manipulation"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">
                            {guest.firstName} {guest.lastName}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getRSVPStatusColor(guest.rsvpStatus)}`}
                            >
                              {guest.rsvpStatus}
                            </Badge>
                            {hasDietaryRestrictions && (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(guest.category)}
                          </Badge>

                          {hasDietaryRestrictions && (
                            <div className="text-xs text-gray-600">
                              {guest
                                .dietaryRestrictions!.map((dr) => dr.name)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1 touch-manipulation min-h-[48px]"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 touch-manipulation min-h-[48px]"
              onClick={handleAssign}
              disabled={selectedGuestIds.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Assign{' '}
              {selectedGuestIds.length > 0
                ? `(${selectedGuestIds.length})`
                : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
