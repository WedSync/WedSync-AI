'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Download,
  Settings,
  Smartphone,
  Tablet,
  Monitor,
  Crop,
  Palette,
} from 'lucide-react';

interface MobileAssetGeneratorProps {
  deviceType: 'ios' | 'android' | 'pwa';
  targetStore: 'apple' | 'google' | 'microsoft';
  portfolioAssets: PortfolioAsset[];
  wedmeIntegration: boolean;
  onAssetGenerated?: (assets: GeneratedAsset[]) => void;
}

interface PortfolioAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  metadata: Record<string, any>;
}

interface GeneratedAsset {
  id: string;
  size: AssetSize;
  url: string;
  optimized: boolean;
  deviceSpecific: boolean;
}

interface AssetSize {
  width: number;
  height: number;
  name: string;
  purpose: string;
}

export default function MobileAssetGenerator({
  deviceType,
  targetStore,
  portfolioAssets,
  wedmeIntegration,
  onAssetGenerated,
}: MobileAssetGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const assetSizes: Record<string, AssetSize[]> = {
    apple: [
      {
        width: 1242,
        height: 2208,
        name: 'iPhone Screenshot',
        purpose: 'app_store_screenshot',
      },
      {
        width: 2048,
        height: 2732,
        name: 'iPad Screenshot',
        purpose: 'app_store_screenshot',
      },
      { width: 1024, height: 1024, name: 'App Icon', purpose: 'app_icon' },
    ],
    google: [
      {
        width: 1080,
        height: 1920,
        name: 'Phone Screenshot',
        purpose: 'play_store_screenshot',
      },
      {
        width: 1920,
        height: 1080,
        name: 'Tablet Screenshot',
        purpose: 'play_store_screenshot',
      },
      { width: 512, height: 512, name: 'High-res Icon', purpose: 'app_icon' },
    ],
    microsoft: [
      {
        width: 1366,
        height: 768,
        name: 'Desktop Screenshot',
        purpose: 'store_screenshot',
      },
      { width: 310, height: 310, name: 'Store Logo', purpose: 'app_icon' },
    ],
  };

  const generateAssets = useCallback(async () => {
    if (selectedAssets.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const targetSizes = assetSizes[targetStore];
      const assets: GeneratedAsset[] = [];
      const totalSteps = selectedAssets.length * targetSizes.length;
      let currentStep = 0;

      for (const assetId of selectedAssets) {
        const sourceAsset = portfolioAssets.find((a) => a.id === assetId);
        if (!sourceAsset) continue;

        for (const size of targetSizes) {
          currentStep++;
          setGenerationProgress((currentStep / totalSteps) * 100);

          // Simulate asset generation with device-specific optimization
          const optimizedAsset = await generateOptimizedAsset(
            sourceAsset,
            size,
          );
          assets.push(optimizedAsset);

          // Small delay to show progress
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      setGeneratedAssets(assets);
      onAssetGenerated?.(assets);
    } catch (error) {
      console.error('Asset generation failed:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [selectedAssets, targetStore, portfolioAssets, onAssetGenerated]);

  const generateOptimizedAsset = async (
    sourceAsset: PortfolioAsset,
    targetSize: AssetSize,
  ): Promise<GeneratedAsset> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not available');

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Set canvas size
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    // Create and load source image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = sourceAsset.url;
    });

    // Apply device-specific optimizations
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate aspect ratio and positioning
    const imgAspect = img.width / img.height;
    const canvasAspect = canvas.width / canvas.height;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgAspect > canvasAspect) {
      // Image is wider than canvas
      drawHeight = canvas.height;
      drawWidth = drawHeight * imgAspect;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Image is taller than canvas
      drawWidth = canvas.width;
      drawHeight = drawWidth / imgAspect;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    }

    // Apply device-specific filters and optimizations
    if (deviceType === 'ios') {
      // iOS-specific optimizations (sharper rendering)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    } else if (deviceType === 'android') {
      // Android-specific optimizations (better contrast)
      ctx.filter = 'contrast(1.1) saturate(1.05)';
    }

    // Draw the optimized image
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Add store-specific branding or watermarks
    if (targetSize.purpose === 'app_store_screenshot') {
      addStoreBranding(ctx, targetStore, targetSize);
    }

    // Convert to blob and create URL
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob!);
        },
        'image/png',
        0.95,
      );
    });

    const url = URL.createObjectURL(blob);

    return {
      id: `${sourceAsset.id}-${targetSize.name.replace(/\s+/g, '-').toLowerCase()}`,
      size: targetSize,
      url,
      optimized: true,
      deviceSpecific: true,
    };
  };

  const addStoreBranding = (
    ctx: CanvasRenderingContext2D,
    store: string,
    size: AssetSize,
  ) => {
    // Add subtle branding based on store requirements
    ctx.font = `${Math.floor(size.height * 0.03)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';

    const brandText = wedmeIntegration ? 'WedSync + WedMe' : 'WedSync';
    ctx.fillText(brandText, size.width / 2, size.height - 20);
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId],
    );
  };

  const selectAllAssets = () => {
    setSelectedAssets(portfolioAssets.map((asset) => asset.id));
  };

  const clearSelection = () => {
    setSelectedAssets([]);
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'ios':
        return <Smartphone className="w-5 h-5" />;
      case 'android':
        return <Tablet className="w-5 h-5" />;
      case 'pwa':
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {getDeviceIcon()}
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Mobile Asset Generator
            </h3>
            <p className="text-sm text-gray-600">
              {targetStore.charAt(0).toUpperCase() + targetStore.slice(1)} Store
              • {deviceType.toUpperCase()}
            </p>
          </div>
        </div>

        {wedmeIntegration && (
          <div className="flex items-center bg-purple-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-sm text-purple-700">WedMe Connected</span>
          </div>
        )}
      </div>

      {/* Asset Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">
            Select Portfolio Assets ({selectedAssets.length}/
            {portfolioAssets.length})
          </h4>
          <div className="flex gap-2">
            <button
              onClick={selectAllAssets}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
          {portfolioAssets.map((asset) => (
            <div
              key={asset.id}
              className={`
                relative cursor-pointer rounded-lg overflow-hidden
                ${selectedAssets.includes(asset.id) ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200'}
                hover:ring-2 hover:ring-blue-300 transition-all
              `}
              onClick={() => toggleAssetSelection(asset.id)}
            >
              <img
                src={asset.url}
                alt="Portfolio asset"
                className="w-full h-24 object-cover"
              />
              {selectedAssets.includes(asset.id) && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
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
            </div>
          ))}
        </div>
      </div>

      {/* Target Sizes Preview */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Target Sizes ({assetSizes[targetStore].length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assetSizes[targetStore].map((size) => (
            <div key={size.name} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Crop className="w-4 h-4 text-gray-500 mr-2" />
                <span className="font-medium text-sm">{size.name}</span>
              </div>
              <div className="text-sm text-gray-600">
                {size.width} × {size.height}px
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {size.purpose.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generation Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-600">
          <Palette className="w-4 h-4 mr-1" />
          Device-optimized generation enabled
        </div>

        <button
          onClick={generateAssets}
          disabled={isGenerating || selectedAssets.length === 0}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${
              isGenerating || selectedAssets.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }
          `}
        >
          {isGenerating ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Generating... {Math.round(generationProgress)}%
            </div>
          ) : (
            <div className="flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              Generate Assets ({selectedAssets.length})
            </div>
          )}
        </button>
      </div>

      {/* Generated Assets Preview */}
      {generatedAssets.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">
              Generated Assets ({generatedAssets.length})
            </h4>
            <button className="flex items-center text-sm text-blue-600 hover:text-blue-800">
              <Download className="w-4 h-4 mr-1" />
              Download All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {generatedAssets.map((asset) => (
              <div key={asset.id} className="bg-gray-50 rounded-lg p-3">
                <img
                  src={asset.url}
                  alt={asset.size.name}
                  className="w-full h-20 object-cover rounded mb-2"
                />
                <div className="text-xs text-gray-600">
                  <div className="font-medium">{asset.size.name}</div>
                  <div>
                    {asset.size.width} × {asset.size.height}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
