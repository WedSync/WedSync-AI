'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, MapPin, Calendar, Clock, Users, X } from 'lucide-react';

interface ScheduleFiltersProps {
  onFiltersChange: () => void;
}

export function ScheduleFilters({ onFiltersChange }: ScheduleFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const filterOptions = [
    {
      category: 'Event Type',
      options: [
        { id: 'wedding', label: 'Weddings', icon: Calendar },
        { id: 'engagement', label: 'Engagements', icon: Users },
        { id: 'consultation', label: 'Consultations', icon: Clock },
      ],
    },
    {
      category: 'Location',
      options: [
        { id: 'venue', label: 'At Venue', icon: MapPin },
        { id: 'studio', label: 'Studio', icon: MapPin },
        { id: 'outdoor', label: 'Outdoor', icon: MapPin },
      ],
    },
    {
      category: 'Status',
      options: [
        { id: 'confirmed', label: 'Confirmed' },
        { id: 'pending', label: 'Pending' },
        { id: 'completed', label: 'Completed' },
      ],
    },
  ];

  const toggleFilter = (filterId: string) => {
    const newFilters = activeFilters.includes(filterId)
      ? activeFilters.filter((f) => f !== filterId)
      : [...activeFilters, filterId];

    setActiveFilters(newFilters);
    onFiltersChange();
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    onFiltersChange();
  };

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {activeFilters.map((filterId) => {
            const option = filterOptions
              .flatMap((cat) => cat.options)
              .find((opt) => opt.id === filterId);

            return option ? (
              <Badge
                key={filterId}
                variant="secondary"
                className="flex items-center gap-1 bg-pink-100 text-pink-700"
              >
                {option.label}
                <button
                  onClick={() => toggleFilter(filterId)}
                  className="ml-1 hover:bg-pink-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ) : null;
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Categories */}
      <div className="space-y-3">
        {filterOptions.map((category) => (
          <Card key={category.category} className="p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {category.category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {category.options.map((option) => {
                const Icon = option.icon;
                const isActive = activeFilters.includes(option.id);

                return (
                  <button
                    key={option.id}
                    onClick={() => toggleFilter(option.id)}
                    className={`
                      flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all touch-manipulation min-h-[44px]
                      ${
                        isActive
                          ? 'bg-pink-100 text-pink-700 border border-pink-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
