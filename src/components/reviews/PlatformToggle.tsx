'use client';

import { CheckIcon } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface PlatformToggleProps {
  platform: Platform;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function PlatformToggle({
  platform,
  enabled,
  onChange,
  disabled = false,
}: PlatformToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!enabled);
    }
  };

  return (
    <div
      className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
        enabled
          ? 'border-primary-300 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleToggle}
    >
      {/* Platform Info */}
      <div className="flex items-center flex-1">
        <div className="flex-shrink-0 mr-3">
          <span className="text-2xl" role="img" aria-label={platform.name}>
            {platform.icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-medium ${
              enabled ? 'text-primary-900' : 'text-gray-900'
            }`}
          >
            {platform.name}
          </h4>
          <p
            className={`text-xs ${
              enabled ? 'text-primary-700' : 'text-gray-500'
            }`}
          >
            {platform.description}
          </p>
        </div>
      </div>

      {/* Toggle Indicator */}
      <div className="flex-shrink-0">
        <div
          className={`relative inline-flex items-center justify-center w-5 h-5 rounded border-2 transition-all duration-200 ${
            enabled
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-gray-300 bg-white'
          }`}
        >
          {enabled && <CheckIcon className="w-3 h-3" />}
        </div>
      </div>

      {/* Popular Badge for certain platforms */}
      {(platform.id === 'google' || platform.id === 'facebook') && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 border border-success-200">
            Popular
          </span>
        </div>
      )}
    </div>
  );
}
