'use client';

import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Palette,
  Sun,
  Moon,
} from 'lucide-react';
import { ContentItem } from '@/types/cms';
import { cn } from '@/lib/utils';

// Content Preview Component for Wedding Suppliers
// WS-223 Team A - Round 1
// Real-time client portal preview with responsive testing

interface ContentPreviewProps {
  content: ContentItem;
  template?: string;
  device?: 'desktop' | 'tablet' | 'mobile';
  theme?: 'light' | 'dark';
  className?: string;
}

interface PreviewFrameProps {
  device: 'desktop' | 'tablet' | 'mobile';
  children: React.ReactNode;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ device, children }) => {
  const frameStyles = {
    desktop: {
      width: '100%',
      height: '600px',
      borderRadius: '12px',
    },
    tablet: {
      width: '768px',
      height: '600px',
      borderRadius: '20px',
      margin: '0 auto',
    },
    mobile: {
      width: '375px',
      height: '600px',
      borderRadius: '24px',
      margin: '0 auto',
    },
  };

  return (
    <div className="bg-gray-100 p-8 flex items-center justify-center min-h-[700px]">
      <div
        className="bg-white shadow-xl overflow-hidden relative"
        style={frameStyles[device]}
      >
        {/* Device Frame Decorations */}
        {device === 'mobile' && (
          <>
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-300 rounded-full" />
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 border-2 border-gray-300 rounded-full" />
          </>
        )}

        {device === 'tablet' && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-8 h-8 border-2 border-gray-300 rounded-full" />
        )}

        {/* Content Area */}
        <div
          className={cn(
            'w-full h-full overflow-y-auto',
            device === 'mobile'
              ? 'pt-6 pb-12'
              : device === 'tablet'
                ? 'pb-12'
                : '',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const ContentRenderer: React.FC<{
  content: ContentItem;
  theme: 'light' | 'dark';
}> = ({ content, theme }) => {
  const themeClasses =
    theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';

  const renderContentByType = () => {
    switch (content.type) {
      case 'welcome_message':
        return (
          <div className={cn('p-8', themeClasses)}>
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold mb-6 text-primary-600">
                {content.title}
              </h1>
              {content.featured_image && (
                <img
                  src={content.featured_image}
                  alt="Welcome"
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
              )}
              <div className="prose prose-lg max-w-none">
                {content.plain_text ||
                  'Welcome to our wedding photography service! We are excited to capture your special moments and create lasting memories that you will treasure forever.'}
              </div>
            </div>
          </div>
        );

      case 'service_description':
        return (
          <div className={cn('p-8', themeClasses)}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-8 text-center">
                {content.title}
              </h1>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="prose">
                    {content.plain_text ||
                      'Our comprehensive wedding photography packages are designed to capture every precious moment of your special day.'}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {content.media_urls.slice(0, 4).map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Service ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold mb-4">
                      Package Includes:
                    </h3>
                    <ul className="space-y-2">
                      <li>• 8 hours of coverage</li>
                      <li>• 300+ edited photos</li>
                      <li>• Online gallery</li>
                      <li>• Print release</li>
                      <li>• USB drive delivery</li>
                    </ul>
                  </div>
                  <button className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors">
                    Book Consultation
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gallery_description':
        return (
          <div className={cn('p-8', themeClasses)}>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {content.plain_text ||
                    'Browse through our portfolio of beautiful wedding moments'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(12)].map((_, index) => (
                  <div
                    key={index}
                    className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"
                  >
                    <img
                      src={`https://images.unsplash.com/photo-${1500000000000 + index * 1000000}?w=300&h=300&fit=crop`}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'timeline_template':
        return (
          <div className={cn('p-8', themeClasses)}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-8 text-center">
                {content.title}
              </h1>

              <div className="space-y-6">
                {[
                  {
                    time: '9:00 AM',
                    activity: 'Bridal preparation begins',
                    location: 'Bridal Suite',
                  },
                  {
                    time: '11:00 AM',
                    activity: 'Hair and makeup completion',
                    location: 'Bridal Suite',
                  },
                  {
                    time: '1:00 PM',
                    activity: 'First look photos',
                    location: 'Garden Courtyard',
                  },
                  {
                    time: '2:00 PM',
                    activity: 'Wedding party photos',
                    location: 'Main Hall',
                  },
                  {
                    time: '4:00 PM',
                    activity: 'Ceremony begins',
                    location: 'Ceremony Venue',
                  },
                  {
                    time: '4:30 PM',
                    activity: 'Cocktail hour starts',
                    location: 'Reception Area',
                  },
                  {
                    time: '6:00 PM',
                    activity: 'Reception begins',
                    location: 'Main Ballroom',
                  },
                  {
                    time: '9:00 PM',
                    activity: 'First dance',
                    location: 'Dance Floor',
                  },
                  {
                    time: '11:00 PM',
                    activity: 'Last dance & send-off',
                    location: 'Exit Area',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-20 text-sm font-medium text-primary-600">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.activity}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {item.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'communication_template':
        return (
          <div className={cn('p-8', themeClasses)}>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">WS</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">WedSync Photography</h3>
                    <p className="text-sm text-gray-500">to: Client</p>
                  </div>
                </div>

                <h2 className="text-xl font-semibold mb-4">{content.title}</h2>

                <div className="prose prose-sm max-w-none">
                  {content.plain_text ||
                    `Hi [CLIENT_NAME],

I hope your wedding planning is going smoothly! I wanted to check in with you about your upcoming wedding photography session.

We have everything scheduled for [WEDDING_DATE], and I'm really excited to capture your special day. I'll be arriving at [ARRIVAL_TIME] to start with the preparation shots.

Please let me know if you have any questions or if there are any specific moments or people you'd like me to focus on during the day.

Looking forward to working with you!

Best regards,
[PHOTOGRAPHER_NAME]
WedSync Photography`}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={cn('p-8', themeClasses)}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">{content.title}</h1>
              <div className="prose prose-lg max-w-none">
                {content.plain_text ||
                  'Content preview will be displayed here.'}
              </div>
            </div>
          </div>
        );
    }
  };

  return renderContentByType();
};

export const ContentPreview: React.FC<ContentPreviewProps> = ({
  content,
  template = 'default',
  device: initialDevice = 'desktop',
  theme: initialTheme = 'light',
  className,
}) => {
  const [currentDevice, setCurrentDevice] = useState(initialDevice);
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className={cn('bg-gray-50', className)}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Content Preview
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {content.type
                .replace('_', ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Device Selector */}
            <div className="flex items-center border border-gray-200 rounded-lg">
              {[
                { key: 'desktop', icon: Monitor, label: 'Desktop' },
                { key: 'tablet', icon: Tablet, label: 'Tablet' },
                { key: 'mobile', icon: Smartphone, label: 'Mobile' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setCurrentDevice(key as any)}
                  className={cn(
                    'p-2 transition-colors first:rounded-l-lg last:rounded-r-lg',
                    currentDevice === key
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* Theme Selector */}
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setCurrentTheme('light')}
                className={cn(
                  'p-2 transition-colors rounded-l-lg',
                  currentTheme === 'light'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
                title="Light Theme"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentTheme('dark')}
                className={cn(
                  'p-2 transition-colors rounded-r-lg',
                  currentTheme === 'dark'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
                title="Dark Theme"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Preview"
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <PreviewFrame device={currentDevice}>
        <ContentRenderer content={content} theme={currentTheme} />
      </PreviewFrame>

      {/* Preview Info */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Template: {template}</span>
            <span>
              Last updated: {new Date(content.updated_at).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Preview Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;
