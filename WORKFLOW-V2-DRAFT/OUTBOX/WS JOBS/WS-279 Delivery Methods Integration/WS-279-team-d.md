# WS-279 Delivery Methods Integration - Team D Comprehensive Prompt
**Team D: Platform/WedMe Integration Specialists**

## 🎯 Your Mission: Mobile-First Notification Control & WedMe Growth
You are the **Platform/WedMe specialists** responsible for integrating notification delivery preferences into the WedMe couple platform and ensuring seamless mobile notification management. Your focus: **iPhone Settings-quality notification control that drives WedMe adoption through viral notification sharing features**.

## 💝 The Mobile Notification Platform Challenge
**Context**: Emma is managing wedding planning notifications while dress shopping on her phone. She needs to quickly enable SMS alerts for venue changes, mute email notifications during the ceremony, and share notification updates with her wedding party. **Your mobile platform makes notification management as intuitive as iPhone Do Not Disturb settings**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/apps/wedme/components/notifications/MobileNotificationCenter.tsx`** - Mobile notification management hub
2. **`/src/apps/wedme/components/notifications/QuickNotificationToggle.tsx`** - One-tap notification controls
3. **`/src/apps/wedme/hooks/useNotificationPreferences.tsx`** - Mobile notification state management
4. **`/src/apps/wedme/lib/notifications/mobile-delivery-manager.ts`** - Mobile-optimized delivery logic
5. **`/src/apps/wedme/components/sharing/NotificationSharingWidget.tsx`** - Viral notification sharing

### 📱 Mobile Platform Requirements:
- **One-Tap Controls**: Quick enable/disable for each notification type
- **Smart Scheduling**: Wedding day notification automation (quiet hours, ceremony silence)
- **Offline Queue Management**: Handle notifications when phone is offline at venues
- **Push Notification Integration**: Native iOS/Android push notification setup
- **WedMe Social Features**: Share notification preferences with wedding party
- **Battery Optimization**: Minimal impact on phone battery during wedding day

Your platform turns notification management into a delightful mobile experience that couples actually want to use.

## 📱 Core Mobile Platform Components

### Mobile Notification Center
```typescript
'use client';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Calendar,
  Moon,
  Sun,
  Share2,
  Settings,
  ChevronRight
} from 'lucide-react';
import { useNotificationPreferences } from '@/apps/wedme/hooks/useNotificationPreferences';
import { motion } from 'framer-motion';

interface MobileNotificationCenterProps {
  userId: string;
  weddingId?: string;
  isWeddingDay?: boolean;
}

export function MobileNotificationCenter({ 
  userId, 
  weddingId, 
  isWeddingDay = false 
}: MobileNotificationCenterProps) {
  const {
    preferences,
    isLoading,
    updatePreference,
    enableQuietHours,
    disableQuietHours,
    enableWeddingDayMode,
    sharePreferences
  } = useNotificationPreferences(userId);

  const [quickMode, setQuickMode] = useState<'all' | 'urgent' | 'none'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Wedding-specific notification types for couples
  const coupleNotificationTypes = [
    {
      id: 'vendor_updates',
      label: 'Vendor Updates',
      description: 'Updates from photographers, venues, caterers',
      icon: <MessageSquare className="h-5 w-5" />,
      priority: 'normal',
      weddingContext: 'Stay connected with your wedding team',
      defaultMethods: ['push', 'email']
    },
    {
      id: 'timeline_changes',
      label: 'Timeline Changes',
      description: 'Changes to ceremony or reception timing',
      icon: <Calendar className="h-5 w-5" />,
      priority: 'high',
      weddingContext: 'Critical for day-of coordination',
      defaultMethods: ['push', 'sms', 'email']
    },
    {
      id: 'guest_responses',
      label: 'Guest Responses',
      description: 'RSVP updates and guest communications',
      icon: <Bell className="h-5 w-5" />,
      priority: 'normal',
      weddingContext: 'Track your guest count',
      defaultMethods: ['push', 'email']
    },
    {
      id: 'wedding_reminders',
      label: 'Wedding Reminders',
      description: 'Task deadlines and important dates',
      icon: <Calendar className="h-5 w-5" />,
      priority: 'normal',
      weddingContext: 'Never miss a deadline',
      defaultMethods: ['push']
    },
    {
      id: 'emergency_alerts',
      label: 'Emergency Alerts',
      description: 'Urgent wedding day issues',
      icon: <BellOff className="h-5 w-5 text-red-500" />,
      priority: 'urgent',
      weddingContext: 'Wedding day crisis management',
      defaultMethods: ['push', 'sms', 'email']
    }
  ];

  const deliveryMethods = [
    {
      id: 'push',
      label: 'Push',
      description: 'Mobile notifications',
      icon: <Smartphone className="h-4 w-4" />,
      fastSetup: true
    },
    {
      id: 'email',
      label: 'Email',
      description: 'Detailed updates',
      icon: <Mail className="h-4 w-4" />,
      fastSetup: false
    },
    {
      id: 'sms',
      label: 'SMS',
      description: 'Text messages',
      icon: <MessageSquare className="h-4 w-4" />,
      fastSetup: false
    }
  ];

  // Quick mode handlers
  const handleQuickMode = (mode: 'all' | 'urgent' | 'none') => {
    setQuickMode(mode);
    
    coupleNotificationTypes.forEach(type => {
      const enableMethods = {
        all: type.defaultMethods,
        urgent: type.priority === 'urgent' ? ['push', 'sms'] : [],
        none: []
      };
      
      deliveryMethods.forEach(method => {
        const shouldEnable = enableMethods[mode].includes(method.id);
        updatePreference(type.id, method.id, shouldEnable);
      });
    });
  };

  const isMethodEnabled = (notificationType: string, method: string): boolean => {
    const pref = preferences.find(p => p.notificationType === notificationType);
    return pref?.deliveryMethods?.[method] || false;
  };

  const getEnabledMethodsCount = (notificationType: string): number => {
    return deliveryMethods.filter(method => 
      isMethodEnabled(notificationType, method.id)
    ).length;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Notifications
            </h1>
            <p className="text-sm text-gray-600">
              Control your wedding updates
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sharePreferences()}
            className="flex items-center space-x-2"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>

        {/* Wedding Day Alert */}
        {isWeddingDay && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-rose-600" />
              <div className="text-sm text-rose-800">
                <strong>It's your wedding day!</strong> 
                <p>Essential notifications only.</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Mode Controls */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Quick Settings</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'all', label: 'All Updates', icon: Bell },
            { id: 'urgent', label: 'Urgent Only', icon: BellOff },
            { id: 'none', label: 'Silent', icon: Moon }
          ].map(mode => {
            const IconComponent = mode.icon;
            const isActive = quickMode === mode.id;
            
            return (
              <Button
                key={mode.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickMode(mode.id as any)}
                className="flex flex-col items-center space-y-1 h-auto py-3"
              >
                <IconComponent className="h-4 w-4" />
                <span className="text-xs">{mode.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-2 p-4">
        {coupleNotificationTypes.map(type => {
          const enabledCount = getEnabledMethodsCount(type.id);
          
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        {type.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {type.label}
                          </h3>
                          {type.priority === 'urgent' && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {type.description}
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {type.weddingContext}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {enabledCount} method{enabledCount !== 1 ? 's' : ''}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Quick toggle for each delivery method */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {deliveryMethods.map(method => {
                      const isEnabled = isMethodEnabled(type.id, method.id);
                      
                      return (
                        <div
                          key={method.id}
                          className={`
                            flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors
                            ${isEnabled 
                              ? 'border-blue-200 bg-blue-50' 
                              : 'border-gray-200 bg-gray-50'
                            }
                          `}
                          onClick={() => updatePreference(type.id, method.id, !isEnabled)}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            {method.icon}
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => 
                                updatePreference(type.id, method.id, checked)
                              }
                              size="sm"
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {method.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Advanced Settings */}
      <div className="bg-white border-t border-gray-200 p-4">
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between"
        >
          <span>Advanced Settings</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${
            showAdvanced ? 'rotate-90' : ''
          }`} />
        </Button>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3"
          >
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">Quiet Hours</div>
                <div className="text-sm text-gray-600">10 PM - 8 AM</div>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">Wedding Day Mode</div>
                <div className="text-sm text-gray-600">Urgent only during ceremony</div>
              </div>
              <Switch checked={isWeddingDay} />
            </div>
            
            <Button
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Full Settings</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Safe Area */}
      <div className="h-8"></div>
    </div>
  );
}
```

### Quick Notification Toggle Component
```typescript
'use client';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Moon, Sun, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickNotificationToggleProps {
  currentMode: 'all' | 'urgent' | 'none';
  onModeChange: (mode: 'all' | 'urgent' | 'none') => void;
  isWeddingDay?: boolean;
  nextWeddingEvent?: {
    name: string;
    startTime: Date;
    isQuietPeriod: boolean;
  };
}

export function QuickNotificationToggle({
  currentMode,
  onModeChange,
  isWeddingDay = false,
  nextWeddingEvent
}: QuickNotificationToggleProps) {
  const [isChanging, setIsChanging] = useState(false);

  const modes = [
    {
      id: 'all',
      label: 'All Updates',
      description: 'Receive all wedding notifications',
      icon: Bell,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'urgent',
      label: 'Urgent Only',
      description: 'Only emergency wedding alerts',
      icon: Zap,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'none',
      label: 'Silent Mode',
      description: 'No notifications (not recommended)',
      icon: Moon,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  const handleModeChange = async (newMode: 'all' | 'urgent' | 'none') => {
    if (newMode === currentMode || isChanging) return;
    
    setIsChanging(true);
    
    try {
      await onModeChange(newMode);
      
      // Show success feedback
      const successElement = document.createElement('div');
      successElement.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successElement.textContent = `Switched to ${modes.find(m => m.id === newMode)?.label}`;
      document.body.appendChild(successElement);
      
      setTimeout(() => {
        document.body.removeChild(successElement);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to change notification mode:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const getCurrentMode = () => modes.find(m => m.id === currentMode)!;
  const currentModeConfig = getCurrentMode();
  const IconComponent = currentModeConfig.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Current Mode Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${currentModeConfig.bgColor}`}>
            <IconComponent className={`h-5 w-5 ${currentModeConfig.textColor}`} />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {currentModeConfig.label}
            </div>
            <div className="text-sm text-gray-600">
              {currentModeConfig.description}
            </div>
          </div>
        </div>
        
        {isWeddingDay && (
          <Badge variant="outline" className="text-rose-600 border-rose-200">
            Wedding Day
          </Badge>
        )}
      </div>

      {/* Next Event Alert */}
      {nextWeddingEvent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            p-3 rounded-lg mb-4 border
            ${nextWeddingEvent.isQuietPeriod 
              ? 'bg-purple-50 border-purple-200' 
              : 'bg-blue-50 border-blue-200'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            <div className={`
              w-2 h-2 rounded-full animate-pulse
              ${nextWeddingEvent.isQuietPeriod ? 'bg-purple-500' : 'bg-blue-500'}
            `}></div>
            <div className="text-sm">
              <strong>Next:</strong> {nextWeddingEvent.name}
              <div className="text-xs text-gray-600">
                {nextWeddingEvent.startTime.toLocaleTimeString()} - 
                {nextWeddingEvent.isQuietPeriod ? ' Quiet period' : ' Normal notifications'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mode Selection */}
      <div className="space-y-2">
        {modes.map(mode => {
          const ModeIcon = mode.icon;
          const isSelected = currentMode === mode.id;
          
          return (
            <motion.div
              key={mode.id}
              whileTap={{ scale: 0.98 }}
              className={`
                p-3 rounded-lg border-2 cursor-pointer transition-all
                ${isSelected 
                  ? `border-blue-500 ${mode.bgColor}` 
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }
              `}
              onClick={() => handleModeChange(mode.id as any)}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-lg transition-colors
                  ${isSelected ? mode.color : 'bg-gray-200'}
                `}>
                  <ModeIcon className={`h-4 w-4 ${
                    isSelected ? 'text-white' : 'text-gray-500'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium ${
                    isSelected ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {mode.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {mode.description}
                  </div>
                </div>
                
                <Switch
                  checked={isSelected}
                  disabled={isChanging}
                  onChange={() => handleModeChange(mode.id as any)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Warning for Silent Mode */}
      <AnimatePresence>
        {currentMode === 'none' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <BellOff className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <strong>Warning:</strong> You won't receive any wedding notifications. 
                You might miss important updates from vendors or timeline changes.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={isChanging}
        >
          Test Notifications
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={isChanging}
        >
          Schedule Quiet Time
        </Button>
      </div>
    </div>
  );
}
```

### Mobile Notification State Management Hook
```typescript
// File: /src/apps/wedme/hooks/useNotificationPreferences.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

interface NotificationPreference {
  notificationType: string;
  deliveryMethods: Record<string, boolean>;
  priorityThresholds: Record<string, string[]>;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  businessHours?: {
    enabled: boolean;
    start: string;
    end: string;
    days: number[];
  };
}

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreference[];
  isLoading: boolean;
  error: string | null;
  updatePreference: (notificationType: string, method: string, enabled: boolean) => Promise<void>;
  batchUpdatePreferences: (updates: Array<{type: string; method: string; enabled: boolean}>) => Promise<void>;
  enableQuietHours: (start: string, end: string) => Promise<void>;
  disableQuietHours: () => Promise<void>;
  enableWeddingDayMode: () => Promise<void>;
  disableWeddingDayMode: () => Promise<void>;
  sharePreferences: () => Promise<void>;
  testNotification: (method: string) => Promise<void>;
  getDeliveryStatus: (method: string) => 'connected' | 'pending' | 'error';
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useNotificationPreferences(userId: string): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading notification preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePreference = useCallback(async (
    notificationType: string, 
    method: string, 
    enabled: boolean
  ) => {
    try {
      // Optimistic update
      setPreferences(prev => 
        prev.map(pref => 
          pref.notificationType === notificationType
            ? {
                ...pref,
                deliveryMethods: {
                  ...pref.deliveryMethods,
                  [method]: enabled
                }
              }
            : pref
        )
      );

      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          notificationType,
          deliveryMethods: { [method]: enabled }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }

      // Trigger haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

    } catch (err) {
      console.error('Error updating preference:', err);
      // Revert optimistic update
      await loadPreferences();
      throw err;
    }
  }, [loadPreferences]);

  const batchUpdatePreferences = useCallback(async (
    updates: Array<{type: string; method: string; enabled: boolean}>
  ) => {
    try {
      // Optimistic updates
      setPreferences(prev => {
        const updated = [...prev];
        
        updates.forEach(update => {
          const prefIndex = updated.findIndex(p => p.notificationType === update.type);
          if (prefIndex >= 0) {
            updated[prefIndex] = {
              ...updated[prefIndex],
              deliveryMethods: {
                ...updated[prefIndex].deliveryMethods,
                [update.method]: update.enabled
              }
            };
          }
        });
        
        return updated;
      });

      const response = await fetch('/api/notifications/preferences/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        throw new Error('Failed to batch update preferences');
      }

      // Longer haptic feedback for batch operations
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
      }

    } catch (err) {
      console.error('Error batch updating preferences:', err);
      // Revert optimistic updates
      await loadPreferences();
      throw err;
    }
  }, [loadPreferences]);

  const enableQuietHours = useCallback(async (start: string, end: string) => {
    try {
      const response = await fetch('/api/notifications/quiet-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          enabled: true,
          start,
          end,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enable quiet hours');
      }

      await loadPreferences();

    } catch (err) {
      console.error('Error enabling quiet hours:', err);
      throw err;
    }
  }, [loadPreferences]);

  const disableQuietHours = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/quiet-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({ enabled: false })
      });

      if (!response.ok) {
        throw new Error('Failed to disable quiet hours');
      }

      await loadPreferences();

    } catch (err) {
      console.error('Error disabling quiet hours:', err);
      throw err;
    }
  }, [loadPreferences]);

  const enableWeddingDayMode = useCallback(async () => {
    try {
      // Wedding day mode: urgent notifications only, all methods enabled
      const weddingDayUpdates = [
        { type: 'emergency_alerts', method: 'push', enabled: true },
        { type: 'emergency_alerts', method: 'sms', enabled: true },
        { type: 'emergency_alerts', method: 'email', enabled: true },
        { type: 'timeline_changes', method: 'push', enabled: true },
        { type: 'timeline_changes', method: 'sms', enabled: true },
        { type: 'vendor_updates', method: 'push', enabled: false },
        { type: 'vendor_updates', method: 'email', enabled: false },
        { type: 'guest_responses', method: 'push', enabled: false },
        { type: 'wedding_reminders', method: 'push', enabled: false }
      ];

      await batchUpdatePreferences(weddingDayUpdates);

    } catch (err) {
      console.error('Error enabling wedding day mode:', err);
      throw err;
    }
  }, [batchUpdatePreferences]);

  const disableWeddingDayMode = useCallback(async () => {
    try {
      // Restore normal notification settings
      await loadPreferences();
    } catch (err) {
      console.error('Error disabling wedding day mode:', err);
      throw err;
    }
  }, [loadPreferences]);

  const sharePreferences = useCallback(async () => {
    try {
      if (!navigator.share) {
        // Fallback to copying link to clipboard
        const shareText = `Check out my wedding notification preferences on WedMe! Join me: ${window.location.origin}/join?ref=${userId}`;
        await navigator.clipboard.writeText(shareText);
        
        // Show toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50';
        toast.textContent = 'Link copied to clipboard!';
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 2000);
        
        return;
      }

      await navigator.share({
        title: 'WedMe - Wedding Notifications',
        text: 'Join me on WedMe for seamless wedding coordination!',
        url: `${window.location.origin}/join?ref=${userId}`
      });

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing preferences:', err);
      }
    }
  }, [userId]);

  const testNotification = useCallback(async (method: string) => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          method,
          testMessage: 'Test notification from WedMe - your wedding coordination app!'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to test ${method} notification`);
      }

      // Success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }

    } catch (err) {
      console.error(`Error testing ${method} notification:`, err);
      throw err;
    }
  }, []);

  const getDeliveryStatus = useCallback((method: string): 'connected' | 'pending' | 'error' => {
    // This would check the actual connection status for each method
    // For now, return mock status based on method
    switch (method) {
      case 'push':
        return 'connected'; // Push notifications are usually easy to set up
      case 'email':
        return 'connected'; // Email is typically pre-configured
      case 'sms':
        return 'pending'; // SMS might require verification
      default:
        return 'error';
    }
  }, []);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    batchUpdatePreferences,
    enableQuietHours,
    disableQuietHours,
    enableWeddingDayMode,
    disableWeddingDayMode,
    sharePreferences,
    testNotification,
    getDeliveryStatus
  };
}
```

### Notification Sharing Widget
```typescript
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Copy, MessageCircle, Heart, Users, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface NotificationSharingWidgetProps {
  userId: string;
  weddingId: string;
  partnerName?: string;
  weddingDate?: Date;
}

export function NotificationSharingWidget({
  userId,
  weddingId,
  partnerName,
  weddingDate
}: NotificationSharingWidgetProps) {
  const [shareMode, setShareMode] = useState<'link' | 'qr' | 'social'>('link');
  const [isSharing, setIsSharing] = useState(false);

  const shareOptions = [
    {
      id: 'wedding_party',
      title: 'Wedding Party',
      description: 'Share with bridesmaids & groomsmen',
      icon: Users,
      color: 'bg-purple-500',
      message: `Join ${partnerName && 'me and ' + partnerName} on WedMe! Get real-time wedding updates and never miss a moment. 💍`
    },
    {
      id: 'family',
      title: 'Family Members',
      description: 'Share with parents & relatives',
      icon: Heart,
      color: 'bg-rose-500',
      message: `Stay connected with our wedding planning on WedMe! Get important updates and timeline changes. 👨‍👩‍👧‍👦`
    },
    {
      id: 'vendors',
      title: 'Wedding Vendors',
      description: 'Invite vendors to WedSync platform',
      icon: MessageCircle,
      color: 'bg-blue-500',
      message: `Join us on WedSync for seamless wedding coordination! Manage all communication in one place. 🎉`
    }
  ];

  const handleShare = async (option: typeof shareOptions[0]) => {
    setIsSharing(true);
    
    try {
      const shareUrl = `${window.location.origin}/join?ref=${userId}&type=${option.id}&wedding=${weddingId}`;
      
      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        await navigator.share({
          title: `${option.title} - Wedding Updates`,
          text: option.message,
          url: shareUrl
        });
      } else {
        // Fallback for desktop - copy to clipboard
        await navigator.clipboard.writeText(`${option.message}\n\n${shareUrl}`);
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        toast.innerHTML = `
          <div class="flex items-center space-x-2">
            <div class="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <span>Share link copied to clipboard!</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }

      // Track sharing analytics
      await fetch('/api/analytics/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          shareType: option.id,
          method: navigator.share ? 'native' : 'clipboard',
          weddingId
        })
      });

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Sharing failed:', error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const generateQRCode = async (url: string) => {
    // In a real implementation, you'd generate a QR code
    // For now, return a placeholder
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" fill="black">QR Code</text></svg>`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3">
          <Share2 className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-lg">Share Wedding Updates</CardTitle>
        <p className="text-sm text-gray-600">
          Keep everyone connected with real-time wedding notifications
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Share Options */}
        {shareOptions.map((option, index) => {
          const IconComponent = option.icon;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                <CardContent 
                  className="p-4"
                  onClick={() => handleShare(option)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${option.color} bg-opacity-10`}>
                      <IconComponent className={`h-5 w-5 text-gray-700`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {option.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {option.description}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      disabled={isSharing}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(option);
                      }}
                    >
                      {isSharing ? 'Sharing...' : 'Share'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Wedding Info */}
        {weddingDate && (
          <div className="mt-6 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {partnerName ? `You & ${partnerName}` : 'Your Wedding'}
              </div>
              <div className="text-sm text-gray-600">
                {weddingDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        )}

        {/* Growth Incentive */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="text-sm text-blue-800">
              <strong>Bonus:</strong> Each person who joins earns you premium features!
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center space-x-1"
            onClick={() => handleShare(shareOptions[0])}
          >
            <Copy className="h-3 w-3" />
            <span>Copy Link</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center space-x-1"
            onClick={async () => {
              const qrCode = await generateQRCode(`${window.location.origin}/join?ref=${userId}`);
              // Show QR code in modal or new screen
            }}
          >
            <Download className="h-3 w-3" />
            <span>QR Code</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## ✅ Acceptance Criteria Checklist

- [ ] **One-Tap Controls** instant enable/disable for each notification type with haptic feedback
- [ ] **Smart Wedding Day Scheduling** automatic quiet hours during ceremony and reception
- [ ] **Offline Queue Management** seamless notification handling when phone loses signal at venues
- [ ] **Native Push Integration** proper iOS/Android push notification setup with badges and sounds
- [ ] **WedMe Social Features** viral sharing of notification preferences with wedding party and vendors
- [ ] **Battery Optimization** minimal background processing with smart notification batching
- [ ] **Mobile-First UX** thumb-friendly interface optimized for one-handed phone usage
- [ ] **Real-time Status Updates** live delivery status indicators for each notification method
- [ ] **Wedding Context Awareness** notification types and priorities tailored to wedding coordination
- [ ] **Quick Mode Switching** instant switching between "All Updates," "Urgent Only," and "Silent Mode"
- [ ] **Haptic Feedback Integration** tactile confirmation for all notification preference changes
- [ ] **Growth Mechanism Integration** sharing features that drive WedMe platform adoption

Your platform makes notification management feel as intuitive as iPhone Settings while driving viral growth through seamless wedding coordination sharing.

**Remember**: Every notification preference shared could bring new couples to WedMe. Design for delight and virality! 📱💍