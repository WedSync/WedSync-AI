'use client';

import {
  PlayIcon,
  PauseIcon,
  EyeIcon,
  EditIcon,
  MoreVerticalIcon,
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  TrashIcon,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  platforms: string[];
  sentCount: number;
  responseCount: number;
  responseRate: number;
  createdAt: string;
  lastSent?: string;
}

interface ReviewCampaignCardProps {
  campaign: Campaign;
  onToggleStatus: (newStatus: 'active' | 'paused') => void;
  onEdit: () => void;
  onView: () => void;
  onDelete?: () => void;
}

export function ReviewCampaignCard({
  campaign,
  onToggleStatus,
  onEdit,
  onView,
  onDelete,
}: ReviewCampaignCardProps) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-success-100 text-success-800 border-success-200',
      paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getStatusIcon = (status: string) => {
    return status === 'active' ? (
      <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
    ) : (
      <div className="w-2 h-2 bg-gray-400 rounded-full" />
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleToggleStatus = () => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    onToggleStatus(newStatus);
    setShowActions(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {getStatusIcon(campaign.status)}
            <h3 className="font-medium text-gray-900 truncate">
              {campaign.name}
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}
            >
              {campaign.status.charAt(0).toUpperCase() +
                campaign.status.slice(1)}
            </span>

            {/* Platform badges */}
            <div className="flex items-center space-x-1">
              {campaign.platforms.slice(0, 3).map((platform) => (
                <span
                  key={platform}
                  className="text-sm"
                  title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                >
                  {getPlatformIcon(platform)}
                </span>
              ))}
              {campaign.platforms.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{campaign.platforms.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative" ref={actionsRef}>
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-150"
          >
            <MoreVerticalIcon className="h-4 w-4" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  type="button"
                  onClick={onView}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <EyeIcon className="h-4 w-4 mr-3" />
                  View Details
                </button>

                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <EditIcon className="h-4 w-4 mr-3" />
                  Edit Campaign
                </button>

                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {campaign.status === 'active' ? (
                    <>
                      <PauseIcon className="h-4 w-4 mr-3" />
                      Pause Campaign
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-3" />
                      Activate Campaign
                    </>
                  )}
                </button>

                {onDelete && (
                  <>
                    <hr className="my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        setShowActions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-3" />
                      Delete Campaign
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {campaign.sentCount}
          </p>
          <p className="text-xs text-gray-500">Sent</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {campaign.responseCount}
          </p>
          <p className="text-xs text-gray-500">Responses</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center">
            <p className="text-lg font-semibold text-gray-900">
              {campaign.responseRate}%
            </p>
            {campaign.responseRate > 50 && (
              <TrendingUpIcon className="h-3 w-3 text-success-500 ml-1" />
            )}
          </div>
          <p className="text-xs text-gray-500">Rate</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <span className="inline-flex items-center">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Created {formatDate(campaign.createdAt)}
        </span>

        {campaign.lastSent && (
          <span className="inline-flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            Last sent {formatDate(campaign.lastSent)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {campaign.status === 'active' && campaign.sentCount > 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(campaign.responseRate, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
