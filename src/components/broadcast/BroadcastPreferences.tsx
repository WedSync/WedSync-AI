'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Heart,
  Users,
  Settings2,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBroadcastPreferences } from '@/hooks/useBroadcastSubscription';

interface BroadcastPreferencesProps {
  userId: string;
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';
}

interface Preferences {
  systemBroadcasts: boolean;
  businessBroadcasts: boolean;
  collaborationBroadcasts: boolean;
  criticalOnly: boolean;
  deliveryChannels: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  weddingDaySettings: {
    enableCriticalOnly: boolean;
    disableNonEssential: boolean;
    enhancedNotifications: boolean;
  };
  roleSpecificSettings: {
    photographerTimeline: boolean;
    coordinatorOverview: boolean;
    supplierUpdates: boolean;
    coupleGentle: boolean;
  };
}

export function BroadcastPreferences({
  userId,
  userRole,
}: BroadcastPreferencesProps) {
  const {
    preferences: loadedPreferences,
    loading,
    updatePreferences,
  } = useBroadcastPreferences(userId);
  const [preferences, setPreferences] = useState<Preferences>({
    systemBroadcasts: true,
    businessBroadcasts: true,
    collaborationBroadcasts: true,
    criticalOnly: false,
    deliveryChannels: ['realtime', 'in_app'],
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    weddingDaySettings: {
      enableCriticalOnly: true,
      disableNonEssential: true,
      enhancedNotifications: true,
    },
    roleSpecificSettings: {
      photographerTimeline: userRole === 'photographer',
      coordinatorOverview: userRole === 'coordinator',
      supplierUpdates: userRole === 'supplier',
      coupleGentle: userRole === 'couple',
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update local state when preferences load
  useEffect(() => {
    if (loadedPreferences) {
      setPreferences(loadedPreferences);
    }
  }, [loadedPreferences]);

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const success = await updatePreferences(preferences);

      if (success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  // Role-based recommendations
  const getRoleRecommendations = () => {
    switch (userRole) {
      case 'coordinator':
        return {
          title: 'Wedding Coordinator Settings',
          description:
            'Recommended settings for managing multiple weddings efficiently',
          recommendations: [
            'Enable all broadcast types for complete oversight',
            'Set quiet hours to avoid disruptions during personal time',
            'Keep critical alerts always enabled for emergencies',
            'Wedding day enhanced notifications help monitor all vendors',
          ],
        };
      case 'photographer':
        return {
          title: 'Wedding Photographer Settings',
          description:
            'Optimized for timeline changes and payment notifications',
          recommendations: [
            'Enable timeline and payment broadcasts',
            'Set quiet hours during shooting times if needed',
            'Critical alerts help avoid missing important updates',
            'Wedding day critical-only mode prevents distractions',
          ],
        };
      case 'couple':
        return {
          title: 'Couple Settings',
          description:
            'Gentle notifications to keep you informed without overwhelm',
          recommendations: [
            'Consider enabling quiet hours for peaceful planning',
            'Business broadcasts help track vendor progress',
            'Collaboration broadcasts keep you in the loop',
            'Gentle mode reduces notification frequency',
          ],
        };
      case 'supplier':
        return {
          title: 'Supplier Settings',
          description: 'Stay updated on relevant wedding developments',
          recommendations: [
            'Enable collaboration broadcasts for wedding updates',
            'Business broadcasts inform about payment schedules',
            'Set quiet hours during business operations',
            'Critical alerts ensure you never miss urgent updates',
          ],
        };
      default:
        return {
          title: 'Notification Preferences',
          description: 'Customize how you receive wedding-related updates',
          recommendations: [],
        };
    }
  };

  const roleInfo = getRoleRecommendations();

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{roleInfo.title}</h1>
          {userRole && (
            <Badge variant="secondary">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          )}
        </div>
        <p className="text-gray-600">{roleInfo.description}</p>
      </div>

      <div className="space-y-6">
        {/* Broadcast Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Broadcast Types
            </CardTitle>
            <CardDescription>
              Choose which types of updates you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-broadcasts" className="font-medium">
                  System Broadcasts
                </Label>
                <p className="text-sm text-gray-600">
                  Platform updates, maintenance, and security alerts
                </p>
              </div>
              <Switch
                id="system-broadcasts"
                checked={preferences.systemBroadcasts}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    systemBroadcasts: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="business-broadcasts" className="font-medium">
                  Business Broadcasts
                </Label>
                <p className="text-sm text-gray-600">
                  Payment reminders, subscription updates, feature releases
                </p>
              </div>
              <Switch
                id="business-broadcasts"
                checked={preferences.businessBroadcasts}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    businessBroadcasts: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="collaboration-broadcasts"
                  className="font-medium"
                >
                  Collaboration Broadcasts
                </Label>
                <p className="text-sm text-gray-600">
                  Wedding timeline changes, vendor updates, team notifications
                </p>
              </div>
              <Switch
                id="collaboration-broadcasts"
                checked={preferences.collaborationBroadcasts}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    collaborationBroadcasts: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="critical-only" className="font-medium">
                  Critical Only Mode
                </Label>
                <p className="text-sm text-gray-600">
                  Only receive critical alerts that require immediate attention
                </p>
              </div>
              <Switch
                id="critical-only"
                checked={preferences.criticalOnly}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, criticalOnly: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Wedding Day Specific Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Wedding Day Settings
            </CardTitle>
            <CardDescription>
              Special settings that activate automatically on wedding days
              (Saturdays)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="wedding-critical-only" className="font-medium">
                  Critical Only on Wedding Days
                </Label>
                <p className="text-sm text-gray-600">
                  Automatically switch to critical-only mode on Saturdays
                </p>
              </div>
              <Switch
                id="wedding-critical-only"
                checked={preferences.weddingDaySettings.enableCriticalOnly}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    weddingDaySettings: {
                      ...prev.weddingDaySettings,
                      enableCriticalOnly: checked,
                    },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="disable-non-essential" className="font-medium">
                  Disable Non-Essential Notifications
                </Label>
                <p className="text-sm text-gray-600">
                  Block marketing and low-priority messages on wedding days
                </p>
              </div>
              <Switch
                id="disable-non-essential"
                checked={preferences.weddingDaySettings.disableNonEssential}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    weddingDaySettings: {
                      ...prev.weddingDaySettings,
                      disableNonEssential: checked,
                    },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enhanced-notifications" className="font-medium">
                  Enhanced Wedding Day Alerts
                </Label>
                <p className="text-sm text-gray-600">
                  Larger, more prominent notifications for wedding-related
                  updates
                </p>
              </div>
              <Switch
                id="enhanced-notifications"
                checked={preferences.weddingDaySettings.enhancedNotifications}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    weddingDaySettings: {
                      ...prev.weddingDaySettings,
                      enhancedNotifications: checked,
                    },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Delivery Channels
            </CardTitle>
            <CardDescription>
              How would you like to receive notifications?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: 'realtime',
                label: 'Real-time Toasts',
                description: 'Pop-up notifications while using the platform',
              },
              {
                id: 'in_app',
                label: 'In-App Inbox',
                description:
                  'Collect notifications in your inbox for later viewing',
              },
              {
                id: 'email',
                label: 'Email Notifications',
                description: 'Receive important updates via email',
              },
              {
                id: 'push',
                label: 'Push Notifications',
                description: 'Browser push notifications (when available)',
              },
            ].map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between"
              >
                <div>
                  <Label htmlFor={channel.id} className="font-medium">
                    {channel.label}
                  </Label>
                  <p className="text-sm text-gray-600">{channel.description}</p>
                </div>
                <Switch
                  id={channel.id}
                  checked={preferences.deliveryChannels.includes(channel.id)}
                  onCheckedChange={(checked) => {
                    setPreferences((prev) => ({
                      ...prev,
                      deliveryChannels: checked
                        ? [...prev.deliveryChannels, channel.id]
                        : prev.deliveryChannels.filter((c) => c !== channel.id),
                    }));
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Set times when you don't want to receive non-critical
              notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours" className="font-medium">
                Enable Quiet Hours
              </Label>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, enabled: checked },
                  }))
                }
              />
            </div>

            {preferences.quietHours.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Select
                      value={preferences.quietHours.start}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, start: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem
                            key={i}
                            value={`${i.toString().padStart(2, '0')}:00`}
                          >
                            {i === 0
                              ? '12:00 AM'
                              : i < 12
                                ? `${i}:00 AM`
                                : i === 12
                                  ? '12:00 PM'
                                  : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Select
                      value={preferences.quietHours.end}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, end: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem
                            key={i}
                            value={`${i.toString().padStart(2, '0')}:00`}
                          >
                            {i === 0
                              ? '12:00 AM'
                              : i < 12
                                ? `${i}:00 AM`
                                : i === 12
                                  ? '12:00 PM'
                                  : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>Note:</strong> Critical wedding alerts will always be
                  delivered regardless of quiet hours settings.
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Role Recommendations */}
        {roleInfo.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recommendations for {userRole}s
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roleInfo.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>

          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                ✓
              </div>
              Preferences saved successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
