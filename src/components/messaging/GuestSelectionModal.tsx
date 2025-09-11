'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TouchButton } from '@/components/touch/TouchButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Users,
  UserCheck,
  Filter,
  X,
  Check,
  UserPlus,
  Heart,
  Car,
  Utensils,
} from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rsvpStatus: 'pending' | 'attending' | 'declined';
  group: 'family' | 'friends' | 'wedding-party' | 'vendors' | 'plus-ones';
  hasPhone: boolean;
  hasEmail: boolean;
  dietaryRestrictions?: string;
  relation?: string;
}

interface GuestSelectionModalProps {
  guests: Guest[];
  selectedGuestIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
  isOpen: boolean;
  maxSelections?: number;
}

const groupLabels = {
  family: 'Family',
  friends: 'Friends',
  'wedding-party': 'Wedding Party',
  vendors: 'Vendors',
  'plus-ones': 'Plus Ones',
} as const;

const groupColors = {
  family: 'default',
  friends: 'secondary',
  'wedding-party': 'default',
  vendors: 'outline',
  'plus-ones': 'outline',
} as const;

const rsvpStatusColors = {
  pending: 'outline',
  attending: 'default',
  declined: 'secondary',
} as const;

const quickSelectOptions = [
  {
    id: 'all-attending',
    label: 'All Attending',
    icon: <UserCheck className="w-4 h-4" />,
  },
  {
    id: 'wedding-party',
    label: 'Wedding Party',
    icon: <Heart className="w-4 h-4" />,
  },
  {
    id: 'family-only',
    label: 'Family Only',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'has-phone',
    label: 'With Phone Numbers',
    icon: <Users className="w-4 h-4" />,
  },
];

export function GuestSelectionModal({
  guests,
  selectedGuestIds,
  onSelectionChange,
  onConfirm,
  onClose,
  isOpen,
  maxSelections,
}: GuestSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedRsvpStatus, setSelectedRsvpStatus] = useState<string | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] =
    useState<string[]>(selectedGuestIds);

  // Filter guests
  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone?.includes(searchTerm);

      const matchesGroup = !selectedGroup || guest.group === selectedGroup;
      const matchesRsvp =
        !selectedRsvpStatus || guest.rsvpStatus === selectedRsvpStatus;

      return matchesSearch && matchesGroup && matchesRsvp;
    });
  }, [guests, searchTerm, selectedGroup, selectedRsvpStatus]);

  // Group guests by category
  const groupedGuests = useMemo(() => {
    const grouped = filteredGuests.reduce(
      (acc, guest) => {
        if (!acc[guest.group]) acc[guest.group] = [];
        acc[guest.group].push(guest);
        return acc;
      },
      {} as Record<string, Guest[]>,
    );

    // Sort groups by priority
    const sortedGrouped: Record<string, Guest[]> = {};
    ['wedding-party', 'family', 'friends', 'vendors', 'plus-ones'].forEach(
      (group) => {
        if (grouped[group]) {
          sortedGrouped[group] = grouped[group].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }
      },
    );

    return sortedGrouped;
  }, [filteredGuests]);

  const handleGuestToggle = (guestId: string) => {
    const newSelection = localSelectedIds.includes(guestId)
      ? localSelectedIds.filter((id) => id !== guestId)
      : [...localSelectedIds, guestId];

    if (maxSelections && newSelection.length > maxSelections) return;

    setLocalSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleQuickSelect = (optionId: string) => {
    let selectedIds: string[] = [];

    switch (optionId) {
      case 'all-attending':
        selectedIds = guests
          .filter((g) => g.rsvpStatus === 'attending')
          .map((g) => g.id);
        break;
      case 'wedding-party':
        selectedIds = guests
          .filter((g) => g.group === 'wedding-party')
          .map((g) => g.id);
        break;
      case 'family-only':
        selectedIds = guests
          .filter((g) => g.group === 'family')
          .map((g) => g.id);
        break;
      case 'has-phone':
        selectedIds = guests.filter((g) => g.hasPhone).map((g) => g.id);
        break;
    }

    if (maxSelections) {
      selectedIds = selectedIds.slice(0, maxSelections);
    }

    setLocalSelectedIds(selectedIds);
    onSelectionChange(selectedIds);
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredGuests.map((g) => g.id);
    const newSelection = maxSelections
      ? allFilteredIds.slice(0, maxSelections)
      : allFilteredIds;

    setLocalSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    setLocalSelectedIds([]);
    onSelectionChange([]);
  };

  const handleConfirm = () => {
    onConfirm(localSelectedIds);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <Card className="w-full h-[85vh] md:w-[90%] md:max-w-2xl md:h-[80vh] rounded-t-xl md:rounded-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
          <div>
            <h3 className="text-lg font-semibold">Select Recipients</h3>
            <p className="text-sm text-muted-foreground">
              {localSelectedIds.length} selected
              {maxSelections && ` (max ${maxSelections})`}
            </p>
          </div>
          <TouchButton
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </TouchButton>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <TouchButton
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
              >
                Select All Filtered
              </TouchButton>
              <TouchButton
                size="sm"
                variant="outline"
                onClick={handleDeselectAll}
              >
                Clear All
              </TouchButton>
            </div>
            <TouchButton
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </TouchButton>
          </div>

          {/* Quick Select Options */}
          <div className="flex flex-wrap gap-2">
            {quickSelectOptions.map((option) => (
              <TouchButton
                key={option.id}
                size="sm"
                variant="outline"
                onClick={() => handleQuickSelect(option.id)}
                className="text-xs"
              >
                {option.icon}
                <span className="ml-1">{option.label}</span>
              </TouchButton>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              style={{ fontSize: '16px' }}
            />
          </div>

          {showFilters && (
            <div className="space-y-3">
              {/* Group Filter */}
              <div>
                <p className="text-sm font-medium mb-2">Group</p>
                <div className="flex flex-wrap gap-1">
                  <TouchButton
                    size="sm"
                    variant={selectedGroup === null ? 'default' : 'outline'}
                    onClick={() => setSelectedGroup(null)}
                  >
                    All Groups
                  </TouchButton>
                  {Object.entries(groupLabels).map(([key, label]) => (
                    <TouchButton
                      key={key}
                      size="sm"
                      variant={selectedGroup === key ? 'default' : 'outline'}
                      onClick={() => setSelectedGroup(key)}
                    >
                      {label}
                    </TouchButton>
                  ))}
                </div>
              </div>

              {/* RSVP Filter */}
              <div>
                <p className="text-sm font-medium mb-2">RSVP Status</p>
                <div className="flex gap-1">
                  <TouchButton
                    size="sm"
                    variant={
                      selectedRsvpStatus === null ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedRsvpStatus(null)}
                  >
                    All Status
                  </TouchButton>
                  {['attending', 'pending', 'declined'].map((status) => (
                    <TouchButton
                      key={status}
                      size="sm"
                      variant={
                        selectedRsvpStatus === status ? 'default' : 'outline'
                      }
                      onClick={() => setSelectedRsvpStatus(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </TouchButton>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guest List */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {Object.entries(groupedGuests).map(([group, groupGuests]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-sm">
                    {groupLabels[group as keyof typeof groupLabels]}
                  </h4>
                  <Badge
                    variant={groupColors[group as keyof typeof groupColors]}
                    className="text-xs"
                  >
                    {groupGuests.length}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {groupGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleGuestToggle(guest.id)}
                    >
                      <Checkbox
                        checked={localSelectedIds.includes(guest.id)}
                        onChange={() => {}} // Handled by onClick above
                        className="shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{guest.name}</p>
                          <Badge
                            variant={rsvpStatusColors[guest.rsvpStatus]}
                            className="text-xs shrink-0"
                          >
                            {guest.rsvpStatus}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {guest.phone && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              <span>SMS</span>
                            </div>
                          )}
                          {guest.email && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <span>Email</span>
                            </div>
                          )}
                          {guest.relation && <span>• {guest.relation}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredGuests.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No guests found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <TouchButton variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </TouchButton>
            <TouchButton
              onClick={handleConfirm}
              className="flex-1"
              disabled={localSelectedIds.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm ({localSelectedIds.length})
            </TouchButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
