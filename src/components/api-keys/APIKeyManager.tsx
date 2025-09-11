'use client';

// APIKeyManager.tsx
// WS-072: API Key Management Component
// Complete interface for managing third-party integration API keys

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Plus,
  Eye,
  EyeOff,
  Copy,
  RotateCw,
  Trash2,
  Activity,
  Settings,
  AlertTriangle,
  Calendar,
  Globe,
  Shield,
  BarChart3,
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  description?: string;
  integrationType?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  allowedIps?: string[];
  allowedOrigins?: string[];
  createdAt: string;
  usage?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTimeMs: number;
    totalDataTransferredMB: number;
    uniqueEndpoints: number;
    mostUsedEndpoint: string;
    errorRate: number;
  };
}

interface APIScope {
  scope: string;
  description: string;
}

interface CreateKeyData {
  name: string;
  description: string;
  integrationType: string;
  scopes: string[];
  expiresIn?: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  allowedIps: string;
  allowedOrigins: string;
}

export function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [availableScopes, setAvailableScopes] = useState<APIScope[]>([]);
  const [groupedScopes, setGroupedScopes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState('');
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);

  const [createForm, setCreateForm] = useState<CreateKeyData>({
    name: '',
    description: '',
    integrationType: '',
    scopes: [],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 10000,
    allowedIps: '',
    allowedOrigins: '',
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAPIKeys(), loadScopes()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAPIKeys = async () => {
    const response = await fetch('/api/api-keys?include_usage=true');
    if (response.ok) {
      const { data } = await response.json();
      setApiKeys(data);
    }
  };

  const loadScopes = async () => {
    const response = await fetch('/api/api-keys/scopes');
    if (response.ok) {
      const { data } = await response.json();
      setAvailableScopes(data.scopes);
      setGroupedScopes(data.groupedByResource);
    }
  };

  const createAPIKey = async () => {
    try {
      setCreating(true);

      const payload = {
        ...createForm,
        allowedIps: createForm.allowedIps
          ? createForm.allowedIps.split(',').map((ip) => ip.trim())
          : undefined,
        allowedOrigins: createForm.allowedOrigins
          ? createForm.allowedOrigins.split(',').map((origin) => origin.trim())
          : undefined,
        expiresIn: createForm.expiresIn || undefined,
      };

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const { data } = await response.json();
        setNewKeyData(data.plainKey);
        setShowKeyDialog(true);
        setShowCreateDialog(false);
        resetCreateForm();
        await loadAPIKeys();
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create API key');
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('Failed to create API key: ' + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const rotateAPIKey = async (keyId: string) => {
    if (
      !confirm(
        'Are you sure you want to rotate this API key? The current key will be revoked.',
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}/rotate`, {
        method: 'POST',
      });

      if (response.ok) {
        const { data } = await response.json();
        setNewKeyData(data.plainKey);
        setShowKeyDialog(true);
        await loadAPIKeys();
      } else {
        throw new Error('Failed to rotate API key');
      }
    } catch (error) {
      console.error('Failed to rotate API key:', error);
      alert('Failed to rotate API key');
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke this API key? This action cannot be undone.',
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAPIKeys();
      } else {
        throw new Error('Failed to revoke API key');
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Failed to revoke API key');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      integrationType: '',
      scopes: [],
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
      allowedIps: '',
      allowedOrigins: '',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScopeColor = (scope: string) => {
    const [action] = scope.split(':');
    switch (action) {
      case 'read':
        return 'bg-blue-100 text-blue-800';
      case 'write':
        return 'bg-green-100 text-green-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'manage':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-gray-600">
            Manage API keys for third-party integrations and webhook access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for third-party integrations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Key Name *</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Zapier Integration"
                  />
                </div>
                <div>
                  <Label htmlFor="integrationType">Integration Type</Label>
                  <Select
                    value={createForm.integrationType}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        integrationType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select integration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zapier">Zapier</SelectItem>
                      <SelectItem value="hubspot">HubSpot</SelectItem>
                      <SelectItem value="monday">Monday.com</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="webhook">Custom Webhook</SelectItem>
                      <SelectItem value="custom">Custom Application</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this API key will be used for"
                />
              </div>

              {/* Scopes */}
              <div>
                <Label>API Scopes *</Label>
                <div className="mt-2 space-y-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {Object.entries(groupedScopes).map(([resource, scopes]) => (
                    <div key={resource} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 capitalize">
                        {resource === '*' ? 'Administrative' : resource}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {scopes.map((scope: any) => (
                          <label
                            key={scope.scope}
                            className="flex items-center space-x-2 text-sm"
                          >
                            <Checkbox
                              checked={createForm.scopes.includes(scope.scope)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    scopes: [...prev.scopes, scope.scope],
                                  }));
                                } else {
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    scopes: prev.scopes.filter(
                                      (s) => s !== scope.scope,
                                    ),
                                  }));
                                }
                              }}
                            />
                            <span className="truncate">{scope.scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate Limits */}
              <div>
                <Label>Rate Limits</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="rateLimitPerMinute" className="text-xs">
                      Per Minute
                    </Label>
                    <Input
                      id="rateLimitPerMinute"
                      type="number"
                      value={createForm.rateLimitPerMinute}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          rateLimitPerMinute: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateLimitPerHour" className="text-xs">
                      Per Hour
                    </Label>
                    <Input
                      id="rateLimitPerHour"
                      type="number"
                      value={createForm.rateLimitPerHour}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          rateLimitPerHour: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateLimitPerDay" className="text-xs">
                      Per Day
                    </Label>
                    <Input
                      id="rateLimitPerDay"
                      type="number"
                      value={createForm.rateLimitPerDay}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          rateLimitPerDay: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Security Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="allowedIps">Allowed IPs (optional)</Label>
                  <Input
                    id="allowedIps"
                    value={createForm.allowedIps}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        allowedIps: e.target.value,
                      }))
                    }
                    placeholder="192.168.1.1, 10.0.0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated IP addresses
                  </p>
                </div>
                <div>
                  <Label htmlFor="allowedOrigins">
                    Allowed Origins (optional)
                  </Label>
                  <Input
                    id="allowedOrigins"
                    value={createForm.allowedOrigins}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        allowedOrigins: e.target.value,
                      }))
                    }
                    placeholder="https://app.zapier.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated domain origins
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createAPIKey}
                  disabled={
                    !createForm.name ||
                    createForm.scopes.length === 0 ||
                    creating
                  }
                >
                  {creating ? 'Creating...' : 'Create API Key'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No API Keys
              </h3>
              <p className="text-gray-500 text-center mb-4">
                Create your first API key to start integrating with third-party
                tools
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      {key.name}
                      {!key.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Revoked
                        </Badge>
                      )}
                      {key.expiresAt &&
                        new Date(key.expiresAt) < new Date() && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {key.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rotateAPIKey(key.id)}
                      disabled={!key.isActive}
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeAPIKey(key.id)}
                      disabled={!key.isActive}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Key Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">Key Prefix</Label>
                    <div className="font-mono flex items-center gap-2">
                      {key.keyPrefix}...
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(key.keyPrefix)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Integration</Label>
                    <div className="capitalize">
                      {key.integrationType || 'Custom'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Created</Label>
                    <div>{formatDate(key.createdAt)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Last Used</Label>
                    <div>
                      {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Scopes */}
                <div>
                  <Label className="text-xs text-gray-500">Scopes</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {key.scopes.map((scope) => (
                      <Badge
                        key={scope}
                        variant="secondary"
                        className={`text-xs ${getScopeColor(scope)}`}
                      >
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Usage Statistics */}
                {key.usage && (
                  <div className="border-t pt-4">
                    <Label className="text-xs text-gray-500 mb-2 block">
                      Usage Statistics (Last 30 Days)
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {key.usage.totalRequests.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total Requests
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {(
                            (key.usage.successfulRequests /
                              key.usage.totalRequests) *
                              100 || 0
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-xs text-gray-500">
                          Success Rate
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {key.usage.avgResponseTimeMs}ms
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg Response Time
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {key.usage.totalDataTransferredMB.toFixed(2)}MB
                        </div>
                        <div className="text-xs text-gray-500">
                          Data Transferred
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Limits */}
                <div className="border-t pt-4">
                  <Label className="text-xs text-gray-500 mb-2 block">
                    Rate Limits
                  </Label>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">
                        {key.rateLimitPerMinute}/min
                      </div>
                      <div className="text-xs text-gray-500">Per Minute</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {key.rateLimitPerHour}/hr
                      </div>
                      <div className="text-xs text-gray-500">Per Hour</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {key.rateLimitPerDay}/day
                      </div>
                      <div className="text-xs text-gray-500">Per Day</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Store this key securely. You will not be able to view it again.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is the only time you will see this key. Copy it to a secure
              location.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label>Your API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={newKeyData}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newKeyData)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Copy and store this key in your integration platform</li>
                <li>
                  • Use it in the Authorization header: Bearer{' '}
                  {newKeyData.substring(0, 20)}...
                </li>
                <li>• Test your integration to ensure it works correctly</li>
                <li>• Monitor usage in the API key dashboard</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowKeyDialog(false);
                setNewKeyData('');
              }}
            >
              I've Copied the Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
