'use client';

import { useState, useEffect, useRef } from 'react';
import { useSwipeNavigation, useTouch, useHaptic } from '@/hooks/useTouch';
import { MobileColorPicker } from './MobileColorPicker';
import { TouchFlowerSearch } from './TouchFlowerSearch';
import { MobileColorPalette } from './MobileColorPalette';
import { MobileArrangementPlanner } from './MobileArrangementPlanner';
import { MobileSustainabilityAnalyzer } from './MobileSustainabilityAnalyzer';

interface MobileFloristIntelligenceProps {
  weddingId?: string;
  onRecommendationSelect?: (recommendation: any) => void;
  className?: string;
}

export function MobileFloristIntelligence({
  weddingId,
  onRecommendationSelect,
  className = '',
}: MobileFloristIntelligenceProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const containerRef = useRef<HTMLDivElement>(null);
  const { success: successHaptic, light: lightHaptic } = useHaptic();

  const tabs = ['Search', 'Palette', 'Arrange', 'Sustain'];

  // Swipe navigation between tabs
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => {
      const newTab = Math.min(currentTab + 1, tabs.length - 1);
      if (newTab !== currentTab) {
        setCurrentTab(newTab);
        lightHaptic();
      }
    },
    onSwipeRight: () => {
      const newTab = Math.max(currentTab - 1, 0);
      if (newTab !== currentTab) {
        setCurrentTab(newTab);
        lightHaptic();
      }
    },
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Preload critical resources for offline use
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Preload florist data for offline use
        registration.active?.postMessage({
          type: 'PRELOAD_FLORIST_DATA',
          data: { weddingId, currentTab },
        });
      });
    }
  }, [weddingId, currentTab]);

  const handleTabSelect = (index: number) => {
    setCurrentTab(index);
    successHaptic();
  };

  const handleMainAction = () => {
    const actions = ['Search', 'Generate', 'Plan', 'Analyze'];
    console.log(`${actions[currentTab]} action triggered`);
    successHaptic();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WedSync Florist AI',
          text: 'Check out these AI-powered florist tools!',
          url: window.location.href,
        });
        successHaptic();
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`mobile-florist-intelligence min-h-screen bg-gray-50 ${className}`}
      {...swipeHandlers}
    >
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-sm text-center">
          <span className="inline-flex items-center">
            <span className="mr-2">📱</span>
            Working offline - some features may be limited
          </span>
        </div>
      )}

      {/* Mobile Header with Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">
            AI Florist Tools
          </h1>
          <p className="text-xs text-gray-600">Swipe left/right to navigate</p>
        </div>

        {/* Tab Pills - Optimized for Touch */}
        <div className="px-4 pb-3">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => handleTabSelect(index)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[44px]
                  transition-all duration-200 touch-manipulation
                  ${
                    currentTab === index
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }
                `}
                style={{ touchAction: 'manipulation' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Progress Indicator */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentTab + 1) / tabs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tab Content - Swipeable */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentTab * 100}%)` }}
      >
        {/* Flower Search Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <TouchFlowerSearch
            weddingId={weddingId}
            isOffline={isOffline}
            onFlowerSelect={onRecommendationSelect}
          />
        </div>

        {/* Color Palette Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <MobileColorPalette
            weddingId={weddingId}
            isOffline={isOffline}
            onPaletteGenerated={onRecommendationSelect}
          />
        </div>

        {/* Arrangement Planning Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <MobileArrangementPlanner
            weddingId={weddingId}
            isOffline={isOffline}
            onArrangementComplete={onRecommendationSelect}
          />
        </div>

        {/* Sustainability Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <MobileSustainabilityAnalyzer
            weddingId={weddingId}
            isOffline={isOffline}
            onAnalysisComplete={onRecommendationSelect}
          />
        </div>
      </div>

      {/* Touch-Optimized Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-safe">
        <div className="flex space-x-3">
          <button
            className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium min-h-[48px] touch-manipulation active:bg-blue-600"
            onClick={handleMainAction}
            style={{ touchAction: 'manipulation' }}
          >
            {['🔍 Search', '🎨 Generate', '💐 Plan', '🌱 Analyze'][currentTab]}
          </button>
          <button
            className="px-4 py-3 border border-gray-300 rounded-lg min-h-[48px] touch-manipulation active:bg-gray-50"
            onClick={handleShare}
            style={{ touchAction: 'manipulation' }}
          >
            📤
          </button>
        </div>
      </div>
    </div>
  );
}
