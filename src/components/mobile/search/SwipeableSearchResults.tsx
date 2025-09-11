'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'motion/react';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Heart,
  Share2,
  Clock,
} from 'lucide-react';
import { SearchResult } from '@/types/mobile-search';
import { cn } from '@/lib/utils';

interface SwipeableSearchResultsProps {
  results: SearchResult[];
  onResultSelect: (result: SearchResult) => void;
  onSaveResult: (result: SearchResult) => void;
  onContactVendor: (
    result: SearchResult,
    method: 'phone' | 'email' | 'message',
  ) => void;
  className?: string;
}

export default function SwipeableSearchResults({
  results,
  onResultSelect,
  onSaveResult,
  onContactVendor,
  className,
}: SwipeableSearchResultsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedResults, setSavedResults] = useState<Set<string>>(new Set());
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Load saved results from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wedsync_saved_vendors');
    if (saved) {
      try {
        setSavedResults(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Failed to load saved results:', error);
      }
    }
  }, []);

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'medium') => {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [50],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [],
  );

  // Handle swipe actions
  const handleSwipe = useCallback(
    (direction: 'left' | 'right', result: SearchResult) => {
      triggerHapticFeedback('light');

      if (direction === 'right') {
        // Right swipe - save/favorite
        handleSaveResult(result);
      } else {
        // Left swipe - next result
        if (currentIndex < results.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }
    },
    [currentIndex, results.length],
  );

  // Handle save result
  const handleSaveResult = useCallback(
    (result: SearchResult) => {
      const newSaved = new Set(savedResults);
      if (savedResults.has(result.id)) {
        newSaved.delete(result.id);
      } else {
        newSaved.add(result.id);
      }
      setSavedResults(newSaved);
      localStorage.setItem(
        'wedsync_saved_vendors',
        JSON.stringify([...newSaved]),
      );
      onSaveResult(result);
      triggerHapticFeedback('medium');
    },
    [savedResults, onSaveResult, triggerHapticFeedback],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (info: PanInfo, result: SearchResult) => {
      const threshold = 100;
      const { offset, velocity } = info;

      if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
        const direction = offset.x > 0 ? 'right' : 'left';
        handleSwipe(direction, result);
      }
    },
    [handleSwipe],
  );

  // Navigate to previous/next result
  const navigateResult = useCallback(
    (direction: 'prev' | 'next') => {
      triggerHapticFeedback('light');
      if (direction === 'prev' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (direction === 'next' && currentIndex < results.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [currentIndex, results.length, triggerHapticFeedback],
  );

  // Format price range
  const formatPriceRange = (priceRange: string) => {
    const ranges = {
      budget: '£0 - £500',
      'mid-range': '£500 - £2,000',
      premium: '£2,000 - £5,000',
      luxury: '£5,000+',
    };
    return ranges[priceRange as keyof typeof ranges] || priceRange;
  };

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No results found
        </h3>
        <p className="text-gray-600">Try adjusting your search or filters</p>
      </div>
    );
  }

  const currentResult = results[currentIndex];

  return (
    <div
      ref={constraintsRef}
      className={cn('relative h-full overflow-hidden', className)}
    >
      {/* Result Counter */}
      <div className="absolute top-4 right-4 z-20 bg-black/20 text-white px-3 py-1 rounded-full text-sm font-medium">
        {currentIndex + 1} of {results.length}
      </div>

      {/* Main Result Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentResult.id}
          drag="x"
          dragConstraints={constraintsRef}
          dragElastic={0.7}
          onDragEnd={(_, info) => handleDragEnd(info, currentResult)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileDrag={{ scale: 0.95, rotateZ: 5 }}
          className="relative bg-white rounded-3xl shadow-xl overflow-hidden h-full cursor-grab active:cursor-grabbing"
          style={{
            minHeight: '600px',
            touchAction: 'pan-y pinch-zoom',
          }}
        >
          {/* Hero Image */}
          <div className="relative h-64 bg-gray-200">
            {currentResult.images[0] ? (
              <img
                src={currentResult.images[0]}
                alt={currentResult.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {currentResult.category === 'photographer'
                      ? '📸'
                      : currentResult.category === 'venue'
                        ? '🏰'
                        : currentResult.category === 'florist'
                          ? '💐'
                          : currentResult.category === 'catering'
                            ? '🍽️'
                            : '💼'}
                  </div>
                  <p className="text-sm">No image available</p>
                </div>
              </div>
            )}

            {/* Overlay Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {currentResult.featured && (
                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  ⭐ Featured
                </span>
              )}
              {currentResult.verified && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  ✓ Verified
                </span>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={() => handleSaveResult(currentResult)}
              className={cn(
                'absolute top-4 right-4 p-3 rounded-full transition-colors shadow-lg',
                savedResults.has(currentResult.id)
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30',
              )}
              style={{ minHeight: '48px', minWidth: '48px' }}
            >
              <Heart
                className={cn(
                  'w-5 h-5',
                  savedResults.has(currentResult.id) && 'fill-current',
                )}
              />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {currentResult.name}
              </h2>
              <p className="text-rose-600 font-medium capitalize">
                {currentResult.category.replace('-', ' ')}
              </p>
            </div>

            {/* Rating & Location */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-semibold text-gray-900">
                  {currentResult.rating}
                </span>
                <span className="text-gray-600 text-sm">
                  ({currentResult.reviewCount} reviews)
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {currentResult.distance
                    ? `${currentResult.distance.toFixed(1)} miles`
                    : currentResult.location.city}
                </span>
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Starting from</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatPriceRange(currentResult.priceRange)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <button
                onClick={() => onContactVendor(currentResult, 'phone')}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                style={{ minHeight: '64px' }}
              >
                <Phone className="w-5 h-5" />
                <span className="text-sm font-medium">Call</span>
              </button>

              <button
                onClick={() => onContactVendor(currentResult, 'message')}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
                style={{ minHeight: '64px' }}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Message</span>
              </button>

              <button
                onClick={() => onResultSelect(currentResult)}
                className="flex flex-col items-center gap-2 p-4 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors"
                style={{ minHeight: '64px' }}
              >
                <Star className="w-5 h-5" />
                <span className="text-sm font-medium">View</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
        {results.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              triggerHapticFeedback('light');
            }}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              index === currentIndex ? 'bg-rose-600' : 'bg-gray-300',
            )}
            style={{ minHeight: '20px', minWidth: '20px' }}
          />
        ))}
      </div>
    </div>
  );
}
