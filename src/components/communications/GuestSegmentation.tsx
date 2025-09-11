'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  GuestSegmentationProps,
  GuestSegmentationCriteria,
  GuestWithSegmentInfo,
} from '@/types/communications';
import {
  FilterIcon,
  UsersIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
} from 'lucide-react';

const RSVP_OPTIONS = [
  {
    value: 'pending',
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    value: 'attending',
    label: 'Attending',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    value: 'declined',
    label: 'Declined',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    value: 'maybe',
    label: 'Maybe',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
] as const;

const CATEGORY_OPTIONS = [
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'friends', label: 'Friends', icon: '👫' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'other', label: 'Other', icon: '👤' },
] as const;

const SIDE_OPTIONS = [
  { value: 'partner1', label: 'Partner 1 Side', icon: '💒' },
  { value: 'partner2', label: 'Partner 2 Side', icon: '💒' },
  { value: 'mutual', label: 'Both Sides', icon: '🤝' },
] as const;

const AGE_GROUP_OPTIONS = [
  { value: 'adult', label: 'Adults', icon: '🧑‍🤝‍🧑' },
  { value: 'child', label: 'Children', icon: '👶' },
  { value: 'infant', label: 'Infants', icon: '🍼' },
] as const;

export function GuestSegmentation({
  criteria,
  onCriteriaChange,
  selectedGuestCount,
  totalGuestCount,
  onPreviewGuests,
  className,
}: GuestSegmentationProps) {
  const [previewGuests, setPreviewGuests] = useState<GuestWithSegmentInfo[]>(
    [],
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customDietaryRestrictions, setCustomDietaryRestrictions] =
    useState('');
  const [customTags, setCustomTags] = useState('');

  const hasActiveFilters = useMemo(() => {
    return Object.values(criteria).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [criteria]);

  const handleMultiSelectChange = useCallback(
    <T extends string>(
      field: keyof GuestSegmentationCriteria,
      value: T,
      currentArray: T[] | undefined,
    ) => {
      const newArray = currentArray ? [...currentArray] : [];
      const index = newArray.indexOf(value);

      if (index >= 0) {
        newArray.splice(index, 1);
      } else {
        newArray.push(value);
      }

      onCriteriaChange({
        ...criteria,
        [field]: newArray.length > 0 ? newArray : undefined,
      });
    },
    [criteria, onCriteriaChange],
  );

  const handleBooleanChange = useCallback(
    (field: keyof GuestSegmentationCriteria, value: boolean | undefined) => {
      onCriteriaChange({
        ...criteria,
        [field]: value,
      });
    },
    [criteria, onCriteriaChange],
  );

  const handlePreviewClick = useCallback(async () => {
    setIsLoadingPreview(true);
    setShowPreview(true);

    try {
      await onPreviewGuests();
      // In a real implementation, this would be passed from parent or fetched here
      // For now, we'll create mock data
      const mockGuests: GuestWithSegmentInfo[] = Array.from(
        { length: selectedGuestCount },
        (_, i) => ({
          id: `guest-${i}`,
          first_name: `Guest${i}`,
          last_name: `LastName${i}`,
          email: `guest${i}@example.com`,
          rsvp_status: (['pending', 'attending', 'declined', 'maybe'] as const)[
            i % 4
          ],
          dietary_restrictions: i % 3 === 0 ? 'Vegetarian' : undefined,
          plus_one: i % 4 === 0,
          plus_one_name: i % 4 === 0 ? `Plus${i}` : undefined,
          category: (['family', 'friends', 'work', 'other'] as const)[i % 4],
          side: (['partner1', 'partner2', 'mutual'] as const)[i % 3],
          tags: [`tag${(i % 3) + 1}`],
          household_name: `Household ${i}`,
          table_number: Math.floor(i / 8) + 1,
        }),
      );
      setPreviewGuests(mockGuests);
    } catch (error) {
      console.error('Failed to preview guests:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [onPreviewGuests, selectedGuestCount]);

  const handleClearFilters = useCallback(() => {
    onCriteriaChange({
      rsvp_status: undefined,
      dietary_restrictions: undefined,
      age_groups: undefined,
      categories: undefined,
      sides: undefined,
      has_plus_one: undefined,
      has_dietary_restrictions: undefined,
      has_special_needs: undefined,
      table_numbers: undefined,
      tags: undefined,
      custom_filters: undefined,
    });
    setCustomDietaryRestrictions('');
    setCustomTags('');
  }, [onCriteriaChange]);

  const addCustomDietaryRestriction = useCallback(() => {
    if (customDietaryRestrictions.trim()) {
      const current = criteria.dietary_restrictions || [];
      if (!current.includes(customDietaryRestrictions.trim())) {
        onCriteriaChange({
          ...criteria,
          dietary_restrictions: [...current, customDietaryRestrictions.trim()],
        });
      }
      setCustomDietaryRestrictions('');
    }
  }, [customDietaryRestrictions, criteria, onCriteriaChange]);

  const addCustomTag = useCallback(() => {
    if (customTags.trim()) {
      const current = criteria.tags || [];
      if (!current.includes(customTags.trim())) {
        onCriteriaChange({
          ...criteria,
          tags: [...current, customTags.trim()],
        });
      }
      setCustomTags('');
    }
  }, [customTags, criteria, onCriteriaChange]);

  const removeArrayItem = useCallback(
    <T extends string>(field: keyof GuestSegmentationCriteria, item: T) => {
      const currentArray = criteria[field] as T[] | undefined;
      if (currentArray) {
        const newArray = currentArray.filter((i) => i !== item);
        onCriteriaChange({
          ...criteria,
          [field]: newArray.length > 0 ? newArray : undefined,
        });
      }
    },
    [criteria, onCriteriaChange],
  );

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <UsersIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select Your Guests
            </h2>
            <p className="text-sm text-gray-600">
              Filter guests by their details to create targeted messages
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <XIcon className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          )}

          <div className="text-sm text-gray-600">
            <span className="font-semibold text-primary-600">
              {selectedGuestCount}
            </span>{' '}
            of <span className="font-medium">{totalGuestCount}</span> guests
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Filters Panel */}
        <div className="xl:col-span-2 space-y-6">
          {/* RSVP Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FilterIcon className="w-5 h-5 mr-2 text-gray-600" />
              RSVP Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RSVP_OPTIONS.map((option) => {
                const isSelected = criteria.rsvp_status?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleMultiSelectChange(
                        'rsvp_status',
                        option.value,
                        criteria.rsvp_status,
                      )
                    }
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
                      isSelected
                        ? option.color + ' shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isSelected && <CheckIcon className="w-4 h-4" />}
                      <span>{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Categories */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Guest Categories
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORY_OPTIONS.map((option) => {
                const isSelected = criteria.categories?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleMultiSelectChange(
                        'categories',
                        option.value,
                        criteria.categories,
                      )
                    }
                    className={cn(
                      'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border text-center',
                      isSelected
                        ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <div className="space-y-1">
                      <div className="text-lg">{option.icon}</div>
                      <div>{option.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wedding Sides */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Wedding Sides
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SIDE_OPTIONS.map((option) => {
                const isSelected = criteria.sides?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleMultiSelectChange(
                        'sides',
                        option.value,
                        criteria.sides,
                      )
                    }
                    className={cn(
                      'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border text-center',
                      isSelected
                        ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                      {isSelected && <CheckIcon className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Groups */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Age Groups
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AGE_GROUP_OPTIONS.map((option) => {
                const isSelected = criteria.age_groups?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleMultiSelectChange(
                        'age_groups',
                        option.value,
                        criteria.age_groups,
                      )
                    }
                    className={cn(
                      'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border text-center',
                      isSelected
                        ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                      {isSelected && <CheckIcon className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Requirements */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Special Requirements
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() =>
                    handleBooleanChange(
                      'has_plus_one',
                      criteria.has_plus_one === true ? undefined : true,
                    )
                  }
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border',
                    criteria.has_plus_one === true
                      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>👫</span>
                    <span>Has Plus One</span>
                    {criteria.has_plus_one === true && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleBooleanChange(
                      'has_dietary_restrictions',
                      criteria.has_dietary_restrictions === true
                        ? undefined
                        : true,
                    )
                  }
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border',
                    criteria.has_dietary_restrictions === true
                      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>🥗</span>
                    <span>Dietary Needs</span>
                    {criteria.has_dietary_restrictions === true && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleBooleanChange(
                      'has_special_needs',
                      criteria.has_special_needs === true ? undefined : true,
                    )
                  }
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border',
                    criteria.has_special_needs === true
                      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>♿</span>
                    <span>Special Needs</span>
                    {criteria.has_special_needs === true && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Advanced Filters
            </h3>
            <div className="space-y-4">
              {/* Custom Dietary Restrictions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Dietary Restrictions
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customDietaryRestrictions}
                    onChange={(e) =>
                      setCustomDietaryRestrictions(e.target.value)
                    }
                    placeholder="e.g., Vegetarian, Gluten-free"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                    onKeyPress={(e) =>
                      e.key === 'Enter' && addCustomDietaryRestriction()
                    }
                  />
                  <button
                    onClick={addCustomDietaryRestriction}
                    disabled={!customDietaryRestrictions.trim()}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-lg transition-all duration-200"
                  >
                    Add
                  </button>
                </div>
                {criteria.dietary_restrictions &&
                  criteria.dietary_restrictions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {criteria.dietary_restrictions.map((restriction) => (
                        <span
                          key={restriction}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {restriction}
                          <button
                            onClick={() =>
                              removeArrayItem(
                                'dietary_restrictions',
                                restriction,
                              )
                            }
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* Custom Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Tags
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                    placeholder="e.g., VIP, Local, Out-of-town"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  />
                  <button
                    onClick={addCustomTag}
                    disabled={!customTags.trim()}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-lg transition-all duration-200"
                  >
                    Add
                  </button>
                </div>
                {criteria.tags && criteria.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {criteria.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                      >
                        {tag}
                        <button
                          onClick={() => removeArrayItem('tags', tag)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Guest Preview
              </h3>
              <button
                onClick={handlePreviewClick}
                disabled={isLoadingPreview || selectedGuestCount === 0}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  selectedGuestCount === 0 || isLoadingPreview
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100',
                )}
              >
                {isLoadingPreview ? 'Loading...' : 'Preview'}
              </button>
            </div>

            <div className="text-center py-8">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {selectedGuestCount}
              </div>
              <div className="text-sm text-gray-600 mb-4">guests selected</div>

              {selectedGuestCount === 0 ? (
                <p className="text-sm text-gray-500">
                  Apply filters above to see selected guests
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${totalGuestCount > 0 ? (selectedGuestCount / totalGuestCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {totalGuestCount > 0
                      ? Math.round((selectedGuestCount / totalGuestCount) * 100)
                      : 0}
                    % of total guests
                  </p>
                </div>
              )}
            </div>

            {showPreview && previewGuests.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {previewGuests.slice(0, 10).map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-700">
                          {guest.first_name.charAt(0)}
                          {guest.last_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {guest.first_name} {guest.last_name}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                              RSVP_OPTIONS.find(
                                (opt) => opt.value === guest.rsvp_status,
                              )?.color || 'bg-gray-100 text-gray-800',
                            )}
                          >
                            {guest.rsvp_status}
                          </span>
                          {guest.dietary_restrictions && (
                            <span className="text-xs text-orange-600">🥗</span>
                          )}
                          {guest.plus_one && (
                            <span className="text-xs text-blue-600">👫</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {previewGuests.length > 10 && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      and {previewGuests.length - 10} more guests...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
