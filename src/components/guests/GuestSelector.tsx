'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Search,
  Users,
  AlertTriangle,
  Filter,
  Check,
  User,
  UserCheck,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Types
import {
  AvailableGuest,
  PhotoGroupConflict,
  DraggableData,
  DroppableData,
} from '@/types/photo-groups';

interface GuestSelectorProps {
  availableGuests: AvailableGuest[];
  selectedGuestIds: string[];
  onGuestSelect: (guestId: string) => void;
  onGuestUnselect: (guestId: string) => void;
  searchPlaceholder?: string;
  showCheckboxes?: boolean;
  groupByCategory?: boolean;
  allowDragDrop?: boolean;
  maxHeight?: string;
  className?: string;
}

interface GuestCardProps {
  guest: AvailableGuest;
  isSelected: boolean;
  onToggle: () => void;
  showCheckbox: boolean;
  allowDragDrop: boolean;
  conflicts: PhotoGroupConflict[];
}

// Side color mapping
const SIDE_COLORS = {
  partner1: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  partner2: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  mutual: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
};

// Category icons
const CATEGORY_ICONS = {
  family: Users,
  friends: Users,
  work: User,
  other: User,
};

function GuestCard({
  guest,
  isSelected,
  onToggle,
  showCheckbox,
  allowDragDrop,
  conflicts,
}: GuestCardProps) {
  const hasConflicts = conflicts.length > 0;

  // Drag and drop for unassigned guests
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `guest-${guest.id}`,
      disabled: !allowDragDrop,
      data: {
        type: 'guest',
        id: guest.id,
        dragType: 'guest',
        guestId: guest.id,
      } as DraggableData,
    });

  const style = allowDragDrop
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : {};

  const sideConfig = SIDE_COLORS[guest.side] || SIDE_COLORS.mutual;
  const CategoryIcon = CATEGORY_ICONS[guest.category] || User;

  return (
    <div
      ref={allowDragDrop ? setNodeRef : undefined}
      style={style}
      data-testid={`guest-${guest.id}`}
      className={`
        flex items-center p-3 border rounded-lg transition-all duration-200 cursor-pointer
        ${
          isSelected
            ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-100'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
        ${isDragging ? 'opacity-50 rotate-1' : ''}
        ${hasConflicts ? 'border-red-200 bg-red-50' : ''}
        ${!allowDragDrop && !showCheckbox ? 'hover:shadow-sm' : ''}
      `}
      onClick={onToggle}
    >
      {/* Drag Handle */}
      {allowDragDrop && (
        <div
          {...attributes}
          {...listeners}
          className="mr-3 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Checkbox */}
      {showCheckbox && (
        <div className="mr-3">
          <div
            className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
            ${
              isSelected
                ? 'bg-primary-600 border-primary-600'
                : 'border-gray-300 hover:border-gray-400'
            }
          `}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}

      {/* Guest Avatar */}
      <div
        className={`
        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white mr-3 flex-shrink-0
        ${isSelected ? 'bg-primary-500' : 'bg-gray-400'}
      `}
      >
        {guest.first_name.charAt(0)}
        {guest.last_name.charAt(0)}
      </div>

      {/* Guest Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-gray-900 truncate">
            {guest.first_name} {guest.last_name}
          </p>

          {/* Selection Indicator */}
          {!showCheckbox && isSelected && (
            <UserCheck className="w-4 h-4 text-primary-600 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Category */}
          <div className="flex items-center text-xs text-gray-600">
            <CategoryIcon className="w-3 h-3 mr-1" />
            <span className="capitalize">{guest.category}</span>
          </div>

          {/* Side Badge */}
          <span
            className={`
            inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
            ${sideConfig.bg} ${sideConfig.text}
          `}
          >
            {guest.side === 'partner1'
              ? 'Partner 1'
              : guest.side === 'partner2'
                ? 'Partner 2'
                : 'Mutual'}
          </span>

          {/* Assigned Groups Count */}
          {guest.assigned_groups.length > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              In {guest.assigned_groups.length} group
              {guest.assigned_groups.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Conflicts */}
        {hasConflicts && (
          <div className="mt-2 flex items-start">
            <AlertTriangle className="w-3 h-3 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700">
              {conflicts.slice(0, 1).map((conflict, index) => (
                <p key={index}>{conflict.message}</p>
              ))}
              {conflicts.length > 1 && (
                <p>
                  +{conflicts.length - 1} more conflict
                  {conflicts.length - 1 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  guests,
  selectedGuestIds,
  onGuestSelect,
  onGuestUnselect,
  showCheckboxes,
  allowDragDrop,
}: {
  category: string;
  guests: AvailableGuest[];
  selectedGuestIds: string[];
  onGuestSelect: (guestId: string) => void;
  onGuestUnselect: (guestId: string) => void;
  showCheckboxes: boolean;
  allowDragDrop: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const CategoryIcon =
    CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || User;
  const selectedCount = guests.filter((g) =>
    selectedGuestIds.includes(g.id),
  ).length;

  return (
    <div className="mb-4">
      {/* Category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200 mb-3"
      >
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 mr-2" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 mr-2" />
          )}
          <CategoryIcon className="w-4 h-4 text-gray-600 mr-2" />
          <span className="font-medium text-gray-900 capitalize">
            {category}
          </span>
          <span className="ml-2 text-sm text-gray-500">
            ({guests.length} guest{guests.length !== 1 ? 's' : ''})
          </span>
          {selectedCount > 0 && (
            <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
              {selectedCount} selected
            </span>
          )}
        </div>
      </button>

      {/* Category Guests */}
      {isExpanded && (
        <div className="space-y-2 pl-4">
          {guests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              isSelected={selectedGuestIds.includes(guest.id)}
              onToggle={() => {
                if (selectedGuestIds.includes(guest.id)) {
                  onGuestUnselect(guest.id);
                } else {
                  onGuestSelect(guest.id);
                }
              }}
              showCheckbox={showCheckboxes}
              allowDragDrop={allowDragDrop}
              conflicts={guest.conflicts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GuestSelector({
  availableGuests,
  selectedGuestIds,
  onGuestSelect,
  onGuestUnselect,
  searchPlaceholder = 'Search guests...',
  showCheckboxes = true,
  groupByCategory = false,
  allowDragDrop = false,
  maxHeight = 'max-h-96',
  className = '',
}: GuestSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');

  // Droppable area for drag and drop
  const { setNodeRef, isOver } = useDroppable({
    id: 'guest-selector',
    data: {
      type: 'unassigned',
    } as DroppableData,
  });

  // Filter guests
  const filteredGuests = useMemo(() => {
    return availableGuests.filter((guest) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && guest.category !== categoryFilter) {
        return false;
      }

      // Side filter
      if (sideFilter !== 'all' && guest.side !== sideFilter) {
        return false;
      }

      return true;
    });
  }, [availableGuests, searchTerm, categoryFilter, sideFilter]);

  // Group guests by category
  const groupedGuests = useMemo(() => {
    if (!groupByCategory) return { all: filteredGuests };

    return filteredGuests.reduce(
      (groups, guest) => {
        const category = guest.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(guest);
        return groups;
      },
      {} as Record<string, AvailableGuest[]>,
    );
  }, [filteredGuests, groupByCategory]);

  // Get unique categories and sides for filters
  const availableCategories = useMemo(() => {
    return [...new Set(availableGuests.map((g) => g.category))];
  }, [availableGuests]);

  const availableSides = useMemo(() => {
    return [...new Set(availableGuests.map((g) => g.side))];
  }, [availableGuests]);

  const selectedCount = selectedGuestIds.length;
  const totalConflicts = filteredGuests.reduce(
    (total, guest) => total + guest.conflicts.length,
    0,
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              {allowDragDrop ? 'Available Guests' : 'Select Guests'}
            </h3>
            <p className="text-sm text-gray-600">
              {filteredGuests.length} of {availableGuests.length} guests
              {selectedCount > 0 && ` • ${selectedCount} selected`}
              {totalConflicts > 0 && (
                <span className="text-red-600 ml-1">
                  • {totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {allowDragDrop && (
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Drag to assign
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          />
        </div>

        {/* Filters */}
        {(availableCategories.length > 1 || availableSides.length > 1) && (
          <div className="flex flex-wrap gap-2">
            {availableCategories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((category) => (
                  <option
                    key={category}
                    value={category}
                    className="capitalize"
                  >
                    {category}
                  </option>
                ))}
              </select>
            )}

            {availableSides.length > 1 && (
              <select
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="all">All Sides</option>
                <option value="partner1">Partner 1</option>
                <option value="partner2">Partner 2</option>
                <option value="mutual">Mutual</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Guest List */}
      <div
        ref={allowDragDrop ? setNodeRef : undefined}
        className={`
          ${maxHeight} overflow-y-auto p-4
          ${isOver ? 'bg-primary-50 border-primary-200' : ''}
        `}
      >
        {filteredGuests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {availableGuests.length === 0 ? (
              <div>
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-600">No guests available</p>
                <p className="text-sm text-gray-500 mt-1">
                  All guests have been assigned to photo groups
                </p>
              </div>
            ) : (
              <div>
                <Filter className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium text-gray-600">
                  No guests match your search
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        ) : groupByCategory ? (
          <div>
            {Object.entries(groupedGuests).map(([category, guests]) => (
              <CategoryGroup
                key={category}
                category={category}
                guests={guests}
                selectedGuestIds={selectedGuestIds}
                onGuestSelect={onGuestSelect}
                onGuestUnselect={onGuestUnselect}
                showCheckboxes={showCheckboxes}
                allowDragDrop={allowDragDrop}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                isSelected={selectedGuestIds.includes(guest.id)}
                onToggle={() => {
                  if (selectedGuestIds.includes(guest.id)) {
                    onGuestUnselect(guest.id);
                  } else {
                    onGuestSelect(guest.id);
                  }
                }}
                showCheckbox={showCheckboxes}
                allowDragDrop={allowDragDrop}
                conflicts={guest.conflicts}
              />
            ))}
          </div>
        )}

        {/* Drag Drop Indicator */}
        {allowDragDrop && isOver && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg">
              Drop guest here to unassign
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {(selectedCount > 0 || totalConflicts > 0) && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {selectedCount > 0 && (
                <span>
                  {selectedCount} guest{selectedCount !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            {totalConflicts > 0 && (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestSelector;
