'use client';

/**
 * API Key Management Component
 * WS-233: Comprehensive API key management system
 *
 * Provides functionality for:
 * - Creating and revoking API keys
 * - Setting permissions and rate limits
 * - Monitoring API key usage
 * - Managing expiration dates
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Settings,
  Calendar as CalendarIcon,
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  usage_stats: {
    total_requests: number;
    requests_today: number;
    last_request: string;
  };
}

interface Organization {
  id: string;
  name: string;
  subscription_tier: string;
}

const PERMISSION_OPTIONS = [
  { value: 'read:forms', label: 'Read Forms' },
  { value: 'write:forms', label: 'Write Forms' },
  { value: 'read:clients', label: 'Read Clients' },
  { value: 'write:clients', label: 'Write Clients' },
  { value: 'read:bookings', label: 'Read Bookings' },
  { value: 'write:bookings', label: 'Write Bookings' },
  { value: 'read:suppliers', label: 'Read Suppliers' },
  { value: 'write:suppliers', label: 'Write Suppliers' },
  { value: 'read:analytics', label: 'Read Analytics' },
  { value: 'webhooks:receive', label: 'Receive Webhooks' },
];

const RATE_LIMIT_PRESETS = {
  light: { minute: 10, hour: 100, day: 1000 },
  standard: { minute: 30, hour: 500, day: 5000 },
  heavy: { minute: 100, hour: 2000, day: 20000 },
  enterprise: { minute: 500, hour: 10000, day: 100000 },
};

export default function APIKeyManager({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state for creating new API key
  const [newKey, setNewKey] = useState({
    name: '',
    organizationId: organizationId || '',
    permissions: [] as string[],
    rateLimitPreset: 'standard',
    customRateLimits: false,
    rateLimitPerMinute: 30,
    rateLimitPerHour: 500,
    rateLimitPerDay: 5000,
    expiresAt: null as Date | null,
  });

  useEffect(() => {
    fetchAPIKeys();
    if (!organizationId) {
      fetchOrganizations();
    }
  }, [organizationId]);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const url = organizationId
        ? `/api/api-keys?organizationId=${organizationId}`
        : `/api/admin/api-keys`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch API keys');

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const createAPIKey = async () => {
    try {
      if (!newKey.name || !newKey.organizationId) {
        setError('Name and organization are required');
        return;
      }

      const rateLimits = newKey.customRateLimits
        ? {
            rateLimitPerMinute: newKey.rateLimitPerMinute,
            rateLimitPerHour: newKey.rateLimitPerHour,
            rateLimitPerDay: newKey.rateLimitPerDay,
          }
        : RATE_LIMIT_PRESETS[
            newKey.rateLimitPreset as keyof typeof RATE_LIMIT_PRESETS
          ];

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKey.name,
          organizationId: newKey.organizationId,
          permissions: newKey.permissions,
          rateLimitPerMinute: rateLimits.minute,
          rateLimitPerHour: rateLimits.hour,
          rateLimitPerDay: rateLimits.day,
          expiresAt: newKey.expiresAt?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }

      const data = await response.json();

      // Show the full API key to the user (only shown once)
      alert(
        `API Key Created Successfully!\n\nKey: ${data.apiKey}\n\nThis is the only time you'll see the full key. Please save it securely.`,
      );

      // Refresh the list
      await fetchAPIKeys();

      // Reset form and close dialog
      setNewKey({
        name: '',
        organizationId: organizationId || '',
        permissions: [],
        rateLimitPreset: 'standard',
        customRateLimits: false,
        rateLimitPerMinute: 30,
        rateLimitPerHour: 500,
        rateLimitPerDay: 5000,
        expiresAt: null,
      });
      setShowCreateDialog(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const toggleAPIKeyStatus = async (keyId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!response.ok) throw new Error('Failed to update API key status');

      await fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update API key');
    }
  };

  const deleteAPIKey = async (keyId: string, keyName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      await fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyKeyPrefix = async (keyPrefix: string) => {
    try {
      await navigator.clipboard.writeText(keyPrefix);
      setCopiedKey(keyPrefix);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
  };

  const applyRateLimitPreset = (preset: string) => {
    const limits =
      RATE_LIMIT_PRESETS[preset as keyof typeof RATE_LIMIT_PRESETS];
    if (limits) {
      setNewKey((prev) => ({
        ...prev,
        rateLimitPerMinute: limits.minute,
        rateLimitPerHour: limits.hour,
        rateLimitPerDay: limits.day,
      }));
    }
  };

  const getStatusColor = (key: APIKey) => {
    if (!key.is_active) return 'bg-gray-500';
    if (key.expires_at && new Date(key.expires_at) < new Date())
      return 'bg-red-500';
    if (key.usage_stats.requests_today > key.rate_limit_per_day * 0.9)
      return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = (key: APIKey) => {
    if (!key.is_active) return 'Inactive';
    if (key.expires_at && new Date(key.expires_at) < new Date())
      return 'Expired';
    if (key.usage_stats.requests_today > key.rate_limit_per_day * 0.9)
      return 'Near Limit';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Key Management</h1>
          <p className="text-gray-600 mt-2">
            Manage API keys for external integrations and access control
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for external integrations. Choose
                permissions and rate limits carefully.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="keyName">API Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., CRM Integration"
                    value={newKey.name}
                    onChange={(e) =>
                      setNewKey((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                {!organizationId && (
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Select
                      value={newKey.organizationId}
                      onValueChange={(value) =>
                        setNewKey((prev) => ({
                          ...prev,
                          organizationId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name} ({org.subscription_tier})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {PERMISSION_OPTIONS.map((permission) => (
                    <div
                      key={permission.value}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={permission.value}
                        checked={newKey.permissions.includes(permission.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKey((prev) => ({
                              ...prev,
                              permissions: [
                                ...prev.permissions,
                                permission.value,
                              ],
                            }));
                          } else {
                            setNewKey((prev) => ({
                              ...prev,
                              permissions: prev.permissions.filter(
                                (p) => p !== permission.value,
                              ),
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={permission.value} className="text-sm">
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Label>Rate Limits</Label>
                  <Switch
                    checked={newKey.customRateLimits}
                    onCheckedChange={(checked) =>
                      setNewKey((prev) => ({
                        ...prev,
                        customRateLimits: checked,
                      }))
                    }
                  />
                  <span className="text-sm text-gray-600">Custom limits</span>
                </div>

                {!newKey.customRateLimits ? (
                  <Select
                    value={newKey.rateLimitPreset}
                    onValueChange={(value) => {
                      setNewKey((prev) => ({
                        ...prev,
                        rateLimitPreset: value,
                      }));
                      applyRateLimitPreset(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        Light (10/min, 100/hr, 1K/day)
                      </SelectItem>
                      <SelectItem value="standard">
                        Standard (30/min, 500/hr, 5K/day)
                      </SelectItem>
                      <SelectItem value="heavy">
                        Heavy (100/min, 2K/hr, 20K/day)
                      </SelectItem>
                      <SelectItem value="enterprise">
                        Enterprise (500/min, 10K/hr, 100K/day)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="perMinute">Per Minute</Label>
                      <Input
                        id="perMinute"
                        type="number"
                        value={newKey.rateLimitPerMinute}
                        onChange={(e) =>
                          setNewKey((prev) => ({
                            ...prev,
                            rateLimitPerMinute: parseInt(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="perHour">Per Hour</Label>
                      <Input
                        id="perHour"
                        type="number"
                        value={newKey.rateLimitPerHour}
                        onChange={(e) =>
                          setNewKey((prev) => ({
                            ...prev,
                            rateLimitPerHour: parseInt(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="perDay">Per Day</Label>
                      <Input
                        id="perDay"
                        type="number"
                        value={newKey.rateLimitPerDay}
                        onChange={(e) =>
                          setNewKey((prev) => ({
                            ...prev,
                            rateLimitPerDay: parseInt(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Expiration Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newKey.expiresAt
                        ? format(newKey.expiresAt, 'PPP')
                        : 'No expiration'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newKey.expiresAt || undefined}
                      onSelect={(date) =>
                        setNewKey((prev) => ({
                          ...prev,
                          expiresAt: date || null,
                        }))
                      }
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNewKey((prev) => ({ ...prev, expiresAt: null }))
                        }
                      >
                        Clear expiration
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createAPIKey}>Create API Key</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {apiKeys.map((key) => (
          <Card key={key.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(key)}`}
                  />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {key.name}
                      <Badge variant="secondary">{getStatusText(key)}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {format(new Date(key.created_at), 'MMM d, yyyy')}
                      {key.last_used_at &&
                        ` • Last used ${format(new Date(key.last_used_at), 'MMM d, yyyy')}`}
                      {key.expires_at &&
                        ` • Expires ${format(new Date(key.expires_at), 'MMM d, yyyy')}`}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={key.is_active}
                    onCheckedChange={() =>
                      toggleAPIKeyStatus(key.id, key.is_active)
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAPIKey(key.id, key.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label>API Key:</Label>
                <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                  {visibleKeys.has(key.id)
                    ? key.key_prefix + '...'
                    : '••••••••••••••••'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleKeyVisibility(key.id)}
                >
                  {visibleKeys.has(key.id) ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyKeyPrefix(key.key_prefix)}
                >
                  {copiedKey === key.key_prefix ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Permissions</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {key.permissions.map((permission) => (
                      <Badge
                        key={permission}
                        variant="outline"
                        className="text-xs"
                      >
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Rate Limits</Label>
                  <div className="text-sm text-gray-600 mt-1">
                    {key.rate_limit_per_minute}/min • {key.rate_limit_per_hour}
                    /hr • {key.rate_limit_per_day}/day
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Usage Today</Label>
                  <div className="text-sm text-gray-600 mt-1">
                    {key.usage_stats.requests_today.toLocaleString()} /{' '}
                    {key.rate_limit_per_day.toLocaleString()} requests
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((key.usage_stats.requests_today / key.rate_limit_per_day) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {apiKeys.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No API Keys</h3>
              <p className="text-gray-600 mb-4">
                Create your first API key to enable external integrations and
                programmatic access.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First API Key
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
