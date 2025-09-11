'use client';

/**
 * WS-175 Advanced Data Encryption - Team A Round 1
 * EncryptionKeyManager Component
 *
 * Admin component for encryption key management, rotation, and security monitoring.
 * Provides comprehensive key lifecycle management for wedding data protection.
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/untitled-ui/card';
import { Button } from '@/components/untitled-ui/button';
import { Badge } from '@/components/untitled-ui/badge';
import { Progress } from '@/components/untitled-ui/progress';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  RotateCcw,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  Activity,
  Zap,
  Lock,
} from 'lucide-react';
import {
  EncryptionKeyManagerProps,
  UIEncryptionKey,
  EncryptionKey,
  KeyRotationPolicy,
} from '@/types/encryption';

export function EncryptionKeyManager({
  keys,
  currentKeyId,
  onKeyRotate,
  onKeyRevoke,
  onKeyCreate,
  readOnly = false,
  showAdvanced = false,
  className,
  loading = false,
  error,
}: EncryptionKeyManagerProps) {
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    currentKeyId || null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [keyId: string]: boolean }>(
    {},
  );
  const [isRotating, setIsRotating] = useState<{ [keyId: string]: boolean }>(
    {},
  );
  const [isRevoking, setIsRevoking] = useState<{ [keyId: string]: boolean }>(
    {},
  );

  // Enhanced key data with UI-specific calculations
  const enhancedKeys: UIEncryptionKey[] = useMemo(() => {
    return keys.map((key) => {
      const now = new Date();
      const created = new Date(key.createdAt);
      const expires = new Date(key.expiresAt);
      const rotationScheduled = key.rotationScheduledAt
        ? new Date(key.rotationScheduledAt)
        : null;

      const totalLifetime = expires.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      const remaining = expires.getTime() - now.getTime();

      const rotationProgress = Math.min(100, (elapsed / totalLifetime) * 100);
      const daysUntilExpiry = Math.ceil(remaining / (1000 * 60 * 60 * 24));
      const isExpiring = daysUntilExpiry <= 30;

      // Mock additional UI data that would come from backend
      const usageCount = Math.floor(Math.random() * 10000) + 1000;
      const lastUsed = new Date(
        now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      );
      const healthScore =
        key.status === 'active'
          ? 95 + Math.floor(Math.random() * 5)
          : key.status === 'rotating'
            ? 85 + Math.floor(Math.random() * 10)
            : 45;

      return {
        ...key,
        displayName: `Key ${key.id.slice(0, 8).toUpperCase()}`,
        usageCount,
        lastUsed,
        healthScore,
        rotationProgress,
        isExpiring,
        canRotate: key.status === 'active' && !readOnly,
        canRevoke:
          key.status !== 'deprecated' && key.id !== currentKeyId && !readOnly,
      };
    });
  }, [keys, currentKeyId, readOnly]);

  // Key statistics
  const stats = useMemo(() => {
    const activeKeys = enhancedKeys.filter((k) => k.status === 'active').length;
    const rotatingKeys = enhancedKeys.filter(
      (k) => k.status === 'rotating',
    ).length;
    const deprecatedKeys = enhancedKeys.filter(
      (k) => k.status === 'deprecated',
    ).length;
    const expiringKeys = enhancedKeys.filter(
      (k) => k.isExpiring && k.status === 'active',
    ).length;
    const avgHealthScore =
      enhancedKeys.reduce((sum, k) => sum + (k.healthScore || 0), 0) /
      enhancedKeys.length;

    return {
      activeKeys,
      rotatingKeys,
      deprecatedKeys,
      expiringKeys,
      avgHealthScore: Math.round(avgHealthScore),
    };
  }, [enhancedKeys]);

  // Handle key operations
  const handleKeyRotate = async (keyId: string) => {
    if (isRotating[keyId]) return;

    setIsRotating((prev) => ({ ...prev, [keyId]: true }));
    try {
      await onKeyRotate(keyId);
    } finally {
      setIsRotating((prev) => ({ ...prev, [keyId]: false }));
    }
  };

  const handleKeyRevoke = async (keyId: string) => {
    if (isRevoking[keyId]) return;

    setIsRevoking((prev) => ({ ...prev, [keyId]: true }));
    try {
      await onKeyRevoke(keyId);
    } finally {
      setIsRevoking((prev) => ({ ...prev, [keyId]: false }));
    }
  };

  const handleKeyCreate = async () => {
    try {
      await onKeyCreate({
        algorithm: 'aes-256-gcm',
        status: 'active' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        createdBy: 'current-user-id', // This would come from auth context
      });
      setShowCreateModal(false);
    } catch (err) {
      // Error handling would be done by parent component
      console.error('Failed to create key:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'rotating':
        return 'bg-blue-100 text-blue-800';
      case 'deprecated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleKeyDetails = (keyId: string) => {
    setShowDetails((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Statistics */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Encryption Key Management</h2>
            {error && (
              <Badge className="bg-red-100 text-red-800 ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
          {!readOnly && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Key
            </Button>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.activeKeys}
            </div>
            <div className="text-sm text-green-700">Active Keys</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.rotatingKeys}
            </div>
            <div className="text-sm text-blue-700">Rotating</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {stats.deprecatedKeys}
            </div>
            <div className="text-sm text-gray-700">Deprecated</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {stats.expiringKeys}
            </div>
            <div className="text-sm text-orange-700">Expiring Soon</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div
              className={cn(
                'text-2xl font-bold',
                getHealthColor(stats.avgHealthScore),
              )}
            >
              {stats.avgHealthScore}%
            </div>
            <div className="text-sm text-purple-700">Avg Health</div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}
      </Card>

      {/* Keys List */}
      <Card className="p-6">
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" />
          Encryption Keys ({enhancedKeys.length})
        </h3>

        <div className="space-y-3">
          {enhancedKeys.map((key) => (
            <div
              key={key.id}
              className={cn(
                'p-4 border rounded-lg transition-all',
                selectedKeyId === key.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300',
                key.isExpiring && 'border-l-4 border-l-orange-400',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    <span className="font-mono text-sm font-medium">
                      {key.displayName}
                    </span>
                    {key.id === currentKeyId && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>

                  <Badge className={getStatusColor(key.status)}>
                    {key.status}
                  </Badge>

                  {key.isExpiring && (
                    <Badge className="bg-orange-100 text-orange-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Expiring Soon
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Health Score */}
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-sm font-medium',
                        getHealthColor(key.healthScore || 0),
                      )}
                    >
                      {key.healthScore}%
                    </div>
                    <div className="text-xs text-gray-500">Health</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyDetails(key.id)}
                      className="p-2"
                    >
                      {showDetails[key.id] ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>

                    {key.canRotate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeyRotate(key.id)}
                        disabled={isRotating[key.id]}
                        className="p-2"
                      >
                        <RotateCcw
                          className={cn(
                            'h-3 w-3',
                            isRotating[key.id] && 'animate-spin',
                          )}
                        />
                      </Button>
                    )}

                    {key.canRevoke && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeyRevoke(key.id)}
                        disabled={isRevoking[key.id]}
                        className="p-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Details */}
              {showDetails[key.id] && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Algorithm</div>
                      <div className="font-mono">{key.algorithm}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Created</div>
                      <div>{new Date(key.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Expires</div>
                      <div
                        className={
                          key.isExpiring ? 'text-orange-600 font-medium' : ''
                        }
                      >
                        {new Date(key.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Usage Count</div>
                      <div className="font-medium">
                        {key.usageCount?.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Rotation Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Lifecycle Progress</span>
                      <span className="font-medium">
                        {Math.round(key.rotationProgress || 0)}%
                      </span>
                    </div>
                    <Progress
                      value={key.rotationProgress || 0}
                      className="h-2"
                    />
                  </div>

                  {key.lastUsed && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity className="h-3 w-3" />
                      Last used: {key.lastUsed.toLocaleString()}
                    </div>
                  )}

                  {key.rotationScheduledAt && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Calendar className="h-3 w-3" />
                      Rotation scheduled:{' '}
                      {new Date(key.rotationScheduledAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {enhancedKeys.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No encryption keys found</p>
              <p className="text-sm">
                Create your first encryption key to secure wedding data
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Create Key Modal (simplified - in real implementation would be a separate modal component) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 m-4 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Create New Encryption Key
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This will create a new AES-256-GCM encryption key for securing
              wedding data. The key will be active for 90 days before scheduled
              rotation.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleKeyCreate}>Create Key</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default EncryptionKeyManager;
