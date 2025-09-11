'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  PresenceSettings,
  PresenceSettingsProps,
  PresenceVisibility,
} from '@/types/presence';
import {
  Settings,
  Shield,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  UserX,
  Clock,
  MessageSquare,
  Globe,
  Lock,
  Info,
  Save,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

// Visibility options with descriptions
const visibilityOptions = [
  {
    value: 'everyone' as PresenceVisibility,
    label: 'Everyone',
    description: 'All users can see your presence status',
    icon: Globe,
    color: 'text-blue-600',
  },
  {
    value: 'team' as PresenceVisibility,
    label: 'Team Members',
    description:
      'Only wedding teams and organization members can see your status',
    icon: Users,
    color: 'text-green-600',
  },
  {
    value: 'contacts' as PresenceVisibility,
    label: 'Contacts Only',
    description: 'Only your direct contacts can see your status',
    icon: UserCheck,
    color: 'text-purple-600',
  },
  {
    value: 'nobody' as PresenceVisibility,
    label: 'Nobody',
    description: 'Your presence status is completely private',
    icon: Lock,
    color: 'text-red-600',
  },
];

// Common wedding status templates with emojis
const statusTemplates = [
  { emoji: '📸', text: 'At venue - ceremony prep' },
  { emoji: '🏛️', text: 'On-site coordination' },
  { emoji: '🌸', text: 'Flower delivery in progress' },
  { emoji: '🍰', text: 'Kitchen prep - available after 3pm' },
  { emoji: '🎵', text: 'Sound check complete' },
  { emoji: '📱', text: 'Available to chat' },
  { emoji: '🚨', text: 'Handling emergency' },
  { emoji: '✨', text: 'Available for coordination' },
  { emoji: '📋', text: 'Timeline review' },
  { emoji: '💬', text: 'Free to talk now' },
];

export function PresenceSettings({
  userId,
  onSave,
  onCancel,
  className,
}: PresenceSettingsProps) {
  const { user } = useAuth();
  const supabase = createClient();

  // Form state
  const [settings, setSettings] = useState<PresenceSettings>({
    userId: userId,
    visibility: 'team',
    appearOffline: false,
    allowActivityTracking: true,
    showCurrentPage: false,
    showCustomStatus: true,
    allowTypingIndicators: true,
    blockedUsers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customStatus, setCustomStatus] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [newBlockedUser, setNewBlockedUser] = useState('');
  const [showStatusTemplates, setShowStatusTemplates] = useState(false);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_presence_settings')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // Not found error
          throw fetchError;
        }

        if (data) {
          setSettings({
            userId: data.user_id,
            visibility: data.visibility || 'team',
            appearOffline: data.appear_offline || false,
            allowActivityTracking: data.allow_activity_tracking ?? true,
            showCurrentPage: data.show_current_page || false,
            showCustomStatus: data.show_custom_status ?? true,
            allowTypingIndicators: data.allow_typing_indicators ?? true,
            blockedUsers: data.blocked_users || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      } catch (err) {
        setError(
          `Failed to load settings: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId, supabase]);

  // Handle settings change
  const handleSettingChange = useCallback(
    <K extends keyof PresenceSettings>(key: K, value: PresenceSettings[K]) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  // Save settings
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const { error: saveError } = await supabase
        .from('user_presence_settings')
        .upsert(
          {
            user_id: settings.userId,
            visibility: settings.visibility,
            appear_offline: settings.appearOffline,
            allow_activity_tracking: settings.allowActivityTracking,
            show_current_page: settings.showCurrentPage,
            show_custom_status: settings.showCustomStatus,
            allow_typing_indicators: settings.allowTypingIndicators,
            blocked_users: settings.blockedUsers,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

      if (saveError) {
        throw saveError;
      }

      onSave?.(settings);
    } catch (err) {
      setError(
        `Failed to save settings: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setSaving(false);
    }
  }, [settings, supabase, onSave]);

  // Add blocked user
  const handleAddBlockedUser = useCallback(() => {
    if (
      newBlockedUser.trim() &&
      !settings.blockedUsers?.includes(newBlockedUser.trim())
    ) {
      handleSettingChange('blockedUsers', [
        ...(settings.blockedUsers || []),
        newBlockedUser.trim(),
      ]);
      setNewBlockedUser('');
    }
  }, [newBlockedUser, settings.blockedUsers, handleSettingChange]);

  // Remove blocked user
  const handleRemoveBlockedUser = useCallback(
    (userToRemove: string) => {
      handleSettingChange(
        'blockedUsers',
        settings.blockedUsers?.filter((u) => u !== userToRemove) || [],
      );
    },
    [settings.blockedUsers, handleSettingChange],
  );

  // Apply status template
  const applyStatusTemplate = useCallback(
    (template: (typeof statusTemplates)[0]) => {
      setCustomEmoji(template.emoji);
      setCustomStatus(template.text);
      setShowStatusTemplates(false);
    },
    [],
  );

  if (loading) {
    return (
      <Card className={cn('w-full max-w-2xl', className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            Loading presence settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Presence Settings
        </CardTitle>
        <CardDescription>
          Control who can see your online status and activity information
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <div>{error}</div>
          </Alert>
        )}

        {/* Privacy Visibility */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <Label className="text-base font-semibold">
              Privacy Visibility
            </Label>
          </div>

          <Select
            value={settings.visibility}
            onValueChange={(value: PresenceVisibility) =>
              handleSettingChange('visibility', value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visibility level" />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className={cn('w-4 h-4', option.color)} />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Presence Controls */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Presence Controls</Label>

          <div className="space-y-4">
            {/* Appear Offline */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  <Label htmlFor="appear-offline">Appear Offline</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Always show as offline, regardless of your actual status
                </p>
              </div>
              <Switch
                id="appear-offline"
                checked={settings.appearOffline}
                onCheckedChange={(checked) =>
                  handleSettingChange('appearOffline', checked)
                }
              />
            </div>

            {/* Activity Tracking */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <Label htmlFor="activity-tracking">Activity Tracking</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically update status based on mouse/keyboard activity
                </p>
              </div>
              <Switch
                id="activity-tracking"
                checked={settings.allowActivityTracking}
                onCheckedChange={(checked) =>
                  handleSettingChange('allowActivityTracking', checked)
                }
              />
            </div>

            {/* Show Current Page */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <Label htmlFor="show-page">Show Current Page</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Let others see which page you're currently viewing
                </p>
              </div>
              <Switch
                id="show-page"
                checked={settings.showCurrentPage}
                onCheckedChange={(checked) =>
                  handleSettingChange('showCurrentPage', checked)
                }
              />
            </div>

            {/* Custom Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <Label htmlFor="custom-status">Show Custom Status</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Allow others to see your custom status messages
                </p>
              </div>
              <Switch
                id="custom-status"
                checked={settings.showCustomStatus}
                onCheckedChange={(checked) =>
                  handleSettingChange('showCustomStatus', checked)
                }
              />
            </div>

            {/* Typing Indicators */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <Label htmlFor="typing-indicators">Typing Indicators</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show when you're typing messages to other users
                </p>
              </div>
              <Switch
                id="typing-indicators"
                checked={settings.allowTypingIndicators}
                onCheckedChange={(checked) =>
                  handleSettingChange('allowTypingIndicators', checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Custom Status Templates */}
        {settings.showCustomStatus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Quick Status Templates
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusTemplates(!showStatusTemplates)}
              >
                {showStatusTemplates ? 'Hide Templates' : 'Show Templates'}
              </Button>
            </div>

            {showStatusTemplates && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {statusTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="justify-start h-auto p-2 text-left"
                    onClick={() => applyStatusTemplate(template)}
                  >
                    <span className="mr-2">{template.emoji}</span>
                    <span className="text-xs">{template.text}</span>
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Status emoji"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                className="w-20"
                maxLength={2}
              />
              <Input
                placeholder="Enter custom status message..."
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="flex-1"
                maxLength={100}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Blocked Users */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            <Label className="text-base font-semibold">Blocked Users</Label>
          </div>

          <p className="text-sm text-muted-foreground">
            Blocked users cannot see your presence status and you won't see
            theirs
          </p>

          {/* Add blocked user */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter user email or username..."
              value={newBlockedUser}
              onChange={(e) => setNewBlockedUser(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedUser()}
            />
            <Button
              size="sm"
              onClick={handleAddBlockedUser}
              disabled={!newBlockedUser.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Block
            </Button>
          </div>

          {/* Blocked users list */}
          {settings.blockedUsers && settings.blockedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Blocked Users:
              </Label>
              <div className="flex flex-wrap gap-2">
                {settings.blockedUsers.map((blockedUser) => (
                  <Badge
                    key={blockedUser}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <UserX className="w-3 h-3" />
                    {blockedUser}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveBlockedUser(blockedUser)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <div className="space-y-1">
            <div className="font-medium">Privacy Notice</div>
            <div className="text-sm">
              Your presence settings are used to determine what information is
              shared with other users. Even with permissive settings, sensitive
              information like exact page content is never shared. You can
              change these settings at any time.
            </div>
          </div>
        </Alert>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PresenceSettings;
