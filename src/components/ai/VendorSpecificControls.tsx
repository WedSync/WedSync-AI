'use client';

import { useState } from 'react';
import {
  Camera,
  ChefHat,
  Music,
  Building2,
  ClipboardList,
  Clock,
  Users,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  User,
} from 'lucide-react';
import {
  VendorSpecificControlsProps,
  VendorType,
  ServiceLevel,
  CommunicationStyle,
  CommunicationFrequency,
  VENDOR_TYPE_CONFIGS,
} from '@/types/journey-ai';

const VENDOR_ICONS = {
  photographer: Camera,
  caterer: ChefHat,
  dj: Music,
  venue: Building2,
  planner: ClipboardList,
} as const;

const COMMUNICATION_CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  phone: Phone,
  in_person: User,
} as const;

export function VendorSpecificControls({
  request,
  onChange,
  isLoading = false,
  errors = {},
}: VendorSpecificControlsProps) {
  const [activeSection, setActiveSection] = useState<
    'vendor' | 'service' | 'timeline' | 'preferences'
  >('vendor');

  const handleVendorTypeChange = (vendorType: VendorType) => {
    const config = VENDOR_TYPE_CONFIGS[vendorType];
    onChange({
      ...request,
      vendorType,
      // Auto-adjust timeline to common timeline for this vendor type
      weddingTimeline: config.commonTimelines.includes(request.weddingTimeline)
        ? request.weddingTimeline
        : config.commonTimelines[1] || 12,
    });
    setActiveSection('service');
  };

  const handleServiceLevelChange = (serviceLevel: ServiceLevel) => {
    onChange({
      ...request,
      serviceLevel,
    });
    setActiveSection('timeline');
  };

  const handleTimelineChange = (timeline: number) => {
    onChange({
      ...request,
      weddingTimeline: timeline,
    });
  };

  const handlePreferenceChange = <
    K extends keyof typeof request.clientPreferences,
  >(
    key: K,
    value: (typeof request.clientPreferences)[K],
  ) => {
    onChange({
      ...request,
      clientPreferences: {
        ...request.clientPreferences,
        [key]: value,
      },
    });
  };

  const handleChannelToggle = (
    channel: 'email' | 'sms' | 'phone' | 'in_person',
  ) => {
    const currentChannels = request.clientPreferences.preferredChannels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel];

    handlePreferenceChange('preferredChannels', newChannels);
  };

  const selectedConfig = VENDOR_TYPE_CONFIGS[request.vendorType];

  return (
    <div className="space-y-6 p-6">
      {/* Section Navigation */}
      <nav className="flex space-x-1 rounded-lg bg-muted p-1">
        {[
          { key: 'vendor', label: 'Vendor Type', icon: Building2 },
          { key: 'service', label: 'Service Level', icon: Users },
          { key: 'timeline', label: 'Timeline', icon: Clock },
          { key: 'preferences', label: 'Preferences', icon: MessageCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as any)}
            className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            disabled={isLoading}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Vendor Type Selection */}
      {activeSection === 'vendor' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Select Vendor Type
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose your wedding service type to get personalized journey
              suggestions
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              Object.entries(VENDOR_TYPE_CONFIGS) as [
                VendorType,
                (typeof VENDOR_TYPE_CONFIGS)[VendorType],
              ][]
            ).map(([type, config]) => {
              const Icon = VENDOR_ICONS[type];
              const isSelected = request.vendorType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleVendorTypeChange(type)}
                  disabled={isLoading}
                  className={`relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border bg-background hover:border-accent/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`rounded-lg p-2 ${
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">
                        {config.label}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {config.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {config.commonTimelines.slice(0, 3).map((months) => (
                          <span
                            key={months}
                            className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                          >
                            {months}mo
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 rounded-full bg-accent p-1">
                      <div className="h-2 w-2 rounded-full bg-accent-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {errors.vendorType && (
            <p className="text-sm text-danger">{errors.vendorType}</p>
          )}
        </div>
      )}

      {/* Service Level Selection */}
      {activeSection === 'service' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Service Level
            </h3>
            <p className="text-sm text-muted-foreground">
              Select the service level that best matches your offerings
            </p>
          </div>

          <div className="grid gap-3">
            {(['basic', 'premium', 'luxury'] as ServiceLevel[]).map((level) => {
              const isSelected = request.serviceLevel === level;

              return (
                <button
                  key={level}
                  onClick={() => handleServiceLevelChange(level)}
                  disabled={isLoading}
                  className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border bg-background hover:border-accent/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground capitalize">
                        {level}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedConfig.serviceDescriptions[level]}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="rounded-full bg-accent p-1">
                        <div className="h-2 w-2 rounded-full bg-accent-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {errors.serviceLevel && (
            <p className="text-sm text-danger">{errors.serviceLevel}</p>
          )}
        </div>
      )}

      {/* Timeline Selection */}
      {activeSection === 'timeline' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Wedding Timeline
            </h3>
            <p className="text-sm text-muted-foreground">
              How many months before the wedding do you typically start working
              with couples?
            </p>
          </div>

          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Timeline: {request.weddingTimeline} months before wedding
              </label>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={request.weddingTimeline}
                onChange={(e) => handleTimelineChange(parseInt(e.target.value))}
                disabled={isLoading}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1mo</span>
                <span>12mo</span>
                <span>24mo</span>
              </div>
            </div>

            {/* Common timelines for this vendor type */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Common timelines for {selectedConfig.label.toLowerCase()}:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedConfig.commonTimelines.map((months) => (
                  <button
                    key={months}
                    onClick={() => handleTimelineChange(months)}
                    disabled={isLoading}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      request.weddingTimeline === months
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {months} months
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errors.weddingTimeline && (
            <p className="text-sm text-danger">{errors.weddingTimeline}</p>
          )}
        </div>
      )}

      {/* Client Preferences */}
      {activeSection === 'preferences' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Client Preferences
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure how you prefer to communicate with your wedding clients
            </p>
          </div>

          {/* Communication Style */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Communication Style
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                ['professional', 'friendly', 'casual'] as CommunicationStyle[]
              ).map((style) => (
                <button
                  key={style}
                  onClick={() =>
                    handlePreferenceChange('communicationStyle', style)
                  }
                  disabled={isLoading}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    request.clientPreferences.communicationStyle === style
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border bg-background text-foreground hover:border-accent/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Communication Frequency */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Communication Frequency
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                ['minimal', 'regular', 'frequent'] as CommunicationFrequency[]
              ).map((frequency) => (
                <button
                  key={frequency}
                  onClick={() => handlePreferenceChange('frequency', frequency)}
                  disabled={isLoading}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    request.clientPreferences.frequency === frequency
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border bg-background text-foreground hover:border-accent/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Channels */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Preferred Communication Channels
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['email', 'sms', 'phone', 'in_person'] as const).map(
                (channel) => {
                  const Icon = COMMUNICATION_CHANNEL_ICONS[channel];
                  const isSelected =
                    request.clientPreferences.preferredChannels?.includes(
                      channel,
                    ) || false;

                  return (
                    <button
                      key={channel}
                      onClick={() => handleChannelToggle(channel)}
                      disabled={isLoading}
                      className={`flex items-center space-x-2 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-border bg-background text-foreground hover:border-accent/50'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {channel === 'in_person'
                          ? 'In Person'
                          : channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </span>
                      {isSelected && (
                        <div className="ml-auto rounded-full bg-accent p-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
                        </div>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Time of Day */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Preferred Time of Day for Communication
            </label>
            <div className="grid gap-2 sm:grid-cols-4">
              {(['morning', 'afternoon', 'evening', 'any'] as const).map(
                (time) => (
                  <button
                    key={time}
                    onClick={() => handlePreferenceChange('timeOfDay', time)}
                    disabled={isLoading}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      request.clientPreferences.timeOfDay === time
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border bg-background text-foreground hover:border-accent/50'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>

          {errors.clientPreferences && (
            <p className="text-sm text-danger">{errors.clientPreferences}</p>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex justify-between pt-4 border-t border-border">
        <button
          onClick={() => {
            const sections = ['vendor', 'service', 'timeline', 'preferences'];
            const currentIndex = sections.indexOf(activeSection);
            if (currentIndex > 0) {
              setActiveSection(sections[currentIndex - 1] as any);
            }
          }}
          disabled={activeSection === 'vendor' || isLoading}
          className="flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>← Previous</span>
        </button>

        <button
          onClick={() => {
            const sections = ['vendor', 'service', 'timeline', 'preferences'];
            const currentIndex = sections.indexOf(activeSection);
            if (currentIndex < sections.length - 1) {
              setActiveSection(sections[currentIndex + 1] as any);
            }
          }}
          disabled={activeSection === 'preferences' || isLoading}
          className="flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Next →</span>
        </button>
      </div>
    </div>
  );
}

// Styles for the slider
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: hsl(var(--accent));
    cursor: pointer;
    border: 2px solid hsl(var(--background));
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: hsl(var(--accent));
    cursor: pointer;
    border: 2px solid hsl(var(--background));
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = sliderStyles;
  document.head.appendChild(styleElement);
}
