'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlatformDetection } from '@/lib/platform/mobile-detector';
import { useNetworkStatus } from '@/lib/platform/offline-manager';
import { useTouchGestures } from '@/lib/platform/touch-gestures';
import { usePerformanceMonitor } from '@/lib/platform/performance-monitor';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Music,
  Play,
  Pause,
  Heart,
  Plus,
  Minus,
  WifiOff,
  Battery,
  Volume2,
  MoreHorizontal,
  Moon,
  Sun,
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  preview_url?: string;
  genre: string;
  bpm: number;
  energy: number;
  cached: boolean;
}

interface MobileMusicInterfaceProps {
  venueMode?: 'indoor' | 'outdoor' | 'low-light';
  connectivityStatus?: 'online' | 'offline' | 'poor';
  orientationLock?: boolean;
  hapticFeedback?: boolean;
  className?: string;
}

export const MobileMusicInterface: React.FC<MobileMusicInterfaceProps> = ({
  venueMode = 'indoor',
  connectivityStatus,
  orientationLock = false,
  hapticFeedback = true,
  className,
}) => {
  // Platform detection
  const { isPortrait, isMobile, touchCapable, isTablet } =
    usePlatformDetection();
  const { isOffline, connectionQuality } = useNetworkStatus();
  const performanceMetrics = usePerformanceMonitor();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(venueMode === 'low-light');
  const [isLoading, setIsLoading] = useState(false);

  // Touch gesture handlers
  const { bind: bindGestures } = useTouchGestures({
    onSwipeRight: useCallback(
      (trackId: string) => {
        // Add to playlist
        const track = searchResults.find((t) => t.id === trackId);
        if (track && !playlist.find((p) => p.id === trackId)) {
          setPlaylist((prev) => [...prev, track]);
          if (hapticFeedback && navigator.vibrate) {
            navigator.vibrate(50); // Short haptic feedback
          }
        }
      },
      [searchResults, playlist, hapticFeedback],
    ),

    onSwipeLeft: useCallback(
      (trackId: string) => {
        // Remove from playlist
        setPlaylist((prev) => prev.filter((p) => p.id !== trackId));
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate([25, 25, 25]); // Triple tap pattern
        }
      },
      [hapticFeedback],
    ),

    onLongPress: useCallback(
      (trackId: string) => {
        // Show track details
        console.log('Long press on track:', trackId);
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate(100); // Longer feedback for context menu
        }
      },
      [hapticFeedback],
    ),
  });

  // Mock data for demo
  const mockTracks: Track[] = useMemo(
    () => [
      {
        id: '1',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        duration: 263,
        genre: 'Pop',
        bpm: 95,
        energy: 0.6,
        cached: true,
      },
      {
        id: '2',
        title: "Can't Help Myself",
        artist: 'Four Tops',
        duration: 164,
        genre: 'Motown',
        bpm: 132,
        energy: 0.8,
        cached: true,
      },
      {
        id: '3',
        title: 'Uptown Funk',
        artist: 'Bruno Mars',
        duration: 269,
        genre: 'Funk',
        bpm: 115,
        energy: 0.9,
        cached: false,
      },
      {
        id: '4',
        title: 'Thinking Out Loud',
        artist: 'Ed Sheeran',
        duration: 281,
        genre: 'Pop',
        bpm: 79,
        energy: 0.4,
        cached: true,
      },
    ],
    [],
  );

  // Search functionality with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        // Simulate search with filtering
        const filtered = mockTracks.filter(
          (track) =>
            track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
            track.genre.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        setSearchResults(filtered);
        setIsLoading(false);
      } else {
        setSearchResults(mockTracks);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, mockTracks]);

  // Auto dark mode based on venue conditions
  useEffect(() => {
    if (venueMode === 'low-light') {
      setIsDarkMode(true);
    } else if (venueMode === 'outdoor') {
      setIsDarkMode(false); // High contrast for sunlight
    }
  }, [venueMode]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Connectivity status indicator
  const getConnectivityIcon = () => {
    if (isOffline || connectivityStatus === 'offline') {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    if (connectionQuality === 'poor' || connectivityStatus === 'poor') {
      return <WifiOff className="h-4 w-4 text-orange-500" />;
    }
    return null;
  };

  // Battery status (if available)
  const batteryStatus = useMemo(() => {
    if (performanceMetrics.batteryLevel !== null) {
      const level = performanceMetrics.batteryLevel * 100;
      const color =
        level > 50
          ? 'text-green-500'
          : level > 20
            ? 'text-orange-500'
            : 'text-red-500';
      return (
        <div className={cn('flex items-center text-sm', color)}>
          <Battery className="h-4 w-4 mr-1" />
          {Math.round(level)}%
        </div>
      );
    }
    return null;
  }, [performanceMetrics.batteryLevel]);

  return (
    <div
      className={cn(
        'music-interface h-screen flex flex-col',
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
        isPortrait && 'portrait-layout',
        isOffline && 'offline-mode',
        venueMode === 'outdoor' && 'outdoor-mode high-contrast',
        className,
      )}
    >
      {/* Header with status indicators */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Music className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Music Database</h1>
          </div>

          <div className="flex items-center space-x-3">
            {getConnectivityIcon()}
            {batteryStatus}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="h-8 w-8"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search bar - optimized for touch */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search songs, artists, or genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'pl-10 pr-4 py-3 text-lg', // Large touch target
              'min-h-[48px]', // Minimum touch target size
              isDarkMode && 'bg-gray-800 border-gray-600',
            )}
            data-testid="music-search"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />
            </div>
          )}
        </div>

        {/* Offline indicator */}
        {(isOffline || connectivityStatus === 'offline') && (
          <div
            className="mt-2 p-2 bg-orange-100 dark:bg-orange-900 rounded-lg"
            data-testid="offline-indicator"
          >
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Offline mode - showing cached tracks only
            </p>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Genre filters */}
        <div className="flex-shrink-0 p-4">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {[
              'All',
              'Pop',
              'Rock',
              'Hip Hop',
              'Electronic',
              'Country',
              'Classical',
            ].map((genre) => (
              <Button
                key={genre}
                variant={selectedGenre === genre ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setSelectedGenre(selectedGenre === genre ? null : genre)
                }
                className={cn(
                  'whitespace-nowrap min-h-[44px] px-4', // Touch-friendly
                  isDarkMode && 'border-gray-600',
                )}
              >
                {genre}
              </Button>
            ))}
          </div>
        </div>

        {/* Track list */}
        <div
          className="flex-1 overflow-y-auto px-4"
          data-testid="search-results"
        >
          <div className="space-y-3">
            {searchResults.map((track, index) => (
              <Card
                key={track.id}
                {...bindGestures(track.id)}
                className={cn(
                  'p-4 cursor-pointer transition-all duration-200',
                  'min-h-[72px]', // Minimum touch target
                  'touch-manipulation', // Optimize for touch
                  isDarkMode && 'bg-gray-800 border-gray-700',
                  currentTrack?.id === track.id && 'ring-2 ring-blue-500',
                )}
                data-testid={`track-${index}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      {track.cached && (
                        <Badge variant="secondary" className="text-xs">
                          Cached
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {track.artist} • {track.genre} • {track.bpm} BPM
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatDuration(track.duration)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: `${track.energy * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">Energy</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCurrentTrack(track);
                        setIsPlaying(
                          !isPlaying || currentTrack?.id !== track.id,
                        );
                      }}
                      className="h-10 w-10" // Large touch target
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const isInPlaylist = playlist.find(
                          (p) => p.id === track.id,
                        );
                        if (isInPlaylist) {
                          setPlaylist((prev) =>
                            prev.filter((p) => p.id !== track.id),
                          );
                        } else {
                          setPlaylist((prev) => [...prev, track]);
                        }
                        if (hapticFeedback && navigator.vibrate) {
                          navigator.vibrate(50);
                        }
                      }}
                      className="h-10 w-10"
                    >
                      {playlist.find((p) => p.id === track.id) ? (
                        <Minus className="h-4 w-4 text-red-500" />
                      ) : (
                        <Plus className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom playlist preview */}
      {playlist.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">
              Current Playlist ({playlist.length})
            </h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div
            className="flex space-x-2 overflow-x-auto"
            data-testid="playlist-items"
          >
            {playlist.slice(0, 3).map((track) => (
              <div
                key={track.id}
                className="flex-shrink-0 bg-white dark:bg-gray-700 rounded-lg p-2 min-w-[120px]"
              >
                <p className="text-sm font-medium truncate">{track.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {track.artist}
                </p>
              </div>
            ))}
            {playlist.length > 3 && (
              <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-600 rounded-lg p-2 min-w-[60px] flex items-center justify-center">
                <span className="text-sm">+{playlist.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMusicInterface;
