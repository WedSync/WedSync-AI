'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { TouchButton } from '../touch/TouchButton';
import { PullToRefresh } from '../touch/PullToRefresh';
import { MobileFieldEditor } from './MobileFieldEditor';
import { MobileFieldStatusIndicator } from './MobileFieldStatusIndicator';
import { MobileFieldSyncTracker } from './MobileFieldSyncTracker';
import { useCoreFieldsStore } from '@/lib/stores/coreFieldsStore';

interface MobileFieldManagerProps {
  category?: string;
  showCompletionStats?: boolean;
  onFieldUpdate?: (fieldKey: string, value: any) => void;
  className?: string;
}

interface FieldCategory {
  key: string;
  name: string;
  icon: string;
  description: string;
  progress: number;
  totalFields: number;
  completedFields: number;
}

export function MobileFieldManager({
  category,
  showCompletionStats = true,
  onFieldUpdate,
  className = '',
}: MobileFieldManagerProps) {
  const {
    fields,
    completionStats,
    isLoading,
    loadFields,
    updateField,
    validateFields,
    triggerSync,
  } = useCoreFieldsStore();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(
    new Map(),
  );

  // Mobile-optimized field categories
  const fieldCategories: FieldCategory[] = [
    {
      key: 'essential',
      name: 'Wedding Essentials',
      icon: '💍',
      description: 'Date, time, guest count',
      progress: 0,
      totalFields: 0,
      completedFields: 0,
    },
    {
      key: 'couple',
      name: 'Your Details',
      icon: '👫',
      description: 'Names, contact info',
      progress: 0,
      totalFields: 0,
      completedFields: 0,
    },
    {
      key: 'venue',
      name: 'Venue Info',
      icon: '🏛️',
      description: 'Ceremony & reception locations',
      progress: 0,
      totalFields: 0,
      completedFields: 0,
    },
    {
      key: 'timeline',
      name: 'Schedule',
      icon: '⏰',
      description: 'Wedding day timeline',
      progress: 0,
      totalFields: 0,
      completedFields: 0,
    },
    {
      key: 'contact',
      name: 'Emergency Contacts',
      icon: '📞',
      description: 'Important contact details',
      progress: 0,
      totalFields: 0,
      completedFields: 0,
    },
  ];

  // Load fields on component mount
  useEffect(() => {
    loadFields(category);
  }, [category, loadFields]);

  // Calculate category progress
  const categoriesWithProgress = fieldCategories.map((cat) => {
    const categoryFields = fields.filter(
      (f) => f.definition.category === cat.key,
    );
    const completedCount = categoryFields.filter(
      (f) => f.status === 'completed',
    ).length;
    return {
      ...cat,
      totalFields: categoryFields.length,
      completedFields: completedCount,
      progress:
        categoryFields.length > 0
          ? Math.round((completedCount / categoryFields.length) * 100)
          : 0,
    };
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadFields(category);
      // Trigger sync for any pending changes
      if (pendingUpdates.size > 0) {
        await triggerSync(Array.from(pendingUpdates.keys()));
        setPendingUpdates(new Map());
      }
    } catch (error) {
      console.error('Failed to refresh fields:', error);
    }
    setIsRefreshing(false);
  }, [category, loadFields, pendingUpdates, triggerSync]);

  const handleFieldUpdate = async (
    fieldKey: string,
    value: any,
    reason?: string,
  ) => {
    try {
      // Add to pending updates for batch processing
      setPendingUpdates((prev) => new Map(prev.set(fieldKey, value)));

      // Validate before saving
      const validation = await validateFields({ [fieldKey]: value });
      if (!validation.isValid) {
        console.error('Validation failed:', validation.fieldErrors);
        return;
      }

      await updateField(fieldKey, value, reason, true);

      // Remove from pending updates on success
      setPendingUpdates((prev) => {
        const updated = new Map(prev);
        updated.delete(fieldKey);
        return updated;
      });

      onFieldUpdate?.(fieldKey, value);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const filteredFields = searchQuery
    ? fields.filter(
        (field) =>
          field.definition.fieldName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          field.definition.fieldDescription
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : fields;

  const activeCategoryFields = activeCategory
    ? filteredFields.filter((f) => f.definition.category === activeCategory)
    : filteredFields;

  if (isLoading && fields.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your wedding details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        {/* Mobile Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Wedding Details
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Complete your profile to sync with vendors
                </p>
              </div>
              <TouchButton
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-full bg-gray-100"
              >
                🔍
              </TouchButton>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="mt-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {/* Overall Progress */}
            {showCompletionStats && completionStats && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Overall Progress
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {completionStats.completionPercentage}%
                  </span>
                </div>
                <div className="bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${completionStats.completionPercentage}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>{completionStats.completedFields} completed</span>
                  <span>{completionStats.totalFields} total</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sync Status */}
        <MobileFieldSyncTracker />

        {/* Category Selection */}
        {!activeCategory && !searchQuery && (
          <div className="px-4 py-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Choose a section to update
            </h2>
            {categoriesWithProgress.map((cat) => (
              <TouchButton
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">{cat.name}</h3>
                      <p className="text-sm text-gray-500">{cat.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MobileFieldStatusIndicator
                      progress={cat.progress}
                      completed={cat.completedFields}
                      total={cat.totalFields}
                      size="sm"
                    />
                    <ChevronDownIcon className="h-5 w-5 text-gray-400 transform -rotate-90" />
                  </div>
                </div>
              </TouchButton>
            ))}
          </div>
        )}

        {/* Active Category Fields or Search Results */}
        {(activeCategory || searchQuery) && (
          <div className="px-4 py-6">
            {/* Back Button */}
            {activeCategory && !searchQuery && (
              <TouchButton
                onClick={() => setActiveCategory(null)}
                className="mb-4 flex items-center space-x-2 text-blue-600"
              >
                <ChevronDownIcon className="h-5 w-5 transform rotate-90" />
                <span>Back to categories</span>
              </TouchButton>
            )}

            {/* Field List */}
            <div className="space-y-4">
              {activeCategoryFields.map((field) => (
                <div
                  key={field.key}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
                >
                  <MobileFieldEditor
                    field={field}
                    onUpdate={handleFieldUpdate}
                    isPending={pendingUpdates.has(field.key)}
                  />
                </div>
              ))}

              {activeCategoryFields.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">📝</div>
                  <p className="text-gray-500">
                    {searchQuery
                      ? 'No fields match your search'
                      : 'No fields in this category'}
                  </p>
                </div>
              )}
            </div>

            {/* Batch Save Button */}
            {pendingUpdates.size > 0 && (
              <div className="fixed bottom-6 left-4 right-4">
                <TouchButton
                  onClick={() => triggerSync(Array.from(pendingUpdates.keys()))}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl shadow-lg"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ClockIcon className="h-5 w-5" />
                    <span>Sync {pendingUpdates.size} changes</span>
                  </div>
                </TouchButton>
              </div>
            )}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
