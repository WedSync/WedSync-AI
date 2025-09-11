'use client';

import React, { useState, useEffect } from 'react';
import {
  Link,
  Sync,
  CheckCircle,
  AlertCircle,
  Users,
  Image,
  Shield,
  Zap,
} from 'lucide-react';

interface WedMeIntegrationPanelProps {
  wedmePortfolio: WedMePortfolio;
  syncStatus: SyncStatus;
  onAssetImport: (assets: Asset[]) => void;
  crossPlatformAuth: AuthState;
}

interface WedMePortfolio {
  id: string;
  photographerName: string;
  portfolioImages: PortfolioImage[];
  totalProjects: number;
  lastUpdated: Date;
}

interface PortfolioImage {
  id: string;
  url: string;
  title: string;
  category: string;
  tags: string[];
  optimized: boolean;
}

interface SyncStatus {
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSync: Date | null;
  pendingChanges: number;
  conflictCount: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  permissions: string[];
  expiresAt: Date | null;
}

interface Asset {
  id: string;
  url: string;
  type: 'image' | 'video';
  metadata: Record<string, any>;
}

export default function WedMeIntegrationPanel({
  wedmePortfolio,
  syncStatus,
  onAssetImport,
  crossPlatformAuth,
}: WedMeIntegrationPanelProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    if (realTimeUpdates && crossPlatformAuth.isAuthenticated) {
      setupRealTimeSync();
    }
  }, [realTimeUpdates, crossPlatformAuth.isAuthenticated]);

  const setupRealTimeSync = () => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket('wss://api.wedme.com/ws/portfolio-sync');

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'auth',
          token: crossPlatformAuth.token,
          portfolioId: wedmePortfolio.id,
        }),
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'portfolio_update') {
        handlePortfolioUpdate(data.payload);
      }
    };

    return () => ws.close();
  };

  const handlePortfolioUpdate = (update: any) => {
    // Handle real-time portfolio updates
    console.log('Portfolio updated:', update);
  };

  const connectToWedMe = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/mobile-security/cross-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate_platform',
          platform: 'WedMe',
          credentials: {
            redirectUrl: window.location.href,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to WedMe OAuth
        window.location.href = `https://auth.wedme.com/oauth/authorize?client_id=wedsync-integration&redirect_uri=${encodeURIComponent(window.location.href)}&scope=portfolio,share`;
      }
    } catch (error) {
      console.error('WedMe connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const syncPortfolio = async () => {
    try {
      const response = await fetch('/api/mobile-security/cross-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${crossPlatformAuth.token}`,
        },
        body: JSON.stringify({
          action: 'secure_api_call',
          platform: 'WedMe',
          endpoint: '/api/portfolio/sync',
          method: 'POST',
          data: {
            portfolioId: wedmePortfolio.id,
            fullSync: true,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Handle successful sync
        console.log('Portfolio synced successfully');
      }
    } catch (error) {
      console.error('Portfolio sync failed:', error);
    }
  };

  const importSelectedAssets = async () => {
    if (selectedAssets.length === 0) return;

    try {
      setImportProgress(0);
      const assets: Asset[] = [];

      for (let i = 0; i < selectedAssets.length; i++) {
        const assetId = selectedAssets[i];
        const portfolioImage = wedmePortfolio.portfolioImages.find(
          (img) => img.id === assetId,
        );

        if (portfolioImage) {
          // Process and optimize asset for app store
          const optimizedAsset = await processAssetForAppStore(portfolioImage);
          assets.push(optimizedAsset);
        }

        setImportProgress(((i + 1) / selectedAssets.length) * 100);
        await new Promise((resolve) => setTimeout(resolve, 200)); // Progress simulation
      }

      onAssetImport(assets);
      setSelectedAssets([]);
    } catch (error) {
      console.error('Asset import failed:', error);
    }
  };

  const processAssetForAppStore = async (
    image: PortfolioImage,
  ): Promise<Asset> => {
    // Optimize image for app store requirements
    return {
      id: `wedme-${image.id}`,
      url: image.url,
      type: 'image',
      metadata: {
        title: image.title,
        category: image.category,
        tags: image.tags,
        source: 'WedMe',
        optimized: true,
        importedAt: new Date().toISOString(),
      },
    };
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId],
    );
  };

  const selectAllAssets = () => {
    setSelectedAssets(wedmePortfolio.portfolioImages.map((img) => img.id));
  };

  const clearSelection = () => {
    setSelectedAssets([]);
  };

  const getSyncStatusColor = () => {
    switch (syncStatus.status) {
      case 'connected':
        return 'green';
      case 'syncing':
        return 'blue';
      case 'error':
        return 'red';
      case 'disconnected':
        return 'gray';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus.status) {
      case 'connected':
        return CheckCircle;
      case 'syncing':
        return Sync;
      case 'error':
        return AlertCircle;
      case 'disconnected':
        return Link;
    }
  };

  if (!crossPlatformAuth.isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
            <Link className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect to WedMe
          </h3>
          <p className="text-gray-600 mb-6">
            Import your wedding portfolio assets directly from WedMe to create
            professional app store screenshots
          </p>

          <button
            onClick={connectToWedMe}
            disabled={isConnecting}
            className={`
              px-6 py-3 bg-purple-600 text-white rounded-lg font-medium
              hover:bg-purple-700 disabled:opacity-50 transition-colors
              ${isConnecting ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isConnecting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Connecting...
              </div>
            ) : (
              <div className="flex items-center">
                <Link className="w-4 h-4 mr-2" />
                Connect WedMe Account
              </div>
            )}
          </button>

          <div className="mt-6 space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <Shield className="w-4 h-4 mr-2 text-green-500" />
              Secure OAuth 2.0 authentication
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-2 text-blue-500" />
              Access your portfolio projects
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Zap className="w-4 h-4 mr-2 text-yellow-500" />
              Real-time synchronization
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = getSyncStatusIcon();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">WedMe Integration</h3>
              <p className="text-purple-100 text-sm">
                {wedmePortfolio.photographerName}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <StatusIcon
              className={`w-5 h-5 mr-2 text-${getSyncStatusColor()}-400`}
            />
            <span className="text-sm capitalize">{syncStatus.status}</span>
          </div>
        </div>

        {/* Portfolio stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {wedmePortfolio.portfolioImages.length}
            </div>
            <div className="text-xs text-purple-200">Images</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {wedmePortfolio.totalProjects}
            </div>
            <div className="text-xs text-purple-200">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {syncStatus.pendingChanges}
            </div>
            <div className="text-xs text-purple-200">Pending</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={syncPortfolio}
              disabled={syncStatus.status === 'syncing'}
              className={`
                flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  syncStatus.status === 'syncing'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }
              `}
            >
              <Sync
                className={`w-4 h-4 mr-2 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`}
              />
              Sync Now
            </button>

            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={realTimeUpdates}
                onChange={(e) => setRealTimeUpdates(e.target.checked)}
                className="mr-2 rounded"
              />
              Real-time updates
            </label>
          </div>

          <div className="text-sm text-gray-500">
            Last sync:{' '}
            {syncStatus.lastSync
              ? syncStatus.lastSync.toLocaleTimeString()
              : 'Never'}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">
              Selected: {selectedAssets.length}/
              {wedmePortfolio.portfolioImages.length}
            </span>
          </div>
          <div className="space-x-2">
            <button
              onClick={selectAllAssets}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio gallery */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {wedmePortfolio.portfolioImages.map((image) => (
            <div
              key={image.id}
              className={`
                relative cursor-pointer rounded-lg overflow-hidden
                ${selectedAssets.includes(image.id) ? 'ring-2 ring-purple-500' : 'ring-1 ring-gray-200'}
                hover:ring-2 hover:ring-purple-300 transition-all
              `}
              onClick={() => toggleAssetSelection(image.id)}
            >
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-20 object-cover"
              />

              {/* Optimization badge */}
              {image.optimized && (
                <div className="absolute top-1 left-1">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Zap className="w-2 h-2 text-white" />
                  </div>
                </div>
              )}

              {/* Selection indicator */}
              {selectedAssets.includes(image.id) && (
                <div className="absolute inset-0 bg-purple-500 bg-opacity-30 flex items-center justify-center">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Image info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1">
                <div className="text-xs truncate">{image.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import controls */}
      {selectedAssets.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          {importProgress > 0 && importProgress < 100 ? (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Importing assets...</span>
                <span>{Math.round(importProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={importSelectedAssets}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Image className="w-4 h-4 mr-2" />
              Import {selectedAssets.length} Asset
              {selectedAssets.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Conflict resolver */}
      {syncStatus.conflictCount > 0 && (
        <div className="p-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-yellow-800">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {syncStatus.conflictCount} sync conflict
                {syncStatus.conflictCount !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowConflictResolver(true)}
              className="text-sm text-yellow-700 hover:text-yellow-900 underline"
            >
              Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
