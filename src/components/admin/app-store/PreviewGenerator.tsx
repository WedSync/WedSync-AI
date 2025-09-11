'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StoreListingPreview {
  store: 'microsoft' | 'google_play' | 'apple';
  title: string;
  subtitle?: string;
  description: string;
  keywords: string[];
  screenshots: string[];
  icon: string;
  rating?: number;
  reviews?: number;
  downloads?: string;
  category: string;
  ageRating: string;
}

interface PreviewGeneratorProps {
  listing: StoreListingPreview;
  onPreviewUpdate: (preview: StoreListingPreview) => void;
}

const MOCK_LISTING: StoreListingPreview = {
  store: 'microsoft',
  title: 'WedSync - Wedding Management Platform',
  subtitle: 'Professional Wedding Coordination',
  description:
    "Transform your wedding planning with WedSync's professional wedding management platform. Streamline vendor coordination, manage timelines, track budgets, and coordinate with all your wedding suppliers from one powerful dashboard.",
  keywords: [
    'wedding planning',
    'vendor coordination',
    'budget tracker',
    'timeline management',
  ],
  screenshots: [
    '/images/screenshots/dashboard.png',
    '/images/screenshots/vendors.png',
    '/images/screenshots/budget.png',
    '/images/screenshots/timeline.png',
    '/images/screenshots/photos.png',
  ],
  icon: '/images/icons/wedsync-icon.png',
  rating: 4.6,
  reviews: 127,
  downloads: '1K+',
  category: 'Productivity',
  ageRating: 'Everyone',
};

export function PreviewGenerator({
  listing = MOCK_LISTING,
  onPreviewUpdate,
}: PreviewGeneratorProps) {
  const [currentListing, setCurrentListing] =
    useState<StoreListingPreview>(listing);
  const [selectedStore, setSelectedStore] = useState<
    'microsoft' | 'google_play' | 'apple'
  >(listing.store);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleStoreChange = useCallback(
    (store: 'microsoft' | 'google_play' | 'apple') => {
      setSelectedStore(store);
      setCurrentListing((prev) => ({ ...prev, store }));
    },
    [],
  );

  const handleListingUpdate = useCallback(
    (field: keyof StoreListingPreview, value: any) => {
      const updatedListing = { ...currentListing, [field]: value };
      setCurrentListing(updatedListing);
      onPreviewUpdate(updatedListing);
    },
    [currentListing, onPreviewUpdate],
  );

  const generatePreviewImage = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Simulate preview generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In a real implementation, this would:
      // 1. Capture the preview as an image
      // 2. Save it to storage
      // 3. Return the URL
      console.log('Preview generated successfully');
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const getStoreSpecificLayout = () => {
    switch (selectedStore) {
      case 'microsoft':
        return <MicrosoftStorePreview listing={currentListing} />;
      case 'google_play':
        return <GooglePlayPreview listing={currentListing} />;
      case 'apple':
        return <AppleAppStorePreview listing={currentListing} />;
      default:
        return <MicrosoftStorePreview listing={currentListing} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Store Listing Preview</h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedStore}
            onChange={(e) =>
              handleStoreChange(
                e.target.value as 'microsoft' | 'google_play' | 'apple',
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="microsoft">Microsoft Store</option>
            <option value="google_play">Google Play</option>
            <option value="apple">Apple App Store</option>
          </select>
          <Button onClick={generatePreviewImage} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Export Preview'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listing Editor */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  App Title
                </label>
                <Input
                  value={currentListing.title}
                  onChange={(e) => handleListingUpdate('title', e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {currentListing.title.length}/50 characters
                </p>
              </div>

              {selectedStore === 'apple' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subtitle
                  </label>
                  <Input
                    value={currentListing.subtitle || ''}
                    onChange={(e) =>
                      handleListingUpdate('subtitle', e.target.value)
                    }
                    maxLength={30}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(currentListing.subtitle || '').length}/30 characters
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  value={currentListing.description}
                  onChange={(e) =>
                    handleListingUpdate('description', e.target.value)
                  }
                  rows={6}
                  maxLength={4000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {currentListing.description.length}/4000 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={currentListing.category}
                  onChange={(e) =>
                    handleListingUpdate('category', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="Productivity">Productivity</option>
                  <option value="Business">Business</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Social">Social</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {currentListing.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add keyword and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value && !currentListing.keywords.includes(value)) {
                        handleListingUpdate('keywords', [
                          ...currentListing.keywords,
                          value,
                        ]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Store Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Store Preview</span>
                <Badge variant="outline">
                  {selectedStore.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={previewRef}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                {getStoreSpecificLayout()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Microsoft Store Preview Component
function MicrosoftStorePreview({ listing }: { listing: StoreListingPreview }) {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-white min-h-[600px]">
      {/* Header */}
      <div className="flex items-start space-x-4">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          WS
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {listing.title}
          </h1>
          <p className="text-blue-600 font-medium mb-2">WedSync Technologies</p>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-yellow-400 ${i < Math.floor(listing.rating || 0) ? '' : 'opacity-30'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span>{listing.rating}</span>
            </div>
            <span>•</span>
            <span>{listing.reviews} reviews</span>
            <span>•</span>
            <span>{listing.downloads} downloads</span>
          </div>
          <div className="mt-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Get
            </Button>
          </div>
        </div>
      </div>

      {/* Screenshots */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Screenshots</h3>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {listing.screenshots.slice(0, 5).map((screenshot, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-48 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border shadow-sm flex items-center justify-center text-gray-500 text-sm"
            >
              Screenshot {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
        <p className="text-gray-700 leading-relaxed text-sm">
          {listing.description}
        </p>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Category:</span>
          <span className="ml-2 text-gray-900">{listing.category}</span>
        </div>
        <div>
          <span className="text-gray-600">Age rating:</span>
          <span className="ml-2 text-gray-900">{listing.ageRating}</span>
        </div>
      </div>
    </div>
  );
}

// Google Play Preview Component
function GooglePlayPreview({ listing }: { listing: StoreListingPreview }) {
  return (
    <div className="p-6 space-y-6 bg-white min-h-[600px]">
      {/* Header */}
      <div className="flex items-start space-x-4">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
          WS
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-medium text-gray-900 mb-1">
            {listing.title}
          </h1>
          <p className="text-green-600 text-sm mb-2">WedSync Technologies</p>
          <div className="flex items-center space-x-3 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <span className="font-medium">{listing.rating}</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-amber-400 text-xs ${i < Math.floor(listing.rating || 0) ? '' : 'opacity-30'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <span>{listing.reviews} reviews</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8">
              Install
            </Button>
            <Button variant="outline" size="sm">
              Wishlist
            </Button>
          </div>
        </div>
      </div>

      {/* Screenshots */}
      <div>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {listing.screenshots.slice(0, 5).map((screenshot, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-40 h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border shadow-sm flex items-center justify-center text-gray-500 text-xs"
            >
              Screenshot {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">About this app</h3>
        <p className="text-gray-700 text-sm leading-relaxed">
          {listing.description.slice(0, 200)}...
        </p>
        <Button variant="ghost" size="sm" className="mt-2 text-green-600 px-0">
          Read more
        </Button>
      </div>

      {/* App info */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Downloads</p>
            <p className="text-gray-900 font-medium">{listing.downloads}</p>
          </div>
          <div>
            <p className="text-gray-600">Content rating</p>
            <p className="text-gray-900 font-medium">{listing.ageRating}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Apple App Store Preview Component
function AppleAppStorePreview({ listing }: { listing: StoreListingPreview }) {
  return (
    <div className="p-6 space-y-6 bg-white min-h-[600px]">
      {/* Header */}
      <div className="flex items-start space-x-4">
        <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
          WS
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {listing.title}
          </h1>
          {listing.subtitle && (
            <p className="text-gray-600 text-lg mb-2">{listing.subtitle}</p>
          )}
          <p className="text-blue-500 text-sm font-medium mb-3">
            WedSync Technologies
          </p>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-lg text-gray-900">
                {listing.rating}
              </span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-blue-500 ${i < Math.floor(listing.rating || 0) ? '' : 'opacity-30'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <span>•</span>
            <span>{listing.reviews} Ratings</span>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8">
            GET
          </Button>
        </div>
      </div>

      {/* Screenshots */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {listing.screenshots.slice(0, 5).map((screenshot, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-52 h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl border shadow-lg flex items-center justify-center text-gray-500 text-sm"
            >
              Screenshot {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-gray-700 text-sm leading-relaxed">
          {listing.description}
        </p>
      </div>

      {/* Information */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-3">Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Developer</span>
            <span className="text-blue-500">WedSync Technologies</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Category</span>
            <span className="text-gray-900">{listing.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Age Rating</span>
            <span className="text-gray-900">{listing.ageRating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
