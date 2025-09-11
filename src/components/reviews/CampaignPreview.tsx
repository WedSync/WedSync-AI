'use client';

import { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  StarIcon,
  MessageSquareIcon,
  GiftIcon,
  ExternalLinkIcon,
  SmartphoneIcon,
  MailIcon,
} from 'lucide-react';
import { type ReviewCampaignFormData } from '@/lib/validations/review-schemas';

interface CampaignPreviewProps {
  campaign: Partial<ReviewCampaignFormData>;
  clientName?: string;
  weddingDate?: string;
  venue?: string;
}

export function CampaignPreview({
  campaign,
  clientName = 'Emma & Mike',
  weddingDate = '2024-06-15',
  venue = 'Sunset Manor',
}: CampaignPreviewProps) {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>(
    'mobile',
  );

  const formatWeddingDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPreviewMessage = () => {
    if (!campaign.message_template) return '';

    return campaign.message_template
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{wedding_date\}\}/g, formatWeddingDate(weddingDate))
      .replace(/\{\{venue_name\}\}/g, venue)
      .replace(/\{\{supplier_name\}\}/g, 'Your Photography Studio');
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      google: '🌟',
      facebook: '👍',
      yelp: '📝',
      weddingwire: '💍',
      theknot: '🎗️',
    };
    return icons[platform as keyof typeof icons] || '⭐';
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      google: 'bg-blue-500',
      facebook: 'bg-blue-600',
      yelp: 'bg-red-500',
      weddingwire: 'bg-purple-500',
      theknot: 'bg-pink-500',
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-500';
  };

  const scheduledDate = new Date(weddingDate);
  scheduledDate.setDate(scheduledDate.getDate() + (campaign.delay_days || 7));

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Campaign Preview
          </h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                previewDevice === 'mobile'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <SmartphoneIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                previewDevice === 'desktop'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <MailIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Campaign Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {campaign.delay_days || 7} days after wedding
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Sends {scheduledDate.toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Platform Badges */}
        {campaign.platforms && campaign.platforms.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {campaign.platforms.map((platform) => (
              <span
                key={platform}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white ${getPlatformColor(platform)}`}
              >
                <span className="mr-1">{getPlatformIcon(platform)}</span>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </span>
            ))}
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${campaign.active ? 'bg-success-500' : 'bg-gray-400'}`}
          ></div>
          <span
            className={`text-sm font-medium ${campaign.active ? 'text-success-700' : 'text-gray-500'}`}
          >
            {campaign.active ? 'Active Campaign' : 'Paused Campaign'}
          </span>
        </div>
      </div>

      {/* Email/Message Preview */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Client Experience Preview
        </h4>

        <div
          className={`${
            previewDevice === 'mobile'
              ? 'max-w-sm mx-auto border-2 border-gray-300 rounded-2xl p-1 bg-gray-900'
              : 'border border-gray-200 rounded-lg'
          }`}
        >
          <div
            className={`${
              previewDevice === 'mobile'
                ? 'bg-white rounded-xl p-4 min-h-[600px]'
                : 'bg-gray-50 p-6'
            }`}
          >
            {/* Email Header */}
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">YP</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Your Photography Studio
                  </p>
                  <p className="text-sm text-gray-500">to {clientName}</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Thanks for choosing us for your special day! 🎉
              </h3>
            </div>

            {/* Message Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {getPreviewMessage() ||
                  'Your personalized message will appear here...'}
              </div>
            </div>

            {/* Incentive Display */}
            {campaign.incentive_type &&
              campaign.incentive_type !== 'none' &&
              campaign.incentive_value && (
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <GiftIcon className="h-5 w-5 text-primary-600" />
                    <span className="font-medium text-primary-900">
                      Special Thank You Gift!
                    </span>
                  </div>
                  <p className="text-sm text-primary-700">
                    As our appreciation:{' '}
                    <strong>{campaign.incentive_value}</strong>
                  </p>
                </div>
              )}

            {/* Review Platform Buttons */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Leave us a review on:
              </p>
              {campaign.platforms && campaign.platforms.length > 0 ? (
                <div className="space-y-2">
                  {campaign.platforms.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      className={`w-full flex items-center justify-center px-4 py-3 ${getPlatformColor(platform)} text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200`}
                    >
                      <span className="mr-2">{getPlatformIcon(platform)}</span>
                      Review us on{' '}
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      <ExternalLinkIcon className="h-4 w-4 ml-2" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquareIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    Select platforms to see review buttons
                  </p>
                </div>
              )}
            </div>

            {/* Rating Prompt */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  How was your experience?
                </p>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      className="h-6 w-6 text-yellow-400 fill-current cursor-pointer hover:text-yellow-500 transition-colors duration-150"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tap to rate your experience
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Campaign Timeline
          </h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Wedding completed: {formatWeddingDate(weddingDate)}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Review request sent: {scheduledDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-sm text-gray-400">
                Follow-up reminder:{' '}
                {new Date(
                  scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000,
                ).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
