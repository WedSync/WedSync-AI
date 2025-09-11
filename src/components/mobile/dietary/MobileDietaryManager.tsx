// WS-254 Team D: Mobile-First Dietary Management Interface
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PhoneIcon,
  UserIcon,
  ClipboardListIcon,
  ArrowLeftIcon,
  BellIcon,
  StarIcon,
  SearchIcon,
  FilterIcon,
  MenuIcon,
  RefreshCwIcon,
} from 'lucide-react';

// Import custom hooks
import {
  useTouch,
  useVibration,
  usePullToRefresh,
} from '@/hooks/mobile/useTouch';
import { useOffline, useDietaryCache } from '@/hooks/mobile/useOffline';
import { usePushNotifications } from '@/hooks/mobile/usePushNotifications';

// Import types
import type {
  DietaryRequirement,
  DietaryAlert,
  MobileDietaryManagerProps,
  MobileNavigationContext,
} from '@/types/dietary-management';

// Import sub-components (to be created)
import { MobileMenuGenerator } from './MobileMenuGenerator';
import { MobileAlertsPanel } from './MobileAlertsPanel';
import { MobileRequirementModal } from './MobileRequirementModal';
import { MobileAddRequirementForm } from './MobileAddRequirementForm';
import { MobileQuickActionsPanel } from './MobileQuickActionsPanel';

export function MobileDietaryManager({
  weddingId,
  requirements,
  onRequirementUpdate,
  className = '',
  isOffline: propIsOffline = false,
}: MobileDietaryManagerProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'requirements' | 'menu' | 'alerts'
  >('overview');
  const [selectedRequirement, setSelectedRequirement] =
    useState<DietaryRequirement | null>(null);
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<number | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [alerts, setAlerts] = useState<DietaryAlert[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { isOnline, queueAction } = useOffline();
  const { vibrate } = useVibration();
  const { sendDietaryAlert } = usePushNotifications();
  const { cachedData, fetchWithCache } = useDietaryCache();

  const isOffline = propIsOffline || !isOnline;

  // Pull to refresh functionality
  const { isRefreshing, pullDistance, refreshThreshold } = usePullToRefresh(
    async () => {
      await fetchRequirements();
    },
  );

  // Touch gesture handling
  const { touchEvents, gestureState } = useTouch({
    onSwipeLeft: () => navigateTab('next'),
    onSwipeRight: () => navigateTab('prev'),
    onLongPress: handleLongPress,
    enableHapticFeedback: true,
  });

  const highRiskRequirements = requirements.filter((r) => r.severity >= 4);
  const unverifiedRequirements = requirements.filter((r) => !r.verified);

  // Navigation context for mobile optimization
  const navigationContext: MobileNavigationContext = {
    screenSize: window.innerWidth < 768 ? 'mobile' : 'tablet',
    orientation:
      window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
    touchCapability: 'ontouchstart' in window,
    offlineMode: isOffline,
    currentStep: activeTab,
    totalSteps: 4,
  };

  useEffect(() => {
    // Auto-refresh when coming back online
    if (isOnline && requirements.length === 0) {
      fetchRequirements();
    }
  }, [isOnline]);

  useEffect(() => {
    // Generate alerts based on requirements
    generateAlerts();
  }, [requirements]);

  const fetchRequirements = async () => {
    try {
      const data = await fetchWithCache(
        `/api/catering/dietary/summary/${weddingId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          },
        },
      );

      if (data.requirements) {
        // Update requirements through parent callback
        data.requirements.forEach((req: DietaryRequirement) => {
          onRequirementUpdate?.(req);
        });
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
      vibrate([100, 100, 100]); // Error pattern
    }
  };

  const generateAlerts = () => {
    const newAlerts: DietaryAlert[] = [];

    requirements.forEach((req) => {
      // High risk alerts
      if (req.severity >= 4) {
        newAlerts.push({
          id: `high_risk_${req.id}`,
          type: 'high_risk',
          priority: req.severity === 5 ? 'critical' : 'high',
          message: `${req.guestName} has a ${req.severity === 5 ? 'critical' : 'high'} severity ${req.category}`,
          requirementId: req.id,
          guestName: req.guestName,
          actionRequired: 'Review and verify with catering team',
          dismissed: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Verification needed alerts
      if (!req.verified) {
        newAlerts.push({
          id: `unverified_${req.id}`,
          type: 'verification_needed',
          priority: req.severity >= 3 ? 'high' : 'medium',
          message: `${req.guestName}'s ${req.category} needs verification`,
          requirementId: req.id,
          guestName: req.guestName,
          actionRequired: 'Contact guest to verify dietary requirement',
          dismissed: false,
          createdAt: new Date().toISOString(),
        });
      }

      // Missing emergency contact for severe requirements
      if (req.severity >= 4 && !req.emergencyContact) {
        newAlerts.push({
          id: `emergency_contact_${req.id}`,
          type: 'emergency_contact_missing',
          priority: 'high',
          message: `${req.guestName} needs emergency contact for severe ${req.category}`,
          requirementId: req.id,
          guestName: req.guestName,
          actionRequired: 'Add emergency contact information',
          dismissed: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    setAlerts(newAlerts);
  };

  const navigateTab = (direction: 'next' | 'prev') => {
    const tabs = ['overview', 'requirements', 'menu', 'alerts'] as const;
    const currentIndex = tabs.indexOf(activeTab);

    if (direction === 'next' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      vibrate(50); // Light haptic feedback
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
      vibrate(50);
    }
  };

  const handleLongPress = (element: HTMLElement) => {
    if (element.dataset.requirementId) {
      setSelectedRequirement(
        requirements.find((r) => r.id === element.dataset.requirementId) ||
          null,
      );
      vibrate(100); // Medium haptic feedback
    }
  };

  const handleQuickAction = async (
    action: string,
    requirement?: DietaryRequirement,
  ) => {
    vibrate(75);

    switch (action) {
      case 'add_requirement':
        setIsAddingRequirement(true);
        break;

      case 'verify_requirement':
        if (requirement) {
          await updateRequirement({ ...requirement, verified: true });
        }
        break;

      case 'flag_urgent':
        if (requirement) {
          const updatedReq = {
            ...requirement,
            severity: Math.min(requirement.severity + 1, 5) as any,
          };
          await updateRequirement(updatedReq);

          // Send push notification for high priority
          if (updatedReq.severity >= 4) {
            await sendDietaryAlert(
              requirement.guestName,
              requirement.notes,
              requirement.severity === 5 ? 'critical' : 'high',
              requirement.emergencyContact,
            );
          }
        }
        break;

      case 'call_emergency':
        if (requirement?.emergencyContact) {
          window.location.href = `tel:${requirement.emergencyContact}`;
        }
        break;
    }
  };

  const updateRequirement = async (requirement: DietaryRequirement) => {
    if (isOffline) {
      queueAction('update_requirement', requirement);
      vibrate(200); // Strong feedback for offline action
      return;
    }

    try {
      const response = await fetch(
        `/api/catering/dietary/requirements/${requirement.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          },
          body: JSON.stringify(requirement),
        },
      );

      if (response.ok) {
        onRequirementUpdate?.(requirement);
        vibrate(100); // Success feedback
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Failed to update requirement:', error);
      vibrate([100, 100, 100]); // Error pattern
    }
  };

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      searchQuery === '' ||
      req.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.notes.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      filterSeverity === null || req.severity === filterSeverity;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-gray-50 ${className} ${gestureState.isSwipelocked ? 'overflow-x-hidden' : ''}`}
      {...touchEvents}
    >
      {/* Pull to Refresh Indicator */}
      <div
        className={`pull-refresh ${pullDistance > refreshThreshold ? 'visible' : ''}`}
        style={{
          transform: `translateY(${Math.min(pullDistance - 60, 20)}px)`,
          opacity: pullDistance / refreshThreshold,
        }}
      >
        <RefreshCwIcon
          className={`h-5 w-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner visible">
          Working offline - changes will sync when connection is restored
        </div>
      )}

      {/* Mobile Status Bar */}
      <div className="mobile-nav">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              className="touch-target"
              onClick={() => window.history.back()}
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-lg">Dietary Management</h1>
          </div>

          <div className="flex items-center space-x-2">
            {isOffline && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Offline
              </span>
            )}
            {highRiskRequirements.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {highRiskRequirements.length} High Risk
              </span>
            )}
            <button className="touch-target" aria-label="Notifications">
              <BellIcon className="h-5 w-5" />
              {alerts.filter((a) => !a.dismissed).length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t" role="tablist">
          {[
            { key: 'overview', icon: ClipboardListIcon, label: 'Overview' },
            { key: 'requirements', icon: UserIcon, label: 'Requirements' },
            { key: 'menu', icon: StarIcon, label: 'Menu' },
            { key: 'alerts', icon: AlertTriangleIcon, label: 'Alerts' },
          ].map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex flex-col items-center py-3 px-2 text-xs transition-colors touch-target ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600'
              }`}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
            >
              <tab.icon className="h-5 w-5 mb-1" />
              <span>{tab.label}</span>
              {tab.key === 'alerts' &&
                alerts.filter((a) => !a.dismissed).length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20">
        {' '}
        {/* Extra padding for FAB */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
              role="tabpanel"
              id="panel-overview"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="mobile-card bg-white p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {requirements.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Requirements
                  </div>
                </div>

                <div className="mobile-card bg-white p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {highRiskRequirements.length}
                  </div>
                  <div className="text-sm text-gray-600">High Risk</div>
                </div>
              </div>

              {/* High Priority Alerts */}
              {highRiskRequirements.length > 0 && (
                <div className="mobile-card border-red-200 bg-red-50">
                  <div className="p-4 border-b border-red-200">
                    <div className="flex items-center space-x-2">
                      <AlertTriangleIcon className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">
                        High Priority Guests
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {highRiskRequirements.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        data-requirement-id={req.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200 touch-target"
                        onClick={() => setSelectedRequirement(req)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {req.guestName}
                          </div>
                          <div className="text-sm text-red-600">
                            {req.notes}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`severity-indicator severity-${req.severity}`}
                          >
                            {req.severity}
                          </span>
                          {req.emergencyContact && (
                            <button
                              className="p-2 border border-gray-300 rounded-lg touch-target"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAction('call_emergency', req);
                              }}
                              aria-label={`Call emergency contact for ${req.guestName}`}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  className="h-20 flex flex-col items-center justify-center space-y-2 touch-target bg-blue-600 text-white rounded-lg"
                  onClick={() => handleQuickAction('add_requirement')}
                >
                  <PlusIcon className="h-6 w-6" />
                  <span>Add Requirement</span>
                </button>

                <button
                  className="h-20 flex flex-col items-center justify-center space-y-2 touch-target border border-gray-300 bg-white rounded-lg"
                  onClick={() => setActiveTab('menu')}
                >
                  <StarIcon className="h-6 w-6" />
                  <span>Generate Menu</span>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'requirements' && (
            <motion.div
              key="requirements"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
              role="tabpanel"
              id="panel-requirements"
            >
              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search guests or requirements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mobile-form-input pl-10 w-full border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FilterIcon className="h-4 w-4 text-gray-500" />
                  <div className="flex space-x-2 overflow-x-auto">
                    <button
                      className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                        filterSeverity === null
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      onClick={() => setFilterSeverity(null)}
                    >
                      All
                    </button>
                    {[5, 4, 3, 2, 1].map((level) => (
                      <button
                        key={level}
                        className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                          filterSeverity === level
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => setFilterSeverity(level)}
                      >
                        Level {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Requirements List */}
              <div className="space-y-3">
                {filteredRequirements.map((requirement) => (
                  <motion.div
                    key={requirement.id}
                    layout
                    data-requirement-id={requirement.id}
                    className="mobile-card bg-white p-4 touch-target"
                    onClick={() => setSelectedRequirement(requirement)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {requirement.guestName}
                          </span>
                          <span
                            className={`severity-indicator severity-${requirement.severity}`}
                          >
                            {requirement.severity}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <span className="capitalize font-medium">
                            {requirement.category}
                          </span>
                          {requirement.notes && (
                            <span> - {requirement.notes}</span>
                          )}
                        </div>

                        {requirement.emergencyContact && (
                          <div className="flex items-center text-sm text-red-600">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            Emergency: {requirement.emergencyContact}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        {requirement.verified ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <button
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded touch-target"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(
                                'verify_requirement',
                                requirement,
                              );
                            }}
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions for High Risk */}
                    {requirement.severity >= 4 && (
                      <div className="flex space-x-2 mt-3 pt-3 border-t">
                        <button
                          className="flex-1 py-2 border border-gray-300 text-sm rounded touch-target"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction('flag_urgent', requirement);
                          }}
                        >
                          Flag Urgent
                        </button>
                        {requirement.emergencyContact && (
                          <button
                            className="flex-1 py-2 bg-red-600 text-white text-sm rounded touch-target"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction('call_emergency', requirement);
                            }}
                          >
                            <PhoneIcon className="h-4 w-4 mr-1 inline" />
                            Call
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}

                {filteredRequirements.length === 0 && (
                  <div className="text-center py-8">
                    <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchQuery || filterSeverity
                        ? 'No requirements match your filters.'
                        : 'No dietary requirements added yet.'}
                    </p>
                    {!searchQuery && !filterSeverity && (
                      <button
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded touch-target"
                        onClick={() => handleQuickAction('add_requirement')}
                      >
                        Add First Requirement
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
              role="tabpanel"
              id="panel-menu"
            >
              <MobileMenuGenerator
                weddingId={weddingId}
                requirements={requirements}
              />
            </motion.div>
          )}

          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
              role="tabpanel"
              id="panel-alerts"
            >
              <MobileAlertsPanel
                alerts={alerts}
                onActionRequired={(action, requirement) =>
                  handleQuickAction(action, requirement)
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="fab bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => handleQuickAction('add_requirement')}
          aria-label="Add new dietary requirement"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedRequirement && (
          <MobileRequirementModal
            requirement={selectedRequirement}
            onClose={() => setSelectedRequirement(null)}
            onUpdate={updateRequirement}
            onQuickAction={handleQuickAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingRequirement && (
          <MobileAddRequirementForm
            weddingId={weddingId}
            onClose={() => setIsAddingRequirement(false)}
            onAdd={(requirement) => {
              onRequirementUpdate?.(requirement);
              setIsAddingRequirement(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickActions && (
          <MobileQuickActionsPanel
            onAction={handleQuickAction}
            onClose={() => setShowQuickActions(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
