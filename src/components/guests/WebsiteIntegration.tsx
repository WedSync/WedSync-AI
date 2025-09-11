'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Guest } from '@/types/guest-management';
import {
  GlobeAltIcon,
  EyeIcon,
  Cog6ToothIcon,
  PhotoIcon,
  MapPinIcon,
  HeartIcon,
  UserGroupIcon,
  LinkIcon,
  ShareIcon,
} from '@heroicons/react/20/solid';

interface WebsiteSection {
  id: string;
  name: string;
  enabled: boolean;
  guest_data_visible: boolean;
  display_settings: {
    show_names: boolean;
    show_photos: boolean;
    show_relationships: boolean;
    show_messages: boolean;
    group_by: 'side' | 'category' | 'household' | 'none';
  };
}

interface WebsiteData {
  website_id: string;
  domain: string;
  custom_domain?: string;
  status: 'draft' | 'published' | 'private';
  sections: WebsiteSection[];
  guest_sections: {
    wedding_party: WebsiteSection;
    family: WebsiteSection;
    friends: WebsiteSection;
    accommodations: WebsiteSection;
    seating_chart: WebsiteSection;
  };
  preview_url: string;
  analytics: {
    total_views: number;
    unique_visitors: number;
    rsvp_conversions: number;
  };
}

interface WebsiteIntegrationProps {
  selectedGuests: Guest[];
  totalGuests: number;
  coupleId: string;
  weddingId: string;
}

export function WebsiteIntegration({
  selectedGuests,
  totalGuests,
  coupleId,
  weddingId,
}: WebsiteIntegrationProps) {
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop',
  );
  const [selectedSection, setSelectedSection] =
    useState<string>('guest_sections');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    fetchWebsiteData();
  }, [weddingId]);

  const fetchWebsiteData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/website/data?wedding_id=${weddingId}`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setWebsiteData(data.website);
      }
    } catch (error) {
      console.error('Failed to fetch website data:', error);
    }
    setLoading(false);
  };

  const updateSectionSettings = async (
    sectionId: string,
    settings: Partial<WebsiteSection>,
  ) => {
    setUpdatingSettings(true);
    try {
      const response = await fetch('/api/website/sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_id: websiteData?.website_id,
          section_id: sectionId,
          ...settings,
        }),
      });

      if (response.ok) {
        await fetchWebsiteData();
      }
    } catch (error) {
      console.error('Failed to update section settings:', error);
    }
    setUpdatingSettings(false);
  };

  const publishWebsite = async () => {
    try {
      const response = await fetch('/api/website/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_id: websiteData?.website_id,
        }),
      });

      if (response.ok) {
        await fetchWebsiteData();
      }
    } catch (error) {
      console.error('Failed to publish website:', error);
    }
  };

  const generateGuestPreview = () => {
    const sampleGuests =
      selectedGuests.length > 0 ? selectedGuests.slice(0, 6) : [];

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Website Header Preview */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Sarah & Michael</h1>
          <p className="text-primary-100">October 15, 2025 • Napa Valley</p>
        </div>

        {/* Guest Sections Preview */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Our Wedding Party & Guests
            </h2>
            <p className="text-gray-600">
              We're excited to celebrate with all of you!
            </p>
          </div>

          {/* Wedding Party Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <HeartIcon className="w-5 h-5 text-primary-600" />
              Wedding Party
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sampleGuests.slice(0, 3).map((guest, index) => (
                <div key={guest.id} className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">
                    {guest.first_name} {guest.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {index === 0
                      ? 'Maid of Honor'
                      : index === 1
                        ? 'Best Man'
                        : 'Bridesmaid'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Family Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-primary-600" />
              Family (
              {selectedGuests.filter((g) => g.category === 'family').length})
            </h3>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                Our beloved family members who have supported us throughout our
                journey.
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedGuests
                  .filter((g) => g.category === 'family')
                  .slice(0, 8)
                  .map((guest) => (
                    <Badge key={guest.id} variant="outline" className="text-xs">
                      {guest.first_name} {guest.last_name}
                    </Badge>
                  ))}
                {selectedGuests.filter((g) => g.category === 'family').length >
                  8 && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    +
                    {selectedGuests.filter((g) => g.category === 'family')
                      .length - 8}{' '}
                    more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Friends Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Friends (
              {selectedGuests.filter((g) => g.category === 'friends').length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Sarah's Friends
                </h4>
                <div className="space-y-1">
                  {selectedGuests
                    .filter(
                      (g) => g.category === 'friends' && g.side === 'partner1',
                    )
                    .slice(0, 4)
                    .map((guest) => (
                      <p key={guest.id} className="text-sm text-gray-600">
                        {guest.first_name} {guest.last_name}
                      </p>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Michael's Friends
                </h4>
                <div className="space-y-1">
                  {selectedGuests
                    .filter(
                      (g) => g.category === 'friends' && g.side === 'partner2',
                    )
                    .slice(0, 4)
                    .map((guest) => (
                      <p key={guest.id} className="text-sm text-gray-600">
                        {guest.first_name} {guest.last_name}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Accommodations Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-primary-600" />
              Accommodations
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                We've reserved blocks at these hotels for our out-of-town
                guests:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Napa Valley Lodge - Book by Sept 15th</li>
                <li>• Marriott Napa Valley - Group rate available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!websiteData) {
    return (
      <Card className="p-6 text-center">
        <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Wedding website not set up yet</p>
        <Button className="mt-4">Create Wedding Website</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Website Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Wedding Website
            </h3>
            <Badge
              className={
                websiteData.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : websiteData.status === 'private'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
              }
            >
              {websiteData.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')
              }
            >
              {previewMode === 'desktop' ? '📱 Mobile' : '💻 Desktop'}
            </Button>

            <Button
              size="sm"
              onClick={publishWebsite}
              disabled={websiteData.status === 'published'}
            >
              {websiteData.status === 'published' ? 'Published' : 'Publish'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {websiteData.analytics.total_views}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {websiteData.analytics.unique_visitors}
            </div>
            <div className="text-sm text-gray-600">Unique Visitors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {websiteData.analytics.rsvp_conversions}
            </div>
            <div className="text-sm text-gray-600">RSVP Conversions</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <LinkIcon className="w-4 h-4" />
            <span>{websiteData.custom_domain || websiteData.domain}</span>
          </div>
          <div className="flex items-center gap-1">
            <UserGroupIcon className="w-4 h-4" />
            <span>{totalGuests} guests invited</span>
          </div>
        </div>
      </Card>

      {/* Guest Display Settings */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Guest Display Settings
        </h3>

        <div className="space-y-4">
          {Object.entries(websiteData.guest_sections).map(
            ([sectionKey, section]) => (
              <div
                key={sectionKey}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={(enabled) =>
                        updateSectionSettings(section.id, { enabled })
                      }
                      disabled={updatingSettings}
                    />
                    <h4 className="font-medium text-gray-900 capitalize">
                      {sectionKey.replace('_', ' ')}
                    </h4>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {
                      selectedGuests.filter((g) => {
                        if (sectionKey === 'family')
                          return g.category === 'family';
                        if (sectionKey === 'friends')
                          return g.category === 'friends';
                        if (sectionKey === 'wedding_party')
                          return g.helper_role;
                        return true;
                      }).length
                    }{' '}
                    guests
                  </Badge>
                </div>

                {section.enabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={section.display_settings.show_names}
                        onCheckedChange={(show_names) =>
                          updateSectionSettings(section.id, {
                            display_settings: {
                              ...section.display_settings,
                              show_names,
                            },
                          })
                        }
                        disabled={updatingSettings}
                        size="sm"
                      />
                      <span>Show Names</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <Switch
                        checked={section.display_settings.show_photos}
                        onCheckedChange={(show_photos) =>
                          updateSectionSettings(section.id, {
                            display_settings: {
                              ...section.display_settings,
                              show_photos,
                            },
                          })
                        }
                        disabled={updatingSettings}
                        size="sm"
                      />
                      <span>Show Photos</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <Switch
                        checked={section.display_settings.show_relationships}
                        onCheckedChange={(show_relationships) =>
                          updateSectionSettings(section.id, {
                            display_settings: {
                              ...section.display_settings,
                              show_relationships,
                            },
                          })
                        }
                        disabled={updatingSettings}
                        size="sm"
                      />
                      <span>Show Relationships</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <Switch
                        checked={section.display_settings.show_messages}
                        onCheckedChange={(show_messages) =>
                          updateSectionSettings(section.id, {
                            display_settings: {
                              ...section.display_settings,
                              show_messages,
                            },
                          })
                        }
                        disabled={updatingSettings}
                        size="sm"
                      />
                      <span>Show Messages</span>
                    </label>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      </Card>

      {/* Website Preview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Website Preview
          </h3>
          <div className="flex items-center gap-2">
            <EyeIcon className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Live preview</span>
          </div>
        </div>

        <div
          className={`mx-auto bg-gray-100 rounded-lg p-2 ${
            previewMode === 'mobile' ? 'max-w-sm' : 'max-w-4xl'
          }`}
        >
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden"
            style={{
              height: previewMode === 'mobile' ? '600px' : '500px',
            }}
          >
            <div className="h-full overflow-y-auto">
              {generateGuestPreview()}
            </div>
          </div>
        </div>
      </Card>

      {/* Selected Guests Impact */}
      {selectedGuests.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Selected Guests on Website
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">
                {selectedGuests.filter((g) => g.category === 'family').length}
              </div>
              <div className="text-sm text-primary-700">Family Members</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {selectedGuests.filter((g) => g.category === 'friends').length}
              </div>
              <div className="text-sm text-green-700">Friends</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {selectedGuests.filter((g) => g.helper_role).length}
              </div>
              <div className="text-sm text-purple-700">Wedding Party</div>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button variant="outline">
              <ShareIcon className="w-4 h-4 mr-2" />
              Share Website Link
            </Button>
          </div>
        </Card>
      )}

      {/* Real-time Updates Notice */}
      <div className="text-center text-sm text-gray-600">
        <p>Website updates automatically when guest information changes</p>
      </div>
    </div>
  );
}
