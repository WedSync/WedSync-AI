'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Music,
  Search,
  Sparkles,
  Play,
  Pause,
  Heart,
  Plus,
  Filter,
  Settings,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type {
  MusicTrack,
  MusicPlaylist,
  WeddingPhase,
  MusicProvider,
  MusicGenre,
  EnergyLevel,
} from '@/types/music';

interface MusicDatabaseProps {
  weddingId: string;
  onTrackSelect?: (track: MusicTrack) => void;
  initialSearchMode?: WeddingPhase;
  className?: string;
}

interface SearchState {
  query: string;
  provider: MusicProvider;
  category: WeddingPhase;
  isSearching: boolean;
  results: MusicTrack[];
}

const PROVIDERS: {
  id: MusicProvider;
  name: string;
  icon: string;
  color: string;
}[] = [
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: 'bg-green-500' },
  { id: 'apple_music', name: 'Apple Music', icon: '🎶', color: 'bg-red-500' },
  {
    id: 'youtube_music',
    name: 'YouTube Music',
    icon: '🎥',
    color: 'bg-red-600',
  },
];

const WEDDING_CATEGORIES = [
  {
    id: 'ceremony' as WeddingPhase,
    name: 'Ceremony',
    description: 'Processional & Ceremonial',
  },
  {
    id: 'cocktails' as WeddingPhase,
    name: 'Cocktail Hour',
    description: 'Background ambiance',
  },
  {
    id: 'dinner' as WeddingPhase,
    name: 'Dinner Service',
    description: 'Dining background',
  },
  {
    id: 'dancing' as WeddingPhase,
    name: 'Dance Floor',
    description: 'High-energy party music',
  },
];

export function MusicDatabase({
  weddingId,
  onTrackSelect,
  initialSearchMode = 'ceremony',
  className = '',
}: MusicDatabaseProps) {
  // State management
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    provider: 'spotify',
    category: initialSearchMode,
    isSearching: false,
    results: [],
  });

  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [showAppropriatenessChecker, setShowAppropriatenessChecker] =
    useState(false);
  const [showRequestResolver, setShowRequestResolver] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<MusicPlaylist | null>(
    null,
  );
  const [previewTrack, setPreviewTrack] = useState<MusicTrack | null>(null);

  // Callbacks
  const handleSearch = useCallback(
    async (query: string, provider: MusicProvider, category: WeddingPhase) => {
      setSearchState((prev) => ({
        ...prev,
        isSearching: true,
        query,
        provider,
        category,
      }));

      try {
        // Mock search for now - would integrate with real API
        const searchResults = await mockMusicSearch(query, provider, category);
        setSearchState((prev) => ({
          ...prev,
          results: searchResults,
          isSearching: false,
        }));
      } catch (error) {
        console.error('Search error:', error);
        setSearchState((prev) => ({
          ...prev,
          isSearching: false,
          results: [],
        }));
      }
    },
    [],
  );

  const handleTrackSelect = useCallback(
    (track: MusicTrack) => {
      setSelectedTrack(track);
      if (onTrackSelect) {
        onTrackSelect(track);
      }
    },
    [onTrackSelect],
  );

  const handleTrackPreview = useCallback((track: MusicTrack) => {
    setPreviewTrack((prevTrack) => (prevTrack?.id === track.id ? null : track));
  }, []);

  const handleAppropriatenessCheck = useCallback((track: MusicTrack) => {
    setSelectedTrack(track);
    setShowAppropriatenessChecker(true);
  }, []);

  // Memoized components
  const searchInterface = useMemo(
    () => (
      <div className="space-y-6" data-testid="song-search-content">
        {/* Provider Selection */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Search Provider:
          </span>
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() =>
                setSearchState((prev) => ({ ...prev, provider: provider.id }))
              }
              className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${
                searchState.provider === provider.id
                  ? `${provider.color} text-white shadow-md`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
              data-testid={`provider-${provider.id}`}
            >
              <span>{provider.icon}</span>
              {provider.name}
            </button>
          ))}
        </div>

        {/* Wedding Category Selection */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-700">
            Wedding Category:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WEDDING_CATEGORIES.map((category) => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setSearchState((prev) => ({ ...prev, category: category.id }))
                }
                className={`
                p-4 rounded-xl text-left transition-all border-2
                ${
                  searchState.category === category.id
                    ? 'border-primary-500 bg-primary-50 text-primary-900'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
              >
                <div className="font-semibold text-sm">{category.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {category.description}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3" data-testid="song-search-form">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={`Search ${PROVIDERS.find((p) => p.id === searchState.provider)?.name || 'music'}...`}
              value={searchState.query}
              onChange={(e) =>
                setSearchState((prev) => ({ ...prev, query: e.target.value }))
              }
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchState.query.trim()) {
                  handleSearch(
                    searchState.query,
                    searchState.provider,
                    searchState.category,
                  );
                }
              }}
              className="pl-10 pr-4 py-3"
              disabled={searchState.isSearching}
              data-testid="search-input"
            />
          </div>
          <Button
            onClick={() =>
              handleSearch(
                searchState.query,
                searchState.provider,
                searchState.category,
              )
            }
            disabled={!searchState.query.trim() || searchState.isSearching}
            className="px-6"
            data-testid="search-button"
          >
            {searchState.isSearching ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Settings className="w-4 h-4" />
              </motion.div>
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </Button>
        </div>
      </div>
    ),
    [searchState, handleSearch],
  );

  const searchResults = useMemo(() => {
    if (searchState.results.length === 0) {
      return searchState.isSearching ? (
        <div className="text-center py-12">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-500">Searching for music...</p>
        </div>
      ) : searchState.query ? (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            No results found for "{searchState.query}"
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Start by searching for music above</p>
        </div>
      );
    }

    return (
      <div className="space-y-3" data-testid="search-results">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            Found {searchState.results.length} tracks
          </h3>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="grid gap-3">
          <AnimatePresence>
            {searchState.results.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {track.title}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          by {track.artist}
                        </p>
                        {track.album && (
                          <p className="text-xs text-gray-500 truncate">
                            Album: {track.album}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={
                              track.wedding_appropriateness === 'perfect'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {track.wedding_appropriateness}
                          </Badge>

                          {track.explicit_content && (
                            <Badge variant="destructive" className="text-xs">
                              Explicit
                            </Badge>
                          )}

                          <span className="text-xs text-gray-500">
                            {Math.floor(track.duration_seconds / 60)}:
                            {(track.duration_seconds % 60)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTrackPreview(track)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {previewTrack?.id === track.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAppropriatenessCheck(track)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrackSelect(track)}
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }, [
    searchState,
    previewTrack,
    handleTrackPreview,
    handleAppropriatenessCheck,
    handleTrackSelect,
  ]);

  return (
    <div
      className={`space-y-8 ${className}`}
      data-testid="music-database-container"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Music className="w-8 h-8 text-primary-600" />
            Music Database
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered music search and wedding appropriateness analysis
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRequestResolver(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Resolve Request
          </Button>

          <Button variant="default">
            <Heart className="w-4 h-4 mr-2" />
            View Playlists
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" role="tablist">
          <TabsTrigger
            value="search"
            className="flex items-center gap-2"
            role="tab"
          >
            <Search className="w-4 h-4" />
            Search Music
          </TabsTrigger>
          <TabsTrigger
            value="playlists"
            className="flex items-center gap-2"
            role="tab"
          >
            <Music className="w-4 h-4" />
            My Playlists
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="flex items-center gap-2"
            role="tab"
          >
            <Sparkles className="w-4 h-4" />
            Song Requests
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2"
            role="tab"
          >
            <Volume2 className="w-4 h-4" />
            Appropriateness Check
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Music Search</CardTitle>
              <CardDescription>
                Search across multiple music providers with wedding-appropriate
                filtering
              </CardDescription>
            </CardHeader>
            <CardContent>{searchInterface}</CardContent>
          </Card>

          {/* Search Results */}
          <div>{searchResults}</div>
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists">
          <div data-testid="playlists-content">
            <Card>
              <CardHeader>
                <CardTitle>My Playlists</CardTitle>
                <CardDescription>
                  Create and manage wedding playlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Music className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Playlist builder coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Song Requests Tab */}
        <TabsContent value="requests">
          <div data-testid="song-requests-content">
            <Card>
              <CardHeader>
                <CardTitle>Song Requests</CardTitle>
                <CardDescription>
                  Resolve vague song requests with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Request resolver coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appropriateness Check Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Appropriateness Checker</CardTitle>
              <CardDescription>
                Check wedding appropriateness of songs with AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Appropriateness checker coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mock function for development - would integrate with real API
async function mockMusicSearch(
  query: string,
  provider: MusicProvider,
  category: WeddingPhase,
): Promise<MusicTrack[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock data - replace with actual API calls
  const mockTracks: MusicTrack[] = [
    {
      id: '1',
      organization_id: 'org1',
      title: 'Perfect',
      artist: 'Ed Sheeran',
      album: '÷ (Divide)',
      duration_seconds: 263,
      primary_genre: 'pop',
      mood: 'romantic',
      energy_level: 6,
      tempo_bpm: 95,
      danceability: 0.6,
      valence: 0.8,
      wedding_appropriateness: 'perfect',
      ceremony_suitable: true,
      reception_suitable: true,
      cocktail_suitable: true,
      dinner_suitable: true,
      explicit_content: false,
      spotify_id: 'spotify123',
      licensing_status: 'licensed',
      popularity_score: 95,
      wedding_usage_count: 1250,
      ai_analysis: {
        emotion_tags: ['romantic', 'uplifting', 'heartfelt'],
        recommended_moments: ['first_dance', 'processional'],
      },
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: 'org1',
      title: 'A Thousand Years',
      artist: 'Christina Perri',
      album: 'The Twilight Saga: Breaking Dawn',
      duration_seconds: 285,
      primary_genre: 'pop',
      mood: 'romantic',
      energy_level: 5,
      tempo_bpm: 80,
      danceability: 0.4,
      valence: 0.7,
      wedding_appropriateness: 'perfect',
      ceremony_suitable: true,
      reception_suitable: true,
      cocktail_suitable: true,
      dinner_suitable: true,
      explicit_content: false,
      licensing_status: 'licensed',
      popularity_score: 88,
      wedding_usage_count: 980,
      ai_analysis: {
        emotion_tags: ['romantic', 'emotional', 'timeless'],
        recommended_moments: ['processional', 'first_dance'],
      },
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return mockTracks.filter(
    (track) =>
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()),
  );
}
